/*
  ============================================================
  XENOMORPH — A MATRIARCA
  ============================================================

  O chefe: uma máquina de estados maior, fases decididas pela vida,
  ataques em ciclo, avisos, o ponto fraco que só se abre em dois estados,
  e os selos do covil.
*/


// ============================================================
// A MATRIARCA
// ============================================================
/*
  O chefe NÃO mora na lista de criaturas (a lição do Shoot 'em up): é um
  só, com regras que nenhum outro tem. Mora no estado do covil, e por isso
  continua lá — dormindo, ferida ou morta — se o soldado sair e voltar.

  A MÁQUINA DE ESTADOS DELA:

      dormindo → despertando → andando → aviso → (ataque) → andando ...
                                                  ↘ investida → atordoada ↗
      ... → morrendo → (some, e larga os dados)

  Cada ataque é um estado. O `aviso` sabe qual ataque vem depois dele
  (`proximoAtaque`) e o anuncia do seu jeito: o saco acende para os ovos e
  o cuspe, os olhos piscam para a investida, marcas aparecem no teto para
  a chuva.
*/
function criarMatriarca() {
    return {
        x: tela.width / 2 - MATRIARCA.largura / 2,
        y: 16 * TAMANHO_DO_BLOCO - MATRIARCA.altura,
        largura: MATRIARCA.largura,
        altura: MATRIARCA.altura,
        vx: 0,
        vy: 0,
        noChao: false,
        bateuNaParede: false,
        atravessando: 0,
        olhandoPara: -1,

        vida: MATRIARCA.vida,
        estado: "dormindo",
        tempoNoEstado: 0,
        fase: 0,
        indiceDoAtaque: 0,
        proximoAtaque: null,
        esperaAteAtacar: 0,
        exposta: false,
        piscando: 0,
        alvosDaChuva: [],
        ovosPostos: 0,          // quantos ovos já saíram no ataque atual
        cuspiu: false           // se o cuspe do ataque atual já saiu
    };
}

const ESTADOS_DA_MATRIARCA = {
    dormindo: matriarcaDorme,
    despertando: matriarcaDesperta,
    andando: matriarcaAnda,
    aviso: matriarcaAvisa,
    ovos: matriarcaPoeOvos,
    cuspe: matriarcaCospe,
    investida: matriarcaInveste,
    atordoada: matriarcaSeRecupera,
    chuva: matriarcaFazChover,
    morrendo: matriarcaMorre
};

function atualizarMatriarca(tempo) {
    if (matriarca === null || matriarca.estado === "morta") {
        return;
    }

    matriarca.tempoNoEstado += tempo;
    matriarca.piscando = Math.max(0, matriarca.piscando - tempo);

    ESTADOS_DA_MATRIARCA[matriarca.estado](tempo);

    cair(matriarca, tempo, FISICA.gravidade);
    moverComColisao(matriarca, tempo);
    prenderNaSala(matriarca);
}

/*
  Trocar de estado zera o relógio do estado e os contadores de cada
  ataque — e decide se o saco de ovos está aberto: o ponto fraco exposto
  é uma CONSEQUÊNCIA do estado, nunca um campo que alguém precisa lembrar
  de ligar e desligar.
*/
/*
  A lista de ataques de uma fase: a da tabela, mais os aprendidos com as
  vitórias da campanha.
*/
function ataquesDaFase(indice) {
    const aprendidos = ATAQUES_APRENDIDOS
        .slice(0, campanha.estatisticas.vitorias)
        .filter(aprendido => aprendido.fase === indice)
        .map(aprendido => aprendido.ataque);

    return [...MATRIARCA.fases[indice].ataques, ...aprendidos];
}

function mudarEstadoDaMatriarca(novoEstado) {
    matriarca.estado = novoEstado;
    matriarca.tempoNoEstado = 0;
    matriarca.ovosPostos = 0;
    matriarca.cuspiu = false;
    matriarca.exposta = novoEstado === "ovos" || novoEstado === "atordoada";
}

function faseAtual() {
    return MATRIARCA.fases[matriarca.fase];
}

/*
  Dormindo até o soldado chegar perto. Então o covil se FECHA: as portas
  viram selos, a barra de vida aparece, e não há como fugir — nem como
  voltar para buscar cápsulas no meio da luta.
*/
function matriarcaDorme() {
    matriarca.vx = 0;

    if (Math.abs(centro(soldado).x - centro(matriarca).x) < MATRIARCA.distanciaParaDespertar) {
        selarCovil(true);
        registrarNoBestiario("matriarca");
        mostrarAviso("A Matriarca despertou");
        barraDoChefe.classList.add("visivel");
        atualizarBarraDoChefe();
        tocarSom(SONS.rugido);
        tremer(4);
        mudarEstadoDaMatriarca("despertando");
    }
}

function matriarcaDesperta() {
    matriarca.olhandoPara = ladoDoSoldado(matriarca);

    if (matriarca.tempoNoEstado >= MATRIARCA.tempoDeDespertar) {
        matriarca.esperaAteAtacar = faseAtual().pausa;
        mudarEstadoDaMatriarca("andando");
    }
}

/*
  ANDANDO: vai na direção do soldado, na rapidez da fase, e conta o tempo
  até o próximo ataque. Os ataques saem da lista da fase em CICLO (o `%`
  do chefe do Shoot 'em up).
*/
function matriarcaAnda(tempo) {
    const fase = faseAtual();
    matriarca.olhandoPara = ladoDoSoldado(matriarca);
    matriarca.vx = matriarca.olhandoPara * fase.rapidez;
    matriarca.esperaAteAtacar -= tempo;

    if (matriarca.esperaAteAtacar > 0) {
        return;
    }

    const ataques = ataquesDaFase(matriarca.fase);
    matriarca.proximoAtaque = ataques[matriarca.indiceDoAtaque % ataques.length];
    matriarca.indiceDoAtaque += 1;

    if (matriarca.proximoAtaque === "chuva") {
        escolherAlvosDaChuva();
    }
    tocarSom(SONS.aviso);
    mudarEstadoDaMatriarca("aviso");
}

function matriarcaAvisa() {
    matriarca.vx = 0;
    matriarca.olhandoPara = ladoDoSoldado(matriarca);

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques[matriarca.proximoAtaque].aviso) {
        mudarEstadoDaMatriarca(matriarca.proximoAtaque);
    }
}

function voltarAAndar() {
    matriarca.esperaAteAtacar = faseAtual().pausa;
    mudarEstadoDaMatriarca("andando");
}

/*
  OVOS: o saco se abre (o ponto fraco exposto) e solta filhotes — sem
  passar do máximo de vivos. Os filhotes são rastejadores comuns, com a
  evolução da região: a mesma fábrica de todos.
*/
function matriarcaPoeOvos() {
    const ataque = MATRIARCA.ataques.ovos;
    matriarca.vx = 0;

    // Os ovos saem espaçados por igual ao longo do ataque.
    const vivos = criaturas.filter(criatura => criatura.mae === matriarca).length;
    const horaDoProximo = (matriarca.ovosPostos + 1) * ataque.duracao / (ataque.filhotes + 1);

    if (matriarca.tempoNoEstado >= horaDoProximo && matriarca.ovosPostos < ataque.filhotes && vivos < ataque.maximoDeFilhotes) {
        const atras = -matriarca.olhandoPara;
        const filhote = evoluir(criarCriatura("rastejador", { coluna: 0, linha: 0 }, matriarca.ovosPostos % 2 === 0 ? -1 : 1));
        filhote.x = centro(matriarca).x + atras * 8 - filhote.largura / 2;
        filhote.y = matriarca.y + matriarca.altura - filhote.altura;
        filhote.vx = atras * 60;
        filhote.vy = -120;
        filhote.mae = matriarca;
        comecarPerseguicao(filhote);
        criaturas.push(filhote);
        matriarca.ovosPostos += 1;
        soltarFaiscas(filhote.x, filhote.y, MATRIARCA.cores.e, 6);
    }

    if (matriarca.tempoNoEstado >= ataque.duracao) {
        voltarAAndar();
    }
}

/*
  CUSPE: três gotas com a conta do bote (passo 5), mirando nos pés do
  soldado e um pouco antes e depois dele — um leque de parábolas.
*/
function matriarcaCospe() {
    const ataque = MATRIARCA.ataques.cuspe;
    matriarca.vx = 0;

    if (matriarca.cuspiu) {
        if (matriarca.tempoNoEstado >= ataque.duracao) {
            voltarAAndar();
        }
        return;
    }

    const origem = { x: centro(matriarca).x + matriarca.olhandoPara * 8, y: matriarca.y + 2 };
    for (let i = 0; i < ataque.gotas; i++) {
        const desvio = (i - (ataque.gotas - 1) / 2) * ataque.espalhamento;
        const alvo = { x: centro(soldado).x + desvio, y: soldado.y + soldado.altura - 2 };
        acido.push({
            x: origem.x,
            y: origem.y,
            vx: (alvo.x - origem.x) / ataque.tempoDeVoo,
            vy: (alvo.y - origem.y) / ataque.tempoDeVoo - ACIDO.gravidade * ataque.tempoDeVoo / 2,
            acertou: false
        });
    }
    matriarca.cuspiu = true;
}

/*
  INVESTIDA: em linha reta, rápido, até bater na parede — e então ela
  fica TONTA, com o saco aberto. É a janela que o aviso (os olhos piscando)
  prometeu a quem pulou por cima.
*/
function matriarcaInveste() {
    matriarca.vx = matriarca.olhandoPara * MATRIARCA.ataques.investida.rapidez;

    if (matriarca.bateuNaParede) {
        soltarFaiscas(centro(matriarca).x + matriarca.olhandoPara * 11, centro(matriarca).y, "#e2e8f5", 12);
        tremer(5);
        vibrar(120);
        mudarEstadoDaMatriarca("atordoada");
    }
}

function matriarcaSeRecupera() {
    matriarca.vx = 0;

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques.investida.atordoamento) {
        voltarAAndar();
    }
}

/*
  CHUVA: gotas caem do teto onde as marcas apareceram durante o aviso. Uma
  delas sempre em cima de onde o soldado estava — as outras, espalhadas
  pelo sorteio do ecossistema.
*/
function escolherAlvosDaChuva() {
    const quantidade = MATRIARCA.ataques.chuva.gotas;
    matriarca.alvosDaChuva = [centro(soldado).x];

    for (let i = 1; i < quantidade; i++) {
        matriarca.alvosDaChuva.push(16 + ecossistema.sorteio() * (tela.width - 32));
    }
}

function matriarcaFazChover() {
    matriarca.vx = 0;

    if (matriarca.alvosDaChuva.length > 0) {
        matriarca.alvosDaChuva.forEach(x => {
            acido.push({ x, y: 3 * TAMANHO_DO_BLOCO, vx: 0, vy: 0, acertou: false });
        });
        matriarca.alvosDaChuva = [];
    }

    if (matriarca.tempoNoEstado >= MATRIARCA.ataques.chuva.duracao) {
        voltarAAndar();
    }
}

/*
  A FASE É DERIVADA DA VIDA (o chefe do Shoot 'em up): a primeira fase
  cujo limite ainda está abaixo da vida atual. Trocar de fase limpa o
  ácido da tela — um respiro — e recomeça a lista de ataques.
*/
function ferirMatriarca(dano) {
    if (matriarca.estado === "dormindo" || matriarca.estado === "morrendo") {
        return;
    }

    matriarca.vida = Math.max(0, matriarca.vida - dano);
    matriarca.piscando = 0.06;
    atualizarBarraDoChefe();

    if (matriarca.vida === 0) {
        acido = [];
        matriarca.vx = 0;
        mudarEstadoDaMatriarca("morrendo");
        return;
    }

    const fracao = matriarca.vida / MATRIARCA.vida;
    const novaFase = MATRIARCA.fases.findIndex(fase => fracao > fase.ateVida);

    if (novaFase !== matriarca.fase) {
        matriarca.fase = novaFase;
        matriarca.indiceDoAtaque = 0;
        acido = [];
        mostrarAviso(novaFase === 1 ? "A Matriarca se enfurece" : "A Matriarca está desesperada");
    }
}

/*
  Os tiros conferem a Matriarca depois das criaturas. Com o saco fechado,
  a armadura deixa passar só uma parte — e a faísca sai cinza, um "tinc"
  visual que diz ao jogador: espere a hora certa.
*/
function acertarMatriarca(tiro) {
    if (matriarca === null || matriarca.estado === "morta" || !contemPonto(matriarca, tiro.x, tiro.y)) {
        return;
    }

    tiro.acertou = true;
    const fator = matriarca.exposta ? 1 : MATRIARCA.armadura;
    ferirMatriarca(tiro.dano * fator);
    mostrarDano(tiro.x, tiro.y - 4, tiro.dano * fator);
    tocarSom(matriarca.exposta ? SONS.acerto : SONS.tiro);
    soltarFaiscas(tiro.x, tiro.y, matriarca.exposta ? MATRIARCA.cores.e : "#8a93b8", 3);
}

/*
  MORRENDO: dois segundos de estouros, e então ela some. No lugar, os
  DADOS DA COLÔNIA; as portas do covil se abrem.
*/
function matriarcaMorre() {
    matriarca.vx = 0;
    if (Math.random() < 0.5) {
        soltarFaiscas(
            matriarca.x + Math.random() * matriarca.largura,
            matriarca.y + Math.random() * matriarca.altura,
            Math.random() < 0.5 ? MATRIARCA.cores.e : MATRIARCA.cores.C,
            4
        );
    }

    if (matriarca.tempoNoEstado >= MATRIARCA.tempoDeMorte) {
        const meio = centro(matriarca);
        const item = criarItem({ tipo: "dados", coluna: 0, linha: 0 });
        item.x = meio.x - item.largura / 2;
        item.y = matriarca.y + matriarca.altura - item.altura;
        itens.push(item);

        soltarAmostras(meio, MATRIARCA.amostras);

        matriarca.estado = "morta";
        selarCovil(false);
        barraDoChefe.classList.remove("visivel");
        mostrarAviso("A Matriarca caiu. Os dados estão no chão do covil.");
        atualizarObjetivo();
    }
}

/*
  Os SELOS do covil: as portas da sala trocam de caractere — "%" fecha, "."
  abre. O mesmo truque da membrana: o mundo é uma matriz de letras.
*/
function selarCovil(fechar) {
    [13, 14, 15].forEach(linha => {
        if (salaAtual.portas.O) trocarBloco(0, linha, fechar ? "%" : ".");
        if (salaAtual.portas.L) trocarBloco(COLUNAS - 1, linha, fechar ? "%" : ".");
    });
}

function atualizarBarraDoChefe() {
    vidaDoChefe.value = matriarca.vida / MATRIARCA.vida;
}
