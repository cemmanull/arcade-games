/*
  ============================================================
  XENOMORPH — DADOS: AS CRIATURAS
  ============================================================

  As fichas das espécies, o ácido, a tabela da evolução do ecossistema e
  a ficha da Matriarca. Só números e desenhos: o que cada uma FAZ está em
  scripts/criaturas.js e scripts/matriarca.js.
*/


// ---------- O soldado ferido ----------
const VIDA_DO_SOLDADO = 100;
const DURACAO_DA_INVULNERABILIDADE = 0.9;   // depois de uma ferida, nada fere por um instante
const EMPURRAO_DA_FERIDA = { x: 110, y: 150 };

/*
  AS CRIATURAS, como fichas: só NÚMEROS e desenhos. O que cada uma faz
  com eles está nos COMPORTAMENTOS (scripts/criaturas.js), em código.

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
        amostras: 1,               // quantas deixa ao morrer (scripts/combate.js)
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
const RITMO_DA_CRIATURA_LENTA = 0.4;  // congelada, a criatura vive a 40% do tempo
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
