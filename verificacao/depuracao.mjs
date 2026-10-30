// Parte comum dos modos que dirigem o Chrome pelo DevTools Protocol (fumaça e captura):
// abrir um navegador headless com perfil temporário, abrir uma página e coletar os erros dela.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { abrirConexao } from "./cdp.mjs";
import {
    argumentosHeadless, comPerfilTemporario,
    ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS, esperarComLimite, iniciarProcesso, matarArvoreDeProcessos, sleep,
} from "./navegador.mjs";

const LIMITE_DE_CARGA_EM_MILISSEGUNDOS = 15000;
const ASSENTAMENTO_EM_MILISSEGUNDOS = 1000;


// ============================================================
// Navegador
// ============================================================
/*
  Abre um Chrome headless com perfil temporário, chama `usar(conexao)` e, qualquer que seja o
  resultado, encerra o Chrome e apaga o perfil. Devolve o que `usar` devolver; lança o que ele lançar.
*/
export function comNavegadorDepuravel(navegador, usar) {
    return comPerfilTemporario((pastaDoPerfil) => usarComOPerfil(navegador, pastaDoPerfil, usar));
}

async function usarComOPerfil(navegador, pastaDoPerfil, usar) {
    const { processo, terminou } = iniciarProcesso(
        navegador,
        argumentosHeadless(pastaDoPerfil, "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", "about:blank"),
        { stdio: "ignore" }
    );
    let conexao = null;

    try {
        conexao = await abrirConexao(await esperarEnderecoDeDepuracao(pastaDoPerfil, terminou));
        return await usar(conexao);
    } finally {
        await encerrarNavegador(conexao, processo, terminou);
    }
}

/* O Chrome escreve a porta de depuração em <perfil>/DevToolsActivePort quando está pronto. */
async function esperarEnderecoDeDepuracao(pastaDoPerfil, terminou) {
    const arquivo = join(pastaDoPerfil, "DevToolsActivePort");
    let fim = null;
    terminou.then((resultado) => { fim = resultado; });

    for (let tentativa = 0; tentativa < 100; tentativa++) {
        if (fim) {
            throw new Error(fim.erro
                ? `não consegui executar o navegador: ${fim.erro.message}`
                : `o navegador saiu antes da hora (código ${fim.codigo}, sinal ${fim.sinal})`);
        }
        const endereco = lerEnderecoDeDepuracao(arquivo);
        if (endereco) return endereco;
        await sleep(100);
    }
    throw new Error("o navegador não abriu a porta de depuração");
}

/* Devolve o endereço, ou null se o arquivo ainda não existe, está sendo escrito ou está preso (EBUSY no Windows). */
function lerEnderecoDeDepuracao(arquivo) {
    try {
        const [porta, caminho] = readFileSync(arquivo, "utf8").split("\n");
        return caminho ? `ws://127.0.0.1:${porta}${caminho}` : null;
    } catch {
        return null;
    }
}

async function encerrarNavegador(conexao, processo, terminou) {
    await conexao?.enviar("Browser.close").catch(() => {});
    if (await esperarComLimite(terminou, ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS) === null) {
        matarArvoreDeProcessos(processo);
        await esperarComLimite(terminou, ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS);
    }
    conexao?.fechar();
}


// ============================================================
// Página
// ============================================================
/*
  Abre `caminho` (um arquivo, ou uma URL pronta, como `new URL("file:///…?auto=1")`) numa aba nova, espera o evento `load` (teto de 15 s) e mais 1 s de assentamento
  (erros tardios, animações de entrada), e então chama `usar({ sessionId, erros, carregou })` com
  a aba ainda aberta. `erros` são as linhas de erro até aquele momento; `carregou` é falso se a
  navegação falhou ou o teto estourou (o motivo também entra em `erros`).
  `metricas` (opcional) é { largura, altura, escala }, aplicado antes de navegar.
*/
export async function comPaginaCarregada(conexao, caminho, metricas, usar) {
    const erros = [];
    const { targetId } = await conexao.enviar("Target.createTarget", { url: "about:blank" });
    let sessionId = null;

    try {
        ({ sessionId } = await conexao.enviar("Target.attachToTarget", { targetId, flatten: true }));
        const { promise: aCargaTerminou, resolve: avisarQueCarregou } = Promise.withResolvers();

        conexao.escutarSessao(sessionId, (evento) => {
            if (evento.method === "Page.loadEventFired") avisarQueCarregou(true);
            if (evento.method === "Page.javascriptDialogOpening") {
                conexao.enviar("Page.handleJavaScriptDialog", { accept: true }, sessionId).catch(() => {});
            }
            const erro = descreverErro(evento);
            if (erro) erros.push(erro);
        });

        for (const dominio of ["Runtime", "Log", "Page"]) {
            await conexao.enviar(`${dominio}.enable`, {}, sessionId);
        }
        if (metricas) await aplicarMetricas(conexao, sessionId, metricas);

        const endereco = caminho instanceof URL ? caminho.href : pathToFileURL(caminho).href;
        const navegacao = await conexao.enviar("Page.navigate", { url: endereco }, sessionId);
        if (navegacao.errorText) {
            erros.push(`navegação: ${navegacao.errorText}`);
            return await usar({ sessionId, erros, carregou: false });
        }

        const carregou = await esperarComLimite(aCargaTerminou, LIMITE_DE_CARGA_EM_MILISSEGUNDOS) !== null;
        if (!carregou) erros.push(`a página não terminou de carregar em ${LIMITE_DE_CARGA_EM_MILISSEGUNDOS / 1000}s`);
        await sleep(ASSENTAMENTO_EM_MILISSEGUNDOS);

        return await usar({ sessionId, erros, carregou });
    } finally {
        await conexao.enviar("Target.closeTarget", { targetId }).catch(() => {});
        if (sessionId !== null) conexao.pararDeEscutarSessao(sessionId);
    }
}

function aplicarMetricas(conexao, sessionId, { largura, altura, escala }) {
    return conexao.enviar("Emulation.setDeviceMetricsOverride", {
        width: largura, height: altura, deviceScaleFactor: escala, mobile: false,
    }, sessionId);
}

/* Devolve a linha de erro de um evento do DevTools, ou null se o evento não é um erro. */
function descreverErro(evento) {
    const { method: metodo, params: parametros } = evento;

    if (metodo === "Runtime.exceptionThrown") {
        const detalhe = parametros.exceptionDetails;
        const texto = detalhe.exception?.description ?? detalhe.text;
        return `exceção: ${texto.split("\n")[0]}`;
    }
    if (metodo === "Runtime.consoleAPICalled" && parametros.type === "error") {
        return `console.error: ${parametros.args.map(textoDoArgumento).join(" ")}`;
    }
    if (metodo === "Log.entryAdded" && parametros.entry.level === "error") {
        const { source, text, url } = parametros.entry;
        return `${source}: ${text}${url ? " (" + url + ")" : ""}`;
    }
    return null;
}

function textoDoArgumento(argumento) {
    return argumento.value !== undefined ? String(argumento.value) : argumento.description ?? argumento.type;
}
