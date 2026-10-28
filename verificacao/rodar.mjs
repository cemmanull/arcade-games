// Executor das verificações — sem npm, só Node (>= 22) e um Chrome/Edge instalado.
//
//   node verificacao/rodar.mjs            roda toda verificacao/**/*.html e confere o marcador
//   node verificacao/rodar.mjs --fumaca   abre cada index.html do curso e lista erros de console
//   node verificacao/rodar.mjs --links    confere os links relativos dos .md e os href/src relativos dos .html
//   node verificacao/rodar.mjs <trecho>   só as páginas cujo caminho contém <trecho>
//   node verificacao/rodar.mjs <arquivo.html>   uma página de teste qualquer, mesmo fora da pasta
//   node verificacao/rodar.mjs --captura <arquivo.html> [--largura N] [--altura N] [--escala N] [--saida x.png]
//                                         grava um PNG da página (padrão 1280x800, escala 1, na pasta temporária)
//
//   node verificacao/rodar.mjs --autoteste   planta 15 defeitos e confere que este executor os pega
//
// O modo normal não roda verificacao/medicao/ nem verificacao/autoteste/ (só por caminho explícito).
// Variável CHROME: caminho do navegador, se não for um dos lugares comuns.
// Variável LIMITE_DA_PAGINA_EM_SEGUNDOS: teto de uma página de teste (padrão 120).
// Saída: 0 tudo certo, 1 há falhas, 2 navegador não encontrado, nenhuma página ou uso errado.
//
// Os outros modos ficam em fumaca.mjs, links.mjs e captura.mjs; navegador.mjs, depuracao.mjs e
// cdp.mjs cuidam do Chrome.

import { existsSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { capturarPagina } from "./captura.mjs";
import { rodarFumaca } from "./fumaca.mjs";
import { conferirLinks } from "./links.mjs";
import { argumentosHeadless, comPerfilTemporario, encontrarNavegador, executarComLimite } from "./navegador.mjs";

const pastaDoRepositorio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pastaDasVerificacoes = join(pastaDoRepositorio, "verificacao");
const pastasForaDoModoNormal = ["medicao", "autoteste"].map((nome) => join(pastaDasVerificacoes, nome));

const OPCOES_COM_VALOR = ["--largura", "--altura", "--escala", "--saida"];
const MODOS = ["--autoteste", "--links", "--captura", "--fumaca"];
const { valores: opcoes, restantes: argumentos } = separarOpcoesComValor(process.argv.slice(2));
const filtro = argumentos.find((argumento) => !argumento.startsWith("--"));

const MARCADOR = /RESULTADO: (\d+) ok, (\d+) falhas/g;
const LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS = lerLimiteDaPaginaEmMilissegundos();

/* 120 s, ou o valor positivo (em segundos) de LIMITE_DA_PAGINA_EM_SEGUNDOS; o autoteste usa 3 s no laço infinito. */
function lerLimiteDaPaginaEmMilissegundos() {
    const segundos = Number(process.env.LIMITE_DA_PAGINA_EM_SEGUNDOS);
    return Number.isFinite(segundos) && segundos > 0 ? segundos * 1000 : 120000;
}

async function principal() {
    const opcaoDesconhecida = argumentos.find((argumento) => argumento.startsWith("--") && !MODOS.includes(argumento));
    if (opcaoDesconhecida) {
        console.error(`Opção desconhecida: ${opcaoDesconhecida}. Modos: --fumaca, --links, --captura, --autoteste; sem opção, roda as páginas de teste (veja o começo de verificacao/rodar.mjs).`);
        return 2;
    }
    if (argumentos.includes("--autoteste")) {
        // Import dinâmico: as cópias do executor que o autoteste monta não levam a pasta autoteste/.
        const { rodarAutoteste } = await import("./autoteste/autoteste.mjs");
        return rodarAutoteste();
    }
    if (argumentos.includes("--links")) {
        return conferirLinks(pastaDoRepositorio);
    }
    if (argumentos.includes("--captura")) {
        return rodarCaptura();
    }
    if (argumentos.includes("--fumaca")) {
        const indices = listarArquivos(pastaDoRepositorio, (nome) => nome === "index.html", [pastaDasVerificacoes]);
        return rodarFumaca(aplicarFiltro(indices).map((caminho) => ({ caminho, nome: nomeCurto(caminho) })));
    }
    return rodarVerificacoes();
}


// ============================================================
// Modo captura: PNG de uma página
// ============================================================
async function rodarCaptura() {
    const pedido = lerPedidoDeCaptura();
    if (typeof pedido === "string") {
        console.error(pedido);
        return 2;
    }
    return capturarPagina(pedido);
}

/* Devolve o pedido de captura, ou o texto do erro de uso. */
function lerPedidoDeCaptura() {
    const USO = "Uso: node verificacao/rodar.mjs --captura <arquivo.html> [--largura N] [--altura N] [--escala N] [--saida caminho.png]";
    if (!filtro) return USO;
    if (!existsSync(filtro)) return `Arquivo não encontrado: ${filtro}
${USO}`;

    const largura = lerNumeroDaOpcao("largura", 1280, 1, 8000, true);
    const altura = lerNumeroDaOpcao("altura", 800, 1, 8000, true);
    const escala = lerNumeroDaOpcao("escala", 1, 0.1, 4, false);
    const invalida = [["largura", largura], ["altura", altura], ["escala", escala]].find(([, valor]) => Number.isNaN(valor));
    if (invalida) return `--${invalida[0]} inválida: "${opcoes[invalida[0]]}"
${USO}`;

    const caminho = resolve(filtro);
    return { caminho, nomeDaPagina: nomeCurto(caminho), largura, altura, escala, saida: opcoes.saida };
}

/* O valor numérico da opção, o padrão se ela não foi dada, ou NaN se está fora dos limites. */
function lerNumeroDaOpcao(nome, padrao, minimo, maximo, inteiro) {
    if (opcoes[nome] === undefined) return padrao;
    const valor = Number(opcoes[nome]);
    const valido = opcoes[nome] !== "" && Number.isFinite(valor) && valor >= minimo && valor <= maximo && (!inteiro || Number.isInteger(valor));
    return valido ? valor : Number.NaN;
}

/* Tira do caminho as opções que levam valor (--largura 800) para o valor não virar o filtro. */
function separarOpcoesComValor(todosOsArgumentos) {
    const valores = {};
    const restantes = [];

    for (let indice = 0; indice < todosOsArgumentos.length; indice++) {
        const argumento = todosOsArgumentos[indice];
        if (!OPCOES_COM_VALOR.includes(argumento)) {
            restantes.push(argumento);
            continue;
        }
        const proximo = todosOsArgumentos[indice + 1];
        const temValor = proximo !== undefined && !proximo.startsWith("--");
        valores[argumento.slice(2)] = temValor ? proximo : "";
        if (temValor) indice++;
    }
    return { valores, restantes };
}


// ============================================================
// Modo normal: páginas de teste, resultado lido do DOM final
// ============================================================
async function rodarVerificacoes() {
    const navegador = encontrarNavegador();
    const paginas = filtro && filtro.endsWith(".html") && existsSync(filtro)
        ? [resolve(filtro)]
        : aplicarFiltro(listarArquivos(pastaDasVerificacoes, (nome) => nome.endsWith(".html"), pastasForaDoModoNormal));

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
