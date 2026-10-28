/* DIQUE — PASSO 3: regras puras (sem canvas, sem DOM). Mundo → tela: [sx, sy] = origem + MATRIZ · [u, v] − (0, z · degrau); e o picking: tela → casa, com alturas. */
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
const ALTURA_MAXIMA = 4;                        // o bloco mais alto: o raio começa a descer daqui
const MARGEM_DO_PONTO_FLUTUANTE = 1e-9;         // pixel sobre uma linha da grade dá empate exato; o ponto flutuante erra na 15ª casa decimal
const NIVEL_DA_AGUA = 1;                        // a água cobre todo bloco mais baixo que isto (a maré dinâmica é do passo 5)
const MATRIZ = [[LARGURA_DO_BLOCO / 2, -LARGURA_DO_BLOCO / 2], [LARGURA_DO_BLOCO / 4, LARGURA_DO_BLOCO / 4]];
const DETERMINANTE = MATRIZ[0][0] * MATRIZ[1][1] - MATRIZ[0][1] * MATRIZ[1][0];   // L²/4: nunca zero
const INVERSA = [[MATRIZ[1][1], -MATRIZ[0][1]], [-MATRIZ[1][0], MATRIZ[0][0]]].map(function (linha) {   // [[a, b], [c, d]]⁻¹ = 1/det · [[d, −b], [−c, a]]
    return linha.map(function (numero) { return numero / DETERMINANTE; });
});
const ORIGEM = { x: TAMANHO * LARGURA_DO_BLOCO / 2 + 12, y: 4 * ALTURA_DO_DEGRAU + 12 };   // onde cai o canto (0, 0) no chão; sobra espaço para o bloco mais alto
let rotacao = 0;                                // giros de 90° da vista (0 a 3)
let listaDeDesenho = [];                        // as casas na ordem em que são pintadas: de trás para a frente

function verificarMapa() {                      // as duas camadas quadradas, só símbolos da legenda, mar em toda a borda, objetos só em terra
    const dimensoesCertas = [ALTURAS_EM_TEXTO, OBJETOS_EM_TEXTO].every(function (camada) {
        return camada.length === TAMANHO && camada.every(function (linha) { return linha.length === TAMANHO; });
    });
    const valido = dimensoesCertas && ALTURAS_EM_TEXTO.every(function (linha, y) {      // só com as dimensões certas se lê OBJETOS_EM_TEXTO[y][x]
        return linha.split("").every(function (simbolo, x) {
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

function alturaVisivel(altura) {                // a água cobre o que está abaixo do nível: o que se vê (e se marca) é a superfície dela
    return Math.max(altura, NIVEL_DA_AGUA);
}

function projetar(u, v, z) {                    // a matriz em ação; z sobe o ponto na tela
    return { x: ORIGEM.x + MATRIZ[0][0] * u + MATRIZ[0][1] * v, y: ORIGEM.y + MATRIZ[1][0] * u + MATRIZ[1][1] * v - (z || 0) * ALTURA_DO_DEGRAU };
}

function mundoParaTela(x, y, z) {
    const girado = girarPonto(x, y, rotacao);
    return projetar(girado.x, girado.y, z);
}

function telaParaGirado(sx, sy, z) {            // a inversa, sem desfazer o giro: o ponto do plano z sob o pixel, em (x', y')
    const dx = sx - ORIGEM.x, dy = sy - ORIGEM.y + z * ALTURA_DO_DEGRAU;
    return { x: INVERSA[0][0] * dx + INVERSA[0][1] * dy, y: INVERSA[1][0] * dx + INVERSA[1][1] * dy };
}

function telaParaMundo(sx, sy, z) {             // com z diz que ponto do plano z está sob o pixel; qual z usar, o picking responde
    const girado = telaParaGirado(sx, sy, z || 0);
    return girarPonto(girado.x, girado.y, 4 - rotacao);     // 4 − r giros desfazem r giros
}

function cantosDoBloco(x, y, z) {               // cima, direita, baixo, esquerda — na tela, em qualquer giro
    const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
    return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(function (canto) {
        return projetar(centro.x + canto[0], centro.y + canto[1], z);
    });
}

function casaDaTela(coluna, linha) {            // a casa do mapa que a coluna e a linha (x', y') da vista girada guardam
    const centro = girarPonto(coluna + 0.5, linha + 0.5, 4 - rotacao);
    return { x: Math.floor(centro.x), y: Math.floor(centro.y) };
}

function dentroDoMapa(coluna, linha) {
    return coluna >= 0 && linha >= 0 && coluna < TAMANHO && linha < TAMANHO;
}

function casaVizinha(x, y, dx, dy) {            // a vizinha na direção da TELA (dx, dy), em qualquer giro; null se cair fora do mapa
    const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
    const coluna = Math.floor(centro.x) + dx, linha = Math.floor(centro.y) + dy;
    return dentroDoMapa(coluna, linha) ? casaDaTela(coluna, linha) : null;
}

function montarListaDeDesenho() {               // algoritmo do pintor: x'+y' cresce para a frente
    const lista = [];                           // casas com a mesma soma nunca se sobrepõem na tela: a ordem entre elas não importa
    alturas.forEach(function (linha, y) {
        linha.forEach(function (altura, x) {
            const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
            lista.push({ x: x, y: y, altura: altura, proximidade: centro.x + centro.y });
        });
    });
    return lista.sort(function (a, b) { return a.proximidade - b.proximidade; });
}

function silhuetaCobre(casa, ponto) {           // a caixa da casa (o losango do chão varrido para cima até a altura) cobre este pixel?
    const chao = mundoParaTela(casa.x + 0.5, casa.y + 0.5, 0);
    const afastamento = Math.abs(ponto.x - chao.x);
    if (afastamento > LARGURA_DO_BLOCO / 2) return false;
    const meiaAltura = LARGURA_DO_BLOCO / 4 * (1 - afastamento / (LARGURA_DO_BLOCO / 2));    // meia altura do losango nesta coluna
    return ponto.y + casa.altura * ALTURA_DO_DEGRAU >= chao.y - meiaAltura && ponto.y <= chao.y + meiaAltura;
}

function quemEsconde(x, y) {                    // a casa pintada DEPOIS (mais à frente) que cobre o centro do topo de (x, y), ou undefined
    const topo = mundoParaTela(x + 0.5, y + 0.5, alturaVisivel(alturas[y][x]));
    const posicao = listaDeDesenho.findIndex(function (casa) { return casa.x === x && casa.y === y; });
    return listaDeDesenho.slice(posicao + 1).find(function (casa) { return silhuetaCobre(casa, topo); });
}

function acharVizinhaNoCanto(coluna, linha, z) {    // o raio passa exatamente pelo canto das quatro colunas: as duas laterais só o encostam, e o polígono fechado da força bruta as conta
    const encostadas = [[coluna - 1, linha, "direita"], [coluna, linha - 1, "esquerda"]].filter(function (vizinha) {
        return dentroDoMapa(vizinha[0], vizinha[1]);
    }).map(function (vizinha) {
        return { casa: casaDaTela(vizinha[0], vizinha[1]), face: vizinha[2] };
    }).sort(function (a, b) { return a.casa.y - b.casa.y || a.casa.x - b.casa.x; });      // empate entre as duas: vale a ordem do mapa, a mesma da força bruta
    const encostada = z < -MARGEM_DO_PONTO_FLUTUANTE ? null : encostadas.find(function (candidata) { return z <= alturaVisivel(alturas[candidata.casa.y][candidata.casa.x]) + MARGEM_DO_PONTO_FLUTUANTE; });
    if (!encostada) return null;
    const altura = alturaVisivel(alturas[encostada.casa.y][encostada.casa.x]);
    return z >= altura - MARGEM_DO_PONTO_FLUTUANTE ? { casa: encostada.casa, face: "topo", z: altura } : { casa: encostada.casa, face: encostada.face, z: z };     // na quina do topo, o polígono do topo vem primeiro
}

function acharCasaPeloRaio(sx, sy) {            // o raio do pixel desce pelas colunas, da frente para trás: o DDA do reflexo/03-um-raio, na diagonal
    const CASAS_POR_ALTURA = 2 * ALTURA_DO_DEGRAU / LARGURA_DO_BLOCO;    // quanto o raio anda em x' e em y' a cada unidade de z
    const entrada = telaParaGirado(sx, sy, ALTURA_MAXIMA);               // o ponto do raio no alto, onde ele entra
    let coluna = Math.floor(entrada.x), linha = Math.floor(entrada.y);
    let faltaX = entrada.x - coluna, faltaY = entrada.y - linha;         // quanto falta, andando para trás, até a próxima linha da grade
    let z = ALTURA_MAXIMA, face = "topo";
    const visitadas = [];
    while (coluna >= 0 && linha >= 0 && z >= 0) {                        // andar para trás até sair do mapa pelos fundos ou chegar ao chão fora dele
        const zDeSaida = z - Math.min(faltaX, faltaY) / CASAS_POR_ALTURA;
        if (dentroDoMapa(coluna, linha)) {
            const casa = casaDaTela(coluna, linha), altura = alturaVisivel(alturas[casa.y][casa.x]);
            visitadas.push(casa);
            if (z < altura - MARGEM_DO_PONTO_FLUTUANTE) return { x: casa.x, y: casa.y, face: face, z: z, visitadas: visitadas };               // entrou por baixo do topo: bateu na lateral
            if (zDeSaida <= altura + MARGEM_DO_PONTO_FLUTUANTE) return { x: casa.x, y: casa.y, face: "topo", z: altura, visitadas: visitadas };  // desceu até o topo dentro da coluna
        }
        if (Math.abs(faltaX - faltaY) < MARGEM_DO_PONTO_FLUTUANTE) {                    // cruzou x' e y' juntos: passa pelo canto, direto para a coluna da diagonal
            const encostada = acharVizinhaNoCanto(coluna, linha, zDeSaida);
            if (encostada) return { x: encostada.casa.x, y: encostada.casa.y, face: encostada.face, z: encostada.z, visitadas: visitadas.concat([encostada.casa]) };
            coluna--; linha--; faltaX = faltaY = 1; face = "esquerda";   // entra pela quina de baixo, onde a força bruta confere a lateral esquerda primeiro
        } else if (faltaX < faltaY) { coluna--; faltaY -= faltaX; faltaX = 1; face = "direita"; }   // cruzou uma linha de x': entra pela lateral direita
        else { linha--; faltaX -= faltaY; faltaY = 1; face = "esquerda"; }                          // cruzou uma linha de y': entra pela lateral esquerda
        z = zDeSaida;
    }
    return null;
}

function facesDaCasa(x, y) {                    // os três polígonos que desenharCaixa pinta para a casa
    const topo = cantosDoBloco(x, y, alturaVisivel(alturas[y][x])), base = cantosDoBloco(x, y, 0);
    return { topo: topo, esquerda: [topo[3], topo[2], base[2], base[3]], direita: [topo[2], topo[1], base[1], base[2]] };
}

function poligonoContem(poligono, ponto) {      // convexo: o ponto fica do mesmo lado de todas as arestas
    const lados = poligono.map(function (canto, i) {
        const proximo = poligono[(i + 1) % poligono.length];
        return (proximo.x - canto.x) * (ponto.y - canto.y) - (proximo.y - canto.y) * (ponto.x - canto.x);
    });
    return lados.every(function (lado) { return lado >= 0; }) || lados.every(function (lado) { return lado <= 0; });
}

function acharCasaPorForcaBruta(sx, sy) {       // a referência: o polígono de cada casa, da mais próxima à mais longe; o primeiro que contém o pixel vence
    const maisProximasPrimeiro = listaDeDesenho.slice().sort(function (a, b) { return b.proximidade - a.proximidade; });     // sort estável: no empate vale a ordem do mapa
    for (let i = 0; i < maisProximasPrimeiro.length; i++) {
        const casa = maisProximasPrimeiro[i], faces = facesDaCasa(casa.x, casa.y);
        const face = Object.keys(faces).find(function (nome) { return poligonoContem(faces[nome], { x: sx, y: sy }); });
        if (face) return { x: casa.x, y: casa.y, face: face };
    }
    return null;
}

const MAPA_VALIDO = verificarMapa();            // valida antes de montar a lista: um mapa torto não chega ao desenho
if (MAPA_VALIDO) listaDeDesenho = montarListaDeDesenho();
