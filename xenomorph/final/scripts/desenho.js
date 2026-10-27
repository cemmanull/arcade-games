/*
  ============================================================
  XENOMORPH — O DESENHO
  ============================================================

  Tudo o que pinta o canvas durante a expedição: fundos, blocos, itens,
  criaturas, Matriarca, soldado, tiros, partículas, números de dano — e
  os efeitos pedidos pelos sistemas (tremor), filtrados pelas opções.
*/


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    if (estado === "base") {
        desenharBase();
        return;
    }

    /*
      O TREMOR: a tela inteira é desenhada deslocada alguns pixels ao acaso,
      e o deslocamento encolhe sozinho. Com "efeitos reduzidos" ligado,
      nunca acontece (opcoes.js) — tremor causa enjoo em muita gente.
    */
    pincel.save();
    if (tremor > 0) {
        pincel.translate(Math.round((Math.random() - 0.5) * tremor * 2), Math.round((Math.random() - 0.5) * tremor * 2));
    }

    desenharFundo();
    desenharBlocos();
    desenharItens();
    desenharPocas();
    desenharMatriarca();
    desenharCriaturas();
    desenharRastro();

    if (estado === "jogando") {
        desenharSoldado();
        desenharArma();
        desenharExtracao();
    }

    desenharTiros();
    desenharAcido();
    desenharParticulas();
    desenharNumerosDeDano();
    pincel.restore();

    if (VISOES_DE_DEPURACAO[visaoDeDepuracao] === "caixas") {
        desenharCaixas();
        desenharPontosDeSurgimento();
    }
    if (VISOES_DE_DEPURACAO[visaoDeDepuracao] === "mapa") {
        desenharMapaDoGerador();
    }
}

function desenharFundo() {
    pincel.fillStyle = paleta.painel;
    pincel.fillRect(0, 0, tela.width, tela.height);

    if (paleta.fundo === "paineis") {
        desenharPaineis();
    } else {
        desenharCaverna();
    }
}

function desenharPaineis() {
    pincel.fillStyle = paleta.juntaDoPainel;
    for (let x = 0; x < tela.width; x += 16) {
        pincel.fillRect(x, 0, 1, tela.height);
    }
    for (let y = 0; y < tela.height; y += 16) {
        pincel.fillRect(0, y, tela.width, 1);
    }
}

/*
  A caverna da floresta: esporos que brilham e apagam. As posições vêm de
  um sorteador com a semente da PRÓPRIA SALA — cada sala tem os seus
  esporos, sempre os mesmos, e nenhum número é tirado dos fluxos do
  gerador. Um enfeite também pode ser repetível.
*/
function desenharCaverna() {
    const sortear = criarSorteador(hashDeTexto(`esporos:${chave(salaAtual.coluna, salaAtual.linha)}`));

    for (let i = 0; i < 40; i++) {
        const x = Math.floor(sortear() * tela.width);
        const y = Math.floor(sortear() * tela.height);
        const fase = sortear() * Math.PI * 2;
        const brilho = Math.sin(tempoTotal * 1.5 + fase);

        pincel.fillStyle = brilho > 0.3 ? "#3fd18b" : paleta.juntaDoPainel;
        pincel.fillRect(x, y, 1, 1);
    }
}

const DESENHOS_DE_BLOCO = {
    metal: desenharMetal,
    casco: desenharCasco,
    membrana: desenharMembrana,
    selo: desenharSelo,
    plataforma: desenharPlataforma,
    cano: desenharCano
};

function desenharBlocos() {
    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            const desenho = blocoEm(coluna, linha).desenho;

            if (desenho !== null) {
                DESENHOS_DE_BLOCO[desenho](coluna, linha);
            }
        }
    }
}

function desenharMetal(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;
    const lado = TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.metal;
    pincel.fillRect(x, y, lado, lado);

    const arEmCima = !ehSolido(coluna, linha - 1);
    const arEmbaixo = !ehSolido(coluna, linha + 1);
    const arAEsquerda = !ehSolido(coluna - 1, linha);
    const arADireita = !ehSolido(coluna + 1, linha);

    pincel.fillStyle = paleta.metalEscuro;
    if (arEmbaixo) pincel.fillRect(x, y + lado - 1, lado, 1);
    if (arADireita) pincel.fillRect(x + lado - 1, y, 1, lado);

    pincel.fillStyle = paleta.metalClaro;
    if (arEmCima) pincel.fillRect(x, y, lado, 1);
    if (arAEsquerda) pincel.fillRect(x, y, 1, lado);

    if (arEmCima || arEmbaixo || arAEsquerda || arADireita) {
        pincel.fillStyle = paleta.rebite;
        pincel.fillRect(x + 3, y + 3, 1, 1);
    }
}

/*
  O casco da nave de pouso: placas claras com uma faixa escura. Sólido como
  o metal, mas com outra cara — outra linha na tabela de blocos.
*/
function desenharCasco(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.casco;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, TAMANHO_DO_BLOCO);
    pincel.fillStyle = paleta.cascoEscuro;
    pincel.fillRect(x, y + 5, TAMANHO_DO_BLOCO, 1);
    if (!ehSolido(coluna, linha + 1)) {
        pincel.fillRect(x, y + TAMANHO_DO_BLOCO - 1, TAMANHO_DO_BLOCO, 1);
    }
}

/*
  A membrana PULSA: veias que acendem e apagam numa onda que desce. Viva,
  orgânica, diferente de tudo o que é metal — o jogador entende que ela
  não é parede comum, e que talvez exista um jeito de passar.
*/
function desenharMembrana(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;
    const pulso = (Math.sin(tempoTotal * 4 - linha) + 1) / 2;

    pincel.fillStyle = "#3a0f2a";
    pincel.fillRect(x + 1, y, TAMANHO_DO_BLOCO - 2, TAMANHO_DO_BLOCO);
    pincel.fillStyle = pulso > 0.5 ? "#e0447f" : "#8a1f4c";
    pincel.fillRect(x + 3, y, 1, TAMANHO_DO_BLOCO);
    pincel.fillRect(x + 2, y + 2, 1, 2);
    pincel.fillRect(x + 4, y + 5, 1, 2);
}

/*
  O selo do covil: carne escura com dentes. Não pulsa como a membrana —
  não é uma passagem esperando a chave certa, é uma boca fechada.
*/
function desenharSelo(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = "#2a0d14";
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, TAMANHO_DO_BLOCO);
    pincel.fillStyle = "#e2e8f5";
    pincel.fillRect(x + 1, y + 1, 1, 2);
    pincel.fillRect(x + 4, y + 4, 1, 2);
    pincel.fillRect(x + 6, y + 1, 1, 2);
}

function desenharCano(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.cano;
    pincel.fillRect(x + 2, y, 4, TAMANHO_DO_BLOCO);
    pincel.fillStyle = paleta.canoClaro;
    pincel.fillRect(x + 3, y, 1, TAMANHO_DO_BLOCO);
    pincel.fillRect(x + 1, y + 6, 6, 1);
}

/*
  A plataforma é FINA no desenho — só os 3 pixels de cima — para o
  jogador ler, sem manual, que ela é diferente do metal: dá para passar
  por baixo. A forma conta a regra.
*/
function desenharPlataforma(coluna, linha) {
    const x = coluna * TAMANHO_DO_BLOCO;
    const y = linha * TAMANHO_DO_BLOCO;

    pincel.fillStyle = paleta.grade;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 3);
    pincel.fillStyle = paleta.gradeClara;
    pincel.fillRect(x, y, TAMANHO_DO_BLOCO, 1);

    // Os furos da grade, um sim, um não.
    pincel.fillStyle = paleta.painel;
    for (let i = 1; i < TAMANHO_DO_BLOCO; i += 2) {
        pincel.fillRect(x + i, y + 2, 1, 1);
    }
}

/*
  Invulnerável, o soldado PISCA: some e volta 12 vezes por segundo. O
  jogador vê que está protegido — e quanto tempo falta.
*/
function desenharSoldado() {
    if (soldado.invulneravel > 0 && Math.floor(soldado.invulneravel * 12) % 2 === 0) {
        return;
    }

    const espelhado = soldado.olhandoPara < 0;
    desenharSprite(quadroDoSoldado(), CORES_DO_SOLDADO, soldado.x - 1, soldado.y, espelhado);
}

/*
  O quadro sai do estado: no ar, pernas encolhidas; andando, dois passos
  que se alternam com o relógio; parado, de pé.
*/
function quadroDoSoldado() {
    if (!soldado.noChao) {
        return QUADROS_DO_SOLDADO.noAr;
    }
    if (Math.abs(soldado.vx) > 10) {
        return Math.floor(tempoTotal * 8) % 2 === 0 ? QUADROS_DO_SOLDADO.passoA : QUADROS_DO_SOLDADO.passoB;
    }
    return QUADROS_DO_SOLDADO.parado;
}

/*
  OS NÚMEROS DE DANO (o "indicador de combate" do GDD): sobem e somem.
  Desenhados com os algarismos de 3 x 5, em branco com sombra preta, para
  serem lidos em cima de qualquer fundo.
*/
function desenharNumerosDeDano() {
    numerosDeDano.forEach(numero => {
        const texto = String(numero.valor);
        let x = Math.round(numero.x - texto.length * 2);
        const y = Math.round(numero.y);

        for (const algarismo of texto) {
            desenharSprite(ALGARISMOS[algarismo], { "#": "#05070d" }, x + 1, y + 1);
            desenharSprite(ALGARISMOS[algarismo], { "#": numero.cor }, x, y);
            x += 4;
        }
    });
}

/*
  A ARMA é uma linha de 5 pixels saindo do ombro na direção da mira:
  oito direções desenhadas com o mesmo laço. A ponta acende no clarão.
*/
function desenharArma() {
    if (soldado.invulneravel > 0 && Math.floor(soldado.invulneravel * 12) % 2 === 0) {
        return;
    }

    const origem = ombro();
    const mira = direcaoDaMira();

    pincel.fillStyle = CORES_DO_SOLDADO.g;
    for (let i = 1; i <= 5; i++) {
        pincel.fillRect(Math.round(origem.x + mira.x * i - 0.5), Math.round(origem.y + mira.y * i - 0.5), 1, 1);
    }

    if (tempoDoClarao > 0) {
        pincel.fillStyle = "#ffffff";
        pincel.fillRect(Math.round(origem.x + mira.x * 6 - 1), Math.round(origem.y + mira.y * 6 - 1), 2, 2);
    }
}

/*
  Um tiro é um traço de 3 pixels apontado para trás: o olho lê a direção
  e a rapidez sem precisar de sprite.
*/
function desenharTiros() {
    tiros.forEach(tiro => {
        const rapidez = Math.hypot(tiro.vx, tiro.vy);
        pincel.fillStyle = tiro.cor;
        for (let i = 0; i < 3; i++) {
            pincel.fillRect(
                Math.round(tiro.x - tiro.vx / rapidez * i),
                Math.round(tiro.y - tiro.vy / rapidez * i),
                1, 1
            );
        }
    });
}

function desenharParticulas() {
    particulas.forEach(particula => {
        pincel.fillStyle = particula.cor;
        pincel.fillRect(Math.round(particula.x), Math.round(particula.y), 1, 1);
    });
}

/*
  O QUADRO DE CADA CRIATURA sai do estado — não é guardado:

  - o rastejador alterna as pernas enquanto anda (o relógio do jogo, como
    o céu do Shoot 'em up);
  - o saltador agacha no preparo (o aviso) e na recuperação;
  - a cuspidora acende o saco de ácido enquanto mira — pulsando cada vez
    mais rápido conforme o cuspe se aproxima.

  E todas piscam em branco ao levar um tiro.
*/
function desenharCriaturas() {
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];
        let quadro = ficha.quadros[0];
        let cores = ficha.cores;

        if (criatura.especie === "rastejador" && criatura.vx !== 0) {
            quadro = ficha.quadros[Math.floor(tempoTotal * 10) % 2];
        }
        if (criatura.especie === "saltador" && (criatura.estado === "preparo" || criatura.estado === "recuperacao")) {
            quadro = ficha.quadros[1];
        }
        if (criatura.especie === "cuspidora" && criatura.estado === "mira") {
            const pulso = Math.floor(criatura.tempoNoEstado * (6 + criatura.tempoNoEstado * 20)) % 2;
            cores = { ...ficha.cores, A: pulso ? "#e8ff9a" : ficha.cores.A };
        }

        if (criatura.especie === "ninho" && criatura.recarga < 0.6) {
            cores = { ...cores, e: Math.floor(tempoTotal * 12) % 2 ? "#ffffff" : cores.e };   // o aviso do filhote
        }

        /*
          A EVOLUÇÃO À VISTA: a carapaça mutada fica dourada; a borda da
          criatura resistente ganha a cor da arma que ela aguenta. O
          jogador lê a regra no desenho — e troca de arma.
        */
        if (criatura.mutada) {
            cores = { ...cores, C: "#c9a227", N: "#c9a227" };
        }
        if (criatura.resistente) {
            cores = { ...cores, c: ARMAS[criatura.resistente].cor, n: ARMAS[criatura.resistente].cor, a: ARMAS[criatura.resistente].cor };
        }

        const corUnica = criatura.piscando > 0 ? "#ffffff" : null;
        const x = criatura.x + (criatura.largura - quadro[0].length) / 2;
        desenharSprite(quadro, cores, x, criatura.y, criatura.olhandoPara < 0, corUnica);
    });
}

/*
  A Matriarca desenhada conforme o estado: o saco de ovos PULSA quando
  aberto (o ponto fraco à vista), os olhos piscam no aviso da investida,
  o saco acende no aviso dos ovos e do cuspe, e marcas vermelhas descem do
  teto no aviso da chuva.
*/
function desenharMatriarca() {
    if (matriarca === null || matriarca.estado === "morta") {
        return;
    }

    let cores = MATRIARCA.cores;
    const piscar = Math.floor(tempoTotal * 10) % 2 === 0;
    const avisando = matriarca.estado === "aviso";

    if (matriarca.exposta) {
        cores = { ...cores, S: piscar ? "#b8ff3c" : "#e8ff9a", s: "#7ad14a" };
    }
    if (avisando && matriarca.proximoAtaque === "investida") {
        cores = { ...cores, o: piscar ? "#ffffff" : "#ff5a3c" };
    }
    if (avisando && (matriarca.proximoAtaque === "ovos" || matriarca.proximoAtaque === "cuspe")) {
        cores = { ...cores, S: piscar ? "#b8ff3c" : MATRIARCA.cores.S };
    }
    if (avisando && matriarca.proximoAtaque === "chuva") {
        pincel.fillStyle = piscar ? "#ff3b6b" : "#8a1f3c";
        matriarca.alvosDaChuva.forEach(x => {
            pincel.fillRect(Math.round(x) - 2, 2 * TAMANHO_DO_BLOCO, 5, 1);
            pincel.fillRect(Math.round(x) - 1, 2 * TAMANHO_DO_BLOCO + 1, 3, 1);
            pincel.fillRect(Math.round(x), 2 * TAMANHO_DO_BLOCO + 2, 1, 1);
        });
    }

    const corUnica = matriarca.piscando > 0 ? "#ffffff" : null;
    const tremor = matriarca.estado === "despertando" ? Math.round(Math.sin(tempoTotal * 60)) : 0;
    desenharSprite(MATRIARCA.sprite, cores, matriarca.x + tremor, matriarca.y, matriarca.olhandoPara < 0, corUnica);
}

// A barra da extração, sobre a cabeça do soldado, enquanto ele segura ↑.
function desenharExtracao() {
    if (tempoSegurandoExtracao <= 0) {
        return;
    }
    const x = Math.round(soldado.x) - 3;
    const y = Math.round(soldado.y) - 5;
    pincel.fillStyle = "#1d2638";
    pincel.fillRect(x, y, 12, 2);
    pincel.fillStyle = "#3cf2ff";
    pincel.fillRect(x, y, Math.round(12 * tempoSegurandoExtracao / TEMPO_PARA_EXTRAIR), 2);
}

function desenharItens() {
    itens.forEach(item => {
        const ficha = ITENS[item.tipo];
        const flutua = ficha.interativo ? 0 : Math.round(Math.sin(tempoTotal * 3) * 0.6);
        let cores = ficha.cores;

        if (item.tipo === "modulo") {
            cores = { ...cores, M: RARIDADES[MODIFICACOES[item.modificacao].raridade].cor };
        }

        pincel.globalAlpha = item.usado ? 0.35 : 1;   // um evento já usado fica apagado
        desenharSprite(ficha.sprite, cores, item.x, item.y + flutua);
        pincel.globalAlpha = 1;
    });
}

function desenharAcido() {
    acido.forEach(gota => {
        pincel.fillStyle = ACIDO.cor;
        pincel.fillRect(Math.round(gota.x) - 1, Math.round(gota.y) - 1, 2, 2);
    });
}

/*
  A poça borbulha: alguns pixels sobem e descem com o relógio. Nos últimos
  0,5 s ela some aos poucos, avisando que vai acabar.
*/
function desenharPocas() {
    pocas.forEach(poca => {
        pincel.globalAlpha = Math.min(1, poca.vida / 0.5);
        pincel.fillStyle = "#4d8a1f";
        pincel.fillRect(Math.round(poca.x), Math.round(poca.y + 1), poca.largura, 1);
        pincel.fillStyle = ACIDO.cor;
        for (let i = 1; i < poca.largura; i += 3) {
            const bolha = Math.floor(tempoTotal * 6 + i) % 3 === 0 ? 1 : 0;
            pincel.fillRect(Math.round(poca.x) + i, Math.round(poca.y) + 1 - bolha, 1, 1);
        }
    });
    pincel.globalAlpha = 1;
}

/*
  O rastro é o mesmo sprite, todo numa cor só e meio transparente — mais
  apagado quanto mais velho. globalAlpha vale para tudo o que se pinta
  depois; por isso volta a 1 no fim.
*/
function desenharRastro() {
    rastro.forEach(copia => {
        pincel.globalAlpha = copia.vida / 0.15 * 0.5;
        desenharSprite(SPRITE_DO_SOLDADO, CORES_DO_SOLDADO, copia.x - 1, copia.y, copia.espelhado, "#3cf2ff");
    });
    pincel.globalAlpha = 1;
}

function desenharSprite(sprite, cores, x, y, espelhado = false, corUnica = null) {
    const inicioX = Math.round(x);
    const inicioY = Math.round(y);
    const largura = sprite[0].length;

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < largura; dx++) {
            const coluna = espelhado ? largura - 1 - dx : dx;
            const cor = cores[linhaDoDesenho[coluna]];

            if (!cor) {
                continue;
            }

            pincel.fillStyle = corUnica || cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}


/*
  OS EFEITOS: pedidos de qualquer sistema (combate, Matriarca), que
  passam pelas opções antes de acontecer.
*/
function tremer(intensidade) {
    if (!opcoes.efeitosReduzidos) {
        tremor = Math.max(tremor, intensidade);
    }
}

function mostrarDano(x, y, dano) {
    if (opcoes.numerosDeDano) {
        numerosDeDano.push({ x, y: y - 4, valor: Math.max(1, Math.round(dano)), cor: "#ffffff", vida: 0.6 });
    }
}

function atualizarEfeitos(tempo) {
    tremor = Math.max(0, tremor - tempo * 20);
    numerosDeDano.forEach(numero => {
        numero.y -= 18 * tempo;
        numero.vida -= tempo;
    });
    numerosDeDano = numerosDeDano.filter(numero => numero.vida > 0);
}
