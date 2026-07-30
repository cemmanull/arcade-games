/*
  PASSO 7 — A MAÇÃ

  O jogo ganha um objetivo. Três coisas novas:

    - SORTEIO: onde colocar a maçã (e como não colocá-la dentro da cobra)
    - COLISÃO POR IGUALDADE: comer é "estar na mesma célula"
    - PONTOS: um número que cresce

  O andaime da barra de espaço some: agora quem manda crescer é a maçã.
*/


// ============================================================
// FERRAMENTAS E MEDIDAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const PIXELS_POR_CELULA = 20;
const COLUNAS = tela.width / PIXELS_POR_CELULA;
const LINHAS = tela.height / PIXELS_POR_CELULA;

const COR_FUNDO = "#06070d";
const COR_COBRA = "#00f0ff";
const COR_MACA = "#ff2fd0";          // NOVO
const MILISSEGUNDOS_POR_PASSO = 150;
const PONTOS_POR_MACA = 10;          // NOVO


// ============================================================
// ESTADO
// ============================================================
let cobra = [
    { coluna: 5, linha: 5 },
    { coluna: 4, linha: 5 },
    { coluna: 3, linha: 5 },
    { coluna: 2, linha: 5 },
    { coluna: 1, linha: 5 }
];

let direcao = "direita";

/*
  NOVO. A maçã é uma célula só — a mesma forma de dado das peças da cobra.
  Usar a mesma forma para coisas parecidas não é preguiça: é o que permite
  compará-las com o mesmo código, sem tradução no meio.
*/
let maca;
let pontos = 0;


// ============================================================
// O SORTEIO
// ============================================================
/*
  Math.random() devolve um decimal entre 0 (inclusive) e 1 (exclusive):
  0.0374..., 0.8121...

  Multiplicando por COLUNAS (20), vira um decimal entre 0 e 19,999...
  Math.floor() arredonda para BAIXO e o transforma em um inteiro de 0 a 19 —
  exatamente uma coluna válida.

  Note por que é `floor` e não `round`: com arredondamento normal, o 0 e o
  19 sairiam com metade da chance dos outros números. Um sorteio torto que
  quase ninguém percebe.

  ---

  E a maçã não pode nascer em cima da cobra. A solução:

      do { sorteia } while (caiu em cima da cobra);

  `do/while` executa PRIMEIRO e testa DEPOIS — que é o que queremos:
  sorteie ao menos uma vez e, se deu ruim, sorteie de novo.

  `some()` percorre a lista e devolve verdadeiro no primeiro item que
  satisfaz a condição. É a versão legível de um `for` com `if` e `break`
  dentro. Leia como uma pergunta: "existe alguma parte na mesma célula?"
*/
function sortearMaca() {
    do {
        maca = {
            coluna: Math.floor(Math.random() * COLUNAS),
            linha: Math.floor(Math.random() * LINHAS)
        };
    } while (cobra.some(parte =>
        parte.coluna === maca.coluna && parte.linha === maca.linha
    ));
}


// ============================================================
// O PASSO
// ============================================================
function darUmPasso() {
    const cabeca = calcularProximaCabeca();

    cobra.unshift(cabeca);

    /*
      COMER = estar na mesma célula.

      Compare dois números inteiros e pronto. Isso só é tão simples porque
      tudo está alinhado numa grade — quando as posições viram decimais,
      colidir passa a ser "duas áreas se sobrepõem", que é bem mais trabalho.

      Aqui está o crescimento de novo: comeu, não removemos a cauda.
    */
    const comeu = cabeca.coluna === maca.coluna && cabeca.linha === maca.linha;

    if (comeu) {
        pontos += PONTOS_POR_MACA;
        sortearMaca();
        console.log("Pontos:", pontos);
        /*
          console.log escreve no Console do navegador (F12).
          É a ferramenta de depuração mais usada do mundo, e por enquanto é
          o nosso placar. No passo 9 ele vira texto de verdade na página.
        */
    } else {
        cobra.pop();
    }

    desenhar();
}

function calcularProximaCabeca() {
    const cabeca = { ...cobra[0] };

    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    return cabeca;
}


// ============================================================
// DESENHAR
// ============================================================
/*
  A função cresceu e ganhou duas partes bem distintas. Note a ORDEM:
  fundo, cobra, maçã. Quem pinta depois fica por cima.
*/
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = COR_COBRA;
    cobra.forEach(parte => {
        pincel.fillRect(
            parte.coluna * PIXELS_POR_CELULA,
            parte.linha * PIXELS_POR_CELULA,
            PIXELS_POR_CELULA,
            PIXELS_POR_CELULA
        );
    });

    pincel.fillStyle = COR_MACA;
    pincel.fillRect(
        maca.coluna * PIXELS_POR_CELULA,
        maca.linha * PIXELS_POR_CELULA,
        PIXELS_POR_CELULA,
        PIXELS_POR_CELULA
    );
}


// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("keydown", responderAoTeclado);

function responderAoTeclado(evento) {
    switch (evento.key) {
        case "ArrowUp":
            if (direcao !== "baixo") direcao = "cima";
            break;
        case "ArrowDown":
            if (direcao !== "cima") direcao = "baixo";
            break;
        case "ArrowLeft":
            if (direcao !== "direita") direcao = "esquerda";
            break;
        case "ArrowRight":
            if (direcao !== "esquerda") direcao = "direita";
            break;
        default:
            return;
    }

    evento.preventDefault();
}


// ============================================================
// LIGAR O MOTOR
// ============================================================
/*
  A ordem importa: a maçã precisa EXISTIR antes do primeiro desenho,
  senão `desenhar` tentaria ler `maca.coluna` de algo que ainda é undefined.
*/
sortearMaca();
setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
desenhar();
