/*
  REFLEXO — PASSO 1: A PLANTA
  Antes do 3D, o jogo precisa saber ONDE as coisas estão: um mapa em texto (o truque
  do Pac-Man) visto de cima, mais o jogador com posição e ângulo. Nada anda ainda.
  A direção usa cosseno e seno, como o tiro do Shoot'em up.
*/

// ---- 1. CONSTANTES E O MAPA --------------------------------
const TAMANHO_DA_CASA = 24;   // pixels de desenho por casa

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
        if ("ER/\\DSX".includes(simbolo)) {
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
    pincel.arc(jogador.x, jogador.y, 0.25, 0, Math.PI * 2);
    pincel.fill();
}

function montarLeitura() {
    const { x, y, angulo, dx, dy } = jogador;
    return `casa (${Math.floor(x)}, ${Math.floor(y)})  pos (${x.toFixed(2)}, ${y.toFixed(2)})\n`
        + `${(angulo * 180 / Math.PI).toFixed(0)}° = ${angulo.toFixed(3)} rad  dir (${dx.toFixed(2)}, ${dy.toFixed(2)})`;
}

// ---- 5. TECLADO E LOOP -------------------------------------
document.addEventListener("keydown", evento => {
    if (evento.key.toLowerCase() === "h" && !evento.repeat) {
        depuracaoLigada = !depuracaoLigada;
    }
});

// Ainda não há o que atualizar: o loop só redesenha. O passo 2 traz o tempo.
function quadroAQuadro() {
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

// O jogo só começa se o mapa serve (o erro já foi dito no console).
if (verificarMapa()) {
    colocarJogadorNoInicio();
    atualizarDirecao();
    requestAnimationFrame(quadroAQuadro);
}
