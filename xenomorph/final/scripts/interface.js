/*
  ============================================================
  XENOMORPH — A INTERFACE
  ============================================================

  O minimapa, o painel, a barra do chefe, os avisos, o objetivo atual e a
  camada de mensagem — o HTML em volta do canvas.
*/


// ============================================================
// O MINIMAPA
// ============================================================
/*
  O mapa mostra SÓ o que já foi explorado (GDD, seção 11: "registrar as
  salas exploradas [...] mas não revelar automaticamente todas as áreas
  desconhecidas"). Cada sala visitada é um retângulo da cor da sua região;
  cada porta dela é um risco na borda — o jogador vê que há uma saída
  ali, mas não o que existe depois. A sala atual pisca.

  É o MESMO plano do gerador, desenhado de outro jeito: a regra do curso,
  separar o que a coisa é de como ela aparece, agora com dois desenhos
  para um dado só.
*/
const CELULA = { largura: 6, altura: 4, espaco: 1 };

function desenharMinimapa() {
    pincelDoMapa.fillStyle = "#05070d";
    pincelDoMapa.fillRect(0, 0, minimapa.width, minimapa.height);

    for (const sala of mundo.salas.values()) {
        if (!salasVisitadas.has(chave(sala.coluna, sala.linha))) {
            continue;
        }

        const x = CELULA.espaco + sala.coluna * (CELULA.largura + CELULA.espaco);
        const y = CELULA.espaco + sala.linha * (CELULA.altura + CELULA.espaco);
        const atual = sala === salaAtual;

        pincelDoMapa.fillStyle = atual ? "#3cf2ff" : PALETAS[sala.regiao].mapa;
        pincelDoMapa.fillRect(x, y, CELULA.largura, CELULA.altura);

        // Uma porta com membrana ainda inteira aparece em vermelho: "bloqueada", como o GDD pede.
        const corDaPorta = direcao => estadoDaPorta(sala, direcao) === "membrana" ? "#ff3b6b" : "#e2e8f5";
        pincelDoMapa.fillStyle = corDaPorta("O");
        if (sala.portas.O) pincelDoMapa.fillRect(x - 1, y + 2, 1, 1);
        pincelDoMapa.fillStyle = corDaPorta("L");
        if (sala.portas.L) pincelDoMapa.fillRect(x + CELULA.largura, y + 2, 1, 1);
        pincelDoMapa.fillStyle = "#e2e8f5";
        if (sala.portas.N) pincelDoMapa.fillRect(x + 2, y - 1, 2, 1);
        if (sala.portas.S) pincelDoMapa.fillRect(x + 2, y + CELULA.altura, 2, 1);
    }
}

/*
  A membrana de uma porta pode já ter sido rompida: quem sabe é o estado
  da sala (a matriz), não o plano do gerador.
*/
function estadoDaPorta(sala, direcao) {
    if (!sala.membranas.includes(direcao)) {
        return "aberta";
    }
    const estadoGuardado = salasVisitadas.get(chave(sala.coluna, sala.linha));
    const coluna = direcao === "O" ? 0 : COLUNAS - 1;
    return estadoGuardado.blocos[14][coluna] === "~" ? "membrana" : "aberta";
}

function atualizarSetor() {
    campoSetor.textContent = REGIOES[salaAtual.regiao].nome;
}


// ============================================================
// O PAINEL
// ============================================================
/*
  O painel só é refeito quando algo muda (um disparo, uma troca, uma
  recarga que termina) — não a cada quadro. A barra de recarga é a
  exceção: ela anda sozinha, em atualizarRecarga.
*/
function atualizarPainel() {
    campoAmostras.textContent = expedicao.amostras;
    const nivel = nivelDaRegiao(salaAtual.regiao);
    campoEcossistema.textContent = nivel.nome;
    campoEcossistema.dataset.nivel = EVOLUCAO.indexOf(nivel);

    barraDeVida.value = soldado.vida / soldado.vidaMaxima;
    barraDeVida.classList.toggle("pouca", soldado.vida < soldado.vidaMaxima * 0.3);

    equipamento.armas.forEach((arma, i) => {
        const item = itensDasArmas[i];
        item.querySelector(".nome-da-arma").textContent = ARMAS[arma.tipo].nome;
        const campoDaModificacao = item.querySelector(".modificacao");
        const modificacao = arma.modificacao ? MODIFICACOES[arma.modificacao] : null;
        campoDaModificacao.textContent = modificacao ? ` + ${modificacao.nome}` : "";
        campoDaModificacao.style.color = modificacao ? RARIDADES[modificacao.raridade].cor : "";
        item.querySelector(".municao").textContent = `${arma.municao}/${tamanhoDoPente(arma.tipo)}`;
        item.setAttribute("aria-current", String(i === equipamento.ativa));
    });

    const recarregando = armaAtiva().recarregando > 0;
    painel.classList.toggle("recarregando", recarregando);
    if (!recarregando) {
        barraDeRecarga.value = 0;
    }
}


/*
  A camada de mensagem do Pong e do Tetris. O foco vai para o botão: quem
  joga pelo teclado aperta Enter e recomeça, sem procurar o mouse.
*/
/*
  A mesma camada serve ao fim e à pausa; cada um mostra o SEU botão, e o
  foco vai para ele — quem joga pelo teclado aperta Enter e segue.
*/
function mostrarMensagem(titulo, texto, botao = botaoVoltarABase) {
    camadaMensagem.classList.remove("vitoria");
    mensagemTitulo.textContent = titulo;
    mensagemTexto.textContent = texto;
    botaoVoltarABase.hidden = botao !== botaoVoltarABase;
    botaoContinuar.hidden = botao !== botaoContinuar;
    camadaMensagem.hidden = false;
    botao.focus();
}


/*
  O AVISO: um texto por cima da tela, por alguns segundos. Contado pelo
  relógio do jogo, como tudo (e não o da parede).
*/
function mostrarAviso(texto, duracao = DURACAO_DO_AVISO) {
    campoAviso.textContent = texto;
    campoAviso.hidden = false;
    tempoDoAviso = duracao;
}

function atualizarAviso(tempo) {
    if (tempoDoAviso <= 0) {
        return;
    }
    tempoDoAviso -= tempo;
    if (tempoDoAviso <= 0) {
        campoAviso.hidden = true;
    }
}

/*
  O OBJETIVO ATUAL (GDD, seção 11): uma frase que muda com a progressão.
*/
function atualizarObjetivo() {
    if (!soldado.impulso) {
        campoObjetivo.textContent = "Explorar o complexo — algo ali rompe membranas";
    } else if (matriarca === null || matriarca.estado !== "morta") {
        campoObjetivo.textContent = "Encontrar o covil no fundo da floresta";
    } else {
        campoObjetivo.textContent = "Apanhar os dados da colônia";
    }
}
