/*
  PONG — PASSO 4: AS RAQUETES

  Você entra no jogo. E aqui está a diferença mais importante entre a
  entrada de um jogo de grade e a de um jogo contínuo:

      A COBRINHA PRECISAVA SABER QUAL FOI A ÚLTIMA TECLA APERTADA.
      O PONG PRECISA SABER QUAIS TECLAS ESTÃO PRESAS AGORA.

  A raquete se move ENQUANTO a tecla está segurada. E dois jogadores
  apertam teclas ao mesmo tempo. O modelo antigo — um `keydown` que muda
  uma variável — não dá conta de nenhuma das duas coisas.

  A bola ainda atravessa as raquetes. Isso é o passo 5.
*/


// ============================================================
// CONSTANTES
// ============================================================
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;
const TAMANHO_DA_BOLA = 4;
const VELOCIDADE_DA_BOLA = 70;
const VELOCIDADE_DA_RAQUETE = 95;   // NOVO — também em pixels por segundo

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
/*
  Um objeto que funciona como um PAINEL DE INTERRUPTORES:
  keydown liga, keyup desliga. A qualquer instante ele responde
  "esta tecla está pressionada agora?".

  Compare com a cobrinha, onde o evento de teclado JÁ decidia a jogada.
  Aqui ele só registra o estado do teclado; quem decide o movimento é o
  loop, no ritmo dele.
*/
const teclasPressionadas = {};

document.addEventListener("keydown", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = true;

    // As setas rolam a página por padrão; cancelamos só para elas.
    if (["arrowup", "arrowdown"].includes(evento.key.toLowerCase())) {
        evento.preventDefault();
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  toLowerCase() normaliza a tecla.

  Com Shift pressionado, evento.key devolve "W" em vez de "w" — e a
  raquete pararia de responder sem nenhum motivo aparente. É o tipo de
  bug que custa uma hora e some com uma chamada de função.
*/
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
    verificarSaida();
}

/*
  As duas raquetes são lidas no MESMO quadro, cada uma consultando as
  suas teclas. É isso que permite dois jogadores simultâneos: nenhum
  deles "rouba" o evento do outro, porque não há evento nenhum aqui —
  só uma consulta ao painel de interruptores.
*/
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

/*
  Uma função que serve para QUALQUER raquete: ela não sabe de quem é, nem
  se o comando veio do teclado. Só recebe uma velocidade e um tempo.

  No passo 8, o computador vai usar exatamente esta mesma função — e
  nenhuma linha aqui precisará mudar.
*/
function moverRaquete(raquete, velocidade, tempo) {
    raquete.y += velocidade * tempo;

    /*
      CLAMP — prender um valor entre um mínimo e um máximo.

          Math.max(0, Math.min(valor, limite))

      Leia até ficar óbvio; esta linha aparece em todo jogo que existe.
      Sem ela, a raquete sai pela borda da tela e nunca mais volta.

      Note de novo o desconto da altura: `y` é o canto de cima.
    */
    raquete.y = Math.max(0, Math.min(raquete.y, tela.height - raquete.altura));
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
