/*
  ============================================================
  XENOMORPH — FERIR E SER FERIDO
  ============================================================

  O lugar único por onde passa toda ferida do soldado, os acertos nas
  criaturas (resistência, perfuração, congelamento) e os efeitos das
  modificações no abate.
*/


// ============================================================
// FERIR E SER FERIDO
// ============================================================
function sobrepoe(a, b) {
    return a.x < b.x + b.largura && a.x + a.largura > b.x
        && a.y < b.y + b.altura && a.y + a.altura > b.y;
}

/*
  Tocar uma criatura ou pisar numa poça fere. Uma ferida por vez: depois
  dela vem a invulnerabilidade, e enquanto ela durar nada mais fere — a
  "janela de invulnerabilidade" do Dealer? Out!, que impede uma criatura
  parada em cima do soldado de tirar toda a vida num segundo.
*/
function verificarContatos() {
    criaturas.forEach(criatura => {
        if (sobrepoe(criatura, soldado)) {
            ferirSoldado(CRIATURAS[criatura.especie].danoDeContato, centro(criatura).x);
        }
    });

    const matriarcaAcordada = matriarca !== null && !["dormindo", "morrendo", "morta"].includes(matriarca.estado);
    if (matriarcaAcordada && sobrepoe(matriarca, soldado)) {
        ferirSoldado(MATRIARCA.danoDeContato, centro(matriarca).x);
    }

    pocas.forEach(poca => {
        if (sobrepoe(poca, soldado)) {
            ferirSoldado(ACIDO.danoDaPoca, poca.x + poca.largura / 2);
        }
    });
}

/*
  A FERIDA, num lugar só: toda forma de se machucar passa por aqui, e é
  aqui que mora a regra "durante a esquiva e logo depois de uma ferida,
  nada fere". Se cada perigo tirasse vida por conta própria, cada um
  precisaria lembrar dessa regra.

  O empurrão joga o soldado para LONGE de quem o feriu, e um pouco para
  cima: quem apanha sente o golpe e ganha distância.
*/
function ferirSoldado(dano, deOndeVeioX) {
    if (soldado.invulneravel > 0 || soldado.esquiva > 0 || estado !== "jogando") {
        return;
    }

    soldado.vida = Math.max(0, soldado.vida - dano);
    soldado.invulneravel = DURACAO_DA_INVULNERABILIDADE;
    tocarSom(SONS.ferida);
    tremer(3);
    vibrar(80);

    const paraLonge = Math.sign(centro(soldado).x - deOndeVeioX) || -soldado.olhandoPara;
    soldado.vx = paraLonge * EMPURRAO_DA_FERIDA.x;
    soldado.vy = -EMPURRAO_DA_FERIDA.y;
    soldado.saltando = false;

    soltarFaiscas(centro(soldado).x, centro(soldado).y, "#ff5a3c", 6);
    atualizarPainel();

    if (soldado.vida === 0) {
        terminarPartida();
    }
}

/*
  Um tiro acerta a primeira criatura viva que contém o ponto. Além do
  dano, o EMPURRÃO da arma: a criatura fica atordoada por um instante e
  desliza para trás. A espingarda empurra três vezes mais que o rifle — as
  criaturas reagem às características da arma (GDD, seção 4).

  E levar um tiro ACORDA: um rastejador patrulhando passa a perseguir.
*/
function acertarCriaturas(tiro) {
    const alvo = criaturas.find(criatura =>
        criatura.vida > 0 && !tiro.atingidas.has(criatura) && contemPonto(criatura, tiro.x, tiro.y));

    if (!alvo) {
        return;
    }

    /*
      A RESISTÊNCIA: a criatura que nasceu resistente à arma deste tiro leva
      só metade. E todo dano é anotado por arma e por região — é desse
      registro que a evolução descobre "a arma mais usada" (ecossistema.js).
    */
    const fator = alvo.resistente === tiro.arma ? FATOR_DA_RESISTENCIA : 1;
    const dano = tiro.dano * fator;
    const danoNaRegiao = ecossistema.dano[salaAtual.regiao];
    danoNaRegiao[tiro.arma] = (danoNaRegiao[tiro.arma] || 0) + dano;

    /*
      PERFURAR: enquanto sobrar perfuração, o projétil segue — e lembra de
      quem já atravessou, para não ferir a mesma criatura em cada pedaço
      de movimento em que ainda está dentro dela.
    */
    if (tiro.perfura > 0) {
        tiro.perfura -= 1;
        tiro.atingidas.add(alvo);
    } else {
        tiro.acertou = true;
    }

    alvo.vida -= dano;
    alvo.piscando = 0.08;
    if (tiro.congela > 0) {
        alvo.lenta = tiro.congela;
    }
    mostrarDano(centro(alvo).x, alvo.y, dano);
    alvo.atordoada = 0.12;
    alvo.vx = Math.sign(tiro.vx) * tiro.empurrao;
    soltarFaiscas(tiro.x, tiro.y, CRIATURAS[alvo.especie].cores.C, 3);

    if (alvo.especie === "rastejador" && alvo.estado !== "perseguicao") {
        comecarPerseguicao(alvo);
    }

    if (alvo.vida <= 0) {
        const meio = centro(alvo);
        soltarFaiscas(meio.x, meio.y, CRIATURAS[alvo.especie].cores.C, 14);
        soltarFaiscas(meio.x, meio.y, ACIDO.cor, 6);

        // Filhotes (de ninho ou da Matriarca) não deixam amostras: senão, um ninho seria uma fazenda.
        if (alvo.mae === null) {
            soltarAmostras(meio, CRIATURAS[alvo.especie].amostras);
        }
        tocarSom(SONS.abate);
        aplicarEfeitosDoAbate(tiro, alvo);
    } else {
        tocarSom(SONS.acerto);
    }
}

/*
  Os efeitos das modificações épicas acontecem NO ABATE: o sifão devolve
  vida; a fragmentação fere as vizinhas — e uma vizinha que morre da
  explosão não explode de novo (a explosão não é um tiro com efeitos).
*/
function aplicarEfeitosDoAbate(tiro, abatida) {
    if (tiro.curaPorAbate > 0) {
        soldado.vida = Math.min(soldado.vidaMaxima, soldado.vida + tiro.curaPorAbate);
        atualizarPainel();
    }

    if (tiro.explosaoAoAbater) {
        const meio = centro(abatida);
        const { raio, dano } = tiro.explosaoAoAbater;
        soltarFaiscas(meio.x, meio.y, "#ff9f1c", 18);
        tremer(2);

        criaturas.forEach(vizinha => {
            const outro = centro(vizinha);
            if (vizinha !== abatida && vizinha.vida > 0 && Math.hypot(outro.x - meio.x, outro.y - meio.y) < raio) {
                vizinha.vida -= dano;
                vizinha.piscando = 0.08;
                mostrarDano(outro.x, vizinha.y, dano);
                if (vizinha.vida <= 0 && vizinha.mae === null) {
                    soltarAmostras(outro, CRIATURAS[vizinha.especie].amostras);
                }
            }
        });
    }
}

/*
  As amostras nascem espalhadas em volta de onde a criatura morreu, como
  itens comuns — e o ímã (verificarItens) as puxa para o soldado.
*/
function soltarAmostras(meio, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = (i / quantidade) * Math.PI * 2;
        const amostra = criarItem({ tipo: "amostra", coluna: 0, linha: 0 });
        amostra.x = meio.x + Math.cos(angulo) * 5 - 1;
        amostra.y = meio.y + Math.sin(angulo) * 3 - 1;
        itens.push(amostra);
    }
}
