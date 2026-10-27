/*
  XENOMORPH — PASSO 8: O GERADOR, AGORA COM UM COVIL

  Este arquivo NÃO sabe que existe uma tela, um teclado ou um soldado.
  Ele recebe uma SEMENTE (um texto qualquer) e devolve um MUNDO: quais
  salas existem, quem se liga com quem, que módulo cada sala usa, onde
  nascem as criaturas e os itens. É uma função pura — a mesma semente dá
  sempre o mesmo mundo, em qualquer computador. É isso que o GDD chama de
  "seed reproduzível" (seções 2, 13 e 14).

  Por ser puro, ele mora num arquivo à parte, como as regras do xadrez:
  dá para testá-lo sozinho, e o jogo só precisa chamar gerarMundo().

  O caminho, em quatro camadas (seção 4 deste arquivo):

  1. O ESQUELETO: quais células da grade são salas e quais se ligam.
  2. AS SALAS: que módulo, feito à mão, cada célula usa — escolhido entre
     os que têm as aberturas necessárias.
  3. A POPULAÇÃO: o que aparece em cada sala.
  4. AS CHAVES E AS FECHADURAS: onde fica a habilidade, que portas ela
     abre, onde está o covil da Matriarca — que guarda o objetivo.

  Cada camada sorteia com o SEU fluxo de números aleatórios.

  E então o VALIDADOR (seção 5) confere o mundo pronto. Se ele for
  impossível, é jogado fora, e outro é gerado a partir de uma semente
  derivada — sempre a mesma sequência, então o resultado continua
  repetível.
*/


// ============================================================
// 1. A GRADE E AS REGIÕES
// ============================================================
/*
  O planeta é uma grade de 8 x 5 células; cada célula pode ser uma sala do
  tamanho de uma tela. Duas REGIÕES fixas dividem a grade: o complexo de
  pesquisa à esquerda, a floresta à direita. As regiões são PERSISTENTES —
  em toda expedição o complexo fica no mesmo lugar —, mas as salas dentro
  delas mudam. É a terceira direção que o GDD recomenda: "um planeta
  dividido em grandes regiões persistentes, mas com salas, encontros,
  recursos e eventos que mudam a cada expedição".

  Só regras moram aqui. As cores de cada região são assunto da tela, e
  moram no script.js.
*/
const MAPA = { colunas: 8, linhas: 5 };

const REGIOES = {
    complexo: {
        nome: "Complexo de Pesquisa",
        colunas: [0, 3],     // da coluna 0 até a 3, inclusive
        salas: 9,
        // os pesos do sorteio de cada espécie (passo 4 do Dealer? Out!)
        criaturas: { rastejador: 5, cuspidora: 3, saltador: 1, ninho: 1 }
    },
    floresta: {
        nome: "Floresta Bioluminescente",
        colunas: [4, 7],
        salas: 8,
        criaturas: { rastejador: 2, cuspidora: 2, saltador: 5, ninho: 1 }
    }
};

// A sala de pouso: sempre no mesmo lugar, sempre o mesmo módulo, nunca uma criatura.
const POUSO = { coluna: 0, linha: 2, modulo: "pouso" };

/*
  As regras da população. A chance de uma criatura aparecer num ponto
  marcado CRESCE com a distância até o pouso: quanto mais fundo, mais
  perigoso. É a primeira forma de "dificuldade baseada no progresso da
  expedição" (GDD, seção 5).
*/
const POPULACAO = {
    chanceDeCriaturaPerto: 0.3,
    chanceDeCriaturaPorSala: 0.07,     // somada para cada sala de distância
    chanceDeCriaturaMaxima: 0.8,
    chanceDeItem: 0.4,
    chanceDeAtalho: 0.2,               // ligações extras entre salas vizinhas (seção 4)

    /*
      Nenhuma criatura nasce a menos de 5 blocos de uma porta usada: quem
      entra numa sala precisa de um instante para ver o que tem nela. É o
      "pontos de surgimento seguros" do GDD (seção 13).
    */
    distanciaSeguraDasPortas: 5,

    chanceDeSegredo: 0.5,  // uma sala sem saída do complexo vira sala secreta (seção 4.5)

    distanciaMinimaDoNinho: 3,    // perto do pouso, um ninho vira um rastejador comum
    profundidadeDoCovil: 3        // portas, no mínimo, entre a entrada da floresta e o covil
};

/*
  As quatro direções, pelos pontos cardeais: O(este), L(este), N(orte),
  S(ul). Cada uma diz como andar na grade e qual é a direção de volta.
*/
const DIRECOES = {
    O: { dc: -1, dl: 0, oposta: "L" },
    L: { dc: 1, dl: 0, oposta: "O" },
    N: { dc: 0, dl: -1, oposta: "S" },
    S: { dc: 0, dl: 1, oposta: "N" }
};


// ============================================================
// 2. OS MÓDULOS
// ============================================================
/*
  As salas não são inventadas pelo computador: são MÓDULOS desenhados à
  mão, como a sala dos passos anteriores. O gerador só escolhe QUAL módulo
  vai em cada célula e o CONECTA aos vizinhos. O GDD é explícito: "as salas
  devem ser selecionadas de um conjunto de módulos projetados manualmente,
  conectados por regras de compatibilidade" (seção 13). Gerar cada
  plataforma ao acaso daria salas impossíveis.

  Cada módulo diz quais ABERTURAS ele aceita. Todas nascem fechadas (as
  bordas são parede); o gerador abre só as que a sala usa:

      O, L   as portas laterais: linhas 13 a 15, com o chão na 16;
      N      o teto, colunas 14 a 17;
      S      o piso, colunas 14 a 17 — vira uma GRADE de mão única, por
             onde se desce com ↓ + pular e se sobe pulando por baixo.

  As REGRAS DE QUEM DESENHA MÓDULOS (conferidas em conferirModulos):

  - perto de cada abertura aceita, só ar — senão a porta abre para uma
    parede;
  - nenhum degrau com mais de 3 blocos, como no passo 3;
  - uma abertura N precisa de algo para pisar logo abaixo (a linha 4), de
    onde se pula para fora — e onde se cai, vindo de cima;
  - os marcadores ficam em cima de chão.

  Os marcadores:

      @   onde o soldado pousa (só no pouso)
      *   um lugar onde PODE nascer uma criatura
      +   um lugar onde PODE aparecer um item

  "Pode": quem decide é o sorteio, e a mesma sala, em duas expedições,
  tem populações diferentes.
*/
const MODULOS = {
    pouso: {
        aberturas: "OLNS",
        linhas: [
            "################################",
            "#..............................#",
            "#..............................#",
            "#..............................#",
            "#...........--------...........#",
            "#..............................#",
            "#..............................#",
            "#.......------.................#",
            "#..............................#",
            "#..............................#",
            "#...-----......................#",
            "#.......................==.....#",
            "#.....................======...#",
            "#..........----......========..#",
            "#.....................======...#",
            "#....@..............=......=...#",
            "################################",
            "################################"
        ]
    },
    corredor: {
        aberturas: "OL",
        linhas: [
            "################################",
            "################################",
            "################################",
            "################################",
            "################################",
            "######....................######",
            "####........................####",
            "###..........................###",
            "##............................##",
            "##.....*...........*..........##",
            "#....######......#######......##",
            "#..............................#",
            "#..............................#",
            "#.........###.........###......#",
            "#.........###.........###......#",
            "#....*....###......+..###...*..#",
            "################################",
            "################################"
        ]
    },
    salao: {
        aberturas: "OLNS",
        linhas: [
            "################################",
            "#..............................#",
            "#..............................#",
            "#..............+...............#",
            "#...........--------...........#",
            "#..............................#",
            "#.......................*......#",
            "#.......-----........-----.....#",
            "#..............................#",
            "#.....*........................#",
            "#...-----..............-----...#",
            "#..............................#",
            "#..............................#",
            "#.........-----....-----.......#",
            "#..............................#",
            "#....*....................*....#",
            "################################",
            "################################"
        ]
    },
    poco: {
        aberturas: "OLNS",
        linhas: [
            "################################",
            "#########..............#########",
            "#########..............#########",
            "#########..............#########",
            "#########...--------...#########",
            "#########..............#########",
            "#########..............#########",
            "#########.......-----..#########",
            "#########..............#########",
            "#########..............#########",
            "#########...-----......#########",
            "#########..............#########",
            "#########.............+#########",
            "#........----.......----.......#",
            "#..............................#",
            "#...*......................*...#",
            "################################",
            "################################"
        ]
    },
    galeria: {
        aberturas: "OLS",
        linhas: [
            "################################",
            "################################",
            "################################",
            "####......................######",
            "###...+.*...........*.......####",
            "##..#########----#########....##",
            "#..............................#",
            "#..............................#",
            "#..........------..............#",
            "#..............................#",
            "#............------............#",
            "#..............................#",
            "#..............................#",
            "#........----......----........#",
            "#..............................#",
            "#.....*................*.......#",
            "################################",
            "################################"
        ]
    },
    camara: {
        aberturas: "OL",
        linhas: [
            "################################",
            "################################",
            "####.......................#####",
            "###.........................####",
            "##...........................###",
            "#.......*............*.........#",
            "#.....######......######.......#",
            "#..............................#",
            "#.............----.............#",
            "#..............................#",
            "#...............+..............#",
            "#..........--------............#",
            "#..............................#",
            "#.....###..............###.....#",
            "#.....###..............###.....#",
            "#..*..###.......*......###..*..#",
            "################################",
            "################################"
        ]
    },
    /*
      O COVIL: uma arena. Chão largo e plano para correr e esquivar, três
      níveis de plataforma de grade para fugir das investidas, e nenhum "*":
      quem põe criaturas aqui é a própria Matriarca.
    */
    covil: {
        aberturas: "OL",
        linhas: [
            "################################",
            "################################",
            "###..........................###",
            "##............................##",
            "#..............................#",
            "#..............................#",
            "#..............................#",
            "#....------..........------....#",
            "#..............................#",
            "#..............................#",
            "#..........----------..........#",
            "#..............................#",
            "#..............................#",
            "#.....----............----.....#",
            "#..............................#",
            "#..............................#",
            "################################",
            "################################"
        ]
    },
    torre: {
        aberturas: "OLN",
        linhas: [
            "################################",
            "#..............................#",
            "#..............................#",
            "#..............................#",
            "#...........--------...........#",
            "#..............................#",
            "#..............................#",
            "#...............------.........#",
            "#..............................#",
            "#...........*..................#",
            "#.........------...............#",
            "#..............................#",
            "#...................*..........#",
            "#...............######.........#",
            "#...............######.........#",
            "#..+...*........######....*....#",
            "################################",
            "################################"
        ]
    }
};

const COLUNAS_DA_SALA = 32;
const LINHAS_DA_SALA = 18;
const CARACTERES_DE_BLOCO = "#=-.~";
const CARACTERES_DE_MARCADOR = "@*+";

/*
  CONFIRA OS DADOS ANTES DE USAR, agora com as regras de quem desenha
  módulos. Um módulo novo com uma porta tapada não dá erro: dá uma sala
  onde o soldado fica preso — numa expedição em cada vinte. Conferir uma
  vez, no carregamento, transforma esse bug raro numa mensagem imediata.
*/
function conferirModulos() {
    const problemas = [];

    for (const [nome, modulo] of Object.entries(MODULOS)) {
        const linhas = modulo.linhas;
        const ar = (coluna, linha) => !"#=".includes(linhas[linha][coluna]);

        if (linhas.length !== LINHAS_DA_SALA || linhas.some(linha => linha.length !== COLUNAS_DA_SALA)) {
            problemas.push(`Módulo "${nome}": precisa ter ${LINHAS_DA_SALA} linhas de ${COLUNAS_DA_SALA} caracteres.`);
            continue;
        }

        linhas.forEach((linha, l) => {
            for (const caractere of linha) {
                if (!CARACTERES_DE_BLOCO.includes(caractere) && !CARACTERES_DE_MARCADOR.includes(caractere)) {
                    problemas.push(`Módulo "${nome}", linha ${l}: caractere desconhecido "${caractere}".`);
                }
            }
        });

        const livre = (nomeDaAbertura, celulas) => {
            if (modulo.aberturas.includes(nomeDaAbertura) && celulas.some(([c, l]) => !ar(c, l))) {
                problemas.push(`Módulo "${nome}": a abertura ${nomeDaAbertura} está tapada.`);
            }
        };
        livre("O", [[1, 13], [1, 14], [1, 15], [2, 13], [2, 14], [2, 15]]);
        livre("L", [[29, 13], [29, 14], [29, 15], [30, 13], [30, 14], [30, 15]]);
        livre("N", [[14, 1], [15, 1], [16, 1], [17, 1], [14, 2], [15, 2], [16, 2], [17, 2]]);
        livre("S", [[14, 13], [15, 13], [16, 13], [17, 13], [14, 15], [15, 15], [16, 15], [17, 15]]);
    }

    return problemas;
}


// ============================================================
// 3. SORTE COM SEMENTE
// ============================================================
/*
  Math.random() não serve para gerar o mundo: ele não aceita semente, e
  cada chamada dá um número que ninguém consegue repetir. Aqui entra um
  GERADOR PSEUDOALEATÓRIO: uma conta que, a partir de um número inicial
  (a semente), produz uma sequência que PARECE aleatória — mas que é
  sempre a mesma para a mesma semente.

  O texto vira número com um HASH (FNV-1a): mistura os códigos das letras
  de um jeito que textos parecidos ("XENO1" e "XENO2") dão números muito
  diferentes.

  Math.imul multiplica como um processador de 32 bits; ">>> 0" mantém o
  resultado como inteiro sem sinal. As constantes são as do algoritmo — não
  há nada a entender nelas além de "foram escolhidas porque misturam bem".
*/
function hashDeTexto(texto) {
    let hash = 2166136261;

    for (const caractere of texto) {
        hash ^= caractere.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

/*
  O mulberry32: uma função que guarda um número e, a cada chamada, o
  embaralha e devolve um decimal entre 0 e 1 — como Math.random(), mas
  repetível. O estado mora numa CLAUSURA: a função devolvida lembra do
  `estado` mesmo depois de criarSorteador ter terminado.
*/
function criarSorteador(numero) {
    let estado = numero >>> 0;

    return function sortear() {
        estado = (estado + 0x6D2B79F5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/*
  FLUXOS INDEPENDENTES (GDD, seção 13).

  Se o mapa, as criaturas e os itens tirassem números do MESMO sorteador,
  acrescentar um item a uma sala consumiria um número a mais — e todas as
  criaturas sorteadas depois mudariam. Mexer num sistema bagunçaria os
  outros.

  Por isso cada sistema tem o seu fluxo, nascido da semente junto com o
  NOME do sistema: "XENO:mapa", "XENO:criaturas", "XENO:itens". Mudar a
  chance dos itens não move nenhuma criatura nem nenhuma sala.
*/
function criarFluxo(semente, nomeDoSistema) {
    return criarSorteador(hashDeTexto(`${semente}:${nomeDoSistema}`));
}

// As três perguntas que todo sorteio faz, sempre por cima de um sorteador.
function escolher(sortear, lista) {
    return lista[Math.floor(sortear() * lista.length)];
}

function escolherPonderado(sortear, pesos) {
    const total = Object.values(pesos).reduce((soma, peso) => soma + peso, 0);
    let sorteado = sortear() * total;

    for (const [opcao, peso] of Object.entries(pesos)) {
        sorteado -= peso;
        if (sorteado < 0) {
            return opcao;
        }
    }
    return Object.keys(pesos)[0];
}

/*
  Uma semente nova, para quem não digitou nenhuma. É o ÚNICO lugar do
  gerador onde Math.random aparece: ele escolhe a semente, e a partir dela
  tudo é repetível. Letras e números sem os que se confundem (0 e O, 1 e I).
*/
function sortearSemente() {
    const simbolos = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let semente = "";

    for (let i = 0; i < 6; i++) {
        semente += simbolos[Math.floor(Math.random() * simbolos.length)];
    }
    return semente;
}


// ============================================================
// 4. GERAR O MUNDO
// ============================================================
function chave(coluna, linha) {
    return `${coluna},${linha}`;
}

/*
  GERAR E CONFERIR. Cada tentativa gera um mundo inteiro; o validador o
  examina; se houver problemas, a tentativa é descartada e a próxima usa a
  semente derivada "XENO#1", depois "XENO#2"... A sequência de tentativas
  é tão repetível quanto a semente: quem digitar XENO sempre recebe o
  mesmo mundo aprovado — e o mesmo histórico de rejeitados.

  O GDD manda exatamente isso (seção 13): "Caso uma geração falhe na
  validação, descarte-a e gere outra utilizando uma seed alternativa."
*/
const MAXIMO_DE_TENTATIVAS = 50;

function gerarMundo(semente) {
    const rejeitados = [];

    for (let tentativa = 0; tentativa < MAXIMO_DE_TENTATIVAS; tentativa++) {
        const sementeDaTentativa = tentativa === 0 ? semente : `${semente}#${tentativa}`;
        const mundo = gerarTentativa(sementeDaTentativa);
        const problemas = validarMundo(mundo);

        if (problemas.length === 0) {
            mundo.semente = semente;
            mundo.sementeUsada = sementeDaTentativa;
            mundo.rejeitados = rejeitados;
            return mundo;
        }
        rejeitados.push({ semente: sementeDaTentativa, problemas });
    }

    throw new Error(`Nenhum mundo válido em ${MAXIMO_DE_TENTATIVAS} tentativas para a semente "${semente}".`);
}

function gerarTentativa(semente) {
    const mundo = { semente, salas: new Map() };

    criarEsqueleto(mundo, criarFluxo(semente, "mapa"));
    medirDistancias(mundo);
    escolherCovil(mundo);
    escolherModulos(mundo, criarFluxo(semente, "salas"));
    povoar(mundo, criarFluxo(semente, "criaturas"), criarFluxo(semente, "itens"));
    distribuirChavesEPortas(mundo, criarFluxo(semente, "progressao"));

    return mundo;
}

// ---------- 4.1 O esqueleto ----------
/*
  O esqueleto cresce como uma mancha: começa no pouso e, a cada passo,
  sorteia uma célula vazia VIZINHA de alguma sala da mesma região, abre-a e
  a liga a essa sala. Como toda sala nova nasce ligada a uma antiga, o
  resultado é sempre CONEXO: não existem salas isoladas, e de qualquer
  sala se chega a qualquer outra. A estrutura interligada que o GDD exige
  vem da forma do algoritmo, não de sorte.

  O complexo cresce até ter as suas salas E tocar a sua última coluna —
  senão não haveria por onde passar para a floresta. Então uma passagem é
  aberta para o leste, e a floresta cresce a partir dela.

  Por fim, os ATALHOS: salas vizinhas da mesma região que ainda não se
  ligam ganham, às vezes, uma ligação. Com eles o mapa deixa de ser uma
  árvore — passam a existir voltas, e caminhos curtos para regiões já
  exploradas (GDD, seção 2).
*/
function criarEsqueleto(mundo, sortear) {
    abrirSala(mundo, POUSO.coluna, POUSO.linha, "complexo");
    crescerRegiao(mundo, "complexo", sortear);

    const ultimaColuna = REGIOES.complexo.colunas[1];
    const naFronteira = salasDaRegiao(mundo, "complexo").filter(sala => sala.coluna === ultimaColuna);
    const deOnde = escolher(sortear, naFronteira);
    const entrada = abrirSala(mundo, deOnde.coluna + 1, deOnde.linha, "floresta");
    ligar(deOnde, entrada, "L");
    crescerRegiao(mundo, "floresta", sortear);

    criarAtalhos(mundo, sortear);
}

function abrirSala(mundo, coluna, linha, regiao) {
    const sala = {
        coluna,
        linha,
        regiao,
        portas: { O: false, L: false, N: false, S: false },
        membranas: [],     // as portas desta sala tapadas por uma membrana (seção 4.5)
        covil: false,      // a sala da Matriarca (seção 4.2)
        distancia: Infinity,
        modulo: null,
        criaturas: [],
        itens: []
    };
    mundo.salas.set(chave(coluna, linha), sala);
    return sala;
}

function ligar(sala, vizinha, direcao) {
    sala.portas[direcao] = true;
    vizinha.portas[DIRECOES[direcao].oposta] = true;
}

function vizinha(mundo, sala, direcao) {
    const passo = DIRECOES[direcao];
    return mundo.salas.get(chave(sala.coluna + passo.dc, sala.linha + passo.dl));
}

function ehPouso(sala) {
    return sala.coluna === POUSO.coluna && sala.linha === POUSO.linha;
}

function salasDaRegiao(mundo, regiao) {
    return [...mundo.salas.values()].filter(sala => sala.regiao === regiao);
}

function crescerRegiao(mundo, nomeDaRegiao, sortear) {
    const regiao = REGIOES[nomeDaRegiao];
    const tocaOFim = () => salasDaRegiao(mundo, nomeDaRegiao).some(sala => sala.coluna === regiao.colunas[1]);

    while (salasDaRegiao(mundo, nomeDaRegiao).length < regiao.salas || (nomeDaRegiao === "complexo" && !tocaOFim())) {
        const candidatas = fronteiraDaRegiao(mundo, nomeDaRegiao);

        if (candidatas.length === 0) {
            return;   // a região encheu: não há mais onde crescer
        }

        const { sala, direcao } = escolher(sortear, candidatas);
        const passo = DIRECOES[direcao];
        const nova = abrirSala(mundo, sala.coluna + passo.dc, sala.linha + passo.dl, nomeDaRegiao);
        ligar(sala, nova, direcao);
    }
}

/*
  Todas as maneiras de crescer: cada par (sala da região, direção) que dá
  numa célula vazia, dentro da grade e dentro das colunas da região.
*/
function fronteiraDaRegiao(mundo, nomeDaRegiao) {
    const [primeira, ultima] = REGIOES[nomeDaRegiao].colunas;
    const candidatas = [];

    for (const sala of salasDaRegiao(mundo, nomeDaRegiao)) {
        for (const [direcao, passo] of Object.entries(DIRECOES)) {
            const coluna = sala.coluna + passo.dc;
            const linha = sala.linha + passo.dl;
            const dentro = coluna >= primeira && coluna <= ultima && linha >= 0 && linha < MAPA.linhas;

            if (dentro && !mundo.salas.has(chave(coluna, linha))) {
                candidatas.push({ sala, direcao });
            }
        }
    }
    return candidatas;
}

function criarAtalhos(mundo, sortear) {
    for (const sala of mundo.salas.values()) {
        for (const direcao of ["L", "S"]) {   // cada par de vizinhas é visto uma vez só
            const passo = DIRECOES[direcao];
            const vizinha = mundo.salas.get(chave(sala.coluna + passo.dc, sala.linha + passo.dl));

            if (vizinha && vizinha.regiao === sala.regiao && !sala.portas[direcao]
                && sortear() < POPULACAO.chanceDeAtalho) {
                ligar(sala, vizinha, direcao);
            }
        }
    }
}

/*
  A DISTÂNCIA de cada sala até o pouso, contada em portas: a busca em
  largura dos olhos do Pac-Man, agora sobre salas. Serve para a população
  (mais perigo mais longe) e, no passo 7, para validar o mapa.
*/
function medirDistancias(mundo) {
    const pouso = mundo.salas.get(chave(POUSO.coluna, POUSO.linha));
    pouso.distancia = 0;
    const fila = [pouso];

    while (fila.length > 0) {
        const atual = fila.shift();

        for (const [direcao, passo] of Object.entries(DIRECOES)) {
            if (!atual.portas[direcao]) {
                continue;
            }
            const vizinha = mundo.salas.get(chave(atual.coluna + passo.dc, atual.linha + passo.dl));
            if (vizinha.distancia === Infinity) {
                vizinha.distancia = atual.distancia + 1;
                fila.push(vizinha);
            }
        }
    }
}

// ---------- 4.2 O covil e os módulos ----------
/*
  O COVIL é a sala sem saída da floresta MAIS DISTANTE do pouso — e "sem
  saída" de lado: o módulo do covil só aceita portas O e L, porque uma
  arena com um buraco no chão seria uma arena sem chão.

  Nenhuma regra garante que essa sala exista. Às vezes a floresta cresce
  sem nenhuma sala assim; então mundo.salas não tem covil, e o validador
  rejeita o mundo (seção 5). Mais uma vez: gerar simples, conferir depois.
*/
function escolherCovil(mundo) {
    const candidatas = salasDaRegiao(mundo, "floresta").filter(sala => {
        const portas = Object.keys(sala.portas).filter(direcao => sala.portas[direcao]);
        return portas.length === 1 && (portas[0] === "O" || portas[0] === "L");
    });

    if (candidatas.length > 0) {
        candidatas.reduce((maior, sala) => sala.distancia > maior.distancia ? sala : maior).covil = true;
    }
}

/*
  COMPATIBILIDADE: um módulo serve para uma sala se aceitar TODAS as
  portas que ela usa. Um corredor (OL) não serve para uma sala com porta
  no teto; um salão (OLNS) serve para qualquer uma. Entre os que servem, o
  sorteio escolhe.

  O pouso e o covil não entram no sorteio: cada um tem a sua sala.
*/
function escolherModulos(mundo, sortear) {
    const sorteaveis = Object.keys(MODULOS).filter(nome => nome !== POUSO.modulo && nome !== "covil");

    for (const sala of mundo.salas.values()) {
        if (sala.coluna === POUSO.coluna && sala.linha === POUSO.linha) {
            sala.modulo = POUSO.modulo;
            continue;
        }
        if (sala.covil) {
            sala.modulo = "covil";
            continue;
        }

        const usadas = Object.keys(sala.portas).filter(direcao => sala.portas[direcao]);
        const servem = sorteaveis.filter(nome => usadas.every(direcao => MODULOS[nome].aberturas.includes(direcao)));
        sala.modulo = escolher(sortear, servem);
    }
}

// ---------- 4.3 A população ----------
/*
  Cada "*" do módulo é um lugar onde PODE nascer uma criatura; o sorteio
  decide se nasce e qual espécie, pelos pesos da região. Cada "+" pode ter
  uma cápsula de vida. O gerador só anota ONDE e O QUÊ — quem transforma a
  anotação numa criatura de verdade é o jogo.
*/
function povoar(mundo, sorteioDasCriaturas, sorteioDosItens) {
    for (const sala of mundo.salas.values()) {
        const regiao = REGIOES[sala.regiao];
        const chance = Math.min(
            POPULACAO.chanceDeCriaturaPerto + POPULACAO.chanceDeCriaturaPorSala * sala.distancia,
            POPULACAO.chanceDeCriaturaMaxima
        );

        MODULOS[sala.modulo].linhas.forEach((texto, linha) => {
            [...texto].forEach((caractere, coluna) => {
                if (caractere === "*" && !pertoDeUmaPorta(sala, coluna, linha) && sorteioDasCriaturas() < chance) {
                    let especie = escolherPonderado(sorteioDasCriaturas, regiao.criaturas);
                    if (especie === "ninho" && sala.distancia < POPULACAO.distanciaMinimaDoNinho) {
                        especie = "rastejador";
                    }
                    sala.criaturas.push({ especie, coluna, linha });
                }
                if (caractere === "+" && sorteioDosItens() < POPULACAO.chanceDeItem) {
                    sala.itens.push({ tipo: "capsula", coluna, linha });
                }
            });
        });
    }
}

/*
  O centro de cada abertura, em blocos, e a distância até ele "em linha
  reta de xadrez" (a maior das duas diferenças): um quadrado em volta da
  porta, mais simples que um círculo e igualmente justo.
*/
const CENTRO_DAS_ABERTURAS = {
    O: { coluna: 0, linha: 14 },
    L: { coluna: COLUNAS_DA_SALA - 1, linha: 14 },
    N: { coluna: 15.5, linha: 0 },
    S: { coluna: 15.5, linha: LINHAS_DA_SALA - 2 }
};

function pertoDeUmaPorta(sala, coluna, linha) {
    return Object.keys(sala.portas).some(direcao => {
        if (!sala.portas[direcao]) {
            return false;
        }
        const porta = CENTRO_DAS_ABERTURAS[direcao];
        const distancia = Math.max(Math.abs(coluna - porta.coluna), Math.abs(linha - porta.linha));
        return distancia < POPULACAO.distanciaSeguraDasPortas;
    });
}

// ---------- 4.5 As chaves e as fechaduras ----------
/*
  O QUE FAZ UM METROIDVANIA: lugares que se VEEM antes de se poder entrar
  (GDD, seção 2: "algumas áreas devem exigir habilidades específicas").
  A fechadura deste jogo é a MEMBRANA ORGÂNICA, que tapa uma porta; a
  chave é o IMPULSO CINÉTICO, que a rompe.

  - O PORTÃO: a passagem do complexo para a floresta sempre ganha uma
    membrana. Toda expedição passa por ele.
  - Os SEGREDOS: salas do complexo com uma porta só, de lado, às vezes
    ganham uma membrana nessa porta — e um tanque de vida lá dentro. O
    jogador as vê cedo e só as abre depois: o "retornar a regiões
    anteriores" do GDD.
  - A CHAVE: a cápsula do Impulso, numa sala do complexo sorteada entre as
    MAIS DISTANTES do pouso — para pedir exploração.
  - O OBJETIVO: os dados da colônia. Não são mais um item do gerador: a
    Matriarca os guarda, e quem os larga é ela, ao morrer, no covil.

  A membrana fica sempre do lado de quem CHEGA: na sala de onde se vê a
  porta tapada, nunca dentro da sala que ela guarda.

  E repare: o sorteio da chave NÃO olha para as membranas. Às vezes ela
  cai justamente numa sala secreta — atrás da fechadura que só ela abre.
  O gerador não evita esse erro: o validador o encontra (seção 5), e o
  mundo é descartado. Gerar simples e conferir depois costuma dar menos
  código, e menos bugs, que tentar acertar de primeira.
*/
function distribuirChavesEPortas(mundo, sortear) {
    const complexo = salasDaRegiao(mundo, "complexo").filter(sala => !ehPouso(sala));

    const portao = complexo.find(sala => sala.portas.L && vizinha(mundo, sala, "L").regiao === "floresta");
    portao.membranas.push("L");

    for (const sala of complexo) {
        const portas = Object.keys(sala.portas).filter(direcao => sala.portas[direcao]);
        const deLado = portas.length === 1 && (portas[0] === "O" || portas[0] === "L");

        if (deLado && sortear() < POPULACAO.chanceDeSegredo) {
            vizinha(mundo, sala, portas[0]).membranas.push(DIRECOES[portas[0]].oposta);
            sala.segredo = true;
            colocarItem(sala, "tanque", sortear);
        }
    }

    const maisDistantesPrimeiro = [...complexo].sort((a, b) => b.distancia - a.distancia);
    const metadeMaisDistante = maisDistantesPrimeiro.slice(0, Math.ceil(maisDistantesPrimeiro.length / 2));
    colocarItem(escolher(sortear, metadeMaisDistante), "impulso", sortear);
}

function salaDoCovil(mundo) {
    return [...mundo.salas.values()].find(sala => sala.covil);
}

/*
  Um item especial vai num dos "+" do módulo — lugares que o desenho do
  módulo já garante alcançáveis. Se já havia uma cápsula ali, ela sai.
*/
function colocarItem(sala, tipo, sortear) {
    const lugares = [];

    MODULOS[sala.modulo].linhas.forEach((texto, linha) => {
        [...texto].forEach((caractere, coluna) => {
            if (caractere === "+") {
                lugares.push({ coluna, linha });
            }
        });
    });

    const lugar = escolher(sortear, lugares);
    sala.itens = sala.itens.filter(item => item.coluna !== lugar.coluna || item.linha !== lugar.linha);
    sala.itens.push({ tipo, coluna: lugar.coluna, linha: lugar.linha });
}

function salaComItem(mundo, tipo) {
    return [...mundo.salas.values()].find(sala => sala.itens.some(item => item.tipo === tipo));
}

// ---------- 4.6 Os blocos de uma sala ----------
/*
  Do módulo e das portas, a matriz de blocos que o jogo usa: as aberturas
  usadas são escavadas nas bordas (ou tapadas por membrana), e os
  marcadores viram ar.
*/
function construirBlocos(sala) {
    const blocos = MODULOS[sala.modulo].linhas.map(linha =>
        [...linha].map(caractere => CARACTERES_DE_MARCADOR.includes(caractere) ? "." : caractere)
    );

    if (sala.portas.O) [13, 14, 15].forEach(linha => { blocos[linha][0] = sala.membranas.includes("O") ? "~" : "."; });
    if (sala.portas.L) [13, 14, 15].forEach(linha => { blocos[linha][COLUNAS_DA_SALA - 1] = sala.membranas.includes("L") ? "~" : "."; });
    for (let coluna = 14; coluna <= 17; coluna++) {
        if (sala.portas.N) blocos[0][coluna] = ".";
        if (sala.portas.S) {
            blocos[LINHAS_DA_SALA - 2][coluna] = "-";
            blocos[LINHAS_DA_SALA - 1][coluna] = ".";
        }
    }

    return blocos;
}

function encontrarMarcador(nomeDoModulo, marcador) {
    const linhas = MODULOS[nomeDoModulo].linhas;
    const linha = linhas.findIndex(texto => texto.includes(marcador));
    return { coluna: linhas[linha].indexOf(marcador), linha };
}


// ============================================================
// 5. VALIDAR O MUNDO
// ============================================================
/*
  O VALIDADOR responde, para um mundo pronto, as perguntas da lista da
  seção 13 do GDD:

  - as habilidades necessárias podem ser obtidas ANTES de serem exigidas?
  - o chefe pode ser alcançado? o covil existe, e fica fundo o bastante?
  - existe uma rota de progressão válida até o objetivo?
  - alguma sala ficou para sempre inalcançável (uma porta obrigatória
    permanentemente bloqueada)?
  - os pontos de surgimento são seguros?

  A ferramenta é uma só — a busca em largura do Pac-Man, sobre salas —
  feita duas vezes: uma fingindo que o soldado NÃO tem o Impulso, outra
  fingindo que tem. A diferença entre as duas respostas é tudo o que a
  habilidade abre.

  O que este validador NÃO confere é se cada módulo, por dentro, deixa
  ir de uma porta à outra: isso é responsabilidade de quem desenha
  módulos, e foi conferido uma vez, com a física do jogo, antes de os
  módulos entrarem aqui (veja o GUIA).
*/
function validarMundo(mundo) {
    const problemas = [];
    const pouso = mundo.salas.get(chave(POUSO.coluna, POUSO.linha));
    const semImpulso = salasAlcancaveis(mundo, pouso, false);
    const comImpulso = salasAlcancaveis(mundo, pouso, true);
    const salaDaChave = salaComItem(mundo, "impulso");
    const salaDoObjetivo = salaDoCovil(mundo);
    const nome = sala => chave(sala.coluna, sala.linha);

    if (!salaDoObjetivo) {
        return ["A floresta não tem uma sala sem saída, de lado, para o covil da Matriarca."];
    }

    const entradaDaFloresta = salasDaRegiao(mundo, "floresta").reduce((menor, sala) => sala.distancia < menor.distancia ? sala : menor);
    if (salaDoObjetivo.distancia - entradaDaFloresta.distancia < POPULACAO.profundidadeDoCovil) {
        problemas.push(`O covil (sala ${nome(salaDoObjetivo)}) fica logo na entrada da floresta: a região ficaria sem caminho.`);
    }

    if (!semImpulso.has(salaDaChave)) {
        problemas.push(`O Impulso Cinético (sala ${nome(salaDaChave)}) está atrás de uma membrana: seria exigido antes de ser obtido.`);
    }
    if (semImpulso.has(salaDoObjetivo)) {
        problemas.push("O objetivo pode ser alcançado sem o Impulso Cinético: o portão não guarda nada.");
    }
    if (!comImpulso.has(salaDoObjetivo)) {
        problemas.push("O objetivo é inalcançável, mesmo com o Impulso Cinético.");
    }

    for (const sala of mundo.salas.values()) {
        if (!comImpulso.has(sala)) {
            problemas.push(`A sala ${nome(sala)} nunca pode ser alcançada.`);
        }
        if (ehPouso(sala) && sala.criaturas.length > 0) {
            problemas.push("Há criaturas no pouso.");
        }
        sala.criaturas.forEach(criatura => {
            if (pertoDeUmaPorta(sala, criatura.coluna, criatura.linha)) {
                problemas.push(`Uma criatura nasce colada numa porta da sala ${nome(sala)}.`);
            }
        });
    }

    return problemas;
}

/*
  Atravessar uma porta exige o Impulso se houver membrana de QUALQUER um
  dos dois lados dela.
*/
function salasAlcancaveis(mundo, inicio, temImpulso) {
    const alcancadas = new Set([inicio]);
    const fila = [inicio];

    while (fila.length > 0) {
        const atual = fila.shift();

        for (const direcao of Object.keys(DIRECOES)) {
            if (!atual.portas[direcao]) {
                continue;
            }

            const proxima = vizinha(mundo, atual, direcao);
            const temMembrana = atual.membranas.includes(direcao) || proxima.membranas.includes(DIRECOES[direcao].oposta);

            if ((temImpulso || !temMembrana) && !alcancadas.has(proxima)) {
                alcancadas.add(proxima);
                fila.push(proxima);
            }
        }
    }
    return alcancadas;
}

/*
  A ROTA DE PROGRESSÃO, para a depuração: o caminho mais curto entre duas
  salas, guardando de onde cada sala foi alcançada e voltando do fim para
  o começo. A mesma busca, com uma lembrança a mais.
*/
function caminhoEntre(mundo, inicio, fim, temImpulso) {
    const deOnde = new Map([[inicio, null]]);
    const fila = [inicio];

    while (fila.length > 0) {
        const atual = fila.shift();

        if (atual === fim) {
            break;
        }

        for (const direcao of Object.keys(DIRECOES)) {
            if (!atual.portas[direcao]) {
                continue;
            }
            const proxima = vizinha(mundo, atual, direcao);
            const temMembrana = atual.membranas.includes(direcao) || proxima.membranas.includes(DIRECOES[direcao].oposta);

            if ((temImpulso || !temMembrana) && !deOnde.has(proxima)) {
                deOnde.set(proxima, atual);
                fila.push(proxima);
            }
        }
    }

    const caminho = [];
    for (let sala = fim; sala !== null && sala !== undefined; sala = deOnde.get(sala)) {
        caminho.unshift(sala);
    }
    return caminho;
}
