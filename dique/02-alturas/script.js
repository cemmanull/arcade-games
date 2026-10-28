/* DIQUE — PASSO 2: canvas, entrada e laço. Depende do regras.js, que o index.html carrega antes. */
const tela = document.getElementById("jogo");
tela.width = TAMANHO * LARGURA_DO_BLOCO + 24; tela.height = ORIGEM.y + TAMANHO * LARGURA_DO_BLOCO / 2 + 12;     // o canvas se ajusta ao mapa: a ilha, o bloco mais alto e 12 px de margem
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const COR_DA_ALTURA = ["#d9c27a", "#7fb069", "#4f8a4c", "#8d8d8d", "#d0d4d8"];
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SETAS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };     // direções da tela
const ARESTAS_DO_LOSANGO = [[0, -1], [1, 0], [0, 1], [-1, 0]];      // a vizinha que cada aresta (cima→direita, direita→baixo…) separa
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

function estiloDaAgua(casa) {                   // translúcida, com borda branca onde a água termina (forma, não só cor); a onda mexe no alfa
    const alfa = 0.55 + (movimentoReduzido ? 0 : 0.07 * Math.sin(faseDaOnda + casa.x * 0.9 + casa.y * 0.6));
    return { topo: "rgba(42, 111, 219, " + alfa + ")", contorno: "rgba(255, 255, 255, 0.7)" };
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

function moverCursor(dx, dy) { cursor = casaVizinha(cursor.x, cursor.y, dx, dy) || cursor; }     // as setas andam pela tela, em qualquer giro

function apontar(evento) {
    const caixa = tela.getBoundingClientRect();
    chaoSobOPonteiro = telaParaMundo((evento.clientX - caixa.left) * tela.width / caixa.width, (evento.clientY - caixa.top) * tela.height / caixa.height, 0);
    const x = Math.floor(chaoSobOPonteiro.x), y = Math.floor(chaoSobOPonteiro.y);
    if (x >= 0 && y >= 0 && x < TAMANHO && y < TAMANHO) cursor = { x: x, y: y };
}

document.addEventListener("keydown", function (evento) {
    const seta = SETAS[evento.key];
    if (seta) { evento.preventDefault(); moverCursor(seta[0], seta[1]); return; }
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

function desenharCaixa(x, y, de, ate, estilo) { // uma caixa da altura `de` à `ate`: duas laterais e o topo
    const topo = cantosDoBloco(x, y, ate), base = cantosDoBloco(x, y, de);
    pincel.strokeStyle = estilo.contorno;
    tracar([topo[3], topo[2], base[2], base[3]], estilo.esquerda);
    tracar([topo[2], topo[1], base[1], base[2]], estilo.direita);
    tracar(topo, estilo.topo);
}

function desenharAgua(casa) {                   // uma superfície plana: sem laterais, e a borda só onde a água termina
    const estilo = estiloDaAgua(casa), topo = cantosDoBloco(casa.x, casa.y, NIVEL_DA_AGUA);
    pincel.strokeStyle = "transparent";         // sem contorno: duas águas vizinhas não deixam linha entre si
    tracar(topo, estilo.topo);
    pincel.strokeStyle = estilo.contorno;
    ARESTAS_DO_LOSANGO.forEach(function (direcao, i) {
        const vizinha = casaVizinha(casa.x, casa.y, direcao[0], direcao[1]);
        if (!vizinha || alturas[vizinha.y][vizinha.x] >= NIVEL_DA_AGUA) tracar([topo[i], topo[(i + 1) % 4]]);
    });
}

function desenharCursor(x, y, escondido) {      // amarelo e grosso; tracejado quando está atrás de um bloco (forma, não só cor)
    pincel.save();
    pincel.strokeStyle = "#ffe14d"; pincel.lineWidth = 3;
    if (escondido) pincel.setLineDash([4, 3]);
    tracar(cantosDoBloco(x, y, alturaVisivel(alturas[y][x])));
    pincel.restore();                           // a espessura de 3 px não vaza para os contornos de 1 px
}

function desenharRotulo(casa) {                 // contorno escuro e preenchimento branco: lê-se sobre qualquer cor
    const objeto = OBJETOS_EM_TEXTO[casa.y][casa.x];
    const mar = ALTURAS_EM_TEXTO[casa.y][casa.x] === "~";
    const rotulo = (objeto === "." ? "" : objeto) + (depuracaoLigada && !mar ? casa.altura : "");
    const centro = mundoParaTela(casa.x + 0.5, casa.y + 0.5, alturaVisivel(casa.altura));
    pincel.save();
    pincel.lineWidth = 3; pincel.strokeStyle = "#101820"; pincel.strokeText(rotulo, centro.x, centro.y);
    pincel.fillStyle = "#ffffff"; pincel.fillText(rotulo, centro.x, centro.y);
    pincel.restore();
}

function desenharCasas() {                      // percorre a lista na ordem: cada casa cobre o que já foi pintado atrás dela
    pincel.lineWidth = 1;                       // contorno fino de 1 px em todo bloco
    listaDeDesenho.forEach(function (casa) {
        const mar = ALTURAS_EM_TEXTO[casa.y][casa.x] === "~";
        desenharCaixa(casa.x, casa.y, 0, casa.altura, mar ? ESTILO_DO_MAR : ESTILO_DA_ALTURA[casa.altura]);
        if (casa.altura < NIVEL_DA_AGUA) desenharAgua(casa);
        if (casa.x === cursor.x && casa.y === cursor.y) desenharCursor(casa.x, casa.y, false);     // na sua vez: o que vem depois a cobre
        desenharRotulo(casa);
    });
}

function desenharEixosEPonteiro() {             // x e y do mundo; e onde a inversa (sem altura) acha que o dedo está
    pincel.lineWidth = 3;                       // o desenharCasas volta a 1 px no quadro seguinte
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
    const casa = listaDeDesenho[posicao], bloqueio = quemEsconde(cursor.x, cursor.y);
    return "casa (" + cursor.x + ", " + cursor.y + ")  altura " + casa.altura + "  giro " + rotacao * 90 + "°"
        + (bloqueio ? "  ESCONDIDA atrás de (" + bloqueio.x + ", " + bloqueio.y + "): tracejado" : "") + "\n"
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
    if (quemEsconde(cursor.x, cursor.y)) desenharCursor(cursor.x, cursor.y, true);     // por cima de tudo, tracejado
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
if (MAPA_VALIDO) requestAnimationFrame(quadroAQuadro);
