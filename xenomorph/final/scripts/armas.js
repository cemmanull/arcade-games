/*
  ============================================================
  XENOMORPH — AS ARMAS
  ============================================================

  Mirar em oito direções, a cadência, o leque, a recarga, os tiros que
  andam em pedaços, o ricochete — e a FICHA EM USO, que passa a ficha da
  tabela pela modificação encaixada.
*/


// ============================================================
// AS ARMAS
// ============================================================
function armaAtiva() {
    return equipamento.armas[equipamento.ativa];
}

/*
  A FICHA EM USO: a da tabela, passada pela modificação encaixada (se
  houver). Quem atira pergunta sempre por aqui — e nunca sabe se a arma
  está modificada.
*/
function fichaDaArma(arma) {
    const ficha = ARMAS[arma.tipo];
    return arma.modificacao ? MODIFICACOES[arma.modificacao].aplicar(ficha) : ficha;
}

/*
  MIRAR É UM VETOR.

  As setas dão uma intenção em cada eixo (-1, 0 ou 1). Juntas, apontam
  para uma das oito direções — e, como no Shoot 'em up, a diagonal é
  NORMALIZADA (dividida pelo comprimento), para o tiro diagonal não sair
  mais rápido que o reto.

  Sem nenhuma seta, atira-se para onde o soldado olha. E para baixo só no
  ar: no chão, ↓ é o começo de "descer da plataforma", não de atirar no
  próprio pé.
*/
function direcaoDaMira() {
    const horizontal = intencaoHorizontal();
    let vertical = 0;

    if (acao("cima")) vertical -= 1;
    if (acao("baixo") && !soldado.noChao) vertical += 1;

    if (horizontal === 0 && vertical === 0) {
        return { x: soldado.olhandoPara, y: 0 };
    }

    const comprimento = Math.hypot(horizontal, vertical);
    return { x: horizontal / comprimento, y: vertical / comprimento };
}

/*
  De onde sai o tiro: do ombro, na altura do peito, um pouco à frente na
  direção da mira. É também de onde a arma é desenhada.
*/
function ombro() {
    return {
        x: soldado.x + soldado.largura / 2,
        y: soldado.y + 6
    };
}

/*
  A CADÊNCIA, com o acumulador do Shoot 'em up: cada disparo empurra a
  espera para a frente em `intervalo`; com o gatilho solto, a espera não
  acumula crédito (não fica negativa), e o primeiro tiro sai na hora.

  Sem munição, não atira: começa a recarregar sozinha.
*/
function atirar(tempo) {
    const arma = armaAtiva();
    const ficha = fichaDaArma(arma);

    esperaDoProximoTiro -= tempo;

    if (!acao("atirar") || soldado.esquiva > 0 || estado !== "jogando") {
        esperaDoProximoTiro = Math.max(esperaDoProximoTiro, 0);
        return;
    }

    if (arma.recarregando > 0) {
        return;
    }

    if (arma.municao === 0) {
        comecarRecarga(arma);
        return;
    }

    if (esperaDoProximoTiro > 0) {
        return;
    }

    disparar(ficha, direcaoDaMira());
    tocarSom(ficha.projeteis > 1 ? SONS.espingarda : SONS.tiro);
    arma.municao -= 1;
    esperaDoProximoTiro += ficha.intervalo;

    if (arma.municao === 0) {
        comecarRecarga(arma);   // o último tiro já puxa o pente novo
    }

    atualizarPainel();
}

/*
  UM DISPARO, para qualquer ficha. O leque é o do Shoot 'em up: os
  projéteis espalhados por igual dentro da `abertura`, centrados na mira.
  Com um projétil só, a conta dá desvio zero — o rifle não é um caso
  especial, é um leque de um.

  Cada projétil leva consigo o que precisa para viver sozinho: a
  velocidade, o dano, quanto ainda pode voar e a cor. Depois de criado,
  ninguém mais consulta a ficha.
*/
function disparar(ficha, mira) {
    const origem = ombro();
    const anguloDaMira = Math.atan2(mira.y, mira.x);

    for (let i = 0; i < ficha.projeteis; i++) {
        const posicaoNoLeque = ficha.projeteis === 1 ? 0 : i / (ficha.projeteis - 1) - 0.5;
        const erro = (Math.random() - 0.5) * 2 * ficha.desvio;
        const angulo = anguloDaMira + posicaoNoLeque * ficha.abertura + erro;

        tiros.push({
            x: origem.x + mira.x * 5,
            y: origem.y + mira.y * 5,
            vx: Math.cos(angulo) * ficha.rapidez,
            vy: Math.sin(angulo) * ficha.rapidez,
            dano: ficha.dano * soldado.multiplicadorDeDano,
            alcanceRestante: ficha.alcance,
            empurrao: ficha.empurrao,
            perfura: ficha.perfura,
            atingidas: new Set(),   // quem este projétil já atravessou: não fere duas vezes

            // Os efeitos das modificações (dados/armas.js); "??" dá o valor de "nenhum" a quem não tem.
            ricochetes: ficha.ricochetes ?? 0,
            congela: ficha.congela ?? 0,
            curaPorAbate: ficha.curaPorAbate ?? 0,
            explosaoAoAbater: ficha.explosaoAoAbater ?? null,
            arma: armaAtiva().tipo,
            cor: ficha.cor,
            acertou: false
        });
    }

    // O recuo empurra só na horizontal: um coice, não um voo.
    soldado.vx -= mira.x * ficha.recuo;
    tempoDoClarao = DURACAO_DO_CLARAO;
}

/*
  A RECARGA é um temporizador da ARMA, não do soldado: cada arma lembra
  da sua. Trocar de arma no meio da recarga a CANCELA — o pente continua
  como estava. É uma escolha de projeto: trocar vira uma decisão com
  custo, e não um jeito de recarregar de graça.
*/
function comecarRecarga(arma) {
    const ficha = ARMAS[arma.tipo];

    if (arma.recarregando > 0 || arma.municao === tamanhoDoPente(arma.tipo)) {
        return;
    }

    arma.recarregando = ficha.tempoDeRecarga;
    atualizarPainel();
}

function atualizarRecarga(tempo) {
    const arma = armaAtiva();

    if (arma.recarregando <= 0) {
        return;
    }

    arma.recarregando = Math.max(0, arma.recarregando - tempo);
    barraDeRecarga.value = 1 - arma.recarregando / ARMAS[arma.tipo].tempoDeRecarga;

    if (arma.recarregando === 0) {
        arma.municao = tamanhoDoPente(arma.tipo);
        atualizarPainel();
    }
}

function trocarDeArma() {
    armaAtiva().recarregando = 0;
    equipamento.ativa = (equipamento.ativa + 1) % equipamento.armas.length;
    esperaDoProximoTiro = 0;
    atualizarPainel();
}

/*
  OS TIROS ANDAM EM PEDAÇOS, pela mesma razão que o soldado (passo 2): a
  300 px/s, um quadro lento anda 15 pixels, e um tiro inteiro poderia
  pular uma parede de 8. Cada pedaço tem no máximo meio bloco, e depois
  de cada um o tiro pergunta: entrei num bloco sólido? acertei uma criatura?

  O tiro é um PONTO (x, y é o centro): pequeno demais para ser caixa. As
  plataformas de mão única não o seguram — elas só seguram pés.

  Um tiro que acerta alguma coisa é MARCADO (`acertou`); a lista só é
  filtrada no fim, fora do laço — nunca se mexe na lista que se percorre.
*/
function moverTiros(tempo) {
    tiros.forEach(tiro => {
        const rapidez = Math.hypot(tiro.vx, tiro.vy);
        let restante = rapidez * tempo;

        while (restante > 0 && !tiro.acertou) {
            const pedaco = Math.min(restante, PASSO_MAXIMO);
            const direcaoX = tiro.vx / rapidez;
            const direcaoY = tiro.vy / rapidez;
            restante -= pedaco;
            tiro.alcanceRestante -= pedaco;
            tiro.x += direcaoX * pedaco;
            tiro.y += direcaoY * pedaco;

            if (ehSolido(Math.floor(tiro.x / TAMANHO_DO_BLOCO), Math.floor(tiro.y / TAMANHO_DO_BLOCO))) {
                if (tiro.ricochetes > 0) {
                    ricochetear(tiro, direcaoX * pedaco, direcaoY * pedaco);
                } else {
                    tiro.acertou = true;
                    soltarFaiscas(tiro.x - direcaoX * 2, tiro.y - direcaoY * 2, tiro.cor, 4);
                }
            } else {
                acertarCriaturas(tiro);
                if (!tiro.acertou) {
                    acertarMatriarca(tiro);
                }
            }
        }

        if (foraDaTela(tiro)) {
            tiro.acertou = true;   // passou pela porta: some (tiros não viajam entre salas)
        }

        if (tiro.alcanceRestante <= 0 && !tiro.acertou) {
            tiro.acertou = true;
            soltarFaiscas(tiro.x, tiro.y, tiro.cor, 2);   // o tiro se dissipa no ar
        }
    });

    tiros = tiros.filter(tiro => !tiro.acertou);
}

/*
  O RICOCHETE: o projétil volta para onde estava antes do pedaço que o
  levou para dentro da parede, e descobre QUAL parede bateu perguntando
  pelos dois eixos separados — a mesma ideia da colisão do soldado
  (passo 2). Parede de pé inverte o x; chão ou teto, o y.
*/
function ricochetear(tiro, andouX, andouY) {
    tiro.x -= andouX;
    tiro.y -= andouY;

    const coluna = x => Math.floor(x / TAMANHO_DO_BLOCO);
    const linha = y => Math.floor(y / TAMANHO_DO_BLOCO);
    const bateuDeLado = ehSolido(coluna(tiro.x + andouX), linha(tiro.y));
    const bateuEmCimaOuEmbaixo = ehSolido(coluna(tiro.x), linha(tiro.y + andouY));

    if (bateuDeLado || !bateuEmCimaOuEmbaixo) tiro.vx = -tiro.vx;
    if (bateuEmCimaOuEmbaixo || !bateuDeLado) tiro.vy = -tiro.vy;

    tiro.ricochetes -= 1;
    soltarFaiscas(tiro.x, tiro.y, tiro.cor, 2);
}

function contemPonto(caixa, x, y) {
    return x >= caixa.x && x < caixa.x + caixa.largura
        && y >= caixa.y && y < caixa.y + caixa.altura;
}

/*
  AS PARTÍCULAS, como no Shoot 'em up: nascem num ponto com velocidades
  sorteadas, caem um pouco, e morrem sozinhas. Não colidem com nada —
  ninguém repara, e custaria caro.
*/
function soltarFaiscas(x, y, cor, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const rapidez = 20 + Math.random() * 60;

        particulas.push({
            x, y,
            vx: Math.cos(angulo) * rapidez,
            vy: Math.sin(angulo) * rapidez - 20,
            vida: 0.2 + Math.random() * 0.25,
            cor
        });
    }
}

function atualizarParticulas(tempo) {
    particulas.forEach(particula => {
        particula.vy += 300 * tempo;
        particula.x += particula.vx * tempo;
        particula.y += particula.vy * tempo;
        particula.vida -= tempo;
    });
    particulas = particulas.filter(particula => particula.vida > 0);
}
