/*
  XADREZ — PASSO 6: AS REGRAS ESPECIAIS

  Roque, en passant e promoção: as três regras que todo mundo esquece de
  implementar, e cada uma quebra uma suposição do código até aqui.

    ROQUE       -> um lance move DUAS peças
    EN PASSANT  -> a peça capturada NÃO está na casa de destino
    PROMOÇÃO    -> um mesmo destino gera QUATRO lances diferentes

  Por isso um movimento deixa de ser um número (o destino) e passa a ser
  um OBJETO que descreve o lance inteiro.

  E há uma segunda mudança, tão importante quanto: uma posição de xadrez
  passa a ser mais do que as peças no tabuleiro.

      casas                   -> onde estão as peças
      vezDe                   -> de quem é a vez
      direitosDeRoque         -> quem ainda pode rocar
      alvoEnPassant           -> onde a captura no ar é possível AGORA
      meiosLancesSemProgresso -> para a regra dos 50 lances

  Essas quatro últimas são HISTÓRIA, não geometria: não dá para olhar um
  tabuleiro e descobri-las. Guardar só as peças e perceber isso tarde é
  um dos erros mais comuns de quem programa xadrez.
*/

/*
  ============================================================
  XADREZ — AS REGRAS
  ============================================================

  Este arquivo não sabe nada sobre telas, cliques ou HTML.
  Ele só responde a perguntas sobre uma posição de xadrez:

      quais movimentos são legais aqui?
      este rei está em xeque?
      a partida acabou?

  Separar assim não é organização por organização. É o que permite:
    - o computador (computador.js) usar as MESMAS regras para pensar;
    - testar as regras fora do navegador, com um script;
    - trocar a interface inteira sem tocar em uma linha de regra.

  ------------------------------------------------------------
  COMO O TABULEIRO É REPRESENTADO
  ------------------------------------------------------------
  Um array simples de 64 posições, e não uma matriz 8x8.

      indice = linha * 8 + coluna

      linha 0 = a oitava fileira (onde as pretas começam)
      linha 7 = a primeira fileira (onde as brancas começam)
      coluna 0 = coluna "a"

  Um array plano é mais rápido de copiar do que oito arrays aninhados —
  e o computador vai copiar este tabuleiro dezenas de milhares de vezes
  por jogada. Quando precisamos raciocinar em duas dimensões, convertemos
  com as funções logo abaixo.
*/


// ============================================================
// PEÇAS
// ============================================================
const BRANCAS = "brancas";
const PRETAS = "pretas";

/*
  Cada peça é um objeto criado UMA vez e reutilizado em todas as casas.
  Como nunca alteramos uma peça (movimentos criam tabuleiros novos),
  compartilhar o mesmo objeto é seguro e evita criar milhares deles
  durante a busca do computador.
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


// ============================================================
// COORDENADAS
// ============================================================
function linhaDe(indice) {
    return Math.floor(indice / 8);
}

function colunaDe(indice) {
    return indice % 8;
}

function indiceDe(linha, coluna) {
    return linha * 8 + coluna;
}

function dentroDoTabuleiro(linha, coluna) {
    return linha >= 0 && linha < 8 && coluna >= 0 && coluna < 8;
}

/*
  Converte um índice para a notação humana: 0 vira "a8", 63 vira "h1".
  Usada só para mostrar e depurar — as regras trabalham com números.
*/
function nomeDaCasa(indice) {
    const letra = "abcdefgh"[colunaDe(indice)];
    const numero = 8 - linhaDe(indice);
    return `${letra}${numero}`;
}

function corAdversaria(cor) {
    return cor === BRANCAS ? PRETAS : BRANCAS;
}


// ============================================================
// O ESTADO DE UMA POSIÇÃO
// ============================================================
/*
  Uma posição de xadrez é mais do que as peças no tabuleiro. Para saber
  quais movimentos são legais, é preciso também:

    vezDe                  -> de quem é a vez
    direitosDeRoque        -> quem ainda pode rocar (perde-se ao mover rei/torre)
    alvoEnPassant          -> a casa onde uma captura en passant é possível AGORA
                              (dura um único lance)
    meiosLancesSemProgresso-> para a regra dos 50 lances

  Isso é conhecimento que não está nas peças. Um erro clássico de quem
  programa xadrez é guardar só o tabuleiro e descobrir tarde demais que
  faltam essas quatro informações.
*/
function criarPosicaoInicial() {
    return carregarFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}

/*
  FEN é o formato padrão para escrever uma posição de xadrez em uma linha.
  Aceitá-lo permite carregar qualquer posição — ótimo para testar e para
  montar estudos.

      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
       ^ peças, da 8ª à 1ª fileira      ^vez ^roques ^en passant
      Minúsculas são pretas, maiúsculas brancas, números são casas vazias.
*/
function carregarFEN(textoFEN) {
    const partes = textoFEN.trim().split(/\s+/);
    const casas = new Array(64).fill(null);

    const letraParaTipo = {
        p: "peao", n: "cavalo", b: "bispo",
        r: "torre", q: "dama", k: "rei"
    };

    let indice = 0;
    for (const caractere of partes[0]) {
        if (caractere === "/") {
            continue;
        }

        if (caractere >= "1" && caractere <= "8") {
            indice += Number(caractere);   // casas vazias seguidas
            continue;
        }

        const ehBranca = caractere === caractere.toUpperCase();
        const tipo = letraParaTipo[caractere.toLowerCase()];
        casas[indice] = PECAS[ehBranca ? BRANCAS : PRETAS][tipo];
        indice += 1;
    }

    const direitosFEN = partes[2] || "-";

    return {
        casas,
        vezDe: partes[1] === "b" ? PRETAS : BRANCAS,
        direitosDeRoque: {
            brancasRei: direitosFEN.includes("K"),
            brancasDama: direitosFEN.includes("Q"),
            pretasRei: direitosFEN.includes("k"),
            pretasDama: direitosFEN.includes("q")
        },
        alvoEnPassant: partes[3] && partes[3] !== "-" ? indiceDeNome(partes[3]) : null,
        meiosLancesSemProgresso: Number(partes[4] || 0),
        numeroDoLance: Number(partes[5] || 1)
    };
}

function indiceDeNome(nome) {
    const coluna = "abcdefgh".indexOf(nome[0]);
    const linha = 8 - Number(nome[1]);
    return indiceDe(linha, coluna);
}


// ============================================================
// GERAÇÃO DE MOVIMENTOS
// ============================================================
/*
  A geração acontece em DUAS ETAPAS, e essa separação é a forma clássica
  de resolver o problema:

    1. PSEUDO-LEGAIS: movimentos que respeitam como a peça anda,
       ignorando se o próprio rei ficaria em xeque.

    2. LEGAIS: dos pseudo-legais, ficam os que não deixam o próprio rei
       atacado. Testamos isso simplesmente EXECUTANDO o movimento e
       olhando o resultado.

  Por que não gerar direto os legais? Porque as regras de cravada
  (a peça que não pode sair porque o rei ficaria exposto) são cheias de
  exceções — inclusive uma captura en passant que expõe o rei na
  horizontal. Executar e olhar é mais lento e é SEMPRE correto. Numa
  primeira implementação, correto vale mais do que rápido.
*/
function gerarMovimentosLegais(estado) {
    return gerarMovimentosPseudoLegais(estado, estado.vezDe)
        .filter(movimento => {
            const depois = aplicarMovimento(estado, movimento);
            return !estaEmXeque(depois, estado.vezDe);
        });
}

function gerarMovimentosPseudoLegais(estado, cor) {
    const movimentos = [];

    for (let origem = 0; origem < 64; origem++) {
        const peca = estado.casas[origem];

        if (peca === null || peca.cor !== cor) {
            continue;
        }

        switch (peca.tipo) {
            case "peao":   gerarDoPeao(estado, origem, movimentos); break;
            case "cavalo": gerarComSaltos(estado, origem, SALTOS_DO_CAVALO, movimentos); break;
            case "rei":    gerarComSaltos(estado, origem, PASSOS_DO_REI, movimentos); break;
            case "bispo":  gerarDeslizando(estado, origem, DIAGONAIS, movimentos); break;
            case "torre":  gerarDeslizando(estado, origem, RETAS, movimentos); break;
            case "dama":   gerarDeslizando(estado, origem, [...RETAS, ...DIAGONAIS], movimentos); break;
        }
    }

    gerarRoques(estado, cor, movimentos);
    return movimentos;
}

/*
  Cada direção é um par [variação de linha, variação de coluna].
  Trabalhar em linha/coluna em vez de somar ao índice evita o bug clássico
  do "cavalo que sai pela borda e reaparece do outro lado" — porque a
  verificação de limites é explícita.
*/
const RETAS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const DIAGONAIS = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
const SALTOS_DO_CAVALO = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
];
const PASSOS_DO_REI = [...RETAS, ...DIAGONAIS];

function criarMovimento(estado, origem, destino, extras = {}) {
    return {
        origem,
        destino,
        peca: estado.casas[origem],
        capturada: estado.casas[destino],
        promocao: null,
        ehRoque: false,
        ehEnPassant: false,
        ...extras
    };
}

/*
  Peças que DESLIZAM (bispo, torre, dama): andam em uma direção até
  esbarrar em alguém ou na borda.
*/
function gerarDeslizando(estado, origem, direcoes, movimentos) {
    const peca = estado.casas[origem];

    for (const [passoLinha, passoColuna] of direcoes) {
        let linha = linhaDe(origem) + passoLinha;
        let coluna = colunaDe(origem) + passoColuna;

        while (dentroDoTabuleiro(linha, coluna)) {
            const destino = indiceDe(linha, coluna);
            const ocupante = estado.casas[destino];

            if (ocupante === null) {
                movimentos.push(criarMovimento(estado, origem, destino));
            } else {
                // Peça inimiga: pode capturar. Aliada: nem isso. Em ambos os
                // casos, o caminho acaba aqui.
                if (ocupante.cor !== peca.cor) {
                    movimentos.push(criarMovimento(estado, origem, destino));
                }
                break;
            }

            linha += passoLinha;
            coluna += passoColuna;
        }
    }
}

/*
  Peças que SALTAM (cavalo e rei): um passo único em cada direção.
*/
function gerarComSaltos(estado, origem, saltos, movimentos) {
    const peca = estado.casas[origem];

    for (const [passoLinha, passoColuna] of saltos) {
        const linha = linhaDe(origem) + passoLinha;
        const coluna = colunaDe(origem) + passoColuna;

        if (!dentroDoTabuleiro(linha, coluna)) {
            continue;
        }

        const destino = indiceDe(linha, coluna);
        const ocupante = estado.casas[destino];

        if (ocupante === null || ocupante.cor !== peca.cor) {
            movimentos.push(criarMovimento(estado, origem, destino));
        }
    }
}

/*
  O PEÃO é a peça com mais regras especiais de todo o xadrez:
    - anda para frente, mas captura na diagonal;
    - pode andar duas casas na estreia;
    - captura "no ar" (en passant);
    - vira outra peça ao chegar ao fim.
*/
function gerarDoPeao(estado, origem, movimentos) {
    const peca = estado.casas[origem];
    const avanco = peca.cor === BRANCAS ? -1 : 1;   // brancas sobem (linha diminui)
    const linhaInicial = peca.cor === BRANCAS ? 6 : 1;
    const linhaDePromocao = peca.cor === BRANCAS ? 0 : 7;

    const linha = linhaDe(origem);
    const coluna = colunaDe(origem);

    // Avanço de uma casa (só se estiver livre)
    const umaCasa = indiceDe(linha + avanco, coluna);
    if (dentroDoTabuleiro(linha + avanco, coluna) && estado.casas[umaCasa] === null) {
        adicionarComPromocao(estado, origem, umaCasa, linhaDePromocao, movimentos);

        // Avanço de duas casas: só da fileira inicial e só com o caminho livre
        const duasCasas = indiceDe(linha + 2 * avanco, coluna);
        if (linha === linhaInicial && estado.casas[duasCasas] === null) {
            movimentos.push(criarMovimento(estado, origem, duasCasas));
        }
    }

    // Capturas na diagonal
    for (const passoColuna of [-1, 1]) {
        const novaLinha = linha + avanco;
        const novaColuna = coluna + passoColuna;

        if (!dentroDoTabuleiro(novaLinha, novaColuna)) {
            continue;
        }

        const destino = indiceDe(novaLinha, novaColuna);
        const ocupante = estado.casas[destino];

        if (ocupante !== null && ocupante.cor !== peca.cor) {
            adicionarComPromocao(estado, origem, destino, linhaDePromocao, movimentos);
            continue;
        }

        /*
          EN PASSANT: capturar um peão que acabou de avançar duas casas,
          como se ele tivesse avançado só uma. A casa "pulada" fica
          registrada em alvoEnPassant e vale por um único lance.

          Repare que a peça capturada NÃO está na casa de destino — está
          ao lado. Por isso o movimento precisa da marca ehEnPassant.
        */
        if (ocupante === null && destino === estado.alvoEnPassant) {
            movimentos.push(criarMovimento(estado, origem, destino, {
                ehEnPassant: true,
                capturada: estado.casas[indiceDe(linha, novaColuna)]
            }));
        }
    }
}

/*
  Ao chegar à última fileira, o peão vira outra peça — e o jogador ESCOLHE
  qual. Por isso um mesmo destino gera quatro movimentos diferentes.

  Promover a cavalo é raro, mas existe e decide partidas: é o único jeito
  de dar xeque em algumas posições. Gerar as quatro opções é o que torna
  o gerador correto.
*/
function adicionarComPromocao(estado, origem, destino, linhaDePromocao, movimentos) {
    if (linhaDe(destino) !== linhaDePromocao) {
        movimentos.push(criarMovimento(estado, origem, destino));
        return;
    }

    for (const tipo of ["dama", "torre", "bispo", "cavalo"]) {
        movimentos.push(criarMovimento(estado, origem, destino, { promocao: tipo }));
    }
}

/*
  ROQUE — o único lance que move duas peças ao mesmo tempo.

  Cinco condições, e esquecer qualquer uma delas é um bug clássico:
    1. o direito ainda existe (nem rei nem aquela torre se moveram);
    2. as casas entre rei e torre estão vazias;
    3. o rei não está em xeque agora;
    4. o rei não PASSA por uma casa atacada;
    5. o rei não TERMINA em casa atacada (isto o filtro de legalidade
       resolve sozinho, depois).
*/
function gerarRoques(estado, cor, movimentos) {
    const ehBranca = cor === BRANCAS;
    const linhaBase = ehBranca ? 7 : 0;
    const casaDoRei = indiceDe(linhaBase, 4);

    if (estado.casas[casaDoRei] !== PECAS[cor].rei) {
        return;
    }

    if (casaAtacada(estado, casaDoRei, corAdversaria(cor))) {
        return;   // não se roca estando em xeque
    }

    const podeCurto = ehBranca ? estado.direitosDeRoque.brancasRei : estado.direitosDeRoque.pretasRei;
    const podeLongo = ehBranca ? estado.direitosDeRoque.brancasDama : estado.direitosDeRoque.pretasDama;

    // Roque pequeno (lado do rei): rei de e1 para g1
    if (podeCurto
        && estado.casas[indiceDe(linhaBase, 5)] === null
        && estado.casas[indiceDe(linhaBase, 6)] === null
        && !casaAtacada(estado, indiceDe(linhaBase, 5), corAdversaria(cor))) {
        movimentos.push(criarMovimento(estado, casaDoRei, indiceDe(linhaBase, 6), { ehRoque: true }));
    }

    // Roque grande (lado da dama): rei de e1 para c1
    if (podeLongo
        && estado.casas[indiceDe(linhaBase, 1)] === null
        && estado.casas[indiceDe(linhaBase, 2)] === null
        && estado.casas[indiceDe(linhaBase, 3)] === null
        && !casaAtacada(estado, indiceDe(linhaBase, 3), corAdversaria(cor))) {
        movimentos.push(criarMovimento(estado, casaDoRei, indiceDe(linhaBase, 2), { ehRoque: true }));
    }
}


// ============================================================
// ATAQUE E XEQUE
// ============================================================
/*
  "Esta casa está sendo atacada por aquela cor?"

  Poderíamos gerar todos os movimentos do adversário e ver se algum chega
  aqui. Mas é bem mais rápido — e mais fácil de entender — fazer o
  caminho inverso: sair da casa em cada direção e perguntar "quem eu
  encontro nessa direção poderia me atacar de lá?".
*/
function casaAtacada(estado, indice, corAtacante) {
    const linha = linhaDe(indice);
    const coluna = colunaDe(indice);

    // Peões: atacam na diagonal, e só para a frente deles.
    const avancoDoAtacante = corAtacante === BRANCAS ? -1 : 1;
    for (const passoColuna of [-1, 1]) {
        const linhaPeao = linha - avancoDoAtacante;   // de onde ele viria
        const colunaPeao = coluna + passoColuna;

        if (dentroDoTabuleiro(linhaPeao, colunaPeao)) {
            const peca = estado.casas[indiceDe(linhaPeao, colunaPeao)];
            if (peca !== null && peca.cor === corAtacante && peca.tipo === "peao") {
                return true;
            }
        }
    }

    if (encontraSaltador(estado, linha, coluna, SALTOS_DO_CAVALO, corAtacante, "cavalo")) {
        return true;
    }

    if (encontraSaltador(estado, linha, coluna, PASSOS_DO_REI, corAtacante, "rei")) {
        return true;
    }

    // Deslizantes: torre e dama nas retas, bispo e dama nas diagonais.
    if (encontraDeslizante(estado, linha, coluna, RETAS, corAtacante, ["torre", "dama"])) {
        return true;
    }

    return encontraDeslizante(estado, linha, coluna, DIAGONAIS, corAtacante, ["bispo", "dama"]);
}

function encontraSaltador(estado, linha, coluna, saltos, cor, tipo) {
    return saltos.some(([passoLinha, passoColuna]) => {
        const novaLinha = linha + passoLinha;
        const novaColuna = coluna + passoColuna;

        if (!dentroDoTabuleiro(novaLinha, novaColuna)) {
            return false;
        }

        const peca = estado.casas[indiceDe(novaLinha, novaColuna)];
        return peca !== null && peca.cor === cor && peca.tipo === tipo;
    });
}

function encontraDeslizante(estado, linha, coluna, direcoes, cor, tipos) {
    for (const [passoLinha, passoColuna] of direcoes) {
        let novaLinha = linha + passoLinha;
        let novaColuna = coluna + passoColuna;

        while (dentroDoTabuleiro(novaLinha, novaColuna)) {
            const peca = estado.casas[indiceDe(novaLinha, novaColuna)];

            if (peca !== null) {
                // A primeira peça encontrada é a única que importa: ela
                // bloqueia tudo o que vem atrás.
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

function encontrarRei(estado, cor) {
    return estado.casas.findIndex(peca =>
        peca !== null && peca.cor === cor && peca.tipo === "rei"
    );
}

function estaEmXeque(estado, cor) {
    const casaDoRei = encontrarRei(estado, cor);

    if (casaDoRei === -1) {
        return false;   // posições de teste podem não ter rei
    }

    return casaAtacada(estado, casaDoRei, corAdversaria(cor));
}


// ============================================================
// APLICAR UM MOVIMENTO
// ============================================================
/*
  Devolve um estado NOVO, sem alterar o antigo.

  Por que não alterar no lugar e depois desfazer? Porque "desfazer" é
  onde nascem os piores bugs de um programa de xadrez: basta esquecer de
  restaurar um direito de roque para a busca inteira ficar corrompida,
  de um jeito que só aparece dez lances depois.

  Copiar 64 posições é barato. Correto primeiro; rápido depois, se medir
  que precisa.
*/
function aplicarMovimento(estado, movimento) {
    const casas = estado.casas.slice();   // cópia rasa: as peças são imutáveis
    const peca = movimento.peca;

    casas[movimento.origem] = null;
    casas[movimento.destino] = movimento.promocao
        ? PECAS[peca.cor][movimento.promocao]
        : peca;

    // En passant: o peão capturado está AO LADO do destino, não nele.
    if (movimento.ehEnPassant) {
        const linhaDoCapturado = linhaDe(movimento.origem);
        const colunaDoCapturado = colunaDe(movimento.destino);
        casas[indiceDe(linhaDoCapturado, colunaDoCapturado)] = null;
    }

    // Roque: a torre também anda.
    if (movimento.ehRoque) {
        const linhaBase = linhaDe(movimento.origem);
        const ehCurto = colunaDe(movimento.destino) === 6;

        const casaOriginalDaTorre = indiceDe(linhaBase, ehCurto ? 7 : 0);
        const casaNovaDaTorre = indiceDe(linhaBase, ehCurto ? 5 : 3);

        casas[casaNovaDaTorre] = casas[casaOriginalDaTorre];
        casas[casaOriginalDaTorre] = null;
    }

    return {
        casas,
        vezDe: corAdversaria(estado.vezDe),
        direitosDeRoque: atualizarDireitosDeRoque(estado, movimento),
        alvoEnPassant: calcularAlvoEnPassant(movimento),
        meiosLancesSemProgresso: (movimento.capturada || peca.tipo === "peao")
            ? 0
            : estado.meiosLancesSemProgresso + 1,
        numeroDoLance: estado.vezDe === PRETAS ? estado.numeroDoLance + 1 : estado.numeroDoLance
    };
}

/*
  Direitos de roque se perdem para sempre quando:
    - o rei se move (perde os dois lados);
    - uma torre se move (perde aquele lado);
    - uma torre é CAPTURADA na casa original (o caso que todo mundo esquece).
*/
function atualizarDireitosDeRoque(estado, movimento) {
    const direitos = { ...estado.direitosDeRoque };
    const { origem, destino, peca } = movimento;

    if (peca.tipo === "rei") {
        if (peca.cor === BRANCAS) {
            direitos.brancasRei = false;
            direitos.brancasDama = false;
        } else {
            direitos.pretasRei = false;
            direitos.pretasDama = false;
        }
    }

    // Vale tanto para a torre que sai quanto para a torre que é capturada:
    // basta a casa original ficar envolvida no lance.
    for (const casa of [origem, destino]) {
        if (casa === 63) direitos.brancasRei = false;   // h1
        if (casa === 56) direitos.brancasDama = false;  // a1
        if (casa === 7) direitos.pretasRei = false;     // h8
        if (casa === 0) direitos.pretasDama = false;    // a8
    }

    return direitos;
}

/*
  A casa de en passant só existe depois de um avanço duplo de peão,
  e só vale para o lance seguinte.
*/
function calcularAlvoEnPassant(movimento) {
    const avancouDuas = movimento.peca.tipo === "peao"
        && Math.abs(linhaDe(movimento.destino) - linhaDe(movimento.origem)) === 2;

    if (!avancouDuas) {
        return null;
    }

    const linhaDoMeio = (linhaDe(movimento.origem) + linhaDe(movimento.destino)) / 2;
    return indiceDe(linhaDoMeio, colunaDe(movimento.destino));
}


// ============================================================
// FIM DE PARTIDA
// ============================================================
/*
  A pergunta decisiva é sempre a mesma: o jogador da vez tem algum
  movimento legal?

    - se NÃO tem e está em xeque   -> xeque-mate
    - se NÃO tem e não está        -> afogamento (empate)

  Note que mate e afogamento diferem por uma única condição. É por isso
  que, no xadrez, dar mate com pouca vantagem é difícil: é fácil demais
  tirar todas as jogadas do adversário sem que ele esteja em xeque.
*/
function situacaoDaPartida(estado) {
    const temMovimento = gerarMovimentosLegais(estado).length > 0;

    if (!temMovimento) {
        return estaEmXeque(estado, estado.vezDe) ? "xeque-mate" : "afogamento";
    }

    if (estado.meiosLancesSemProgresso >= 100) {
        return "empate-50-lances";   // 100 meios-lances = 50 lances de cada lado
    }

    if (materialInsuficiente(estado)) {
        return "empate-material";
    }

    return "em-andamento";
}

/*
  Com pouco material não existe mate possível, e a partida é empate
  imediato: rei contra rei, rei e bispo, rei e cavalo.
*/
function materialInsuficiente(estado) {
    const restantes = estado.casas.filter(peca => peca !== null && peca.tipo !== "rei");

    if (restantes.length === 0) {
        return true;
    }

    return restantes.length === 1
        && (restantes[0].tipo === "bispo" || restantes[0].tipo === "cavalo");
}




// ============================================================
// SÍMBOLOS E NOMES
// ============================================================
const SIMBOLOS = {
    brancas: { rei: "♔", dama: "♕", torre: "♖", bispo: "♗", cavalo: "♘", peao: "♙" },
    pretas:  { rei: "♚", dama: "♛", torre: "♜", bispo: "♝", cavalo: "♞", peao: "♟" }
};

const NOMES_DAS_PECAS = {
    rei: "rei", dama: "dama", torre: "torre",
    bispo: "bispo", cavalo: "cavalo", peao: "peão"
};


// ============================================================
// DOM
// ============================================================
const elementoTabuleiro = document.getElementById("tabuleiro");
const elementoLegenda = document.getElementById("legenda");


// ============================================================
// ESTADO
// ============================================================
/*
  Uma variável só guarda a posição INTEIRA — peças, vez, direitos de
  roque, alvo de en passant. Antes eram várias variáveis soltas.

  A vantagem aparece na linha de baixo: guardar a partida inteira para
  poder desfazer é empilhar objetos.
*/
let estado = criarPosicaoInicial();
const historico = [];

let casaSelecionada = null;
let movimentosDisponiveis = [];
let ultimoLance = null;

const casasDaTela = [];


// ============================================================
// MONTAR E DESENHAR
// ============================================================
function marcarCoordenadas(casa, indice) {
    if (colunaDe(indice) === 0) {
        casa.dataset.fileira = 8 - linhaDe(indice);
    }

    if (linhaDe(indice) === 7) {
        casa.dataset.coluna = "abcdefgh"[colunaDe(indice)];
    }
}

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
    const destinos = movimentosDisponiveis.map(movimento => movimento.destino);

    for (let indice = 0; indice < 64; indice++) {
        const casa = casasDaTela[indice];
        const peca = estado.casas[indice];

        casa.textContent = peca ? SIMBOLOS[peca.cor][peca.tipo] : "";

        casa.classList.toggle("peca-branca", Boolean(peca) && peca.cor === BRANCAS);
        casa.classList.toggle("peca-preta", Boolean(peca) && peca.cor === PRETAS);
        casa.setAttribute("aria-label", descreverCasa(indice, peca));

        casa.classList.toggle("selecionada", indice === casaSelecionada);
        casa.classList.toggle("destino", destinos.includes(indice) && peca === null);
        casa.classList.toggle("captura", destinos.includes(indice) && peca !== null);
        casa.classList.toggle("ultimo-lance",
            ultimoLance !== null &&
            (indice === ultimoLance.origem || indice === ultimoLance.destino));
        casa.classList.toggle("em-xeque",
            peca !== null && peca.tipo === "rei" && estaEmXeque(estado, peca.cor));
    }

    desenharStatus();
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
    const ladoDaVez = estado.vezDe === BRANCAS ? "brancas" : "pretas";
    const ladoAdversario = estado.vezDe === BRANCAS ? "pretas" : "brancas";

    const mensagens = {
        "em-andamento": estaEmXeque(estado, estado.vezDe)
            ? `Xeque! Vez das ${ladoDaVez}`
            : `Vez das ${ladoDaVez}`,
        "xeque-mate": `Xeque-mate — as ${ladoAdversario} vencem`,
        "afogamento": "Empate por afogamento",
        "empate-50-lances": "Empate pela regra dos 50 lances",
        "empate-material": "Empate: material insuficiente"
    };

    elementoLegenda.textContent = mensagens[situacao];
    elementoLegenda.classList.toggle("alerta",
        situacao === "em-andamento" && estaEmXeque(estado, estado.vezDe));
    elementoLegenda.classList.toggle("fim", situacao !== "em-andamento");
}


// ============================================================
// INTERAÇÃO
// ============================================================
function aoClicarNaCasa(indice) {
    if (situacaoDaPartida(estado) !== "em-andamento") {
        return;
    }

    /*
      Um mesmo destino pode ter VÁRIOS movimentos: é o caso da promoção,
      em que o peão pode virar quatro peças diferentes.

      Por isso filtramos por destino e escolhemos depois, em vez de
      procurar um movimento só.
    */
    const movimentosParaEssaCasa = movimentosDisponiveis.filter(
        movimento => movimento.destino === indice
    );

    if (movimentosParaEssaCasa.length > 0) {
        executarMovimento(escolherPromocao(movimentosParaEssaCasa));
        return;
    }

    const peca = estado.casas[indice];

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
  Por enquanto, promover sempre a dama — é o que se quer em 99% dos
  casos. No passo final isso vira uma escolha do jogador.
*/
function escolherPromocao(movimentos) {
    if (movimentos.length === 1) {
        return movimentos[0];
    }

    return movimentos.find(movimento => movimento.promocao === "dama") || movimentos[0];
}

function limparSelecao() {
    casaSelecionada = null;
    movimentosDisponiveis = [];
}

function executarMovimento(movimento) {
    historico.push(estado);          // guarda o estado ANTERIOR inteiro
    estado = aplicarMovimento(estado, movimento);

    ultimoLance = movimento;
    limparSelecao();
    desenhar();
}

/*
  DESFAZER — e aqui está o dividendo da decisão de nunca alterar um
  estado no lugar.

  Não existe "desfazer o roque", nem "devolver a peça capturada", nem
  "restaurar o direito de rocar". Basta voltar ao estado salvo.

  Programas que modificam o tabuleiro precisam de uma função de desfazer
  cheia de casos especiais — e é lá que moram os piores bugs de um
  programa de xadrez, porque um único campo esquecido corrompe tudo o
  que vem depois, silenciosamente.
*/
function desfazer() {
    if (historico.length === 0) {
        return;
    }

    estado = historico.pop();
    ultimoLance = null;
    limparSelecao();
    desenhar();
}

document.addEventListener("keydown", evento => {
    if (evento.key.toLowerCase() === "z") {
        desfazer();
    }
});


// ============================================================
// LIGAR
// ============================================================
montarTabuleiro();
desenhar();

console.log("Aperte Z para desfazer um lance.");
console.log("Teste as três regras especiais:");
console.log("  roque      -> mova o rei duas casas (limpe o caminho antes)");
console.log("  en passant -> estado = carregarFEN('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1'); desenhar()");
console.log("  promoção   -> estado = carregarFEN('4k3/P7/8/8/8/8/8/4K3 w - - 0 1'); desenhar()");
