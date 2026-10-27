/*
  ============================================================
  TETRIS
  ============================================================

  O ciclo é o de sempre:

      ler a entrada  ->  atualizar o estado  ->  desenhar

  E o estado inteiro do jogo cabe em duas coisas:

  1. O POÇO — uma matriz de 20 linhas por 10 colunas. Cada casa é `null`
     (vazia) ou a letra da peça que a ocupa. Tudo o que já caiu mora aqui.

  2. A PEÇA ATUAL — uma matriz pequena (a forma) mais uma posição.
     Ela flutua por cima do poço até travar; ao travar, vira casas dele.

  Quatro ideias sustentam o resto:

  - PEÇAS SÃO DADOS. Cada forma é uma matriz de 0 e 1 num catálogo. Uma
    função desenha qualquer peça, uma decide se qualquer peça cabe, uma
    gira qualquer peça.

  - TESTAR ANTES DE MOVER. A função `cabe` só responde, nunca muda nada.
    Mover, girar, derrubar, prever o fantasma e detectar o fim de jogo
    são todas a mesma pergunta, feita em lugares diferentes.

  - TEMPO CONTÍNUO, MOVIMENTO EM PASSOS. O loop é o do Pong (delta time),
    mas a peça anda de casa em casa. Acumuladores transformam um no outro.

  - JUSTIÇA. Saco de sete, peça fantasma, repetição de tecla própria e
    um tempinho antes de travar: o jogo pode ficar muito rápido sem
    ficar injusto.

  A leitura abaixo segue a ordem em que as coisas acontecem.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;   // pixels de desenho por casa

/*
  O CATÁLOGO. Cada peça: uma cor e uma forma.

  Todas as formas são QUADRADAS (2x2, 3x3, 4x4), mesmo quando a peça não
  é: o espaço vazio é o que faz a peça girar em torno do centro sem nenhum
  caso especial. Pelo mesmo motivo o I fica na SEGUNDA linha do seu 4x4.
*/
const PECAS = {
    I: { cor: "#00f0ff", forma: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { cor: "#ffe14d", forma: [[1, 1], [1, 1]] },
    T: { cor: "#c46bff", forma: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { cor: "#4dff7a", forma: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { cor: "#ff4d6d", forma: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { cor: "#4d7aff", forma: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { cor: "#ff9f1c", forma: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }
};

const TIPOS = Object.keys(PECAS);   // ["I", "O", "T", ...], deduzida do catálogo

/*
  Os empurrões que a rotação tenta, em ordem: [colunas, linhas].
  No lugar; um para cada lado; dois para cada lado (o I precisa); um para
  cima (para girar apoiado no chão).
*/
const EMPURROES = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

/*
  A curva de dificuldade: segundos por linha em cada nível (o índice 0 é
  o nível 1). Depois do último, vale o último.
*/
const INTERVALOS_DE_QUEDA = [
    1.0, 0.79, 0.62, 0.47, 0.36, 0.26, 0.19,
    0.14, 0.1, 0.07, 0.05, 0.035, 0.025, 0.017
];
const LINHAS_POR_NIVEL = 10;
const INTERVALO_DA_QUEDA_RAPIDA = 0.04;   // com ↓ presa

const ATRASO_DA_REPETICAO = 0.17;     // segurando ← ou →: espera antes de repetir
const INTERVALO_DA_REPETICAO = 0.05;  // e depois repete neste ritmo

const TEMPO_PARA_TRAVAR = 0.5;        // segundos no chão antes de virar poço
const MAXIMO_DE_ADIAMENTOS = 15;      // quantos movimentos podem renovar a espera

const DURACAO_DA_LIMPEZA = 0.3;       // as linhas completas piscam antes de sumir

const PONTOS_POR_LINHAS = [0, 100, 300, 500, 800];   // x nível
const PONTOS_POR_LINHA_DESCIDA = 1;
const PONTOS_POR_LINHA_DERRUBADA = 2;

const CHAVE_DO_RECORDE = "tetris-recorde";

const COR_FUNDO = "#06070d";
const COR_GRADE = "#141c2b";
const COR_PISCAR = "#ffffff";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const telaProxima = document.getElementById("proxima");
const pincelProxima = telaProxima.getContext("2d");
const telaGuardada = document.getElementById("guardada");
const pincelGuardada = telaGuardada.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoLinhas = document.getElementById("linhas");
const campoNivel = document.getElementById("nivel");
const campoRecorde = document.getElementById("recorde");

const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");

const botaoIniciar = document.getElementById("botao-iniciar");
const botaoSom = document.getElementById("botao-som");
const botoesDeToque = document.querySelectorAll("[data-comando]");


// ============================================================
// 3. ESTADO
// ============================================================
function criarLinhaVazia() {
    return new Array(COLUNAS).fill(null);
}

/*
  Array.from chama a função uma vez POR LINHA. O atalho
  new Array(LINHAS).fill(criarLinhaVazia()) poria o MESMO array nas 20
  posições — vinte nomes para uma linha só.
*/
function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}

let poco = criarPocoVazio();
let pecaAtual = null;       // null enquanto as linhas piscam, e fora da partida
let proximoTipo = null;
let tipoGuardado = null;
let podeGuardar = true;     // uma troca por peça
let saco = [];

let pontos = 0;
let linhasFeitas = 0;
let nivel = 1;
let recorde = lerRecorde();

/*
  A MÁQUINA DE ESTADOS. Sempre exatamente um:

      "menu"     antes da primeira partida
      "jogando"  a partida corre
      "pausado"  a partida está congelada
      "fim"      o poço encheu

  As linhas piscando NÃO são um estado à parte: são um temporizador dentro
  de "jogando". Pausar no meio do pisca-pisca congela o pisca-pisca
  também — sem nenhum código a mais.
*/
let estado = "menu";

let instanteDoQuadroAnterior = 0;
let acumuladorDeQueda = 0;

let tempoNoChao = 0;
let adiamentos = 0;
let linhaMaisBaixa = 0;

let linhasPiscando = [];    // índices das linhas completas
let tempoDaLimpeza = 0;     // > 0 enquanto elas piscam

let somLigado = true;

/*
  As teclas (ou botões de toque) presas, e a repetição de ← e →.
*/
const presas = { esquerda: false, direita: false, baixo: false };
let direcaoRepetida = 0;    // -1, 0 ou 1
let tempoAteRepetir = 0;


// ============================================================
// 4. O SACO DE SETE
// ============================================================
/*
  As sete peças entram embaralhadas e saem uma a uma; só quando o saco
  esvazia ele é enchido de novo. Nunca passam mais de 12 peças sem um I.

  Embaralhar com Fisher-Yates: do fim para o começo, troca cada posição
  com uma sorteada entre 0 e ela. Todas as ordens com a mesma chance.
*/
function embaralhar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }

    return lista;
}

function tirarDoSaco() {
    if (saco.length === 0) {
        saco = embaralhar([...TIPOS]);   // uma CÓPIA: TIPOS fica intacta
    }

    return saco.pop();
}


// ============================================================
// 5. NASCER, GUARDAR
// ============================================================
function criarPeca(tipo) {
    const forma = PECAS[tipo].forma;

    return {
        tipo: tipo,
        forma: forma,   // a matriz do catálogo; girar cria outra, nunca altera esta
        coluna: Math.floor((COLUNAS - forma[0].length) / 2),
        linha: 0
    };
}

/*
  Põe uma peça de um tipo no topo e zera tudo o que é "da peça".
  Se ela já nasce em cima de blocos, o poço encheu: fim.
*/
function nascerPeca(tipo) {
    pecaAtual = criarPeca(tipo);

    acumuladorDeQueda = 0;
    tempoNoChao = 0;
    adiamentos = 0;
    linhaMaisBaixa = pecaAtual.linha;

    if (!cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha)) {
        terminarPartida();
    }
}

function nascerProxima() {
    const tipo = proximoTipo;
    proximoTipo = tirarDoSaco();
    podeGuardar = true;

    desenharCaixas();
    nascerPeca(tipo);
}

/*
  GUARDAR: a peça atual vai para a caixa e a que estava lá entra em jogo
  (ou, na primeira vez, entra a próxima). Uma troca por peça — sem isso,
  daria para trocar sem parar e nunca jogar a peça ruim.
*/
function guardarPeca() {
    if (!podeGuardar) {
        return;
    }

    const tipoQueSai = pecaAtual.tipo;

    if (tipoGuardado === null) {
        tipoGuardado = tipoQueSai;
        nascerProxima();
    } else {
        const tipoQueEntra = tipoGuardado;
        tipoGuardado = tipoQueSai;
        nascerPeca(tipoQueEntra);
    }

    podeGuardar = false;   // depois de nascerProxima, que liga de novo
    desenharCaixas();
    tocarSom(360, 0.06);
}


// ============================================================
// 6. CABE? — a pergunta mais importante do jogo
// ============================================================
/*
  "Esta forma, com o canto nesta coluna e nesta linha, caberia?"

  Para cada quadrado da forma, a casa do poço onde ele cairia
  (posição da peça + posição na matriz) precisa existir e estar vazia.
  A parede e o chão não são objetos: são o fim da grade.

  Só responde. Não move nada. Por isso pode ser chamada com qualquer
  posição hipotética, quantas vezes for preciso.
*/
function cabe(forma, coluna, linha) {
    for (let y = 0; y < forma.length; y++) {
        for (let x = 0; x < forma[y].length; x++) {
            if (forma[y][x] === 0) {
                continue;
            }

            const colunaNoPoco = coluna + x;
            const linhaNoPoco = linha + y;

            const foraDoPoco =
                colunaNoPoco < 0 || colunaNoPoco >= COLUNAS ||
                linhaNoPoco < 0 || linhaNoPoco >= LINHAS;

            if (foraDoPoco || poco[linhaNoPoco][colunaNoPoco] !== null) {
                return false;
            }
        }
    }

    return true;
}

function estaNoChao() {
    return !cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha + 1);
}

/*
  Onde a peça cairia: descer uma linha hipotética enquanto couber.
*/
function linhaDoFantasma() {
    let linha = pecaAtual.linha;

    while (cabe(pecaAtual.forma, pecaAtual.coluna, linha + 1)) {
        linha += 1;
    }

    return linha;
}


// ============================================================
// 7. MOVER, GIRAR, DERRUBAR, TRAVAR
// ============================================================
function moverPeca(deslocamentoColuna, deslocamentoLinha) {
    const novaColuna = pecaAtual.coluna + deslocamentoColuna;
    const novaLinha = pecaAtual.linha + deslocamentoLinha;

    if (!cabe(pecaAtual.forma, novaColuna, novaLinha)) {
        return false;
    }

    pecaAtual.coluna = novaColuna;
    pecaAtual.linha = novaLinha;
    return true;
}

/*
  Movimento pedido pelo JOGADOR: gasta um adiamento e, enquanto houver,
  renova a espera para travar. A gravidade usa moverPeca direto — se ela
  também renovasse, a peça no chão nunca travaria.
*/
function moverPeloJogador(deslocamentoColuna) {
    if (pecaAtual !== null && moverPeca(deslocamentoColuna, 0)) {
        adiarTrava();
    }
}

function adiarTrava() {
    adiamentos += 1;

    if (adiamentos <= MAXIMO_DE_ADIAMENTOS) {
        tempoNoChao = 0;
    }
}

/*
  Só uma descida a uma linha MAIS FUNDA do que nunca devolve a espera e
  os adiamentos. Subir com o empurrão da rotação e descer de volta não é
  progresso — sem esta regra, girar no chão sem parar adiaria para sempre.
*/
function registrarDescida() {
    if (pecaAtual.linha > linhaMaisBaixa) {
        linhaMaisBaixa = pecaAtual.linha;
        tempoNoChao = 0;
        adiamentos = 0;
    }
}

/*
  Girar uma matriz quadrada 90 graus: a COLUNA x da antiga, lida de baixo
  para cima, vira a LINHA x da nova. O map cria arrays NOVOS — o catálogo
  nunca é alterado.
*/
function girarMatriz(forma, sentido) {
    const n = forma.length;

    return forma.map((linhaDaForma, y) =>
        linhaDaForma.map((_, x) =>
            sentido > 0
                ? forma[n - 1 - x][y]
                : forma[x][n - 1 - y]
        )
    );
}

function girarPeca(sentido) {
    const formaGirada = girarMatriz(pecaAtual.forma, sentido);

    for (const [deslocamentoColuna, deslocamentoLinha] of EMPURROES) {
        const coluna = pecaAtual.coluna + deslocamentoColuna;
        const linha = pecaAtual.linha + deslocamentoLinha;

        if (cabe(formaGirada, coluna, linha)) {
            pecaAtual.forma = formaGirada;
            pecaAtual.coluna = coluna;
            pecaAtual.linha = linha;
            adiarTrava();
            tocarSom(520, 0.03);
            return true;
        }
    }

    return false;
}

function derrubarPeca() {
    let linhasDescidas = 0;

    while (moverPeca(0, 1)) {
        linhasDescidas += 1;
    }

    pontos += linhasDescidas * PONTOS_POR_LINHA_DERRUBADA;
    atualizarPainel();
    travarPeca();
}

/*
  TRAVAR: a peça vira poço.

  Se alguma linha ficou completa, ela não some na hora: a peça atual vira
  null, as linhas piscam por DURACAO_DA_LIMPEZA, e só então são removidas
  e a próxima peça nasce (ver atualizar). Esse instante de pausa é o que
  faz o jogador PERCEBER o que conquistou.
*/
function travarPeca() {
    pecaAtual.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                poco[pecaAtual.linha + y][pecaAtual.coluna + x] = pecaAtual.tipo;
            }
        });
    });

    pecaAtual = null;

    linhasPiscando = [];
    poco.forEach((linha, indice) => {
        if (!linha.includes(null)) {
            linhasPiscando.push(indice);
        }
    });

    if (linhasPiscando.length > 0) {
        tempoDaLimpeza = DURACAO_DA_LIMPEZA;
        tocarSomDeLinhas(linhasPiscando.length);
        return;
    }

    tocarSom(140, 0.06);
    nascerProxima();
}


// ============================================================
// 8. LINHAS COMPLETAS E PONTOS
// ============================================================
/*
  Limpar é filtrar: ficam as linhas que ainda têm casa vazia, e linhas
  vazias entram no topo para completar 20. Nada é movido casa por casa,
  e não há índice para pular — o filter monta uma lista nova em vez de
  mexer na antiga enquanto anda por ela.
*/
function limparLinhas() {
    const restantes = poco.filter(linha => linha.includes(null));
    const quantas = LINHAS - restantes.length;

    while (restantes.length < LINHAS) {
        restantes.unshift(criarLinhaVazia());
    }

    poco = restantes;
    linhasPiscando = [];

    const nivelAntes = nivel;

    // Pontos pelo nível de ANTES: as linhas que fazem subir ainda são pagas por ele.
    pontos += PONTOS_POR_LINHAS[quantas] * nivel;
    linhasFeitas += quantas;
    nivel = 1 + Math.floor(linhasFeitas / LINHAS_POR_NIVEL);

    if (nivel > nivelAntes) {
        tocarSomDeNivel();
    }

    atualizarPainel();
}

function intervaloDoNivel() {
    const indice = Math.min(nivel - 1, INTERVALOS_DE_QUEDA.length - 1);
    return INTERVALOS_DE_QUEDA[indice];
}


// ============================================================
// 9. INÍCIO, PAUSA E FIM
// ============================================================
/*
  Começar é pôr TODO o estado da partida de volta no ponto de partida,
  num lugar só. Uma variável esquecida aqui vaza de uma partida para a
  outra.
*/
function iniciarPartida() {
    prepararAudio();

    poco = criarPocoVazio();
    saco = [];
    tipoGuardado = null;
    pontos = 0;
    linhasFeitas = 0;
    nivel = 1;
    linhasPiscando = [];
    tempoDaLimpeza = 0;
    soltarTudo();

    proximoTipo = tirarDoSaco();
    estado = "jogando";

    nascerProxima();
    atualizarPainel();
    camadaMensagem.hidden = true;
    botaoIniciar.textContent = "Reiniciar";

    // Sem isto, o Espaço (derrubar) também "clicaria" no botão focado.
    botaoIniciar.blur();
}

function alternarPausa() {
    if (estado === "jogando") {
        estado = "pausado";
        soltarTudo();
        mostrarMensagem("Pausado", "P, Esc ou ❚❚ para continuar.");
        return;
    }

    if (estado === "pausado") {
        estado = "jogando";
        camadaMensagem.hidden = true;
    }
}

function terminarPartida() {
    estado = "fim";
    soltarTudo();

    const bateuORecorde = pontos > recorde;

    if (bateuORecorde) {
        recorde = pontos;
        salvarRecorde();
        atualizarPainel();
    }

    mostrarMensagem(
        bateuORecorde ? "Novo recorde!" : "Fim de jogo",
        `${pontos} pontos · nível ${nivel} · ${linhasFeitas} linhas`
    );
    botaoIniciar.textContent = "Jogar de novo";

    tocarSom(330, 0.15, 0);
    tocarSom(247, 0.15, 0.15);
    tocarSom(165, 0.3, 0.3);
}


// ============================================================
// 10. ENTRADA — teclado e toque viram o mesmo COMANDO
// ============================================================
/*
  Tecla -> comando, como DADOS. O resto do código não sabe que teclas
  existem: só conhece comandos. Acrescentar um atalho é acrescentar uma
  linha aqui; os botões de toque usam os mesmos nomes (data-comando).
*/
const TECLAS = {
    arrowleft: "esquerda",
    a: "esquerda",
    arrowright: "direita",
    d: "direita",
    arrowdown: "baixo",
    s: "baixo",
    arrowup: "girar",
    x: "girar",
    w: "girar",
    z: "girarAoContrario",
    " ": "derrubar",
    c: "guardar",
    shift: "guardar",
    p: "pausar",
    escape: "pausar"
};

document.addEventListener("keydown", evento => {
    const comando = TECLAS[evento.key.toLowerCase()];

    if (comando === undefined) {
        return;   // não é tecla do jogo: o navegador age normalmente
    }

    /*
      No menu e no fim, as teclas ficam com o navegador: o Espaço e o
      Enter precisam continuar acionando os botões.
    */
    if (estado === "menu" || estado === "fim") {
        return;
    }

    evento.preventDefault();

    // Repetições automáticas do sistema: ignoradas. Quem repete é o loop.
    if (!evento.repeat) {
        pressionar(comando);
    }
});

document.addEventListener("keyup", evento => {
    const comando = TECLAS[evento.key.toLowerCase()];

    if (comando !== undefined) {
        soltar(comando);
    }
});

/*
  Toque: pointerdown aperta, e QUALQUER forma de terminar o toque solta —
  levantar o dedo, arrastá-lo para fora do botão, ou o sistema cancelar o
  gesto. Esquecer um desses deixa um comando preso.
*/
botoesDeToque.forEach(botao => {
    const comando = botao.dataset.comando;

    botao.addEventListener("pointerdown", evento => {
        evento.preventDefault();   // sem foco, sem seleção de texto, sem zoom
        pressionar(comando);
    });

    ["pointerup", "pointerleave", "pointercancel"].forEach(tipo => {
        botao.addEventListener(tipo, () => soltar(comando));
    });
});

/*
  A janela perdeu o foco (alt+tab, notificação, outra aba): os keyup vão
  acontecer em outro lugar. Solta tudo — e, se havia uma partida, pausa.
*/
window.addEventListener("blur", () => {
    soltarTudo();

    if (estado === "jogando") {
        alternarPausa();
    }
});

function pressionar(comando) {
    if (comando === "pausar") {
        alternarPausa();
        return;
    }

    if (estado !== "jogando") {
        return;
    }

    /*
      As setas são registradas mesmo sem peça (enquanto as linhas piscam):
      quem segura ← durante a limpeza quer que a próxima peça já nasça
      deslizando.
    */
    if (comando === "esquerda" || comando === "direita") {
        presas[comando] = true;
        comecarRepeticao(comando === "esquerda" ? -1 : 1);
        return;
    }

    if (comando === "baixo") {
        presas.baixo = true;
        acumuladorDeQueda = 0;
    }

    if (pecaAtual === null) {
        return;
    }

    switch (comando) {
        case "baixo":
            if (moverPeca(0, 1)) {
                registrarDescida();
                pontos += PONTOS_POR_LINHA_DESCIDA;
                atualizarPainel();
            }
            break;

        case "girar":
            girarPeca(1);
            break;

        case "girarAoContrario":
            girarPeca(-1);
            break;

        case "derrubar":
            derrubarPeca();
            break;

        case "guardar":
            guardarPeca();
            break;
    }
}

/*
  Soltar uma seta: se era ela que repetia e a OUTRA continua presa, a
  outra assume.
*/
function soltar(comando) {
    if (comando === "esquerda" || comando === "direita") {
        presas[comando] = false;

        const direcao = comando === "esquerda" ? -1 : 1;

        if (direcaoRepetida === direcao) {
            const outra = comando === "esquerda" ? "direita" : "esquerda";
            direcaoRepetida = presas[outra] ? -direcao : 0;
            tempoAteRepetir = ATRASO_DA_REPETICAO;
        }
    }

    if (comando === "baixo") {
        presas.baixo = false;
    }
}

function soltarTudo() {
    presas.esquerda = false;
    presas.direita = false;
    presas.baixo = false;
    direcaoRepetida = 0;
}

function comecarRepeticao(direcao) {
    direcaoRepetida = direcao;
    tempoAteRepetir = ATRASO_DA_REPETICAO;
    moverPeloJogador(direcao);
}

function atualizarRepeticao(tempo) {
    if (direcaoRepetida === 0) {
        return;
    }

    tempoAteRepetir -= tempo;

    while (tempoAteRepetir <= 0) {
        moverPeloJogador(direcaoRepetida);
        tempoAteRepetir += INTERVALO_DA_REPETICAO;
    }
}


// ============================================================
// 11. O LOOP
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    // O teto do Pong: a aba que volta do segundo plano não teleporta nada.
    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    if (estado === "jogando") {
        atualizar(tempo);
    }

    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    /*
      Linhas piscando: o mundo espera. Quando o tempo acaba, elas somem e
      a próxima peça nasce. Guard clause — o resto da função é só para
      quando há peça em jogo.
    */
    if (tempoDaLimpeza > 0) {
        tempoDaLimpeza -= tempo;

        if (tempoDaLimpeza <= 0) {
            limparLinhas();
            nascerProxima();
        }
        return;
    }

    atualizarRepeticao(tempo);
    aplicarGravidade(tempo);
}

/*
  No ar: o acumulador gasta o tempo em linhas inteiras.
  No chão: um segundo relógio conta até travar.

  Os dois `if` são separados de propósito: a peça que ACABOU de chegar ao
  chão no primeiro é avaliada no segundo, no mesmo quadro.
*/
function aplicarGravidade(tempo) {
    if (!estaNoChao()) {
        const intervalo = presas.baixo
            ? Math.min(INTERVALO_DA_QUEDA_RAPIDA, intervaloDoNivel())
            : intervaloDoNivel();

        acumuladorDeQueda += tempo;

        while (acumuladorDeQueda >= intervalo) {
            acumuladorDeQueda -= intervalo;   // subtrair, não zerar: nenhuma sobra se perde

            if (!moverPeca(0, 1)) {
                break;
            }

            registrarDescida();

            if (presas.baixo) {
                pontos += PONTOS_POR_LINHA_DESCIDA;
                atualizarPainel();
            }
        }
    }

    if (estaNoChao()) {
        acumuladorDeQueda = 0;
        tempoNoChao += tempo;

        const esperouDemais = tempoNoChao >= TEMPO_PARA_TRAVAR;
        const gastouOsAdiamentos = adiamentos > MAXIMO_DE_ADIAMENTOS;

        if (esperouDemais || gastouOsAdiamentos) {
            travarPeca();
        }
    }
}


// ============================================================
// 12. DESENHAR
// ============================================================
/*
  O poço é redesenhado inteiro a cada quadro, como no Pong: no canvas não
  existem objetos, existe tinta.
*/
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharGrade();
    desenharPoco();

    if (pecaAtual !== null) {
        if (estado === "jogando" || estado === "pausado") {
            desenharFantasma();
        }
        desenharPeca(pecaAtual);
    }
}

function desenharPoco() {
    /*
      Enquanto piscam, as linhas completas alternam entre branco e a cor
      normal, 20 vezes por segundo. A conta Math.floor(t * 20) % 2 é o
      mesmo truque da bola piscando no saque do Pong.
    */
    const piscarAgora = Math.floor(tempoDaLimpeza * 20) % 2 === 0;

    for (let linha = 0; linha < LINHAS; linha++) {
        const estaPiscando = tempoDaLimpeza > 0 && linhasPiscando.includes(linha);

        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const tipo = poco[linha][coluna];

            if (tipo === null) {
                continue;
            }

            const cor = estaPiscando && piscarAgora ? COR_PISCAR : PECAS[tipo].cor;
            desenharBloco(pincel, coluna * TAMANHO_DA_CELULA, linha * TAMANHO_DA_CELULA, cor);
        }
    }
}

function desenharPeca(peca) {
    const cor = PECAS[peca.tipo].cor;

    peca.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharBloco(
                    pincel,
                    (peca.coluna + x) * TAMANHO_DA_CELULA,
                    (peca.linha + y) * TAMANHO_DA_CELULA,
                    cor
                );
            }
        });
    });
}

/*
  A peça fantasma: contorno na cor da peça, miolo quase transparente.
  globalAlpha vale para tudo o que vier depois — por isso volta a 1.
*/
function desenharFantasma() {
    const linha = linhaDoFantasma();
    const cor = PECAS[pecaAtual.tipo].cor;
    const t = TAMANHO_DA_CELULA;

    pecaAtual.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 0) {
                return;
            }

            const px = (pecaAtual.coluna + x) * t;
            const py = (linha + y) * t;

            pincel.fillStyle = cor;
            pincel.globalAlpha = 0.15;
            pincel.fillRect(px, py, t, t);

            pincel.globalAlpha = 0.6;
            pincel.fillRect(px, py, t, 1);
            pincel.fillRect(px, py + t - 1, t, 1);
            pincel.fillRect(px, py, 1, t);
            pincel.fillRect(px + t - 1, py, 1, t);

            pincel.globalAlpha = 1;
        });
    });
}

/*
  Um bloco: a cor, uma luz em cima e à esquerda, uma sombra embaixo e à
  direita. Só sabe de pixels e de QUAL canvas pintar — por isso serve
  para o poço e para as duas caixas.
*/
function desenharBloco(contexto, x, y, cor) {
    const t = TAMANHO_DA_CELULA;

    contexto.fillStyle = cor;
    contexto.fillRect(x, y, t, t);

    contexto.fillStyle = "rgba(255, 255, 255, 0.4)";
    contexto.fillRect(x, y, t, 1);
    contexto.fillRect(x, y, 1, t);

    contexto.fillStyle = "rgba(0, 0, 0, 0.4)";
    contexto.fillRect(x, y + t - 1, t, 1);
    contexto.fillRect(x + t - 1, y, 1, t);
}

function desenharGrade() {
    pincel.fillStyle = COR_GRADE;

    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            pincel.fillRect(
                coluna * TAMANHO_DA_CELULA + TAMANHO_DA_CELULA / 2,
                linha * TAMANHO_DA_CELULA + TAMANHO_DA_CELULA / 2,
                1, 1
            );
        }
    }
}

/*
  As caixas laterais só mudam quando nasce uma peça ou quando se guarda
  uma: são redesenhadas nessas horas, não no loop.
*/
function desenharCaixas() {
    desenharMiniatura(pincelProxima, telaProxima, proximoTipo, false);
    desenharMiniatura(pincelGuardada, telaGuardada, tipoGuardado, !podeGuardar);
}

/*
  Uma peça centralizada numa caixa: mede os quadrados de verdade (sem as
  margens vazias da matriz) e centraliza esse retângulo. `apagada`
  desenha esmaecida — a peça guardada que não pode ser trocada agora.
*/
function desenharMiniatura(contexto, canvas, tipo, apagada) {
    contexto.fillStyle = COR_FUNDO;
    contexto.fillRect(0, 0, canvas.width, canvas.height);

    if (tipo === null) {
        return;
    }

    const forma = PECAS[tipo].forma;
    const cor = PECAS[tipo].cor;

    let menorX = Infinity, maiorX = -Infinity;
    let menorY = Infinity, maiorY = -Infinity;

    forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                menorX = Math.min(menorX, x);
                maiorX = Math.max(maiorX, x);
                menorY = Math.min(menorY, y);
                maiorY = Math.max(maiorY, y);
            }
        });
    });

    const largura = (maiorX - menorX + 1) * TAMANHO_DA_CELULA;
    const altura = (maiorY - menorY + 1) * TAMANHO_DA_CELULA;
    const inicioX = (canvas.width - largura) / 2;
    const inicioY = (canvas.height - altura) / 2;

    contexto.globalAlpha = apagada ? 0.3 : 1;

    forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharBloco(
                    contexto,
                    inicioX + (x - menorX) * TAMANHO_DA_CELULA,
                    inicioY + (y - menorY) * TAMANHO_DA_CELULA,
                    cor
                );
            }
        });
    });

    contexto.globalAlpha = 1;
}


// ============================================================
// 13. INTERFACE
// ============================================================
function atualizarPainel() {
    campoPontos.textContent = pontos;
    campoLinhas.textContent = linhasFeitas;
    campoNivel.textContent = nivel;
    campoRecorde.textContent = recorde;
}

function mostrarMensagem(titulo, texto) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    camadaMensagem.hidden = false;
}

botaoIniciar.addEventListener("click", iniciarPartida);

botaoSom.addEventListener("click", () => {
    somLigado = !somLigado;
    botaoSom.textContent = somLigado ? "Som: ligado" : "Som: desligado";
    botaoSom.setAttribute("aria-pressed", String(somLigado));
});


// ============================================================
// 14. RECORDE — localStorage
// ============================================================
/*
  localStorage guarda texto no navegador, por site, e sobrevive a fechar
  a aba. Duas precauções:

  1. try/catch: em janela anônima, com o armazenamento bloqueado ou cheio,
     o acesso LANÇA um erro. Um recorde que não salva não pode derrubar o
     jogo.
  2. Desconfiar do que se lê: o valor pode ser lixo (alguém editou, outra
     versão do jogo gravou outra coisa). Number("abc") é NaN; só aceitamos
     um número finito e positivo.
*/
function lerRecorde() {
    try {
        const valor = Number(localStorage.getItem(CHAVE_DO_RECORDE));
        return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
    } catch (erro) {
        return 0;
    }
}

function salvarRecorde() {
    try {
        localStorage.setItem(CHAVE_DO_RECORDE, String(recorde));
    } catch (erro) {
        // Sem armazenamento: o recorde vale só até fechar a página.
    }
}


// ============================================================
// 15. SOM — síntese, sem arquivos
// ============================================================
/*
  Como no Pong: um oscilador de onda quadrada por bipe. O AudioContext só
  nasce no primeiro clique, porque os navegadores proíbem som antes de o
  usuário interagir com a página.

  `atraso` agenda o bipe para daqui a alguns segundos no relógio do
  áudio — é assim que três bipes viram um arpejo sem nenhum setTimeout.
*/
let contextoDeAudio = null;

function prepararAudio() {
    if (contextoDeAudio === null) {
        try {
            contextoDeAudio = new AudioContext();
        } catch (erro) {
            somLigado = false;   // navegador sem áudio: segue em silêncio
        }
    }
}

function tocarSom(frequencia, duracao, atraso = 0) {
    if (!somLigado || contextoDeAudio === null) {
        return;
    }

    const inicio = contextoDeAudio.currentTime + atraso;
    const oscilador = contextoDeAudio.createOscillator();
    const volume = contextoDeAudio.createGain();

    oscilador.type = "square";
    oscilador.frequency.value = frequencia;
    volume.gain.value = 0.04;

    oscilador.connect(volume);
    volume.connect(contextoDeAudio.destination);

    oscilador.start(inicio);
    oscilador.stop(inicio + duracao);
}

/*
  Mais linhas, arpejo mais longo: uma nota por linha, subindo. O som
  conta a jogada antes de o placar mudar.
*/
function tocarSomDeLinhas(quantas) {
    const notas = [523, 659, 784, 1047];

    for (let i = 0; i < quantas; i++) {
        tocarSom(notas[i], 0.08, i * 0.07);
    }
}

function tocarSomDeNivel() {
    [392, 523, 659, 784, 1047].forEach((nota, i) => {
        tocarSom(nota, 0.07, 0.3 + i * 0.06);
    });
}


// ============================================================
// 16. LIGAR
// ============================================================
atualizarPainel();
desenharCaixas();
requestAnimationFrame(quadroAQuadro);
