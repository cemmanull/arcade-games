/*
  ============================================================
  XENOMORPH — A DEPURAÇÃO (tecla H)
  ============================================================

  Mostrar o invisível: as caixas de colisão, o que cada criatura pensa,
  os pontos de surgimento, e o mapa inteiro como o gerador o vê (GDD,
  seção 12: "ferramentas de depuração").
*/


// ============================================================
// A DEPURAÇÃO (tecla H)
// ============================================================
/*
  MOSTRE O INVISÍVEL (tecla H). A colisão não usa o desenho: usa a caixa.
  Em ciano, a caixa; em amarelo, os blocos que ela ocupa agora; e uma
  linha verde sob os pés quando `noChao` é verdade. Quando algo parecer
  errado — "ele ficou preso", "ele flutuou" —, é isto que se olha.
*/
function desenharCaixas() {
    const colunaDaEsquerda = Math.floor(soldado.x / TAMANHO_DO_BLOCO);
    const colunaDaDireita = Math.floor((soldado.x + soldado.largura - EPSILON) / TAMANHO_DO_BLOCO);
    const linhaDeCima = Math.floor(soldado.y / TAMANHO_DO_BLOCO);
    const linhaDeBaixo = Math.floor((soldado.y + soldado.altura - EPSILON) / TAMANHO_DO_BLOCO);

    pincel.strokeStyle = "rgba(255, 220, 60, 0.6)";
    pincel.lineWidth = 1;
    for (let linha = linhaDeCima; linha <= linhaDeBaixo; linha++) {
        for (let coluna = colunaDaEsquerda; coluna <= colunaDaDireita; coluna++) {
            pincel.strokeRect(coluna * TAMANHO_DO_BLOCO + 0.5, linha * TAMANHO_DO_BLOCO + 0.5, TAMANHO_DO_BLOCO - 1, TAMANHO_DO_BLOCO - 1);
        }
    }

    pincel.strokeStyle = "#3cf2ff";
    pincel.strokeRect(Math.round(soldado.x) + 0.5, Math.round(soldado.y) + 0.5, soldado.largura - 1, soldado.altura - 1);

    if (soldado.noChao) {
        pincel.fillStyle = "#4dff7a";
        pincel.fillRect(Math.round(soldado.x), Math.round(soldado.y + soldado.altura), soldado.largura, 1);
    }

    pincel.fillStyle = "#e2e8f5";
    pincel.font = "8px monospace";
    pincel.fillText(`vx ${soldado.vx.toFixed(0)}  vy ${soldado.vy.toFixed(0)}`, 12, 14);
    pincel.fillText(`sala ${chave(salaAtual.coluna, salaAtual.linha)}  ${salaAtual.modulo}  distância ${salaAtual.distancia}`, 100, 14);

    // Os perdões, como barras que encolhem: coiote (verde) e pedido de salto (amarelo).
    pincel.fillStyle = "#4dff7a";
    pincel.fillRect(12, 18, soldado.tempoDeCoiote / FISICA.tempoDeCoiote * 40, 2);
    pincel.fillStyle = "#ffdc3c";
    pincel.fillRect(12, 22, soldado.pedidoDeSalto / FISICA.validadeDoPedido * 40, 2);

    /*
      O QUE AS CRIATURAS PENSAM: o nome do estado sobre cada uma, e uma
      linha até o soldado quando ele está dentro do alcance da visão —
      verde se ela enxerga, vermelha se uma parede tapa. Uma máquina de
      estados que ninguém vê é impossível de entender.
    */
    pincel.font = "6px monospace";
    if (matriarca !== null && matriarca.estado !== "morta") {
        pincel.strokeStyle = "#ff3bd4";
        pincel.strokeRect(Math.round(matriarca.x) + 0.5, Math.round(matriarca.y) + 0.5, matriarca.largura - 1, matriarca.altura - 1);
        pincel.fillStyle = "#ff3bd4";
        const rotulo = matriarca.estado === "aviso" ? `aviso: ${matriarca.proximoAtaque}` : matriarca.estado;
        pincel.fillText(`${rotulo} · fase ${matriarca.fase + 1}${matriarca.exposta ? " · exposta" : ""}`, Math.round(matriarca.x) - 10, Math.round(matriarca.y) - 3);
    }
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];
        const meio = centro(criatura);

        pincel.strokeStyle = "#ff3bd4";
        pincel.strokeRect(Math.round(criatura.x) + 0.5, Math.round(criatura.y) + 0.5, criatura.largura - 1, criatura.altura - 1);
        pincel.fillStyle = "#ff3bd4";
        pincel.fillText(criatura.estado, Math.round(criatura.x) - 4, Math.round(criatura.y) - 2);

        if (distanciaAteOSoldado(criatura) <= ficha.visao) {
            const alvo = centro(soldado);
            pincel.strokeStyle = enxerga(criatura, ficha) ? "rgba(77, 255, 122, 0.7)" : "rgba(255, 90, 60, 0.7)";
            pincel.beginPath();
            pincel.moveTo(meio.x, meio.y);
            pincel.lineTo(alvo.x, alvo.y);
            pincel.stroke();
        }
    });
}


/*
  OS PONTOS DE SURGIMENTO (primeira visão do H): cada "*" do módulo é um
  X — amarelo se uma criatura nasceu ali, cinza se o sorteio deixou vazio
  —, e um quadrado vermelho em volta de cada porta usada marca a zona
  onde nenhuma criatura pode nascer.
*/
function desenharPontosDeSurgimento() {
    const ocupados = new Set(salaAtual.criaturas.map(criatura => chave(criatura.coluna, criatura.linha)));

    MODULOS[salaAtual.modulo].linhas.forEach((texto, linha) => {
        [...texto].forEach((caractere, coluna) => {
            if (caractere !== "*") {
                return;
            }
            const x = coluna * TAMANHO_DO_BLOCO;
            const y = linha * TAMANHO_DO_BLOCO;
            pincel.strokeStyle = ocupados.has(chave(coluna, linha)) ? "#ffdc3c" : "#56627a";
            pincel.beginPath();
            pincel.moveTo(x + 1, y + 1);
            pincel.lineTo(x + 7, y + 7);
            pincel.moveTo(x + 7, y + 1);
            pincel.lineTo(x + 1, y + 7);
            pincel.stroke();
        });
    });

    const raio = POPULACAO.distanciaSeguraDasPortas;
    pincel.strokeStyle = "rgba(255, 59, 107, 0.6)";
    for (const [direcao, porta] of Object.entries(CENTRO_DAS_ABERTURAS)) {
        if (salaAtual.portas[direcao]) {
            pincel.strokeRect(
                (porta.coluna - raio + 1) * TAMANHO_DO_BLOCO + 0.5,
                (porta.linha - raio + 1) * TAMANHO_DO_BLOCO + 0.5,
                (raio * 2 - 1) * TAMANHO_DO_BLOCO,
                (raio * 2 - 1) * TAMANHO_DO_BLOCO
            );
        }
    }
}

/*
  O MAPA DO GERADOR (segunda visão do H): o planeta inteiro, como o
  gerador e o validador o enxergam — inclusive o que o jogador ainda não
  descobriu. É uma ferramenta de quem faz o jogo, não de quem joga: o GDD
  pede "ferramentas de depuração para visualizar conexões entre salas,
  pontos de surgimento, rotas obrigatórias e áreas inacessíveis".

  - cada sala é um retângulo da cor da região, com a distância até o pouso;
  - portas são linhas brancas; membranas, vermelhas;
  - a ROTA OBRIGATÓRIA (pouso → Impulso → covil) é a linha amarela,
    calculada com a mesma busca do validador;
  - as salas que só o Impulso alcança têm listras;
  - embaixo, a semente que foi aceita e os motivos das rejeitadas.
*/
const CELULA_DO_GRAFO = { largura: 28, altura: 20, margemX: 16, margemY: 10 };

function desenharMapaDoGerador() {
    pincel.fillStyle = "rgba(5, 7, 13, 0.88)";
    pincel.fillRect(0, 0, tela.width, tela.height);

    const pouso = mundo.salas.get(chave(POUSO.coluna, POUSO.linha));
    const semImpulso = salasAlcancaveis(mundo, pouso, false);
    const meio = sala => ({
        x: CELULA_DO_GRAFO.margemX + sala.coluna * CELULA_DO_GRAFO.largura + CELULA_DO_GRAFO.largura / 2,
        y: CELULA_DO_GRAFO.margemY + sala.linha * CELULA_DO_GRAFO.altura + CELULA_DO_GRAFO.altura / 2
    });

    // As ligações primeiro, para as salas ficarem por cima.
    for (const sala of mundo.salas.values()) {
        for (const direcao of ["L", "S"]) {
            if (!sala.portas[direcao]) {
                continue;
            }
            const outra = vizinha(mundo, sala, direcao);
            const fechada = sala.membranas.includes(direcao) || outra.membranas.includes(DIRECOES[direcao].oposta);
            pincel.strokeStyle = fechada ? "#ff3b6b" : "#c9d3e6";
            pincel.lineWidth = fechada ? 3 : 1;
            pincel.beginPath();
            pincel.moveTo(meio(sala).x, meio(sala).y);
            pincel.lineTo(meio(outra).x, meio(outra).y);
            pincel.stroke();
        }
    }

    // A rota obrigatória: até a chave sem o Impulso, depois até o objetivo com ele.
    const salaDaChave = salaComItem(mundo, "impulso");
    const rota = [
        ...caminhoEntre(mundo, pouso, salaDaChave, false),
        ...caminhoEntre(mundo, salaDaChave, salaDoCovil(mundo), true).slice(1)
    ];
    pincel.strokeStyle = "rgba(255, 220, 60, 0.85)";
    pincel.lineWidth = 2;
    pincel.beginPath();
    rota.forEach((sala, i) => {
        const ponto = meio(sala);
        if (i === 0) pincel.moveTo(ponto.x + 2, ponto.y + 2);
        else pincel.lineTo(ponto.x + 2, ponto.y + 2);
    });
    pincel.stroke();
    pincel.lineWidth = 1;

    pincel.font = "7px monospace";
    for (const sala of mundo.salas.values()) {
        const x = CELULA_DO_GRAFO.margemX + sala.coluna * CELULA_DO_GRAFO.largura + 4;
        const y = CELULA_DO_GRAFO.margemY + sala.linha * CELULA_DO_GRAFO.altura + 3;
        const largura = CELULA_DO_GRAFO.largura - 8;
        const altura = CELULA_DO_GRAFO.altura - 6;

        pincel.fillStyle = PALETAS[sala.regiao].mapa;
        pincel.fillRect(x, y, largura, altura);

        if (!semImpulso.has(sala)) {
            pincel.fillStyle = "rgba(5, 7, 13, 0.7)";
            for (let j = 0; j < altura; j++) {
                for (let i = 0; i < largura; i++) {
                    if ((i + j) % 4 === 0) pincel.fillRect(x + i, y + j, 1, 1);
                }
            }
        }

        if (sala === salaAtual) {
            pincel.strokeStyle = "#3cf2ff";
            pincel.strokeRect(x - 1.5, y - 1.5, largura + 3, altura + 3);
        }

        const marca = ehPouso(sala) ? "P"
            : sala.itens.some(item => item.tipo === "impulso") ? "I"
            : sala.covil ? "M"
            : sala.itens.some(item => item.tipo === "tanque") ? "T"
            : String(sala.distancia);
        pincel.fillStyle = "#ffffff";
        pincel.fillText(marca, x + 2, y + 9);
    }

    pincel.fillStyle = "#e2e8f5";
    pincel.fillText(`semente ${mundo.semente} → aceita "${mundo.sementeUsada}"; ${mundo.rejeitados.length} rejeitada(s)`, 6, tela.height - 14);
    if (mundo.rejeitados.length > 0) {
        pincel.fillStyle = "#ff8a6b";
        const motivo = mundo.rejeitados[0].problemas[0];
        pincel.fillText(motivo.length > 52 ? motivo.slice(0, 51) + "…" : motivo, 6, tela.height - 5);
    }
}
