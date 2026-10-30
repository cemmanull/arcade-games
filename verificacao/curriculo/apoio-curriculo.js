/*
  APOIO DO CURRÍCULO: o que as páginas dos passos 1 a 6 repartem.

  Carregue DEPOIS de ../apoio.js. Só declara constantes e funções (nada toca na página ao carregar), porque
  espelho.mjs também lê as duas tabelas de baixo.

  Por que cada página guarda um ESPELHO do index.html do passo? Por file:// o Chrome não deixa uma página ler
  outro arquivo (fetch, XHR e o contentDocument de um iframe de arquivo falham; o cssRules de um <link> também),
  e o curso promete funcionar por duplo clique. Então:
    - o HTML do passo é copiado para dentro da página de teste, entre as linhas "ESPELHO:inicio" e
      "ESPELHO:fim", por `node verificacao/curriculo/espelho.mjs` (nunca à mão);
    - o CSS e o JS do passo são os de verdade: o espelho vai para um iframe srcdoc com <base href> na pasta do
      passo, e o <link>/<script src> carregam os arquivos reais;
    - `node verificacao/curriculo/espelho.mjs --conferir` reprova se algum espelho ficou velho, se o inventário
      abaixo não bate com a árvore de verdade ou se um trecho de código não está no arquivo que ele cita.
*/


// ============================================================
// 1. INVENTÁRIO E TRECHOS (escritos à mão, conferidos contra a árvore por espelho.mjs --conferir)
// ============================================================
/* Todo arquivo para o qual o currículo aponta (link do jogo, crédito, arquivo de um trecho), a partir da raiz do repositório. */
const ARQUIVOS_EXISTENTES = [
    "jogo-da-cobrinha/final/index.html",
    "jogo-da-cobrinha/final/script.js",
    "tetris/final/index.html",
    "tetris/final/script.js",
    "xadrez/final/index.html",
    "xadrez/final/regras.js",
    "xenomorph/final/index.html",
    "xenomorph/final/dados/criaturas.js",
    "curriculo/final/amostras/cobrinha.png",
    "curriculo/final/amostras/tetris.png",
    "curriculo/final/amostras/xadrez.png",
    "curriculo/final/amostras/xenomorph.png",
];

/* As miniaturas do final (a única pasta do módulo com imagem em arquivo): espelho.mjs --conferir pesa cada uma. */
const PASTA_DAS_AMOSTRAS = "curriculo/final/amostras";
const AMOSTRAS_DO_FINAL = ["cobrinha.png", "tetris.png", "xadrez.png", "xenomorph.png"];
const TAMANHO_MAXIMO_DA_AMOSTRA_EM_BYTES = 60 * 1024;

/* Dado pessoal que nunca pode aparecer no modelo (GDD, seção 7). Devolve "tipo: trecho" para cada achado; e-mail só vale @exemplo.invalid. */
const PADROES_DE_DADO_PESSOAL = [
    ["CPF", /(?<![\d.])\d{3}\.\d{3}\.\d{3}-\d{2}(?!\d)/g],
    ["RG", /(?<![\d.])\d{1,2}\.\d{3}\.\d{3}-[\dxX](?![\w])/g],
    ["número de 11 dígitos (CPF ou celular sem pontuação)", /(?<![\w.#,-])\d{11}(?![\w])/g],
    ["telefone", /(?<!\d)(?:\+?55[\s.-]?)?\(?\d{2}\)?[\s.-]?9?\d{4}[\s.-]\d{4}(?!\d)/g],
    ["celular sem DDD", /(?<![\d-])9\d{4}-\d{4}(?!\d)/g],
];

function achadosDePrivacidade(texto) {
    const achados = [];
    PADROES_DE_DADO_PESSOAL.forEach(function (padrao) {
        (texto.match(padrao[1]) || []).forEach(function (trecho) { achados.push(padrao[0] + ": " + trecho); });
    });
    (texto.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) || []).forEach(function (email) {
        if (!/@exemplo\.invalid$/.test(email)) achados.push("e-mail que não é @exemplo.invalid: " + email);
    });
    return achados;
}

/* O trecho que cada projeto deve mostrar, linha por linha, como está no arquivo de verdade. */
const TRECHOS_ESPERADOS = {
    cobrinha: {
        arquivo: "jogo-da-cobrinha/final/script.js",
        linhas: [
            "    switch (direcao) {",
            "        case \"cima\":     cabeca.linha -= 1;  break;",
            "        case \"baixo\":    cabeca.linha += 1;  break;",
            "        case \"esquerda\": cabeca.coluna -= 1; break;",
            "        case \"direita\":  cabeca.coluna += 1; break;",
            "    }",
            "",
            "    return cabeca;",
            "}"
        ]
    },
    tetris: {
        arquivo: "tetris/final/script.js",
        linhas: [
            "function girarMatriz(forma, sentido) {",
            "    const n = forma.length;",
            "",
            "    return forma.map((linhaDaForma, y) =>",
            "        linhaDaForma.map((_, x) =>",
            "            sentido > 0",
            "                ? forma[n - 1 - x][y]",
            "                : forma[x][n - 1 - y]",
            "        )",
            "    );",
            "}"
        ]
    },
    xadrez: {
        arquivo: "xadrez/final/regras.js",
        linhas: [
            "    // Peões: atacam na diagonal, e só para a frente deles.",
            "    const avancoDoAtacante = corAtacante === BRANCAS ? -1 : 1;",
            "    for (const passoColuna of [-1, 1]) {",
            "        const linhaPeao = linha - avancoDoAtacante;   // de onde ele viria",
            "        const colunaPeao = coluna + passoColuna;",
            "",
            "        if (dentroDoTabuleiro(linhaPeao, colunaPeao)) {",
            "            const peca = estado.casas[indiceDe(linhaPeao, colunaPeao)];",
            "            if (peca !== null && peca.cor === corAtacante && peca.tipo === \"peao\") {",
            "                return true;",
            "            }",
            "        }",
            "    }"
        ]
    },
    xenomorph: {
        arquivo: "xenomorph/final/dados/criaturas.js",
        linhas: [
            "    rastejador: {",
            "        largura: 8,",
            "        altura: 5,",
            "        vida: 4,",
            "        danoDeContato: 10,",
            "        velocidade: 26,",
            "        velocidadeDePerseguicao: 58,",
            "        impulsoDoPulinho: 190,     // para subir um degrau correndo atrás de alguém",
            "        visao: 96,",
            "        paciencia: 1.5,            // quanto tempo sem ver o soldado até desistir de perseguir",
            "        amostras: 1,               // quantas deixa ao morrer (scripts/combate.js)",
            "        estadoInicial: \"patrulha\","
        ]
    },
};


// ============================================================
// 2. ABRIR O PASSO NUM IFRAME (espelho do HTML + CSS e JS de verdade)
// ============================================================
const FECHAR_SCRIPT = "<" + "/script>";

/* Roda antes de tudo no iframe: guarda erros não tratados e o que o passo escreve no console. */
const SCRIPT_DE_ESPIAO = "window.__erros = []; window.__consoleErros = []; window.__avisosDeConsole = [];"
    + "addEventListener('error', function (evento) { window.__erros.push(String(evento.message)); });"
    + "console.error = function () { window.__consoleErros.push(Array.prototype.join.call(arguments, ' ')); };"
    + "console.warn = function () { window.__avisosDeConsole.push(Array.prototype.join.call(arguments, ' ')); };";

const RAIZ_DO_REPOSITORIO = new URL("../../", location.href).href;

function urlDoPasso(pasta) {
    return new URL("../../curriculo/" + pasta + "/", location.href).href;
}

/*
  Devolve (numa promessa) o iframe já carregado. opcoes: largura, altura; `antes` = script que roda antes do passo;
  `transformar` = função que muda o texto do index.html antes de ele ir para o iframe.
*/
function abrirPasso(pasta, espelhoDoIndex, opcoes) {
    const config = Object.assign({ largura: 390, altura: 750, antes: "", transformar: null }, opcoes);
    const texto = config.transformar ? config.transformar(espelhoDoIndex) : espelhoDoIndex;
    const cabecalho = '<head><base href="' + urlDoPasso(pasta) + '"><script>' + SCRIPT_DE_ESPIAO + config.antes + FECHAR_SCRIPT;

    return new Promise(function (resolver) {
        const quadro = document.createElement("iframe");
        quadro.style.cssText = "display:block;border:0;width:" + config.largura + "px;height:" + config.altura + "px";
        quadro.addEventListener("load", function () { resolver(quadro); });
        quadro.srcdoc = texto.replace(/^<head>/m, function () { return cabecalho; });      // o <head> da linha própria (o comentário do topo pode citar a tag)
        document.body.appendChild(quadro);
    });
}

/* O tema do currículo fica em localStorage: o teste guarda o valor de quem o roda e o devolve no fim. */
const CHAVE_DO_TEMA = "curriculo-tema";

function lerArmazenado() {
    try { return localStorage.getItem(CHAVE_DO_TEMA); } catch (erro) { return null; }
}

function gravarArmazenado(valor) {
    try {
        if (valor === null) localStorage.removeItem(CHAVE_DO_TEMA);
        else localStorage.setItem(CHAVE_DO_TEMA, valor);
    } catch (erro) { /* sem armazenamento: o teste de persistência vai dizer */ }
}

function esperar(milissegundos) {
    return new Promise(function (resolver) { setTimeout(resolver, milissegundos); });
}

async function mudarTamanho(quadro, largura, altura) {
    quadro.style.width = largura + "px";
    if (altura) quadro.style.height = altura + "px";
    await esperar(40);
}

/* Um caso que espera (iframe, tempo): uma exceção vira FALHA e os outros casos seguem. */
async function testarAssincrono(nome, funcaoDoCaso) {
    try {
        await funcaoDoCaso();
    } catch (erro) {
        quantidadeDeFalhas++;
        escreverLinha("FALHA " + nome + "  -> exceção: " + erro);
    }
}

/* Se a página nunca terminar (iframe que não carrega), o executor leria "SEM MARCADOR": aqui vira uma FALHA com nome. */
function vigiarOFim(segundos) {
    setTimeout(function () {
        if (document.getElementById("resultado").textContent.indexOf("RESULTADO:") === -1) {
            conferir("a página terminou em " + segundos + " s (um iframe não carregou?)", false);
            finalizar();
        }
    }, segundos * 1000);
}


// ============================================================
// 3. LEITURA DO DOM: títulos, foco, nomes, ids
// ============================================================
function niveisDosTitulos(documento) {
    return Array.from(documento.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(function (titulo) { return Number(titulo.localName[1]); });
}

/* Descreve cada pulo de nível (o primeiro título precisa ser h1; depois, no máximo um nível a mais que o anterior). */
function saltosDeTitulo(niveis) {
    const saltos = [];
    niveis.forEach(function (nivel, posicao) {
        const anterior = posicao === 0 ? 0 : niveis[posicao - 1];
        if (nivel > anterior + 1) saltos.push((posicao === 0 ? "começa" : "h" + anterior + " → h" + nivel) + " em h" + nivel + " (título " + (posicao + 1) + ")");
    });
    return saltos;
}

const SELETOR_FOCAVEL = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]";

/* Os elementos que o Tab visita, na ordem: tabindex positivo primeiro (do menor ao maior), depois o resto na ordem do documento. */
function elementosNaOrdemDoTab(documento) {
    const candidatos = Array.from(documento.querySelectorAll(SELETOR_FOCAVEL)).filter(function (elemento) { return elemento.tabIndex >= 0; });
    const positivos = candidatos.filter(function (elemento) { return elemento.tabIndex > 0; }).sort(function (a, b) { return a.tabIndex - b.tabIndex; });
    return positivos.concat(candidatos.filter(function (elemento) { return elemento.tabIndex === 0; }));
}

/* Um nome acessível simplificado: aria-label, aria-labelledby, <label>, valor do botão, texto, alt de imagem, title. */
function nomeAcessivel(elemento) {
    const documento = elemento.ownerDocument;
    const rotulo = (elemento.getAttribute("aria-label") || "").trim();
    if (rotulo) return rotulo;

    const referencias = (elemento.getAttribute("aria-labelledby") || "").split(/\s+/).map(function (id) { return documento.getElementById(id); }).filter(Boolean);
    const textoReferenciado = referencias.map(function (alvo) { return alvo.textContent.trim(); }).join(" ").trim();
    if (textoReferenciado) return textoReferenciado;

    const textoDosRotulos = elemento.labels ? Array.from(elemento.labels).map(function (rotuloDoCampo) { return rotuloDoCampo.textContent.trim(); }).join(" ").trim() : "";
    if (textoDosRotulos) return textoDosRotulos;

    if (elemento.localName === "input") {
        const ehBotao = ["button", "submit", "reset"].indexOf(elemento.type) >= 0;
        if (ehBotao && elemento.value.trim()) return elemento.value.trim();
        if (elemento.type === "image" && (elemento.getAttribute("alt") || "").trim()) return elemento.getAttribute("alt").trim();
    } else {
        const textoDentro = elemento.textContent.trim();
        if (textoDentro) return textoDentro;
        const imagem = elemento.querySelector("img[alt]");
        if (imagem && imagem.getAttribute("alt").trim()) return imagem.getAttribute("alt").trim();
    }
    return (elemento.getAttribute("title") || "").trim();
}

function idsRepetidos(documento) {
    const vistos = {};
    const repetidos = [];
    documento.querySelectorAll("[id]").forEach(function (elemento) {
        if (vistos[elemento.id]) repetidos.push(elemento.id);
        vistos[elemento.id] = true;
    });
    return repetidos;
}

/* Os href="#x" cujo #x não existe (ou é só "#"). */
function ancorasQuebradas(documento) {
    return Array.from(documento.querySelectorAll('a[href^="#"]')).filter(function (link) {
        const alvo = link.getAttribute("href").slice(1);
        return alvo === "" || documento.getElementById(alvo) === null;
    }).map(function (link) { return link.getAttribute("href"); });
}

/* Caminho de um href relativo a partir da raiz do repositório; null se não é um arquivo local (mailto:, https:, #x). */
function caminhoNoRepositorio(href, pasta) {
    if (href.charAt(0) === "#") return null;
    const url = new URL(href, urlDoPasso(pasta));
    if (url.protocol !== "file:") return null;
    return url.href.indexOf(RAIZ_DO_REPOSITORIO) === 0 ? decodeURIComponent(url.href.slice(RAIZ_DO_REPOSITORIO.length)) : "(fora do repositório) " + url.href;
}


// ============================================================
// 4. LAYOUT: rolagem horizontal, alvos de toque
// ============================================================
/* Quem passa da borda direita da janela (para dizer onde o estouro nasce). */
function elementosForaDaBorda(documento) {
    const limite = documento.documentElement.clientWidth + 0.5;
    return Array.from(documento.body.querySelectorAll("*")).filter(function (elemento) {
        return elemento.getBoundingClientRect().right > limite && elemento.getClientRects().length > 0;
    }).slice(0, 3).map(function (elemento) { return elemento.localName + (elemento.className ? "." + elemento.className : ""); });
}

function conferirSemRolagemHorizontal(quadro, rotulo) {
    const documento = quadro.contentDocument, raiz = documento.documentElement;
    const largura = quadro.contentWindow.innerWidth;
    conferir(rotulo + ": sem rolagem horizontal a " + largura + " px (scrollWidth " + raiz.scrollWidth + " ≤ clientWidth " + raiz.clientWidth + ")",
        raiz.scrollWidth <= raiz.clientWidth, "passam da borda: " + elementosForaDaBorda(documento).join(", "));
}

async function conferirSemRolagemHorizontalEm(quadro, larguras, rotulo) {
    for (const largura of larguras) {
        await mudarTamanho(quadro, largura);
        conferirIgual(rotulo + ": a janela do iframe tem " + largura + " px", quadro.contentWindow.innerWidth, largura);
        conferirSemRolagemHorizontal(quadro, rotulo);
    }
}

function colunasDaGrade(documento, seletor) {
    const grade = documento.querySelector(seletor);
    return grade ? getComputedStyle(grade).gridTemplateColumns.split(" ").filter(Boolean).length : 0;
}

/* Quantas posições horizontais diferentes os filhos ocupam: é o número de colunas que se VÊ. */
function colunasVisiveis(elementos) {
    const esquerdas = {};
    elementos.forEach(function (elemento) { esquerdas[Math.round(elemento.getBoundingClientRect().left)] = true; });
    return Object.keys(esquerdas).length;
}


const ALTURA_MINIMA_DO_ALVO = 48;

/* Links e botões que são alvos de toque. Ficam de fora os links no meio de uma frase (WCAG 2.5.8): as provas das
   habilidades e o crédito do rodapé. */
function alvosDeToque(documento) {
    return Array.from(documento.querySelectorAll("a[href], button")).filter(function (alvo) {
        return alvo.closest(".habilidades") === null && alvo.closest("footer") === null && alvo.closest("details") === null;
    });
}

function alvosPequenos(documento) {
    return alvosDeToque(documento).filter(function (alvo) {
        const caixa = alvo.getBoundingClientRect();
        return caixa.height < ALTURA_MINIMA_DO_ALVO - 0.01 || caixa.width < ALTURA_MINIMA_DO_ALVO - 0.01;
    }).map(function (alvo) {
        const caixa = alvo.getBoundingClientRect();
        return alvo.textContent.trim().slice(0, 20) + " " + caixa.width.toFixed(1) + "×" + caixa.height.toFixed(1);
    });
}


// ============================================================
// 5. CONTRASTE (WCAG 2.x)
// ============================================================
/* "rgb(1, 2, 3)", "rgba(1, 2, 3, 0.5)" ou "color(srgb 0.1 0.2 0.3)" → { r, g, b, a } (0 a 255, a de 0 a 1). */
function lerCor(texto) {
    const rgb = /^rgba?\(([^)]+)\)$/.exec(texto.trim());
    if (rgb) {
        const partes = rgb[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r: partes[0], g: partes[1], b: partes[2], a: partes.length > 3 ? partes[3] : 1 };
    }
    const srgb = /^color\(srgb ([^)]+)\)$/.exec(texto.trim());
    if (srgb) {
        const partes = srgb[1].split(/[\s/]+/).filter(Boolean).map(Number);
        return { r: partes[0] * 255, g: partes[1] * 255, b: partes[2] * 255, a: partes.length > 3 ? partes[3] : 1 };
    }
    throw new Error("cor que o teste não entende: " + texto);
}

function luminanciaRelativa(cor) {
    const canais = [cor.r, cor.g, cor.b].map(function (canal) {
        const valor = canal / 255;
        return valor <= 0.03928 ? valor / 12.92 : Math.pow((valor + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function razaoDeContraste(corA, corB) {
    const a = luminanciaRelativa(corA), b = luminanciaRelativa(corB);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function sobrepor(corDeCima, corDeBaixo) {
    const a = corDeCima.a;
    return { r: corDeCima.r * a + corDeBaixo.r * (1 - a), g: corDeCima.g * a + corDeBaixo.g * (1 - a), b: corDeCima.b * a + corDeBaixo.b * (1 - a), a: 1 };
}

/* O fundo que a pessoa vê atrás do texto de `elemento`: sobe pelos ancestrais, empilhando os fundos com alfa. */
function fundoEfetivo(elemento, janela) {
    const camadas = [];
    for (let atual = elemento; atual; atual = atual.parentElement) {
        const cor = lerCor(janela.getComputedStyle(atual).backgroundColor);
        if (cor.a > 0) camadas.push(cor);
        if (cor.a === 1) break;
    }
    let fundo = { r: 255, g: 255, b: 255, a: 1 };          // a tela em branco, se ninguém pintou
    for (let i = camadas.length - 1; i >= 0; i--) fundo = sobrepor(camadas[i], fundo);
    return fundo;
}

/* Cada elemento visível com texto próprio: { nome, razao }. */
function contrastesDoTextoVisivel(documento, janela) {
    const resultado = [];
    documento.body.querySelectorAll("*").forEach(function (elemento) {
        const temTextoProprio = Array.from(elemento.childNodes).some(function (no) { return no.nodeType === 3 && no.textContent.trim() !== ""; });
        if (!temTextoProprio || elemento.getClientRects().length === 0) return;
        const fundo = fundoEfetivo(elemento, janela);
        const texto = sobrepor(lerCor(janela.getComputedStyle(elemento).color), fundo);
        resultado.push({ nome: elemento.localName + (elemento.className ? "." + elemento.className : "") + ' "' + elemento.textContent.trim().slice(0, 24) + '"', razao: razaoDeContraste(texto, fundo) });
    });
    return resultado;
}

/* A cor de uma variável do passo (var(--x)) já resolvida para o tema em vigor. */
function corDaVariavel(documento, janela, nome, propriedade) {
    const sonda = documento.createElement("span");
    sonda.style[propriedade] = "var(--" + nome + ")";
    documento.body.appendChild(sonda);
    const cor = lerCor(janela.getComputedStyle(sonda)[propriedade]);
    sonda.remove();
    return cor;
}


// ============================================================
// 6. OS DADOS DOS PROJETOS (passos 3 a 6)
// ============================================================
function copiaDosProjetos(janela) {
    return JSON.parse(JSON.stringify(janela.eval("projetos")));
}

/* A conferência dos dados aceita os dados de verdade e rejeita cada defeito, dizendo qual campo. */
function conferirValidadorDeProjetos(janela, comTrecho) {
    function rejeita(descricao, alterar, palavra) {
        const dados = copiaDosProjetos(janela);
        alterar(dados);
        const problemas = Array.from(janela.conferirProjetos(dados));
        conferir("rejeita " + descricao + (palavra ? " e cita " + palavra : ""), problemas.length > 0 && (!palavra || problemas.some(function (p) { return p.indexOf(palavra) >= 0; })), "problemas: " + JSON.stringify(problemas));
    }

    conferirIgual("os dados de verdade passam sem nenhum problema", janela.conferirProjetos(copiaDosProjetos(janela)).length, 0);

    rejeita("alt vazio", function (d) { d[1].alt = ""; }, "alt");
    rejeita("alt só com espaços", function (d) { d[1].alt = "   "; }, "alt");
    rejeita("alt ausente", function (d) { delete d[1].alt; }, "alt");
    rejeita("alt que não é texto", function (d) { d[1].alt = 42; }, "alt");
    rejeita("pasta vazia", function (d) { d[1].pasta = ""; }, "pasta");
    rejeita("pasta ausente", function (d) { delete d[1].pasta; }, "pasta");
    rejeita("nome repetido", function (d) { d[1].nome = d[0].nome; }, "repetido");
    rejeita("id repetido", function (d) { d[1].id = d[0].id; }, "repetido");
    rejeita("id ausente", function (d) { delete d[1].id; }, "id");
    rejeita("id com letra maiúscula (quebra o link #projeto-<id>)", function (d) { d[1].id = "Tetris"; }, "id");
    rejeita("id com espaço", function (d) { d[1].id = "meu jogo"; }, "id");
    rejeita("id com acento", function (d) { d[1].id = "ação"; }, "id");
    rejeita("nome ausente", function (d) { delete d[1].nome; }, "nome");
    rejeita("resumo ausente", function (d) { delete d[1].resumo; }, "resumo");
    rejeita("técnicas vazias", function (d) { d[1].tecnicas = []; }, "tecnicas");
    rejeita("técnica em branco", function (d) { d[1].tecnicas = ["canvas", ""]; }, "tecnicas");
    rejeita("técnicas que não são lista", function (d) { d[1].tecnicas = "canvas"; }, "tecnicas");
    rejeita("sem imagem e com cor que não é #rrggbb", function (d) { d[1].imagem = ""; d[1].cor = "verde"; }, "cor");
    rejeita("sem imagem e sem cor", function (d) { d[1].imagem = ""; delete d[1].cor; }, "cor");
    rejeita("um projeto nulo no meio da lista", function (d) { d.splice(1, 0, null); });

    [null, undefined, {}, "projetos"].forEach(function (naoELista) {
        const problemas = Array.from(janela.conferirProjetos(naoELista));
        conferir("rejeita, sem lançar erro, quando projetos é " + JSON.stringify(naoELista), problemas.length > 0, JSON.stringify(problemas));
    });

    const comImagem = copiaDosProjetos(janela);
    comImagem[1].imagem = "amostras/tetris.png";
    delete comImagem[1].cor;
    conferirIgual("aceita imagem preenchida sem cor (a cor só vale sem imagem)", janela.conferirProjetos(comImagem).length, 0);

    const comIdComHifen = copiaDosProjetos(janela);
    comIdComHifen[1].id = "meu-jogo-2";
    conferirIgual("aceita id com minúsculas, número e hífen", janela.conferirProjetos(comIdComHifen).length, 0);

    if (!comTrecho) return;
    rejeita("trecho sem arquivo", function (d) { delete d[1].arquivo; }, "arquivo");
    rejeita("trecho sem oQueMostra", function (d) { delete d[1].oQueMostra; }, "oQueMostra");
    const semTrecho = copiaDosProjetos(janela);
    delete semTrecho[1].trecho;
    delete semTrecho[1].arquivo;
    delete semTrecho[1].oQueMostra;
    conferirIgual("aceita um projeto sem trecho (ele é opcional)", janela.conferirProjetos(semTrecho).length, 0);
}

/* Os cartões na tela são os dados: mesmo número, mesma ordem, mesmos nomes, links e textos alternativos. */
function conferirCartoesIguaisAosDados(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    const cartoes = Array.from(documento.querySelectorAll("#lista-projetos > article.cartao"));

    conferirIgual("há um cartão por projeto", cartoes.length, projetos.length);
    conferirIgual("os ids dos cartões seguem a ordem dos dados", cartoes.map(function (c) { return c.id; }).join(" "), projetos.map(function (p) { return "projeto-" + p.id; }).join(" "));
    conferirIgual("os títulos (h3) são os nomes, na ordem", cartoes.map(function (c) { return c.querySelector("h3").textContent; }).join(" | "), projetos.map(function (p) { return p.nome; }).join(" | "));
    conferirIgual("cada cartão tem um link para a pasta do projeto", cartoes.map(function (c) { return c.querySelector("a").getAttribute("href"); }).join(" "), projetos.map(function (p) { return p.pasta; }).join(" "));
    conferirIgual("o texto alternativo da miniatura é o alt dos dados", cartoes.map(function (c) { return c.querySelector("img").getAttribute("alt"); }).join(" | "), projetos.map(function (p) { return p.alt; }).join(" | "));
    conferirIgual("as técnicas viram etiquetas de texto", cartoes.map(function (c) { return Array.from(c.querySelectorAll(".tecnicas li")).map(function (li) { return li.textContent; }).join(","); }).join(" | "), projetos.map(function (p) { return p.tecnicas.join(","); }).join(" | "));
    conferirIgual("os resumos entram como texto", cartoes.map(function (c) { return c.querySelector("h3 + p").textContent; }).join(" | "), projetos.map(function (p) { return p.resumo; }).join(" | "));
    conferirIgual("o aviso fica vazio quando os dados estão certos", documento.getElementById("avisos").textContent, "");
    conferirIgual("nenhum erro não tratado", janela.__erros.join(" | "), "");
}

/* Um nome com <b> aparece como texto: nenhum campo vira marcação, nem o aviso. Restaura os dados no fim. */
function conferirTextoNaoViraMarcacao(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    const original = copiaDosProjetos(janela);
    const nome = "A <b>negrito</b> & <i>x</i>";
    try {
        Object.assign(projetos[0], { nome: nome, resumo: '<img src=x onerror="window.__xss=1">resumo', tecnicas: ["<u>t</u>"], alt: 'Jogo "><b id=hack>' });
        janela.desenharProjetos();
        const lista = documento.getElementById("lista-projetos");
        conferirIgual("o nome com <b> aparece como texto no h3", lista.querySelector("h3").textContent, nome);
        conferirIgual("e o link diz 'Abrir ' + o nome como texto", lista.querySelector("a").textContent, "Abrir " + nome);
        conferirIgual("nenhum b, i ou u nasceu dentro dos cartões", lista.querySelectorAll("b, i, u").length, 0);
        conferirIgual("o resumo com <img> não criou imagem: só as miniaturas existem", lista.querySelectorAll("img").length, projetos.length);
        conferirIgual("e o onerror não rodou", janela.__xss, undefined);
        conferirIgual("o alt com aspas e tags fica inteiro no atributo", lista.querySelector("img").getAttribute("alt"), 'Jogo "><b id=hack>');
        conferirIgual("e não criou o elemento #hack", documento.getElementById("hack"), null);

        projetos[0].alt = original[0].alt;
        projetos[1].nome = nome;                            // nome repetido: o aviso repete o nome
        janela.desenharProjetos();
        const aviso = documento.getElementById("avisos");
        conferir("o aviso de nome repetido mostra o <b> como texto", aviso.textContent.indexOf("<b>negrito</b>") >= 0, aviso.textContent);
        conferirIgual("e não cria b dentro do aviso", aviso.querySelectorAll("b, i").length, 0);
    } finally {
        projetos.forEach(function (projeto, posicao) { Object.assign(projeto, original[posicao]); });
        janela.desenharProjetos();
    }
}

/* Dados inválidos mostram a mensagem em #avisos em vez de lançar um erro, e nenhum cartão pela metade. */
function conferirDadosInvalidosViramAviso(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    const original = copiaDosProjetos(janela);
    const aviso = documento.getElementById("avisos");
    const totalDeCartoes = function () { return documento.querySelectorAll("#lista-projetos > article").length; };

    conferirIgual("#avisos é uma região role=alert", aviso.getAttribute("role"), "alert");

    function desenharComDefeito(descricao, estragar, palavra, desfazer) {
        let erroLancado = null;
        try {
            estragar();
            janela.desenharProjetos();
        } catch (erro) {
            erroLancado = erro;
        }
        conferirIgual(descricao + ": desenharProjetos não lança erro", String(erroLancado), "null");
        conferir(descricao + ": #avisos diz o que arrumar (" + palavra + ")", aviso.textContent.indexOf(palavra) >= 0, aviso.textContent);
        conferirIgual(descricao + ": nenhum cartão é desenhado", totalDeCartoes(), 0);
        desfazer();
        janela.desenharProjetos();
        conferirIgual(descricao + ": corrigidos os dados, os cartões voltam", totalDeCartoes(), projetos.length);
        conferirIgual(descricao + ": e o aviso some", aviso.textContent, "");
    }

    try {
        const consolesAntes = janela.__consoleErros.length;
        desenharComDefeito("alt vazio", function () { projetos[0].alt = ""; }, "alt", function () { projetos[0].alt = original[0].alt; });
        conferir("o problema também vai para o console.error", janela.__consoleErros.length > consolesAntes);
        desenharComDefeito("pasta vazia", function () { projetos[2].pasta = ""; }, "pasta", function () { projetos[2].pasta = original[2].pasta; });
        desenharComDefeito("nome repetido", function () { projetos[1].nome = projetos[0].nome; }, "repetido", function () { projetos[1].nome = original[1].nome; });
        desenharComDefeito("projeto nulo", function () { projetos.push(null); }, "Projeto " + (projetos.length + 1), function () { projetos.pop(); });
        conferirIgual("nenhum erro não tratado em todo o caso", janela.__erros.join(" | "), "");
    } finally {
        projetos.length = 0;
        original.forEach(function (projeto) { projetos.push(projeto); });
        janela.desenharProjetos();
    }
}

/* Toda <img> tem alt não vazio e que descreve (não "captura de tela"), ou alt="" marcada como decorativa. */
function imagensRuins(raiz) {
    const ruins = [];
    raiz.querySelectorAll("img").forEach(function (imagem) {
        if (!imagem.hasAttribute("alt")) { ruins.push("sem atributo alt"); return; }
        const alt = imagem.getAttribute("alt");
        const decorativa = imagem.getAttribute("role") === "presentation" || imagem.getAttribute("role") === "none" || imagem.getAttribute("aria-hidden") === "true";
        if (alt.trim() === "" && !decorativa) ruins.push("alt vazio sem marcar como decorativa");
        if (/^(captura de tela|imagem|foto|print)\b/i.test(alt.trim())) ruins.push('alt "' + alt.slice(0, 30) + '" não diz o que o jogo é');
    });
    return ruins;
}

function conferirImagensComAlt(documento) {
    const total = documento.querySelectorAll("img").length;
    const ruins = imagensRuins(documento);
    conferir(total + " imagens: todas com alt que descreve (ou decorativa marcada)", total > 0 && ruins.length === 0, ruins.join("; "));
}

/* O trecho de cada projeto é o esperado, linha por linha (o esperado foi tirado do arquivo de verdade). */
function conferirTrechosEsperados(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    projetos.forEach(function (projeto) {
        const esperado = TRECHOS_ESPERADOS[projeto.id];
        conferir(projeto.id + ": existe um trecho esperado", esperado !== undefined);
        if (!esperado) return;
        conferirIgual(projeto.id + ": o arquivo citado é " + esperado.arquivo, projeto.arquivo, esperado.arquivo);
        conferirIgual(projeto.id + ": o trecho é igual, linha por linha, ao do arquivo", projeto.trecho, esperado.linhas.join("\n"));
        const linhas = projeto.trecho.split("\n").length;
        conferir(projeto.id + ": o trecho tem de 8 a 15 linhas (" + linhas + ")", linhas >= 8 && linhas <= 15);
        const codigo = documento.querySelector("#projeto-" + projeto.id + " details pre code");
        conferir(projeto.id + ": o cartão mostra o trecho em <pre><code>, sem mudar um espaço", codigo !== null && codigo.textContent === esperado.linhas.join("\n"));
    });
    const blocos = Array.from(documento.querySelectorAll("details pre"));
    conferir("todo bloco de código rola pelo teclado (tabindex=0) e tem nome", blocos.length === projetos.length && blocos.every(function (bloco) { return bloco.tabIndex === 0 && nomeAcessivel(bloco) !== ""; }));
}

/* Os arquivos para onde os dados apontam existem (pelo inventário escrito aqui, conferido contra a árvore por espelho.mjs). */
function conferirDestinosDosDados(janela, pasta, comArquivos) {
    janela.eval("projetos").forEach(function (projeto) {
        const destino = caminhoNoRepositorio(projeto.pasta, pasta);
        conferir(projeto.id + ": pasta " + projeto.pasta + " existe e termina em index.html", ARQUIVOS_EXISTENTES.indexOf(destino) >= 0 && /index\.html$/.test(projeto.pasta), String(destino));
        if (comArquivos) conferir(projeto.id + ": o arquivo do trecho (" + projeto.arquivo + ") existe", ARQUIVOS_EXISTENTES.indexOf(projeto.arquivo) >= 0);
    });
}


// ============================================================
// 7. "JOGAR AQUI": o iframe só existe enquanto a pessoa pede (passos 4 a 6)
// ============================================================
function apertarTecla(janela, alvo, tecla, extras) {
    const evento = new janela.KeyboardEvent("keydown", Object.assign({ key: tecla, bubbles: true, cancelable: true }, extras || {}));
    alvo.dispatchEvent(evento);
    return evento;
}

function conferirJogoSobDemanda(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    const quadros = function () { return documento.querySelectorAll("iframe"); };
    const original = projetos.map(function (projeto) { return projeto.jogarAqui; });

    conferirIgual("com jogarAqui falso em todos: nenhum iframe na carga", quadros().length, 0);
    conferirIgual("e nenhum botão Jogar aqui", documento.querySelectorAll(".acoes button").length, 0);

    try {
        projetos[0].jogarAqui = true;
        projetos[1].jogarAqui = true;
        janela.desenharProjetos();
        const botoes = Array.from(documento.querySelectorAll(".acoes button"));
        conferirIgual("jogarAqui: true em 2 projetos dá 2 botões", botoes.length, 2);
        conferirIgual("e ainda nenhum iframe antes do clique", quadros().length, 0);
        conferir("cada botão começa como 'Jogar aqui', fechado, com nome que cita o jogo", botoes.every(function (botao, i) {
            return botao.textContent === "Jogar aqui" && botao.getAttribute("aria-expanded") === "false" && nomeAcessivel(botao).indexOf(projetos[i].nome) >= 0;
        }));

        const primeiro = botoes[0], segundo = botoes[1];
        primeiro.focus();
        primeiro.click();
        conferirIgual("depois do clique há exatamente 1 iframe", quadros().length, 1);
        const jogo = quadros()[0];
        conferir("o iframe tem title que cita o jogo", jogo.title.trim() !== "" && jogo.title.indexOf(projetos[0].nome) >= 0, jogo.title);
        conferirIgual("o iframe é loading=lazy", jogo.getAttribute("loading"), "lazy");
        conferirIgual("o iframe aponta para a pasta do projeto", jogo.getAttribute("src"), projetos[0].pasta);
        conferirIgual("e fica dentro do cartão do projeto", jogo.closest("article").id, "projeto-" + projetos[0].id);
        conferirIgual("o botão passa a dizer Fechar", primeiro.textContent, "Fechar");
        conferirIgual("e aria-expanded fica true", primeiro.getAttribute("aria-expanded"), "true");

        segundo.focus();
        segundo.click();
        conferirIgual("abrir o segundo jogo fecha o primeiro: continua 1 iframe", quadros().length, 1);
        conferirIgual("e ele está no cartão do segundo", quadros()[0].closest("article").id, "projeto-" + projetos[1].id);
        conferirIgual("o primeiro botão volta a Jogar aqui", primeiro.textContent, "Jogar aqui");

        segundo.click();
        conferirIgual("clicar em Fechar remove o iframe", quadros().length, 0);
        conferirIgual("e o botão volta a Jogar aqui, fechado", segundo.textContent + "/" + segundo.getAttribute("aria-expanded"), "Jogar aqui/false");

        // Esc fecha o jogo quando o foco está no cartão dele (o quadro, o link ou o botão); com o foco fora do cartão, não age.
        primeiro.focus();
        primeiro.click();
        const outroLugar = documento.querySelector("nav a");
        outroLugar.focus();
        apertarTecla(janela, outroLugar, "Escape");
        conferirIgual("Esc com o foco fora do cartão do jogo não fecha nada (o Esc do resto da página fica livre)", quadros().length, 1);

        [["o quadro do jogo", function () { return quadros()[0]; }],
            ["o link do cartão", function () { return primeiro.closest("article").querySelector("a"); }],
            ["o botão Fechar", function () { return primeiro; }]].forEach(function (lugar) {
            if (quadros().length === 0) primeiro.click();
            const alvo = lugar[1]();
            alvo.focus();
            conferir("com o foco em " + lugar[0] + ": o foco entrou", documento.activeElement === alvo);
            apertarTecla(janela, alvo, "Escape");
            conferirIgual("Esc com o foco em " + lugar[0] + " remove o iframe", quadros().length, 0);
            conferir("e devolve o foco ao botão que abriu o jogo", documento.activeElement === primeiro, "foco em: " + documento.activeElement.localName);
            conferirIgual("o botão volta a Jogar aqui", primeiro.textContent + "/" + primeiro.getAttribute("aria-expanded"), "Jogar aqui/false");
        });

        outroLugar.focus();
        apertarTecla(janela, outroLugar, "Escape");
        conferir("Esc sem jogo aberto não mexe no foco", documento.activeElement === outroLugar);
        conferirIgual("nenhum erro não tratado", janela.__erros.join(" | "), "");
    } finally {
        projetos.forEach(function (projeto, posicao) { projeto.jogarAqui = original[posicao]; });
        janela.desenharProjetos();
    }
}


// ============================================================
// 8. DEFEITOS QUE O ALUNO PROVOCA: projetos.js quebrado, tecla sem `key`, H num campo, inicial fora do BMP (passos 3 a 6 e final)
// ============================================================
/* Troca a linha do projetos.js do index.html por um script em linha (que roda antes do script.js, como o arquivo rodaria). */
function trocarProjetosJs(textoDoIndex, scriptEmLinha) {
    const linhaOriginal = '<script src="projetos.js" defer>' + FECHAR_SCRIPT;
    if (textoDoIndex.indexOf(linhaOriginal) < 0) throw new Error("o index.html não tem a linha do projetos.js que o teste troca");
    return textoDoIndex.replace(linhaOriginal, function () { return "<script>" + scriptEmLinha + FECHAR_SCRIPT; });
}

/*
  projetos.js com o erro que o aluno mais comete, nas duas formas que o navegador trata de modo diferente:
    - em tempo de execução (nome: Tetris sem aspas): a `const projetos` existe mas nunca foi inicializada, e até ler o nome lança ReferenceError;
    - de sintaxe: nenhuma `projetos` é criada e o nome passa a ser o <section id="projetos"> (acesso por id).
  Em ambos o passo não pode quebrar: #avisos diz o que fazer. opcoes: { tema, teclado } = o passo tem tema e tecla H / tem tecla (Esc).
*/
async function conferirProjetosJsQuebrado(pasta, espelhoDoIndex, opcoes) {
    const casos = [
        { nome: "erro de execução (nome: Tetris sem aspas)", script: 'const projetos = [{ id: "tetris", nome: Tetris }];', erro: /Tetris/, aviso: ["projetos.js não terminou de carregar", "console (F12)"] },
        { nome: "erro de sintaxe (objeto sem fechar)", script: 'const projetos = [{ id: "tetris", nome: "Tetris" ;', erro: /Unexpected|token|Syntax/i, aviso: ["projetos precisa ser uma lista", "sintaxe", "F12"] },
    ];
    const temaDoAluno = lerArmazenado();
    try {
        for (const caso of casos) {
            const antes = opcoes.tema ? "localStorage.setItem('" + CHAVE_DO_TEMA + "', 'escuro');" : "";
            const quadro = await abrirPasso(pasta, espelhoDoIndex, { antes: antes, transformar: function (texto) { return trocarProjetosJs(texto, caso.script); } });
            try {
                conferirProjetosJsQuebradoNoQuadro(quadro.contentWindow, caso, opcoes);
            } finally {
                quadro.remove();
            }
        }
    } finally {
        gravarArmazenado(temaDoAluno);
    }
}

function conferirProjetosJsQuebradoNoQuadro(janela, caso, opcoes) {
    const documento = janela.document;
    const aviso = documento.getElementById("avisos").textContent;
    const rotulo = "projetos.js com " + caso.nome;

    conferir(rotulo + ": o navegador acusa só o erro do projetos.js (" + janela.__erros.length + "), nenhum do script.js", janela.__erros.length >= 1 && janela.__erros.every(function (erro) { return caso.erro.test(erro); }), janela.__erros.join(" | "));
    caso.aviso.forEach(function (palavra) { conferir(rotulo + ": #avisos diz '" + palavra + "'", aviso.indexOf(palavra) >= 0, aviso); });
    conferirIgual(rotulo + ": nenhum cartão é desenhado", documento.querySelectorAll("#lista-projetos > article").length, 0);
    conferir(rotulo + ": o problema também vai para o console.error", janela.__consoleErros.length >= 1);

    if (!opcoes.teclado) return;
    const errosAntes = janela.__erros.length;
    apertarTecla(janela, documento, "Escape");
    if (opcoes.tema) {
        conferirIgual(rotulo + ": o tema guardado foi aplicado", documento.documentElement.dataset.tema, "escuro");
        documento.getElementById("botao-tema").click();
        conferirIgual(rotulo + ": o botão de tema funciona", documento.documentElement.dataset.tema, "claro");
        apertarTecla(janela, documento, "h");
        conferirIgual(rotulo + ": a tecla H funciona", documento.body.classList.contains("ver-estrutura"), true);
    }
    conferirIgual(rotulo + ": e nada disso gera erro novo", janela.__erros.slice(errosAntes).join(" | "), "");
}

/* Alguns eventos de teclado chegam sem texto em `key` (o preenchimento automático do navegador faz isso): o handler não pode lançar. */
function conferirTeclaSemKey(janela) {
    const documento = janela.document;
    const errosAntes = janela.__erros.length;
    const semKey = new janela.Event("keydown", { bubbles: true, cancelable: true });
    const keyNumerica = new janela.Event("keydown", { bubbles: true });
    Object.defineProperty(keyNumerica, "key", { value: 42 });
    const keyNula = new janela.Event("keydown", { bubbles: true });
    Object.defineProperty(keyNula, "key", { value: null });

    [semKey, keyNumerica, keyNula].forEach(function (evento) { documento.body.dispatchEvent(evento); });
    conferirIgual("keydown sem key, com key numérica e com key nula: nenhum erro não tratado", janela.__erros.slice(errosAntes).join(" | "), "");
    conferirIgual("e a estrutura não ligou", documento.body.classList.contains("ver-estrutura"), false);
}

/* H dentro de um campo é uma letra digitada, não o atalho. O controle (H fora de campo liga) prova que o teste enxerga o atalho. */
function conferirHNaoLigaEmCampos(janela) {
    const documento = janela.document;
    const ligada = function () { return documento.body.classList.contains("ver-estrutura"); };
    const sonda = documento.createElement("div");
    sonda.innerHTML = '<input id="campo-texto" type="text" aria-label="teste"><textarea id="campo-area" aria-label="teste"></textarea><select id="campo-lista" aria-label="teste"><option>h</option></select><div id="campo-editavel" contenteditable="true" tabindex="0">texto</div>';
    documento.body.appendChild(sonda);
    try {
        const queLigaram = [];
        ["campo-texto", "campo-area", "campo-lista", "campo-editavel"].forEach(function (id) {
            const campo = documento.getElementById(id);
            campo.focus();
            apertarTecla(janela, campo, "h");
            if (ligada()) {
                queLigaram.push("#" + id);
                apertarTecla(janela, documento, "h");           // desfaz, para o próximo campo começar desligado
            }
        });
        conferir("H digitado em <input>, <textarea>, <select> e contenteditable não liga a estrutura (o handler de teclado do document não olha onde o foco está)", queLigaram.length === 0, "ligou em: " + queLigaram.join(", "));

        apertarTecla(janela, documento.body, "h");
        conferirIgual("controle: H fora de um campo (no body) liga a estrutura", ligada(), true);
        apertarTecla(janela, documento.body, "h");
        conferirIgual("e desliga de novo", ligada(), false);
    } finally {
        sonda.remove();
    }
}

/* A inicial do bloco colorido é a primeira LETRA INTEIRA do nome: uma letra fora do plano básico (2 unidades UTF-16) não pode virar meia letra. */
function conferirInicialDoBlocoColorido(janela) {
    const documento = janela.document;
    const projetos = janela.eval("projetos");
    const original = copiaDosProjetos(janela);
    const casos = [["ábaco", "Á"], ["tetris", "T"], ["𐐨bc", "𐐀"], ["𠮷野家", "𠮷"], ["123 jogos", "#"], ["😀 jogo", "#"]];
    const prefixo = "data:image/svg+xml,";

    try {
        projetos[0].imagem = "";
        casos.forEach(function (caso) {
            projetos[0].nome = caso[0];
            let erroLancado = null;
            try { janela.desenharProjetos(); } catch (erro) { erroLancado = erro; }
            conferirIgual("nome " + JSON.stringify(caso[0]) + ": desenharProjetos não lança erro", String(erroLancado), "null");
            const imagem = documento.querySelector("#lista-projetos img");
            const origem = imagem ? imagem.getAttribute("src") : "";
            conferir("nome " + JSON.stringify(caso[0]) + ": o bloco é um SVG embutido", origem.indexOf(prefixo) === 0, origem.slice(0, 40));
            const svg = new DOMParser().parseFromString(decodeURIComponent(origem.slice(prefixo.length)), "image/svg+xml");
            conferirIgual("nome " + JSON.stringify(caso[0]) + ": o SVG é válido", svg.querySelector("parsererror"), null);
            conferirIgual("nome " + JSON.stringify(caso[0]) + ": a inicial é " + caso[1], svg.querySelector("text").textContent, caso[1]);
        });
    } finally {
        projetos.forEach(function (projeto, posicao) { Object.assign(projeto, original[posicao]); });
        janela.desenharProjetos();
    }
}
