/*
  PASSO 4 — MOVIMENTO

  O quadrado vai andar sozinho. Para isso surge a estrutura que sustenta
  TODOS os jogos que existem — o GAME LOOP:

      atualizar o estado  ->  desenhar  ->  repetir

  Muitas vezes por segundo, para sempre.

  Duas ideias novas e importantes:

  1. ESTADO. O jogo precisa LEMBRAR onde o quadrado está. Isso mora em uma
     variável que muda com o tempo (`let`, não `const`).

  2. APAGAR E REPINTAR. No canvas nada se move. Não existem objetos, só
     tinta. Para o quadrado parecer andar, apagamos a tela e pintamos tudo
     de novo, um pouquinho adiante. É um flipbook.
*/


// ============================================================
// FERRAMENTAS E MEDIDAS (igual ao passo 3)
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const PIXELS_POR_CELULA = 20;
const COLUNAS = tela.width / PIXELS_POR_CELULA;
const LINHAS = tela.height / PIXELS_POR_CELULA;

const COR_FUNDO = "#06070d";
const COR_COBRA = "#00f0ff";

// NOVO: de quanto em quanto tempo o jogo dá um passo, em milissegundos.
const MILISSEGUNDOS_POR_PASSO = 150;


// ============================================================
// ESTADO — o que muda com o tempo
// ============================================================
/*
  `let` em vez de `const`, e a diferença agora é real: esta posição PRECISA
  mudar. Tentar reatribuir uma const dá erro na hora — o que é bom, é o
  JavaScript protegendo o que você declarou como fixo.

  Estas variáveis são a memória do jogo. A qualquer instante, elas
  descrevem por completo a situação da partida. Quando um jogo trava ou se
  comporta estranho, é sempre aqui que se olha primeiro.
*/
let cabeca = { coluna: 5, linha: 5 };


// ============================================================
// O PASSO — atualizar o estado
// ============================================================
/*
  Uma FUNÇÃO é um bloco de código com nome, guardado para ser executado
  quando alguém chamar. Declarar não executa: `darUmPasso` só roda quando
  alguém escreve `darUmPasso()`.

  Note como andar ficou simples por causa da decisão do passo 3:
  a posição está em CÉLULAS, então avançar é somar 1. Se estivéssemos
  guardando pixels, seria `x += PIXELS_POR_CELULA` — e essa multiplicação
  apareceria em todo lugar daqui para a frente.
*/
function darUmPasso() {
    cabeca.coluna += 1;   // atalho para: cabeca.coluna = cabeca.coluna + 1
    desenhar();
}


// ============================================================
// DESENHAR — pintar a cena inteira, do zero
// ============================================================
/*
  Repare que esta função não tem "apagar o quadrado antigo". Ela pinta o
  fundo por cima de TUDO e redesenha a cena inteira.

  Poderia parecer desperdício repintar 400 mil pixels 7 vezes por segundo.
  Não é: é a forma mais simples e mais confiável. Tentar apagar só o que
  mudou é uma otimização — e otimização sem necessidade medida só traz bug.
*/
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = COR_COBRA;
    pincel.fillRect(
        cabeca.coluna * PIXELS_POR_CELULA,   // aqui é onde a célula
        cabeca.linha * PIXELS_POR_CELULA,    // vira pixel — e só aqui
        PIXELS_POR_CELULA,
        PIXELS_POR_CELULA
    );
}


// ============================================================
// LIGAR O MOTOR
// ============================================================
/*
  setInterval(função, intervalo) = "execute esta função a cada X ms,
  para sempre".

  Repare que passamos `darUmPasso` SEM os parênteses.
      darUmPasso    -> a função em si, para o navegador chamar depois
      darUmPasso()  -> executa AGORA e entrega o resultado (undefined)
  Essa distinção derruba muita gente. Sem parênteses é o certo aqui.

  setInterval devolve um número de identificação. Ainda não o usamos, mas
  é ele que permitirá DESLIGAR o motor no passo 8.
*/
setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);

/*
  E um desenho imediato, para a tela não ficar em branco durante os
  primeiros 150 milissegundos: setInterval só executa a primeira vez
  DEPOIS de esperar o intervalo.
*/
desenhar();
