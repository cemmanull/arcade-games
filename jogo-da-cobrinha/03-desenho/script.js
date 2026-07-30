/*
  PASSO 3 — DESENHO

  Objetivo: pintar um quadrado no canvas.
  Parece pouco. Mas para isso o JavaScript precisa fazer três coisas que
  ele vai repetir a vida inteira:

      1. ENCONTRAR um elemento da página
      2. PEDIR as ferramentas de desenho a ele
      3. PINTAR
*/


// ============================================================
// 1. ENCONTRAR — o DOM
// ============================================================
/*
  Quando a página carrega, o navegador transforma o texto do seu HTML em uma
  árvore de OBJETOS VIVOS e entrega essa árvore ao JavaScript, dentro de uma
  variável pronta chamada `document`.

  Essa árvore tem nome: DOM (Document Object Model).
  Mexer nesses objetos muda a página na hora, na sua frente.

  getElementById procura na árvore o elemento com aquele id.
*/
const tela = document.getElementById("jogo");

/*
  const = "constante": depois de definida, não pode ser trocada.
  Use const por padrão; só use `let` quando o valor REALMENTE precisar mudar.
  Assim quem lê o código sabe de imediato o que fica parado.
*/


// ============================================================
// 2. PEDIR AS FERRAMENTAS — o contexto do canvas
// ============================================================
/*
  A tag <canvas> sozinha é só uma folha em branco: ela não sabe desenhar.
  Quem desenha é o CONTEXTO, que pedimos a ela.

  "2d" é o contexto de desenho plano. (Existe também "webgl", para 3D.)

  Chamei de `pincel` porque é literalmente isso: um pincel que guarda a cor
  atual e sabe pintar formas.
*/
const pincel = tela.getContext("2d");


// ============================================================
// 3. AS MEDIDAS
// ============================================================
/*
  O tabuleiro é uma GRADE de células quadradas.
  A tela tem 400 pixels e cada célula tem 20 -> 20 colunas e 20 linhas.

  Repare que COLUNAS é CALCULADO, não escrito à mão. O número 400 existe em
  um lugar só (no HTML). Se você mudar lá, isto aqui se ajusta sozinho.
  Duplicar um número é criar a chance de esquecer de mudar um dos dois.
*/
const PIXELS_POR_CELULA = 20;
const COLUNAS = tela.width / PIXELS_POR_CELULA;   // 400 / 20 = 20
const LINHAS = tela.height / PIXELS_POR_CELULA;   // 400 / 20 = 20

const COR_FUNDO = "#06070d";
const COR_COBRA = "#00f0ff";


// ============================================================
// 4. A POSIÇÃO
// ============================================================
/*
  Um OBJETO: um conjunto de valores com nome, escrito entre chaves.
  Leia como uma ficha: "coluna 5, linha 5".

  E aqui está a decisão mais importante de todo este projeto:

      a posição é guardada em CÉLULAS, não em pixels.

  `coluna: 5` quer dizer a sexta casinha do tabuleiro (a contagem começa
  em 0), e não o pixel 5. A conversão para pixel acontece só na hora de
  desenhar. Você vai ver o quanto isso simplifica tudo daqui em diante.
*/
const cabeca = { coluna: 5, linha: 5 };


// ============================================================
// 5. PINTAR
// ============================================================
/*
  O canvas é um pincel COM MEMÓRIA DE ESTADO:

      pincel.fillStyle = "azul"   -> não desenha nada, só escolhe a cor
      pincel.fillRect(...)        -> aí sim pinta, usando a cor escolhida

  A cor continua valendo para os próximos desenhos até ser trocada.
  Por isso a ORDEM das linhas importa tanto aqui: escolher depois de pintar
  não tem efeito nenhum.
*/

// Fundo: um retângulo do tamanho da tela inteira.
pincel.fillStyle = COR_FUNDO;
pincel.fillRect(0, 0, tela.width, tela.height);

/*
  DE CÉLULA PARA PIXEL — a conversão, que acontece só aqui:

      pixel = célula × tamanho da célula

  A célula 5 começa no pixel 100. A célula 0 começa no pixel 0.
*/
const x = cabeca.coluna * PIXELS_POR_CELULA;
const y = cabeca.linha * PIXELS_POR_CELULA;

/*
  fillRect(x, y, largura, altura)

  Atenção: x e y são o CANTO SUPERIOR ESQUERDO do retângulo, não o centro.

  E note o eixo Y: no canvas ele CRESCE PARA BAIXO. A origem (0,0) é o canto
  de cima à esquerda, ao contrário do gráfico que se aprende na escola.
  Quase todo mundo erra isso uma vez; erre agora, com um quadrado só.
*/
pincel.fillStyle = COR_COBRA;
pincel.fillRect(x, y, PIXELS_POR_CELULA, PIXELS_POR_CELULA);
