/* DIQUE — PASSO 2: regras puras (sem canvas, sem DOM). Mundo → tela: [sx, sy] = origem + MATRIZ · [u, v] − (0, z · degrau). */
const ALTURAS_EM_TEXTO = [      // dígito = blocos empilhados (0 a 4); ~ = mar
    "~~~~~~~~~~",
    "~~~1111~~~",
    "~~1122211~",
    "~11233321~",
    "~12344321~",
    "~12340121~",
    "~11230011~",
    "~~1122111~",
    "~~~11111~~",
    "~~~~~~~~~~",
];
const OBJETOS_EM_TEXTO = [      // C = casa, P = cais, . = nada
    "..........",
    "..........",
    "...C......",
    ".......C..",
    ".P........",
    "..........",
    "..C.......",
    ".......C..",
    "..........",
    "..........",
];
const TAMANHO = ALTURAS_EM_TEXTO.length;
const alturas = ALTURAS_EM_TEXTO.map(function (linha) {
    return linha.split("").map(function (simbolo) { return simbolo === "~" ? 0 : Number(simbolo); });
});
const LARGURA_DO_BLOCO = 36;                    // L: o losango tem L de largura e L/2 de altura
const ALTURA_DO_DEGRAU = 12;                    // pixels que um degrau de altura sobe na tela
const NIVEL_DA_AGUA = 1;                        // a água cobre todo bloco mais baixo que isto (a maré dinâmica é do passo 5)
const MATRIZ = [[LARGURA_DO_BLOCO / 2, -LARGURA_DO_BLOCO / 2], [LARGURA_DO_BLOCO / 4, LARGURA_DO_BLOCO / 4]];
const DETERMINANTE = MATRIZ[0][0] * MATRIZ[1][1] - MATRIZ[0][1] * MATRIZ[1][0];   // L²/4: nunca zero
const INVERSA = [[MATRIZ[1][1], -MATRIZ[0][1]], [-MATRIZ[1][0], MATRIZ[0][0]]].map(function (linha) {   // [[a, b], [c, d]]⁻¹ = 1/det · [[d, −b], [−c, a]]
    return linha.map(function (numero) { return numero / DETERMINANTE; });
});
const ORIGEM = { x: TAMANHO * LARGURA_DO_BLOCO / 2 + 12, y: 4 * ALTURA_DO_DEGRAU + 12 };   // onde cai o canto (0, 0) no chão; sobra espaço para o bloco mais alto
let rotacao = 0;                                // giros de 90° da vista (0 a 3)
let listaDeDesenho = [];                        // as casas na ordem em que são pintadas: de trás para a frente

function verificarMapa() {                      // quadrado, só símbolos da legenda, mar em toda a borda, objetos só em terra
    const valido = ALTURAS_EM_TEXTO.every(function (linha, y) {
        return linha.length === TAMANHO && OBJETOS_EM_TEXTO[y].length === TAMANHO && linha.split("").every(function (simbolo, x) {
            const naBorda = x === 0 || y === 0 || x === TAMANHO - 1 || y === TAMANHO - 1;
            const objetoNoMar = simbolo === "~" && OBJETOS_EM_TEXTO[y][x] !== ".";
            return /[~0-4]/.test(simbolo) && /[CP.]/.test(OBJETOS_EM_TEXTO[y][x]) && !objetoNoMar && (!naBorda || simbolo === "~");
        });
    });
    if (!valido) console.error("Mapa inválido: confira o formato quadrado, os símbolos, o mar na borda e os objetos em terra.");
    return valido;
}

function girarPonto(x, y, vezes) {              // cada giro de 90°: (x, y) → (TAMANHO − y, x)
    let ponto = { x: x, y: y };
    for (let giro = 0; giro < vezes; giro++) ponto = { x: TAMANHO - ponto.y, y: ponto.x };
    return ponto;
}

function projetar(u, v, z) {                    // a matriz em ação; z sobe o ponto na tela
    return { x: ORIGEM.x + MATRIZ[0][0] * u + MATRIZ[0][1] * v, y: ORIGEM.y + MATRIZ[1][0] * u + MATRIZ[1][1] * v - (z || 0) * ALTURA_DO_DEGRAU };
}

function mundoParaTela(x, y, z) {
    const girado = girarPonto(x, y, rotacao);
    return projetar(girado.x, girado.y, z);
}

function telaParaMundo(sx, sy, z) {             // a inversa: com z diz que ponto do plano z está sob o pixel; pixel de bloco alto pede o passo 3
    const dx = sx - ORIGEM.x, dy = sy - ORIGEM.y + (z || 0) * ALTURA_DO_DEGRAU;
    const girado = { x: INVERSA[0][0] * dx + INVERSA[0][1] * dy, y: INVERSA[1][0] * dx + INVERSA[1][1] * dy };
    return girarPonto(girado.x, girado.y, 4 - rotacao);     // 4 − r giros desfazem r giros
}

function cantosDoBloco(x, y, z) {               // cima, direita, baixo, esquerda — na tela, em qualquer giro
    const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
    return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(function (canto) {
        return projetar(centro.x + canto[0], centro.y + canto[1], z);
    });
}

function montarListaDeDesenho() {               // algoritmo do pintor: x'+y' cresce para a frente; no empate, o mais baixo primeiro
    const lista = [];
    alturas.forEach(function (linha, y) {
        linha.forEach(function (altura, x) {
            const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
            lista.push({ x: x, y: y, altura: altura, proximidade: centro.x + centro.y });
        });
    });
    return lista.sort(function (a, b) { return a.proximidade - b.proximidade || a.altura - b.altura; });
}

listaDeDesenho = montarListaDeDesenho();
