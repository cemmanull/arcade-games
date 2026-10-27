/*
  TETRIS — PASSO 5: A ROTAÇÃO

  ↑ (ou X) gira no sentido horário, Z no anti-horário.

  Girar uma peça é girar a MATRIZ dela. E como toda forma é um quadrado
  (o espaço vazio do passo 2 finalmente paga), uma única fórmula gira as
  sete peças, sem nenhum caso especial.

  Mas girar levanta um problema que andar não tinha: a peça girada pode
  não caber exatamente onde está — encostada na parede, por exemplo. Em
  vez de simplesmente recusar, o jogo tenta EMPURRÃOZINHOS: um pouco para
  o lado, um pouco para cima. É isso que faz a rotação parecer esperta.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;

const INTERVALO_DE_QUEDA = 1.0;          // segundos para descer uma linha
const INTERVALO_DA_QUEDA_RAPIDA = 0.04;  // com ↓ segurada: 25 linhas por segundo

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

/*
  Os EMPURRÕES que a rotação tenta, em ordem: [colunas, linhas].

  Primeiro no lugar; depois uma casa para cada lado; depois duas (o I
  deitado precisa de duas para sair da parede); por último uma para cima,
  para girar apoiado no chão ou em outra peça.

  É uma lista de DADOS, não uma sequência de ifs: experimentar outra ordem
  ou acrescentar uma tentativa é mexer só aqui.
*/
const EMPURROES = [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
    [0, -1]
];

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

let baixoPresa = false;   // a ↓ está segurada neste instante?

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
// 6. MOVER, GIRAR E TRAVAR
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


/*
  GIRAR UMA MATRIZ QUADRADA 90 GRAUS.

  Olhe para o T e para ele girado no sentido horário:

      0 1 0          0 1 0
      1 1 1    ->    0 1 1
      0 0 0          0 1 0

  A regra: a COLUNA x da forma original, lida DE BAIXO PARA CIMA, vira a
  LINHA x da forma nova. Em fórmula, para uma matriz de lado n:

      horário:      nova[y][x] = antiga[n - 1 - x][y]
      anti-horário: nova[y][x] = antiga[x][n - 1 - y]

  Teste com o lápis: pegue a casa nova[0][1] do T girado. Ela vem de
  antiga[3 - 1 - 1][0] = antiga[1][0] = 1. Confere.

  Dois detalhes importam aqui:

  1. A função cria uma matriz NOVA (o map devolve arrays novos) e não
     encosta na antiga. A forma da peça atual aponta para o CATÁLOGO; se
     girássemos "no lugar", estragaríamos o T de todas as peças T futuras.

  2. Ela não sabe que peça está girando. Funciona para o 2x2 do O (que
     gira e fica igual), para os 3x3 e para o 4x4 do I.
*/
function girarMatriz(forma, sentido) {
    const n = forma.length;

    return forma.map((linhaDaForma, y) =>
        linhaDaForma.map((_, x) =>
            sentido > 0
                ? forma[n - 1 - x][y]
                : forma[x][n - 1 - y]
        )
    );
}

/*
  Gira a peça atual, se couber em ALGUMA das posições da lista de
  empurrões. Testa uma por uma, na ordem, e fica com a primeira que der.

  Isso só é possível porque `cabe` não muda nada: aqui ela é chamada até
  seis vezes com posições hipotéticas, e só a escolhida é aplicada.
*/
function girarPeca(sentido) {
    const formaGirada = girarMatriz(pecaAtual.forma, sentido);

    for (const [deslocamentoColuna, deslocamentoLinha] of EMPURROES) {
        const coluna = pecaAtual.coluna + deslocamentoColuna;
        const linha = pecaAtual.linha + deslocamentoLinha;

        if (cabe(formaGirada, coluna, linha)) {
            pecaAtual.forma = formaGirada;
            pecaAtual.coluna = coluna;
            pecaAtual.linha = linha;
            return true;
        }
    }

    return false;   // nenhuma serviu: a peça continua como estava
}

/*
  A QUEDA INSTANTÂNEA é um laço: descer enquanto couber.

  `while (moverPeca(0, 1))` repete a chamada até ela devolver false. O
  corpo do laço é vazio — todo o trabalho está na condição. É uma forma
  compacta e comum; leia em voz alta: "enquanto conseguir descer, desça".
*/
function derrubarPeca() {
    while (moverPeca(0, 1)) {
        // nada: descer é a própria condição
    }

    travarPeca();
}


// ============================================================
// 7. TECLADO
// ============================================================
/*
  ← → e Espaço são AÇÕES: cada toque é um movimento. Para elas basta o
  evento keydown, exatamente como as setas da cobrinha.

  E se o jogador segurar ←? O sistema operacional começa a REPETIR o
  keydown sozinho, depois de meio segundo, umas 30 vezes por segundo. É
  por isso que segurar a tecla faz a peça deslizar. De graça — mas com um
  atraso e uma velocidade que variam de máquina para máquina. O passo 8
  troca essa repetição por uma nossa.

  ↓ é diferente: não é uma ação, é um MODO. Enquanto estiver presa, a
  gravidade fica mais forte. Para isso serve o modelo do Pong — keydown
  liga, keyup desliga — e o loop consulta o interruptor a cada quadro.
*/
document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    switch (tecla) {
        case "arrowleft":
            moverPeca(-1, 0);
            break;

        case "arrowright":
            moverPeca(1, 0);
            break;

        case "arrowdown":
            /*
              evento.repeat é true nas repetições automáticas. Aqui só o
              PRIMEIRO toque importa: ele desce uma linha na hora (resposta
              imediata) e zera o acumulador. Sem zerar, um acumulador que
              já tinha 0,9 s gastaria tudo de uma vez no intervalo rápido —
              22 linhas num único quadro, um teleporte.
            */
            if (!evento.repeat) {
                baixoPresa = true;
                acumuladorDeQueda = 0;
                moverPeca(0, 1);
            }
            break;

        case "arrowup":
        case "x":
            /*
              Dois case seguidos sem break entre eles caem no mesmo código:
              ↑ e X fazem a mesma coisa.

              Girar também ignora a repetição automática: segurar ↑ não
              deve deixar a peça rodando feito pião.
            */
            if (!evento.repeat) {
                girarPeca(1);
            }
            break;

        case "z":
            if (!evento.repeat) {
                girarPeca(-1);
            }
            break;

        case " ":
            if (!evento.repeat) {
                derrubarPeca();
            }
            break;

        default:
            return;   // tecla que não é do jogo: deixa o navegador agir
    }

    // As setas e o espaço rolariam a página: cancelamos só as do jogo.
    evento.preventDefault();
});

document.addEventListener("keyup", evento => {
    if (evento.key.toLowerCase() === "arrowdown") {
        baixoPresa = false;
    }
});


// ============================================================
// 8. O LOOP
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
  conta o tempo é você, e por isso o intervalo pode mudar no meio do
  caminho: é o que a ↓ faz neste passo.
*/
function atualizar(tempo) {
    /*
      O intervalo é decidido A CADA QUADRO. Segurar ↓ não move a peça:
      só encurta o intervalo, e o mesmo acumulador faz o resto.
    */
    const intervalo = baixoPresa ? INTERVALO_DA_QUEDA_RAPIDA : INTERVALO_DE_QUEDA;

    acumuladorDeQueda += tempo;

    while (acumuladorDeQueda >= intervalo) {
        acumuladorDeQueda -= intervalo;

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
// 9. DESENHAR
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
// 10. LIGAR
// ============================================================
aplicarExemplo();
nascerPeca();
requestAnimationFrame(quadroAQuadro);
