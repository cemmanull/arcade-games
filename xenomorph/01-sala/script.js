/*
  XENOMORPH — PASSO 1: A SALA

  O último módulo do curso é o maior jogo: um soldado explorando um
  planeta tomado por criaturas, sala por sala. Tudo começa por uma sala.

  Três ideias, e as três ficam até o fim:

  1. O MUNDO É UM TEXTO
     Como o labirinto do Pac-Man: a sala é escrita com caracteres, um por
     bloco, e vira uma matriz. Dá para LER a sala dentro do código.

  2. O QUE COLIDE E O QUE APARECE SÃO PERGUNTAS DIFERENTES
     Um cano ao fundo aparece, mas não segura ninguém. Uma tabela diz, para
     cada caractere, as duas coisas separadas: é sólido? como se desenha?

  3. O SOLDADO É UMA CAIXA
     No Shoot 'em up, x e y eram o centro, porque tudo mirava e explodia a
     partir dele. Aqui o problema principal é outro: encostar em paredes e
     pisar no chão — caixas contra uma grade. Então x e y voltam a ser o
     CANTO superior esquerdo, como no Pong.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DO_BLOCO = 8;   // pixels de desenho por bloco

/*
  A SALA, como texto. Cada caractere é um bloco de 8x8 pixels:

      #   metal (sólido)
      |   cano ao fundo (só cenário)
      .   ar
      @   onde o soldado começa

  32 colunas por 18 linhas — exatamente uma tela. As duas últimas linhas
  são o piso grosso.
*/
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    "#..............|...............#",
    "#..............|..........###..#",
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
    "#..@..|...............####.....#",
    "################################",
    "################################"
];

const COLUNAS = SALA_EM_TEXTO[0].length;   // 32 — deduzido, não digitado
const LINHAS = SALA_EM_TEXTO.length;       // 18

/*
  A TABELA DE BLOCOS: para cada caractere, duas respostas separadas.

  `solido` é a pergunta das REGRAS (o soldado pode estar aqui?).
  `desenho` é a pergunta da TELA (que cara isto tem?).

  Um bloco novo — vidro, grade, gosma — é uma linha nova nesta tabela.
  E dá para ter um bloco que aparece e não colide (o cano), ou, mais
  adiante, um que colide de um lado só.
*/
const BLOCOS = {
    "#": { solido: true, desenho: "metal" },
    "|": { solido: false, desenho: "cano" },
    ".": { solido: false, desenho: null }
};

const PALETA = {
    fundo: "#0b0f1a",
    painel: "#0f1524",          // as placas da parede do fundo
    juntaDoPainel: "#080b14",
    metal: "#2b3448",
    metalClaro: "#5c6f94",      // a borda que pega luz
    metalEscuro: "#161b28",
    rebite: "#7d8fb3",
    cano: "#1d2638",
    canoClaro: "#2f3c57"
};

/*
  O SOLDADO, como no Shoot 'em up: cada caractere um pixel, o ponto é
  transparente, um dicionário traduz letra em cor. O desenho tem 8 de
  largura, um a mais de cada lado que a caixa de 6 — o cotovelo e o cano
  da arma podem passar da caixa sem que isso conte como encostar.
*/
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
    "#": "#c9d3e6",   // a armadura
    d: "#56627a",     // as juntas e a sombra
    v: "#3cf2ff",     // o visor
    g: "#8a93b8"      // a arma
};

const LARGURA_DO_SOLDADO = 6;
const ALTURA_DO_SOLDADO = 12;


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
/*
  CONFIRA OS DADOS ANTES DE USAR (a lição do Pac-Man): uma linha com 31
  caracteres não dá erro — só desenha torto, e o bug aparece longe da
  causa. Aqui também se confere se todo caractere existe na tabela.
*/
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

/*
  OS MARCADORES. O "@" não é um bloco: é um RECADO de quem desenhou a sala
  ("o soldado começa aqui"). Ele é lido uma vez, guardado, e no lugar dele
  fica ar. Assim, quem desenha a sala decide onde as coisas começam sem
  mexer em nenhuma linha de código.
*/
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
  x e y são o CANTO superior esquerdo da caixa do soldado, em pixels.

  Ele nasce com os PÉS na base do bloco do "@": a linha seguinte é o chão.
  Por isso o y é a borda de baixo do bloco menos a altura do soldado —
  e não a borda de cima do bloco, que o deixaria com a cabeça no lugar
  dos pés e as pernas enterradas no piso.
*/
const soldado = {
    x: sala.inicio.coluna * TAMANHO_DO_BLOCO + 1,
    y: (sala.inicio.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
    largura: LARGURA_DO_SOLDADO,
    altura: ALTURA_DO_SOLDADO
};


// ============================================================
// 5. PERGUNTAS SOBRE UM BLOCO
// ============================================================
/*
  Fora da sala conta como sólido: assim quem pergunta pela vizinha da
  borda não precisa se preocupar com índices que não existem.
*/
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
// 6. DESENHAR
// ============================================================
function desenhar() {
    desenharFundo();
    desenharBlocos();
    desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, soldado.x - 1, soldado.y);
}

/*
  A parede do fundo: placas de 16x16 com uma junta escura entre elas.
  Nada disto está no texto da sala — é o papel de parede, igual em todas.
*/
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

/*
  Cada bloco se desenha pelo nome que a tabela dá. Um dicionário de
  funções em vez de um if por tipo: um desenho novo é uma entrada nova.
*/
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

/*
  AS BORDAS SE DEDUZEM DOS VIZINHOS (a lição do Pac-Man).

  O texto só diz "metal". Mas um bloco de metal com ar em cima é a
  SUPERFÍCIE de um piso: pega luz. Com ar embaixo, é a parte de baixo de
  uma plataforma: fica na sombra. Cada bloco olha os quatro vizinhos e
  decide sozinho onde pintar borda — mude o texto e o desenho inteiro se
  refaz, sem nenhum desenho à mão.
*/
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

    // Um rebite só nos blocos de borda: o miolo da parede fica liso.
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

    // Uma braçadeira a cada bloco: o cano parece preso à parede.
    pincel.fillRect(x + 1, y + 6, 6, 1);
}

/*
  O sprite é desenhado a partir do CANTO (x, y). Math.round evita que um
  canto em 41,5 caia entre dois pixels e borre — vai importar a partir do
  próximo passo, quando o soldado andar em frações de pixel.
*/
function desenharSprite(sprite, cores, x, y) {
    const inicioX = Math.round(x);
    const inicioY = Math.round(y);

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < linhaDoDesenho.length; dx++) {
            const cor = cores[linhaDoDesenho[dx]];

            if (!cor) {
                continue;   // o "." não tem cor: transparente
            }

            pincel.fillStyle = cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}


// ============================================================
// 7. LIGAR
// ============================================================
/*
  Nada se move: um desenho só basta. O loop entra no próximo passo.
*/
desenhar();
