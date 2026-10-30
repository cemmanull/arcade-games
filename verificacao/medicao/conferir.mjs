// Confere as páginas de medição antes de mandá-las para o celular (elas não são páginas de teste: o rodar.mjs não as roda).
// Para cada página:
//   1. cada id (getElementById("…")) e cada [data-acao="…"] que os scripts do passo procuram existe nela, porque a página
//      é um esqueleto cortado do index.html do passo, não uma cópia;
//   2. ela carrega e mede (?auto=1&quadros=5&aquecimento=2) sem erro de console e entrega window.resultadoDaMedicao.
// Uso: node verificacao/medicao/conferir.mjs [trecho do nome]   (sai com 1 se algo falhar)
// O Proa Acesa baixa o three.js do CDN: sem internet, a página dele falha aqui e no celular.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { comNavegadorDepuravel, comPaginaCarregada } from "../depuracao.mjs";
import { encontrarNavegador, sleep } from "../navegador.mjs";

const PAGINAS = [
    { pagina: "proa-acesa-08.html", passo: "proa-acesa/08-depuracao", cenarios: 2 },
    { pagina: "reflexo-08.html", passo: "reflexo/08-sombras", cenarios: 2 },
    { pagina: "dique-08.html", passo: "dique/08-celular", cenarios: 2 },
];
const ESPERA_PELA_MEDICAO_EM_SEGUNDOS = 60;
const QUADROS_DA_CONFERENCIA = 5;        // quadros pedidos por cenário: um quadro lento (shader no SwiftShader) conta como pausa, não como falta

const pastaDaMedicao = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(pastaDaMedicao, "..", "..");
const trecho = process.argv[2] || "";

let falhou = false;
for (const configuracao of PAGINAS.filter((item) => item.pagina.includes(trecho))) {
    const existe = existsSync(join(pastaDaMedicao, configuracao.pagina));
    const falhas = existe ? [...faltasNoEsqueleto(configuracao), ...(await falhasAoMedir(configuracao))] : ["a página não existe"];
    falhou ||= falhas.length > 0;
    console.log(falhas.length ? `FALHA  ${configuracao.pagina}\n  ${falhas.join("\n  ")}` : `PASS   ${configuracao.pagina}`);
}
process.exit(falhou ? 1 : 0);

function faltasNoEsqueleto({ pagina, passo }) {
    const html = readFileSync(join(pastaDaMedicao, pagina), "utf8");
    const pastaDoPasso = join(raiz, ...passo.split("/"));
    const codigo = readdirSync(pastaDoPasso).filter((nome) => nome.endsWith(".js")).map((nome) => readFileSync(join(pastaDoPasso, nome), "utf8")).join("\n");
    const idsDaPagina = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((achado) => achado[1]));
    const acoesDaPagina = new Set([...html.matchAll(/data-acao="([^"]+)"/g)].map((achado) => achado[1]));
    const faltas = [];
    for (const [, id] of codigo.matchAll(/getElementById\("([^"]+)"\)/g)) if (!idsDaPagina.has(id)) faltas.push(`falta o id "${id}", que o passo procura`);
    for (const [, acao] of codigo.matchAll(/\[data-acao="([^"]+)"\]/g)) if (!acoesDaPagina.has(acao)) faltas.push(`falta o botão data-acao="${acao}", que o passo procura`);
    return [...new Set(faltas)];
}

async function falhasAoMedir({ pagina, cenarios }) {
    const endereco = new URL(pathToFileURL(join(pastaDaMedicao, pagina)).href + "?auto=1&quadros=" + QUADROS_DA_CONFERENCIA + "&aquecimento=2");
    const { erros, carregou, resultado } = await comNavegadorDepuravel(encontrarNavegador(), (conexao) =>
        comPaginaCarregada(conexao, endereco, null, async ({ sessionId, erros, carregou }) => ({
            erros, carregou, resultado: carregou ? await esperarOResultado(conexao, sessionId) : null,
        })));

    const falhas = erros.map((erro) => "erro: " + erro);
    if (!carregou) return falhas;
    if (!resultado) return [...falhas, `a medição não terminou em ${ESPERA_PELA_MEDICAO_EM_SEGUNDOS} s (window.resultadoDaMedicao não apareceu)`];
    if (resultado.length !== cenarios) falhas.push(`esperava ${cenarios} cenários, vieram ${resultado.length}`);
    for (const cenario of resultado) {
        if (cenario.quadros + cenario.pausas < QUADROS_DA_CONFERENCIA || cenario.quadros < 1) falhas.push(`o cenário "${cenario.nome}" mediu ${cenario.quadros} quadros e ${cenario.pausas} pausas`);
    }
    return falhas;
}

/* Pergunta à página até ela entregar o resultado; uma pergunta que cai no meio de uma navegação só conta como "ainda não". */
async function esperarOResultado(conexao, sessionId) {
    const pergunta = "window.resultadoDaMedicao ? JSON.stringify(window.resultadoDaMedicao.resultados.map(function (r) { return { nome: r.nome, quadros: r.quadros, pausas: r.pausas }; })) : ''";
    for (let tentativa = 0; tentativa < ESPERA_PELA_MEDICAO_EM_SEGUNDOS * 2; tentativa++) {
        const resposta = await conexao.enviar("Runtime.evaluate", { expression: pergunta, returnByValue: true }, sessionId).catch(() => null);
        if (resposta?.result?.value) return JSON.parse(resposta.result.value);
        await sleep(500);
    }
    return null;
}
