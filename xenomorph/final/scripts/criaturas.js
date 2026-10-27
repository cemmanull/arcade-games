/*
  ============================================================
  XENOMORPH — AS CRIATURAS
  ============================================================

  O motor de estados comum a todas as espécies, as perguntas que todas
  fazem (enxergar, ter chão à frente), os comportamentos de cada uma e o
  ninho. O congelamento desacelera o relógio de cada criatura.
*/


// ============================================================
// AS CRIATURAS
// ============================================================
/*
  Cada criatura nasce de uma anotação do gerador ({ especie, coluna,
  linha }), com um CORPO igual ao do soldado (x, y, largura, altura, vx,
  vy, noChao...) — é isso que deixa a mesma moverComColisao servir a todos.

  `lado` alterna entre -1 e 1, na ordem das anotações: é o lado do soldado
  que cada rastejador vai tentar ocupar.
*/
function criarCriatura(especie, marcador, lado) {
    const ficha = CRIATURAS[especie];

    return {
        especie,
        x: marcador.coluna * TAMANHO_DO_BLOCO + (TAMANHO_DO_BLOCO - ficha.largura) / 2,
        y: (marcador.linha + 1) * TAMANHO_DO_BLOCO - ficha.altura,
        largura: ficha.largura,
        altura: ficha.altura,
        vx: 0,
        vy: 0,
        noChao: false,
        bateuNaParede: false,
        atravessando: 0,
        olhandoPara: -1,

        vida: ficha.vida,
        estado: ficha.estadoInicial,
        tempoNoEstado: 0,
        piscando: 0,
        atordoada: 0,           // levando um empurrão: o comportamento espera
        lado,
        tempoSemVer: 0,
        ultimaPosicaoVista: null,
        recarga: 0,             // a espera da cuspidora entre um cuspe, e do ninho entre um filhote e outro
        mae: null,              // o ninho ou a Matriarca que pôs esta criatura
        lenta: 0,               // quanto falta do congelamento (modificação criogênica)
        mutada: false,          // nasceu com a vida aumentada pela evolução
        resistente: null        // o tipo de arma que fere esta criatura pela metade
    };
}

/*
  O MOTOR DE ESTADOS, igual para todas:

  1. o relógio do estado anda;
  2. o comportamento do estado atual decide (muda vx, cospe, troca de
     estado...) — a não ser que a criatura esteja atordoada por um tiro;
  3. a gravidade e a colisão, as mesmas do soldado.

  Os comportamentos moram numa tabela de tabelas: espécie → estado →
  função. Uma espécie nova é uma entrada nova; um estado novo, uma função
  nova. O motor não muda.
*/
const COMPORTAMENTOS = {
    rastejador: {
        patrulha: rastejadorPatrulha,
        perseguicao: rastejadorPersegue,
        investigacao: rastejadorInvestiga
    },
    saltador: {
        espreita: saltadorEspreita,
        preparo: saltadorPrepara,
        bote: saltadorSalta,
        recuperacao: saltadorSeRecupera
    },
    cuspidora: {
        vigia: cuspidoraVigia,
        mira: cuspidoraMira,
        recuo: cuspidoraRecua
    },
    ninho: {
        pulsando: ninhoPulsa
    }
};

function atualizarCriaturas(tempo) {
    criaturas.forEach(criatura => {
        const ficha = CRIATURAS[criatura.especie];

        /*
          O CONGELAMENTO desacelera o RELÓGIO da criatura, não a velocidade:
          tudo o que ela faz — andar, cair, esperar, mirar — acontece com
          40% do tempo. A ideia dos poderes do Dealer? Out!, numa criatura.
          (Multiplicar só o vx não serviria: o bote do saltador define o vx
          uma vez e depois o deixa em paz.)
        */
        criatura.lenta = Math.max(0, criatura.lenta - tempo);
        const tempoDela = criatura.lenta > 0 ? tempo * RITMO_DA_CRIATURA_LENTA : tempo;

        criatura.tempoNoEstado += tempoDela;
        criatura.piscando = Math.max(0, criatura.piscando - tempo);
        criatura.atordoada = Math.max(0, criatura.atordoada - tempoDela);
        criatura.recarga = Math.max(0, criatura.recarga - tempoDela);

        if (criatura.atordoada > 0) {
            criatura.vx = aproximar(criatura.vx, 0, 400 * tempoDela);
        } else {
            COMPORTAMENTOS[criatura.especie][criatura.estado](criatura, ficha, tempoDela);
        }

        cair(criatura, tempoDela, FISICA.gravidade);
        moverComColisao(criatura, tempoDela);
        prenderNaSala(criatura);
    });

    criaturas = criaturas.filter(criatura => criatura.vida > 0);
}

/*
  Trocar de estado é SEMPRE por aqui: assim é impossível esquecer de zerar
  o relógio do estado (a lição do chefe no Shoot 'em up).
*/
function mudarEstado(criatura, novoEstado) {
    criatura.estado = novoEstado;
    criatura.tempoNoEstado = 0;

    // Os estados de AVISO soam: o ouvido avisa antes do olho (GDD, seção 10: "ataques perigosos").
    if (novoEstado === "preparo" || novoEstado === "mira") {
        tocarSom(SONS.aviso);
    }
}

// ---------- Perguntas que todas fazem ----------
function centro(corpo) {
    return { x: corpo.x + corpo.largura / 2, y: corpo.y + corpo.altura / 2 };
}

function distanciaAteOSoldado(criatura) {
    const a = centro(criatura);
    const b = centro(soldado);
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function ladoDoSoldado(criatura) {
    return Math.sign(centro(soldado).x - centro(criatura).x) || 1;
}

/*
  ENXERGAR = perto o bastante E nada sólido no caminho.

  O caminho é conferido em pontos a cada 4 pixels, do olho da criatura ao
  centro do soldado — os mesmos pedaços de meio bloco dos tiros. As
  plataformas de grade não tapam a vista (não são `solido`): a tabela de
  blocos respondendo mais uma pergunta.
*/
function enxerga(criatura, ficha) {
    if (distanciaAteOSoldado(criatura) > ficha.visao) {
        return false;
    }
    return caminhoLivre(centro(criatura), centro(soldado));
}

function caminhoLivre(de, ate) {
    const distancia = Math.hypot(ate.x - de.x, ate.y - de.y);
    const pedacos = Math.ceil(distancia / PASSO_MAXIMO);

    for (let i = 1; i < pedacos; i++) {
        const x = de.x + (ate.x - de.x) * i / pedacos;
        const y = de.y + (ate.y - de.y) * i / pedacos;

        if (ehSolido(Math.floor(x / TAMANHO_DO_BLOCO), Math.floor(y / TAMANHO_DO_BLOCO))) {
            return false;
        }
    }
    return true;
}

/*
  Há chão logo à frente? Olha o bloco abaixo do primeiro pixel depois da
  borda da frente. Plataforma conta como chão.
*/
function temChaoAFrente(corpo, direcao) {
    const xDaFrente = direcao > 0 ? corpo.x + corpo.largura : corpo.x - 1;
    const coluna = Math.floor(xDaFrente / TAMANHO_DO_BLOCO);
    const linha = Math.floor((corpo.y + corpo.altura + 1) / TAMANHO_DO_BLOCO);
    const bloco = blocoEm(coluna, linha);

    return bloco.solido || bloco.plataforma;
}

function andar(criatura, direcao, rapidez) {
    criatura.olhandoPara = direcao;
    criatura.vx = direcao * rapidez;
}

// ---------- O rastejador ----------
/*
  PATRULHA: anda devagar e dá meia-volta na parede ou na beirada. Vendo o
  soldado, persegue.
*/
function rastejadorPatrulha(criatura, ficha) {
    if (criatura.noChao && (criatura.bateuNaParede || !temChaoAFrente(criatura, criatura.olhandoPara))) {
        criatura.olhandoPara *= -1;
    }

    andar(criatura, criatura.olhandoPara, ficha.velocidade);

    if (enxerga(criatura, ficha)) {
        comecarPerseguicao(criatura);
    }
}

function comecarPerseguicao(criatura) {
    criatura.ultimaPosicaoVista = centro(soldado);
    criatura.tempoSemVer = 0;
    mudarEstado(criatura, "perseguicao");
}

/*
  PERSEGUIÇÃO, com o truque do Pac-Man: o alvo NÃO é o soldado, é um
  ponto ao LADO dele — à esquerda para uns, à direita para outros
  (`lado`). Um grupo que vem todo pela esquerda se divide sozinho: metade
  passa por baixo dele para chegar ao lado direito. Ninguém combinou nada;
  cada um só segue a sua regra, e o soldado se vê cercado.

  Bateu num degrau correndo? Um pulinho. Perdeu o soldado de vista por
  mais que a `paciencia`? Vai investigar onde o viu pela última vez.
*/
function rastejadorPersegue(criatura, ficha, tempo) {
    if (enxerga(criatura, ficha)) {
        criatura.tempoSemVer = 0;
        criatura.ultimaPosicaoVista = centro(soldado);
    } else {
        criatura.tempoSemVer += tempo;
    }

    if (criatura.tempoSemVer > ficha.paciencia) {
        mudarEstado(criatura, "investigacao");
        return;
    }

    const alvoX = criatura.ultimaPosicaoVista.x + criatura.lado * 5;
    const distancia = alvoX - centro(criatura).x;

    if (Math.abs(distancia) < 1) {
        criatura.vx = 0;
    } else {
        andar(criatura, Math.sign(distancia), ficha.velocidadeDePerseguicao);
    }

    if (criatura.bateuNaParede && criatura.noChao) {
        criatura.vy = -ficha.impulsoDoPulinho;
    }
}

/*
  INVESTIGAÇÃO: vai até onde viu o soldado pela última vez. Chegou, ou
  cansou (3 s)? Volta a patrulhar. Viu de novo? Persegue.
*/
function rastejadorInvestiga(criatura, ficha) {
    if (enxerga(criatura, ficha)) {
        comecarPerseguicao(criatura);
        return;
    }

    const distancia = criatura.ultimaPosicaoVista.x - centro(criatura).x;

    if (Math.abs(distancia) < 4 || criatura.tempoNoEstado > 3 || criatura.bateuNaParede) {
        criatura.tempoSemVer = 0;
        mudarEstado(criatura, "patrulha");
        return;
    }

    andar(criatura, Math.sign(distancia), ficha.velocidade);
}

// ---------- O saltador ----------
function saltadorEspreita(criatura, ficha) {
    criatura.vx = 0;

    if (enxerga(criatura, ficha) && criatura.noChao) {
        criatura.olhandoPara = ladoDoSoldado(criatura);
        mudarEstado(criatura, "preparo");
    }
}

/*
  PREPARO: o AVISO. Agachado, parado, por 0,45 s. É o "telegrafar" do
  chefe do Shoot 'em up, numa criatura comum: quem presta atenção tem
  tempo de esquivar.
*/
function saltadorPrepara(criatura, ficha) {
    criatura.vx = 0;
    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (criatura.tempoNoEstado >= ficha.tempoDePreparo) {
        lancarBote(criatura, ficha);
        mudarEstado(criatura, "bote");
    }
}

/*
  O BOTE É UMA PARÁBOLA CALCULADA.

  Quer-se cair onde o soldado está, em T segundos. Sem nada no caminho, a
  física diz:

      x(T) = x + vx·T                 →  vx = dx / T
      y(T) = y + vy·T + g·T²/2        →  vy = dy / T − g·T / 2

  Com dy = 0 (mesma altura) e T = 0,6 s, vy = −270: um arco que sobe uns
  40 pixels. É por isso que as criaturas usam uma gravidade só — com duas,
  esta conta não fecharia.

  O alvo é onde o soldado ESTAVA no fim do aviso. Quem se mexe durante o
  voo não é acertado: a parábola não corrige o rumo no ar.
*/
function lancarBote(criatura, ficha) {
    const tempoDeVoo = ficha.tempoDeVoo;
    const dx = centro(soldado).x - centro(criatura).x;
    const dy = (soldado.y + soldado.altura) - (criatura.y + criatura.altura);

    criatura.vx = limitar(dx / tempoDeVoo, -ficha.rapidezMaximaDoBote, ficha.rapidezMaximaDoBote);
    criatura.vy = dy / tempoDeVoo - FISICA.gravidade * tempoDeVoo / 2;
}

function saltadorSalta(criatura) {
    // No ar, quem manda é a física. Só se espera o pouso.
    if (criatura.noChao && criatura.tempoNoEstado > 0.1) {
        criatura.vx = 0;
        mudarEstado(criatura, "recuperacao");
    }
}

function saltadorSeRecupera(criatura, ficha) {
    criatura.vx = 0;

    if (criatura.tempoNoEstado >= ficha.tempoDeRecuperacao) {
        mudarEstado(criatura, "espreita");
    }
}

// ---------- A cuspidora ----------
function cuspidoraVigia(criatura, ficha) {
    criatura.vx = 0;

    if (!enxerga(criatura, ficha)) {
        return;
    }

    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (distanciaAteOSoldado(criatura) < ficha.distanciaSegura) {
        mudarEstado(criatura, "recuo");
    } else if (criatura.recarga === 0) {
        mudarEstado(criatura, "mira");
    }
}

function cuspidoraMira(criatura, ficha) {
    criatura.vx = 0;
    criatura.olhandoPara = ladoDoSoldado(criatura);

    if (criatura.tempoNoEstado >= ficha.tempoDeMira) {
        cuspir(criatura, ficha);
        criatura.recarga = ficha.intervaloEntreCuspes;
        mudarEstado(criatura, "vigia");
    }
}

/*
  RECUO: anda para longe do soldado por meio segundo — se houver chão. Sem
  chão atrás, fica onde está: uma cuspidora não se joga de uma plataforma.
*/
function cuspidoraRecua(criatura, ficha) {
    const paraLonge = -ladoDoSoldado(criatura);

    if (temChaoAFrente(criatura, paraLonge)) {
        criatura.vx = paraLonge * ficha.velocidadeDeRecuo;
    } else {
        criatura.vx = 0;
    }
    criatura.olhandoPara = -paraLonge;

    if (criatura.tempoNoEstado > 0.6) {
        mudarEstado(criatura, "vigia");
    }
}

/*
  O cuspe usa a MESMA conta do bote do saltador, com a gravidade do ácido
  e mirando nos pés do soldado. Mesmo errando, o ácido cai perto — e vira
  poça bem onde o soldado queria ficar.
*/
function cuspir(criatura, ficha) {
    const tempoDeVoo = ficha.tempoDeVooDoCuspe;
    const origem = { x: centro(criatura).x, y: criatura.y + 2 };
    const alvo = { x: centro(soldado).x, y: soldado.y + soldado.altura - 2 };

    acido.push({
        x: origem.x,
        y: origem.y,
        vx: (alvo.x - origem.x) / tempoDeVoo,
        vy: (alvo.y - origem.y) / tempoDeVoo - ACIDO.gravidade * tempoDeVoo / 2,
        acertou: false
    });
}

/*
  O ácido anda em pedaços (como os tiros) e cai (como os corpos). Acertou o
  soldado: fere. Acertou um bloco vindo de cima: vira poça EM CIMA dele.
  Acertou de lado ou por baixo: só respinga.
*/
function moverAcido(tempo) {
    acido.forEach(gota => {
        gota.vy += ACIDO.gravidade * tempo;
        let restante = Math.hypot(gota.vx, gota.vy) * tempo;
        const rapidez = Math.hypot(gota.vx, gota.vy);

        while (restante > 0 && !gota.acertou) {
            const pedaco = Math.min(restante, PASSO_MAXIMO);
            restante -= pedaco;
            gota.x += gota.vx / rapidez * pedaco;
            gota.y += gota.vy / rapidez * pedaco;

            const coluna = Math.floor(gota.x / TAMANHO_DO_BLOCO);
            const linha = Math.floor(gota.y / TAMANHO_DO_BLOCO);
            const bloco = blocoEm(coluna, linha);

            if (contemPonto(soldado, gota.x, gota.y)) {
                gota.acertou = true;
                ferirSoldado(ACIDO.dano, gota.x);
            } else if (bloco.solido || (bloco.plataforma && gota.vy > 0)) {
                gota.acertou = true;
                if (gota.vy > 0 && !blocoEm(coluna, linha - 1).solido) {
                    criarPoca(gota.x, linha * TAMANHO_DO_BLOCO);
                }
                soltarFaiscas(gota.x, gota.y - 2, ACIDO.cor, 5);
            }
        }
    });

    acido = acido.filter(gota => !gota.acertou && !foraDaTela(gota));
}

function criarPoca(x, superficie) {
    pocas.push({
        x: x - ACIDO.larguraDaPoca / 2,
        y: superficie - 2,
        largura: ACIDO.larguraDaPoca,
        altura: 2,
        vida: ACIDO.duracaoDaPoca
    });
}

function atualizarPocas(tempo) {
    pocas.forEach(poca => {
        poca.vida -= tempo;
    });
    pocas = pocas.filter(poca => poca.vida > 0);
}


// ============================================================
// O NINHO
// ============================================================
/*
  O ninho é uma criatura como as outras — tem ficha, vida, estado — que
  não anda: a cada intervalo, se tiver menos filhotes vivos que o máximo,
  solta um rastejador que já nasce perseguindo. Cada filhote lembra quem
  é a mãe (`mae`), e é assim que o ninho conta os seus.
*/
function ninhoPulsa(criatura, ficha) {
    criatura.vx = 0;

    if (criatura.recarga > 0) {
        return;
    }

    const filhotesVivos = criaturas.filter(outra => outra.mae === criatura && outra.vida > 0).length;

    if (filhotesVivos < ficha.maximoDeFilhotes) {
        const filhote = evoluir(criarCriatura("rastejador", { coluna: 0, linha: 0 }, filhotesVivos % 2 === 0 ? -1 : 1));
        filhote.x = centro(criatura).x - filhote.largura / 2;
        filhote.y = criatura.y + criatura.altura - filhote.altura;
        filhote.mae = criatura;
        comecarPerseguicao(filhote);
        criaturas.push(filhote);
        soltarFaiscas(centro(criatura).x, criatura.y, ficha.cores.e, 6);
    }

    criatura.recarga = ficha.intervaloEntreFilhotes;
}
