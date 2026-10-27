/*
  XENOMORPH — PASSO 5: AS CRIATURAS

  Os casulos se abriram. Três espécies, e o GDD quer de cada uma um
  "comportamento distinto" e uma "inteligência artificial baseada em
  estados" (seção 4). Três ideias:

  1. UMA MÁQUINA DE ESTADOS EM CADA CRIATURA
     Como o chefe do Shoot 'em up, mas em todas, e com o mesmo motor: a
     criatura está sempre em exatamente um estado, cada estado é uma
     função, e trocar de estado zera o relógio do estado.

  2. NÚMEROS NUMA TABELA, COMPORTAMENTO EM FUNÇÕES
     A ficha de cada espécie (vida, visão, rapidez, tempos) é dado puro.
     O que ela FAZ em cada estado é código. Separar os dois deixa ajustar
     uma criatura sem ler o comportamento — e escrever outra reaproveitando
     os números.

  3. O MESMO CORPO PARA TODOS
     As criaturas caem, batem em paredes e pisam em plataformas pela MESMA
     função do soldado, moverComColisao. Nenhuma linha de física nova
     (GDD, seção 12: "evite duplicar código para cada tipo de inimigo").

  E o soldado agora tem vida: cada ferida o empurra, deixa-o invulnerável
  por um instante e pisca. A esquiva do passo 3 ganha o seu motivo: nada
  fere durante ela.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;

/*
  A SALA, com três marcadores novos no lugar dos casulos:

      r   rastejador        s   saltador        c   cuspidora
*/
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    "#..............|...............#",
    "#......c.......|...........---.#",
    "#....#####.....|...------......#",
    "#..............|...............#",
    "#............r.|...............#",
    "#..........-------.............#",
    "#..............................#",
    "#####..................s.......#",
    "#...................------.....#",
    "#.............................c#",
    "#.....|....................#####",
    "#.....|.........----...........#",
    "#.....|........................#",
    "#..@..|.........r.r....####....#",
    "################################",
    "################################"
];

const MARCADORES = ["@", "r", "s", "c"];

const ESPECIE_DO_MARCADOR = { r: "rastejador", s: "saltador", c: "cuspidora" };

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
  - recuo:      quanto o disparo empurra o soldado para trás;
  - empurrao:   quanto cada projétil empurra a criatura que acerta.

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
        empurrao: 15,
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
        empurrao: 45,
        cor: "#ffcc33"
    }
};

const ARMAS_INICIAIS = ["rifle", "espingarda"];

const DURACAO_DO_CLARAO = 0.05;   // o lampejo no cano, em segundos

// ---------- O soldado ferido ----------
const VIDA_DO_SOLDADO = 100;
const DURACAO_DA_INVULNERABILIDADE = 0.9;   // depois de uma ferida, nada fere por um instante
const EMPURRAO_DA_FERIDA = { x: 110, y: 150 };

/*
  AS CRIATURAS, como fichas: só NÚMEROS e desenhos. O que cada uma faz
  com eles está nos COMPORTAMENTOS (seção 9), em código.

  Unidades de sempre: pixels, segundos, px/s. `visao` é a distância até
  onde a criatura percebe o soldado — se nada sólido estiver no caminho.
*/
const CRIATURAS = {
    /*
      O RASTEJADOR ataca em grupo e tenta cercar (GDD, seção 4). Patrulha
      devagar; vendo o soldado, corre atrás — mas cada um mira num LADO
      dele, e o grupo se divide sozinho.
    */
    rastejador: {
        largura: 8,
        altura: 5,
        vida: 4,
        danoDeContato: 10,
        velocidade: 26,
        velocidadeDePerseguicao: 58,
        impulsoDoPulinho: 190,     // para subir um degrau correndo atrás de alguém
        visao: 96,
        paciencia: 1.5,            // quanto tempo sem ver o soldado até desistir de perseguir
        estadoInicial: "patrulha",
        quadros: [
            [
                "...cccc.",
                ".ccCCCCo",
                "cCCCCCCc",
                ".c.c.c.c",
                "c.c.c.c."
            ],
            [
                "...cccc.",
                ".ccCCCCo",
                "cCCCCCCc",
                "c.c.c.c.",
                ".c.c.c.c"
            ]
        ],
        cores: { c: "#3a2440", C: "#7b3f8c", o: "#ff5a3c" }
    },

    /*
      O SALTADOR persegue e ataca em arcos. Espera; vendo o soldado perto,
      AGACHA (o aviso), e salta numa parábola calculada para cair onde o
      soldado estava. Depois do pouso, fica um instante parado: a janela
      para revidar.
    */
    saltador: {
        largura: 9,
        altura: 7,
        vida: 7,
        danoDeContato: 16,
        visao: 104,
        tempoDePreparo: 0.45,
        tempoDeVoo: 0.6,
        rapidezMaximaDoBote: 150,
        tempoDeRecuperacao: 0.7,
        estadoInicial: "espreita",
        quadros: [
            [
                "....ccc..",
                "..ccCCCco",
                ".cCCCCCCc",
                "cCCCCCCc.",
                "..cCCc...",
                ".cc..cc..",
                "c.....c.."
            ],
            [
                ".........",
                "....ccc..",
                "..ccCCCco",
                ".cCCCCCCc",
                "cCCCCCCcc",
                "ccc..ccc.",
                "c.c..c.c."
            ]
        ],
        cores: { c: "#4a2a1c", C: "#c4632f", o: "#ffe14d" }
    },

    /*
      A CUSPIDORA mantém distância e controla áreas. Vendo o soldado de
      longe, MIRA (o saco de ácido acende) e cospe numa parábola. O ácido
      que cai no chão vira uma poça que queima por alguns segundos. Com o
      soldado perto demais, ela recua.
    */
    cuspidora: {
        largura: 8,
        altura: 10,
        vida: 6,
        danoDeContato: 8,
        visao: 150,
        distanciaSegura: 40,
        velocidadeDeRecuo: 30,
        tempoDeMira: 0.6,
        intervaloEntreCuspes: 1.6,
        tempoDeVooDoCuspe: 0.75,
        estadoInicial: "vigia",
        quadros: [
            [
                "..aaaa..",
                ".aAAAAa.",
                "aAAooAAa",
                "aAAAAAAa",
                ".aAAAAa.",
                "..cCCc..",
                "..cCCc..",
                ".cCCCCc.",
                "cCc..cCc",
                "c......c"
            ]
        ],
        cores: { a: "#2f5b2a", A: "#7ad14a", o: "#d8ff6a", c: "#3a2440", C: "#6b3a78" }
    }
};

/*
  O ÁCIDO: um projétil com gravidade (cai em arco) que, ao tocar o chão,
  vira uma POÇA. A poça é a "área controlada" do GDD: um lugar onde não
  se pode ficar.
*/
const ACIDO = {
    gravidade: 500,
    dano: 12,
    cor: "#b8ff3c",
    larguraDaPoca: 14,
    duracaoDaPoca: 3,
    danoDaPoca: 6
};

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
const barraDeVida = document.getElementById("vida");
const itensDasArmas = [document.getElementById("arma-0"), document.getElementById("arma-1")];
const barraDeRecarga = document.getElementById("recarga");

const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");
const botaoRecomecar = document.getElementById("botao-recomecar");


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
  Quem precisar das criaturas filtra a lista; quem precisar do início, busca.
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
  O soldado agora nasce de uma FÁBRICA: recomeçar a partida é chamar
  criarSoldado() de novo, e é impossível esquecer um campo (a lição do
  Dealer? Out!). Os campos são quase todos temporizadores, em segundos.
*/
let soldado = criarSoldado();

function criarSoldado() {
    return {
        x: sala.inicio.coluna * TAMANHO_DO_BLOCO + 1,
        y: (sala.inicio.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
        largura: LARGURA_DO_SOLDADO,
        altura: ALTURA_DO_SOLDADO,
        vx: 0,
        vy: 0,
        olhandoPara: 1,
        noChao: false,
        bateuNaParede: false,

        vida: VIDA_DO_SOLDADO,
        invulneravel: 0,

        saltando: false,          // subindo por um salto que ainda pode ser cortado
        tempoDeCoiote: 0,         // ainda dá para pular, mesmo sem chão
        pedidoDeSalto: 0,         // um aperto de pular esperando a hora de virar salto
        atravessando: 0,          // descendo por uma plataforma: ela não segura

        esquiva: 0,               // quanto falta da esquiva em andamento
        recargaDaEsquiva: 0,
        pedidoDeEsquiva: 0,
        esquivaNoAr: true         // uma esquiva por salto; o chão devolve
    };
}

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
let criaturas = criarCriaturas();
let acido = [];   // os projéteis das cuspidoras, em voo
let pocas = [];   // o ácido que caiu e ainda queima

/*
  O JOGO TEM ESTADOS de novo, como no Pong: "jogando" ou "fim". Só dois,
  por enquanto — o menu e a pausa chegam no final.
*/
let estado = "jogando";
let tempoTotal = 0;   // o relógio do jogo: anima as pernas dos rastejadores

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

    if (TECLAS_DO_JOGO.includes(tecla) && estado === "jogando") {
        evento.preventDefault();   // as setas não rolam a página; o Espaço não aperta botões
    }

    if (evento.repeat) {
        return;   // segurar a tecla não é apertar de novo
    }

    if (estado !== "jogando") {
        return;   // no fim, Enter e Espaço ficam com o botão de recomeçar
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

    if (estado === "jogando") {
        atualizar(tempo);
    }
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

/*
  A história de um quadro. Durante a esquiva, o soldado não corre, não
  pula e não cai: segue em linha reta até ela acabar.
*/
function atualizar(tempo) {
    tempoTotal += tempo;
    descontarTemporizadores(tempo);

    if (soldado.esquiva > 0) {
        continuarEsquiva(tempo);
    } else {
        correr(tempo);
        tentarEsquivar();
        tentarSaltar();
        cortarSalto();
        cair(soldado, tempo, FISICA.gravidade, FISICA.gravidadeNaDescida);
    }

    moverComColisao(soldado, tempo);
    lembrarDoChao();
    atualizarRastro(tempo);

    atualizarRecarga(tempo);
    atirar(tempo);
    moverTiros(tempo);

    atualizarCriaturas(tempo);
    moverAcido(tempo);
    atualizarPocas(tempo);
    verificarContatos();

    atualizarParticulas(tempo);
    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
}

function descontarTemporizadores(tempo) {
    soldado.tempoDeCoiote = Math.max(0, soldado.tempoDeCoiote - tempo);
    soldado.pedidoDeSalto = Math.max(0, soldado.pedidoDeSalto - tempo);
    soldado.pedidoDeEsquiva = Math.max(0, soldado.pedidoDeEsquiva - tempo);
    soldado.atravessando = Math.max(0, soldado.atravessando - tempo);
    soldado.recargaDaEsquiva = Math.max(0, soldado.recargaDaEsquiva - tempo);
    soldado.invulneravel = Math.max(0, soldado.invulneravel - tempo);
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
  o piso que, quadro após quadro, devolve a velocidade a zero.

  Agora vale para qualquer corpo. O soldado cai mais pesado do que sobe
  (passo 3); as criaturas usam uma gravidade só — é o que deixa o
  saltador calcular a parábola do bote com a conta simples (seção 9).
*/
function cair(corpo, tempo, gravidadeSubindo, gravidadeDescendo = gravidadeSubindo) {
    const gravidade = corpo.vy < 0 ? gravidadeSubindo : gravidadeDescendo;
    corpo.vy = Math.min(corpo.vy + gravidade * tempo, FISICA.quedaMaxima);
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

  `noChao` sai daqui: se o movimento para baixo foi barrado, há chão. E
  `bateuNaParede`, pelo mesmo raciocínio — as criaturas do passo 5 usam
  para dar meia-volta.
*/
function moverComColisao(corpo, tempo) {
    let restanteX = corpo.vx * tempo;
    let restanteY = corpo.vy * tempo;

    corpo.noChao = false;
    corpo.bateuNaParede = false;

    while (restanteX !== 0 || restanteY !== 0) {
        const pedacoX = limitar(restanteX, -PASSO_MAXIMO, PASSO_MAXIMO);
        const pedacoY = limitar(restanteY, -PASSO_MAXIMO, PASSO_MAXIMO);
        restanteX -= pedacoX;
        restanteY -= pedacoY;

        if (pedacoX !== 0 && moverNoEixoX(corpo, pedacoX)) {
            corpo.vx = 0;
            corpo.bateuNaParede = true;
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

    if (!acao("atirar") || soldado.esquiva > 0 || estado !== "jogando") {
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
            empurrao: ficha.empurrao,
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
  de cada um o tiro pergunta: entrei num bloco sólido? acertei uma criatura?

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
                acertarCriaturas(tiro);
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

/*
  AS PARTÍCULAS, como no Dealer? Out!: nascem num ponto com velocidades
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
// 9. AS CRIATURAS
// ============================================================
/*
  Cada criatura nasce de um marcador, com um CORPO igual ao do soldado
  (x, y, largura, altura, vx, vy, noChao...) — é isso que deixa a mesma
  moverComColisao servir a todos.

  `lado` alterna entre -1 e 1, na ordem em que os rastejadores aparecem
  na sala: é o lado do soldado que cada um vai tentar ocupar (seção 9).
*/
function criarCriaturas() {
    return sala.marcadores
        .filter(marcador => marcador.caractere in ESPECIE_DO_MARCADOR)
        .map((marcador, i) => criarCriatura(ESPECIE_DO_MARCADOR[marcador.caractere], marcador, i % 2 === 0 ? -1 : 1));
}

function criarCriatura(especie, marcador, lado) {
    const ficha = CRIATURAS[especie];

    return {
        especie,
        x: marcador.coluna * TAMANHO_DO_BLOCO + (TAMANHO_DO_BLOCO - ficha.largura) / 2,
        y: (marcador.linha + 1) * TAMANHO_DO_BLOCO - ficha.altura,
        largura: ficha.largura,
        altura: ficha.altura,
        vx: 0,
        vy: 0,
        noChao: false,
        bateuNaParede: false,
        atravessando: 0,
        olhandoPara: -1,

        vida: ficha.vida,
        estado: ficha.estadoInicial,
        tempoNoEstado: 0,
        piscando: 0,
        atordoada: 0,           // levando um empurrão: o comportamento espera
        lado,
        tempoSemVer: 0,
        ultimaPosicaoVista: null,
        recarga: 0              // a espera da cuspidora entre um cuspe e outro
    };
}

/*
  O MOTOR DE ESTADOS, igual para todas:

  1. o relógio do estado anda;
  2. o comportamento do estado atual decide (muda vx, cospe, troca de
     estado...) — a não ser que a criatura esteja atordoada por um tiro;
  3. a gravidade e a colisão, as mesmas do soldado.

  Os comportamentos moram numa tabela de tabelas: espécie → estado →
  função. Uma espécie nova é uma entrada nova; um estado novo, uma função
  nova. O motor não muda.
*/
const COMPORTAMENTOS = {
    rastejador: {
        patrulha: rastejadorPatrulha,
        perseguicao: rastejadorPersegue,
        investigacao: rastejadorInvestiga
    },
    saltador: {
        espreita: saltadorEspreita,
        preparo: saltadorPrepara,
        bote: saltadorSalta,
        recuperacao: saltadorSeRecupera
    },
    cuspidora: {
        vigia: cuspidoraVigia,
        mira: cuspidoraMira,
        recuo: cuspidoraRecua
    }
};

function atualizarCriaturas(tempo) {
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];

        criatura.tempoNoEstado += tempo;
        criatura.piscando = Math.max(0, criatura.piscando - tempo);
        criatura.atordoada = Math.max(0, criatura.atordoada - tempo);
        criatura.recarga = Math.max(0, criatura.recarga - tempo);

        if (criatura.atordoada > 0) {
            criatura.vx = aproximar(criatura.vx, 0, 400 * tempo);
        } else {
            COMPORTAMENTOS[criatura.especie][criatura.estado](criatura, ficha, tempo);
        }

        cair(criatura, tempo, FISICA.gravidade);
        moverComColisao(criatura, tempo);
    });

    criaturas = criaturas.filter(criatura => criatura.vida > 0);
}

/*
  Trocar de estado é SEMPRE por aqui: assim é impossível esquecer de zerar
  o relógio do estado (a lição do chefe no Shoot 'em up).
*/
function mudarEstado(criatura, novoEstado) {
    criatura.estado = novoEstado;
    criatura.tempoNoEstado = 0;
}

// ---------- Perguntas que todas fazem ----------
function centro(corpo) {
    return { x: corpo.x + corpo.largura / 2, y: corpo.y + corpo.altura / 2 };
}

function distanciaAteOSoldado(criatura) {
    const a = centro(criatura);
    const b = centro(soldado);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function ladoDoSoldado(criatura) {
    return Math.sign(centro(soldado).x - centro(criatura).x) || 1;
}

/*
  ENXERGAR = perto o bastante E nada sólido no caminho.

  O caminho é conferido em pontos a cada 4 pixels, do olho da criatura ao
  centro do soldado — os mesmos pedaços de meio bloco dos tiros. As
  plataformas de grade não tapam a vista (não são `solido`): a tabela de
  blocos respondendo mais uma pergunta.
*/
function enxerga(criatura, ficha) {
    if (distanciaAteOSoldado(criatura) > ficha.visao) {
        return false;
    }
    return caminhoLivre(centro(criatura), centro(soldado));
}

function caminhoLivre(de, ate) {
    const distancia = Math.hypot(ate.x - de.x, ate.y - de.y);
    const pedacos = Math.ceil(distancia / PASSO_MAXIMO);

    for (let i = 1; i < pedacos; i++) {
        const x = de.x + (ate.x - de.x) * i / pedacos;
        const y = de.y + (ate.y - de.y) * i / pedacos;

        if (ehSolido(Math.floor(x / TAMANHO_DO_BLOCO), Math.floor(y / TAMANHO_DO_BLOCO))) {
            return false;
        }
    }
    return true;
}

/*
  Há chão logo à frente? Olha o bloco abaixo do primeiro pixel depois da
  borda da frente. Plataforma conta como chão.
*/
function temChaoAFrente(corpo, direcao) {
    const xDaFrente = direcao > 0 ? corpo.x + corpo.largura : corpo.x - 1;
    const coluna = Math.floor(xDaFrente / TAMANHO_DO_BLOCO);
    const linha = Math.floor((corpo.y + corpo.altura + 1) / TAMANHO_DO_BLOCO);
    const bloco = blocoEm(coluna, linha);

    return bloco.solido || bloco.plataforma;
}

function andar(criatura, direcao, rapidez) {
    criatura.olhandoPara = direcao;
    criatura.vx = direcao * rapidez;
}

// ---------- O rastejador ----------
/*
  PATRULHA: anda devagar e dá meia-volta na parede ou na beirada. Vendo o
  soldado, persegue.
*/
function rastejadorPatrulha(criatura, ficha) {
    if (criatura.noChao && (criatura.bateuNaParede || !temChaoAFrente(criatura, criatura.olhandoPara))) {
        criatura.olhandoPara *= -1;
    }

    andar(criatura, criatura.olhandoPara, ficha.velocidade);

    if (enxerga(criatura, ficha)) {
        comecarPerseguicao(criatura);
    }
}

function comecarPerseguicao(criatura) {
    criatura.ultimaPosicaoVista = centro(soldado);
    criatura.tempoSemVer = 0;
    mudarEstado(criatura, "perseguicao");
}

/*
  PERSEGUIÇÃO, com o truque do Pac-Man: o alvo NÃO é o soldado, é um
  ponto ao LADO dele — à esquerda para uns, à direita para outros
  (`lado`). Um grupo que vem todo pela esquerda se divide sozinho: metade
  passa por baixo dele para chegar ao lado direito. Ninguém combinou nada;
  cada um só segue a sua regra, e o soldado se vê cercado.

  Bateu num degrau correndo? Um pulinho. Perdeu o soldado de vista por
  mais que a `paciencia`? Vai investigar onde o viu pela última vez.
*/
function rastejadorPersegue(criatura, ficha, tempo) {
    if (enxerga(criatura, ficha)) {
        criatura.tempoSemVer = 0;
        criatura.ultimaPosicaoVista = centro(soldado);
    } else {
        criatura.tempoSemVer += tempo;
    }

    if (criatura.tempoSemVer > ficha.paciencia) {
        mudarEstado(criatura, "investigacao");
        return;
    }

    const alvoX = criatura.ultimaPosicaoVista.x + criatura.lado * 5;
    const distancia = alvoX - centro(criatura).x;

    if (Math.abs(distancia) < 1) {
        criatura.vx = 0;
    } else {
        andar(criatura, Math.sign(distancia), ficha.velocidadeDePerseguicao);
    }

    if (criatura.bateuNaParede && criatura.noChao) {
        criatura.vy = -ficha.impulsoDoPulinho;
    }
}

/*
  INVESTIGAÇÃO: vai até onde viu o soldado pela última vez. Chegou, ou
  cansou (3 s)? Volta a patrulhar. Viu de novo? Persegue.
*/
function rastejadorInvestiga(criatura, ficha) {
    if (enxerga(criatura, ficha)) {
        comecarPerseguicao(criatura);
        return;
    }

    const distancia = criatura.ultimaPosicaoVista.x - centro(criatura).x;

    if (Math.abs(distancia) < 4 || criatura.tempoNoEstado > 3 || criatura.bateuNaParede) {
        criatura.tempoSemVer = 0;
        mudarEstado(criatura, "patrulha");
        return;
    }

    andar(criatura, Math.sign(distancia), ficha.velocidade);
}

// ---------- O saltador ----------
function saltadorEspreita(criatura, ficha) {
    criatura.vx = 0;

    if (enxerga(criatura, ficha) && criatura.noChao) {
        criatura.olhandoPara = ladoDoSoldado(criatura);
        mudarEstado(criatura, "preparo");
    }
}

/*
  PREPARO: o AVISO. Agachado, parado, por 0,45 s. É o "telegrafar" do
  chefe do Shoot 'em up, numa criatura comum: quem presta atenção tem
  tempo de esquivar.
*/
function saltadorPrepara(criatura, ficha) {
    criatura.vx = 0;
    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (criatura.tempoNoEstado >= ficha.tempoDePreparo) {
        lancarBote(criatura, ficha);
        mudarEstado(criatura, "bote");
    }
}

/*
  O BOTE É UMA PARÁBOLA CALCULADA.

  Quer-se cair onde o soldado está, em T segundos. Sem nada no caminho, a
  física diz:

      x(T) = x + vx·T                 →  vx = dx / T
      y(T) = y + vy·T + g·T²/2        →  vy = dy / T − g·T / 2

  Com dy = 0 (mesma altura) e T = 0,6 s, vy = −270: um arco que sobe uns
  40 pixels. É por isso que as criaturas usam uma gravidade só — com duas,
  esta conta não fecharia.

  O alvo é onde o soldado ESTAVA no fim do aviso. Quem se mexe durante o
  voo não é acertado: a parábola não corrige o rumo no ar.
*/
function lancarBote(criatura, ficha) {
    const tempoDeVoo = ficha.tempoDeVoo;
    const dx = centro(soldado).x - centro(criatura).x;
    const dy = (soldado.y + soldado.altura) - (criatura.y + criatura.altura);

    criatura.vx = limitar(dx / tempoDeVoo, -ficha.rapidezMaximaDoBote, ficha.rapidezMaximaDoBote);
    criatura.vy = dy / tempoDeVoo - FISICA.gravidade * tempoDeVoo / 2;
}

function saltadorSalta(criatura) {
    // No ar, quem manda é a física. Só se espera o pouso.
    if (criatura.noChao && criatura.tempoNoEstado > 0.1) {
        criatura.vx = 0;
        mudarEstado(criatura, "recuperacao");
    }
}

function saltadorSeRecupera(criatura, ficha) {
    criatura.vx = 0;

    if (criatura.tempoNoEstado >= ficha.tempoDeRecuperacao) {
        mudarEstado(criatura, "espreita");
    }
}

// ---------- A cuspidora ----------
function cuspidoraVigia(criatura, ficha) {
    criatura.vx = 0;

    if (!enxerga(criatura, ficha)) {
        return;
    }

    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (distanciaAteOSoldado(criatura) < ficha.distanciaSegura) {
        mudarEstado(criatura, "recuo");
    } else if (criatura.recarga === 0) {
        mudarEstado(criatura, "mira");
    }
}

function cuspidoraMira(criatura, ficha) {
    criatura.vx = 0;
    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (criatura.tempoNoEstado >= ficha.tempoDeMira) {
        cuspir(criatura, ficha);
        criatura.recarga = ficha.intervaloEntreCuspes;
        mudarEstado(criatura, "vigia");
    }
}

/*
  RECUO: anda para longe do soldado por meio segundo — se houver chão. Sem
  chão atrás, fica onde está: uma cuspidora não se joga de uma plataforma.
*/
function cuspidoraRecua(criatura, ficha) {
    const paraLonge = -ladoDoSoldado(criatura);

    if (temChaoAFrente(criatura, paraLonge)) {
        criatura.vx = paraLonge * ficha.velocidadeDeRecuo;
    } else {
        criatura.vx = 0;
    }
    criatura.olhandoPara = -paraLonge;

    if (criatura.tempoNoEstado > 0.6) {
        mudarEstado(criatura, "vigia");
    }
}

/*
  O cuspe usa a MESMA conta do bote do saltador, com a gravidade do ácido
  e mirando nos pés do soldado. Mesmo errando, o ácido cai perto — e vira
  poça bem onde o soldado queria ficar.
*/
function cuspir(criatura, ficha) {
    const tempoDeVoo = ficha.tempoDeVooDoCuspe;
    const origem = { x: centro(criatura).x, y: criatura.y + 2 };
    const alvo = { x: centro(soldado).x, y: soldado.y + soldado.altura - 2 };

    acido.push({
        x: origem.x,
        y: origem.y,
        vx: (alvo.x - origem.x) / tempoDeVoo,
        vy: (alvo.y - origem.y) / tempoDeVoo - ACIDO.gravidade * tempoDeVoo / 2,
        acertou: false
    });
}

/*
  O ácido anda em pedaços (como os tiros) e cai (como os corpos). Acertou o
  soldado: fere. Acertou um bloco vindo de cima: vira poça EM CIMA dele.
  Acertou de lado ou por baixo: só respinga.
*/
function moverAcido(tempo) {
    acido.forEach(gota => {
        gota.vy += ACIDO.gravidade * tempo;
        let restante = Math.hypot(gota.vx, gota.vy) * tempo;
        const rapidez = Math.hypot(gota.vx, gota.vy);

        while (restante > 0 && !gota.acertou) {
            const pedaco = Math.min(restante, PASSO_MAXIMO);
            restante -= pedaco;
            gota.x += gota.vx / rapidez * pedaco;
            gota.y += gota.vy / rapidez * pedaco;

            const coluna = Math.floor(gota.x / TAMANHO_DO_BLOCO);
            const linha = Math.floor(gota.y / TAMANHO_DO_BLOCO);
            const bloco = blocoEm(coluna, linha);

            if (contemPonto(soldado, gota.x, gota.y)) {
                gota.acertou = true;
                ferirSoldado(ACIDO.dano, gota.x);
            } else if (bloco.solido || (bloco.plataforma && gota.vy > 0)) {
                gota.acertou = true;
                if (gota.vy > 0 && !blocoEm(coluna, linha - 1).solido) {
                    criarPoca(gota.x, linha * TAMANHO_DO_BLOCO);
                }
                soltarFaiscas(gota.x, gota.y - 2, ACIDO.cor, 5);
            }
        }
    });

    acido = acido.filter(gota => !gota.acertou);
}

function criarPoca(x, superficie) {
    pocas.push({
        x: x - ACIDO.larguraDaPoca / 2,
        y: superficie - 2,
        largura: ACIDO.larguraDaPoca,
        altura: 2,
        vida: ACIDO.duracaoDaPoca
    });
}

function atualizarPocas(tempo) {
    pocas.forEach(poca => {
        poca.vida -= tempo;
    });
    pocas = pocas.filter(poca => poca.vida > 0);
}


// ============================================================
// 10. FERIR E SER FERIDO
// ============================================================
function sobrepoe(a, b) {
    return a.x < b.x + b.largura && a.x + a.largura > b.x
        && a.y < b.y + b.altura && a.y + a.altura > b.y;
}

/*
  Tocar uma criatura ou pisar numa poça fere. Uma ferida por vez: depois
  dela vem a invulnerabilidade, e enquanto ela durar nada mais fere — a
  "janela de invulnerabilidade" do Dealer? Out!, que impede uma criatura
  parada em cima do soldado de tirar toda a vida num segundo.
*/
function verificarContatos() {
    criaturas.forEach(criatura => {
        if (sobrepoe(criatura, soldado)) {
            ferirSoldado(CRIATURAS[criatura.especie].danoDeContato, centro(criatura).x);
        }
    });

    pocas.forEach(poca => {
        if (sobrepoe(poca, soldado)) {
            ferirSoldado(ACIDO.danoDaPoca, poca.x + poca.largura / 2);
        }
    });
}

/*
  A FERIDA, num lugar só: toda forma de se machucar passa por aqui, e é
  aqui que mora a regra "durante a esquiva e logo depois de uma ferida,
  nada fere". Se cada perigo tirasse vida por conta própria, cada um
  precisaria lembrar dessa regra.

  O empurrão joga o soldado para LONGE de quem o feriu, e um pouco para
  cima: quem apanha sente o golpe e ganha distância.
*/
function ferirSoldado(dano, deOndeVeioX) {
    if (soldado.invulneravel > 0 || soldado.esquiva > 0 || estado !== "jogando") {
        return;
    }

    soldado.vida = Math.max(0, soldado.vida - dano);
    soldado.invulneravel = DURACAO_DA_INVULNERABILIDADE;

    const paraLonge = Math.sign(centro(soldado).x - deOndeVeioX) || -soldado.olhandoPara;
    soldado.vx = paraLonge * EMPURRAO_DA_FERIDA.x;
    soldado.vy = -EMPURRAO_DA_FERIDA.y;
    soldado.saltando = false;

    soltarFaiscas(centro(soldado).x, centro(soldado).y, "#ff5a3c", 6);
    atualizarPainel();

    if (soldado.vida === 0) {
        terminarPartida();
    }
}

/*
  Um tiro acerta a primeira criatura viva que contém o ponto. Além do
  dano, o EMPURRÃO da arma: a criatura fica atordoada por um instante e
  desliza para trás. A espingarda empurra três vezes mais que o rifle — as
  criaturas reagem às características da arma (GDD, seção 4).

  E levar um tiro ACORDA: um rastejador patrulhando passa a perseguir.
*/
function acertarCriaturas(tiro) {
    const alvo = criaturas.find(criatura => criatura.vida > 0 && contemPonto(criatura, tiro.x, tiro.y));

    if (!alvo) {
        return;
    }

    tiro.acertou = true;
    alvo.vida -= tiro.dano;
    alvo.piscando = 0.08;
    alvo.atordoada = 0.12;
    alvo.vx = Math.sign(tiro.vx) * tiro.empurrao;
    soltarFaiscas(tiro.x, tiro.y, CRIATURAS[alvo.especie].cores.C, 3);

    if (alvo.especie === "rastejador" && alvo.estado !== "perseguicao") {
        comecarPerseguicao(alvo);
    }

    if (alvo.vida <= 0) {
        const meio = centro(alvo);
        soltarFaiscas(meio.x, meio.y, CRIATURAS[alvo.especie].cores.C, 14);
        soltarFaiscas(meio.x, meio.y, ACIDO.cor, 6);
    }
}


// ============================================================
// 11. O FIM E O RECOMEÇO
// ============================================================
function terminarPartida() {
    estado = "fim";
    soltarFaiscas(centro(soldado).x, centro(soldado).y, "#c9d3e6", 20);
    mostrarMensagem("Abatido", "As criaturas venceram desta vez. Tente usar a esquiva: nada fere durante ela.");
}

/*
  RECOMEÇAR SEM LIXO (a lição do Dealer? Out!): toda lista volta vazia e
  todo objeto é recriado pela sua fábrica. Nada sobra da partida anterior.
*/
function recomecar() {
    soldado = criarSoldado();
    criaturas = criarCriaturas();
    tiros = [];
    acido = [];
    pocas = [];
    particulas = [];
    rastro = [];
    equipamento.armas = ARMAS_INICIAIS.map(criarArmaEquipada);
    equipamento.ativa = 0;
    esperaDoProximoTiro = 0;

    estado = "jogando";
    camadaMensagem.hidden = true;
    atualizarPainel();
}


// ============================================================
// 12. PERGUNTAS SOBRE UM BLOCO
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
// 13. DESENHAR
// ============================================================
function desenhar() {
    desenharFundo();
    desenharBlocos();
    desenharPocas();
    desenharCriaturas();
    desenharRastro();

    if (estado === "jogando") {
        desenharSoldado();
        desenharArma();
    }

    desenharTiros();
    desenharAcido();
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

/*
  Invulnerável, o soldado PISCA: some e volta 12 vezes por segundo. O
  jogador vê que está protegido — e quanto tempo falta.
*/
function desenharSoldado() {
    if (soldado.invulneravel > 0 && Math.floor(soldado.invulneravel * 12) % 2 === 0) {
        return;
    }

    const espelhado = soldado.olhandoPara < 0;
    desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, soldado.x - 1, soldado.y, espelhado);
}

/*
  A ARMA é uma linha de 5 pixels saindo do ombro na direção da mira:
  oito direções desenhadas com o mesmo laço. A ponta acende no clarão.
*/
function desenharArma() {
    if (soldado.invulneravel > 0 && Math.floor(soldado.invulneravel * 12) % 2 === 0) {
        return;
    }

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
  O QUADRO DE CADA CRIATURA sai do estado — não é guardado:

  - o rastejador alterna as pernas enquanto anda (o relógio do jogo, como
    o céu do Shoot 'em up);
  - o saltador agacha no preparo (o aviso) e na recuperação;
  - a cuspidora acende o saco de ácido enquanto mira — pulsando cada vez
    mais rápido conforme o cuspe se aproxima.

  E todas piscam em branco ao levar um tiro.
*/
function desenharCriaturas() {
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];
        let quadro = ficha.quadros[0];
        let cores = ficha.cores;

        if (criatura.especie === "rastejador" && criatura.vx !== 0) {
            quadro = ficha.quadros[Math.floor(tempoTotal * 10) % 2];
        }
        if (criatura.especie === "saltador" && (criatura.estado === "preparo" || criatura.estado === "recuperacao")) {
            quadro = ficha.quadros[1];
        }
        if (criatura.especie === "cuspidora" && criatura.estado === "mira") {
            const pulso = Math.floor(criatura.tempoNoEstado * (6 + criatura.tempoNoEstado * 20)) % 2;
            cores = { ...ficha.cores, A: pulso ? "#e8ff9a" : ficha.cores.A };
        }

        const corUnica = criatura.piscando > 0 ? "#ffffff" : null;
        const x = criatura.x + (criatura.largura - quadro[0].length) / 2;
        desenharSprite(quadro, cores, x, criatura.y, criatura.olhandoPara < 0, corUnica);
    });
}

function desenharAcido() {
    acido.forEach(gota => {
        pincel.fillStyle = ACIDO.cor;
        pincel.fillRect(Math.round(gota.x) - 1, Math.round(gota.y) - 1, 2, 2);
    });
}

/*
  A poça borbulha: alguns pixels sobem e descem com o relógio. Nos últimos
  0,5 s ela some aos poucos, avisando que vai acabar.
*/
function desenharPocas() {
    pocas.forEach(poca => {
        pincel.globalAlpha = Math.min(1, poca.vida / 0.5);
        pincel.fillStyle = "#4d8a1f";
        pincel.fillRect(Math.round(poca.x), Math.round(poca.y + 1), poca.largura, 1);
        pincel.fillStyle = ACIDO.cor;
        for (let i = 1; i < poca.largura; i += 3) {
            const bolha = Math.floor(tempoTotal * 6 + i) % 3 === 0 ? 1 : 0;
            pincel.fillRect(Math.round(poca.x) + i, Math.round(poca.y) + 1 - bolha, 1, 1);
        }
    });
    pincel.globalAlpha = 1;
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

    /*
      O QUE AS CRIATURAS PENSAM: o nome do estado sobre cada uma, e uma
      linha até o soldado quando ele está dentro do alcance da visão —
      verde se ela enxerga, vermelha se uma parede tapa. Uma máquina de
      estados que ninguém vê é impossível de entender.
    */
    pincel.font = "6px monospace";
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];
        const meio = centro(criatura);

        pincel.strokeStyle = "#ff3bd4";
        pincel.strokeRect(Math.round(criatura.x) + 0.5, Math.round(criatura.y) + 0.5, criatura.largura - 1, criatura.altura - 1);
        pincel.fillStyle = "#ff3bd4";
        pincel.fillText(criatura.estado, Math.round(criatura.x) - 4, Math.round(criatura.y) - 2);

        if (distanciaAteOSoldado(criatura) <= ficha.visao) {
            const alvo = centro(soldado);
            pincel.strokeStyle = enxerga(criatura, ficha) ? "rgba(77, 255, 122, 0.7)" : "rgba(255, 90, 60, 0.7)";
            pincel.beginPath();
            pincel.moveTo(meio.x, meio.y);
            pincel.lineTo(alvo.x, alvo.y);
            pincel.stroke();
        }
    });
}


// ============================================================
// 14. O PAINEL
// ============================================================
/*
  O painel só é refeito quando algo muda (um disparo, uma troca, uma
  recarga que termina) — não a cada quadro. A barra de recarga é a
  exceção: ela anda sozinha, em atualizarRecarga.
*/
function atualizarPainel() {
    barraDeVida.value = soldado.vida / VIDA_DO_SOLDADO;
    barraDeVida.classList.toggle("pouca", soldado.vida < VIDA_DO_SOLDADO * 0.3);

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


/*
  A camada de mensagem do Pong e do Tetris. O foco vai para o botão: quem
  joga pelo teclado aperta Enter e recomeça, sem procurar o mouse.
*/
function mostrarMensagem(titulo, texto) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    camadaMensagem.hidden = false;
    botaoRecomecar.focus();
}


// ============================================================
// 15. LIGAR
// ============================================================
botaoRecomecar.addEventListener("click", recomecar);

atualizarPainel();
requestAnimationFrame(quadroAQuadro);
