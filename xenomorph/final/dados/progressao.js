/*
  ============================================================
  XENOMORPH — DADOS: A PROGRESSÃO
  ============================================================

  Os itens e os eventos, as melhorias permanentes com os seus custos, o
  bestiário, os ataques que a Matriarca aprende e os registros da
  colônia — tudo o que liga uma expedição à outra.
*/


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

// Um módulo de arma (dados/armas.js): um chip que brilha na cor da raridade.
ITENS.modulo = {
    sprite: [
        ".#.#.",
        "#mmm#",
        ".mMm.",
        "#mmm#",
        ".#.#."
    ],
    cores: { "#": "#8a93b8", m: "#3a2440", M: "#ffffff" }
};

/*
  OS EVENTOS (GDD, seção 8): objetos que não se apanham — se USAM, com ↑.
  A estação médica cura uma vez; o terminal guarda um registro da colônia.
*/
ITENS.estacao = {
    sprite: [
        ".######.",
        "#cccccc#",
        "#cc++cc#",
        "#c++++c#",
        "#cc++cc#",
        "#cccccc#",
        ".######.",
        "..#..#..",
        "..#..#..",
        ".##..##."
    ],
    cores: { "#": "#8a93b8", c: "#16302a", "+": "#4dff7a" },
    interativo: true
};
ITENS.terminal = {
    sprite: [
        "########",
        "#tttttt#",
        "#t=t==t#",
        "#tt==tt#",
        "#t==t=t#",
        "#tttttt#",
        "########",
        "...##...",
        "..####.."
    ],
    cores: { "#": "#5c6f94", t: "#0b2a33", "=": "#3cf2ff" },
    interativo: true
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

/*
  OS REGISTROS DA COLÔNIA: a história da invasão, um trecho por terminal
  lido, na ordem. Eles se acumulam na CAMPANHA — a história avança entre
  as expedições, e a base guarda o que já foi lido (GDD, seção 9:
  "investigar a história da invasão").
*/
const REGISTROS_DA_COLONIA = [
    "Dia 12. A colônia completa o primeiro ano. As amostras do subsolo mostram uma biomassa que reage à luz. Ninguém está preocupado.",
    "Dia 40. A biomassa reage a nós. Quando alguém entra no laboratório, ela se contrai; quando sai, relaxa. Pedi uma segunda opinião.",
    "Dia 63. Perdemos contato com a mina leste. O resgate achou os túneis tapados por uma membrana que pulsa no ritmo de um coração.",
    "Dia 71. Os rastejadores andam em grupo, mas ninguém os comanda. Foi o que pensamos — até vê-los parar ao mesmo tempo e virar para o mesmo lado.",
    "Dia 88. O Impulso Cinético rompe as membranas, mas elas crescem de novo em horas. O planeta repara a si mesmo.",
    "Dia 95. Algo na floresta põe ovos. Os colonos a chamam de Matriarca. Ela não caça: espera. As criaturas trazem comida para ela.",
    "Dia 102. Ela aprende. Cada vez que um esquadrão a enfrenta, ela muda. Que a próxima equipe não repita as mesmas táticas.",
    "Último registro. A Matriarca não é a origem. Ela recebe ordens do fundo do planeta. Se alguém ler isto: não procurem o núcleo. Destruam-no."
];
const DURACAO_DO_REGISTRO = 8;   // segundos na tela: um trecho longo pede tempo para ler

const CURA_DA_CAPSULA = 30;
const VIDA_DO_TANQUE = 20;   // a vida máxima sobe, até o fim da expedição
const DURACAO_DO_AVISO = 3;
