/*
  ============================================================
  PAC-MAN
  ============================================================

  O ciclo de sempre:

      ler a entrada  ->  atualizar o estado  ->  desenhar

  O que este jogo junta, de todo o curso:

  - A GRADE DO TETRIS. O labirinto é uma matriz que nasce de um texto, e
    ela é o estado: comer é trocar um caractere.

  - O DESLIZAR DO PONG. Os personagens andam em pixels, com delta time —
    mas só decidem para onde ir no CENTRO de uma casa. A distância de cada
    quadro é gasta em pedaços, sem nunca pular um centro.

  - INTELIGÊNCIA COM UMA REGRA SÓ. Cada fantasma vai, em cada cruzamento,
    para a vizinha mais perto do seu ALVO, sem dar meia-volta. As
    personalidades são quatro funções de alvo; os modos (dispersar,
    perseguir, assustado) são outros alvos; e os olhos usam um mapa de
    distâncias calculado uma vez com busca em largura.

  - ESTADOS EM DOIS NÍVEIS. O jogo (menu, pronto, jogando, pausado,
    morrendo, fase completa, fim) e cada fantasma (em casa, saindo,
    andando, olhos, entrando).

  - TABELAS. Horários dos modos, fichas das fases, frutas, pontos: o
    ritmo e a dificuldade do jogo inteiro são dados.

  A leitura abaixo segue a ordem em que as coisas acontecem.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DA_CASA = 8;   // pixels de desenho por casa

/*
  A VELOCIDADE MÁXIMA, em pixels por segundo. Tudo o mais é uma fração
  dela, na ficha de cada fase.
*/
const VELOCIDADE_MAXIMA = 75;
const VELOCIDADE_NA_CASA = 30;         // dentro da casa eles andam devagar
const VELOCIDADE_DOS_OLHOS = 110;      // comidos, correm para casa

/*
  A TABELA DE HORÁRIOS. Cada linha: um modo e quantos segundos ele dura.
  O último dura para sempre (Infinity). Os períodos de dispersar
  encurtam ao longo da tabela: o jogo vai apertando.

  Mudar o ritmo do jogo é mudar números aqui. Nenhum `if` sabe que existem
  "quatro rodadas".
*/
const HORARIOS = [
    { modo: "dispersar", duracao: 7 },
    { modo: "perseguir", duracao: 20 },
    { modo: "dispersar", duracao: 7 },
    { modo: "perseguir", duracao: 20 },
    { modo: "dispersar", duracao: 5 },
    { modo: "perseguir", duracao: 20 },
    { modo: "dispersar", duracao: 5 },
    { modo: "perseguir", duracao: Infinity }
];

const AVISO_DO_FIM_DO_SUSTO = 2;     // nos últimos 2 segundos, eles piscam

/*
  AS FRUTAS: desenho, cores e quanto valem.
*/
const FRUTAS = {
    cereja: {
        pontos: 100,
        desenho: [
            "......g.",
            ".....gg.",
            "....g.g.",
            "...g..g.",
            ".rr..rr.",
            "rwrrrwrr",
            "rrrrrrrr",
            ".rr..rr."
        ]
    },
    morango: {
        pontos: 300,
        desenho: [
            "..gggg..",
            "...gg...",
            ".rrrrrr.",
            "rwrrrwrr",
            "rrrwrrrr",
            ".rrrrwr.",
            "..rrrr..",
            "...rr..."
        ]
    },
    laranja: {
        pontos: 500,
        desenho: [
            "...gg...",
            "..oooo..",
            ".oooooo.",
            "oowooooo",
            "oooooooo",
            "oooooooo",
            ".oooooo.",
            "..oooo.."
        ]
    },
    maca: {
        pontos: 700,
        desenho: [
            "...g....",
            "....g...",
            ".rrrrrr.",
            "rwrrrrrr",
            "rwrrrrrr",
            "rrrrrrrr",
            ".rrrrrr.",
            "..r..r.."
        ]
    },
    uva: {
        pontos: 1000,
        desenho: [
            "...gg...",
            "..p.p...",
            ".p.p.p..",
            "p.p.p.p.",
            ".p.p.p..",
            "..p.p...",
            "...p....",
            "........"
        ]
    }
};
const CORES_DAS_FRUTAS = { g: "#4dff7a", r: "#ff3b3b", w: "#ffffff", o: "#ff9f1c", p: "#b04dff" };

/*
  A TABELA DE NÍVEIS. Uma linha por fase; depois da última, vale a
  última. Leia uma coluna de cima para baixo e você vê a curva daquela
  dificuldade: o susto encolhe de 6 segundos para 1; o fantasma chega
  a 95% do máximo.

  Repare que o fantasma assustado e o fantasma no túnel ficam sempre
  bem abaixo do Pac-Man. São as duas válvulas de escape do jogador, e a
  tabela as preserva mesmo nas fases difíceis.
*/
const NIVEIS = [
    { pacMan: 0.80, fantasma: 0.75, assustado: 0.50, tunel: 0.40, susto: 6, fruta: "cereja" },
    { pacMan: 0.90, fantasma: 0.85, assustado: 0.55, tunel: 0.45, susto: 5, fruta: "morango" },
    { pacMan: 0.90, fantasma: 0.85, assustado: 0.55, tunel: 0.45, susto: 4, fruta: "laranja" },
    { pacMan: 0.90, fantasma: 0.85, assustado: 0.55, tunel: 0.45, susto: 3, fruta: "maca" },
    { pacMan: 1.00, fantasma: 0.95, assustado: 0.60, tunel: 0.50, susto: 2, fruta: "uva" },
    { pacMan: 1.00, fantasma: 0.95, assustado: 0.60, tunel: 0.50, susto: 1, fruta: "uva" }
];

/*
  A fruta aparece quando o Pac-Man já comeu tantas pastilhas, fica tantos
  segundos, e nasce logo abaixo da casa dos fantasmas.
*/
const PASTILHAS_PARA_A_FRUTA = [70, 170];
const DURACAO_DA_FRUTA = 9.5;
const LUGAR_DA_FRUTA = { x: 14 * 8, y: 17 * 8 + 4 };
const PONTOS_DO_PRIMEIRO_FANTASMA = 200;   // e dobra a cada um: 200, 400, 800, 1600
const PAUSA_AO_COMER_FANTASMA = 0.5;

/*
  A geografia da casa dos fantasmas, em pixels: a coluna da porta (entre
  as casas 13 e 14), a linha logo acima da porta (onde se sai para o
  labirinto) e o meio da casa (onde se espera).
*/
const X_DA_PORTA = 14 * 8;
const Y_DA_SAIDA = 11 * 8 + 4;
const Y_DO_MEIO_DA_CASA = 14 * 8 + 4;


/*
  O que cada coisa comida vale, numa tabela: o caractere da casa é a
  chave. Uma casa que não está aqui não vale nada (e não é comida).
*/
const PONTOS_POR_CASA = {
    ".": 10,
    "o": 50
};

const VIDAS_INICIAIS = 3;
const PONTOS_PARA_VIDA_EXTRA = 10000;   // uma vez por partida
const CHAVE_DO_RECORDE = "pac-man-recorde";
const DISTANCIA_DO_DESLIZE = 14;        // pixels na tela para um deslize valer

/*
  QUANTO DURA CADA ESTADO DE ESPERA. Os que não estão aqui ("jogando",
  "fim") duram até alguma coisa acontecer.
*/
const DURACAO_DOS_ESTADOS = {
    "pronto": 2,
    "morrendo": 1.8,
    "fase completa": 2
};

/*
  As quatro direções como vetores, a ideia do Pong: dx e dy dizem para
  onde, e multiplicar pela velocidade diz quanto.

  Object.freeze impede que alguém altere uma direção por engano
  (DIRECOES.CIMA.dy = 5 passaria a mover TODO MUNDO que sobe). Como as
  direções são compartilhadas por todos os personagens, protegê-las é
  barato e evita um bug difícil de achar.
*/
const DIRECOES = Object.freeze({
    CIMA: Object.freeze({ dx: 0, dy: -1 }),
    BAIXO: Object.freeze({ dx: 0, dy: 1 }),
    ESQUERDA: Object.freeze({ dx: -1, dy: 0 }),
    DIREITA: Object.freeze({ dx: 1, dy: 0 })
});

/*
  A ORDEM DE DESEMPATE: quando duas saídas ficam à mesma distância do
  alvo, vence a que vem primeiro nesta lista. A ordem do jogo original:
  cima, esquerda, baixo, direita. Sem uma ordem fixa, o fantasma
  decidiria diferente a cada partida — e não daria para aprender o jeito
  dele.
*/
const ORDEM_DAS_DIRECOES = [DIRECOES.CIMA, DIRECOES.ESQUERDA, DIRECOES.BAIXO, DIRECOES.DIREITA];

/*
  O LABIRINTO, como texto. Cada caractere é uma casa:

      #   parede
      .   pastilha
      o   energizante (a pastilha grande)
          (espaço) corredor vazio
      -   porta da casa dos fantasmas
      G   dentro da casa dos fantasmas

  É simétrico — a metade direita é o espelho da esquerda — e não tem
  becos sem saída: num jogo de perseguição, um beco é uma armadilha sem
  escapatória. A linha do meio (com espaços nas pontas) é o TÚNEL: sair
  por um lado é entrar pelo outro.
*/
const MAPA_EM_TEXTO = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "######.##### ## #####.######",
    "######.##          ##.######",
    "######.## ###--### ##.######",
    "######.## #GGGGGG# ##.######",
    "      .   #GGGGGG#   .      ",
    "######.## #GGGGGG# ##.######",
    "######.## ######## ##.######",
    "######.##          ##.######",
    "######.## ######## ##.######",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##.......  .......##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################"
];

const COLUNAS = MAPA_EM_TEXTO[0].length;   // 28 — deduzido, não digitado
const LINHAS = MAPA_EM_TEXTO.length;       // 30

const COR_FUNDO = "#000000";
const COR_PAREDE = "#3b5bff";
const COR_PORTA = "#ffb8de";
const COR_PASTILHA = "#ffcfa8";
const COR_PAC_MAN = "#ffd84d";
const COR_PAREDE_PISCANDO = "#ffffff";

/*
  O FANTASMA, em texto. Duas versões da saia, que se alternam: é o que
  dá a impressão de que ele flutua. Os olhos são desenhados à parte,
  porque olham para onde ele vai.
*/
const CORPO_DO_FANTASMA = [
    ".....####.....",
    "...########...",
    "..##########..",
    ".############.",
    ".############.",
    ".############.",
    "##############",
    "##############",
    "##############",
    "##############",
    "##############",
    "##############"
];
const SAIAS_DO_FANTASMA = [
    ["##.###..###.##", "#...##..##...#"],
    ["#.###.##.###.#", "..##...##...#."]
];
const COR_DO_OLHO = "#ffffff";
const COR_DA_PUPILA = "#2142ff";
const COR_ASSUSTADO = "#2142ff";
const COR_ASSUSTADO_PISCANDO = "#ffffff";
const COR_ROSTO_ASSUSTADO = "#ffcfa8";
const COR_ROSTO_PISCANDO = "#ff3b3b";

/*
  OS QUATRO FANTASMAS, como dados: cor, onde começam, quanto tempo
  esperam na casa, o canto preferido de cada um e a função que calcula o
  ALVO. Comportamento é um campo, como a cor.

  Cada função recebe o próprio fantasma e devolve { coluna, linha }. As
  casas podem estar FORA do labirinto (linha -3, coluna 32): o alvo não
  precisa ser alcançável, só precisa puxar numa direção.
*/
const FANTASMAS = [
    {
        nome: "vermelho",
        cor: "#ff3b3b",
        inicio: { x: X_DA_PORTA, y: Y_DA_SAIDA },
        esperaNaCasa: 0,
        canto: { coluna: 25, linha: -3 },
        // O perseguidor: a casa do Pac-Man, sem rodeios.
        alvo: () => casaDoPacMan()
    },
    {
        nome: "rosa",
        cor: "#ffb8de",
        inicio: { x: X_DA_PORTA, y: Y_DO_MEIO_DA_CASA },
        esperaNaCasa: 1,
        canto: { coluna: 2, linha: -3 },
        // A emboscada: 4 casas À FRENTE do Pac-Man, na direção em que ele vai.
        alvo: () => aFrenteDoPacMan(4)
    },
    {
        nome: "ciano",
        cor: "#3bf3ff",
        inicio: { x: X_DA_PORTA - 16, y: Y_DO_MEIO_DA_CASA },
        esperaNaCasa: 5,
        canto: { coluna: 27, linha: 32 },
        /*
          A dupla: pega o ponto 2 casas à frente do Pac-Man e DOBRA a seta
          que vai do vermelho até ele. Se o vermelho vem por trás, o ciano
          mira pela frente — e o Pac-Man fica entre os dois.
        */
        alvo: () => {
            const ponto = aFrenteDoPacMan(2);
            const vermelho = fantasmas[0];
            return {
                coluna: ponto.coluna * 2 - casaDe(vermelho.x),
                linha: ponto.linha * 2 - casaDe(vermelho.y)
            };
        }
    },
    {
        nome: "laranja",
        cor: "#ffb84d",
        inicio: { x: X_DA_PORTA + 16, y: Y_DO_MEIO_DA_CASA },
        esperaNaCasa: 9,
        canto: { coluna: 0, linha: 32 },
        /*
          O tímido: longe (mais de 8 casas), persegue como o vermelho; perto,
          perde a coragem e foge para o canto dele. Na prática, ronda o
          Pac-Man sem nunca se decidir.
        */
        alvo: f => {
            const pac = casaDoPacMan();
            const dx = casaDe(f.x) - pac.coluna;
            const dy = casaDe(f.y) - pac.linha;
            return dx * dx + dy * dy > 8 * 8 ? pac : f.canto;
        }
    }
];


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoVidas = document.getElementById("vidas");
const campoFase = document.getElementById("fase");
const campoAviso = document.getElementById("aviso");
const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");
const botaoIniciar = document.getElementById("botao-iniciar");
const campoRecorde = document.getElementById("recorde");
const botaoSom = document.getElementById("botao-som");
const botaoPausaToque = document.getElementById("botao-pausa");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
/*
  Cada string vira um array de caracteres com split(""): "#..#" vira
  ["#", ".", ".", "#"]. O resultado é a matriz mapa[linha][coluna] —
  primeiro a linha, como no Tetris.

  Por que não usar o próprio texto? Porque strings são IMUTÁVEIS em
  JavaScript: não dá para trocar um caractere no meio de uma. E o mapa
  vai mudar — a cada pastilha comida, um "." vira " ".
*/
function criarMapa() {
    return MAPA_EM_TEXTO.map(linha => linha.split(""));
}

/*
  CONFIRA OS DADOS ANTES DE USAR.

  Um labirinto com uma linha de 27 caracteres no meio de linhas de 28
  não dá erro nenhum: só desenha torto, e o bug aparece longe da causa.
  Uma verificação de três linhas, rodada uma vez, aponta o problema na
  hora — e diz QUAL linha.
*/
/*
  A ÚNICA VEZ em que as 840 casas são percorridas para contar. Depois,
  cada pastilha comida desconta 1 — e o número está sempre certo, sem
  varrer nada de novo.

  `flat()` achata a matriz numa lista só; `filter` fica com as casas que
  valem pontos; `length` conta. E `in` pergunta se a chave existe na
  tabela.
*/
function contarPastilhas() {
    return mapa.flat().filter(casa => casa in PONTOS_POR_CASA).length;
}

function verificarMapa() {
    MAPA_EM_TEXTO.forEach((linha, i) => {
        if (linha.length !== COLUNAS) {
            console.error(`Linha ${i} do mapa tem ${linha.length} casas; deveria ter ${COLUNAS}.`);
        }
    });
}

verificarMapa();

/*
  `let`, não mais `const`: ao limpar o labirinto, o mapa inteiro é
  trocado por uma cópia nova.
*/
let mapa = criarMapa();
let pastilhasRestantes = contarPastilhas();

let pontos = 0;
let recorde = lerRecorde();
let ganhouVidaExtra = false;
let somLigado = true;
let tempoTotal = 0;           // para o energizante piscar
let vidas = VIDAS_INICIAIS;
let fase = 1;

// A máquina de estados do JOGO (a dos fantasmas continua em cada fantasma).
let estado = "menu";
let tempoNoEstado = 0;

let pastilhasNoInicio = 0;   // para saber quantas já foram comidas
let fruta = null;            // { tipo, tempoRestante } quando há uma fruta na tela

let mostrarAlvos = false;     // H liga e desliga

let tempoDesdeOInicio = 0;    // o relógio que solta os fantasmas da casa

// O horário: em que linha da tabela estamos, e há quanto tempo.
let indiceDoHorario = 0;
let tempoNoHorario = 0;

let tempoDeSusto = 0;              // > 0: fantasmas azuis
let fantasmasComidosNoSusto = 0;   // para os pontos dobrarem
let pausaCurta = 0;                // o mundo congela meio segundo ao comer um fantasma
let textosFlutuantes = [];         // "200", "400"... onde o fantasma foi comido

const LARGURA_DO_MAPA = COLUNAS * TAMANHO_DA_CASA;


// ============================================================
// 4. O PAC-MAN
// ============================================================
/*
  x e y em PIXELS, e são o CENTRO — como no Pong, como em qualquer coisa
  que desliza. A casa onde ele está é deduzida (casaDe), nunca guardada.

  `direcao` é para onde ele está indo; `desejada`, para onde o jogador
  QUER que ele vá. As duas só coincidem quando dá.

  Ele começa entre duas casas (x = 112 é a fronteira entre a 13 e a 14),
  olhando para a esquerda. Não tem problema: na direção em que anda, ele
  logo chega a um centro.
*/
const pacMan = {
    x: 0,
    y: 0,
    direcao: DIRECOES.ESQUERDA,
    desejada: DIRECOES.ESQUERDA,
    parado: false,
    distanciaAndada: 0   // para a boca abrir e fechar conforme ele anda
};

/*
  O ponto de partida num lugar só: usado no começo e a cada labirinto
  limpo.
*/
/*
  Os fantasmas vivos nascem dos dados: cada um copia a sua ficha
  (`...ficha`) e ganha os campos que mudam durante o jogo.

  ESTADO de cada fantasma:
      "em casa"   esperando a vez, subindo e descendo
      "saindo"    indo até a porta e passando por ela
      "andando"   no labirinto, seguindo a regra do cruzamento
      "olhos"     comido: voltando para a porta
      "entrando"  os olhos descendo pela porta até o meio da casa

  E `assustado` é um campo À PARTE, e não um estado: um fantasma azul
  pode estar em casa, saindo ou andando. Misturar os dois numa variável
  só exigiria estados como "andando-assustado", "saindo-assustado"...
*/
const fantasmas = FANTASMAS.map(ficha => ({
    ...ficha,
    x: 0,
    y: 0,
    direcao: DIRECOES.ESQUERDA,
    estado: "em casa",
    assustado: false,
    naPorta: false,
    parado: false
}));

function posicionarFantasmas() {
    tempoDesdeOInicio = 0;

    fantasmas.forEach(f => {
        f.x = f.inicio.x;
        f.y = f.inicio.y;
        f.direcao = f.esperaNaCasa === 0 ? DIRECOES.ESQUERDA : DIRECOES.CIMA;
        f.estado = f.esperaNaCasa === 0 ? "andando" : "em casa";
        f.assustado = false;
        f.naPorta = false;
    });

    indiceDoHorario = 0;
    tempoNoHorario = 0;
    tempoDeSusto = 0;
    atualizarPlacar();
}

function posicionarPacMan() {
    pacMan.x = 14 * TAMANHO_DA_CASA;
    pacMan.y = 22 * TAMANHO_DA_CASA + TAMANHO_DA_CASA / 2;
    pacMan.direcao = DIRECOES.ESQUERDA;
    pacMan.desejada = DIRECOES.ESQUERDA;
    pacMan.parado = false;
}

let instanteDoQuadroAnterior = 0;


// ============================================================
// 5. PERGUNTAS SOBRE UMA CASA
// ============================================================
/*
  É parede? Fora do mapa conta como parede: assim quem pergunta pela
  vizinha da borda não precisa se preocupar com índices que não existem.
*/
function ehParede(coluna, linha) {
    if (linha < 0 || linha >= LINHAS || coluna < 0 || coluna >= COLUNAS) {
        return true;
    }

    return mapa[linha][coluna] === "#";
}

/*
  O Pac-Man pode entrar nesta casa? Não pode em parede, nem na porta, nem
  dentro da casa dos fantasmas.

  A COLUNA DÁ A VOLTA: coluna -1 é a 27, coluna 28 é a 0. É o túnel. O
  `%` duas vezes é o jeito de fazer o resto da divisão funcionar com
  números negativos: em JavaScript, -1 % 28 dá -1 (e não 27). Somar 28 e
  tirar o resto de novo conserta.
*/
function podeEntrar(coluna, linha) {
    if (linha < 0 || linha >= LINHAS) {
        return false;
    }

    const colunaDoTunel = ((coluna % COLUNAS) + COLUNAS) % COLUNAS;
    const casa = mapa[linha][colunaDoTunel];

    return casa !== "#" && casa !== "-" && casa !== "G";
}


// ============================================================
// 6. GRADE E PIXELS
// ============================================================
// De pixel para casa: em que casa está este ponto?
function casaDe(pixel) {
    return Math.floor(pixel / TAMANHO_DA_CASA);
}

/*
  O quanto um valor em pixels passou do centro da sua casa, de 0 a 7,99.
  Zero = exatamente no centro.
*/
function restoAteOCentro(pixel) {
    const meio = TAMANHO_DA_CASA / 2;
    return (((pixel - meio) % TAMANHO_DA_CASA) + TAMANHO_DA_CASA) % TAMANHO_DA_CASA;
}

/*
  Está no centro da casa? Com uma tolerância minúscula (EPSILON): contas
  com decimais quase nunca dão o número exato. 4 - 0,1 - 0,2 + 0,3 dá
  3,9999999999999996 em JavaScript. Comparar decimais com === é pedir
  para um bug aparecer uma vez em mil.
*/
const EPSILON = 1e-6;

function estaNoCentro(entidade) {
    const restoX = restoAteOCentro(entidade.x);
    const restoY = restoAteOCentro(entidade.y);

    const centradoEmX = restoX < EPSILON || restoX > TAMANHO_DA_CASA - EPSILON;
    const centradoEmY = restoY < EPSILON || restoY > TAMANHO_DA_CASA - EPSILON;

    return centradoEmX && centradoEmY;
}

/*
  Quanto falta para o próximo centro, andando na direção atual. Se já
  está num centro, o próximo fica a uma casa inteira.
*/
function distanciaAteOProximoCentro(entidade) {
    const pixel = entidade.direcao.dx !== 0 ? entidade.x : entidade.y;
    const sentido = entidade.direcao.dx + entidade.direcao.dy;   // -1 ou 1
    const resto = restoAteOCentro(pixel);

    if (resto < EPSILON || resto > TAMANHO_DA_CASA - EPSILON) {
        return TAMANHO_DA_CASA;
    }

    return sentido > 0 ? TAMANHO_DA_CASA - resto : resto;
}

/*
  Depois de um passo que devia terminar num centro, a conta pode ter
  dado 99,99999999 em vez de 100. ENCAIXAR arredonda para o centro
  quando está a menos de EPSILON dele — o erro não se acumula.

  E aqui mora o túnel: saiu pela esquerda, reaparece pela direita.
*/
function encaixar(entidade) {
    for (const eixo of ["x", "y"]) {
        const resto = restoAteOCentro(entidade[eixo]);

        if (resto < EPSILON) {
            entidade[eixo] -= resto;
        } else if (resto > TAMANHO_DA_CASA - EPSILON) {
            entidade[eixo] += TAMANHO_DA_CASA - resto;
        }
    }

    if (entidade.x < 0) {
        entidade.x += LARGURA_DO_MAPA;
    } else if (entidade.x >= LARGURA_DO_MAPA) {
        entidade.x -= LARGURA_DO_MAPA;
    }
}

function saoOpostas(a, b) {
    return a.dx === -b.dx && a.dy === -b.dy;
}

function proximaCasaLivre(entidade, direcao) {
    return podeEntrar(
        casaDe(entidade.x) + direcao.dx,
        casaDe(entidade.y) + direcao.dy
    );
}


// ============================================================
// 7. ENTRADA — teclado e toque guardam a intenção
// ============================================================
/*
  O modelo da cobrinha: só importa a ÚLTIMA tecla apertada. Ela não move
  nada; só troca a direção DESEJADA. Quem decide quando obedecer é o
  movimento, ao passar pelo centro de uma casa.
*/
const TECLAS = {
    arrowup: DIRECOES.CIMA,
    w: DIRECOES.CIMA,
    arrowdown: DIRECOES.BAIXO,
    s: DIRECOES.BAIXO,
    arrowleft: DIRECOES.ESQUERDA,
    a: DIRECOES.ESQUERDA,
    arrowright: DIRECOES.DIREITA,
    d: DIRECOES.DIREITA
};

/*
  No menu e no fim, o teclado fica com o navegador (Enter e Espaço nos
  botões). No resto, as setas guardam a intenção — inclusive durante o
  "Pronto!", para quem já quer sair virando.
*/
document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    if (estado === "menu" || estado === "fim") {
        return;
    }

    if ((tecla === "p" || tecla === "escape") && !evento.repeat) {
        alternarPausa();
        return;
    }

    if (tecla === "h" && !evento.repeat) {
        mostrarAlvos = !mostrarAlvos;
        return;
    }

    const direcao = TECLAS[tecla];

    if (direcao !== undefined) {
        evento.preventDefault();
        pacMan.desejada = direcao;
    }
});

/*
  TOQUE: DESLIZAR O DEDO.

  Não há setas na tela: o dedo desliza na direção desejada. O ponto onde
  o dedo encostou é guardado; quando ele se afasta mais que
  DISTANCIA_DO_DESLIZE, o eixo em que andou MAIS decide a direção — e o
  ponto de partida é renovado. Assim, num único gesto em "L", o Pac-Man
  recebe duas intenções: primeiro uma, depois a outra.

  Como no teclado, deslizar só GUARDA a intenção: quem vira é o
  movimento, no próximo cruzamento.
*/
let inicioDoDeslize = null;

tela.addEventListener("pointerdown", evento => {
    evento.preventDefault();
    inicioDoDeslize = { x: evento.clientX, y: evento.clientY };
});

tela.addEventListener("pointermove", evento => {
    if (inicioDoDeslize === null || estado === "menu" || estado === "fim") {
        return;
    }

    const dx = evento.clientX - inicioDoDeslize.x;
    const dy = evento.clientY - inicioDoDeslize.y;

    if (Math.hypot(dx, dy) < DISTANCIA_DO_DESLIZE) {
        return;
    }

    if (Math.abs(dx) > Math.abs(dy)) {
        pacMan.desejada = dx > 0 ? DIRECOES.DIREITA : DIRECOES.ESQUERDA;
    } else {
        pacMan.desejada = dy > 0 ? DIRECOES.BAIXO : DIRECOES.CIMA;
    }

    inicioDoDeslize = { x: evento.clientX, y: evento.clientY };
});

["pointerup", "pointercancel", "pointerleave"].forEach(tipo => {
    tela.addEventListener(tipo, () => {
        inicioDoDeslize = null;
    });
});

/*
  A janela perdeu o foco no meio de uma partida: pausa. Ninguém deveria
  perder uma vida por causa de uma notificação.
*/
window.addEventListener("blur", () => {
    if (estado === "jogando" || estado === "pronto") {
        alternarPausa();
    }
});


// ============================================================
// 8. O LOOP E O MOVIMENTO
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    // Pausado, nada anda — nem o piscar dos energizantes.
    if (estado !== "pausado") {
        tempoTotal += tempo;
        atualizar(tempo);
    }

    atualizarSirene();
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

/*
  A MÁQUINA DE ESTADOS DO JOGO.

  Os estados de espera só contam o tempo e, ao acabar, passam adiante.
  Só "jogando" move alguma coisa.
*/
function atualizar(tempo) {
    tempoNoEstado += tempo;

    const duracao = DURACAO_DOS_ESTADOS[estado];
    const acabouAEspera = duracao !== undefined && tempoNoEstado >= duracao;

    switch (estado) {
        case "pronto":
            if (acabouAEspera) mudarEstado("jogando");
            break;

        case "jogando":
            atualizarJogo(tempo);
            break;

        case "morrendo":
            if (acabouAEspera) depoisDeMorrer();
            break;

        case "fase completa":
            if (acabouAEspera) proximaFase();
            break;
    }
}

/*
  Trocar de estado zera o relógio do estado e atualiza o aviso. Um lugar
  só para isso: nenhum estado novo pode esquecer de zerar o relógio.
*/
function mudarEstado(novoEstado) {
    estado = novoEstado;
    tempoNoEstado = 0;

    campoAviso.textContent = "Pronto!";
    campoAviso.hidden = estado !== "pronto";

    if (estado === "morrendo") {
        tocarSom({ frequencia: 700, frequenciaFinal: 80, duracao: 1.2, volume: 0.06, tipo: "triangle" });
    }

    if (estado === "fase completa") {
        tocarArpejo([523, 659, 784, 1047]);
    }
}

/*
  PAUSAR guarda de onde se veio: dá para pausar no meio do "Pronto!" e
  voltar para ele, e não direto para o jogo.
*/
let estadoAntesDaPausa = null;

function alternarPausa() {
    if (estado === "pausado") {
        estado = estadoAntesDaPausa;
        camadaMensagem.hidden = true;
        campoAviso.hidden = estado !== "pronto";
        return;
    }

    if (estado === "menu" || estado === "fim") {
        return;
    }

    estadoAntesDaPausa = estado;
    estado = "pausado";
    mostrarMensagem("Pausado", "P ou Esc para continuar.", false);
}

function atualizarJogo(tempo) {
    /*
      Comeu um fantasma: meio segundo de pausa, com o número de pontos
      na tela. É a recompensa: o jogo PARA para você ver o que fez.
    */
    if (pausaCurta > 0) {
        pausaCurta -= tempo;
        return;
    }

    moverPacMan(tempo);
    comer();
    atualizarFruta(tempo);

    tempoDesdeOInicio += tempo;
    atualizarHorario(tempo);
    atualizarSusto(tempo);
    atualizarTextos(tempo);

    fantasmas.forEach(f => moverFantasma(f, tempo));
    verificarCaptura();
}

// ============================================================
// 9. OS MODOS
// ============================================================
/*
  A ficha da fase atual. Math.min prende o índice no fim da tabela: da
  fase 6 em diante, vale a última linha.
*/
function nivelAtual() {
    return NIVEIS[Math.min(fase - 1, NIVEIS.length - 1)];
}

function modoAtual() {
    return HORARIOS[indiceDoHorario].modo;
}

/*
  O relógio do horário anda — MENOS durante o susto. Assim o susto não
  "come" o tempo de dispersar ou de perseguir: ele é um parêntese.

  Quando a linha da tabela acaba, passa para a seguinte e os fantasmas
  dão meia-volta.
*/
function atualizarHorario(tempo) {
    if (tempoDeSusto > 0) {
        return;
    }

    tempoNoHorario += tempo;

    if (tempoNoHorario >= HORARIOS[indiceDoHorario].duracao) {
        tempoNoHorario = 0;
        indiceDoHorario += 1;
        darMeiaVolta();
    }
}

/*
  MEIA-VOLTA: a única vez em que a regra permite. Não é para o fantasma:
  é para o JOGADOR — os quatro virando juntos são o aviso de que o modo
  mudou. Quem presta atenção aproveita.

  Só quem está andando no labirinto vira (na casa não faz sentido), e
  sempre dá para virar: o caminho de volta é por onde ele veio.
*/
function darMeiaVolta() {
    fantasmas
        .filter(f => f.estado === "andando")
        .forEach(f => {
            f.direcao = { dx: -f.direcao.dx, dy: -f.direcao.dy };
        });
}

/*
  O energizante assusta todo fantasma que não esteja já em forma de
  olhos — inclusive os que estão em casa (eles saem azuis).
*/
function assustarFantasmas() {
    tempoDeSusto = nivelAtual().susto;
    fantasmasComidosNoSusto = 0;

    fantasmas.forEach(f => {
        if (f.estado !== "olhos" && f.estado !== "entrando") {
            f.assustado = true;
        }
    });

    darMeiaVolta();
}

function atualizarSusto(tempo) {
    if (tempoDeSusto <= 0) {
        return;
    }

    tempoDeSusto -= tempo;

    if (tempoDeSusto <= 0) {
        fantasmas.forEach(f => {
            f.assustado = false;
        });
    }
}

function comerFantasma(f) {
    const valor = PONTOS_DO_PRIMEIRO_FANTASMA * 2 ** fantasmasComidosNoSusto;

    fantasmasComidosNoSusto += 1;
    ganharPontos(valor);
    tocarSom({ frequencia: 200, frequenciaFinal: 1200, duracao: 0.4, volume: 0.05, tipo: "triangle" });

    textosFlutuantes.push({ x: f.x, y: f.y, texto: String(valor), vida: 1 });

    f.assustado = false;
    f.estado = "olhos";
    pausaCurta = PAUSA_AO_COMER_FANTASMA;
}

function atualizarTextos(tempo) {
    textosFlutuantes.forEach(texto => {
        texto.vida -= tempo;
    });

    textosFlutuantes = textosFlutuantes.filter(texto => texto.vida > 0);
}

/*
  COLISÃO POR IGUALDADE, de volta da cobrinha: o fantasma pega o
  Pac-Man quando os dois estão NA MESMA CASA. Mesmo com posições em
  pixels, a pergunta continua sendo de grade — e é exatamente a regra do
  jogo original.
*/
/*
  Na mesma casa, quem pega quem depende do susto: assustado, o fantasma
  é comido; normal, ele pega o Pac-Man. Olhos não pegam nem são pegos.
*/
function verificarCaptura() {
    const pac = casaDoPacMan();

    const naMesmaCasa = fantasmas.filter(f =>
        f.estado === "andando" && casaDe(f.x) === pac.coluna && casaDe(f.y) === pac.linha
    );

    naMesmaCasa
        .filter(f => f.assustado)
        .forEach(comerFantasma);

    const pegou = naMesmaCasa.some(f => !f.assustado && f.estado === "andando");

    if (pegou) {
        mudarEstado("morrendo");
    }
}

/*
  OS TRÊS RECOMEÇOS. Cada um zera só o que lhe cabe:

    nova vida     as posições e os modos     (as pastilhas ficam)
    nova fase     + o labirinto inteiro      (os pontos e as vidas ficam)
    nova partida  + pontos, vidas e fase     (tudo)

  E cada um chama o menor: a nova fase USA a nova vida, a nova partida
  USA a nova fase. Nada é escrito duas vezes.
*/
function novaVida() {
    posicionarPacMan();
    posicionarFantasmas();
    fruta = null;
    textosFlutuantes = [];
    pausaCurta = 0;
    mudarEstado("pronto");
}

function novaFase() {
    mapa = criarMapa();
    pastilhasRestantes = contarPastilhas();
    pastilhasNoInicio = pastilhasRestantes;
    novaVida();
}

function novaPartida() {
    prepararAudio();

    pontos = 0;
    vidas = VIDAS_INICIAIS;
    fase = 1;
    ganhouVidaExtra = false;
    novaFase();
    atualizarPlacar();
    camadaMensagem.hidden = true;
    botaoIniciar.blur();

    tocarArpejo([392, 523, 659, 784, 659, 784], 0.11);
}

/*
  Todo ponto ganho passa por aqui — e é aqui que mora a vida extra. Se
  cada lugar que dá pontos somasse por conta própria, cada um precisaria
  lembrar de conferir os 10.000.
*/
function ganharPontos(valor) {
    pontos += valor;

    if (!ganhouVidaExtra && pontos >= PONTOS_PARA_VIDA_EXTRA) {
        ganhouVidaExtra = true;
        vidas += 1;
        tocarArpejo([784, 1047, 784, 1047], 0.08);
    }

    atualizarPlacar();
}

function depoisDeMorrer() {
    vidas -= 1;
    atualizarPlacar();

    if (vidas > 0) {
        novaVida();
        return;
    }

    mudarEstado("fim");

    const bateuORecorde = pontos > recorde;

    if (bateuORecorde) {
        recorde = pontos;
        salvarRecorde();
        atualizarPlacar();
    }

    mostrarMensagem(bateuORecorde ? "Novo recorde!" : "Fim de jogo", `${pontos} pontos · fase ${fase}`, true);
    botaoIniciar.textContent = "Jogar de novo";
}

/*
  A mesma camada é menu, pausa e fim. Na pausa o botão some: quem pausou
  quer continuar, não recomeçar sem querer.
*/
function mostrarMensagem(titulo, texto, comBotao) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    botaoIniciar.hidden = !comBotao;
    camadaMensagem.hidden = false;
}

function proximaFase() {
    fase += 1;
    novaFase();
    atualizarPlacar();
}

botaoIniciar.addEventListener("click", novaPartida);

botaoSom.addEventListener("click", () => {
    somLigado = !somLigado;
    botaoSom.textContent = somLigado ? "Som: ligado" : "Som: desligado";
    botaoSom.setAttribute("aria-pressed", String(somLigado));
});

botaoPausaToque.addEventListener("click", alternarPausa);

/*
  COMER: olhar a casa onde o Pac-Man está agora.

  Se ela vale pontos, vira corredor vazio na matriz — e pronto, a
  pastilha sumiu da tela, porque o desenho só espelha o mapa.

  A coluna passa pelo mesmo conserto do túnel: no meio da travessia, o
  Pac-Man pode estar num x que não pertence a nenhuma coluna do mapa.
*/
function comer() {
    const coluna = ((casaDe(pacMan.x) % COLUNAS) + COLUNAS) % COLUNAS;
    const linha = casaDe(pacMan.y);
    const casa = mapa[linha][coluna];

    if (!(casa in PONTOS_POR_CASA)) {
        return;
    }

    mapa[linha][coluna] = " ";
    ganharPontos(PONTOS_POR_CASA[casa]);
    tocarWaka();

    if (casa === "o") {
        assustarFantasmas();
    }
    pastilhasRestantes -= 1;
    atualizarPlacar();

    // Comeu a 70ª ou a 170ª pastilha da fase? Aparece a fruta.
    const comidas = pastilhasNoInicio - pastilhasRestantes;

    if (PASTILHAS_PARA_A_FRUTA.includes(comidas)) {
        fruta = { tipo: nivelAtual().fruta, tempoRestante: DURACAO_DA_FRUTA };
    }

    if (pastilhasRestantes === 0) {
        mudarEstado("fase completa");
    }
}

/*
  A FRUTA: um temporizador e uma colisão por casa, como os fantasmas.
  O Pac-Man a pega se estiver numa das duas casas sob o ponto onde ela
  aparece (ela fica entre duas casas, como o Pac-Man no começo).
*/
function atualizarFruta(tempo) {
    if (fruta === null) {
        return;
    }

    fruta.tempoRestante -= tempo;

    if (fruta.tempoRestante <= 0) {
        fruta = null;
        return;
    }

    const linhaCerta = casaDe(pacMan.y) === casaDe(LUGAR_DA_FRUTA.y);
    const colunaCerta = Math.abs(pacMan.x - LUGAR_DA_FRUTA.x) < TAMANHO_DA_CASA / 2;

    if (linhaCerta && colunaCerta) {
        const valor = FRUTAS[fruta.tipo].pontos;
        ganharPontos(valor);
        tocarArpejo([660, 880, 1320], 0.06);
        textosFlutuantes.push({ x: LUGAR_DA_FRUTA.x, y: LUGAR_DA_FRUTA.y, texto: String(valor), vida: 1.5, cor: "#ffb8de" });
        fruta = null;
    }
}

function atualizarPlacar() {
    campoPontos.textContent = pontos;
    campoVidas.textContent = vidas;
    campoFase.textContent = fase;
    campoRecorde.textContent = recorde;
}

/*
  ANDAR EM PIXELS, DECIDIR NOS CENTROS.

  A distância do quadro (velocidade x tempo) é gasta em pedaços: nunca
  um pedaço passa por cima de um centro de casa. Cada vez que um centro
  é alcançado, o Pac-Man decide:

    1. a direção desejada está livre? Então vira para ela.
    2. a direção atual está bloqueada? Então para — encostado, no centro.

  Por que em pedaços, e não tudo de uma vez? Porque um quadro lento
  (0,05 s a 60 px/s = 3 px) poderia passar do centro sem nunca parar
  nele — e a curva seria perdida, ou o Pac-Man entraria meio pixel na
  parede. Andar até o centro, decidir, e só então gastar o resto, é o
  que garante que nenhuma decisão é pulada.

  Meia-volta é a exceção: pode acontecer em qualquer lugar, na hora. Dar
  meia-volta não entra em parede nenhuma — o caminho de volta é o mesmo
  por onde ele acabou de passar.
*/
function moverPacMan(tempo) {
    if (saoOpostas(pacMan.desejada, pacMan.direcao)) {
        pacMan.direcao = pacMan.desejada;
        pacMan.parado = false;
    }

    andar(pacMan, VELOCIDADE_MAXIMA * nivelAtual().pacMan * tempo, decidirPacMan);
}

/*
  A decisão do Pac-Man, num centro de casa: a intenção do jogador, se
  der; senão, seguir em frente, se der; senão, parar.
*/
function decidirPacMan(entidade) {
    if (proximaCasaLivre(entidade, entidade.desejada)) {
        entidade.direcao = entidade.desejada;
    }

    entidade.parado = !proximaCasaLivre(entidade, entidade.direcao);
}

/*
  ANDAR, separado de DECIDIR.

  Esta função é a mesma para o Pac-Man e para o fantasma: gastar a
  distância em pedaços, sem pular nenhum centro, e em cada centro
  perguntar a `decidir` para onde ir. Quem é o personagem, e como ele
  decide, ela não sabe — recebe a decisão como uma FUNÇÃO.

  Passar uma função como argumento é o que permite escrever o "como
  andar" uma vez e o "como escolher" quantas vezes houver personagens.
*/
function andar(entidade, distancia, decidir) {
    while (distancia > 0) {
        if (estaNoCentro(entidade)) {
            decidir(entidade);

            if (entidade.parado) {
                return;
            }
        }

        const passo = Math.min(distancia, distanciaAteOProximoCentro(entidade));

        entidade.x += entidade.direcao.dx * passo;
        entidade.y += entidade.direcao.dy * passo;
        entidade.distanciaAndada = (entidade.distanciaAndada || 0) + passo;
        distancia -= passo;

        encaixar(entidade);
    }
}


// ============================================================
// 10. O FANTASMA
// ============================================================
/*
  Cada estado move o fantasma de um jeito. Só no estado "andando" ele
  obedece às regras do labirinto; na casa, segue um roteiro fixo.
*/
function moverFantasma(f, tempo) {
    switch (f.estado) {
        case "em casa":
            quicarNaCasa(f, VELOCIDADE_NA_CASA * tempo);

            if (tempoDesdeOInicio >= f.esperaNaCasa) {
                f.estado = "saindo";
            }
            break;

        case "saindo":
            if (irAte(f, X_DA_PORTA, Y_DA_SAIDA, VELOCIDADE_NA_CASA * tempo)) {
                f.estado = "andando";
                f.direcao = DIRECOES.ESQUERDA;
            }
            break;

        case "andando": {
            andar(f, velocidadeDoFantasma(f) * tempo, decidirFantasma);
            break;
        }

        case "olhos":
            andar(f, VELOCIDADE_DOS_OLHOS * tempo, decidirOlhos);
            break;

        /*
          Entrando: primeiro centraliza na porta, depois desce até o meio
          da casa — e revive, saindo de novo como um fantasma inteiro.
        */
        case "entrando":
            f.parado = false;

            if (!f.naPorta) {
                f.naPorta = irAte(f, X_DA_PORTA, Y_DA_SAIDA, VELOCIDADE_DOS_OLHOS * tempo);
            } else if (irAte(f, X_DA_PORTA, Y_DO_MEIO_DA_CASA, VELOCIDADE_DOS_OLHOS * tempo)) {
                f.naPorta = false;
                f.estado = "saindo";
            }
            break;
    }
}

/*
  A velocidade do fantasma vem da ficha da fase: normal ou assustado,
  e, se estiver no túnel, a do túnel (a menor das duas). O túnel lento é
  um esconderijo: o fantasma que entra atrás de você fica para trás.
*/
function velocidadeDoFantasma(f) {
    const nivel = nivelAtual();
    let fracao = f.assustado ? nivel.assustado : nivel.fantasma;

    if (estaNoTunel(f)) {
        fracao = Math.min(fracao, nivel.tunel);
    }

    return VELOCIDADE_MAXIMA * fracao;
}

/*
  O túnel: a linha 14, nas seis primeiras e seis últimas colunas. (Uma
  conta sobre a posição — nenhuma marca no mapa.)
*/
function estaNoTunel(f) {
    const coluna = ((casaDe(f.x) % COLUNAS) + COLUNAS) % COLUNAS;
    return casaDe(f.y) === 14 && (coluna <= 5 || coluna >= COLUNAS - 6);
}

/*
  Esperando, o fantasma sobe e desce 4 pixels em torno do meio da casa.
  Parado, ele pareceria desligado; quicando, parece impaciente.
*/
function quicarNaCasa(f, distancia) {
    f.y += f.direcao.dy * distancia;

    if (f.y < Y_DO_MEIO_DA_CASA - 4) {
        f.y = Y_DO_MEIO_DA_CASA - 4;
        f.direcao = DIRECOES.BAIXO;
    } else if (f.y > Y_DO_MEIO_DA_CASA + 4) {
        f.y = Y_DO_MEIO_DA_CASA + 4;
        f.direcao = DIRECOES.CIMA;
    }
}

/*
  UM ROTEIRO FORA DA GRADE: primeiro alinha na horizontal com a porta,
  depois sobe por ela. Devolve true quando chegou.

  A casa dos fantasmas não é labirinto: não tem cruzamentos, nem regra de
  meia-volta, e a porta é uma parede para o Pac-Man. Em vez de complicar
  a regra geral com exceções, a casa ganha o seu próprio movimento,
  simples e roteirizado.
*/
function irAte(f, xAlvo, yAlvo, distancia) {
    const faltaX = xAlvo - f.x;

    if (Math.abs(faltaX) > EPSILON) {
        const passo = Math.min(distancia, Math.abs(faltaX));
        f.x += Math.sign(faltaX) * passo;
        f.direcao = faltaX < 0 ? DIRECOES.ESQUERDA : DIRECOES.DIREITA;
        return false;
    }

    const faltaY = yAlvo - f.y;

    if (Math.abs(faltaY) > EPSILON) {
        const passo = Math.min(distancia, Math.abs(faltaY));
        f.y += Math.sign(faltaY) * passo;
        f.direcao = faltaY < 0 ? DIRECOES.CIMA : DIRECOES.BAIXO;
        return Math.abs(yAlvo - f.y) <= EPSILON;
    }

    return true;
}

/*
  OS OLHOS SEGUEM O MAPA DE DISTÂNCIAS (ver a busca em largura, abaixo):
  de onde estão, vão para a vizinha com o número MENOR. Aqui a meia-volta
  é permitida — o caminho mais curto pode ser para trás.

  Ao chegar à casa de distância zero (logo acima da porta), viram
  "entrando".
*/
function decidirOlhos(f) {
    const coluna = ((casaDe(f.x) % COLUNAS) + COLUNAS) % COLUNAS;
    const linha = casaDe(f.y);

    if (DISTANCIAS_ATE_A_PORTA[linha][coluna] === 0) {
        f.estado = "entrando";
        f.parado = true;   // para `andar` parar aqui; o próximo quadro já é "entrando"
        return;
    }

    let melhor = f.direcao;
    let menor = Infinity;

    for (const direcao of ORDEM_DAS_DIRECOES) {
        if (!proximaCasaLivre(f, direcao)) {
            continue;
        }

        const vizinhaColuna = ((coluna + direcao.dx) % COLUNAS + COLUNAS) % COLUNAS;
        const distancia = DISTANCIAS_ATE_A_PORTA[linha + direcao.dy][vizinhaColuna];

        if (distancia < menor) {
            menor = distancia;
            melhor = direcao;
        }
    }

    f.direcao = melhor;
}

/*
  A BUSCA EM LARGURA: uma enchente a partir da porta.

  Começa nas duas casas logo acima da porta, com distância 0. Delas, a
  água escorre para as vizinhas livres, que recebem 1. Das que receberam
  1, para as vizinhas ainda secas, que recebem 2. E assim por diante, em
  ONDAS, até molhar o labirinto inteiro.

  A FILA é o que garante as ondas: quem entrou primeiro (mais perto)
  é processado primeiro. Por isso, quando uma casa é molhada pela
  primeira vez, o número dela já é a menor distância possível — nenhum
  caminho mais longo chega antes.

  Roda UMA vez, no carregamento. Depois, achar o caminho mais curto de
  qualquer lugar é só olhar os números das vizinhas.
*/
function calcularDistanciasAtePorta() {
    const distancias = mapa.map(linha => linha.map(() => Infinity));
    const fila = [];

    for (const coluna of [13, 14]) {
        distancias[11][coluna] = 0;
        fila.push({ coluna, linha: 11 });
    }

    while (fila.length > 0) {
        const atual = fila.shift();   // tira o primeiro da fila

        for (const direcao of ORDEM_DAS_DIRECOES) {
            const coluna = ((atual.coluna + direcao.dx) % COLUNAS + COLUNAS) % COLUNAS;
            const linha = atual.linha + direcao.dy;

            if (!podeEntrar(coluna, linha) || distancias[linha][coluna] !== Infinity) {
                continue;   // parede, ou já molhada por um caminho mais curto
            }

            distancias[linha][coluna] = distancias[atual.linha][atual.coluna] + 1;
            fila.push({ coluna, linha });
        }
    }

    return distancias;
}

const DISTANCIAS_ATE_A_PORTA = calcularDistanciasAtePorta();

// Duas perguntas que três dos quatro alvos fazem.
function casaDoPacMan() {
    return { coluna: casaDe(pacMan.x), linha: casaDe(pacMan.y) };
}

function aFrenteDoPacMan(casas) {
    const pac = casaDoPacMan();
    return {
        coluna: pac.coluna + pacMan.direcao.dx * casas,
        linha: pac.linha + pacMan.direcao.dy * casas
    };
}

/*
  A REGRA DO CRUZAMENTO.

  1. Lista as saídas possíveis: as quatro direções, menos a meia-volta,
     menos as que dão em parede.
  2. Para cada uma, mede a distância (em linha reta) entre a casa
     vizinha naquela direção e o alvo.
  3. Fica com a menor. Empate: vence quem vem antes na ORDEM_DAS_DIRECOES.

  A distância é Pitágoras SEM a raiz (dx² + dy²): para saber qual é
  MENOR, os quadrados bastam — se a < b, então a² < b².

  "Nunca dar meia-volta" parece um detalhe, e é o que impede o fantasma
  de tremer para a frente e para trás num corredor, indeciso.
*/
function decidirFantasma(f) {
    /*
      Assustado, não há alvo: entre as saídas permitidas (ainda sem
      meia-volta), uma ao acaso. É o que o faz parecer em pânico.
    */
    if (f.assustado) {
        const saidas = ORDEM_DAS_DIRECOES.filter(direcao =>
            !saoOpostas(direcao, f.direcao) && proximaCasaLivre(f, direcao)
        );

        if (saidas.length > 0) {
            f.direcao = saidas[Math.floor(Math.random() * saidas.length)];
            return;
        }
    }

    // Dispersando, o alvo é o canto; perseguindo, a personalidade.
    const alvo = modoAtual() === "dispersar" ? f.canto : f.alvo(f);
    const coluna = casaDe(f.x);
    const linha = casaDe(f.y);

    let melhor = null;
    let menorDistancia = Infinity;

    for (const direcao of ORDEM_DAS_DIRECOES) {
        if (saoOpostas(direcao, f.direcao) || !proximaCasaLivre(f, direcao)) {
            continue;
        }

        const dx = coluna + direcao.dx - alvo.coluna;
        const dy = linha + direcao.dy - alvo.linha;
        const distancia = dx * dx + dy * dy;

        // "<" e não "<=": no empate, fica a que apareceu primeiro.
        if (distancia < menorDistancia) {
            menorDistancia = distancia;
            melhor = direcao;
        }
    }

    // Um beco sem saída (este labirinto não tem nenhum): a única saída é voltar.
    f.direcao = melhor || { dx: -f.direcao.dx, dy: -f.direcao.dy };
}


// ============================================================
// 11. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            desenharCasa(coluna, linha);
        }
    }

    /*
      O que aparece depende do estado: morrendo, os fantasmas somem e o
      Pac-Man se desfaz; com a fase completa, só o Pac-Man e as paredes
      piscando.
    */
    if (estado === "morrendo") {
        desenharPacManMorrendo();
        return;
    }

    desenharFruta();

    desenharPacMan();

    if (estado === "fase completa") {
        return;
    }

    fantasmas.forEach(desenharFantasma);

    if (mostrarAlvos) {
        fantasmas
            .filter(f => f.estado === "andando" && !f.assustado)
            .forEach(f => desenharAlvo(f, modoAtual() === "dispersar" ? f.canto : f.alvo(f)));
    }

    desenharTextos();
}

/*
  Os pontos de cada fantasma comido. Texto com fillText, numa tela de
  224 pixels ampliada 2 vezes, sairia borrado; por isso os algarismos
  são desenhados como os sprites — uma fonte de 3x5 pixels, feita de
  texto. Cada algarismo ocupa 3 de largura, mais 1 de espaço.
*/
const ALGARISMOS = {
    "0": ["###", "#.#", "#.#", "#.#", "###"],
    "1": [".#.", "##.", ".#.", ".#.", "###"],
    "2": ["###", "..#", "###", "#..", "###"],
    "3": ["###", "..#", ".##", "..#", "###"],
    "4": ["#.#", "#.#", "###", "..#", "..#"],
    "5": ["###", "#..", "###", "..#", "###"],
    "6": ["###", "#..", "###", "#.#", "###"],
    "7": ["###", "..#", "..#", ".#.", ".#."],
    "8": ["###", "#.#", "###", "#.#", "###"],
    "9": ["###", "#.#", "###", "..#", "###"]
};

function desenharTextos() {
    textosFlutuantes.forEach(texto => desenharNumero(texto.texto, texto.x, texto.y, texto.cor || "#3bf3ff"));
}

/*
  A fruta pisca nos últimos 2 segundos, como o susto: "estou indo
  embora".
*/
function desenharFruta() {
    if (fruta === null) {
        return;
    }

    if (fruta.tempoRestante < 2 && Math.floor(fruta.tempoRestante * 6) % 2 === 0) {
        return;
    }

    const desenho = FRUTAS[fruta.tipo].desenho;
    const esquerda = Math.round(LUGAR_DA_FRUTA.x) - 4;
    const topo = Math.round(LUGAR_DA_FRUTA.y) - 4;

    desenho.forEach((linha, dy) => {
        for (let dx = 0; dx < linha.length; dx++) {
            const cor = CORES_DAS_FRUTAS[linha[dx]];

            if (cor) {
                pincel.fillStyle = cor;
                pincel.fillRect(esquerda + dx, topo + dy, 1, 1);
            }
        }
    });
}

function desenharNumero(texto, centroX, centroY, cor) {
    const largura = texto.length * 4 - 1;
    const esquerda = Math.round(centroX - largura / 2);
    const topo = Math.round(centroY - 2.5);

    pincel.fillStyle = cor;

    [...texto].forEach((algarismo, i) => {
        ALGARISMOS[algarismo].forEach((linha, dy) => {
            for (let dx = 0; dx < 3; dx++) {
                if (linha[dx] === "#") {
                    pincel.fillRect(esquerda + i * 4 + dx, topo + dy, 1, 1);
                }
            }
        });
    });
}

/*
  O fantasma em três camadas: o corpo (com a saia da vez), os olhos
  brancos e as pupilas. Os olhos se deslocam 1 pixel e as pupilas 2 na
  direção em que ele anda — ele OLHA para onde vai, e o jogador lê a
  intenção dele antes que ele vire.
*/
function desenharFantasma(f) {
    const esquerda = Math.round(f.x) - 7;
    const topo = Math.round(f.y) - 7;

    // Comido: só os olhos.
    const soOsOlhos = f.estado === "olhos" || f.estado === "entrando";

    if (!soOsOlhos) {
        const saia = SAIAS_DO_FANTASMA[Math.floor(tempoTotal * 8) % 2];
        const desenho = [...CORPO_DO_FANTASMA, ...saia];

        /*
          Assustado: azul. Nos últimos 2 segundos, alterna com branco —
          o aviso de que o susto está acabando. O jogador que vê o pisca
          desiste de perseguir a tempo.
        */
        const piscando = f.assustado && tempoDeSusto < Math.min(AVISO_DO_FIM_DO_SUSTO, nivelAtual().susto / 2)
            && Math.floor(tempoDeSusto * 5) % 2 === 0;

        pincel.fillStyle = f.assustado
            ? (piscando ? COR_ASSUSTADO_PISCANDO : COR_ASSUSTADO)
            : f.cor;

        desenho.forEach((linha, dy) => {
            for (let dx = 0; dx < linha.length; dx++) {
                if (linha[dx] === "#") {
                    pincel.fillRect(esquerda + dx, topo + dy, 1, 1);
                }
            }
        });

        if (f.assustado) {
            desenharRostoAssustado(esquerda, topo, piscando);
            return;
        }
    }

    const olharX = f.direcao.dx;
    const olharY = f.direcao.dy;

    for (const olho of [2, 8]) {
        const ox = esquerda + olho + olharX;
        const oy = topo + 3 + olharY;

        pincel.fillStyle = COR_DO_OLHO;
        pincel.fillRect(ox + 1, oy, 2, 5);
        pincel.fillRect(ox, oy + 1, 4, 3);

        pincel.fillStyle = COR_DA_PUPILA;
        pincel.fillRect(ox + 1 + olharX, oy + 2 + olharY, 2, 2);
    }
}

// O rosto em pânico: dois olhinhos e uma boca em zigue-zague.
function desenharRostoAssustado(esquerda, topo, piscando) {
    pincel.fillStyle = piscando ? COR_ROSTO_PISCANDO : COR_ROSTO_ASSUSTADO;

    pincel.fillRect(esquerda + 4, topo + 5, 2, 2);
    pincel.fillRect(esquerda + 8, topo + 5, 2, 2);

    for (let i = 0; i < 5; i++) {
        pincel.fillRect(esquerda + 2 + i * 2, topo + 10 + (i % 2), 2, 1);
    }
}

/*
  A tecla H mostra o invisível: um quadrado na casa-alvo e uma linha do
  fantasma até ela. É assim que se ENTENDE (e se depura) uma
  inteligência artificial: desenhando o que ela está pensando.
*/
function desenharAlvo(f, alvo) {
    const x = alvo.coluna * TAMANHO_DA_CASA;
    const y = alvo.linha * TAMANHO_DA_CASA;

    pincel.strokeStyle = f.cor;
    pincel.lineWidth = 1;
    pincel.strokeRect(x + 0.5, y + 0.5, TAMANHO_DA_CASA - 1, TAMANHO_DA_CASA - 1);

    pincel.beginPath();
    pincel.moveTo(f.x, f.y);
    pincel.lineTo(x + TAMANHO_DA_CASA / 2, y + TAMANHO_DA_CASA / 2);
    pincel.stroke();
}

function desenharCasa(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;

    switch (mapa[linha][coluna]) {
        case "#":
            desenharParede(coluna, linha);
            break;

        case ".":
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 3, y + 3, 2, 2);
            break;

        case "o":
            // O energizante pisca, 4 vezes por segundo: "eu sou diferente".
            if (Math.floor(tempoTotal * 4) % 2 === 1) {
                break;
            }

            // Um "círculo" de 6x6 feito de dois retângulos: pixel art, sem arc.
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 2, y + 1, 4, 6);
            pincel.fillRect(x + 1, y + 2, 6, 4);
            break;

        case "-":
            pincel.fillStyle = COR_PORTA;
            pincel.fillRect(x, y + 3, TAMANHO_DA_CASA, 2);
            break;
    }
}

/*
  A PAREDE QUE SE DESENHA SOZINHA.

  Uma casa de parede não sabe se é a quina de um bloco, o meio de um
  muro ou a ponta de uma ilha. Mas ela pode PERGUNTAR aos quatro
  vizinhos: "você é parede?". Onde a vizinha é corredor, há uma borda, e
  a borda ganha uma linha.

  As linhas ficam um pouco para dentro da parede (a 2 pixels da borda),
  e cada uma só se estica até o fim da casa se a vizinha daquele lado
  também for parede — senão para no canto, onde encontra a outra linha.
  É isso que fecha as quinas sem deixar pontas sobrando.

      I = a 2 pixels do lado de dentro       F = a 5 pixels

  Os quatro testes de DIAGONAL resolvem as quinas de dentro: quando as
  duas vizinhas são parede mas a da diagonal é corredor, falta um
  pedacinho de L para ligar as linhas das casas ao lado.

  Nada disto está no texto do mapa. É deduzido — e por isso qualquer
  labirinto que você escrever sai desenhado certo.
*/
function desenharParede(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;
    const ultimo = TAMANHO_DA_CASA - 1;
    const I = 2;
    const F = TAMANHO_DA_CASA - 3;

    const livreEmCima = !ehParede(coluna, linha - 1);
    const livreEmbaixo = !ehParede(coluna, linha + 1);
    const livreAEsquerda = !ehParede(coluna - 1, linha);
    const livreADireita = !ehParede(coluna + 1, linha);

    /*
      Comemorando, as paredes alternam entre azul e branco: a conta do
      energizante, mais rápida.
    */
    const piscando = estado === "fase completa" && Math.floor(tempoNoEstado * 6) % 2 === 0;
    pincel.fillStyle = piscando ? COR_PAREDE_PISCANDO : COR_PAREDE;

    // As bordas retas.
    if (livreEmCima) {
        linhaHorizontal(y + I, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreEmbaixo) {
        linhaHorizontal(y + F, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreAEsquerda) {
        linhaVertical(x + I, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }
    if (livreADireita) {
        linhaVertical(x + F, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }

    // As quinas de dentro: vizinhas são parede, a diagonal não.
    if (!livreEmCima && !livreAEsquerda && !ehParede(coluna - 1, linha - 1)) {
        linhaVertical(x + I, y, y + I);
        linhaHorizontal(y + I, x, x + I);
    }
    if (!livreEmCima && !livreADireita && !ehParede(coluna + 1, linha - 1)) {
        linhaVertical(x + F, y, y + I);
        linhaHorizontal(y + I, x + F, x + ultimo);
    }
    if (!livreEmbaixo && !livreAEsquerda && !ehParede(coluna - 1, linha + 1)) {
        linhaVertical(x + I, y + F, y + ultimo);
        linhaHorizontal(y + F, x, x + I);
    }
    if (!livreEmbaixo && !livreADireita && !ehParede(coluna + 1, linha + 1)) {
        linhaVertical(x + F, y + F, y + ultimo);
        linhaHorizontal(y + F, x + F, x + ultimo);
    }
}

// Duas ajudantes para não escrever largura e altura de linhas de 1 pixel.
function linhaHorizontal(y, de, ate) {
    pincel.fillRect(de, y, ate - de + 1, 1);
}

function linhaVertical(x, de, ate) {
    pincel.fillRect(x, de, 1, ate - de + 1);
}

/*
  A BOCA ANDA COM ELE, NÃO COM O RELÓGIO.

  A abertura vem da distância percorrida: andando, a boca abre e fecha;
  encostado numa parede, ela congela. Se viesse do relógio, o Pac-Man
  "mastigaria o ar" parado — um detalhe pequeno que entrega que algo
  está errado.

  O ângulo da direção sai de Math.atan2(dy, dx): direita é 0, baixo é
  π/2, esquerda é π, cima é -π/2. A boca é uma fatia em volta desse
  ângulo.
*/
function desenharPacMan() {
    const abertura = Math.abs(Math.sin(pacMan.distanciaAndada * 0.35)) * 0.28 * Math.PI + 0.02;
    const angulo = Math.atan2(pacMan.direcao.dy, pacMan.direcao.dx);

    pincel.fillStyle = COR_PAC_MAN;
    pincel.beginPath();
    pincel.moveTo(pacMan.x, pacMan.y);
    pincel.arc(pacMan.x, pacMan.y, 6.5, angulo + abertura, angulo - abertura + Math.PI * 2);
    pincel.closePath();
    pincel.fill();
}


/*
  O PAC-MAN SE DESFAZ: virado para cima, a boca abre até ele virar nada,
  em 1,2 s; o resto do tempo do estado a tela fica vazia. É a mesma
  fatia de pizza de sempre — só que a fatia que falta cresce até ser a
  pizza inteira.
*/
function desenharPacManMorrendo() {
    const progresso = Math.min(tempoNoEstado / 1.2, 1);

    if (progresso >= 1) {
        return;
    }

    const abertura = 0.05 + progresso * Math.PI;
    const angulo = -Math.PI / 2;

    pincel.fillStyle = COR_PAC_MAN;
    pincel.beginPath();
    pincel.moveTo(pacMan.x, pacMan.y);
    pincel.arc(pacMan.x, pacMan.y, 6.5, angulo + abertura, angulo - abertura + Math.PI * 2);
    pincel.closePath();
    pincel.fill();
}


// ============================================================
// 12. RECORDE
// ============================================================
/*
  localStorage com as duas precauções de sempre: try/catch (o acesso pode
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
// 13. SOM
// ============================================================
/*
  Dois tipos de som:

  - SONS CURTOS, que nascem e morrem: um oscilador por som, com envelope
    (a frequência e o volume mudam ao longo dele).

  - UM SOM CONTÍNUO: a sirene dos fantasmas. Um oscilador só, criado uma
    vez e NUNCA parado; a cada quadro, o jogo diz a ele que frequência e
    que volume ter. Pausado ou fora da partida, o volume vai a zero.
    Criar e destruir um oscilador por quadro, para um som que não acaba,
    seria desperdício — e daria estalos.
*/
let contextoDeAudio = null;
let sirene = null;

function prepararAudio() {
    if (contextoDeAudio !== null) {
        return;
    }

    try {
        contextoDeAudio = new AudioContext();

        const oscilador = contextoDeAudio.createOscillator();
        const ganho = contextoDeAudio.createGain();

        oscilador.type = "triangle";
        ganho.gain.value = 0;
        oscilador.connect(ganho);
        ganho.connect(contextoDeAudio.destination);
        oscilador.start();

        sirene = { oscilador, ganho };
    } catch (erro) {
        somLigado = false;
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

/*
  O "WAKA": duas notas que se ALTERNAM, uma por pastilha. Comendo uma
  fileira, elas viram o som que todo mundo conhece. O estado é um
  booleano que vira a cada chamada.
*/
let wakaAlto = false;

function tocarWaka() {
    wakaAlto = !wakaAlto;
    tocarSom({
        frequencia: wakaAlto ? 520 : 340,
        frequenciaFinal: wakaAlto ? 340 : 520,
        duracao: 0.07,
        volume: 0.035,
        tipo: "triangle"
    });
}

/*
  A sirene: sobe e desce com um seno, mais aguda a cada fase. Com os
  fantasmas assustados, vira um zumbido grave e rápido. setTargetAtTime
  faz a frequência ESCORREGAR até o novo valor em vez de saltar — sem
  isso, mudar a frequência 60 vezes por segundo soaria como um chiado.
*/
function atualizarSirene() {
    if (sirene === null) {
        return;
    }

    const agora = contextoDeAudio.currentTime;
    const tocando = somLigado && estado === "jogando";

    let frequencia = 330 + fase * 15 + Math.sin(tempoTotal * 5) * 70;
    if (tempoDeSusto > 0) {
        frequencia = 160 + Math.sin(tempoTotal * 14) * 30;
    }

    sirene.oscilador.frequency.setTargetAtTime(frequencia, agora, 0.02);
    sirene.ganho.gain.setTargetAtTime(tocando ? 0.012 : 0, agora, 0.05);
}


// ============================================================
// 14. LIGAR
// ============================================================
atualizarPlacar();
mostrarMensagem("Pac-Man", "Coma tudo. Fuja dos fantasmas — até comer um energizante.", true);
requestAnimationFrame(quadroAQuadro);
