/*
  SHOOT 'EM UP — PASSO 1: O CÉU

  Duas ideias, e as duas ficam até o fim:

  1. O OBJETO É O CENTRO
     No Pong, x e y eram o canto superior esquerdo,
     como o fillRect espera. Aqui passam a ser o CENTRO. Neste jogo quase
     tudo gira em torno do centro: mirar no jogador, espalhar balas em
     círculo, explodir. Guardar o centro poupa um "+ largura / 2" em cada
     uma dessas contas — e só o desenho precisa converter.

  2. A ROLAGEM QUE NÃO SE GUARDA
     As estrelas descem para sempre. Mas nenhuma estrela "anda" no estado:
     a posição de cada uma é CALCULADA a partir do relógio, com o resto da
     divisão (%). Se pode ser calculado, não guarde.
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


// ============================================================
// 4. O LOOP
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
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}


// ============================================================
// 5. DESENHAR
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
// 6. LIGAR
// ============================================================
requestAnimationFrame(quadroAQuadro);
