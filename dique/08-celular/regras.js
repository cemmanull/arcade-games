/* DIQUE — PASSO 8: regras puras (sem canvas, sem DOM), as mesmas do passo 7. Os dias são dados (DIAS); carregarDia põe um deles nas variáveis que as regras leem; o robô (certificarDia) prova por busca que o dia tem solução e roda na página de teste, nunca no jogo. */
const TAMANHO = 10;                             // toda ilha é 10×10
// Os dias são DADOS (eco do tetris/08-velocidade): { mapa, tabua, meta, par, dica }. Cada linha do mapa é [alturas, objetos] (~ mar, 0 a 4 degraus; C casa, P cais ou muro, que não se molda, N nascente, . nada). `par` = a menor quantidade de jogadas (erguer ou cavar) que vence o dia, e quem o confere é o robô.
const DIAS = [
    {   // 1 · Tape a brecha (erguer)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~222222~~", ".........."],
            ["~~211112~~", "...C......"],
            ["~~211112~~", "....CC...."],
            ["~~211112~~", ".........."],
            ["~~212222~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 2, volume: 8, chuva: false, blocos: 1 }],
        meta: 3, par: 1, dica: "A água entra pela brecha. Um bloco a fecha.",
    },
    {   // 2 · Duas brechas (mais blocos)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~22222222~", ".........."],
            ["~21111112~", "...C......"],
            ["~11111112~", "......C..."],
            ["~21111112~", "....C....."],
            ["~22221222~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 2, volume: 8, chuva: false, blocos: 2 }],
        meta: 3, par: 2, dica: "Duas brechas, dois blocos: feche as duas.",
    },
    {   // 3 · Terra não se cria (cavar para erguer)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~333333~~", ".........."],
            ["~~311113~~", "...C......"],
            ["~~314413~~", ".........."],
            ["~~311113~~", "......C..."],
            ["~~333233~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 3, passos: 2, volume: 8, chuva: false, blocos: 0 }],
        meta: 2, par: 2, dica: "Terra não se cria: cave onde ela não faz falta.",
    },
    {   // 4 · A torre esconde a ilha (girar a vista)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~222222~~", ".........."],
            ["~~111112~~", "......C..."],
            ["~~241112~~", ".........."],
            ["~~211112~~", "...C......"],
            ["~~211112~~", "....C....."],
            ["~~222122~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 2, volume: 8, chuva: false, blocos: 1 }],
        meta: 3, par: 3, dica: "O bloco alto esconde parte da ilha: gire a vista (Q ou R).",
    },
    {   // 5 · Duas marés (o estoque passa de uma para outra)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~22222212~", ".........."],
            ["~21112112~", ".........."],
            ["~21112112~", "...C...C.."],
            ["~21112112~", "....C.C..."],
            ["~21112112~", ".........."],
            ["~22122222~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 1, volume: 3, chuva: false, blocos: 1 }, { nivel: 2, passos: 3, volume: 10, chuva: false, blocos: 1 }],
        meta: 4, par: 2, dica: "A primeira maré é fraca. Leia a tábua inteira antes de gastar.",
    },
    {   // 6 · Uma brecha larga (três blocos em duas fichas)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~22222~~~", "..PPPPP..."],
            ["~~21112~~~", "..PC..P..."],
            ["~~21112~~~", "..P..CP..."],
            ["~~21112~~~", "..P.C.P..."],
            ["~~21112~~~", "..PC..P..."],
            ["~~21112~~~", "..P...P..."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 1, volume: 3, chuva: false, blocos: 2 }, { nivel: 2, passos: 3, volume: 10, chuva: false, blocos: 1 }],
        meta: 4, par: 3, dica: "A brecha pede três blocos, e eles chegam em duas fichas.",
    },
    {   // 7 · Sizígia (a água sobe a 3)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~33333333~", ".........."],
            ["~32222223~", "...C..C..."],
            ["~32144123~", "...C......"],
            ["~32222222~", ".........."],
            ["~32222223~", "....C....."],
            ["~33233333~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 3, passos: 2, volume: 8, chuva: false, blocos: 1 }],
        meta: 4, par: 3, dica: "Sizígia: a água sobe a 3. O muro de 3 só falha onde está mais baixo.",
    },
    {   // 8 · Sizígia na segunda maré (o que bastou não basta)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~33333~~~", "..PPPPP..."],
            ["~~31113~~~", "..PC..P..."],
            ["~~11113~~~", "......P..."],
            ["~~31113~~~", "..P..CP..."],
            ["~~31113~~~", "..P.C.P..."],
            ["~~33133~~~", "..PP.PP..."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 3, volume: 5, chuva: false, blocos: 2 }, { nivel: 3, passos: 3, volume: 5, chuva: false, blocos: 2 }],
        meta: 3, par: 4, dica: "A segunda maré sobe um degrau: o que bastou na primeira não basta.",
    },
    {   // 9 · Chuva (a nascente alaga as covas)
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~22222222~", ".........."],
            ["~21011112~", "...N......"],
            ["~21011112~", "......C..."],
            ["~21011112~", "...C......"],
            ["~21111312~", "....C....."],
            ["~22221222~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 2, volume: 3, chuva: true, blocos: 1 }],
        meta: 3, par: 3, dica: "A chuva acorda a nascente: separe-a da casa com um bloco.",
    },
    {   // 10 · Tudo junto
        mapa: [
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
            ["~~33333~~~", "..PPPPP..."],
            ["~~31013~~~", "..PCN.P..."],
            ["~~31013~~~", "..P..CP..."],
            ["~~11013~~~", "....C.P..."],
            ["~~34113~~~", "..P..CP..."],
            ["~~33233~~~", "..PP.PP..."],
            ["~~~~~~~~~~", ".........."],
            ["~~~~~~~~~~", ".........."],
        ],
        tabua: [{ nivel: 2, passos: 3, volume: 5, chuva: false, blocos: 2 }, { nivel: 3, passos: 3, volume: 4, chuva: true, blocos: 1 }],
        meta: 4, par: 5, dica: "Tudo junto: duas marés, sizígia, chuva e uma torre que esconde a brecha.",
    },
];
let diaCarregado = null;                        // o dia que as variáveis abaixo guardam
let alturasEmTexto, objetosEmTexto;             // as duas camadas do mapa do dia: alturas (~ = mar, 0 a 4) e objetos (C casa, P cais, N nascente, . nada)
let alturasIniciais, casasDoMar, casasComCasa, casasDeNascente, tabuaDeMares, metaDoDia;     // derivados do dia por carregarDia
let alturas;                                    // o terreno de agora: nunca se muda uma casa, troca-se por outro terreno (estado.alturas)
const LARGURA_DO_BLOCO = 36;                    // L: o losango tem L de largura e L/2 de altura
const ALTURA_DO_DEGRAU = 12;                    // pixels que um degrau de altura sobe na tela
const ALTURA_MAXIMA = 4;                        // o bloco mais alto: o raio começa a descer daqui
const MARGEM_DO_PONTO_FLUTUANTE = 1e-9;         // pixel sobre uma linha da grade dá empate exato; o ponto flutuante erra na 15ª casa decimal
const NIVEL_DA_BAIXA_MAR = 1;                   // antes da maré, a água cobre o que é mais baixo que isto e está ligado ao mar
const BLOCOS_INICIAIS = 0;                      // o estoque começa vazio: os blocos chegam com as fichas
const BONUS_DA_CHUVA = 2;                       // com chuva, cada passo enche duas casas a mais
const NIVEL_DA_NASCENTE = 1;                    // a água de uma nascente só cobre o que é mais baixo que isto
const TRANSICOES = {                            // as máquinas de estados (eco do pacman/06-modos): de cada fase, para quais se pode ir
    dia: { ler: ["moldar"], moldar: ["mare"], mare: ["contar"], contar: ["ler", "fim"], fim: [] },
    mare: { baixa: ["enchente"], enchente: ["preamar"], preamar: ["vazante"], vazante: ["baixa"] },
};
const FERRAMENTAS = { erguer: 1, cavar: -1 };   // quanto cada ferramenta soma à altura
const VIZINHAS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const MATRIZ = [[LARGURA_DO_BLOCO / 2, -LARGURA_DO_BLOCO / 2], [LARGURA_DO_BLOCO / 4, LARGURA_DO_BLOCO / 4]];
const DETERMINANTE = MATRIZ[0][0] * MATRIZ[1][1] - MATRIZ[0][1] * MATRIZ[1][0];   // L²/4: nunca zero
const INVERSA = [[MATRIZ[1][1], -MATRIZ[0][1]], [-MATRIZ[1][0], MATRIZ[0][0]]].map(function (linha) {   // [[a, b], [c, d]]⁻¹ = 1/det · [[d, −b], [−c, a]]
    return linha.map(function (numero) { return numero / DETERMINANTE; });
});
const ORIGEM = { x: TAMANHO * LARGURA_DO_BLOCO / 2 + 12, y: 4 * ALTURA_DO_DEGRAU + 12 };   // onde cai o canto (0, 0) no chão; sobra espaço para o bloco mais alto
const LARGURA_DO_MAPA = TAMANHO * LARGURA_DO_BLOCO + 24;                 // a ilha inteira em pixels do mapa (zoom 1): ela e 12 px de margem de cada lado
const ALTURA_DO_MAPA = ORIGEM.y + TAMANHO * LARGURA_DO_BLOCO / 2 + 12;   // o espaço do bloco mais alto, a ilha e a margem de baixo
const LARGURA_DA_VISTA = 384, ALTURA_DA_VISTA = 252;                     // a janela (o canvas): menor que a ilha quando se aproxima
const ZOOMS = [1, 1.5, 2];                                               // "Longe", meio e "Perto"
const camera = { zoom: 1, desvioX: 0, desvioY: 0 };                      // janela = mapa × zoom + desvio
let rotacao = 0;                                // giros de 90° da vista (0 a 3)
let listaDeDesenho = [];                        // as casas na ordem em que são pintadas: de trás para a frente
let agua = { nivel: NIVEL_DA_BAIXA_MAR, alagado: [], niveis: [] };      // o que a água cobre agora: o nível da ficha, as casas (matriz de booleanos) e a superfície de cada casa (matriz; 0 onde está seco)

function problemasDoMapa(dia) {                 // o que impede o dia de valer, em texto; lista vazia = dia bom: duas camadas 10×10, só símbolos da legenda, mar em toda a borda, objetos só em terra, nascente só com chuva, meta entre 1 e o número de casas
    const camadas = Array.isArray(dia.mapa) && dia.mapa.length === TAMANHO && dia.mapa.every(function (linha) {
        return linha.length === 2 && linha.every(function (camada) { return typeof camada === "string" && camada.length === TAMANHO; });
    });
    if (!camadas || !Array.isArray(dia.tabua) || dia.tabua.length === 0) return ["o mapa precisa de " + TAMANHO + " linhas [alturas, objetos] de " + TAMANHO + " símbolos e a tábua de ao menos uma ficha"];
    const problemas = [];
    dia.mapa.forEach(function (linha, y) {
        linha[0].split("").forEach(function (simbolo, x) {
            const objeto = linha[1][x], naBorda = x === 0 || y === 0 || x === TAMANHO - 1 || y === TAMANHO - 1;
            if (!/[~0-4]/.test(simbolo) || !/[CPN.]/.test(objeto)) problemas.push("símbolo inválido em " + x + ", " + y);
            else if (simbolo === "~" && objeto !== ".") problemas.push("objeto no mar em " + x + ", " + y);
            else if (naBorda && simbolo !== "~") problemas.push("a borda precisa ser mar em " + x + ", " + y);
            else if (objeto === "N" && !dia.tabua.some(function (ficha) { return ficha.chuva; })) problemas.push("nascente sem chuva em " + x + ", " + y);
        });
    });
    const casas = dia.mapa.reduce(function (soma, linha) { return soma + linha[1].split("C").length - 1; }, 0);
    if (!(dia.meta >= 1 && dia.meta <= casas)) problemas.push("a meta precisa estar entre 1 e " + casas + " casas");
    return problemas;
}

function carregarDia(dia) {                     // põe o dia nas variáveis que as regras leem; devolve se ele vale (senão, nada muda)
    const problemas = problemasDoMapa(dia);
    if (problemas.length > 0) {
        console.error("Dia inválido: " + problemas.join("; "));
        return false;
    }
    diaCarregado = dia;
    alturasEmTexto = dia.mapa.map(function (linha) { return linha[0]; });
    objetosEmTexto = dia.mapa.map(function (linha) { return linha[1]; });
    alturasIniciais = alturasEmTexto.map(function (linha) {
        return linha.split("").map(function (simbolo) { return simbolo === "~" ? 0 : Number(simbolo); });
    });
    alturas = alturasIniciais;
    casasDoMar = TODAS_AS_CASAS.filter(function (casa) { return alturasEmTexto[casa.y][casa.x] === "~"; });    // as fontes da água: nunca mudam no dia
    casasComCasa = TODAS_AS_CASAS.filter(function (casa) { return objetosEmTexto[casa.y][casa.x] === "C"; });
    casasDeNascente = TODAS_AS_CASAS.filter(function (casa) { return objetosEmTexto[casa.y][casa.x] === "N"; });
    tabuaDeMares = dia.tabua;
    metaDoDia = dia.meta;
    return true;
}

function girarPonto(x, y, vezes) {              // cada giro de 90°: (x, y) → (TAMANHO − y, x)
    let ponto = { x: x, y: y };
    for (let giro = 0; giro < vezes; giro++) ponto = { x: TAMANHO - ponto.y, y: ponto.x };
    return ponto;
}

function alturaVisivel(x, y) {                  // onde a água cobre a casa, o que se vê (e se marca) é a superfície dela (a do mar e a da nascente podem diferir); senão, o topo do terreno
    return Math.max(alturas[y][x], agua.niveis[y][x]);
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

const TODAS_AS_CASAS = Array.from({ length: TAMANHO * TAMANHO }, function (ignorado, indice) {      // as casas do mapa em ordem de índice (y · TAMANHO + x), as mesmas em todo dia
    return { x: indice % TAMANHO, y: Math.floor(indice / TAMANHO) };
});

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

function silhuetaCobre(casa, ponto) {           // a caixa da casa (o losango do chão varrido para cima até a altura) cobre este pixel? Encostar na borda não é cobrir
    const chao = mundoParaTela(casa.x + 0.5, casa.y + 0.5, 0);
    const afastamento = Math.abs(ponto.x - chao.x);
    if (afastamento >= LARGURA_DO_BLOCO / 2) return false;
    const meiaAltura = LARGURA_DO_BLOCO / 4 * (1 - afastamento / (LARGURA_DO_BLOCO / 2));    // meia altura do losango nesta coluna
    return ponto.y + casa.altura * ALTURA_DO_DEGRAU > chao.y - meiaAltura && ponto.y < chao.y + meiaAltura;
}

function quemEsconde(x, y) {                    // a casa pintada DEPOIS (mais à frente) que cobre o centro do topo de (x, y), ou undefined
    const topo = mundoParaTela(x + 0.5, y + 0.5, alturaVisivel(x, y));
    return listaDeDesenho.slice(posicaoNoPintor({ x: x, y: y }) + 1).find(function (casa) { return silhuetaCobre(casa, topo); });
}

function posicaoNoPintor(casa) {               // o índice da casa na lista do pintor: quanto maior, mais tarde é pintada
    return listaDeDesenho.findIndex(function (pintada) { return pintada.x === casa.x && pintada.y === casa.y; });
}

function acharVizinhaNoCanto(coluna, linha, z) {    // o raio passa exatamente pelo canto das quatro colunas: as duas laterais só o encostam, e o polígono fechado da força bruta as conta
    const encostadas = [[coluna - 1, linha, "direita"], [coluna, linha - 1, "esquerda"]].filter(function (vizinha) {
        return dentroDoMapa(vizinha[0], vizinha[1]);
    }).map(function (vizinha) {
        return { casa: casaDaTela(vizinha[0], vizinha[1]), face: vizinha[2] };
    }).sort(function (a, b) { return posicaoNoPintor(b.casa) - posicaoNoPintor(a.casa); });      // empate entre as duas: vence a pintada por último, a mesma que a força bruta acha lendo a lista de trás para a frente
    const encostada = z < -MARGEM_DO_PONTO_FLUTUANTE ? null : encostadas.find(function (candidata) { return z <= alturaVisivel(candidata.casa.x, candidata.casa.y) + MARGEM_DO_PONTO_FLUTUANTE; });
    if (!encostada) return null;
    const altura = alturaVisivel(encostada.casa.x, encostada.casa.y);
    return z >= altura - MARGEM_DO_PONTO_FLUTUANTE ? { casa: encostada.casa, face: "topo", z: altura } : { casa: encostada.casa, face: encostada.face, z: z };     // na quina do topo, o polígono do topo vem primeiro
}

function acharCasaPeloRaio(sx, sy) {            // o raio do pixel desce pelas colunas, da frente para trás: o DDA do reflexo/03-um-raio, na diagonal
    const CASAS_POR_ALTURA = 2 * ALTURA_DO_DEGRAU / LARGURA_DO_BLOCO;    // quanto o raio anda em x' e em y' a cada unidade de z
    const entrada = telaParaGirado(sx, sy, ALTURA_MAXIMA);               // o ponto do raio no alto, onde ele entra
    let coluna = Math.floor(entrada.x + MARGEM_DO_PONTO_FLUTUANTE), linha = Math.floor(entrada.y + MARGEM_DO_PONTO_FLUTUANTE);   // 6,99999999… é a linha 7: o pixel sobre a grade fica na casa da frente, com zero a andar
    let faltaX = Math.max(0, entrada.x - coluna), faltaY = Math.max(0, entrada.y - linha);        // quanto falta, andando para trás, até a próxima linha da grade
    let z = ALTURA_MAXIMA, face = "topo";
    const visitadas = [];
    while (coluna >= 0 && linha >= 0 && z >= 0) {                        // andar para trás até sair do mapa pelos fundos ou chegar ao chão fora dele
        const zDeSaida = z - Math.min(faltaX, faltaY) / CASAS_POR_ALTURA;
        if (dentroDoMapa(coluna, linha)) {
            const casa = casaDaTela(coluna, linha), altura = alturaVisivel(casa.x, casa.y);
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

function facesDaCasa(x, y) {                    // os polígonos que desenharCaixa pinta para a casa: o topo e, se a casa tem altura, as duas laterais
    const topo = cantosDoBloco(x, y, alturaVisivel(x, y)), base = cantosDoBloco(x, y, 0);
    if (alturaVisivel(x, y) === 0) return { topo: topo };      // cova seca: laterais sem área (quatro pontos numa reta) conteriam todo pixel dessa reta
    return { topo: topo, esquerda: [topo[3], topo[2], base[2], base[3]], direita: [topo[2], topo[1], base[1], base[2]] };
}

function poligonoContem(poligono, ponto) {      // convexo: o ponto fica do mesmo lado de todas as arestas
    const lados = poligono.map(function (canto, i) {
        const proximo = poligono[(i + 1) % poligono.length];
        return (proximo.x - canto.x) * (ponto.y - canto.y) - (proximo.y - canto.y) * (ponto.x - canto.x);
    });
    return lados.every(function (lado) { return lado >= 0; }) || lados.every(function (lado) { return lado <= 0; });
}

function acharCasaPorForcaBruta(sx, sy) {       // a referência: a lista do pintor lida de trás para a frente; a última pintada que contém o pixel vence
    for (let i = listaDeDesenho.length - 1; i >= 0; i--) {         // a última pintada cobre as outras: no empate de uma aresta comum, ela vence
        const casa = listaDeDesenho[i], faces = facesDaCasa(casa.x, casa.y);
        const face = Object.keys(faces).find(function (nome) { return poligonoContem(faces[nome], { x: sx, y: sy }); });
        if (face) return { x: casa.x, y: casa.y, face: face };
    }
    return null;
}

function paraATela(ponto) {                     // do pixel do mapa (onde as regras trabalham) para o pixel da janela
    return { x: ponto.x * camera.zoom + camera.desvioX, y: ponto.y * camera.zoom + camera.desvioY };
}

function paraOMapa(pixel) {                     // a inversa da câmera: do pixel da janela para o pixel do mapa
    return { x: (pixel.x - camera.desvioX) / camera.zoom, y: (pixel.y - camera.desvioY) / camera.zoom };
}

function limitarCamera() {                      // o mapa nunca sai da janela: se é maior, rola até a borda; se é menor, fica no centro
    [["desvioX", LARGURA_DO_MAPA, LARGURA_DA_VISTA], ["desvioY", ALTURA_DO_MAPA, ALTURA_DA_VISTA]].forEach(function (eixo) {
        const sobra = eixo[2] - eixo[1] * camera.zoom;      // negativo: o mapa é maior que a janela
        camera[eixo[0]] = sobra >= 0 ? sobra / 2 : Math.min(0, Math.max(sobra, camera[eixo[0]]));
    });
}

function rolar(dx, dy) {                        // dx e dy em pixels da janela
    camera.desvioX += dx;
    camera.desvioY += dy;
    limitarCamera();
}

function aproximar(passo, foco) {               // passo +1 ou −1; o ponto do mapa sob o foco (um pixel da janela) continua sob ele
    const nivel = Math.max(0, Math.min(ZOOMS.length - 1, ZOOMS.indexOf(camera.zoom) + passo));
    const sobOFoco = paraOMapa(foco);
    camera.zoom = ZOOMS[nivel];
    camera.desvioX = foco.x - sobOFoco.x * camera.zoom;
    camera.desvioY = foco.y - sobOFoco.y * camera.zoom;
    limitarCamera();
}

function casaSobOPixel(pixel) {                 // o picking de uma tela com câmera: desfaz a câmera e desce o raio
    const ponto = paraOMapa(pixel);
    return acharCasaPeloRaio(ponto.x, ponto.y);
}

function casasEscondidas() {                    // as casas (C) que algum bloco à frente cobre, na vista de agora
    return listaDeDesenho.filter(function (casa) { return objetosEmTexto[casa.y][casa.x] === "C" && quemEsconde(casa.x, casa.y); });
}

function criarMatriz(valor) {                   // uma matriz do tamanho do mapa, toda de `valor`
    return Array.from({ length: TAMANHO }, function () { return new Array(TAMANHO).fill(valor); });
}

const VIZINHAS_DO_MAPA = TODAS_AS_CASAS.map(function (casa) {      // calculadas uma vez: a busca pergunta as vizinhas de cada casa milhares de vezes
    return VIZINHAS.map(function (passo) { return { x: casa.x + passo[0], y: casa.y + passo[1] }; }).filter(function (vizinha) { return dentroDoMapa(vizinha.x, vizinha.y); });
});

function vizinhasDe(x, y) {                     // as casas coladas nas 4 direções que existem no mapa (a mesma lista a cada pergunta: não a altere)
    return VIZINHAS_DO_MAPA[y * TAMANHO + x];
}

function buscaEmLargura(terreno, nivel, fontes) {   // o campo de distância (eco do pacman/04-fantasma): passos das fontes até cada casa que a água alcança; -1 onde não chega
    const distancia = criarMatriz(-1), fila = [];
    fontes.forEach(function (fonte) {
        if (terreno[fonte.y][fonte.x] >= nivel) return;     // a fonte também só alaga se for mais baixa que o nível
        distancia[fonte.y][fonte.x] = 0;
        fila.push({ x: fonte.x, y: fonte.y, distancia: 0 });
    });
    for (let proxima = 0; proxima < fila.length; proxima++) {      // a fila cresce enquanto é lida: quem entra primeiro sai primeiro (eco do pacman/06-modos)
        const atual = fila[proxima];
        vizinhasDe(atual.x, atual.y).forEach(function (vizinha) {
            if (distancia[vizinha.y][vizinha.x] !== -1 || terreno[vizinha.y][vizinha.x] >= nivel) return;      // já molhada, ou alta demais
            distancia[vizinha.y][vizinha.x] = atual.distancia + 1;
            fila.push({ x: vizinha.x, y: vizinha.y, distancia: atual.distancia + 1 });
        });
    }
    return { distancia: distancia, ordem: fila };       // ordem: a fila inteira, das fontes às casas mais longe
}

function proximaDaFronteira(terreno, distancia, alagado) {      // a casa seca, colada na água e ao alcance, que o volume enche primeiro
    return TODAS_AS_CASAS.filter(function (casa) {
        return distancia[casa.y][casa.x] > 0 && !alagado[casa.y][casa.x] && vizinhasDe(casa.x, casa.y).some(function (vizinha) { return alagado[vizinha.y][vizinha.x]; });
    }).map(function (casa) {
        return { x: casa.x, y: casa.y, altura: terreno[casa.y][casa.x], distancia: distancia[casa.y][casa.x] };
    }).sort(function (a, b) {                   // a mais baixa; empate: a mais perto do mar; depois a de menor índice
        return a.altura - b.altura || a.distancia - b.distancia || (a.y * TAMANHO + a.x) - (b.y * TAMANHO + b.x);
    })[0];
}

function encherComVolume(terreno, nivel, fontes, volume) {      // cada unidade de volume enche UMA casa (o mar é de graça): a água enche a vala antes de subir o terraço
    const distancia = buscaEmLargura(terreno, nivel, fontes).distancia;
    const alagado = criarMatriz(false);
    const ordem = fontes.filter(function (fonte) { return distancia[fonte.y][fonte.x] === 0; }).map(function (fonte) {
        alagado[fonte.y][fonte.x] = true;
        return { x: fonte.x, y: fonte.y, altura: terreno[fonte.y][fonte.x], distancia: 0 };
    });
    let volumeRestante = volume;
    for (let proxima = proximaDaFronteira(terreno, distancia, alagado); proxima && volumeRestante > 0; proxima = proximaDaFronteira(terreno, distancia, alagado)) {
        alagado[proxima.y][proxima.x] = true;
        ordem.push(proxima);
        volumeRestante--;
    }
    return { ordem: ordem, alagado: alagado, volumeRestante: volumeRestante };
}

function contarCasas(alagado) {                 // casa cujo bloco alagou está perdida; a que não, salva
    const perdidas = casasComCasa.filter(function (casa) { return alagado[casa.y][casa.x]; }).length;
    return { total: casasComCasa.length, perdidas: perdidas, salvas: casasComCasa.length - perdidas };
}

function acumularPerdidas(perdidas, alagado) {  // a água só avança: uma casa alagada em qualquer maré do dia fica perdida; devolve uma matriz nova
    return perdidas.map(function (linha, y) { return linha.map(function (perdida, x) { return perdida || alagado[y][x]; }); });
}

function volumeDoPasso(ficha) {                 // quantas casas a água enche em cada passo: a chuva soma
    return ficha.volume + (ficha.chuva ? BONUS_DA_CHUVA : 0);
}

function aguaDaFicha(terreno, ficha, passos) {  // a água depois de `passos` passos: o mar enche com o volume (a conta do passo 5) e a chuva das nascentes alaga, sem volume, o que alcança no nível 1
    const mar = encherComVolume(terreno, ficha.nivel, casasDoMar, passos * volumeDoPasso(ficha));
    const nascentes = buscaEmLargura(terreno, NIVEL_DA_NASCENTE, ficha.chuva ? casasDeNascente : []).ordem.map(function (casa) {
        return { x: casa.x, y: casa.y, altura: terreno[casa.y][casa.x], distancia: casa.distancia, nivel: NIVEL_DA_NASCENTE };
    });
    const alagado = mar.alagado.map(function (linha) { return linha.slice(); });
    nascentes.forEach(function (casa) { alagado[casa.y][casa.x] = true; });
    return { ordem: mar.ordem, nascentes: nascentes, alagado: alagado, volumeRestante: mar.volumeRestante };      // as duas águas se juntam na hora de desenhar (definirAgua): a mais alta de cada casa vale
}

function transicaoValida(maquina, de, para) {   // só as transições da tabela valem
    return TRANSICOES[maquina][de].indexOf(para) !== -1;
}

function receberBlocos(estado, ficha) {         // os blocos da ficha chegam antes da maré; o que sobrou da maré anterior fica (devolve um estado novo)
    return { alturas: estado.alturas, blocos: estado.blocos + ficha.blocos };
}

function blocosNoMundo(estado) {                // a terra que existe: o que está empilhado no mapa mais o estoque; só as fichas a aumentam
    return estado.alturas.reduce(function (soma, linha) { return soma + linha.reduce(function (parcial, altura) { return parcial + altura; }, 0); }, estado.blocos);
}

function resultadoDoDia(contagem) {             // o dia passa se salvou a meta
    return contagem.salvas >= metaDoDia ? "vencido" : "perdido";
}

function estadoInicial() {                      // o estado é só terreno e estoque: nunca é alterado, cada jogada devolve outro (eco do xadrez/05-xeque)
    return { alturas: alturasIniciais, blocos: BLOCOS_INICIAIS };
}

function motivoDaRecusa(estado, ferramenta, x, y) {     // "" quando a jogada vale; senão, o porquê, em texto
    const altura = estado.alturas[y][x];
    if (alturasEmTexto[y][x] === "~") return "o mar não se molda";
    if (objetosEmTexto[y][x] !== ".") return "casa, cais e nascente ficam como estão";
    if (ferramenta === "erguer" && altura >= ALTURA_MAXIMA) return "já está na altura máxima";
    if (ferramenta === "erguer" && estado.blocos === 0) return "sem blocos no estoque";
    if (ferramenta === "cavar" && altura === 0) return "já está no fundo";
    return "";
}

function moldar(estado, ferramenta, x, y) {     // o estado novo, ou null se a jogada não vale; o estado de antes fica intacto, e desfazer é voltar a ele
    if (motivoDaRecusa(estado, ferramenta, x, y)) return null;
    const passo = FERRAMENTAS[ferramenta];
    const novoTerreno = estado.alturas.map(function (linha, linhaY) {
        return linhaY !== y ? linha : linha.map(function (altura, colunaX) { return colunaX === x ? altura + passo : altura; });     // as outras linhas são compartilhadas
    });
    return { alturas: novoTerreno, blocos: estado.blocos - passo };
}

function definirAgua(nivel, casas) {            // a água de agora: a superfície em `nivel` (ou no `nivel` da própria casa, se ela traz um) cobrindo a lista de casas; em cada casa vale o maior nível
    agua = { nivel: nivel, alagado: criarMatriz(false), niveis: criarMatriz(0) };
    casas.forEach(function (casa) {
        agua.alagado[casa.y][casa.x] = true;
        agua.niveis[casa.y][casa.x] = Math.max(agua.niveis[casa.y][casa.x], casa.nivel || nivel);
    });
}

// ---- O ROBÔ DE VALIDAÇÃO (eco do xenomorph/06-semente: tentou todas as combinações). Roda na página de teste, nunca no jogo ----
const TETO_DE_ESTADOS = 2000000;                // terrenos simulados; passou disto, o robô desiste e o dia não é certificado
const LIMITE_DE_JOGADAS = 6;                    // o robô procura soluções de 0 a este número de jogadas no dia inteiro (o `par` mais alto que um dia pode ter)
const ALCANCE_DAS_CANDIDATAS = 2;               // só se mexe em casa a até 2 passos (em linha reta, sem diagonal) de uma casa alagável ou de uma casa com casa: as outras não mudam o resultado

function candidatasDoDia() {                    // as casas onde erguer ou cavar pode mudar o resultado
    const nivelMaisAlto = Math.max.apply(null, tabuaDeMares.map(function (ficha) { return ficha.nivel; }));
    const interesses = buscaEmLargura(alturasIniciais, nivelMaisAlto, casasDoMar.concat(casasDeNascente)).ordem.concat(casasComCasa);
    return TODAS_AS_CASAS.filter(function (casa) {
        return alturasEmTexto[casa.y][casa.x] !== "~" && objetosEmTexto[casa.y][casa.x] === "." && interesses.some(function (interesse) {
            return Math.abs(interesse.x - casa.x) + Math.abs(interesse.y - casa.y) <= ALCANCE_DAS_CANDIDATAS;
        });
    });
}

function terrenoComMudancas(terreno, mudancas) {     // um terreno novo; as linhas que não mudam são compartilhadas
    return terreno.map(function (linha, y) {
        const daLinha = mudancas.filter(function (mudanca) { return mudanca.casa.y === y; });
        if (daLinha.length === 0) return linha;
        return linha.map(function (altura, x) {
            const mudanca = daLinha.find(function (candidata) { return candidata.casa.x === x; });
            return mudanca ? altura + mudanca.passo : altura;
        });
    });
}

function terrenosAte(estado, orcamento, candidatas, aoAchar) {   // todo terreno a até `orcamento` jogadas do estado, uma vez cada (a ordem das jogadas não importa, só o saldo de cada casa); aoAchar(terreno, custo, blocos) devolve true para parar
    const mudancas = [];
    function decidir(proxima, restante, blocos) {
        if (blocos + restante < 0) return false;            // mesmo cavando com tudo o que resta, o estoque não volta a zero
        if (proxima === candidatas.length) return blocos >= 0 && aoAchar(terrenoComMudancas(estado.alturas, mudancas), orcamento - restante, blocos);
        const casa = candidatas[proxima], altura = estado.alturas[casa.y][casa.x];
        for (let passo = -Math.min(restante, altura); passo <= Math.min(restante, ALTURA_MAXIMA - altura); passo++) {
            if (passo !== 0) mudancas.push({ casa: casa, passo: passo });
            const parou = decidir(proxima + 1, restante - Math.abs(passo), blocos - passo);
            if (passo !== 0) mudancas.pop();
            if (parou) return true;
        }
        return false;
    }
    return decidir(0, orcamento, estado.blocos);
}

function assinatura(matriz) {                   // o texto que identifica um terreno (ou as perdidas) na memória do robô
    return matriz.map(function (linha) { return linha.map(Number).join(""); }).join("");
}

function haPlano(limite, busca) {               // existe um jeito de vencer o dia com no máximo `limite` jogadas? Ficha a ficha, só seguem os terrenos que ainda salvam a meta
    const memoria = new Map();                  // terrenos já vistos: chave → menor gasto com que foram vistos; quem volta com gasto igual ou maior já falhou
    function tentarFicha(indice, estado, perdidas, gasto) {
        if (indice === tabuaDeMares.length) return contarCasas(perdidas).salvas >= metaDoDia;
        const ficha = tabuaDeMares[indice];
        return terrenosAte(receberBlocos(estado, ficha), limite - gasto, busca.candidatas, function (terreno, custo, blocos) {
            if (++busca.estados > busca.teto) { busca.estourou = true; return true; }
            const novasPerdidas = acumularPerdidas(perdidas, aguaDaFicha(terreno, ficha, ficha.passos).alagado);
            if (contarCasas(novasPerdidas).salvas < metaDoDia) return false;
            const chave = indice + ":" + blocos + ":" + assinatura(terreno) + ":" + assinatura(novasPerdidas);
            if (memoria.has(chave) && memoria.get(chave) <= gasto + custo) return false;
            memoria.set(chave, gasto + custo);
            return tentarFicha(indice + 1, { alturas: terreno, blocos: blocos }, novasPerdidas, gasto + custo);
        });
    }
    const achou = tentarFicha(0, estadoInicial(), criarMatriz(false), 0);
    return achou && !busca.estourou;
}

function certificarDia(dia, teto) {             // o relatório do robô sobre o dia: (a) tem solução, (b) o par é o menor achado, (c) não é trivial, (d) o mapa vale
    const problemas = problemasDoMapa(dia);
    const relatorio = { problemas: problemas, mapaValido: problemas.length === 0, temSolucao: false, parAchado: null, parConfere: false, naoTrivial: false, estados: 0, estourou: false, certificado: false };
    if (!relatorio.mapaValido) return relatorio;
    const anterior = diaCarregado;
    carregarDia(dia);
    const busca = { candidatas: candidatasDoDia(), estados: 0, teto: teto || TETO_DE_ESTADOS, estourou: false };
    for (let limite = 0; limite <= LIMITE_DE_JOGADAS && relatorio.parAchado === null && !busca.estourou; limite++) {
        if (haPlano(limite, busca)) relatorio.parAchado = limite;
        else if (limite === 0) relatorio.naoTrivial = true;
    }
    carregarDia(anterior);                      // o robô não deixa o dia dele carregado
    relatorio.estados = busca.estados;
    relatorio.estourou = busca.estourou;
    relatorio.temSolucao = relatorio.parAchado !== null;
    relatorio.parConfere = relatorio.parAchado === dia.par;
    relatorio.certificado = relatorio.temSolucao && relatorio.parConfere && relatorio.naoTrivial;
    return relatorio;
}

const MAPA_VALIDO = carregarDia(DIAS[0]);       // valida antes de montar a lista: um mapa torto não chega ao desenho
if (MAPA_VALIDO) {
    definirAgua(NIVEL_DA_BAIXA_MAR, buscaEmLargura(alturas, NIVEL_DA_BAIXA_MAR, casasDoMar).ordem);      // baixa-mar: só o mar e o que está ligado a ele
    listaDeDesenho = montarListaDeDesenho();
}
limitarCamera();                                // começa com o mapa centrado
