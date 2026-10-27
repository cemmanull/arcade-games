/*
  REFLEXO — PASSO 4: PAREDES
  Um raio por COLUNA da imagem. Cada raio sai do olho numa direção um pouco diferente
  (o plano da câmera abre o campo de visão), o DDA do passo 3 acha a parede, e a altura
  da coluna é k / distância perpendicular: perto, alta; longe, baixa. O H troca a vista
  pela planta, agora com o leque de raios.
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
const COR_DAS_PAREDES = { "#": "#964632", "%": "#5a6478", D: "#a8842e", E: "#2e7d8a", R: "#8a4aa8" };
// Na planta as letras amarelas precisam de 4,5:1 de contraste (GDD, seção 7): D, E e R ficam mais escuros que na imagem.
const COR_NA_PLANTA = { ...COR_DAS_PAREDES, D: "#54410f", E: "#15434d", R: "#55296a" };
const COR_TETO = "#0b0b14";
const COR_PISO = "#1b1b2b";
const SOMBRA_DO_LADO_Y = "rgba(0, 0, 0, 0.4)";   // as paredes viradas para y ficam mais escuras
const CAMPO_DE_VISAO = 66 * Math.PI / 180;       // o padrão do GDD (50° a 90° nas opções do final)
const PLANO = Math.tan(CAMPO_DE_VISAO / 2);      // metade do plano da câmera, a 1 casa do olho
const PASSO_FIXO = 0.1;   // o jeito ingênuo, só para comparar com o DDA

// ---- 2. DOM E ESTADO ---------------------------------------
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const visao = document.getElementById("visao");
const pincelVisao = visao.getContext("2d");
const palco = document.getElementById("palco");

// mapa[linha][coluna]: strings são imutáveis, e o mapa vai mudar.
const mapa = MAPA_EM_TEXTO.map(linha => linha.split(""));

// x e y em CASAS (1,5 = meio da casa 1), não em pixels. `angulo` em radianos:
// 0 = direita; como y desce, π/2 = para baixo. dx e dy são o vetor DIREÇÃO.
const jogador = { x: 0, y: 0, angulo: 0.25, dx: 0, dy: 0 };

// Um resultado de raio por coluna da imagem, refeito a cada quadro (seção 7): casa batida, lado,
// distância, distância perpendicular, altura. `raio` é o do OLHAR (o do passo 3): um raio à parte,
// porque com 320 colunas nenhuma delas aponta exatamente para onde o zelador olha.
let raiosDaTela = [];
let raio = null;

// A resolução interna é baixa de propósito; o navegador amplia por um número INTEIRO (seção 8).
let larguraDaVisao = 320;
let alturaDaVisao = 200;

let depuracaoLigada = false;
let instanteDoQuadroAnterior = 0;
let poseDoPassoFixo = "";     // a pose da última conta do passo fixo: o H só refaz se ela mudou
let resultadoDoPassoFixo = null;

// ---- 3. CONFERIR O MAPA, ACHAR O JOGADOR -------------------
// Dado errado não dá erro: dá um desenho torto longe da causa. Devolve se o mapa serve.
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

// ---- 4. DESENHAR A PLANTA ----------------------------------
// Escala do pincel: 1 unidade de desenho = 1 casa (24 pixels), como no mundo.
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

// Primeira pessoa: teto e piso, e depois uma faixa vertical de 1 pixel por raio, centrada.
function desenharVisao() {
    pincelVisao.fillStyle = COR_TETO;
    pincelVisao.fillRect(0, 0, larguraDaVisao, alturaDaVisao / 2);
    pincelVisao.fillStyle = COR_PISO;
    pincelVisao.fillRect(0, alturaDaVisao / 2, larguraDaVisao, alturaDaVisao / 2);

    raiosDaTela.forEach((umRaio, coluna) => {
        const altura = Math.min(Math.round(umRaio.altura), alturaDaVisao);
        const topo = Math.floor((alturaDaVisao - altura) / 2);
        pincelVisao.fillStyle = COR_DAS_PAREDES[mapa[umRaio.linha][umRaio.coluna]];
        pincelVisao.fillRect(coluna, topo, 1, altura);
        if (umRaio.lado === "y") {
            pincelVisao.fillStyle = SOMBRA_DO_LADO_Y;
            pincelVisao.fillRect(coluna, topo, 1, altura);
        }
    });
}

// A planta do H: a grade, o leque de raios (um a cada poucas colunas) e o raio do meio em destaque.
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

function montarLeitura() {
    const { x, y, angulo, dx, dy } = jogador;
    const { coluna, linha, lado, distancia, cruzamentos } = raio;
    const ingenuo = contarPassoFixo();
    return `casa (${Math.floor(x)}, ${Math.floor(y)})  pos (${x.toFixed(2)}, ${y.toFixed(2)})\n`
        + `${(angulo * 180 / Math.PI).toFixed(0)}° = ${angulo.toFixed(3)} rad  dir (${dx.toFixed(2)}, ${dy.toFixed(2)})\n`
        + `raio: casa (${coluna}, ${linha}) lado ${lado} dist ${distancia.toFixed(3)}\n`
        + `DDA ${cruzamentos.length} passos | fixo ${PASSO_FIXO}: ${ingenuo.passos} (${ingenuo.distancia.toFixed(2)})\n`
        + `meio: perp ${raio.perpendicular.toFixed(3)} altura ${raio.altura.toFixed(1)} px de ${alturaDaVisao}`;
}

// A conta ingênua só interessa a quem olha o H, e só muda se o zelador se mexeu.
function contarPassoFixo() {
    const pose = `${jogador.x},${jogador.y},${jogador.angulo}`;
    if (pose !== poseDoPassoFixo) {
        poseDoPassoFixo = pose;
        resultadoDoPassoFixo = lancarRaioPorPassos(jogador.x, jogador.y, jogador.dx, jogador.dy, PASSO_FIXO);
    }
    return resultadoDoPassoFixo;
}

// ---- 5. ENTRADA: TECLADO E TOQUE, A MESMA INTENÇÃO ---------
// Teclas e dedos não movem ninguém. Cada ENTRADA (uma tecla, um dedo) segura uma AÇÃO, e a
// ação vale enquanto QUALQUER entrada a segurar: soltar ↑ com W ainda apertada não para.
const entradasAtivas = new Map();   // "tecla:w", "ponteiro:3:frente" → "frente"
const acoesAtivas = new Set();      // a visão derivada: os nomes das ações seguradas
const botoesDeAcao = document.querySelectorAll("[data-acao]");
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
        depuracaoLigada = !depuracaoLigada;
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

function lerIntencao() {
    const eixo = (positiva, negativa) => Number(acoesAtivas.has(positiva)) - Number(acoesAtivas.has(negativa));
    return {
        frente: eixo("frente", "tras"),
        lado: eixo("direita", "esquerda"),
        giro: eixo("girarDireita", "girarEsquerda")
    };
}

// ---- 6. ANDAR E COLIDIR ------------------------------------
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

// ---- 7. O RAIO: DDA CASA A CASA ----------------------------
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
        const resultado = lancarRaio(jogador.x, jogador.y, direcaoX, direcaoY, false);   // sem o caminho: ninguém o lê
        const cosseno = jogador.dx * direcaoX + jogador.dy * direcaoY;

        resultado.perpendicular = resultado.distancia * cosseno;
        resultado.altura = k / resultado.perpendicular;
        raiosDaTela[coluna] = resultado;
    }

    raio = lancarRaio(jogador.x, jogador.y, jogador.dx, jogador.dy);   // com o caminho, para o H
    raio.perpendicular = raio.distancia;   // olhando reto não há desvio: o cosseno vale 1
    raio.altura = k / raio.perpendicular;
}

/*
  Um raio de direção UNITÁRIA cruza uma linha vertical da grade a cada 1/|dx| de
  distância e uma horizontal a cada 1/|dy|. Cada eixo guarda a distância até a
  PRÓXIMA linha dele (`proximo`); a menor vence, e o raio entra na casa vizinha
  daquele lado. Nunca anda "no escuro": cada passo é uma casa, nenhuma é pulada.
*/
function prepararEixo(origem, direcao) {
    if (direcao === 0) {
        return { passo: 1, delta: Infinity, proximo: Infinity };   // paralelo: nunca cruza
    }
    const delta = Math.abs(1 / direcao);
    const ateALinha = direcao < 0 ? origem - Math.floor(origem) : Math.floor(origem) + 1 - origem;
    return { passo: direcao < 0 ? -1 : 1, delta, proximo: ateALinha * delta };
}

const SEM_CRUZAMENTOS = Object.freeze([]);

// Para na primeira casa sólida; o mapa é fechado (e fora dele é parede), então sempre para.
// `registrar` guarda cada cruzamento (só o H os lê); os 320 raios da imagem passam false.
function lancarRaio(origemX, origemY, direcaoX, direcaoY, registrar = true) {
    const eixos = { x: prepararEixo(origemX, direcaoX), y: prepararEixo(origemY, direcaoY) };
    const cruzamentos = registrar ? [] : SEM_CRUZAMENTOS;
    let coluna = Math.floor(origemX);
    let linha = Math.floor(origemY);
    let lado = "x";
    let distancia = 0;

    while (!ehSolida(coluna, linha)) {
        lado = eixos.x.proximo < eixos.y.proximo ? "x" : "y";
        distancia = eixos[lado].proximo;
        eixos[lado].proximo += eixos[lado].delta;
        if (lado === "x") {
            coluna += eixos.x.passo;
        } else {
            linha += eixos.y.passo;
        }
        if (registrar) {
            cruzamentos.push({ x: origemX + direcaoX * distancia, y: origemY + direcaoY * distancia, lado, coluna, linha });
        }
    }
    return { coluna, linha, lado, distancia, x: origemX + direcaoX * distancia, y: origemY + direcaoY * distancia, cruzamentos };
}

// O jeito ingênuo, só para comparar: andar o raio em passos fixos até pisar numa casa sólida.
function lancarRaioPorPassos(origemX, origemY, direcaoX, direcaoY, tamanhoDoPasso) {
    let passos = 0;
    while (passos < 100000 && !ehSolida(Math.floor(origemX + direcaoX * passos * tamanhoDoPasso), Math.floor(origemY + direcaoY * passos * tamanhoDoPasso))) {
        passos++;
    }
    return { passos, distancia: passos * tamanhoDoPasso };
}

// ---- 8. TAMANHO DA IMAGEM ----------------------------------
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
    visao.width = larguraDaVisao;   // mudar o tamanho de um canvas também o apaga
    visao.height = alturaDaVisao;

    // Cabe sem rolar: a imagem usa o que sobra depois das outras partes da página. A planta (H) tem o
    // mesmo limite, e o palco reserva a MAIOR das duas: alternar o H não mexe em nada.
    const alturaLivre = window.innerHeight - medirOResto();
    const escala = Math.max(1, Math.floor(Math.min(window.innerWidth / larguraDaVisao, alturaLivre / alturaDaVisao)));
    const larguraDaPlanta = Math.max(120, Math.min(tela.width, window.innerWidth - 32, alturaLivre * tela.width / tela.height));
    const alturaDaPlanta = (larguraDaPlanta - 4) * tela.height / tela.width + 4;   // 4 = as duas bordas
    visao.style.width = larguraDaVisao * escala + "px";
    tela.style.width = larguraDaPlanta + "px";
    palco.style.minHeight = Math.max(alturaDaVisao * escala, alturaDaPlanta) + "px";
    raiosDaTela = [];
}

window.addEventListener("resize", ajustarVisao);

// ---- 9. LOOP -----------------------------------------------
function quadroAQuadro(instanteAtual) {
    const tempo = Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05);
    instanteDoQuadroAnterior = instanteAtual;
    atualizar(tempo);
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

// O jogo só começa se o mapa serve (o erro já foi dito no console).
if (verificarMapa()) {
    colocarJogadorNoInicio();
    ajustarVisao();
    atualizarDirecao();
    atualizarRaios();
    requestAnimationFrame(quadroAQuadro);
}
