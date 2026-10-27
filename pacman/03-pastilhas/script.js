/*
  PAC-MAN — PASSO 3: AS PASTILHAS

  O mapa deixa de ser só o lugar onde se anda: ele MUDA. Cada pastilha
  comida é um "." que vira " " dentro da matriz — a mesma ideia do poço
  do Tetris, onde a grade é o estado do jogo.

  Duas ideias pequenas e muito úteis:

  1. CONTAR UMA VEZ, DEPOIS SÓ DESCONTAR
     Quantas pastilhas faltam? Daria para varrer as 840 casas a cada
     quadro. Ou contar uma vez, no começo, e descontar uma a cada
     pastilha comida.

  2. RECOMEÇAR É LER O TEXTO DE NOVO
     O mapa original nunca foi alterado: o que muda é a CÓPIA. Para
     refazer o labirinto, basta criar outra cópia a partir do texto.
*/


// ============================================================
// 1. CONSTANTES
// ============================================================
const TAMANHO_DA_CASA = 8;   // pixels de desenho por casa

const VELOCIDADE_DO_PAC_MAN = 60;   // pixels por segundo: 7,5 casas por segundo

/*
  O que cada coisa comida vale, numa tabela: o caractere da casa é a
  chave. Uma casa que não está aqui não vale nada (e não é comida).
*/
const PONTOS_POR_CASA = {
    ".": 10,
    "o": 50
};

const DURACAO_DA_COMEMORACAO = 2;   // segundos de labirinto piscando ao limpar tudo

/*
  As quatro direções como vetores, a ideia do Pong: dx e dy dizem para
  onde, e multiplicar pela velocidade diz quanto.

  Object.freeze impede que alguém altere uma direção por engano
  (DIRECOES.CIMA.dy = 5 passaria a mover TODO MUNDO que sobe). Como as
  direções são compartilhadas por todos os personagens, protegê-las é
  barato e evita um bug difícil de achar.
*/
const DIRECOES = Object.freeze({
    CIMA: Object.freeze({ dx: 0, dy: -1 }),
    BAIXO: Object.freeze({ dx: 0, dy: 1 }),
    ESQUERDA: Object.freeze({ dx: -1, dy: 0 }),
    DIREITA: Object.freeze({ dx: 1, dy: 0 })
});

/*
  O LABIRINTO, como texto. Cada caractere é uma casa:

      #   parede
      .   pastilha
      o   energizante (a pastilha grande)
          (espaço) corredor vazio
      -   porta da casa dos fantasmas
      G   dentro da casa dos fantasmas

  É simétrico — a metade direita é o espelho da esquerda — e não tem
  becos sem saída: num jogo de perseguição, um beco é uma armadilha sem
  escapatória. A linha do meio (com espaços nas pontas) é o TÚNEL: sair
  por um lado é entrar pelo outro.
*/
const MAPA_EM_TEXTO = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    "#.####.#####.##.#####.####.#",
    "#..........................#",
    "#.####.##.########.##.####.#",
    "#.####.##.########.##.####.#",
    "#......##....##....##......#",
    "######.##### ## #####.######",
    "######.##### ## #####.######",
    "######.##          ##.######",
    "######.## ###--### ##.######",
    "######.## #GGGGGG# ##.######",
    "      .   #GGGGGG#   .      ",
    "######.## #GGGGGG# ##.######",
    "######.## ######## ##.######",
    "######.##          ##.######",
    "######.## ######## ##.######",
    "######.## ######## ##.######",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o..##.......  .......##..o#",
    "###.##.##.########.##.##.###",
    "###.##.##.########.##.##.###",
    "#......##....##....##......#",
    "#.##########.##.##########.#",
    "#.##########.##.##########.#",
    "#..........................#",
    "############################"
];

const COLUNAS = MAPA_EM_TEXTO[0].length;   // 28 — deduzido, não digitado
const LINHAS = MAPA_EM_TEXTO.length;       // 30

const COR_FUNDO = "#000000";
const COR_PAREDE = "#3b5bff";
const COR_PORTA = "#ffb8de";
const COR_PASTILHA = "#ffcfa8";
const COR_PAC_MAN = "#ffd84d";
const COR_PAREDE_PISCANDO = "#ffffff";


// ============================================================
// 2. DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const campoPontos = document.getElementById("pontos");
const campoRestantes = document.getElementById("restantes");


// ============================================================
// 3. DO TEXTO PARA A MATRIZ
// ============================================================
/*
  Cada string vira um array de caracteres com split(""): "#..#" vira
  ["#", ".", ".", "#"]. O resultado é a matriz mapa[linha][coluna] —
  primeiro a linha, como no Tetris.

  Por que não usar o próprio texto? Porque strings são IMUTÁVEIS em
  JavaScript: não dá para trocar um caractere no meio de uma. E o mapa
  vai mudar — a cada pastilha comida, um "." vira " ".
*/
function criarMapa() {
    return MAPA_EM_TEXTO.map(linha => linha.split(""));
}

/*
  CONFIRA OS DADOS ANTES DE USAR.

  Um labirinto com uma linha de 27 caracteres no meio de linhas de 28
  não dá erro nenhum: só desenha torto, e o bug aparece longe da causa.
  Uma verificação de três linhas, rodada uma vez, aponta o problema na
  hora — e diz QUAL linha.
*/
/*
  A ÚNICA VEZ em que as 840 casas são percorridas para contar. Depois,
  cada pastilha comida desconta 1 — e o número está sempre certo, sem
  varrer nada de novo.

  `flat()` achata a matriz numa lista só; `filter` fica com as casas que
  valem pontos; `length` conta. E `in` pergunta se a chave existe na
  tabela.
*/
function contarPastilhas() {
    return mapa.flat().filter(casa => casa in PONTOS_POR_CASA).length;
}

function verificarMapa() {
    MAPA_EM_TEXTO.forEach((linha, i) => {
        if (linha.length !== COLUNAS) {
            console.error(`Linha ${i} do mapa tem ${linha.length} casas; deveria ter ${COLUNAS}.`);
        }
    });
}

verificarMapa();

/*
  `let`, não mais `const`: ao limpar o labirinto, o mapa inteiro é
  trocado por uma cópia nova.
*/
let mapa = criarMapa();
let pastilhasRestantes = contarPastilhas();

let pontos = 0;
let tempoTotal = 0;           // para o energizante piscar
let tempoDeComemoracao = 0;   // > 0: o labirinto está piscando

const LARGURA_DO_MAPA = COLUNAS * TAMANHO_DA_CASA;


// ============================================================
// 4. O PAC-MAN
// ============================================================
/*
  x e y em PIXELS, e são o CENTRO — como no Pong, como em qualquer coisa
  que desliza. A casa onde ele está é deduzida (casaDe), nunca guardada.

  `direcao` é para onde ele está indo; `desejada`, para onde o jogador
  QUER que ele vá. As duas só coincidem quando dá.

  Ele começa entre duas casas (x = 112 é a fronteira entre a 13 e a 14),
  olhando para a esquerda. Não tem problema: na direção em que anda, ele
  logo chega a um centro.
*/
const pacMan = {
    x: 0,
    y: 0,
    direcao: DIRECOES.ESQUERDA,
    desejada: DIRECOES.ESQUERDA,
    parado: false,
    distanciaAndada: 0   // para a boca abrir e fechar conforme ele anda
};

/*
  O ponto de partida num lugar só: usado no começo e a cada labirinto
  limpo.
*/
function posicionarPacMan() {
    pacMan.x = 14 * TAMANHO_DA_CASA;
    pacMan.y = 22 * TAMANHO_DA_CASA + TAMANHO_DA_CASA / 2;
    pacMan.direcao = DIRECOES.ESQUERDA;
    pacMan.desejada = DIRECOES.ESQUERDA;
    pacMan.parado = false;
}

let instanteDoQuadroAnterior = 0;


// ============================================================
// 5. PERGUNTAS SOBRE UMA CASA
// ============================================================
/*
  É parede? Fora do mapa conta como parede: assim quem pergunta pela
  vizinha da borda não precisa se preocupar com índices que não existem.
*/
function ehParede(coluna, linha) {
    if (linha < 0 || linha >= LINHAS || coluna < 0 || coluna >= COLUNAS) {
        return true;
    }

    return mapa[linha][coluna] === "#";
}

/*
  O Pac-Man pode entrar nesta casa? Não pode em parede, nem na porta, nem
  dentro da casa dos fantasmas.

  A COLUNA DÁ A VOLTA: coluna -1 é a 27, coluna 28 é a 0. É o túnel. O
  `%` duas vezes é o jeito de fazer o resto da divisão funcionar com
  números negativos: em JavaScript, -1 % 28 dá -1 (e não 27). Somar 28 e
  tirar o resto de novo conserta.
*/
function podeEntrar(coluna, linha) {
    if (linha < 0 || linha >= LINHAS) {
        return false;
    }

    const colunaDoTunel = ((coluna % COLUNAS) + COLUNAS) % COLUNAS;
    const casa = mapa[linha][colunaDoTunel];

    return casa !== "#" && casa !== "-" && casa !== "G";
}


// ============================================================
// 6. GRADE E PIXELS
// ============================================================
// De pixel para casa: em que casa está este ponto?
function casaDe(pixel) {
    return Math.floor(pixel / TAMANHO_DA_CASA);
}

/*
  O quanto um valor em pixels passou do centro da sua casa, de 0 a 7,99.
  Zero = exatamente no centro.
*/
function restoAteOCentro(pixel) {
    const meio = TAMANHO_DA_CASA / 2;
    return (((pixel - meio) % TAMANHO_DA_CASA) + TAMANHO_DA_CASA) % TAMANHO_DA_CASA;
}

/*
  Está no centro da casa? Com uma tolerância minúscula (EPSILON): contas
  com decimais quase nunca dão o número exato. 4 - 0,1 - 0,2 + 0,3 dá
  3,9999999999999996 em JavaScript. Comparar decimais com === é pedir
  para um bug aparecer uma vez em mil.
*/
const EPSILON = 1e-6;

function estaNoCentro(entidade) {
    const restoX = restoAteOCentro(entidade.x);
    const restoY = restoAteOCentro(entidade.y);

    const centradoEmX = restoX < EPSILON || restoX > TAMANHO_DA_CASA - EPSILON;
    const centradoEmY = restoY < EPSILON || restoY > TAMANHO_DA_CASA - EPSILON;

    return centradoEmX && centradoEmY;
}

/*
  Quanto falta para o próximo centro, andando na direção atual. Se já
  está num centro, o próximo fica a uma casa inteira.
*/
function distanciaAteOProximoCentro(entidade) {
    const pixel = entidade.direcao.dx !== 0 ? entidade.x : entidade.y;
    const sentido = entidade.direcao.dx + entidade.direcao.dy;   // -1 ou 1
    const resto = restoAteOCentro(pixel);

    if (resto < EPSILON || resto > TAMANHO_DA_CASA - EPSILON) {
        return TAMANHO_DA_CASA;
    }

    return sentido > 0 ? TAMANHO_DA_CASA - resto : resto;
}

/*
  Depois de um passo que devia terminar num centro, a conta pode ter
  dado 99,99999999 em vez de 100. ENCAIXAR arredonda para o centro
  quando está a menos de EPSILON dele — o erro não se acumula.

  E aqui mora o túnel: saiu pela esquerda, reaparece pela direita.
*/
function encaixar(entidade) {
    for (const eixo of ["x", "y"]) {
        const resto = restoAteOCentro(entidade[eixo]);

        if (resto < EPSILON) {
            entidade[eixo] -= resto;
        } else if (resto > TAMANHO_DA_CASA - EPSILON) {
            entidade[eixo] += TAMANHO_DA_CASA - resto;
        }
    }

    if (entidade.x < 0) {
        entidade.x += LARGURA_DO_MAPA;
    } else if (entidade.x >= LARGURA_DO_MAPA) {
        entidade.x -= LARGURA_DO_MAPA;
    }
}

function saoOpostas(a, b) {
    return a.dx === -b.dx && a.dy === -b.dy;
}

function proximaCasaLivre(entidade, direcao) {
    return podeEntrar(
        casaDe(entidade.x) + direcao.dx,
        casaDe(entidade.y) + direcao.dy
    );
}


// ============================================================
// 7. TECLADO — a intenção fica guardada
// ============================================================
/*
  O modelo da cobrinha: só importa a ÚLTIMA tecla apertada. Ela não move
  nada; só troca a direção DESEJADA. Quem decide quando obedecer é o
  movimento, ao passar pelo centro de uma casa.
*/
const TECLAS = {
    arrowup: DIRECOES.CIMA,
    w: DIRECOES.CIMA,
    arrowdown: DIRECOES.BAIXO,
    s: DIRECOES.BAIXO,
    arrowleft: DIRECOES.ESQUERDA,
    a: DIRECOES.ESQUERDA,
    arrowright: DIRECOES.DIREITA,
    d: DIRECOES.DIREITA
};

document.addEventListener("keydown", evento => {
    const direcao = TECLAS[evento.key.toLowerCase()];

    if (direcao === undefined) {
        return;
    }

    evento.preventDefault();
    pacMan.desejada = direcao;
});


// ============================================================
// 8. O LOOP E O MOVIMENTO
// ============================================================
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    tempoTotal += tempo;
    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

/*
  Enquanto o labirinto pisca, o mundo espera. Quando a comemoração
  acaba, um labirinto novo, cheio, e o Pac-Man de volta ao começo.
*/
function atualizar(tempo) {
    if (tempoDeComemoracao > 0) {
        tempoDeComemoracao -= tempo;

        if (tempoDeComemoracao <= 0) {
            recomecarLabirinto();
        }
        return;
    }

    moverPacMan(tempo);
    comer();
}

/*
  COMER: olhar a casa onde o Pac-Man está agora.

  Se ela vale pontos, vira corredor vazio na matriz — e pronto, a
  pastilha sumiu da tela, porque o desenho só espelha o mapa.

  A coluna passa pelo mesmo conserto do túnel: no meio da travessia, o
  Pac-Man pode estar num x que não pertence a nenhuma coluna do mapa.
*/
function comer() {
    const coluna = ((casaDe(pacMan.x) % COLUNAS) + COLUNAS) % COLUNAS;
    const linha = casaDe(pacMan.y);
    const casa = mapa[linha][coluna];

    if (!(casa in PONTOS_POR_CASA)) {
        return;
    }

    mapa[linha][coluna] = " ";
    pontos += PONTOS_POR_CASA[casa];
    pastilhasRestantes -= 1;
    atualizarPlacar();

    if (pastilhasRestantes === 0) {
        tempoDeComemoracao = DURACAO_DA_COMEMORACAO;
    }
}

/*
  O texto original nunca mudou: criarMapa faz uma CÓPIA nova e cheia a
  partir dele. Se o jogo comesse as pastilhas direto do texto (se isso
  fosse possível), não haveria de onde recomeçar.
*/
function recomecarLabirinto() {
    mapa = criarMapa();
    pastilhasRestantes = contarPastilhas();
    posicionarPacMan();
    atualizarPlacar();
}

function atualizarPlacar() {
    campoPontos.textContent = pontos;
    campoRestantes.textContent = pastilhasRestantes;
}

/*
  ANDAR EM PIXELS, DECIDIR NOS CENTROS.

  A distância do quadro (velocidade x tempo) é gasta em pedaços: nunca
  um pedaço passa por cima de um centro de casa. Cada vez que um centro
  é alcançado, o Pac-Man decide:

    1. a direção desejada está livre? Então vira para ela.
    2. a direção atual está bloqueada? Então para — encostado, no centro.

  Por que em pedaços, e não tudo de uma vez? Porque um quadro lento
  (0,05 s a 60 px/s = 3 px) poderia passar do centro sem nunca parar
  nele — e a curva seria perdida, ou o Pac-Man entraria meio pixel na
  parede. Andar até o centro, decidir, e só então gastar o resto, é o
  que garante que nenhuma decisão é pulada.

  Meia-volta é a exceção: pode acontecer em qualquer lugar, na hora. Dar
  meia-volta não entra em parede nenhuma — o caminho de volta é o mesmo
  por onde ele acabou de passar.
*/
function moverPacMan(tempo) {
    if (saoOpostas(pacMan.desejada, pacMan.direcao)) {
        pacMan.direcao = pacMan.desejada;
        pacMan.parado = false;
    }

    let distancia = VELOCIDADE_DO_PAC_MAN * tempo;

    while (distancia > 0) {
        if (estaNoCentro(pacMan)) {
            if (proximaCasaLivre(pacMan, pacMan.desejada)) {
                pacMan.direcao = pacMan.desejada;
            }

            pacMan.parado = !proximaCasaLivre(pacMan, pacMan.direcao);

            if (pacMan.parado) {
                return;
            }
        }

        const passo = Math.min(distancia, distanciaAteOProximoCentro(pacMan));

        pacMan.x += pacMan.direcao.dx * passo;
        pacMan.y += pacMan.direcao.dy * passo;
        pacMan.distanciaAndada += passo;
        distancia -= passo;

        encaixar(pacMan);
    }
}


// ============================================================
// 9. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    for (let linha = 0; linha < LINHAS; linha++) {
        for (let coluna = 0; coluna < COLUNAS; coluna++) {
            desenharCasa(coluna, linha);
        }
    }

    desenharPacMan();
}

function desenharCasa(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;

    switch (mapa[linha][coluna]) {
        case "#":
            desenharParede(coluna, linha);
            break;

        case ".":
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 3, y + 3, 2, 2);
            break;

        case "o":
            // O energizante pisca, 4 vezes por segundo: "eu sou diferente".
            if (Math.floor(tempoTotal * 4) % 2 === 1) {
                break;
            }

            // Um "círculo" de 6x6 feito de dois retângulos: pixel art, sem arc.
            pincel.fillStyle = COR_PASTILHA;
            pincel.fillRect(x + 2, y + 1, 4, 6);
            pincel.fillRect(x + 1, y + 2, 6, 4);
            break;

        case "-":
            pincel.fillStyle = COR_PORTA;
            pincel.fillRect(x, y + 3, TAMANHO_DA_CASA, 2);
            break;
    }
}

/*
  A PAREDE QUE SE DESENHA SOZINHA.

  Uma casa de parede não sabe se é a quina de um bloco, o meio de um
  muro ou a ponta de uma ilha. Mas ela pode PERGUNTAR aos quatro
  vizinhos: "você é parede?". Onde a vizinha é corredor, há uma borda, e
  a borda ganha uma linha.

  As linhas ficam um pouco para dentro da parede (a 2 pixels da borda),
  e cada uma só se estica até o fim da casa se a vizinha daquele lado
  também for parede — senão para no canto, onde encontra a outra linha.
  É isso que fecha as quinas sem deixar pontas sobrando.

      I = a 2 pixels do lado de dentro       F = a 5 pixels

  Os quatro testes de DIAGONAL resolvem as quinas de dentro: quando as
  duas vizinhas são parede mas a da diagonal é corredor, falta um
  pedacinho de L para ligar as linhas das casas ao lado.

  Nada disto está no texto do mapa. É deduzido — e por isso qualquer
  labirinto que você escrever sai desenhado certo.
*/
function desenharParede(coluna, linha) {
    const x = coluna * TAMANHO_DA_CASA;
    const y = linha * TAMANHO_DA_CASA;
    const ultimo = TAMANHO_DA_CASA - 1;
    const I = 2;
    const F = TAMANHO_DA_CASA - 3;

    const livreEmCima = !ehParede(coluna, linha - 1);
    const livreEmbaixo = !ehParede(coluna, linha + 1);
    const livreAEsquerda = !ehParede(coluna - 1, linha);
    const livreADireita = !ehParede(coluna + 1, linha);

    /*
      Comemorando, as paredes alternam entre azul e branco: a conta do
      energizante, mais rápida.
    */
    const piscando = tempoDeComemoracao > 0 && Math.floor(tempoDeComemoracao * 6) % 2 === 0;
    pincel.fillStyle = piscando ? COR_PAREDE_PISCANDO : COR_PAREDE;

    // As bordas retas.
    if (livreEmCima) {
        linhaHorizontal(y + I, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreEmbaixo) {
        linhaHorizontal(y + F, livreAEsquerda ? x + I : x, livreADireita ? x + F : x + ultimo);
    }
    if (livreAEsquerda) {
        linhaVertical(x + I, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }
    if (livreADireita) {
        linhaVertical(x + F, livreEmCima ? y + I : y, livreEmbaixo ? y + F : y + ultimo);
    }

    // As quinas de dentro: vizinhas são parede, a diagonal não.
    if (!livreEmCima && !livreAEsquerda && !ehParede(coluna - 1, linha - 1)) {
        linhaVertical(x + I, y, y + I);
        linhaHorizontal(y + I, x, x + I);
    }
    if (!livreEmCima && !livreADireita && !ehParede(coluna + 1, linha - 1)) {
        linhaVertical(x + F, y, y + I);
        linhaHorizontal(y + I, x + F, x + ultimo);
    }
    if (!livreEmbaixo && !livreAEsquerda && !ehParede(coluna - 1, linha + 1)) {
        linhaVertical(x + I, y + F, y + ultimo);
        linhaHorizontal(y + F, x, x + I);
    }
    if (!livreEmbaixo && !livreADireita && !ehParede(coluna + 1, linha + 1)) {
        linhaVertical(x + F, y + F, y + ultimo);
        linhaHorizontal(y + F, x + F, x + ultimo);
    }
}

// Duas ajudantes para não escrever largura e altura de linhas de 1 pixel.
function linhaHorizontal(y, de, ate) {
    pincel.fillRect(de, y, ate - de + 1, 1);
}

function linhaVertical(x, de, ate) {
    pincel.fillRect(x, de, 1, ate - de + 1);
}

/*
  A BOCA ANDA COM ELE, NÃO COM O RELÓGIO.

  A abertura vem da distância percorrida: andando, a boca abre e fecha;
  encostado numa parede, ela congela. Se viesse do relógio, o Pac-Man
  "mastigaria o ar" parado — um detalhe pequeno que entrega que algo
  está errado.

  O ângulo da direção sai de Math.atan2(dy, dx): direita é 0, baixo é
  π/2, esquerda é π, cima é -π/2. A boca é uma fatia em volta desse
  ângulo.
*/
function desenharPacMan() {
    const abertura = Math.abs(Math.sin(pacMan.distanciaAndada * 0.35)) * 0.28 * Math.PI + 0.02;
    const angulo = Math.atan2(pacMan.direcao.dy, pacMan.direcao.dx);

    pincel.fillStyle = COR_PAC_MAN;
    pincel.beginPath();
    pincel.moveTo(pacMan.x, pacMan.y);
    pincel.arc(pacMan.x, pacMan.y, 6.5, angulo + abertura, angulo - abertura + Math.PI * 2);
    pincel.closePath();
    pincel.fill();
}


// ============================================================
// 10. LIGAR
// ============================================================
posicionarPacMan();
atualizarPlacar();
requestAnimationFrame(quadroAQuadro);
