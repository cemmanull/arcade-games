// Executor das verificações — sem npm, só Node (>= 22) e um Chrome/Edge instalado.
//
//   node verificacao/rodar.mjs            roda toda verificacao/**/*.html e confere o marcador
//   node verificacao/rodar.mjs --fumaca   abre cada index.html do curso e lista erros de console
//   node verificacao/rodar.mjs <trecho>   só as páginas cujo caminho contém <trecho>
//   node verificacao/rodar.mjs <arquivo.html>   uma página de teste qualquer, mesmo fora da pasta
//
// Variável CHROME: caminho do navegador, se não for um dos lugares comuns.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pastaDoRepositorio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pastaDasVerificacoes = join(pastaDoRepositorio, "verificacao");

const argumentos = process.argv.slice(2);
const modoFumaca = argumentos.includes("--fumaca");
const filtro = argumentos.find((argumento) => !argumento.startsWith("--"));

const MARCADOR = /RESULTADO: (\d+) ok, (\d+) falhas/g;
const ESPERA_DA_FUMACA_EM_MILISSEGUNDOS = 2000;
const PAGINAS_EM_PARALELO = 4;


// ============================================================
// Navegador
// ============================================================
function encontrarNavegador() {
    const candidatos = [
        process.env.CHROME,
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
    ];

    const achado = candidatos.find((caminho) => caminho && existsSync(caminho));
    if (!achado) {
        console.error("Chrome/Edge não encontrado. Defina a variável CHROME com o caminho do executável.");
        process.exit(2);
    }
    return achado;
}

function criarPastaTemporaria() {
    return mkdtempSync(join(tmpdir(), "verificacao-"));
}

function apagarPasta(pasta) {
    try {
        rmSync(pasta, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
        // o Chrome às vezes demora a soltar os arquivos; é lixo temporário, não é erro
    }
}


// ============================================================
// Descoberta de páginas
// ============================================================
function listarArquivos(pasta, aceitar, pastasIgnoradas = []) {
    const encontrados = [];

    for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
        const caminho = join(pasta, entrada.name);

        if (entrada.isDirectory()) {
            if (entrada.name === ".git" || entrada.name === "node_modules" || pastasIgnoradas.includes(caminho)) {
                continue;
            }
            encontrados.push(...listarArquivos(caminho, aceitar, pastasIgnoradas));
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


// ============================================================
// Modo normal: páginas de teste, resultado lido do DOM final
// ============================================================
function rodarPaginaDeTeste(navegador, caminho) {
    const pastaDoPerfil = criarPastaTemporaria();

    const execucao = spawnSync(navegador, [
        "--headless=new",
        "--disable-gpu",
        `--user-data-dir=${pastaDoPerfil}`,
        "--virtual-time-budget=60000",
        "--dump-dom",
        pathToFileURL(caminho).href,
    ], { encoding: "utf8", timeout: 120000, maxBuffer: 64 * 1024 * 1024 });

    apagarPasta(pastaDoPerfil);

    const saida = execucao.stdout ?? "";
    const marcadores = [...saida.matchAll(MARCADOR)];
    const linhasDeFalha = saida.split("\n").filter((linha) => linha.startsWith("FALHA"));

    if (marcadores.length === 0) {
        return { passou: false, resumo: "SEM MARCADOR (a página não terminou ou deu erro)", linhasDeFalha };
    }

    const ultimo = marcadores[marcadores.length - 1];
    const acertos = Number(ultimo[1]);
    const falhas = Number(ultimo[2]);

    return {
        passou: falhas === 0 && acertos > 0,
        resumo: `${acertos} ok, ${falhas} falhas`,
        linhasDeFalha,
    };
}

function rodarVerificacoes() {
    const navegador = encontrarNavegador();
    const paginas = filtro && filtro.endsWith(".html") && existsSync(filtro)
        ? [resolve(filtro)]
        : aplicarFiltro(listarArquivos(pastaDasVerificacoes, (nome) => nome.endsWith(".html")));

    if (paginas.length === 0) {
        console.error("Nenhuma página de teste encontrada.");
        process.exit(2);
    }

    let algumaFalhou = false;

    for (const pagina of paginas) {
        const inicio = Date.now();
        const resultado = rodarPaginaDeTeste(navegador, pagina);
        const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

        console.log(`${resultado.passou ? "PASS " : "FALHA"}  ${nomeCurto(pagina)}  (${resultado.resumo}, ${segundos}s)`);
        resultado.linhasDeFalha.forEach((linha) => console.log("        " + linha));

        if (!resultado.passou) {
            algumaFalhou = true;
        }
    }

    console.log(algumaFalhou ? "\nHÁ FALHAS." : "\nTudo certo.");
    process.exit(algumaFalhou ? 1 : 0);
}


// ============================================================
// Modo fumaça: DevTools Protocol, erros de console por página
// ============================================================
/*
  Por que CDP e não --enable-logging=stderr: o CDP entrega cada erro com o
  texto, o tipo (exceção, console.error, recurso que falhou) e a página
  certa, sem misturar a saída de várias páginas.
*/
function abrirConexao(enderecoWebSocket) {
    return new Promise((resolver, rejeitar) => {
        const soquete = new WebSocket(enderecoWebSocket);
        const esperandoResposta = new Map();
        const ouvintes = [];
        let proximoNumero = 1;

        soquete.onerror = () => rejeitar(new Error("não conectou ao DevTools"));
        soquete.onmessage = (mensagem) => {
            const conteudo = JSON.parse(mensagem.data);

            if (conteudo.id && esperandoResposta.has(conteudo.id)) {
                const { resolver: resolverResposta, rejeitar: rejeitarResposta } = esperandoResposta.get(conteudo.id);
                esperandoResposta.delete(conteudo.id);
                conteudo.error ? rejeitarResposta(new Error(conteudo.error.message)) : resolverResposta(conteudo.result);
            } else if (conteudo.method) {
                ouvintes.forEach((ouvinte) => ouvinte(conteudo));
            }
        };
        soquete.onopen = () => resolver({
            enviar(metodo, parametros = {}, sessionId) {
                const id = proximoNumero++;
                soquete.send(JSON.stringify({ id, method: metodo, params: parametros, sessionId }));
                return new Promise((resolverResposta, rejeitarResposta) => {
                    esperandoResposta.set(id, { resolver: resolverResposta, rejeitar: rejeitarResposta });
                });
            },
            aoReceberEvento: (ouvinte) => ouvintes.push(ouvinte),
            fechar: () => soquete.close(),
        });
    });
}

async function esperarArquivoDeDepuracao(pastaDoPerfil) {
    const arquivo = join(pastaDoPerfil, "DevToolsActivePort");

    for (let tentativa = 0; tentativa < 100; tentativa++) {
        if (existsSync(arquivo)) {
            const [porta, caminho] = readFileSync(arquivo, "utf8").split("\n");
            if (caminho) {
                return `ws://127.0.0.1:${porta}${caminho}`;
            }
        }
        await new Promise((pronto) => setTimeout(pronto, 100));
    }
    throw new Error("o navegador não abriu a porta de depuração");
}

function textoDoValor(argumento) {
    if (argumento.value !== undefined) {
        return String(argumento.value);
    }
    return argumento.description ?? argumento.type;
}

async function examinarPagina(conexao, caminho) {
    const erros = [];

    const { targetId } = await conexao.enviar("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await conexao.enviar("Target.attachToTarget", { targetId, flatten: true });

    conexao.aoReceberEvento((evento) => {
        if (evento.sessionId !== sessionId) {
            return;
        }

        if (evento.method === "Runtime.exceptionThrown") {
            const detalhe = evento.params.exceptionDetails;
            const texto = detalhe.exception?.description ?? detalhe.text;
            erros.push(`exceção: ${texto.split("\n")[0]}`);
        } else if (evento.method === "Runtime.consoleAPICalled" && evento.params.type === "error") {
            erros.push(`console.error: ${evento.params.args.map(textoDoValor).join(" ")}`);
        } else if (evento.method === "Log.entryAdded" && evento.params.entry.level === "error") {
            const entrada = evento.params.entry;
            erros.push(`${entrada.source}: ${entrada.text}${entrada.url ? " (" + entrada.url + ")" : ""}`);
        } else if (evento.method === "Page.javascriptDialogOpening") {
            conexao.enviar("Page.handleJavaScriptDialog", { accept: true }, sessionId);
        }
    });

    await conexao.enviar("Runtime.enable", {}, sessionId);
    await conexao.enviar("Log.enable", {}, sessionId);
    await conexao.enviar("Page.enable", {}, sessionId);
    await conexao.enviar("Page.navigate", { url: pathToFileURL(caminho).href }, sessionId);

    await new Promise((pronto) => setTimeout(pronto, ESPERA_DA_FUMACA_EM_MILISSEGUNDOS));
    await conexao.enviar("Target.closeTarget", { targetId });

    return erros;
}

async function rodarFumaca() {
    const navegador = encontrarNavegador();
    const paginas = aplicarFiltro(listarArquivos(
        pastaDoRepositorio,
        (nome) => nome === "index.html",
        [pastaDasVerificacoes]
    ));

    const pastaDoPerfil = criarPastaTemporaria();
    const processo = spawn(navegador, [
        "--headless=new",
        "--disable-gpu",
        "--enable-unsafe-swiftshader",
        "--autoplay-policy=no-user-gesture-required",
        "--remote-debugging-port=0",
        `--user-data-dir=${pastaDoPerfil}`,
        "about:blank",
    ], { stdio: "ignore" });

    const resultados = new Map();

    try {
        const conexao = await abrirConexao(await esperarArquivoDeDepuracao(pastaDoPerfil));
        const fila = [...paginas];

        const trabalhador = async () => {
            while (fila.length > 0) {
                const pagina = fila.shift();
                try {
                    resultados.set(pagina, await examinarPagina(conexao, pagina));
                } catch (erro) {
                    resultados.set(pagina, [`falha do executor: ${erro.message}`]);
                }
            }
        };

        await Promise.all(Array.from({ length: PAGINAS_EM_PARALELO }, trabalhador));
        conexao.fechar();
    } finally {
        processo.kill();
        setTimeout(() => apagarPasta(pastaDoPerfil), 1000);
    }

    let comErro = 0;
    for (const pagina of paginas) {
        const erros = resultados.get(pagina) ?? ["sem resultado"];
        const status = erros.length === 0 ? "ok  " : "ERRO";
        comErro += erros.length === 0 ? 0 : 1;
        console.log(`${status}  ${nomeCurto(pagina)}${erros.length ? `  [${erros.length}] ${erros[0]}` : ""}`);
    }

    console.log(`\n${paginas.length} páginas, ${paginas.length - comErro} ok, ${comErro} com erro.`);
    process.exit(comErro === 0 ? 0 : 1);
}


if (modoFumaca) {
    await rodarFumaca();
} else {
    rodarVerificacoes();
}
