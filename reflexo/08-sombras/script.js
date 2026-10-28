/*
  REFLEXO — PASSO 8: SOMBRAS
  Criaturas que perseguem o zelador. Cada uma é uma MÁQUINA DE ESTADOS (nasce, ronda, persegue, recua,
  dissolve) e, perseguindo, desce o CAMPO DE DISTÂNCIA: uma busca em largura a partir do zelador, sobre a
  grade. Só o feixe as desfaz: meio segundo de luz. Tocar numa sombra tira uma vida. A luz nunca protege o
  zelador (GDD, seção 11): o corpo dele faz sombra no feixe, e perto dele nada queima.
*/

// ---- 1. CONSTANTES E A SALA --------------------------------
const TAMANHO_DA_CASA = 24;   // pixels de desenho por casa

const VELOCIDADE_DE_ANDAR = 3;     // casas por segundo
const VELOCIDADE_DE_GIRO = 2.5;    // radianos por segundo
const RAIO_DO_CORPO = 0.25;        // em casas: o zelador é um círculo
const CASAS_SOLIDAS = "#%DER";     // parede, pedra, porta fechada, emissor, receptor
const LIMITE_DE_QUIQUES = 8;       // GDD, seção 4.3: depois disso o feixe para no espelho
const ALCANCE_DO_ESPELHO = 1.5;    // casas: a que distância o botão "Espelho" alcança (GDD, seção 3)

// As sombras (GDD, seções 4.7 e 4.8). Tempos em segundos do JOGO (a soma dos `tempo` de cada quadro).
const VIDAS_INICIAIS = 3;
const SEGUNDOS_DE_INVULNERABILIDADE = 1.5;
const SEGUNDOS_PARA_DISSOLVER = 0.5;     // de luz: força o jogador a SEGURAR o feixe
const SEGUNDOS_DE_NASCIMENTO = 1;
const SEGUNDOS_DE_DISSOLUCAO = 0.4;
const SEGUNDOS_DE_RECUO = 1.5;
const RAIO_DE_PERCEPCAO = 8;             // passos do campo de distância: até aí a sombra "sente" o zelador
const PROPORCAO_DA_VELOCIDADE = 0.7;     // a sombra persegue a 70% do zelador
const VELOCIDADE_DA_RONDA = 1.2;         // casas por segundo
const RAIO_DA_SOMBRA = 0.25;             // o contato é corpo com corpo: RAIO_DO_CORPO + RAIO_DA_SOMBRA
const RAIO_DA_LUZ = 0.5;                 // a luz ocupa a casa inteira: meia casa de cada lado do feixe
const PENUMBRA_DO_ZELADOR = 1;           // casas ao redor do zelador onde a luz não queima: o corpo faz sombra (seção 5)
const PONTOS_POR_RECEPTOR = 100;
const PONTOS_POR_SOMBRA = 50;
const SOMBRAS = { max: 2, intervalo: 12, primeira: 2 };   // dados da fase: quantas, de quanto em quanto tempo
const SIMBOLO_DO_ESTADO = { nasce: "+", ronda: "~", persegue: "!", recua: "<", dissolve: "*" };   // na planta (H)

// Legenda: # tijolo · % pedra · . chão · E emissor · R receptor · / \ espelhos · D porta · S fenda de sombra · X saída · J início
// As bordas são sempre parede. Na string, a barra invertida vale duas ("\\").
const MAPA_EM_TEXTO = [
    "################",
    "#J...#........S#",
    "#..\\.R.%%...%%.#",
    "#.%..#.........#",
    "#....D.........#",
    "#E.\\.#.........#",
    "#....#...%%....#",
    "#....#.........#",
    "#../.#...%%....#",
    "#...S#.........#",
    "#....#......X..#",
    "################"
];

// Emissores e portas são DADOS ao lado do mapa (as fases do final serão assim): o emissor sai do centro da
// casa, na direção (dx, dy) de um eixo; a porta abre quando TODOS os seus receptores estão acesos.
const EMISSORES = [{ coluna: 1, linha: 5, dx: 1, dy: 0 }];
const PORTAS = [{ coluna: 5, linha: 4, receptores: [{ coluna: 5, linha: 2 }] }];

const COLUNAS = MAPA_EM_TEXTO[0].length;   // 16, deduzido, não digitado
const LINHAS = MAPA_EM_TEXTO.length;       // 12
const COR_CHAO = "#14141f";
const COR_SIMBOLO = "#ffd84d";
const COR_FEIXE = "#bbffff";
// Na planta as letras amarelas precisam de 4,5:1 de contraste (GDD, seção 7): D, E e R são escuros.
const COR_NA_PLANTA = { "#": "#964632", "%": "#5a6478", D: "#54410f", E: "#15434d", R: "#55296a" };
const CAMPO_DE_VISAO = 66 * Math.PI / 180;       // o padrão do GDD (50° a 90° nas opções do final)
const PLANO = Math.tan(CAMPO_DE_VISAO / 2);      // metade do plano da câmera, a 1 casa do olho
const SEM_ANIMACAO = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- 2. TEXTURAS E SPRITES COMO TEXTO ----------------------
// Cada letra é uma cor da paleta; cada arte são 16 linhas de 16 letras. Nos sprites, o ponto (.) é transparente.
const TAMANHO_DA_TEXTURA = 16;
const PALETA_DAS_TEXTURAS = {
    a: "#964632", b: "#b05a40", c: "#4a3c3c", d: "#7a3626",   // tijolo, claro, argamassa, sombra
    p: "#5a6478", q: "#707c96", r: "#434b5c",                 // pedra, clara, escura
    g: "#a8842e", h: "#775c1e", i: "#2c2c3c", o: "#c9c9d6",   // madeira, escura, ferro, rebite
    j: "#2e7d8a", k: "#1c5560", l: "#bbffff",                 // emissor, escuro, luz
    m: "#8a4aa8", n: "#4e2a64",                               // receptor, escuro
    s: "#783ebe", t: "#4a2478", y: "#ffe14d"                  // sombra, contorno dela, o brilho
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
    // receptor apagado: um anel com o centro vazio (i). O aceso (Ra) é este com o centro cheio de luz.
    R: [
        "rrrrrrrrrrrrrrrr",
        "rrrrrrrrrrrrrrrr",
        "rrrrrmmmmmmrrrrr",
        "rrrrmmmmmmmmrrrr",
        "rrrmmniiiinmmrrr",
        "rrmmniiiiiinmmrr",
        "rrmmniiiiiinmmrr",
        "rrmmniiiiiinmmrr",
        "rrmmniiiiiinmmrr",
        "rrmmniiiiiinmmrr",
        "rrmmniiiiiinmmrr",
        "rrrmmniiiinmmrrr",
        "rrrrmmmmmmmmrrrr",
        "rrrrrmmmmmmrrrrr",
        "rrrrrrrrrrrrrrrr",
        "rrrrrrrrrrrrrrrr"
    ]
};
TEXTURAS_EM_TEXTO.Ra = TEXTURAS_EM_TEXTO.R.map(linha => linha.replaceAll("i", "l"));   // aceso: o oco vira luz

// O catálogo e a lista de objetos são DADOS (passo 6). A sombra é uma língua de escuro: uma chama inclinada, de
// ponta fina, com fagulhas soltas. Sem saia e sem par de olhos, só um brilho: a silhueta é o que a distingue
// (GDD, seção 7). As sombras vivas não estão em OBJETOS: são a lista `sombras`, que muda a cada quadro.
const CATALOGO_DE_SPRITES = {
    sombra: {
        tamanho: 0.8, elevacao: 0, cor: "#b07cf0", arte: [
            "..........tt....",
            "..........tst...",
            ".........tssst..",
            "...t.....tsst...",
            "........tssst...",
            "........tsst....",
            ".......tssst....",
            ".......tssyst...",
            "......tsssnsst..",
            "......tssnnnst..",
            "......tssnnst...",
            "......tssssst...",
            "....t..tssst....",
            "........tsst....",
            ".........tt.....",
            "..t.......t....."
        ]
    },
    cristal: {
        tamanho: 0.5, elevacao: 0.2, cor: "#bbffff", arte: [
            "................",
            ".......kk.......",
            "......kllk......",
            "......kllk......",
            ".....kjlljk.....",
            "....kjjlljjk....",
            "...kjjjlljjjk...",
            "..kjjjjlljjjjk..",
            "..kjjjjlljjjjk..",
            "...kjjjlljjjk...",
            "....kjjllkkk....",
            ".....kjllkk.....",
            "......kllk......",
            "......kllk......",
            ".......kk.......",
            "................"
        ]
    }
};
const OBJETOS = [{ tipo: "cristal", x: 12.5, y: 10.5 }];
const PROFUNDIDADE_MINIMA = 0.2;   // casas: mais perto que isso (ou atrás) o sprite é descartado

// Névoa: 32 níveis, cada textura já sombreada UMA vez, na carga (GDD, seção 6).
const NIVEIS_DE_NEVOA = 32;
const DISTANCIA_DA_NEVOA = 10;   // casas: daí em diante a parede some na cor da névoa
const ESCURO_DO_LADO_Y = 5;      // níveis extras nas faces y: a "luz" barata do passo 4, agora na névoa
const COR_DO_HORIZONTE = [10, 10, 18];
const COR_DA_NEVOA = COR_DO_HORIZONTE;   // a MESMA cor: parede, espelho e sprite enevoados somem no horizonte
const COR_DO_TETO_ALTO = [4, 4, 9];
const COR_DO_PISO_BAIXO = [38, 38, 56];
const TRANSPARENTE = 0;          // pixel de alfa 0: o sprite não o escreve

// Espelho e feixe são planos finos (GDD, seção 4.4). O feixe brilha, então não leva névoa.
const ALTURA_DO_ESPELHO = 0.85;      // em paredes; o espelho fica em pé no chão
const ESPESSURA_DO_FEIXE = 0.1;      // em paredes, na altura dos olhos
const PULSOS_POR_CASA = 2;           // faixas claras e escuras ao longo do feixe: a forma, não só a cor
const VELOCIDADE_DOS_PULSOS = 2;     // casas por segundo; parada com prefers-reduced-motion
const CORES_DO_FEIXE = [empacotar([187, 255, 255]), empacotar([60, 170, 190])];   // pulso claro e escuro
const COR_DO_ALVO = empacotar(corEmNumeros(COR_SIMBOLO));   // moldura amarela do espelho ao alcance
const OBSTACULOS_DO_FEIXE = CASAS_SOLIDAS + "/\\";   // o feixe para em tudo isso; a porta sempre conta

// ---- 3. DOM E ESTADO ---------------------------------------
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const aviso = document.getElementById("aviso");
const visao = document.getElementById("visao");
const pincelVisao = visao.getContext("2d");
const palco = document.getElementById("palco");

// A SALA é imutável: um objeto congelado com as linhas do mapa (strings não mudam). Girar um espelho cria
// OUTRA sala; `salaInicial` é a cópia congelada de onde "reiniciar" volta. O que muda no jogo é só quem
// aponta para elas (`sala`) e o que se calcula DELAS (`luz`, `portasAbertas`).
let salaInicial = null;
let sala = null;
let luz = null;                       // o feixe, calculado da sala: segmentos, quiques, fins, casas, acesos
const portasAbertas = new Set();      // índices das casas das portas que estão abertas agora
let alvo = null;                      // o espelho ao alcance, à frente: { coluna, linha, distancia } ou null
let saidaAlcancada = false;

// As sombras, as vidas e o campo de distância. `sombras` é a lista viva: { tipo, x, y, estado, ... } (seção 9).
let sombras = [];
let vidas = VIDAS_INICIAIS;
let pontos = 0;
let fimDeJogo = false;
let tempoDeJogo = 0;                  // segundos de jogo: só passa quando o jogo anda
let invulneravelAte = 0;
let proximoNascimento = SOMBRAS.primeira;
let nascidasNaSala = 0;               // a primeira nasce onde o campo alcança (seção 2); depois, qualquer fenda
const receptoresPontuados = new Set();
const campoDeDistancia = new Int16Array(COLUNAS * LINHAS).fill(-1);   // passos até o zelador; -1 = não chega
const filaDaBusca = new Int16Array(campoDeDistancia.length);
let casaDoCampo = -1;                 // a casa do zelador de que o campo foi calculado
let versaoDasPortas = 0;              // sobe quando uma porta abre ou fecha: o campo depende delas
let versaoDoCampo = -1;
let ultimoTempoDeQuadro = 0;          // ms do último quadro, atualizar + desenhar (a medição de celular lê isto)
const resultadoDoAlvo = { coluna: 0, linha: 0, lado: "x", distancia: 0, x: 0, y: 0, cruzamentos: [] };

// x e y em CASAS (1,5 = meio da casa 1), não em pixels. `angulo` em radianos:
// 0 = direita; como y desce, π/2 = para baixo. dx e dy são o vetor DIREÇÃO.
const jogador = { x: 0, y: 0, angulo: 0.8, dx: 0, dy: 0 };

// Um resultado de raio por coluna da imagem, reaproveitado a cada quadro: casa batida, lado, distância,
// distância perpendicular, altura, `u` (onde, ao longo da face, o raio bateu) e a direção do raio.
let raiosDaTela = [];

// O z-buffer: a distância perpendicular da parede (ou do espelho) em cada coluna.
let zBuffer = new Float64Array(0);
let espelhoNaColuna = [];                 // coluna → o espelho que aparece nela (ou null)
let uDoEspelho = new Float64Array(0);     // coluna → onde, ao longo do espelho, o raio bateu
let profundidadeDoSprite = new Float64Array(0);   // coluna → profundidade do sprite que cobre a altura dos olhos (Infinity = nenhum)
let uDoPlano = 0;                         // segundo resultado de distanciaAoPlano
let spritesDaTela = [];                   // sprites na frente do olho, do mais longe ao mais perto

// A resolução interna é baixa de propósito; o navegador amplia por um número INTEIRO (seção 11).
let larguraDaVisao = 320;
let alturaDaVisao = 200;

// O ImageData e o Uint32Array por cima dele (1 número = 1 pixel). `fundo` é teto e piso prontos.
let imagem = null;
let pixels = null;
let fundo = null;

const texturasSombreadas = {};   // símbolo → 32 Uint32Array de 256 pixels, um por nível de névoa
const spritesSombreados = {};    // tipo → 32 Uint32Array de 256 pixels (0 = transparente)
let prataSombreada = [];         // [listra] → 32 cores; o espelho e a moldura dele
let molduraSombreada = [];
let msAoVivo = 0;

let depuracaoLigada = false;
let instanteDoQuadroAnterior = 0;
let instanteDoQuadro = 0;

// ---- 4. CONFERIR OS DADOS, MONTAR A SALA -------------------
// Dado errado não dá erro: dá um desenho torto longe da causa. Devolvem se servem.
function simboloNoTexto(coluna, linha) {
    return MAPA_EM_TEXTO[linha] && MAPA_EM_TEXTO[linha][coluna];
}

function verificarMapa() {
    const inicios = MAPA_EM_TEXTO.join("").split("J").length - 1;
    const bordasFechadas = MAPA_EM_TEXTO.every((linha, i) => linha.length === COLUNAS
        && (i === 0 || i === LINHAS - 1 ? /^#+$/.test(linha) : /^#.*#$/.test(linha)));
    const emissoresNoLugar = EMISSORES.every(({ coluna, linha }) => simboloNoTexto(coluna, linha) === "E");
    const portasNoLugar = PORTAS.every(porta => simboloNoTexto(porta.coluna, porta.linha) === "D"
        && porta.receptores.every(({ coluna, linha }) => simboloNoTexto(coluna, linha) === "R"));
    const fendas = MAPA_EM_TEXTO.join("").split("S").length - 1;
    const valido = inicios === 1 && bordasFechadas && emissoresNoLugar && portasNoLugar && (SOMBRAS.max === 0 || fendas > 0);

    if (!valido) {
        console.error(`Mapa inválido: ${inicios} jogadores (esperado 1), bordas fechadas: ${bordasFechadas}, emissores no E: ${emissoresNoLugar}, portas no D e receptores no R: ${portasNoLugar}, fendas S: ${fendas}. O jogo não começa.`);
    }
    return valido;
}

function verificarArtes() {
    const defeitos = [];
    const conferirTabela = (tabela, transparenteVale) => Object.entries(tabela).forEach(([nome, arte]) => {
        const linhas = Array.isArray(arte) ? arte : arte.arte;
        const letraInvalida = letra => PALETA_DAS_TEXTURAS[letra] === undefined && !(transparenteVale && letra === ".");
        if (linhas.length !== TAMANHO_DA_TEXTURA || linhas.some(linha => linha.length !== TAMANHO_DA_TEXTURA || [...linha].some(letraInvalida))) {
            defeitos.push(nome);
        }
    });
    conferirTabela(TEXTURAS_EM_TEXTO, false);
    conferirTabela(CATALOGO_DE_SPRITES, true);
    defeitos.forEach(nome => console.error(`Arte "${nome}" inválida: precisa de 16 linhas de 16 letras da paleta.`));
    return defeitos.length === 0 && OBJETOS.every(objeto => CATALOGO_DE_SPRITES[objeto.tipo] !== undefined);
}

// A sala nasce do texto, sem o J (embaixo dele é chão), e é congelada. O J só diz onde o zelador começa.
function congelar(celulas) {
    return Object.freeze({ celulas: Object.freeze(celulas.slice()) });
}

function prepararSala() {
    salaInicial = congelar(MAPA_EM_TEXTO.map(linha => linha.replace("J", ".")));
    sala = salaInicial;
    colocarJogadorNoInicio();
}

function colocarJogadorNoInicio() {
    const linha = MAPA_EM_TEXTO.findIndex(texto => texto.includes("J"));
    jogador.x = MAPA_EM_TEXTO[linha].indexOf("J") + 0.5;
    jogador.y = linha + 0.5;
    jogador.angulo = 0.8;
    atualizarDirecao();
}

// A direção nunca é guardada à mão: sai do ângulo, sempre de tamanho 1.
function atualizarDirecao() {
    jogador.dx = Math.cos(jogador.angulo);
    jogador.dy = Math.sin(jogador.angulo);
}

function celulaDe(coluna, linha) {
    return sala.celulas[linha] && sala.celulas[linha][coluna];   // fora do mapa: undefined
}

function indiceDaCasa(coluna, linha) {
    return linha * COLUNAS + coluna;
}

function ehEspelho(coluna, linha) {
    const simbolo = celulaDe(coluna, linha);
    return simbolo === "/" || simbolo === "\\";
}

// ---- 5. PREPARAR AS ARTES (UMA VEZ, NA CARGA) --------------------
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

// Uma cor só, em 32 versões, uma por nível de névoa.
function degradeDaNevoa(cor) {
    return Array.from({ length: NIVEIS_DE_NEVOA }, (_, nivel) => empacotar(misturar(cor, COR_DA_NEVOA, nivel / (NIVEIS_DE_NEVOA - 1))));
}

// Cada arte vira 32 versões. O ponto (.) vira o pixel transparente.
function sombrearEmNiveis(linhas) {
    const cores = [...linhas.join("")].map(letra => letra === "." ? null : corEmNumeros(PALETA_DAS_TEXTURAS[letra]));
    return Array.from({ length: NIVEIS_DE_NEVOA }, (_, nivel) =>
        Uint32Array.from(cores, cor => cor === null ? TRANSPARENTE : empacotar(misturar(cor, COR_DA_NEVOA, nivel / (NIVEIS_DE_NEVOA - 1)))));
}

function prepararArtes() {
    Object.entries(TEXTURAS_EM_TEXTO).forEach(([simbolo, linhas]) => {
        texturasSombreadas[simbolo] = sombrearEmNiveis(linhas);
    });
    Object.entries(CATALOGO_DE_SPRITES).forEach(([tipo, { arte }]) => {
        spritesSombreados[tipo] = sombrearEmNiveis(arte);
    });
    prataSombreada = [degradeDaNevoa([201, 201, 214]), degradeDaNevoa([150, 154, 176])];   // duas listras de brilho
    molduraSombreada = degradeDaNevoa([44, 44, 60]);
}

// ---- 6. DESENHAR: A IMAGEM E A PLANTA ----------------------
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
    leitura.textContent = depuracaoLigada ? montarLeitura() : montarPainel();
}

// Copia o fundo, escreve as paredes, os espelhos, os sprites e, por último, o feixe; envia tudo de uma vez.
function desenharVisao() {
    pixels.set(fundo);
    raiosDaTela.forEach(desenharColuna);
    espelhoNaColuna.forEach((espelho, coluna) => espelho !== null && desenharEspelhoNaColuna(espelho, coluna));
    profundidadeDoSprite.fill(Infinity);
    spritesDaTela.forEach(desenharSprite);
    luz.segmentos.forEach(desenharFeixe);
    pincelVisao.putImageData(imagem, 0, 0);
}

// Quanto mais longe, mais névoa; a face y ganha níveis extras. O nível escolhe a arte já sombreada.
function nivelDeNevoa(umRaio) {
    return Math.min(NIVEIS_DE_NEVOA - 1, nivelDaDistancia(umRaio.perpendicular) + (umRaio.lado === "y" ? ESCURO_DO_LADO_Y : 0));
}

function nivelDaDistancia(distancia) {
    return Math.min(NIVEIS_DE_NEVOA - 1, Math.floor(distancia / DISTANCIA_DA_NEVOA * (NIVEIS_DE_NEVOA - 1)));
}

function colunaDaTextura(umRaio) {
    return Math.min(TAMANHO_DA_TEXTURA - 1, Math.floor(umRaio.u * TAMANHO_DA_TEXTURA));
}

// O receptor aceso tem outra textura (Ra): o anel cheio de luz, não só outra cor (GDD, seção 7).
function chaveDaTextura(coluna, linha) {
    const simbolo = celulaDe(coluna, linha);
    return simbolo === "R" && luz.acesos.has(indiceDaCasa(coluna, linha)) ? "Ra" : simbolo;
}

// Os pixels cujo CENTRO cai dentro da parede; a linha da textura de cada um avança `passo` por pixel.
function desenharColuna(umRaio, coluna) {
    const textura = texturasSombreadas[chaveDaTextura(umRaio.coluna, umRaio.linha)][nivelDeNevoa(umRaio)];
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

// Só as colunas que passaram no z-buffer (sprite.colunas). O pixel 0 é transparente: não escreve.
function desenharSprite(sprite) {
    const arte = spritesSombreados[sprite.tipo][nivelDaDistancia(sprite.profundidade)];
    const lado = sprite.base - sprite.topo;
    const primeiraLinha = Math.max(0, Math.ceil(sprite.topo - 0.5));
    const fimDasLinhas = Math.min(alturaDaVisao, Math.ceil(sprite.base - 0.5));
    const olhos = linhaDosOlhos();

    sprite.colunas.forEach(coluna => {
        const colunaDaArte = Math.min(TAMANHO_DA_TEXTURA - 1, Math.floor((coluna + 0.5 - sprite.esquerda) / lado * TAMANHO_DA_TEXTURA));
        for (let linha = primeiraLinha; linha < fimDasLinhas; linha++) {
            const linhaDaArte = Math.min(TAMANHO_DA_TEXTURA - 1, Math.floor((linha + 0.5 - sprite.topo) / lado * TAMANHO_DA_TEXTURA));
            const pixel = arte[linhaDaArte * TAMANHO_DA_TEXTURA + colunaDaArte];
            if (pixel !== TRANSPARENTE) {
                pixels[linha * larguraDaVisao + coluna] = pixel;
                if (linha === olhos) {
                    profundidadeDoSprite[coluna] = sprite.profundidade;   // do mais longe ao mais perto: o último é o da frente
                }
            }
        }
    });
}

function linhaDosOlhos() {
    return Math.round(alturaDaVisao / 2);
}

/*
  ESPELHO E FEIXE SÃO PLANOS FINOS. Na planta, cada um é um segmento de reta; na imagem, cada coluna é um
  raio. A interseção raio × segmento resolve-se com o produto vetorial (cruzado):
      P + t·r = S0 + u·e   →   t = cruz(a, e) / cruz(r, e),   u = cruz(a, r) / cruz(r, e)     (a = S0 − P)
  `t` é a distância ao longo do raio (multiplicada pelo cosseno, vira a perpendicular do z-buffer) e `u`, de 0 a 1,
  a posição ao longo do segmento. Vale se t > 0 e 0 ≤ u ≤ 1. Devolve Infinity se o raio não cruza.
*/
function distanciaAoPlano(plano, umRaio) {
    const ex = plano.x1 - plano.x0;
    const ey = plano.y1 - plano.y0;
    const denominador = umRaio.direcaoX * ey - umRaio.direcaoY * ex;
    if (denominador === 0) {
        return Infinity;   // paralelo
    }
    const ax = plano.x0 - jogador.x;
    const ay = plano.y0 - jogador.y;
    const t = (ax * ey - ay * ex) / denominador;
    const u = (ax * umRaio.direcaoY - ay * umRaio.direcaoX) / denominador;
    const perpendicular = t * umRaio.cosseno;
    if (u < 0 || u > 1 || perpendicular < PROFUNDIDADE_MINIMA) {
        return Infinity;
    }
    uDoPlano = u;
    return perpendicular;
}

function pixelsPorCasa(distancia) {
    return larguraDaVisao / (2 * PLANO) / distancia;   // k / distância: a altura de uma parede de 1 casa
}

// O espelho que aparece em cada coluna entra no z-buffer: o que está atrás dele (sprite) fica escondido.
function registrarEspelhosNaTela() {
    espelhoNaColuna.fill(null);
    luz.espelhos.forEach(espelho => {
        for (let coluna = 0; coluna < larguraDaVisao; coluna++) {
            const distancia = distanciaAoPlano(espelho, raiosDaTela[coluna]);
            if (distancia < zBuffer[coluna]) {
                zBuffer[coluna] = distancia;
                espelhoNaColuna[coluna] = espelho;
                uDoEspelho[coluna] = uDoPlano;
            }
        }
    });
}

// Faixa alta prateada, em pé no chão, com moldura escura nas pontas, em cima e embaixo. O alvo ganha moldura amarela.
function desenharEspelhoNaColuna(espelho, coluna) {
    const distancia = zBuffer[coluna];
    const altura = pixelsPorCasa(distancia);
    const base = (alturaDaVisao + altura) / 2;
    const topo = Math.max(0, Math.ceil(base - ALTURA_DO_ESPELHO * altura - 0.5));
    const fim = Math.min(alturaDaVisao, Math.ceil(base - 0.5));
    const nivel = nivelDaDistancia(distancia);
    const u = uDoEspelho[coluna];
    const ehAlvo = alvo !== null && alvo.coluna === espelho.coluna && alvo.linha === espelho.linha;
    const corDaMoldura = ehAlvo ? COR_DO_ALVO : molduraSombreada[nivel];
    const corDaPrata = prataSombreada[Math.floor(u * 6) % 2][nivel];

    for (let linha = topo; linha < fim; linha++) {
        const naMoldura = u < 0.08 || u > 0.92 || linha === topo || linha === fim - 1;
        pixels[linha * larguraDaVisao + coluna] = naMoldura ? corDaMoldura : corDaPrata;
    }
}

// Uma faixa fina na altura dos olhos, em pulsos claros e escuros ao longo do comprimento. Só aparece onde está
// mais perto que a parede, o espelho e o sprite dessa coluna (z-buffer); não entra no z-buffer, é luz.
function desenharFeixe(segmento) {
    const fase = SEM_ANIMACAO ? 0 : instanteDoQuadro / 1000 * VELOCIDADE_DOS_PULSOS;
    const olhos = linhaDosOlhos();

    for (let coluna = 0; coluna < larguraDaVisao; coluna++) {
        const distancia = distanciaAoPlano(segmento, raiosDaTela[coluna]);
        if (distancia >= zBuffer[coluna] || distancia >= profundidadeDoSprite[coluna]) {
            continue;
        }
        const metade = Math.max(1, Math.round(ESPESSURA_DO_FEIXE * pixelsPorCasa(distancia) / 2));
        const pulso = Math.floor((uDoPlano * segmento.comprimento - fase) * PULSOS_POR_CASA) & 1;
        const cor = CORES_DO_FEIXE[pulso];
        for (let linha = Math.max(0, olhos - metade); linha < Math.min(alturaDaVisao, olhos + metade); linha++) {
            pixels[linha * larguraDaVisao + coluna] = cor;
        }
    }
}

// A planta do H: a grade, o caminho da luz, os receptores (anel = aceso), o espelho alvo e o zelador.
function desenharPlanta() {
    desenharCasas();
    desenharCampo();
    desenharLuzNaPlanta();
    desenharObjetos();
    desenharSombras();
    desenharSombraDoZelador();
    desenharJogador();
}

// O corpo faz sombra (só com o zelador na luz): o círculo de 1 casa onde ela não queima, e o trecho do feixe que ele deixa no escuro.
function desenharSombraDoZelador() {
    if (!zeladorEstaNaLuz()) {
        return;
    }
    pincel.strokeStyle = "rgba(255, 255, 255, 0.5)";
    pincel.lineWidth = 0.04;
    pincel.setLineDash([0.15, 0.15]);
    pincel.beginPath();
    pincel.arc(jogador.x, jogador.y, PENUMBRA_DO_ZELADOR, 0, Math.PI * 2);
    pincel.stroke();
    pincel.setLineDash([]);

    pincel.strokeStyle = "#14141f";
    pincel.lineWidth = 0.14;
    pincel.beginPath();
    cortarOFeixeNoCorpo().apagados.forEach(trecho => {
        pincel.moveTo(trecho.x0, trecho.y0);
        pincel.lineTo(trecho.x1, trecho.y1);
    });
    pincel.stroke();
}

// O invisível: o campo de distância, em passos até o zelador, em cada casa que a busca alcançou.
function desenharCampo() {
    pincel.font = "bold 0.4px 'Courier New', monospace";
    pincel.fillStyle = "rgba(232, 236, 255, 0.55)";
    campoDeDistancia.forEach((passos, indice) => {
        if (passos >= 0) {
            pincel.fillText(passos, indice % COLUNAS + 0.5, Math.floor(indice / COLUNAS) + 0.8);
        }
    });
    pincel.font = "bold 0.7px 'Courier New', monospace";
}

// A sombra é um círculo roxo com o símbolo do estado dentro: a forma e a letra, não só a cor.
function desenharSombras() {
    sombras.forEach(sombra => {
        pincel.fillStyle = CATALOGO_DE_SPRITES.sombra.cor;
        pincel.beginPath();
        pincel.arc(sombra.x, sombra.y, 0.3, 0, Math.PI * 2);
        pincel.fill();
        pincel.fillStyle = "#08080e";
        pincel.fillText(SIMBOLO_DO_ESTADO[sombra.estado], sombra.x, sombra.y + 0.04);
    });
}

function desenharCasas() {
    pincel.font = "bold 0.7px 'Courier New', monospace";
    pincel.textAlign = "center";
    pincel.textBaseline = "middle";
    pincel.strokeStyle = "rgba(255, 255, 255, 0.25)";   // a grade do H
    pincel.lineWidth = 0.04;

    sala.celulas.forEach((linha, y) => [...linha].forEach((simbolo, x) => {
        const portaAberta = simbolo === "D" && portasAbertas.has(indiceDaCasa(x, y));
        pincel.fillStyle = portaAberta ? COR_CHAO : COR_NA_PLANTA[simbolo] || COR_CHAO;
        pincel.fillRect(x, y, 1, 1);
        pincel.strokeRect(x, y, 1, 1);
        if ("ER/\\DSX".includes(simbolo)) {
            pincel.fillStyle = COR_SIMBOLO;
            pincel.fillText(portaAberta ? "d" : simbolo, x + 0.5, y + 0.5);   // porta aberta: d minúsculo
        }
    }));
}

function desenharLuzNaPlanta() {
    pincel.fillStyle = "rgba(187, 255, 255, 0.16)";   // as casas iluminadas
    luz.casas.forEach(indice => pincel.fillRect(indice % COLUNAS, Math.floor(indice / COLUNAS), 1, 1));

    pincel.strokeStyle = COR_FEIXE;
    pincel.lineWidth = 0.1;
    pincel.beginPath();
    luz.segmentos.forEach(segmento => {
        pincel.moveTo(segmento.x0, segmento.y0);
        pincel.lineTo(segmento.x1, segmento.y1);
    });
    pincel.stroke();

    luz.acesos.forEach(indice => {   // anel ao redor do receptor aceso
        pincel.beginPath();
        pincel.arc(indice % COLUNAS + 0.5, Math.floor(indice / COLUNAS) + 0.5, 0.46, 0, Math.PI * 2);
        pincel.stroke();
    });

    if (alvo !== null) {
        pincel.strokeStyle = COR_SIMBOLO;
        pincel.lineWidth = 0.08;
        pincel.strokeRect(alvo.coluna + 0.05, alvo.linha + 0.05, 0.9, 0.9);
    }
}

function desenharObjetos() {
    OBJETOS.forEach(objeto => {
        pincel.beginPath();
        pincel.moveTo(objeto.x, objeto.y - 0.28);
        pincel.lineTo(objeto.x + 0.22, objeto.y);
        pincel.lineTo(objeto.x, objeto.y + 0.28);
        pincel.lineTo(objeto.x - 0.22, objeto.y);
        pincel.closePath();
        pincel.fillStyle = CATALOGO_DE_SPRITES[objeto.tipo].cor;
        pincel.fill();
    });
}

function desenharJogador() {
    pincel.fillStyle = pincel.strokeStyle = COR_FEIXE;
    pincel.beginPath();
    pincel.arc(jogador.x, jogador.y, RAIO_DO_CORPO, 0, Math.PI * 2);
    pincel.fill();
    pincel.lineWidth = 0.08;
    pincel.beginPath();
    pincel.moveTo(jogador.x, jogador.y);
    pincel.lineTo(jogador.x + jogador.dx * 0.6, jogador.y + jogador.dy * 0.6);   // para onde o zelador olha
    pincel.stroke();
}

function contarReceptores() {
    return sala.celulas.join("").split("R").length - 1;
}

// O painel de sempre (H desligado): vidas (ícones E número), o quebra-cabeça e uma dica. Linhas curtas (até 40 letras).
function montarPainel() {
    const dica = fimDeJogo ? "Fim de jogo: R recomeça"
        : saidaAlcancada ? "Saída alcançada!"
        : tempoDeJogo < invulneravelAte ? "Invulnerável por um instante"
        : alvo !== null ? "Espelho à frente: E ou Espaço gira" : "Chegue perto de um espelho";
    return `Vidas ${"♥".repeat(vidas)} ${vidas} · Pontos ${pontos}\n`
        + `Receptores ${luz.acesos.size}/${contarReceptores()} · Portas ${portasAbertas.size}/${PORTAS.length} · Sombras ${sombras.length}\n`
        + dica;
}

function contarSombrasPorEstado() {
    const contagem = {};
    sombras.forEach(sombra => { contagem[sombra.estado] = (contagem[sombra.estado] || 0) + 1; });
    return Object.entries(contagem).map(([estado, quantas]) => `${estado} ${quantas}`).join(" · ") || "nenhuma";
}

function sombraMaisPerto() {
    const passos = sombras.map(sombra => campoDeDistancia[indiceDaCasa(Math.floor(sombra.x), Math.floor(sombra.y))]).filter(valor => valor >= 0);
    return passos.length === 0 ? null : Math.min(...passos);
}

// Linhas curtas (até 40 letras): a leitura não pode passar da largura de um celular.
function montarLeitura() {
    const { x, y } = jogador;
    const alcancadas = campoDeDistancia.filter(passos => passos >= 0).length;
    const perto = sombraMaisPerto();
    return `casa (${Math.floor(x)}, ${Math.floor(y)})  pos (${x.toFixed(2)}, ${y.toFixed(2)})\n`
        + `feixe: ${luz.segmentos.length} trechos · ${luz.quiques.length} quiques · luz em ${luz.casas.size}\n`
        + `sombras: ${contarSombrasPorEstado()}\n`
        + `campo: ${alcancadas} casas · ${perto === null ? "sem sombra" : "sombra a " + perto}\n`
        + `vidas ${vidas} · pontos ${pontos} · ${tempoDeJogo < invulneravelAte ? "invulnerável" : "vulnerável"}\n`
        + `agora: ${msAoVivo.toFixed(2)} ms de 16.7 (${larguraDaVisao}×${alturaDaVisao})`;
}

// Avisos para o leitor de tela (aria-live): "Porta aberta", "Espelho girado". Dois avisos no mesmo instante fariam o
// leitor ler só o último, e o mesmo texto de novo não muda nada para ele. Então os avisos entram numa FILA: um por
// vez, com um intervalo entre eles, e o painel fica vazio no intervalo (assim um texto repetido é um aviso novo).
const MS_ENTRE_AVISOS = 1000;
const MAXIMO_NA_FILA_DE_AVISOS = 4;   // E apertado sem parar não enche a fila de recados velhos
const filaDeAvisos = [];
let avisoEmLeitura = false;

function avisar(texto) {
    if (aviso === null) {
        return;
    }
    if (avisoEmLeitura) {
        filaDeAvisos.push(texto);
        filaDeAvisos.splice(0, filaDeAvisos.length - MAXIMO_NA_FILA_DE_AVISOS);
        return;
    }
    avisoEmLeitura = true;
    aviso.textContent = texto;
    setTimeout(liberarOAviso, MS_ENTRE_AVISOS);
}

function liberarOAviso() {
    aviso.textContent = "";
    if (filaDeAvisos.length === 0) {
        avisoEmLeitura = false;
        return;
    }
    setTimeout(() => {   // o vazio precisa chegar ao leitor antes do próximo texto
        avisoEmLeitura = false;
        avisar(filaDeAvisos.shift());
    }, 50);
}

// ---- 7. OBJETOS NO ESPAÇO DA CÂMERA ------------------------
/*
  Mundo → câmera é a rotação INVERSA do olhar (passo 6): profundidade = quanto à frente, lateral = quanto à
  direita; a coluna do centro do sprite é lateral / (profundidade × PLANO) na escala -1…+1 do passo 4.
*/
function projetarObjetos() {
    spritesDaTela = OBJETOS.concat(sombras).map(projetarObjeto)
        .filter(sprite => sprite !== null)
        .sort((umSprite, outro) => outro.profundidade - umSprite.profundidade);   // o mais longe primeiro
}

function projetarObjeto(objeto) {
    const paraOObjetoX = objeto.x - jogador.x;
    const paraOObjetoY = objeto.y - jogador.y;
    const profundidade = paraOObjetoX * jogador.dx + paraOObjetoY * jogador.dy;
    if (profundidade < PROFUNDIDADE_MINIMA) {
        return null;   // atrás do olho, ou tão perto que a conta explodiria
    }

    const { tamanho, elevacao } = CATALOGO_DE_SPRITES[objeto.tipo];
    const lateral = -paraOObjetoX * jogador.dy + paraOObjetoY * jogador.dx;
    const alturaDeUmaCasa = pixelsPorCasa(profundidade);
    const centro = larguraDaVisao / 2 + lateral * alturaDeUmaCasa;
    const lado = tamanho * (objeto.escala || 1) * alturaDeUmaCasa;   // a sombra nasce e se dissolve mudando de tamanho
    const base = (alturaDaVisao + alturaDeUmaCasa) / 2 - elevacao * alturaDeUmaCasa;   // o chão fica na base da parede

    const sprite = { objeto, tipo: objeto.tipo, profundidade, lateral, esquerda: centro - lado / 2, direita: centro + lado / 2, topo: base - lado, base };
    sprite.colunas = colunasNaFrenteDaParede(sprite);
    return sprite;
}

// O z-buffer em ação: a coluna só entra se o sprite está mais perto que a parede (ou o espelho) dela.
function colunasNaFrenteDaParede(sprite) {
    const colunas = [];
    const fim = Math.min(larguraDaVisao, Math.ceil(sprite.direita - 0.5));
    for (let coluna = Math.max(0, Math.ceil(sprite.esquerda - 0.5)); coluna < fim; coluna++) {
        if (sprite.profundidade < zBuffer[coluna]) {
            colunas.push(coluna);
        }
    }
    return colunas;
}

// ---- 8. O FEIXE: O MESMO DDA, QUE QUICA ---------------------
/*
  Reflexão num espelho de 45° (eixo y para baixo), a troca de componentes do ricochete do Pong:
      "/"  leva (dx, dy) a (−dy, −dx)        "\"  leva (dx, dy) a (dy, dx)
  Um feixe leste (1, 0) num "/" sobe (0, −1); num "\" desce (0, 1). Como o emissor sai do centro de uma casa,
  na direção de um eixo, e os espelhos ficam nos centros, o feixe nunca sai de um eixo: a conta é exata, sem
  tolerância de ponto flutuante. O "+ 0" troca o −0 por 0.
*/
function refletir(simbolo, dx, dy) {
    return simbolo === "/" ? { dx: -dy + 0, dy: -dx + 0 } : { dx: dy, dy: dx };
}

// A luz é uma função PURA da sala: mesma sala, mesma luz. Cada emissor segue seu feixe até o fim.
function tracarLuz() {
    const novaLuz = { segmentos: [], quiques: [], fins: [], casas: new Set(), acesos: new Set(), espelhos: listarEspelhos() };
    EMISSORES.forEach(emissor => seguirFeixe(novaLuz, emissor.coluna + 0.5, emissor.linha + 0.5, emissor.dx, emissor.dy));
    return novaLuz;
}

// Cada espelho é o segmento da diagonal da sua casa, para o desenho da seção 6.
function listarEspelhos() {
    const espelhos = [];
    sala.celulas.forEach((texto, linha) => [...texto].forEach((simbolo, coluna) => {
        if (simbolo === "/" || simbolo === "\\") {
            const barra = simbolo === "/";   // "/" vai do canto de baixo à esquerda ao de cima à direita
            espelhos.push({ coluna, linha, simbolo, x0: coluna, y0: barra ? linha + 1 : linha, x1: coluna + 1, y1: barra ? linha : linha + 1 });
        }
    }));
    return espelhos;
}

/*
  Um trecho: lancarRaio com `comoFeixe`. Ele sai da casa em que nasce (o emissor, ou o espelho em que acabou
  de quicar) e para na casa de um espelho, de uma parede, de um emissor, de um receptor ou de uma PORTA, aberta
  ou fechada (assim a luz não depende das portas, e não há laço luz → porta → luz). Em espelho, o trecho termina
  no CENTRO dele, a direção é refletida e outro trecho sai dali.
*/
function seguirFeixe(novaLuz, x, y, dx, dy) {
    for (let quique = 0; ; quique++) {
        const trecho = lancarRaio(x, y, dx, dy, true, true);
        const simbolo = celulaDe(trecho.coluna, trecho.linha);
        const noEspelho = simbolo === "/" || simbolo === "\\";
        const fimX = noEspelho ? trecho.coluna + 0.5 : trecho.x;
        const fimY = noEspelho ? trecho.linha + 0.5 : trecho.y;

        novaLuz.segmentos.push({ x0: x, y0: y, x1: fimX, y1: fimY, comprimento: Math.hypot(fimX - x, fimY - y) });
        trecho.cruzamentos.forEach(({ coluna, linha }) => novaLuz.casas.add(indiceDaCasa(coluna, linha)));
        if (!noEspelho || quique === LIMITE_DE_QUIQUES) {
            novaLuz.fins.push({ coluna: trecho.coluna, linha: trecho.linha, simbolo, preso: noEspelho });
            if (simbolo === "R") {
                novaLuz.acesos.add(indiceDaCasa(trecho.coluna, trecho.linha));   // um segmento que TERMINA nele
            }
            return;
        }
        novaLuz.quiques.push({ coluna: trecho.coluna, linha: trecho.linha, simbolo });
        ({ dx, dy } = refletir(simbolo, dx, dy));
        x = fimX;
        y = fimY;
    }
}

// ---- 9. SALA IMUTÁVEL, ESPELHOS, PORTAS --------------------
// Girar um espelho NÃO mexe na sala: devolve outra, igual, com aquela casa trocada.
function salaComEspelhoGirado(salaAtual, coluna, linha) {
    const texto = salaAtual.celulas[linha];
    const girado = texto[coluna] === "/" ? "\\" : "/";
    return congelar(salaAtual.celulas.map((outra, indice) => indice === linha ? texto.slice(0, coluna) + girado + texto.slice(coluna + 1) : outra));
}

function refazerLuz() {
    luz = tracarLuz();
    luz.acesos.forEach(indice => {   // cada receptor vale pontos uma vez só (reiniciar a sala não os devolve)
        if (!receptoresPontuados.has(indice)) {
            receptoresPontuados.add(indice);
            pontos += PONTOS_POR_RECEPTOR;
        }
    });
}

// A intenção "girar o espelho à frente": age no `alvo` (a até 1,5 casa), e a luz é refeita NA HORA.
function acionarEspelho() {
    if (fimDeJogo) {
        avisar("Fim de jogo: R recomeça");   // sem luz refeita e sem pontos até o R
        return false;
    }
    if (alvo === null) {
        avisar("Nenhum espelho ao alcance");
        return false;
    }
    sala = salaComEspelhoGirado(sala, alvo.coluna, alvo.linha);
    refazerLuz();
    avisar("Espelho girado");
    return true;
}

// Volta à cópia congelada do começo: sala, zelador, portas, saída e sombras. Nada se desfaz à mão. As vidas e os
// pontos ficam como estão, a não ser depois do fim de jogo: aí é um jogo novo.
function reiniciarSala() {
    if (fimDeJogo) {
        vidas = VIDAS_INICIAIS;
        pontos = 0;
        fimDeJogo = false;
        receptoresPontuados.clear();
    }
    sala = salaInicial;
    portasAbertas.clear();
    versaoDasPortas++;
    sombras = [];
    proximoNascimento = tempoDeJogo + SOMBRAS.primeira;
    nascidasNaSala = 0;
    invulneravelAte = 0;
    saidaAlcancada = false;
    colocarJogadorNoInicio();
    refazerLuz();
    avisar("Sala reiniciada");
}

// A porta abre com TODOS os receptores acesos. Se perde a luz com o corpo na casa dela, fica aberta até a casa
// esvaziar: a porta não esmaga o zelador.
function atualizarPortas() {
    PORTAS.forEach(porta => {
        const indice = indiceDaCasa(porta.coluna, porta.linha);
        const acesa = porta.receptores.every(({ coluna, linha }) => luz.acesos.has(indiceDaCasa(coluna, linha)));
        const aberta = acesa || (portasAbertas.has(indice) && corpoToca(jogador.x, jogador.y, porta.coluna, porta.linha));
        if (aberta !== portasAbertas.has(indice)) {
            aberta ? portasAbertas.add(indice) : portasAbertas.delete(indice);
            versaoDasPortas++;
            avisar(aberta ? "Porta aberta" : "Porta fechada");
        }
    });
}

// O espelho "à frente": o mesmo raio, parando em espelho. Vale se está a até ALCANCE_DO_ESPELHO casas.
function acharEspelhoAlvo() {
    percorrerAGrade(resultadoDoAlvo, jogador.x, jogador.y, jogador.dx, jogador.dy, SEM_CRUZAMENTOS, true);
    const { coluna, linha, distancia } = resultadoDoAlvo;
    alvo = ehEspelho(coluna, linha) && distancia <= ALCANCE_DO_ESPELHO ? { coluna, linha, distancia } : null;
}

function verificarSaida() {
    if (!saidaAlcancada && celulaDe(Math.floor(jogador.x), Math.floor(jogador.y)) === "X") {
        saidaAlcancada = true;
        avisar("Saída alcançada");
    }
}

// ---- 10. SOMBRAS: CAMPO DE DISTÂNCIA, ESTADOS, LUZ, VIDAS --
/*
  O CAMPO DE DISTÂNCIA (busca em largura, `pacman/06-modos`). Parte da casa do zelador com distância 0; cada casa
  livre vizinha ganha a distância da casa de onde veio + 1. A fila garante a ordem: todas as casas a 1 passo antes
  das de 2 passos. Porta fechada é parede para a busca, então o campo contorna. É refeito quando o zelador troca de
  casa ou uma porta muda. Quem desce o campo (de n para n − 1) chega ao zelador pelo caminho mais curto.
*/
const VIZINHAS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function calcularCampo(coluna, linha) {
    campoDeDistancia.fill(-1);
    let cabeca = 0;
    let cauda = 0;
    const origem = indiceDaCasa(coluna, linha);
    campoDeDistancia[origem] = 0;
    filaDaBusca[cauda++] = origem;

    while (cabeca < cauda) {
        const atual = filaDaBusca[cabeca++];
        VIZINHAS.forEach(([passoX, passoY]) => {
            const vizinhaColuna = atual % COLUNAS + passoX;
            const vizinhaLinha = Math.floor(atual / COLUNAS) + passoY;
            const vizinha = indiceDaCasa(vizinhaColuna, vizinhaLinha);
            if (!ehSolida(vizinhaColuna, vizinhaLinha) && campoDeDistancia[vizinha] === -1) {
                campoDeDistancia[vizinha] = campoDeDistancia[atual] + 1;
                filaDaBusca[cauda++] = vizinha;
            }
        });
    }
}

function atualizarCampo() {
    const casa = indiceDaCasa(Math.floor(jogador.x), Math.floor(jogador.y));
    if (casa !== casaDoCampo || versaoDasPortas !== versaoDoCampo) {
        calcularCampo(Math.floor(jogador.x), Math.floor(jogador.y));
        casaDoCampo = casa;
        versaoDoCampo = versaoDasPortas;
    }
}

function passosDaCasa(coluna, linha) {
    return ehSolida(coluna, linha) ? -1 : campoDeDistancia[indiceDaCasa(coluna, linha)];
}

/*
  A MÁQUINA DE ESTADOS de cada sombra:
    nasce     cresce na fenda por um segundo; não faz nada nem sofre nada
    ronda     anda ao acaso pelas casas livres, devagar
    persegue  desce o campo de distância, a 70% da velocidade do zelador
    recua     depois de tocar o zelador, sobe o campo (foge) por 1,5 s
    dissolve  meio segundo de luz a desfez; encolhe e some
  A luz leva qualquer sombra viva ao dissolve. Ela NUNCA protege o zelador: ficar em cima do feixe não muda nada
  (GDD, seção 11); o feixe só ataca sombras.
*/
function nascerSombra() {
    const fendas = [];
    sala.celulas.forEach((texto, linha) => [...texto].forEach((simbolo, coluna) => {
        if (simbolo === "S" && passosDaCasa(coluna, linha) !== 0 && Math.hypot(coluna + 0.5 - jogador.x, linha + 0.5 - jogador.y) > 3) {
            fendas.push({ coluna, linha });
        }
    }));
    // A primeira da sala nasce numa fenda que o campo alcança (a que persegue); as outras podem nascer atrás da porta.
    const alcancaveis = fendas.filter(({ coluna, linha }) => passosDaCasa(coluna, linha) > 0);
    const candidatas = nascidasNaSala === 0 && alcancaveis.length > 0 ? alcancaveis : fendas;
    if (candidatas.length === 0) {
        return;
    }
    const { coluna, linha } = candidatas[Math.floor(Math.random() * candidatas.length)];
    nascidasNaSala++;
    sombras.push({ tipo: "sombra", x: coluna + 0.5, y: linha + 0.5, estado: "nasce", desde: tempoDeJogo, exposicao: 0, escala: 0.2,
        alvoX: coluna + 0.5, alvoY: linha + 0.5, anterior: indiceDaCasa(coluna, linha), vindaDe: indiceDaCasa(coluna, linha) });
}

function atualizarSombras(tempo) {
    tempoDeJogo += tempo;
    if (sombras.length >= SOMBRAS.max) {
        proximoNascimento = tempoDeJogo + SOMBRAS.intervalo;   // no máximo o relógio não corre: a reposição vem 12 s depois da baixa
    } else if (tempoDeJogo >= proximoNascimento) {
        nascerSombra();
        proximoNascimento = tempoDeJogo + SOMBRAS.intervalo;
    }
    sombras.forEach(sombra => atualizarSombra(sombra, tempo));
    sombras = sombras.filter(sombra => sombra.estado !== "dissolve" || tempoDeJogo - sombra.desde < SEGUNDOS_DE_DISSOLUCAO);
}

function atualizarSombra(sombra, tempo) {
    const noEstado = tempoDeJogo - sombra.desde;
    if (sombra.estado === "nasce") {
        sombra.escala = 0.2 + 0.8 * Math.min(1, noEstado / SEGUNDOS_DE_NASCIMENTO);
        if (noEstado >= SEGUNDOS_DE_NASCIMENTO) {
            mudarDeEstado(sombra, "ronda");
        }
        return;
    }
    if (sombra.estado === "dissolve") {
        sombra.escala = 1 - noEstado / SEGUNDOS_DE_DISSOLUCAO;
        return;
    }
    atualizarExposicao(sombra, tempo);
    if (sombra.estado === "dissolve") {
        return;
    }
    decidirEstado(sombra, noEstado);
    const velocidade = sombra.estado === "ronda" ? VELOCIDADE_DA_RONDA : PROPORCAO_DA_VELOCIDADE * VELOCIDADE_DE_ANDAR;
    andarComASombra(sombra, velocidade * tempo);
    verificarContato(sombra);
}

function mudarDeEstado(sombra, estado) {
    sombra.estado = estado;
    sombra.desde = tempoDeJogo;
}

// A luz acumula exposição na sombra (e ela esfria, no mesmo ritmo, fora da luz). Com meio segundo, dissolve.
function atualizarExposicao(sombra, tempo) {
    const iluminada = estaIluminada(sombra);
    sombra.exposicao = Math.max(0, sombra.exposicao + (iluminada ? tempo : -tempo));
    if (sombra.exposicao >= SEGUNDOS_PARA_DISSOLVER) {
        mudarDeEstado(sombra, "dissolve");
        pontos += PONTOS_POR_SOMBRA;
        avisar("Sombra desfeita");
    }
}

/*
  O CORPO FAZ SOMBRA (GDD, seção 11: ficar na luz nunca protege). A luz que queima não é o feixe todo: o feixe é
  cortado onde bate no corpo do zelador, e o que vem depois dele, na mesma cadeia de espelhos, está no escuro. Mais:
  a menos de PENUMBRA_DO_ZELADOR casas dele nada queima (enquanto ele está na luz). Assim uma sombra que chega pelo lado escuro do feixe, ou
  que chega junto dele, toca. O feixe continua desenhado inteiro e acendendo receptores: só a ARMA respeita o corpo.
*/
function estaIluminada(sombra) {
    if (zeladorEstaNaLuz() && Math.hypot(sombra.x - jogador.x, sombra.y - jogador.y) < PENUMBRA_DO_ZELADOR) {
        return false;
    }
    const raioDaLuz = RAIO_DA_LUZ + RAIO_DA_SOMBRA;
    return cortarOFeixeNoCorpo().queimam.some(segmento => distanciaAoSegmento(sombra.x, sombra.y, segmento) < raioDaLuz);
}

// Na luz = a menos de RAIO_DA_LUZ de um trecho do feixe. Só aí a penumbra vale: longe do feixe o corpo não faz sombra nele.
function zeladorEstaNaLuz() {
    return luz.segmentos.some(segmento => distanciaAoSegmento(jogador.x, jogador.y, segmento) < RAIO_DA_LUZ);
}

// `queimam`: os trechos até o corpo; `apagados`: o que o corpo deixa no escuro (para a planta).
function cortarOFeixeNoCorpo() {
    const queimam = [];
    const apagados = [];
    let cortada = false;   // a cadeia de espelhos em que estamos já bateu no corpo
    luz.segmentos.forEach((segmento, indice) => {
        const anterior = luz.segmentos[indice - 1];
        if (anterior === undefined || anterior.x1 !== segmento.x0 || anterior.y1 !== segmento.y0) {
            cortada = false;   // outro emissor
        }
        const corte = cortada ? null : ondeOCorpoCorta(segmento);
        if (cortada || corte !== null) {
            const inicio = cortada ? { x: segmento.x0, y: segmento.y0 } : corte;
            apagados.push({ x0: inicio.x, y0: inicio.y, x1: segmento.x1, y1: segmento.y1 });
        }
        if (!cortada) {
            queimam.push(corte === null ? segmento : { x0: segmento.x0, y0: segmento.y0, x1: corte.x, y1: corte.y });
        }
        cortada = cortada || corte !== null;
    });
    return { queimam, apagados };
}

// O ponto onde o corpo começa a fazer sombra no trecho: a frente do corpo, na direção do feixe. O feixe tem a largura da
// luz (RAIO_DA_LUZ de cada lado); quem está dentro dela, mesmo fora do eixo, apaga o que vem atrás. Sem corpo na luz: null.
function ondeOCorpoCorta(segmento) {
    if (segmento.comprimento === 0 || distanciaAoSegmento(jogador.x, jogador.y, segmento) >= RAIO_DA_LUZ) {
        return null;
    }
    const direcaoX = (segmento.x1 - segmento.x0) / segmento.comprimento;
    const direcaoY = (segmento.y1 - segmento.y0) / segmento.comprimento;
    const ateOCentro = (jogador.x - segmento.x0) * direcaoX + (jogador.y - segmento.y0) * direcaoY;
    const entrada = Math.min(segmento.comprimento, Math.max(0, ateOCentro - RAIO_DO_CORPO));
    return { x: segmento.x0 + direcaoX * entrada, y: segmento.y0 + direcaoY * entrada };
}

function distanciaAoSegmento(x, y, segmento) {
    const ex = segmento.x1 - segmento.x0;
    const ey = segmento.y1 - segmento.y0;
    const fracao = Math.min(1, Math.max(0, ((x - segmento.x0) * ex + (y - segmento.y0) * ey) / (ex * ex + ey * ey || 1)));
    return Math.hypot(x - (segmento.x0 + ex * fracao), y - (segmento.y0 + ey * fracao));
}

// Ronda sente o zelador a até RAIO_DE_PERCEPCAO passos (pelo campo, não em linha reta: paredes contam) e passa a
// perseguir; persegue perde o rastro se o campo não chega mais, ou chega longe demais.
function decidirEstado(sombra, noEstado) {
    const passos = passosDaCasa(Math.floor(sombra.x), Math.floor(sombra.y));
    const sente = passos >= 0 && passos <= RAIO_DE_PERCEPCAO;
    if (sombra.estado === "ronda" && sente) {
        mudarDeEstado(sombra, "persegue");
    } else if (sombra.estado === "persegue" && (passos < 0 || passos > 2 * RAIO_DE_PERCEPCAO)) {
        mudarDeEstado(sombra, "ronda");
    } else if (sombra.estado === "recua" && noEstado >= SEGUNDOS_DE_RECUO) {
        mudarDeEstado(sombra, "ronda");
    }
}

// A sombra anda de centro de casa em centro de casa; na casa do zelador, vai direto a ele.
function andarComASombra(sombra, alcance) {
    tirarDaCasaSolida(sombra);
    if (ehSolida(Math.floor(sombra.alvoX), Math.floor(sombra.alvoY))) {
        escolherAlvo(sombra);   // a porta fechou depois que o alvo foi escolhido
    }
    for (let tentativa = 0; tentativa < 4 && alcance > 0; tentativa++) {
        const faltam = Math.hypot(sombra.alvoX - sombra.x, sombra.alvoY - sombra.y);
        if (faltam > alcance) {
            sombra.x += (sombra.alvoX - sombra.x) / faltam * alcance;
            sombra.y += (sombra.alvoY - sombra.y) / faltam * alcance;
            return;
        }
        sombra.x = sombra.alvoX;
        sombra.y = sombra.alvoY;
        alcance -= faltam;
        escolherAlvo(sombra);
    }
}

// Uma porta que fecha com a sombra dentro a empurra de volta para a casa de onde ela vinha (ou, se esta não serve, para
// uma vizinha livre): nenhuma sombra fica dentro de uma casa sólida.
function tirarDaCasaSolida(sombra) {
    const coluna = Math.floor(sombra.x);
    const linha = Math.floor(sombra.y);
    if (!ehSolida(coluna, linha)) {
        return;
    }
    const livres = VIZINHAS.map(([passoX, passoY]) => ({ coluna: coluna + passoX, linha: linha + passoY }))
        .filter(vizinha => !ehSolida(vizinha.coluna, vizinha.linha));
    const saida = livres.find(vizinha => indiceDaCasa(vizinha.coluna, vizinha.linha) === sombra.vindaDe) || livres[0];
    if (saida === undefined) {
        return;
    }
    sombra.x = sombra.alvoX = saida.coluna + 0.5;
    sombra.y = sombra.alvoY = saida.linha + 0.5;
    sombra.anterior = indiceDaCasa(saida.coluna, saida.linha);
}

function escolherAlvo(sombra) {
    const coluna = Math.floor(sombra.x);
    const linha = Math.floor(sombra.y);
    const aqui = passosDaCasa(coluna, linha);
    if (sombra.estado === "persegue" && aqui === 0) {
        sombra.alvoX = jogador.x;
        sombra.alvoY = jogador.y;
        return;
    }
    const livres = VIZINHAS.map(([passoX, passoY]) => ({ coluna: coluna + passoX, linha: linha + passoY }))
        .filter(vizinha => !ehSolida(vizinha.coluna, vizinha.linha));
    if (livres.length === 0) {
        return;
    }
    const seguindoOCampo = (sombra.estado === "persegue" || sombra.estado === "recua") && aqui >= 0;
    const escolhida = seguindoOCampo ? melhorVizinha(livres, sombra.estado === "persegue") : vizinhaAoAcaso(livres, sombra);
    sombra.vindaDe = sombra.anterior;
    sombra.anterior = indiceDaCasa(coluna, linha);
    sombra.alvoX = escolhida.coluna + 0.5;
    sombra.alvoY = escolhida.linha + 0.5;
}

// Perseguir: a vizinha de menor distância. Recuar: a de maior.
function melhorVizinha(livres, descendo) {
    const sinal = descendo ? 1 : -1;
    return livres.reduce((melhor, vizinha) =>
        sinal * passosDaCasa(vizinha.coluna, vizinha.linha) < sinal * passosDaCasa(melhor.coluna, melhor.linha) ? vizinha : melhor);
}

// Rondar: uma vizinha sorteada, sem voltar por onde veio se houver outra saída.
function vizinhaAoAcaso(livres, sombra) {
    const sem = livres.filter(vizinha => indiceDaCasa(vizinha.coluna, vizinha.linha) !== sombra.anterior);
    const opcoes = sem.length > 0 ? sem : livres;
    return opcoes[Math.floor(Math.random() * opcoes.length)];
}

// Tocar o zelador (corpo com corpo) tira UMA vida e dá 1,5 s de invulnerabilidade; a sombra que tocou recua.
function verificarContato(sombra) {
    if (fimDeJogo) {
        return;   // o jogo acabou neste quadro: as outras sombras não tiram vida de ninguém
    }
    const tocou = Math.hypot(sombra.x - jogador.x, sombra.y - jogador.y) < RAIO_DO_CORPO + RAIO_DA_SOMBRA;
    if (!tocou || tempoDeJogo < invulneravelAte || sombra.estado === "recua") {
        return;
    }
    vidas--;
    invulneravelAte = tempoDeJogo + SEGUNDOS_DE_INVULNERABILIDADE;
    mudarDeEstado(sombra, "recua");
    avisar(vidas > 0 ? "Vida perdida" : "Fim de jogo");
    fimDeJogo = vidas <= 0;
    if (fimDeJogo) {
        invulneravelAte = 0;   // fim de jogo não é invulnerável: sem contorno, sem "invulnerável"
    }
}

// ---- 11. ENTRADA: TECLADO E TOQUE, A MESMA INTENÇÃO --------
// Teclas e dedos não movem ninguém. Cada ENTRADA (uma tecla, um dedo) segura uma AÇÃO, e a
// ação vale enquanto QUALQUER entrada a segurar: soltar ↑ com W ainda apertada não para.
const entradasAtivas = new Map();   // "tecla:w", "ponteiro:3:frente" → "frente"
const acoesAtivas = new Set();      // a visão derivada: os nomes das ações seguradas
const botoesDeAcao = document.querySelectorAll("[data-acao]");
const botoesDeComando = document.querySelectorAll("[data-comando]");   // Espelho, Planta, Reiniciar: as teclas E, H, R
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

/*
  O Espaço gira o espelho, MENOS num botão que o jogador alcançou com a tecla Tab: aí ele aperta o botão, como em
  qualquer página. Depois de um clique (mouse ou dedo) o botão fica com o foco, mas ninguém o escolheu pelo teclado:
  o Espaço volta a girar o espelho. `focoVeioDoTeclado` começa ligado (sem clique nenhum, só o teclado põe o foco num botão), o Tab o liga e qualquer ponteiro o desliga.
*/
let focoVeioDoTeclado = true;   // sem nenhum clique ainda, só o teclado põe o foco num botão
document.addEventListener("pointerdown", () => { focoVeioDoTeclado = false; }, true);

function espacoGiraOEspelho(evento) {
    return evento.key === " " && !(evento.target.tagName === "BUTTON" && focoVeioDoTeclado);
}

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    if (tecla === "tab") {
        focoVeioDoTeclado = true;
    }
    const ehEspaco = espacoGiraOEspelho(evento);
    if (!evento.repeat) {
        if (tecla === "h") {
            alternarPlanta();
        } else if (tecla === "r") {
            reiniciarSala();
        } else if (tecla === "e" || ehEspaco) {
            acionarEspelho();
        }
    }
    if (ACAO_DA_TECLA[tecla] !== undefined) {
        evento.preventDefault();
        mudarEntrada("tecla:" + tecla, ACAO_DA_TECLA[tecla]);
    } else if (ehEspaco) {
        evento.preventDefault();   // o Espaço não rola a página
    }
});
document.addEventListener("keyup", evento => {
    if (espacoGiraOEspelho(evento)) {
        evento.preventDefault();   // o botão focado pelo mouse apertaria ao SOLTAR o Espaço
    }
    mudarEntrada("tecla:" + evento.key.toLowerCase());
});
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
    botoesDeComando.forEach(botao => {
        if (botao.dataset.comando === "planta") {
            botao.setAttribute("aria-pressed", ligada);
        }
    });
}

const COMANDOS = { espelho: acionarEspelho, planta: () => alternarPlanta(), reiniciar: reiniciarSala };
botoesDeComando.forEach(botao => botao.addEventListener("click", () => COMANDOS[botao.dataset.comando]()));

function lerIntencao() {
    const eixo = (positiva, negativa) => Number(acoesAtivas.has(positiva)) - Number(acoesAtivas.has(negativa));
    return {
        frente: eixo("frente", "tras"),
        lado: eixo("direita", "esquerda"),
        giro: eixo("girarDireita", "girarEsquerda")
    };
}

// ---- 12. ANDAR E COLIDIR -----------------------------------
function atualizar(tempo) {
    if (!fimDeJogo) {   // depois do fim de jogo, nada anda: só o desenho
        moverOZelador(tempo);
        atualizarPortas();
        atualizarCampo();
        atualizarSombras(tempo);
    }
    atualizarRaios();
    acharEspelhoAlvo();
    projetarObjetos();
    verificarSaida();
}

function moverOZelador(tempo) {
    const { frente, lado, giro } = lerIntencao();
    if (giro !== 0) {   // sem giro, nem refaz o módulo: o ângulo parado não "treme"
        girar(giro * VELOCIDADE_DE_GIRO * tempo);
    }
    andar(frente, lado, tempo);
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

// Sólida é parede, pedra, emissor, receptor e porta FECHADA. Espelho não: o zelador passa por ele.
function ehSolida(coluna, linha) {
    const simbolo = celulaDe(coluna, linha);
    return simbolo === undefined || (CASAS_SOLIDAS.includes(simbolo) && !(simbolo === "D" && portasAbertas.has(indiceDaCasa(coluna, linha))));
}

function ehObstaculoDoFeixe(coluna, linha) {
    const simbolo = celulaDe(coluna, linha);
    return simbolo === undefined || OBSTACULOS_DO_FEIXE.includes(simbolo);
}

// O ponto de uma casa MAIS PERTO do centro está a menos de um raio?
function corpoToca(x, y, coluna, linha) {
    const pertoX = Math.min(Math.max(x, coluna), coluna + 1);
    const pertoY = Math.min(Math.max(y, linha), linha + 1);
    return Math.hypot(x - pertoX, y - pertoY) < RAIO_DO_CORPO;
}

/*
  Bate se o corpo toca uma casa sólida. O passo é conferido só no destino, então ele nunca pode passar de
  1 + 2 raios (1,5 casa): o teto de 0,05 s por quadro dá no máximo 0,15.
*/
function corpoBateNaParede(x, y) {
    for (let linha = Math.floor(y - RAIO_DO_CORPO); linha <= Math.floor(y + RAIO_DO_CORPO); linha++) {
        for (let coluna = Math.floor(x - RAIO_DO_CORPO); coluna <= Math.floor(x + RAIO_DO_CORPO); coluna++) {
            if (ehSolida(coluna, linha) && corpoToca(x, y, coluna, linha)) {
                return true;
            }
        }
    }
    return false;
}

// ---- 13. O RAIO: DDA CASA A CASA ----------------------------
/*
  O plano da câmera é perpendicular ao olhar e tem comprimento PLANO (a metade dele, a 1
  casa do olho). A coluna `camera` (-1 na esquerda, +1 na direita) aponta o raio para
  olhar + plano × camera. O DDA devolve a distância ao longo do raio inclinado; para a
  altura vale a distância PERPENDICULAR ao plano, que é essa vezes o cosseno do desvio.
  Sem isso, uma parede reta aparece curva, como numa lente "olho de peixe".
*/
function atualizarRaios() {
    for (let coluna = 0; coluna < larguraDaVisao; coluna++) {
        const camera = 2 * (coluna + 0.5) / larguraDaVisao - 1;
        const inclinadoX = jogador.dx - jogador.dy * PLANO * camera;
        const inclinadoY = jogador.dy + jogador.dx * PLANO * camera;
        const tamanho = Math.hypot(inclinadoX, inclinadoY);
        const direcaoX = inclinadoX / tamanho;
        const direcaoY = inclinadoY / tamanho;
        const resultado = raiosDaTela[coluna] || (raiosDaTela[coluna] = criarResultado());   // o mesmo objeto, quadro a quadro
        percorrerAGrade(resultado, jogador.x, jogador.y, direcaoX, direcaoY, SEM_CRUZAMENTOS);   // sem o caminho: ninguém o lê

        resultado.direcaoX = direcaoX;
        resultado.direcaoY = direcaoY;
        resultado.cosseno = jogador.dx * direcaoX + jogador.dy * direcaoY;
        resultado.perpendicular = resultado.distancia * resultado.cosseno;
        resultado.altura = pixelsPorCasa(resultado.perpendicular);
        resultado.u = posicaoNaFace(resultado, direcaoX, direcaoY);
        zBuffer[coluna] = resultado.perpendicular;
    }
    registrarEspelhosNaTela();
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

// Um raio avulso (o do teste, o do feixe): devolve um resultado novo. `registrar` guarda cada cruzamento;
// `comoFeixe` faz o raio sair da casa de origem e parar também em espelho e em porta (seção 8).
function lancarRaio(origemX, origemY, direcaoX, direcaoY, registrar = true, comoFeixe = false) {
    return percorrerAGrade(criarResultado(), origemX, origemY, direcaoX, direcaoY, registrar ? [] : SEM_CRUZAMENTOS, comoFeixe);
}

function criarResultado() {
    return { coluna: 0, linha: 0, lado: "x", distancia: 0, x: 0, y: 0, cruzamentos: SEM_CRUZAMENTOS };
}

// Para na primeira casa que para o raio; o mapa é fechado (e fora dele é parede), então sempre para.
// Preenche `resultado` no lugar: os raios da imagem reaproveitam os mesmos objetos, quadro a quadro.
function percorrerAGrade(resultado, origemX, origemY, direcaoX, direcaoY, cruzamentos, comoFeixe = false) {
    const passoX = direcaoX < 0 ? -1 : 1;   // direção 0: paralelo, o passo não importa
    const passoY = direcaoY < 0 ? -1 : 1;
    const deltaX = direcaoX === 0 ? Infinity : Math.abs(1 / direcaoX);
    const deltaY = direcaoY === 0 ? Infinity : Math.abs(1 / direcaoY);
    let proximoX = direcaoX === 0 ? Infinity : (direcaoX < 0 ? origemX - Math.floor(origemX) : Math.floor(origemX) + 1 - origemX) * deltaX;
    let proximoY = direcaoY === 0 ? Infinity : (direcaoY < 0 ? origemY - Math.floor(origemY) : Math.floor(origemY) + 1 - origemY) * deltaY;
    const paraORaio = comoFeixe ? ehObstaculoDoFeixe : ehSolida;
    let coluna = Math.floor(origemX);
    let linha = Math.floor(origemY);
    let lado = "x";
    let distancia = 0;
    let parou = !comoFeixe && ehSolida(coluna, linha);   // o feixe sai da casa em que nasce, mesmo sólida (emissor)

    while (!parou) {
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
        parou = paraORaio(coluna, linha);
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

// ---- 14. TAMANHO DA IMAGEM ---------------------------------
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
    imagem = pincelVisao.createImageData(larguraDaVisao, alturaDaVisao);
    pixels = new Uint32Array(imagem.data.buffer);
    fundo = criarFundo();
    zBuffer = new Float64Array(larguraDaVisao);
    espelhoNaColuna = new Array(larguraDaVisao).fill(null);
    uDoEspelho = new Float64Array(larguraDaVisao);
    profundidadeDoSprite = new Float64Array(larguraDaVisao);

    // Cabe sem rolar: a imagem usa o que sobra depois das outras partes da página. A planta (H) tem o
    // mesmo limite, e o palco reserva a MAIOR das duas: alternar o H não mexe em nada.
    const alturaLivre = window.innerHeight - medirOResto();
    const escala = Math.max(1, Math.floor(Math.min(window.innerWidth / larguraDaVisao, alturaLivre / alturaDaVisao)));
    const larguraDaPlanta = Math.max(120, Math.min(tela.width, window.innerWidth - 32, (alturaLivre - 4) * tela.width / tela.height + 4));   // 4 = as duas bordas
    const alturaDaPlanta = (larguraDaPlanta - 4) * tela.height / tela.width + 4;
    visao.style.width = larguraDaVisao * escala + "px";
    tela.style.width = larguraDaPlanta + "px";
    palco.style.minHeight = Math.max(alturaDaVisao * escala, alturaDaPlanta) + "px";
    raiosDaTela = [];
}

window.addEventListener("resize", ajustarVisao);

// ---- 15. LOOP ----------------------------------------------
function quadroAQuadro(instanteAtual) {
    const tempo = Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05);
    instanteDoQuadroAnterior = instanteDoQuadro = instanteAtual;
    const inicio = performance.now();
    atualizar(tempo);
    desenhar();
    ultimoTempoDeQuadro = performance.now() - inicio;
    msAoVivo += (ultimoTempoDeQuadro - msAoVivo) * 0.05;   // média móvel: o número não pisca
    palco.classList.toggle("invulneravel", tempoDeJogo < invulneravelAte);   // um contorno parado, sem piscar
    requestAnimationFrame(quadroAQuadro);
}

// O jogo só começa se o mapa e as artes servem (o erro já foi dito no console).
if (verificarMapa() && verificarArtes()) {
    prepararArtes();
    prepararSala();
    ajustarVisao();
    refazerLuz();
    atualizarPortas();
    atualizarCampo();
    atualizarRaios();
    acharEspelhoAlvo();
    projetarObjetos();
    requestAnimationFrame(quadroAQuadro);
}
