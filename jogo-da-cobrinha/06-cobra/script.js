/*
  PASSO 6 — A COBRA

  Um quadrado vira uma cobra. E o segredo é bem mais simples do que parece:

      A COBRA NUNCA ANDA.
      Ela ganha uma cabeça na frente e perde a cauda atrás.

  Pense em uma fila de pessoas se movendo: ninguém precisa dar um passo se
  entra alguém na frente e sai alguém no fim. Visto de longe, a fila andou.

  Ideias novas:
    - ARRAY: uma LISTA de posições, em vez de uma posição só
    - unshift / pop: entrar no início, sair do fim
    - forEach: fazer a mesma coisa com todos os itens da lista
    - cópia de objeto: a armadilha mais traiçoeira do JavaScript
*/


// ============================================================
// FERRAMENTAS E MEDIDAS
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const PIXELS_POR_CELULA = 20;
const COLUNAS = tela.width / PIXELS_POR_CELULA;
const LINHAS = tela.height / PIXELS_POR_CELULA;

const COR_FUNDO = "#06070d";
const COR_COBRA = "#00f0ff";
const MILISSEGUNDOS_POR_PASSO = 150;


// ============================================================
// ESTADO
// ============================================================
/*
  Um ARRAY (lista) de OBJETOS.
      [ ] cria uma lista, com os itens separados por vírgula
      { } cria um objeto, com valores nomeados

  A ORDEM da lista é uma informação de verdade, não um detalhe:
  a peça de índice 0 é a CABEÇA, e a última é a ponta da cauda.

  Cinco peças em fila, deitadas na horizontal.
*/
let cobra = [
    { coluna: 5, linha: 5 },
    { coluna: 4, linha: 5 },
    { coluna: 3, linha: 5 },
    { coluna: 2, linha: 5 },
    { coluna: 1, linha: 5 }
];

let direcao = "direita";

/*
  ANDAIME TEMPORÁRIO: a barra de espaço faz a cobra crescer.
  Serve só para você VER o mecanismo de crescimento funcionando neste passo.
  No passo 7 quem manda crescer é a maçã, e estas linhas desaparecem.
*/
let deveCrescer = false;


// ============================================================
// O PASSO
// ============================================================
function darUmPasso() {
    const cabeca = calcularProximaCabeca();

    /*
      O TRUQUE, em três linhas.

      unshift() põe um item no INÍCIO da lista  -> nasce uma cabeça
      pop()     tira o item do FIM da lista     -> some a cauda

      Se não removermos a cauda, a lista fica um item maior:
      é exatamente isso que "crescer" significa aqui. Nenhum código de
      crescimento foi escrito — ele é a AUSÊNCIA de uma remoção.
    */
    cobra.unshift(cabeca);

    if (deveCrescer) {
        deveCrescer = false;
    } else {
        cobra.pop();
    }

    desenhar();
}

/*
  Calcula onde a cabeça ESTARÁ, sem mexer em nada ainda.
  Uma função que só calcula e devolve um valor é fácil de ler, fácil de
  testar e não tem como estragar o estado do jogo por acidente.
*/
function calcularProximaCabeca() {
    /*
      ATENÇÃO — a armadilha mais traiçoeira do JavaScript.

          const cabeca = cobra[0];        // NÃO faça isso
          const cabeca = { ...cobra[0] }; // faça isso

      Objetos não são copiados quando você os atribui: os dois nomes passam
      a apontar para O MESMO objeto. Mudar `cabeca` mudaria também a peça
      que já está dentro da lista, e a cobra se deformaria de um jeito
      difícil de entender.

      As três reticências (...) copiam os valores para um objeto NOVO.
      Chama-se "spread". Guarde a regra: para alterar um objeto sem
      afetar o original, copie primeiro.
    */
    const cabeca = { ...cobra[0] };

    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    return cabeca;  // devolve o valor para quem chamou
}


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = COR_COBRA;

    /*
      forEach = "para cada item da lista, faça isto".

      A alternativa seria um `for` com contador e índice. O forEach diz a
      mesma coisa com menos peças móveis: não há contador para errar, nem
      condição de parada para escrever ao contrário.

      `parte` é o nome que damos a cada item enquanto ele passa.
    */
    cobra.forEach(parte => {
        pincel.fillRect(
            parte.coluna * PIXELS_POR_CELULA,
            parte.linha * PIXELS_POR_CELULA,
            PIXELS_POR_CELULA,
            PIXELS_POR_CELULA
        );
    });
}


// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("keydown", responderAoTeclado);

function responderAoTeclado(evento) {
    /*
      NOVO: a proibição do meia-volta.

      Com um corpo atrás da cabeça, virar 180° de uma vez faria a cabeça
      entrar no próprio pescoço. Então cada virada só é aceita se não for
      o oposto exato da direção atual.

      `!==` significa "diferente de". (Use sempre === e !==, com três
      caracteres; os de dois convertem os tipos por conta própria e
      produzem surpresas como "5" == 5 sendo verdadeiro.)
    */
    switch (evento.key) {
        case "ArrowUp":
            if (direcao !== "baixo") direcao = "cima";
            break;
        case "ArrowDown":
            if (direcao !== "cima") direcao = "baixo";
            break;
        case "ArrowLeft":
            if (direcao !== "direita") direcao = "esquerda";
            break;
        case "ArrowRight":
            if (direcao !== "esquerda") direcao = "direita";
            break;

        case " ":  // andaime temporário: barra de espaço faz crescer
            deveCrescer = true;
            break;

        default:
            return;
    }

    evento.preventDefault();
}


// ============================================================
// LIGAR O MOTOR
// ============================================================
setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
desenhar();
