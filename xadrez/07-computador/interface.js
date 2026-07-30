/*
  ============================================================
  XADREZ — A INTERFACE
  ============================================================

  Este arquivo cuida do que se vê e do que se clica. Ele não conhece
  nenhuma regra de xadrez: sempre que precisa saber se algo é permitido,
  pergunta ao regras.js.

  ------------------------------------------------------------
  POR QUE ESTE JOGO NÃO USA CANVAS
  ------------------------------------------------------------
  A cobrinha e o Pong desenham em <canvas>. Aqui usamos elementos HTML —
  64 botões numa grade de CSS. E é a escolha certa, por três motivos:

    1. um tabuleiro É uma grade: o CSS Grid resolve o layout em 3 linhas;
    2. cada casa é clicável e focável de graça, porque é um <button> —
       inclusive por teclado, sem escrever uma linha para isso;
    3. um leitor de tela consegue anunciar "e4, cavalo branco". No canvas,
       tudo é uma imagem muda.

  > Canvas é para PINTURA que muda muitas vezes por segundo. Interface
  > feita de peças discretas e clicáveis é HTML. Escolher a ferramenta
  > pelo problema vale mais do que usar a mais poderosa.
*/


// ============================================================
// 1. SÍMBOLOS DAS PEÇAS
// ============================================================
/*
  Xadrez tem símbolos próprios no Unicode desde os anos 90. Nada de
  imagens: são caracteres de texto, que acompanham o tamanho da fonte e
  nunca ficam borrados.
*/
const SIMBOLOS = {
    brancas: { rei: "♔", dama: "♕", torre: "♖", bispo: "♗", cavalo: "♘", peao: "♙" },
    pretas:  { rei: "♚", dama: "♛", torre: "♜", bispo: "♝", cavalo: "♞", peao: "♟" }
};

// Letras da notação em português (o peão não tem letra).
const LETRAS_DA_NOTACAO = {
    rei: "R", dama: "D", torre: "T", bispo: "B", cavalo: "C", peao: ""
};

const NOMES_DAS_PECAS = {
    rei: "rei", dama: "dama", torre: "torre",
    bispo: "bispo", cavalo: "cavalo", peao: "peão"
};


// ============================================================
// 2. DOM
// ============================================================
const elementoTabuleiro = document.getElementById("tabuleiro");
const elementoStatus = document.getElementById("status");
const elementoVez = document.getElementById("vez");
const elementoLances = document.getElementById("lances");
const elementoCapturadas = document.getElementById("capturadas");

const botaoNovoJogo = document.getElementById("novo-jogo");
const botaoDesfazer = document.getElementById("desfazer");
const botaoModo = document.getElementById("modo");
const botaoLado = document.getElementById("lado");
const botaoVirar = document.getElementById("virar");
const seletorNivel = document.getElementById("nivel");
const seletorPromocao = document.getElementById("promocao");


// ============================================================
// 3. ESTADO DA INTERFACE
// ============================================================
/*
  Duas camadas de estado, e vale distinguir:

      estado          -> a POSIÇÃO de xadrez (é do regras.js)
      o resto daqui   -> o que a INTERFACE está fazendo agora
                         (o que está selecionado, se o tabuleiro está
                         virado, de que lado o humano joga)

  Misturar as duas é a receita para um código em que ninguém acha nada.
*/
let estado = criarPosicaoInicial();
let historicoDeEstados = [];
let historicoDeLances = [];

let casaSelecionada = null;
let movimentosDisponiveis = [];
let ultimoLance = null;

let contraOComputador = true;
let corDoHumano = BRANCAS;
let tabuleiroVirado = false;
let computadorPensando = false;

const casasDaTela = [];   // os 64 botões, na ordem dos índices do tabuleiro


// ============================================================
// 4. MONTAR O TABULEIRO (uma vez só)
// ============================================================
/*
  Os 64 botões são criados UMA vez e depois apenas atualizados.

  Nas lições anteriores o conselho foi "apague tudo e redesenhe". Aqui
  fazemos diferente de propósito, e o motivo é concreto: recriar os
  elementos a cada lance destruiria o botão que está com o FOCO do
  teclado, e quem joga sem mouse perderia o lugar no tabuleiro a cada
  jogada.

  A regra continua valendo — o conteúdo é sempre derivado do estado.
  O que muda é que reaproveitamos as caixas em vez de jogá-las fora.
*/
function montarTabuleiro() {
    elementoTabuleiro.textContent = "";

    for (let indice = 0; indice < 64; indice++) {
        const casa = document.createElement("button");
        casa.type = "button";
        casa.className = "casa";

        // A cor da casa vem da soma linha+coluna: par é clara, ímpar é escura.
        const ehClara = (linhaDe(indice) + colunaDe(indice)) % 2 === 0;
        casa.classList.add(ehClara ? "clara" : "escura");

        casa.dataset.indice = indice;
        casa.addEventListener("click", () => aoClicarNaCasa(indice));

        casasDaTela[indice] = casa;
    }

    posicionarCasasNaTela();
}

/*
  A ordem em que os botões aparecem na grade define a orientação.
  Virar o tabuleiro é só percorrer os índices de trás para frente —
  nenhuma regra do jogo é afetada.
*/
function posicionarCasasNaTela() {
    elementoTabuleiro.textContent = "";

    const indices = [];
    for (let indice = 0; indice < 64; indice++) {
        indices.push(indice);
    }

    if (tabuleiroVirado) {
        indices.reverse();
    }

    indices.forEach((indice, posicaoNaTela) => {
        marcarCoordenadas(casasDaTela[indice], indice, posicaoNaTela);
        elementoTabuleiro.appendChild(casasDaTela[indice]);
    });
}

/*
  As letras e números que aparecem nos cantos do tabuleiro.

  Repare que a decisão usa a POSIÇÃO NA TELA, não o índice da casa: quem
  fica na borda esquerda muda quando o tabuleiro é virado. Usar o índice
  faria as coordenadas continuarem no lugar antigo depois de girar.

  O CSS lê esses atributos com attr(data-fileira). As casas do meio não
  recebem atributo nenhum, então nada aparece nelas — sem precisar de
  regra extra para escondê-las.
*/
function marcarCoordenadas(casa, indice, posicaoNaTela) {
    const naBordaEsquerda = posicaoNaTela % 8 === 0;
    const naBordaInferior = posicaoNaTela >= 56;

    if (naBordaEsquerda) {
        casa.dataset.fileira = 8 - linhaDe(indice);
    } else {
        delete casa.dataset.fileira;
    }

    if (naBordaInferior) {
        casa.dataset.coluna = "abcdefgh"[colunaDe(indice)];
    } else {
        delete casa.dataset.coluna;
    }
}


// ============================================================
// 5. DESENHAR
// ============================================================
/*
  Uma única função responsável por tudo o que aparece, sempre derivada
  do estado. Nunca alteramos a tela "só um pouquinho" em outro lugar:
  toda mudança passa por aqui.
*/
function desenhar() {
    desenharCasas();
    desenharStatus();
    desenharLances();
    desenharCapturadas();

    botaoDesfazer.disabled = historicoDeEstados.length === 0 || computadorPensando;
}

function desenharCasas() {
    const casaDoReiEmXeque = estaEmXeque(estado, estado.vezDe)
        ? encontrarRei(estado, estado.vezDe)
        : -1;

    const destinos = movimentosDisponiveis.map(movimento => movimento.destino);

    for (let indice = 0; indice < 64; indice++) {
        const casa = casasDaTela[indice];
        const peca = estado.casas[indice];

        casa.textContent = peca ? SIMBOLOS[peca.cor][peca.tipo] : "";

        /*
          classList.toggle com segundo argumento: liga se for true,
          desliga se for false. Substitui quatro if/else.
        */
        casa.classList.toggle("selecionada", indice === casaSelecionada);
        casa.classList.toggle("destino", destinos.includes(indice) && !peca);
        casa.classList.toggle("captura", destinos.includes(indice) && Boolean(peca));
        casa.classList.toggle("em-xeque", indice === casaDoReiEmXeque);
        casa.classList.toggle("ultimo-lance",
            ultimoLance !== null &&
            (indice === ultimoLance.origem || indice === ultimoLance.destino));

        /*
          Uma classe por cor. Quem pinta é o CSS — aqui só dizemos qual
          peça é de quem. No visual retrô os dois lados ganham cores de
          neon, o que de quebra resolve um problema do Unicode: os
          símbolos "brancos" são contornos vazados e sumiriam sobre
          fundos claros.
        */
        casa.classList.toggle("peca-branca", Boolean(peca) && peca.cor === BRANCAS);
        casa.classList.toggle("peca-preta", Boolean(peca) && peca.cor === PRETAS);

        /*
          Sem isto, um leitor de tela anunciaria só "botão" 64 vezes.
          Com isto, ele diz "e4, cavalo branco" — e o jogo fica utilizável
          por quem não enxerga o tabuleiro.
        */
        casa.setAttribute("aria-label", descreverCasa(indice, peca));
    }
}

function descreverCasa(indice, peca) {
    const nome = nomeDaCasa(indice);

    if (!peca) {
        return `${nome}, vazia`;
    }

    const cor = peca.cor === BRANCAS ? "branco" : "preto";
    return `${nome}, ${NOMES_DAS_PECAS[peca.tipo]} ${cor}`;
}

function desenharStatus() {
    const situacao = situacaoDaPartida(estado);
    const vezDasBrancas = estado.vezDe === BRANCAS;

    elementoVez.textContent = vezDasBrancas ? "Vez das brancas" : "Vez das pretas";
    elementoVez.classList.toggle("vez-pretas", !vezDasBrancas);

    if (computadorPensando) {
        elementoStatus.textContent = "O computador está pensando…";
        elementoStatus.className = "status pensando";
        return;
    }

    const mensagens = {
        "xeque-mate": vezDasBrancas ? "Xeque-mate. As pretas vencem!" : "Xeque-mate. As brancas vencem!",
        "afogamento": "Empate por afogamento (rei afogado).",
        "empate-50-lances": "Empate pela regra dos 50 lances.",
        "empate-material": "Empate: material insuficiente para dar mate."
    };

    if (mensagens[situacao]) {
        elementoStatus.textContent = mensagens[situacao];
        elementoStatus.className = "status fim";
        return;
    }

    if (estaEmXeque(estado, estado.vezDe)) {
        elementoStatus.textContent = "Xeque!";
        elementoStatus.className = "status xeque";
        return;
    }

    elementoStatus.textContent = "Partida em andamento.";
    elementoStatus.className = "status";
}

function desenharLances() {
    elementoLances.textContent = "";

    // Os lances são exibidos em pares: "1. e2-e4 e7-e5".
    for (let i = 0; i < historicoDeLances.length; i += 2) {
        const item = document.createElement("li");
        const lanceDasBrancas = historicoDeLances[i];
        const lanceDasPretas = historicoDeLances[i + 1] || "";

        item.textContent = `${lanceDasBrancas} ${lanceDasPretas}`.trim();
        elementoLances.appendChild(item);
    }

    elementoLances.scrollTop = elementoLances.scrollHeight;
}

function desenharCapturadas() {
    /*
      As peças capturadas são DEDUZIDAS da posição atual, comparando com
      o conjunto inicial. Não guardamos uma lista separada — dado que se
      pode calcular não precisa ser armazenado, e o que não é armazenado
      não pode ficar dessincronizado.
    */
    const inicial = { peao: 8, cavalo: 2, bispo: 2, torre: 2, dama: 1, rei: 1 };
    const restantes = { brancas: {}, pretas: {} };

    for (const peca of estado.casas) {
        if (peca === null) continue;
        restantes[peca.cor][peca.tipo] = (restantes[peca.cor][peca.tipo] || 0) + 1;
    }

    let texto = "";
    for (const cor of [BRANCAS, PRETAS]) {
        for (const tipo of ["dama", "torre", "bispo", "cavalo", "peao"]) {
            const faltando = inicial[tipo] - (restantes[cor][tipo] || 0);
            texto += SIMBOLOS[cor][tipo].repeat(Math.max(0, faltando));
        }
        texto += " ";
    }

    elementoCapturadas.textContent = texto.trim() || "—";
}


// ============================================================
// 6. INTERAÇÃO
// ============================================================
function aoClicarNaCasa(indice) {
    if (computadorPensando || situacaoDaPartida(estado) !== "em-andamento") {
        return;
    }

    if (contraOComputador && estado.vezDe !== corDoHumano) {
        return;
    }

    // Clicou num destino válido: executa o lance.
    const movimentosParaEssaCasa = movimentosDisponiveis.filter(
        movimento => movimento.destino === indice
    );

    if (movimentosParaEssaCasa.length > 0) {
        executarMovimento(escolherEntrePromocoes(movimentosParaEssaCasa));
        return;
    }

    const peca = estado.casas[indice];

    // Clicou numa peça própria: seleciona.
    if (peca !== null && peca.cor === estado.vezDe) {
        casaSelecionada = indice;
        movimentosDisponiveis = gerarMovimentosLegais(estado)
            .filter(movimento => movimento.origem === indice);
        desenhar();
        return;
    }

    limparSelecao();
    desenhar();
}

/*
  Quando um peão chega ao fim, o mesmo destino tem quatro movimentos
  possíveis — um para cada peça. O jogador escolhe qual no seletor do
  painel; o padrão é dama, que é o que se quer em 99% dos casos.
*/
function escolherEntrePromocoes(movimentos) {
    if (movimentos.length === 1) {
        return movimentos[0];
    }

    const tipoEscolhido = seletorPromocao.value;
    return movimentos.find(movimento => movimento.promocao === tipoEscolhido)
        || movimentos[0];
}

function limparSelecao() {
    casaSelecionada = null;
    movimentosDisponiveis = [];
}

function executarMovimento(movimento) {
    historicoDeEstados.push(estado);
    historicoDeLances.push(escreverLance(estado, movimento));

    estado = aplicarMovimento(estado, movimento);
    ultimoLance = movimento;

    limparSelecao();
    desenhar();

    if (contraOComputador && situacaoDaPartida(estado) === "em-andamento") {
        agendarJogadaDoComputador();
    }
}


// ============================================================
// 7. A VEZ DO COMPUTADOR
// ============================================================
/*
  A busca do computador pode levar de alguns milissegundos a mais de um
  segundo. JavaScript roda em uma única linha de execução: enquanto ela
  está ocupada, a página inteira CONGELA — nada é redesenhado, nenhum
  clique responde.

  Por isso o cálculo é adiado com setTimeout: isso devolve o controle ao
  navegador por um instante, ele desenha a mensagem "pensando…", e só
  então a conta começa. Sem esse detalhe, a mensagem nunca apareceria —
  ela seria escrita e substituída antes de qualquer redesenho.

  (A solução completa para não travar chama-se Web Worker: um segundo fio
  de execução, de verdade. Aqui o setTimeout basta e cabe em uma linha.)
*/
function agendarJogadaDoComputador() {
    computadorPensando = true;
    desenhar();

    setTimeout(() => {
        const nivel = NIVEIS[seletorNivel.value];
        const movimento = escolherMovimentoDoComputador(
            estado,
            nivel.profundidade,
            nivel.margemDeAcaso
        );

        computadorPensando = false;

        if (movimento === null) {
            desenhar();
            return;
        }

        historicoDeEstados.push(estado);
        historicoDeLances.push(escreverLance(estado, movimento));

        estado = aplicarMovimento(estado, movimento);
        ultimoLance = movimento;

        desenhar();
    }, 50);
}


// ============================================================
// 8. NOTAÇÃO
// ============================================================
/*
  Usamos a notação LONGA ("Cg1-f3") em vez da curta ("Cf3").

  A curta é a que se vê nos livros, mas exige desambiguação: quando dois
  cavalos podem ir à mesma casa, é preciso dizer qual — e as regras para
  isso têm várias exceções. A longa nunca é ambígua, e ler "Cg1-f3" é
  mais fácil para quem está aprendendo.

  Escolher a representação mais simples que resolve o problema é uma
  decisão de projeto, não uma limitação.
*/
function escreverLance(estadoAntes, movimento) {
    if (movimento.ehRoque) {
        const ehCurto = colunaDe(movimento.destino) === 6;
        return ehCurto ? "O-O" : "O-O-O";
    }

    const letra = LETRAS_DA_NOTACAO[movimento.peca.tipo];
    const ligacao = movimento.capturada ? "x" : "-";
    const promocao = movimento.promocao
        ? "=" + LETRAS_DA_NOTACAO[movimento.promocao]
        : "";

    const depois = aplicarMovimento(estadoAntes, movimento);
    const situacao = situacaoDaPartida(depois);

    let sufixo = "";
    if (situacao === "xeque-mate") {
        sufixo = "#";
    } else if (estaEmXeque(depois, depois.vezDe)) {
        sufixo = "+";
    }

    return letra
        + nomeDaCasa(movimento.origem)
        + ligacao
        + nomeDaCasa(movimento.destino)
        + promocao
        + sufixo;
}


// ============================================================
// 9. BOTÕES
// ============================================================
function novoJogo() {
    estado = criarPosicaoInicial();
    historicoDeEstados = [];
    historicoDeLances = [];
    ultimoLance = null;
    computadorPensando = false;
    limparSelecao();

    // Se o humano escolheu as pretas, o computador abre a partida.
    if (contraOComputador && corDoHumano === PRETAS) {
        desenhar();
        agendarJogadaDoComputador();
        return;
    }

    desenhar();
}

/*
  Desfazer é trivial porque cada lance guardou o ESTADO ANTERIOR inteiro
  numa pilha. Não existe "desfazer o roque" nem "devolver a peça
  capturada": basta voltar ao estado salvo.

  Este é o retorno prático da decisão lá do regras.js de nunca alterar um
  estado no lugar. Programas que modificam o tabuleiro precisam de uma
  função de desfazer cheia de casos especiais — e é lá que moram os
  piores bugs de um programa de xadrez.
*/
function desfazer() {
    if (historicoDeEstados.length === 0 || computadorPensando) {
        return;
    }

    // Contra o computador, desfaz o par de lances (o dele e o meu).
    const quantos = (contraOComputador && historicoDeEstados.length >= 2) ? 2 : 1;

    for (let i = 0; i < quantos; i++) {
        estado = historicoDeEstados.pop();
        historicoDeLances.pop();
    }

    ultimoLance = null;
    limparSelecao();
    desenhar();
}

botaoNovoJogo.addEventListener("click", novoJogo);
botaoDesfazer.addEventListener("click", desfazer);

botaoModo.addEventListener("click", () => {
    contraOComputador = !contraOComputador;
    botaoModo.textContent = contraOComputador ? "Contra o computador" : "Dois jogadores";
    botaoLado.disabled = !contraOComputador;
    seletorNivel.disabled = !contraOComputador;
    novoJogo();
});

botaoLado.addEventListener("click", () => {
    corDoHumano = corDoHumano === BRANCAS ? PRETAS : BRANCAS;
    botaoLado.textContent = corDoHumano === BRANCAS ? "Jogo de brancas" : "Jogo de pretas";

    tabuleiroVirado = corDoHumano === PRETAS;
    posicionarCasasNaTela();
    novoJogo();
});

botaoVirar.addEventListener("click", () => {
    tabuleiroVirado = !tabuleiroVirado;
    posicionarCasasNaTela();
});


// ============================================================
// 10. LIGAR
// ============================================================
montarTabuleiro();
desenhar();
