// Modo links: confere os links relativos de todos os .md e os href/src relativos de todos os .html
// que o git conhece. O .md vem primeiro; o resumo de cada tipo sai em sua própria linha.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

/* Imprime os links quebrados e os totais. Devolve 0 se não há nenhum quebrado (avisos não contam), senão 1. */
export function conferirLinks(raiz) {
    const quebradosEmMarkdown = conferirLinksDeMarkdown(raiz);
    const quebradosEmHtml = conferirLinksDeHtml(raiz);
    return quebradosEmMarkdown + quebradosEmHtml === 0 ? 0 : 1;
}

/* Devolve quantos links quebrados os .md têm. */
function conferirLinksDeMarkdown(raiz) {
    const arquivos = listarArquivos(raiz, "*.md");
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
    return quebrados.length;
}

function listarArquivos(raiz, padrao) {
    const busca = spawnSync("git", ["ls-files", "-co", "--exclude-standard", "--", padrao], {
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


// ============================================================
// HTML: href/src relativos
// ============================================================

// Páginas de teste plantadas de propósito não são conteúdo do curso; verificacao/medicao/ é conferida.
const PASTAS_IGNORADAS_NO_HTML = ["verificacao/autoteste/", ".claude/"];
const ATRIBUTOS_DE_ENDERECO = ["href", "src"];
// Imagens quebradas de propósito (o tutorial ensina o alt); a mesma ideia de ERROS_ESPERADOS em fumaca.mjs.
const QUEBRADOS_ESPERADOS_NO_HTML = new Set([
    "tutorial/01-html/index.html  nao-existe.png",
    "tutorial/01-html/index.html  tambem-nao-existe.png",
]);
const ABERTURA_DE_TAG = /<[a-z][^\s>/]*(?:"[^"]*"|'[^']*'|[^>"'])*>?/gi;

/* Devolve quantos links quebrados os .html têm; pastas com index.html saem como AVISO. */
function conferirLinksDeHtml(raiz) {
    const arquivos = listarArquivos(raiz, "*.html").filter((arquivo) => {
        const nome = relative(raiz, arquivo).replaceAll("\\", "/");
        return !PASTAS_IGNORADAS_NO_HTML.some((pasta) => nome.startsWith(pasta));
    });
    const quebrados = [];
    const avisos = [];
    const esperados = [];
    let totalDeLinks = 0;

    for (const arquivo of arquivos) {
        const nome = relative(raiz, arquivo).replaceAll("\\", "/");
        for (const { linha, destino } of extrairEnderecosDeHtml(readFileSync(arquivo, "utf8"))) {
            const alvo = destinoLocalDeHtml(destino);
            if (alvo === null || alvo === "") continue;
            totalDeLinks++;

            const caminho = alvo.startsWith("/") ? join(raiz, alvo) : resolve(dirname(arquivo), alvo);
            const rotulo = `${nome}:${linha}  ${destino}`;
            if (!existeComAMesmaCaixa(raiz, caminho)) {
                const foiPlantado = QUEBRADOS_ESPERADOS_NO_HTML.has(`${nome}  ${destino}`);
                (foiPlantado ? esperados : quebrados).push(rotulo);
            } else if (statSync(caminho).isDirectory()) {
                if (readdirSync(caminho).includes("index.html")) {
                    avisos.push(`${rotulo}  (pasta: em file:// abre uma listagem; aponte para index.html)`);
                } else {
                    quebrados.push(`${rotulo}  (pasta sem index.html)`);
                }
            }
        }
    }

    avisos.forEach((aviso) => console.log("AVISO     " + aviso));
    esperados.forEach((esperado) => console.log("ESPERADO  " + esperado));
    quebrados.forEach((quebrado) => console.log("QUEBRADO  " + quebrado));
    console.log(`${arquivos.length} arquivos .html, ${totalDeLinks} links relativos, ${quebrados.length} quebrados, ${esperados.length} esperados, ${avisos.length} avisos.`);
    return quebrados.length;
}

/* Devolve [{ linha, destino }] de cada href/src de <a>, <link>, <script>, <img>, <iframe> e <source>. */
function extrairEnderecosDeHtml(textoHtml) {
    const enderecos = [];
    const texto = apagarTrechosInertes(textoHtml);

    for (const tag of texto.matchAll(ABERTURA_DE_TAG)) {
        const nomeDaTag = tag[0].match(/^<([a-z][^\s>/]*)/i)[1].toLowerCase();
        if (!["a", "link", "script", "img", "iframe", "source"].includes(nomeDaTag)) continue;

        const inicioDosAtributos = tag.index + 1 + nomeDaTag.length;
        const atributos = tag[0].slice(1 + nomeDaTag.length);
        for (const atributo of atributos.matchAll(/([^\s"'<>\/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
            if (!ATRIBUTOS_DE_ENDERECO.includes(atributo[1].toLowerCase())) continue;
            const valor = (atributo[2] ?? atributo[3] ?? atributo[4]).trim().replaceAll("&amp;", "&");
            const posicao = inicioDosAtributos + atributo.index;
            enderecos.push({ linha: texto.slice(0, posicao).split("\n").length, destino: valor });
        }
    }
    return enderecos;
}

/*
 * Troca por espaços (mantendo as quebras de linha, para a numeração) o que não é link de verdade:
 * comentários, <pre>, <code>, <style> e o corpo de <script> (a tag de abertura do script fica,
 * por causa do src). O que vier primeiro no texto vence, então um "<pre>" dentro de um comentário
 * não abre nada. Sem fechamento, apaga até o fim do arquivo.
 */
function apagarTrechosInertes(textoHtml) {
    const trechos = /<!--[\s\S]*?(?:-->|$)|(<script\b(?:"[^"]*"|'[^']*'|[^>"'])*>)[\s\S]*?(?:<\/script\s*>|$)|<(?:pre|code|style)\b[\s\S]*?(?:<\/(?:pre|code|style)\s*>|$)/gi;
    const emBranco = (trecho) => trecho.replace(/[^\r\n]/g, " ");

    return textoHtml.replace(trechos, (trecho, aberturaDoScript) => {
        if (aberturaDoScript === undefined) return emBranco(trecho);
        return aberturaDoScript + emBranco(trecho.slice(aberturaDoScript.length));
    });
}

/* O caminho sem âncora nem consulta, ou null se não é um arquivo local (http:, //, data:, #x …). */
function destinoLocalDeHtml(destino) {
    if (destino.startsWith("//")) return null;
    return destinoLocal(destino);
}
