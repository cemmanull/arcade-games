/*
  XADREZ — PASSO 3: SELECIONAR E MOVER

  As peças passam a se mover. Sem regra nenhuma: por enquanto qualquer
  peça vai para qualquer casa. As regras chegam no passo 4.

  Isso é de propósito. Antes de ensinar o computador a validar um lance,
  precisamos de um jeito de FAZER um lance — e a interação tem problemas
  próprios, que ficam mais fáceis de resolver sozinhos.

  A ideia deste passo:

      EXISTEM DUAS CAMADAS DE ESTADO, e elas não se misturam.

          o estado do JOGO      -> onde as peças estão
          o estado da INTERFACE -> o que está selecionado agora

  Misturar as duas é a receita para um código em que ninguém acha nada.
  Repare que `casaSelecionada` não é uma informação sobre o xadrez: é uma
  informação sobre o que o usuário está fazendo. No passo 7 essa separação
  vira dois arquivos diferentes.
*/


// ============================================================
// PEÇAS
// ============================================================
const BRANCAS = "brancas";
const PRETAS = "pretas";

/*
  UMA PEÇA NÃO SABE ONDE ESTÁ.

  Seria natural escrever { cor, tipo, linha, coluna }. Não faça isso.

  Se a peça guardasse a própria posição, existiriam DUAS fontes de
  verdade: o índice do array e o campo dentro da peça. Elas concordariam
  quase sempre — e, no dia em que discordassem, o bug seria daqueles que
  levam uma tarde.

  Quem sabe onde a peça está é o TABULEIRO: a posição é o índice do
  array. A peça é só "o que" está ali.

  Object.freeze impede alterações acidentais. E, como uma peça nunca
  muda, podemos criar uma única de cada tipo e reutilizá-la em todas as
  casas — o que evita criar milhares de objetos mais adiante.
*/
function criarPeca(cor, tipo) {
    return Object.freeze({ cor, tipo });
}

const PECAS = {
    brancas: {
        peao: criarPeca(BRANCAS, "peao"),
        cavalo: criarPeca(BRANCAS, "cavalo"),
        bispo: criarPeca(BRANCAS, "bispo"),
        torre: criarPeca(BRANCAS, "torre"),
        dama: criarPeca(BRANCAS, "dama"),
        rei: criarPeca(BRANCAS, "rei")
    },
    pretas: {
        peao: criarPeca(PRETAS, "peao"),
        cavalo: criarPeca(PRETAS, "cavalo"),
        bispo: criarPeca(PRETAS, "bispo"),
        torre: criarPeca(PRETAS, "torre"),
        dama: criarPeca(PRETAS, "dama"),
        rei: criarPeca(PRETAS, "rei")
    }
};

/*
  Xadrez tem símbolos próprios no Unicode desde os anos 90.

  Nada de imagens: são caracteres de texto. Acompanham o tamanho da
  fonte, nunca ficam borrados, não precisam ser baixados e podem ser
  copiados junto com o texto da página.
*/
const SIMBOLOS = {
    brancas: { rei: "♔", dama: "♕", torre: "♖", bispo: "♗", cavalo: "♘", peao: "♙" },
    pretas:  { rei: "♚", dama: "♛", torre: "♜", bispo: "♝", cavalo: "♞", peao: "♟" }
};

const NOMES_DAS_PECAS = {
    rei: "rei", dama: "dama", torre: "torre",
    bispo: "bispo", cavalo: "cavalo", peao: "peão"
};


// ============================================================
// DOM E COORDENADAS
// ============================================================
const elementoTabuleiro = document.getElementById("tabuleiro");
const elementoLegenda = document.getElementById("legenda");

function linhaDe(indice) { return Math.floor(indice / 8); }
function colunaDe(indice) { return indice % 8; }
function indiceDe(linha, coluna) { return linha * 8 + coluna; }

function nomeDaCasa(indice) {
    return "abcdefgh"[colunaDe(indice)] + (8 - linhaDe(indice));
}


// ============================================================
// A POSIÇÃO INICIAL
// ============================================================
/*
  FEN é o formato padrão para escrever uma posição de xadrez em uma
  linha de texto. Vale muito a pena aceitá-lo:

    - a posição inicial deixa de ser 32 linhas escritas à mão;
    - dá para carregar QUALQUER posição para testar — um final, um
      problema de mate, uma armadilha de abertura;
    - é o formato que todo programa de xadrez do mundo entende.

      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
       ^ da oitava fileira até a primeira, separadas por barra

  Minúsculas são pretas, MAIÚSCULAS são brancas, e um número quer dizer
  "tantas casas vazias seguidas".

  Ler um formato existente quase sempre custa menos do que inventar o
  seu — e te dá acesso a tudo que já foi escrito nele.
*/
const POSICAO_INICIAL = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";

function carregarPosicao(textoFEN) {
    const casas = new Array(64).fill(null);

    const letraParaTipo = {
        p: "peao", n: "cavalo", b: "bispo",
        r: "torre", q: "dama", k: "rei"
    };

    let indice = 0;

    for (const caractere of textoFEN) {
        if (caractere === "/") {
            continue;   // separador de fileiras: não ocupa casa
        }

        if (caractere >= "1" && caractere <= "8") {
            indice += Number(caractere);   // pula casas vazias
            continue;
        }

        const ehBranca = caractere === caractere.toUpperCase();
        const tipo = letraParaTipo[caractere.toLowerCase()];

        casas[indice] = PECAS[ehBranca ? BRANCAS : PRETAS][tipo];
        indice += 1;
    }

    return casas;
}


// ============================================================
// ESTADO DO JOGO
// ============================================================
let casas = carregarPosicao(POSICAO_INICIAL);

/*
  De quem é a vez. Ainda não impede nada — só mostra na legenda e alterna
  a cada lance. É a base para as regras do passo 4.
*/
let vezDe = BRANCAS;


// ============================================================
// ESTADO DA INTERFACE
// ============================================================
/*
  Isto NÃO é informação sobre xadrez. É informação sobre o que o usuário
  está fazendo agora: qual casa ele clicou, e qual foi o último lance.

  Manter as duas camadas separadas — mesmo dentro do mesmo arquivo, por
  enquanto — é o que vai permitir dividi-las em arquivos diferentes lá no
  passo 7, sem retrabalho.
*/
let casaSelecionada = null;
let ultimoLance = null;

const casasDaTela = [];



/*
  As letras e números nos cantos do tabuleiro.

  Só as casas da BORDA recebem o atributo: a coluna 0 ganha o número da
  fileira, a linha 7 ganha a letra da coluna. O CSS lê esses atributos
  com attr(data-fileira); as casas sem o atributo não mostram nada.
*/
function marcarCoordenadas(casa, indice) {
    if (colunaDe(indice) === 0) {
        casa.dataset.fileira = 8 - linhaDe(indice);
    }

    if (linhaDe(indice) === 7) {
        casa.dataset.coluna = "abcdefgh"[colunaDe(indice)];
    }
}
// ============================================================
// MONTAR E DESENHAR
// ============================================================
/*
  Repare na divisão de trabalho entre estas duas funções:

      montarTabuleiro -> cria os 64 botões UMA VEZ
      desenhar        -> atualiza o conteúdo deles, sempre que preciso

  Nas lições anteriores o conselho foi "apague tudo e redesenhe". Aqui
  reaproveitamos os elementos, e o motivo é concreto: recriar os botões
  destruiria o que está com o FOCO do teclado, e quem joga sem mouse
  perderia o lugar no tabuleiro a cada jogada.

  O princípio continua valendo — o conteúdo é sempre derivado do estado.
  O que muda é que reaproveitamos as caixas em vez de jogá-las fora.
*/
function montarTabuleiro() {
    for (let indice = 0; indice < 64; indice++) {
        const casa = document.createElement("button");
        casa.type = "button";
        casa.className = "casa";

        const ehClara = (linhaDe(indice) + colunaDe(indice)) % 2 === 0;
        casa.classList.add(ehClara ? "clara" : "escura");

        marcarCoordenadas(casa, indice);
        casa.addEventListener("click", () => aoClicarNaCasa(indice));

        casasDaTela[indice] = casa;
        elementoTabuleiro.appendChild(casa);
    }
}

function desenhar() {
    for (let indice = 0; indice < 64; indice++) {
        const casa = casasDaTela[indice];
        const peca = casas[indice];

        casa.textContent = peca ? SIMBOLOS[peca.cor][peca.tipo] : "";

        /*
          Uma classe por cor. Quem pinta é o CSS — aqui só dizemos qual
          peça é de quem.

          No visual retrô os dois lados ganham cores de neon em vez de
          branco e preto. Isso resolve de quebra um problema real do
          Unicode: os símbolos "brancos" (♔♕♖) são contornos vazados e
          sumiriam sobre fundos claros.
        */
        casa.classList.toggle("peca-branca", Boolean(peca) && peca.cor === BRANCAS);
        casa.classList.toggle("peca-preta", Boolean(peca) && peca.cor === PRETAS);

        /*
          Sem isto, um leitor de tela anunciaria "botão" 64 vezes.
          Com isto, ele diz "e4, cavalo branco" — e o jogo fica utilizável
          por quem não enxerga o tabuleiro. É uma linha.
        */
        casa.setAttribute("aria-label", descreverCasa(indice, peca));

        /*
          NOVO — os destaques.

          classList.toggle com um segundo argumento liga a classe se for
          true e desliga se for false. Substitui quatro if/else, e o CSS
          fica responsável pela aparência: aqui só decidimos QUANDO.
        */
        casa.classList.toggle("selecionada", indice === casaSelecionada);
        casa.classList.toggle("ultimo-lance",
            ultimoLance !== null &&
            (indice === ultimoLance.origem || indice === ultimoLance.destino));
    }

    elementoLegenda.textContent = vezDe === BRANCAS
        ? "Vez das brancas"
        : "Vez das pretas";
}

function descreverCasa(indice, peca) {
    const nome = nomeDaCasa(indice);

    if (!peca) {
        return `${nome}, vazia`;
    }

    const cor = peca.cor === BRANCAS ? "branco" : "preto";
    return `${nome}, ${NOMES_DAS_PECAS[peca.tipo]} ${cor}`;
}

// ============================================================
// INTERAÇÃO
// ============================================================
/*
  O padrão "clicar duas vezes": um clique escolhe a peça, o outro escolhe
  o destino. É o mesmo desenho de quase toda interface de seleção —
  arquivos, células de planilha, itens de lista.

  A ordem dos casos abaixo importa. Leia de cima para baixo:

    1. já havia algo selecionado?  -> este clique é o destino
    2. clicou numa peça?           -> seleciona
    3. qualquer outra coisa        -> limpa a seleção

  Escrever os casos em ordem de prioridade, cada um com seu `return`,
  evita um if/else aninhado que ninguém consegue ler depois.
*/
function aoClicarNaCasa(indice) {
    if (casaSelecionada !== null) {
        // Clicar de novo na mesma casa cancela a seleção.
        if (indice === casaSelecionada) {
            casaSelecionada = null;
            desenhar();
            return;
        }

        moverPeca(casaSelecionada, indice);
        return;
    }

    const peca = casas[indice];

    if (peca !== null) {
        casaSelecionada = indice;
        desenhar();
        return;
    }

    casaSelecionada = null;
    desenhar();
}

/*
  ATENÇÃO A ESTA ORDEM: primeiro apagamos a origem, depois escrevemos no
  destino? Não — é o contrário.

  Se origem e destino fossem a mesma casa, apagar primeiro faria a peça
  desaparecer. Escrever o destino antes de limpar a origem é a ordem que
  funciona em todos os casos, inclusive nos esquisitos.

  Sempre que uma operação envolve duas posições, teste mentalmente o caso
  em que elas são iguais.
*/
function moverPeca(origem, destino) {
    casas[destino] = casas[origem];
    casas[origem] = null;

    ultimoLance = { origem, destino };
    casaSelecionada = null;

    // Alterna a vez. Ainda sem impedir nada — é só informação.
    vezDe = vezDe === BRANCAS ? PRETAS : BRANCAS;

    desenhar();
}


// ============================================================
// LIGAR
// ============================================================
montarTabuleiro();
desenhar();

console.log("Clique numa peça e depois numa casa. Sem regras ainda —");
console.log("um peão pode andar para trás, e um rei pode comer o outro.");
