/* DIQUE — PASSO 3: canvas, entrada e laço. Depende do regras.js, que o index.html carrega antes. */
const tela = document.getElementById("jogo");
tela.width = TAMANHO * LARGURA_DO_BLOCO + 24; tela.height = ORIGEM.y + TAMANHO * LARGURA_DO_BLOCO / 2 + 12;     // o canvas se ajusta ao mapa: a ilha, o bloco mais alto e 12 px de margem
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const aviso = document.getElementById("aviso");
const COR_DA_ALTURA = ["#d9c27a", "#7fb069", "#4f8a4c", "#8d8d8d", "#d0d4d8"];
const NOME_DA_FACE = { topo: "topo", esquerda: "lateral esquerda", direita: "lateral direita" };
const movimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const SETAS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };     // direções da tela
const ARESTAS_DO_LOSANGO = [[0, -1], [1, 0], [0, 1], [-1, 0]];      // a vizinha que cada aresta (cima→direita, direita→baixo…) separa
let cursor = { x: 4, y: 4 };                    // a casa do cursor
let marcada = false;                            // dois toques: o primeiro marca o cursor, o segundo (na mesma casa) confirma
const pinos = new Set();                        // "x,y" das casas com pino: o que o passo 3 sabe "aplicar" (a enchente e as ferramentas vêm depois)
let ponteiro = null;                            // o pixel do canvas sob o mouse ou o dedo
let dedo = null;                                // o pointerId do ponteiro apertado: um segundo dedo é ignorado
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
    aplicar: function () { aplicar(); },
    cursorParaEsquerda: function () { moverCursor(-1, 0); },     // os botões de seta: o cursor sem teclado
    cursorParaCima: function () { moverCursor(0, -1); },
    cursorParaBaixo: function () { moverCursor(0, 1); },
    cursorParaDireita: function () { moverCursor(1, 0); },
};
const INTENCAO_DA_TECLA = { q: "girarEsquerda", r: "girarDireita", h: "alternarVer" };

function avisar(texto) { aviso.textContent = texto; }       // o leitor de tela anuncia (role="status"); só nos eventos, nunca por quadro

function descreverCasa(x, y) {
    return "casa " + x + ", " + y + ", altura " + alturas[y][x] + (quemEsconde(x, y) ? ", escondida atrás de um bloco" : "");
}

function girarVista(giros) {
    rotacao = (rotacao + giros) % 4;
    listaDeDesenho = montarListaDeDesenho();    // outro giro, outra ordem de pintura
}

function moverCursor(dx, dy) {                  // as setas andam pela tela, em qualquer giro; mexer desmarca
    cursor = casaVizinha(cursor.x, cursor.y, dx, dy) || cursor;
    marcada = false;
    avisar("Cursor na " + descreverCasa(cursor.x, cursor.y));
}

function aplicar() {                            // confirma na casa do cursor: aqui só põe ou tira um pino
    const chave = cursor.x + "," + cursor.y;
    const colocou = !pinos.delete(chave);
    if (colocou) pinos.add(chave);
    marcada = false;
    avisar("Pino " + (colocou ? "colocado" : "retirado") + " na casa " + cursor.x + ", " + cursor.y);
}

function tocar(casa) {                          // dois toques: o primeiro marca a casa, o segundo, na mesma casa, confirma
    if (marcada && casa.x === cursor.x && casa.y === cursor.y) return aplicar();
    cursor = { x: casa.x, y: casa.y };
    marcada = true;
    avisar("Marcada: " + descreverCasa(cursor.x, cursor.y) + ". Toque de novo para confirmar");
}

function pixelDoEvento(evento) {                // do pixel da página para o pixel do canvas (o CSS pode encolhê-lo)
    const caixa = tela.getBoundingClientRect();
    return { x: (evento.clientX - caixa.left) * tela.width / caixa.width, y: (evento.clientY - caixa.top) * tela.height / caixa.height };
}

document.addEventListener("keydown", function (evento) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;      // Ctrl+R recarrega a página, não gira a vista
    const seta = SETAS[evento.key], teclaDeConfirmar = evento.key === "Enter" || evento.key === " ";
    if (teclaDeConfirmar && evento.repeat) { evento.preventDefault(); return; }      // segurar a tecla confirma uma vez só
    const intencao = intencoes[INTENCAO_DA_TECLA[evento.key.toLowerCase()]];
    if (seta) { evento.preventDefault(); moverCursor(seta[0], seta[1]); }
    else if (teclaDeConfirmar && evento.target.tagName !== "BUTTON") { evento.preventDefault(); aplicar(); }      // num botão, Enter e Espaço já o acionam
    else if (intencao) intencao();
});
document.addEventListener("click", function (evento) {      // um ouvinte só para todo botão [data-acao]: os botões, as ferramentas e as setas
    const botao = evento.target.closest("[data-acao]");
    const intencao = botao && intencoes[botao.dataset.acao];
    if (intencao) intencao();
});
tela.addEventListener("pointermove", function (evento) {
    if (dedo === null || evento.pointerId === dedo) ponteiro = pixelDoEvento(evento);
});
tela.addEventListener("pointerdown", function (evento) {
    if (evento.button !== 0 || (dedo !== null && evento.pointerId !== dedo)) return;     // só o botão principal marca; o segundo dedo é ignorado
    dedo = evento.pointerId;
    ponteiro = pixelDoEvento(evento);
    const acerto = acharCasaPeloRaio(ponteiro.x, ponteiro.y);      // topo ou lateral: as duas são do mesmo bloco
    if (acerto) tocar(acerto);
});
["pointerup", "pointercancel"].forEach(function (tipo) {
    window.addEventListener(tipo, function (evento) { if (evento.pointerId === dedo) dedo = null; });
});

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

function desenharLeito(casa, estilo) {          // sob a água, só o fundo na altura dela: sem contorno nem laterais, a água lê-se como uma lâmina só
    pincel.strokeStyle = "transparent";
    tracar(cantosDoBloco(casa.x, casa.y, NIVEL_DA_AGUA), estilo.topo);
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

function encolher(cantos, fator) {              // o mesmo losango, mais perto do centro
    const centro = { x: (cantos[0].x + cantos[2].x) / 2, y: (cantos[0].y + cantos[2].y) / 2 };
    return cantos.map(function (canto) { return { x: centro.x + (canto.x - centro.x) * fator, y: centro.y + (canto.y - centro.y) * fator }; });
}

function desenharCursor(x, y, escondido) {      // amarelo e grosso; tracejado se está atrás de um bloco, borda dupla se está marcado
    const cantos = cantosDoBloco(x, y, alturaVisivel(alturas[y][x]));
    pincel.save();
    pincel.strokeStyle = "#ffe14d"; pincel.lineWidth = 3;
    if (escondido) pincel.setLineDash([4, 3]);
    tracar(cantos);
    if (marcada) tracar(encolher(cantos, 0.6));
    pincel.restore();                           // a espessura de 3 px não vaza para os contornos de 1 px
}

function desenharPino(casa) {                   // uma bandeirinha no topo: forma, não só cor
    const base = mundoParaTela(casa.x + 0.5, casa.y + 0.5, alturaVisivel(casa.altura));
    pincel.strokeStyle = "#101820";
    tracar([base, { x: base.x, y: base.y - 16 }, { x: base.x + 9, y: base.y - 12 }, { x: base.x, y: base.y - 8 }], "#ff5a5a");
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
        const estilo = mar ? ESTILO_DO_MAR : ESTILO_DA_ALTURA[casa.altura];
        if (casa.altura < NIVEL_DA_AGUA) { desenharLeito(casa, estilo); desenharAgua(casa); }
        else desenharCaixa(casa.x, casa.y, 0, casa.altura, estilo);
        if (pinos.has(casa.x + "," + casa.y)) desenharPino(casa);
        if (casa.x === cursor.x && casa.y === cursor.y) desenharCursor(casa.x, casa.y, false);     // na sua vez: o que vem depois a cobre
        desenharRotulo(casa);
    });
}

function desenharEixos() {                      // x e y do mundo, projetados pela mesma matriz
    pincel.lineWidth = 3;                       // o desenharCasas volta a 1 px no quadro seguinte
    [["x", TAMANHO, 0, "#ff5a5a"], ["y", 0, TAMANHO, "#5ab0ff"]].forEach(function (eixo) {
        const fim = mundoParaTela(eixo[1], eixo[2], 0);
        pincel.strokeStyle = pincel.fillStyle = eixo[3];
        tracar([mundoParaTela(0, 0, 0), fim]);
        pincel.fillText(eixo[0], fim.x, fim.y);
    });
}

function desenharRaio() {                       // H: as colunas que o raio atravessou, a face batida e o pixel
    const acerto = ponteiro && acharCasaPeloRaio(ponteiro.x, ponteiro.y);
    if (!acerto) return;
    pincel.save();
    pincel.strokeStyle = "#ffffff"; pincel.lineWidth = 1;
    acerto.visitadas.forEach(function (casa) { tracar(cantosDoBloco(casa.x, casa.y, 0)); });       // as colunas no chão, de frente para trás
    const entrada = telaParaGirado(ponteiro.x, ponteiro.y, ALTURA_MAXIMA), batida = telaParaGirado(ponteiro.x, ponteiro.y, acerto.z);
    tracar([projetar(entrada.x, entrada.y, 0), projetar(batida.x, batida.y, 0)]);                  // o pé do raio no chão: uma reta vertical
    pincel.strokeStyle = "#ffe14d"; pincel.lineWidth = 3;
    tracar(facesDaCasa(acerto.x, acerto.y)[acerto.face]);                                           // a face que o raio acertou
    pincel.fillStyle = "#ffffff"; pincel.fillRect(ponteiro.x - 3, ponteiro.y - 3, 6, 6);
    pincel.restore();
}

function descreverAcerto(acerto) {
    return acerto ? "casa (" + acerto.x + ", " + acerto.y + ") " + NOME_DA_FACE[acerto.face] : "nada";
}

function textoDaLeitura() {
    if (!ponteiro) return "aponte o mouse ou toque no mapa";
    const raio = acharCasaPeloRaio(ponteiro.x, ponteiro.y), bruta = acharCasaPorForcaBruta(ponteiro.x, ponteiro.y);
    const chao = telaParaMundo(ponteiro.x, ponteiro.y, 0);          // o que a inversa do passo 1 achava: sempre o chão
    return "raio: " + descreverAcerto(raio) + (raio ? "  z " + raio.z.toFixed(2) + "  " + raio.visitadas.length + " colunas" : "") + "\n"
        + "força bruta: " + descreverAcerto(bruta) + "  " + (descreverAcerto(raio) === descreverAcerto(bruta) ? "IGUAL" : "DIFERENTE") + "\n"
        + "inversa sem altura: casa (" + Math.floor(chao.x) + ", " + Math.floor(chao.y) + ")  marcada: " + (marcada ? "sim" : "não") + "  pinos: " + pinos.size;
}

function atualizar(tempo) {
    if (!movimentoReduzido) faseDaOnda += tempo * 2;
}

function desenhar() {
    pincel.fillStyle = "#0b1020";
    pincel.fillRect(0, 0, tela.width, tela.height);
    desenharCasas();
    if (quemEsconde(cursor.x, cursor.y)) desenharCursor(cursor.x, cursor.y, true);     // por cima de tudo, tracejado
    if (depuracaoLigada) { desenharEixos(); desenharRaio(); }
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
