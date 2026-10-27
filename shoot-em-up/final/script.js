/*
  ============================================================
  SHOOT 'EM UP
  ============================================================

  O ciclo de sempre:

      ler a entrada  ->  atualizar o estado  ->  desenhar

  O que este jogo acrescenta ao curso:

  - O CENTRO, NÃO O CANTO. Tudo aqui mira, espalha e explode a partir do
    centro; por isso x e y são o centro, e a colisão é por círculos.

  - DOIS JEITOS DE MOVER. O que reage (tiros, balas, partículas) soma
    velocidade * tempo. O que segue uma coreografia (inimigos, chefe) tem
    a posição calculada como função do tempo de vida.

  - MUITOS CONTRA MUITOS. Cada tiro contra cada inimigo, cada bala contra
    a nave — marcando quem morre e varrendo tudo depois.

  - GEOMETRIA DE MIRA. atan2 para achar o ângulo, cos e sin para voltar à
    velocidade; leques e anéis são o mesmo tiro com o ângulo girado.

  - A FASE É UM ROTEIRO. Uma lista de eventos no tempo, expandida e
    ordenada uma vez, percorrida por um cursor.

  - ESTADOS EM DOIS NÍVEIS. O jogo tem os seus (menu, jogando, pausado,
    fim); o chefe tem os dele (entrando, lutando, explodindo).

  A leitura abaixo segue a ordem em que as coisas acontecem.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================

// ---------- A nave ----------
const SPRITE_DA_NAVE = [
    "....#....",
    "...#c#...",
    "...#c#...",
    "..##c##..",
    ".#######.",
    "##.###.##",
    "#..###..#",
    "...f.f..."
];
const CORES_DA_NAVE = { "#": "#e8ecff", c: "#00f0ff", f: "#ff9f1c" };

const VELOCIDADE_DA_NAVE = 70;    // pixels por segundo, em qualquer direção
const FATOR_DO_FOCO = 0.45;       // segurando Shift: 45% da velocidade
const RAIO_DA_NAVE = 2;           // só o miolo pode ser atingido
const SENSIBILIDADE_DO_TOQUE = 1.2;

// ---------- A arma ----------
const VELOCIDADE_DO_TIRO = 180;
const INTERVALO_ENTRE_TIROS = 0.125;
const RAIO_DO_TIRO = 2;
const DURACAO_DO_CLARAO = 0.04;

/*
  AS ARMAS, por nível: cada tiro é um deslocamento lateral (dx) e um
  ângulo de desvio em relação à vertical. Subir de nível é trocar de
  linha nesta tabela — o código que atira não muda.
*/
const ARMAS = [
    [{ dx: 0, angulo: 0 }],
    [{ dx: -3, angulo: 0 }, { dx: 3, angulo: 0 }],
    [{ dx: 0, angulo: 0 }, { dx: -3, angulo: -0.18 }, { dx: 3, angulo: 0.18 }],
    [{ dx: -2, angulo: 0 }, { dx: 2, angulo: 0 }, { dx: -4, angulo: -0.25 }, { dx: 4, angulo: 0.25 }]
];

// ---------- Vidas, bombas, justiça ----------
const VIDAS_INICIAIS = 3;
const BOMBAS_INICIAIS = 3;
const DURACAO_DA_INVENCIBILIDADE = 2;
const DISTANCIA_MINIMA_PARA_ATIRAR = 30;   // ninguém atira à queima-roupa
const DANO_DA_BOMBA = 6;
const PONTOS_POR_BALA_APAGADA = 10;
const PONTOS_POR_ARMA_EXTRA = 1000;        // cápsula com a arma já no máximo
const DIFICULDADE_POR_VOLTA = 0.25;        // cada volta: balas 25% mais rápidas e frequentes

// ---------- O céu ----------
const CAMADAS_DO_CEU = [
    { quantidade: 40, velocidade: 6, cor: "#1d2840" },
    { quantidade: 22, velocidade: 16, cor: "#45587a" },
    { quantidade: 10, velocidade: 40, cor: "#a8c4e0" }
];

// ---------- Inimigos ----------
/*
  O CATÁLOGO. Cada tipo: desenho, raio de colisão, vida, pontos, chance
  de soltar uma cápsula de arma, TRAJETO (posição em função do tempo) e
  ATAQUE (qual padrão, com que números).
*/
const INIMIGOS = {
    drone: {
        sprite: [
            ".#....#.",
            "########",
            "#.#..#.#",
            "########",
            ".##oo##.",
            "..#..#.."
        ],
        cores: { "#": "#ff3b6b", o: "#ffe14d" },
        raio: 4,
        vida: 1,
        pontos: 100,
        chanceDeArma: 0,
        trajeto: (inimigo, t) => ({ x: inimigo.origemX, y: inimigo.origemY + 35 * t }),
        ataque: { padrao: "mirado", primeiro: 0.8, intervalo: 1.8, velocidade: 55 }
    },

    onda: {
        sprite: [
            "..####..",
            ".#gggg#.",
            "##g##g##",
            "########",
            "#.#..#.#",
            "#......#"
        ],
        cores: { "#": "#4dff7a", g: "#e8ecff" },
        raio: 4,
        vida: 2,
        pontos: 150,
        chanceDeArma: 0,
        trajeto: (inimigo, t) => ({
            x: inimigo.origemX + Math.sin(t * 2.5) * 22,
            y: inimigo.origemY + 28 * t
        }),
        ataque: { padrao: "leque", primeiro: 1.2, intervalo: 2.4, velocidade: 45, quantidade: 3, abertura: 0.35 }
    },

    mergulhador: {
        sprite: [
            "#......#",
            "##....##",
            "#v####v#",
            ".######.",
            "..#vv#..",
            "...##..."
        ],
        cores: { "#": "#c46bff", v: "#ffffff" },
        raio: 4,
        vida: 2,
        pontos: 200,
        chanceDeArma: 0.12,
        trajeto: (inimigo, t) => {
            if (t < 1) {
                return { x: inimigo.origemX, y: inimigo.origemY + 50 * (1 - (1 - t) ** 2) };
            }
            if (t < 1.8) {
                return { x: inimigo.origemX, y: inimigo.origemY + 50 };
            }
            const mergulho = t - 1.8;
            return { x: inimigo.origemX, y: inimigo.origemY + 50 + 160 * mergulho * mergulho };
        },
        ataque: { padrao: "leque", primeiro: 1.3, intervalo: 99, velocidade: 60, quantidade: 5, abertura: 0.3 }
    },

    blindado: {
        sprite: [
            "..######..",
            ".#oooooo#.",
            "##o####o##",
            "##########",
            "#.##..##.#",
            "#..#..#..#",
            ".##....##."
        ],
        cores: { "#": "#ff9f1c", o: "#ffe14d" },
        raio: 5,
        vida: 6,
        pontos: 500,
        chanceDeArma: 1,   // sempre solta: é o prêmio por derrubá-lo
        trajeto: (inimigo, t) => ({ x: inimigo.origemX, y: inimigo.origemY + 16 * t }),
        ataque: { padrao: "anel", primeiro: 1.5, intervalo: 2.2, velocidade: 35, quantidade: 10 }
    }
};

// ---------- Balas e cápsulas ----------
const SPRITE_DA_BALA = [".#.", "#o#", ".#."];
const CORES_DA_BALA = { "#": "#ff3b6b", o: "#ffffff" };
const RAIO_DA_BALA = 1.5;

const SPRITE_DA_CAPSULA = [
    ".###.",
    "#PP.#",
    "#P.P#",
    "#PP.#",
    "#P..#",
    ".###."
];
const CORES_DA_CAPSULA = { "#": "#4dff7a", P: "#ffffff" };
const RAIO_DA_CAPSULA = 5;   // generoso: pegar um prêmio não deveria exigir precisão

// ---------- O chefe ----------
const SPRITE_DO_CHEFE = [
    "..........####..........",
    "......############......",
    "...####oooooooooo####...",
    ".###oo############oo###.",
    "##o####cc######cc####o##",
    "########################",
    "#.##.###.##rr##.###.##.#",
    "#.##..##.######.##..##.#",
    "..##...###.##.###...##..",
    "..#......#.##.#......#..",
    "...........##..........."
];
const CORES_DO_CHEFE = { "#": "#8a93b8", o: "#ff3b6b", c: "#00f0ff", r: "#ffcc33" };

const VIDA_DO_CHEFE = 120;
const RAIO_DO_CHEFE = 10;
const PONTOS_DO_CHEFE = 5000;
const ALTURA_DE_COMBATE = 30;
const DURACAO_DA_ENTRADA = 2.5;
const DURACAO_DA_EXPLOSAO = 2;
const TEMPO_DE_AVISO = 0.4;

const FASES_DO_CHEFE = [
    {
        ateVida: 0.6,
        ataques: [
            { padrao: "leque", quantidade: 5, abertura: 0.25, velocidade: 50, espera: 1.0 },
            { padrao: "mirado", velocidade: 75, espera: 0.35 },
            { padrao: "mirado", velocidade: 75, espera: 0.35 },
            { padrao: "mirado", velocidade: 75, espera: 1.2 }
        ]
    },
    {
        ateVida: 0.25,
        ataques: [
            { padrao: "anel", quantidade: 14, velocidade: 40, espera: 0.9 },
            { padrao: "leque", quantidade: 7, abertura: 0.2, velocidade: 55, espera: 1.3 }
        ]
    },
    {
        ateVida: 0,
        ataques: [
            { padrao: "anel", quantidade: 9, velocidade: 45, espera: 0.3 },
            { padrao: "anel", quantidade: 9, velocidade: 45, espera: 0.3 },
            { padrao: "anel", quantidade: 9, velocidade: 45, espera: 0.3 },
            { padrao: "leque", quantidade: 3, abertura: 0.15, velocidade: 80, espera: 1.4 }
        ]
    }
];

// ---------- O roteiro ----------
/*
  A FASE. { tempo, aviso } mostra um texto; { tempo, tipo, x } cria um
  inimigo; quantidade/espaco/passoX fazem uma formação; { chefe: true }
  chama a nave-mãe.
*/
const ROTEIRO = [
    { tempo: 0.5, aviso: "Prepare-se" },
    { tempo: 2, tipo: "drone", x: 30 },
    { tempo: 2, tipo: "drone", x: 90 },
    { tempo: 4, tipo: "drone", x: 20, quantidade: 5, espaco: 0.35, passoX: 20 },
    { tempo: 7.5, tipo: "onda", x: 35, quantidade: 4, espaco: 0.5 },
    { tempo: 7.5, tipo: "onda", x: 85, quantidade: 4, espaco: 0.5 },
    { tempo: 11, tipo: "mergulhador", x: 30, quantidade: 3, espaco: 0.4, passoX: 30 },

    { tempo: 14, aviso: "Blindado!" },
    { tempo: 15, tipo: "blindado", x: 60 },
    { tempo: 16, tipo: "drone", x: 20, quantidade: 3, espaco: 0.6 },
    { tempo: 16, tipo: "drone", x: 100, quantidade: 3, espaco: 0.6 },
    { tempo: 21, tipo: "onda", x: 30, quantidade: 6, espaco: 0.4, passoX: 12 },
    { tempo: 25, tipo: "mergulhador", x: 100, quantidade: 5, espaco: 0.3, passoX: -20 },

    { tempo: 29, aviso: "Dupla blindada" },
    { tempo: 30, tipo: "blindado", x: 35 },
    { tempo: 30, tipo: "blindado", x: 85 },
    { tempo: 32, tipo: "drone", x: 60, quantidade: 6, espaco: 0.5 },

    { tempo: 38, aviso: "Última onda" },
    { tempo: 39, tipo: "onda", x: 26, quantidade: 5, espaco: 0.3, passoX: 17 },
    { tempo: 41, tipo: "mergulhador", x: 20, quantidade: 5, espaco: 0.25, passoX: 20 },
    { tempo: 43, tipo: "blindado", x: 60 },

    { tempo: 50, aviso: "Alerta: nave-mãe" },
    { tempo: 52, chefe: true }
];

const DURACAO_DO_AVISO = 2;
const DESCANSO_ENTRE_VOLTAS = 3;   // segundos de céu vazio antes da próxima volta

const CHAVE_DO_RECORDE = "shoot-em-up-recorde";
const COR_FUNDO = "#04050d";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoRecorde = document.getElementById("recorde");
const campoVidas = document.getElementById("vidas");
const campoBombas = document.getElementById("bombas");

const barraDoChefe = document.getElementById("barra-do-chefe");
const vidaDoChefe = document.getElementById("vida-do-chefe");

const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");
const botaoIniciar = document.getElementById("botao-iniciar");
const campoAviso = document.getElementById("aviso");

const botaoSom = document.getElementById("botao-som");
const botaoBombaToque = document.getElementById("botao-bomba");
const botaoPausaToque = document.getElementById("botao-pausa");

/*
  A pessoa pediu ao sistema menos movimento na tela? Então o clarão branco
  da bomba não acontece. Uma linha, e o jogo deixa de ser um problema para
  quem sente enjoo ou tem fotossensibilidade.
*/
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// ============================================================
// 3. ESTADO
// ============================================================
const nave = { x: tela.width / 2, y: tela.height - 20 };

const estrelas = [];
CAMADAS_DO_CEU.forEach(camada => {
    for (let i = 0; i < camada.quantidade; i++) {
        estrelas.push({
            x: Math.floor(Math.random() * tela.width),
            yInicial: Math.random() * tela.height,
            camada: camada
        });
    }
});

let tiros = [];
let inimigos = [];
let balas = [];
let particulas = [];
let capsulas = [];
let chefe = null;

const eventos = expandirRoteiro(ROTEIRO);
let tempoDaFase = 0;
let proximoEvento = 0;
let volta = 1;

let pontos = 0;
let recorde = lerRecorde();
let vidas = VIDAS_INICIAIS;
let bombas = BOMBAS_INICIAIS;
let nivelDaArma = 0;   // índice em ARMAS

let recarga = 0;
let invencivel = 0;
let tempoDoClarao = 0;
let tempoDoAviso = 0;
let tempoDoBranco = 0;   // o clarão da bomba

/*
  O jogo:  "menu" | "jogando" | "pausado" | "fim"
  O chefe tem a sua própria máquina, dentro do objeto chefe.
*/
let estado = "menu";

let tempoTotal = 0;
let instanteDoQuadroAnterior = 0;

let somLigado = true;
let mostrarColisoes = false;

const teclasPressionadas = {};
let toque = null;   // o dedo (ou o mouse) que está arrastando a nave


// ============================================================
// 4. ENTRADA
// ============================================================
/*
  Duas famílias de tecla, como no Tetris:

  - SEGURAR (mover, atirar, foco): o painel de interruptores do Pong. O
    loop consulta quais estão presas.
  - APERTAR (bomba, pausa, H): um evento por toque, tratado na hora.
*/
const TECLAS_DO_JOGO = [
    "arrowup", "arrowdown", "arrowleft", "arrowright",
    "w", "a", "s", "d", " ", "shift", "x", "p", "escape", "h"
];

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    // No menu e no fim, o teclado fica com o navegador (Enter e Espaço nos botões).
    if (estado === "menu" || estado === "fim") {
        return;
    }

    teclasPressionadas[tecla] = true;

    if (TECLAS_DO_JOGO.includes(tecla)) {
        evento.preventDefault();
    }

    if (evento.repeat) {
        return;
    }

    if (tecla === "p" || tecla === "escape") alternarPausa();
    if (tecla === "x") soltarBomba();
    if (tecla === "h") mostrarColisoes = !mostrarColisoes;
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {
    soltarTudo();

    if (estado === "jogando") {
        alternarPausa();
    }
});

function soltarTudo() {
    for (const tecla in teclasPressionadas) {
        teclasPressionadas[tecla] = false;
    }
    toque = null;
}

function estaPressionada(...teclas) {
    return teclas.some(tecla => teclasPressionadas[tecla] === true);
}

/*
  TOQUE: ARRASTO RELATIVO.

  O Dealer? Out! levava o personagem ATÉ o dedo. Numa nave isso não
  serve: o dedo ficaria em cima dela, escondendo justamente a parte que
  pode ser atingida. Aqui o dedo pode estar em qualquer lugar da tela, e
  a nave anda o QUANTO o dedo andou — como um touchpad.

  Por isso só importa a DIFERENÇA entre duas posições do dedo. E enquanto
  o dedo estiver na tela, a nave atira sozinha: ninguém tem um segundo
  dedo livre para o gatilho.

  setPointerCapture garante que o arrasto continua mesmo se o dedo sair
  do canvas — os eventos seguem vindo para ele até o dedo levantar.
*/
tela.addEventListener("pointerdown", evento => {
    if (estado !== "jogando") {
        return;
    }

    evento.preventDefault();
    tela.setPointerCapture(evento.pointerId);
    toque = { id: evento.pointerId, ...pontoNoCanvas(evento) };
});

tela.addEventListener("pointermove", evento => {
    if (toque === null || evento.pointerId !== toque.id || estado !== "jogando") {
        return;
    }

    const ponto = pontoNoCanvas(evento);

    nave.x += (ponto.x - toque.x) * SENSIBILIDADE_DO_TOQUE;
    nave.y += (ponto.y - toque.y) * SENSIBILIDADE_DO_TOQUE;
    prenderNaveNaTela();

    toque.x = ponto.x;
    toque.y = ponto.y;
});

["pointerup", "pointercancel"].forEach(tipo => {
    tela.addEventListener(tipo, evento => {
        if (toque !== null && evento.pointerId === toque.id) {
            toque = null;
        }
    });
});

/*
  De pixels da janela para pixels do jogo: o canvas é exibido 3 vezes
  maior (ou outra escala, em telas pequenas). A conversão do Dealer? Out!.
*/
function pontoNoCanvas(evento) {
    const retangulo = tela.getBoundingClientRect();

    return {
        x: (evento.clientX - retangulo.left) * tela.width / retangulo.width,
        y: (evento.clientY - retangulo.top) * tela.height / retangulo.height
    };
}

botaoBombaToque.addEventListener("click", () => soltarBomba());
botaoPausaToque.addEventListener("click", () => alternarPausa());


// ============================================================
// 5. O LOOP
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    /*
      Pausado, NADA anda — nem o céu. É por isso que o céu depende de
      tempoTotal, um relógio do jogo, e não do relógio do navegador.
    */
    if (estado !== "pausado") {
        tempoTotal += tempo;
    }

    if (estado === "jogando") {
        atualizar(tempo);
    }

    desenhar();
    requestAnimationFrame(quadroAQuadro);
}


// ============================================================
// 6. ATUALIZAR — a história de um quadro
// ============================================================
function atualizar(tempo) {
    moverNave(tempo);
    atirar(tempo);
    moverTiros(tempo);

    seguirORoteiro(tempo);
    moverInimigos(tempo);
    atualizarChefe(tempo);
    inimigosAtiram(tempo);
    moverBalas(tempo);
    moverCapsulas(tempo);

    verificarTirosContraInimigos();
    verificarTirosContraChefe();
    verificarCapsulas();
    verificarNave();
    varrerOsMarcados();

    removerQuemSaiu();
    atualizarParticulas(tempo);

    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
    tempoDoBranco = Math.max(0, tempoDoBranco - tempo);
    invencivel = Math.max(0, invencivel - tempo);
    atualizarAviso(tempo);
}


// ============================================================
// 7. A NAVE E A ARMA
// ============================================================
/*
  Intenção normalizada (a diagonal não é mais rápida) e, com Shift, o
  MODO FOCO: a nave fica lenta e precisa, para passar entre balas
  apertadas. Duas velocidades, cada uma para uma situação — e o jogador
  escolhe a toda hora.
*/
function emFoco() {
    return estaPressionada("shift");
}

function moverNave(tempo) {
    let intencaoX = 0;
    let intencaoY = 0;

    if (estaPressionada("arrowleft", "a")) intencaoX -= 1;
    if (estaPressionada("arrowright", "d")) intencaoX += 1;
    if (estaPressionada("arrowup", "w")) intencaoY -= 1;
    if (estaPressionada("arrowdown", "s")) intencaoY += 1;

    const comprimento = Math.hypot(intencaoX, intencaoY);

    if (comprimento > 0) {
        intencaoX /= comprimento;
        intencaoY /= comprimento;
    }

    const velocidade = VELOCIDADE_DA_NAVE * (emFoco() ? FATOR_DO_FOCO : 1);

    nave.x += intencaoX * velocidade * tempo;
    nave.y += intencaoY * velocidade * tempo;
    prenderNaveNaTela();
}

function prenderNaveNaTela() {
    const meiaLargura = SPRITE_DA_NAVE[0].length / 2;
    const meiaAltura = SPRITE_DA_NAVE.length / 2;

    nave.x = Math.max(meiaLargura, Math.min(nave.x, tela.width - meiaLargura));
    nave.y = Math.max(meiaAltura, Math.min(nave.y, tela.height - meiaAltura));
}

/*
  A cadência: o acumulador que não acumula crédito quando a arma está
  parada (passo 3). Atira com Espaço ou com o dedo na tela.
*/
function atirar(tempo) {
    recarga -= tempo;

    const atirando = estaPressionada(" ") || toque !== null;

    if (!atirando) {
        recarga = Math.max(recarga, 0);
        return;
    }

    while (recarga <= 0) {
        dispararArma();
        recarga += INTERVALO_ENTRE_TIROS;
    }
}

/*
  Um disparo da arma atual: um tiro por linha da tabela ARMAS. O ângulo
  conta a partir da vertical, para cima: sin dá o desvio lateral, cos a
  subida.
*/
function dispararArma() {
    ARMAS[nivelDaArma].forEach(cano => {
        tiros.push({
            x: nave.x + cano.dx,
            y: nave.y - SPRITE_DA_NAVE.length / 2,
            vx: Math.sin(cano.angulo) * VELOCIDADE_DO_TIRO,
            vy: -Math.cos(cano.angulo) * VELOCIDADE_DO_TIRO,
            raio: RAIO_DO_TIRO,
            morto: false
        });
    });

    tempoDoClarao = DURACAO_DO_CLARAO;
    tocarSom({ frequencia: 1400, frequenciaFinal: 700, duracao: 0.03, volume: 0.008 });
}

function moverTiros(tempo) {
    tiros.forEach(tiro => {
        tiro.x += tiro.vx * tempo;
        tiro.y += tiro.vy * tempo;
    });
}


// ============================================================
// 8. O ROTEIRO
// ============================================================
/*
  Expandir as formações em eventos simples e ordenar por tempo, uma vez.
*/
function expandirRoteiro(roteiro) {
    const lista = [];

    roteiro.forEach(item => {
        const quantidade = item.quantidade || 1;

        for (let i = 0; i < quantidade; i++) {
            lista.push({
                ...item,
                tempo: item.tempo + i * (item.espaco || 0),
                x: item.x + i * (item.passoX || 0)
            });
        }
    });

    return lista.sort((a, b) => a.tempo - b.tempo);
}

/*
  O cursor: só o próximo evento é olhado. A lista está ordenada; se ele
  ainda não chegou, nenhum chegou.
*/
function seguirORoteiro(tempo) {
    tempoDaFase += tempo;

    while (proximoEvento < eventos.length && eventos[proximoEvento].tempo <= tempoDaFase) {
        executarEvento(eventos[proximoEvento]);
        proximoEvento += 1;
    }
}

function executarEvento(evento) {
    if (evento.aviso) {
        mostrarAviso(evento.aviso);
        return;
    }

    if (evento.chefe) {
        criarChefe();
        return;
    }

    criarInimigo(evento.tipo, evento.x);
}

/*
  A dificuldade da volta atual: 1 na primeira, 1,25 na segunda, 1,5 na
  terceira... Multiplica a velocidade das balas e divide os intervalos
  entre ataques. Um número só, e a mesma fase fica outra.
*/
function fatorDeDificuldade() {
    return 1 + (volta - 1) * DIFICULDADE_POR_VOLTA;
}

/*
  Chefe derrotado: a fase recomeça, mais difícil. O cursor volta ao zero
  — e o relógio da fase volta a um número NEGATIVO: três segundos de céu
  vazio antes do primeiro evento, sem uma linha nova no roteiro.
*/
function completarVolta() {
    volta += 1;
    bombas += 1;
    atualizarPainel();

    tempoDaFase = -DESCANSO_ENTRE_VOLTAS;
    proximoEvento = 0;

    mostrarAviso(`Volta ${volta}!`);
    tocarArpejo([523, 659, 784, 1047, 1319]);
}


// ============================================================
// 9. INIMIGOS
// ============================================================
function criarInimigo(tipo, x) {
    const ficha = INIMIGOS[tipo];

    const inimigo = {
        tipo: tipo,
        origemX: x,
        origemY: -8,
        t: 0,
        x: 0,
        y: 0,
        raio: ficha.raio,
        vida: ficha.vida,
        piscando: 0,
        morto: false,
        tempoAteAtirar: ficha.ataque.primeiro
    };

    posicionar(inimigo);
    inimigos.push(inimigo);
}

/*
  Mover é perguntar ao trajeto: só o relógio do inimigo anda.
*/
function moverInimigos(tempo) {
    inimigos.forEach(inimigo => {
        inimigo.t += tempo;
        inimigo.piscando = Math.max(0, inimigo.piscando - tempo);
        posicionar(inimigo);
    });
}

function posicionar(inimigo) {
    const posicao = INIMIGOS[inimigo.tipo].trajeto(inimigo, inimigo.t);
    inimigo.x = posicao.x;
    inimigo.y = posicao.y;
}

function ferirInimigo(inimigo, dano) {
    inimigo.vida -= dano;
    inimigo.piscando = 0.06;

    if (inimigo.vida > 0) {
        return;
    }

    const ficha = INIMIGOS[inimigo.tipo];

    inimigo.morto = true;
    ganharPontos(ficha.pontos);
    explodir(inimigo.x, inimigo.y, ficha.cores["#"], 14);
    tocarSom({ frequencia: 220, frequenciaFinal: 40, duracao: 0.25, volume: 0.05, tipo: "sawtooth" });

    if (Math.random() < ficha.chanceDeArma) {
        capsulas.push({ x: inimigo.x, y: inimigo.y, t: 0, raio: RAIO_DA_CAPSULA, morto: false });
    }
}


// ============================================================
// 10. O CHEFE
// ============================================================
function criarChefe() {
    chefe = {
        x: tela.width / 2,
        y: -12,
        raio: RAIO_DO_CHEFE,
        vida: VIDA_DO_CHEFE,
        estado: "entrando",
        tempoNoEstado: 0,
        t: 0,
        fase: 0,
        proximoAtaque: 0,
        tempoAteAtacar: 1.5,
        piscando: 0
    };

    barraDoChefe.classList.remove("escondida");
    atualizarBarraDoChefe();
    tocarArpejo([196, 185, 196, 185], 0.18);   // sirene
}

function atualizarChefe(tempo) {
    if (chefe === null) {
        return;
    }

    chefe.t += tempo;
    chefe.tempoNoEstado += tempo;
    chefe.piscando = Math.max(0, chefe.piscando - tempo);

    switch (chefe.estado) {
        case "entrando":
            atualizarEntrada();
            break;

        case "lutando":
            moverChefe();
            atacar(tempo);
            break;

        case "explodindo":
            atualizarExplosaoDoChefe();
            break;
    }
}

function mudarEstadoDoChefe(novoEstado) {
    chefe.estado = novoEstado;
    chefe.tempoNoEstado = 0;
}

function atualizarEntrada() {
    const progresso = Math.min(chefe.tempoNoEstado / DURACAO_DA_ENTRADA, 1);
    chefe.y = -12 + (ALTURA_DE_COMBATE + 12) * (1 - (1 - progresso) ** 2);

    if (progresso >= 1) {
        mudarEstadoDoChefe("lutando");
    }
}

function moverChefe() {
    const t = chefe.tempoNoEstado;
    chefe.x = tela.width / 2 + Math.sin(t * 0.8) * 32;
    chefe.y = ALTURA_DE_COMBATE + Math.sin(t * 1.6) * 4;
}

function atacar(tempo) {
    chefe.tempoAteAtacar -= tempo;

    if (chefe.tempoAteAtacar > 0) {
        return;
    }

    const ataques = FASES_DO_CHEFE[chefe.fase].ataques;
    const ataque = ataques[chefe.proximoAtaque % ataques.length];

    PADROES[ataque.padrao]({ x: chefe.x, y: chefe.y + 4, t: chefe.t }, ataque);

    chefe.proximoAtaque += 1;
    chefe.tempoAteAtacar += ataque.espera / fatorDeDificuldade();
}

function chefeEstaAvisando() {
    return chefe !== null && chefe.estado === "lutando" && chefe.tempoAteAtacar < TEMPO_DE_AVISO;
}

function ferirChefe(dano) {
    if (chefe === null || chefe.estado !== "lutando") {
        return;
    }

    chefe.vida -= dano;
    chefe.piscando = 0.06;
    atualizarBarraDoChefe();

    if (chefe.vida <= 0) {
        ganharPontos(PONTOS_DO_CHEFE);
        apagarBalas();
        mudarEstadoDoChefe("explodindo");
        return;
    }

    const fracao = chefe.vida / VIDA_DO_CHEFE;
    const novaFase = FASES_DO_CHEFE.findIndex(fase => fracao > fase.ateVida);

    if (novaFase !== chefe.fase) {
        chefe.fase = novaFase;
        chefe.proximoAtaque = 0;
        chefe.tempoAteAtacar = 1;

        apagarBalas();
        explodir(chefe.x, chefe.y, CORES_DO_CHEFE.o, 30);
        mostrarAviso(novaFase === FASES_DO_CHEFE.length - 1 ? "Fúria!" : "Ele mudou!");
    }
}

function atualizarExplosaoDoChefe() {
    if (Math.random() < 0.3) {
        explodir(
            chefe.x + (Math.random() - 0.5) * 24,
            chefe.y + (Math.random() - 0.5) * 10,
            Math.random() < 0.5 ? CORES_DO_CHEFE.o : CORES_DO_CHEFE.r,
            8
        );
        tocarSom({ frequencia: 160, frequenciaFinal: 30, duracao: 0.3, volume: 0.04, tipo: "sawtooth" });
    }

    if (chefe.tempoNoEstado >= DURACAO_DA_EXPLOSAO) {
        explodir(chefe.x, chefe.y, "#ffffff", 60);
        chefe = null;
        barraDoChefe.classList.add("escondida");
        completarVolta();
    }
}

function atualizarBarraDoChefe() {
    vidaDoChefe.value = Math.max(0, chefe.vida) / VIDA_DO_CHEFE;
}


// ============================================================
// 11. O CONTRA-ATAQUE
// ============================================================
function anguloAteANave(origem) {
    return Math.atan2(nave.y - origem.y, nave.x - origem.x);
}

function dispararEmAngulo(origem, angulo, velocidade) {
    const rapidez = velocidade * fatorDeDificuldade();

    balas.push({
        x: origem.x,
        y: origem.y,
        vx: Math.cos(angulo) * rapidez,
        vy: Math.sin(angulo) * rapidez,
        raio: RAIO_DA_BALA
    });
}

const PADROES = {
    mirado: (atirador, ataque) => {
        dispararEmAngulo(atirador, anguloAteANave(atirador), ataque.velocidade);
    },

    leque: (atirador, ataque) => {
        const centro = anguloAteANave(atirador);

        for (let i = 0; i < ataque.quantidade; i++) {
            const desvio = (i - (ataque.quantidade - 1) / 2) * ataque.abertura;
            dispararEmAngulo(atirador, centro + desvio, ataque.velocidade);
        }
    },

    anel: (atirador, ataque) => {
        const passo = (Math.PI * 2) / ataque.quantidade;
        const giro = atirador.t * 0.7;

        for (let i = 0; i < ataque.quantidade; i++) {
            dispararEmAngulo(atirador, giro + i * passo, ataque.velocidade);
        }
    }
};

function inimigosAtiram(tempo) {
    inimigos.forEach(inimigo => {
        const ataque = INIMIGOS[inimigo.tipo].ataque;

        inimigo.tempoAteAtirar -= tempo;

        if (inimigo.tempoAteAtirar > 0) {
            return;
        }

        inimigo.tempoAteAtirar += ataque.intervalo / fatorDeDificuldade();

        const naTela = inimigo.y > 0;
        const longeDaNave = inimigo.y < nave.y - DISTANCIA_MINIMA_PARA_ATIRAR;

        if (naTela && longeDaNave && !inimigo.morto) {
            PADROES[ataque.padrao](inimigo, ataque);
        }
    });
}

function moverBalas(tempo) {
    balas.forEach(bala => {
        bala.x += bala.vx * tempo;
        bala.y += bala.vy * tempo;
    });
}


// ============================================================
// 12. COLISÃO — círculos, marcar e varrer
// ============================================================
function colidem(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const somaDosRaios = a.raio + b.raio;

    return dx * dx + dy * dy < somaDosRaios * somaDosRaios;
}

function verificarTirosContraInimigos() {
    tiros.forEach(tiro => {
        for (const inimigo of inimigos) {
            if (tiro.morto) {
                return;
            }

            if (inimigo.morto || !colidem(tiro, inimigo)) {
                continue;
            }

            tiro.morto = true;
            ferirInimigo(inimigo, 1);
        }
    });
}

function verificarTirosContraChefe() {
    if (chefe === null || chefe.estado !== "lutando") {
        return;
    }

    tiros.forEach(tiro => {
        if (!tiro.morto && colidem(tiro, chefe)) {
            tiro.morto = true;
            ferirChefe(1);
        }
    });
}

function verificarNave() {
    if (invencivel > 0) {
        return;
    }

    const corpoDaNave = { x: nave.x, y: nave.y, raio: RAIO_DA_NAVE };

    const balaQueAcertou = balas.find(bala => colidem(bala, corpoDaNave));
    const inimigoQueBateu = inimigos.find(inimigo => !inimigo.morto && colidem(inimigo, corpoDaNave));
    const bateuNoChefe = chefe !== null && chefe.estado === "lutando" && colidem(chefe, corpoDaNave);

    if (!balaQueAcertou && !inimigoQueBateu && !bateuNoChefe) {
        return;
    }

    if (inimigoQueBateu) {
        ferirInimigo(inimigoQueBateu, inimigoQueBateu.vida);
    }

    perderVida();
}

/*
  Perder uma vida: as balas somem, a nave fica invencível e piscando, e
  a arma perde um nível — o castigo dói, mas não recomeça do zero.
*/
function perderVida() {
    vidas -= 1;
    nivelDaArma = Math.max(0, nivelDaArma - 1);
    atualizarPainel();

    explodir(nave.x, nave.y, "#ffcc33", 30);
    apagarBalas();
    tocarSom({ frequencia: 300, frequenciaFinal: 40, duracao: 0.6, volume: 0.08, tipo: "sawtooth" });

    if (vidas <= 0) {
        terminarPartida();
        return;
    }

    invencivel = DURACAO_DA_INVENCIBILIDADE;
}

/*
  Toda bala apagada vira uma faísca: o jogador VÊ o perigo ir embora.
*/
function apagarBalas() {
    balas.forEach(bala => explodir(bala.x, bala.y, CORES_DA_BALA["#"], 1));
    balas = [];
}

function varrerOsMarcados() {
    tiros = tiros.filter(tiro => !tiro.morto);
    inimigos = inimigos.filter(inimigo => !inimigo.morto);
    capsulas = capsulas.filter(capsula => !capsula.morto);
}

/*
  Uma limpeza para cada lista, cada uma com a sua regra de "saiu".
*/
function removerQuemSaiu() {
    tiros = tiros.filter(tiro => tiro.y > -4 && tiro.x > -4 && tiro.x < tela.width + 4);
    inimigos = inimigos.filter(inimigo => inimigo.y < tela.height + 10);
    capsulas = capsulas.filter(capsula => capsula.y < tela.height + 6);
    balas = balas.filter(bala =>
        bala.x > -4 && bala.x < tela.width + 4 &&
        bala.y > -4 && bala.y < tela.height + 4
    );
}


// ============================================================
// 13. CÁPSULAS E BOMBA
// ============================================================
/*
  A cápsula cai devagar, balançando: um trajeto paramétrico de novo, só
  que contado a partir de onde o inimigo morreu.
*/
function moverCapsulas(tempo) {
    capsulas.forEach(capsula => {
        capsula.t += tempo;
        capsula.y += 22 * tempo;
        capsula.x += Math.cos(capsula.t * 3) * 12 * tempo;
    });
}

function verificarCapsulas() {
    const corpoDaNave = { x: nave.x, y: nave.y, raio: RAIO_DA_NAVE };

    capsulas.forEach(capsula => {
        if (capsula.morto || !colidem(capsula, corpoDaNave)) {
            return;
        }

        capsula.morto = true;

        if (nivelDaArma < ARMAS.length - 1) {
            nivelDaArma += 1;
        } else {
            ganharPontos(PONTOS_POR_ARMA_EXTRA);
        }

        tocarArpejo([660, 880, 1320], 0.06);
    });
}

/*
  A BOMBA: o botão do pânico.

  Apaga todas as balas (cada uma vale uns pontinhos), fere todo inimigo
  na tela, fere o chefe, e dá um segundo de invencibilidade. É limitada —
  três por partida, mais uma por volta — e é exatamente o limite que a
  torna uma DECISÃO: usar agora ou guardar para o chefe?
*/
function soltarBomba() {
    if (estado !== "jogando" || bombas <= 0) {
        return;
    }

    bombas -= 1;
    ganharPontos(balas.length * PONTOS_POR_BALA_APAGADA);
    apagarBalas();

    inimigos.forEach(inimigo => {
        if (!inimigo.morto && inimigo.y > -4) {
            ferirInimigo(inimigo, DANO_DA_BOMBA);
        }
    });

    ferirChefe(DANO_DA_BOMBA);

    invencivel = Math.max(invencivel, 1);
    tempoDoBranco = movimentoReduzido ? 0 : 0.15;

    atualizarPainel();
    tocarSom({ frequencia: 120, frequenciaFinal: 25, duracao: 0.9, volume: 0.12, tipo: "sawtooth" });
}


// ============================================================
// 14. PARTÍCULAS
// ============================================================
function explodir(x, y, cor, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const rapidez = 20 + Math.random() * 50;

        particulas.push({
            x: x,
            y: y,
            vx: Math.cos(angulo) * rapidez,
            vy: Math.sin(angulo) * rapidez,
            vida: 0.25 + Math.random() * 0.35,
            cor: Math.random() < 0.3 ? "#ffffff" : cor
        });
    }
}

function atualizarParticulas(tempo) {
    particulas.forEach(particula => {
        particula.x += particula.vx * tempo;
        particula.y += particula.vy * tempo;
        particula.vida -= tempo;
    });

    particulas = particulas.filter(particula => particula.vida > 0);
}


// ============================================================
// 15. INÍCIO, PAUSA E FIM
// ============================================================
/*
  Tudo o que a partida usa volta ao começo, num lugar só.
*/
function iniciarPartida() {
    prepararAudio();

    nave.x = tela.width / 2;
    nave.y = tela.height - 20;

    tiros = [];
    inimigos = [];
    balas = [];
    particulas = [];
    capsulas = [];
    chefe = null;
    barraDoChefe.classList.add("escondida");

    tempoDaFase = 0;
    proximoEvento = 0;
    volta = 1;

    pontos = 0;
    vidas = VIDAS_INICIAIS;
    bombas = BOMBAS_INICIAIS;
    nivelDaArma = 0;
    recarga = 0;
    invencivel = 0;
    tempoDoAviso = 0;
    campoAviso.hidden = true;
    soltarTudo();

    atualizarPainel();
    camadaMensagem.hidden = true;
    estado = "jogando";

    botaoIniciar.blur();
}

function alternarPausa() {
    if (estado === "jogando") {
        estado = "pausado";
        soltarTudo();
        mostrarMensagem("Pausado", "P ou Esc para continuar.", false);
        return;
    }

    if (estado === "pausado") {
        estado = "jogando";
        camadaMensagem.hidden = true;
    }
}

function terminarPartida() {
    estado = "fim";
    soltarTudo();

    const bateuORecorde = pontos > recorde;

    if (bateuORecorde) {
        recorde = pontos;
        salvarRecorde();
        atualizarPainel();
    }

    mostrarMensagem(
        bateuORecorde ? "Novo recorde!" : "Fim de jogo",
        `${pontos} pontos · volta ${volta}`,
        true
    );
    botaoIniciar.textContent = "Jogar de novo";
}


// ============================================================
// 16. DESENHAR
// ============================================================
/*
  A ordem das camadas é uma decisão de jogo, não de enfeite:
  céu, chefe, inimigos, cápsulas, tiros, nave, partículas — e as BALAS
  por cima de tudo. O que pode te matar nunca fica escondido.
*/
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharCeu();
    desenharChefe();
    desenharInimigos();
    desenharCapsulas();
    desenharTiros();

    if (estado === "jogando" || estado === "pausado") {
        desenharNave();
        desenharClarao();
    }

    desenharParticulas();
    desenharBalas();

    if (emFoco() && estado === "jogando") {
        desenharMiolo();
    }

    if (mostrarColisoes) {
        desenharColisoes();
    }

    if (tempoDoBranco > 0) {
        pincel.fillStyle = `rgba(255, 255, 255, ${tempoDoBranco / 0.15 * 0.7})`;
        pincel.fillRect(0, 0, tela.width, tela.height);
    }
}

function desenharCeu() {
    estrelas.forEach(estrela => {
        const camada = estrela.camada;
        const y = (estrela.yInicial + camada.velocidade * tempoTotal) % tela.height;

        pincel.fillStyle = camada.cor;
        pincel.fillRect(estrela.x, Math.floor(y), 1, 1);
    });
}

function desenharChefe() {
    if (chefe === null) {
        return;
    }

    let cores = CORES_DO_CHEFE;

    if (chefeEstaAvisando() && Math.floor(chefe.t * 20) % 2 === 0) {
        cores = { ...CORES_DO_CHEFE, r: "#ffffff", o: "#ffffff" };
    }

    const corUnica = chefe.piscando > 0 ? "#ffffff" : null;
    desenharSprite(SPRITE_DO_CHEFE, cores, chefe.x, chefe.y, corUnica);
}

function desenharInimigos() {
    inimigos.forEach(inimigo => {
        if (inimigo.morto) {
            return;
        }

        const tipo = INIMIGOS[inimigo.tipo];
        const corUnica = inimigo.piscando > 0 ? "#ffffff" : null;
        desenharSprite(tipo.sprite, tipo.cores, inimigo.x, inimigo.y, corUnica);
    });
}

// A cápsula pisca devagar entre verde e branco: "me pegue".
function desenharCapsulas() {
    capsulas.forEach(capsula => {
        const corUnica = Math.floor(capsula.t * 4) % 2 === 0 ? null : "#e8ecff";
        desenharSprite(SPRITE_DA_CAPSULA, CORES_DA_CAPSULA, capsula.x, capsula.y, corUnica);
    });
}

function desenharTiros() {
    tiros.forEach(tiro => {
        const x = Math.round(tiro.x - 0.5);
        const y = Math.round(tiro.y - 2);

        pincel.fillStyle = "#ffcc33";
        pincel.fillRect(x, y, 1, 4);
        pincel.fillStyle = "#ffffff";
        pincel.fillRect(x, y, 1, 1);
    });
}

function desenharNave() {
    if (invencivel > 0 && Math.floor(invencivel * 15) % 2 === 0) {
        return;
    }

    desenharSprite(SPRITE_DA_NAVE, CORES_DA_NAVE, nave.x, nave.y);
}

function desenharClarao() {
    if (tempoDoClarao <= 0) {
        return;
    }

    const x = Math.round(nave.x - 0.5);
    const y = Math.round(nave.y - SPRITE_DA_NAVE.length / 2 - 1);

    pincel.fillStyle = "#ffffff";
    pincel.fillRect(x - 1, y, 3, 1);
    pincel.fillRect(x, y - 1, 1, 3);
}

/*
  No modo foco, o MIOLO aparece: um ponto branco com o centro vermelho,
  exatamente onde a nave pode ser atingida. Mostrar a informação certa na
  hora em que ela importa — quando você está espremido entre balas.
*/
function desenharMiolo() {
    const x = Math.round(nave.x - 0.5);
    const y = Math.round(nave.y - 0.5);

    pincel.fillStyle = "#ffffff";
    pincel.fillRect(x - 1, y - 1, 3, 3);
    pincel.fillStyle = "#ff3b6b";
    pincel.fillRect(x, y, 1, 1);
}

function desenharParticulas() {
    particulas.forEach(particula => {
        pincel.fillStyle = particula.cor;
        pincel.fillRect(Math.round(particula.x), Math.round(particula.y), 1, 1);
    });
}

function desenharBalas() {
    balas.forEach(bala => desenharSprite(SPRITE_DA_BALA, CORES_DA_BALA, bala.x, bala.y));
}

function desenharColisoes() {
    pincel.strokeStyle = "#00ff66";
    pincel.lineWidth = 0.5;

    const circulos = [
        { x: nave.x, y: nave.y, raio: RAIO_DA_NAVE },
        ...tiros, ...inimigos, ...balas, ...capsulas,
        ...(chefe ? [chefe] : [])
    ];

    circulos.forEach(circulo => {
        pincel.beginPath();
        pincel.arc(circulo.x, circulo.y, circulo.raio, 0, Math.PI * 2);
        pincel.stroke();
    });
}

function desenharSprite(sprite, cores, x, y, corUnica = null) {
    const inicioX = Math.round(x - sprite[0].length / 2);
    const inicioY = Math.round(y - sprite.length / 2);

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < linhaDoDesenho.length; dx++) {
            const cor = cores[linhaDoDesenho[dx]];

            if (!cor) {
                continue;
            }

            pincel.fillStyle = corUnica || cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}


// ============================================================
// 17. INTERFACE
// ============================================================
function ganharPontos(quantos) {
    pontos += quantos;
    atualizarPainel();
}

function atualizarPainel() {
    campoPontos.textContent = pontos;
    campoRecorde.textContent = recorde;
    campoVidas.textContent = vidas;
    campoBombas.textContent = bombas;
}

/*
  A mesma camada serve para o menu, a pausa e o fim. Na pausa o botão
  some: quem pausou quer continuar, não recomeçar sem querer.
*/
function mostrarMensagem(titulo, texto, comBotao) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    botaoIniciar.hidden = !comBotao;
    camadaMensagem.hidden = false;
}

function mostrarAviso(texto) {
    campoAviso.textContent = texto;
    campoAviso.hidden = false;
    tempoDoAviso = DURACAO_DO_AVISO;
}

function atualizarAviso(tempo) {
    if (tempoDoAviso <= 0) {
        return;
    }

    tempoDoAviso -= tempo;

    if (tempoDoAviso <= 0) {
        campoAviso.hidden = true;
    }
}

botaoIniciar.addEventListener("click", iniciarPartida);

botaoSom.addEventListener("click", () => {
    somLigado = !somLigado;
    botaoSom.textContent = somLigado ? "Som: ligado" : "Som: desligado";
    botaoSom.setAttribute("aria-pressed", String(somLigado));
});


// ============================================================
// 18. RECORDE
// ============================================================
/*
  localStorage com as duas precauções do Tetris: try/catch (o acesso pode
  lançar erro) e desconfiar do que se lê (pode ser lixo).
*/
function lerRecorde() {
    try {
        const valor = Number(localStorage.getItem(CHAVE_DO_RECORDE));
        return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
    } catch (erro) {
        return 0;
    }
}

function salvarRecorde() {
    try {
        localStorage.setItem(CHAVE_DO_RECORDE, String(recorde));
    } catch (erro) {
        // Sem armazenamento: o recorde vale até fechar a página.
    }
}


// ============================================================
// 19. SOM — síntese com envelope
// ============================================================
/*
  O bipe do Pong era um tom fixo que liga e desliga. Uma explosão não é
  assim: ela começa forte e grave e vai sumindo, cada vez mais grave. Isso
  é um ENVELOPE — o volume e a frequência MUDAM ao longo do som.

  exponentialRampToValueAtTime faz a mudança suave, agendada no relógio
  do áudio. Exponencial (e não linear) porque o ouvido percebe volume e
  altura em proporções: de 400 para 200 Hz soa como o mesmo "degrau" que
  de 200 para 100.

  E os parâmetros vêm num OBJETO, com nomes: tocarSom({ frequencia: 220,
  duracao: 0.3 }) se lê sozinho, e os que faltam pegam o valor padrão.
  Com seis parâmetros posicionais, ninguém lembraria qual é o quinto.
*/
let contextoDeAudio = null;

function prepararAudio() {
    if (contextoDeAudio === null) {
        try {
            contextoDeAudio = new AudioContext();
        } catch (erro) {
            somLigado = false;
        }
    }
}

function tocarSom({ frequencia, frequenciaFinal = frequencia, duracao, volume = 0.04, tipo = "square", atraso = 0 }) {
    if (!somLigado || contextoDeAudio === null) {
        return;
    }

    const inicio = contextoDeAudio.currentTime + atraso;
    const oscilador = contextoDeAudio.createOscillator();
    const ganho = contextoDeAudio.createGain();

    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frequencia, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(frequenciaFinal, inicio + duracao);

    // Exponencial não chega a zero: 0,0001 é "silêncio" para o ouvido.
    ganho.gain.setValueAtTime(volume, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    oscilador.connect(ganho);
    ganho.connect(contextoDeAudio.destination);

    oscilador.start(inicio);
    oscilador.stop(inicio + duracao);
}

function tocarArpejo(notas, intervalo = 0.07) {
    notas.forEach((nota, i) => {
        tocarSom({ frequencia: nota, duracao: intervalo * 1.2, atraso: i * intervalo });
    });
}


// ============================================================
// 20. LIGAR
// ============================================================
atualizarPainel();
mostrarMensagem("Shoot 'em up", "Sobreviva ao roteiro e derrube a nave-mãe.", true);
requestAnimationFrame(quadroAQuadro);
