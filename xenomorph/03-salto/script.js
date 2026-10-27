/*
  XENOMORPH — PASSO 3: O SALTO

  Pular é dar ao soldado uma velocidade para cima e deixar a gravidade
  do passo 2 fazer o resto. Uma linha. O que faz um pulo parecer BOM são
  as outras:

  1. O SALTO VARIÁVEL
     Segurar o botão vai mais alto; soltar cedo corta a subida. O jogador
     escolhe a altura com o dedo, sem botão extra (GDD, seção 4).

  2. OS PERDÕES INVISÍVEIS
     O "tempo de coiote" deixa pular por um instante depois de sair da
     beirada. O "pedido guardado" aceita o aperto que veio um pouco antes
     de tocar o chão. O jogador nunca percebe que foi perdoado — só sente
     que o jogo obedece.

  3. UM BLOCO QUE COLIDE DE UM LADO SÓ
     A plataforma de mão única: atravessa-se por baixo, pisa-se por cima,
     e com ↓ + pular desce-se por ela. Uma linha na tabela de blocos e uma
     condição na colisão.

  E a ESQUIVA: um arranque curto, em linha reta, que o GDD lista entre os
  movimentos básicos. No passo 5 ela vai ganhar o seu motivo de existir.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;

/*
  A SALA, redesenhada para pular. Os "-" são plataformas de mão única.

  Ela segue as REGRAS DE QUEM DESENHA SALAS, tiradas dos números de FISICA
  (seção 1): o salto mais alto sobe 4 blocos, então nenhum degrau tem mais
  de 3 — sobra um bloco de folga para quem não pular perfeito. Dá para
  subir do chão até a plataforma do canto de cima, à direita.
*/
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    "#..............|...............#",
    "#..............|...........---.#",
    "#....#####.....|...------......#",
    "#..............|...............#",
    "#..............|...............#",
    "#..........-------.............#",
    "#..............................#",
    "#####..........................#",
    "#...................------.....#",
    "#..............................#",
    "#.....|....................#####",
    "#.....|.........----...........#",
    "#.....|........................#",
    "#..@..|................####....#",
    "################################",
    "################################"
];

const COLUNAS = SALA_EM_TEXTO[0].length;
const LINHAS = SALA_EM_TEXTO.length;

/*
  A plataforma NÃO é sólida: para quem anda de lado ou sobe, ela é ar.
  O que ela tem é outra propriedade, `plataforma`, que a colisão consulta
  só num caso — corpo descendo, vindo de cima (seção 7).
*/
const BLOCOS = {
    "#": { solido: true, plataforma: false, desenho: "metal" },
    "-": { solido: false, plataforma: true, desenho: "plataforma" },
    "|": { solido: false, plataforma: false, desenho: "cano" },
    ".": { solido: false, plataforma: false, desenho: null }
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
    canoClaro: "#2f3c57",
    grade: "#3b4864",           // a plataforma: uma grade mais fina que o metal
    gradeClara: "#8a9cc0"
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
    frenagem: 1200,
    gravidade: 900,
    quedaMaxima: 260,

    /*
      NO AR, o controle é mais fraco: dá para corrigir o salto, mas não
      dar meia-volta instantânea. O GDD pede "controle aéreo ajustável" —
      são estes dois números.
    */
    aceleracaoNoAr: 600,
    frenagemNoAr: 350,

    /*
      O SALTO. A altura máxima sai da física do ensino médio:

          altura = velocidade² / (2 × gravidade) = 250² / 1800 ≈ 35 px

      Quadro a quadro a conta perde um pouco: na prática, 33 px — pouco
      mais de 4 blocos. Soltar o botão subindo multiplica a velocidade por
      `corteDoSalto`: um toque rápido sobe uns 9 px.
    */
    velocidadeDoSalto: 250,
    corteDoSalto: 0.45,

    /*
      Cair é mais pesado que subir. Com a mesma gravidade nos dois
      sentidos, o pulo parece flutuar no alto; com mais na descida, ele
      fica firme, e o soldado volta ao chão a tempo de reagir.
    */
    gravidadeNaDescida: 1300,

    // Os perdões (seção 7). Em segundos.
    tempoDeCoiote: 0.1,
    validadeDoPedido: 0.1,

    tempoAtravessando: 0.2,    // quanto tempo as plataformas ignoram quem desce por elas

    // A esquiva: 230 px/s por 0,15 s, e depois a freada: uns 40 px, 5 blocos.
    velocidadeDaEsquiva: 230,
    duracaoDaEsquiva: 0.15,
    recargaDaEsquiva: 0.5
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
    direita: ["arrowright", "d"],
    baixo: ["arrowdown", "s"],
    pular: [" ", "z", "k"],
    esquivar: ["shift", "c", "l"]
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
  Os campos novos são quase todos TEMPORIZADORES, em segundos — a ideia
  do atordoamento do Dealer? Out!: um número que desce até zero, e
  "está valendo" enquanto for maior que zero.
*/
const soldado = {
    x: sala.inicio.coluna * TAMANHO_DO_BLOCO + 1,
    y: (sala.inicio.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
    largura: LARGURA_DO_SOLDADO,
    altura: ALTURA_DO_SOLDADO,
    vx: 0,
    vy: 0,
    olhandoPara: 1,
    noChao: false,

    saltando: false,          // subindo por um salto que ainda pode ser cortado
    tempoDeCoiote: 0,         // ainda dá para pular, mesmo sem chão
    pedidoDeSalto: 0,         // um aperto de pular esperando a hora de virar salto
    atravessando: 0,          // descendo por uma plataforma: ela não segura

    esquiva: 0,               // quanto falta da esquiva em andamento
    recargaDaEsquiva: 0,
    pedidoDeEsquiva: 0,
    esquivaNoAr: true         // uma esquiva por salto; o chão devolve
};

/*
  O RASTRO da esquiva: cópias apagadas do soldado que somem sozinhas. Uma
  lista que nasce e morre, como as partículas do Dealer? Out!.
*/
let rastro = [];

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

/*
  Duas famílias de ação, como no Tetris:

  - SEGURAR (andar, mirar para baixo, segurar o salto): o loop consulta
    o painel de interruptores quando precisa.
  - APERTAR (pular, esquivar): o aperto vira um PEDIDO com prazo de
    validade. O loop atende o pedido assim que puder — e, se não puder
    em 0,1 s, ele expira (seção 7).
*/
document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    teclasPressionadas[tecla] = true;

    if (TECLAS_DO_JOGO.includes(tecla)) {
        evento.preventDefault();   // as setas não rolam a página; o Espaço não aperta botões
    }

    if (evento.repeat) {
        return;   // segurar a tecla não é apertar de novo
    }

    if (CONTROLES.pular.includes(tecla)) soldado.pedidoDeSalto = FISICA.validadeDoPedido;
    if (CONTROLES.esquivar.includes(tecla)) soldado.pedidoDeEsquiva = FISICA.validadeDoPedido;
    if (tecla === "h") mostrarCaixas = !mostrarCaixas;
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

/*
  A história de um quadro. Durante a esquiva, o soldado não corre, não
  pula e não cai: segue em linha reta até ela acabar.
*/
function atualizar(tempo) {
    descontarTemporizadores(tempo);

    if (soldado.esquiva > 0) {
        continuarEsquiva(tempo);
    } else {
        correr(tempo);
        tentarEsquivar();
        tentarSaltar();
        cortarSalto();
        cair(tempo);
    }

    moverComColisao(soldado, tempo);
    lembrarDoChao();
    atualizarRastro(tempo);
}

function descontarTemporizadores(tempo) {
    soldado.tempoDeCoiote = Math.max(0, soldado.tempoDeCoiote - tempo);
    soldado.pedidoDeSalto = Math.max(0, soldado.pedidoDeSalto - tempo);
    soldado.pedidoDeEsquiva = Math.max(0, soldado.pedidoDeEsquiva - tempo);
    soldado.atravessando = Math.max(0, soldado.atravessando - tempo);
    soldado.recargaDaEsquiva = Math.max(0, soldado.recargaDaEsquiva - tempo);
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
    const intencao = intencaoHorizontal();

    if (intencao !== 0) {
        soldado.olhandoPara = intencao;
    }

    const alvo = intencao * FISICA.velocidadeMaxima;
    const taxa = soldado.noChao
        ? (intencao !== 0 ? FISICA.aceleracao : FISICA.frenagem)
        : (intencao !== 0 ? FISICA.aceleracaoNoAr : FISICA.frenagemNoAr);

    soldado.vx = aproximar(soldado.vx, alvo, taxa * tempo);
}

function intencaoHorizontal() {
    let intencao = 0;

    if (acao("esquerda")) intencao -= 1;
    if (acao("direita")) intencao += 1;

    return intencao;
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
    const gravidade = soldado.vy < 0 ? FISICA.gravidade : FISICA.gravidadeNaDescida;
    soldado.vy = Math.min(soldado.vy + gravidade * tempo, FISICA.quedaMaxima);
}

/*
  O PEDIDO GUARDADO (em inglês, "jump buffer").

  O jogador aperta pular 3 quadros ANTES de tocar o chão. Para ele, apertou
  na hora; para o computador, apertou no ar. Sem perdão, o aperto se perde
  e o jogo "comeu o comando". Com perdão, o aperto vira um pedido que vale
  0,1 s: se nesse meio-tempo o soldado puder pular, ele pula.

  O TEMPO DE COIOTE (o nome vem do desenho animado em que o coiote corre
  para fora do penhasco e só cai quando olha para baixo).

  O jogador corre e aperta pular 3 quadros DEPOIS de sair da beirada. Para
  ele, ainda estava no chão. Então "poder pular" não é "estar no chão": é
  "ter estado no chão há menos de 0,1 s". Por isso a pergunta é feita ao
  temporizador, e não a `noChao`.

  E ↓ + pular sobre uma plataforma não é salto: é descer por ela.
*/
function tentarSaltar() {
    if (soldado.pedidoDeSalto <= 0) {
        return;
    }

    if (acao("baixo") && estaSobrePlataforma(soldado)) {
        soldado.atravessando = FISICA.tempoAtravessando;
        soldado.pedidoDeSalto = 0;
        return;
    }

    if (soldado.tempoDeCoiote <= 0) {
        return;   // nem no chão, nem acabou de sair dele: o pedido espera (e expira)
    }

    soldado.vy = -FISICA.velocidadeDoSalto;
    soldado.saltando = true;
    soldado.pedidoDeSalto = 0;
    soldado.tempoDeCoiote = 0;   // um salto por chão: o coiote não vale duas vezes
}

/*
  O SALTO VARIÁVEL: soltou o botão ainda subindo? A subida é cortada.

  Só uma vez por salto (`saltando` vira falso), e só subindo: soltar o
  botão na descida não muda nada.
*/
function cortarSalto() {
    if (soldado.saltando && soldado.vy < 0 && !acao("pular")) {
        soldado.vy *= FISICA.corteDoSalto;
        soldado.saltando = false;
    }

    if (soldado.vy >= 0) {
        soldado.saltando = false;
    }
}

/*
  Depois de mover: se há chão, o relógio do coiote é renovado (e a
  esquiva no ar, devolvida). Saindo do chão, ele começa a descer.
*/
function lembrarDoChao() {
    if (soldado.noChao) {
        soldado.tempoDeCoiote = FISICA.tempoDeCoiote;
        soldado.esquivaNoAr = true;
    }
}

function estaSobrePlataforma(corpo) {
    if (!corpo.noChao) {
        return false;
    }

    const linhaDosPes = Math.floor((corpo.y + corpo.altura + EPSILON) / TAMANHO_DO_BLOCO);
    const colunaDaEsquerda = Math.floor(corpo.x / TAMANHO_DO_BLOCO);
    const colunaDaDireita = Math.floor((corpo.x + corpo.largura - EPSILON) / TAMANHO_DO_BLOCO);
    let temPlataforma = false;

    for (let coluna = colunaDaEsquerda; coluna <= colunaDaDireita; coluna++) {
        const bloco = blocoEm(coluna, linhaDosPes);

        if (bloco.solido) {
            return false;   // um pé no metal: não dá para descer
        }
        if (bloco.plataforma) {
            temPlataforma = true;
        }
    }

    return temPlataforma;
}

/*
  A ESQUIVA: velocidade fixa na direção apertada (ou para onde olha), sem
  gravidade, por 0,15 s. No chão, sempre; no ar, uma vez por salto.

  Ao terminar, a velocidade é LIMITADA à de corrida: senão o soldado
  deslizaria muito além do arranque, freando com o controle fraco do ar.
*/
function tentarEsquivar() {
    if (soldado.pedidoDeEsquiva <= 0 || soldado.recargaDaEsquiva > 0) {
        return;
    }
    if (!soldado.noChao && !soldado.esquivaNoAr) {
        return;
    }

    const direcao = intencaoHorizontal() || soldado.olhandoPara;

    soldado.olhandoPara = direcao;
    soldado.vx = direcao * FISICA.velocidadeDaEsquiva;
    soldado.vy = 0;
    soldado.saltando = false;
    soldado.esquiva = FISICA.duracaoDaEsquiva;
    soldado.recargaDaEsquiva = FISICA.recargaDaEsquiva;
    soldado.pedidoDeEsquiva = 0;

    if (!soldado.noChao) {
        soldado.esquivaNoAr = false;
    }
}

function continuarEsquiva(tempo) {
    soldado.esquiva = Math.max(0, soldado.esquiva - tempo);
    soldado.vy = 0;

    rastro.push({ x: soldado.x, y: soldado.y, espelhado: soldado.olhandoPara < 0, vida: 0.15 });

    if (soldado.esquiva === 0) {
        soldado.vx = limitar(soldado.vx, -FISICA.velocidadeMaxima, FISICA.velocidadeMaxima);
    }
}

function atualizarRastro(tempo) {
    rastro.forEach(copia => {
        copia.vida -= tempo;
    });
    rastro = rastro.filter(copia => copia.vida > 0);
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

/*
  Em y entra a PLATAFORMA DE MÃO ÚNICA. Ela só segura quem:

  - está DESCENDO (dy > 0) — subindo, atravessa-se por baixo;
  - tinha os pés ACIMA dela antes deste pedaço de movimento — senão, quem
    pulou por baixo e está com metade do corpo dentro dela seria puxado
    para cima de repente;
  - não está ATRAVESSANDO de propósito (↓ + pular).

  Nenhuma dessas perguntas é feita em x: andando de lado, a plataforma é ar.
*/
function moverNoEixoY(corpo, dy) {
    corpo.y += dy;

    const colunaDaEsquerda = Math.floor(corpo.x / TAMANHO_DO_BLOCO);
    const colunaDaDireita = Math.floor((corpo.x + corpo.largura - EPSILON) / TAMANHO_DO_BLOCO);

    const bordaDaFrente = dy > 0 ? corpo.y + corpo.altura - EPSILON : corpo.y;
    const linha = Math.floor(bordaDaFrente / TAMANHO_DO_BLOCO);

    const pesAntes = corpo.y + corpo.altura - dy;
    const pisaNaPlataforma = dy > 0
        && corpo.atravessando <= 0
        && pesAntes <= linha * TAMANHO_DO_BLOCO + EPSILON;

    for (let coluna = colunaDaEsquerda; coluna <= colunaDaDireita; coluna++) {
        const bloco = blocoEm(coluna, linha);

        if (bloco.solido || (bloco.plataforma && pisaNaPlataforma)) {
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
    desenharRastro();
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
    plataforma: desenharPlataforma,
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
  A plataforma é FINA no desenho — só os 3 pixels de cima — para o
  jogador ler, sem manual, que ela é diferente do metal: dá para passar
  por baixo. A forma conta a regra.
*/
function desenharPlataforma(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = PALETA.grade;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 3);
    pincel.fillStyle = PALETA.gradeClara;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 1);

    // Os furos da grade, um sim, um não.
    pincel.fillStyle = PALETA.painel;
    for (let i = 1; i < TAMANHO_DO_BLOCO; i += 2) {
        pincel.fillRect(x + i, y + 2, 1, 1);
    }
}

function desenharSoldado() {
    const espelhado = soldado.olhandoPara < 0;
    desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, soldado.x - 1, soldado.y, espelhado);
}

/*
  O rastro é o mesmo sprite, todo numa cor só e meio transparente — mais
  apagado quanto mais velho. globalAlpha vale para tudo o que se pinta
  depois; por isso volta a 1 no fim.
*/
function desenharRastro() {
    rastro.forEach(copia => {
        pincel.globalAlpha = copia.vida / 0.15 * 0.5;
        desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, copia.x - 1, copia.y, copia.espelhado, "#3cf2ff");
    });
    pincel.globalAlpha = 1;
}

function desenharSprite(sprite, cores, x, y, espelhado = false, corUnica = null) {
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

            pincel.fillStyle = corUnica || cor;
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

    // Os perdões, como barras que encolhem: coiote (verde) e pedido de salto (amarelo).
    pincel.fillStyle = "#4dff7a";
    pincel.fillRect(12, 18, soldado.tempoDeCoiote / FISICA.tempoDeCoiote * 40, 2);
    pincel.fillStyle = "#ffdc3c";
    pincel.fillRect(12, 22, soldado.pedidoDeSalto / FISICA.validadeDoPedido * 40, 2);
}


// ============================================================
// 10. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
