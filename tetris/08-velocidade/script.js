/*
  TETRIS — PASSO 8: A VELOCIDADE

  O jogo fica mais rápido a cada 10 linhas. E um jogo rápido só é
  divertido se for JUSTO — então este passo é metade velocidade, metade
  justiça:

  1. NÍVEIS
     O intervalo da queda vem de uma TABELA, uma linha por nível. Os
     pontos são multiplicados pelo nível: arriscar no nível 8 paga oito
     vezes mais.

  2. A PEÇA FANTASMA
     Um contorno mostra onde a peça vai cair. Com a peça descendo a 20
     linhas por segundo, ninguém tem tempo de contar casas.

  3. A REPETIÇÃO NOSSA
     A repetição de tecla do sistema operacional (passo 4) espera meio
     segundo e varia de máquina para máquina. Agora o jogo mede o tempo
     que ← e → ficam presas e repete com tempos escolhidos para ele.

  4. UM TEMPINHO ANTES DE TRAVAR
     Ao tocar o chão, a peça não trava na hora: espera meio segundo, e
     cada movimento do jogador renova a espera. É o que permite deslizar
     uma peça para debaixo de uma saliência mesmo no nível mais rápido.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;

/*
  A CURVA DE DIFICULDADE, como dados: segundos por linha em cada nível.
  O índice 0 é o nível 1. Depois do último, o último vale para sempre.

  Uma tabela em vez de uma fórmula tem uma vantagem enorme: dá para
  AFINAR. Achou o nível 6 um degrau alto demais? Mude um número. Com uma
  fórmula, mexer em um nível mexe em todos.
*/
const INTERVALOS_DE_QUEDA = [
    1.0, 0.79, 0.62, 0.47, 0.36, 0.26, 0.19,
    0.14, 0.1, 0.07, 0.05, 0.035, 0.025, 0.017
];
const LINHAS_POR_NIVEL = 10;
const INTERVALO_DA_QUEDA_RAPIDA = 0.04;

/*
  A REPETIÇÃO DE ← E →, nos tempos do jogo:
  um toque move na hora; segurando, espera 0,17 s e então repete a cada
  0,05 s. O sistema operacional costuma esperar 0,5 s — uma eternidade
  quando a peça cai 20 linhas por segundo.
*/
const ATRASO_DA_REPETICAO = 0.17;
const INTERVALO_DA_REPETICAO = 0.05;

/*
  O TEMPO PARA TRAVAR: meio segundo no chão antes de virar poço.
  Cada movimento renova a espera — mas só os 15 primeiros. Do 16º em
  diante, a peça trava assim que estiver apoiada. Sem esse teto, daria
  para girar uma peça no chão para sempre e nunca deixá-la travar.
*/
const TEMPO_PARA_TRAVAR = 0.5;
const MAXIMO_DE_ADIAMENTOS = 15;

const PECAS = {
    I: { cor: "#00f0ff", forma: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]] },
    O: { cor: "#ffe14d", forma: [[1, 1], [1, 1]] },
    T: { cor: "#c46bff", forma: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] },
    S: { cor: "#4dff7a", forma: [[0, 1, 1], [1, 1, 0], [0, 0, 0]] },
    Z: { cor: "#ff4d6d", forma: [[1, 1, 0], [0, 1, 1], [0, 0, 0]] },
    J: { cor: "#4d7aff", forma: [[1, 0, 0], [1, 1, 1], [0, 0, 0]] },
    L: { cor: "#ff9f1c", forma: [[0, 0, 1], [1, 1, 1], [0, 0, 0]] }
};

const TIPOS = Object.keys(PECAS);

const EMPURROES = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

const PONTOS_POR_LINHAS = [0, 100, 300, 500, 800];
const PONTOS_POR_LINHA_DESCIDA = 1;    // segurando ↓
const PONTOS_POR_LINHA_DERRUBADA = 2;  // com Espaço: arriscar paga mais

const COR_FUNDO = "#06070d";
const COR_GRADE = "#141c2b";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

/*
  Um segundo canvas, com o seu próprio pincel. Cada canvas tem o seu
  contexto de desenho; pintar num não afeta o outro.
*/
const telaProxima = document.getElementById("proxima");
const pincelProxima = telaProxima.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoLinhas = document.getElementById("linhas");
const campoNivel = document.getElementById("nivel");
const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");
const botaoIniciar = document.getElementById("botao-iniciar");


// ============================================================
// 3. ESTADO
// ============================================================
function criarLinhaVazia() {
    return new Array(COLUNAS).fill(null);
}

function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}

let poco = criarPocoVazio();
let pecaAtual = null;
let proximoTipo = null;
let saco = [];

let pontos = 0;
let linhasFeitas = 0;
let nivel = 1;

/*
  MÁQUINA DE ESTADOS, como no Pong.

  Uma variável de texto em vez de vários booleanos soltos. O jogo está
  sempre em exatamente UM destes estados, e cada parte do código consulta
  esta variável: o loop só aplica a gravidade se for "jogando"; o teclado
  só move peças se for "jogando".
*/
let estado = "menu";   // "menu" | "jogando" | "fim"

let acumuladorDeQueda = 0;
let instanteDoQuadroAnterior = 0;

let tempoNoChao = 0;       // há quanto tempo a peça está apoiada
let adiamentos = 0;        // quantas vezes a espera já foi renovada
let linhaMaisBaixa = 0;    // a linha mais funda que a peça já alcançou

/*
  As teclas presas e a repetição.

  `presas` é o painel de interruptores do Pong, agora para três teclas.
  `direcaoRepetida` diz qual lado está repetindo (-1, 0 ou 1) e
  `tempoAteRepetir` conta quanto falta para o próximo passo automático.
*/
const presas = { esquerda: false, direita: false, baixo: false };
let direcaoRepetida = 0;
let tempoAteRepetir = 0;


// ============================================================
// 4. O SACO DE SETE
// ============================================================
/*
  EMBARALHAR — o algoritmo de Fisher-Yates.

  Anda do fim da lista para o começo. Em cada posição i, sorteia uma
  posição j entre 0 e i (inclusive) e troca as duas. A parte já percorrida
  fica "decidida" e nunca mais é tocada.

  Parece simples demais para estar certo, e é exatamente o que está certo:
  cada uma das 5040 ordens possíveis das sete peças tem a mesma chance.

  A tentação comum — lista.sort(() => Math.random() - 0.5) — NÃO é
  justa: o sort espera uma comparação coerente, e com uma moeda no lugar
  algumas ordens saem bem mais que outras.
*/
function embaralhar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        // Troca as duas posições numa linha só, com desestruturação.
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }

    return lista;
}

/*
  Tira a próxima peça do saco; se ele estiver vazio, enche e embaralha.

  [...TIPOS] faz uma CÓPIA da lista de tipos. Embaralhar a própria TIPOS
  funcionaria hoje e estragaria qualquer código que contasse com a ordem
  original — de novo, a referência do passo 1.
*/
function tirarDoSaco() {
    if (saco.length === 0) {
        saco = embaralhar([...TIPOS]);
    }

    return saco.pop();
}


// ============================================================
// 5. PEÇAS
// ============================================================
function criarPeca(tipo) {
    const forma = PECAS[tipo].forma;

    return {
        tipo: tipo,
        forma: forma,
        coluna: Math.floor((COLUNAS - forma[0].length) / 2),
        linha: 0
    };
}

/*
  A próxima vira a atual, e uma nova próxima sai do saco.
  A fila tem dois lugares: o que cai e o que está à vista.
*/
function nascerProxima() {
    pecaAtual = criarPeca(proximoTipo);
    proximoTipo = tirarDoSaco();
    acumuladorDeQueda = 0;
    tempoNoChao = 0;
    adiamentos = 0;
    linhaMaisBaixa = pecaAtual.linha;

    desenharProxima();

    // Nasceu em cima de blocos: o poço encheu. Fim.
    if (!cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha)) {
        terminarPartida();
    }
}


// ============================================================
// 6. CABE?
// ============================================================
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


// ============================================================
// 7. MOVER, GIRAR E TRAVAR
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
  "Se descesse mais uma linha, ainda caberia?" Se não, está no chão.
*/
function estaNoChao() {
    return !cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha + 1);
}

/*
  Movimento pedido PELO JOGADOR (não pela gravidade): se der certo, gasta
  um adiamento, e — enquanto houver adiamentos — a espera para travar
  recomeça.

  Separar quem pediu o movimento importa: se a gravidade também
  renovasse a espera, a peça no chão nunca travaria.
*/
function moverPeloJogador(deslocamentoColuna) {
    if (moverPeca(deslocamentoColuna, 0)) {
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
  Depois de cada descida: se a peça chegou mais fundo do que nunca, ela
  ganhou um chão NOVO, e a espera e os adiamentos recomeçam do zero.

  Por que não simplesmente zerar sempre que a peça sai do chão? Porque o
  empurrão para cima da rotação TIRA a peça do chão. Girando sem parar,
  ela subiria e desceria uma linha a cada giro, o relógio zeraria toda
  vez, e a peça nunca travaria. Medir pela linha mais funda fecha essa
  porta: subir e descer de volta não é progresso.

  (Esse bug existiu na primeira versão deste passo — e um teste que girava
  a peça no chão sem parar o encontrou: cem segundos sem travar.)
*/
function registrarDescida() {
    if (pecaAtual.linha > linhaMaisBaixa) {
        linhaMaisBaixa = pecaAtual.linha;
        tempoNoChao = 0;
        adiamentos = 0;
    }
}

/*
  A LINHA DA PEÇA FANTASMA: a mesma pergunta da queda instantânea,
  feita sem mover nada. Desce uma linha hipotética de cada vez enquanto
  couber, e devolve onde parou.

  Mais uma vez, `cabe` só responde — e por isso serve para prever.
*/
function linhaDoFantasma() {
    let linha = pecaAtual.linha;

    while (cabe(pecaAtual.forma, pecaAtual.coluna, linha + 1)) {
        linha += 1;
    }

    return linha;
}

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
    travarPeca();
    atualizarPlacar();
}

function travarPeca() {
    pecaAtual.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                poco[pecaAtual.linha + y][pecaAtual.coluna + x] = pecaAtual.tipo;
            }
        });
    });

    limparLinhas();
    nascerProxima();
}


// ============================================================
// 8. LINHAS COMPLETAS
// ============================================================
function limparLinhas() {
    const restantes = poco.filter(linha => linha.includes(null));
    const quantas = LINHAS - restantes.length;

    if (quantas === 0) {
        return;
    }

    while (restantes.length < LINHAS) {
        restantes.unshift(criarLinhaVazia());
    }

    poco = restantes;

    /*
      Os pontos usam o nível ATUAL, antes de subir: as linhas que fazem
      o jogador passar de nível ainda são pagas pelo nível em que ele
      estava.
    */
    pontos += PONTOS_POR_LINHAS[quantas] * nivel;
    linhasFeitas += quantas;
    nivel = 1 + Math.floor(linhasFeitas / LINHAS_POR_NIVEL);
    atualizarPlacar();
}

/*
  O intervalo do nível atual, sem passar do fim da tabela: do nível 14
  em diante, vale o último número.
*/
function intervaloDoNivel() {
    const indice = Math.min(nivel - 1, INTERVALOS_DE_QUEDA.length - 1);
    return INTERVALOS_DE_QUEDA[indice];
}


// ============================================================
// 9. INÍCIO E FIM DA PARTIDA
// ============================================================
/*
  Começar uma partida é pôr TODO o estado de volta no ponto de partida.

  Esqueça uma única variável aqui e ela "vaza" de uma partida para a
  outra: o placar que não zera, o saco com sobras da partida anterior, a
  ↓ que ficou presa. Por isso tudo o que a partida usa é zerado num
  lugar só.
*/
function iniciarPartida() {
    poco = criarPocoVazio();
    saco = [];
    pontos = 0;
    linhasFeitas = 0;
    nivel = 1;
    soltarTudo();

    proximoTipo = tirarDoSaco();
    estado = "jogando";

    nascerProxima();
    atualizarPlacar();
    camadaMensagem.hidden = true;

    /*
      Tira o foco do botão. Sem isso, o Espaço — que derruba a peça —
      também "clicaria" no botão focado, reiniciando a partida no meio.
    */
    botaoIniciar.blur();
}

function terminarPartida() {
    estado = "fim";

    mostrarMensagem("Fim de jogo", `${pontos} pontos · nível ${nivel}`);
    botaoIniciar.textContent = "Jogar de novo";
}


// ============================================================
// 10. TECLADO
// ============================================================
/*
  ← e → deixam de usar a repetição do sistema: as repetições automáticas
  (evento.repeat) são IGNORADAS, e o keydown só registra que a tecla foi
  presa. Quem repete é o loop, em atualizarRepeticao, com os nossos
  tempos.

  Os outros comandos continuam como antes: um evento por toque.
*/
document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    if (estado !== "jogando") {
        return;
    }

    switch (tecla) {
        case "arrowleft":
            if (!evento.repeat) {
                presas.esquerda = true;
                comecarRepeticao(-1);
            }
            break;

        case "arrowright":
            if (!evento.repeat) {
                presas.direita = true;
                comecarRepeticao(1);
            }
            break;

        case "arrowdown":
            if (!evento.repeat) {
                presas.baixo = true;
                acumuladorDeQueda = 0;

                if (moverPeca(0, 1)) {
                    registrarDescida();
                    pontos += PONTOS_POR_LINHA_DESCIDA;
                    atualizarPlacar();
                }
            }
            break;

        case "arrowup":
        case "x":
            if (!evento.repeat) {
                girarPeca(1);
            }
            break;

        case "z":
            if (!evento.repeat) {
                girarPeca(-1);
            }
            break;

        case " ":
            if (!evento.repeat) {
                derrubarPeca();
            }
            break;

        default:
            return;
    }

    evento.preventDefault();
});

/*
  Soltar uma seta: se ela era a que estava repetindo e a OUTRA continua
  presa, a outra assume. Assim, apertar → sem soltar ← e depois soltar →
  volta a andar para a esquerda — o que os dedos esperam.
*/
document.addEventListener("keyup", evento => {
    const tecla = evento.key.toLowerCase();

    if (tecla === "arrowleft") {
        presas.esquerda = false;
        if (direcaoRepetida === -1) {
            direcaoRepetida = presas.direita ? 1 : 0;
            tempoAteRepetir = ATRASO_DA_REPETICAO;
        }
    }

    if (tecla === "arrowright") {
        presas.direita = false;
        if (direcaoRepetida === 1) {
            direcaoRepetida = presas.esquerda ? -1 : 0;
            tempoAteRepetir = ATRASO_DA_REPETICAO;
        }
    }

    if (tecla === "arrowdown") {
        presas.baixo = false;
    }
});

/*
  UMA ARMADILHA DO "TECLA PRESA": se a janela perde o foco com a tecla
  apertada (um alt+tab, um clique em outra janela), o keyup acontece em
  outro lugar e nunca chega aqui. A peça continuaria deslizando para
  sempre. Ao perder o foco, soltamos tudo.
*/
window.addEventListener("blur", soltarTudo);

function soltarTudo() {
    presas.esquerda = false;
    presas.direita = false;
    presas.baixo = false;
    direcaoRepetida = 0;
}

/*
  Primeiro toque: move NA HORA (a resposta imediata é o que faz o
  controle parecer firme) e arma o relógio com o atraso inicial.
*/
function comecarRepeticao(direcao) {
    direcaoRepetida = direcao;
    tempoAteRepetir = ATRASO_DA_REPETICAO;
    moverPeloJogador(direcao);
}

/*
  O relógio da repetição é outro acumulador, só que contando para baixo:
  quando passa de zero, gasta um passo e soma mais um intervalo.
  Mesma ideia da gravidade, outro uso.
*/
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

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    /*
      O loop gira sempre — no menu e no fim também — mas só ATUALIZA
      durante a partida. Desenhar continua: é assim que o poço da partida
      que acabou fica visível por trás da mensagem de fim.
    */
    if (estado === "jogando") {
        atualizar(tempo);
    }

    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    atualizarRepeticao(tempo);
    aplicarGravidade(tempo);
}

/*
  A GRAVIDADE agora tem dois modos:

  - NO AR: o acumulador de sempre, com o intervalo do nível (ou o
    rápido, se ↓ estiver presa — o que for MENOR: no nível 13 a queda
    normal já é mais rápida que a "rápida").
  - NO CHÃO: o acumulador para, e um segundo relógio conta o tempo
    apoiado. Quando chega a TEMPO_PARA_TRAVAR, trava.

  Se a peça sair do chão — deslizou para fora de uma beirada —, ela volta
  a cair, e o relógio do chão só zera quando ela alcançar uma linha mais
  funda (registrarDescida).
*/
function aplicarGravidade(tempo) {
    if (!estaNoChao()) {
        const intervalo = presas.baixo
            ? Math.min(INTERVALO_DA_QUEDA_RAPIDA, intervaloDoNivel())
            : intervaloDoNivel();

        acumuladorDeQueda += tempo;

        while (acumuladorDeQueda >= intervalo) {
            acumuladorDeQueda -= intervalo;

            if (!moverPeca(0, 1)) {
                break;
            }

            registrarDescida();

            if (presas.baixo) {
                pontos += PONTOS_POR_LINHA_DESCIDA;
                atualizarPlacar();
            }
        }
    }

    /*
      Um `if` separado, e não um `else`: a peça pode ter ACABADO de chegar
      ao chão no laço acima, e precisa ser avaliada neste mesmo quadro.
      Deixar para o próximo abriria uma brecha de um quadro — tempo
      suficiente para um giro com empurrão a tirar do chão de novo.
    */
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
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharGrade();
    desenharPoco();

    if (pecaAtual !== null) {
        if (estado === "jogando") {
            desenharFantasma();
        }
        desenharPeca(pecaAtual);
    }
}

/*
  O fantasma é a peça atual desenhada em outra linha e de outro jeito:
  só o contorno, na cor da peça, com o miolo quase transparente.

  globalAlpha muda a opacidade de TUDO o que for pintado depois — por
  isso é devolvido a 1 logo em seguida. Esquecer de devolver deixa o
  resto do quadro inteiro desbotado.
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

function desenharPoco() {
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const tipo = poco[linha][coluna];

            if (tipo !== null) {
                desenharCelula(coluna, linha, PECAS[tipo].cor);
            }
        }
    }
}

function desenharPeca(peca) {
    const cor = PECAS[peca.tipo].cor;

    peca.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharCelula(peca.coluna + x, peca.linha + y, cor);
            }
        });
    });
}

function desenharCelula(coluna, linha, cor) {
    desenharBloco(pincel, coluna * TAMANHO_DA_CELULA, linha * TAMANHO_DA_CELULA, cor);
}

/*
  O bloco foi separado da célula. desenharCelula sabe de colunas e linhas
  do POÇO; desenharBloco só sabe de pixels e de QUAL canvas pintar.

  É essa separação que deixa a mesma arte servir para o poço e para a
  caixa da próxima peça — que não tem colunas nem linhas do poço.
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
  A PRÓXIMA PEÇA, CENTRALIZADA NA CAIXA.

  A matriz tem margens vazias (o I, por exemplo, ocupa só a segunda linha
  do seu 4x4). Centralizar a MATRIZ deixaria as peças tortas na caixa.
  Então primeiro medimos onde estão os quadrados de verdade — a menor e a
  maior coluna e linha ocupadas — e centralizamos ESSE retângulo.

  Esta caixa só muda quando nasce uma peça, então só é redesenhada nessa
  hora, e não 60 vezes por segundo.
*/
function desenharProxima() {
    pincelProxima.fillStyle = COR_FUNDO;
    pincelProxima.fillRect(0, 0, telaProxima.width, telaProxima.height);

    if (proximoTipo === null) {
        return;
    }

    const forma = PECAS[proximoTipo].forma;
    const cor = PECAS[proximoTipo].cor;

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
    const inicioX = (telaProxima.width - largura) / 2;
    const inicioY = (telaProxima.height - altura) / 2;

    forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharBloco(
                    pincelProxima,
                    inicioX + (x - menorX) * TAMANHO_DA_CELULA,
                    inicioY + (y - menorY) * TAMANHO_DA_CELULA,
                    cor
                );
            }
        });
    });
}


// ============================================================
// 13. INTERFACE
// ============================================================
function atualizarPlacar() {
    campoPontos.textContent = pontos;
    campoLinhas.textContent = linhasFeitas;
    campoNivel.textContent = nivel;
}

function mostrarMensagem(titulo, texto) {
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    camadaMensagem.hidden = false;
}

botaoIniciar.addEventListener("click", iniciarPartida);


// ============================================================
// 14. LIGAR
// ============================================================
desenharProxima();
requestAnimationFrame(quadroAQuadro);
