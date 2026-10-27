/*
  ============================================================
  XENOMORPH — DADOS: A APARÊNCIA
  ============================================================

  O que cada bloco É (sólido? plataforma?) e como APARECE, as paletas de
  cada região, os quadros do soldado e os algarismos dos números de
  dano. As regras perguntam a tabela de blocos; o desenho pergunta as
  paletas — as duas perguntas nunca se misturam.
*/


/*
  A plataforma NÃO é sólida: para quem anda de lado ou sobe, ela é ar.
  O que ela tem é outra propriedade, `plataforma`, que a colisão consulta
  só num caso — corpo descendo, vindo de cima (scripts/fisica.js).
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
const CORPO_DO_SOLDADO = [
    "..ddd...",
    ".d###d..",
    ".d#vvv..",
    ".d###d..",
    "..ddd...",
    ".d###d..",
    ".d###d..",
    ".d###d..",
    "..d#d..."
];

/*
  OS QUADROS DO SOLDADO: o mesmo corpo, pernas diferentes. Qual quadro
  desenhar é decidido pelo ESTADO (no chão parado, andando, no ar) — nada
  disso é guardado (desenho.js).
*/
const QUADROS_DO_SOLDADO = {
    parado: [...CORPO_DO_SOLDADO, "..d.d...", "..d.d...", ".dd.dd.."],
    passoA: [...CORPO_DO_SOLDADO, ".d...d..", ".d...d..", "dd...dd."],
    passoB: [...CORPO_DO_SOLDADO, "..d.d...", "...dd...", "..ddd..."],
    noAr: [...CORPO_DO_SOLDADO, "..ddd...", ".dd.dd..", "........"]
};
const SPRITE_DO_SOLDADO = QUADROS_DO_SOLDADO.parado;

/*
  Os ALGARISMOS de 3 x 5 pixels, como os do Pac-Man: os números de dano
  saem nítidos em qualquer escala, sem fonte nenhuma.
*/
const ALGARISMOS = {
    0: ["###", "#.#", "#.#", "#.#", "###"],
    1: [".#.", "##.", ".#.", ".#.", "###"],
    2: ["###", "..#", "###", "#..", "###"],
    3: ["###", "..#", ".##", "..#", "###"],
    4: ["#.#", "#.#", "###", "..#", "..#"],
    5: ["###", "#..", "###", "..#", "###"],
    6: ["###", "#..", "###", "#.#", "###"],
    7: ["###", "..#", ".#.", ".#.", ".#."],
    8: ["###", "#.#", "###", "#.#", "###"],
    9: ["###", "#.#", "###", "..#", "###"]
};

const CORES_DO_SOLDADO = {
    "#": "#c9d3e6",
    d: "#56627a",
    v: "#3cf2ff",
    g: "#8a93b8"
};

const LARGURA_DO_SOLDADO = 6;
const ALTURA_DO_SOLDADO = 12;
