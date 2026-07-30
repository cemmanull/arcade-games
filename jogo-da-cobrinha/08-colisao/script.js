/*
  PASSO 8 — COLISÃO

  Finalmente dá para perder. Duas regras:
    - bater na parede
    - bater no próprio corpo

  E, junto com elas, três ideias que valem para qualquer programa:

    - GUARD CLAUSE: trate o caso ruim primeiro e saia
    - FUNÇÃO QUE RESPONDE SIM OU NÃO, sem fazer mais nada
    - DESLIGAR o que foi ligado (clearInterval)
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
const COR_MACA = "#ff2fd0";
const MILISSEGUNDOS_POR_PASSO = 150;
const PONTOS_POR_MACA = 10;


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
let maca;
let pontos = 0;

/*
  NOVO. setInterval devolve um número de identificação, e é só com ele que
  dá para desligar o cronômetro depois. Guarde sempre — ligar algo sem ter
  como desligar é uma armadilha silenciosa.
*/
let cronometroDoJogo;


// ============================================================
// O PASSO
// ============================================================
function darUmPasso() {
    const cabeca = calcularProximaCabeca();

    /*
      GUARD CLAUSE — "cláusula de guarda".
      Trate o caso ruim logo no começo e SAIA da função com `return`.

      A alternativa seria embrulhar todo o resto em um `if (!colidiu) { ... }`,
      empurrando trinta linhas para a direita. Com a guarda, o caminho normal
      fica reto e o excepcional fica visível, no alto.

      É um dos hábitos que mais melhoram a legibilidade de um código.
    */
    if (colidiu(cabeca)) {
        terminarJogo();
        return;
    }

    cobra.unshift(cabeca);

    const comeu = cabeca.coluna === maca.coluna && cabeca.linha === maca.linha;

    if (comeu) {
        pontos += PONTOS_POR_MACA;
        sortearMaca();
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
// AS REGRAS DE COLISÃO
// ============================================================
/*
  Uma função com nome de PERGUNTA deve responder sim ou não — e nada mais.

  Repare no que ela NÃO faz: não termina o jogo, não desenha, não zera nada.
  Ela só olha e responde. Quem decide o que fazer com a resposta é quem
  perguntou.

  Isso se chama separar a DECISÃO da AÇÃO, e é o que permite reusar a
  mesma pergunta em outro contexto sem arrastar efeitos colaterais junto.
*/
function colidiu(cabeca) {
    /*
      A PAREDE.
      Com 20 colunas, as válidas vão de 0 a 19. Por isso o teste é
      `>= COLUNAS`, e não `> COLUNAS`.

      Esse "um a mais" é o erro mais comum da programação, a ponto de ter
      nome próprio em inglês: off-by-one. Sempre que houver um limite,
      pergunte-se se o último valor válido entra ou não.
    */
    const bateuNaParede =
        cabeca.coluna < 0 ||
        cabeca.linha < 0 ||
        cabeca.coluna >= COLUNAS ||
        cabeca.linha >= LINHAS;

    if (bateuNaParede) {
        return true;
    }

    /*
      O PRÓPRIO CORPO.

      slice(0, -1) devolve uma cópia da lista SEM o último item.

      Por que ignorar a cauda? Porque ela vai sair do lugar NESTE MESMO
      passo — a cabeça entra na casa que a cauda acabou de desocupar.
      Sem esse detalhe, a cobra morreria ao andar em linha reta encostando
      na própria ponta, e ninguém entenderia o motivo.

      Detalhes assim são o que separa "o código roda" de "o jogo é justo".
    */
    return cobra.slice(0, -1).some(parte =>
        parte.coluna === cabeca.coluna && parte.linha === cabeca.linha
    );
}


// ============================================================
// FIM DE JOGO
// ============================================================
/*
  clearInterval desliga o cronômetro que setInterval ligou.

  Sem esta linha, `darUmPasso` continuaria rodando para sempre em segundo
  plano, mesmo com o jogo "acabado" — consumindo processador e produzindo
  bugs fantasmas. Todo recurso que se liga precisa de um lugar onde se
  desliga.
*/
function terminarJogo() {
    clearInterval(cronometroDoJogo);
    console.log("Fim de jogo! Pontos:", pontos);
}


// ============================================================
// A MAÇÃ
// ============================================================
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
// DESENHAR
// ============================================================
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
sortearMaca();
cronometroDoJogo = setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
desenhar();
