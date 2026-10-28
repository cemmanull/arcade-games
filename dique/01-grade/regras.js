/* DIQUE — PASSO 1: regras puras (sem canvas, sem DOM). Mundo → tela: [sx, sy] = origem + MATRIZ · [u, v]. */
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
const TAMANHO = ALTURAS_EM_TEXTO.length;
const alturas = ALTURAS_EM_TEXTO.map(function (linha) {
    return linha.split("").map(function (simbolo) { return simbolo === "~" ? 0 : Number(simbolo); });
});
const LARGURA_DO_BLOCO = 36;                    // L: o losango tem L de largura e L/2 de altura
const MATRIZ = [[LARGURA_DO_BLOCO / 2, -LARGURA_DO_BLOCO / 2], [LARGURA_DO_BLOCO / 4, LARGURA_DO_BLOCO / 4]];
const DETERMINANTE = MATRIZ[0][0] * MATRIZ[1][1] - MATRIZ[0][1] * MATRIZ[1][0];   // L²/4: nunca zero
const INVERSA = [[MATRIZ[1][1], -MATRIZ[0][1]], [-MATRIZ[1][0], MATRIZ[0][0]]].map(function (linha) {   // [[a, b], [c, d]]⁻¹ = 1/det · [[d, −b], [−c, a]]
    return linha.map(function (numero) { return numero / DETERMINANTE; });
});
const ORIGEM = { x: TAMANHO * LARGURA_DO_BLOCO / 2 + 12, y: 12 };    // onde cai o canto (0, 0), com 12 px de margem
let rotacao = 0;                                // giros de 90° da vista (0 a 3)

function girarPonto(x, y, vezes) {              // cada giro de 90°: (x, y) → (TAMANHO − y, x)
    let ponto = { x: x, y: y };
    for (let giro = 0; giro < vezes; giro++) ponto = { x: TAMANHO - ponto.y, y: ponto.x };
    return ponto;
}

function projetar(u, v) {                       // a matriz em ação
    return { x: ORIGEM.x + MATRIZ[0][0] * u + MATRIZ[0][1] * v, y: ORIGEM.y + MATRIZ[1][0] * u + MATRIZ[1][1] * v };
}

function mundoParaTela(x, y) {
    const girado = girarPonto(x, y, rotacao);
    return projetar(girado.x, girado.y);
}

function telaParaMundo(sx, sy) {                // a inversa: devolve o ponto do chão
    const dx = sx - ORIGEM.x, dy = sy - ORIGEM.y;
    const girado = { x: INVERSA[0][0] * dx + INVERSA[0][1] * dy, y: INVERSA[1][0] * dx + INVERSA[1][1] * dy };
    return girarPonto(girado.x, girado.y, 4 - rotacao);     // 4 − r giros desfazem r giros
}

function cantosDoBloco(x, y) {                  // cima, direita, baixo, esquerda — na tela, em qualquer giro
    const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
    return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(function (canto) {
        return projetar(centro.x + canto[0], centro.y + canto[1]);
    });
}

function casaVizinha(x, y, dx, dy) {            // a vizinha na direção da TELA (dx, dy), em qualquer giro; null se cair fora do mapa
    const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
    const vizinha = girarPonto(centro.x + dx, centro.y + dy, 4 - rotacao);
    const casa = { x: Math.floor(vizinha.x), y: Math.floor(vizinha.y) };
    return casa.x >= 0 && casa.y >= 0 && casa.x < TAMANHO && casa.y < TAMANHO ? casa : null;
}
