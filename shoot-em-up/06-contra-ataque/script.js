/*
  SHOOT 'EM UP — PASSO 6: O CONTRA-ATAQUE

  Os inimigos atiram de volta. E atirar de volta é, no fundo, uma
  pergunta de geometria: em que DIREÇÃO?

  1. MIRAR
     A direção da nave, vista do inimigo, é a diferença entre os dois
     centros. Math.atan2 transforma essa diferença num ÂNGULO; cosseno e
     seno transformam o ângulo de volta numa velocidade.

  2. PADRÕES
     Com o ângulo na mão, um leque é o mesmo tiro repetido com o ângulo
     um pouco desviado para cada lado; um anel é o círculo inteiro
     dividido em partes iguais. Os padrões são funções numa tabela, e
     cada tipo de inimigo diz no catálogo qual usa.

  3. PERDER, COM JUSTIÇA
     Três vidas. Ao ser atingida, a nave fica invencível por dois
     segundos — e todas as balas da tela somem. Sem isso, renascer no meio
     de uma chuva de balas seria morrer duas vezes pelo mesmo erro.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
/*
  A nave como texto (passo 1 do GUIA): cada caractere é um pixel, o
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

  Funções guardadas em objetos, num catálogo (passo 4 do GUIA). Um tipo
  novo de inimigo é um item novo aqui — nenhum `if` no
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
        raio: 4,
        vida: 1,
        pontos: 100,

        // Um tiro mirado de vez em quando.
        ataque: { padrao: "mirado", primeiro: 0.8, intervalo: 1.8, velocidade: 55 },

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
        raio: 4,
        vida: 2,
        pontos: 150,

        // Um leque de 3, apontado para a nave.
        ataque: { padrao: "leque", primeiro: 1.2, intervalo: 2.4, velocidade: 45, quantidade: 3, abertura: 0.35 },

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
        raio: 4,
        vida: 2,
        pontos: 200,

        // Uma vez só, no instante em que para e encara: um leque largo de 5.
        ataque: { padrao: "leque", primeiro: 1.3, intervalo: 99, velocidade: 60, quantidade: 5, abertura: 0.3 },

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
    },

    /*
      Grande, lento e resistente: seis tiros. É ele que mostra para que
      servem a vida e o piscar.
    */
    blindado: {
        sprite: [
            "..######..",
            ".#oooooo#.",
            "##o####o##",
            "##########",
            "#.##..##.#",
            "#..#..#..#",
            ".##....##."
        ],
        cores: { "#": "#ff9f1c", o: "#ffe14d" },
        raio: 5,
        vida: 6,
        pontos: 500,

        // Um anel de 10 balas, girando um pouco a cada disparo.
        ataque: { padrao: "anel", primeiro: 1.5, intervalo: 2.2, velocidade: 35, quantidade: 10 },
        trajeto: (inimigo, t) => ({
            x: inimigo.origemX,
            y: inimigo.origemY + 16 * t
        })
    }
};

const TIPOS_DE_INIMIGO = Object.keys(INIMIGOS);

const INTERVALO_MINIMO_ENTRE_INIMIGOS = 0.6;
const INTERVALO_MAXIMO_ENTRE_INIMIGOS = 1.3;

/*
  OS RAIOS DE COLISÃO.

  O da nave é 2 — a nave desenhada tem 9 pixels de largura. Em jogos de
  nave isso é tradição: a parte que pode ser atingida é só o "miolo".
  Quando a tela se enche de balas (passo 6), é essa diferença que faz o
  jogador passar raspando e se sentir habilidoso, em vez de morrer
  encostando a asa num pixel e se sentir roubado.
*/
const RAIO_DA_NAVE = 2;
const RAIO_DO_TIRO = 2;
const RAIO_DA_BALA = 1.5;

const SPRITE_DA_BALA = [
    ".#.",
    "#o#",
    ".#."
];
const CORES_DA_BALA = { "#": "#ff3b6b", o: "#ffffff" };

const VIDAS_INICIAIS = 3;
const DURACAO_DA_INVENCIBILIDADE = 2;   // segundos piscando depois de ser atingida

/*
  Um inimigo não atira se estiver a menos disto ACIMA da nave. Bala
  disparada à queima-roupa não dá tempo de reagir: não é desafio, é
  sorteio.
*/
const DISTANCIA_MINIMA_PARA_ATIRAR = 30;

const DURACAO_DO_PISCAR = 0.06;   // o inimigo fica branco ao levar dano

const COR_DO_TIRO = "#ffcc33";
const COR_DA_PONTA_DO_TIRO = "#ffffff";

const COR_FUNDO = "#04050d";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoVidas = document.getElementById("vidas");
const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTexto = document.getElementById("mensagem-texto");
const botaoReiniciar = document.getElementById("botao-reiniciar");


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
  uma vez, no estado — nunca no desenho, ou o céu tremeria a cada quadro.
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
  Os tiros vivos. Cada um: { x, y, raio, morto } — o centro, o tamanho
  para a colisão, e a marca de quem já acertou alguém.
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

let particulas = [];

/*
  As balas dos inimigos. Diferente dos tiros da nave, cada uma tem a sua
  própria velocidade (vx, vy): saem em todas as direções.
*/
let balas = [];

let pontos = 0;
let vidas = VIDAS_INICIAIS;
let invencivel = 0;   // segundos restantes de invencibilidade

/*
  A máquina de estados do Pong, com dois estados por enquanto.
*/
let estado = "jogando";   // "jogando" | "fim"

let mostrarColisoes = false;   // H liga e desliga


// ============================================================
// 4. TECLADO
// ============================================================
const TECLAS_DO_JOGO = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "];

document.addEventListener("keydown", evento => {
    const tecla = evento.key.toLowerCase();
    teclasPressionadas[tecla] = true;

    if (tecla === "h" && !evento.repeat) {
        mostrarColisoes = !mostrarColisoes;
    }

    // As setas rolariam a página: cancelamos só as do jogo.
    if (TECLAS_DO_JOGO.includes(tecla)) {
        evento.preventDefault();
    }
});

document.addEventListener("keyup", evento => {
    teclasPressionadas[evento.key.toLowerCase()] = false;
});

/*
  A tecla que nunca é solta (Tetris, passo 8): com alt+tab no meio,
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

    /*
      O céu continua rolando no fim de jogo (tempoTotal sempre anda), mas
      o mundo só se atualiza durante a partida.
    */
    tempoTotal += tempo;

    if (estado === "jogando") {
        atualizar(tempo);
    }

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
    inimigosAtiram(tempo);
    moverBalas(tempo);

    verificarTirosContraInimigos();
    verificarNave();
    varrerOsMarcados();

    removerInimigosQueSairam();
    removerBalasQueSairam();
    atualizarParticulas(tempo);

    tempoDoClarao = Math.max(0, tempoDoClarao - tempo);
    invencivel = Math.max(0, invencivel - tempo);
}

/*
  A CADÊNCIA.

  O mesmo acumulador de tempo do Tetris (passo 3): desconta o
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
        y: nave.y - SPRITE_DA_NAVE.length / 2,
        raio: RAIO_DO_TIRO,
        morto: false
    });

    tempoDoClarao = DURACAO_DO_CLARAO;
}

function moverTiros(tempo) {
    tiros.forEach(tiro => {
        tiro.y -= VELOCIDADE_DO_TIRO * tempo;
    });
}

/*
  A limpeza (passo 3 do GUIA): filter monta uma lista nova só com quem
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
  O gerador de inimigos: o mesmo acumulador, com um intervalo sorteado a cada
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
        y: 0,
        raio: INIMIGOS[tipo].raio,
        vida: INIMIGOS[tipo].vida,
        piscando: 0,
        morto: false,

        // Quanto falta para o primeiro disparo (se o tipo atirar).
        tempoAteAtirar: INIMIGOS[tipo].ataque ? INIMIGOS[tipo].ataque.primeiro : Infinity
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
        inimigo.piscando = Math.max(0, inimigo.piscando - tempo);
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
// 8. O CONTRA-ATAQUE
// ============================================================
/*
  MIRAR: o ângulo da nave, visto de quem atira.

  A diferença entre os centros (dx, dy) aponta do atirador para a nave.
  Math.atan2(dy, dx) devolve o ÂNGULO dessa seta, em radianos, entre -π
  e π. (Repare na ordem: y primeiro. É a convenção da função.)

  Para um tiro só, bastaria normalizar (dx, dy), como a intenção do
  passo 2. Mas um leque precisa GIRAR a direção um pouco para cada lado
  — e girar é somar ao ângulo. Por isso o ângulo.
*/
function anguloAteANave(origem) {
    return Math.atan2(nave.y - origem.y, nave.x - origem.x);
}

/*
  Do ângulo de volta a uma velocidade: cosseno no x, seno no y, vezes a
  rapidez. A conta do saque do Pong.
*/
function dispararEmAngulo(origem, angulo, velocidade) {
    balas.push({
        x: origem.x,
        y: origem.y,
        vx: Math.cos(angulo) * velocidade,
        vy: Math.sin(angulo) * velocidade,
        raio: RAIO_DA_BALA,
        morto: false
    });
}

/*
  OS PADRÕES, como uma tabela de funções. Cada um recebe quem atira e a
  ficha de ataque do catálogo.
*/
const PADROES = {
    // Direto na nave.
    mirado: (atirador, ataque) => {
        dispararEmAngulo(atirador, anguloAteANave(atirador), ataque.velocidade);
    },

    /*
      LEQUE: o ângulo da nave no meio, e as outras balas desviadas para os
      dois lados. Com 5 balas, os desvios são -2, -1, 0, 1, 2 vezes a
      abertura: (i - (quantidade - 1) / 2) centraliza a contagem no zero.
    */
    leque: (atirador, ataque) => {
        const centro = anguloAteANave(atirador);

        for (let i = 0; i < ataque.quantidade; i++) {
            const desvio = (i - (ataque.quantidade - 1) / 2) * ataque.abertura;
            dispararEmAngulo(atirador, centro + desvio, ataque.velocidade);
        }
    },

    /*
      ANEL: o círculo inteiro (2π) dividido em partes iguais. Não mira em
      ninguém — e é por isso que assusta menos do que parece: tem sempre
      um vão.

      O ponto de partida gira com o tempo de vida do atirador, então dois
      anéis seguidos não saem iguais: os vãos mudam de lugar.
    */
    anel: (atirador, ataque) => {
        const passo = (Math.PI * 2) / ataque.quantidade;
        const giro = atirador.t * 0.7;

        for (let i = 0; i < ataque.quantidade; i++) {
            dispararEmAngulo(atirador, giro + i * passo, ataque.velocidade);
        }
    }
};

/*
  Cada inimigo com ataque tem o seu relógio, que desce e recarrega como a
  arma da nave. Mas só dispara de verdade se estiver dentro da tela e não
  perto demais da nave.
*/
function inimigosAtiram(tempo) {
    inimigos.forEach(inimigo => {
        const ataque = INIMIGOS[inimigo.tipo].ataque;

        if (!ataque) {
            return;
        }

        inimigo.tempoAteAtirar -= tempo;

        if (inimigo.tempoAteAtirar > 0) {
            return;
        }

        inimigo.tempoAteAtirar += ataque.intervalo;

        const naTela = inimigo.y > 0;
        const longeDaNave = inimigo.y < nave.y - DISTANCIA_MINIMA_PARA_ATIRAR;

        if (naTela && longeDaNave) {
            PADROES[ataque.padrao](inimigo, ataque);
        }
    });
}

function moverBalas(tempo) {
    balas.forEach(bala => {
        bala.x += bala.vx * tempo;
        bala.y += bala.vy * tempo;
    });
}

/*
  As balas saem por qualquer lado — inclusive por cima, as do anel.
  Uma margem de 4 pixels deixa a bala sumir inteira antes de ir embora.
*/
function removerBalasQueSairam() {
    balas = balas.filter(bala =>
        bala.x > -4 && bala.x < tela.width + 4 &&
        bala.y > -4 && bala.y < tela.height + 4
    );
}


// ============================================================
// 9. COLISÃO
// ============================================================
/*
  COLISÃO DE CÍRCULOS.

  Dois círculos se tocam quando a distância entre os centros é menor que
  a soma dos raios. A distância é Pitágoras: √(dx² + dy²).

  Mas raiz quadrada é desnecessária: se a < b (os dois positivos), então
  a² < b². Comparar os QUADRADOS dá a mesma resposta sem a raiz. Num
  teste que roda centenas de vezes por quadro, é o truque padrão.

  E repare que a função não sabe o que está comparando: tiro com inimigo,
  inimigo com nave, bala com nave (passo 6). Basta ter x, y e raio.
*/
function colidem(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const somaDosRaios = a.raio + b.raio;

    return dx * dx + dy * dy < somaDosRaios * somaDosRaios;
}

/*
  MUITOS CONTRA MUITOS: dois laços, um dentro do outro. Cada tiro é
  testado contra cada inimigo. Com 7 tiros e 8 inimigos, são 56 testes
  por quadro — nada para um computador.

  MARCAR, NÃO REMOVER. Quando um tiro acerta, ele não sai da lista: ganha
  `morto = true`. Por quê?

  - remover de uma lista no meio do laço que a percorre pula itens (a
    lição do splice, do Tetris, passo 6);
  - e o tiro marcado é PULADO no resto do laço: um tiro acerta um inimigo
    só. Sem isso, um tiro que passasse por dois inimigos sobrepostos
    mataria os dois.

  Depois que todos os pares foram testados, varrerOsMarcados limpa tudo
  de uma vez.
*/
function verificarTirosContraInimigos() {
    tiros.forEach(tiro => {
        for (const inimigo of inimigos) {
            if (tiro.morto) {
                return;   // este tiro já acertou alguém neste quadro
            }

            if (inimigo.morto || !colidem(tiro, inimigo)) {
                continue;
            }

            tiro.morto = true;
            ferirInimigo(inimigo);
        }
    });
}

function ferirInimigo(inimigo) {
    inimigo.vida -= 1;
    inimigo.piscando = DURACAO_DO_PISCAR;

    if (inimigo.vida > 0) {
        return;
    }

    inimigo.morto = true;
    pontos += INIMIGOS[inimigo.tipo].pontos;
    atualizarPlacar();
    explodir(inimigo.x, inimigo.y, INIMIGOS[inimigo.tipo].cores["#"], 14);
}

/*
  A nave contra o mundo: balas e inimigos. Invencível, nada a acerta.

  `some` para no PRIMEIRO acerto: uma bala e um inimigo no mesmo quadro
  custam UMA vida, não duas. (A regra "uma colisão, uma vida": passo 6 do GUIA.)
*/
function verificarNave() {
    if (invencivel > 0) {
        return;
    }

    const corpoDaNave = { x: nave.x, y: nave.y, raio: RAIO_DA_NAVE };

    const balaQueAcertou = balas.find(bala => colidem(bala, corpoDaNave));
    const inimigoQueBateu = inimigos.find(inimigo => !inimigo.morto && colidem(inimigo, corpoDaNave));

    if (!balaQueAcertou && !inimigoQueBateu) {
        return;
    }

    if (inimigoQueBateu) {
        inimigoQueBateu.morto = true;
        explodir(inimigoQueBateu.x, inimigoQueBateu.y, INIMIGOS[inimigoQueBateu.tipo].cores["#"], 14);
    }

    perderVida();
}

/*
  Perder uma vida, COM JUSTIÇA:

  - a nave explode e fica invencível por dois segundos, piscando;
  - TODAS as balas da tela somem. Renascer no meio da mesma chuva que
    acabou de te acertar seria morrer duas vezes pelo mesmo erro.

  As balas não somem em silêncio: cada uma vira uma faísca. O jogador vê
  o perigo indo embora, em vez de se perguntar para onde foi.
*/
function perderVida() {
    vidas -= 1;
    atualizarPlacar();
    explodir(nave.x, nave.y, "#ffcc33", 30);

    balas.forEach(bala => explodir(bala.x, bala.y, CORES_DA_BALA["#"], 1));
    balas = [];

    if (vidas <= 0) {
        terminarPartida();
        return;
    }

    invencivel = DURACAO_DA_INVENCIBILIDADE;
}

function varrerOsMarcados() {
    tiros = tiros.filter(tiro => !tiro.morto);
    inimigos = inimigos.filter(inimigo => !inimigo.morto);
}


// ============================================================
// 10. PARTÍCULAS
// ============================================================
/*
  A explosão é um sistema de partículas (passo 5 do GUIA): pontinhos que
  nascem juntos, saem em direções sorteadas e morrem com o tempo.

  A direção é um ÂNGULO sorteado, transformado em vetor com cosseno e
  seno — a mesma conta do saque do Pong. Cada partícula tem a sua
  rapidez, então a explosão não sai como um anel perfeito.
*/
function explodir(x, y, cor, quantidade) {
    for (let i = 0; i < quantidade; i++) {
        const angulo = Math.random() * Math.PI * 2;
        const rapidez = 20 + Math.random() * 50;

        particulas.push({
            x: x,
            y: y,
            vx: Math.cos(angulo) * rapidez,
            vy: Math.sin(angulo) * rapidez,
            vida: 0.25 + Math.random() * 0.35,
            cor: Math.random() < 0.3 ? "#ffffff" : cor
        });
    }
}

function atualizarParticulas(tempo) {
    particulas.forEach(particula => {
        particula.x += particula.vx * tempo;
        particula.y += particula.vy * tempo;
        particula.vida -= tempo;
    });

    particulas = particulas.filter(particula => particula.vida > 0);
}

function atualizarPlacar() {
    campoPontos.textContent = pontos;
    campoVidas.textContent = vidas;
}


// ============================================================
// 11. INÍCIO E FIM
// ============================================================
function terminarPartida() {
    estado = "fim";
    mensagemTexto.textContent = `${pontos} pontos`;
    camadaMensagem.hidden = false;
}

/*
  Reiniciar é pôr TODO o estado da partida de volta no começo, num lugar
  só. Esquecer uma lista aqui — as balas, por exemplo — faria a partida
  nova começar com as balas da anterior no ar.
*/
function iniciarPartida() {
    nave.x = tela.width / 2;
    nave.y = tela.height - 20;

    tiros = [];
    inimigos = [];
    balas = [];
    particulas = [];
    tempoParaOProximoInimigo = 1;
    recarga = 0;

    pontos = 0;
    vidas = VIDAS_INICIAIS;
    invencivel = 0;

    atualizarPlacar();
    camadaMensagem.hidden = true;
    estado = "jogando";

    // Sem isto, o Espaço (atirar) "clicaria" de novo no botão focado.
    botaoReiniciar.blur();
}

botaoReiniciar.addEventListener("click", iniciarPartida);


// ============================================================
// 12. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharCeu();
    desenharInimigos();
    desenharTiros();

    if (estado === "jogando") {
        desenharNave();
        desenharClarao();
    }

    desenharParticulas();
    desenharBalas();

    if (mostrarColisoes) {
        desenharColisoes();
    }
}

/*
  Invencível, a nave PISCA: some e volta 15 vezes por segundo. O truque
  da bola no saque do Pong — Math.floor(t * 15) % 2 alterna entre 0 e 1.
  Piscar diz "não te acertam agora" sem uma palavra.
*/
function desenharNave() {
    if (invencivel > 0 && Math.floor(invencivel * 15) % 2 === 0) {
        return;
    }

    desenharSprite(SPRITE_DA_NAVE, CORES_DA_NAVE, nave.x, nave.y);
}

/*
  As balas inimigas são desenhadas POR ÚLTIMO, por cima de tudo —
  inclusive das explosões. O que pode te matar nunca fica escondido atrás
  de enfeite.
*/
function desenharBalas() {
    balas.forEach(bala => desenharSprite(SPRITE_DA_BALA, CORES_DA_BALA, bala.x, bala.y));
}

function desenharParticulas() {
    particulas.forEach(particula => {
        pincel.fillStyle = particula.cor;
        pincel.fillRect(Math.round(particula.x), Math.round(particula.y), 1, 1);
    });
}

/*
  MOSTRAR O INVISÍVEL.

  A colisão acontece em círculos que ninguém vê. Quando ela parecer
  errada — "mas eu nem encostei!" —, a primeira coisa a fazer é
  desenhá-los. Toda ferramenta de jogo tem uma tecla assim; ela custa dez
  linhas e economiza horas.

  arc desenha um círculo pelo CENTRO e pelo raio — exatamente o que
  guardamos.
*/
function desenharColisoes() {
    pincel.strokeStyle = "#00ff66";
    pincel.lineWidth = 0.5;

    const circulos = [
        { x: nave.x, y: nave.y, raio: RAIO_DA_NAVE },
        ...tiros,
        ...inimigos,
        ...balas
    ];

    circulos.forEach(circulo => {
        pincel.beginPath();
        pincel.arc(circulo.x, circulo.y, circulo.raio, 0, Math.PI * 2);
        pincel.stroke();
    });
}

function desenharInimigos() {
    inimigos.forEach(inimigo => {
        const tipo = INIMIGOS[inimigo.tipo];

        // Levou dano agora há pouco: o mesmo sprite, todo branco.
        const corUnica = inimigo.piscando > 0 ? "#ffffff" : null;
        desenharSprite(tipo.sprite, tipo.cores, inimigo.x, inimigo.y, corUnica);
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

  `corUnica`, se vier, pinta todos os pixels de uma cor só — o inimigo
  que pisca branco ao levar dano, a nave vermelha ao bater. O desenho é
  o mesmo; só a tinta muda. O "= null" é o valor PADRÃO: quem não passa
  o quinto argumento recebe null, e as chamadas antigas continuam
  funcionando sem mudar nada.
*/
function desenharSprite(sprite, cores, x, y, corUnica = null) {
    const inicioX = Math.round(x - sprite[0].length / 2);
    const inicioY = Math.round(y - sprite.length / 2);

    sprite.forEach((linhaDoDesenho, dy) => {
        for (let dx = 0; dx < linhaDoDesenho.length; dx++) {
            const cor = cores[linhaDoDesenho[dx]];

            if (!cor) {
                continue;   // o "." não tem cor: transparente
            }

            pincel.fillStyle = corUnica || cor;
            pincel.fillRect(inicioX + dx, inicioY + dy, 1, 1);
        }
    });
}


// ============================================================
// 13. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
