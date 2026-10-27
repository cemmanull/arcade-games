/*
  TETRIS — PASSO 7: A PRÓXIMA PEÇA

  Três coisas transformam o protótipo numa partida:

  1. UM SORTEIO JUSTO
     Math.random puro pode mandar cinco S seguidos, ou nenhum I por trinta
     peças. É aleatório — e é injusto. A saída é o SACO: as sete peças vão
     para um saco, embaralhadas, e saem uma a uma. Só quando o saco esvazia
     ele é enchido de novo. A sorte continua existindo, mas dentro de
     limites: nunca passam mais de 12 peças sem um I.

  2. A PRÓXIMA PEÇA À VISTA
     Saber o que vem depois transforma reação em PLANEJAMENTO. Ela aparece
     num segundo canvas, desenhada pela mesma função das células do poço.

  3. UM FIM DE JOGO
     Quando a peça nova nasce em cima de blocos, acabou. A MÁQUINA DE
     ESTADOS do Pong volta: uma variável diz se estamos no menu, jogando
     ou no fim, e cada parte do código consulta essa variável.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const COLUNAS = 10;
const LINHAS = 20;
const TAMANHO_DA_CELULA = 8;

const INTERVALO_DE_QUEDA = 1.0;
const INTERVALO_DA_QUEDA_RAPIDA = 0.04;

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
let baixoPresa = false;


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
            return true;
        }
    }

    return false;
}

function derrubarPeca() {
    while (moverPeca(0, 1)) {
        // nada: descer é a própria condição
    }

    travarPeca();
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

    pontos += PONTOS_POR_LINHAS[quantas];
    linhasFeitas += quantas;
    atualizarPlacar();
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
    baixoPresa = false;

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

    mostrarMensagem("Fim de jogo", `${pontos} pontos · ${linhasFeitas} linhas`);
    botaoIniciar.textContent = "Jogar de novo";
}


// ============================================================
// 10. TECLADO
// ============================================================
document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    /*
      GUARD CLAUSE da máquina de estados: fora de uma partida, as teclas
      do jogo não fazem nada — e nem são canceladas, para o Espaço e o
      Enter continuarem funcionando nos botões.
    */
    if (estado !== "jogando") {
        return;
    }

    switch (tecla) {
        case "arrowleft":
            moverPeca(-1, 0);
            break;

        case "arrowright":
            moverPeca(1, 0);
            break;

        case "arrowdown":
            if (!evento.repeat) {
                baixoPresa = true;
                acumuladorDeQueda = 0;
                moverPeca(0, 1);
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

document.addEventListener("keyup", evento => {
    if (evento.key.toLowerCase() === "arrowdown") {
        baixoPresa = false;
    }
});


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
    const intervalo = baixoPresa ? INTERVALO_DA_QUEDA_RAPIDA : INTERVALO_DE_QUEDA;

    acumuladorDeQueda += tempo;

    while (acumuladorDeQueda >= intervalo) {
        acumuladorDeQueda -= intervalo;

        if (!moverPeca(0, 1)) {
            travarPeca();
            break;
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
        desenharPeca(pecaAtual);
    }
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
