/*
  XENOMORPH — PASSO 9: A BASE

  Morrer deixa de ser o fim. Entre uma expedição e outra existe a BASE DE
  OPERAÇÕES: lá ficam as amostras biológicas que o soldado trouxe, as
  melhorias compradas com elas, as habilidades conquistadas, os registros
  e o bestiário — e tudo isso é SALVO no navegador (GDD, seções 3 e 9).

  Três ideias:

  1. DUAS MEMÓRIAS, DOIS TEMPOS DE VIDA
     A expedição (o planeta, a vida, as amostras carregadas) morre com o
     soldado. A campanha (o que foi guardado, comprado e conquistado)
     sobrevive à morte e ao fechar a página.

  2. A ECONOMIA É UMA REGRA COM NÚMEROS
     Morrer guarda metade das amostras; extrair ou cumprir a missão guarda
     todas. Cada melhoria tem custos claros e um efeito por nível, numa
     tabela. Filhotes não deixam amostras — senão um ninho seria uma
     fazenda.

  3. SALVAR É FÁCIL; LER É QUE EXIGE CUIDADO
     JSON.stringify para gravar. Para ler, desconfiança campo a campo: o
     que vem do disco pode ser de outra versão, editado à mão, ou lixo.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;

/*
  O tamanho da sala vem do gerador (os módulos têm 32 x 18). As salas em
  si também: este arquivo não tem mais nenhuma.
*/
const COLUNAS = COLUNAS_DA_SALA;
const LINHAS = LINHAS_DA_SALA;

/*
  A plataforma NÃO é sólida: para quem anda de lado ou sobe, ela é ar.
  O que ela tem é outra propriedade, `plataforma`, que a colisão consulta
  só num caso — corpo descendo, vindo de cima (seção 7).
*/
const BLOCOS = {
    "#": { solido: true, plataforma: false, desenho: "metal" },
    "=": { solido: true, plataforma: false, desenho: "casco" },
    "~": { solido: true, plataforma: false, desenho: "membrana" },   // rompida pelo Impulso
    "%": { solido: true, plataforma: false, desenho: "selo" },       // fecha o covil durante a luta
    "-": { solido: false, plataforma: true, desenho: "plataforma" },
    "|": { solido: false, plataforma: false, desenho: "cano" },
    ".": { solido: false, plataforma: false, desenho: null }
};

/*
  AS PALETAS, uma por região. O gerador decide QUE região é cada sala;
  aqui se decide COMO cada uma aparece. A mesma galeria, desenhada com as
  cores da floresta, vira uma caverna — os módulos servem às duas.

  O GDD pede (seção 10) "tons frios nas instalações humanas, verdes e
  azuis na vegetação alienígena". O metal da floresta é rocha, a borda
  iluminada é musgo que brilha, a grade é feita de raízes.
*/
const PALETAS = {
    complexo: {
        fundo: "paineis",
        painel: "#0f1524",
        juntaDoPainel: "#080b14",
        metal: "#2b3448",
        metalClaro: "#5c6f94",
        metalEscuro: "#161b28",
        rebite: "#7d8fb3",
        cano: "#1d2638",
        canoClaro: "#2f3c57",
        grade: "#3b4864",
        gradeClara: "#8a9cc0",
        casco: "#8f9bb5",
        cascoEscuro: "#4a5570",
        mapa: "#3b4f7a"
    },
    floresta: {
        fundo: "caverna",
        painel: "#06110f",
        juntaDoPainel: "#0b1d19",
        metal: "#1b2b28",
        metalClaro: "#3fd18b",
        metalEscuro: "#0b1412",
        rebite: "#7affc4",
        cano: "#123528",
        canoClaro: "#2a8a5c",
        grade: "#24463a",
        gradeClara: "#7ad1a0",
        casco: "#8f9bb5",
        cascoEscuro: "#4a5570",
        mapa: "#2a7a5a"
    }
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
        amostras: 1,               // quantas deixa ao morrer (seção 15)
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
        amostras: 2,
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
        amostras: 2,
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
    },

    /*
      O NINHO não anda nem morde: enquanto o soldado estiver na sala, solta
      um rastejador a cada poucos segundos, até ser destruído. "Ninhos podem
      gerar reforços até serem destruídos" (GDD, seção 5).
    */
    ninho: {
        largura: 10,
        altura: 8,
        vida: 14,
        danoDeContato: 6,
        visao: 0,
        intervaloEntreFilhotes: 5,
        maximoDeFilhotes: 3,
        amostras: 4,
        estadoInicial: "pulsando",
        quadros: [
            [
                "...nnnn...",
                ".nnNNNNnn.",
                "nNNeNNeNNn",
                "nNeNNNNeNn",
                "nNNNeeNNNn",
                ".nNNNNNNn.",
                "nnnnnnnnnn",
                "n.n.nn.n.n"
            ]
        ],
        cores: { n: "#3a1f2e", N: "#8a3a5c", e: "#ffcc33" }
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

// ---------- A evolução do ecossistema ----------
/*
  A EVOLUÇÃO (GDD, seção 5): quanto mais tempo o soldado passa numa
  região, mais perigosa ela fica. Mas por REGRAS, numa tabela, e à vista
  no painel — o GDD exige que a evolução seja "definida e controlada,
  evitando que o jogo aumente a dificuldade de maneira injusta ou
  imprevisível".

  Cada região tem o seu relógio. Cada linha diz, a partir de quantos
  segundos naquela região:

  - vida:        o multiplicador da vida das criaturas que nascem a partir
                 dali (a "mutação defensiva": elas ganham carapaça dourada);
  - reforcos:    quantos rastejadores aparecem ao entrar numa sala;
  - resistencia: se as criaturas novas resistem à arma MAIS USADA na região.
*/
const EVOLUCAO = [
    { aPartirDe: 0, nome: "calmo", vida: 1, reforcos: 0, resistencia: false },
    { aPartirDe: 75, nome: "inquieto", vida: 1.3, reforcos: 0, resistencia: false },
    { aPartirDe: 150, nome: "agitado", vida: 1.3, reforcos: 1, resistencia: true },
    { aPartirDe: 240, nome: "furioso", vida: 1.6, reforcos: 2, resistencia: true }
];
const FATOR_DA_RESISTENCIA = 0.5;     // a arma resistida fere pela metade
const RITMO_COM_POUCA_VIDA = 0.5;     // com menos de 30% de vida, o relógio da evolução anda pela metade

// ---------- A Matriarca ----------
/*
  A MATRIARCA: "entidade que produz hordas de criaturas menores" (GDD,
  seção 8). O chefe do Shoot 'em up, agora num jogo de plataforma, com o
  mesmo esqueleto: fases decididas pela vida, uma lista de ataques em
  ciclo por fase, e um AVISO antes de cada ataque.

  E um PONTO FRACO: o saco de ovos. Fechado, ele é uma armadura — só 35%
  do dano passa. Ele se ABRE quando ela põe ovos, e quando ela fica tonta
  depois de uma investida contra a parede. Quem espera a hora certa vence
  mais rápido do que quem atira sem parar.
*/
const MATRIARCA = {
    largura: 22,
    altura: 14,
    vida: 160,
    danoDeContato: 20,
    armadura: 0.35,
    distanciaParaDespertar: 140,
    tempoDeDespertar: 1.2,
    tempoDeMorte: 2,
    amostras: 20,

    fases: [
        { ateVida: 0.6, rapidez: 20, pausa: 1.6, ataques: ["ovos", "cuspe", "cuspe"] },
        { ateVida: 0.25, rapidez: 32, pausa: 1.2, ataques: ["investida", "ovos", "cuspe", "investida"] },
        { ateVida: 0, rapidez: 44, pausa: 0.8, ataques: ["investida", "chuva", "ovos", "investida", "chuva"] }
    ],

    ataques: {
        ovos: { aviso: 0.8, duracao: 1.4, filhotes: 2, maximoDeFilhotes: 4 },
        cuspe: { aviso: 0.6, duracao: 0.5, gotas: 3, espalhamento: 28, tempoDeVoo: 0.8 },
        investida: { aviso: 0.6, rapidez: 170, atordoamento: 1.3 },
        chuva: { aviso: 0.9, duracao: 0.8, gotas: 6 }
    },

    sprite: [
        "..........ccc.........",
        "........ccCCCcc.......",
        ".....sssccCCCCCcc.....",
        "...sSSSSscCCCCCCcoo...",
        "..sSSeSSSscCCCCCCcoo..",
        ".sSSSSSeSSscCCCCCCCcc.",
        ".sSeSSSSSSscCCCCCCCCCc",
        "sSSSSSeSSSscCCCCCcc.cc",
        "sSSSeSSSSSscCCCCc..ttt",
        ".sSSSSSSSscCCCCCc.....",
        "..sssssssccCcCcCc.....",
        "...c.c.c.c..c.c.c.....",
        "..c..c..c..c..c..c....",
        ".c...c...c.c...c..c..."
    ],
    cores: { s: "#2f5b2a", S: "#5f9a3a", e: "#b8ff3c", c: "#2a1430", C: "#5e2a6e", o: "#ff5a3c", t: "#e2e8f5" }
};

// ---------- Os itens ----------
/*
  A APARÊNCIA de cada tipo de item. O que cada um FAZ ao ser apanhado
  está em AO_PEGAR, na seção 4 — dados de um lado, código do outro, como
  nas criaturas.
*/
const ITENS = {
    capsula: {
        sprite: [
            ".###.",
            "#g+g#",
            "#+++#",
            "#g+g#",
            ".###."
        ],
        cores: { "#": "#c9d3e6", g: "#1f6b3a", "+": "#4dff7a" }
    },
    tanque: {
        sprite: [
            ".#####.",
            "#hhhhh#",
            "#h+++h#",
            "#h+++h#",
            "#h+++h#",
            "#hhhhh#",
            ".#####."
        ],
        cores: { "#": "#c9d3e6", h: "#1f6b3a", "+": "#4dff7a" }
    },
    impulso: {
        sprite: [
            "..###..",
            ".#yyy#.",
            "#yy>yy#",
            "#y>>>>#",
            "#yy>yy#",
            ".#yyy#.",
            "..###.."
        ],
        cores: { "#": "#ffcc33", y: "#7a4a00", ">": "#ffffff" }
    },
    dados: {
        sprite: [
            ".bbbb.",
            "bccccb",
            "bc##cb",
            "bccccb",
            "bc##cb",
            "bccccb",
            ".bbbb."
        ],
        cores: { b: "#3cf2ff", c: "#0b3a4a", "#": "#9ffcff" }
    }
};

// As amostras: pequenas, numerosas, puxadas pelo soldado quando ele passa perto.
ITENS.amostra = {
    sprite: [".a.", "aAa", ".a."],
    cores: { a: "#4d8a1f", A: "#d8ff6a" }
};
// Uma reserva de amostras: o que aparece no lugar do Impulso quando ele já é permanente.
ITENS.reserva = {
    sprite: [
        ".###.",
        "#aAa#",
        "#AAA#",
        "#aAa#",
        ".###."
    ],
    cores: { "#": "#c9d3e6", a: "#4d8a1f", A: "#d8ff6a" }
};

const AMOSTRAS_DA_RESERVA = 5;
const RAIO_DO_IMA = 28;            // de quão longe as amostras são puxadas
const RAPIDEZ_DO_IMA = 140;
const BONUS_DOS_DADOS = 10;        // amostras extras por cumprir a missão

/*
  AS MELHORIAS PERMANENTES (GDD, seção 9): "cada melhoria deve ter custos
  claros e benefícios compreensíveis". Cada uma: o nome, o efeito por
  extenso (para a base), o custo de cada nível em amostras, e o efeito de
  cada nível em número.
*/
const MELHORIAS = {
    blindagem: { nome: "Blindagem", descricao: "+20 de vida máxima", custos: [12, 25, 45], porNivel: 20 },
    calibre: { nome: "Calibre", descricao: "+15% de dano", custos: [15, 30, 55], porNivel: 0.15 },
    carregador: { nome: "Carregador", descricao: "+25% de tiros por pente", custos: [10, 25], porNivel: 0.25 },
    reflexos: { nome: "Reflexos", descricao: "a esquiva recarrega 20% mais rápido", custos: [10, 22], porNivel: 0.2 }
};

const FRACAO_GUARDADA_NA_MORTE = 0.5;
const ZONA_DE_EXTRACAO = { de: 150, ate: 240 };   // em pixels, no pouso, ao lado da nave
const TEMPO_PARA_EXTRAIR = 1;

/*
  O BESTIÁRIO (GDD, seção 11: "registro de inimigos descobertos"): o que
  a base mostra de cada espécie já vista.
*/
const BESTIARIO = {
    rastejador: "Rastejador — caça em grupo e tenta cercar.",
    saltador: "Saltador — agacha antes do bote; o arco cai onde você estava.",
    cuspidora: "Cuspidora — mantém distância; o ácido vira poça.",
    ninho: "Ninho — solta rastejadores até ser destruído.",
    matriarca: "A Matriarca — o saco de ovos aberto é o seu ponto fraco."
};

/*
  A MATRIARCA APRENDE (GDD, seções 5 e 8: "chefes podem adquirir variações
  de ataques em expedições futuras"): cada missão cumprida na campanha
  acrescenta um ataque a uma das fases, na ordem desta lista.
*/
const ATAQUES_APRENDIDOS = [
    { fase: 0, ataque: "investida" },
    { fase: 1, ataque: "chuva" },
    { fase: 2, ataque: "ovos" }
];

/*
  Onde a campanha é salva, e a VERSÃO do formato. Se um dia o formato
  mudar, a versão sobe — e uma campanha antiga é reconhecida como antiga,
  em vez de ser lida errado.
*/
const CHAVE_DA_CAMPANHA = "xenomorph-campanha";
const VERSAO_DA_CAMPANHA = 1;

const CURA_DA_CAPSULA = 30;
const VIDA_DO_TANQUE = 20;   // a vida máxima sobe, até o fim da expedição
const DURACAO_DO_AVISO = 3;

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

const minimapa = document.getElementById("minimapa");
const pincelDoMapa = minimapa.getContext("2d");
const campoSetor = document.getElementById("setor");
const campoObjetivo = document.getElementById("objetivo");
const campoEcossistema = document.getElementById("ecossistema");
const barraDoChefe = document.getElementById("barra-do-chefe");
const vidaDoChefe = document.getElementById("vida-do-chefe");
const campoAviso = document.getElementById("aviso");
const formularioDaSemente = document.getElementById("formulario-da-semente");
const campoAmostras = document.getElementById("amostras");
const campoSementeAtual = document.getElementById("semente-atual");
const telaDaBase = document.getElementById("base");
const campoSaldo = document.getElementById("saldo");
const listaDeMelhorias = document.getElementById("melhorias");
const listaDeRegistros = document.getElementById("registros");
const listaDoBestiario = document.getElementById("bestiario");
const botaoApagar = document.getElementById("botao-apagar");
const botaoDescer = document.getElementById("botao-descer");
const botaoVoltarABase = document.getElementById("botao-voltar");
const campoSemente = document.getElementById("campo-semente");
const botaoSortear = document.getElementById("botao-sortear");


// ============================================================
// 3. O MUNDO E AS SALAS
// ============================================================
/*
  O gerador entrega um PLANO: cada sala com a sua região, as suas portas,
  o seu módulo e as anotações de onde nascem criaturas e itens. O plano
  não muda durante a expedição.

  O que muda — criaturas mortas, cápsulas apanhadas — mora AO LADO, em
  `salasVisitadas`: só existe para as salas onde o soldado já esteve,
  e é criado na primeira visita. É a separação do passo 4 (a ficha da
  arma e a munição que sobra), agora para um mundo inteiro. E serve de
  graça ao minimapa: uma sala visitada é uma sala que tem estado.
*/
let mundo = null;
let salaAtual = null;          // o plano da sala onde o soldado está
let estadoDaSala = null;       // o que mudou nela
let salasVisitadas = new Map();

/*
  Uma expedição nova: o mundo inteiro sai da semente, e o soldado pousa.
  As melhorias da campanha viram números do soldado antes do pouso.
*/
function iniciarExpedicao(semente) {
    mundo = gerarMundo(semente);
    ecossistema = criarEcossistema();
    expedicao = { amostras: 0 };
    telaDaBase.hidden = true;
    document.body.classList.remove("na-base");
    salasVisitadas = new Map();
    salaAtual = null;
    estadoDaSala = null;
    matriarca = null;
    barraDoChefe.classList.remove("visivel");

    soldado = criarSoldado();
    aplicarMelhorias();
    entrarNaSala(mundo.salas.get(chave(POUSO.coluna, POUSO.linha)));

    equipamento.armas = ARMAS_INICIAIS.map(criarArmaEquipada);
    equipamento.ativa = 0;
    esperaDoProximoTiro = 0;
    rastro = [];

    membranaJaResistiu = false;
    tempoDoAviso = 0;
    campoAviso.hidden = true;

    tempoSegurandoExtracao = 0;
    estavaNaZonaDeExtracao = false;

    estado = "jogando";
    camadaMensagem.hidden = true;
    campoSementeAtual.textContent = semente;
    atualizarObjetivo();
    atualizarPainel();
}

/*
  ENTRAR NUMA SALA: guardar o que mudou na sala que fica, e trazer a que
  chega. Na primeira visita, o estado da sala é criado a partir do plano:
  os blocos escavados, as criaturas e os itens anotados pelo gerador.

  Tiros, ácido, poças e partículas não viajam entre salas: ficam para trás.
*/
function entrarNaSala(sala) {
    if (estadoDaSala !== null) {
        estadoDaSala.criaturas = criaturas;
        estadoDaSala.itens = itens;
        estadoDaSala.chefe = matriarca;
    }

    const nome = chave(sala.coluna, sala.linha);
    const primeiraVisita = !salasVisitadas.has(nome);
    if (primeiraVisita) {
        salasVisitadas.set(nome, {
            blocos: construirBlocos(sala),
            criaturas: sala.criaturas.map((descricao, i) =>
                evoluir(criarCriatura(descricao.especie, descricao, i % 2 === 0 ? -1 : 1), sala.regiao)),
            itens: sala.itens.map(descricao => criarItem(
                descricao.tipo === "impulso" && soldado.impulso ? { ...descricao, tipo: "reserva" } : descricao
            )),
            chefe: sala.covil ? criarMatriarca() : null
        });
    }

    salaAtual = sala;
    estadoDaSala = salasVisitadas.get(nome);
    criaturas = estadoDaSala.criaturas;
    itens = estadoDaSala.itens;
    matriarca = estadoDaSala.chefe;
    paleta = PALETAS[sala.regiao];

    if (!primeiraVisita) {
        chamarReforcos(sala);
    }
    criaturas.forEach(criatura => registrarNoBestiario(criatura.especie));

    tiros = [];
    acido = [];
    pocas = [];
    particulas = [];

    desenharMinimapa();
    atualizarSetor();
}

/*
  PASSAR DE SALA. Quando o CENTRO do soldado sai da tela, ele entra na sala
  vizinha naquela direção, do lado oposto: saiu pela direita com x = 257,
  chega com x = 1. As salas se encaixam porque as portas estão sempre nos
  mesmos lugares (gerador.js, seção 2).

  Subindo, um empurrão: quem sai pelo teto chega na sala de cima pelo
  piso, e precisa de impulso para passar pela grade e pisar nela. É um
  truque honesto — sem ele, todo poço vertical seria uma armadilha.
*/
function verificarSaidaDaSala() {
    const meio = centro(soldado);
    let direcao = null;

    if (meio.x < 0) direcao = "O";
    else if (meio.x >= tela.width) direcao = "L";
    else if (meio.y < 0) direcao = "N";
    else if (meio.y >= tela.height) direcao = "S";

    if (direcao === null) {
        return;
    }

    const passo = DIRECOES[direcao];
    const destino = mundo.salas.get(chave(salaAtual.coluna + passo.dc, salaAtual.linha + passo.dl));

    if (!destino || !salaAtual.portas[direcao]) {
        // Não deveria acontecer: só há abertura onde há ligação. Se acontecer, é um módulo com borda furada.
        console.error(`Saída sem sala: ${direcao} de ${chave(salaAtual.coluna, salaAtual.linha)}`);
        return;
    }

    entrarNaSala(destino);
    soldado.x -= passo.dc * tela.width;
    soldado.y -= passo.dl * tela.height;

    if (direcao === "N") {
        soldado.vy = Math.min(soldado.vy, -FISICA.velocidadeDoSalto);
    }
}

/*
  As criaturas não passam de sala: chegando à borda, são seguradas como se
  houvesse parede — e dão meia-volta, porque `bateuNaParede` diz que sim.
*/
function prenderNaSala(corpo) {
    if (corpo.x < 0) {
        corpo.x = 0;
        corpo.bateuNaParede = true;
    }
    if (corpo.x + corpo.largura > tela.width) {
        corpo.x = tela.width - corpo.largura;
        corpo.bateuNaParede = true;
    }
}

function foraDaTela(ponto) {
    return ponto.x < 0 || ponto.x >= tela.width || ponto.y < 0 || ponto.y >= tela.height;
}


// ============================================================
// 4. OS ITENS
// ============================================================
/*
  O QUE CADA ITEM FAZ ao ser apanhado: uma tabela de funções, como os
  efeitos do Dealer? Out!. Devolver `false` quer dizer "não peguei" — a
  cápsula de vida fica no chão quando a vida está cheia.
*/
const AO_PEGAR = {
    capsula: () => {
        if (soldado.vida === soldado.vidaMaxima) {
            return false;
        }
        soldado.vida = Math.min(soldado.vidaMaxima, soldado.vida + CURA_DA_CAPSULA);
        return true;
    },
    tanque: () => {
        soldado.vidaMaxima += VIDA_DO_TANQUE;
        soldado.vida = soldado.vidaMaxima;
        mostrarAviso(`Tanque de vida: a vida máxima sobe para ${soldado.vidaMaxima}`);
        return true;
    },
    impulso: () => {
        soldado.impulso = true;
        campanha.habilidades.impulso = true;   // permanente, e salvo NA HORA: nem a morte logo depois o tira
        salvarCampanha();
        mostrarAviso("Impulso Cinético: a esquiva agora rompe membranas");
        atualizarObjetivo();
        return true;
    },
    dados: () => {
        concluirExpedicao();
        return true;
    },
    amostra: () => {
        expedicao.amostras += 1;
        return true;
    },
    reserva: () => {
        expedicao.amostras += AMOSTRAS_DA_RESERVA;
        mostrarAviso(`Reserva de amostras: +${AMOSTRAS_DA_RESERVA}`);
        return true;
    }
};

/*
  O ÍMÃ: amostras perto do soldado andam até ele. Pegar dezenas de coisas
  pequenas uma a uma seria trabalho; com o ímã, é recompensa.
*/
function puxarComOIma(amostra, tempo) {
    const alvo = centro(soldado);
    const meio = centro(amostra);
    const distancia = Math.hypot(alvo.x - meio.x, alvo.y - meio.y);

    if (distancia > 0 && distancia < RAIO_DO_IMA) {
        amostra.x += (alvo.x - meio.x) / distancia * RAPIDEZ_DO_IMA * tempo;
        amostra.y += (alvo.y - meio.y) / distancia * RAPIDEZ_DO_IMA * tempo;
    }
}

function criarItem(descricao) {
    const sprite = ITENS[descricao.tipo].sprite;

    return {
        tipo: descricao.tipo,
        x: descricao.coluna * TAMANHO_DO_BLOCO + (TAMANHO_DO_BLOCO - sprite[0].length) / 2,
        y: (descricao.linha + 1) * TAMANHO_DO_BLOCO - sprite.length,
        largura: sprite[0].length,
        altura: sprite.length,
        apanhado: false
    };
}

function verificarItens(tempo) {
    itens.forEach(item => {
        if (item.tipo === "amostra") {
            puxarComOIma(item, tempo);
        }

        if (sobrepoe(item, soldado) && AO_PEGAR[item.tipo]() !== false) {
            item.apanhado = true;
            campoAmostras.textContent = expedicao.amostras;
            soltarFaiscas(centro(item).x, centro(item).y, ITENS[item.tipo].cores["#"] || "#ffffff", 12);
            atualizarPainel();
        }
    });

    itens = itens.filter(item => !item.apanhado);
}


// ============================================================
// 5. ESTADO
// ============================================================
/*
  O soldado agora nasce de uma FÁBRICA: recomeçar a partida é chamar
  criarSoldado() de novo, e é impossível esquecer um campo (a lição do
  Dealer? Out!). Os campos são quase todos temporizadores, em segundos.
*/
let soldado = null;   // nasce em iniciarExpedicao

function criarSoldado() {
    const pouso = encontrarMarcador(POUSO.modulo, "@");

    return {
        x: pouso.coluna * TAMANHO_DO_BLOCO + 1,
        y: (pouso.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
        largura: LARGURA_DO_SOLDADO,
        altura: ALTURA_DO_SOLDADO,
        vx: 0,
        vy: 0,
        olhandoPara: 1,
        noChao: false,
        bateuNaParede: false,

        vida: VIDA_DO_SOLDADO,
        vidaMaxima: VIDA_DO_SOLDADO,
        invulneravel: 0,
        impulso: false,           // a habilidade: rompe membranas com a esquiva
        multiplicadorDeDano: 1,   // os efeitos das melhorias (seção 15)
        multiplicadorDoPente: 1,
        multiplicadorDaEsquiva: 1,

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
    armas: [],   // preenchidas em iniciarExpedicao, depois das melhorias
    ativa: 0
};

function criarArmaEquipada(tipo) {
    return { tipo, municao: tamanhoDoPente(tipo), recarregando: 0 };
}

let tiros = [];
let particulas = [];
let criaturas = [];   // as da sala atual
let itens = [];
let matriarca = null; // só existe no covil
let ecossistema = null;

let campanha = carregarCampanha();   // o que sobrevive à morte (seção 15)
let expedicao = { amostras: 0 };      // o que morre com o soldado
let tempoSegurandoExtracao = 0;
let estavaNaZonaDeExtracao = false;
let acido = [];   // os projéteis das cuspidoras, em voo
let pocas = [];   // o ácido que caiu e ainda queima

/*
  O JOGO TEM TRÊS ESTADOS: "base", "jogando" e "fim". A pausa chega no
  final.
*/
let estado = "base";
let tempoTotal = 0;   // o relógio do jogo: anima as pernas dos rastejadores

let esperaDoProximoTiro = 0;   // a cadência: o acumulador do Shoot 'em up
let tempoDoClarao = 0;

let rastro = [];

let paleta = PALETAS.complexo;   // as cores da região da sala atual

let instanteDoQuadroAnterior = 0;
let tempoDoAviso = 0;
let membranaJaResistiu = false;   // o aviso "a membrana resiste" aparece uma vez por expedição

/*
  A tecla H agora passeia por três visões: nada, as caixas da sala, o
  mapa do gerador. Um número que dá a volta com o resto da divisão.
*/
const VISOES_DE_DEPURACAO = ["nenhuma", "caixas", "mapa"];
let visaoDeDepuracao = 0;

const teclasPressionadas = {};


// ============================================================
// 6. ENTRADA
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
    if (evento.target === campoSemente) {
        return;   // digitando a semente: as letras não são comandos
    }

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
    if (tecla === "h") visaoDeDepuracao = (visaoDeDepuracao + 1) % VISOES_DE_DEPURACAO.length;
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
// 7. O LOOP
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
    verificarSaidaDaSala();
    atualizarRastro(tempo);

    atualizarRecarga(tempo);
    atirar(tempo);
    moverTiros(tempo);

    atualizarCriaturas(tempo);
    atualizarMatriarca(tempo);
    atualizarEcossistema(tempo);
    moverAcido(tempo);
    atualizarPocas(tempo);
    verificarContatos();
    verificarItens(tempo);
    atualizarExtracao(tempo);

    atualizarParticulas(tempo);
    atualizarAviso(tempo);
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
// 8. A FÍSICA
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
    soldado.recargaDaEsquiva = FISICA.recargaDaEsquiva * soldado.multiplicadorDaEsquiva;
    soldado.pedidoDeEsquiva = 0;

    if (!soldado.noChao) {
        soldado.esquivaNoAr = false;
    }
}

function continuarEsquiva(tempo) {
    soldado.esquiva = Math.max(0, soldado.esquiva - tempo);
    soldado.vy = 0;
    soldado.vx = soldado.olhandoPara * FISICA.velocidadeDaEsquiva;
    romperMembranas();

    rastro.push({ x: soldado.x, y: soldado.y, espelhado: soldado.olhandoPara < 0, vida: 0.15 });

    if (soldado.esquiva === 0) {
        soldado.vx = limitar(soldado.vx, -FISICA.velocidadeMaxima, FISICA.velocidadeMaxima);
    }
}

/*
  O IMPULSO CINÉTICO: durante a esquiva, a coluna logo à frente do soldado
  é examinada; com a habilidade, toda membrana ali — e logo acima e abaixo,
  para pegar a membrana inteira — vira ar. Sem a habilidade, a membrana
  resiste, e um aviso (uma vez só) dá a pista.

  Romper é TROCAR UM CARACTERE na matriz da sala. Como a matriz mora no
  estado da sala, a membrana continua rompida quando o soldado volta.
*/
function romperMembranas() {
    const xDaFrente = soldado.olhandoPara > 0 ? soldado.x + soldado.largura + 1 : soldado.x - 1;
    const coluna = Math.floor(xDaFrente / TAMANHO_DO_BLOCO);
    const linhaDeCima = Math.floor(soldado.y / TAMANHO_DO_BLOCO) - 1;
    const linhaDeBaixo = Math.floor((soldado.y + soldado.altura - EPSILON) / TAMANHO_DO_BLOCO) + 1;

    for (let linha = linhaDeCima; linha <= linhaDeBaixo; linha++) {
        if (blocoEm(coluna, linha).desenho !== "membrana") {
            continue;
        }

        if (!soldado.impulso) {
            if (!membranaJaResistiu) {
                membranaJaResistiu = true;
                mostrarAviso("A membrana resiste. Algo mais forte talvez a rompa.");
            }
            return;
        }

        trocarBloco(coluna, linha, ".");
        soltarFaiscas((limitar(coluna, 0, COLUNAS - 1) + 0.5) * TAMANHO_DO_BLOCO, (linha + 0.5) * TAMANHO_DO_BLOCO, "#c2306a", 8);
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
// 9. AS ARMAS
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
            dano: ficha.dano * soldado.multiplicadorDeDano,
            alcanceRestante: ficha.alcance,
            empurrao: ficha.empurrao,
            arma: armaAtiva().tipo,
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

    if (arma.recarregando > 0 || arma.municao === tamanhoDoPente(arma.tipo)) {
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
        arma.municao = tamanhoDoPente(arma.tipo);
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
                if (!tiro.acertou) {
                    acertarMatriarca(tiro);
                }
            }
        }

        if (foraDaTela(tiro)) {
            tiro.acertou = true;   // passou pela porta: some (tiros não viajam entre salas)
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
// 10. AS CRIATURAS
// ============================================================
/*
  Cada criatura nasce de uma anotação do gerador ({ especie, coluna,
  linha }), com um CORPO igual ao do soldado (x, y, largura, altura, vx,
  vy, noChao...) — é isso que deixa a mesma moverComColisao servir a todos.

  `lado` alterna entre -1 e 1, na ordem das anotações: é o lado do soldado
  que cada rastejador vai tentar ocupar.
*/
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
        recarga: 0,             // a espera da cuspidora entre um cuspe, e do ninho entre um filhote e outro
        mae: null,              // o ninho ou a Matriarca que pôs esta criatura
        mutada: false,          // nasceu com a vida aumentada pela evolução
        resistente: null        // o tipo de arma que fere esta criatura pela metade
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
    },
    ninho: {
        pulsando: ninhoPulsa
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
        prenderNaSala(criatura);
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

    acido = acido.filter(gota => !gota.acertou && !foraDaTela(gota));
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
// 11. FERIR E SER FERIDO
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

    const matriarcaAcordada = matriarca !== null && !["dormindo", "morrendo", "morta"].includes(matriarca.estado);
    if (matriarcaAcordada && sobrepoe(matriarca, soldado)) {
        ferirSoldado(MATRIARCA.danoDeContato, centro(matriarca).x);
    }

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

    /*
      A RESISTÊNCIA: a criatura que nasceu resistente à arma deste tiro leva
      só metade. E todo dano é anotado por arma e por região — é desse
      registro que a evolução descobre "a arma mais usada" (seção 12).
    */
    const fator = alvo.resistente === tiro.arma ? FATOR_DA_RESISTENCIA : 1;
    const dano = tiro.dano * fator;
    const danoNaRegiao = ecossistema.dano[salaAtual.regiao];
    danoNaRegiao[tiro.arma] = (danoNaRegiao[tiro.arma] || 0) + dano;

    tiro.acertou = true;
    alvo.vida -= dano;
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

        // Filhotes (de ninho ou da Matriarca) não deixam amostras: senão, um ninho seria uma fazenda.
        if (alvo.mae === null) {
            soltarAmostras(meio, CRIATURAS[alvo.especie].amostras);
        }
    }
}

/*
  As amostras nascem espalhadas em volta de onde a criatura morreu, como
  itens comuns — e o ímã (verificarItens) as puxa para o soldado.
*/
function soltarAmostras(meio, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = (i / quantidade) * Math.PI * 2;
        const amostra = criarItem({ tipo: "amostra", coluna: 0, linha: 0 });
        amostra.x = meio.x + Math.cos(angulo) * 5 - 1;
        amostra.y = meio.y + Math.sin(angulo) * 3 - 1;
        itens.push(amostra);
    }
}


// ============================================================
// 12. O ECOSSISTEMA
// ============================================================
/*
  O relógio de cada região, e quanto dano cada arma já fez nela. Nasce
  zerado a cada expedição.
*/
function criarEcossistema() {
    return {
        tempo: { complexo: 0, floresta: 0 },
        dano: { complexo: {}, floresta: {} },
        sorteio: criarFluxo(mundo.semente, "evolucao")
    };
}

/*
  A REGRA DE PIEDADE: com pouca vida, o relógio da região anda pela
  metade. É a "dificuldade adaptativa baseada nos recursos disponíveis"
  do GDD — uma linha, e quem está mal ganha tempo.
*/
function atualizarEcossistema(tempo) {
    const ritmo = soldado.vida < soldado.vidaMaxima * 0.3 ? RITMO_COM_POUCA_VIDA : 1;
    const nivelAntes = nivelDaRegiao(salaAtual.regiao);

    ecossistema.tempo[salaAtual.regiao] += tempo * ritmo;

    const nivelDepois = nivelDaRegiao(salaAtual.regiao);
    if (nivelDepois !== nivelAntes) {
        mostrarAviso(`O ecossistema está ${nivelDepois.nome}`);
        atualizarPainel();
    }
}

// O nível é a última linha da tabela cujo `aPartirDe` já passou: calculado, nunca guardado.
function nivelDaRegiao(regiao) {
    return EVOLUCAO.filter(nivel => ecossistema.tempo[regiao] >= nivel.aPartirDe).pop();
}

function armaMaisUsada(regiao) {
    const danos = Object.entries(ecossistema.dano[regiao]);

    if (danos.length === 0) {
        return null;
    }
    return danos.reduce((maior, atual) => atual[1] > maior[1] ? atual : maior)[0];
}

/*
  Toda criatura que nasce passa por aqui: as do plano do gerador (na
  primeira visita à sala), as dos ninhos, os filhotes da Matriarca e os
  reforços. É o lugar único onde a evolução se aplica.
*/
function evoluir(criatura, regiao = salaAtual.regiao) {
    const nivel = nivelDaRegiao(regiao);

    criatura.vida = Math.round(criatura.vida * nivel.vida);
    criatura.mutada = nivel.vida > 1;
    criatura.resistente = nivel.resistencia ? armaMaisUsada(regiao) : null;
    return criatura;
}

/*
  OS REFORÇOS: no nível "agitado" em diante, entrar numa sala traz
  rastejadores novos, nos pontos marcados longe das portas. O sorteio de
  onde eles nascem usa um fluxo próprio ("evolucao") — os outros sistemas
  não sentem a diferença.
*/
function chamarReforcos(sala) {
    const nivel = nivelDaRegiao(sala.regiao);

    if (nivel.reforcos === 0 || ehPouso(sala) || sala.covil) {
        return;
    }

    const lugares = [];
    MODULOS[sala.modulo].linhas.forEach((texto, linha) => {
        [...texto].forEach((caractere, coluna) => {
            if (caractere === "*" && !pertoDeUmaPorta(sala, coluna, linha)) {
                lugares.push({ coluna, linha });
            }
        });
    });

    for (let i = 0; i < nivel.reforcos && lugares.length > 0; i++) {
        const lugar = escolher(ecossistema.sorteio, lugares);
        criaturas.push(evoluir(criarCriatura("rastejador", lugar, i % 2 === 0 ? -1 : 1), sala.regiao));
    }
}


// ============================================================
// 13. O NINHO
// ============================================================
/*
  O ninho é uma criatura como as outras — tem ficha, vida, estado — que
  não anda: a cada intervalo, se tiver menos filhotes vivos que o máximo,
  solta um rastejador que já nasce perseguindo. Cada filhote lembra quem
  é a mãe (`mae`), e é assim que o ninho conta os seus.
*/
function ninhoPulsa(criatura, ficha) {
    criatura.vx = 0;

    if (criatura.recarga > 0) {
        return;
    }

    const filhotesVivos = criaturas.filter(outra => outra.mae === criatura && outra.vida > 0).length;

    if (filhotesVivos < ficha.maximoDeFilhotes) {
        const filhote = evoluir(criarCriatura("rastejador", { coluna: 0, linha: 0 }, filhotesVivos % 2 === 0 ? -1 : 1));
        filhote.x = centro(criatura).x - filhote.largura / 2;
        filhote.y = criatura.y + criatura.altura - filhote.altura;
        filhote.mae = criatura;
        comecarPerseguicao(filhote);
        criaturas.push(filhote);
        soltarFaiscas(centro(criatura).x, criatura.y, ficha.cores.e, 6);
    }

    criatura.recarga = ficha.intervaloEntreFilhotes;
}


// ============================================================
// 14. A MATRIARCA
// ============================================================
/*
  O chefe NÃO mora na lista de criaturas (a lição do Shoot 'em up): é um
  só, com regras que nenhum outro tem. Mora no estado do covil, e por isso
  continua lá — dormindo, ferida ou morta — se o soldado sair e voltar.

  A MÁQUINA DE ESTADOS DELA:

      dormindo → despertando → andando → aviso → (ataque) → andando ...
                                                  ↘ investida → atordoada ↗
      ... → morrendo → (some, e larga os dados)

  Cada ataque é um estado. O `aviso` sabe qual ataque vem depois dele
  (`proximoAtaque`) e o anuncia do seu jeito: o saco acende para os ovos e
  o cuspe, os olhos piscam para a investida, marcas aparecem no teto para
  a chuva.
*/
function criarMatriarca() {
    return {
        x: tela.width / 2 - MATRIARCA.largura / 2,
        y: 16 * TAMANHO_DO_BLOCO - MATRIARCA.altura,
        largura: MATRIARCA.largura,
        altura: MATRIARCA.altura,
        vx: 0,
        vy: 0,
        noChao: false,
        bateuNaParede: false,
        atravessando: 0,
        olhandoPara: -1,

        vida: MATRIARCA.vida,
        estado: "dormindo",
        tempoNoEstado: 0,
        fase: 0,
        indiceDoAtaque: 0,
        proximoAtaque: null,
        esperaAteAtacar: 0,
        exposta: false,
        piscando: 0,
        alvosDaChuva: [],
        ovosPostos: 0,          // quantos ovos já saíram no ataque atual
        cuspiu: false           // se o cuspe do ataque atual já saiu
    };
}

const ESTADOS_DA_MATRIARCA = {
    dormindo: matriarcaDorme,
    despertando: matriarcaDesperta,
    andando: matriarcaAnda,
    aviso: matriarcaAvisa,
    ovos: matriarcaPoeOvos,
    cuspe: matriarcaCospe,
    investida: matriarcaInveste,
    atordoada: matriarcaSeRecupera,
    chuva: matriarcaFazChover,
    morrendo: matriarcaMorre
};

function atualizarMatriarca(tempo) {
    if (matriarca === null || matriarca.estado === "morta") {
        return;
    }

    matriarca.tempoNoEstado += tempo;
    matriarca.piscando = Math.max(0, matriarca.piscando - tempo);

    ESTADOS_DA_MATRIARCA[matriarca.estado](tempo);

    cair(matriarca, tempo, FISICA.gravidade);
    moverComColisao(matriarca, tempo);
    prenderNaSala(matriarca);
}

/*
  Trocar de estado zera o relógio do estado e os contadores de cada
  ataque — e decide se o saco de ovos está aberto: o ponto fraco exposto
  é uma CONSEQUÊNCIA do estado, nunca um campo que alguém precisa lembrar
  de ligar e desligar.
*/
/*
  A lista de ataques de uma fase: a da tabela, mais os aprendidos com as
  vitórias da campanha.
*/
function ataquesDaFase(indice) {
    const aprendidos = ATAQUES_APRENDIDOS
        .slice(0, campanha.estatisticas.vitorias)
        .filter(aprendido => aprendido.fase === indice)
        .map(aprendido => aprendido.ataque);

    return [...MATRIARCA.fases[indice].ataques, ...aprendidos];
}

function mudarEstadoDaMatriarca(novoEstado) {
    matriarca.estado = novoEstado;
    matriarca.tempoNoEstado = 0;
    matriarca.ovosPostos = 0;
    matriarca.cuspiu = false;
    matriarca.exposta = novoEstado === "ovos" || novoEstado === "atordoada";
}

function faseAtual() {
    return MATRIARCA.fases[matriarca.fase];
}

/*
  Dormindo até o soldado chegar perto. Então o covil se FECHA: as portas
  viram selos, a barra de vida aparece, e não há como fugir — nem como
  voltar para buscar cápsulas no meio da luta.
*/
function matriarcaDorme() {
    matriarca.vx = 0;

    if (Math.abs(centro(soldado).x - centro(matriarca).x) < MATRIARCA.distanciaParaDespertar) {
        selarCovil(true);
        registrarNoBestiario("matriarca");
        mostrarAviso("A Matriarca despertou");
        barraDoChefe.classList.add("visivel");
        atualizarBarraDoChefe();
        mudarEstadoDaMatriarca("despertando");
    }
}

function matriarcaDesperta() {
    matriarca.olhandoPara = ladoDoSoldado(matriarca);

    if (matriarca.tempoNoEstado >= MATRIARCA.tempoDeDespertar) {
        matriarca.esperaAteAtacar = faseAtual().pausa;
        mudarEstadoDaMatriarca("andando");
    }
}

/*
  ANDANDO: vai na direção do soldado, na rapidez da fase, e conta o tempo
  até o próximo ataque. Os ataques saem da lista da fase em CICLO (o `%`
  do chefe do Shoot 'em up).
*/
function matriarcaAnda(tempo) {
    const fase = faseAtual();
    matriarca.olhandoPara = ladoDoSoldado(matriarca);
    matriarca.vx = matriarca.olhandoPara * fase.rapidez;
    matriarca.esperaAteAtacar -= tempo;

    if (matriarca.esperaAteAtacar > 0) {
        return;
    }

    const ataques = ataquesDaFase(matriarca.fase);
    matriarca.proximoAtaque = ataques[matriarca.indiceDoAtaque % ataques.length];
    matriarca.indiceDoAtaque += 1;

    if (matriarca.proximoAtaque === "chuva") {
        escolherAlvosDaChuva();
    }
    mudarEstadoDaMatriarca("aviso");
}

function matriarcaAvisa() {
    matriarca.vx = 0;
    matriarca.olhandoPara = ladoDoSoldado(matriarca);

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques[matriarca.proximoAtaque].aviso) {
        mudarEstadoDaMatriarca(matriarca.proximoAtaque);
    }
}

function voltarAAndar() {
    matriarca.esperaAteAtacar = faseAtual().pausa;
    mudarEstadoDaMatriarca("andando");
}

/*
  OVOS: o saco se abre (o ponto fraco exposto) e solta filhotes — sem
  passar do máximo de vivos. Os filhotes são rastejadores comuns, com a
  evolução da região: a mesma fábrica de todos.
*/
function matriarcaPoeOvos() {
    const ataque = MATRIARCA.ataques.ovos;
    matriarca.vx = 0;

    // Os ovos saem espaçados por igual ao longo do ataque.
    const vivos = criaturas.filter(criatura => criatura.mae === matriarca).length;
    const horaDoProximo = (matriarca.ovosPostos + 1) * ataque.duracao / (ataque.filhotes + 1);

    if (matriarca.tempoNoEstado >= horaDoProximo && matriarca.ovosPostos < ataque.filhotes && vivos < ataque.maximoDeFilhotes) {
        const atras = -matriarca.olhandoPara;
        const filhote = evoluir(criarCriatura("rastejador", { coluna: 0, linha: 0 }, matriarca.ovosPostos % 2 === 0 ? -1 : 1));
        filhote.x = centro(matriarca).x + atras * 8 - filhote.largura / 2;
        filhote.y = matriarca.y + matriarca.altura - filhote.altura;
        filhote.vx = atras * 60;
        filhote.vy = -120;
        filhote.mae = matriarca;
        comecarPerseguicao(filhote);
        criaturas.push(filhote);
        matriarca.ovosPostos += 1;
        soltarFaiscas(filhote.x, filhote.y, MATRIARCA.cores.e, 6);
    }

    if (matriarca.tempoNoEstado >= ataque.duracao) {
        voltarAAndar();
    }
}

/*
  CUSPE: três gotas com a conta do bote (passo 5), mirando nos pés do
  soldado e um pouco antes e depois dele — um leque de parábolas.
*/
function matriarcaCospe() {
    const ataque = MATRIARCA.ataques.cuspe;
    matriarca.vx = 0;

    if (matriarca.cuspiu) {
        if (matriarca.tempoNoEstado >= ataque.duracao) {
            voltarAAndar();
        }
        return;
    }

    const origem = { x: centro(matriarca).x + matriarca.olhandoPara * 8, y: matriarca.y + 2 };
    for (let i = 0; i < ataque.gotas; i++) {
        const desvio = (i - (ataque.gotas - 1) / 2) * ataque.espalhamento;
        const alvo = { x: centro(soldado).x + desvio, y: soldado.y + soldado.altura - 2 };
        acido.push({
            x: origem.x,
            y: origem.y,
            vx: (alvo.x - origem.x) / ataque.tempoDeVoo,
            vy: (alvo.y - origem.y) / ataque.tempoDeVoo - ACIDO.gravidade * ataque.tempoDeVoo / 2,
            acertou: false
        });
    }
    matriarca.cuspiu = true;
}

/*
  INVESTIDA: em linha reta, rápido, até bater na parede — e então ela
  fica TONTA, com o saco aberto. É a janela que o aviso (os olhos piscando)
  prometeu a quem pulou por cima.
*/
function matriarcaInveste() {
    matriarca.vx = matriarca.olhandoPara * MATRIARCA.ataques.investida.rapidez;

    if (matriarca.bateuNaParede) {
        soltarFaiscas(centro(matriarca).x + matriarca.olhandoPara * 11, centro(matriarca).y, "#e2e8f5", 12);
        mudarEstadoDaMatriarca("atordoada");
    }
}

function matriarcaSeRecupera() {
    matriarca.vx = 0;

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques.investida.atordoamento) {
        voltarAAndar();
    }
}

/*
  CHUVA: gotas caem do teto onde as marcas apareceram durante o aviso. Uma
  delas sempre em cima de onde o soldado estava — as outras, espalhadas
  pelo sorteio do ecossistema.
*/
function escolherAlvosDaChuva() {
    const quantidade = MATRIARCA.ataques.chuva.gotas;
    matriarca.alvosDaChuva = [centro(soldado).x];

    for (let i = 1; i < quantidade; i++) {
        matriarca.alvosDaChuva.push(16 + ecossistema.sorteio() * (tela.width - 32));
    }
}

function matriarcaFazChover() {
    matriarca.vx = 0;

    if (matriarca.alvosDaChuva.length > 0) {
        matriarca.alvosDaChuva.forEach(x => {
            acido.push({ x, y: 3 * TAMANHO_DO_BLOCO, vx: 0, vy: 0, acertou: false });
        });
        matriarca.alvosDaChuva = [];
    }

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques.chuva.duracao) {
        voltarAAndar();
    }
}

/*
  A FASE É DERIVADA DA VIDA (o chefe do Shoot 'em up): a primeira fase
  cujo limite ainda está abaixo da vida atual. Trocar de fase limpa o
  ácido da tela — um respiro — e recomeça a lista de ataques.
*/
function ferirMatriarca(dano) {
    if (matriarca.estado === "dormindo" || matriarca.estado === "morrendo") {
        return;
    }

    matriarca.vida = Math.max(0, matriarca.vida - dano);
    matriarca.piscando = 0.06;
    atualizarBarraDoChefe();

    if (matriarca.vida === 0) {
        acido = [];
        matriarca.vx = 0;
        mudarEstadoDaMatriarca("morrendo");
        return;
    }

    const fracao = matriarca.vida / MATRIARCA.vida;
    const novaFase = MATRIARCA.fases.findIndex(fase => fracao > fase.ateVida);

    if (novaFase !== matriarca.fase) {
        matriarca.fase = novaFase;
        matriarca.indiceDoAtaque = 0;
        acido = [];
        mostrarAviso(novaFase === 1 ? "A Matriarca se enfurece" : "A Matriarca está desesperada");
    }
}

/*
  Os tiros conferem a Matriarca depois das criaturas. Com o saco fechado,
  a armadura deixa passar só uma parte — e a faísca sai cinza, um "tinc"
  visual que diz ao jogador: espere a hora certa.
*/
function acertarMatriarca(tiro) {
    if (matriarca === null || matriarca.estado === "morta" || !contemPonto(matriarca, tiro.x, tiro.y)) {
        return;
    }

    tiro.acertou = true;
    const fator = matriarca.exposta ? 1 : MATRIARCA.armadura;
    ferirMatriarca(tiro.dano * fator);
    soltarFaiscas(tiro.x, tiro.y, matriarca.exposta ? MATRIARCA.cores.e : "#8a93b8", 3);
}

/*
  MORRENDO: dois segundos de estouros, e então ela some. No lugar, os
  DADOS DA COLÔNIA; as portas do covil se abrem.
*/
function matriarcaMorre() {
    matriarca.vx = 0;
    if (Math.random() < 0.5) {
        soltarFaiscas(
            matriarca.x + Math.random() * matriarca.largura,
            matriarca.y + Math.random() * matriarca.altura,
            Math.random() < 0.5 ? MATRIARCA.cores.e : MATRIARCA.cores.C,
            4
        );
    }

    if (matriarca.tempoNoEstado >= MATRIARCA.tempoDeMorte) {
        const meio = centro(matriarca);
        const item = criarItem({ tipo: "dados", coluna: 0, linha: 0 });
        item.x = meio.x - item.largura / 2;
        item.y = matriarca.y + matriarca.altura - item.altura;
        itens.push(item);

        soltarAmostras(meio, MATRIARCA.amostras);

        matriarca.estado = "morta";
        selarCovil(false);
        barraDoChefe.classList.remove("visivel");
        mostrarAviso("A Matriarca caiu. Os dados estão no chão do covil.");
        atualizarObjetivo();
    }
}

/*
  Os SELOS do covil: as portas da sala trocam de caractere — "%" fecha, "."
  abre. O mesmo truque da membrana: o mundo é uma matriz de letras.
*/
function selarCovil(fechar) {
    [13, 14, 15].forEach(linha => {
        if (salaAtual.portas.O) trocarBloco(0, linha, fechar ? "%" : ".");
        if (salaAtual.portas.L) trocarBloco(COLUNAS - 1, linha, fechar ? "%" : ".");
    });
}

function atualizarBarraDoChefe() {
    vidaDoChefe.value = matriarca.vida / MATRIARCA.vida;
}


// ============================================================
// 15. A CAMPANHA
// ============================================================
/*
  O CICLO ROGUELIKE (GDD, seção 3): preparar na base → descer → explorar
  e lutar → coletar amostras → extrair, cumprir a missão ou morrer → usar
  as amostras para evoluir → descer de novo.

  Duas memórias, de tamanhos diferentes:

  - a EXPEDIÇÃO: o planeta, a vida, a munição, as amostras carregadas.
    Some ao fim de cada descida.
  - a CAMPANHA: as amostras guardadas, as melhorias, as habilidades
    permanentes, os registros. Sobrevive à morte — e ao fechar a página,
    salva no navegador.

  "A morte deve provocar a perda de parte dos recursos temporários, mas
  não apagar completamente o progresso do jogador": morrer guarda METADE
  das amostras carregadas; extrair ou cumprir a missão guarda TODAS.
*/
function campanhaNova() {
    return {
        versao: VERSAO_DA_CAMPANHA,
        amostras: 0,
        melhorias: Object.fromEntries(Object.keys(MELHORIAS).map(nome => [nome, 0])),
        habilidades: { impulso: false },
        estatisticas: { expedicoes: 0, mortes: 0, extracoes: 0, vitorias: 0, amostrasGuardadas: 0 },
        bestiario: []
    };
}

/*
  LER COM DESCONFIANÇA — a lição do recorde do Tetris, agora para um
  objeto inteiro. O que vem do localStorage pode ser de outra versão do
  jogo, pode ter sido editado à mão, pode ser lixo. Então nada é usado
  como veio: parte-se de uma campanha nova e copia-se, campo a campo, só o
  que passa na conferência. Um campo estragado vira zero; o resto se salva.
*/
function carregarCampanha() {
    try {
        const texto = localStorage.getItem(CHAVE_DA_CAMPANHA);
        return texto === null ? campanhaNova() : sanearCampanha(JSON.parse(texto));
    } catch (erro) {
        return campanhaNova();
    }
}

function sanearCampanha(lida) {
    const limpa = campanhaNova();

    if (lida === null || typeof lida !== "object" || lida.versao !== VERSAO_DA_CAMPANHA) {
        return limpa;
    }

    const inteiro = (valor, maximo = Infinity) =>
        Number.isFinite(valor) && valor >= 0 ? Math.min(Math.floor(valor), maximo) : 0;

    limpa.amostras = inteiro(lida.amostras);
    for (const nome of Object.keys(MELHORIAS)) {
        limpa.melhorias[nome] = inteiro(lida.melhorias?.[nome], MELHORIAS[nome].custos.length);
    }
    limpa.habilidades.impulso = lida.habilidades?.impulso === true;
    for (const nome of Object.keys(limpa.estatisticas)) {
        limpa.estatisticas[nome] = inteiro(lida.estatisticas?.[nome]);
    }
    if (Array.isArray(lida.bestiario)) {
        limpa.bestiario = lida.bestiario.filter(especie => especie in BESTIARIO);
    }
    return limpa;
}

function salvarCampanha() {
    try {
        localStorage.setItem(CHAVE_DA_CAMPANHA, JSON.stringify(campanha));
    } catch (erro) {
        // Sem armazenamento (navegação privada, disco cheio): a campanha vale até fechar a página.
    }
}

/*
  AS MELHORIAS VIRAM NÚMEROS no começo de cada expedição. O resto do jogo
  não sabe que melhorias existem: ele só usa os multiplicadores do
  soldado. Uma melhoria nova é uma linha na tabela e uma linha aqui.
*/
function aplicarMelhorias() {
    const nivel = nome => campanha.melhorias[nome];

    soldado.vidaMaxima = VIDA_DO_SOLDADO + nivel("blindagem") * MELHORIAS.blindagem.porNivel;
    soldado.vida = soldado.vidaMaxima;
    soldado.multiplicadorDeDano = 1 + nivel("calibre") * MELHORIAS.calibre.porNivel;
    soldado.multiplicadorDoPente = 1 + nivel("carregador") * MELHORIAS.carregador.porNivel;
    soldado.multiplicadorDaEsquiva = 1 - nivel("reflexos") * MELHORIAS.reflexos.porNivel;
    soldado.impulso = campanha.habilidades.impulso;
}

function tamanhoDoPente(tipo) {
    return Math.round(ARMAS[tipo].pente * soldado.multiplicadorDoPente);
}

function registrarNoBestiario(especie) {
    if (!campanha.bestiario.includes(especie)) {
        campanha.bestiario.push(especie);
    }
}

/*
  OS TRÊS FINAIS de uma expedição passam todos por aqui: quanto das
  amostras carregadas vai para a campanha, que registro sobe, e salvar.
*/
function encerrarExpedicao(fracaoGuardada, registro) {
    const guardadas = Math.floor(expedicao.amostras * fracaoGuardada);

    campanha.amostras += guardadas;
    campanha.estatisticas.amostrasGuardadas += guardadas;
    campanha.estatisticas.expedicoes += 1;
    campanha.estatisticas[registro] += 1;
    salvarCampanha();

    estado = "fim";
    return guardadas;
}

function terminarPartida() {
    const guardadas = encerrarExpedicao(FRACAO_GUARDADA_NA_MORTE, "mortes");
    soltarFaiscas(centro(soldado).x, centro(soldado).y, "#c9d3e6", 20);
    mostrarMensagem("Abatido", `A nave recuperou ${guardadas} de ${expedicao.amostras} amostras. O resto ficou no planeta.`);
}

function extrair() {
    const guardadas = encerrarExpedicao(1, "extracoes");
    mostrarMensagem("Extração", `De volta à órbita com todas as ${guardadas} amostras.`);
    camadaMensagem.classList.add("vitoria");
}

function concluirExpedicao() {
    expedicao.amostras += BONUS_DOS_DADOS;
    const guardadas = encerrarExpedicao(1, "vitorias");
    mostrarMensagem("Dados recuperados", `A colônia deixou registros — e algo os guardava. ${guardadas} amostras guardadas.`);
    camadaMensagem.classList.add("vitoria");
}

/*
  A EXTRAÇÃO: no pouso, perto da nave, segurar ↑ por um segundo. Segurar,
  e não apertar: ↑ também é mirar para cima, e ninguém deveria encerrar a
  expedição sem querer. É a escolha do GDD (seção 3): "extrair recursos ou
  continuar explorando".
*/
function atualizarExtracao(tempo) {
    const naZona = ehPouso(salaAtual) && soldado.noChao
        && soldado.x > ZONA_DE_EXTRACAO.de && soldado.x < ZONA_DE_EXTRACAO.ate;

    if (naZona && !estavaNaZonaDeExtracao) {
        mostrarAviso("Segure ↑ para extrair: guardar todas as amostras e voltar à base");
    }
    estavaNaZonaDeExtracao = naZona;

    tempoSegurandoExtracao = naZona && acao("cima") ? tempoSegurandoExtracao + tempo : 0;

    if (tempoSegurandoExtracao >= TEMPO_PARA_EXTRAIR) {
        tempoSegurandoExtracao = 0;
        extrair();
    }
}


// ============================================================
// 16. A BASE
// ============================================================
/*
  A BASE é um ESTADO do jogo, como "jogando" e "fim" — e é também uma
  sala: o hangar é o módulo do pouso, sem portas, desenhado pelas mesmas
  funções. Por cima dele, o painel HTML com as melhorias, os registros, o
  bestiário e a semente da próxima descida.

  A base EVOLUI À VISTA (GDD, seção 9): cada nível de melhoria acende uma
  luz na parede; o Impulso, quando conquistado, fica exposto numa
  plataforma; cada missão cumprida deixa um núcleo de dados na prateleira.
*/
function abrirBase() {
    estado = "base";
    camadaMensagem.hidden = true;
    barraDoChefe.classList.remove("visivel");
    campoAviso.hidden = true;

    salaAtual = null;
    matriarca = null;
    criaturas = [];
    itens = [];
    tiros = [];
    acido = [];
    pocas = [];
    particulas = [];
    estadoDaSala = { blocos: construirBlocos({ modulo: POUSO.modulo, portas: {}, membranas: [] }) };
    paleta = PALETAS.complexo;

    montarBase();
    telaDaBase.hidden = false;
    document.body.classList.add("na-base");   // o CSS esconde o painel da expedição
    campoSemente.value = sortearSemente();
    botaoDescer.focus();
}

/*
  O painel da base é MONTADO DA TABELA: cada melhoria vira um item com
  nome, efeito, nível e um botão de compra. Uma melhoria nova na tabela
  aparece aqui sozinha.
*/
function montarBase() {
    campoSaldo.textContent = campanha.amostras;

    listaDeMelhorias.replaceChildren(...Object.entries(MELHORIAS).map(([nome, melhoria]) => {
        const nivel = campanha.melhorias[nome];
        const custo = melhoria.custos[nivel];
        const item = document.createElement("li");
        const texto = document.createElement("span");
        const marcas = document.createElement("span");
        const botao = document.createElement("button");

        texto.textContent = `${melhoria.nome} — ${melhoria.descricao}`;
        marcas.className = "nivel";
        marcas.textContent = "■".repeat(nivel) + "□".repeat(melhoria.custos.length - nivel);
        marcas.setAttribute("aria-label", `nível ${nivel} de ${melhoria.custos.length}`);
        botao.type = "button";
        botao.textContent = custo === undefined ? "Máximo" : `Comprar (${custo})`;
        botao.disabled = custo === undefined || campanha.amostras < custo;
        botao.addEventListener("click", () => comprarMelhoria(nome));

        item.append(texto, marcas, botao);
        return item;
    }));

    const registros = campanha.estatisticas;
    listaDeRegistros.textContent = [
        contar(registros.expedicoes, "expedição", "expedições"),
        contar(registros.vitorias, "missão cumprida", "missões cumpridas"),
        contar(registros.extracoes, "extração", "extrações"),
        contar(registros.mortes, "morte", "mortes"),
        contar(registros.amostrasGuardadas, "amostra guardada", "amostras guardadas"),
        ...(campanha.habilidades.impulso ? ["Impulso Cinético conquistado"] : [])
    ].join(" · ");

    listaDoBestiario.replaceChildren(...campanha.bestiario.map(especie => {
        const item = document.createElement("li");
        item.textContent = BESTIARIO[especie];
        return item;
    }));
    if (campanha.bestiario.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Nenhuma criatura registrada ainda.";
        listaDoBestiario.append(item);
    }
}

function contar(quantidade, singular, plural) {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function comprarMelhoria(nome) {
    const custo = MELHORIAS[nome].custos[campanha.melhorias[nome]];

    if (custo === undefined || campanha.amostras < custo) {
        return;
    }

    campanha.amostras -= custo;
    campanha.melhorias[nome] += 1;
    salvarCampanha();
    montarBase();
}

/*
  APAGAR A CAMPANHA pede dois cliques: o primeiro só arma o botão, por 3
  segundos. Nada de confirm(), que trava a página inteira — e nada de
  apagar meses de progresso com um clique distraído.
*/
let apagarArmadoAte = 0;

function apagarCampanha() {
    if (performance.now() > apagarArmadoAte) {
        apagarArmadoAte = performance.now() + 3000;
        botaoApagar.textContent = "Clique de novo para apagar tudo";
        return;
    }

    campanha = campanhaNova();
    salvarCampanha();
    apagarArmadoAte = 0;
    botaoApagar.textContent = "Apagar campanha";
    montarBase();
}

function desenharBase() {
    desenharFundo();
    desenharBlocos();

    // Uma luz por nível de melhoria comprado, numa fileira na parede do fundo.
    let indice = 0;
    for (const [nome, melhoria] of Object.entries(MELHORIAS)) {
        for (let nivel = 0; nivel < melhoria.custos.length; nivel++) {
            const acesa = nivel < campanha.melhorias[nome];
            const x = 20 + indice * 14;
            pincel.fillStyle = acesa ? "#ffcc33" : "#1d2638";
            pincel.fillRect(x, 20, 6, 3);
            if (acesa) {
                pincel.fillStyle = "rgba(255, 204, 51, 0.15)";
                pincel.fillRect(x - 2, 23, 10, 6);
            }
            indice += 1;
        }
    }

    if (campanha.habilidades.impulso) {
        desenharSprite(ITENS.impulso.sprite, ITENS.impulso.cores, 8 * TAMANHO_DO_BLOCO, 7 * TAMANHO_DO_BLOCO - 7);
    }
    for (let i = 0; i < Math.min(campanha.estatisticas.vitorias, 8); i++) {
        desenharSprite(ITENS.dados.sprite, ITENS.dados.cores, 4 * TAMANHO_DO_BLOCO + i * 7, 10 * TAMANHO_DO_BLOCO - 7);
    }
}


// ============================================================
// 17. PERGUNTAS SOBRE UM BLOCO
// ============================================================
/*
  FORA DA SALA, VALE A BORDA MAIS PRÓXIMA. Antes, fora era sempre sólido —
  e o soldado não conseguiria passar por uma porta. Agora a coluna -1
  repete a coluna 0: onde a borda é parede, fora é parede; onde a borda é
  uma porta aberta, fora é ar, e dá para sair.
*/
function blocoEm(coluna, linha) {
    const colunaDentro = limitar(coluna, 0, COLUNAS - 1);
    const linhaDentro = limitar(linha, 0, LINHAS - 1);

    return BLOCOS[estadoDaSala.blocos[linhaDentro][colunaDentro]];
}

function trocarBloco(coluna, linha, caractere) {
    estadoDaSala.blocos[limitar(linha, 0, LINHAS - 1)][limitar(coluna, 0, COLUNAS - 1)] = caractere;
}

function ehSolido(coluna, linha) {
    return blocoEm(coluna, linha).solido;
}


// ============================================================
// 18. DESENHAR
// ============================================================
function desenhar() {
    if (estado === "base") {
        desenharBase();
        return;
    }

    desenharFundo();
    desenharBlocos();
    desenharItens();
    desenharPocas();
    desenharMatriarca();
    desenharCriaturas();
    desenharRastro();

    if (estado === "jogando") {
        desenharSoldado();
        desenharArma();
        desenharExtracao();
    }

    desenharTiros();
    desenharAcido();
    desenharParticulas();

    if (VISOES_DE_DEPURACAO[visaoDeDepuracao] === "caixas") {
        desenharCaixas();
        desenharPontosDeSurgimento();
    }
    if (VISOES_DE_DEPURACAO[visaoDeDepuracao] === "mapa") {
        desenharMapaDoGerador();
    }
}

function desenharFundo() {
    pincel.fillStyle = paleta.painel;
    pincel.fillRect(0, 0, tela.width, tela.height);

    if (paleta.fundo === "paineis") {
        desenharPaineis();
    } else {
        desenharCaverna();
    }
}

function desenharPaineis() {
    pincel.fillStyle = paleta.juntaDoPainel;
    for (let x = 0; x < tela.width; x += 16) {
        pincel.fillRect(x, 0, 1, tela.height);
    }
    for (let y = 0; y < tela.height; y += 16) {
        pincel.fillRect(0, y, tela.width, 1);
    }
}

/*
  A caverna da floresta: esporos que brilham e apagam. As posições vêm de
  um sorteador com a semente da PRÓPRIA SALA — cada sala tem os seus
  esporos, sempre os mesmos, e nenhum número é tirado dos fluxos do
  gerador. Um enfeite também pode ser repetível.
*/
function desenharCaverna() {
    const sortear = criarSorteador(hashDeTexto(`esporos:${chave(salaAtual.coluna, salaAtual.linha)}`));

    for (let i = 0; i < 40; i++) {
        const x = Math.floor(sortear() * tela.width);
        const y = Math.floor(sortear() * tela.height);
        const fase = sortear() * Math.PI * 2;
        const brilho = Math.sin(tempoTotal * 1.5 + fase);

        pincel.fillStyle = brilho > 0.3 ? "#3fd18b" : paleta.juntaDoPainel;
        pincel.fillRect(x, y, 1, 1);
    }
}

const DESENHOS_DE_BLOCO = {
    metal: desenharMetal,
    casco: desenharCasco,
    membrana: desenharMembrana,
    selo: desenharSelo,
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

    pincel.fillStyle = paleta.metal;
    pincel.fillRect(x, y, lado, lado);

    const arEmCima = !ehSolido(coluna, linha - 1);
    const arEmbaixo = !ehSolido(coluna, linha + 1);
    const arAEsquerda = !ehSolido(coluna - 1, linha);
    const arADireita = !ehSolido(coluna + 1, linha);

    pincel.fillStyle = paleta.metalEscuro;
    if (arEmbaixo) pincel.fillRect(x, y + lado - 1, lado, 1);
    if (arADireita) pincel.fillRect(x + lado - 1, y, 1, lado);

    pincel.fillStyle = paleta.metalClaro;
    if (arEmCima) pincel.fillRect(x, y, lado, 1);
    if (arAEsquerda) pincel.fillRect(x, y, 1, lado);

    if (arEmCima || arEmbaixo || arAEsquerda || arADireita) {
        pincel.fillStyle = paleta.rebite;
        pincel.fillRect(x + 3, y + 3, 1, 1);
    }
}

/*
  O casco da nave de pouso: placas claras com uma faixa escura. Sólido como
  o metal, mas com outra cara — outra linha na tabela de blocos.
*/
function desenharCasco(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.casco;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, TAMANHO_DO_BLOCO);
    pincel.fillStyle = paleta.cascoEscuro;
    pincel.fillRect(x, y + 5, TAMANHO_DO_BLOCO, 1);
    if (!ehSolido(coluna, linha + 1)) {
        pincel.fillRect(x, y + TAMANHO_DO_BLOCO - 1, TAMANHO_DO_BLOCO, 1);
    }
}

/*
  A membrana PULSA: veias que acendem e apagam numa onda que desce. Viva,
  orgânica, diferente de tudo o que é metal — o jogador entende que ela
  não é parede comum, e que talvez exista um jeito de passar.
*/
function desenharMembrana(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;
    const pulso = (Math.sin(tempoTotal * 4 - linha) + 1) / 2;

    pincel.fillStyle = "#3a0f2a";
    pincel.fillRect(x + 1, y, TAMANHO_DO_BLOCO - 2, TAMANHO_DO_BLOCO);
    pincel.fillStyle = pulso > 0.5 ? "#e0447f" : "#8a1f4c";
    pincel.fillRect(x + 3, y, 1, TAMANHO_DO_BLOCO);
    pincel.fillRect(x + 2, y + 2, 1, 2);
    pincel.fillRect(x + 4, y + 5, 1, 2);
}

/*
  O selo do covil: carne escura com dentes. Não pulsa como a membrana —
  não é uma passagem esperando a chave certa, é uma boca fechada.
*/
function desenharSelo(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = "#2a0d14";
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, TAMANHO_DO_BLOCO);
    pincel.fillStyle = "#e2e8f5";
    pincel.fillRect(x + 1, y + 1, 1, 2);
    pincel.fillRect(x + 4, y + 4, 1, 2);
    pincel.fillRect(x + 6, y + 1, 1, 2);
}

function desenharCano(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.cano;
    pincel.fillRect(x + 2, y, 4, TAMANHO_DO_BLOCO);
    pincel.fillStyle = paleta.canoClaro;
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

    pincel.fillStyle = paleta.grade;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 3);
    pincel.fillStyle = paleta.gradeClara;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 1);

    // Os furos da grade, um sim, um não.
    pincel.fillStyle = paleta.painel;
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

        if (criatura.especie === "ninho" && criatura.recarga < 0.6) {
            cores = { ...cores, e: Math.floor(tempoTotal * 12) % 2 ? "#ffffff" : cores.e };   // o aviso do filhote
        }

        /*
          A EVOLUÇÃO À VISTA: a carapaça mutada fica dourada; a borda da
          criatura resistente ganha a cor da arma que ela aguenta. O
          jogador lê a regra no desenho — e troca de arma.
        */
        if (criatura.mutada) {
            cores = { ...cores, C: "#c9a227", N: "#c9a227" };
        }
        if (criatura.resistente) {
            cores = { ...cores, c: ARMAS[criatura.resistente].cor, n: ARMAS[criatura.resistente].cor, a: ARMAS[criatura.resistente].cor };
        }

        const corUnica = criatura.piscando > 0 ? "#ffffff" : null;
        const x = criatura.x + (criatura.largura - quadro[0].length) / 2;
        desenharSprite(quadro, cores, x, criatura.y, criatura.olhandoPara < 0, corUnica);
    });
}

/*
  A Matriarca desenhada conforme o estado: o saco de ovos PULSA quando
  aberto (o ponto fraco à vista), os olhos piscam no aviso da investida,
  o saco acende no aviso dos ovos e do cuspe, e marcas vermelhas descem do
  teto no aviso da chuva.
*/
function desenharMatriarca() {
    if (matriarca === null || matriarca.estado === "morta") {
        return;
    }

    let cores = MATRIARCA.cores;
    const piscar = Math.floor(tempoTotal * 10) % 2 === 0;
    const avisando = matriarca.estado === "aviso";

    if (matriarca.exposta) {
        cores = { ...cores, S: piscar ? "#b8ff3c" : "#e8ff9a", s: "#7ad14a" };
    }
    if (avisando && matriarca.proximoAtaque === "investida") {
        cores = { ...cores, o: piscar ? "#ffffff" : "#ff5a3c" };
    }
    if (avisando && (matriarca.proximoAtaque === "ovos" || matriarca.proximoAtaque === "cuspe")) {
        cores = { ...cores, S: piscar ? "#b8ff3c" : MATRIARCA.cores.S };
    }
    if (avisando && matriarca.proximoAtaque === "chuva") {
        pincel.fillStyle = piscar ? "#ff3b6b" : "#8a1f3c";
        matriarca.alvosDaChuva.forEach(x => {
            pincel.fillRect(Math.round(x) - 2, 2 * TAMANHO_DO_BLOCO, 5, 1);
            pincel.fillRect(Math.round(x) - 1, 2 * TAMANHO_DO_BLOCO + 1, 3, 1);
            pincel.fillRect(Math.round(x), 2 * TAMANHO_DO_BLOCO + 2, 1, 1);
        });
    }

    const corUnica = matriarca.piscando > 0 ? "#ffffff" : null;
    const tremor = matriarca.estado === "despertando" ? Math.round(Math.sin(tempoTotal * 60)) : 0;
    desenharSprite(MATRIARCA.sprite, cores, matriarca.x + tremor, matriarca.y, matriarca.olhandoPara < 0, corUnica);
}

// A barra da extração, sobre a cabeça do soldado, enquanto ele segura ↑.
function desenharExtracao() {
    if (tempoSegurandoExtracao <= 0) {
        return;
    }
    const x = Math.round(soldado.x) - 3;
    const y = Math.round(soldado.y) - 5;
    pincel.fillStyle = "#1d2638";
    pincel.fillRect(x, y, 12, 2);
    pincel.fillStyle = "#3cf2ff";
    pincel.fillRect(x, y, Math.round(12 * tempoSegurandoExtracao / TEMPO_PARA_EXTRAIR), 2);
}

function desenharItens() {
    itens.forEach(item => {
        const flutua = Math.round(Math.sin(tempoTotal * 3) * 0.6);
        desenharSprite(ITENS[item.tipo].sprite, ITENS[item.tipo].cores, item.x, item.y + flutua);
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
    pincel.fillText(`sala ${chave(salaAtual.coluna, salaAtual.linha)}  ${salaAtual.modulo}  distância ${salaAtual.distancia}`, 100, 14);

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
    if (matriarca !== null && matriarca.estado !== "morta") {
        pincel.strokeStyle = "#ff3bd4";
        pincel.strokeRect(Math.round(matriarca.x) + 0.5, Math.round(matriarca.y) + 0.5, matriarca.largura - 1, matriarca.altura - 1);
        pincel.fillStyle = "#ff3bd4";
        const rotulo = matriarca.estado === "aviso" ? `aviso: ${matriarca.proximoAtaque}` : matriarca.estado;
        pincel.fillText(`${rotulo} · fase ${matriarca.fase + 1}${matriarca.exposta ? " · exposta" : ""}`, Math.round(matriarca.x) - 10, Math.round(matriarca.y) - 3);
    }
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


/*
  OS PONTOS DE SURGIMENTO (primeira visão do H): cada "*" do módulo é um
  X — amarelo se uma criatura nasceu ali, cinza se o sorteio deixou vazio
  —, e um quadrado vermelho em volta de cada porta usada marca a zona
  onde nenhuma criatura pode nascer.
*/
function desenharPontosDeSurgimento() {
    const ocupados = new Set(salaAtual.criaturas.map(criatura => chave(criatura.coluna, criatura.linha)));

    MODULOS[salaAtual.modulo].linhas.forEach((texto, linha) => {
        [...texto].forEach((caractere, coluna) => {
            if (caractere !== "*") {
                return;
            }
            const x = coluna * TAMANHO_DO_BLOCO;
            const y = linha * TAMANHO_DO_BLOCO;
            pincel.strokeStyle = ocupados.has(chave(coluna, linha)) ? "#ffdc3c" : "#56627a";
            pincel.beginPath();
            pincel.moveTo(x + 1, y + 1);
            pincel.lineTo(x + 7, y + 7);
            pincel.moveTo(x + 7, y + 1);
            pincel.lineTo(x + 1, y + 7);
            pincel.stroke();
        });
    });

    const raio = POPULACAO.distanciaSeguraDasPortas;
    pincel.strokeStyle = "rgba(255, 59, 107, 0.6)";
    for (const [direcao, porta] of Object.entries(CENTRO_DAS_ABERTURAS)) {
        if (salaAtual.portas[direcao]) {
            pincel.strokeRect(
                (porta.coluna - raio + 1) * TAMANHO_DO_BLOCO + 0.5,
                (porta.linha - raio + 1) * TAMANHO_DO_BLOCO + 0.5,
                (raio * 2 - 1) * TAMANHO_DO_BLOCO,
                (raio * 2 - 1) * TAMANHO_DO_BLOCO
            );
        }
    }
}

/*
  O MAPA DO GERADOR (segunda visão do H): o planeta inteiro, como o
  gerador e o validador o enxergam — inclusive o que o jogador ainda não
  descobriu. É uma ferramenta de quem faz o jogo, não de quem joga: o GDD
  pede "ferramentas de depuração para visualizar conexões entre salas,
  pontos de surgimento, rotas obrigatórias e áreas inacessíveis".

  - cada sala é um retângulo da cor da região, com a distância até o pouso;
  - portas são linhas brancas; membranas, vermelhas;
  - a ROTA OBRIGATÓRIA (pouso → Impulso → covil) é a linha amarela,
    calculada com a mesma busca do validador;
  - as salas que só o Impulso alcança têm listras;
  - embaixo, a semente que foi aceita e os motivos das rejeitadas.
*/
const CELULA_DO_GRAFO = { largura: 28, altura: 20, margemX: 16, margemY: 10 };

function desenharMapaDoGerador() {
    pincel.fillStyle = "rgba(5, 7, 13, 0.88)";
    pincel.fillRect(0, 0, tela.width, tela.height);

    const pouso = mundo.salas.get(chave(POUSO.coluna, POUSO.linha));
    const semImpulso = salasAlcancaveis(mundo, pouso, false);
    const meio = sala => ({
        x: CELULA_DO_GRAFO.margemX + sala.coluna * CELULA_DO_GRAFO.largura + CELULA_DO_GRAFO.largura / 2,
        y: CELULA_DO_GRAFO.margemY + sala.linha * CELULA_DO_GRAFO.altura + CELULA_DO_GRAFO.altura / 2
    });

    // As ligações primeiro, para as salas ficarem por cima.
    for (const sala of mundo.salas.values()) {
        for (const direcao of ["L", "S"]) {
            if (!sala.portas[direcao]) {
                continue;
            }
            const outra = vizinha(mundo, sala, direcao);
            const fechada = sala.membranas.includes(direcao) || outra.membranas.includes(DIRECOES[direcao].oposta);
            pincel.strokeStyle = fechada ? "#ff3b6b" : "#c9d3e6";
            pincel.lineWidth = fechada ? 3 : 1;
            pincel.beginPath();
            pincel.moveTo(meio(sala).x, meio(sala).y);
            pincel.lineTo(meio(outra).x, meio(outra).y);
            pincel.stroke();
        }
    }

    // A rota obrigatória: até a chave sem o Impulso, depois até o objetivo com ele.
    const salaDaChave = salaComItem(mundo, "impulso");
    const rota = [
        ...caminhoEntre(mundo, pouso, salaDaChave, false),
        ...caminhoEntre(mundo, salaDaChave, salaDoCovil(mundo), true).slice(1)
    ];
    pincel.strokeStyle = "rgba(255, 220, 60, 0.85)";
    pincel.lineWidth = 2;
    pincel.beginPath();
    rota.forEach((sala, i) => {
        const ponto = meio(sala);
        if (i === 0) pincel.moveTo(ponto.x + 2, ponto.y + 2);
        else pincel.lineTo(ponto.x + 2, ponto.y + 2);
    });
    pincel.stroke();
    pincel.lineWidth = 1;

    pincel.font = "7px monospace";
    for (const sala of mundo.salas.values()) {
        const x = CELULA_DO_GRAFO.margemX + sala.coluna * CELULA_DO_GRAFO.largura + 4;
        const y = CELULA_DO_GRAFO.margemY + sala.linha * CELULA_DO_GRAFO.altura + 3;
        const largura = CELULA_DO_GRAFO.largura - 8;
        const altura = CELULA_DO_GRAFO.altura - 6;

        pincel.fillStyle = PALETAS[sala.regiao].mapa;
        pincel.fillRect(x, y, largura, altura);

        if (!semImpulso.has(sala)) {
            pincel.fillStyle = "rgba(5, 7, 13, 0.7)";
            for (let j = 0; j < altura; j++) {
                for (let i = 0; i < largura; i++) {
                    if ((i + j) % 4 === 0) pincel.fillRect(x + i, y + j, 1, 1);
                }
            }
        }

        if (sala === salaAtual) {
            pincel.strokeStyle = "#3cf2ff";
            pincel.strokeRect(x - 1.5, y - 1.5, largura + 3, altura + 3);
        }

        const marca = ehPouso(sala) ? "P"
            : sala.itens.some(item => item.tipo === "impulso") ? "I"
            : sala.covil ? "M"
            : sala.itens.some(item => item.tipo === "tanque") ? "T"
            : String(sala.distancia);
        pincel.fillStyle = "#ffffff";
        pincel.fillText(marca, x + 2, y + 9);
    }

    pincel.fillStyle = "#e2e8f5";
    pincel.fillText(`semente ${mundo.semente} → aceita "${mundo.sementeUsada}"; ${mundo.rejeitados.length} rejeitada(s)`, 6, tela.height - 14);
    if (mundo.rejeitados.length > 0) {
        pincel.fillStyle = "#ff8a6b";
        const motivo = mundo.rejeitados[0].problemas[0];
        pincel.fillText(motivo.length > 52 ? motivo.slice(0, 51) + "…" : motivo, 6, tela.height - 5);
    }
}


// ============================================================
// 19. O MINIMAPA
// ============================================================
/*
  O mapa mostra SÓ o que já foi explorado (GDD, seção 11: "registrar as
  salas exploradas [...] mas não revelar automaticamente todas as áreas
  desconhecidas"). Cada sala visitada é um retângulo da cor da sua região;
  cada porta dela é um risco na borda — o jogador vê que há uma saída
  ali, mas não o que existe depois. A sala atual pisca.

  É o MESMO plano do gerador, desenhado de outro jeito: a regra do curso,
  separar o que a coisa é de como ela aparece, agora com dois desenhos
  para um dado só.
*/
const CELULA = { largura: 6, altura: 4, espaco: 1 };

function desenharMinimapa() {
    pincelDoMapa.fillStyle = "#05070d";
    pincelDoMapa.fillRect(0, 0, minimapa.width, minimapa.height);

    for (const sala of mundo.salas.values()) {
        if (!salasVisitadas.has(chave(sala.coluna, sala.linha))) {
            continue;
        }

        const x = CELULA.espaco + sala.coluna * (CELULA.largura + CELULA.espaco);
        const y = CELULA.espaco + sala.linha * (CELULA.altura + CELULA.espaco);
        const atual = sala === salaAtual;

        pincelDoMapa.fillStyle = atual ? "#3cf2ff" : PALETAS[sala.regiao].mapa;
        pincelDoMapa.fillRect(x, y, CELULA.largura, CELULA.altura);

        // Uma porta com membrana ainda inteira aparece em vermelho: "bloqueada", como o GDD pede.
        const corDaPorta = direcao => estadoDaPorta(sala, direcao) === "membrana" ? "#ff3b6b" : "#e2e8f5";
        pincelDoMapa.fillStyle = corDaPorta("O");
        if (sala.portas.O) pincelDoMapa.fillRect(x - 1, y + 2, 1, 1);
        pincelDoMapa.fillStyle = corDaPorta("L");
        if (sala.portas.L) pincelDoMapa.fillRect(x + CELULA.largura, y + 2, 1, 1);
        pincelDoMapa.fillStyle = "#e2e8f5";
        if (sala.portas.N) pincelDoMapa.fillRect(x + 2, y - 1, 2, 1);
        if (sala.portas.S) pincelDoMapa.fillRect(x + 2, y + CELULA.altura, 2, 1);
    }
}

/*
  A membrana de uma porta pode já ter sido rompida: quem sabe é o estado
  da sala (a matriz), não o plano do gerador.
*/
function estadoDaPorta(sala, direcao) {
    if (!sala.membranas.includes(direcao)) {
        return "aberta";
    }
    const estadoGuardado = salasVisitadas.get(chave(sala.coluna, sala.linha));
    const coluna = direcao === "O" ? 0 : COLUNAS - 1;
    return estadoGuardado.blocos[14][coluna] === "~" ? "membrana" : "aberta";
}

function atualizarSetor() {
    campoSetor.textContent = REGIOES[salaAtual.regiao].nome;
}


// ============================================================
// 20. O PAINEL
// ============================================================
/*
  O painel só é refeito quando algo muda (um disparo, uma troca, uma
  recarga que termina) — não a cada quadro. A barra de recarga é a
  exceção: ela anda sozinha, em atualizarRecarga.
*/
function atualizarPainel() {
    campoAmostras.textContent = expedicao.amostras;
    const nivel = nivelDaRegiao(salaAtual.regiao);
    campoEcossistema.textContent = nivel.nome;
    campoEcossistema.dataset.nivel = EVOLUCAO.indexOf(nivel);

    barraDeVida.value = soldado.vida / soldado.vidaMaxima;
    barraDeVida.classList.toggle("pouca", soldado.vida < soldado.vidaMaxima * 0.3);

    equipamento.armas.forEach((arma, i) => {
        const item = itensDasArmas[i];
        item.querySelector(".nome-da-arma").textContent = ARMAS[arma.tipo].nome;
        item.querySelector(".municao").textContent = `${arma.municao}/${tamanhoDoPente(arma.tipo)}`;
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
    camadaMensagem.classList.remove("vitoria");
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    camadaMensagem.hidden = false;
    botaoVoltarABase.focus();
}


/*
  O AVISO: um texto por cima da tela, por alguns segundos. Contado pelo
  relógio do jogo, como tudo (a lição do Dealer? Out!).
*/
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

/*
  O OBJETIVO ATUAL (GDD, seção 11): uma frase que muda com a progressão.
*/
function atualizarObjetivo() {
    if (!soldado.impulso) {
        campoObjetivo.textContent = "Explorar o complexo — algo ali rompe membranas";
    } else if (matriarca === null || matriarca.estado !== "morta") {
        campoObjetivo.textContent = "Encontrar o covil no fundo da floresta";
    } else {
        campoObjetivo.textContent = "Apanhar os dados da colônia";
    }
}


// ============================================================
// 21. LIGAR
// ============================================================
botaoVoltarABase.addEventListener("click", abrirBase);
botaoApagar.addEventListener("click", apagarCampanha);
botaoSortear.addEventListener("click", () => {
    campoSemente.value = sortearSemente();
});

/*
  O formulário da base: Enter no campo (ou o botão) dispara o "submit", e
  a expedição começa com a semente do campo. preventDefault impede o
  navegador de recarregar a página. Maiúsculas, sem espaços nas pontas.
*/
formularioDaSemente.addEventListener("submit", evento => {
    evento.preventDefault();
    const semente = campoSemente.value.trim().toUpperCase();
    iniciarExpedicao(semente || sortearSemente());
    campoSemente.blur();
});

const problemasDosModulos = conferirModulos();
problemasDosModulos.forEach(problema => console.error(problema));

/*
  O jogo abre na BASE. Uma semente no endereço (index.html?semente=XENO)
  já vem preenchida no campo.
*/
abrirBase();
const sementeDoEndereco = new URLSearchParams(location.search).get("semente");
if (sementeDoEndereco) {
    campoSemente.value = sementeDoEndereco.toUpperCase();
}
requestAnimationFrame(quadroAQuadro);
