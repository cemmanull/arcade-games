/*
  ============================================================
  PONG
  ============================================================

  O ciclo é o mesmo de qualquer jogo:

      ler a entrada  ->  atualizar o estado  ->  desenhar

  Mas quase tudo dentro dele muda em relação a um jogo de grade:

  1. POSIÇÕES FRACIONÁRIAS
     A bola está em x = 73.42, não na "coluna 4". Nada se alinha a casas.

  2. VELOCIDADE COMO PAR DE NÚMEROS
     Em vez de uma direção ("cima", "baixo"), cada objeto tem
     velocidadeX e velocidadeY. Esse par carrega direção e rapidez ao mesmo
     tempo, e permite qualquer ângulo — inclusive as diagonais que um
     switch de quatro casos nunca conseguiria representar.

  3. TEMPO CONTÍNUO
     O loop não anda de 150 em 150 milissegundos: ele roda a cada quadro da
     tela (~60 vezes por segundo) e move cada objeto proporcionalmente ao
     tempo que passou de verdade.

  4. COLISÃO POR SOBREPOSIÇÃO
     Com decimais, dois objetos praticamente nunca ocupam o mesmo ponto
     exato. Colidir passa a ser "estas duas áreas se sobrepõem?".

  Toda a leitura abaixo segue a ordem em que as coisas acontecem.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
/*
  Todas as medidas estão em PIXELS DE DESENHO (a tela tem 160x96 deles).
  Todas as velocidades estão em PIXELS POR SEGUNDO — nunca "por quadro".
  A diferença é essencial e está explicada na seção do loop.
*/
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;      // distância da raquete até a borda
const TAMANHO_DA_BOLA = 4;

const VELOCIDADE_DA_RAQUETE = 95;      // pixels por segundo
const VELOCIDADE_DA_RAQUETE_DO_PC = 68; // menor de propósito: é o que a torna vencível
const VELOCIDADE_INICIAL_DA_BOLA = 70;
const VELOCIDADE_MAXIMA_DA_BOLA = 165;
const ACELERACAO_POR_REBATIDA = 1.05;   // 5% mais rápida a cada toque

/*
  Ângulo máximo de saída ao rebater, em radianos.
  Math.PI / 3 = 60 graus. Bater na pontinha da raquete manda a bola
  bem inclinada; bater no centro, quase reta.
*/
const ANGULO_MAXIMO_DE_SAIDA = Math.PI / 3;

const PONTOS_PARA_VENCER = 5;
const PAUSA_ANTES_DO_SAQUE = 1.0;   // segundos com a bola parada no centro

const COR_FUNDO = "#06070d";
const COR_ELEMENTOS = "#00f0ff";
const COR_LINHA_CENTRAL = "#123";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const pontosEsquerda = document.getElementById("pontos-esquerda");
const pontosDireita = document.getElementById("pontos-direita");
const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");

const botaoIniciar = document.getElementById("botao-iniciar");
const botaoModo = document.getElementById("botao-modo");
const botaoSom = document.getElementById("botao-som");
const ajudaJogador2 = document.getElementById("ajuda-jogador2");


// ============================================================
// 3. ESTADO
// ============================================================
/*
  Cada coisa que se move é um objeto com os MESMOS campos:

      x, y            -> canto superior esquerdo
      largura, altura -> tamanho
      velocidadeX/Y   -> pixels por segundo em cada eixo

  Usar a mesma forma para a bola e para as raquetes não é capricho: é o
  que permite escrever UMA função de colisão que serve para qualquer par
  de objetos, sem tradução no meio.
*/
const raqueteEsquerda = {
    x: MARGEM_DA_RAQUETE,
    y: 0,
    largura: LARGURA_DA_RAQUETE,
    altura: ALTURA_DA_RAQUETE
};

const raqueteDireita = {
    x: tela.width - MARGEM_DA_RAQUETE - LARGURA_DA_RAQUETE,
    y: 0,
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

let placarEsquerda = 0;
let placarDireita = 0;

/*
  MÁQUINA DE ESTADOS.

  Uma variável de texto substitui vários booleanos soltos (jogando?
  pausado? acabou?). Com booleanos separados é possível cair em combinações
  impossíveis — "pausado E acabado" — e ninguém sabe o que a tela deveria
  mostrar. Com um estado só, isso não existe: ele é sempre exatamente um.

  Todo jogo tem essa variável em algum lugar.
*/
let estado = "menu";   // "menu" | "jogando" | "pausado" | "fim"

let contraOComputador = true;
let somLigado = true;

let tempoDePausaDoSaque = 0;   // segundos restantes com a bola parada
let instanteDoQuadroAnterior = 0;


// ============================================================
// 4. ENTRADA DO TECLADO
// ============================================================
/*
  A DIFERENÇA CRUCIAL EM RELAÇÃO A UM JOGO DE TURNOS.

  Na cobrinha bastava saber qual foi a ÚLTIMA tecla apertada. Aqui é
  preciso saber quais teclas estão PRESAS NESTE INSTANTE — porque a raquete
  se move enquanto a tecla estiver segurada, e porque dois jogadores
  apertam teclas ao mesmo tempo.

  A solução é um objeto que funciona como um painel de interruptores:
  keydown liga, keyup desliga.
*/
const teclasPressionadas = {};

document.addEventListener("keydown", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = true;

    // As setas e o espaço rolam a página: cancelamos só para essas.
    if (["arrowup", "arrowdown", " "].includes(evento.key.toLowerCase())) {
        evento.preventDefault();
    }

    if (evento.key.toLowerCase() === "p") {
        alternarPausa();
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  toLowerCase() normaliza: com Shift, evento.key devolve "W" em vez de "w".
  Sem isso, segurar Shift faria a raquete parar — um bug irritante e
  difícil de adivinhar.
*/
function estaPressionada(tecla) {
    return teclasPressionadas[tecla] === true;
}


// ============================================================
// 5. INICIAR
// ============================================================
function iniciarPartida() {
    placarEsquerda = 0;
    placarDireita = 0;

    centralizarRaquete(raqueteEsquerda);
    centralizarRaquete(raqueteDireita);

    // Math.random() < 0.5 sorteia o lado do primeiro saque: nem sempre o mesmo.
    sacar(Math.random() < 0.5 ? -1 : 1);

    estado = "jogando";
    atualizarInterface();
}

function centralizarRaquete(raquete) {
    raquete.y = (tela.height - raquete.altura) / 2;
}

/*
  Recoloca a bola no centro e a lança para um lado.
  `direcao` é -1 (para a esquerda) ou 1 (para a direita).
*/
function sacar(direcao) {
    bola.x = (tela.width - bola.largura) / 2;
    bola.y = (tela.height - bola.altura) / 2;

    /*
      Um ângulo inicial pequeno e aleatório, entre -25 e +25 graus.
      Sem essa variação, todo saque sairia idêntico e o jogo viraria
      decoreba.
    */
    const angulo = (Math.random() - 0.5) * (Math.PI / 3.6);

    bola.velocidadeX = Math.cos(angulo) * VELOCIDADE_INICIAL_DA_BOLA * direcao;
    bola.velocidadeY = Math.sin(angulo) * VELOCIDADE_INICIAL_DA_BOLA;

    tempoDePausaDoSaque = PAUSA_ANTES_DO_SAQUE;
}


// ============================================================
// 6. O LOOP — requestAnimationFrame e delta time
// ============================================================
/*
  Uma função que se agenda de novo, para sempre.

  requestAnimationFrame pede ao navegador: "me chame antes de desenhar o
  próximo quadro". Vantagens sobre setInterval:

    - sincroniza com a taxa de atualização da tela (nada de rasgos);
    - pausa sozinho quando a aba sai de foco, poupando bateria;
    - entrega um carimbo de tempo preciso.

  O parâmetro `instanteAtual` é esse carimbo, em milissegundos.
*/
function quadroAQuadro(instanteAtual) {
    /*
      DELTA TIME — o intervalo real desde o quadro anterior, em SEGUNDOS.

      Por que isso importa: telas rodam a 60Hz, 120Hz, 144Hz. Se cada
      quadro movesse a bola uma quantidade fixa, o jogo ficaria mais rápido
      em máquinas melhores. Multiplicar pelo tempo decorrido faz a
      velocidade valer o mesmo em qualquer lugar.

      É por isso que as constantes lá em cima estão em pixels POR SEGUNDO.
    */
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    /*
      TETO NO DELTA.
      Se a aba ficar 10 segundos em segundo plano, o primeiro quadro de
      volta traria um delta gigante e a bola SALTARIA de um lado ao outro,
      atravessando raquetes e paredes sem nunca se sobrepor a elas.

      Limitar a 0,05s (o equivalente a 20 quadros por segundo) é a proteção
      padrão contra isso. Prefira o jogo engasgar a ele teleportar.
    */
    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    if (estado === "jogando") {
        atualizar(tempo);
    }

    desenhar();

    requestAnimationFrame(quadroAQuadro);   // agenda o próximo
}


// ============================================================
// 7. ATUALIZAR
// ============================================================
function atualizar(tempo) {
    moverRaqueteDaEsquerda(tempo);
    moverRaqueteDaDireita(tempo);

    /*
      Durante a pausa do saque, as raquetes se movem mas a bola espera.
      Dá ao jogador um instante para se posicionar — e o `return` aqui é
      uma guard clause: trata o caso especial e sai.
    */
    if (tempoDePausaDoSaque > 0) {
        tempoDePausaDoSaque -= tempo;
        return;
    }

    moverBola(tempo);
}

function moverRaqueteDaEsquerda(tempo) {
    let direcao = 0;

    // W/S sempre; as setas também, quando não há um segundo jogador usando-as.
    if (estaPressionada("w") || (contraOComputador && estaPressionada("arrowup"))) {
        direcao = -1;
    }
    if (estaPressionada("s") || (contraOComputador && estaPressionada("arrowdown"))) {
        direcao = 1;
    }

    moverRaquete(raqueteEsquerda, direcao * VELOCIDADE_DA_RAQUETE, tempo);
}

function moverRaqueteDaDireita(tempo) {
    if (contraOComputador) {
        moverRaqueteDoComputador(tempo);
        return;
    }

    let direcao = 0;
    if (estaPressionada("arrowup")) direcao = -1;
    if (estaPressionada("arrowdown")) direcao = 1;

    moverRaquete(raqueteDireita, direcao * VELOCIDADE_DA_RAQUETE, tempo);
}

/*
  Uma função que serve para QUALQUER raquete: ela não sabe de quem é, nem
  se o movimento veio do teclado ou do computador. Só recebe uma velocidade
  e um intervalo de tempo.

  Funções que não sabem quem estão movendo são as que você não reescreve
  nunca mais.
*/
function moverRaquete(raquete, velocidade, tempo) {
    raquete.y += velocidade * tempo;

    /*
      CLAMP — prender um valor entre um mínimo e um máximo.

          Math.max(0, Math.min(valor, limite))

      Leia até ficar óbvio: esta linha aparece em todo jogo que existe.
      Sem ela, a raquete sai pela borda da tela e nunca mais volta.
    */
    raquete.y = Math.max(0, Math.min(raquete.y, tela.height - raquete.altura));
}

/*
  O OPONENTE AUTOMÁTICO.

  Não há inteligência aqui — há uma LIMITAÇÃO deliberada. Ele persegue a
  bola, mas com velocidade menor que a do jogador humano. Esse teto é
  exatamente o que o torna vencível.

  Dificuldade em jogos raramente é esperteza: é a margem de erro que você
  concede à máquina. Um oponente que simplesmente copiasse a altura da bola
  seria imbatível — e chatíssimo.
*/
function moverRaqueteDoComputador(tempo) {
    const centroDaRaquete = raqueteDireita.y + raqueteDireita.altura / 2;
    const centroDaBola = bola.y + bola.altura / 2;

    /*
      Quando a bola se afasta, ele volta para o meio em vez de continuar
      colado nela. Além de ser mais realista, dá ao jogador a chance de
      jogar num canto — o que cria jogadas.
    */
    const bolaVemNaMinhaDirecao = bola.velocidadeX > 0;
    const alvo = bolaVemNaMinhaDirecao ? centroDaBola : tela.height / 2;

    const distancia = alvo - centroDaRaquete;

    /*
      ZONA MORTA: se já está quase alinhado, não mexe.
      Sem isso a raquete vibraria sem parar em volta do alvo, passando dele
      para um lado e para o outro a cada quadro.
    */
    if (Math.abs(distancia) < 2) {
        return;
    }

    const direcao = distancia > 0 ? 1 : -1;
    moverRaquete(raqueteDireita, direcao * VELOCIDADE_DA_RAQUETE_DO_PC, tempo);
}

function moverBola(tempo) {
    bola.x += bola.velocidadeX * tempo;
    bola.y += bola.velocidadeY * tempo;

    quicarNasParedes();
    verificarRaquetes();
    verificarPonto();
}

/*
  RICOCHETE — a física inteira cabe em um sinal trocado.

  Inverter velocidadeY reflete o movimento na horizontal. Mas repare que
  a POSIÇÃO também é corrigida: se a bola já entrou 2 pixels na parede,
  só inverter a velocidade a deixaria presa lá dentro, tremendo, porque no
  quadro seguinte ela ainda estaria sobreposta.

  Esse é o bug número um de quem começa com colisão. A regra:
  ao colidir, conserte a posição E a velocidade, sempre juntas.
*/
function quicarNasParedes() {
    if (bola.y < 0) {
        bola.y = 0;
        bola.velocidadeY = -bola.velocidadeY;
        tocarBipe(420);
    }

    const limiteInferior = tela.height - bola.altura;
    if (bola.y > limiteInferior) {
        bola.y = limiteInferior;
        bola.velocidadeY = -bola.velocidadeY;
        tocarBipe(420);
    }
}

/*
  COLISÃO AABB — Axis-Aligned Bounding Box.
  "Caixa alinhada aos eixos": dois retângulos que não giram.

  Dois retângulos se sobrepõem quando se sobrepõem NOS DOIS EIXOS ao mesmo
  tempo. As quatro comparações abaixo dizem exatamente isso.

  Desenhe dois retângulos no papel e teste cada linha — quando isto ficar
  óbvio, você tem a colisão mais usada em jogos 2D no bolso.
*/
function seSobrepoe(a, b) {
    return a.x < b.x + b.largura &&
           a.x + a.largura > b.x &&
           a.y < b.y + b.altura &&
           a.y + a.altura > b.y;
}

function verificarRaquetes() {
    /*
      Só testamos a raquete para a qual a bola está indo. Além de evitar
      trabalho, isso previne um bug real: uma bola que acabou de sair da
      raquete ainda está sobreposta a ela por uma fração de pixel e seria
      "rebatida" uma segunda vez, ficando grudada.
    */
    const indoParaEsquerda = bola.velocidadeX < 0;
    const raquete = indoParaEsquerda ? raqueteEsquerda : raqueteDireita;

    if (!seSobrepoe(bola, raquete)) {
        return;
    }

    // Empurra a bola para fora da raquete antes de mudar a direção.
    bola.x = indoParaEsquerda
        ? raquete.x + raquete.largura
        : raquete.x - bola.largura;

    rebater(raquete, indoParaEsquerda ? 1 : -1);
}

/*
  O PONTO DE IMPACTO DECIDE O ÂNGULO.

  Esta é a única regra que separa um Pong monótono de um Pong com intenção.
  Bater no centro da raquete devolve a bola quase reta; bater na ponta
  manda-a bem inclinada. De repente o jogador tem controle, e existe
  jogada.

    1. mede onde a bola bateu em relação ao centro da raquete
    2. normaliza esse valor para o intervalo -1 .. 1
    3. transforma em um ângulo
    4. recompõe a velocidade a partir do ângulo, com seno e cosseno
*/
function rebater(raquete, sentidoHorizontal) {
    const centroDaBola = bola.y + bola.altura / 2;
    const centroDaRaquete = raquete.y + raquete.altura / 2;

    const deslocamento = (centroDaBola - centroDaRaquete) / (raquete.altura / 2);
    const deslocamentoLimitado = Math.max(-1, Math.min(deslocamento, 1));

    const angulo = deslocamentoLimitado * ANGULO_MAXIMO_DE_SAIDA;

    /*
      A velocidade atual é a hipotenusa do triângulo formado por
      velocidadeX e velocidadeY. Math.hypot calcula isso (Pitágoras) e nos
      dá a rapidez independente da direção.
    */
    const rapidezAtual = Math.hypot(bola.velocidadeX, bola.velocidadeY);

    /*
      Acelera a cada rebatida, COM TETO.

      Sem o teto, em poucas jogadas a bola andaria mais que a própria
      largura por quadro — e atravessaria a raquete sem nunca se sobrepor
      a ela. Colisão por sobreposição só funciona enquanto os objetos não
      pulam por cima uns dos outros.
    */
    const novaRapidez = Math.min(
        rapidezAtual * ACELERACAO_POR_REBATIDA,
        VELOCIDADE_MAXIMA_DA_BOLA
    );

    bola.velocidadeX = Math.cos(angulo) * novaRapidez * sentidoHorizontal;
    bola.velocidadeY = Math.sin(angulo) * novaRapidez;

    tocarBipe(680);
}

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

    tocarBipe(200);
    atualizarInterface();

    const alguemVenceu =
        placarEsquerda >= PONTOS_PARA_VENCER ||
        placarDireita >= PONTOS_PARA_VENCER;

    if (alguemVenceu) {
        terminarPartida();
        return;
    }

    // Quem levou o ponto saca — a bola vai na direção de quem perdeu.
    sacar(lado === "esquerda" ? -1 : 1);
}

function terminarPartida() {
    estado = "fim";

    const venceuEsquerda = placarEsquerda > placarDireita;
    const nomeDoVencedor = venceuEsquerda
        ? "Jogador da esquerda"
        : (contraOComputador ? "Computador" : "Jogador da direita");

    mostrarMensagem("Fim de jogo", `${nomeDoVencedor} venceu!`);
    botaoIniciar.textContent = "Jogar de novo";
}


// ============================================================
// 8. DESENHAR
// ============================================================
/*
  Apagar tudo e repintar a cena inteira, a cada quadro.
  No canvas não existem objetos que se movem — existe tinta.
*/
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharLinhaCentral();

    pincel.fillStyle = COR_ELEMENTOS;
    desenharRetangulo(raqueteEsquerda);
    desenharRetangulo(raqueteDireita);

    // A bola pisca durante a pausa do saque, sinalizando "já vai começar".
    const deveEsconderBola = tempoDePausaDoSaque > 0
        && Math.floor(tempoDePausaDoSaque * 8) % 2 === 0;

    if (!deveEsconderBola) {
        desenharRetangulo(bola);
    }
}

/*
  Uma função de desenho que serve para qualquer objeto com x, y, largura e
  altura. Foi por isso que demos a mesma forma à bola e às raquetes.

  Math.round evita que uma posição como 42.7 seja desenhada entre dois
  pixels: o canvas tentaria suavizar a borda e o quadrado sairia
  borrado, arruinando o visual pixelado.
*/
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
// 9. INTERFACE
// ============================================================
function atualizarInterface() {
    pontosEsquerda.textContent = placarEsquerda;
    pontosDireita.textContent = placarDireita;

    if (estado === "jogando") {
        camadaMensagem.hidden = true;
    }
}

function mostrarMensagem(titulo, texto) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    camadaMensagem.hidden = false;
}

function alternarPausa() {
    if (estado === "jogando") {
        estado = "pausado";
        mostrarMensagem("Pausado", "Aperte P para continuar.");
        return;
    }

    if (estado === "pausado") {
        estado = "jogando";
        camadaMensagem.hidden = true;
    }
}


// ============================================================
// 10. SOM
// ============================================================
/*
  A API de áudio do navegador gera som por síntese: nenhum arquivo,
  nenhuma dependência. Um oscilador é literalmente um gerador de onda.

  A política dos navegadores proíbe tocar som antes de o usuário
  interagir com a página — é por isso que o contexto só é criado no
  primeiro clique. Se o seu som "não funciona" e não há erro nenhum no
  console, quase sempre é isto.
*/
let contextoDeAudio = null;

function prepararAudio() {
    if (contextoDeAudio === null) {
        contextoDeAudio = new AudioContext();
    }
}

function tocarBipe(frequencia) {
    if (!somLigado || contextoDeAudio === null) {
        return;
    }

    const oscilador = contextoDeAudio.createOscillator();
    const volume = contextoDeAudio.createGain();

    oscilador.type = "square";        // onda quadrada: o timbre dos videogames antigos
    oscilador.frequency.value = frequencia;
    volume.gain.value = 0.04;         // baixo: ninguém gosta de susto

    oscilador.connect(volume);
    volume.connect(contextoDeAudio.destination);

    oscilador.start();
    oscilador.stop(contextoDeAudio.currentTime + 0.05);
}


// ============================================================
// 11. EVENTOS DOS BOTÕES
// ============================================================
botaoIniciar.addEventListener("click", () => {
    prepararAudio();
    iniciarPartida();
});

botaoModo.addEventListener("click", () => {
    contraOComputador = !contraOComputador;

    botaoModo.textContent = contraOComputador
        ? "Modo: 1 jogador"
        : "Modo: 2 jogadores";

    ajudaJogador2.textContent = contraOComputador
        ? "Direita: computador"
        : "Direita: ↑ / ↓";

    // Trocar o modo no meio da partida deixaria o placar sem sentido.
    if (estado === "jogando" || estado === "pausado") {
        estado = "menu";
        mostrarMensagem("Modo alterado", "Aperte Iniciar para jogar.");
        botaoIniciar.textContent = "Iniciar";
    }
});

botaoSom.addEventListener("click", () => {
    somLigado = !somLigado;
    botaoSom.textContent = somLigado ? "Som: ligado" : "Som: desligado";
});


// ============================================================
// 12. LIGAR
// ============================================================
/*
  Uma única chamada põe o loop para girar. Ele roda desde já, mesmo no
  menu: assim o desenho aparece na tela antes de a partida começar, e
  não existe um "primeiro quadro" tratado de forma diferente.
*/
centralizarRaquete(raqueteEsquerda);
centralizarRaquete(raqueteDireita);
bola.x = (tela.width - bola.largura) / 2;
bola.y = (tela.height - bola.altura) / 2;

requestAnimationFrame(quadroAQuadro);
