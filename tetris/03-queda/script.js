/*
  TETRIS — PASSO 3: A QUEDA

  Três ideias entram de uma vez, e as três ficam até o fim:

  1. TEMPO CONTÍNUO, MOVIMENTO EM PASSOS
     O loop é o do Pong: requestAnimationFrame e delta time. Mas a peça
     não pode andar 0,3 linha — numa grade, ou ela está numa linha ou na
     outra. Um ACUMULADOR junta o tempo que passa e, a cada segundo
     completo, gasta esse segundo descendo uma linha inteira.

  2. TESTAR ANTES DE MOVER
     No Pong, a bola entrava na parede e era empurrada de volta. Aqui a
     peça nunca entra em lugar nenhum: antes de cada movimento, uma função
     pergunta "a peça CABERIA lá?". Se não caberia, o movimento não
     acontece. Nada a desfazer, nenhuma posição a corrigir.

  3. TRAVAR
     Quando a peça não consegue mais descer, ela deixa de ser peça: seus
     quadrados são copiados para dentro do poço, e uma peça nova nasce
     no topo.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;

const INTERVALO_DE_QUEDA = 1.0;   // segundos para descer uma linha

const PECAS = {
    I: { cor: "#00f0ff", forma: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { cor: "#ffe14d", forma: [[1, 1], [1, 1]] },
    T: { cor: "#c46bff", forma: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { cor: "#4dff7a", forma: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { cor: "#ff4d6d", forma: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { cor: "#4d7aff", forma: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { cor: "#ff9f1c", forma: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }
};
/*
  As formas agora estão em uma linha cada, para o catálogo caber na tela.
  São exatamente as mesmas matrizes do passo 2: cada [ ... ] interno é
  uma linha, de cima para baixo.
*/

const TIPOS = Object.keys(PECAS);

const COR_FUNDO = "#06070d";
const COR_GRADE = "#141c2b";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// 3. ESTADO
// ============================================================
function criarLinhaVazia() {
    return new Array(COLUNAS).fill(null);
}

function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}

/*
  `let`, e não mais `const`: o poço inteiro vai ser trocado por um vazio
  quando encher. A peça atual também — a cada peça nova.
*/
let poco = criarPocoVazio();
let pecaAtual = null;

let acumuladorDeQueda = 0;
let instanteDoQuadroAnterior = 0;

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
// 4. PEÇAS
// ============================================================
function criarPeca(tipo) {
    const forma = PECAS[tipo].forma;

    return {
        tipo: tipo,
        forma: forma,
        coluna: Math.floor((COLUNAS - forma[0].length) / 2),
        linha: 0
    };
}

function sortearTipo() {
    return TIPOS[Math.floor(Math.random() * TIPOS.length)];
}

function nascerPeca() {
    pecaAtual = criarPeca(sortearTipo());
    acumuladorDeQueda = 0;

    /*
      Se a peça nova já nasce em cima de blocos, o poço encheu.
      No passo 7 isso vai ser o fim de jogo; por enquanto, esvaziamos o
      poço e seguimos — só para a demonstração não parar.
    */
    if (!cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha)) {
        poco = criarPocoVazio();
    }
}


// ============================================================
// 5. CABE? — a pergunta mais importante do jogo
// ============================================================
/*
  "Esta forma, com o canto nesta coluna e nesta linha, caberia no poço?"

  Para cada quadrado da forma (os 1), calcula a casa do poço onde ele
  cairia — a mesma soma do desenho, posição da peça + posição na matriz —
  e confere duas coisas:

    1. a casa existe? (não está fora das bordas)
    2. a casa está vazia?

  Um único "não" basta para a resposta ser "não". Por isso o `return
  false` sai no meio dos laços: não adianta olhar os outros quadrados.

  Repare no que esta função NÃO faz: ela não move nada. Ela só responde.
  Uma função que só responde pode ser chamada quantas vezes quiser, com
  qualquer posição hipotética, sem medo de estragar o estado.
*/
function cabe(forma, coluna, linha) {
    for (let y = 0; y < forma.length; y++) {
        for (let x = 0; x < forma[y].length; x++) {
            if (forma[y][x] === 0) {
                continue;   // casa vazia da matriz: não ocupa nada
            }

            const colunaNoPoco = coluna + x;
            const linhaNoPoco = linha + y;

            /*
              A parede e o chão não são objetos: são só o FIM DA GRADE.
              "Bater na parede" é tentar usar uma coluna que não existe.
            */
            const foraDoPoco =
                colunaNoPoco < 0 || colunaNoPoco >= COLUNAS ||
                linhaNoPoco < 0 || linhaNoPoco >= LINHAS;

            if (foraDoPoco) {
                return false;
            }

            if (poco[linhaNoPoco][colunaNoPoco] !== null) {
                return false;
            }
        }
    }

    return true;
}


// ============================================================
// 6. MOVER E TRAVAR
// ============================================================
/*
  TESTAR ANTES DE MOVER.

  No Pong, a bola entrava 2 pixels na parede e precisava ser empurrada de
  volta. Aqui isso nunca acontece: a pergunta vem ANTES, e se a resposta
  for "não cabe", a peça simplesmente fica onde está.

  Devolve true ou false para quem chamou saber se deu certo — a gravidade
  precisa disso para decidir se é hora de travar.
*/
function moverPeca(deslocamentoColuna, deslocamentoLinha) {
    const novaColuna = pecaAtual.coluna + deslocamentoColuna;
    const novaLinha = pecaAtual.linha + deslocamentoLinha;

    if (!cabe(pecaAtual.forma, novaColuna, novaLinha)) {
        return false;
    }

    pecaAtual.coluna = novaColuna;
    pecaAtual.linha = novaLinha;
    return true;
}

/*
  TRAVAR: a peça vira poço.

  Cada quadrado da peça é escrito na casa correspondente da matriz, com a
  letra do tipo. A partir daqui, o poço não lembra que aqueles quadrados
  foram uma peça: são só casas ocupadas, iguais a todas as outras.
*/
function travarPeca() {
    pecaAtual.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                poco[pecaAtual.linha + y][pecaAtual.coluna + x] = pecaAtual.tipo;
            }
        });
    });

    nascerPeca();
}


// ============================================================
// 7. O LOOP
// ============================================================
/*
  O mesmo loop do Pong, peça por peça: requestAnimationFrame, delta time
  em segundos e o teto de 0,05s para a aba que volta do segundo plano.
*/
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

/*
  O ACUMULADOR — tempo contínuo virando passos inteiros.

  A cada quadro chegam uns 0,016 segundo. Eles vão se somando no
  acumulador. Quando a soma passa de INTERVALO_DE_QUEDA, gastamos um
  intervalo inteiro descendo uma linha — e o que sobrou continua lá,
  para o próximo.

  Por que "subtrair o intervalo" e não "zerar"? Se o acumulador chegou a
  1,013 e você zerasse, os 0,013 de sobra seriam jogados fora. Quadro após
  quadro, essas sobras perdidas atrasam o relógio, e quanto mais lenta a
  máquina, mais ela atrasa. Subtraindo, o tempo é contado inteiro.

  É o papel que o setInterval cumpria na cobrinha — só que agora quem
  conta o tempo é você. E isso vai valer ouro: no próximo passo o
  intervalo muda no meio do caminho (ao segurar ↓), e no passo 8 ele
  diminui a cada nível.
*/
function atualizar(tempo) {
    acumuladorDeQueda += tempo;

    while (acumuladorDeQueda >= INTERVALO_DE_QUEDA) {
        acumuladorDeQueda -= INTERVALO_DE_QUEDA;

        const desceu = moverPeca(0, 1);

        /*
          Não conseguiu descer: tem algo embaixo, ou é o chão.
          Hora de travar — e o `break` sai do laço, porque a peça nova não
          deve herdar o tempo da antiga.
        */
        if (!desceu) {
            travarPeca();
            break;
        }
    }
}


// ============================================================
// 8. DESENHAR
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


// ============================================================
// 9. LIGAR
// ============================================================
aplicarExemplo();
nascerPeca();
requestAnimationFrame(quadroAQuadro);
