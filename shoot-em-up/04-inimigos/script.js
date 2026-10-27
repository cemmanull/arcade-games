/*
  SHOOT 'EM UP — PASSO 4: OS INIMIGOS

  Três tipos, num catálogo, como os catorze objetos do Dealer? Out!. A
  novidade está no jeito de MOVER.

  Até aqui, todo movimento do curso foi assim:

      posição += velocidade * tempo      (um passinho por quadro)

  Os inimigos usam outro jeito:

      posição = trajeto(tempo de vida)   (a posição É uma função do tempo)

  Cada tipo traz no catálogo uma FUNÇÃO que recebe há quanto tempo o
  inimigo existe e devolve onde ele está. Zigue-zague é um seno; parar e
  mergulhar é uma função em três trechos. Desenhar um caminho vira
  escrever uma conta — e a conta pode ser testada, lida e trocada sem
  mexer em mais nada.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
/*
  A nave como texto, como no Dealer? Out!: cada caractere é um pixel, o
  ponto é transparente, e um dicionário traduz letra em cor.
*/
const SPRITE_DA_NAVE = [
    "....#....",
    "...#c#...",
    "...#c#...",
    "..##c##..",
    ".#######.",
    "##.###.##",
    "#..###..#",
    "...f.f..."
];

const CORES_DA_NAVE = {
    "#": "#e8ecff",
    c: "#00f0ff",
    f: "#ff9f1c"
};

/*
  O CÉU EM CAMADAS, como dados.

  Estrelas distantes são poucas por pixel, apagadas e LENTAS; as próximas
  são claras e rápidas. É o que o olho usa para medir profundidade: o que
  está longe parece andar devagar (olhe pela janela de um ônibus — as
  montanhas quase não se mexem). Isso se chama PARALAXE.

  Três linhas de dados, uma por camada. Uma quarta camada é uma linha a
  mais.
*/
const CAMADAS_DO_CEU = [
    { quantidade: 40, velocidade: 6,  cor: "#1d2840" },
    { quantidade: 22, velocidade: 16, cor: "#45587a" },
    { quantidade: 10, velocidade: 40, cor: "#a8c4e0" }
];

const VELOCIDADE_DA_NAVE = 70;   // pixels por segundo, em QUALQUER direção

const VELOCIDADE_DO_TIRO = 180;      // para cima: negativo no y
const INTERVALO_ENTRE_TIROS = 0.125; // segundos: 8 tiros por segundo
const DURACAO_DO_CLARAO = 0.04;      // o brilho na ponta da nave ao atirar

/*
  O CATÁLOGO DOS INIMIGOS.

  Cada tipo: o desenho e o TRAJETO. O trajeto é uma função comum que
  recebe o inimigo (para saber de onde ele partiu) e o seu tempo de
  vida em segundos, e devolve { x, y }.

  Funções guardadas em objetos, como as reações da tabela do Dealer?
  Out!. Um tipo novo de inimigo é um item novo aqui — nenhum `if` no
  resto do programa precisa saber que ele existe.
*/
const INIMIGOS = {
    drone: {
        sprite: [
            ".#....#.",
            "########",
            "#.#..#.#",
            "########",
            ".##oo##.",
            "..#..#.."
        ],
        cores: { "#": "#ff3b6b", o: "#ffe14d" },

        // Reto para baixo, velocidade constante: uma reta.
        trajeto: (inimigo, t) => ({
            x: inimigo.origemX,
            y: inimigo.origemY + 35 * t
        })
    },

    onda: {
        sprite: [
            "..####..",
            ".#gggg#.",
            "##g##g##",
            "########",
            "#.#..#.#",
            "#......#"
        ],
        cores: { "#": "#4dff7a", g: "#e8ecff" },

        /*
          Desce devagar enquanto balança. Math.sin vai de -1 a 1 e volta,
          para sempre: multiplicado por 22, a nave oscila 22 pixels para
          cada lado. O 2.5 diz QUÃO RÁPIDO ela balança.
        */
        trajeto: (inimigo, t) => ({
            x: inimigo.origemX + Math.sin(t * 2.5) * 22,
            y: inimigo.origemY + 28 * t
        })
    },

    mergulhador: {
        sprite: [
            "#......#",
            "##....##",
            "#v####v#",
            ".######.",
            "..#vv#..",
            "...##..."
        ],
        cores: { "#": "#c46bff", v: "#ffffff" },

        /*
          Três trechos, um depois do outro:
            1. desce 50 pixels FREANDO (1 segundo);
            2. fica parado, encarando (0,8 segundo);
            3. mergulha ACELERANDO até sair da tela.

          Freando: 1 - (1 - t)² começa subindo rápido e chega a 1
          devagarinho. Acelerando: t² começa devagar e dispara. As duas
          são "curvas de suavização" (easing), e estão em toda animação
          que parece natural.
        */
        trajeto: (inimigo, t) => {
            if (t < 1) {
                return { x: inimigo.origemX, y: inimigo.origemY + 50 * (1 - (1 - t) ** 2) };
            }

            if (t < 1.8) {
                return { x: inimigo.origemX, y: inimigo.origemY + 50 };
            }

            const mergulho = t - 1.8;
            return { x: inimigo.origemX, y: inimigo.origemY + 50 + 160 * mergulho * mergulho };
        }
    }
};

const TIPOS_DE_INIMIGO = Object.keys(INIMIGOS);

const INTERVALO_MINIMO_ENTRE_INIMIGOS = 0.6;
const INTERVALO_MAXIMO_ENTRE_INIMIGOS = 1.3;

const COR_DO_TIRO = "#ffcc33";
const COR_DA_PONTA_DO_TIRO = "#ffffff";

const COR_FUNDO = "#04050d";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// 3. ESTADO
// ============================================================
/*
  x e y são o CENTRO da nave. A altura e a largura não são guardadas:
  são as do sprite, e o desenho as descobre sozinho.
*/
const nave = {
    x: tela.width / 2,
    y: tela.height - 20
};

/*
  Cada estrela guarda só onde ela estava NO INSTANTE ZERO. Sorteadas
  uma vez, no estado — nunca no desenho (a lição do Dealer? Out!).
*/
const estrelas = [];

CAMADAS_DO_CEU.forEach(camada => {
    for (let i = 0; i < camada.quantidade; i++) {
        estrelas.push({
            x: Math.floor(Math.random() * tela.width),
            yInicial: Math.random() * tela.height,
            camada: camada
        });
    }
});

/*
  O relógio do jogo: segundos desde o começo. É o único número que a
  rolagem precisa.
*/
let tempoTotal = 0;
let instanteDoQuadroAnterior = 0;

/*
  O painel de interruptores do Pong. As chaves são as teclas em minúsculo.
*/
const teclasPressionadas = {};

/*
  Os tiros vivos. Cada um: { x, y } — o centro. Todos sobem com a mesma
  velocidade, então ela não precisa ser guardada em cada tiro (ainda).
*/
let tiros = [];

/*
  A RECARGA: quanto falta para a arma poder atirar de novo.
  Zero (ou menos) = pronta.
*/
let recarga = 0;
let tempoDoClarao = 0;

/*
  Os inimigos vivos. Cada um guarda o tipo, DE ONDE partiu e HÁ QUANTO
  TEMPO existe. x e y são recalculados a partir disso a cada quadro.
*/
let inimigos = [];
let tempoParaOProximoInimigo = 0;


// ============================================================
// 4. TECLADO
// ============================================================
const TECLAS_DO_JOGO = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "];

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    teclasPressionadas[tecla] = true;

    // As setas rolariam a página: cancelamos só as do jogo.
    if (TECLAS_DO_JOGO.includes(tecla)) {
        evento.preventDefault();
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  A tecla que nunca é solta (Dealer? Out!, passo 2): com alt+tab no meio,
  o keyup acontece em outra janela. Ao perder o foco, soltamos tudo.
*/
window.addEventListener("blur", () => {
    for (const tecla in teclasPressionadas) {
        teclasPressionadas[tecla] = false;
    }
});

function estaPressionada(...teclas) {
    return teclas.some(tecla => teclasPressionadas[tecla] === true);
}


// ============================================================
// 5. O LOOP
// ============================================================
/*
  O loop do Pong, sem tirar nem pôr: requestAnimationFrame, delta time em
  segundos e o teto de 0,05 s.
*/
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    tempoTotal += tempo;
    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}


// ============================================================
// 6. ATUALIZAR
// ============================================================
/*
  A história de um quadro, de cima para baixo: a nave se move, atira, os
  tiros sobem, e os que saíram da tela vão embora.
*/
function atualizar(tempo) {
    moverNave(tempo);
    atirar(tempo);
    moverTiros(tempo);
    removerTirosQueSairam();

    gerarInimigos(tempo);
    moverInimigos(tempo);
    removerInimigosQueSairam();

    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
}

/*
  A CADÊNCIA.

  O mesmo acumulador do gerador de chuva do Dealer? Out!: desconta o
  tempo, dispara quando chega a zero, recarrega com += para a sobra não
  se perder. Com uma diferença:

      quando a tecla NÃO está presa, a recarga para em zero.

  Sem essa trava, a recarga continuaria descendo enquanto você não
  atira: -1, -2, -3... E ao apertar Espaço depois de três segundos
  parado, o `while` pagaria TODA a dívida de uma vez — 24 tiros num único
  quadro, empilhados no mesmo pixel. O gerador da chuva podia acumular
  porque nunca parava; uma arma para o tempo todo.

  > Um acumulador que pode ficar parado não pode acumular crédito.
*/
function atirar(tempo) {
    recarga -= tempo;

    if (!estaPressionada(" ")) {
        recarga = Math.max(recarga, 0);
        return;
    }

    while (recarga <= 0) {
        criarTiro();
        recarga += INTERVALO_ENTRE_TIROS;
    }
}

/*
  O tiro nasce na PONTA da nave — o centro menos metade da altura —, e
  não no centro. Nascer no centro faria o tiro aparecer "dentro" da nave
  por um quadro.
*/
function criarTiro() {
    tiros.push({
        x: nave.x,
        y: nave.y - SPRITE_DA_NAVE.length / 2
    });

    tempoDoClarao = DURACAO_DO_CLARAO;
}

function moverTiros(tempo) {
    tiros.forEach(tiro => {
        tiro.y -= VELOCIDADE_DO_TIRO * tempo;
    });
}

/*
  A limpeza do Dealer? Out!: filter monta uma lista nova só com quem
  ainda está na tela. Sem ela, nada muda na tela — e a lista cresce oito
  itens por segundo, para sempre.
*/
function removerTirosQueSairam() {
    tiros = tiros.filter(tiro => tiro.y > -4);
}

function moverNave(tempo) {
    /*
      A INTENÇÃO: -1, 0 ou 1 em cada eixo. Esquerda e direita juntas se
      anulam (0), o que é exatamente o que os dedos esperam.
    */
    let intencaoX = 0;
    let intencaoY = 0;

    if (estaPressionada("arrowleft", "a")) intencaoX -= 1;
    if (estaPressionada("arrowright", "d")) intencaoX += 1;
    if (estaPressionada("arrowup", "w")) intencaoY -= 1;
    if (estaPressionada("arrowdown", "s")) intencaoY += 1;

    /*
      NORMALIZAR.

      Com ← e ↑ juntas, a intenção é (-1, -1). O comprimento desse vetor
      não é 1: é a diagonal de um quadrado de lado 1, √2 ≈ 1,41
      (Pitágoras — o Math.hypot do Pong). Multiplicado pela velocidade,
      a nave andaria 41% mais rápido na diagonal.

      Dividir cada componente pelo comprimento faz o vetor ter tamanho 1
      sem mudar a direção. Isso é NORMALIZAR, e vai voltar no passo 6
      para mirar no jogador.

      O `if` evita dividir por zero quando nenhuma tecla está presa.
    */
    const comprimento = Math.hypot(intencaoX, intencaoY);

    if (comprimento > 0) {
        intencaoX /= comprimento;
        intencaoY /= comprimento;
    }

    nave.x += intencaoX * VELOCIDADE_DA_NAVE * tempo;
    nave.y += intencaoY * VELOCIDADE_DA_NAVE * tempo;

    /*
      O CLAMP do Pong, agora com o CENTRO: a nave pode chegar até metade
      do seu tamanho perto da borda, e não mais. É aqui que guardar o
      centro cobra a sua conta — e ela é pequena.
    */
    const meiaLargura = SPRITE_DA_NAVE[0].length / 2;
    const meiaAltura = SPRITE_DA_NAVE.length / 2;

    nave.x = Math.max(meiaLargura, Math.min(nave.x, tela.width - meiaLargura));
    nave.y = Math.max(meiaAltura, Math.min(nave.y, tela.height - meiaAltura));
}


// ============================================================
// 7. INIMIGOS
// ============================================================
/*
  O gerador da chuva do Dealer? Out!, com um intervalo sorteado a cada
  vez. (Ele nunca para, então aqui acumular crédito não é problema.)
*/
function gerarInimigos(tempo) {
    tempoParaOProximoInimigo -= tempo;

    while (tempoParaOProximoInimigo <= 0) {
        criarInimigo(sortear(TIPOS_DE_INIMIGO));

        tempoParaOProximoInimigo += INTERVALO_MINIMO_ENTRE_INIMIGOS +
            Math.random() * (INTERVALO_MAXIMO_ENTRE_INIMIGOS - INTERVALO_MINIMO_ENTRE_INIMIGOS);
    }
}

function sortear(lista) {
    return lista[Math.floor(Math.random() * lista.length)];
}

/*
  Nasce acima da tela (origemY negativa), para entrar deslizando. A
  margem lateral de 26 pixels deixa espaço para o balanço da onda.
*/
function criarInimigo(tipo) {
    const inimigo = {
        tipo: tipo,
        origemX: 26 + Math.random() * (tela.width - 52),
        origemY: -8,
        t: 0,
        x: 0,
        y: 0
    };

    posicionar(inimigo);
    inimigos.push(inimigo);
}

/*
  MOVER É PERGUNTAR AO TRAJETO.

  Só o relógio do inimigo anda (t += tempo). A posição não é somada:
  é substituída pelo que a função do catálogo responde. Não existe erro
  que se acumule quadro a quadro, nem velocidade guardada — o inimigo
  está, em cada instante, exatamente onde a conta diz.
*/
function moverInimigos(tempo) {
    inimigos.forEach(inimigo => {
        inimigo.t += tempo;
        posicionar(inimigo);
    });
}

function posicionar(inimigo) {
    const posicao = INIMIGOS[inimigo.tipo].trajeto(inimigo, inimigo.t);
    inimigo.x = posicao.x;
    inimigo.y = posicao.y;
}

function removerInimigosQueSairam() {
    inimigos = inimigos.filter(inimigo => inimigo.y < tela.height + 10);
}


// ============================================================
// 8. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharCeu();
    desenharInimigos();
    desenharTiros();
    desenharSprite(SPRITE_DA_NAVE, CORES_DA_NAVE, nave.x, nave.y);
    desenharClarao();
}

function desenharInimigos() {
    inimigos.forEach(inimigo => {
        const tipo = INIMIGOS[inimigo.tipo];
        desenharSprite(tipo.sprite, tipo.cores, inimigo.x, inimigo.y);
    });
}

/*
  Um tiro é um risco de 1x4 com a ponta branca. Não precisa de sprite:
  dois fillRect bastam.
*/
function desenharTiros() {
    tiros.forEach(tiro => {
        const x = Math.round(tiro.x - 0.5);
        const y = Math.round(tiro.y - 2);

        pincel.fillStyle = COR_DO_TIRO;
        pincel.fillRect(x, y, 1, 4);

        pincel.fillStyle = COR_DA_PONTA_DO_TIRO;
        pincel.fillRect(x, y, 1, 1);
    });
}

/*
  O clarão: um "+" branco na ponta da nave por 0,04 s. Quase nada — e
  sem ele o tiro parece sair do nada. Pequenos detalhes assim são o que
  faz uma arma "pesar" na mão.
*/
function desenharClarao() {
    if (tempoDoClarao <= 0) {
        return;
    }

    const x = Math.round(nave.x - 0.5);
    const y = Math.round(nave.y - SPRITE_DA_NAVE.length / 2 - 1);

    pincel.fillStyle = "#ffffff";
    pincel.fillRect(x - 1, y, 3, 1);
    pincel.fillRect(x, y - 1, 1, 3);
}

/*
  A ROLAGEM INFINITA, numa conta só:

      y = (yInicial + velocidade * tempoTotal) % altura da tela

  `velocidade * tempoTotal` é quanto a estrela já desceu desde o começo —
  pode passar de mil pixels. O `%` (resto da divisão) dobra esse número
  de volta para dentro da tela: 170 % 160 = 10. A estrela que sai por
  baixo reaparece em cima, para sempre, sem nenhum `if`.

  E nada foi guardado: dado o mesmo tempoTotal, o céu é sempre o mesmo.
  Pausar o relógio pausa o céu; voltar o relógio voltaria o céu.
*/
function desenharCeu() {
    estrelas.forEach(estrela => {
        const camada = estrela.camada;
        const y = (estrela.yInicial + camada.velocidade * tempoTotal) % tela.height;

        pincel.fillStyle = camada.cor;
        pincel.fillRect(estrela.x, Math.floor(y), 1, 1);
    });
}

/*
  O sprite é desenhado CENTRADO em (x, y): o canto é calculado aqui, e só
  aqui. É o único lugar do programa que precisa saber que o fillRect
  pensa em cantos.

  Math.round evita que um canto em 41,5 caia entre dois pixels e borre.
*/
function desenharSprite(sprite, cores, x, y) {
    const inicioX = Math.round(x - sprite[0].length / 2);
    const inicioY = Math.round(y - sprite.length / 2);

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < linhaDoDesenho.length; dx++) {
            const cor = cores[linhaDoDesenho[dx]];

            if (!cor) {
                continue;   // o "." não tem cor: transparente
            }

            pincel.fillStyle = cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}


// ============================================================
// 9. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
