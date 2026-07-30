/*
  ============================================================
  JAVASCRIPT = COMPORTAMENTO (o que acontece)
  ============================================================

  Um jogo, por mais complexo que pareça, é sempre o mesmo ciclo repetido:

      1. LER a entrada do jogador   (qual tecla foi apertada?)
      2. ATUALIZAR o estado         (mover a cobra, contar pontos)
      3. DESENHAR o resultado       (pintar a tela)
      ... e repetir, muitas vezes por segundo.

  Esse ciclo se chama GAME LOOP. Cada volta é um "quadro" ou "passo".
  Todo o resto deste arquivo é detalhe de um desses três passos.

  ------------------------------------------------------------
  A DECISÃO MAIS IMPORTANTE DESTE ARQUIVO: duas unidades de medida
  ------------------------------------------------------------
  O jogo pensa em CÉLULAS (coluna 3, linha 7 — números inteiros de 0 a 19).
  O desenho pensa em PIXELS (x = 24, y = 56).

  A lógica NUNCA toca em pixels; o desenho converte na última hora:

      x = coluna * PIXELS_POR_CELULA

  Separar as duas coisas deixa a lógica limpa (sem multiplicações espalhadas)
  e permite trocar todo o visual sem encostar em uma regra do jogo sequer.
  Esse é um princípio geral: SEPARE o que a coisa É do jeito como ela APARECE.

  A ordem das seções abaixo segue a ordem em que as coisas acontecem:
  primeiro o que é fixo, depois o que muda, depois quem faz mudar.
*/


// ============================================================
// 1. CONSTANTES — valores que nunca mudam
// ============================================================
/*
  const = "constante": depois de definida, não pode ser trocada.
  Use const por padrão. Só use let quando o valor REALMENTE precisa mudar.
  Isso não é frescura: quem lê o código sabe de imediato o que fica parado.

  MAIÚSCULAS é apenas uma convenção visual para "isto é um ajuste do jogo".
  Todos os números mágicos vivem aqui: para deixar o jogo mais rápido,
  você muda uma linha, não caça um "150" perdido no meio da lógica.
*/
const PIXELS_POR_CELULA = 8;   // cada célula é um quadrado de 8x8 pixels de arte
const MILISSEGUNDOS_POR_PASSO = 150;  // a cada 150ms a cobra anda uma célula
const TEMPO_INICIAL_EM_SEGUNDOS = 60;
const PONTOS_POR_MACA = 10;

const COR_FUNDO = "#06070d";
const COR_GRADE = "#111726";       // pontinhos que marcam o tabuleiro
const COR_COBRA = "#00f0ff";       // miolo claro do corpo
const COR_COBRA_BORDA = "#00707d"; // contorno escuro que separa os segmentos


// ============================================================
// 2. DOM — como o JavaScript enxerga o HTML
// ============================================================
/*
  DOM = Document Object Model.

  Quando a página carrega, o navegador transforma o texto do HTML em uma
  ÁRVORE de objetos vivos, e entrega essa árvore ao JavaScript no objeto
  chamado `document`. Mexer nesses objetos muda a página na hora.

  Buscar um elemento é procurá-lo nessa árvore:
      document.getElementById("pontos")     -> o elemento com aquele id
      document.querySelector("#pontos")     -> aceita seletores de CSS

  Buscamos UMA VEZ e guardamos em constantes. Buscar de novo a cada quadro
  seria procurar a mesma coisa na árvore 400 vezes por minuto, à toa.
*/
const tela = document.getElementById("jogo");
const containerDoJogo = document.getElementById("jogo-container");
const textoDePontos = document.getElementById("pontos");
const textoDeTempo = document.getElementById("tempo");
const camadaDeFimDeJogo = document.getElementById("fim-de-jogo");
const textoDePontosFinais = document.getElementById("fim-pontos");
const botaoIniciar = document.getElementById("iniciar");

/*
  CANVAS — o pincel.

  A tag <canvas> sozinha é só uma folha em branco. Para desenhar nela,
  pedimos um CONTEXTO: o conjunto de ferramentas de desenho.
  "2d" é o contexto de desenho plano (existe também "webgl", para 3D).

  Chamei de `pincel` porque é literalmente isso que ele é:
  ele guarda a cor atual, a fonte atual, e sabe pintar formas.
*/
const pincel = tela.getContext("2d");

/*
  O tamanho da grade é CALCULADO a partir da resolução do canvas.
  Assim o número 160 existe em um lugar só (no HTML): se você mudar lá,
  tudo aqui se ajusta sozinho. Duplicar um número é criar a chance de
  esquecer de mudar um dos dois.
*/
const COLUNAS = tela.width / PIXELS_POR_CELULA;   // 160 / 8 = 20
const LINHAS = tela.height / PIXELS_POR_CELULA;   // 160 / 8 = 20


// ============================================================
// 3. ESTADO — os valores que mudam durante a partida
// ============================================================
/*
  let = variável que PODE ser trocada.
  Isto é a "memória" do jogo: a qualquer instante, estas variáveis
  descrevem por completo a situação da partida.

  Elas nascem sem valor e são preenchidas por iniciarJogo().
*/
let cobra;            // lista de peças {coluna, linha}. A posição 0 é a CABEÇA.
let direcao;          // "cima" | "baixo" | "esquerda" | "direita"
let maca;             // uma única peça {coluna, linha}
let pontos;
let tempoRestante;
let jogoRodando;      // true/false — impede que teclas funcionem fora da partida
let cronometroDoJogo; // identificador do loop principal (para poder pará-lo)
let cronometroDoRelogio;


// ============================================================
// 4. INICIAR — preparar tudo e ligar o loop
// ============================================================
function iniciarJogo() {
    pontos = 0;
    tempoRestante = TEMPO_INICIAL_EM_SEGUNDOS;
    jogoRodando = true;

    /*
      ARRAY (lista) de OBJETOS.
      [ ] cria uma lista; { } cria um objeto com propriedades nomeadas.
      A cobra começa com 5 peças em fila, deitada na horizontal.
      A primeira da lista é a cabeça; as seguintes, o corpo até a cauda.

      Repare: coluna e linha são números pequenos e inteiros (1, 2, 3...),
      não coordenadas de pixel. É o tabuleiro visto como um tabuleiro.
    */
    cobra = [
        { coluna: 5, linha: 5 },
        { coluna: 4, linha: 5 },
        { coluna: 3, linha: 5 },
        { coluna: 2, linha: 5 },
        { coluna: 1, linha: 5 }
    ];
    direcao = "direita";

    sortearMaca();

    // Mexendo no DOM: tirar/pôr o atributo "hidden" mostra e esconde elementos.
    containerDoJogo.hidden = false;
    camadaDeFimDeJogo.hidden = true;
    botaoIniciar.textContent = "Reiniciar";

    /*
      Antes de criar novos cronômetros, apagamos os antigos.
      Sem isto, clicar "Reiniciar" deixaria DOIS loops rodando ao mesmo tempo
      e a cobra andaria em dobro. clearInterval com valor indefinido não faz mal.
    */
    pararCronometros();

    /*
      setInterval(função, intervalo) = "execute esta função a cada X ms".
      É o motor do jogo. Ele devolve um número de identificação,
      que guardamos para conseguir desligá-lo depois.
    */
    cronometroDoJogo = setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
    cronometroDoRelogio = setInterval(contarUmSegundo, 1000);

    desenhar();
    atualizarPlacar();
}


// ============================================================
// 5. O PASSO DO JOGO — o coração de tudo
// ============================================================
/*
  Esta função roda ~7 vezes por segundo e faz exatamente o ciclo do início:
  atualiza o estado e depois desenha. Leia de cima para baixo como uma receita.
*/
function darUmPasso() {
    const cabeca = calcularProximaCabeca();

    /*
      GUARD CLAUSE (cláusula de guarda): trate o caso ruim primeiro e SAIA.
      É melhor do que embrulhar o resto da função em um if gigante —
      o caminho normal fica reto, sem escadinha de indentação.
    */
    if (colidiu(cabeca)) {
        terminarJogo();
        return;  // return interrompe a função aqui mesmo
    }

    /*
      O TRUQUE DA COBRINHA:
      a cobra não "anda" — ela ganha uma cabeça na frente e perde a cauda atrás.
      unshift() coloca no INÍCIO da lista; pop() remove do FIM.
      Se ela comeu, simplesmente não removemos a cauda: o corpo cresce em 1.
    */
    cobra.unshift(cabeca);

    if (cabeca.coluna === maca.coluna && cabeca.linha === maca.linha) {
        pontos += PONTOS_POR_MACA;
        sortearMaca();
    } else {
        cobra.pop();
    }

    desenhar();
    atualizarPlacar();
}

/*
  Calcula onde a cabeça estará no próximo passo — sem alterar nada ainda.
  Uma função que só CALCULA e devolve um valor é fácil de entender e testar.
*/
function calcularProximaCabeca() {
    /*
      { ...cobra[0] } cria uma CÓPIA da cabeça atual.
      Isto é essencial: objetos em JavaScript são compartilhados por referência.
      Sem a cópia, alterar `cabeca` alteraria também a peça que está na lista.
    */
    const cabeca = { ...cobra[0] };

    /*
      switch = um encadeamento de "se for isto, faça aquilo".
      Cuidado com o `break`: sem ele, a execução escorrega para o caso seguinte.

      Andar é somar 1 a uma coordenada. Sem pixels, sem multiplicação:
      é essa a vantagem de a lógica pensar em células.

      A linha CRESCE PARA BAIXO — linha 0 é a de cima, como numa planilha.
      Por isso "cima" é linha - 1.
    */
    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    return cabeca;
}

/*
  Devolve true se essa posição significa fim de jogo.
  Uma função com nome de pergunta ("colidiu?") deve responder sim ou não —
  e nada mais. Ela não termina o jogo; quem decide isso é darUmPasso().
*/
function colidiu(cabeca) {
    const bateuNaParede =
        cabeca.coluna < 0 ||
        cabeca.linha < 0 ||
        cabeca.coluna >= COLUNAS ||
        cabeca.linha >= LINHAS;

    if (bateuNaParede) {
        return true;
    }

    /*
      Colisão com o próprio corpo.
      slice(0, -1) devolve a lista SEM o último item — a cauda é ignorada
      porque ela vai sair do lugar neste mesmo passo. Encostar nela é legal.

      some() percorre a lista e devolve true no primeiro item que satisfaz
      a condição. É a versão legível de um for com if e break dentro.
    */
    return cobra.slice(0, -1).some(parte =>
        parte.coluna === cabeca.coluna && parte.linha === cabeca.linha
    );
}

/*
  Sorteia uma célula livre para a maçã.

  Math.random() devolve um decimal entre 0 e 1 (ex.: 0.734...).
  Multiplicar por COLUNAS e arredondar para baixo com Math.floor() dá um
  número inteiro de 0 a 19 — exatamente uma coluna válida do tabuleiro.

  do/while executa PRIMEIRO e testa DEPOIS: sorteia, e se calhou em cima
  da cobra, sorteia de novo.
*/
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
// 6. A ARTE — desenhando com poucos pixels
// ============================================================
/*
  PIXEL ART é literalmente um mapa de pontos. Aqui a maçã está escrita como
  8 linhas de 8 caracteres — você consegue VER o desenho no próprio código:

      "."  = vazio (não pinta nada, o fundo aparece)
      "#"  = corpo da maçã
      "*"  = brilho
      "t"  = talo e folha

  Guardar arte assim, como texto, é uma técnica real e antiga. A vantagem é
  óbvia: para mudar o desenho, você redesenha; não recalcula coordenada nenhuma.
*/
const SPRITE_MACA = [
    "....t...",
    "..tt.t..",
    ".######.",
    "#*######",
    "#*######",
    "########",
    ".######.",
    "..####.."
];

/*
  Um DICIONÁRIO (objeto usado como tabela de consulta): liga cada caractere
  do desenho à sua cor. Trocar a paleta inteira é mexer só aqui.
*/
const CORES_DA_MACA = {
    "#": "#ff2fd0",
    "*": "#ffd6f4",
    "t": "#7a1a63"
};

/*
  Onde ficam os dois olhos dentro da célula de 8x8, para cada direção.
  Números pequenos (1 e 5) porque são posições DENTRO do quadradinho.

  Isto substitui quatro desenhos quase iguais de cabeça: em vez de duplicar
  arte, guardamos só o que muda de fato — a posição dos olhos.
*/
const TAMANHO_DO_OLHO = 2;
const OLHOS_POR_DIRECAO = {
    direita:  [{ x: 5, y: 1 }, { x: 5, y: 5 }],
    esquerda: [{ x: 1, y: 1 }, { x: 1, y: 5 }],
    cima:     [{ x: 1, y: 1 }, { x: 5, y: 1 }],
    baixo:    [{ x: 1, y: 5 }, { x: 5, y: 5 }]
};

/*
  Desenhar no canvas é como pintar em uma parede: não existem "objetos"
  que se movem. Existe apenas tinta. Para a cobra parecer andar, apagamos
  TUDO e repintamos a cena inteira do zero, muitas vezes por segundo.

  O canvas é um pincel COM MEMÓRIA DE ESTADO:
      pincel.fillStyle = "azul"  -> não desenha nada, só escolhe a cor
      pincel.fillRect(...)       -> aí sim pinta, usando a cor escolhida
  A cor continua valendo para os próximos desenhos até ser trocada.
  Por isso a ordem das linhas importa tanto aqui.

  A ordem de desenho também define o que fica por cima:
  quem é pintado depois cobre quem foi pintado antes.
*/
function desenhar() {
    desenharFundo();
    desenharCobra();
    desenharSprite(SPRITE_MACA, CORES_DA_MACA, maca.coluna, maca.linha);
}

function desenharFundo() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    /*
      Um pontinho de 1 pixel no canto de cada célula.
      Em resolução normal isso seria invisível; ampliado 3 vezes, vira uma
      marca discreta que deixa o tabuleiro legível — o jogador percebe a grade
      sem que ela dispute atenção com a cobra.
    */
    pincel.fillStyle = COR_GRADE;
    for (let coluna = 0; coluna < COLUNAS; coluna++) {
        for (let linha = 0; linha < LINHAS; linha++) {
            pincel.fillRect(
                coluna * PIXELS_POR_CELULA,
                linha * PIXELS_POR_CELULA,
                1,
                1
            );
        }
    }
}

/*
  Cada segmento é um quadrado escuro com um miolo claro por cima.
  Esse contorno de 1 pixel é o que faz a cobra parecer ter escamas em vez
  de ser um verme liso: sem ele, segmentos vizinhos viram um borrão só.
*/
function desenharCobra() {
    cobra.forEach((parte, indice) => {
        const x = parte.coluna * PIXELS_POR_CELULA;  // aqui é onde a célula
        const y = parte.linha * PIXELS_POR_CELULA;   // vira pixel, e só aqui

        pincel.fillStyle = COR_COBRA_BORDA;
        pincel.fillRect(x, y, PIXELS_POR_CELULA, PIXELS_POR_CELULA);

        pincel.fillStyle = COR_COBRA;
        pincel.fillRect(x + 1, y + 1, PIXELS_POR_CELULA - 2, PIXELS_POR_CELULA - 2);

        // forEach entrega também o ÍNDICE do item; o de número 0 é a cabeça.
        const ehACabeca = indice === 0;
        if (ehACabeca) {
            desenharOlhos(x, y);
        }
    });
}

function desenharOlhos(x, y) {
    pincel.fillStyle = COR_FUNDO;  // olhos escuros, "furos" no corpo claro

    OLHOS_POR_DIRECAO[direcao].forEach(olho => {
        pincel.fillRect(x + olho.x, y + olho.y, TAMANHO_DO_OLHO, TAMANHO_DO_OLHO);
    });
}

/*
  Percorre o mapa de caracteres e pinta um quadradinho de 1x1 por caractere.

  São dois laços encaixados: um pelas linhas do desenho (y), outro pelos
  caracteres de cada linha (x). É assim que se lê qualquer imagem — uma
  varredura da esquerda para a direita, de cima para baixo.
*/
function desenharSprite(sprite, cores, coluna, linha) {
    const xDaCelula = coluna * PIXELS_POR_CELULA;
    const yDaCelula = linha * PIXELS_POR_CELULA;

    sprite.forEach((linhaDoDesenho, y) => {
        linhaDoDesenho.split("").forEach((caractere, x) => {
            const cor = cores[caractere];

            if (!cor) {
                return;  // caractere sem cor (o ".") = transparente, pula
            }

            pincel.fillStyle = cor;
            pincel.fillRect(xDaCelula + x, yDaCelula + y, 1, 1);
        });
    });
}


// ============================================================
// 7. PLACAR, TEMPO E FIM — mudando o texto do HTML
// ============================================================
/*
  Aqui está a diferença mais importante deste arquivo:

      o placar é HTML de verdade  -> mudamos com .textContent
      o jogo é pintura no canvas  -> desenhamos com o pincel

  Duas formas completamente diferentes de "colocar algo na tela".
  Texto que o usuário precisa selecionar, traduzir ou ouvir em um leitor
  de tela deve ser HTML. Só o que é gráfico vai para o canvas.
*/
function atualizarPlacar() {
    /*
      textContent troca o texto de dentro do elemento.
      As crases ` ` criam um TEMPLATE STRING, onde ${...} insere um valor.
      Equivale a "Pontos: " + pontos, porém mais legível.
    */
    textoDePontos.textContent = `Pontos: ${pontos}`;
    textoDeTempo.textContent = `Tempo: ${tempoRestante}s`;
}

function contarUmSegundo() {
    tempoRestante -= 1;
    atualizarPlacar();

    if (tempoRestante <= 0) {
        terminarJogo();
    }
}

/*
  Note que o fim de jogo não desenha nada: ele só preenche um texto e
  revela um elemento que já existia, escondido, no HTML. Mostrar e esconder
  costuma ser mais simples do que criar e destruir.
*/
function terminarJogo() {
    jogoRodando = false;
    pararCronometros();

    textoDePontosFinais.textContent = `Pontos: ${pontos}`;
    camadaDeFimDeJogo.hidden = false;
}

/*
  Uma função pequena, usada em dois lugares (iniciar e terminar).
  Extrair repetição em uma função com bom nome vale mais pela CLAREZA
  do que pelas linhas economizadas.
*/
function pararCronometros() {
    clearInterval(cronometroDoJogo);
    clearInterval(cronometroDoRelogio);
}


// ============================================================
// 8. EVENTOS — como o usuário conversa com a página
// ============================================================
/*
  O JavaScript de uma página não roda de cima a baixo e acaba.
  Ele REAGE: fica esperando algo acontecer — um clique, uma tecla, um tempo.
  Isso se chama programação orientada a eventos.

      alvo.addEventListener("nome-do-evento", funçãoQueResponde);

  Note que passamos o NOME da função, sem parênteses.
  Com parênteses (iniciarJogo()) você a executaria agora e passaria o
  RESULTADO dela. Sem parênteses, você entrega a função em si, para o
  navegador chamá-la mais tarde.

  Estas duas linhas rodam uma única vez, quando o arquivo carrega.
*/
botaoIniciar.addEventListener("click", iniciarJogo);
document.addEventListener("keydown", responderAoTeclado);

function responderAoTeclado(evento) {
    /*
      O navegador entrega um OBJETO DE EVENTO com os detalhes do que houve.
      Em um teclado, evento.key diz qual tecla foi pressionada ("ArrowUp", "a"...).
    */
    if (!jogoRodando) {
        return;  // fora da partida, teclas não fazem nada
    }

    /*
      A regra do jogo: não dá para virar 180° de uma vez, pois a cabeça
      entraria dentro do próprio pescoço. Só permitimos a virada se ela
      não for o oposto exato da direção atual.
    */
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
            return;  // qualquer outra tecla: ignora e mantém o comportamento normal
    }

    /*
      As setas rolam a página por padrão. preventDefault() cancela essa
      reação automática do navegador — só chamamos aqui embaixo porque
      só as 4 setas chegam a este ponto (as outras saíram no `default`).
    */
    evento.preventDefault();
}
