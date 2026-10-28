/* DIQUE — PASSO 2: canvas, entrada e laço. Depende do regras.js, que o index.html carrega antes. */
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const COR_DA_ALTURA = ["#d9c27a", "#7fb069", "#4f8a4c", "#8d8d8d", "#d0d4d8"];
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let cursor = { x: 4, y: 4 };                    // a casa marcada
let chaoSobOPonteiro = null;                    // o que a inversa responde para o dedo (ainda sem contar a altura)
let depuracaoLigada = false;
let faseDaOnda = 0;
let instanteDoQuadroAnterior = performance.now();

function escurecer(corHex, fator) {             // "#7fb069" × 0,7 → "rgb(89, 123, 73)"
    const canais = [1, 3, 5].map(function (inicio) { return Math.round(parseInt(corHex.substr(inicio, 2), 16) * fator); });
    return "rgb(" + canais.join(", ") + ")";
}

function estiloDoBloco(corDoTopo) {             // topo e duas laterais: a da esquerda 30% mais escura, a da direita 50%
    return { topo: corDoTopo, esquerda: escurecer(corDoTopo, 0.7), direita: escurecer(corDoTopo, 0.5), contorno: "rgba(0, 0, 0, 0.5)" };
}

const ESTILO_DA_ALTURA = COR_DA_ALTURA.map(estiloDoBloco);
const ESTILO_DO_MAR = estiloDoBloco("#17406b");

function estiloDaAgua(casa) {                   // translúcida, com borda branca (forma, não só cor); a onda mexe no alfa
    const alfa = 0.55 + (movimentoReduzido ? 0 : 0.07 * Math.sin(faseDaOnda + casa.x * 0.9 + casa.y * 0.6));
    return { topo: "rgba(42, 111, 219, " + alfa + ")", esquerda: "rgba(30, 80, 170, " + alfa + ")", direita: "rgba(20, 60, 140, " + alfa + ")", contorno: "rgba(255, 255, 255, 0.35)" };
}

const intencoes = {                             // teclado, mouse e toque chamam as mesmas funções
    girarEsquerda: function () { girarVista(3); },
    girarDireita: function () { girarVista(1); },
    alternarVer: function () { depuracaoLigada = !depuracaoLigada; },
};
const INTENCAO_DA_TECLA = { q: "girarEsquerda", r: "girarDireita", h: "alternarVer" };

function girarVista(giros) {
    rotacao = (rotacao + giros) % 4;
    listaDeDesenho = montarListaDeDesenho();    // outro giro, outra ordem de pintura
}

function apontar(evento) {
    const caixa = tela.getBoundingClientRect();
    chaoSobOPonteiro = telaParaMundo((evento.clientX - caixa.left) * tela.width / caixa.width, (evento.clientY - caixa.top) * tela.height / caixa.height, 0);
    const x = Math.floor(chaoSobOPonteiro.x), y = Math.floor(chaoSobOPonteiro.y);
    if (x >= 0 && y >= 0 && x < TAMANHO && y < TAMANHO) cursor = { x: x, y: y };
}

document.addEventListener("keydown", function (evento) {
    const intencao = intencoes[INTENCAO_DA_TECLA[evento.key.toLowerCase()]];
    if (intencao) intencao();
});
document.getElementById("botoes").addEventListener("click", function (evento) {
    const intencao = intencoes[evento.target.dataset.acao];
    if (intencao) intencao();
});
tela.addEventListener("pointerdown", apontar);
tela.addEventListener("pointermove", apontar);

function tracar(pontos, cor) {                  // contorna o polígono; com cor, também o preenche
    pincel.beginPath();
    pontos.forEach(function (ponto, i) { pincel[i === 0 ? "moveTo" : "lineTo"](ponto.x, ponto.y); });
    pincel.closePath();
    if (cor) { pincel.fillStyle = cor; pincel.fill(); }
    pincel.stroke();
}

function desenharCaixa(x, y, de, ate, estilo) { // uma caixa da altura `de` à `ate`: duas laterais e o topo (a água é uma caixa fina)
    const topo = cantosDoBloco(x, y, ate), base = cantosDoBloco(x, y, de);
    pincel.strokeStyle = estilo.contorno;
    tracar([topo[3], topo[2], base[2], base[3]], estilo.esquerda);
    tracar([topo[2], topo[1], base[1], base[2]], estilo.direita);
    tracar(topo, estilo.topo);
}

function desenharCasas() {                      // percorre a lista na ordem: cada casa cobre o que já foi pintado atrás dela
    listaDeDesenho.forEach(function (casa) {
        const mar = ALTURAS_EM_TEXTO[casa.y][casa.x] === "~";
        desenharCaixa(casa.x, casa.y, 0, casa.altura, mar ? ESTILO_DO_MAR : ESTILO_DA_ALTURA[casa.altura]);
        if (casa.altura < NIVEL_DA_AGUA) desenharCaixa(casa.x, casa.y, casa.altura, NIVEL_DA_AGUA, estiloDaAgua(casa));
        const objeto = OBJETOS_EM_TEXTO[casa.y][casa.x];
        const rotulo = (objeto === "." ? "" : objeto) + (depuracaoLigada && !mar ? casa.altura : "");
        const centro = mundoParaTela(casa.x + 0.5, casa.y + 0.5, casa.altura);
        pincel.lineWidth = 3;
        pincel.strokeStyle = "#101820";
        pincel.strokeText(rotulo, centro.x, centro.y);          // contorno escuro: o rótulo lê-se sobre qualquer cor
        pincel.fillStyle = "#ffffff";
        pincel.fillText(rotulo, centro.x, centro.y);
    });
}

function desenharEixosEPonteiro() {             // x e y do mundo; e onde a inversa (sem altura) acha que o dedo está
    pincel.lineWidth = 3;
    [["x", TAMANHO, 0, "#ff5a5a"], ["y", 0, TAMANHO, "#5ab0ff"]].forEach(function (eixo) {
        const fim = mundoParaTela(eixo[1], eixo[2], 0);
        pincel.strokeStyle = pincel.fillStyle = eixo[3];
        tracar([mundoParaTela(0, 0, 0), fim]);
        pincel.fillText(eixo[0], fim.x, fim.y);
    });
    if (!chaoSobOPonteiro) return;
    const ponto = mundoParaTela(chaoSobOPonteiro.x, chaoSobOPonteiro.y, 0);
    pincel.fillStyle = "#ffffff";
    pincel.fillRect(ponto.x - 3, ponto.y - 3, 6, 6);
}

function textoDaLeitura() {
    const posicao = listaDeDesenho.findIndex(function (casa) { return casa.x === cursor.x && casa.y === cursor.y; });
    const casa = listaDeDesenho[posicao];
    return "casa (" + cursor.x + ", " + cursor.y + ")  altura " + casa.altura + "  giro " + rotacao * 90 + "°\n"
        + "x'+y' = " + casa.proximidade + "  pintada em " + (posicao + 1) + "º de " + listaDeDesenho.length + "\n"
        + "det M = " + DETERMINANTE + "  quadrado branco: o chão que a inversa acha sob o dedo";
}

function atualizar(tempo) {
    if (!movimentoReduzido) faseDaOnda += tempo * 2;
}

function desenhar() {
    pincel.fillStyle = "#0b1020";
    pincel.fillRect(0, 0, tela.width, tela.height);
    desenharCasas();
    const contorno = cantosDoBloco(cursor.x, cursor.y, alturas[cursor.y][cursor.x]);
    pincel.strokeStyle = "#ffe14d";
    pincel.lineWidth = 3;
    tracar(contorno);
    if (depuracaoLigada) desenharEixosEPonteiro();
    leitura.textContent = depuracaoLigada ? textoDaLeitura() : "";
}

function quadroAQuadro(instanteAtual) {
    const tempo = Math.max(0, Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05));
    instanteDoQuadroAnterior = instanteAtual;
    atualizar(tempo);
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

pincel.font = "bold 11px monospace"; pincel.textAlign = "center"; pincel.textBaseline = "middle";
if (verificarMapa()) requestAnimationFrame(quadroAQuadro);
