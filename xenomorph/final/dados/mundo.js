/*
  ============================================================
  XENOMORPH — DADOS: O MUNDO
  ============================================================

  A grade do planeta, as regiões, as regras da população e os MÓDULOS
  de sala desenhados à mão. Quem quiser um planeta maior, uma região
  nova ou uma sala nova mexe aqui — o gerador (scripts/gerador.js) só
  lê estas tabelas.
*/


// ============================================================
// A GRADE E AS REGIÕES
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
    chanceDeModulo: 0.25,          // dos itens sorteados, quantos são módulos de arma em vez de cápsulas
    chanceDeAtalho: 0.2,               // ligações extras entre salas vizinhas (gerador.js)

    /*
      Nenhuma criatura nasce a menos de 5 blocos de uma porta usada: quem
      entra numa sala precisa de um instante para ver o que tem nela. É o
      "pontos de surgimento seguros" do GDD (seção 13).
    */
    distanciaSeguraDasPortas: 5,

    chanceDeSegredo: 0.5,  // uma sala sem saída do complexo vira sala secreta (gerador.js)

    distanciaMinimaDoNinho: 3,    // perto do pouso, um ninho vira um rastejador comum
    estacoesPorRegiao: 1,         // estações médicas (eventos, gerador.js)
    terminais: 3,                 // terminais com registros da colônia
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
// OS MÓDULOS
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
