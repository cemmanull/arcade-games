/*
  SHOOT 'EM UP — PASSO 2: A NAVE

  A nave obedece. O teclado é o do Pong — um painel de interruptores, com
  keydown ligando e keyup desligando — e a ideia de INTENÇÃO (GUIA) é a
  mesma de sempre: as teclas não movem a nave, elas dizem para onde ela
  QUER ir.

  A novidade é um bug que só existe em duas dimensões: na diagonal, sem
  cuidado, a nave anda 41% mais rápido. Quem joga descobre em minutos — e
  passa a voar sempre torto. A cura é NORMALIZAR o vetor de intenção.
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


// ============================================================
// 4. TECLADO
// ============================================================
const TECLAS_DO_JOGO = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];

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

    tempoTotal += tempo;
    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}


// ============================================================
// 6. ATUALIZAR
// ============================================================
function atualizar(tempo) {
    moverNave(tempo);
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
// 7. DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharCeu();
    desenharSprite(SPRITE_DA_NAVE, CORES_DA_NAVE, nave.x, nave.y);
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
// 8. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
