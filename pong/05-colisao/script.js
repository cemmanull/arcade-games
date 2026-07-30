/*
  PONG — PASSO 5: A COLISÃO

  A bola descobre as raquetes. E, com isso, chega a técnica mais usada
  em jogos 2D:

      AABB — Axis-Aligned Bounding Box
      "caixa alinhada aos eixos": dois retângulos que não giram.

  Na cobrinha, colidir era `a.coluna === b.coluna`: comparar dois números
  inteiros. Isso funcionava porque tudo estava alinhado numa grade.

  Aqui as posições são decimais. Dois objetos praticamente NUNCA ocupam
  o mesmo ponto exato — a bola pula de 73.4 para 74.6 e passa por cima de
  74 sem nunca estar lá. Colidir passa a ser outra pergunta:

      "estas duas áreas se sobrepõem?"
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

    bola.velocidadeX = -bola.velocidadeX;
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
