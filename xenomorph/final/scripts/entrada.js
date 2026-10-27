/*
  ============================================================
  XENOMORPH — A ENTRADA
  ============================================================

  Teclado e toque viram a MESMA coisa: ações. O resto do jogo pergunta
  acao("pular"), nunca "a barra de espaço está apertada?" ou "o dedo está
  no botão?". É por isso que remapear teclas e jogar no celular não
  mudaram nenhuma linha da física.

  Duas famílias de ação, como no Tetris:

  - SEGURAR (andar, mirar, segurar o salto, atirar): o loop consulta o
    painel de interruptores quando precisa.
  - APERTAR (pular, esquivar, usar, trocar, recarregar): o aperto vira um
    PEDIDO com prazo de validade, ou uma ação na hora.
*/
let teclasDoJogo = [];   // as que não podem rolar a página nem apertar botões durante o jogo

function atualizarTeclasDoJogo() {
    teclasDoJogo = Object.values(CONTROLES).flat();
}

/*
  Tecla esperando remapeamento (opcoes.js): enquanto houver uma ação
  aqui, a próxima tecla apertada vai para ela — e para por aqui.
*/
let acaoEsperandoTecla = null;

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();

    if (acaoEsperandoTecla !== null) {
        evento.preventDefault();
        if (tecla !== "escape") {
            remapear(acaoEsperandoTecla, tecla);
        }
        acaoEsperandoTecla = null;
        montarOpcoes();
        return;
    }

    if (evento.target === campoSemente) {
        return;   // digitando a semente: as letras não são comandos
    }

    teclasPressionadas[tecla] = true;

    if (teclasDoJogo.includes(tecla) && estado === "jogando") {
        evento.preventDefault();   // as setas não rolam a página; o Espaço não aperta botões
    }

    if (evento.repeat) {
        return;   // segurar a tecla não é apertar de novo
    }

    if ((tecla === "p" || tecla === "escape") && (estado === "jogando" || estado === "pausado")) {
        alternarPausa();
        return;
    }

    if (estado !== "jogando") {
        return;   // fora do jogo, Enter e Espaço ficam com os botões
    }

    pedirAcao(tecla);
    if (tecla === "h") visaoDeDepuracao = (visaoDeDepuracao + 1) % VISOES_DE_DEPURACAO.length;
});

/*
  As ações de APERTAR, num lugar só: o teclado e os botões de toque
  passam por aqui.
*/
function pedirAcao(tecla) {
    if (CONTROLES.pular.includes(tecla)) soldado.pedidoDeSalto = FISICA.validadeDoPedido;
    if (CONTROLES.esquivar.includes(tecla)) soldado.pedidoDeEsquiva = FISICA.validadeDoPedido;
    if (CONTROLES.cima.includes(tecla)) soldado.pedidoDeUso = FISICA.validadeDoPedido;
    if (CONTROLES.trocar.includes(tecla)) trocarDeArma();
    if (CONTROLES.recarregar.includes(tecla)) comecarRecarga(armaAtiva());
}

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  Trocar de janela: soltar tudo (senão o soldado correria sozinho para
  sempre) e PAUSAR — quem saiu da janela não está jogando.
*/
window.addEventListener("blur", () => {
    soltarTudo();
    if (estado === "jogando") {
        alternarPausa();
    }
});

function soltarTudo() {
    for (const tecla in teclasPressionadas) {
        teclasPressionadas[tecla] = false;
    }
    for (const nome in toquesPressionados) {
        toquesPressionados[nome] = false;
    }
}

function acao(nome) {
    return toquesPressionados[nome] === true || CONTROLES[nome].some(tecla => teclasPressionadas[tecla] === true);
}

/*
  O TOQUE: botões na tela, só onde não há teclado (o CSS decide quando
  aparecem). Cada botão diz a sua ação em data-acao; tocar liga o
  interruptor dela e, se for de APERTAR, faz o pedido — pela primeira
  tecla da ação, o mesmo caminho do teclado.

  Pointer events (o Dealer? Out! ensinou): um dedo, uma caneta e um mouse
  são o mesmo evento. setPointerCapture garante que o "soltar" chega ao
  botão certo mesmo se o dedo escorregar para fora dele.
*/
const toquesPressionados = {};

document.querySelectorAll("#toque button[data-acao]").forEach(botao => {
    const nome = botao.dataset.acao;

    botao.addEventListener("pointerdown", evento => {
        evento.preventDefault();
        botao.setPointerCapture(evento.pointerId);
        prepararAudio();
        toquesPressionados[nome] = true;
        if (estado === "jogando") {
            pedirAcao(CONTROLES[nome][0]);
        }
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach(tipo => {
        botao.addEventListener(tipo, () => {
            toquesPressionados[nome] = false;
        });
    });
});

document.getElementById("toque-pausa").addEventListener("click", () => {
    if (estado === "jogando" || estado === "pausado") {
        alternarPausa();
    }
});
