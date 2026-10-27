/*
  XENOMORPH — PASSO 2: A GRAVIDADE

  O soldado ganha VELOCIDADE, e o mundo ganha um "para baixo". Três ideias:

  1. ACELERAR EM VEZ DE TELETRANSPORTAR
     No Pong, apertar a seta fazia a raquete andar já na velocidade
     máxima. Um corpo com peso não é assim: ele ACELERA até a velocidade
     máxima e FREIA até parar. A diferença é pequena nos números e enorme
     na sensação — é a primeira coisa que o GDD pede da movimentação
     (seção 4: "aceleração, desaceleração e controle aéreo ajustáveis").

  2. A GRAVIDADE É SÓ MAIS UMA ACELERAÇÃO
     Para baixo, o tempo todo. O chão não "desliga" a gravidade: ele
     apenas não deixa o corpo passar.

  3. COLIDIR UM EIXO DE CADA VEZ, EM PEDAÇOS PEQUENOS
     Andar em x e corrigir; andar em y e corrigir. E nunca andar mais que
     meio bloco de uma vez — senão, numa queda rápida, o soldado
     atravessaria um piso fino sem nunca ter estado "dentro" dele.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;

/*
  A SALA. O "@" agora está no alto, à esquerda: o soldado começa em cima
  de uma plataforma e, andando para a direita, cai de degrau em degrau.
*/
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    "#..............|...............#",
    "#......@.......|..........###..#",
    "#.....####.....|...............#",
    "#..............|...............#",
    "#..............|...............#",
    "#.........######...............#",
    "#..............................#",
    "#####..........................#",
    "#....................######....#",
    "#..............................#",
    "#.....|........................#",
    "#.....|.........####...........#",
    "#.....|........................#",
    "#.....|...............####.....#",
    "################################",
    "################################"
];

const COLUNAS = SALA_EM_TEXTO[0].length;
const LINHAS = SALA_EM_TEXTO.length;

const BLOCOS = {
    "#": { solido: true, desenho: "metal" },
    "|": { solido: false, desenho: "cano" },
    ".": { solido: false, desenho: null }
};

const PALETA = {
    fundo: "#0b0f1a",
    painel: "#0f1524",
    juntaDoPainel: "#080b14",
    metal: "#2b3448",
    metalClaro: "#5c6f94",
    metalEscuro: "#161b28",
    rebite: "#7d8fb3",
    cano: "#1d2638",
    canoClaro: "#2f3c57"
};

const SPRITE_DO_SOLDADO = [
    "..ddd...",
    ".d###d..",
    ".d#vvv..",
    ".d###d..",
    "..ddd...",
    ".d###d..",
    ".d#gggg.",
    ".d###d..",
    "..d#d...",
    "..d.d...",
    ".dd.dd..",
    "........"
];

const CORES_DO_SOLDADO = {
    "#": "#c9d3e6",
    d: "#56627a",
    v: "#3cf2ff",
    g: "#8a93b8"
};

const LARGURA_DO_SOLDADO = 6;
const ALTURA_DO_SOLDADO = 12;

/*
  A FÍSICA, como dados. Todas as unidades em pixels e segundos:
  velocidades em px/s, acelerações em px/s² (quanto a velocidade muda
  por segundo).

  Com aceleração 900 e máxima 80, o soldado chega à velocidade total em
  80 / 900 ≈ 0,09 s — rápido o bastante para parecer obediente, lento o
  bastante para parecer que tem peso. Mude e sinta.
*/
const FISICA = {
    velocidadeMaxima: 80,
    aceleracao: 900,
    frenagem: 1200,      // parar é mais rápido que arrancar: o controle fica preciso
    gravidade: 900,
    quedaMaxima: 260     // a "velocidade terminal": ninguém cai cada vez mais rápido para sempre
};

/*
  O tamanho máximo de um pedaço de movimento. Meio bloco: nenhum pedaço
  consegue pular um bloco inteiro, então nenhuma parede é atravessada.
*/
const PASSO_MAXIMO = TAMANHO_DO_BLOCO / 2;

/*
  Um número pequeno o bastante para não aparecer na tela e grande o
  bastante para o computador enxergar. Explicado na seção 7.
*/
const EPSILON = 0.001;

/*
  OS CONTROLES, como dados: cada AÇÃO do jogo e as teclas que a fazem.
  O código pergunta "o jogador quer ir para a esquerda?", nunca "a seta
  está apertada?". Trocar uma tecla — ou deixar o jogador escolher, como o
  GDD pede na seção 11 — é mudar esta tabela.
*/
const CONTROLES = {
    esquerda: ["arrowleft", "a"],
    direita: ["arrowright", "d"]
};


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
function verificarSala() {
    SALA_EM_TEXTO.forEach((linha, i) => {
        if (linha.length !== COLUNAS) {
            console.error(`Linha ${i} da sala tem ${linha.length} blocos; deveria ter ${COLUNAS}.`);
        }

        for (const caractere of linha) {
            if (!(caractere in BLOCOS) && caractere !== "@") {
                console.error(`Linha ${i} da sala tem um "${caractere}", que não está na tabela BLOCOS.`);
            }
        }
    });
}

function criarSala() {
    const blocos = SALA_EM_TEXTO.map(linha => linha.split(""));
    let inicio = null;

    blocos.forEach((linha, l) => {
        linha.forEach((caractere, c) => {
            if (caractere === "@") {
                inicio = { coluna: c, linha: l };
                linha[c] = ".";
            }
        });
    });

    return { blocos, inicio };
}

verificarSala();
const sala = criarSala();


// ============================================================
// 4. ESTADO
// ============================================================
/*
  O soldado ganhou VELOCIDADE (vx, vy, em px/s), um lado para onde olha
  (1 = direita, -1 = esquerda) e a resposta a uma pergunta que o jogo vai
  fazer o tempo todo: ele está pisando em alguma coisa?

  `noChao` não é decidido por ninguém: é DESCOBERTO a cada quadro, pela
  colisão (seção 7).
*/
const soldado = {
    x: sala.inicio.coluna * TAMANHO_DO_BLOCO + 1,
    y: (sala.inicio.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
    largura: LARGURA_DO_SOLDADO,
    altura: ALTURA_DO_SOLDADO,
    vx: 0,
    vy: 0,
    olhandoPara: 1,
    noChao: false
};

let instanteDoQuadroAnterior = 0;
let mostrarCaixas = false;

const teclasPressionadas = {};


// ============================================================
// 5. ENTRADA
// ============================================================
/*
  O painel de interruptores do Pong: o teclado só anota o que está preso;
  o loop consulta quando precisa.
*/
const TECLAS_DO_JOGO = Object.values(CONTROLES).flat();

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    teclasPressionadas[tecla] = true;

    if (TECLAS_DO_JOGO.includes(tecla)) {
        evento.preventDefault();   // as setas não rolam a página
    }

    if (tecla === "h" && !evento.repeat) {
        mostrarCaixas = !mostrarCaixas;
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  Trocar de janela com uma tecla presa: o keyup nunca chega, e o soldado
  correria sozinho para sempre. Soltar tudo resolve.
*/
window.addEventListener("blur", () => {
    for (const tecla in teclasPressionadas) {
        teclasPressionadas[tecla] = false;
    }
});

function acao(nome) {
    return CONTROLES[nome].some(tecla => teclasPressionadas[tecla] === true);
}


// ============================================================
// 6. O LOOP
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    correr(tempo);
    cair(tempo);
    moverComColisao(soldado, tempo);
}


// ============================================================
// 7. A FÍSICA
// ============================================================
/*
  ACELERAR EM VEZ DE TELETRANSPORTAR.

  A INTENÇÃO (-1, 0 ou 1) vira um ALVO de velocidade, e a velocidade
  real APROXIMA-SE do alvo um pouco a cada quadro. Soltar as teclas é só
  um alvo zero — a mesma conta faz o soldado frear.
*/
function correr(tempo) {
    let intencao = 0;

    if (acao("esquerda")) intencao -= 1;
    if (acao("direita")) intencao += 1;

    if (intencao !== 0) {
        soldado.olhandoPara = intencao;
    }

    const alvo = intencao * FISICA.velocidadeMaxima;
    const taxa = intencao !== 0 ? FISICA.aceleracao : FISICA.frenagem;

    soldado.vx = aproximar(soldado.vx, alvo, taxa * tempo);
}

/*
  Anda de `valor` até `alvo`, no máximo `passo` de cada vez, sem passar
  do alvo. Sem o Math.min / Math.max, o soldado frearia além do zero e
  sairia andando de ré.
*/
function aproximar(valor, alvo, passo) {
    if (valor < alvo) {
        return Math.min(valor + passo, alvo);
    }
    return Math.max(valor - passo, alvo);
}

/*
  A gravidade puxa SEMPRE — inclusive quem está no chão. É a colisão com
  o piso que, quadro após quadro, devolve a velocidade a zero. Parece
  desperdício, mas é o que faz o soldado cair sozinho quando o piso acaba:
  ninguém precisa avisá-lo.
*/
function cair(tempo) {
    soldado.vy = Math.min(soldado.vy + FISICA.gravidade * tempo, FISICA.quedaMaxima);
}

/*
  MOVER COM COLISÃO: o coração de todo jogo de plataforma.

  Duas regras:

  - UM EIXO DE CADA VEZ. Anda em x; se entrou numa parede, recua até
    encostar. Depois anda em y; se entrou no chão ou no teto, recua. Se
    os dois andassem juntos, num canto não daria para saber se o soldado
    bateu no chão (e deve parar de cair) ou na parede (e deve parar de
    andar).

  - EM PEDAÇOS DE NO MÁXIMO MEIO BLOCO. Caindo a 260 px/s num quadro de
    0,05 s, o soldado anda 13 pixels — mais que um bloco inteiro. Num
    salto só, ele poderia estar acima de um piso de 8 pixels num quadro e
    abaixo dele no outro, sem nunca ter estado DENTRO. A colisão só
    enxerga o que está dentro.

  `noChao` sai daqui: se o movimento para baixo foi barrado, há chão.
*/
function moverComColisao(corpo, tempo) {
    let restanteX = corpo.vx * tempo;
    let restanteY = corpo.vy * tempo;

    corpo.noChao = false;

    while (restanteX !== 0 || restanteY !== 0) {
        const pedacoX = limitar(restanteX, -PASSO_MAXIMO, PASSO_MAXIMO);
        const pedacoY = limitar(restanteY, -PASSO_MAXIMO, PASSO_MAXIMO);
        restanteX -= pedacoX;
        restanteY -= pedacoY;

        if (pedacoX !== 0 && moverNoEixoX(corpo, pedacoX)) {
            corpo.vx = 0;
            restanteX = 0;
        }

        if (pedacoY !== 0 && moverNoEixoY(corpo, pedacoY)) {
            if (pedacoY > 0) {
                corpo.noChao = true;
            }
            corpo.vy = 0;
            restanteY = 0;
        }
    }
}

function limitar(valor, minimo, maximo) {
    return Math.max(minimo, Math.min(valor, maximo));
}

/*
  Anda dx em x. Se a borda que vai na frente entrou num bloco sólido,
  encosta a caixa na face desse bloco e avisa que bateu.

  O EPSILON: a borda direita de uma caixa em x = 10 com largura 6 está em
  16 — exatamente onde COMEÇA o bloco da coluna 2. Encostar não é entrar.
  Por isso pergunta-se pelo pixel 15,999: o último pixel que a caixa
  realmente ocupa.
*/
function moverNoEixoX(corpo, dx) {
    corpo.x += dx;

    const linhaDeCima = Math.floor(corpo.y / TAMANHO_DO_BLOCO);
    const linhaDeBaixo = Math.floor((corpo.y + corpo.altura - EPSILON) / TAMANHO_DO_BLOCO);

    const bordaDaFrente = dx > 0 ? corpo.x + corpo.largura - EPSILON : corpo.x;
    const coluna = Math.floor(bordaDaFrente / TAMANHO_DO_BLOCO);

    for (let linha = linhaDeCima; linha <= linhaDeBaixo; linha++) {
        if (ehSolido(coluna, linha)) {
            corpo.x = dx > 0
                ? coluna * TAMANHO_DO_BLOCO - corpo.largura
                : (coluna + 1) * TAMANHO_DO_BLOCO;
            return true;
        }
    }

    return false;
}

function moverNoEixoY(corpo, dy) {
    corpo.y += dy;

    const colunaDaEsquerda = Math.floor(corpo.x / TAMANHO_DO_BLOCO);
    const colunaDaDireita = Math.floor((corpo.x + corpo.largura - EPSILON) / TAMANHO_DO_BLOCO);

    const bordaDaFrente = dy > 0 ? corpo.y + corpo.altura - EPSILON : corpo.y;
    const linha = Math.floor(bordaDaFrente / TAMANHO_DO_BLOCO);

    for (let coluna = colunaDaEsquerda; coluna <= colunaDaDireita; coluna++) {
        if (ehSolido(coluna, linha)) {
            corpo.y = dy > 0
                ? linha * TAMANHO_DO_BLOCO - corpo.altura
                : (linha + 1) * TAMANHO_DO_BLOCO;
            return true;
        }
    }

    return false;
}


// ============================================================
// 8. PERGUNTAS SOBRE UM BLOCO
// ============================================================
function blocoEm(coluna, linha) {
    if (linha < 0 || linha >= LINHAS || coluna < 0 || coluna >= COLUNAS) {
        return BLOCOS["#"];
    }

    return BLOCOS[sala.blocos[linha][coluna]];
}

function ehSolido(coluna, linha) {
    return blocoEm(coluna, linha).solido;
}


// ============================================================
// 9. DESENHAR
// ============================================================
function desenhar() {
    desenharFundo();
    desenharBlocos();
    desenharSoldado();

    if (mostrarCaixas) {
        desenharCaixas();
    }
}

function desenharFundo() {
    pincel.fillStyle = PALETA.painel;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = PALETA.juntaDoPainel;
    for (let x = 0; x < tela.width; x += 16) {
        pincel.fillRect(x, 0, 1, tela.height);
    }
    for (let y = 0; y < tela.height; y += 16) {
        pincel.fillRect(0, y, tela.width, 1);
    }
}

const DESENHOS_DE_BLOCO = {
    metal: desenharMetal,
    cano: desenharCano
};

function desenharBlocos() {
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const desenho = blocoEm(coluna, linha).desenho;

            if (desenho !== null) {
                DESENHOS_DE_BLOCO[desenho](coluna, linha);
            }
        }
    }
}

function desenharMetal(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;
    const lado = TAMANHO_DO_BLOCO;

    pincel.fillStyle = PALETA.metal;
    pincel.fillRect(x, y, lado, lado);

    const arEmCima = !ehSolido(coluna, linha - 1);
    const arEmbaixo = !ehSolido(coluna, linha + 1);
    const arAEsquerda = !ehSolido(coluna - 1, linha);
    const arADireita = !ehSolido(coluna + 1, linha);

    pincel.fillStyle = PALETA.metalEscuro;
    if (arEmbaixo) pincel.fillRect(x, y + lado - 1, lado, 1);
    if (arADireita) pincel.fillRect(x + lado - 1, y, 1, lado);

    pincel.fillStyle = PALETA.metalClaro;
    if (arEmCima) pincel.fillRect(x, y, lado, 1);
    if (arAEsquerda) pincel.fillRect(x, y, 1, lado);

    if (arEmCima || arEmbaixo || arAEsquerda || arADireita) {
        pincel.fillStyle = PALETA.rebite;
        pincel.fillRect(x + 3, y + 3, 1, 1);
    }
}

function desenharCano(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = PALETA.cano;
    pincel.fillRect(x + 2, y, 4, TAMANHO_DO_BLOCO);
    pincel.fillStyle = PALETA.canoClaro;
    pincel.fillRect(x + 3, y, 1, TAMANHO_DO_BLOCO);
    pincel.fillRect(x + 1, y + 6, 6, 1);
}

/*
  Olhando para a esquerda, o mesmo sprite, lido de trás para a frente.
  Nenhum desenho novo: só a ordem das colunas muda.
*/
function desenharSoldado() {
    const espelhado = soldado.olhandoPara < 0;
    desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, soldado.x - 1, soldado.y, espelhado);
}

function desenharSprite(sprite, cores, x, y, espelhado = false) {
    const inicioX = Math.round(x);
    const inicioY = Math.round(y);
    const largura = sprite[0].length;

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < largura; dx++) {
            const coluna = espelhado ? largura - 1 - dx : dx;
            const cor = cores[linhaDoDesenho[coluna]];

            if (!cor) {
                continue;
            }

            pincel.fillStyle = cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}

/*
  MOSTRE O INVISÍVEL (tecla H). A colisão não usa o desenho: usa a caixa.
  Em ciano, a caixa; em amarelo, os blocos que ela ocupa agora; e uma
  linha verde sob os pés quando `noChao` é verdade. Quando algo parecer
  errado — "ele ficou preso", "ele flutuou" —, é isto que se olha.
*/
function desenharCaixas() {
    const colunaDaEsquerda = Math.floor(soldado.x / TAMANHO_DO_BLOCO);
    const colunaDaDireita = Math.floor((soldado.x + soldado.largura - EPSILON) / TAMANHO_DO_BLOCO);
    const linhaDeCima = Math.floor(soldado.y / TAMANHO_DO_BLOCO);
    const linhaDeBaixo = Math.floor((soldado.y + soldado.altura - EPSILON) / TAMANHO_DO_BLOCO);

    pincel.strokeStyle = "rgba(255, 220, 60, 0.6)";
    pincel.lineWidth = 1;
    for (let linha = linhaDeCima; linha <= linhaDeBaixo; linha++) {
        for (let coluna = colunaDaEsquerda; coluna <= colunaDaDireita; coluna++) {
            pincel.strokeRect(coluna * TAMANHO_DO_BLOCO + 0.5, linha * TAMANHO_DO_BLOCO + 0.5, TAMANHO_DO_BLOCO - 1, TAMANHO_DO_BLOCO - 1);
        }
    }

    pincel.strokeStyle = "#3cf2ff";
    pincel.strokeRect(Math.round(soldado.x) + 0.5, Math.round(soldado.y) + 0.5, soldado.largura - 1, soldado.altura - 1);

    if (soldado.noChao) {
        pincel.fillStyle = "#4dff7a";
        pincel.fillRect(Math.round(soldado.x), Math.round(soldado.y + soldado.altura), soldado.largura, 1);
    }

    pincel.fillStyle = "#e2e8f5";
    pincel.font = "8px monospace";
    pincel.fillText(`vx ${soldado.vx.toFixed(0)}  vy ${soldado.vy.toFixed(0)}`, 12, 14);
}


// ============================================================
// 10. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
