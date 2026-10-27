// Modo links: confere os links relativos de todos os .md que o git conhece.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/* Imprime os links quebrados e o total. Devolve 0 se não há nenhum quebrado, senão 1. */
export function conferirLinks(raiz) {
    const arquivos = listarArquivosMarkdown(raiz);
    const quebrados = [];
    let totalDeLinks = 0;

    for (const arquivo of arquivos) {
        for (const { linha, destino } of extrairLinks(readFileSync(arquivo, "utf8"))) {
            const alvo = destinoLocal(destino);
            if (alvo === null || alvo === "") continue;
            totalDeLinks++;

            const caminho = alvo.startsWith("/") ? join(raiz, alvo) : resolve(dirname(arquivo), alvo);
            if (!existeComAMesmaCaixa(raiz, caminho)) {
                const nome = relative(raiz, arquivo).replaceAll("\\", "/");
                quebrados.push(`${nome}:${linha}  ${destino}`);
            }
        }
    }

    quebrados.forEach((quebrado) => console.log("QUEBRADO  " + quebrado));
    console.log(`${arquivos.length} arquivos .md, ${totalDeLinks} links relativos, ${quebrados.length} quebrados.`);
    return quebrados.length === 0 ? 0 : 1;
}

function listarArquivosMarkdown(raiz) {
    const busca = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "--", "*.md"], {
        cwd: raiz,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024,
    });
    if (busca.error || busca.status !== 0) {
        throw new Error(`git ls-files falhou: ${busca.error?.message ?? busca.stderr.trim()}`);
    }
    return [...new Set(busca.stdout.split(/\r?\n/).filter(Boolean))]
        .map((arquivo) => join(raiz, arquivo))
        .filter((arquivo) => existsSync(arquivo));   // apagado, mas ainda no índice do git
}

/* Devolve [{ linha, destino }] de cada [texto](destino) fora de blocos e trechos de código. */
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
        if (delimitadorAberto !== null) return;

        const semCodigo = linhaDoArquivo.replace(/(`+).+?\1/g, "");
        for (const encontrado of semCodigo.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) {
            links.push({ linha: indice + 1, destino: encontrado[1] });
        }
    });

    return links;
}

/* O caminho do destino sem âncora nem consulta, ou null se não é um arquivo local. */
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
function existeComAMesmaCaixa(raiz, caminho) {
    if (!existsSync(caminho)) return false;
    const pedacos = relative(raiz, caminho).split(sep).filter((pedaco) => pedaco && pedaco !== "..");
    let pastaAtual = raiz;

    for (const pedaco of pedacos) {
        if (!readdirSync(pastaAtual).includes(pedaco)) return false;
        pastaAtual = join(pastaAtual, pedaco);
    }
    return true;
}
