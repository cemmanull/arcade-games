// Executor das verificações — sem npm, só Node (>= 22) e um Chrome/Edge instalado.
//
//   node verificacao/rodar.mjs            roda toda verificacao/**/*.html e confere o marcador
//   node verificacao/rodar.mjs --fumaca   abre cada index.html do curso e lista erros de console
//   node verificacao/rodar.mjs --links    confere os links relativos de todos os .md
//   node verificacao/rodar.mjs <trecho>   só as páginas cujo caminho contém <trecho>
//   node verificacao/rodar.mjs <arquivo.html>   uma página de teste qualquer, mesmo fora da pasta
//
// Variável CHROME: caminho do navegador, se não for um dos lugares comuns.

import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const pastaDoRepositorio = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pastaDasVerificacoes = join(pastaDoRepositorio, "verificacao");

const argumentos = process.argv.slice(2);
const modoFumaca = argumentos.includes("--fumaca");
const modoLinks = argumentos.includes("--links");
const filtro = argumentos.find((argumento) => !argumento.startsWith("--"));

const MARCADOR = /RESULTADO: (\d+) ok, (\d+) falhas/g;
const LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS = 120000;
const LIMITE_DE_CARGA_DA_FUMACA_EM_MILISSEGUNDOS = 15000;
const ASSENTAMENTO_DA_FUMACA_EM_MILISSEGUNDOS = 1000;
const LIMITE_DE_UM_COMANDO_CDP_EM_MILISSEGUNDOS = 30000;
const PAGINAS_EM_PARALELO = 4;
const WINDOWS = process.platform === "win32";

/*
  Erros conhecidos e propositais da fumaça. Uma página só entra aqui se o erro
  é parte do curso; qualquer outro erro nela continua reprovando a execução.
  `pagina` é o caminho a partir da raiz do repositório; `padrao` precisa
  casar com a linha de erro inteira, então prenda-o ao arquivo ou recurso.
*/
const ERROS_ESPERADOS = [
    {
        pagina: "tutorial/01-html/index.html",
        padrao: /ERR_FILE_NOT_FOUND.*\/(nao-existe|tambem-nao-existe)\.png/,
        motivo: "a lição mostra o texto alternativo (alt) de uma imagem que não existe, de propósito",
    },
    {
        pagina: "dealer-out/final/index.html",
        padrao: /^(network: Failed to load resource: net::ERR_FAILED|javascript: Access to manifest at) .*manifest\.webmanifest/,
        motivo: "o manifesto do PWA é bloqueado por CORS em file://; o jogo abre, mas só instala servido por https (ver dealer-out/final/GUIA.md)",
    },
];

const sleep = (milissegundos) => new Promise((pronto) => setTimeout(pronto, milissegundos));


// ============================================================
// Navegador
// ============================================================
function motivoDeNaoSerExecutavel(caminho) {
    if (!existsSync(caminho)) {
        return "o arquivo não existe";
    }
    if (!statSync(caminho).isFile()) {
        return "o caminho não é um arquivo";
    }
    try {
        accessSync(caminho, constants.X_OK);
    } catch {
        return "o arquivo não tem permissão de execução";
    }
    return null;
}

function procurarNoPath() {
    const nomes = [
        "chrome", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
        "microsoft-edge", "microsoft-edge-stable",
    ];
    const comandoDeBusca = WINDOWS ? "where" : "which";

    for (const nome of nomes) {
        const busca = spawnSync(comandoDeBusca, [nome], { encoding: "utf8" });
        const primeiroResultado = busca.status === 0 ? busca.stdout.split(/\r?\n/)[0].trim() : "";
        if (primeiroResultado) {
            return primeiroResultado;
        }
    }
    return null;
}

function encontrarNavegador() {
    const informado = process.env.CHROME;
    if (informado) {
        const motivo = motivoDeNaoSerExecutavel(informado);
        if (motivo) {
            console.error(`A variável CHROME ("${informado}") não serve: ${motivo}.`);
            process.exit(2);
        }
        return informado;
    }

    const candidatos = [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
        join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
        join(homedir(), "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
        "/opt/google/chrome/chrome",
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
    ];

    const achado = candidatos.find((caminho) => caminho && existsSync(caminho)) ?? procurarNoPath();
    if (!achado) {
        console.error("Chrome/Edge não encontrado. Defina a variável CHROME com o caminho do executável.");
        process.exit(2);
    }
    return achado;
}

function criarPastaTemporaria() {
    return mkdtempSync(join(tmpdir(), "verificacao-"));
}

// O Chrome (e os processos filhos dele) demoram a soltar os arquivos no Windows.
async function apagarPasta(pasta) {
    for (let tentativa = 1; tentativa <= 15; tentativa++) {
        try {
            rmSync(pasta, { recursive: true, force: true });
            return;
        } catch (erro) {
            if (tentativa === 15) {
                console.error(`Aviso: não consegui apagar ${pasta} (${erro.code ?? erro.message}).`);
                return;
            }
            await sleep(300);
        }
    }
}


// ============================================================
// Processos
// ============================================================
function matarArvoreDeProcessos(processo) {
    if (processo.pid === undefined) {
        return;
    }
    if (WINDOWS) {
        spawnSync("taskkill", ["/T", "/F", "/PID", String(processo.pid)], { stdio: "ignore" });
        return;
    }
    try {
        process.kill(-processo.pid, "SIGKILL");   // o processo foi criado como líder de grupo
    } catch {
        processo.kill("SIGKILL");
    }
}

/*
  Inicia um processo sem lançar exceção: `terminou` sempre resolve, com
  { codigo, sinal, erro }. `erro` é o que impediu a execução (ex.: ENOENT).
*/
function iniciarProcesso(comando, argumentosDoComando, opcoes = {}) {
    let processo;
    try {
        processo = spawn(comando, argumentosDoComando, { ...opcoes, detached: !WINDOWS, windowsHide: true });
    } catch (erro) {   // alguns erros (ex.: EFTYPE, EACCES) são lançados na hora, não como evento
        return { processo: { pid: undefined, kill() { } }, terminou: Promise.resolve({ codigo: null, sinal: null, erro }) };
    }
    const terminou = new Promise((resolver) => {
        processo.once("error", (erro) => resolver({ codigo: null, sinal: null, erro }));
        processo.once("close", (codigo, sinal) => resolver({ codigo, sinal, erro: null }));
    });
    return { processo, terminou };
}

async function executarComLimite(comando, argumentosDoComando, limiteEmMilissegundos) {
    const { processo, terminou } = iniciarProcesso(comando, argumentosDoComando, { stdio: ["ignore", "pipe", "pipe"] });
    const pedacosDaSaida = [];
    const pedacosDoErro = [];
    processo.stdout?.on("data", (pedaco) => pedacosDaSaida.push(pedaco));
    processo.stderr?.on("data", (pedaco) => pedacosDoErro.push(pedaco));

    let estourou = false;
    const alarme = setTimeout(() => {
        estourou = true;
        matarArvoreDeProcessos(processo);
    }, limiteEmMilissegundos);

    const fim = await terminou;
    clearTimeout(alarme);

    return {
        ...fim,
        estourou,
        saida: Buffer.concat(pedacosDaSaida).toString("utf8"),
        saidaDeErro: Buffer.concat(pedacosDoErro).toString("utf8"),
    };
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
function decodificarEntidades(texto) {
    return texto
        .replaceAll("&lt;", "<")
        .replaceAll("&gt;", ">")
        .replaceAll("&quot;", '"')
        .replaceAll("&#39;", "'")
        .replaceAll("&nbsp;", " ")
        .replaceAll("&amp;", "&");
}

function extrairTextoDoResultado(html) {
    const encontrado = html.match(/<pre id="resultado"[^>]*>([\s\S]*?)<\/pre>/);
    return encontrado ? decodificarEntidades(encontrado[1]) : null;
}

function descreverFalhaDoProcesso(execucao) {
    if (execucao.erro) {
        return `não consegui executar o navegador: ${execucao.erro.message}`;
    }
    if (execucao.estourou) {
        return `TEMPO ESGOTADO (${LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS / 1000}s); o navegador foi encerrado`;
    }
    if (execucao.sinal) {
        return `o navegador foi morto pelo sinal ${execucao.sinal}`;
    }
    if (execucao.codigo !== 0) {
        const ultimaLinha = execucao.saidaDeErro.trim().split("\n").pop() ?? "";
        return `o navegador saiu com código ${execucao.codigo}${ultimaLinha ? ": " + ultimaLinha : ""}`;
    }
    return null;
}

async function rodarPaginaDeTeste(navegador, caminho) {
    const pastaDoPerfil = criarPastaTemporaria();

    const execucao = await executarComLimite(navegador, [
        "--headless=new",
        "--disable-gpu",
        `--user-data-dir=${pastaDoPerfil}`,
        "--virtual-time-budget=60000",
        "--dump-dom",
        pathToFileURL(caminho).href,
    ], LIMITE_DA_PAGINA_DE_TESTE_EM_MILISSEGUNDOS);

    await apagarPasta(pastaDoPerfil);

    const problemaDoProcesso = descreverFalhaDoProcesso(execucao);
    if (problemaDoProcesso) {
        return { passou: false, resumo: problemaDoProcesso, linhasDeFalha: [] };
    }

    const textoDoResultado = extrairTextoDoResultado(execucao.saida);
    if (textoDoResultado === null) {
        return { passou: false, resumo: 'SEM <pre id="resultado"> no DOM final', linhasDeFalha: [] };
    }

    // Toda linha FALHA reprova, venha antes ou depois do marcador (erros tardios).
    const linhasDeFalha = textoDoResultado.split("\n").filter((linha) => linha.startsWith("FALHA"));
    const marcadores = [...textoDoResultado.matchAll(MARCADOR)];

    if (marcadores.length === 0) {
        return { passou: false, resumo: "SEM MARCADOR (a página não terminou ou deu erro)", linhasDeFalha };
    }

    const ultimo = marcadores[marcadores.length - 1];
    const acertos = Number(ultimo[1]);
    const falhasDeclaradas = Number(ultimo[2]);

    return {
        passou: falhasDeclaradas === 0 && linhasDeFalha.length === 0 && acertos > 0,
        resumo: `${acertos} ok, ${Math.max(falhasDeclaradas, linhasDeFalha.length)} falhas`,
        linhasDeFalha,
    };
}

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

        if (!resultado.passou) {
            algumaFalhou = true;
        }
    }

    console.log(algumaFalhou ? "\nHÁ FALHAS." : "\nTudo certo.");
    return algumaFalhou ? 1 : 0;
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
        const ouvintesPorSessao = new Map();
        let proximoNumero = 1;
        let fechada = false;

        const rejeitarTudo = (motivo) => {
            fechada = true;
            for (const { rejeitar: rejeitarResposta, alarme } of esperandoResposta.values()) {
                clearTimeout(alarme);
                rejeitarResposta(new Error(motivo));
            }
            esperandoResposta.clear();
        };

        soquete.onerror = () => rejeitar(new Error("não conectou ao DevTools"));
        soquete.onclose = () => rejeitarTudo("a conexão com o navegador foi fechada");
        soquete.onmessage = (mensagem) => {
            const conteudo = JSON.parse(mensagem.data);

            if (conteudo.id && esperandoResposta.has(conteudo.id)) {
                const { resolver: resolverResposta, rejeitar: rejeitarResposta, alarme } = esperandoResposta.get(conteudo.id);
                esperandoResposta.delete(conteudo.id);
                clearTimeout(alarme);
                conteudo.error ? rejeitarResposta(new Error(conteudo.error.message)) : resolverResposta(conteudo.result);
            } else if (conteudo.method) {
                ouvintesPorSessao.get(conteudo.sessionId)?.(conteudo);
            }
        };
        soquete.onopen = () => resolver({
            enviar(metodo, parametros = {}, sessionId) {
                if (fechada) {
                    return Promise.reject(new Error("a conexão com o navegador está fechada"));
                }
                const id = proximoNumero++;
                return new Promise((resolverResposta, rejeitarResposta) => {
                    const alarme = setTimeout(() => {
                        esperandoResposta.delete(id);
                        rejeitarResposta(new Error(`${metodo} não respondeu em ${LIMITE_DE_UM_COMANDO_CDP_EM_MILISSEGUNDOS / 1000}s`));
                    }, LIMITE_DE_UM_COMANDO_CDP_EM_MILISSEGUNDOS);
                    esperandoResposta.set(id, { resolver: resolverResposta, rejeitar: rejeitarResposta, alarme });
                    soquete.send(JSON.stringify({ id, method: metodo, params: parametros, sessionId }));
                });
            },
            escutarSessao: (sessionId, ouvinte) => ouvintesPorSessao.set(sessionId, ouvinte),
            pararDeEscutarSessao: (sessionId) => ouvintesPorSessao.delete(sessionId),
            fechar: () => soquete.close(),
        });
    });
}

async function esperarArquivoDeDepuracao(pastaDoPerfil, navegadorEncerrado) {
    const arquivo = join(pastaDoPerfil, "DevToolsActivePort");

    for (let tentativa = 0; tentativa < 100; tentativa++) {
        if (navegadorEncerrado.fim) {
            const { erro, codigo, sinal } = navegadorEncerrado.fim;
            throw new Error(erro ? `não consegui executar o navegador: ${erro.message}` : `o navegador saiu antes da hora (código ${codigo}, sinal ${sinal})`);
        }
        if (existsSync(arquivo)) {
            const [porta, caminho] = readFileSync(arquivo, "utf8").split("\n");
            if (caminho) {
                return `ws://127.0.0.1:${porta}${caminho}`;
            }
        }
        await sleep(100);
    }
    throw new Error("o navegador não abriu a porta de depuração");
}

function textoDoValor(argumento) {
    if (argumento.value !== undefined) {
        return String(argumento.value);
    }
    return argumento.description ?? argumento.type;
}

function descreverEvento(evento, conexao, sessionId) {
    if (evento.method === "Runtime.exceptionThrown") {
        const detalhe = evento.params.exceptionDetails;
        const texto = detalhe.exception?.description ?? detalhe.text;
        return `exceção: ${texto.split("\n")[0]}`;
    }
    if (evento.method === "Runtime.consoleAPICalled" && evento.params.type === "error") {
        return `console.error: ${evento.params.args.map(textoDoValor).join(" ")}`;
    }
    if (evento.method === "Log.entryAdded" && evento.params.entry.level === "error") {
        const entrada = evento.params.entry;
        return `${entrada.source}: ${entrada.text}${entrada.url ? " (" + entrada.url + ")" : ""}`;
    }
    if (evento.method === "Page.javascriptDialogOpening") {
        conexao.enviar("Page.handleJavaScriptDialog", { accept: true }, sessionId).catch(() => {});
    }
    return null;
}

async function examinarPagina(conexao, caminho) {
    const erros = [];

    let sessionId = null;
    const { targetId } = await conexao.enviar("Target.createTarget", { url: "about:blank" });
    try {
        ({ sessionId } = await conexao.enviar("Target.attachToTarget", { targetId, flatten: true }));
        let avisarQueCarregou;
        const aCargaTerminou = new Promise((pronto) => { avisarQueCarregou = pronto; });

        conexao.escutarSessao(sessionId, (evento) => {
            if (evento.method === "Page.loadEventFired") {
                avisarQueCarregou();
            }
            const erro = descreverEvento(evento, conexao, sessionId);
            if (erro) {
                erros.push(erro);
            }
        });

        await conexao.enviar("Runtime.enable", {}, sessionId);
        await conexao.enviar("Log.enable", {}, sessionId);
        await conexao.enviar("Page.enable", {}, sessionId);

        const navegacao = await conexao.enviar("Page.navigate", { url: pathToFileURL(caminho).href }, sessionId);
        if (navegacao.errorText) {
            erros.push(`navegação: ${navegacao.errorText}`);
            return erros;
        }

        const carregou = await Promise.race([
            aCargaTerminou.then(() => true),
            sleep(LIMITE_DE_CARGA_DA_FUMACA_EM_MILISSEGUNDOS).then(() => false),
        ]);
        if (!carregou) {
            erros.push(`a página não terminou de carregar em ${LIMITE_DE_CARGA_DA_FUMACA_EM_MILISSEGUNDOS / 1000}s`);
        }
        await sleep(ASSENTAMENTO_DA_FUMACA_EM_MILISSEGUNDOS);

        return erros;
    } finally {
        await conexao.enviar("Target.closeTarget", { targetId }).catch(() => {});
        if (sessionId !== null) {
            conexao.pararDeEscutarSessao(sessionId);
        }
    }
}

function classificarErros(pagina, erros) {
    const esperados = [];
    const inesperados = [];

    for (const erro of erros) {
        const regra = ERROS_ESPERADOS.find((candidata) => candidata.pagina === nomeCurto(pagina) && candidata.padrao.test(erro));
        regra ? esperados.push({ erro, motivo: regra.motivo }) : inesperados.push(erro);
    }

    return { esperados, inesperados };
}

async function encerrarNavegador(conexao, processo, terminou) {
    await conexao?.enviar("Browser.close").catch(() => {});
    const saiuSozinho = await Promise.race([terminou.then(() => true), sleep(5000).then(() => false)]);

    if (!saiuSozinho) {
        matarArvoreDeProcessos(processo);
        await Promise.race([terminou, sleep(5000)]);
    }
    conexao?.fechar();
}

async function rodarFumaca() {
    const navegador = encontrarNavegador();
    const paginas = aplicarFiltro(listarArquivos(
        pastaDoRepositorio,
        (nome) => nome === "index.html",
        [pastaDasVerificacoes]
    ));

    const pastaDoPerfil = criarPastaTemporaria();
    const { processo, terminou } = iniciarProcesso(navegador, [
        "--headless=new",
        "--disable-gpu",
        "--enable-unsafe-swiftshader",
        "--autoplay-policy=no-user-gesture-required",
        "--remote-debugging-port=0",
        `--user-data-dir=${pastaDoPerfil}`,
        "about:blank",
    ], { stdio: "ignore" });

    const navegadorEncerrado = { fim: null };
    terminou.then((fim) => { navegadorEncerrado.fim = fim; });

    const resultados = new Map();
    let conexao = null;
    let erroGeral = null;

    try {
        conexao = await abrirConexao(await esperarArquivoDeDepuracao(pastaDoPerfil, navegadorEncerrado));
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
    } catch (erro) {
        erroGeral = erro;
    } finally {
        await encerrarNavegador(conexao, processo, terminou);
        await apagarPasta(pastaDoPerfil);
    }

    if (erroGeral) {
        console.error(`Fumaça interrompida: ${erroGeral.message}`);
    }

    return relatarFumaca(paginas, resultados) === 0 && !erroGeral ? 0 : 1;
}

// Imprime o relatório e devolve quantas páginas têm erro inesperado.
function relatarFumaca(paginas, resultados) {
    let comErroInesperado = 0;
    let soComErrosEsperados = 0;

    for (const pagina of paginas) {
        const { esperados, inesperados } = classificarErros(pagina, resultados.get(pagina) ?? ["sem resultado"]);
        const nome = nomeCurto(pagina);

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


// ============================================================
// Modo links: links relativos em Markdown
// ============================================================
function listarArquivosMarkdown() {
    const busca = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "--", "*.md"], {
        cwd: pastaDoRepositorio,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
    });
    if (busca.error || busca.status !== 0) {
        throw new Error(`git ls-files falhou: ${busca.error?.message ?? busca.stderr.trim()}`);
    }
    return [...new Set(busca.stdout.split(/\r?\n/).filter(Boolean))]
        .map((arquivo) => join(pastaDoRepositorio, arquivo))
        .filter((arquivo) => existsSync(arquivo));   // apagado, mas ainda no índice do git
}

// Devolve [{ linha, destino }] de cada [texto](destino) fora de blocos e trechos de código.
function extrairLinks(textoMarkdown) {
    const links = [];
    let delimitadorAberto = null;

    textoMarkdown.split(/\r?\n/).forEach((linhaDoArquivo, indice) => {
        const cerca = linhaDoArquivo.match(/^\s*(`{3,}|~{3,})/);
        if (cerca) {
            if (delimitadorAberto === null) {
                delimitadorAberto = cerca[1][0];
            } else if (cerca[1][0] === delimitadorAberto) {
                delimitadorAberto = null;
            }
            return;
        }
        if (delimitadorAberto !== null) {
            return;
        }

        const semCodigo = linhaDoArquivo.replace(/(`+).+?\1/g, "");
        for (const encontrado of semCodigo.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
            links.push({ linha: indice + 1, destino: encontrado[1] });
        }
    });

    return links;
}

function destinoLocal(destino) {
    if (destino.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(destino)) {
        return null;   // âncora da própria página, http(s):, mailto: …
    }
    const semAncora = destino.split("#")[0].split("?")[0];
    try {
        return decodeURIComponent(semAncora);
    } catch {
        return semAncora;
    }
}

// existsSync não distingue maiúsculas no Windows; o GitHub (Linux) distingue.
function existeComAMesmaCaixa(caminho) {
    if (!existsSync(caminho)) {
        return false;
    }
    const pedacos = relative(pastaDoRepositorio, caminho).split(sep).filter((pedaco) => pedaco && pedaco !== "..");
    let pastaAtual = pastaDoRepositorio;

    for (const pedaco of pedacos) {
        if (!readdirSync(pastaAtual).includes(pedaco)) {
            return false;
        }
        pastaAtual = join(pastaAtual, pedaco);
    }
    return true;
}

function conferirLinks() {
    const arquivos = listarArquivosMarkdown();
    const quebrados = [];
    let totalDeLinks = 0;

    for (const arquivo of arquivos) {
        for (const { linha, destino } of extrairLinks(readFileSync(arquivo, "utf8"))) {
            const alvo = destinoLocal(destino);
            if (alvo === null || alvo === "") {
                continue;
            }
            totalDeLinks++;

            const caminho = alvo.startsWith("/")
                ? join(pastaDoRepositorio, alvo)
                : resolve(dirname(arquivo), alvo);
            if (!existeComAMesmaCaixa(caminho)) {
                quebrados.push(`${nomeCurto(arquivo)}:${linha}  ${destino}`);
            }
        }
    }

    quebrados.forEach((quebrado) => console.log("QUEBRADO  " + quebrado));
    console.log(`${arquivos.length} arquivos .md, ${totalDeLinks} links relativos, ${quebrados.length} quebrados.`);
    return quebrados.length === 0 ? 0 : 1;
}


const codigoDeSaida = modoLinks ? conferirLinks() : modoFumaca ? await rodarFumaca() : await rodarVerificacoes();
process.exit(codigoDeSaida);
