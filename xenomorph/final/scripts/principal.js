/*
  ============================================================
  XENOMORPH — O LOOP E O LIGAR
  ============================================================

  O último arquivo: o loop do Pong, a história de um quadro, a pausa e,
  no fim, ligar os fios — ler a campanha e as opções, e abrir a base.
*/


// ============================================================
// O LOOP
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    // O teto de 0,05 s do Pong, e um piso de zero: um relógio que volta atrás não desanda o jogo.
    const tempo = Math.max(0, Math.min(segundosDesdeOUltimoQuadro, 0.05));

    // Pausado, NADA anda — nem os esporos da floresta: eles dependem do relógio do jogo.
    if (estado === "jogando") {
        atualizar(tempo);
    }
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

/*
  A história de um quadro. Durante a esquiva, o soldado não corre, não
  pula e não cai: segue em linha reta até ela acabar.
*/
function atualizar(tempo) {
    tempoTotal += tempo;
    descontarTemporizadores(tempo);

    if (soldado.esquiva > 0) {
        continuarEsquiva(tempo);
    } else {
        correr(tempo);
        tentarEsquivar();
        tentarSaltar();
        cortarSalto();
        cair(soldado, tempo, FISICA.gravidade, FISICA.gravidadeNaDescida);
    }

    moverComColisao(soldado, tempo);
    lembrarDoChao();
    verificarSaidaDaSala();
    atualizarRastro(tempo);

    atualizarRecarga(tempo);
    atirar(tempo);
    moverTiros(tempo);

    atualizarCriaturas(tempo);
    atualizarMatriarca(tempo);
    atualizarEcossistema(tempo);
    moverAcido(tempo);
    atualizarPocas(tempo);
    verificarContatos();
    verificarItens(tempo);
    usarEventos();
    atualizarExtracao(tempo);

    atualizarParticulas(tempo);
    atualizarAviso(tempo);
    atualizarBatimento(tempo);
    atualizarEfeitos(tempo);
    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
}

/*
  A PAUSA é um estado como os outros. O loop já só atualiza quando o
  estado é "jogando" — então pausar é só trocar o estado: todos os
  relógios do jogo param de graça, porque todos são contados no loop.
*/
function alternarPausa() {
    if (estado === "jogando") {
        estado = "pausado";
        soltarTudo();
        mostrarMensagem("Pausa", "P ou Esc para continuar.", botaoContinuar);
    } else if (estado === "pausado") {
        estado = "jogando";
        camadaMensagem.hidden = true;
    }
}

function descontarTemporizadores(tempo) {
    soldado.tempoDeCoiote = Math.max(0, soldado.tempoDeCoiote - tempo);
    soldado.pedidoDeSalto = Math.max(0, soldado.pedidoDeSalto - tempo);
    soldado.pedidoDeEsquiva = Math.max(0, soldado.pedidoDeEsquiva - tempo);
    soldado.pedidoDeUso = Math.max(0, soldado.pedidoDeUso - tempo);
    soldado.atravessando = Math.max(0, soldado.atravessando - tempo);
    soldado.recargaDaEsquiva = Math.max(0, soldado.recargaDaEsquiva - tempo);
    soldado.invulneravel = Math.max(0, soldado.invulneravel - tempo);
}


// ============================================================
// LIGAR
// ============================================================
botaoVoltarABase.addEventListener("click", abrirBase);
botaoContinuar.addEventListener("click", alternarPausa);
botaoRestaurarTeclas.addEventListener("click", () => {
    restaurarTeclas();
    montarOpcoes();
});

// O áudio só pode nascer depois de um gesto de quem joga.
["keydown", "pointerdown"].forEach(tipo => document.addEventListener(tipo, prepararAudio));
botaoApagar.addEventListener("click", apagarCampanha);
botaoSortear.addEventListener("click", () => {
    campoSemente.value = sortearSemente();
});

/*
  O formulário da base: Enter no campo (ou o botão) dispara o "submit", e
  a expedição começa com a semente do campo. preventDefault impede o
  navegador de recarregar a página. Maiúsculas, sem espaços nas pontas.
*/
formularioDaSemente.addEventListener("submit", evento => {
    evento.preventDefault();
    const semente = campoSemente.value.trim().toUpperCase();
    iniciarExpedicao(semente || sortearSemente());
    campoSemente.blur();
});

const problemasDosModulos = conferirModulos();
problemasDosModulos.forEach(problema => console.error(problema));

campanha = carregarCampanha();
opcoes = carregarOpcoes();
aplicarTeclas();

/*
  O jogo abre na BASE. Uma semente no endereço (index.html?semente=XENO)
  já vem preenchida no campo.
*/
abrirBase();
const sementeDoEndereco = new URLSearchParams(location.search).get("semente");
if (sementeDoEndereco) {
    campoSemente.value = sementeDoEndereco.toUpperCase();
}
requestAnimationFrame(quadroAQuadro);
