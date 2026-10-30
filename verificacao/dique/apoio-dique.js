/*
  APOIO DO DIQUE: o que as páginas dos passos 4 a 6 repartem.

  Carregue DEPOIS de ../apoio.js e ANTES dos scripts do jogo. Só declara funções e constantes de nome próprio: os nomes do jogo
  (alturas, agua, cantosDoBloco, avancarQuadro...) são lidos quando a função é CHAMADA, nunca ao carregar. Cada função usa o
  `conferir` do apoio.js.

  1. A conta de enchente do teste, escrita de outro jeito que a do jogo (ponto fixo sobre a grade inteira, e distância por relaxamento).
  2. A projeção do teste (fórmula escrita à mão: o mapa tem 10×10 casas de 36 px) e o gravador de polígonos do canvas.
     Mais o pintor de trás para a frente do teste e o caso ARESTAS COMPARTILHADAS dos passos 5 e 6.
  3. Os botões [data-acao]: clicar de verdade e conferir o efeito.
  4. O passo inteiro num iframe (srcdoc, com o style.css de verdade): tamanhos de tela, movimento reduzido.
*/


// ============================================================
// 1. A CONTA DE ENCHENTE DO TESTE
// ============================================================
const VIZINHAS_DA_MINHA_CONTA = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function matrizDeValor(tamanho, valor) {
    const matriz = [];
    for (let y = 0; y < tamanho; y++) {
        matriz.push([]);
        for (let x = 0; x < tamanho; x++) matriz[y].push(valor);
    }
    return matriz;
}

function copiarMatriz(matriz) {
    return matriz.map(function (linha) { return linha.slice(); });
}

function casasDaMatriz(matriz) {                 // em ordem de índice (y · tamanho + x)
    const casas = [];
    matriz.forEach(function (linha, y) { linha.forEach(function (valor, x) { if (valor) casas.push({ x: x, y: y }); }); });
    return casas;
}

function textoDasCasas(casas) {
    return casas.map(function (casa) { return casa.x + "," + casa.y; }).join(" ");
}

/* O primeiro ponto onde duas matrizes diferem, em texto; "" se são iguais. */
function primeiraDiferenca(a, b) {
    for (let y = 0; y < a.length; y++) {
        for (let x = 0; x < a[y].length; x++) {
            if (a[y][x] !== b[y][x]) return "(" + x + "," + y + "): " + a[y][x] + " ≠ " + b[y][x];
        }
    }
    return "";
}

function uniaoDeMatrizes(a, b) {
    return a.map(function (linha, y) { return linha.map(function (valor, x) { return valor || b[y][x]; }); });
}

function temVizinhaMolhada(molhado, x, y) {
    return VIZINHAS_DA_MINHA_CONTA.some(function (passo) {
        const linha = molhado[y + passo[1]];
        return linha !== undefined && linha[x + passo[0]] === true;
    });
}

/* Ponto fixo: marca as fontes mais baixas que o nível e repete "toda casa mais baixa e colada numa molhada molha" até nada mudar. */
function alagarPorPontoFixo(terreno, nivel, fontes) {
    const molhado = matrizDeValor(terreno.length, false);
    fontes.forEach(function (fonte) { if (terreno[fonte.y][fonte.x] < nivel) molhado[fonte.y][fonte.x] = true; });
    let mudou = true;
    while (mudou) {
        mudou = false;
        for (let y = 0; y < terreno.length; y++) {
            for (let x = 0; x < terreno.length; x++) {
                if (!molhado[y][x] && terreno[y][x] < nivel && temVizinhaMolhada(molhado, x, y)) { molhado[y][x] = true; mudou = true; }
            }
        }
    }
    return molhado;
}

/* Distância por relaxamento: cada casa ao alcance vale a menor vizinha + 1, repetido até estabilizar. -1 onde a água não chega. */
function distanciasPorRelaxamento(alcance, fontes) {
    const infinito = 1e9, distancia = matrizDeValor(alcance.length, infinito);
    fontes.forEach(function (fonte) { if (alcance[fonte.y][fonte.x]) distancia[fonte.y][fonte.x] = 0; });
    let mudou = true;
    while (mudou) {
        mudou = false;
        for (let y = 0; y < alcance.length; y++) {
            for (let x = 0; x < alcance.length; x++) {
                if (!alcance[y][x]) continue;
                VIZINHAS_DA_MINHA_CONTA.forEach(function (passo) {
                    const linha = distancia[y + passo[1]];
                    if (linha !== undefined && linha[x + passo[0]] !== undefined && linha[x + passo[0]] + 1 < distancia[y][x]) { distancia[y][x] = linha[x + passo[0]] + 1; mudou = true; }
                });
            }
        }
    }
    return distancia.map(function (linha) { return linha.map(function (valor) { return valor === infinito ? -1 : valor; }); });
}

/*
  Com volume: as fontes molham de graça; cada unidade molha UMA casa ao alcance e colada na água, a de menor (altura, distância, índice).
  Devolve as casas consumidas em ordem, a matriz molhada e o volume que sobrou.
*/
function encherPelaMinhaConta(terreno, nivel, fontes, volume) {
    const tamanho = terreno.length;
    const alcance = alagarPorPontoFixo(terreno, nivel, fontes);
    const distancia = distanciasPorRelaxamento(alcance, fontes);
    const molhado = matrizDeValor(tamanho, false), consumidas = [];
    fontes.forEach(function (fonte) { if (alcance[fonte.y][fonte.x]) molhado[fonte.y][fonte.x] = true; });
    let restante = volume;
    while (restante > 0) {
        let melhor = null;
        for (let y = 0; y < tamanho; y++) {
            for (let x = 0; x < tamanho; x++) {
                if (!alcance[y][x] || molhado[y][x] || !temVizinhaMolhada(molhado, x, y)) continue;
                const candidata = { x: x, y: y, altura: terreno[y][x], distancia: distancia[y][x] };
                const antes = melhor === null || candidata.altura < melhor.altura
                    || (candidata.altura === melhor.altura && candidata.distancia < melhor.distancia);
                if (antes) melhor = candidata;           // a varredura já anda em ordem de índice: no empate total, fica a primeira
            }
        }
        if (melhor === null) break;
        molhado[melhor.y][melhor.x] = true;
        consumidas.push({ x: melhor.x, y: melhor.y });
        restante--;
    }
    return { consumidas: consumidas, alagado: molhado, restante: restante, alcance: alcance, distancia: distancia };
}

/* Terreno sorteado: o mar (matriz de booleanos) fica em 0; a terra recebe alturas de 0 a 4. */
function sortearTerrenoDaIlha(ehMar, tendenciaParaBaixo) {
    return ehMar.map(function (linha) {
        return linha.map(function (mar) {
            if (mar) return 0;
            const sorteio = Math.floor(Math.random() * 5);
            return tendenciaParaBaixo ? Math.min(sorteio, Math.floor(Math.random() * 5)) : sorteio;
        });
    });
}

function matrizDoMar(alturasEmTexto) {
    return alturasEmTexto.map(function (linha) { return linha.split("").map(function (simbolo) { return simbolo === "~"; }); });
}

function fontesDoMar(ehMar) {
    return casasDaMatriz(ehMar);
}

/* Fontes extras sorteadas em terra (nunca no mar nem repetidas). */
function sortearFontesNaTerra(quantidade, ehMar) {
    const fontes = [], vistas = {};
    while (fontes.length < quantidade) {
        const x = Math.floor(Math.random() * ehMar.length), y = Math.floor(Math.random() * ehMar.length);
        if (ehMar[y][x] || vistas[x + "," + y]) continue;
        vistas[x + "," + y] = true;
        fontes.push({ x: x, y: y });
    }
    return fontes;
}


// ============================================================
// 2. A PROJEÇÃO DO TESTE E O GRAVADOR DE POLÍGONOS
// ============================================================
const MINHA_ORIGEM = { x: 192, y: 60 };          // 10 × 36 / 2 + 12 e 4 × 12 + 12

function girarComTamanho(x, y, giros, tamanho) {
    let ponto = [x, y];
    for (let i = 0; i < giros; i++) ponto = [tamanho - ponto[1], ponto[0]];
    return ponto;
}

function projetarNoApoio(u, v, z) {
    return { x: MINHA_ORIGEM.x + 18 * (u - v), y: MINHA_ORIGEM.y + 9 * (u + v) - 12 * z };
}

/* Os quatro cantos do losango da casa (cima, direita, baixo, esquerda) na altura z, no giro dado. */
function meusCantos(x, y, z, giros, tamanho) {
    const centro = girarComTamanho(x + 0.5, y + 0.5, giros, tamanho);
    return [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(function (canto) {
        return projetarNoApoio(centro[0] + canto[0], centro[1] + canto[1], z);
    });
}

/* A casa do mapa cujo centro, girado, cai em (u, v); null se cai fora do mapa. */
function casaDoCentroGiradoNoApoio(u, v, giros, tamanho) {
    for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
            const centro = girarComTamanho(x + 0.5, y + 0.5, giros, tamanho);
            if (Math.abs(centro[0] - u) < 1e-9 && Math.abs(centro[1] - v) < 1e-9) return { x: x, y: y };
        }
    }
    return null;
}

/* O pintor de trás para a frente, escrito aqui sem nenhuma função do jogo: a referência das arestas comuns dos passos 5 e 6.
   `superficie(x, y)` devolve a altura visível da casa pela conta de quem chama; casa de altura 0 só tem topo (laterais sem área
   conteriam todo pixel de uma reta). O cenário vem da casa mais perto à mais longe e, no empate, a pintada por último (maior índice) primeiro. */
const FACES_DO_PINTOR = ["topo", "esquerda", "direita"];

function pontoNoPoligonoInclusivo(poligono, ponto) {       // encostar na aresta conta
    let positivo = false, negativo = false;
    for (let i = 0; i < poligono.length; i++) {
        const canto = poligono[i], proximo = poligono[(i + 1) % poligono.length];
        const lado = (proximo.x - canto.x) * (ponto.y - canto.y) - (proximo.y - canto.y) * (ponto.x - canto.x);
        if (lado > 1e-9) positivo = true;
        if (lado < -1e-9) negativo = true;
    }
    return !(positivo && negativo);
}

function montarCenarioDoPintor(superficie, giros, tamanho) {
    const casas = [];
    for (let y = 0; y < tamanho; y++) {
        for (let x = 0; x < tamanho; x++) {
            const altura = superficie(x, y);
            const centro = girarComTamanho(x + 0.5, y + 0.5, giros, tamanho);
            const topo = meusCantos(x, y, altura, giros, tamanho), base = meusCantos(x, y, 0, giros, tamanho);
            const faces = { topo: topo };
            if (altura > 0) {
                faces.esquerda = [topo[3], topo[2], base[2], base[3]];
                faces.direita = [topo[2], topo[1], base[1], base[2]];
            }
            casas.push({ x: x, y: y, altura: altura, proximidade: centro[0] + centro[1], faces: faces });
        }
    }
    return casas.sort(function (a, b) { return b.proximidade - a.proximidade || (b.y * tamanho + b.x) - (a.y * tamanho + a.x); });
}

function casasQueContemOPonto(cenario, ponto) {
    return cenario.filter(function (casa) {
        return FACES_DO_PINTOR.some(function (nome) { return casa.faces[nome] && pontoNoPoligonoInclusivo(casa.faces[nome], ponto); });
    });
}

function acharPeloPintorDeTrasParaAFrente(cenario, sx, sy) {
    const ponto = { x: sx, y: sy };
    for (let i = 0; i < cenario.length; i++) {
        const nome = FACES_DO_PINTOR.find(function (candidata) { return cenario[i].faces[candidata] && pontoNoPoligonoInclusivo(cenario[i].faces[candidata], ponto); });
        if (nome) return { x: cenario[i].x, y: cenario[i].y, face: nome };
    }
    return null;
}

/* Todo ponto de coordenada inteira sobre uma aresta de uma face (as arestas são 2:1 ou verticais, com vértices inteiros). */
function pontosInteirosSobreArestas(cenario) {
    const maiorDivisor = function (a, b) { return b === 0 ? a : maiorDivisor(b, a % b); };
    const pontos = new Map();
    cenario.forEach(function (casa) {
        FACES_DO_PINTOR.filter(function (nome) { return casa.faces[nome]; }).forEach(function (nome) {
            const poligono = casa.faces[nome];
            poligono.forEach(function (canto, i) {
                const proximo = poligono[(i + 1) % poligono.length];
                const dx = Math.round(proximo.x - canto.x), dy = Math.round(proximo.y - canto.y);
                const passos = maiorDivisor(Math.abs(dx), Math.abs(dy));
                for (let passo = 0; passo <= passos; passo++) {
                    const ponto = [Math.round(canto.x) + dx * passo / passos, Math.round(canto.y) + dy * passo / passos];
                    pontos.set(ponto.join(","), ponto);
                }
            });
        });
    });
    return Array.from(pontos.values());
}

/* O caso ARESTAS COMPARTILHADAS dos passos 5 e 6 (o do 4 tem a sua força bruta, na página): num ponto de coordenada inteira sobre a aresta
   de duas casas ou mais, o raio do jogo tem de dar a casa e a face do pintor de trás para a frente. O defeito que isto pega é de ponto
   flutuante (6,999… no lugar de 7), então o pixel da janela é montado com a câmera (zoom e rolagem que não são exatos) e o jogo a desfaz.
   config = {
     tamanho, mapa: {x, y}, vista: {x, y}, zooms, estados, semente,
     sortearEstado(i): põe no jogo o terreno e a água do estado i e devolve superficie(x, y), a altura visível pela conta da PÁGINA,
     alturaVisivelDoJogo(x, y), irParaOGiro(giro), definirCamera(zoom, desvioX, desvioY), cameraDoJogo() → {zoom, desvioX, desvioY},
     raio(x, y), casaSobOPixel({x, y}) } */
function conferirArestasComunsComCamera(config) {
    semearSorteio(config.semente);
    let empates = 0, divergenciasDoRaio = 0, divergenciasDaCamera = 0, superficiesDiferentes = 0, comCovaSeca = 0, comAlturaAlta = 0;
    const exemplosDoRaio = [], exemplosDaCamera = [], zoomsVistos = new Set(), rolagensVistas = new Set();
    const nomeDoAcerto = function (acerto) { return acerto ? acerto.x + "," + acerto.y + " " + acerto.face : "nada"; };

    for (let estado = 0; estado < config.estados; estado++) {
        const superficie = config.sortearEstado(estado);
        for (let y = 0; y < config.tamanho; y++) {
            for (let x = 0; x < config.tamanho; x++) if (config.alturaVisivelDoJogo(x, y) !== superficie(x, y)) superficiesDiferentes++;
        }
        for (let giro = 0; giro < 4; giro++) {
            config.irParaOGiro(giro);
            const cenario = montarCenarioDoPintor(superficie, giro, config.tamanho);
            const todos = pontosInteirosSobreArestas(cenario);
            config.zooms.forEach(function (zoom) {
                const minimoX = Math.min(0, config.vista.x - config.mapa.x * zoom), minimoY = Math.min(0, config.vista.y - config.mapa.y * zoom);
                const rolagens = [[minimoX, minimoY], [minimoX * Math.random(), minimoY * Math.random()], [Math.round(minimoX / 2), Math.round(minimoY / 2)], [0, 0]];
                rolagens.forEach(function (rolagem) {
                    config.definirCamera(zoom, rolagem[0], rolagem[1]);
                    const camera = config.cameraDoJogo();
                    zoomsVistos.add(camera.zoom);
                    rolagensVistas.add(camera.desvioX + "," + camera.desvioY);
                    for (let i = 0; i < 120; i++) {
                        const ponto = todos[Math.floor(Math.random() * todos.length)];
                        const pixel = { x: ponto[0] * camera.zoom + camera.desvioX, y: ponto[1] * camera.zoom + camera.desvioY };
                        if (pixel.x < 0 || pixel.y < 0 || pixel.x >= config.vista.x || pixel.y >= config.vista.y) continue;
                        const donas = casasQueContemOPonto(cenario, { x: ponto[0], y: ponto[1] });
                        if (donas.length < 2) continue;      // só o empate de verdade: o contorno da ilha com o vazio não é empate
                        empates++;
                        if (donas.some(function (casa) { return casa.altura === 0; })) comCovaSeca++;
                        if (donas.some(function (casa) { return casa.altura >= 3; })) comAlturaAlta++;
                        const referencia = nomeDoAcerto(acharPeloPintorDeTrasParaAFrente(cenario, ponto[0], ponto[1]));
                        const doRaio = nomeDoAcerto(config.raio(ponto[0], ponto[1])), daCamera = nomeDoAcerto(config.casaSobOPixel(pixel));
                        const onde = "estado " + estado + " giro " + giro * 90 + "° zoom " + zoom + " desvio (" + camera.desvioX + "," + camera.desvioY + ") ponto " + ponto;
                        if (doRaio !== referencia) {
                            divergenciasDoRaio++;
                            if (exemplosDoRaio.length < 3) exemplosDoRaio.push(onde + ": raio " + doRaio + ", pintor " + referencia + "; donas " + donas.map(function (casa) { return casa.x + "," + casa.y + " h" + casa.altura; }).join(" / "));
                        }
                        if (daCamera !== referencia) {
                            divergenciasDaCamera++;
                            if (exemplosDaCamera.length < 3) exemplosDaCamera.push(onde + ": pelo pixel " + daCamera + ", pintor " + referencia);
                        }
                    }
                });
            });
        }
    }
    conferirIgual("a altura visível do jogo = a da página em todas as casas de " + config.estados + " estados", superficiesDiferentes, 0);
    conferir(empates + " empates de aresta: o raio no ponto do mundo = o pintor de trás para a frente (a última pintada vence)", divergenciasDoRaio === 0 && empates > 3000, divergenciasDoRaio + " divergências; " + exemplosDoRaio.join(" | ") + " (empates = " + empates + ")");
    conferir("e pelo pixel da janela (zoom e rolagem desfeitos em ponto flutuante): casaSobOPixel = o pintor", divergenciasDaCamera === 0, divergenciasDaCamera + " divergências; " + exemplosDaCamera.join(" | "));
    conferir("a amostra usou os " + config.zooms.length + " zooms e " + rolagensVistas.size + " rolagens, com cova seca em " + comCovaSeca + " empates e bloco alto (≥ 3) em " + comAlturaAlta,
        zoomsVistos.size === config.zooms.length && rolagensVistas.size >= 20 && comCovaSeca > 200 && comAlturaAlta > 200);
}

function alfaDoEstilo(estilo) {                   // "rgba(42, 111, 219, 0.55)" → 0.55; cor sem alfa → 1
    const achado = /^rgba\(.*,\s*([\d.]+)\)$/.exec(String(estilo));
    return achado ? Number(achado[1]) : 1;
}

/* Roda `executar` com o canvas gravando cada polígono preenchido e cada traço. O pincel volta ao normal no fim. */
function gravarDesenho(pincelDoJogo, executar) {
    const registro = { preenchimentos: [], tracos: [] };
    const prototipo = CanvasRenderingContext2D.prototype;
    let caminho = [];
    pincelDoJogo.beginPath = function () { caminho = []; prototipo.beginPath.call(pincelDoJogo); };
    pincelDoJogo.moveTo = function (x, y) { caminho.push({ x: x, y: y }); prototipo.moveTo.call(pincelDoJogo, x, y); };
    pincelDoJogo.lineTo = function (x, y) { caminho.push({ x: x, y: y }); prototipo.lineTo.call(pincelDoJogo, x, y); };
    pincelDoJogo.fill = function () {
        registro.preenchimentos.push({ pontos: caminho.slice(), estilo: pincelDoJogo.fillStyle, alfa: alfaDoEstilo(pincelDoJogo.fillStyle) });
        prototipo.fill.apply(pincelDoJogo, arguments);
    };
    pincelDoJogo.stroke = function () {
        registro.tracos.push({ pontos: caminho.slice(), estilo: pincelDoJogo.strokeStyle, largura: pincelDoJogo.lineWidth, tracejado: pincelDoJogo.getLineDash().length > 0 });
        prototipo.stroke.call(pincelDoJogo);
    };
    try {
        executar();
    } finally {
        ["beginPath", "moveTo", "lineTo", "fill", "stroke"].forEach(function (nome) { delete pincelDoJogo[nome]; });
    }
    return registro;
}

/* Troca a função global `nome` por uma que grava os preenchimentos de cada chamada; devolve a lista { args, preenchimentos }. */
function espiarPreenchimentosPorChamada(nome, executar) {
    const verdadeira = window[nome];
    const chamadas = [];
    window[nome] = function () {
        const args = Array.prototype.slice.call(arguments);
        let resultado;
        const registro = gravarDesenho(pincel, function () { resultado = verdadeira.apply(null, args); });
        chamadas.push({ args: args, preenchimentos: registro.preenchimentos });
        return resultado;
    };
    try { executar(); } finally { window[nome] = verdadeira; }
    return chamadas;
}

function mesmoPonto(a, b) {
    return Math.abs(a.x - b.x) < 1e-6 && Math.abs(a.y - b.y) < 1e-6;
}

function chaveDoPonto(ponto) {
    return Math.round(ponto.x * 1000) + "," + Math.round(ponto.y * 1000);
}

/* Guarda, por ponto, os polígonos preenchidos que o têm como canto: achar o que passa por dois pontos deixa de varrer o quadro todo. */
function indexarPreenchimentos(preenchimentos) {
    const indice = new Map();
    preenchimentos.forEach(function (preenchimento) {
        preenchimento.pontos.forEach(function (ponto) {
            const chave = chaveDoPonto(ponto);
            if (!indice.has(chave)) indice.set(chave, []);
            if (indice.get(chave).indexOf(preenchimento) === -1) indice.get(chave).push(preenchimento);
        });
    });
    return indice;
}

/*
  Procura as "paredes": polígonos de quatro pontos ou mais com dois cantos em A e B e os outros dois exatamente abaixo deles
  (mesmo x, y maior). Devolve a lista de { alfa, queda } (queda em degraus de altura).
*/
function acharParedes(indice, a, b) {
    const paredes = [];
    (indice.get(chaveDoPonto(a)) || []).forEach(function (preenchimento) {
        const pontos = preenchimento.pontos;
        if (pontos.length < 4 || !pontos.some(function (p) { return mesmoPonto(p, b); })) return;
        const embaixoDeA = pontos.find(function (p) { return Math.abs(p.x - a.x) < 1e-6 && p.y > a.y + 1e-6; });
        const embaixoDeB = pontos.find(function (p) { return Math.abs(p.x - b.x) < 1e-6 && p.y > b.y + 1e-6; });
        if (embaixoDeA && embaixoDeB && Math.abs((embaixoDeA.y - a.y) - (embaixoDeB.y - b.y)) < 1e-6) {
            paredes.push({ alfa: preenchimento.alfa, queda: (embaixoDeA.y - a.y) / 12 });
        }
    });
    return paredes;
}


// ============================================================
// 2b. A ÁGUA TEM PAREDE ONDE SE ERGUE SOBRE UMA VIZINHA DA FRENTE MAIS BAIXA E SECA (passos 5 e 6)
// ============================================================
/*
  `alagado` é a matriz que o teste põe no jogo; o quadro é desenhado com o terreno e o giro de agora. `nivelDe` é o nível da água
  (um número) ou uma função (x, y) → nível da água naquela casa. A regra: para toda casa molhada e cada uma das duas arestas da frente
  (direita-baixo e esquerda-baixo), se a vizinha ali existe e o que se vê nela (a água dela, se molhada; senão, o terreno) é mais baixo
  que a água desta casa, há uma parede TRANSLÚCIDA que desce do nível até pelo menos o que se vê na vizinha ou o terreno da própria casa, o que for mais alto
  (a água só tinge o que está acima do terreno dela); senão, nenhuma parede.
  No fim do mapa (sem vizinha) o teste não opina: o jogo pode descer a parede até o chão. Uma parede opaca do leito pode acompanhar a
  translúcida da água.
*/
function conferirParedesDaAgua(rotulo, alagado, nivelDe, giros, desenharUmQuadro) {
    const tamanho = alagado.length;
    const nivelDaCasa = typeof nivelDe === "function" ? nivelDe : function () { return nivelDe; };
    const quadro = gravarDesenho(pincel, desenharUmQuadro || function () { avancarQuadro(16); });
    const indice = indexarPreenchimentos(quadro.preenchimentos);
    const casaNoCentro = new Map();                  // o centro girado de cada casa → a casa
    for (let y = 0; y < tamanho; y++) for (let x = 0; x < tamanho; x++) { const c = girarComTamanho(x + 0.5, y + 0.5, giros, tamanho); casaNoCentro.set(c[0] + "," + c[1], { x: x, y: y }); }
    let esperadas = 0, faltando = [], sobrando = [], curtas = [];
    casasDaMatriz(alagado).forEach(function (casa) {
        const nivel = nivelDaCasa(casa.x, casa.y);
        const topo = meusCantos(casa.x, casa.y, nivel, giros, tamanho);
        const centro = girarComTamanho(casa.x + 0.5, casa.y + 0.5, giros, tamanho);
        [[1, 0, 1, 2], [0, 1, 2, 3]].forEach(function (aresta) {
            const vizinha = casaNoCentro.get((centro[0] + aresta[0]) + "," + (centro[1] + aresta[1])) || null;
            if (vizinha === null) return;
            const paredes = acharParedes(indice, topo[aresta[2]], topo[aresta[3]]).filter(function (parede) { return parede.alfa > 0 && parede.alfa < 1; });      // só a água é translúcida: a lateral opaca de um bloco da frente pode cair no mesmo lugar por acaso
            const nome = rotulo + " " + casa.x + "," + casa.y + " aresta " + aresta[2] + "-" + aresta[3];
            const fundo = alagado[vizinha.y][vizinha.x] ? nivelDaCasa(vizinha.x, vizinha.y) : alturas[vizinha.y][vizinha.x];
            if (fundo < nivel) {
                esperadas++;
                if (paredes.length === 0) { faltando.push(nome); return; }
                const piso = Math.max(fundo, alturas[casa.y][casa.x]);        // a água só tinge o que está acima do terreno da própria casa; abaixo dele a lateral é do leito
                if (paredes.every(function (parede) { return parede.queda < nivel - piso - 1e-6 || parede.queda > nivel + 1e-6; })) curtas.push(nome + " queda " + paredes[0].queda);
            } else if (paredes.length > 0) {
                sobrando.push(nome);
            }
        });
    });
    return { esperadas: esperadas, faltando: faltando, sobrando: sobrando, curtas: curtas, quadro: quadro };
}


// ============================================================
// 3. OS BOTÕES [data-acao]
// ============================================================
function botaoDaAcao(acao, raiz) {
    return (raiz || document).querySelector('[data-acao="' + acao + '"]');
}

/* Um clique de verdade (o evento "click" sobe pela página como o do dedo). Devolve false se o botão não existe. */
function clicarNoBotao(acao, raiz) {
    const botao = botaoDaAcao(acao, raiz);
    if (!botao) return false;
    botao.click();
    return true;
}

function acoesDosBotoes(raiz) {
    return Array.from((raiz || document).querySelectorAll("[data-acao]")).map(function (botao) { return botao.dataset.acao; });
}


// ============================================================
// 4. O PASSO INTEIRO NUM IFRAME (srcdoc: o CSS de verdade, o tamanho de tela conhecido)
// ============================================================
/*
  `corpo` é o miolo do <body> do index.html do passo. `antes` é um script que roda antes do jogo (por exemplo, trocar o matchMedia).
  O requestAnimationFrame do iframe só guarda a função: `darQuadro` entrega um quadro com o instante dado.
*/
function abrirPassoNoIframe(pasta, corpo, antes, largura, altura) {
    return new Promise(function (resolver) {
        const fecharScript = "<" + "/script>";
        const quadro = document.createElement("iframe");
        quadro.style.cssText = "display:block;border:0;width:" + largura + "px;height:" + altura + "px";
        quadro.addEventListener("load", function () { resolver(quadro); });
        quadro.srcdoc = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
            + '<link rel="stylesheet" href="../../dique/' + pasta + '/style.css"></head><body>' + corpo
            + "<script>window.requestAnimationFrame = function (funcao) { window.__proximoQuadro = funcao; return 1; };" + (antes || "") + fecharScript
            + '<script src="../../dique/' + pasta + '/regras.js">' + fecharScript
            + '<script src="../../dique/' + pasta + '/script.js">' + fecharScript
            + "</body></html>";
        document.body.appendChild(quadro);
    });
}

function darQuadro(janela, instante) {
    const funcao = janela.__proximoQuadro;
    janela.__proximoQuadro = null;
    funcao(instante);
}

/* Entrega quadros de 50 ms (o maior passo que o jogo aceita por quadro) até `segundos` de tempo do jogo; devolve o instante final. */
function passarTempoNaJanela(janela, instanteInicial, segundos) {
    let instante = instanteInicial;
    for (let passado = 0; passado < segundos - 1e-9; passado += 0.05) { instante += 50; darQuadro(janela, instante); }
    return instante;
}

/* Tira o desenho do iframe: os casos que só leem o estado do jogo não precisam pintar 100 casas por quadro. */
function pararODesenhoDaJanela(janela) {
    janela.eval("desenhar = function () {}");
}

async function testarNoIframe(nome, funcao) {
    try {
        await funcao();
    } catch (erro) {
        quantidadeDeFalhas++;
        escreverLinha("FALHA " + nome + "  -> exceção: " + erro);
    }
}

function teclaNaJanela(janela, tecla, extras) {
    const evento = new janela.KeyboardEvent("keydown", Object.assign({ key: tecla, bubbles: true, cancelable: true }, extras || {}));
    janela.document.dispatchEvent(evento);
    return evento;
}

/*
  O layout do passo num tamanho de tela, pelas regras do tech-lead: sem rolar a página em 390×750 (contrato do GDD); em qualquer
  largura, sem rolagem horizontal e todo botão com pelo menos 48×48 px; #aviso com a mesma altura em qualquer mensagem.
  `config`: { pasta, corpo, mensagens, proporcaoDoCanvas }.
*/
async function conferirLayoutDoPasso(config, largura, altura) {
    const quadro = await abrirPassoNoIframe(config.pasta, config.corpo, "", largura, altura);
    try {
        const janela = quadro.contentWindow, documento = janela.document, nome = largura + "×" + altura;
        const raiz = documento.documentElement;
        conferirIgual(nome + ": o iframe tem o tamanho pedido", janela.innerWidth + "×" + janela.innerHeight, nome);
        conferirIgual(nome + ": o passo carregou no iframe com o laço de quadros", typeof janela.__proximoQuadro, "function");
        darQuadro(janela, 16);
        const alturasDoAviso = [];
        let instante = 16;
        [false, true].forEach(function (comH) {
            if (comH) {
                teclaNaJanela(janela, "h");
                janela.dispatchEvent(new janela.PointerEvent("pointermove", { clientX: 120, clientY: 120, pointerId: 1, bubbles: true }));
            }
            config.mensagens.forEach(function (mensagem) {
                janela.avisar(mensagem);
                instante += 16;
                darQuadro(janela, instante);
                alturasDoAviso.push(Math.round(documento.getElementById("aviso").getBoundingClientRect().height * 100) / 100);
                const estado = nome + (comH ? " com H" : " sem H") + ", aviso de " + mensagem.length + " letras";
                conferir(estado + ": sem rolagem horizontal (" + raiz.scrollWidth + " ≤ " + janela.innerWidth + ")", raiz.scrollWidth <= janela.innerWidth);
                if (altura === 750) {
                    conferir(estado + ": a página não rola na vertical (conteúdo " + raiz.scrollHeight + " ≤ " + janela.innerHeight + ")", raiz.scrollHeight <= janela.innerHeight);
                }
            });
            if (comH) conferir(nome + ": a leitura ligada tem texto", documento.getElementById("leitura").textContent.length > 20);
        });
        conferir(nome + ": o #aviso tem a mesma altura em todas as mensagens (" + alturasDoAviso.filter(function (valor, i, todos) { return todos.indexOf(valor) === i; }).join(" / ") + " px)",
            alturasDoAviso.every(function (valor) { return valor === alturasDoAviso[0]; }));
        const botoes = Array.from(documento.querySelectorAll("button"));
        const pequenos = botoes.filter(function (botao) {
            const caixa = botao.getBoundingClientRect();
            return caixa.width < 48 - 0.01 || caixa.height < 48 - 0.01;
        }).map(function (botao) { return botao.dataset.acao + " " + botao.getBoundingClientRect().width.toFixed(1) + "×" + botao.getBoundingClientRect().height.toFixed(1); });
        conferirIgual(nome + ": são " + config.quantidadeDeBotoes + " botões", botoes.length, config.quantidadeDeBotoes);
        conferir(nome + ": todo botão tem pelo menos 48×48 px (GDD 7)", pequenos.length === 0, pequenos.join(", "));
        conferir(nome + ": nenhum botão passa da largura da tela", botoes.every(function (botao) { const caixa = botao.getBoundingClientRect(); return caixa.left >= 0 && caixa.right <= janela.innerWidth; }));
        if (altura === 750) {
            conferir(nome + ": todos os botões estão à vista, sem rolar", botoes.every(function (botao) { return botao.getBoundingClientRect().bottom <= janela.innerHeight; }));
        }
        const canvas = documento.getElementById("jogo"), caixaDoCanvas = canvas.getBoundingClientRect();
        conferir(nome + ": o canvas cabe na largura (" + Math.round(caixaDoCanvas.width) + " px) e mantém a proporção", caixaDoCanvas.right <= janela.innerWidth && Math.abs(caixaDoCanvas.width / caixaDoCanvas.height - config.proporcaoDoCanvas) < 0.01);
        conferirIgual(nome + ": o canvas tem touch-action: none (o dedo rola o mapa, não a página)", janela.getComputedStyle(canvas).touchAction, "none");
        conferirIgual(nome + ": o #aviso é uma região role=status", documento.getElementById("aviso").getAttribute("role"), "status");
    } finally {
        quadro.remove();
    }
}


// ============================================================
// 5. O TEMPO DA PÁGINA (informativo: o Date.now, porque o apoio.js troca o performance.now)
// ============================================================
/*
  Só vale com a página aberta por duplo clique. O executor (rodar.mjs) abre o Chrome com --virtual-time-budget, e aí o Date.now é
  tempo virtual: depois da carga ele fica parado dentro de cada tarefa e pula as esperas (medido em 2026-10-29: um laço de 2 s marcou
  0 ms). No executor, o tempo real de cada página é o da linha PASS.
*/
const MEDINDO_O_TEMPO = false;                    // true: cada caso com mais de 1 s e o total saem como FALHA, só para a medição
const instanteReal = function () { return Date.now(); };

const INICIO_DA_PAGINA_EM_MILISSEGUNDOS = instanteReal();
const testarSemMedida = testar;
const finalizarSemMedida = finalizar;
const temposDosCasos = [];

testar = function (nome, funcaoDoCaso) {
    const inicio = instanteReal();
    testarSemMedida(nome, funcaoDoCaso);
    temposDosCasos.push({ nome: nome, segundos: (instanteReal() - inicio) / 1000 });
};

finalizar = function () {
    const total = (instanteReal() - INICIO_DA_PAGINA_EM_MILISSEGUNDOS) / 1000;
    const prefixo = MEDINDO_O_TEMPO ? "FALHA medida  -> " : "TEMPO  ";
    temposDosCasos.filter(function (caso) { return MEDINDO_O_TEMPO && caso.segundos > 1; }).forEach(function (caso) {
        escreverLinha(prefixo + caso.segundos.toFixed(1) + " s  " + caso.nome.slice(0, 90));
    });
    escreverLinha(prefixo + total.toFixed(1) + " s de execução da página, sem a abertura do navegador (vale com duplo clique; no executor, veja a linha PASS)");
    finalizarSemMedida();
};
