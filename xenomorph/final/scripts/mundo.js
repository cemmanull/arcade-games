/*
  ============================================================
  XENOMORPH — O MUNDO EM JOGO
  ============================================================

  Começar uma expedição, entrar numa sala (o plano do gerador ao lado do
  que já mudou nela), passar de sala, os itens, os eventos e as
  perguntas sobre um bloco.
*/


// ============================================================
// O MUNDO E AS SALAS
// ============================================================
/*
  O gerador entrega um PLANO: cada sala com a sua região, as suas portas,
  o seu módulo e as anotações de onde nascem criaturas e itens. O plano
  não muda durante a expedição.

  O que muda — criaturas mortas, cápsulas apanhadas — mora AO LADO, em
  `salasVisitadas`: só existe para as salas onde o soldado já esteve,
  e é criado na primeira visita. É a separação do passo 4 (a ficha da
  arma e a munição que sobra), agora para um mundo inteiro. E serve de
  graça ao minimapa: uma sala visitada é uma sala que tem estado.
*/
/*
  Uma expedição nova: o mundo inteiro sai da semente, e o soldado pousa.
  As melhorias da campanha viram números do soldado antes do pouso.
*/
function iniciarExpedicao(semente) {
    mundo = gerarMundo(semente);
    ecossistema = criarEcossistema();
    expedicao = { amostras: 0 };
    telaDaBase.hidden = true;
    document.body.classList.remove("na-base");
    salasVisitadas = new Map();
    salaAtual = null;
    estadoDaSala = null;
    matriarca = null;
    barraDoChefe.classList.remove("visivel");

    soldado = criarSoldado();
    aplicarMelhorias();
    entrarNaSala(mundo.salas.get(chave(POUSO.coluna, POUSO.linha)));

    equipamento.armas = campanha.armas.levadas.map(criarArmaEquipada);
    equipamento.ativa = 0;
    esperaDoProximoTiro = 0;
    rastro = [];

    membranaJaResistiu = false;
    tempoDoAviso = 0;
    campoAviso.hidden = true;

    tempoSegurandoExtracao = 0;
    estavaNaZonaDeExtracao = false;
    eventoSobOsPes = null;
    acaoEsperandoTecla = null;   // um remapeamento deixado pela metade na base não captura a primeira tecla do jogo

    estado = "jogando";
    camadaMensagem.hidden = true;
    campoSementeAtual.textContent = semente;
    atualizarObjetivo();
    atualizarPainel();
}

/*
  ENTRAR NUMA SALA: guardar o que mudou na sala que fica, e trazer a que
  chega. Na primeira visita, o estado da sala é criado a partir do plano:
  os blocos escavados, as criaturas e os itens anotados pelo gerador.

  Tiros, ácido, poças e partículas não viajam entre salas: ficam para trás.
*/
function entrarNaSala(sala) {
    if (estadoDaSala !== null) {
        estadoDaSala.criaturas = criaturas;
        estadoDaSala.itens = itens;
        estadoDaSala.chefe = matriarca;
    }

    const nome = chave(sala.coluna, sala.linha);
    const primeiraVisita = !salasVisitadas.has(nome);
    if (primeiraVisita) {
        salasVisitadas.set(nome, {
            blocos: construirBlocos(sala),
            criaturas: sala.criaturas.map((descricao, i) =>
                evoluir(criarCriatura(descricao.especie, descricao, i % 2 === 0 ? -1 : 1), sala.regiao)),
            itens: sala.itens.map(descricao => criarItem(
                descricao.tipo === "impulso" && soldado.impulso ? { ...descricao, tipo: "reserva" } : descricao
            )),
            chefe: sala.covil ? criarMatriarca() : null
        });
    }

    salaAtual = sala;
    estadoDaSala = salasVisitadas.get(nome);
    criaturas = estadoDaSala.criaturas;
    itens = estadoDaSala.itens;
    matriarca = estadoDaSala.chefe;
    paleta = PALETAS[sala.regiao];

    if (!primeiraVisita) {
        chamarReforcos(sala);
    }
    criaturas.forEach(criatura => registrarNoBestiario(criatura.especie));

    tiros = [];
    acido = [];
    pocas = [];
    particulas = [];

    desenharMinimapa();
    atualizarSetor();

    // Um zumbido grave avisa que há uma porta tapada por membrana nesta sala (GDD: "portas secretas").
    if (sala.membranas.some(direcao => estadoDaPorta(sala, direcao) === "membrana")) {
        tocarSom(SONS.segredo);
    }
}

/*
  PASSAR DE SALA. Quando o CENTRO do soldado sai da tela, ele entra na sala
  vizinha naquela direção, do lado oposto: saiu pela direita com x = 257,
  chega com x = 1. As salas se encaixam porque as portas estão sempre nos
  mesmos lugares (gerador.js, seção 2).

  Subindo, um empurrão: quem sai pelo teto chega na sala de cima pelo
  piso, e precisa de impulso para passar pela grade e pisar nela. É um
  truque honesto — sem ele, todo poço vertical seria uma armadilha.
*/
function verificarSaidaDaSala() {
    const meio = centro(soldado);
    let direcao = null;

    if (meio.x < 0) direcao = "O";
    else if (meio.x >= tela.width) direcao = "L";
    else if (meio.y < 0) direcao = "N";
    else if (meio.y >= tela.height) direcao = "S";

    if (direcao === null) {
        return;
    }

    const passo = DIRECOES[direcao];
    const destino = mundo.salas.get(chave(salaAtual.coluna + passo.dc, salaAtual.linha + passo.dl));

    if (!destino || !salaAtual.portas[direcao]) {
        // Não deveria acontecer: só há abertura onde há ligação. Se acontecer, é um módulo com borda furada.
        console.error(`Saída sem sala: ${direcao} de ${chave(salaAtual.coluna, salaAtual.linha)}`);
        return;
    }

    entrarNaSala(destino);
    soldado.x -= passo.dc * tela.width;
    soldado.y -= passo.dl * tela.height;

    if (direcao === "N") {
        soldado.vy = Math.min(soldado.vy, -FISICA.velocidadeDoSalto);
    }
}

/*
  As criaturas não passam de sala: chegando à borda, são seguradas como se
  houvesse parede — e dão meia-volta, porque `bateuNaParede` diz que sim.
*/
function prenderNaSala(corpo) {
    if (corpo.x < 0) {
        corpo.x = 0;
        corpo.bateuNaParede = true;
    }
    if (corpo.x + corpo.largura > tela.width) {
        corpo.x = tela.width - corpo.largura;
        corpo.bateuNaParede = true;
    }
}

function foraDaTela(ponto) {
    return ponto.x < 0 || ponto.x >= tela.width || ponto.y < 0 || ponto.y >= tela.height;
}


// ============================================================
// OS ITENS
// ============================================================
/*
  O QUE CADA ITEM FAZ ao ser apanhado: uma tabela de funções, como os
  efeitos do Dealer? Out!. Devolver `false` quer dizer "não peguei" — a
  cápsula de vida fica no chão quando a vida está cheia.
*/
const AO_PEGAR = {
    capsula: () => {
        if (soldado.vida === soldado.vidaMaxima) {
            return false;
        }
        soldado.vida = Math.min(soldado.vidaMaxima, soldado.vida + CURA_DA_CAPSULA);
        return true;
    },
    tanque: () => {
        soldado.vidaMaxima += VIDA_DO_TANQUE;
        soldado.vida = soldado.vidaMaxima;
        mostrarAviso(`Tanque de vida: a vida máxima sobe para ${soldado.vidaMaxima}`);
        return true;
    },
    impulso: () => {
        soldado.impulso = true;
        campanha.habilidades.impulso = true;   // permanente, e salvo NA HORA: nem a morte logo depois o tira
        salvarCampanha();
        mostrarAviso("Impulso Cinético: a esquiva agora rompe membranas");
        atualizarObjetivo();
        return true;
    },
    dados: () => {
        concluirExpedicao();
        return true;
    },
    amostra: () => {
        expedicao.amostras += 1;
        return true;
    },
    modulo: item => {
        const arma = armaAtiva();
        const modificacao = MODIFICACOES[item.modificacao];
        arma.modificacao = item.modificacao;
        mostrarAviso(`${modificacao.nome} (${modificacao.raridade === "epico" ? "épico" : modificacao.raridade}) no ${ARMAS[arma.tipo].nome}: ${modificacao.descricao}`);
        tocarSom(SONS.modulo);
        return true;
    },
    reserva: () => {
        expedicao.amostras += AMOSTRAS_DA_RESERVA;
        mostrarAviso(`Reserva de amostras: +${AMOSTRAS_DA_RESERVA}`);
        return true;
    }
};

/*
  O ÍMÃ: amostras perto do soldado andam até ele. Pegar dezenas de coisas
  pequenas uma a uma seria trabalho; com o ímã, é recompensa.
*/
function puxarComOIma(amostra, tempo) {
    const alvo = centro(soldado);
    const meio = centro(amostra);
    const distancia = Math.hypot(alvo.x - meio.x, alvo.y - meio.y);

    if (distancia > 0 && distancia < RAIO_DO_IMA) {
        amostra.x += (alvo.x - meio.x) / distancia * RAPIDEZ_DO_IMA * tempo;
        amostra.y += (alvo.y - meio.y) / distancia * RAPIDEZ_DO_IMA * tempo;
    }
}

function criarItem(descricao) {
    const sprite = ITENS[descricao.tipo].sprite;

    return {
        tipo: descricao.tipo,
        modificacao: descricao.modificacao ?? null,   // só os módulos têm
        usado: false,                                 // só os eventos usam
        x: descricao.coluna * TAMANHO_DO_BLOCO + (TAMANHO_DO_BLOCO - sprite[0].length) / 2,
        y: (descricao.linha + 1) * TAMANHO_DO_BLOCO - sprite.length,
        largura: sprite[0].length,
        altura: sprite.length,
        apanhado: false
    };
}

/*
  OS EVENTOS: tocar mostra o que dá para fazer; ↑ faz. Cada um tem a sua
  função, como os itens — mas fica no lugar depois de usado.
*/
const AO_USAR = {
    estacao: item => {
        soldado.vida = soldado.vidaMaxima;
        mostrarAviso("Estação médica: vida restaurada");
        tocarSom(SONS.cura);
        item.usado = true;
        atualizarPainel();
    },
    terminal: item => {
        const lidos = campanha.registrosLidos;
        item.usado = true;
        tocarSom(SONS.terminal);

        if (lidos >= REGISTROS_DA_COLONIA.length) {
            mostrarAviso("Terminal: nenhum registro novo.");
            return;
        }
        mostrarAviso(REGISTROS_DA_COLONIA[lidos], DURACAO_DO_REGISTRO);
        campanha.registrosLidos += 1;
        salvarCampanha();   // como o Impulso: a história lida não se perde numa morte
    }
};

const DICAS_DE_USO = {
    estacao: "↑: usar a estação médica",
    terminal: "↑: ler o terminal"
};

function usarEventos() {
    const evento = itens.find(item => ITENS[item.tipo].interativo && !item.usado && sobrepoe(item, soldado));

    if (!evento) {
        eventoSobOsPes = null;
        return;
    }
    if (evento !== eventoSobOsPes) {
        eventoSobOsPes = evento;
        mostrarAviso(DICAS_DE_USO[evento.tipo]);
    }
    if (soldado.pedidoDeUso > 0) {
        soldado.pedidoDeUso = 0;
        AO_USAR[evento.tipo](evento);
    }
}

function verificarItens(tempo) {
    itens.forEach(item => {
        if (item.tipo === "amostra") {
            puxarComOIma(item, tempo);
        }

        if (ITENS[item.tipo].interativo) {
            return;   // eventos não se apanham: se usam (usarEventos)
        }
        if (sobrepoe(item, soldado) && AO_PEGAR[item.tipo](item) !== false) {
            item.apanhado = true;
            if (item.tipo !== "amostra" && item.tipo !== "modulo") {
                tocarSom(SONS.item);
            }
            campoAmostras.textContent = expedicao.amostras;
            soltarFaiscas(centro(item).x, centro(item).y, ITENS[item.tipo].cores["#"] || "#ffffff", 12);
            atualizarPainel();
        }
    });

    itens = itens.filter(item => !item.apanhado);
}


// ============================================================
// PERGUNTAS SOBRE UM BLOCO
// ============================================================
/*
  FORA DA SALA, VALE A BORDA MAIS PRÓXIMA. Antes, fora era sempre sólido —
  e o soldado não conseguiria passar por uma porta. Agora a coluna -1
  repete a coluna 0: onde a borda é parede, fora é parede; onde a borda é
  uma porta aberta, fora é ar, e dá para sair.
*/
function blocoEm(coluna, linha) {
    const colunaDentro = limitar(coluna, 0, COLUNAS - 1);
    const linhaDentro = limitar(linha, 0, LINHAS - 1);

    return BLOCOS[estadoDaSala.blocos[linhaDentro][colunaDentro]];
}

function trocarBloco(coluna, linha, caractere) {
    estadoDaSala.blocos[limitar(linha, 0, LINHAS - 1)][limitar(coluna, 0, COLUNAS - 1)] = caractere;
}

function ehSolido(coluna, linha) {
    return blocoEm(coluna, linha).solido;
}
