/*
  XADREZ — PASSO 1: O TABULEIRO

  64 casas, alternando entre claras e escuras.

  Duas ideias, e as duas se pagam ao longo de todo o módulo:

  1. O TABULEIRO É UM ARRAY DE 64, NÃO UMA MATRIZ 8x8.

     Poderíamos usar oito arrays dentro de um. Um array plano é mais
     simples de percorrer e MUITO mais rápido de copiar — e, lá no passo
     7, o computador vai copiar este tabuleiro dezenas de milhares de
     vezes por jogada.

     A conversão entre as duas visões é uma continha só:

         indice = linha * 8 + coluna

  2. AS CASAS SÃO <button>, NÃO <div>.

     Um botão é clicável, recebe foco pelo Tab, dispara com Enter e é
     anunciado por leitores de tela — tudo isso de graça. Uma <div>
     precisaria de código para cada uma dessas coisas.

     Escolher o elemento certo economiza mais trabalho do que qualquer
     truque de CSS.
*/


// ============================================================
// DOM
// ============================================================
const elementoTabuleiro = document.getElementById("tabuleiro");


// ============================================================
// COORDENADAS
// ============================================================
/*
  A convenção que vamos usar o módulo inteiro:

      indice 0  = a8 (canto superior esquerdo, onde as pretas começam)
      indice 63 = h1 (canto inferior direito, onde as brancas começam)

      linha 0 = oitava fileira      coluna 0 = coluna "a"
      linha 7 = primeira fileira    coluna 7 = coluna "h"

  Repare que a linha CRESCE PARA BAIXO, como no canvas e como numa
  planilha. É a ordem em que a página é lida, e por isso a mais natural
  para desenhar.
*/
function linhaDe(indice) {
    return Math.floor(indice / 8);
}

function colunaDe(indice) {
    return indice % 8;
}

function indiceDe(linha, coluna) {
    return linha * 8 + coluna;
}

/*
  Converte um índice para o nome que humanos usam: 0 vira "a8",
  63 vira "h1". Só para mostrar e depurar — a lógica trabalha com números.
*/
function nomeDaCasa(indice) {
    const letra = "abcdefgh"[colunaDe(indice)];
    const numero = 8 - linhaDe(indice);
    return `${letra}${numero}`;
}


// ============================================================
// MONTAR O TABULEIRO
// ============================================================
const casasDaTela = [];   // os 64 botões, na ordem dos índices

/*
  As letras e números que aparecem nos cantos do tabuleiro.

  Só as casas da BORDA recebem o atributo: a coluna 0 ganha o número da
  fileira, a linha 7 ganha a letra da coluna. As demais ficam sem nada.

  O CSS lê esses atributos com attr(data-fileira). Como as outras casas
  não têm o atributo, o conteúdo sai vazio e nada aparece — sem precisar
  de nenhuma regra extra para escondê-las.

  É um jeito de guardar informação NO PRÓPRIO ELEMENTO, em vez de manter
  uma tabela paralela. Qualquer atributo começado por "data-" é livre
  para você inventar.
*/
function marcarCoordenadas(casa, indice) {
    if (colunaDe(indice) === 0) {
        casa.dataset.fileira = 8 - linhaDe(indice);
    }

    if (linhaDe(indice) === 7) {
        casa.dataset.coluna = "abcdefgh"[colunaDe(indice)];
    }
}

function montarTabuleiro() {
    for (let indice = 0; indice < 64; indice++) {
        const casa = document.createElement("button");
        casa.type = "button";
        casa.className = "casa";

        /*
          A COR DA CASA, sem nenhuma tabela:

              (linha + coluna) par  -> clara
              (linha + coluna) ímpar -> escura

          Some as coordenadas de qualquer casa de um tabuleiro real e
          confira. É o mesmo padrão de um piso quadriculado, e ele cai
          direto numa linha de código.
        */
        const ehClara = (linhaDe(indice) + colunaDe(indice)) % 2 === 0;
        casa.classList.add(ehClara ? "clara" : "escura");

        marcarCoordenadas(casa, indice);

        // Um nome acessível: sem isto, um leitor de tela diria "botão" 64 vezes.
        casa.setAttribute("aria-label", nomeDaCasa(indice));

        casa.addEventListener("click", () => {
            console.log("clicou em", nomeDaCasa(indice), "| índice", indice);
        });

        casasDaTela[indice] = casa;
        elementoTabuleiro.appendChild(casa);
    }
}


montarTabuleiro();

console.log("Abra o console e clique nas casas.");
console.log("Confira: a1 está embaixo à esquerda? h8 em cima à direita?");
