// Autoteste do executor: planta defeitos conhecidos ("mutantes") e confere que o executor
// ATUAL os pega, cada um com o código de saída e a linha-chave esperados.
//
//   node verificacao/rodar.mjs --autoteste
//
// Os mutantes de página usam os .html desta pasta, rodados pelo executor do repositório. Os de
// fumaça e de links precisam de um repositório próprio: cada um ganha uma cópia dos módulos do
// executor numa pasta temporária. Nada do repositório é alterado.
//
// Todo filho roda com TEMP/TMP/TMPDIR apontando para uma pasta privada. Assim, um perfil
// `verificacao-*` que sobrar (sinal de Chrome não encerrado) aparece ali, sem confusão com outras
// execuções do executor na máquina.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apagarPerfil } from "../navegador.mjs";

const pastaDoExecutor = join(dirname(fileURLToPath(import.meta.url)), "..");
const pastaDasPaginas = dirname(fileURLToPath(import.meta.url));
const LIMITE_DE_UM_MUTANTE_EM_MILISSEGUNDOS = 240000;
const LIMITE_CURTO_DA_PAGINA_EM_SEGUNDOS = "3";
const CERCA = "```";
const DOIS_ESPERADOS = [/^\s+esperado: .*\/nao-existe\.png\)$/, /^\s+esperado: .*\/tambem-nao-existe\.png\)$/];

/* Devolve 0 se todo mutante teve o resultado esperado, senão 1. */
export async function rodarAutoteste() {
    const pastaPrivada = mkdtempSync(join(tmpdir(), "autoteste-"));
    const ambiente = {
        ...process.env,
        TEMP: pastaPrivada, TMP: pastaPrivada, TMPDIR: pastaPrivada,
    };
    let reprovados = 0;

    try {
        for (const mutante of listarMutantes(pastaPrivada)) {
            const problemas = conferirMutante(mutante, ambiente, pastaPrivada);
            console.log(`${problemas.length === 0 ? "ok   " : "FALHA"}  ${mutante.id.padEnd(3)} ${mutante.descricao}`);
            problemas.forEach((problema) => console.log(`        ${problema}`));
            if (problemas.length > 0) reprovados++;
        }
    } finally {
        await apagarPerfil(pastaPrivada);
    }

    console.log(reprovados === 0 ? "\nO executor pegou todos os defeitos plantados." : `\n${reprovados} mutante(s) com resultado inesperado.`);
    return reprovados === 0 ? 0 : 1;
}

/* Roda o mutante e devolve a lista de divergências (vazia se tudo bateu). */
function conferirMutante(mutante, ambiente, pastaPrivada) {
    const resposta = mutante.executar({ ...ambiente, ...mutante.ambiente });
    const saida = `${resposta.stdout ?? ""}${resposta.stderr ?? ""}`;
    const linhas = saida.split(/\r?\n/);
    const problemas = [];

    if (resposta.status !== mutante.codigoEsperado) {
        problemas.push(`código de saída ${resposta.status}, esperava ${mutante.codigoEsperado}`);
    }
    for (const linhaChave of mutante.linhasChave) {
        if (!linhas.some((linha) => linhaChave.test(linha))) problemas.push(`faltou a linha ${linhaChave}`);
    }
    const perfisQueSobraram = readdirSync(pastaPrivada).filter((nome) => nome.startsWith("verificacao-"));
    if (perfisQueSobraram.length > 0) problemas.push(`sobrou perfil temporário do Chrome: ${perfisQueSobraram.join(", ")}`);

    if (problemas.length > 0) problemas.push(`saída: ${linhas.filter(Boolean).slice(-6).join(" | ").slice(0, 600)}`);
    return problemas;
}


// ============================================================
// Os mutantes
// ============================================================
function listarMutantes(pastaPrivada) {
    const rodarPagina = (arquivo) => (ambiente) => rodarExecutor(join(pastaDoExecutor, "rodar.mjs"), [join(pastaDasPaginas, arquivo)], ambiente);
    const rodarEmRepositorioFalso = (nome, montar, argumentos) => (ambiente) => {
        const raiz = join(pastaPrivada, nome);
        montar(raiz);
        return rodarExecutor(copiarExecutor(raiz), argumentos, ambiente);
    };
    const paginaComErro = (script) => (raiz) => escreverPaginaDoTutorial(raiz, script);
    const erroInesperadoNaFumaca = (linhaDoErro) => [/^ERRO  tutorial\/01-html\/index\.html$/, linhaDoErro];

    return [
        {
            id: "0", descricao: "controle: página correta passa",
            codigoEsperado: 0, linhasChave: [/^PASS  .*controle\.html  \(2 ok, 0 falhas/],
            executar: rodarPagina("controle.html"),
        },
        {
            id: "1", descricao: "expectativa errada reprova",
            codigoEsperado: 1, linhasChave: [/^\s+FALHA soma  -> esperado 5, obtido 4/],
            executar: rodarPagina("expectativa-errada.html"),
        },
        {
            id: "2", descricao: "só a primeira afirmação falha",
            codigoEsperado: 1, linhasChave: [/^\s+FALHA a primeira falha  -> detalhe-1/],
            executar: rodarPagina("primeira-falha.html"),
        },
        {
            id: "3", descricao: "erro em setTimeout depois de finalizar()",
            codigoEsperado: 1, linhasChave: [/^\s+FALHA erro não tratado  -> .*estourou tarde/],
            executar: rodarPagina("erro-tardio.html"),
        },
        {
            id: "4", descricao: "página lança antes de finalizar()",
            codigoEsperado: 1, linhasChave: [/^FALHA  .*lanca-antes-do-fim\.html  \(SEM MARCADOR/],
            executar: rodarPagina("lanca-antes-do-fim.html"),
        },
        {
            id: "5", descricao: `laço infinito estoura o limite de ${LIMITE_CURTO_DA_PAGINA_EM_SEGUNDOS}s`,
            codigoEsperado: 1, linhasChave: [/^FALHA  .*laco-infinito\.html  \(TEMPO ESGOTADO \(3s\); o navegador foi encerrado/],
            ambiente: { LIMITE_DA_PAGINA_EM_SEGUNDOS: LIMITE_CURTO_DA_PAGINA_EM_SEGUNDOS },
            executar: rodarPagina("laco-infinito.html"),
        },
        {
            id: "5b", descricao: "CHROME inexistente sai com 2",
            codigoEsperado: 2, linhasChave: [/^A variável CHROME \(".*"\) não serve: o arquivo não existe\./],
            ambiente: { CHROME: join(pastaPrivada, "nao-existe", "chrome.exe") },
            executar: rodarPagina("controle.html"),
        },
        {
            id: "6a", descricao: "fumaça: console.error extra, mais os 2 erros esperados",
            codigoEsperado: 1,
            linhasChave: [...erroInesperadoNaFumaca(/^\s+console\.error: erro inesperado qualquer$/), ...DOIS_ESPERADOS],
            executar: rodarEmRepositorioFalso("fumaca-a", paginaComErro('console.error("erro inesperado qualquer")'), ["--fumaca"]),
        },
        {
            id: "6a2", descricao: "fumaça: exceção não tratada extra",
            codigoEsperado: 1,
            linhasChave: [...erroInesperadoNaFumaca(/^\s+exceção: Error: boom$/), ...DOIS_ESPERADOS],
            executar: rodarEmRepositorioFalso("fumaca-a2", paginaComErro('throw new Error("boom")'), ["--fumaca"]),
        },
        {
            id: "6b", descricao: "fumaça: mensagem que só CONTÉM um erro esperado continua reprovando",
            codigoEsperado: 1,
            linhasChave: erroInesperadoNaFumaca(/^\s+console\.error: network: Failed to load resource: net::ERR_FILE_NOT_FOUND \(file:\/\/\/x\/nao-existe\.png\)$/),
            executar: rodarEmRepositorioFalso(
                "fumaca-b",
                paginaComErro('console.error("network: Failed to load resource: net::ERR_FILE_NOT_FOUND (file:///x/nao-existe.png)")'),
                ["--fumaca"]
            ),
        },
        {
            id: "6c", descricao: "fumaça: controle só com os 2 erros esperados passa",
            codigoEsperado: 0,
            linhasChave: [/^ESPERADO  tutorial\/01-html\/index\.html$/, /, 0 com erro\.$/, ...DOIS_ESPERADOS],
            executar: rodarEmRepositorioFalso("fumaca-c", paginaComErro(""), ["--fumaca"]),
        },
        {
            id: "7a", descricao: "links: quebrado e caixa errada reprovam; código é ignorado",
            codigoEsperado: 1,
            linhasChave: [
                /^QUEBRADO  README\.md:2  nao-existe\.md$/,
                /^QUEBRADO  README\.md:3  ok\.md$/,
                /^2 arquivos \.md, 3 links relativos, 2 quebrados\.$/,
            ],
            executar: rodarEmRepositorioFalso("links-a", (raiz) => montarRepositorioDeLinks(raiz, [
                "[bom](Ok.md)", "[quebrado](nao-existe.md)", "[caixa errada](ok.md)", "`[em crase](nada.md)`",
                CERCA, "[em bloco](nada.md)", CERCA, "[web](https://exemplo.com) [ancora](#x)",
            ]), ["--links"]),
        },
        {
            id: "7b", descricao: "links: controle sem links quebrados passa",
            codigoEsperado: 0,
            linhasChave: [/^2 arquivos \.md, 1 links relativos, 0 quebrados\.$/],
            executar: rodarEmRepositorioFalso("links-b", (raiz) => montarRepositorioDeLinks(raiz, [
                "[bom](Ok.md)", "`[crase](nada.md)`", CERCA, "[bloco](nada.md)", CERCA,
            ]), ["--links"]),
        },
        {
            id: "7c", descricao: "links em .html: src quebrado, caixa errada e pasta sem index reprovam; pasta com index avisa; código, comentário, script e srcdoc são ignorados",
            codigoEsperado: 1,
            linhasChave: [
                /^AVISO     index\.html:4  pasta\/  \(pasta: /,
                /^QUEBRADO  index\.html:2  nao-existe\.png$/,
                /^QUEBRADO  index\.html:3  ok\.html$/,
                /^QUEBRADO  index\.html:5  vazia\/  \(pasta sem index\.html\)$/,
                /^3 arquivos \.html, 7 links relativos, 3 quebrados, 0 esperados, 1 avisos\.$/,
            ],
            executar: rodarEmRepositorioFalso("links-c", (raiz) => montarRepositorioDeHtml(raiz, [
                '<a href="Ok.html">bom</a>',
                '<img src="nao-existe.png" alt="">',
                '<a href="ok.html">caixa errada</a>',
                '<a href="pasta/">pasta com index</a>',
                '<a href="vazia/">pasta sem index</a>',
                '<pre><code><a href="nada.html">em código</a>',
                "</code></pre>",
                "<!--",
                '<a href="nada2.html">em comentário</a>',
                "-->",
                '<script src="Ok.html">var texto = \'<a href="nada3.html">\';</script>',
                '<iframe src="Ok.html?x=1#y" srcdoc="&lt;a href=&quot;nada4.html&quot;&gt;"></iframe>',
                '<a href="https://e.com">a</a> <a href="//e.com/x">b</a> <img src="data:image/png;base64,AA"> <a href="mailto:a@b.c">c</a> <a href="#x">d</a>',
            ]), ["--links"]),
        },
        {
            id: "7d", descricao: "links em .html: controle só com pasta com index e o quebrado esperado do tutorial passa",
            codigoEsperado: 0,
            linhasChave: [
                /^ESPERADO  tutorial\/01-html\/index\.html:1  nao-existe\.png$/,
                /^AVISO     index\.html:2  pasta\/  \(pasta: /,
                /^4 arquivos \.html, 3 links relativos, 0 quebrados, 1 esperados, 1 avisos\.$/,
            ],
            executar: rodarEmRepositorioFalso("links-d", (raiz) => {
                montarRepositorioDeHtml(raiz, ['<a href="Ok.html">bom</a>', '<a href="pasta/">pasta</a>', '<code><a href="nada.html"></code>']);
                mkdirSync(join(raiz, "tutorial", "01-html"), { recursive: true });
                writeFileSync(join(raiz, "tutorial", "01-html", "index.html"), '<img src="nao-existe.png" alt="">\n');
            }, ["--links"]),
        },
    ];
}

// ============================================================
// Preparação dos repositórios falsos
// ============================================================
function rodarExecutor(caminhoDoExecutor, argumentos, ambiente) {
    return spawnSync(process.execPath, [caminhoDoExecutor, ...argumentos], {
        encoding: "utf8",
        env: ambiente,
        timeout: LIMITE_DE_UM_MUTANTE_EM_MILISSEGUNDOS,
        windowsHide: true,
    });
}

/* Copia os módulos do executor atual para <raiz>/verificacao e devolve o novo rodar.mjs. */
function copiarExecutor(raiz) {
    const destino = join(raiz, "verificacao");
    mkdirSync(destino, { recursive: true });
    for (const nome of readdirSync(pastaDoExecutor).filter((arquivo) => arquivo.endsWith(".mjs"))) {
        copyFileSync(join(pastaDoExecutor, nome), join(destino, nome));
    }
    return join(destino, "rodar.mjs");
}

/* A página que a tabela ERROS_ESPERADOS conhece: duas imagens inexistentes, mais o script dado. */
function escreverPaginaDoTutorial(raiz, script) {
    const pasta = join(raiz, "tutorial", "01-html");
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, "index.html"), [
        '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>autoteste</title></head><body>',
        '<img src="nao-existe.png" alt="a"><img src="tambem-nao-existe.png" alt="b">',
        `<script>${script}</script>`,
        "</body></html>",
    ].join("\n"));
}

/* index.html com as linhas dadas, mais Ok.html, pasta/index.html e vazia/ (sem index.html). */
function montarRepositorioDeHtml(raiz, linhasDaPagina) {
    mkdirSync(join(raiz, "pasta"), { recursive: true });
    mkdirSync(join(raiz, "vazia"), { recursive: true });
    spawnSync("git", ["init", "-q"], { cwd: raiz });
    writeFileSync(join(raiz, "Ok.html"), "<p>ok</p>\n");
    writeFileSync(join(raiz, "pasta", "index.html"), "<p>pasta</p>\n");
    writeFileSync(join(raiz, "vazia", "leia-me.txt"), "sem index\n");
    writeFileSync(join(raiz, "index.html"), linhasDaPagina.join("\n") + "\n");
}

function montarRepositorioDeLinks(raiz, linhasDoReadme) {
    mkdirSync(raiz, { recursive: true });
    spawnSync("git", ["init", "-q"], { cwd: raiz });
    writeFileSync(join(raiz, "Ok.md"), "# ok\n");
    writeFileSync(join(raiz, "README.md"), linhasDoReadme.join("\n") + "\n");
}
