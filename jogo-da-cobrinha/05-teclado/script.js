/*
  PASSO 5 — TECLADO

  Até agora o jogo ignorava você. Agora ele reage.

  A ideia nova é a mais importante do JavaScript no navegador:
  o seu código NÃO roda do começo ao fim e acaba. Ele fica ESPERANDO
  coisas acontecerem — um clique, uma tecla, um cronômetro — e reage.

  Isso se chama PROGRAMAÇÃO ORIENTADA A EVENTOS.

  Repare no desenho da solução: a tecla não move o quadrado.
  Ela só troca uma variável, e quem move é o loop, no seu ritmo.

      teclado  ->  muda a direção        (a qualquer instante)
      loop     ->  anda naquela direção  (a cada 150ms)

  Separar as duas coisas é o que impede o quadrado de disparar quando você
  martela a seta. O jogo tem o próprio compasso; o teclado só o influencia.
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
let cabeca = { coluna: 5, linha: 5 };

/*
  NOVO. A direção é um TEXTO ("string"), entre aspas.

  Poderia ser um número (0, 1, 2, 3), mas "cima" se lê sozinho e
  `direcao === 2` exige que alguém lembre o que 2 significa.

  > Prefira o valor que se explica sozinho. O computador não liga;
  > quem lê o código, sim — e esse alguém provavelmente é você em um mês.
*/
let direcao = "direita";


// ============================================================
// O PASSO
// ============================================================
/*
  switch = um encadeamento de "se for isto, faça aquilo".

  Cuidado com o `break`: sem ele, a execução ESCORREGA para o caso seguinte
  e executa também. É um erro difícil de enxergar, porque o código parece
  certo. Se um dia um switch seu fizer duas coisas ao mesmo tempo, procure
  o break que falta.

  Andar continua sendo somar 1 — e agora a lembrança importa:
  a LINHA cresce para baixo. Linha 0 é a de cima, como numa planilha.
  Por isso "cima" é `linha -= 1`.
*/
function darUmPasso() {
    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    desenhar();
}


// ============================================================
// DESENHAR
// ============================================================
function desenhar() {
    pincel.fillStyle = COR_FUNDO;
    pincel.fillRect(0, 0, tela.width, tela.height);

    pincel.fillStyle = COR_COBRA;
    pincel.fillRect(
        cabeca.coluna * PIXELS_POR_CELULA,
        cabeca.linha * PIXELS_POR_CELULA,
        PIXELS_POR_CELULA,
        PIXELS_POR_CELULA
    );
}


// ============================================================
// EVENTOS — ouvindo o teclado
// ============================================================
/*
      alvo.addEventListener("nome-do-evento", funçãoQueResponde);

  Lê-se: "documento, quando uma tecla for pressionada, chame esta função".

  Por que `document` e não o canvas? Porque o canvas não recebe o foco do
  teclado — cliques e teclas vão para a página. Ouvir no documento é o
  jeito simples de capturar teclas venham de onde vierem.

  E de novo: passamos o NOME da função, sem parênteses.
*/
document.addEventListener("keydown", responderAoTeclado);

/*
  O navegador chama esta função e entrega um OBJETO DE EVENTO com os
  detalhes do que aconteceu. Para o teclado, `evento.key` diz qual tecla
  foi pressionada: "ArrowUp", "a", " " (espaço), "Enter"...

  Quer descobrir o nome de uma tecla? Ponha um console.log(evento.key)
  aqui dentro, abra o F12 e martele o teclado.
*/
function responderAoTeclado(evento) {
    switch (evento.key) {
        case "ArrowUp":    direcao = "cima";     break;
        case "ArrowDown":  direcao = "baixo";    break;
        case "ArrowLeft":  direcao = "esquerda"; break;
        case "ArrowRight": direcao = "direita";  break;
        default:
            return;  // qualquer outra tecla: sai sem fazer nada
    }

    /*
      As setas rolam a página por padrão. preventDefault() cancela essa
      reação automática do navegador.

      Ele fica aqui embaixo de propósito: só as 4 setas chegam a esta
      linha, porque todo o resto saiu no `default` acima. Cancelar o
      comportamento padrão de TODAS as teclas quebraria coisas legítimas,
      como F5, Ctrl+C e a barra de rolagem.
    */
    evento.preventDefault();
}


// ============================================================
// LIGAR O MOTOR
// ============================================================
/*
  Duas linhas idênticas às do passo 4 — o motor não mudou.
  O que mudou foi só quem decide a direção.
*/
setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
desenhar();
