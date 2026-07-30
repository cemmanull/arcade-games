/*
  XADREZ — PASSO 2: AS PEÇAS

  O tabuleiro ganha ocupantes. Três decisões, todas sobre COMO REPRESENTAR
  as coisas — que é metade do trabalho de programar.

  1. Uma casa vazia é `null`. Uma casa ocupada guarda um objeto peça.
  2. Uma peça é `{ cor, tipo }` — e nada mais. Ela não sabe onde está.
  3. As peças são desenhadas com caracteres Unicode, não imagens.

  A segunda decisão é a mais importante e a menos óbvia. Volte a ela
  depois de ler o código.
*/


// ============================================================
// PEÇAS
// ============================================================
const BRANCAS = "brancas";
const PRETAS = "pretas";

/*
  UMA PEÇA NÃO SABE ONDE ESTÁ.

  Seria natural escrever { cor, tipo, linha, coluna }. Não faça isso.

  Se a peça guardasse a própria posição, existiriam DUAS fontes de
  verdade: o índice do array e o campo dentro da peça. Elas concordariam
  quase sempre — e, no dia em que discordassem, o bug seria daqueles que
  levam uma tarde.

  Quem sabe onde a peça está é o TABULEIRO: a posição é o índice do
  array. A peça é só "o que" está ali.

  Object.freeze impede alterações acidentais. E, como uma peça nunca
  muda, podemos criar uma única de cada tipo e reutilizá-la em todas as
  casas — o que evita criar milhares de objetos mais adiante.
*/
function criarPeca(cor, tipo) {
    return Object.freeze({ cor, tipo });
}

const PECAS = {
    brancas: {
        peao: criarPeca(BRANCAS, "peao"),
        cavalo: criarPeca(BRANCAS, "cavalo"),
        bispo: criarPeca(BRANCAS, "bispo"),
        torre: criarPeca(BRANCAS, "torre"),
        dama: criarPeca(BRANCAS, "dama"),
        rei: criarPeca(BRANCAS, "rei")
    },
    pretas: {
        peao: criarPeca(PRETAS, "peao"),
        cavalo: criarPeca(PRETAS, "cavalo"),
        bispo: criarPeca(PRETAS, "bispo"),
        torre: criarPeca(PRETAS, "torre"),
        dama: criarPeca(PRETAS, "dama"),
        rei: criarPeca(PRETAS, "rei")
    }
};

/*
  Xadrez tem símbolos próprios no Unicode desde os anos 90.

  Nada de imagens: são caracteres de texto. Acompanham o tamanho da
  fonte, nunca ficam borrados, não precisam ser baixados e podem ser
  copiados junto com o texto da página.
*/
const SIMBOLOS = {
    brancas: { rei: "♔", dama: "♕", torre: "♖", bispo: "♗", cavalo: "♘", peao: "♙" },
    pretas:  { rei: "♚", dama: "♛", torre: "♜", bispo: "♝", cavalo: "♞", peao: "♟" }
};

const NOMES_DAS_PECAS = {
    rei: "rei", dama: "dama", torre: "torre",
    bispo: "bispo", cavalo: "cavalo", peao: "peão"
};


// ============================================================
// DOM E COORDENADAS
// ============================================================
const elementoTabuleiro = document.getElementById("tabuleiro");
const elementoLegenda = document.getElementById("legenda");

function linhaDe(indice) { return Math.floor(indice / 8); }
function colunaDe(indice) { return indice % 8; }
function indiceDe(linha, coluna) { return linha * 8 + coluna; }

function nomeDaCasa(indice) {
    return "abcdefgh"[colunaDe(indice)] + (8 - linhaDe(indice));
}


// ============================================================
// A POSIÇÃO INICIAL
// ============================================================
/*
  FEN é o formato padrão para escrever uma posição de xadrez em uma
  linha de texto. Vale muito a pena aceitá-lo:

    - a posição inicial deixa de ser 32 linhas escritas à mão;
    - dá para carregar QUALQUER posição para testar — um final, um
      problema de mate, uma armadilha de abertura;
    - é o formato que todo programa de xadrez do mundo entende.

      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
       ^ da oitava fileira até a primeira, separadas por barra

  Minúsculas são pretas, MAIÚSCULAS são brancas, e um número quer dizer
  "tantas casas vazias seguidas".

  Ler um formato existente quase sempre custa menos do que inventar o
  seu — e te dá acesso a tudo que já foi escrito nele.
*/
const POSICAO_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function carregarPosicao(textoFEN) {
    const casas = new Array(64).fill(null);

    const letraParaTipo = {
        p: "peao", n: "cavalo", b: "bispo",
        r: "torre", q: "dama", k: "rei"
    };

    let indice = 0;

    for (const caractere of textoFEN) {
        if (caractere === "/") {
            continue;   // separador de fileiras: não ocupa casa
        }

        if (caractere >= "1" && caractere <= "8") {
            indice += Number(caractere);   // pula casas vazias
            continue;
        }

        const ehBranca = caractere === caractere.toUpperCase();
        const tipo = letraParaTipo[caractere.toLowerCase()];

        casas[indice] = PECAS[ehBranca ? BRANCAS : PRETAS][tipo];
        indice += 1;
    }

    return casas;
}


// ============================================================
// ESTADO
// ============================================================
let casas = carregarPosicao(POSICAO_INICIAL);

const casasDaTela = [];



/*
  As letras e números nos cantos do tabuleiro.

  Só as casas da BORDA recebem o atributo: a coluna 0 ganha o número da
  fileira, a linha 7 ganha a letra da coluna. O CSS lê esses atributos
  com attr(data-fileira); as casas sem o atributo não mostram nada.
*/
function marcarCoordenadas(casa, indice) {
    if (colunaDe(indice) === 0) {
        casa.dataset.fileira = 8 - linhaDe(indice);
    }

    if (linhaDe(indice) === 7) {
        casa.dataset.coluna = "abcdefgh"[colunaDe(indice)];
    }
}
// ============================================================
// MONTAR E DESENHAR
// ============================================================
/*
  Repare na divisão de trabalho entre estas duas funções:

      montarTabuleiro -> cria os 64 botões UMA VEZ
      desenhar        -> atualiza o conteúdo deles, sempre que preciso

  Nas lições anteriores o conselho foi "apague tudo e redesenhe". Aqui
  reaproveitamos os elementos, e o motivo é concreto: recriar os botões
  destruiria o que está com o FOCO do teclado, e quem joga sem mouse
  perderia o lugar no tabuleiro a cada jogada.

  O princípio continua valendo — o conteúdo é sempre derivado do estado.
  O que muda é que reaproveitamos as caixas em vez de jogá-las fora.
*/
function montarTabuleiro() {
    for (let indice = 0; indice < 64; indice++) {
        const casa = document.createElement("button");
        casa.type = "button";
        casa.className = "casa";

        const ehClara = (linhaDe(indice) + colunaDe(indice)) % 2 === 0;
        casa.classList.add(ehClara ? "clara" : "escura");

        marcarCoordenadas(casa, indice);
        casa.addEventListener("click", () => aoClicarNaCasa(indice));

        casasDaTela[indice] = casa;
        elementoTabuleiro.appendChild(casa);
    }
}

function desenhar() {
    for (let indice = 0; indice < 64; indice++) {
        const casa = casasDaTela[indice];
        const peca = casas[indice];

        casa.textContent = peca ? SIMBOLOS[peca.cor][peca.tipo] : "";

        /*
          Uma classe por cor. Quem pinta é o CSS — aqui só dizemos qual
          peça é de quem.

          No visual retrô os dois lados ganham cores de neon em vez de
          branco e preto. Isso resolve de quebra um problema real do
          Unicode: os símbolos "brancos" (♔♕♖) são contornos vazados e
          sumiriam sobre fundos claros.
        */
        casa.classList.toggle("peca-branca", Boolean(peca) && peca.cor === BRANCAS);
        casa.classList.toggle("peca-preta", Boolean(peca) && peca.cor === PRETAS);

        /*
          Sem isto, um leitor de tela anunciaria "botão" 64 vezes.
          Com isto, ele diz "e4, cavalo branco" — e o jogo fica utilizável
          por quem não enxerga o tabuleiro. É uma linha.
        */
        casa.setAttribute("aria-label", descreverCasa(indice, peca));
    }

    elementoLegenda.textContent =
        `${casas.filter(peca => peca !== null).length} peças no tabuleiro.`;
}

function descreverCasa(indice, peca) {
    const nome = nomeDaCasa(indice);

    if (!peca) {
        return `${nome}, vazia`;
    }

    const cor = peca.cor === BRANCAS ? "branco" : "preto";
    return `${nome}, ${NOMES_DAS_PECAS[peca.tipo]} ${cor}`;
}

function aoClicarNaCasa(indice) {
    const peca = casas[indice];
    console.log(nomeDaCasa(indice), "->", peca ? `${peca.tipo} ${peca.cor}` : "vazia");
}


// ============================================================
// LIGAR
// ============================================================
montarTabuleiro();
desenhar();

console.log("Experimente no console:");
console.log("  casas[0]                        -> a torre preta de a8");
console.log("  carregarPosicao('8/8/4k3/8/8/4K3/8/8')  -> só dois reis");
