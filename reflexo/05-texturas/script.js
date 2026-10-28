/*
  REFLEXO — PASSO 5: TEXTURAS
  A parede ganha tijolos de verdade: uma textura 16×16 escrita como TEXTO, amostrada na coluna
  certa para cada faixa da imagem, e escurecida pela névoa. Para escolher COMO desenhar, o passo
  mede duas técnicas (A: fatias drawImage; B: pixels num ImageData). O jogo usa sempre a B: ela foi
  escolhida pelo spike do GDD (seção 8.2) e esta medição a confirma, sem medir a GPU.
*/

// ---- 1. CONSTANTES E O MAPA --------------------------------
const TAMANHO_DA_CASA = 24;   // pixels de desenho por casa

const VELOCIDADE_DE_ANDAR = 3;     // casas por segundo
const VELOCIDADE_DE_GIRO = 2.5;    // radianos por segundo
const RAIO_DO_CORPO = 0.25;        // em casas: o zelador é um círculo
const CASAS_SOLIDAS = "#%DER";     // parede, pedra, porta fechada, emissor, receptor

// Legenda: # tijolo · % pedra · . chão · E emissor · R receptor · / \ espelhos · D porta · S fenda · X saída · J início
// As bordas são sempre parede. Na string, a barra invertida vale duas ("\\").
const MAPA_EM_TEXTO = [
    "################",
    "#J...#....%%..R#",
    "#.%%.#.\\.......#",
    "#.%%.D.........#",
    "#....#.####.%%.#",
    "#E...#.#..#....#",
    "#....#.#S.#.%%.#",
    "#.##...#..#....#",
    "#.##.###.##.##.#",
    "#......./......#",
    "#.%%.....X.%%..#",
    "################"
];

const COLUNAS = MAPA_EM_TEXTO[0].length;   // 16, deduzido, não digitado
const LINHAS = MAPA_EM_TEXTO.length;       // 12
const COR_CHAO = "#14141f";
const COR_FEIXE = "#bbffff";
const COR_SIMBOLO = "#ffd84d";
// Na planta as letras amarelas precisam de 4,5:1 de contraste (GDD, seção 7): D, E e R são escuros.
const COR_NA_PLANTA = { "#": "#964632", "%": "#5a6478", D: "#54410f", E: "#15434d", R: "#55296a" };
const CAMPO_DE_VISAO = 66 * Math.PI / 180;       // o padrão do GDD (50° a 90° nas opções do final)
const PLANO = Math.tan(CAMPO_DE_VISAO / 2);      // metade do plano da câmera, a 1 casa do olho

// ---- 2. TEXTURAS COMO TEXTO --------------------------------
// Cada letra é uma cor da paleta; cada textura são 16 linhas de 16 letras (como os sprites do curso).
const TAMANHO_DA_TEXTURA = 16;
const PALETA_DAS_TEXTURAS = {
    a: "#964632", b: "#b05a40", c: "#4a3c3c", d: "#7a3626",   // tijolo, claro, argamassa, sombra
    p: "#5a6478", q: "#707c96", r: "#434b5c",                 // pedra, clara, escura
    g: "#a8842e", h: "#775c1e", i: "#2c2c3c", o: "#c9c9d6",   // madeira, escura, ferro, rebite
    j: "#2e7d8a", k: "#1c5560", l: "#bbffff",                 // emissor, escuro, luz
    m: "#8a4aa8", n: "#4e2a64"                                // receptor, escuro
};
const TEXTURAS_EM_TEXTO = {
    // tijolo: quatro fileiras de tijolos com argamassa (c), deslocadas pela metade
    "#": [
        "aaabaaacaaababbc",
        "aaaaaaacaaaaaaac",
        "dddddddcadaadddc",
        "cccccccccccccccc",
        "abacaaabbaacabba",
        "aaacaaaaaaacaaaa",
        "adacdaaaadacdaaa",
        "cccccccccccccccc",
        "aaaaaaacaaaabbac",
        "aaaaaaacaaaaaaac",
        "daaaaaacaddddaac",
        "cccccccccccccccc",
        "aaacabaaaaacbaaa",
        "aaacaaaaaaacaaaa",
        "aaacaadddaacdaaa",
        "cccccccccccccccc"
    ],
    // pedra: dois blocos por fileira, borda clara em cima e à esquerda, escura embaixo e à direita
    "%": [
        "qqqqqqqqqqqqqqqq",
        "qpppppprqrppprpr",
        "qrppqpprqpprqpqr",
        "qrpqppprqppppppr",
        "qpppppprqpqppppr",
        "qppqppprqppqpppr",
        "qrppprprqrqprppr",
        "qrrrrrrrqrrrrrrr",
        "qqqqqqqqqqqqqqqq",
        "rprrqprpppprqppp",
        "ppprqprpppprqppq",
        "rpprqpppppprqprr",
        "ppprqrpprpprqppr",
        "qpprqppppprrqpqp",
        "ppprqpppqpprqqrp",
        "rrrrqrrrrrrrqrrr"
    ],
    // porta: tábuas de madeira, duas cintas de ferro e um puxador
    D: [
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh",
        "iiioiiiiiiioiiii",
        "iiiiiiiiiiiiiiii",
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh",
        "hgghhgghhgohhggh",
        "hgghhgghhgohhggh",
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh",
        "iiioiiiiiiioiiii",
        "iiiiiiiiiiiiiiii",
        "hgghhgghhgghhggh",
        "hgghhgghhgghhggh"
    ],
    // emissor: placa de metal com a lente no meio
    E: [
        "kkkkkkkkkkkkkkkk",
        "kjjjjjjjjjjjjjjk",
        "kjojjjjjjjjjjojk",
        "kjjjjjjjjjjjjjjk",
        "kjjjjjjkkjjjjjjk",
        "kjjjjkkkkkkjjjjk",
        "kjjjjkllllkjjjjk",
        "kjjjkkllllkkjjjk",
        "kjjjkkllllkkjjjk",
        "kjjjjkllllkjjjjk",
        "kjjjjkkkkkkjjjjk",
        "kjjjjjjkkjjjjjjk",
        "kjjjjjjjjjjjjjjk",
        "kjojjjjjjjjjjojk",
        "kjjjjjjjjjjjjjjk",
        "kkkkkkkkkkkkkkkk"
    ],
    // receptor: anel roxo com núcleo claro (o anel vazio, de apagado, vem no passo 7)
    R: [
        "rrrrrrrrrrrrrrrr",
        "rrrrrrrrrrrrrrrr",
        "rrrrrmmmmmmrrrrr",
        "rrrrmmmmmmmmrrrr",
        "rrrmmmnnnnmmmrrr",
        "rrmmmnnnnnnmmmrr",
        "rrmmnnnllnnnmmrr",
        "rrmmnnllllnnmmrr",
        "rrmmnnllllnnmmrr",
        "rrmmnnnllnnnmmrr",
        "rrmmmnnnnnnmmmrr",
        "rrrmmmnnnnmmmrrr",
        "rrrrmmmmmmmmrrrr",
        "rrrrrmmmmmmrrrrr",
        "rrrrrrrrrrrrrrrr",
        "rrrrrrrrrrrrrrrr"
    ]
};

// Névoa: 32 níveis, cada textura já sombreada UMA vez, na carga (GDD, seção 6).
const NIVEIS_DE_NEVOA = 32;
const DISTANCIA_DA_NEVOA = 10;   // casas: daí em diante a parede some na cor da névoa
const ESCURO_DO_LADO_Y = 5;      // níveis extras nas faces y: a "luz" barata do passo 4, agora na névoa
const COR_DO_HORIZONTE = [10, 10, 18];
const COR_DA_NEVOA = COR_DO_HORIZONTE;   // a MESMA cor: a parede toda enevoada some no horizonte
const COR_DO_TETO_ALTO = [4, 4, 9];
const COR_DO_PISO_BAIXO = [38, 38, 56];

// ---- 3. DOM E ESTADO ---------------------------------------
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const visao = document.getElementById("visao");
// willReadFrequently: o canvas rasteriza na CPU (software). Sem ele a GPU só enfileira o trabalho e o relógio
// não vê o custo; por isso a medição abaixo vale para a CPU, e o caminho da GPU não foi medido (GDD, 8.2).
const pincelVisao = visao.getContext("2d", { willReadFrequently: true });
const palco = document.getElementById("palco");

// mapa[linha][coluna]: strings são imutáveis, e o mapa vai mudar.
const mapa = MAPA_EM_TEXTO.map(linha => linha.split(""));

// x e y em CASAS (1,5 = meio da casa 1), não em pixels. `angulo` em radianos:
// 0 = direita; como y desce, π/2 = para baixo. dx e dy são o vetor DIREÇÃO.
const jogador = { x: 0, y: 0, angulo: 0.25, dx: 0, dy: 0 };

// Um resultado de raio por coluna da imagem, refeito a cada quadro: casa batida, lado, distância,
// distância perpendicular, altura e `u` (0 a 1: onde, ao longo da face, o raio bateu). `raio` é o do olhar.
let raiosDaTela = [];
let raio = null;

// A resolução interna é baixa de propósito; o navegador amplia por um número INTEIRO (seção 11).
let larguraDaVisao = 320;
let alturaDaVisao = 200;

// Técnica B: o ImageData e o Uint32Array por cima dele (1 número = 1 pixel). `fundo` é teto e piso prontos.
let imagem = null;
let pixels = null;
let fundo = null;

const texturasSombreadas = {};   // símbolo → 32 Uint32Array de 256 pixels, um por nível de névoa
const canvasesDasTexturas = {};  // símbolo → canvas 16×16, só para a técnica A
const estilosDaNevoa = [];       // nível → "rgba(...)", só para a técnica A
let medicao = { a: 0, b: 0, largura: 0, altura: 0 };   // ms por quadro, SÓ o desenho, de cada técnica
let msAoVivo = 0;

let depuracaoLigada = false;
let instanteDoQuadroAnterior = 0;

// ---- 4. CONFERIR O MAPA E AS TEXTURAS, ACHAR O JOGADOR -----
// Dado errado não dá erro: dá um desenho torto longe da causa. Devolvem se servem.
function verificarMapa() {
    const inicios = MAPA_EM_TEXTO.join("").split("J").length - 1;
    const bordasFechadas = MAPA_EM_TEXTO.every((linha, i) => linha.length === COLUNAS
        && (i === 0 || i === LINHAS - 1 ? /^#+$/.test(linha) : /^#.*#$/.test(linha)));
    const valido = inicios === 1 && bordasFechadas;

    if (!valido) {
        console.error(`Mapa inválido: ${inicios} jogadores (esperado 1), bordas fechadas: ${bordasFechadas}. O jogo não começa.`);
    }
    return valido;
}

function verificarTexturas() {
    const defeitos = Object.entries(TEXTURAS_EM_TEXTO).filter(([, linhas]) => linhas.length !== TAMANHO_DA_TEXTURA
        || linhas.some(linha => linha.length !== TAMANHO_DA_TEXTURA || [...linha].some(letra => PALETA_DAS_TEXTURAS[letra] === undefined)));
    defeitos.forEach(([simbolo]) => console.error(`Textura "${simbolo}" inválida: precisa de 16 linhas de 16 letras da paleta.`));
    return defeitos.length === 0;
}

function colocarJogadorNoInicio() {
    const y = mapa.findIndex(linha => linha.includes("J"));
    const x = mapa[y].indexOf("J");
    jogador.x = x + 0.5;
    jogador.y = y + 0.5;
    mapa[y][x] = ".";   // o J é só um aviso: embaixo dele é chão
}

// A direção nunca é guardada à mão: sai do ângulo, sempre de tamanho 1.
function atualizarDirecao() {
    jogador.dx = Math.cos(jogador.angulo);
    jogador.dy = Math.sin(jogador.angulo);
}

// ---- 5. PREPARAR AS TEXTURAS (UMA VEZ, NA CARGA) -----------
function corEmNumeros(cor) {
    return [1, 3, 5].map(inicio => parseInt(cor.slice(inicio, inicio + 2), 16));
}

function misturar(corA, corB, fracao) {
    return corA.map((canal, indice) => Math.round(canal + (corB[indice] - canal) * fracao));
}

// Little-endian (todo navegador de hoje): o número é 0xAABBGGRR, ou seja, os bytes R, G, B, A em ordem.
function empacotar([vermelho, verde, azul]) {
    return ((255 << 24) | (azul << 16) | (verde << 8) | vermelho) >>> 0;
}

function prepararTexturas() {
    Object.entries(TEXTURAS_EM_TEXTO).forEach(([simbolo, linhas]) => {
        const cores = [...linhas.join("")].map(letra => corEmNumeros(PALETA_DAS_TEXTURAS[letra]));
        texturasSombreadas[simbolo] = Array.from({ length: NIVEIS_DE_NEVOA }, (_, nivel) =>
            Uint32Array.from(cores, cor => empacotar(misturar(cor, COR_DA_NEVOA, nivel / (NIVEIS_DE_NEVOA - 1)))));
        canvasesDasTexturas[simbolo] = criarCanvasDaTextura(texturasSombreadas[simbolo][0]);
    });
    for (let nivel = 0; nivel < NIVEIS_DE_NEVOA; nivel++) {
        estilosDaNevoa.push(`rgba(${COR_DA_NEVOA.join(", ")}, ${nivel / (NIVEIS_DE_NEVOA - 1)})`);
    }
}

function criarCanvasDaTextura(pixelsDaTextura) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = TAMANHO_DA_TEXTURA;
    const contexto = canvas.getContext("2d");
    const imagemDaTextura = contexto.createImageData(TAMANHO_DA_TEXTURA, TAMANHO_DA_TEXTURA);
    new Uint32Array(imagemDaTextura.data.buffer).set(pixelsDaTextura);
    contexto.putImageData(imagemDaTextura, 0, 0);
    return canvas;
}

// ---- 6. DESENHAR: A IMAGEM (TÉCNICA B) E A PLANTA ----------
// Escala do pincel da planta: 1 unidade de desenho = 1 casa (24 pixels), como no mundo.
pincel.scale(TAMANHO_DA_CASA, TAMANHO_DA_CASA);

function desenhar() {
    visao.hidden = depuracaoLigada;   // o H TROCA a imagem pela planta
    tela.hidden = !depuracaoLigada;
    if (depuracaoLigada) {
        desenharPlanta();
    } else {
        desenharVisao();
    }
    leitura.textContent = depuracaoLigada ? montarLeitura() : "";
}

// Técnica B: copia o fundo, escreve cada pixel de parede no Uint32Array e envia tudo de uma vez.
function desenharVisao() {
    pixels.set(fundo);
    raiosDaTela.forEach(desenharColuna);
    pincelVisao.putImageData(imagem, 0, 0);
}

// Quanto mais longe, mais névoa; a face y ganha níveis extras. O nível escolhe a textura já sombreada.
function nivelDeNevoa(umRaio) {
    const proporcao = umRaio.perpendicular / DISTANCIA_DA_NEVOA;
    const nivel = Math.floor(proporcao * (NIVEIS_DE_NEVOA - 1)) + (umRaio.lado === "y" ? ESCURO_DO_LADO_Y : 0);
    return Math.min(NIVEIS_DE_NEVOA - 1, nivel);
}

function colunaDaTextura(umRaio) {
    return Math.min(TAMANHO_DA_TEXTURA - 1, Math.floor(umRaio.u * TAMANHO_DA_TEXTURA));
}

// Os pixels cujo CENTRO cai dentro da parede; a linha da textura de cada um avança `passo` por pixel.
function desenharColuna(umRaio, coluna) {
    const textura = texturasSombreadas[mapa[umRaio.linha][umRaio.coluna]][nivelDeNevoa(umRaio)];
    const deslocamento = colunaDaTextura(umRaio);
    const topoReal = (alturaDaVisao - umRaio.altura) / 2;
    const passo = TAMANHO_DA_TEXTURA / umRaio.altura;
    const topo = Math.max(0, Math.ceil(topoReal - 0.5));
    const fim = Math.min(alturaDaVisao, Math.ceil(topoReal + umRaio.altura - 0.5));

    for (let linha = topo; linha < fim; linha++) {
        const linhaDaTextura = Math.min(TAMANHO_DA_TEXTURA - 1, Math.floor((linha + 0.5 - topoReal) * passo));
        pixels[linha * larguraDaVisao + coluna] = textura[linhaDaTextura * TAMANHO_DA_TEXTURA + deslocamento];
    }
}

// Teto e piso: um degradê por linha, pronto na carga (e a cada mudança de tamanho).
function criarFundo() {
    const novoFundo = new Uint32Array(larguraDaVisao * alturaDaVisao);
    const metade = alturaDaVisao / 2;
    for (let linha = 0; linha < alturaDaVisao; linha++) {
        const distanciaDoHorizonte = Math.abs(linha + 0.5 - metade) / metade;
        const extremo = linha < metade ? COR_DO_TETO_ALTO : COR_DO_PISO_BAIXO;
        novoFundo.fill(empacotar(misturar(COR_DO_HORIZONTE, extremo, distanciaDoHorizonte)), linha * larguraDaVisao, (linha + 1) * larguraDaVisao);
    }
    return novoFundo;
}

// Técnica A, só para medir: uma fatia drawImage por coluna, mais um retângulo translúcido de névoa.
function desenharVisaoPorFatias() {
    pixels.set(fundo);
    pincelVisao.putImageData(imagem, 0, 0);
    raiosDaTela.forEach((umRaio, coluna) => {
        const topo = (alturaDaVisao - umRaio.altura) / 2;
        pincelVisao.drawImage(canvasesDasTexturas[mapa[umRaio.linha][umRaio.coluna]], colunaDaTextura(umRaio), 0, 1, TAMANHO_DA_TEXTURA, coluna, topo, 1, umRaio.altura);
        pincelVisao.fillStyle = estilosDaNevoa[nivelDeNevoa(umRaio)];
        pincelVisao.fillRect(coluna, topo, 1, umRaio.altura);
    });
}

// A planta do H: a grade, o leque de raios (um a cada poucas colunas) e o raio do olhar em destaque.
function desenharPlanta() {
    desenharCasas();
    desenharCruzamentos();
    desenharLeque();
    desenharRaio();
    desenharJogador();
}

function desenharCasas() {
    pincel.font = "bold 0.7px 'Courier New', monospace";
    pincel.textAlign = "center";
    pincel.textBaseline = "middle";
    pincel.strokeStyle = "rgba(255, 255, 255, 0.25)";   // a grade do H
    pincel.lineWidth = 0.04;

    mapa.forEach((linha, y) => linha.forEach((simbolo, x) => {
        pincel.fillStyle = COR_NA_PLANTA[simbolo] || COR_CHAO;
        pincel.fillRect(x, y, 1, 1);
        pincel.strokeRect(x, y, 1, 1);
        if ("ER/\\DSX".includes(simbolo)) {
            pincel.fillStyle = COR_SIMBOLO;
            pincel.fillText(simbolo, x + 0.5, y + 0.5);
        }
    }));
}

function desenharLeque() {
    const salto = Math.floor(larguraDaVisao / 24);
    pincel.strokeStyle = "rgba(187, 255, 255, 0.4)";
    pincel.lineWidth = 0.03;
    pincel.beginPath();
    raiosDaTela.forEach((umRaio, coluna) => {
        if (coluna % salto === 0) {
            pincel.moveTo(jogador.x, jogador.y);
            pincel.lineTo(umRaio.x, umRaio.y);
        }
    });
    pincel.stroke();
}

// O raio vai do centro do corpo ao ponto de impacto; a casa batida ganha contorno amarelo.
function desenharRaio() {
    pincel.strokeStyle = COR_SIMBOLO;
    pincel.lineWidth = 0.06;
    pincel.strokeRect(raio.coluna, raio.linha, 1, 1);
    pincel.strokeStyle = COR_FEIXE;
    pincel.lineWidth = 0.08;
    pincel.beginPath();
    pincel.moveTo(jogador.x, jogador.y);
    pincel.lineTo(raio.x, raio.y);
    pincel.stroke();
    pincel.fillStyle = "#ffffff";
    pincel.beginPath();
    pincel.arc(raio.x, raio.y, 0.13, 0, Math.PI * 2);
    pincel.fill();
}

// H: as casas que o DDA visitou (fundo amarelo) e cada linha de grade cruzada
// (círculo = linha vertical, quadrado = linha horizontal: a forma, não só a cor).
function desenharCruzamentos() {
    raio.cruzamentos.forEach(({ x, y, lado, coluna, linha }) => {
        pincel.fillStyle = "rgba(255, 216, 77, 0.18)";
        pincel.fillRect(coluna, linha, 1, 1);
        pincel.fillStyle = "#ffffff";
        pincel.beginPath();
        if (lado === "x") {
            pincel.arc(x, y, 0.1, 0, Math.PI * 2);
        } else {
            pincel.rect(x - 0.1, y - 0.1, 0.2, 0.2);
        }
        pincel.fill();
    });
}

function desenharJogador() {
    pincel.fillStyle = COR_FEIXE;
    pincel.beginPath();
    pincel.arc(jogador.x, jogador.y, RAIO_DO_CORPO, 0, Math.PI * 2);
    pincel.fill();
}

// Linhas curtas (até 40 letras): a leitura não pode passar da largura de um celular.
function montarLeitura() {
    const { x, y, angulo, dx, dy } = jogador;
    const { coluna, linha, lado, distancia, cruzamentos } = raio;
    const vezesMaisRapida = medicao.b > 0 ? medicao.a / medicao.b : 0;
    return `casa (${Math.floor(x)}, ${Math.floor(y)})  pos (${x.toFixed(2)}, ${y.toFixed(2)})\n`
        + `${(angulo * 180 / Math.PI).toFixed(0)}° = ${angulo.toFixed(3)} rad  dir (${dx.toFixed(2)}, ${dy.toFixed(2)})\n`
        + `raio (${coluna}, ${linha}) lado ${lado} ${distancia.toFixed(3)} · DDA ${cruzamentos.length}\n`
        + `A drawImage por coluna: ${medicao.a.toFixed(2)} ms\n`
        + `B ImageData por pixel: ${medicao.b.toFixed(2)} ms (${vezesMaisRapida.toFixed(1)}×)\n`
        + `${medicao.largura}×${medicao.altura}; agora: ${msAoVivo.toFixed(2)} ms de 16.7`;
}

// ---- 7. MEDIR ANTES DE ESCOLHER ----------------------------
// O que se mede: só o DESENHO de um quadro (A: fundo, fatias e névoa; B: pixels e envio). Os raios ficam fora: a pose
// não muda e eles são iguais nas duas técnicas. O getImageData de 1 pixel força o canvas a terminar o que enfileirou.
// É CPU com canvas em software; a GPU não foi medida. A linha "agora" do H é o quadro inteiro (atualizar + desenhar).
const QUADROS_DE_AQUECIMENTO = 5;
const QUADROS_MEDIDOS = 40;

function medirOTempoDe(desenharComATecnica) {
    atualizarRaios();
    let inicio = 0;
    for (let quadro = 0; quadro < QUADROS_DE_AQUECIMENTO + QUADROS_MEDIDOS; quadro++) {
        if (quadro === QUADROS_DE_AQUECIMENTO) {
            inicio = performance.now();
        }
        desenharComATecnica();
        pincelVisao.getImageData(0, 0, 1, 1);
    }
    return (performance.now() - inicio) / QUADROS_MEDIDOS;
}

function medirAsTecnicas() {
    const a = medirOTempoDe(desenharVisaoPorFatias);
    const b = medirOTempoDe(desenharVisao);
    medicao = { a, b, largura: larguraDaVisao, altura: alturaDaVisao };
}

// ---- 8. ENTRADA: TECLADO E TOQUE, A MESMA INTENÇÃO ---------
// Teclas e dedos não movem ninguém. Cada ENTRADA (uma tecla, um dedo) segura uma AÇÃO, e a
// ação vale enquanto QUALQUER entrada a segurar: soltar ↑ com W ainda apertada não para.
const entradasAtivas = new Map();   // "tecla:w", "ponteiro:3:frente" → "frente"
const acoesAtivas = new Set();      // a visão derivada: os nomes das ações seguradas
const botoesDeAcao = document.querySelectorAll("[data-acao]");
const botoesDeComando = document.querySelectorAll("[data-comando]");   // Planta e Medir: as teclas H e M, na tela
const ACAO_DA_TECLA = {
    w: "frente", arrowup: "frente", s: "tras", arrowdown: "tras",
    a: "esquerda", d: "direita", arrowleft: "girarEsquerda", arrowright: "girarDireita"
};

function mudarEntrada(entrada, acao) {   // acao indefinida = soltou
    acao === undefined ? entradasAtivas.delete(entrada) : entradasAtivas.set(entrada, acao);
    acoesAtivas.clear();
    entradasAtivas.forEach(acaoSegurada => acoesAtivas.add(acaoSegurada));
    botoesDeAcao.forEach(botao => botao.classList.toggle("segurado", acoesAtivas.has(botao.dataset.acao)));
}

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    if (tecla === "h" && !evento.repeat) {
        alternarPlanta();
    }
    if (tecla === "m" && !evento.repeat) {
        medirAsTecnicas();   // medir de novo, com a pose e o tamanho de agora
    }
    if (ACAO_DA_TECLA[tecla] !== undefined) {
        evento.preventDefault();
        mudarEntrada("tecla:" + tecla, ACAO_DA_TECLA[tecla]);
    }
});
document.addEventListener("keyup", evento => mudarEntrada("tecla:" + evento.key.toLowerCase()));
// Soltou a tecla fora da janela: o keyup nunca chega, então o blur solta tudo.
window.addEventListener("blur", () => entradasAtivas.forEach((_, entrada) => mudarEntrada(entrada)));

// Cada dedo é uma entrada (pointerId). Sair do botão com o mouse apertado também solta.
botoesDeAcao.forEach(botao => {
    const entradaDo = evento => `ponteiro:${evento.pointerId}:${botao.dataset.acao}`;
    botao.addEventListener("pointerdown", evento => mudarEntrada(entradaDo(evento), botao.dataset.acao));
    ["pointerup", "pointercancel", "pointerleave"].forEach(tipo => botao.addEventListener(tipo, evento => mudarEntrada(entradaDo(evento))));
    botao.addEventListener("contextmenu", evento => evento.preventDefault());   // pressão longa no celular
});

// A tecla H e o botão "Planta" são a mesma intenção; o botão mostra se está ligada (aria-pressed).
function alternarPlanta(ligada = !depuracaoLigada) {
    depuracaoLigada = ligada;
    [...botoesDeComando].filter(botao => botao.dataset.comando === "planta").forEach(botao => botao.setAttribute("aria-pressed", ligada));
}

const COMANDOS = {
    planta: () => alternarPlanta(),
    medir: () => { medirAsTecnicas(); alternarPlanta(true); }   // o resultado aparece na leitura da planta
};
botoesDeComando.forEach(botao => botao.addEventListener("click", () => COMANDOS[botao.dataset.comando]()));

function lerIntencao() {
    const eixo = (positiva, negativa) => Number(acoesAtivas.has(positiva)) - Number(acoesAtivas.has(negativa));
    return {
        frente: eixo("frente", "tras"),
        lado: eixo("direita", "esquerda"),
        giro: eixo("girarDireita", "girarEsquerda")
    };
}

// ---- 9. ANDAR E COLIDIR ------------------------------------
function atualizar(tempo) {
    const { frente, lado, giro } = lerIntencao();
    if (giro !== 0) {   // sem giro, nem refaz o módulo: o ângulo parado não "treme"
        girar(giro * VELOCIDADE_DE_GIRO * tempo);
    }
    andar(frente, lado, tempo);
    atualizarRaios();
}

// O ângulo dá a volta em 2π; a direção é refeita dele.
function girar(delta) {
    jogador.angulo = (jogador.angulo + delta + 2 * Math.PI) % (2 * Math.PI);
    atualizarDirecao();
}

/*
  A frente é (dx, dy); o lado direito é essa seta girada 90°: (-dy, dx).
  Frente + lado juntos somariam √2 de comprimento, então o vetor é
  NORMALIZADO (dividido pelo próprio tamanho): na diagonal não se corre mais.
*/
function andar(frente, lado, tempo) {
    const ordemX = jogador.dx * frente - jogador.dy * lado;
    const ordemY = jogador.dy * frente + jogador.dx * lado;
    const tamanho = Math.hypot(ordemX, ordemY);
    if (tamanho === 0) {
        return;
    }

    const passo = VELOCIDADE_DE_ANDAR * tempo / tamanho;
    moverComColisao(ordemX * passo, ordemY * passo);
}

// Um eixo por vez: se x bate, y ainda anda. É o que faz o corpo deslizar na parede.
function moverComColisao(passoX, passoY) {
    if (!corpoBateNaParede(jogador.x + passoX, jogador.y)) {
        jogador.x += passoX;
    }
    if (!corpoBateNaParede(jogador.x, jogador.y + passoY)) {
        jogador.y += passoY;
    }
}

function ehSolida(coluna, linha) {
    const simbolo = mapa[linha] && mapa[linha][coluna];
    return simbolo === undefined || CASAS_SOLIDAS.includes(simbolo);   // fora do mapa = parede
}

/*
  Bate se o ponto de uma casa sólida MAIS PERTO do centro está a menos de um raio.
  O passo é conferido só no destino, então ele nunca pode passar de 1 + 2 raios
  (1,5 casa): o teto de 0,05 s por quadro dá no máximo 0,15.
*/
function corpoBateNaParede(x, y) {
    for (let linha = Math.floor(y - RAIO_DO_CORPO); linha <= Math.floor(y + RAIO_DO_CORPO); linha++) {
        for (let coluna = Math.floor(x - RAIO_DO_CORPO); coluna <= Math.floor(x + RAIO_DO_CORPO); coluna++) {
            const pertoX = Math.min(Math.max(x, coluna), coluna + 1);
            const pertoY = Math.min(Math.max(y, linha), linha + 1);
            if (ehSolida(coluna, linha) && Math.hypot(x - pertoX, y - pertoY) < RAIO_DO_CORPO) {
                return true;
            }
        }
    }
    return false;
}

// ---- 10. O RAIO: DDA CASA A CASA ----------------------------
/*
  O plano da câmera é perpendicular ao olhar e tem comprimento PLANO (a metade dele, a 1
  casa do olho). A coluna `camera` (-1 na esquerda, +1 na direita) aponta o raio para
  olhar + plano × camera. O DDA devolve a distância ao longo do raio inclinado; para a
  altura vale a distância PERPENDICULAR ao plano, que é essa vezes o cosseno do desvio.
  Sem isso, uma parede reta aparece curva, como numa lente "olho de peixe".
*/
function atualizarRaios() {
    const k = larguraDaVisao / (2 * PLANO);   // pixels de uma parede de 1 casa a 1 casa de distância

    for (let coluna = 0; coluna < larguraDaVisao; coluna++) {
        const camera = 2 * (coluna + 0.5) / larguraDaVisao - 1;
        const inclinadoX = jogador.dx - jogador.dy * PLANO * camera;
        const inclinadoY = jogador.dy + jogador.dx * PLANO * camera;
        const tamanho = Math.hypot(inclinadoX, inclinadoY);
        const direcaoX = inclinadoX / tamanho;
        const direcaoY = inclinadoY / tamanho;
        const resultado = raiosDaTela[coluna] || (raiosDaTela[coluna] = criarResultado());   // o mesmo objeto, quadro a quadro
        percorrerAGrade(resultado, jogador.x, jogador.y, direcaoX, direcaoY, SEM_CRUZAMENTOS);   // sem o caminho: ninguém o lê
        const cosseno = jogador.dx * direcaoX + jogador.dy * direcaoY;

        resultado.perpendicular = resultado.distancia * cosseno;
        resultado.altura = k / resultado.perpendicular;
        resultado.u = posicaoNaFace(resultado, direcaoX, direcaoY);
    }

    raio = lancarRaio(jogador.x, jogador.y, jogador.dx, jogador.dy);   // com o caminho, para o H
    raio.perpendicular = raio.distancia;   // olhando reto não há desvio: o cosseno vale 1
    raio.altura = k / raio.perpendicular;
}

/*
  `u` é a posição do impacto ao longo da face, de 0 a 1, CRESCENDO para a direita de quem olha:
  é a coordenada x da textura. Numa face "x" a posição é o y do impacto; numa "y", o x. Quando a
  direita de quem olha é o sentido contrário ao dos números, a textura sairia espelhada: 1 - fração.
*/
function posicaoNaFace(resultado, direcaoX, direcaoY) {
    const ponto = resultado.lado === "x" ? resultado.y : resultado.x;
    const fracao = ponto - Math.floor(ponto);
    const espelhar = resultado.lado === "x" ? direcaoX < 0 : direcaoY > 0;
    return espelhar ? 1 - fracao : fracao;
}

/*
  Um raio de direção UNITÁRIA cruza uma linha vertical da grade a cada 1/|dx| de
  distância e uma horizontal a cada 1/|dy|. Cada eixo guarda a distância até a
  PRÓXIMA linha dele (`proximoX`, `proximoY`); a menor vence, e o raio entra na casa
  vizinha daquele lado. Nunca anda "no escuro": cada passo é uma casa, nenhuma é pulada.
  Tudo em variáveis simples: a busca roda 195 a 320 vezes por quadro e não cria objeto nenhum.
*/
const SEM_CRUZAMENTOS = Object.freeze([]);

// Um raio avulso (o do olhar, o dos testes): devolve um resultado novo.
// `registrar` guarda cada cruzamento (só o H os lê).
function lancarRaio(origemX, origemY, direcaoX, direcaoY, registrar = true) {
    return percorrerAGrade(criarResultado(), origemX, origemY, direcaoX, direcaoY, registrar ? [] : SEM_CRUZAMENTOS);
}

function criarResultado() {
    return { coluna: 0, linha: 0, lado: "x", distancia: 0, x: 0, y: 0, cruzamentos: SEM_CRUZAMENTOS };
}

// Para na primeira casa sólida; o mapa é fechado (e fora dele é parede), então sempre para.
// Preenche `resultado` no lugar: os raios da imagem reaproveitam os mesmos objetos, quadro a quadro.
function percorrerAGrade(resultado, origemX, origemY, direcaoX, direcaoY, cruzamentos) {
    const passoX = direcaoX < 0 ? -1 : 1;   // direção 0: paralelo, o passo não importa
    const passoY = direcaoY < 0 ? -1 : 1;
    const deltaX = direcaoX === 0 ? Infinity : Math.abs(1 / direcaoX);
    const deltaY = direcaoY === 0 ? Infinity : Math.abs(1 / direcaoY);
    let proximoX = direcaoX === 0 ? Infinity : (direcaoX < 0 ? origemX - Math.floor(origemX) : Math.floor(origemX) + 1 - origemX) * deltaX;
    let proximoY = direcaoY === 0 ? Infinity : (direcaoY < 0 ? origemY - Math.floor(origemY) : Math.floor(origemY) + 1 - origemY) * deltaY;
    let coluna = Math.floor(origemX);
    let linha = Math.floor(origemY);
    let lado = "x";
    let distancia = 0;

    while (!ehSolida(coluna, linha)) {
        if (proximoX < proximoY) {
            lado = "x";
            distancia = proximoX;
            proximoX += deltaX;
            coluna += passoX;
        } else {
            lado = "y";
            distancia = proximoY;
            proximoY += deltaY;
            linha += passoY;
        }
        if (cruzamentos !== SEM_CRUZAMENTOS) {
            cruzamentos.push({ x: origemX + direcaoX * distancia, y: origemY + direcaoY * distancia, lado, coluna, linha });
        }
    }
    resultado.coluna = coluna;
    resultado.linha = linha;
    resultado.lado = lado;
    resultado.distancia = distancia;
    resultado.x = origemX + direcaoX * distancia;
    resultado.y = origemY + direcaoY * distancia;
    resultado.cruzamentos = cruzamentos;
    return resultado;
}

// ---- 11. TAMANHO DA IMAGEM ---------------------------------
// Mede o que a página gasta fora do palco (título, leitura, botões, ajuda, espaços e margens).
function medirOResto() {
    const estilo = getComputedStyle(document.body);
    const espaco = parseFloat(estilo.rowGap) || 0;
    let total = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom);
    document.querySelectorAll("h1, #leitura, #controles, #ajuda").forEach(parte => {
        total += parte.offsetHeight + espaco;
    });
    return total;
}

// 320×200 na horizontal, 195×150 na vertical (dobrado dá 390×300). A escala é sempre inteira,
// para os pixels ficarem quadrados e nítidos (CSS: image-rendering: pixelated).
function ajustarVisao() {
    const retrato = window.innerHeight > window.innerWidth;
    larguraDaVisao = retrato ? 195 : 320;
    alturaDaVisao = retrato ? 150 : 200;
    visao.width = larguraDaVisao;   // mudar o tamanho de um canvas também o apaga, e zera o resto do estado
    visao.height = alturaDaVisao;
    pincelVisao.imageSmoothingEnabled = false;   // a técnica A não pode suavizar a fatia de 1 pixel
    imagem = pincelVisao.createImageData(larguraDaVisao, alturaDaVisao);
    pixels = new Uint32Array(imagem.data.buffer);
    fundo = criarFundo();

    // Cabe sem rolar: a imagem usa o que sobra depois das outras partes da página. A planta (H) tem o
    // mesmo limite, e o palco reserva a MAIOR das duas: alternar o H não mexe em nada.
    const alturaLivre = window.innerHeight - medirOResto();
    const escala = Math.max(1, Math.floor(Math.min(window.innerWidth / larguraDaVisao, alturaLivre / alturaDaVisao)));
    const larguraDaPlanta = Math.max(120, Math.min(tela.width, window.innerWidth - 32, (alturaLivre - 4) * tela.width / tela.height + 4));   // 4 = as duas bordas
    const alturaDaPlanta = (larguraDaPlanta - 4) * tela.height / tela.width + 4;   // 4 = as duas bordas
    visao.style.width = larguraDaVisao * escala + "px";
    tela.style.width = larguraDaPlanta + "px";
    palco.style.minHeight = Math.max(alturaDaVisao * escala, alturaDaPlanta) + "px";
    raiosDaTela = [];
}

window.addEventListener("resize", ajustarVisao);

// ---- 12. LOOP ----------------------------------------------
function quadroAQuadro(instanteAtual) {
    const tempo = Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05);
    instanteDoQuadroAnterior = instanteAtual;
    const inicio = performance.now();
    atualizar(tempo);
    desenhar();
    msAoVivo += (performance.now() - inicio - msAoVivo) * 0.05;   // média móvel: o número não pisca
    requestAnimationFrame(quadroAQuadro);
}

// O jogo só começa se o mapa e as texturas servem (o erro já foi dito no console).
if (verificarMapa() && verificarTexturas()) {
    prepararTexturas();
    colocarJogadorNoInicio();
    ajustarVisao();
    atualizarDirecao();
    atualizarRaios();
    medirAsTecnicas();
    requestAnimationFrame(quadroAQuadro);
}
