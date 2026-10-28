/* DIQUE — PASSO 1: canvas, entrada e laço. Depende do regras.js, que o index.html carrega antes. */
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const COR_DA_ALTURA = ["#d9c27a", "#7fb069", "#4f8a4c", "#8d8d8d", "#d0d4d8"];
let cursor = { x: 4, y: 4 };                    // a casa marcada
let chaoSobOPonteiro = null;                    // o que a inversa responde para o dedo
let depuracaoLigada = false;

function alternarVer() { depuracaoLigada = !depuracaoLigada; }      // teclado e botão: a mesma intenção
function apontar(evento) {
    const caixa = tela.getBoundingClientRect();
    chaoSobOPonteiro = telaParaMundo((evento.clientX - caixa.left) * tela.width / caixa.width, (evento.clientY - caixa.top) * tela.height / caixa.height);
    const x = Math.floor(chaoSobOPonteiro.x), y = Math.floor(chaoSobOPonteiro.y);
    if (x >= 0 && y >= 0 && x < TAMANHO && y < TAMANHO) cursor = { x: x, y: y };
}

document.addEventListener("keydown", function (evento) { if (evento.key.toLowerCase() === "h") alternarVer(); });
document.getElementById("ver").addEventListener("click", alternarVer);
tela.addEventListener("pointerdown", apontar);
tela.addEventListener("pointermove", apontar);

function tracar(pontos, cor) {                  // contorna o polígono; com cor, também o preenche
    pincel.beginPath();
    pontos.forEach(function (ponto, i) { pincel[i === 0 ? "moveTo" : "lineTo"](ponto.x, ponto.y); });
    pincel.closePath();
    if (cor) { pincel.fillStyle = cor; pincel.fill(); }
    pincel.stroke();
}

function desenharCasas() {
    pincel.lineWidth = 1;
    pincel.strokeStyle = "rgba(0, 0, 0, 0.5)";
    alturas.forEach(function (linha, y) {
        linha.forEach(function (altura, x) {
            const mar = ALTURAS_EM_TEXTO[y][x] === "~";
            tracar(cantosDoBloco(x, y), mar ? "#1f5a9a" : COR_DA_ALTURA[altura]);
            const centro = mundoParaTela(x + 0.5, y + 0.5);
            if (depuracaoLigada && !mar) { pincel.fillStyle = "#101820"; pincel.fillText(altura, centro.x, centro.y); }
        });
    });
}

function desenharEixos() {                      // x e y do mundo, projetados pela mesma matriz
    pincel.lineWidth = 3;
    [["x", TAMANHO, 0, "#ff5a5a"], ["y", 0, TAMANHO, "#5ab0ff"]].forEach(function (eixo) {
        const fim = mundoParaTela(eixo[1], eixo[2]);
        pincel.strokeStyle = pincel.fillStyle = eixo[3];
        tracar([mundoParaTela(0, 0), fim]);
        pincel.fillText(eixo[0], fim.x, fim.y);
    });
}

function textoDaMatriz() {
    const formato = function (matriz) { return matriz.map(function (linha) { return "[" + linha.map(function (n) { return n.toFixed(4); }).join(" ") + "]"; }).join(" "); };
    const chao = chaoSobOPonteiro ? chaoSobOPonteiro.x.toFixed(2) + ", " + chaoSobOPonteiro.y.toFixed(2) : "—";
    return "M  = " + formato(MATRIZ) + "  det = " + DETERMINANTE + "\nM⁻¹ = " + formato(INVERSA) + "\ncasa (" + cursor.x + ", " + cursor.y + ")  chão sob o dedo (" + chao + ")";
}

function desenhar() {
    pincel.fillStyle = "#0b1020";
    pincel.fillRect(0, 0, tela.width, tela.height);
    desenharCasas();
    pincel.strokeStyle = "#ffe14d";
    pincel.lineWidth = 3;
    tracar(cantosDoBloco(cursor.x, cursor.y));
    if (depuracaoLigada) desenharEixos();
    leitura.textContent = depuracaoLigada ? textoDaMatriz() : "";
}

function quadroAQuadro() {
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

pincel.font = "bold 11px monospace"; pincel.textAlign = "center"; pincel.textBaseline = "middle";
requestAnimationFrame(quadroAQuadro);
