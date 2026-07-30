/*
  PONG — PASSO 2: O LOOP

  A bola ganha vida. E, para isso, entram as duas ideias que separam um
  jogo contínuo de um jogo de grade:

    1. VELOCIDADE COMO PAR DE NÚMEROS (um vetor)
    2. TEMPO REAL entre um quadro e outro (delta time)

  A bola vai atravessar a tela e sumir. Está certo — ninguém contou a ela
  que existem paredes. Isso é o passo 3.
*/


// ============================================================
// CONSTANTES
// ============================================================
const LARGURA_DA_RAQUETE = 4;
const ALTURA_DA_RAQUETE = 20;
const MARGEM_DA_RAQUETE = 6;
const TAMANHO_DA_BOLA = 4;

/*
  NOVO — e leia com atenção: PIXELS POR SEGUNDO.

  Não "pixels por quadro". A diferença parece bobagem e é o assunto
  central deste passo.
*/
const VELOCIDADE_DA_BOLA = 70;

const COR_FUNDO = "#06070d";
const COR_ELEMENTOS = "#00f0ff";
const COR_LINHA_CENTRAL = "#123";


// ============================================================
// DOM E CANVAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");


// ============================================================
// OS OBJETOS
// ============================================================
const raqueteEsquerda = {
    x: MARGEM_DA_RAQUETE,
    y: (tela.height - ALTURA_DA_RAQUETE) / 2,
    largura: LARGURA_DA_RAQUETE,
    altura: ALTURA_DA_RAQUETE
};

const raqueteDireita = {
    x: tela.width - MARGEM_DA_RAQUETE - LARGURA_DA_RAQUETE,
    y: (tela.height - ALTURA_DA_RAQUETE) / 2,
    largura: LARGURA_DA_RAQUETE,
    altura: ALTURA_DA_RAQUETE
};

/*
  A bola agora tem VELOCIDADE — dois números, um por eixo.

  Na cobrinha havia uma variável `direcao` com quatro valores possíveis:
  "cima", "baixo", "esquerda", "direita". Quatro palavras, quatro
  direções.

  Este par de números faz muito mais: ele carrega direção E rapidez ao
  mesmo tempo, e consegue representar QUALQUER ângulo. Um switch de
  quatro casos jamais descreveria um movimento a 37 graus.

  Isso tem nome: é um VETOR.
*/
const bola = {
    x: (tela.width - TAMANHO_DA_BOLA) / 2,
    y: (tela.height - TAMANHO_DA_BOLA) / 2,
    largura: TAMANHO_DA_BOLA,
    altura: TAMANHO_DA_BOLA,
    velocidadeX: VELOCIDADE_DA_BOLA * 0.9,
    velocidadeY: VELOCIDADE_DA_BOLA * 0.4
};


// ============================================================
// O LOOP
// ============================================================
/*
  Guarda o instante do quadro anterior, para sabermos quanto tempo passou.
*/
let instanteDoQuadroAnterior = 0;

/*
  requestAnimationFrame pede ao navegador: "me chame antes de desenhar o
  próximo quadro". Vantagens sobre o setInterval da cobrinha:

    - sincroniza com a taxa de atualização da tela (nada de rasgos);
    - pausa sozinho quando a aba sai de foco, poupando bateria;
    - entrega um carimbo de tempo preciso, que é o parâmetro abaixo.

  Repare no desenho da coisa: é uma função QUE SE AGENDA DE NOVO. Não há
  laço nenhum; cada quadro pede o próximo, e é isso que mantém a roda
  girando.
*/
function quadroAQuadro(instanteAtual) {
    /*
      DELTA TIME — quanto tempo passou de verdade desde o último quadro,
      convertido para segundos.

      POR QUE ISSO EXISTE:

      Telas rodam a 60Hz, 120Hz, 144Hz. Se cada quadro movesse a bola uma
      quantidade fixa, o jogo ficaria MAIS RÁPIDO em máquinas melhores.
      O jogador com a tela boa jogaria outro jogo.

      Multiplicando pelo tempo realmente decorrido, a velocidade vale o
      mesmo em qualquer lugar. É por isso que a constante lá em cima está
      em pixels POR SEGUNDO.

      Esse bug é traiçoeiro porque você nunca o vê: na sua máquina está
      perfeito.
    */
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;

    /*
      TETO NO DELTA.

      Se a aba ficar 10 segundos em segundo plano, o primeiro quadro de
      volta traria um delta gigante — e a bola SALTARIA de um lado ao
      outro da tela de uma vez, atravessando tudo pelo caminho.

      Limitar a 0,05s (o equivalente a 20 quadros por segundo) é a
      proteção padrão. Prefira o jogo engasgar a ele teleportar.
    */
    const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);   // agenda o próximo
}

function atualizar(tempo) {
    /*
      A linha mais importante do módulo:

          posição += velocidade × tempo

      Se a velocidade é 70 pixels por segundo e passaram 0,016 segundos,
      a bola anda 1,12 pixel. Repare: um número QUEBRADO.

      Na cobrinha as posições eram sempre inteiras. Aqui, quase nunca —
      e é isso que vai obrigar a colisão a mudar de ideia no passo 5.
    */
    bola.x += bola.velocidadeX * tempo;
    bola.y += bola.velocidadeY * tempo;
}


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    desenharLinhaCentral();

    pincel.fillStyle = COR_ELEMENTOS;
    desenharRetangulo(raqueteEsquerda);
    desenharRetangulo(raqueteDireita);
    desenharRetangulo(bola);
}

function desenharRetangulo(objeto) {
    /*
      NOVO: Math.round.

      A bola está em x = 73.42. Desenhar nessa posição faria o canvas
      tentar pintar "quase" um pixel e "quase" o vizinho, suavizando a
      borda para disfarçar — e o quadrado sairia borrado, arruinando o
      visual pixelado.

      Arredondar na hora de DESENHAR resolve. Note que a posição real
      continua fracionária: o arredondamento é só para a pintura.
    */
    pincel.fillRect(
        Math.round(objeto.x),
        Math.round(objeto.y),
        objeto.largura,
        objeto.altura
    );
}

function desenharLinhaCentral() {
    pincel.fillStyle = COR_LINHA_CENTRAL;

    const meio = tela.width / 2 - 1;
    for (let y = 2; y < tela.height; y += 8) {
        pincel.fillRect(meio, y, 2, 4);
    }
}


// ============================================================
// LIGAR
// ============================================================
/*
  Uma única chamada põe a roda para girar. A partir daqui, o navegador
  chama quadroAQuadro umas 60 vezes por segundo, para sempre.
*/
requestAnimationFrame(quadroAQuadro);
