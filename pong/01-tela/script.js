/*
  PONG — PASSO 1: A TELA

  Três peças paradas: duas raquetes e uma bola.

  Se você vem da cobrinha, quase tudo aqui é familiar. Mas há uma decisão
  nova, e ela vale o passo inteiro:

      TODOS OS OBJETOS TÊM A MESMA FORMA.

  Bola e raquetes são objetos com exatamente os mesmos campos:
  x, y, largura e altura. Não é capricho — é o que vai permitir, mais
  adiante, escrever UMA função de desenho e UMA função de colisão que
  servem para qualquer um deles, sem tradução no meio.

  Repare também no que NÃO existe aqui: nenhuma grade, nenhuma "coluna",
  nenhuma "linha". Na cobrinha, tudo vivia em casas de um tabuleiro.
  Aqui os objetos ocupam posições em pixels — e logo, posições com
  casas decimais.
*/


// ============================================================
// CONSTANTES
// ============================================================
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;   // distância entre a raquete e a borda
const TAMANHO_DA_BOLA = 4;

const COR_FUNDO = "#06070d";
const COR_ELEMENTOS = "#00f0ff";
const COR_LINHA_CENTRAL = "#123";


// ============================================================
// DOM E CANVAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// OS OBJETOS
// ============================================================
/*
  x e y são o CANTO SUPERIOR ESQUERDO de cada objeto, como o fillRect
  espera. Não o centro — essa confusão desloca tudo pela metade do
  tamanho e é um erro clássico.
*/
const raqueteEsquerda = {
    x: MARGEM_DA_RAQUETE,
    y: (tela.height - ALTURA_DA_RAQUETE) / 2,
    largura: LARGURA_DA_RAQUETE,
    altura: ALTURA_DA_RAQUETE
};

const raqueteDireita = {
    x: tela.width - MARGEM_DA_RAQUETE - LARGURA_DA_RAQUETE,
    y: (tela.height - ALTURA_DA_RAQUETE) / 2,
    largura: LARGURA_DA_RAQUETE,
    altura: ALTURA_DA_RAQUETE
};

const bola = {
    x: (tela.width - TAMANHO_DA_BOLA) / 2,
    y: (tela.height - TAMANHO_DA_BOLA) / 2,
    largura: TAMANHO_DA_BOLA,
    altura: TAMANHO_DA_BOLA
};

/*
  Note que as posições são CALCULADAS a partir do tamanho da tela, e não
  escritas à mão. Se você mudar a resolução no HTML, tudo continua
  centralizado sozinho. Um número escrito duas vezes é um número que um
  dia vai divergir.
*/


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharLinhaCentral();

    pincel.fillStyle = COR_ELEMENTOS;
    desenharRetangulo(raqueteEsquerda);
    desenharRetangulo(raqueteDireita);
    desenharRetangulo(bola);
}

/*
  AQUI ESTÁ O RETORNO DA DECISÃO LÁ DE CIMA.

  Esta função não sabe se está desenhando uma bola ou uma raquete. Ela só
  precisa de algo que tenha x, y, largura e altura.

  Funções que não sabem QUAL objeto estão manipulando são as que você
  não reescreve nunca mais.
*/
function desenharRetangulo(objeto) {
    pincel.fillRect(objeto.x, objeto.y, objeto.largura, objeto.altura);
}

/*
  A linha central tracejada, desenhada com um laço: um risco a cada 8
  pixels. Fazer no código em vez de à mão significa que ela se ajusta
  sozinha se a tela mudar de altura.
*/
function desenharLinhaCentral() {
    pincel.fillStyle = COR_LINHA_CENTRAL;

    const meio = tela.width / 2 - 1;
    for (let y = 2; y < tela.height; y += 8) {
        pincel.fillRect(meio, y, 2, 4);
    }
}


desenhar();
