/*
  TETRIS — PASSO 2: AS PEÇAS

  Sete peças, todas feitas de quatro quadrados. E a pergunta deste passo:
  COMO GUARDAR UMA FORMA?

  Daria para escrever uma função de desenho para cada peça — sete funções,
  cada uma com seus fillRect. Mas aí cada coisa nova (girar, colidir,
  mostrar a próxima) precisaria de sete versões também.

  A saída é a mesma do poço: uma MATRIZ. Cada peça é uma grade pequena de
  0 e 1, onde 1 é um quadrado.

      T:  0 1 0
          1 1 1
          0 0 0

  Com isso, UMA função desenha qualquer peça, e — nos próximos passos —
  UMA função decide se qualquer peça cabe em qualquer lugar, e UMA função
  gira qualquer peça.

  E a peça que está caindo é só isto: uma forma + uma posição no poço.
*/


// ============================================================
// CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;

/*
  O CATÁLOGO DAS PEÇAS.

  A tabela de cores do passo 1 virou uma tabela de peças: cada letra tem
  agora a sua cor E a sua forma. Tudo o que define uma peça mora junto, num
  lugar só.

  Repare em dois detalhes das formas:

  1. Todas são QUADRADAS (2x2, 3x3 ou 4x4), mesmo quando a peça não é.
     O espaço vazio em volta parece desperdício, mas é ele que vai permitir
     girar a peça em torno do centro, no passo 5, sem nenhum caso especial.

  2. O I fica deitado na SEGUNDA linha do seu 4x4, e não na primeira.
     Mesma razão: é o que o põe no centro do quadrado ao girar.
*/
const PECAS = {
    I: {
        cor: "#00f0ff",
        forma: [
            [0, 0, 0, 0],
            [1, 1, 1, 1],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ]
    },
    O: {
        cor: "#ffe14d",
        forma: [
            [1, 1],
            [1, 1]
        ]
    },
    T: {
        cor: "#c46bff",
        forma: [
            [0, 1, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    },
    S: {
        cor: "#4dff7a",
        forma: [
            [0, 1, 1],
            [1, 1, 0],
            [0, 0, 0]
        ]
    },
    Z: {
        cor: "#ff4d6d",
        forma: [
            [1, 1, 0],
            [0, 1, 1],
            [0, 0, 0]
        ]
    },
    J: {
        cor: "#4d7aff",
        forma: [
            [1, 0, 0],
            [1, 1, 1],
            [0, 0, 0]
        ]
    },
    L: {
        cor: "#ff9f1c",
        forma: [
            [0, 0, 1],
            [1, 1, 1],
            [0, 0, 0]
        ]
    }
};

/*
  Object.keys devolve as chaves do objeto como lista: ["I", "O", "T", ...].
  Assim a lista dos tipos se DEDUZ do catálogo: acrescente uma peça lá em
  cima e ela entra no sorteio sem que mais nada precise mudar.
*/
const TIPOS = Object.keys(PECAS);

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
function criarLinhaVazia() {
    return new Array(COLUNAS).fill(null);
}

function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}

const poco = criarPocoVazio();

const EXEMPLO = [
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
// A PEÇA ATUAL
// ============================================================
/*
  A peça que está caindo é um objeto pequeno:

      tipo    -> a letra, para achar a cor no catálogo
      forma   -> a matriz de 0 e 1
      coluna  -> onde fica o canto superior esquerdo DA MATRIZ
      linha      (não do primeiro quadrado: da matriz inteira, com os zeros)

  Ela NÃO está dentro do poço. Ela flutua por cima dele, e só vai virar
  casas do poço quando parar — no passo 3.
*/
function criarPeca(tipo) {
    const forma = PECAS[tipo].forma;

    return {
        tipo: tipo,
        forma: forma,

        // Centralizada: (10 - 3) / 2 = 3,5 → 3. Math.floor garante uma
        // coluna inteira — não existe "coluna três e meia".
        coluna: Math.floor((COLUNAS - forma[0].length) / 2),
        linha: 0
    };
}

/*
  Sortear um item de uma lista: um índice aleatório entre 0 e o
  comprimento menos 1. É a mesma conta do sorteio da maçã na cobrinha.
*/
function sortearTipo() {
    return TIPOS[Math.floor(Math.random() * TIPOS.length)];
}

const pecaAtual = criarPeca(sortearTipo());


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharGrade();
    desenharPoco();
    desenharPeca(pecaAtual);
}

function desenharPoco() {
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const tipo = poco[linha][coluna];

            if (tipo !== null) {
                desenharCelula(coluna, linha, PECAS[tipo].cor);
            }
        }
    }
}

/*
  Desenhar uma peça é percorrer a SUA matriz, pulando os zeros, e
  desenhar cada quadrado DESLOCADO pela posição da peça:

      coluna no poço = coluna da peça + x dentro da matriz
      linha no poço  = linha da peça  + y dentro da matriz

  Essa soma — posição da peça + posição dentro da forma — vai aparecer em
  quase toda função daqui para a frente. Vale reconhecê-la de longe.
*/
function desenharPeca(peca) {
    const cor = PECAS[peca.tipo].cor;

    peca.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharCelula(peca.coluna + x, peca.linha + y, cor);
            }
        });
    });
}

function desenharCelula(coluna, linha, cor) {
    const x = coluna * TAMANHO_DA_CELULA;
    const y = linha * TAMANHO_DA_CELULA;
    const t = TAMANHO_DA_CELULA;

    pincel.fillStyle = cor;
    pincel.fillRect(x, y, t, t);

    pincel.fillStyle = "rgba(255, 255, 255, 0.4)";
    pincel.fillRect(x, y, t, 1);
    pincel.fillRect(x, y, 1, t);

    pincel.fillStyle = "rgba(0, 0, 0, 0.4)";
    pincel.fillRect(x, y + t - 1, t, 1);
    pincel.fillRect(x + t - 1, y, 1, t);
}

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
