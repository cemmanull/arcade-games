// Modo fumaça: abre cada index.html do curso e lista os erros de console de cada página.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { abrirConexao } from "./cdp.mjs";
import {
    argumentosHeadless, comPerfilTemporario, encontrarNavegador,
    ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS, esperarComLimite, iniciarProcesso, matarArvoreDeProcessos, sleep,
} from "./navegador.mjs";

const LIMITE_DE_CARGA_EM_MILISSEGUNDOS = 15000;
const ASSENTAMENTO_EM_MILISSEGUNDOS = 1000;
const PAGINAS_EM_PARALELO = 4;

/*
  Erros conhecidos e propositais. Uma página só entra aqui se o erro é parte do curso;
  qualquer outro erro nela continua reprovando a execução.
  `pagina` é o caminho a partir da raiz do repositório; `padrao` precisa casar com a linha
  de erro inteira (o executor impõe ^…$ a todas as entradas), então descreva a linha toda,
  com o arquivo ou recurso.
*/
const ERROS_ESPERADOS = [
    {
        pagina: "tutorial/01-html/index.html",
        padrao: /network: Failed to load resource: net::ERR_FILE_NOT_FOUND \(file:\/\/\/.*\/(nao-existe|tambem-nao-existe)\.png\)/,
        motivo: "a lição mostra o texto alternativo (alt) de uma imagem que não existe, de propósito",
    },
];

/* `paginas` é uma lista de { caminho, nome }. Devolve 0 se nenhuma página tem erro inesperado, senão 1. */
export async function rodarFumaca(paginas) {
    const navegador = encontrarNavegador();
    const { errosPorPagina, erroGeral } = await comPerfilTemporario(
        (pastaDoPerfil) => examinarComUmNavegador(navegador, pastaDoPerfil, paginas)
    );

    if (erroGeral) console.error(`Fumaça interrompida: ${erroGeral.message}`);
    const paginasComErroInesperado = relatar(paginas, errosPorPagina);
    return paginasComErroInesperado === 0 && !erroGeral ? 0 : 1;
}

async function examinarComUmNavegador(navegador, pastaDoPerfil, paginas) {
    const { processo, terminou } = iniciarProcesso(
        navegador,
        argumentosHeadless(pastaDoPerfil, "--enable-unsafe-swiftshader", "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", "about:blank"),
        { stdio: "ignore" }
    );
    const errosPorPagina = new Map();
    let conexao = null;
    let erroGeral = null;

    try {
        conexao = await abrirConexao(await esperarEnderecoDeDepuracao(pastaDoPerfil, terminou));
        await examinarEmParalelo(conexao, paginas, errosPorPagina);
    } catch (erro) {
        erroGeral = erro;
    } finally {
        await encerrarNavegador(conexao, processo, terminou);
    }
    return { errosPorPagina, erroGeral };
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
        if (existsSync(arquivo)) {
            const [porta, caminho] = readFileSync(arquivo, "utf8").split("\n");
            if (caminho) return `ws://127.0.0.1:${porta}${caminho}`;
        }
        await sleep(100);
    }
    throw new Error("o navegador não abriu a porta de depuração");
}

async function encerrarNavegador(conexao, processo, terminou) {
    await conexao?.enviar("Browser.close").catch(() => {});
    if (await esperarComLimite(terminou, ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS) === null) {
        matarArvoreDeProcessos(processo);
        await esperarComLimite(terminou, ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS);
    }
    conexao?.fechar();
}

async function examinarEmParalelo(conexao, paginas, errosPorPagina) {
    const fila = [...paginas];

    async function trabalhador() {
        while (fila.length > 0) {
            const pagina = fila.shift();
            try {
                errosPorPagina.set(pagina.nome, await examinarPagina(conexao, pagina.caminho));
            } catch (erro) {
                errosPorPagina.set(pagina.nome, [`falha do executor: ${erro.message}`]);
            }
        }
    }

    await Promise.all(Array.from({ length: PAGINAS_EM_PARALELO }, trabalhador));
}

/* Abre a página numa aba nova e devolve as linhas de erro que ela produziu. */
async function examinarPagina(conexao, caminho) {
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

        const navegacao = await conexao.enviar("Page.navigate", { url: pathToFileURL(caminho).href }, sessionId);
        if (navegacao.errorText) {
            erros.push(`navegação: ${navegacao.errorText}`);
            return erros;
        }

        if (await esperarComLimite(aCargaTerminou, LIMITE_DE_CARGA_EM_MILISSEGUNDOS) === null) {
            erros.push(`a página não terminou de carregar em ${LIMITE_DE_CARGA_EM_MILISSEGUNDOS / 1000}s`);
        }
        await sleep(ASSENTAMENTO_EM_MILISSEGUNDOS);   // erros tardios

        return erros;
    } finally {
        await conexao.enviar("Target.closeTarget", { targetId }).catch(() => {});
        if (sessionId !== null) conexao.pararDeEscutarSessao(sessionId);
    }
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

function classificarErros(nomeDaPagina, erros) {
    const regras = ERROS_ESPERADOS
        .filter((regra) => regra.pagina === nomeDaPagina)
        .map((regra) => ({ ...regra, linhaInteira: new RegExp(`^(?:${regra.padrao.source})$`) }));
    const esperados = [];
    const inesperados = [];

    for (const erro of erros) {
        const regra = regras.find((candidata) => candidata.linhaInteira.test(erro));
        regra ? esperados.push({ erro, motivo: regra.motivo }) : inesperados.push(erro);
    }
    return { esperados, inesperados };
}

/* Imprime o relatório e devolve quantas páginas têm erro inesperado. */
function relatar(paginas, errosPorPagina) {
    let comErroInesperado = 0;
    let soComErrosEsperados = 0;

    for (const { nome } of paginas) {
        const { esperados, inesperados } = classificarErros(nome, errosPorPagina.get(nome) ?? ["sem resultado"]);

        if (inesperados.length > 0) {
            comErroInesperado++;
            console.log(`ERRO  ${nome}`);
            inesperados.forEach((erro) => console.log(`        ${erro}`));
        } else if (esperados.length > 0) {
            soComErrosEsperados++;
            console.log(`ESPERADO  ${nome}`);
        } else {
            console.log(`ok    ${nome}`);
        }
        esperados.forEach(({ erro, motivo }) => console.log(`        esperado: ${erro}\n          porque ${motivo}`));
    }

    const ok = paginas.length - comErroInesperado - soComErrosEsperados;
    console.log(`\n${paginas.length} páginas, ${ok} ok, ${soComErrosEsperados} só com erros esperados, ${comErroInesperado} com erro.`);
    return comErroInesperado;
}
