/*
  ============================================================
  XENOMORPH — O GERADOR
  ============================================================

  Recebe uma semente e devolve um MUNDO — sem saber que existe tela,
  teclado ou soldado. Gera em camadas (esqueleto, módulos, população,
  chaves e fechaduras, eventos), cada uma com o seu fluxo; depois o
  VALIDADOR confere o mundo e, se ele for impossível, o descarta e tenta
  a semente derivada seguinte (GDD, seção 13).
*/


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
// 1. GERAR O MUNDO
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
    distribuirEventos(mundo, criarFluxo(semente, "eventos"));

    return mundo;
}

// ---------- 1.1 O esqueleto ----------
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
        membranas: [],     // as portas desta sala tapadas por uma membrana (1.4)
        covil: false,      // a sala da Matriarca (1.2)
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

// ---------- 1.2 O covil e os módulos ----------
/*
  O COVIL é a sala sem saída da floresta MAIS DISTANTE do pouso — e "sem
  saída" de lado: o módulo do covil só aceita portas O e L, porque uma
  arena com um buraco no chão seria uma arena sem chão.

  Nenhuma regra garante que essa sala exista. Às vezes a floresta cresce
  sem nenhuma sala assim; então mundo.salas não tem covil, e o validador
  rejeita o mundo (seção 2 deste arquivo). Mais uma vez: gerar simples, conferir depois.
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

// ---------- 1.3 A população ----------
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
                    sala.itens.push(sortearItem(sorteioDosItens, coluna, linha));
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

/*
  UM ITEM SORTEADO: quase sempre uma cápsula de vida; às vezes um MÓDULO
  DE ARMA. O módulo é sorteado em dois tempos — primeiro a RARIDADE, pelos
  pesos da tabela; depois, qual dos módulos daquela raridade. Assim o peso
  de uma raridade não depende de quantos módulos ela tem.
*/
function sortearItem(sortear, coluna, linha) {
    if (sortear() >= POPULACAO.chanceDeModulo) {
        return { tipo: "capsula", coluna, linha };
    }

    const pesos = Object.fromEntries(Object.entries(RARIDADES).map(([nome, raridade]) => [nome, raridade.peso]));
    const raridade = escolherPonderado(sortear, pesos);
    const daRaridade = Object.keys(MODIFICACOES).filter(nome => MODIFICACOES[nome].raridade === raridade);
    return { tipo: "modulo", modificacao: escolher(sortear, daRaridade), coluna, linha };
}

// ---------- 1.4 As chaves e as fechaduras ----------
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
  O gerador não evita esse erro: o validador o encontra (seção 2 deste arquivo), e o
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

/*
  OS EVENTOS (GDD, seção 8): uma estação médica em cada região e alguns
  terminais, em salas sorteadas — nunca no pouso, no covil, ou numa sala
  que já guarda algo especial (o Impulso, um tanque). Um fluxo próprio:
  acrescentar eventos não muda nada do que já era sorteado.
*/
function distribuirEventos(mundo, sortear) {
    const livre = sala => !ehPouso(sala) && !sala.covil
        && !sala.itens.some(item => item.tipo === "impulso" || item.tipo === "tanque" || item.tipo === "estacao" || item.tipo === "terminal");

    for (const regiao of Object.keys(REGIOES)) {
        for (let i = 0; i < POPULACAO.estacoesPorRegiao; i++) {
            const candidatas = salasDaRegiao(mundo, regiao).filter(livre);
            if (candidatas.length > 0) {
                colocarItem(escolher(sortear, candidatas), "estacao", sortear);
            }
        }
    }

    for (let i = 0; i < POPULACAO.terminais; i++) {
        const candidatas = [...mundo.salas.values()].filter(livre);
        if (candidatas.length > 0) {
            colocarItem(escolher(sortear, candidatas), "terminal", sortear);
        }
    }
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

// ---------- 1.5 Os blocos de uma sala ----------
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
// 2. VALIDAR O MUNDO
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
