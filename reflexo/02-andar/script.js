/*
  REFLEXO — PASSO 2: ANDAR
  Agora o zelador se mexe. Andar é RELATIVO à direção: "frente" é para
  onde ele olha, "lado" é o perpendicular. Teclado e toque viram a mesma
  INTENÇÃO (dealer-out/02), e a colisão confere o corpo contra a grade um
  eixo por vez, como no Pong (pong/05), para deslizar na parede.
*/

// ---- 1. CONSTANTES E O MAPA --------------------------------
const TAMANHO_DA_CASA = 24;   // pixels de desenho por casa

const VELOCIDADE_DE_ANDAR = 3;     // casas por segundo
const VELOCIDADE_DE_GIRO = 2.5;    // radianos por segundo
const RAIO_DO_CORPO = 0.25;        // em casas: o zelador é um círculo
const CASAS_SOLIDAS = "#%DER";     // parede, pedra, porta fechada, emissor, receptor

/*
  Legenda (a do jogo completo):
      #  tijolo    %  pedra    .  chão    E  emissor    R  receptor
      /  \  espelhos    D  porta    S  fenda    X  saída    J  início
  As bordas são sempre parede. Na string, a barra invertida vale duas ("\\").
*/
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
const COR_DAS_PAREDES = { "#": "#964632", "%": "#5a6478" };

// ---- 2. DOM E ESTADO ---------------------------------------
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");

// mapa[linha][coluna]: strings são imutáveis, e o mapa vai mudar.
const mapa = MAPA_EM_TEXTO.map(linha => linha.split(""));

// x e y em CASAS (1,5 = meio da casa 1), não em pixels. `angulo` em radianos:
// 0 = direita; como y desce, π/2 = para baixo. dx e dy são o vetor DIREÇÃO.
const jogador = { x: 0, y: 0, angulo: Math.PI / 4, dx: 0, dy: 0 };

let depuracaoLigada = false;
let instanteDoQuadroAnterior = 0;

// ---- 3. CONFERIR O MAPA, ACHAR O JOGADOR -------------------
// Dado errado não dá erro: dá um desenho torto longe da causa.
function verificarMapa() {
    const inicios = MAPA_EM_TEXTO.join("").split("J").length - 1;
    const bordasFechadas = MAPA_EM_TEXTO.every((linha, i) => linha.length === COLUNAS
        && (i === 0 || i === LINHAS - 1 ? /^#+$/.test(linha) : /^#.*#$/.test(linha)));

    if (inicios !== 1 || !bordasFechadas) {
        console.error(`Mapa inválido: ${inicios} jogadores (esperado 1), bordas fechadas: ${bordasFechadas}.`);
    }
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

verificarMapa();
colocarJogadorNoInicio();
atualizarDirecao();

// ---- 4. DESENHAR A PLANTA ----------------------------------
// Escala do pincel: 1 unidade de desenho = 1 casa (24 pixels), como no mundo.
pincel.scale(TAMANHO_DA_CASA, TAMANHO_DA_CASA);

function desenhar() {
    desenharCasas();
    desenharJogador();
    leitura.textContent = depuracaoLigada ? montarLeitura() : "";
}

function desenharCasas() {
    pincel.font = "bold 0.7px 'Courier New', monospace";
    pincel.textAlign = "center";
    pincel.textBaseline = "middle";
    pincel.strokeStyle = "rgba(255, 255, 255, 0.25)";   // a grade do H
    pincel.lineWidth = 0.04;

    mapa.forEach((linha, y) => linha.forEach((simbolo, x) => {
        pincel.fillStyle = COR_DAS_PAREDES[simbolo] || COR_CHAO;
        pincel.fillRect(x, y, 1, 1);

        if (depuracaoLigada) {
            pincel.strokeRect(x, y, 1, 1);
        }
        if ("ER/\DSX".includes(simbolo)) {
            pincel.fillStyle = COR_SIMBOLO;
            pincel.fillText(simbolo, x + 0.5, y + 0.5);
        }
    }));
}

// O corpo é um círculo; a seta é o vetor direção esticado em 1,5 casa.
function desenharJogador() {
    pincel.strokeStyle = pincel.fillStyle = COR_FEIXE;
    pincel.lineWidth = 0.08;
    pincel.beginPath();
    pincel.moveTo(jogador.x, jogador.y);
    pincel.lineTo(jogador.x + jogador.dx * 1.5, jogador.y + jogador.dy * 1.5);
    pincel.stroke();
    pincel.beginPath();
    pincel.arc(jogador.x, jogador.y, RAIO_DO_CORPO, 0, Math.PI * 2);
    pincel.fill();
}

function montarLeitura() {
    const { x, y, angulo, dx, dy } = jogador;
    return `casa (${Math.floor(x)}, ${Math.floor(y)})  pos (${x.toFixed(2)}, ${y.toFixed(2)})\n`
        + `${(angulo * 180 / Math.PI).toFixed(0)}° = ${angulo.toFixed(3)} rad  dir (${dx.toFixed(2)}, ${dy.toFixed(2)})`;
}

// ---- 5. ENTRADA: TECLADO E TOQUE, A MESMA INTENÇÃO ---------
// Teclas e botões não movem ninguém: só ligam e desligam AÇÕES neste conjunto.
const acoesAtivas = new Set();

const ACAO_DA_TECLA = {
    w: "frente", arrowup: "frente", s: "tras", arrowdown: "tras",
    a: "esquerda", d: "direita", arrowleft: "girarEsquerda", arrowright: "girarDireita"
};

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    if (tecla === "h" && !evento.repeat) {
        depuracaoLigada = !depuracaoLigada;
    }
    if (ACAO_DA_TECLA[tecla] !== undefined) {
        evento.preventDefault();
        acoesAtivas.add(ACAO_DA_TECLA[tecla]);
    }
});

document.addEventListener("keyup", evento => acoesAtivas.delete(ACAO_DA_TECLA[evento.key.toLowerCase()]));
window.addEventListener("blur", () => acoesAtivas.clear());   // soltou a tecla fora da janela

// Os botões da tela fazem o mesmo. Sair do botão com o mouse apertado também solta.
document.querySelectorAll("[data-acao]").forEach(botao => {
    botao.addEventListener("pointerdown", () => acoesAtivas.add(botao.dataset.acao));
    ["pointerup", "pointercancel", "pointerleave"].forEach(tipo => {
        botao.addEventListener(tipo, () => acoesAtivas.delete(botao.dataset.acao));
    });
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
    girar(giro * VELOCIDADE_DE_GIRO * tempo);
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

function ehSolida(coluna, linha) {
    const simbolo = mapa[linha] && mapa[linha][coluna];
    return simbolo === undefined || CASAS_SOLIDAS.includes(simbolo);   // fora do mapa = parede
}

/*
  Bate se o ponto de uma casa sólida MAIS PERTO do centro está a menos de
  um raio. Só se conferem as casas que o quadrado do círculo toca. Cada
  passo (3 × 0,05 s = 0,15) é menor que o raio: o corpo não "pula" paredes.
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

// ---- 7. LOOP -----------------------------------------------
function quadroAQuadro(instanteAtual) {
    const tempo = Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05);
    instanteDoQuadroAnterior = instanteAtual;

    atualizar(tempo);
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

requestAnimationFrame(quadroAQuadro);
