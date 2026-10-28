/*
  XENOMORPH — PASSO 6: O GERADOR

  Este arquivo NÃO sabe que existe uma tela, um teclado ou um soldado.
  Ele recebe uma SEMENTE (um texto qualquer) e devolve um MUNDO: quais
  salas existem, quem se liga com quem, que módulo cada sala usa, onde
  nascem as criaturas e os itens. É uma função pura — a mesma semente dá
  sempre o mesmo mundo, em qualquer computador. É isso que o GDD chama de
  "seed reproduzível" (seções 2, 13 e 14).

  Por ser puro, ele mora num arquivo à parte, como as regras do xadrez:
  dá para testá-lo sozinho, e o jogo só precisa chamar gerarMundo().

  O caminho, em três camadas (seção 4 deste arquivo):

  1. O ESQUELETO: quais células da grade são salas e quais se ligam.
  2. AS SALAS: que módulo, feito à mão, cada célula usa — escolhido entre
     os que têm as aberturas necessárias.
  3. A POPULAÇÃO: o que aparece em cada sala.

  Cada camada sorteia com o SEU fluxo de números aleatórios.
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
        // os pesos do sorteio de cada espécie
        criaturas: { rastejador: 5, cuspidora: 3, saltador: 1 }
    },
    floresta: {
        nome: "Floresta Bioluminescente",
        colunas: [4, 7],
        salas: 8,
        criaturas: { rastejador: 2, cuspidora: 2, saltador: 5 }
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
    distanciaSeguraDasPortas: 5
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
const CARACTERES_DE_BLOCO = "#=-.";
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

function gerarMundo(semente) {
    const mundo = { semente, salas: new Map() };

    criarEsqueleto(mundo, criarFluxo(semente, "mapa"));
    medirDistancias(mundo);
    escolherModulos(mundo, criarFluxo(semente, "salas"));
    povoar(mundo, criarFluxo(semente, "criaturas"), criarFluxo(semente, "itens"));

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

// ---------- 4.2 Os módulos ----------
/*
  COMPATIBILIDADE: um módulo serve para uma sala se aceitar TODAS as
  portas que ela usa. Um corredor (OL) não serve para uma sala com porta
  no teto; um salão (OLNS) serve para qualquer uma. Entre os que servem, o
  sorteio escolhe.

  O pouso não entra no sorteio: é o único módulo com "@".
*/
function escolherModulos(mundo, sortear) {
    const sorteaveis = Object.keys(MODULOS).filter(nome => nome !== POUSO.modulo);

    for (const sala of mundo.salas.values()) {
        if (sala.coluna === POUSO.coluna && sala.linha === POUSO.linha) {
            sala.modulo = POUSO.modulo;
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
                    sala.criaturas.push({ especie: escolherPonderado(sorteioDasCriaturas, regiao.criaturas), coluna, linha });
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

// ---------- 4.4 Os blocos de uma sala ----------
/*
  Do módulo e das portas, a matriz de blocos que o jogo usa: as aberturas
  usadas são escavadas nas bordas, e os marcadores viram ar.
*/
function construirBlocos(sala) {
    const blocos = MODULOS[sala.modulo].linhas.map(linha =>
        [...linha].map(caractere => CARACTERES_DE_MARCADOR.includes(caractere) ? "." : caractere)
    );

    if (sala.portas.O) [13, 14, 15].forEach(linha => { blocos[linha][0] = "."; });
    if (sala.portas.L) [13, 14, 15].forEach(linha => { blocos[linha][COLUNAS_DA_SALA - 1] = "."; });
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
