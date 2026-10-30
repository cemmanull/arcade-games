// Espelhos das páginas de teste do currículo — só Node (>= 22), sem npm.
//
//   node verificacao/curriculo/espelho.mjs             reescreve o espelho do index.html (e do style.css, no passo 5)
//                                                      dentro de cada verificacao/curriculo/NN-passo.html
//   node verificacao/curriculo/espelho.mjs --conferir  não escreve: sai com 1 se um espelho ficou velho, se um arquivo do
//                                                      inventário não existe (com a caixa certa), se um trecho de
//                                                      código não está, tal e qual, no arquivo que ele cita, se uma
//                                                      miniatura do final falta, sobra, não é PNG ou pesa mais de 60 KB,
//                                                      ou se curriculo/final/** e curriculo/README.md trazem CPF, RG,
//                                                      telefone ou e-mail que não seja @exemplo.invalid
//   --raiz <pasta>                                     trabalha numa cópia da árvore (é como os defeitos plantados rodam)
//
// Por que existe: uma página de teste aberta por file:// não consegue ler o index.html do passo (ver o começo de
// apoio-curriculo.js). O espelho é a cópia dele DENTRO da página; este script mantém a cópia fiel.
// Não faz parte do curso (que não instala nada): é só do harness, e o harness já exige o Node.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const MARCA_DE_INICIO = "ESPELHO:inicio";
const MARCA_DE_FIM = "ESPELHO:fim";
const ASSINATURA_DO_PNG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const PAGINAS = [
    { nome: "01-estrutura", espelhaCss: false },
    { nome: "02-layout", espelhaCss: false },
    { nome: "03-projetos", espelhaCss: false },
    { nome: "04-amostras", espelhaCss: false },
    { nome: "05-acabamento", espelhaCss: true },
    { nome: "06-compartilhar", espelhaCss: true },
    { nome: "final", espelhaCss: true },
];

const argumentos = process.argv.slice(2);
const soConferir = argumentos.includes("--conferir");
const raiz = lerRaiz();

process.exit(principal());

function principal() {
    const problemas = [...conferirEspelhos(), ...(soConferir ? conferirInventarioETrechos() : [])];

    problemas.forEach((problema) => console.error("FALHA " + problema));
    if (problemas.length === 0) console.log(soConferir ? "Espelhos, inventário e trechos em dia." : "Espelhos atualizados.");
    return problemas.length === 0 ? 0 : 1;
}

function lerRaiz() {
    const posicao = argumentos.indexOf("--raiz");
    if (posicao >= 0) return resolve(argumentos[posicao + 1]);
    return resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
}

// ============================================================
// Espelhos
// ============================================================
/* Escreve (ou, com --conferir, só compara) o bloco de cada página. Devolve os problemas. */
function conferirEspelhos() {
    const problemas = [];

    for (const pagina of PAGINAS) {
        const caminhoDaPagina = join(raiz, "verificacao", "curriculo", pagina.nome + ".html");
        if (!existsSync(caminhoDaPagina)) {
            problemas.push(`${pagina.nome}: a página de teste não existe`);
            continue;
        }

        const textoAtual = lerTexto(caminhoDaPagina);
        const textoNovo = trocarOBloco(textoAtual, montarOBloco(pagina));

        if (textoNovo === null) problemas.push(`${pagina.nome}.html: faltam as linhas ${MARCA_DE_INICIO} e ${MARCA_DE_FIM}`);
        else if (soConferir && textoNovo !== textoAtual) problemas.push(`${pagina.nome}.html: o espelho está velho; rode node verificacao/curriculo/espelho.mjs`);
        else if (!soConferir && textoNovo !== textoAtual) writeFileSync(caminhoDaPagina, textoNovo);
    }
    return problemas;
}

function montarOBloco(pagina) {
    const pastaDoPasso = join(raiz, "curriculo", pagina.nome);
    const linhas = [
        `    // ${MARCA_DE_INICIO} — gerado por node verificacao/curriculo/espelho.mjs a partir de curriculo/${pagina.nome}/. Não edite à mão.`,
        "    const ESPELHO_DO_INDEX = " + comoListaDeLinhas(lerTexto(join(pastaDoPasso, "index.html"))) + ";",
    ];
    if (pagina.espelhaCss) linhas.push("    const ESPELHO_DO_CSS = " + comoListaDeLinhas(lerTexto(join(pastaDoPasso, "style.css"))) + ";");
    linhas.push(`    // ${MARCA_DE_FIM}`);
    return linhas.join("\n");
}

/* Um texto vira `[ "linha", ... ].join("\n")`, com o que atrapalharia dentro de um <script> escapado. */
function comoListaDeLinhas(texto) {
    const linhas = texto.split("\n").map((linha) => "        " + JSON.stringify(linha).replace(/<(?=\/|!--|script)/gi, "<\\"));
    return "[\n" + linhas.join(",\n") + "\n    ].join(\"\\n\")";
}

/* Troca tudo entre a linha de início e a de fim (inclusive elas). Devolve null se faltar uma marca. */
function trocarOBloco(texto, bloco) {
    const linhas = texto.split("\n");
    const inicio = linhas.findIndex((linha) => linha.includes(MARCA_DE_INICIO));
    const fim = linhas.findIndex((linha) => linha.includes(MARCA_DE_FIM));
    if (inicio < 0 || fim < inicio) return null;
    return [...linhas.slice(0, inicio), bloco, ...linhas.slice(fim + 1)].join("\n");
}

// ============================================================
// Inventário e trechos contra a árvore de verdade
// ============================================================
function conferirInventarioETrechos() {
    const tabelas = lerAsTabelasDoApoio();
    const { ARQUIVOS_EXISTENTES, TRECHOS_ESPERADOS } = tabelas;
    const problemas = [];

    for (const caminho of ARQUIVOS_EXISTENTES) {
        if (!existeComCaixaExata(caminho)) problemas.push(`inventário: ${caminho} não existe (ou a caixa das letras não bate)`);
    }

    for (const [id, esperado] of Object.entries(TRECHOS_ESPERADOS)) {
        if (!ARQUIVOS_EXISTENTES.includes(esperado.arquivo)) problemas.push(`trecho ${id}: ${esperado.arquivo} não está no inventário`);
        if (!existeComCaixaExata(esperado.arquivo)) continue;

        const arquivo = lerTexto(join(raiz, esperado.arquivo));
        if (!arquivo.includes(esperado.linhas.join("\n"))) problemas.push(`trecho ${id}: não está, tal e qual, em ${esperado.arquivo}`);
    }

    problemas.push(...conferirAmostrasDoFinal(tabelas), ...conferirPrivacidadeDosArquivos(tabelas));
    return problemas;
}

// ============================================================
// O que a página de teste não consegue ler por file://: o peso dos PNG e o texto dos arquivos do final
// ============================================================
/* Cada miniatura do inventário existe (com a caixa certa), é um PNG de verdade e pesa até 60 KB; a pasta não tem arquivo fora do inventário. */
function conferirAmostrasDoFinal({ AMOSTRAS_DO_FINAL, PASTA_DAS_AMOSTRAS, TAMANHO_MAXIMO_DA_AMOSTRA_EM_BYTES }) {
    const pasta = join(raiz, ...PASTA_DAS_AMOSTRAS.split("/"));
    if (!existsSync(pasta)) return [`miniaturas: ${PASTA_DAS_AMOSTRAS} não existe`];

    const problemas = [];
    const nomesNoDisco = readdirSync(pasta);

    for (const nome of AMOSTRAS_DO_FINAL) {
        if (!nomesNoDisco.includes(nome)) {
            problemas.push(`miniatura ${nome}: não existe em ${PASTA_DAS_AMOSTRAS} (ou a caixa das letras não bate)`);
            continue;
        }
        const bytes = readFileSync(join(pasta, nome));
        if (bytes.length > TAMANHO_MAXIMO_DA_AMOSTRA_EM_BYTES) problemas.push(`miniatura ${nome}: pesa ${(bytes.length / 1024).toFixed(1)} KB, o teto é ${TAMANHO_MAXIMO_DA_AMOSTRA_EM_BYTES / 1024} KB`);
        if (!bytes.subarray(0, 8).equals(ASSINATURA_DO_PNG)) problemas.push(`miniatura ${nome}: não é um PNG (assinatura errada)`);
        else if (bytes.readUInt32BE(16) === 0 || bytes.readUInt32BE(20) === 0) problemas.push(`miniatura ${nome}: o PNG tem largura ou altura 0`);
    }
    for (const nome of nomesNoDisco.filter((nome) => !AMOSTRAS_DO_FINAL.includes(nome))) {
        problemas.push(`miniaturas: ${PASTA_DAS_AMOSTRAS}/${nome} está fora do inventário (acrescente em AMOSTRAS_DO_FINAL ou apague)`);
    }
    return problemas;
}

/* Privacidade: nenhuma linha de texto de curriculo/final/** (fora as imagens) nem de curriculo/README.md traz dado pessoal. */
function conferirPrivacidadeDosArquivos({ achadosDePrivacidade }) {
    const problemas = [];
    const arquivos = [...listarArquivosDeTexto(join(raiz, "curriculo", "final")), join(raiz, "curriculo", "README.md")];

    for (const caminho of arquivos.filter((caminho) => existsSync(caminho))) {
        const nomeParaMostrar = caminho.slice(raiz.length + 1).replaceAll("\\", "/");
        lerTexto(caminho).split("\n").forEach((linha, posicao) => {
            for (const achado of achadosDePrivacidade(linha)) problemas.push(`privacidade: ${nomeParaMostrar}:${posicao + 1}: ${achado}`);
        });
    }
    return problemas;
}

function listarArquivosDeTexto(pasta) {
    if (!existsSync(pasta)) return [];
    return readdirSync(pasta, { withFileTypes: true }).flatMap((entrada) => {
        const caminho = join(pasta, entrada.name);
        if (entrada.isDirectory()) return listarArquivosDeTexto(caminho);
        return /\.(png|jpe?g|gif|webp|ico)$/i.test(entrada.name) ? [] : [caminho];
    });
}

/* O apoio só declara tabelas e funções: roda num contexto isolado, com um `location` de mentira. */
function lerAsTabelasDoApoio() {
    const texto = lerTexto(join(raiz, "verificacao", "curriculo", "apoio-curriculo.js"));
    const contexto = { URL, location: { href: "file:///raiz/verificacao/curriculo/pagina.html" } };
    return vm.runInNewContext(texto + "\n;({ ARQUIVOS_EXISTENTES, TRECHOS_ESPERADOS, AMOSTRAS_DO_FINAL, PASTA_DAS_AMOSTRAS, TAMANHO_MAXIMO_DA_AMOSTRA_EM_BYTES, achadosDePrivacidade })", contexto);
}

/* O GitHub distingue maiúsculas de minúsculas e o Windows não: confere cada pedaço do caminho pelo nome que está no disco. */
function existeComCaixaExata(caminhoRelativo) {
    let pasta = raiz;
    for (const nome of caminhoRelativo.split("/")) {
        if (!readdirSync(pasta).includes(nome)) return false;
        pasta = join(pasta, nome);
    }
    return true;
}

function lerTexto(caminho) {
    return readFileSync(caminho, "utf8").replace(/\r\n/g, "\n");
}
