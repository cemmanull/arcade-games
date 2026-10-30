// Confere as páginas de medição antes de mandá-las para o celular (elas não são páginas de teste: o rodar.mjs não as roda).
// Para cada página:
//   1. cada id (getElementById("…")) e cada [data-acao="…"] que os scripts do passo procuram existe nela, porque a página
//      é um esqueleto cortado do index.html do passo, não uma cópia;
//   2. ela carrega e mede (?auto=1&quadros=5&aquecimento=2) sem erro de console e entrega window.resultadoDaMedicao.
// Uso: node verificacao/medicao/conferir.mjs [trecho do nome]   (sai com 1 se algo falhar)
// O Proa Acesa baixa o three.js do CDN: sem internet, a página dele falha aqui e no celular.
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { comNavegadorDepuravel } from "../depuracao.mjs";
import { encontrarNavegador, sleep } from "../navegador.mjs";

const PAGINAS = [
    { pagina: "proa-acesa-08.html", passo: "proa-acesa/08-depuracao", cenarios: 2 },
    { pagina: "reflexo-08.html", passo: "reflexo/08-sombras", cenarios: 2 },
    { pagina: "dique-08.html", passo: "dique/08-celular", cenarios: 2 },
];
const ESPERA_PELA_MEDICAO_EM_SEGUNDOS = 60;

const pastaDaMedicao = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(pastaDaMedicao, "..", "..");
const trecho = process.argv[2] || "";

let falhou = false;
for (const configuracao of PAGINAS.filter((item) => item.pagina.includes(trecho))) {
    const falhas = [...faltasNoEsqueleto(configuracao), ...(await falhasAoMedir(configuracao))];
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
    const endereco = pathToFileURL(join(pastaDaMedicao, pagina)).href + "?auto=1&quadros=5&aquecimento=2";
    const erros = [];
    const resultado = await comNavegadorDepuravel(encontrarNavegador(), async (conexao) => {
        const { targetId } = await conexao.enviar("Target.createTarget", { url: "about:blank" });
        const { sessionId } = await conexao.enviar("Target.attachToTarget", { targetId, flatten: true });
        conexao.escutarSessao(sessionId, (evento) => {
            if (evento.method === "Runtime.exceptionThrown") erros.push("exceção: " + (evento.params.exceptionDetails.exception?.description || evento.params.exceptionDetails.text));
            if (evento.method === "Runtime.consoleAPICalled" && evento.params.type === "error") erros.push("console.error: " + evento.params.args.map((argumento) => argumento.value ?? argumento.description).join(" "));
            if (evento.method === "Log.entryAdded" && evento.params.entry.level === "error") erros.push("log: " + evento.params.entry.text + " " + (evento.params.entry.url || ""));
        });
        for (const dominio of ["Runtime", "Log", "Page"]) await conexao.enviar(`${dominio}.enable`, {}, sessionId);
        await conexao.enviar("Page.navigate", { url: endereco }, sessionId);
        let lido = null;
        for (let tentativa = 0; tentativa < ESPERA_PELA_MEDICAO_EM_SEGUNDOS * 2 && !lido; tentativa++) {
            await sleep(500);
            const { result } = await conexao.enviar("Runtime.evaluate", { expression: "window.resultadoDaMedicao ? JSON.stringify(window.resultadoDaMedicao.resultados.map(function (r) { return { nome: r.nome, quadros: r.quadros }; })) : ''", returnByValue: true }, sessionId);
            lido = result.value || null;
        }
        await conexao.enviar("Target.closeTarget", { targetId }).catch(() => {});
        return lido && JSON.parse(lido);
    });

    const falhas = erros.map((erro) => "erro de console: " + erro);
    if (!resultado) return [...falhas, `a medição não terminou em ${ESPERA_PELA_MEDICAO_EM_SEGUNDOS} s (window.resultadoDaMedicao não apareceu)`];
    if (resultado.length !== cenarios) falhas.push(`esperava ${cenarios} cenários, vieram ${resultado.length}`);
    for (const cenario of resultado) if (!(cenario.quadros >= 5)) falhas.push(`o cenário "${cenario.nome}" mediu só ${cenario.quadros} quadros`);
    return falhas;
}
