/*
  PONG — PASSO 8: O COMPUTADOR

  Um adversário que joga sozinho — e a lição mais importante sobre
  adversários controlados por código:

      NÃO EXISTE INTELIGÊNCIA AQUI. EXISTE UMA LIMITAÇÃO DELIBERADA.

  Um oponente que simplesmente copiasse a altura da bola seria
  imbatível — e chatíssimo. O que o torna um bom adversário são três
  restrições que escolhemos dar a ele.

  Dificuldade em jogos raramente é esperteza: é a margem de erro que
  você concede à máquina.
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
  NOVO — e este número é o botão de dificuldade do jogo inteiro.

  Menor que a do jogador humano, de propósito: em ângulos fechados o
  computador não chega a tempo. É exatamente isso que o torna vencível.
*/
const VELOCIDADE_DA_RAQUETE_DO_PC = 68;

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

const PONTOS_PARA_VENCER = 5;              // NOVO
const PAUSA_ANTES_DO_SAQUE = 1.0;          // NOVO — segundos com a bola parada

const COR_FUNDO = "#06070d";
const COR_ELEMENTOS = "#00f0ff";
const COR_LINHA_CENTRAL = "#123";


// ============================================================
// DOM E CANVAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

// NOVO: os elementos de texto da interface, buscados uma vez só.
const pontosEsquerda = document.getElementById("pontos-esquerda");
const pontosDireita = document.getElementById("pontos-direita");
const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");

// NOVO
const botaoIniciar = document.getElementById("botao-iniciar");
const botaoModo = document.getElementById("botao-modo");
const ajudaJogador2 = document.getElementById("ajuda-jogador2");


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
// ESTADO DA PARTIDA
// ============================================================
let placarEsquerda = 0;
let placarDireita = 0;
let tempoDePausaDoSaque = 0;   // segundos restantes com a bola parada

/*
  MÁQUINA DE ESTADOS.

  Uma variável de texto substitui vários booleanos soltos — `jogando`,
  `acabou`, `pausado`.

  Por que isso importa: com booleanos separados, é possível cair em
  combinações impossíveis, como "acabou = true E jogando = true". Ninguém
  sabe o que a tela deveria mostrar nessa situação, e o bug aparece uma
  vez a cada cem partidas.

  Com um estado só, isso simplesmente não existe: ele é sempre
  exatamente um valor.

  Todo jogo tem essa variável em algum lugar.
*/
let estado = "jogando";   // "jogando" | "fim"

let contraOComputador = true;   // NOVO


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

    tempoDePausaDoSaque = PAUSA_ANTES_DO_SAQUE;   // NOVO
}


// ============================================================
// O LOOP
// ============================================================
let instanteDoQuadroAnterior = 0;

function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    /*
      NOVO: o estado decide se o jogo anda.

      Quando a partida acaba, paramos de atualizar mas continuamos
      desenhando — assim a cena final permanece na tela, sob a mensagem.
    */
    if (estado === "jogando") {
        atualizar(tempo);
    }

    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    moverRaquetes(tempo);

    /*
      NOVO: durante a pausa do saque, as raquetes se movem mas a bola
      espera. Dá ao jogador um instante para se posicionar.

      O `return` é uma guard clause: trata o caso especial e sai, sem
      embrulhar todo o resto da função num if.
    */
    if (tempoDePausaDoSaque > 0) {
        tempoDePausaDoSaque -= tempo;
        return;
    }

    bola.x += bola.velocidadeX * tempo;
    bola.y += bola.velocidadeY * tempo;

    quicarNasParedes();
    verificarRaquetes();
    verificarPonto();
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

/*
  NOVO: escapar pela lateral agora vale ponto para o outro lado.
*/
function verificarPonto() {
    if (bola.x + bola.largura < 0) {
        marcarPonto("direita");
        return;
    }

    if (bola.x > tela.width) {
        marcarPonto("esquerda");
    }
}

function marcarPonto(lado) {
    if (lado === "esquerda") {
        placarEsquerda += 1;
    } else {
        placarDireita += 1;
    }

    atualizarPlacar();

    const alguemVenceu =
        placarEsquerda >= PONTOS_PARA_VENCER ||
        placarDireita >= PONTOS_PARA_VENCER;

    if (alguemVenceu) {
        terminarPartida();
        return;
    }

    // Quem levou o ponto saca: a bola vai na direção de quem perdeu.
    sacar(lado === "esquerda" ? -1 : 1);
}

function terminarPartida() {
    estado = "fim";

    const venceuEsquerda = placarEsquerda > placarDireita;
    const nomeDoVencedor = venceuEsquerda
        ? "Você"
        : (contraOComputador ? "O computador" : "Jogador da direita");

    mensagemTitulo.textContent = "Fim de jogo";
    mensagemTexto.textContent = `${nomeDoVencedor} venceu!`;
    camadaMensagem.hidden = false;
}

/*
  NOVO: reiniciar de verdade, sem recarregar a página.

  Toda a preparação de uma partida vive nesta função — e é isso que
  transforma "um jogo que roda" em "um jogo que se pode jogar de novo".
*/
function novaPartida() {
    placarEsquerda = 0;
    placarDireita = 0;
    estado = "jogando";

    raqueteEsquerda.y = (tela.height - raqueteEsquerda.altura) / 2;
    raqueteDireita.y = (tela.height - raqueteDireita.altura) / 2;

    camadaMensagem.hidden = true;

    atualizarPlacar();
    sacar(Math.random() < 0.5 ? -1 : 1);
}


// ============================================================
// BOTÕES
// ============================================================
botaoIniciar.addEventListener("click", novaPartida);

botaoModo.addEventListener("click", () => {
    contraOComputador = !contraOComputador;

    botaoModo.textContent = contraOComputador
        ? "Modo: 1 jogador"
        : "Modo: 2 jogadores";

    ajudaJogador2.textContent = contraOComputador
        ? "Direita: computador"
        : "Direita: ↑ / ↓";

    // Trocar o modo no meio da partida deixaria o placar sem sentido.
    novaPartida();
});


// ============================================================
// INTERFACE (texto, não desenho)
// ============================================================
/*
  textContent troca o texto de dentro do elemento.

  Repare no princípio: o placar REAL mora nas variáveis placarEsquerda e
  placarDireita. Os elementos da página são só o espelho delas.

  Nunca leia o número de volta da tela para fazer contas — no instante em
  que você trata o DOM como fonte de verdade, o programa passa a depender
  de como as coisas estão escritas.
*/
function atualizarPlacar() {
    pontosEsquerda.textContent = placarEsquerda;
    pontosDireita.textContent = placarDireita;
}


// ============================================================
// RAQUETES
// ============================================================
function moverRaquetes(tempo) {
    let direcaoEsquerda = 0;

    // No modo de um jogador, as setas também servem para a raquete da esquerda.
    if (estaPressionada("w") || (contraOComputador && estaPressionada("arrowup"))) {
        direcaoEsquerda = -1;
    }
    if (estaPressionada("s") || (contraOComputador && estaPressionada("arrowdown"))) {
        direcaoEsquerda = 1;
    }

    moverRaquete(raqueteEsquerda, direcaoEsquerda * VELOCIDADE_DA_RAQUETE, tempo);

    if (contraOComputador) {
        moverRaqueteDoComputador(tempo);
        return;
    }

    let direcaoDireita = 0;
    if (estaPressionada("arrowup")) direcaoDireita = -1;
    if (estaPressionada("arrowdown")) direcaoDireita = 1;

    moverRaquete(raqueteDireita, direcaoDireita * VELOCIDADE_DA_RAQUETE, tempo);
}

/*
  O OPONENTE AUTOMÁTICO — três decisões, e nenhuma delas é esperteza.

  Repare que ele chama a MESMA função moverRaquete que o teclado usa.
  Ela foi escrita no passo 4 sem saber que isso aconteceria, e não
  precisou de nenhuma alteração. É o retorno de uma função que não sabe
  quem a está chamando.
*/
function moverRaqueteDoComputador(tempo) {
    const centroDaRaquete = raqueteDireita.y + raqueteDireita.altura / 2;
    const centroDaBola = bola.y + bola.altura / 2;

    /*
      DECISÃO 1: quando a bola se afasta, ele volta para o meio em vez de
      continuar colado nela.

      Além de mais realista, isso dá ao jogador a chance de jogar num
      canto — o que cria jogadas. Um adversário que persegue sempre não
      deixa nada acontecer.
    */
    const bolaVemNaMinhaDirecao = bola.velocidadeX > 0;
    const alvo = bolaVemNaMinhaDirecao ? centroDaBola : tela.height / 2;

    const distancia = alvo - centroDaRaquete;

    /*
      DECISÃO 2: ZONA MORTA. Se já está quase alinhado, não mexe.

      Sem isso a raquete vibraria sem parar em volta do alvo, passando
      dele para um lado e para o outro a cada quadro. É o mesmo tipo de
      oscilação que faz um termostato barato ligar e desligar sem parar.
    */
    if (Math.abs(distancia) < 2) {
        return;
    }

    /*
      DECISÃO 3: a velocidade limitada, lá nas constantes.
      É a mais importante das três.
    */
    const direcao = distancia > 0 ? 1 : -1;
    moverRaquete(raqueteDireita, direcao * VELOCIDADE_DA_RAQUETE_DO_PC, tempo);
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

    /*
      NOVO: a bola pisca durante a pausa do saque.

      Math.floor(tempo * 8) % 2 alterna entre 0 e 1 oito vezes por
      segundo — um jeito curto de fazer algo piscar sem nenhum
      cronômetro extra. O mesmo truque serve para qualquer intermitência.
    */
    const deveEsconderBola = tempoDePausaDoSaque > 0
        && Math.floor(tempoDePausaDoSaque * 8) % 2 === 0;

    if (!deveEsconderBola) {
        desenharRetangulo(bola);
    }
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
atualizarPlacar();
sacar(Math.random() < 0.5 ? -1 : 1);
requestAnimationFrame(quadroAQuadro);
