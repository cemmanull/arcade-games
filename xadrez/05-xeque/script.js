/*
  XADREZ — PASSO 5: XEQUE, MATE E AFOGAMENTO

  A regra que amarra todas as outras: você não pode deixar o próprio rei
  atacado. Dela saem a cravada, o xeque, o mate e o afogamento — sem que
  precisemos escrever nenhuma delas separadamente.

  A ESTRATÉGIA, e é o assunto do passo:

      Gerar os movimentos em DUAS ETAPAS.

      1. PSEUDO-LEGAIS: respeitam como a peça anda, ignorando o rei.
      2. LEGAIS: dos pseudo-legais, ficam os que não deixam o próprio rei
         atacado — e testamos isso simplesmente EXECUTANDO o movimento
         numa cópia do tabuleiro e olhando o resultado.

  Por que não gerar direto os legais? Porque as regras de CRAVADA (a peça
  que não pode sair porque o rei ficaria exposto) são cheias de exceções.
  Executar e olhar é mais lento e é SEMPRE correto.

  > Numa primeira implementação, correto vale mais do que rápido.
  > Otimize depois de medir, e só se precisar.

  Repare também no que mudou na geração: ela agora recebe o TABULEIRO
  como parâmetro, em vez de ler a variável global. Sem isso não daria
  para perguntar "e se eu jogasse isto?" — a função só sabia responder
  sobre a posição atual.
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
let movimentosDisponiveis = [];   // NOVO — os destinos da peça selecionada

const casasDaTela = [];


// ============================================================
// GERAÇÃO DE MOVIMENTOS
// ============================================================
/*
  Cada direção é um par [variação de linha, variação de coluna].

  Trabalhar em linha/coluna em vez de somar direto ao índice evita o bug
  clássico do "cavalo que sai pela borda direita e reaparece na esquerda":
  a verificação de limites fica explícita, em um lugar só.
*/
const RETAS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAIS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const SALTOS_DO_CAVALO = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
];
const PASSOS_DO_REI = [...RETAS, ...DIAGONAIS];
/*
  As reticências (...) espalham os itens de um array dentro de outro.
  Repare no que esta linha DIZ: o rei anda como uma torre e como um
  bispo, um passo de cada vez. E a dama, mais abaixo, é a mesma coisa
  sem o limite de um passo.
*/

function dentroDoTabuleiro(linha, coluna) {
    return linha >= 0 && linha < 8 && coluna >= 0 && coluna < 8;
}

/*
  Devolve a lista de índices para onde a peça daquela casa pode ir.

  Uma função que só CALCULA e devolve: não move nada, não desenha nada,
  não altera nada. Fácil de ler, fácil de testar, impossível de estragar
  algo por acidente — e é por isso que o computador vai poder usá-la à
  vontade, no passo 7.
*/
function gerarMovimentosPseudoLegais(tabuleiro, origem) {
    const peca = tabuleiro[origem];

    if (peca === null) {
        return [];
    }

    switch (peca.tipo) {
        case "peao":   return movimentosDoPeao(tabuleiro, origem, peca);
        case "cavalo": return comSaltos(tabuleiro, origem, peca, SALTOS_DO_CAVALO);
        case "rei":    return comSaltos(tabuleiro, origem, peca, PASSOS_DO_REI);
        case "bispo":  return deslizando(tabuleiro, origem, peca, DIAGONAIS);
        case "torre":  return deslizando(tabuleiro, origem, peca, RETAS);
        case "dama":   return deslizando(tabuleiro, origem, peca, [...RETAS, ...DIAGONAIS]);
    }

    return [];
}

/*
  DESLIZANTES: andam numa direção até esbarrar em alguém ou na borda.

  O `while` é o coração: continue na mesma direção enquanto estiver
  dentro do tabuleiro. O `break` trata as duas formas de parar —
  peça inimiga (pode capturar, e para) e peça aliada (nem isso).
*/
function deslizando(tabuleiro, origem, peca, direcoes) {
    const destinos = [];

    for (const [passoLinha, passoColuna] of direcoes) {
        let linha = linhaDe(origem) + passoLinha;
        let coluna = colunaDe(origem) + passoColuna;

        while (dentroDoTabuleiro(linha, coluna)) {
            const destino = indiceDe(linha, coluna);
            const ocupante = tabuleiro[destino];

            if (ocupante === null) {
                destinos.push(destino);
            } else {
                if (ocupante.cor !== peca.cor) {
                    destinos.push(destino);   // captura
                }
                break;   // aliada ou inimiga, o caminho acaba aqui
            }

            linha += passoLinha;
            coluna += passoColuna;
        }
    }

    return destinos;
}

/*
  SALTADORES: um passo único em cada direção. Sem `while`, sem `break` —
  o cavalo pula por cima de tudo, e o rei só anda uma casa.
*/
function comSaltos(tabuleiro, origem, peca, saltos) {
    const destinos = [];

    for (const [passoLinha, passoColuna] of saltos) {
        const linha = linhaDe(origem) + passoLinha;
        const coluna = colunaDe(origem) + passoColuna;

        if (!dentroDoTabuleiro(linha, coluna)) {
            continue;
        }

        const destino = indiceDe(linha, coluna);
        const ocupante = tabuleiro[destino];

        if (ocupante === null || ocupante.cor !== peca.cor) {
            destinos.push(destino);
        }
    }

    return destinos;
}

/*
  O PEÃO é a peça mais complicada do xadrez, e por um motivo curioso:
  ele é o único que ANDA de um jeito e CAPTURA de outro.

  Quatro regras, e por enquanto implementamos três (a quarta, en passant,
  fica para o passo 6):

    1. anda uma casa para a frente, só se estiver livre
    2. pode andar duas na estreia, se as duas estiverem livres
    3. captura na diagonal, só se houver inimigo lá
    4. (passo 6) captura en passant

  E ele é a única peça que não pode voltar. Por isso precisa saber para
  que lado é "frente" — o que depende da cor.
*/
function movimentosDoPeao(tabuleiro, origem, peca) {
    const destinos = [];

    const avanco = peca.cor === BRANCAS ? -1 : 1;   // brancas sobem: linha diminui
    const linhaInicial = peca.cor === BRANCAS ? 6 : 1;

    const linha = linhaDe(origem);
    const coluna = colunaDe(origem);

    // 1. uma casa para a frente
    if (dentroDoTabuleiro(linha + avanco, coluna)) {
        const umaCasa = indiceDe(linha + avanco, coluna);

        if (tabuleiro[umaCasa] === null) {
            destinos.push(umaCasa);

            // 2. duas casas, só da fileira inicial e com o caminho livre
            const duasCasas = indiceDe(linha + 2 * avanco, coluna);

            if (linha === linhaInicial && tabuleiro[duasCasas] === null) {
                destinos.push(duasCasas);
            }
        }
    }

    // 3. capturas na diagonal
    for (const passoColuna of [-1, 1]) {
        const novaLinha = linha + avanco;
        const novaColuna = coluna + passoColuna;

        if (!dentroDoTabuleiro(novaLinha, novaColuna)) {
            continue;
        }

        const destino = indiceDe(novaLinha, novaColuna);
        const ocupante = tabuleiro[destino];

        // Note o "!== null": o peão NÃO pode ir na diagonal para uma casa vazia.
        if (ocupante !== null && ocupante.cor !== peca.cor) {
            destinos.push(destino);
        }
    }

    return destinos;
}


// ============================================================
// ATAQUE E XEQUE
// ============================================================
/*
  "Esta casa está sendo atacada por aquela cor?"

  Poderíamos gerar TODOS os movimentos do adversário e ver se algum chega
  aqui. Funciona, e é lento.

  O caminho inverso é mais rápido e mais fácil de entender: saímos da
  casa em cada direção e perguntamos "quem eu encontro por aqui poderia
  me atacar de lá?".

  É a mesma ideia de descobrir quem está te olhando: em vez de perguntar
  a todo mundo da sala para onde está olhando, você olha em volta.
*/
function casaAtacada(tabuleiro, indice, corAtacante) {
    const linha = linhaDe(indice);
    const coluna = colunaDe(indice);

    /*
      PEÕES — o caso que engana.

      Um peão ataca na diagonal, PARA A FRENTE dele. Como queremos saber
      de onde ele viria, subtraímos o avanço em vez de somar. Errar esse
      sinal produz um bug curioso: o rei consegue andar para casas
      atacadas por peões, e só por peões.
    */
    const avancoDoAtacante = corAtacante === BRANCAS ? -1 : 1;

    for (const passoColuna of [-1, 1]) {
        const linhaPeao = linha - avancoDoAtacante;
        const colunaPeao = coluna + passoColuna;

        if (dentroDoTabuleiro(linhaPeao, colunaPeao)) {
            const peca = tabuleiro[indiceDe(linhaPeao, colunaPeao)];

            if (peca !== null && peca.cor === corAtacante && peca.tipo === "peao") {
                return true;
            }
        }
    }

    if (encontraSaltador(tabuleiro, linha, coluna, SALTOS_DO_CAVALO, corAtacante, "cavalo")) {
        return true;
    }

    if (encontraSaltador(tabuleiro, linha, coluna, PASSOS_DO_REI, corAtacante, "rei")) {
        return true;
    }

    // Nas retas: torre e dama. Nas diagonais: bispo e dama.
    if (encontraDeslizante(tabuleiro, linha, coluna, RETAS, corAtacante, ["torre", "dama"])) {
        return true;
    }

    return encontraDeslizante(tabuleiro, linha, coluna, DIAGONAIS, corAtacante, ["bispo", "dama"]);
}

function encontraSaltador(tabuleiro, linha, coluna, saltos, cor, tipo) {
    return saltos.some(([passoLinha, passoColuna]) => {
        const novaLinha = linha + passoLinha;
        const novaColuna = coluna + passoColuna;

        if (!dentroDoTabuleiro(novaLinha, novaColuna)) {
            return false;
        }

        const peca = tabuleiro[indiceDe(novaLinha, novaColuna)];
        return peca !== null && peca.cor === cor && peca.tipo === tipo;
    });
}

function encontraDeslizante(tabuleiro, linha, coluna, direcoes, cor, tipos) {
    for (const [passoLinha, passoColuna] of direcoes) {
        let novaLinha = linha + passoLinha;
        let novaColuna = coluna + passoColuna;

        while (dentroDoTabuleiro(novaLinha, novaColuna)) {
            const peca = tabuleiro[indiceDe(novaLinha, novaColuna)];

            if (peca !== null) {
                /*
                  A PRIMEIRA peça encontrada é a única que importa: ela
                  bloqueia tudo o que vem atrás. Esquecer este `break` faz
                  uma torre "atacar" através de outra peça.
                */
                if (peca.cor === cor && tipos.includes(peca.tipo)) {
                    return true;
                }
                break;
            }

            novaLinha += passoLinha;
            novaColuna += passoColuna;
        }
    }

    return false;
}

function encontrarRei(tabuleiro, cor) {
    return tabuleiro.findIndex(peca =>
        peca !== null && peca.cor === cor && peca.tipo === "rei"
    );
}

function estaEmXeque(tabuleiro, cor) {
    const casaDoRei = encontrarRei(tabuleiro, cor);

    if (casaDoRei === -1) {
        return false;   // posições de teste podem não ter rei
    }

    return casaAtacada(tabuleiro, casaDoRei, corAdversaria(cor));
}

function corAdversaria(cor) {
    return cor === BRANCAS ? PRETAS : BRANCAS;
}


// ============================================================
// LEGALIDADE
// ============================================================
/*
  Aplica um movimento numa CÓPIA e devolve o tabuleiro novo, sem tocar no
  original.

  slice() copia o array. As peças em si não precisam ser copiadas porque
  nunca mudam — foi para isso que as congelamos no passo 2.

  Copiar 64 posições parece caro. Não é: é o que nos permite perguntar
  "e se eu jogasse isto?" sem risco nenhum de bagunçar a partida em
  andamento. No passo 7, o computador vai fazer isso dezenas de milhares
  de vezes por jogada.
*/
function aplicarEmCopia(tabuleiro, origem, destino) {
    const copia = tabuleiro.slice();

    copia[destino] = copia[origem];
    copia[origem] = null;

    return copia;
}

/*
  A ETAPA 2: dos movimentos possíveis, ficam os que não deixam o próprio
  rei atacado.

  Uma única linha resolve a CRAVADA, o xeque e a obrigação de responder
  ao xeque. Nenhuma dessas regras está escrita em lugar nenhum — todas
  são consequência desta.

  É o tipo de solução que vale procurar: uma regra geral que faz várias
  regras específicas desaparecerem.
*/
function gerarMovimentosLegais(tabuleiro, origem) {
    const peca = tabuleiro[origem];

    if (peca === null) {
        return [];
    }

    return gerarMovimentosPseudoLegais(tabuleiro, origem)
        .filter(destino => {
            const depois = aplicarEmCopia(tabuleiro, origem, destino);
            return !estaEmXeque(depois, peca.cor);
        });
}

/*
  Todos os lances legais de uma cor. É o que responde à pergunta decisiva
  do fim de partida.
*/
function todosOsMovimentosLegais(tabuleiro, cor) {
    const movimentos = [];

    for (let origem = 0; origem < 64; origem++) {
        const peca = tabuleiro[origem];

        if (peca !== null && peca.cor === cor) {
            for (const destino of gerarMovimentosLegais(tabuleiro, origem)) {
                movimentos.push({ origem, destino });
            }
        }
    }

    return movimentos;
}

/*
  FIM DE PARTIDA.

  A pergunta é sempre a mesma: o jogador da vez tem ALGUM movimento legal?

      não tem e está em xeque   -> xeque-mate
      não tem e não está        -> afogamento (empate)

  Repare que mate e afogamento diferem por uma única condição. É por isso
  que, no xadrez, dar mate com pouca vantagem é difícil: é fácil demais
  tirar todas as jogadas do adversário sem que ele esteja em xeque — e a
  partida que você estava ganhando vira empate.
*/
function situacaoDaPartida(tabuleiro, cor) {
    if (todosOsMovimentosLegais(tabuleiro, cor).length > 0) {
        return estaEmXeque(tabuleiro, cor) ? "xeque" : "em-andamento";
    }

    return estaEmXeque(tabuleiro, cor) ? "xeque-mate" : "afogamento";
}


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

        /*
          NOVO — mostrar para onde a peça pode ir.

          Duas marcas diferentes: bolinha para casa vazia, anel para
          captura. É uma informação a mais sem custo nenhum de leitura, e
          o jogador entende sem que ninguém explique.
        */
        const podeIr = movimentosDisponiveis.includes(indice);
        casa.classList.toggle("destino", podeIr && peca === null);
        casa.classList.toggle("captura", podeIr && peca !== null);

        // NOVO: o rei em xeque fica em destaque.
        casa.classList.toggle("em-xeque",
            peca !== null && peca.tipo === "rei" && estaEmXeque(casas, peca.cor));
    }

    desenharStatus();
}

/*
  Toda a mensagem vem de situacaoDaPartida — uma função que só calcula.
  A interface não decide nada sobre xadrez; ela só traduz o resultado
  para uma frase em português.
*/
function desenharStatus() {
    const situacao = situacaoDaPartida(casas, vezDe);
    const ladoDaVez = vezDe === BRANCAS ? "brancas" : "pretas";
    const ladoAdversario = vezDe === BRANCAS ? "pretas" : "brancas";

    const mensagens = {
        "em-andamento": `Vez das ${ladoDaVez}`,
        "xeque": `Xeque! Vez das ${ladoDaVez}`,
        "xeque-mate": `Xeque-mate — as ${ladoAdversario} vencem`,
        "afogamento": "Empate por afogamento"
    };

    elementoLegenda.textContent = mensagens[situacao];
    elementoLegenda.classList.toggle("alerta", situacao === "xeque");
    elementoLegenda.classList.toggle("fim",
        situacao === "xeque-mate" || situacao === "afogamento");
}

function partidaAcabou() {
    const situacao = situacaoDaPartida(casas, vezDe);
    return situacao === "xeque-mate" || situacao === "afogamento";
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
    // NOVO: acabou a partida, acabaram os cliques.
    if (partidaAcabou()) {
        return;
    }

    if (movimentosDisponiveis.includes(indice)) {
        moverPeca(casaSelecionada, indice);
        return;
    }

    const peca = casas[indice];

    // Só as peças de quem tem a vez podem ser selecionadas.
    if (peca !== null && peca.cor === vezDe) {
        casaSelecionada = indice;
        movimentosDisponiveis = gerarMovimentosLegais(casas, indice);
        desenhar();
        return;
    }

    limparSelecao();
    desenhar();
}

function limparSelecao() {
    casaSelecionada = null;
    movimentosDisponiveis = [];
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
    limparSelecao();

    vezDe = vezDe === BRANCAS ? PRETAS : BRANCAS;

    desenhar();
}


// ============================================================
// LIGAR
// ============================================================
montarTabuleiro();
desenhar();

console.log("Agora as peças cravadas não saem do lugar.");
console.log("Experimente carregar um mate em um lance:");
console.log("  casas = carregarPosicao('6k1/5ppp/8/8/8/8/8/R5K1'); desenhar()");
console.log("  ...e jogue a torre para a8.");
console.log("AINDA FALTA: roque, en passant e promoção. Isso é o passo 6.");
