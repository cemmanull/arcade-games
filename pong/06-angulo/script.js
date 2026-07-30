/*
  PONG — PASSO 6: O ÂNGULO

  Até aqui, rebater era inverter um sinal: a bola voltava sempre no mesmo
  ângulo em que chegou. Funciona — e é entediante. O jogador não tem
  controle nenhum sobre para onde a bola vai.

  Este passo muda uma coisa só:

      O PONTO DE IMPACTO NA RAQUETE DECIDE O ÂNGULO DE SAÍDA.

  Bater no centro devolve a bola quase reta; bater na ponta manda-a bem
  inclinada. De repente existe jogada, existe intenção, existe estratégia.

  É a diferença entre um jogo que funciona e um jogo que é divertido — e
  cabe em uma função de dez linhas.

  Junto vem a aceleração progressiva, e com ela um limite que precisa
  existir por um motivo bem concreto.
*/


// ============================================================
// CONSTANTES
// ============================================================
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;
const TAMANHO_DA_BOLA = 4;
const VELOCIDADE_DA_BOLA = 70;
const VELOCIDADE_DA_RAQUETE = 95;

/*
  NOVO.

  ANGULO_MAXIMO_DE_SAIDA é em radianos: Math.PI / 3 são 60 graus.
  É o ângulo de quem acerta bem na pontinha da raquete.

  VELOCIDADE_MAXIMA existe por um motivo concreto, explicado lá embaixo
  na função `rebater` — e é um dos limites mais importantes deste jogo.
*/
const ANGULO_MAXIMO_DE_SAIDA = Math.PI / 3;
const ACELERACAO_POR_REBATIDA = 1.05;      // 5% mais rápida a cada toque
const VELOCIDADE_MAXIMA_DA_BOLA = 165;

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
    x: 0,
    y: 0,
    largura: TAMANHO_DA_BOLA,
    altura: TAMANHO_DA_BOLA,
    velocidadeX: 0,
    velocidadeY: 0
};


// ============================================================
// ENTRADA DO TECLADO
// ============================================================
const teclasPressionadas = {};

document.addEventListener("keydown", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = true;

    if (["arrowup", "arrowdown"].includes(evento.key.toLowerCase())) {
        evento.preventDefault();
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

function estaPressionada(tecla) {
    return teclasPressionadas[tecla] === true;
}


// ============================================================
// SACAR
// ============================================================
function sacar(direcao) {
    bola.x = (tela.width - bola.largura) / 2;
    bola.y = (tela.height - bola.altura) / 2;

    const angulo = (Math.random() - 0.5) * (Math.PI / 3.6);

    bola.velocidadeX = Math.cos(angulo) * VELOCIDADE_DA_BOLA * direcao;
    bola.velocidadeY = Math.sin(angulo) * VELOCIDADE_DA_BOLA;
}


// ============================================================
// O LOOP
// ============================================================
let instanteDoQuadroAnterior = 0;

function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    moverRaquetes(tempo);

    bola.x += bola.velocidadeX * tempo;
    bola.y += bola.velocidadeY * tempo;

    quicarNasParedes();
    verificarRaquetes();   // NOVO
    verificarSaida();
}


// ============================================================
// COLISÃO
// ============================================================
/*
  A IDEIA INTEIRA EM UMA FRASE:

      dois retângulos se sobrepõem quando se sobrepõem
      NOS DOIS EIXOS ao mesmo tempo.

  As quatro comparações abaixo dizem exatamente isso. Leia cada uma como
  "a começa antes de b terminar" e "a termina depois de b começar", nos
  dois eixos.

  Desenhe dois retângulos no papel e teste as quatro linhas com números.
  Quando isso ficar óbvio, você tem no bolso a colisão mais usada em
  jogos 2D — e ela serve para tiro, plataforma, coleta de itens, tudo.

  Repare que a função não sabe que existe uma bola ou uma raquete: ela
  aceita qualquer par de objetos com x, y, largura e altura. Foi para
  isso que demos a mesma forma a todos, lá no passo 1.
*/
function seSobrepoe(a, b) {
    return a.x < b.x + b.largura &&
           a.x + a.largura > b.x &&
           a.y < b.y + b.altura &&
           a.y + a.altura > b.y;
}

function verificarRaquetes() {
    /*
      Só testamos a raquete PARA A QUAL a bola está indo.

      Isso evita trabalho — e, mais importante, previne um bug real: uma
      bola que acabou de sair da raquete ainda está sobreposta a ela por
      uma fração de pixel, e seria "rebatida" uma segunda vez, invertendo
      a velocidade de novo. Ela ficaria grudada, vibrando na frente da
      raquete.
    */
    const indoParaEsquerda = bola.velocidadeX < 0;
    const raquete = indoParaEsquerda ? raqueteEsquerda : raqueteDireita;

    if (!seSobrepoe(bola, raquete)) {
        return;
    }

    /*
      Mesma regra das paredes, no passo 3: conserte a POSIÇÃO e a
      VELOCIDADE, sempre juntas. A bola é empurrada para fora da raquete
      antes de mudar de direção.
    */
    bola.x = indoParaEsquerda
        ? raquete.x + raquete.largura   // encosta na face direita da raquete
        : raquete.x - bola.largura;     // encosta na face esquerda

    rebater(raquete, indoParaEsquerda ? 1 : -1);   // NOVO
}

/*
  O CORAÇÃO DESTE PASSO.

  Quatro etapas, e elas se repetem em qualquer física de rebatida:

    1. medir ONDE a bola bateu, em relação ao centro da raquete
    2. normalizar essa medida para o intervalo -1 .. +1
    3. transformar em um ângulo
    4. recompor a velocidade a partir do ângulo, com seno e cosseno

  NORMALIZAR é o passo que costuma faltar. Dividir a distância pela
  METADE da altura da raquete transforma "13 pixels acima do centro" em
  "0,65 do caminho até a ponta" — um número que não depende mais do
  tamanho da raquete. Se você mudar ALTURA_DA_RAQUETE, tudo continua
  funcionando na mesma proporção.
*/
function rebater(raquete, sentidoHorizontal) {
    const centroDaBola = bola.y + bola.altura / 2;
    const centroDaRaquete = raquete.y + raquete.altura / 2;

    // 1 e 2: onde bateu, de -1 (topo) a +1 (base)
    const deslocamento = (centroDaBola - centroDaRaquete) / (raquete.altura / 2);
    const deslocamentoLimitado = Math.max(-1, Math.min(deslocamento, 1));

    // 3: vira ângulo
    const angulo = deslocamentoLimitado * ANGULO_MAXIMO_DE_SAIDA;

    /*
      A rapidez atual é a hipotenusa do triângulo formado por velocidadeX
      e velocidadeY. Math.hypot faz esse Pitágoras e devolve o quão rápido
      a bola está indo, independentemente da direção.
    */
    const rapidezAtual = Math.hypot(bola.velocidadeX, bola.velocidadeY);

    /*
      ACELERAR, COM TETO.

      Sem o Math.min, em poucas jogadas a bola andaria MAIS QUE A PRÓPRIA
      LARGURA por quadro — e passaria de um lado da raquete para o outro
      sem nunca se sobrepor a ela. A colisão do passo 5 simplesmente não
      a veria.

      Colisão por sobreposição só funciona enquanto os objetos não pulam
      por cima uns dos outros. O teto é o que garante isso.
    */
    const novaRapidez = Math.min(
        rapidezAtual * ACELERACAO_POR_REBATIDA,
        VELOCIDADE_MAXIMA_DA_BOLA
    );

    // 4: de volta a um par de velocidades
    bola.velocidadeX = Math.cos(angulo) * novaRapidez * sentidoHorizontal;
    bola.velocidadeY = Math.sin(angulo) * novaRapidez;
}

function quicarNasParedes() {
    if (bola.y < 0) {
        bola.y = 0;
        bola.velocidadeY = -bola.velocidadeY;
    }

    const limiteInferior = tela.height - bola.altura;

    if (bola.y > limiteInferior) {
        bola.y = limiteInferior;
        bola.velocidadeY = -bola.velocidadeY;
    }
}

function verificarSaida() {
    if (bola.x + bola.largura < 0) {
        sacar(1);
    }

    if (bola.x > tela.width) {
        sacar(-1);
    }
}


// ============================================================
// RAQUETES
// ============================================================
function moverRaquetes(tempo) {
    let direcaoEsquerda = 0;
    if (estaPressionada("w")) direcaoEsquerda = -1;
    if (estaPressionada("s")) direcaoEsquerda = 1;

    let direcaoDireita = 0;
    if (estaPressionada("arrowup")) direcaoDireita = -1;
    if (estaPressionada("arrowdown")) direcaoDireita = 1;

    moverRaquete(raqueteEsquerda, direcaoEsquerda * VELOCIDADE_DA_RAQUETE, tempo);
    moverRaquete(raqueteDireita, direcaoDireita * VELOCIDADE_DA_RAQUETE, tempo);
}

function moverRaquete(raquete, velocidade, tempo) {
    raquete.y += velocidade * tempo;
    raquete.y = Math.max(0, Math.min(raquete.y, tela.height - raquete.altura));
}


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

function desenharRetangulo(objeto) {
    pincel.fillRect(
        Math.round(objeto.x),
        Math.round(objeto.y),
        objeto.largura,
        objeto.altura
    );
}

function desenharLinhaCentral() {
    pincel.fillStyle = COR_LINHA_CENTRAL;

    const meio = tela.width / 2 - 1;
    for (let y = 2; y < tela.height; y += 8) {
        pincel.fillRect(meio, y, 2, 4);
    }
}


// ============================================================
// LIGAR
// ============================================================
sacar(Math.random() < 0.5 ? -1 : 1);
requestAnimationFrame(quadroAQuadro);
