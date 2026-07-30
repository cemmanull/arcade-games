/*
  PASSO 9 — INTERFACE

  O jogo passa a conversar com o jogador: placar, cronômetro, tela de fim
  e um botão para (re)começar.

  Nada disso é desenhado no canvas. Tudo é HTML, alterado pelo JavaScript.
  Esta é a distinção central do passo:

      o jogo é PINTURA   -> canvas, com o pincel
      a interface é TEXTO -> HTML, com .textContent

  Um texto de verdade pode ser selecionado, traduzido, ampliado e lido em
  voz alta por um leitor de tela. O que é pintado no canvas é só uma
  imagem: ninguém além dos olhos consegue lê-lo.

  Regra prática: se é TEXTO, use HTML. Se é GRÁFICO, use canvas.

  E aparece uma organização nova: o jogo não começa mais sozinho ao
  carregar a página. Tudo o que prepara uma partida vive dentro de
  iniciarJogo(), que pode ser chamada quantas vezes o jogador quiser.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const PIXELS_POR_CELULA = 20;
const MILISSEGUNDOS_POR_PASSO = 150;
const TEMPO_INICIAL_EM_SEGUNDOS = 60;
const PONTOS_POR_MACA = 10;

const COR_FUNDO = "#06070d";
const COR_COBRA = "#00f0ff";
const COR_MACA = "#ff2fd0";


// ============================================================
// 2. DOM
// ============================================================
/*
  Buscamos cada elemento UMA VEZ e guardamos em constantes.
  Buscar de novo a cada quadro seria procurar a mesma coisa na árvore
  centenas de vezes por minuto, à toa.
*/
const tela = document.getElementById("jogo");
const containerDoJogo = document.getElementById("jogo-container");
const textoDePontos = document.getElementById("pontos");
const textoDeTempo = document.getElementById("tempo");
const camadaDeFimDeJogo = document.getElementById("fim-de-jogo");
const textoDePontosFinais = document.getElementById("fim-pontos");
const botaoIniciar = document.getElementById("iniciar");

const pincel = tela.getContext("2d");

const COLUNAS = tela.width / PIXELS_POR_CELULA;
const LINHAS = tela.height / PIXELS_POR_CELULA;


// ============================================================
// 3. ESTADO
// ============================================================
/*
  Agora TODAS as variáveis de estado nascem vazias. Quem as preenche é
  iniciarJogo() — e é por isso que dá para recomeçar: reiniciar o jogo é
  simplesmente preencher tudo de novo.

  Antes, os valores iniciais estavam espalhados pelas declarações e a
  partida começava sozinha. Juntar a preparação em uma função é o que
  transforma "um jogo que roda" em "um jogo que se pode jogar de novo".
*/
let cobra;
let direcao;
let maca;
let pontos;
let tempoRestante;
let jogoRodando;
let cronometroDoJogo;
let cronometroDoRelogio;


// ============================================================
// 4. INICIAR
// ============================================================
function iniciarJogo() {
    pontos = 0;
    tempoRestante = TEMPO_INICIAL_EM_SEGUNDOS;
    jogoRodando = true;

    cobra = [
        { coluna: 5, linha: 5 },
        { coluna: 4, linha: 5 },
        { coluna: 3, linha: 5 },
        { coluna: 2, linha: 5 },
        { coluna: 1, linha: 5 }
    ];
    direcao = "direita";

    sortearMaca();

    // Mexendo no DOM: pôr e tirar "hidden" mostra e esconde elementos.
    containerDoJogo.hidden = false;
    camadaDeFimDeJogo.hidden = true;
    botaoIniciar.textContent = "Reiniciar";

    /*
      Antes de criar novos cronômetros, apagamos os antigos.

      Sem isto, clicar em "Reiniciar" deixaria DOIS loops rodando ao mesmo
      tempo e a cobra andaria em dobro — depois em triplo, e assim por
      diante. É um bug clássico de jogos com botão de reiniciar, e a
      correção é uma linha que ninguém lembra de escrever na primeira vez.

      clearInterval com um valor indefinido não faz mal nenhum, então isto
      também funciona na primeira partida.
    */
    pararCronometros();

    cronometroDoJogo = setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
    cronometroDoRelogio = setInterval(contarUmSegundo, 1000);

    desenhar();
    atualizarPlacar();
}


// ============================================================
// 5. O PASSO
// ============================================================
function darUmPasso() {
    const cabeca = calcularProximaCabeca();

    if (colidiu(cabeca)) {
        terminarJogo();
        return;
    }

    cobra.unshift(cabeca);

    const comeu = cabeca.coluna === maca.coluna && cabeca.linha === maca.linha;

    if (comeu) {
        pontos += PONTOS_POR_MACA;
        sortearMaca();
    } else {
        cobra.pop();
    }

    desenhar();
    atualizarPlacar();
}

function calcularProximaCabeca() {
    const cabeca = { ...cobra[0] };

    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    return cabeca;
}

function colidiu(cabeca) {
    const bateuNaParede =
        cabeca.coluna < 0 ||
        cabeca.linha < 0 ||
        cabeca.coluna >= COLUNAS ||
        cabeca.linha >= LINHAS;

    if (bateuNaParede) {
        return true;
    }

    return cobra.slice(0, -1).some(parte =>
        parte.coluna === cabeca.coluna && parte.linha === cabeca.linha
    );
}

function sortearMaca() {
    do {
        maca = {
            coluna: Math.floor(Math.random() * COLUNAS),
            linha: Math.floor(Math.random() * LINHAS)
        };
    } while (cobra.some(parte =>
        parte.coluna === maca.coluna && parte.linha === maca.linha
    ));
}


// ============================================================
// 6. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = COR_COBRA;
    cobra.forEach(parte => {
        pincel.fillRect(
            parte.coluna * PIXELS_POR_CELULA,
            parte.linha * PIXELS_POR_CELULA,
            PIXELS_POR_CELULA,
            PIXELS_POR_CELULA
        );
    });

    pincel.fillStyle = COR_MACA;
    pincel.fillRect(
        maca.coluna * PIXELS_POR_CELULA,
        maca.linha * PIXELS_POR_CELULA,
        PIXELS_POR_CELULA,
        PIXELS_POR_CELULA
    );
}


// ============================================================
// 7. PLACAR, TEMPO E FIM
// ============================================================
function atualizarPlacar() {
    /*
      textContent troca o texto de dentro do elemento.

      As crases ` ` criam um TEMPLATE STRING, onde ${...} insere um valor
      no meio do texto. Equivale a "Pontos: " + pontos, e se lê melhor.

      (Existe também innerHTML, que interpreta tags. Evite: se o conteúdo
      vier do usuário, um innerHTML vira uma porta de entrada para código
      malicioso na sua página.)
    */
    textoDePontos.textContent = `Pontos: ${pontos}`;
    textoDeTempo.textContent = `Tempo: ${tempoRestante}s`;
}

/*
  O SEGUNDO CRONÔMETRO.

  Dois setInterval independentes, com ritmos diferentes: um para o jogo
  (150ms) e outro para o relógio (1000ms). Poderiam ser um só, contando
  quantos passos se passaram — mas seriam duas responsabilidades dentro da
  mesma função, e a conta ficaria errada assim que a velocidade mudasse.

  Duas tarefas com ritmos próprios: dois cronômetros.
*/
function contarUmSegundo() {
    tempoRestante -= 1;
    atualizarPlacar();

    if (tempoRestante <= 0) {
        terminarJogo();
    }
}

/*
  Note que o fim de jogo não desenha nada: ele preenche um texto e revela
  um elemento que já existia, escondido, desde o começo.
  Mostrar e esconder costuma ser mais simples do que criar e destruir.
*/
function terminarJogo() {
    jogoRodando = false;
    pararCronometros();

    textoDePontosFinais.textContent = `Pontos: ${pontos}`;
    camadaDeFimDeJogo.hidden = false;
}

/*
  Uma função pequena, usada em dois lugares (iniciar e terminar).
  Extrair repetição em uma função com bom nome vale mais pela CLAREZA do
  que pelas linhas economizadas: "pararCronometros()" diz o que acontece;
  duas chamadas de clearInterval fazem o leitor deduzir.
*/
function pararCronometros() {
    clearInterval(cronometroDoJogo);
    clearInterval(cronometroDoRelogio);
}


// ============================================================
// 8. EVENTOS
// ============================================================
/*
  Duas linhas que rodam uma única vez, quando o arquivo carrega, e deixam
  o programa pronto para reagir. Depois delas, o script "acaba" — mas o
  jogo só começa quando alguém clicar.
*/
botaoIniciar.addEventListener("click", iniciarJogo);
document.addEventListener("keydown", responderAoTeclado);

function responderAoTeclado(evento) {
    /*
      NOVO: uma guarda no teclado.

      Fora da partida (antes do primeiro clique ou depois de perder), as
      setas não devem fazer nada. Sem esta linha, você poderia "dirigir"
      uma cobra que ainda não existe — e o erro apareceria como um
      undefined incompreensível.
    */
    if (!jogoRodando) {
        return;
    }

    switch (evento.key) {
        case "ArrowUp":
            if (direcao !== "baixo") direcao = "cima";
            break;
        case "ArrowDown":
            if (direcao !== "cima") direcao = "baixo";
            break;
        case "ArrowLeft":
            if (direcao !== "direita") direcao = "esquerda";
            break;
        case "ArrowRight":
            if (direcao !== "esquerda") direcao = "direita";
            break;
        default:
            return;
    }

    evento.preventDefault();
}
