// Executor das verificações — sem npm, só Node (>= 22) e um Chrome/Edge instalado.
//
//   node verificacao/rodar.mjs            roda toda verificacao/**/*.html e confere o marcador
//   node verificacao/rodar.mjs --fumaca   abre cada index.html do curso e lista erros de console
//   node verificacao/rodar.mjs --links    confere os links relativos de todos os .md
//   node verificacao/rodar.mjs <trecho>   só as páginas cujo caminho contém <trecho>
//   node verificacao/rodar.mjs <arquivo.html>   uma página de teste qualquer, mesmo fora da pasta
//
// Variável CHROME: caminho do navegador, se não for um dos lugares comuns.
// Saída: 0 tudo certo, 1 há falhas, 2 navegador não encontrado ou nenhuma página.
//
// Os modos fumaça e links ficam em fumaca.mjs e links.mjs; navegador.mjs e cdp.mjs cuidam do Chrome.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { rodarFumaca } from "./fumaca.mjs";
import { conferirLinks } from "./links.mjs";
import { argumentosHeadless, comPerfilTemporario, encontrarNavegador, executarComLimite } from "./navegador.mjs";

const pastaDoRepositorio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pastaDasVerificacoes = join(pastaDoRepositorio, "verificacao");

const argumentos = process.argv.slice(2);
const filtro = argumentos.find((argumento) => !argumento.startsWith("--"));

const MARCADOR = /RESULTADO: (\d+) ok, (\d+) falhas/g;
const LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS = 120000;

async function principal() {
    if (argumentos.includes("--links")) {
        return conferirLinks(pastaDoRepositorio);
    }
    if (argumentos.includes("--fumaca")) {
        const indices = listarArquivos(pastaDoRepositorio, (nome) => nome === "index.html", [pastaDasVerificacoes]);
        return rodarFumaca(aplicarFiltro(indices).map((caminho) => ({ caminho, nome: nomeCurto(caminho) })));
    }
    return rodarVerificacoes();
}


// ============================================================
// Modo normal: páginas de teste, resultado lido do DOM final
// ============================================================
async function rodarVerificacoes() {
    const navegador = encontrarNavegador();
    const paginas = filtro && filtro.endsWith(".html") && existsSync(filtro)
        ? [resolve(filtro)]
        : aplicarFiltro(listarArquivos(pastaDasVerificacoes, (nome) => nome.endsWith(".html")));

    if (paginas.length === 0) {
        console.error("Nenhuma página de teste encontrada.");
        return 2;
    }

    let algumaFalhou = false;

    for (const pagina of paginas) {
        const inicio = Date.now();
        const resultado = await rodarPaginaDeTeste(navegador, pagina);
        const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

        console.log(`${resultado.passou ? "PASS " : "FALHA"}  ${nomeCurto(pagina)}  (${resultado.resumo}, ${segundos}s)`);
        resultado.linhasDeFalha.forEach((linha) => console.log("        " + linha));
        algumaFalhou ||= !resultado.passou;
    }

    console.log(algumaFalhou ? "\nHÁ FALHAS." : "\nTudo certo.");
    return algumaFalhou ? 1 : 0;
}

/* Abre a página no Chrome headless e lê o <pre id="resultado"> do DOM final. */
async function rodarPaginaDeTeste(navegador, caminho) {
    const execucao = await comPerfilTemporario((pastaDoPerfil) => executarComLimite(
        navegador,
        argumentosHeadless(pastaDoPerfil, "--virtual-time-budget=60000", "--dump-dom", pathToFileURL(caminho).href),
        LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS
    ));

    const problemaDoProcesso = descreverFalhaDoProcesso(execucao);
    if (problemaDoProcesso) return { passou: false, resumo: problemaDoProcesso, linhasDeFalha: [] };

    const textoDoResultado = extrairTextoDoResultado(execucao.saida);
    if (textoDoResultado === null) return { passou: false, resumo: 'SEM <pre id="resultado"> no DOM final', linhasDeFalha: [] };

    // Toda linha FALHA reprova, venha antes ou depois do marcador (erros tardios).
    const linhasDeFalha = textoDoResultado.split("\n").filter((linha) => linha.startsWith("FALHA"));
    const marcadores = [...textoDoResultado.matchAll(MARCADOR)];

    if (marcadores.length === 0) return { passou: false, resumo: "SEM MARCADOR (a página não terminou ou deu erro)", linhasDeFalha };

    const [, acertos, falhasDeclaradas] = marcadores.at(-1).map(Number);
    return {
        passou: falhasDeclaradas === 0 && linhasDeFalha.length === 0 && acertos > 0,
        resumo: `${acertos} ok, ${Math.max(falhasDeclaradas, linhasDeFalha.length)} falhas`,
        linhasDeFalha,
    };
}

function descreverFalhaDoProcesso(execucao) {
    if (execucao.erro) return `não consegui executar o navegador: ${execucao.erro.message}`;
    if (execucao.estourou) return `TEMPO ESGOTADO (${LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS / 1000}s); o navegador foi encerrado`;
    if (execucao.sinal) return `o navegador foi morto pelo sinal ${execucao.sinal}`;
    if (execucao.codigo !== 0) {
        const ultimaLinha = execucao.saidaDeErro.trim().split("\n").pop() ?? "";
        return `o navegador saiu com código ${execucao.codigo}${ultimaLinha ? ": " + ultimaLinha : ""}`;
    }
    return null;
}

function extrairTextoDoResultado(html) {
    const encontrado = html.match(/<pre id="resultado"[^>]*>([\s\S]*?)<\/pre>/);
    return encontrado ? decodificarEntidades(encontrado[1]) : null;
}

const ENTIDADES = { lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " ", amp: "&" };

function decodificarEntidades(texto) {
    return texto.replace(/&(lt|gt|quot|#39|nbsp|amp);/g, (_, nome) => ENTIDADES[nome]);
}


// ============================================================
// Descoberta de páginas
// ============================================================
function listarArquivos(pasta, aceitar, pastasIgnoradas = []) {
    const encontrados = [];

    for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
        const caminho = join(pasta, entrada.name);

        if (entrada.isDirectory()) {
            const ignorada = entrada.name === ".git" || entrada.name === "node_modules" || pastasIgnoradas.includes(caminho);
            if (!ignorada) encontrados.push(...listarArquivos(caminho, aceitar, pastasIgnoradas));
        } else if (aceitar(entrada.name)) {
            encontrados.push(caminho);
        }
    }

    return encontrados.sort();
}

function nomeCurto(caminho) {
    return relative(pastaDoRepositorio, caminho).replaceAll("\\", "/");
}

function aplicarFiltro(caminhos) {
    return filtro ? caminhos.filter((caminho) => nomeCurto(caminho).includes(filtro)) : caminhos;
}


process.exit(await principal());
