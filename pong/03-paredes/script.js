/*
  PONG — PASSO 3: AS PAREDES

  A bola passa a quicar no topo e no fundo, e volta ao centro quando
  escapa pelas laterais.

  A ideia nova é pequena de escrever e grande de entender:

      RICOCHETE É UM SINAL TROCADO.

  E, junto com ela, o erro número um de quem começa com colisão — que
  vamos cometer de propósito e consertar.
*/


// ============================================================
// CONSTANTES
// ============================================================
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;
const TAMANHO_DA_BOLA = 4;
const VELOCIDADE_DA_BOLA = 70;   // pixels por segundo

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
// SACAR
// ============================================================
/*
  Recoloca a bola no centro e a lança para um lado.
  `direcao` é -1 (para a esquerda) ou 1 (para a direita).

  Note o uso de seno e cosseno para transformar um ÂNGULO em um par de
  velocidades. É a mesma conta que vai decidir o ricochete na raquete,
  no passo 6 — vale se acostumar com ela agora, num caso simples:

      velocidadeX = cos(ângulo) × rapidez
      velocidadeY = sen(ângulo) × rapidez

  O ângulo sorteado fica entre -25 e +25 graus, para nem todo saque sair
  igual. Math.PI / 3.6 radianos é 50 graus; metade para cada lado.
*/
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
    bola.x += bola.velocidadeX * tempo;
    bola.y += bola.velocidadeY * tempo;

    quicarNasParedes();
    verificarSaida();
}

/*
  RICOCHETE.

  Inverter o sinal da velocidade vertical reflete o movimento: quem
  descia passa a subir, com a mesma rapidez. A física inteira do
  ricochete cabe em `velocidadeY = -velocidadeY`.

  MAS REPARE NA LINHA DE CIMA, a que corrige a posição. Ela é o assunto
  deste passo.

  Quando percebemos a colisão, a bola JÁ ENTROU um pouco na parede — ela
  andou 1,2 pixel de uma vez, não parou exatamente na borda. Se apenas
  invertermos a velocidade, no quadro seguinte ela ainda estará dentro da
  parede, a condição será verdadeira de novo, e ela inverterá outra vez.
  E outra. O resultado é uma bola tremendo, presa na parede, mudando de
  direção a cada quadro.

  É o bug número um de quem começa com colisão. A regra:

      AO COLIDIR, CONSERTE A POSIÇÃO E A VELOCIDADE, SEMPRE JUNTAS.
*/
function quicarNasParedes() {
    if (bola.y < 0) {
        bola.y = 0;                              // 1. tira de dentro da parede
        bola.velocidadeY = -bola.velocidadeY;    // 2. inverte o movimento
    }

    /*
      O limite de baixo desconta a altura da bola, porque `y` é o canto
      SUPERIOR dela. Sem esse desconto, metade da bola sairia da tela
      antes de quicar — um "off-by-tamanho" tão comum quanto o off-by-one.
    */
    const limiteInferior = tela.height - bola.altura;

    if (bola.y > limiteInferior) {
        bola.y = limiteInferior;
        bola.velocidadeY = -bola.velocidadeY;
    }
}

/*
  Por enquanto, escapar pela lateral só devolve a bola ao centro.
  No passo 7 isso vira ponto.

  A bola volta na direção de quem deixou passar — que é a regra do
  Pong de verdade, e já deixa o jogo com ritmo.
*/
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
