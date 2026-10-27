/*
  ============================================================
  XENOMORPH — O ECOSSISTEMA
  ============================================================

  A evolução alienígena (GDD, seção 5): um relógio por região, o nível
  calculado da tabela, a regra de piedade, a resistência à arma mais
  usada e os reforços.
*/


// ============================================================
// O ECOSSISTEMA
// ============================================================
/*
  O relógio de cada região, e quanto dano cada arma já fez nela. Nasce
  zerado a cada expedição.
*/
function criarEcossistema() {
    return {
        tempo: { complexo: 0, floresta: 0 },
        dano: { complexo: {}, floresta: {} },
        sorteio: criarFluxo(mundo.semente, "evolucao")
    };
}

/*
  A REGRA DE PIEDADE: com pouca vida, o relógio da região anda pela
  metade. É a "dificuldade adaptativa baseada nos recursos disponíveis"
  do GDD — uma linha, e quem está mal ganha tempo.
*/
function atualizarEcossistema(tempo) {
    const ritmo = soldado.vida < soldado.vidaMaxima * 0.3 ? RITMO_COM_POUCA_VIDA : 1;
    const nivelAntes = nivelDaRegiao(salaAtual.regiao);

    ecossistema.tempo[salaAtual.regiao] += tempo * ritmo;

    const nivelDepois = nivelDaRegiao(salaAtual.regiao);
    if (nivelDepois !== nivelAntes) {
        mostrarAviso(`O ecossistema está ${nivelDepois.nome}`);
        atualizarPainel();
    }
}

// O nível é a última linha da tabela cujo `aPartirDe` já passou: calculado, nunca guardado.
function nivelDaRegiao(regiao) {
    return EVOLUCAO.filter(nivel => ecossistema.tempo[regiao] >= nivel.aPartirDe).pop();
}

function armaMaisUsada(regiao) {
    const danos = Object.entries(ecossistema.dano[regiao]);

    if (danos.length === 0) {
        return null;
    }
    return danos.reduce((maior, atual) => atual[1] > maior[1] ? atual : maior)[0];
}

/*
  Toda criatura que nasce passa por aqui: as do plano do gerador (na
  primeira visita à sala), as dos ninhos, os filhotes da Matriarca e os
  reforços. É o lugar único onde a evolução se aplica.
*/
function evoluir(criatura, regiao = salaAtual.regiao) {
    const nivel = nivelDaRegiao(regiao);

    criatura.vida = Math.round(criatura.vida * nivel.vida);
    criatura.mutada = nivel.vida > 1;
    criatura.resistente = nivel.resistencia ? armaMaisUsada(regiao) : null;
    return criatura;
}

/*
  OS REFORÇOS: no nível "agitado" em diante, entrar numa sala traz
  rastejadores novos, nos pontos marcados longe das portas. O sorteio de
  onde eles nascem usa um fluxo próprio ("evolucao") — os outros sistemas
  não sentem a diferença.
*/
function chamarReforcos(sala) {
    const nivel = nivelDaRegiao(sala.regiao);

    if (nivel.reforcos === 0 || ehPouso(sala) || sala.covil) {
        return;
    }

    const lugares = [];
    MODULOS[sala.modulo].linhas.forEach((texto, linha) => {
        [...texto].forEach((caractere, coluna) => {
            if (caractere === "*" && !pertoDeUmaPorta(sala, coluna, linha)) {
                lugares.push({ coluna, linha });
            }
        });
    });

    for (let i = 0; i < nivel.reforcos && lugares.length > 0; i++) {
        const lugar = escolher(ecossistema.sorteio, lugares);
        criaturas.push(evoluir(criarCriatura("rastejador", lugar, i % 2 === 0 ? -1 : 1), sala.regiao));
    }
}
