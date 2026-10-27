// Tudo de "executar um Chrome": achar o executável, perfil temporário e processos.
// Todo Chrome do executor é --headless=new com --user-data-dir temporário; nunca o perfil do usuário.

import { spawn, spawnSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdtempSync, rmSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join } from "node:path";

const WINDOWS = process.platform === "win32";
const TENTATIVAS_DE_APAGAR_O_PERFIL = 15;
export const ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS = 5000;

export const sleep = (milissegundos) => new Promise((pronto) => setTimeout(pronto, milissegundos));

/* Espera a promessa por até `milissegundos`; devolve o valor dela, ou null se o prazo acabou antes. */
export async function esperarComLimite(promessa, milissegundos) {
    let alarme;
    const prazo = new Promise((pronto) => { alarme = setTimeout(pronto, milissegundos, null); });
    try {
        return await Promise.race([promessa, prazo]);
    } finally {
        clearTimeout(alarme);
    }
}


// ============================================================
// Executável
// ============================================================
const LUGARES_COMUNS = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
    join(homedir(), "Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"),
    "/opt/google/chrome/chrome", "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium",
];

const NOMES_NO_PATH = [
    "chrome", "google-chrome", "google-chrome-stable", "chromium", "chromium-browser",
    "microsoft-edge", "microsoft-edge-stable",
];

/* Devolve o caminho do navegador; sem ele, explica e encerra com código 2. */
export function encontrarNavegador() {
    const informado = process.env.CHROME;
    if (informado) {
        const motivo = motivoDeNaoSerExecutavel(informado);
        if (motivo) encerrarComErro(`A variável CHROME ("${informado}") não serve: ${motivo}.`);
        return informado;
    }

    const achado = LUGARES_COMUNS.find((caminho) => caminho && existsSync(caminho)) ?? procurarNoPath();
    if (!achado) encerrarComErro("Chrome/Edge não encontrado. Defina a variável CHROME com o caminho do executável.");
    return achado;
}

function encerrarComErro(mensagem) {
    console.error(mensagem);
    process.exit(2);
}

function motivoDeNaoSerExecutavel(caminho) {
    if (!existsSync(caminho)) return "o arquivo não existe";
    if (!statSync(caminho).isFile()) return "o caminho não é um arquivo";
    try {
        accessSync(caminho, constants.X_OK);
    } catch {
        return "o arquivo não tem permissão de execução";
    }
    return null;
}

function procurarNoPath() {
    for (const nome of NOMES_NO_PATH) {
        const busca = spawnSync(WINDOWS ? "where" : "which", [nome], { encoding: "utf8" });
        const primeiroResultado = busca.status === 0 ? busca.stdout.split(/\r?\n/)[0].trim() : "";
        if (primeiroResultado) return primeiroResultado;
    }
    return null;
}

export function argumentosHeadless(pastaDoPerfil, ...outrosArgumentos) {
    return ["--headless=new", "--disable-gpu", `--user-data-dir=${pastaDoPerfil}`, ...outrosArgumentos];
}


// ============================================================
// Perfil temporário
// ============================================================
export async function comPerfilTemporario(usar) {
    const pastaDoPerfil = mkdtempSync(join(tmpdir(), "verificacao-"));
    try {
        return await usar(pastaDoPerfil);
    } finally {
        await apagarPerfil(pastaDoPerfil);
    }
}

// O Chrome (e os processos filhos dele) demoram a soltar os arquivos no Windows.
export async function apagarPerfil(pastaDoPerfil) {
    for (let tentativa = 1; tentativa <= TENTATIVAS_DE_APAGAR_O_PERFIL; tentativa++) {
        try {
            rmSync(pastaDoPerfil, { recursive: true, force: true });
            return;
        } catch (erro) {
            if (tentativa === TENTATIVAS_DE_APAGAR_O_PERFIL) {
                console.error(`Aviso: não consegui apagar ${pastaDoPerfil} (${erro.code ?? erro.message}).`);
                return;
            }
            if (tentativa === 1) matarProcessosQueUsamOPerfil(pastaDoPerfil);
            await sleep(300);
        }
    }
}

/*
  No Windows, `taskkill /T` não alcança um filho que perdeu o pai (ex.: o crashpad), e ele
  mantém o perfil preso. Então, se a pasta não saiu, mata quem tem o nome dela na linha de
  comando. O nome é único (mkdtemp), logo só casa com processos desta execução. Vai por
  variável de ambiente para a linha de comando do próprio PowerShell não casar.
*/
function matarProcessosQueUsamOPerfil(pastaDoPerfil) {
    if (!WINDOWS) return;
    // Sem esta trava, um nome vazio viraria o padrão '**' e mataria todos os processos da máquina.
    if (!/^verificacao-\w{6,}$/.test(basename(pastaDoPerfil))) return;
    const roteiro = "Get-CimInstance Win32_Process"
        + " | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like ('*' + $env:PASTA_DO_PERFIL + '*') }"
        + " | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }";
    spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", roteiro], {
        stdio: "ignore",
        windowsHide: true,
        env: { ...process.env, PASTA_DO_PERFIL: basename(pastaDoPerfil) },
    });
}


// ============================================================
// Processos
// ============================================================
/*
  Inicia um processo sem lançar exceção: `terminou` sempre resolve, com { codigo, sinal, erro }
  (`erro` é o que impediu a execução, ex.: ENOENT). Espera o evento `close`, não `exit`: só
  ele garante que a saída já foi toda lida.
*/
export function iniciarProcesso(comando, argumentos, opcoes = {}) {
    let processo;
    try {
        processo = spawn(comando, argumentos, { ...opcoes, detached: !WINDOWS, windowsHide: true });
    } catch (erro) {   // alguns erros (ex.: EFTYPE, EACCES) são lançados na hora, não como evento
        return { processo: {}, terminou: Promise.resolve({ codigo: null, sinal: null, erro }) };
    }
    const terminou = new Promise((resolver) => {
        processo.once("error", (erro) => resolver({ codigo: null, sinal: null, erro }));
        processo.once("close", (codigo, sinal) => resolver({ codigo, sinal, erro: null }));
    });
    return { processo, terminou };
}

export function matarArvoreDeProcessos(processo) {
    if (processo.pid === undefined) return;
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

/* Executa e devolve { codigo, sinal, erro, estourou, saida, saidaDeErro }; passou do limite, mata a árvore. */
export async function executarComLimite(comando, argumentos, limiteEmMilissegundos) {
    const { processo, terminou } = iniciarProcesso(comando, argumentos, { stdio: ["ignore", "pipe", "pipe"] });
    const pedacosDaSaida = [];
    const pedacosDoErro = [];
    processo.stdout?.on("data", (pedaco) => pedacosDaSaida.push(pedaco));
    processo.stderr?.on("data", (pedaco) => pedacosDoErro.push(pedaco));

    let fim = await esperarComLimite(terminou, limiteEmMilissegundos);
    const estourou = fim === null;
    if (estourou) {
        matarArvoreDeProcessos(processo);
        // Um neto órfão que segura os pipes impede o `close`; não vale esperar por ele para sempre.
        fim = await esperarComLimite(terminou, ESPERA_DEPOIS_DE_MATAR_EM_MILISSEGUNDOS)
            ?? { codigo: null, sinal: null, erro: null };
    }

    return {
        ...fim,
        estourou,
        saida: Buffer.concat(pedacosDaSaida).toString("utf8"),
        saidaDeErro: Buffer.concat(pedacosDoErro).toString("utf8"),
    };
}
