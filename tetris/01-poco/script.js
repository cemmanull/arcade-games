/*
  TETRIS — PASSO 1: O POÇO

  De volta à grade.

  A cobrinha vivia numa grade; o Pong a abandonou e passou a usar posições
  com casas decimais. O Tetris volta para a grade — mas agora a grade não é
  só o lugar onde as coisas andam: ELA É O ESTADO DO JOGO. Cada casa do poço
  guarda se está vazia ou se tem um pedaço de peça.

  A estrutura para isso é uma MATRIZ: um array de arrays.

      poco[linha][coluna]

  20 linhas, cada uma com 10 casas. Nada de desenhar blocos "à mão": o
  desenho sai inteiro da matriz, casa por casa.
*/


// ============================================================
// CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;   // pixels de desenho por casa

/*
  Cada tipo de peça tem uma letra — I, O, T, S, Z, J, L, as formas que
  as peças lembram — e cada letra tem uma cor.

  Repare que o poço NÃO vai guardar cores. Ele guarda a LETRA, e a cor é
  consultada nesta tabela só na hora de desenhar. Separe o que a coisa É
  (um pedaço de peça T) do jeito como ela APARECE (roxa): trocar a paleta
  inteira passa a ser mudar sete linhas, sem encostar no jogo.
*/
const CORES = {
    I: "#00f0ff",
    O: "#ffe14d",
    T: "#c46bff",
    S: "#4dff7a",
    Z: "#ff4d6d",
    J: "#4d7aff",
    L: "#ff9f1c"
};

const COR_FUNDO = "#06070d";
const COR_GRADE = "#141c2b";


// ============================================================
// DOM E CANVAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// O POÇO
// ============================================================
/*
  Uma casa vazia é `null`; uma casa ocupada guarda a letra da peça.

  `null` é o valor que o JavaScript reserva para "de propósito, nada".
  Usar 0 ou "" também funcionaria, mas null diz a intenção: aqui não há
  nada, e não é por acaso.
*/
function criarLinhaVazia() {
    return new Array(COLUNAS).fill(null);
}

/*
  ATENÇÃO À ARMADILHA MAIS FAMOSA DAS MATRIZES.

  Parece que isto daria no mesmo:

      new Array(LINHAS).fill(criarLinhaVazia())

  e NÃO dá. O fill avalia o argumento UMA vez e coloca o MESMO array em
  todas as 20 posições. Seriam vinte nomes para uma única linha: pintar uma
  casa na linha 19 pintaria a mesma casa em todas as outras.

  Array.from chama a função uma vez POR POSIÇÃO, e cada linha nasce
  independente. (O exercício 4 do guia mostra o bug ao vivo.)
*/
function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}

const poco = criarPocoVazio();


// ============================================================
// UM POÇO DE EXEMPLO
// ============================================================
/*
  Para ter algo para ver, as últimas linhas recebem blocos já parados.

  Escrever isso como texto deixa o desenho LEGÍVEL dentro do código: cada
  string é uma linha do poço, cada caractere uma casa, e o ponto é vazio.
  Dá para "ver" o resultado antes de abrir o navegador.
*/
const EXEMPLO = [
    "....T.....",
    "...TTT..O.",
    "IJJ.SS.OOL",
    "IJ.SS.ZZ.L",
    "IJ.LLL.ZZL",
    "I.ZZTTTLLL"
];

function aplicarExemplo() {
    const primeiraLinha = LINHAS - EXEMPLO.length;

    EXEMPLO.forEach((texto, i) => {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const caractere = texto[coluna];
            poco[primeiraLinha + i][coluna] = caractere === "." ? null : caractere;
        }
    });
}


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharGrade();

    /*
      Dois laços aninhados percorrem a matriz inteira: o de fora anda pelas
      linhas, o de dentro pelas colunas de cada linha.

      ORDEM DOS ÍNDICES: poco[linha][coluna] — primeiro a linha (o y),
      depois a coluna (o x). É o contrário do que a matemática acostuma
      (x antes de y), e trocar os dois é o erro mais comum com matrizes.
    */
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const tipo = poco[linha][coluna];

            if (tipo !== null) {
                desenharCelula(coluna, linha, CORES[tipo]);
            }
        }
    }
}

/*
  A conversão de CASA para PIXEL acontece em um único lugar: aqui.

  O resto do programa só fala em colunas e linhas. Se um dia a célula
  passar a ter 6 pixels em vez de 8, muda uma constante — e mais nada.
*/
function desenharCelula(coluna, linha, cor) {
    const x = coluna * TAMANHO_DA_CELULA;
    const y = linha * TAMANHO_DA_CELULA;
    const t = TAMANHO_DA_CELULA;

    pincel.fillStyle = cor;
    pincel.fillRect(x, y, t, t);

    /*
      O efeito de "bloco" custa quatro retângulos de 1 pixel: uma luz em
      cima e à esquerda, uma sombra embaixo e à direita. O olho entende
      relevo sem que nada seja de fato tridimensional.
    */
    pincel.fillStyle = "rgba(255, 255, 255, 0.4)";
    pincel.fillRect(x, y, t, 1);
    pincel.fillRect(x, y, 1, t);

    pincel.fillStyle = "rgba(0, 0, 0, 0.4)";
    pincel.fillRect(x, y + t - 1, t, 1);
    pincel.fillRect(x + t - 1, y, 1, t);
}

/*
  Um pontinho no canto de cada casa, para o olho medir as colunas. Igual
  ao fundo da cobrinha: discreto o bastante para não competir com as peças.
*/
function desenharGrade() {
    pincel.fillStyle = COR_GRADE;

    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            pincel.fillRect(
                coluna * TAMANHO_DA_CELULA + TAMANHO_DA_CELULA / 2,
                linha * TAMANHO_DA_CELULA + TAMANHO_DA_CELULA / 2,
                1, 1
            );
        }
    }
}


aplicarExemplo();
desenhar();
