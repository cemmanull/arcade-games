/* DIQUE — PASSO 5: regras puras (sem canvas, sem DOM). O terreno é imutável (moldar devolve outro); a enchente é busca em largura por altura, com volume. */
const ALTURAS_EM_TEXTO = [      // dígito = blocos empilhados (0 a 4); ~ = mar
    "~~~~~~~~~~",
    "~~222222~~",
    "~24333322~",
    "~23111132~",
    "~23101111~",
    "~23111132~",
    "~22313322~",
    "~~221222~~",
    "~~~~1~~~~~",
    "~~~~~~~~~~",
];
const OBJETOS_EM_TEXTO = [      // C = casa, P = cais, . = nada
    "..........",
    "..........",
    "..........",
    "...C......",
    ".P........",
    "...C.C....",
    "..........",
    "..........",
    "..........",
    "..........",
];
const TAMANHO = ALTURAS_EM_TEXTO.length;
const ALTURAS_INICIAIS = ALTURAS_EM_TEXTO.map(function (linha) {
    return linha.split("").map(function (simbolo) { return simbolo === "~" ? 0 : Number(simbolo); });
});
let alturas = ALTURAS_INICIAIS;                 // o terreno de agora: nunca se muda uma casa, troca-se por outro terreno (estado.alturas)
const LARGURA_DO_BLOCO = 36;                    // L: o losango tem L de largura e L/2 de altura
const ALTURA_DO_DEGRAU = 12;                    // pixels que um degrau de altura sobe na tela
const ALTURA_MAXIMA = 4;                        // o bloco mais alto: o raio começa a descer daqui
const MARGEM_DO_PONTO_FLUTUANTE = 1e-9;         // pixel sobre uma linha da grade dá empate exato; o ponto flutuante erra na 15ª casa decimal
const NIVEL_DA_BAIXA_MAR = 1;                  // antes da maré, a água cobre o que é mais baixo que isto e está ligado ao mar
const NIVEL_DA_MARE = 2;                        // a maré alcança toda casa mais baixa que isto
const VOLUME_DA_MARE = 17;                      // quantas casas (fora o mar) a água tem para encher
const BLOCOS_INICIAIS = 1;                      // o estoque: erguer gasta um, cavar devolve um
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
let agua = { nivel: NIVEL_DA_BAIXA_MAR, alagado: [] };      // o que a água cobre agora (matriz de booleanos) e a altura da superfície dela

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

function alturaVisivel(x, y) {                  // onde a água cobre a casa, o que se vê (e se marca) é a superfície dela; senão, o topo do terreno
    return agua.alagado[y][x] ? Math.max(alturas[y][x], agua.nivel) : alturas[y][x];
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

function silhuetaCobre(casa, ponto) {           // a caixa da casa (o losango do chão varrido para cima até a altura) cobre este pixel? Encostar na borda não é cobrir
    const chao = mundoParaTela(casa.x + 0.5, casa.y + 0.5, 0);
    const afastamento = Math.abs(ponto.x - chao.x);
    if (afastamento >= LARGURA_DO_BLOCO / 2) return false;
    const meiaAltura = LARGURA_DO_BLOCO / 4 * (1 - afastamento / (LARGURA_DO_BLOCO / 2));    // meia altura do losango nesta coluna
    return ponto.y + casa.altura * ALTURA_DO_DEGRAU > chao.y - meiaAltura && ponto.y < chao.y + meiaAltura;
}

function quemEsconde(x, y) {                    // a casa pintada DEPOIS (mais à frente) que cobre o centro do topo de (x, y), ou undefined
    const topo = mundoParaTela(x + 0.5, y + 0.5, alturaVisivel(x, y));
    const posicao = listaDeDesenho.findIndex(function (casa) { return casa.x === x && casa.y === y; });
    return listaDeDesenho.slice(posicao + 1).find(function (casa) { return silhuetaCobre(casa, topo); });
}

function acharVizinhaNoCanto(coluna, linha, z) {    // o raio passa exatamente pelo canto das quatro colunas: as duas laterais só o encostam, e o polígono fechado da força bruta as conta
    const encostadas = [[coluna - 1, linha, "direita"], [coluna, linha - 1, "esquerda"]].filter(function (vizinha) {
        return dentroDoMapa(vizinha[0], vizinha[1]);
    }).map(function (vizinha) {
        return { casa: casaDaTela(vizinha[0], vizinha[1]), face: vizinha[2] };
    }).sort(function (a, b) { return a.casa.y - b.casa.y || a.casa.x - b.casa.x; });      // empate entre as duas: vale a ordem do mapa, a mesma da força bruta
    const encostada = z < -MARGEM_DO_PONTO_FLUTUANTE ? null : encostadas.find(function (candidata) { return z <= alturaVisivel(candidata.casa.x, candidata.casa.y) + MARGEM_DO_PONTO_FLUTUANTE; });
    if (!encostada) return null;
    const altura = alturaVisivel(encostada.casa.x, encostada.casa.y);
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

function acharCasaPorForcaBruta(sx, sy) {       // a referência: o polígono de cada casa, da mais próxima à mais longe; o primeiro que contém o pixel vence
    const maisProximasPrimeiro = listaDeDesenho.slice().sort(function (a, b) { return b.proximidade - a.proximidade; });     // sort estável: no empate vale a ordem do mapa
    for (let i = 0; i < maisProximasPrimeiro.length; i++) {
        const casa = maisProximasPrimeiro[i], faces = facesDaCasa(casa.x, casa.y);
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
    return listaDeDesenho.filter(function (casa) { return OBJETOS_EM_TEXTO[casa.y][casa.x] === "C" && quemEsconde(casa.x, casa.y); });
}

function todasAsCasas() {                       // as casas do mapa em ordem de índice (y · TAMANHO + x)
    return ALTURAS_EM_TEXTO.reduce(function (casas, linha, y) {
        return casas.concat(linha.split("").map(function (simbolo, x) { return { x: x, y: y }; }));
    }, []);
}

function criarMatriz(valor) {                   // uma matriz do tamanho do mapa, toda de `valor`
    return ALTURAS_EM_TEXTO.map(function (linha) { return linha.split("").map(function () { return valor; }); });
}

function vizinhasDe(x, y) {                     // as casas coladas nas 4 direções que existem no mapa
    return VIZINHAS.map(function (passo) { return { x: x + passo[0], y: y + passo[1] }; }).filter(function (casa) { return dentroDoMapa(casa.x, casa.y); });
}

const CASAS_DO_MAR = todasAsCasas().filter(function (casa) { return ALTURAS_EM_TEXTO[casa.y][casa.x] === "~"; });    // as fontes da água: nunca mudam
const CASAS_COM_CASA = todasAsCasas().filter(function (casa) { return OBJETOS_EM_TEXTO[casa.y][casa.x] === "C"; });

function buscaEmLargura(terreno, nivel, fontes) {   // o campo de distância (eco do pacman/04-fantasma): passos do mar até cada casa que a água alcança; -1 onde não chega
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
    return todasAsCasas().filter(function (casa) {
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
    const perdidas = CASAS_COM_CASA.filter(function (casa) { return alagado[casa.y][casa.x]; }).length;
    return { total: CASAS_COM_CASA.length, perdidas: perdidas, salvas: CASAS_COM_CASA.length - perdidas };
}

function estadoInicial() {                      // o estado é só terreno e estoque: nunca é alterado, cada jogada devolve outro (eco do xadrez/05-xeque)
    return { alturas: ALTURAS_INICIAIS, blocos: BLOCOS_INICIAIS };
}

function motivoDaRecusa(estado, ferramenta, x, y) {     // "" quando a jogada vale; senão, o porquê, em texto
    const altura = estado.alturas[y][x];
    if (ALTURAS_EM_TEXTO[y][x] === "~") return "o mar não se molda";
    if (OBJETOS_EM_TEXTO[y][x] !== ".") return "a casa e o cais ficam como estão";
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

function definirAgua(nivel, casas) {            // a água de agora: a superfície em `nivel`, cobrindo a lista de casas
    agua = { nivel: nivel, alagado: criarMatriz(false) };
    casas.forEach(function (casa) { agua.alagado[casa.y][casa.x] = true; });
}

const MAPA_VALIDO = verificarMapa();            // valida antes de montar a lista: um mapa torto não chega ao desenho
definirAgua(NIVEL_DA_BAIXA_MAR, buscaEmLargura(alturas, NIVEL_DA_BAIXA_MAR, CASAS_DO_MAR).ordem);      // maré baixa: só o mar e o que está ligado a ele
if (MAPA_VALIDO) listaDeDesenho = montarListaDeDesenho();
limitarCamera();                                // começa com o mapa centrado
