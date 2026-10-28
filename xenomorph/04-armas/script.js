/*
  XENOMORPH — PASSO 4: AS ARMAS

  O soldado atira. Três ideias:

  1. MIRAR É UM VETOR
     Oito direções, e nenhuma delas tem código próprio. As setas viram
     um vetor (x, y) de comprimento 1, e o tiro sai com velocidade =
     vetor × rapidez. A diagonal sai tão rápida quanto a reta — a lição
     do Shoot 'em up, agora para mirar.

  2. A ARMA É UMA FICHA DE DADOS
     Dano, cadência, rapidez, alcance, pente, recarga, quantos projéteis
     por disparo e quão abertos. O rifle e a espingarda são duas linhas
     da tabela ARMAS, e o código que atira é um só (GDD, seção 4:
     "cada arma deve apresentar características próprias").

  3. ESTADO DA ARMA ≠ FICHA DA ARMA
     A ficha diz que o pente tem 24 tiros. Quantos SOBRAM agora é outra
     coisa: mora no equipamento do soldado, e muda a cada disparo. Duas
     armas equipadas, a mesma ficha poderia ser usada duas vezes.

  Os casulos na sala são alvos de treino: entidades nascidas de
  marcadores no texto da sala, que piscam ao levar um tiro e estouram.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;

/*
  A SALA do passo 3, com um marcador novo: cada "o" é um CASULO, um alvo
  de treino. Como o "@", ele é um recado de quem desenhou a sala.
*/
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    "#..............|...............#",
    "#..............|...........---.#",
    "#....#####.....|...------......#",
    "#..............|...............#",
    "#............o.|...............#",
    "#..........-------.............#",
    "#..............................#",
    "#####..................o.......#",
    "#...................------.....#",
    "#.............................o#",
    "#.....|....................#####",
    "#.....|.........----...........#",
    "#.....|........................#",
    "#..@..|.....o..........####....#",
    "################################",
    "################################"
];

const MARCADORES = ["@", "o"];

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

/*
  A arma saiu do desenho do corpo: agora ela aponta para onde se mira, e
  é desenhada à parte, como uma linha de pixels (desenharArma).
*/
const SPRITE_DO_SOLDADO = [
    "..ddd...",
    ".d###d..",
    ".d#vvv..",
    ".d###d..",
    "..ddd...",
    ".d###d..",
    ".d###d..",
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
/*
  AS ARMAS, como fichas. Unidades: dano em pontos de vida, tempos em
  segundos, rapidez em px/s, alcance em pixels, ângulos em radianos.

  - intervalo:  tempo mínimo entre dois disparos (a cadência);
  - projeteis:  quantos saem por disparo;
  - abertura:   o ângulo total do leque entre o primeiro e o último;
  - desvio:     um erro sorteado em cada projétil (0 = perfeito);
  - recuo:      quanto o disparo empurra o soldado para trás.

  O rifle é a arma equilibrada de média distância; a espingarda, a de
  perto — exatamente como o GDD descreve (seção 4). Compare as linhas:
  a diferença entre as duas armas É esta tabela.
*/
const ARMAS = {
    rifle: {
        nome: "Rifle de plasma",
        dano: 2,
        intervalo: 0.14,
        rapidez: 300,
        alcance: 200,
        pente: 24,
        tempoDeRecarga: 1.1,
        projeteis: 1,
        abertura: 0,
        desvio: 0.04,
        recuo: 0,
        cor: "#3cf2ff"
    },
    espingarda: {
        nome: "Espingarda magnética",
        dano: 2,
        intervalo: 0.6,
        rapidez: 260,
        alcance: 72,
        pente: 6,
        tempoDeRecarga: 1.5,
        projeteis: 6,
        abertura: 0.5,
        desvio: 0.05,
        recuo: 70,
        cor: "#ffcc33"
    }
};

const ARMAS_INICIAIS = ["rifle", "espingarda"];

const DURACAO_DO_CLARAO = 0.05;   // o lampejo no cano, em segundos

const SPRITE_DO_CASULO = [
    "..gggg..",
    ".gGGGGg.",
    "gGGggGGg",
    "gGgGGgGg",
    "gGGggGGg",
    "gGgGGgGg",
    ".gGGGGg.",
    ".gGggGg.",
    "..gggg..",
    ".gg..gg."
];
const CORES_DO_CASULO = { g: "#2f5b2a", G: "#7ad14a" };
const VIDA_DO_CASULO = 8;

const CONTROLES = {
    esquerda: ["arrowleft", "a"],
    direita: ["arrowright", "d"],
    cima: ["arrowup", "w"],
    baixo: ["arrowdown", "s"],
    pular: [" ", "z", "k"],
    esquivar: ["shift", "c", "l"],
    atirar: ["x", "j"],
    trocar: ["q"],
    recarregar: ["r"]
};


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const painel = document.getElementById("painel");
const itensDasArmas = [document.getElementById("arma-0"), document.getElementById("arma-1")];
const barraDeRecarga = document.getElementById("recarga");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
function verificarSala() {
    SALA_EM_TEXTO.forEach((linha, i) => {
        if (linha.length !== COLUNAS) {
            console.error(`Linha ${i} da sala tem ${linha.length} blocos; deveria ter ${COLUNAS}.`);
        }

        for (const caractere of linha) {
            if (!(caractere in BLOCOS) && !MARCADORES.includes(caractere)) {
                console.error(`Linha ${i} da sala tem um "${caractere}", que não está na tabela BLOCOS.`);
            }
        }
    });
}

/*
  Agora há mais de um tipo de marcador, e todos seguem o mesmo caminho:
  cada um vira um item da lista `marcadores` e, no lugar dele, fica ar.
  Quem precisar dos casulos filtra a lista; quem precisar do início, busca.
*/
function criarSala() {
    const blocos = SALA_EM_TEXTO.map(linha => linha.split(""));
    const marcadores = [];

    blocos.forEach((linha, l) => {
        linha.forEach((caractere, c) => {
            if (MARCADORES.includes(caractere)) {
                marcadores.push({ caractere, coluna: c, linha: l });
                linha[c] = ".";
            }
        });
    });

    const inicio = marcadores.find(marcador => marcador.caractere === "@");

    return { blocos, inicio, marcadores };
}

verificarSala();
const sala = criarSala();


// ============================================================
// 4. ESTADO
// ============================================================
/*
  Os campos novos são quase todos TEMPORIZADORES, em segundos — a ideia
  do pisca-pisca das linhas do Tetris: um número que desce até zero, e
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
  O EQUIPAMENTO: duas armas, cada uma com o que muda durante o jogo —
  quantos tiros sobram no pente e quanto falta da recarga. A ficha (o que
  NÃO muda) é consultada pelo `tipo`, em ARMAS.
*/
const equipamento = {
    armas: ARMAS_INICIAIS.map(criarArmaEquipada),
    ativa: 0
};

function criarArmaEquipada(tipo) {
    return { tipo, municao: ARMAS[tipo].pente, recarregando: 0 };
}

let tiros = [];
let particulas = [];
let casulos = sala.marcadores
    .filter(marcador => marcador.caractere === "o")
    .map(criarCasulo);

/*
  O casulo fica em pé no chão do seu bloco, como o soldado: o y é a borda
  de baixo do bloco menos a altura do desenho.
*/
function criarCasulo(marcador) {
    const largura = SPRITE_DO_CASULO[0].length;
    const altura = SPRITE_DO_CASULO.length;

    return {
        x: marcador.coluna * TAMANHO_DO_BLOCO,
        y: (marcador.linha + 1) * TAMANHO_DO_BLOCO - altura,
        largura,
        altura,
        vida: VIDA_DO_CASULO,
        piscando: 0
    };
}

let esperaDoProximoTiro = 0;   // a cadência: o acumulador do Shoot 'em up
let tempoDoClarao = 0;

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
    if (CONTROLES.trocar.includes(tecla)) trocarDeArma();
    if (CONTROLES.recarregar.includes(tecla)) comecarRecarga(armaAtiva());
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

    atualizarRecarga(tempo);
    atirar(tempo);
    moverTiros(tempo);
    atualizarCasulos(tempo);
    atualizarParticulas(tempo);
    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
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
// 8. AS ARMAS
// ============================================================
function armaAtiva() {
    return equipamento.armas[equipamento.ativa];
}

/*
  MIRAR É UM VETOR.

  As setas dão uma intenção em cada eixo (-1, 0 ou 1). Juntas, apontam
  para uma das oito direções — e, como no Shoot 'em up, a diagonal é
  NORMALIZADA (dividida pelo comprimento), para o tiro diagonal não sair
  mais rápido que o reto.

  Sem nenhuma seta, atira-se para onde o soldado olha. E para baixo só no
  ar: no chão, ↓ é o começo de "descer da plataforma", não de atirar no
  próprio pé.
*/
function direcaoDaMira() {
    const horizontal = intencaoHorizontal();
    let vertical = 0;

    if (acao("cima")) vertical -= 1;
    if (acao("baixo") && !soldado.noChao) vertical += 1;

    if (horizontal === 0 && vertical === 0) {
        return { x: soldado.olhandoPara, y: 0 };
    }

    const comprimento = Math.hypot(horizontal, vertical);
    return { x: horizontal / comprimento, y: vertical / comprimento };
}

/*
  De onde sai o tiro: do ombro, na altura do peito, um pouco à frente na
  direção da mira. É também de onde a arma é desenhada.
*/
function ombro() {
    return {
        x: soldado.x + soldado.largura / 2,
        y: soldado.y + 6
    };
}

/*
  A CADÊNCIA, com o acumulador do Shoot 'em up: cada disparo empurra a
  espera para a frente em `intervalo`; com o gatilho solto, a espera não
  acumula crédito (não fica negativa), e o primeiro tiro sai na hora.

  Sem munição, não atira: começa a recarregar sozinha.
*/
function atirar(tempo) {
    const arma = armaAtiva();
    const ficha = ARMAS[arma.tipo];

    esperaDoProximoTiro -= tempo;

    if (!acao("atirar") || soldado.esquiva > 0) {
        esperaDoProximoTiro = Math.max(esperaDoProximoTiro, 0);
        return;
    }

    if (arma.recarregando > 0) {
        return;
    }

    if (arma.municao === 0) {
        comecarRecarga(arma);
        return;
    }

    if (esperaDoProximoTiro > 0) {
        return;
    }

    disparar(ficha, direcaoDaMira());
    arma.municao -= 1;
    esperaDoProximoTiro += ficha.intervalo;

    if (arma.municao === 0) {
        comecarRecarga(arma);   // o último tiro já puxa o pente novo
    }

    atualizarPainel();
}

/*
  UM DISPARO, para qualquer ficha. O leque é o do Shoot 'em up: os
  projéteis espalhados por igual dentro da `abertura`, centrados na mira.
  Com um projétil só, a conta dá desvio zero — o rifle não é um caso
  especial, é um leque de um.

  Cada projétil leva consigo o que precisa para viver sozinho: a
  velocidade, o dano, quanto ainda pode voar e a cor. Depois de criado,
  ninguém mais consulta a ficha.
*/
function disparar(ficha, mira) {
    const origem = ombro();
    const anguloDaMira = Math.atan2(mira.y, mira.x);

    for (let i = 0; i < ficha.projeteis; i++) {
        const posicaoNoLeque = ficha.projeteis === 1 ? 0 : i / (ficha.projeteis - 1) - 0.5;
        const erro = (Math.random() - 0.5) * 2 * ficha.desvio;
        const angulo = anguloDaMira + posicaoNoLeque * ficha.abertura + erro;

        tiros.push({
            x: origem.x + mira.x * 5,
            y: origem.y + mira.y * 5,
            vx: Math.cos(angulo) * ficha.rapidez,
            vy: Math.sin(angulo) * ficha.rapidez,
            dano: ficha.dano,
            alcanceRestante: ficha.alcance,
            cor: ficha.cor,
            acertou: false
        });
    }

    // O recuo empurra só na horizontal: um coice, não um voo.
    soldado.vx -= mira.x * ficha.recuo;
    tempoDoClarao = DURACAO_DO_CLARAO;
}

/*
  A RECARGA é um temporizador da ARMA, não do soldado: cada arma lembra
  da sua. Trocar de arma no meio da recarga a CANCELA — o pente continua
  como estava. É uma escolha de projeto: trocar vira uma decisão com
  custo, e não um jeito de recarregar de graça.
*/
function comecarRecarga(arma) {
    const ficha = ARMAS[arma.tipo];

    if (arma.recarregando > 0 || arma.municao === ficha.pente) {
        return;
    }

    arma.recarregando = ficha.tempoDeRecarga;
    atualizarPainel();
}

function atualizarRecarga(tempo) {
    const arma = armaAtiva();

    if (arma.recarregando <= 0) {
        return;
    }

    arma.recarregando = Math.max(0, arma.recarregando - tempo);
    barraDeRecarga.value = 1 - arma.recarregando / ARMAS[arma.tipo].tempoDeRecarga;

    if (arma.recarregando === 0) {
        arma.municao = ARMAS[arma.tipo].pente;
        atualizarPainel();
    }
}

function trocarDeArma() {
    armaAtiva().recarregando = 0;
    equipamento.ativa = (equipamento.ativa + 1) % equipamento.armas.length;
    esperaDoProximoTiro = 0;
    atualizarPainel();
}

/*
  OS TIROS ANDAM EM PEDAÇOS, pela mesma razão que o soldado (passo 2): a
  300 px/s, um quadro lento anda 15 pixels, e um tiro inteiro poderia
  pular uma parede de 8. Cada pedaço tem no máximo meio bloco, e depois
  de cada um o tiro pergunta: entrei num bloco sólido? acertei um casulo?

  O tiro é um PONTO (x, y é o centro): pequeno demais para ser caixa. As
  plataformas de mão única não o seguram — elas só seguram pés.

  Um tiro que acerta alguma coisa é MARCADO (`acertou`); a lista só é
  filtrada no fim, fora do laço — nunca se mexe na lista que se percorre.
*/
function moverTiros(tempo) {
    tiros.forEach(tiro => {
        let restante = Math.hypot(tiro.vx, tiro.vy) * tempo;
        const direcaoX = tiro.vx / Math.hypot(tiro.vx, tiro.vy);
        const direcaoY = tiro.vy / Math.hypot(tiro.vx, tiro.vy);

        while (restante > 0 && !tiro.acertou) {
            const pedaco = Math.min(restante, PASSO_MAXIMO);
            restante -= pedaco;
            tiro.alcanceRestante -= pedaco;
            tiro.x += direcaoX * pedaco;
            tiro.y += direcaoY * pedaco;

            if (ehSolido(Math.floor(tiro.x / TAMANHO_DO_BLOCO), Math.floor(tiro.y / TAMANHO_DO_BLOCO))) {
                tiro.acertou = true;
                soltarFaiscas(tiro.x - direcaoX * 2, tiro.y - direcaoY * 2, tiro.cor, 4);
            } else {
                acertarCasulos(tiro);
            }
        }

        if (tiro.alcanceRestante <= 0 && !tiro.acertou) {
            tiro.acertou = true;
            soltarFaiscas(tiro.x, tiro.y, tiro.cor, 2);   // o tiro se dissipa no ar
        }
    });

    tiros = tiros.filter(tiro => !tiro.acertou);
}

function contemPonto(caixa, x, y) {
    return x >= caixa.x && x < caixa.x + caixa.largura
        && y >= caixa.y && y < caixa.y + caixa.altura;
}

function acertarCasulos(tiro) {
    const alvo = casulos.find(casulo => casulo.vida > 0 && contemPonto(casulo, tiro.x, tiro.y));

    if (!alvo) {
        return;
    }

    tiro.acertou = true;
    alvo.vida -= tiro.dano;
    alvo.piscando = 0.08;
    soltarFaiscas(tiro.x, tiro.y, CORES_DO_CASULO.G, 3);

    if (alvo.vida <= 0) {
        soltarFaiscas(alvo.x + alvo.largura / 2, alvo.y + alvo.altura / 2, CORES_DO_CASULO.G, 16);
    }
}

function atualizarCasulos(tempo) {
    casulos.forEach(casulo => {
        casulo.piscando = Math.max(0, casulo.piscando - tempo);
    });
    casulos = casulos.filter(casulo => casulo.vida > 0);
}

/*
  AS PARTÍCULAS, como no Shoot 'em up: nascem num ponto com velocidades
  sorteadas, caem um pouco, e morrem sozinhas. Não colidem com nada —
  ninguém repara, e custaria caro.
*/
function soltarFaiscas(x, y, cor, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const rapidez = 20 + Math.random() * 60;

        particulas.push({
            x, y,
            vx: Math.cos(angulo) * rapidez,
            vy: Math.sin(angulo) * rapidez - 20,
            vida: 0.2 + Math.random() * 0.25,
            cor
        });
    }
}

function atualizarParticulas(tempo) {
    particulas.forEach(particula => {
        particula.vy += 300 * tempo;
        particula.x += particula.vx * tempo;
        particula.y += particula.vy * tempo;
        particula.vida -= tempo;
    });
    particulas = particulas.filter(particula => particula.vida > 0);
}


// ============================================================
// 9. PERGUNTAS SOBRE UM BLOCO
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
// 10. DESENHAR
// ============================================================
function desenhar() {
    desenharFundo();
    desenharBlocos();
    desenharCasulos();
    desenharRastro();
    desenharSoldado();
    desenharArma();
    desenharTiros();
    desenharParticulas();

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
  A ARMA é uma linha de 5 pixels saindo do ombro na direção da mira:
  oito direções desenhadas com o mesmo laço. A ponta acende no clarão.
*/
function desenharArma() {
    const origem = ombro();
    const mira = direcaoDaMira();

    pincel.fillStyle = CORES_DO_SOLDADO.g;
    for (let i = 1; i <= 5; i++) {
        pincel.fillRect(Math.round(origem.x + mira.x * i - 0.5), Math.round(origem.y + mira.y * i - 0.5), 1, 1);
    }

    if (tempoDoClarao > 0) {
        pincel.fillStyle = "#ffffff";
        pincel.fillRect(Math.round(origem.x + mira.x * 6 - 1), Math.round(origem.y + mira.y * 6 - 1), 2, 2);
    }
}

/*
  Um tiro é um traço de 3 pixels apontado para trás: o olho lê a direção
  e a rapidez sem precisar de sprite.
*/
function desenharTiros() {
    tiros.forEach(tiro => {
        const rapidez = Math.hypot(tiro.vx, tiro.vy);
        pincel.fillStyle = tiro.cor;
        for (let i = 0; i < 3; i++) {
            pincel.fillRect(
                Math.round(tiro.x - tiro.vx / rapidez * i),
                Math.round(tiro.y - tiro.vy / rapidez * i),
                1, 1
            );
        }
    });
}

function desenharParticulas() {
    particulas.forEach(particula => {
        pincel.fillStyle = particula.cor;
        pincel.fillRect(Math.round(particula.x), Math.round(particula.y), 1, 1);
    });
}

/*
  Levando tiro, o casulo pisca em branco por um instante: o jogador SABE
  que acertou, mesmo sem número na tela.
*/
function desenharCasulos() {
    casulos.forEach(casulo => {
        const corUnica = casulo.piscando > 0 ? "#ffffff" : null;
        desenharSprite(SPRITE_DO_CASULO, CORES_DO_CASULO, casulo.x, casulo.y, false, corUnica);
    });
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
// 11. O PAINEL
// ============================================================
/*
  O painel só é refeito quando algo muda (um disparo, uma troca, uma
  recarga que termina) — não a cada quadro. A barra de recarga é a
  exceção: ela anda sozinha, em atualizarRecarga.
*/
function atualizarPainel() {
    equipamento.armas.forEach((arma, i) => {
        const item = itensDasArmas[i];
        item.querySelector(".nome-da-arma").textContent = ARMAS[arma.tipo].nome;
        item.querySelector(".municao").textContent = `${arma.municao}/${ARMAS[arma.tipo].pente}`;
        item.setAttribute("aria-current", String(i === equipamento.ativa));
    });

    const recarregando = armaAtiva().recarregando > 0;
    painel.classList.toggle("recarregando", recarregando);
    if (!recarregando) {
        barraDeRecarga.value = 0;
    }
}


// ============================================================
// 12. LIGAR
// ============================================================
atualizarPainel();
requestAnimationFrame(quadroAQuadro);
