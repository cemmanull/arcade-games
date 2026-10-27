/*
  PAC-MAN — PASSO 1: O LABIRINTO

  De volta à grade, como no Tetris: o labirinto é uma MATRIZ, e cada casa
  diz o que tem nela. Desta vez a matriz nasce de um TEXTO — o labirinto
  inteiro desenhado com caracteres, legível dentro do código.

  E o desenho das paredes não é feito à mão: cada casa de parede olha os
  seus VIZINHOS e decide sozinha onde traçar as linhas. Mude o texto e o
  desenho inteiro se refaz.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DA_CASA = 8;   // pixels de desenho por casa

/*
  O LABIRINTO, como texto. Cada caractere é uma casa:

      #   parede
      .   pastilha
      o   energizante (a pastilha grande)
          (espaço) corredor vazio
      -   porta da casa dos fantasmas
      G   dentro da casa dos fantasmas

  É simétrico — a metade direita é o espelho da esquerda — e não tem
  becos sem saída: num jogo de perseguição, um beco é uma armadilha sem
  escapatória. A linha do meio (com espaços nas pontas) é o TÚNEL: sair
  por um lado é entrar pelo outro.
*/
const MAPA_EM_TEXTO = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "######.##### ## #####.######",
    "######.##          ##.######",
    "######.## ###--### ##.######",
    "######.## #GGGGGG# ##.######",
    "      .   #GGGGGG#   .      ",
    "######.## #GGGGGG# ##.######",
    "######.## ######## ##.######",
    "######.##          ##.######",
    "######.## ######## ##.######",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##.......  .......##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################"
];

const COLUNAS = MAPA_EM_TEXTO[0].length;   // 28 — deduzido, não digitado
const LINHAS = MAPA_EM_TEXTO.length;       // 30

const COR_FUNDO = "#000000";
const COR_PAREDE = "#3b5bff";
const COR_PORTA = "#ffb8de";
const COR_PASTILHA = "#ffcfa8";
const COR_PAC_MAN = "#ffd84d";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
/*
  Cada string vira um array de caracteres com split(""): "#..#" vira
  ["#", ".", ".", "#"]. O resultado é a matriz mapa[linha][coluna] —
  primeiro a linha, como no Tetris.

  Por que não usar o próprio texto? Porque strings são IMUTÁVEIS em
  JavaScript: não dá para trocar um caractere no meio de uma. E o mapa
  vai mudar — a cada pastilha comida, um "." vira " ".
*/
function criarMapa() {
    return MAPA_EM_TEXTO.map(linha => linha.split(""));
}

/*
  CONFIRA OS DADOS ANTES DE USAR.

  Um labirinto com uma linha de 27 caracteres no meio de linhas de 28
  não dá erro nenhum: só desenha torto, e o bug aparece longe da causa.
  Uma verificação de três linhas, rodada uma vez, aponta o problema na
  hora — e diz QUAL linha.
*/
function verificarMapa() {
    MAPA_EM_TEXTO.forEach((linha, i) => {
        if (linha.length !== COLUNAS) {
            console.error(`Linha ${i} do mapa tem ${linha.length} casas; deveria ter ${COLUNAS}.`);
        }
    });
}

verificarMapa();
const mapa = criarMapa();


// ============================================================
// 4. PERGUNTAS SOBRE UMA CASA
// ============================================================
/*
  É parede? Fora do mapa conta como parede: assim quem pergunta pela
  vizinha da borda não precisa se preocupar com índices que não existem.
*/
function ehParede(coluna, linha) {
    if (linha < 0 || linha >= LINHAS || coluna < 0 || coluna >= COLUNAS) {
        return true;
    }

    return mapa[linha][coluna] === "#";
}


// ============================================================
// 5. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            desenharCasa(coluna, linha);
        }
    }

    desenharPacManParado();
}

function desenharCasa(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;

    switch (mapa[linha][coluna]) {
        case "#":
            desenharParede(coluna, linha);
            break;

        case ".":
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 3, y + 3, 2, 2);
            break;

        case "o":
            // Um "círculo" de 6x6 feito de dois retângulos: pixel art, sem arc.
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 2, y + 1, 4, 6);
            pincel.fillRect(x + 1, y + 2, 6, 4);
            break;

        case "-":
            pincel.fillStyle = COR_PORTA;
            pincel.fillRect(x, y + 3, TAMANHO_DA_CASA, 2);
            break;
    }
}

/*
  A PAREDE QUE SE DESENHA SOZINHA.

  Uma casa de parede não sabe se é a quina de um bloco, o meio de um
  muro ou a ponta de uma ilha. Mas ela pode PERGUNTAR aos quatro
  vizinhos: "você é parede?". Onde a vizinha é corredor, há uma borda, e
  a borda ganha uma linha.

  As linhas ficam um pouco para dentro da parede (a 2 pixels da borda),
  e cada uma só se estica até o fim da casa se a vizinha daquele lado
  também for parede — senão para no canto, onde encontra a outra linha.
  É isso que fecha as quinas sem deixar pontas sobrando.

      I = a 2 pixels do lado de dentro       F = a 5 pixels

  Os quatro testes de DIAGONAL resolvem as quinas de dentro: quando as
  duas vizinhas são parede mas a da diagonal é corredor, falta um
  pedacinho de L para ligar as linhas das casas ao lado.

  Nada disto está no texto do mapa. É deduzido — e por isso qualquer
  labirinto que você escrever sai desenhado certo.
*/
function desenharParede(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;
    const ultimo = TAMANHO_DA_CASA - 1;
    const I = 2;
    const F = TAMANHO_DA_CASA - 3;

    const livreEmCima = !ehParede(coluna, linha - 1);
    const livreEmbaixo = !ehParede(coluna, linha + 1);
    const livreAEsquerda = !ehParede(coluna - 1, linha);
    const livreADireita = !ehParede(coluna + 1, linha);

    pincel.fillStyle = COR_PAREDE;

    // As bordas retas.
    if (livreEmCima) {
        linhaHorizontal(y + I, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreEmbaixo) {
        linhaHorizontal(y + F, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreAEsquerda) {
        linhaVertical(x + I, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }
    if (livreADireita) {
        linhaVertical(x + F, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }

    // As quinas de dentro: vizinhas são parede, a diagonal não.
    if (!livreEmCima && !livreAEsquerda && !ehParede(coluna - 1, linha - 1)) {
        linhaVertical(x + I, y, y + I);
        linhaHorizontal(y + I, x, x + I);
    }
    if (!livreEmCima && !livreADireita && !ehParede(coluna + 1, linha - 1)) {
        linhaVertical(x + F, y, y + I);
        linhaHorizontal(y + I, x + F, x + ultimo);
    }
    if (!livreEmbaixo && !livreAEsquerda && !ehParede(coluna - 1, linha + 1)) {
        linhaVertical(x + I, y + F, y + ultimo);
        linhaHorizontal(y + F, x, x + I);
    }
    if (!livreEmbaixo && !livreADireita && !ehParede(coluna + 1, linha + 1)) {
        linhaVertical(x + F, y + F, y + ultimo);
        linhaHorizontal(y + F, x + F, x + ultimo);
    }
}

// Duas ajudantes para não escrever largura e altura de linhas de 1 pixel.
function linhaHorizontal(y, de, ate) {
    pincel.fillRect(de, y, ate - de + 1, 1);
}

function linhaVertical(x, de, ate) {
    pincel.fillRect(x, de, 1, ate - de + 1);
}

/*
  O Pac-Man, parado no ponto de partida: entre duas casas da linha 22.
  `arc` desenha um círculo pelo CENTRO; tirando uma fatia, sobra a boca.
  Os ângulos estão em radianos, e começam apontando para a direita.
*/
function desenharPacManParado() {
    const x = 14 * TAMANHO_DA_CASA;
    const y = 22 * TAMANHO_DA_CASA + TAMANHO_DA_CASA / 2;
    const boca = 0.25 * Math.PI;   // 45 graus de cada lado

    pincel.fillStyle = COR_PAC_MAN;
    pincel.beginPath();
    pincel.moveTo(x, y);
    pincel.arc(x, y, 6.5, Math.PI + boca, Math.PI - boca);   // boca virada para a esquerda
    pincel.closePath();
    pincel.fill();
}


// ============================================================
// 6. LIGAR
// ============================================================
desenhar();
