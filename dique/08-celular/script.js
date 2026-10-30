/* DIQUE — PASSO 8: canvas, entrada e laço, agora para a mão e para o leitor de tela: opção de reduzir movimento, avisos em texto, resumo das alturas e o tempo de cada quadro (a página de medição lê). Depende do regras.js, que o index.html carrega antes. */
const tela = document.getElementById("jogo");
tela.width = LARGURA_DA_VISTA; tela.height = ALTURA_DA_VISTA;     // o canvas agora é a janela; o mapa passa pela câmera
const pincel = tela.getContext("2d");
const leitura = document.getElementById("leitura");
const aviso = document.getElementById("aviso");
const painel = document.getElementById("painel");
const resumo = document.getElementById("resumo");
const botaoDoMovimento = document.querySelector('[data-acao="alternarMovimento"]');
const titulo = document.getElementById("dia");
const objetivo = document.getElementById("objetivo");
const tabua = document.getElementById("tabua");
const botaoDaMare = document.querySelector('[data-acao="avancar"]');
const COR_DA_ALTURA = ["#d9c27a", "#7fb069", "#4f8a4c", "#8d8d8d", "#d0d4d8"];
const NOME_DA_FACE = { topo: "topo", esquerda: "lateral esquerda", direita: "lateral direita" };
const preferenciaDoSistema = window.matchMedia("(prefers-reduced-motion: reduce)").matches;     // o sistema pede menos movimento; o botão Calmo (ou a tecla O) pede também
const SETAS = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };     // direções da tela
const ARESTAS_DO_LOSANGO = [[0, -1], [1, 0], [0, 1], [-1, 0]];      // a vizinha que cada aresta (cima→direita, direita→baixo…) separa
const CENTRO_DA_VISTA = { x: LARGURA_DA_VISTA / 2, y: ALTURA_DA_VISTA / 2 };
const PASSO_DA_ROLAGEM = 24;                    // pixels da janela por toque de tecla
const LIMITE_DO_TOQUE = 8;                      // um arrasto maior que isto (pixels) rola o mapa; menor é um toque
const LIMIAR_DA_RODA = 100;                     // deltaY acumulado que vale um degrau de zoom: um trackpad manda dezenas de eventos pequenos
const PIXELS_POR_DELTA_DA_RODA = [1, 40, LIMIAR_DA_RODA];     // por deltaMode: pixels; linhas (o Firefox); páginas (uma página vale um degrau)
const PAUSA_DA_RODA = 300;                      // milissegundos sem roda: o acúmulo recomeça do zero
const NOME_DO_ZOOM = ["longe", "no meio", "perto"];     // um por degrau de ZOOMS
const PASSO_DA_MARE = 0.5;                      // segundos entre um passo da água e o próximo: a maré é um filme curto
const TEMPO_DE_LEITURA = 1.5;                   // a ficha fica em destaque antes de moldar
const PAUSA_NA_PREAMAR = 1;                     // a água para no alto antes de contar as casas
const NOME_DA_MARE = { baixa: "baixa-mar", enchente: "enchente", preamar: "preamar", vazante: "vazante" };
const NOME_DA_FERRAMENTA = { erguer: "Erguer", cavar: "Cavar" };
const TEXTO_DA_MARCA = { "✓": "✓ Salva", "✗": "✗ Alagada", "": "" };     // o estado da casa em palavras: nunca só o símbolo, nunca só a cor
const NOME_DO_OBJETO = { C: "casa", P: "cais", N: "nascente", ".": "" };
let cursor = { x: 4, y: 4 };                    // a casa do cursor
let marcada = false;                            // dois toques: o primeiro marca o cursor, o segundo (na mesma casa) confirma
let indiceDoDia = 0;                            // o dia de agora em DIAS
let jogadas = 0;                                // erguer e cavar aplicados no dia (desfazer devolve): a medida do par
let estadoAtual = estadoInicial();             // terreno e estoque de agora; cada jogada o troca por um estado novo
let historico = [];                             // os estados de antes: desfazer é voltar ao último
let ferramenta = "erguer";
let fase = "ler";                               // o dia (TRANSICOES.dia): ler → moldar → mare → contar → ler (próxima ficha) ou fim
let faseDaMare = "baixa";                       // a maré (TRANSICOES.mare): baixa → enchente → preamar → vazante → baixa
let indiceDaMare = 0;                           // a ficha de agora na tabuaDeMares
let passoDaMare = 0;                            // quantos passos a água já deu nesta maré
let perdidas = criarMatriz(false);              // as casas alagadas em alguma maré do dia: perdidas para sempre
let relogioDaFase = 0;                          // segundos desde a última troca de fase
let previsao = null;                            // aguaDaFicha do terreno de agora: a ordem em que a maré enche as casas
let alcance = null;                             // buscaEmLargura do terreno de agora: até onde a água chegaria sem limite de volume
let ponteiro = null;                            // o pixel da janela sob o mouse ou o dedo
let dedo = null;                                // o ponteiro apertado: { id, inicio, ultimo, arrastando }
let giroDaRoda = 0;                             // deltaY somado (em pixels) desde o último degrau de zoom, pausa ou inversão
let instanteDaRoda = 0;                         // quando veio o último evento da roda
let movimentoReduzido = preferenciaDoSistema;   // sem ondas, sem chuva em queda, e a maré anda um passo por toque
let depuracaoLigada = false;
let ultimoResumo = "";                          // o texto do resumo de agora: o DOM só muda quando ele muda
let ultimoTempoDeAtualizacao = 0, ultimoTempoDeDesenho = 0, ultimoTempoDeQuadro = 0;     // ms do último quadro (a medição de celular lê estes)
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
    return { topo: "rgba(42, 111, 219, " + alfa + ")", esquerda: "rgba(29, 78, 153, " + alfa + ")", direita: "rgba(21, 56, 110, " + alfa + ")", contorno: "rgba(255, 255, 255, 0.7)" };
}

const intencoes = {                             // teclado, mouse e toque chamam as mesmas funções
    girarEsquerda: function () { girarVista(3); },
    girarDireita: function () { girarVista(1); },
    alternarVer: function () { depuracaoLigada = !depuracaoLigada; },
    alternarMovimento: function () { definirMovimento(!movimentoReduzido); },
    abrirResumo: function () { resumo.focus(); },
    aplicar: function () { aplicar(); },
    escolherErguer: function () { escolherFerramenta("erguer"); },
    escolherCavar: function () { escolherFerramenta("cavar"); },
    desfazer: function () { desfazer(); },
    avancar: function () { avancar(); },
    reiniciar: function () { reiniciar(); },
    aproximar: function () { mudarZoom(1, CENTRO_DA_VISTA); },
    afastar: function () { mudarZoom(-1, CENTRO_DA_VISTA); },
    rolarParaCima: function () { rolarComAviso(0, PASSO_DA_ROLAGEM, "cima"); },     // a janela sobe: o mapa desce
    rolarParaBaixo: function () { rolarComAviso(0, -PASSO_DA_ROLAGEM, "baixo"); },
    rolarParaEsquerda: function () { rolarComAviso(PASSO_DA_ROLAGEM, 0, "a esquerda"); },
    rolarParaDireita: function () { rolarComAviso(-PASSO_DA_ROLAGEM, 0, "a direita"); },
    cursorParaEsquerda: function () { moverCursor(-1, 0); },     // os botões de seta: o cursor sem teclado
    cursorParaCima: function () { moverCursor(0, -1); },
    cursorParaBaixo: function () { moverCursor(0, 1); },
    cursorParaDireita: function () { moverCursor(1, 0); },
};
const INTENCAO_DA_TECLA = {
    q: "girarEsquerda", r: "girarDireita", h: "alternarVer", o: "alternarMovimento", l: "abrirResumo", "+": "aproximar", "=": "aproximar", "-": "afastar",
    1: "escolherErguer", 2: "escolherCavar", z: "desfazer", m: "avancar", n: "reiniciar",
    w: "rolarParaCima", s: "rolarParaBaixo", a: "rolarParaEsquerda", d: "rolarParaDireita",
};

function definirMovimento(reduzido) {           // o botão e a tecla O; o sistema pode pedir menos movimento, e o jogador pode pedir também
    movimentoReduzido = reduzido;
    botaoDoMovimento.setAttribute("aria-pressed", reduzido);
    avisar(reduzido ? "Movimento reduzido: a maré anda um passo por toque em Maré" : "Movimento normal: a maré corre sozinha");
}

function avisar(texto) { aviso.textContent = texto; }       // o leitor de tela anuncia (role="status"); só nos eventos, nunca por quadro

function descreverCasa(x, y) {
    return "bloco " + x + "," + y + ", altura " + alturas[y][x] + (objetosEmTexto[y][x] === "C" ? ", com casa" : "") + (quemEsconde(x, y) ? ", escondido atrás de outro bloco" : "");
}

function mudarZoom(passo, foco) {
    const zoomAnterior = camera.zoom;
    aproximar(passo, foco);
    avisar("Zoom: " + NOME_DO_ZOOM[ZOOMS.indexOf(camera.zoom)] + (camera.zoom === zoomAnterior ? " (limite)" : ""));
}

function rolarComAviso(dx, dy, direcao) {       // a tecla de rolagem anuncia para onde o mapa andou, ou que ele acabou
    const antes = camera.desvioX + "," + camera.desvioY;
    rolar(dx, dy);
    avisar(antes === camera.desvioX + "," + camera.desvioY ? "Sem mais mapa para " + direcao : "Mapa rolado para " + direcao);
}

function mostrarCursor() {                      // rola o mínimo para o cursor aparecer: com zoom, o teclado alcança a ilha toda
    const ponto = paraATela(mundoParaTela(cursor.x + 0.5, cursor.y + 0.5, alturaVisivel(cursor.x, cursor.y)));
    const margem = 24;
    rolar(Math.max(0, margem - ponto.x) + Math.min(0, LARGURA_DA_VISTA - margem - ponto.x),
        Math.max(0, margem - ponto.y) + Math.min(0, ALTURA_DA_VISTA - margem - ponto.y));
}

function girarVista(giros) {
    rotacao = (rotacao + giros) % 4;
    listaDeDesenho = montarListaDeDesenho();    // outro giro, outra ordem de pintura
    mostrarCursor();
    avisar("Vista girada para " + rotacao * 90 + " graus. Casas escondidas: " + casasEscondidas().length);
}

function moverCursor(dx, dy) {                  // as setas andam pela tela, em qualquer giro; mexer desmarca
    cursor = casaVizinha(cursor.x, cursor.y, dx, dy) || cursor;
    marcada = false;
    mostrarCursor();
    avisar("Cursor no " + descreverCasa(cursor.x, cursor.y));
}

function fichaDeAgora() {
    return tabuaDeMares[indiceDaMare];
}

function descreverFicha(ficha) {
    return "nível " + ficha.nivel + ", " + ficha.passos + " passos de " + volumeDoPasso(ficha) + " casas, " + (ficha.chuva ? "com chuva" : "sem chuva") + ", chegam " + ficha.blocos + " blocos";
}

function irPara(maquina, destino) {             // só as transições da tabela valem; devolve se a fase mudou
    const de = maquina === "dia" ? fase : faseDaMare;
    if (!transicaoValida(maquina, de, destino)) return false;
    if (maquina === "dia") fase = destino; else faseDaMare = destino;
    relogioDaFase = 0;
    return true;
}

function quantasFontes() {                      // as casas do mar que a água cobre de graça, sem gastar volume: o início da ordem da previsão
    return previsao.ordem.filter(function (casa) { return casa.distancia === 0; }).length;
}

function descreverCasaDoResumo(x, y) {         // uma casa do mapa em palavras: altura, água, objeto e, na casa, se está salva ou alagada
    if (alturasEmTexto[y][x] === "~") return "x" + x + " mar";
    const objeto = objetosEmTexto[y][x], estado = objeto === "C" ? TEXTO_DA_MARCA[marcaDaCasa({ x: x, y: y })] : "";
    return ["x" + x, "altura " + alturas[y][x], agua.alagado[y][x] ? "com água" : "", NOME_DO_OBJETO[objeto], estado].filter(Boolean).join(" ");
}

function atualizarResumo() {                    // o mapa em texto para o leitor de tela, uma linha da ilha por item (a mesma lista do desenho, sem o desenho)
    const linhas = alturas.map(function (linha, y) {
        return "Linha " + y + ": " + linha.map(function (altura, x) { return descreverCasaDoResumo(x, y); }).join(", ");
    });
    linhas.unshift("Dia " + (indiceDoDia + 1) + " de " + DIAS.length + ". " + textoDoPainel() + ". " + textoDoObjetivo());
    const texto = linhas.join("|");
    if (texto === ultimoResumo) return;
    ultimoResumo = texto;
    resumo.replaceChildren(...linhas.map(function (linha) {
        const item = document.createElement("li");
        item.textContent = linha;
        return item;
    }));
}

function mostrarAgua() {                        // a água que se vê: a baixa-mar, ou a previsão do mar até o passo de agora, mais a água das nascentes (nível 1, já inteira)
    if (faseDaMare === "baixa") definirAgua(NIVEL_DA_BAIXA_MAR, buscaEmLargura(alturas, NIVEL_DA_BAIXA_MAR, casasDoMar).ordem);
    else definirAgua(fichaDeAgora().nivel, previsao.ordem.slice(0, quantasFontes() + passoDaMare * volumeDoPasso(fichaDeAgora())).concat(previsao.nascentes));
    atualizarResumo();
}

function trocarEstado(novoEstado) {             // o terreno, a lista do pintor, a água e a previsão da ficha de agora seguem o estado
    estadoAtual = novoEstado;
    alturas = novoEstado.alturas;
    listaDeDesenho = montarListaDeDesenho();
    alcance = buscaEmLargura(alturas, fichaDeAgora().nivel, casasDoMar);
    previsao = aguaDaFicha(alturas, fichaDeAgora(), fichaDeAgora().passos);
    mostrarAgua();
}

function comecarMare(indice) {                  // a ficha chega: o dia está em "ler", com os blocos dela somados ao que sobrou
    indiceDaMare = indice;
    historico = [];                             // desfazer só volta até o começo desta maré
    marcada = false;
    trocarEstado(receberBlocos(estadoAtual, fichaDeAgora()));
    avisar(indice === 0 ? "Dia " + (indiceDoDia + 1) + " de " + DIAS.length + ": " + DIAS[indiceDoDia].dica : "Maré " + (indice + 1) + " de " + tabuaDeMares.length + ": " + descreverFicha(fichaDeAgora()));
}

function iniciarDia(indice) {                   // carrega o dia e começa do zero: ficha 0, estoque vazio mais os blocos dela
    if (!carregarDia(DIAS[indice])) return avisar("Este dia está com defeito: veja o console");
    indiceDoDia = indice;
    reiniciar();
}

function reiniciar() {                          // recomeçar não é uma transição da tabela: é voltar ao estado inicial, como recarregar a página; por isso zera o relógio também
    fase = "ler";
    faseDaMare = "baixa";
    relogioDaFase = 0;
    passoDaMare = 0;
    perdidas = criarMatriz(false);
    jogadas = 0;
    estadoAtual = estadoInicial();
    comecarMare(0);
}

function podeMoldar() {                         // aplicar, desfazer e a maré valem em "moldar"; mexer durante a leitura pula a leitura
    if (fase === "ler") irPara("dia", "moldar");
    return fase === "moldar";
}

function escolherFerramenta(nome) {
    ferramenta = nome;
    document.querySelectorAll("[data-ferramenta]").forEach(function (botao) { botao.setAttribute("aria-pressed", botao.dataset.ferramenta === nome); });
    avisar("Ferramenta: " + NOME_DA_FERRAMENTA[nome]);
}

function aplicar() {                            // confirma na casa do cursor: erguer ou cavar, só antes da maré
    marcada = false;
    if (!podeMoldar()) return avisar("Agora não: a maré está em curso. N recomeça o dia");
    const novoEstado = moldar(estadoAtual, ferramenta, cursor.x, cursor.y);
    if (!novoEstado) return avisar("Não dá: " + motivoDaRecusa(estadoAtual, ferramenta, cursor.x, cursor.y));
    historico.push(estadoAtual);
    jogadas++;
    trocarEstado(novoEstado);
    avisar("Bloco " + cursor.x + "," + cursor.y + (ferramenta === "erguer" ? " subiu" : " desceu") + " para " + alturas[cursor.y][cursor.x] + ". Blocos no estoque: " + estadoAtual.blocos);
}

function desfazer() {
    marcada = false;
    if (!podeMoldar()) return avisar("A maré não se desfaz. N recomeça o dia");
    if (historico.length === 0) return avisar("Nada para desfazer nesta maré");
    trocarEstado(historico.pop());
    jogadas--;
    avisar("Desfeito. Blocos: " + estadoAtual.blocos);
}

function avancar() {                            // M: libera a maré; depois que ela passa, chama a próxima ficha; no fim de um dia vencido, abre o próximo dia
    if (fase === "contar" && faseDaMare === "baixa") return seguirParaAProximaMare();
    if (fase === "fim" && diaVencido()) return iniciarDia((indiceDoDia + 1) % DIAS.length);      // depois do último, volta ao primeiro
    if (movimentoReduzido && faseDaMare !== "baixa") return darPassoDaMare();
    if (!podeMoldar()) return avisar(fase === "fim" ? "O dia acabou. N recomeça" : "Espere a água");
    liberarMare();
}

function liberarMare() {                        // moldar → mare, e a maré sai da baixa-mar: o mar sobe, e a previsão vira filme passo a passo
    irPara("dia", "mare");
    irPara("mare", "enchente");
    passoDaMare = 0;
    marcada = false;
    mostrarAgua();
    avisar("Maré liberada: nível " + fichaDeAgora().nivel + (fichaDeAgora().chuva ? ", com chuva" : "") + (movimentoReduzido ? ". Maré de novo dá o próximo passo" : ""));
}

function diaVencido() {
    return resultadoDoDia(contarCasas(perdidas)) === "vencido";
}

function seguirParaAProximaMare() {
    irPara("dia", "ler");
    comecarMare(indiceDaMare + 1);
}

function darPassoDaMare() {                     // movimento reduzido, sem filme: cada toque no botão Maré dá um passo (a enchente sobe, a preamar conta, a vazante desce)
    if (faseDaMare === "preamar") return contarAMare();
    moverAgua(faseDaMare === "enchente" ? 1 : -1);
    if (faseDaMare !== "baixa") avisar("Maré: " + NOME_DA_MARE[faseDaMare] + ", passo " + passoDaMare + " de " + fichaDeAgora().passos + ", " + contarCasas(acumularPerdidas(perdidas, agua.alagado)).perdidas + " casas perdidas até agora");
}

function moverAgua(sentido) {                   // enchente: um passo para cima; vazante: um passo de volta, até a baixa-mar
    passoDaMare += sentido;
    if (passoDaMare === 0) irPara("mare", "baixa");
    else if (passoDaMare === fichaDeAgora().passos) irPara("mare", "preamar");
    mostrarAgua();
    if (faseDaMare === "baixa") terminarAVazante();
}

function contarAMare() {                        // no alto da água: as casas alagadas agora ficam perdidas, e o dia vai para "contar"
    perdidas = acumularPerdidas(perdidas, agua.alagado);
    irPara("mare", "vazante");
    irPara("dia", "contar");
    atualizarResumo();
    avisar("Maré: " + contarCasas(perdidas).perdidas + " casas alagadas");
}

function terminarAVazante() {                   // a água voltou: era a última ficha, o dia acaba; senão, espera o M
    const contagem = contarCasas(perdidas);
    if (indiceDaMare < tabuaDeMares.length - 1) return avisar("Maré " + (indiceDaMare + 1) + " passou, " + contagem.salvas + " casas a salvo. M chama a próxima ficha");
    irPara("dia", "fim");
    atualizarResumo();
    const seguinte = diaVencido() ? (indiceDoDia === DIAS.length - 1 ? "M volta ao dia 1. " : "M abre o próximo dia. ") : "";
    avisar("Dia " + resultadoDoDia(contagem) + ": " + contagem.salvas + " de " + contagem.total + " casas salvas, meta " + metaDoDia + ", jogadas " + jogadas + " (par " + DIAS[indiceDoDia].par + "). " + seguinte + "N recomeça");
}

function tocar(casa) {                          // dois toques: o primeiro marca a casa, o segundo, na mesma casa, confirma
    if (marcada && casa.x === cursor.x && casa.y === cursor.y) return aplicar();
    cursor = { x: casa.x, y: casa.y };
    marcada = true;
    avisar("Marcada: " + descreverCasa(cursor.x, cursor.y) + ". Toque de novo para " + NOME_DA_FERRAMENTA[ferramenta].toLowerCase());
}

function pixelDentroDoCanvas(pixel) {
    return pixel.x >= 0 && pixel.y >= 0 && pixel.x < tela.width && pixel.y < tela.height;
}

function pixelDoEvento(evento) {                // do pixel da página para o pixel da janela (o CSS pode encolhê-la)
    const caixa = tela.getBoundingClientRect();
    return { x: (evento.clientX - caixa.left) * tela.width / caixa.width, y: (evento.clientY - caixa.top) * tela.height / caixa.height };
}

document.addEventListener("keydown", function (evento) {
    if (evento.ctrlKey || evento.metaKey || evento.altKey) return;      // Ctrl+R recarrega a página, não gira a vista
    if (evento.target === resumo) return evento.key === "Escape" ? resumo.blur() : undefined;      // no resumo, as teclas são do leitor: rolar e ler; Esc sai
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
tela.addEventListener("wheel", function (evento) {
    evento.preventDefault();                    // a roda aproxima o mapa, não rola a página
    if (evento.deltaY === 0) return;            // deslize horizontal ou Shift + roda
    const depoisDeUmaPausa = evento.timeStamp - instanteDaRoda > PAUSA_DA_RODA;
    if (depoisDeUmaPausa || Math.sign(evento.deltaY) !== Math.sign(giroDaRoda)) giroDaRoda = 0;     // pausa ou sentido invertido: o que sobrou não vale
    instanteDaRoda = evento.timeStamp;
    giroDaRoda += evento.deltaY * PIXELS_POR_DELTA_DA_RODA[evento.deltaMode];
    if (Math.abs(giroDaRoda) < LIMIAR_DA_RODA) return;
    mudarZoom(giroDaRoda < 0 ? 1 : -1, pixelDoEvento(evento));
    giroDaRoda = 0;
}, { passive: false });
tela.addEventListener("pointerdown", function (evento) {
    if (evento.button !== 0 || (dedo && evento.pointerId !== dedo.id)) return;     // só o botão principal marca; um segundo dedo é ignorado
    ponteiro = pixelDoEvento(evento);
    dedo = { id: evento.pointerId, inicio: ponteiro, ultimo: ponteiro, arrastando: false };
});
window.addEventListener("pointermove", function (evento) {      // na janela, não no canvas: o arrasto continua se o dedo sair dele
    if (dedo && evento.pointerId !== dedo.id) return;
    ponteiro = pixelDoEvento(evento);
    if (!dedo) return;
    if (Math.hypot(ponteiro.x - dedo.inicio.x, ponteiro.y - dedo.inicio.y) > LIMITE_DO_TOQUE) dedo.arrastando = true;
    if (dedo.arrastando) rolar(ponteiro.x - dedo.ultimo.x, ponteiro.y - dedo.ultimo.y);
    dedo.ultimo = ponteiro;
});
window.addEventListener("pointerup", function (evento) {
    if (!dedo || evento.pointerId !== dedo.id) return;     // qualquer botão solto encerra o gesto: senão, com dois botões apertados, o arrasto grudava
    const pixel = pixelDoEvento(evento), foiToque = evento.button === 0 && !dedo.arrastando;
    dedo = null;
    if (!foiToque) return;
    const acerto = pixelDentroDoCanvas(pixel) && casaSobOPixel(pixel);       // soltar sem arrastar é um toque, e soltar fora da janela não marca nada
    if (acerto) tocar(acerto);
});
window.addEventListener("pointercancel", function () { dedo = null; });

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

function lateraisDaAgua(casa, piso) {           // as laterais da água que se veem: onde ela está acima do topo da vizinha da frente (ou do fim do mapa) e do `piso` dado
    const nivel = alturaVisivel(casa.x, casa.y), topo = cantosDoBloco(casa.x, casa.y, nivel);
    return [{ nome: "direita", vizinha: [1, 0] }, { nome: "esquerda", vizinha: [0, 1] }].map(function (lateral) {
        const vizinha = casaVizinha(casa.x, casa.y, lateral.vizinha[0], lateral.vizinha[1]);
        const fundo = Math.max(piso, vizinha ? alturaVisivel(vizinha.x, vizinha.y) : 0);      // até onde a vizinha cobre a lateral (no fim do mapa, o chão); abaixo do piso a lateral é de outra coisa
        if (fundo >= nivel) return null;
        const base = cantosDoBloco(casa.x, casa.y, fundo);
        return { nome: lateral.nome, poligono: lateral.nome === "direita" ? [topo[2], topo[1], base[1], base[2]] : [topo[3], topo[2], base[2], base[3]] };
    }).filter(function (lateral) { return lateral; });
}

function desenharLeito(casa, estilo) {          // sob a água, o terreno opaco: o fundo na altura dela e as laterais que se veem, sem contorno; a água lê-se como uma lâmina só
    pincel.strokeStyle = "transparent";
    lateraisDaAgua(casa, 0).forEach(function (lateral) { tracar(lateral.poligono, estilo[lateral.nome]); });
    tracar(cantosDoBloco(casa.x, casa.y, alturaVisivel(casa.x, casa.y)), estilo.topo);
}

function desenharAgua(casa) {                   // a superfície, as laterais que se veem, e a borda só onde a água termina
    const estilo = estiloDaAgua(casa), topo = cantosDoBloco(casa.x, casa.y, alturaVisivel(casa.x, casa.y));
    pincel.strokeStyle = "transparent";         // sem contorno: duas águas vizinhas não deixam linha entre si
    lateraisDaAgua(casa, casa.altura).forEach(function (lateral) { tracar(lateral.poligono, estilo[lateral.nome]); });      // a água só tinge o que está acima do terreno da própria casa
    tracar(topo, estilo.topo);
    pincel.strokeStyle = estilo.contorno;
    ARESTAS_DO_LOSANGO.forEach(function (direcao, i) {
        const vizinha = casaVizinha(casa.x, casa.y, direcao[0], direcao[1]);
        if (!vizinha || !agua.alagado[vizinha.y][vizinha.x]) tracar([topo[i], topo[(i + 1) % 4]]);
    });
}

function encolher(cantos, fator) {              // o mesmo losango, mais perto do centro
    const centro = { x: (cantos[0].x + cantos[2].x) / 2, y: (cantos[0].y + cantos[2].y) / 2 };
    return cantos.map(function (canto) { return { x: centro.x + (canto.x - centro.x) * fator, y: centro.y + (canto.y - centro.y) * fator }; });
}

function desenharCursor(x, y, escondido) {      // amarelo e grosso; tracejado se está atrás de um bloco, borda dupla se está marcado
    const cantos = cantosDoBloco(x, y, alturaVisivel(x, y));
    pincel.save();
    pincel.strokeStyle = "#ffe14d"; pincel.lineWidth = 3 / camera.zoom;
    if (escondido) pincel.setLineDash([4, 3]);
    tracar(cantos);
    if (marcada) tracar(encolher(cantos, 0.6));
    pincel.restore();                           // a espessura do cursor não vaza para os contornos finos
}

function numeroDaOrdem(casa) {                  // H: a posição da casa na ordem em que o volume a enche (0 se a água não a enche)
    return previsao.ordem.filter(function (enchida) { return enchida.distancia > 0; }).findIndex(function (enchida) { return enchida.x === casa.x && enchida.y === casa.y; }) + 1;
}

function marcaDaCasa(casa) {                    // a casa alagada em qualquer maré do dia ganha ✗; a salva só ganha ✓ depois da preamar
    if (perdidas[casa.y][casa.x] || agua.alagado[casa.y][casa.x]) return "✗";
    return fase === "contar" || fase === "fim" ? "✓" : "";
}

function desenharRotulo(casa) {                 // contorno escuro e preenchimento branco: lê-se sobre qualquer cor
    const objeto = objetosEmTexto[casa.y][casa.x];
    const mar = alturasEmTexto[casa.y][casa.x] === "~";
    const rotulo = (objeto === "." ? "" : objeto) + (objeto === "C" ? marcaDaCasa(casa) : "") + (depuracaoLigada && !mar ? numeroDaOrdem(casa) || casa.altura : "");
    const centro = mundoParaTela(casa.x + 0.5, casa.y + 0.5, alturaVisivel(casa.x, casa.y));
    pincel.save();
    pincel.lineWidth = 3; pincel.strokeStyle = "#101820"; pincel.strokeText(rotulo, centro.x, centro.y);
    pincel.fillStyle = "#ffffff"; pincel.fillText(rotulo, centro.x, centro.y);
    pincel.restore();
}

function desenharCasas() {                      // percorre a lista na ordem: cada casa cobre o que já foi pintado atrás dela
    pincel.lineWidth = 1 / camera.zoom;         // contorno fino de 1 px na janela, qualquer que seja o zoom
    listaDeDesenho.forEach(function (casa) {
        const mar = alturasEmTexto[casa.y][casa.x] === "~";
        const estilo = mar ? ESTILO_DO_MAR : ESTILO_DA_ALTURA[casa.altura];
        if (agua.alagado[casa.y][casa.x]) { desenharLeito(casa, estilo); desenharAgua(casa); }
        else desenharCaixa(casa.x, casa.y, 0, casa.altura, estilo);
        if (casa.x === cursor.x && casa.y === cursor.y) desenharCursor(casa.x, casa.y, false);     // na sua vez: o que vem depois a cobre
        desenharRotulo(casa);
    });
}

function desenharChuva() {                       // traços inclinados que caem: enfeite da ficha com chuva; a regra é a nascente e o volume
    pincel.save();
    pincel.strokeStyle = "rgba(200, 220, 255, 0.6)";
    for (let i = 0; i < 40; i++) {
        const x = (i * 97 + faseDaOnda * 40) % tela.width, y = (i * 53 + faseDaOnda * 120) % tela.height;
        pincel.beginPath(); pincel.moveTo(x, y); pincel.lineTo(x - 3, y + 9); pincel.stroke();
    }
    pincel.restore();
}

function desenharEscondidas() {                 // H: por cima do dique, o que ele esconde: contorno tracejado e a letra (forma, não só cor)
    pincel.save();
    pincel.strokeStyle = "#ffffff"; pincel.lineWidth = 2 / camera.zoom; pincel.setLineDash([3, 3]);
    casasEscondidas().forEach(function (casa) {
        tracar(cantosDoBloco(casa.x, casa.y, alturaVisivel(casa.x, casa.y)));
        desenharRotulo(casa);
    });
    pincel.restore();
}

function desenharAlcanceSemVolume() {          // H: a água chegaria nestas casas (a busca em largura), mas o volume acaba antes: tracejado
    pincel.save();
    pincel.strokeStyle = "#ffffff"; pincel.lineWidth = 2 / camera.zoom; pincel.setLineDash([3, 3]);
    alcance.ordem.filter(function (casa) { return casa.distancia > 0 && !previsao.alagado[casa.y][casa.x]; }).forEach(function (casa) {
        tracar(cantosDoBloco(casa.x, casa.y, alturaVisivel(casa.x, casa.y)));
    });
    pincel.restore();
}

function desenharRaio(ponto) {                  // H: as colunas que o raio atravessou, a face batida e o pixel (ponto: no mapa)
    const acerto = acharCasaPeloRaio(ponto.x, ponto.y);
    if (!acerto) return;
    pincel.save();
    pincel.strokeStyle = "#ffffff"; pincel.lineWidth = 1 / camera.zoom;
    acerto.visitadas.forEach(function (casa) { tracar(cantosDoBloco(casa.x, casa.y, 0)); });
    pincel.strokeStyle = "#ffe14d"; pincel.lineWidth = 3 / camera.zoom;
    tracar(facesDaCasa(acerto.x, acerto.y)[acerto.face]);
    pincel.fillStyle = "#ffffff"; pincel.fillRect(ponto.x - 3, ponto.y - 3, 6, 6);
    pincel.restore();
}

function descreverAcerto(acerto) {
    return acerto ? "casa (" + acerto.x + ", " + acerto.y + ") " + NOME_DA_FACE[acerto.face] : "nada";
}

function textoDaLeitura() {
    const escondidas = casasEscondidas().map(function (casa) { return "(" + casa.x + ", " + casa.y + ")"; });
    const alcancadas = alcance.ordem.filter(function (casa) { return casa.distancia > 0; }).length;
    const camada = "maré " + (indiceDaMare + 1) + ": nível " + fichaDeAgora().nivel + ", volume " + fichaDeAgora().passos * volumeDoPasso(fichaDeAgora()) + " · enchem " + (previsao.ordem.length - quantasFontes()) + ", alcance " + alcancadas + (previsao.nascentes.length ? ", nascentes " + previsao.nascentes.length : "") + "\n"
        + "casas escondidas: " + (escondidas.join(" ") || "nenhuma") + "\n";
    if (!ponteiro) return camada + "aponte o mouse ou toque no mapa";
    const ponto = paraOMapa(ponteiro);
    const raio = acharCasaPeloRaio(ponto.x, ponto.y), bruta = acharCasaPorForcaBruta(ponto.x, ponto.y);
    return camada + "raio: " + descreverAcerto(raio) + (raio ? "  " + raio.visitadas.length + " colunas" : "") + "\n"
        + "força bruta: " + descreverAcerto(bruta) + "  " + (descreverAcerto(raio) === descreverAcerto(bruta) ? "IGUAL" : "DIFERENTE");
}

function textoDoPainel() {
    const contagem = contarCasas(acumularPerdidas(perdidas, agua.alagado)), casas = "Casas " + contagem.salvas + "/" + contagem.total;
    const mare = "Maré " + (indiceDaMare + 1) + "/" + tabuaDeMares.length;
    if (fase === "ler" || fase === "moldar") return mare + " · Blocos " + estadoAtual.blocos + " · " + casas;
    if (fase === "fim") return "Dia " + resultadoDoDia(contagem) + " · " + casas;
    return mare + " " + NOME_DA_MARE[faseDaMare] + " · " + casas;
}

function textoDoObjetivo() {
    return "Meta: " + metaDoDia + " casas · jogadas " + jogadas + " (par " + DIAS[indiceDoDia].par + ")";
}

function textoDaTabua() {                       // a tábua inteira, para ler antes de moldar: nível, passos × volume, blocos que chegam e ☂ se chove; [colchetes] na ficha de agora
    return "Tábua: " + tabuaDeMares.map(function (ficha, i) {
        const resumo = "n" + ficha.nivel + " " + ficha.passos + "×" + volumeDoPasso(ficha) + " +" + ficha.blocos + (ficha.chuva ? " ☂" : "");
        return i === indiceDaMare ? "[" + resumo + "]" : resumo;
    }).join(" ");
}

function textoDoBotaoDaMare() {
    if (fase === "contar" && faseDaMare === "baixa") return "Seguir";
    return fase === "fim" && diaVencido() ? "Próximo" : "Maré";
}

function escrever(elemento, texto) {            // só mexe no DOM quando o texto muda: o laço chama isto 60 vezes por segundo
    if (elemento.textContent !== texto) elemento.textContent = texto;
}

function esperou(duracao) {                     // o relógio da fase chegou à duração?
    if (relogioDaFase < duracao) return false;
    relogioDaFase = 0;
    return true;
}

function atualizar(tempo) {
    if (!movimentoReduzido) faseDaOnda += tempo * 2;
    relogioDaFase += tempo;
    if (fase === "ler" && esperou(TEMPO_DE_LEITURA)) irPara("dia", "moldar");
    else if (movimentoReduzido) return;         // sem filme: o botão Maré dá cada passo da água
    else if (faseDaMare === "enchente" && esperou(PASSO_DA_MARE)) moverAgua(1);
    else if (faseDaMare === "preamar" && esperou(PAUSA_NA_PREAMAR)) contarAMare();
    else if (faseDaMare === "vazante" && esperou(PASSO_DA_MARE / 2)) moverAgua(-1);
}

function desenhar() {
    pincel.setTransform(1, 0, 0, 1, 0, 0);
    pincel.fillStyle = "#0b1020";
    pincel.fillRect(0, 0, tela.width, tela.height);
    pincel.setTransform(camera.zoom, 0, 0, camera.zoom, camera.desvioX, camera.desvioY);     // daqui em diante, tudo é pixel do mapa
    desenharCasas();
    if (quemEsconde(cursor.x, cursor.y)) desenharCursor(cursor.x, cursor.y, true);     // por cima de tudo, tracejado
    if (depuracaoLigada) {
        desenharEscondidas();
        desenharAlcanceSemVolume();
        if (ponteiro) desenharRaio(paraOMapa(ponteiro));
    }
    pincel.setTransform(1, 0, 0, 1, 0, 0);
    if (fichaDeAgora().chuva && faseDaMare !== "baixa") desenharChuva();
    escrever(leitura, depuracaoLigada ? textoDaLeitura() : "");
    escrever(painel, textoDoPainel());
    escrever(titulo, "dia " + (indiceDoDia + 1) + "/" + DIAS.length);
    escrever(objetivo, textoDoObjetivo());
    escrever(tabua, textoDaTabua());
    escrever(botaoDaMare, textoDoBotaoDaMare());
}

function quadroAQuadro(instanteAtual) {
    const tempo = Math.max(0, Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05));
    instanteDoQuadroAnterior = instanteAtual;
    const inicio = performance.now();
    atualizar(tempo);
    const depoisDeAtualizar = performance.now();
    desenhar();
    const fim = performance.now();
    ultimoTempoDeAtualizacao = depoisDeAtualizar - inicio;
    ultimoTempoDeDesenho = fim - depoisDeAtualizar;
    ultimoTempoDeQuadro = fim - inicio;
    requestAnimationFrame(quadroAQuadro);
}

pincel.font = "bold 11px monospace"; pincel.textAlign = "center"; pincel.textBaseline = "middle";
if (MAPA_VALIDO) {
    definirMovimento(preferenciaDoSistema);     // põe o botão e o aviso de acordo com o sistema
    iniciarDia(0);                              // o primeiro dia começa: ficha 0, estoque vazio mais os blocos dela
    requestAnimationFrame(quadroAQuadro);
}
