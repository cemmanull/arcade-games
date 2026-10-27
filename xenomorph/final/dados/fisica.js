/*
  ============================================================
  XENOMORPH — DADOS: A FÍSICA
  ============================================================

  O tamanho dos blocos e da sala, e todos os números do movimento:
  aceleração, salto, perdões, esquiva. Mude e sinta — nenhum sistema
  precisa mudar.
*/


const TAMANHO_DO_BLOCO = 8;

/*
  O tamanho da sala vem do gerador (os módulos têm 32 x 18). As salas em
  si também: este arquivo não tem mais nenhuma.
*/
const COLUNAS = COLUNAS_DA_SALA;
const LINHAS = LINHAS_DA_SALA;

/*
  A FÍSICA, como dados. Todas as unidades em pixels e segundos:
  velocidades em px/s, acelerações em px/s² (quanto a velocidade muda
  por segundo).

  Com aceleração 900 e máxima 80, o soldado chega à velocidade total em
  80 / 900 ≈ 0,09 s — rápido o bastante para parecer obediente, lento o
  bastante para parecer que tem peso. Mude e sinta.
*/
const FISICA = {
    velocidadeMaxima: 80,
    aceleracao: 900,
    frenagem: 1200,
    gravidade: 900,
    quedaMaxima: 260,

    /*
      NO AR, o controle é mais fraco: dá para corrigir o salto, mas não
      dar meia-volta instantânea. O GDD pede "controle aéreo ajustável" —
      são estes dois números.
    */
    aceleracaoNoAr: 600,
    frenagemNoAr: 350,

    /*
      O SALTO. A altura máxima sai da física do ensino médio:

          altura = velocidade² / (2 × gravidade) = 250² / 1800 ≈ 35 px

      Quadro a quadro a conta perde um pouco: na prática, 33 px — pouco
      mais de 4 blocos. Soltar o botão subindo multiplica a velocidade por
      `corteDoSalto`: um toque rápido sobe uns 9 px.
    */
    velocidadeDoSalto: 250,
    corteDoSalto: 0.45,

    /*
      Cair é mais pesado que subir. Com a mesma gravidade nos dois
      sentidos, o pulo parece flutuar no alto; com mais na descida, ele
      fica firme, e o soldado volta ao chão a tempo de reagir.
    */
    gravidadeNaDescida: 1300,

    // Os perdões (scripts/fisica.js). Em segundos.
    tempoDeCoiote: 0.1,
    validadeDoPedido: 0.1,

    tempoAtravessando: 0.2,    // quanto tempo as plataformas ignoram quem desce por elas

    // A esquiva: 230 px/s por 0,15 s, e depois a freada: uns 40 px, 5 blocos.
    velocidadeDaEsquiva: 230,
    duracaoDaEsquiva: 0.15,
    recargaDaEsquiva: 0.5
};

/*
  O tamanho máximo de um pedaço de movimento. Meio bloco: nenhum pedaço
  consegue pular um bloco inteiro, então nenhuma parede é atravessada.
*/
const PASSO_MAXIMO = TAMANHO_DO_BLOCO / 2;

/*
  Um número pequeno o bastante para não aparecer na tela e grande o
  bastante para o computador enxergar. Explicado na seção 7.
*/
const EPSILON = 0.001;

/*
  OS CONTROLES, como dados: cada AÇÃO do jogo e as teclas que a fazem.
  O código pergunta "o jogador quer ir para a esquerda?", nunca "a seta
  está apertada?". Trocar uma tecla — ou deixar o jogador escolher, como o
  GDD pede na seção 11 — é mudar esta tabela.
*/
