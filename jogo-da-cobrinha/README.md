# Jogo da Cobrinha — HTML, CSS, JavaScript, Canvas e DOM

Um jogo da cobrinha construído do zero, em **dez passos**, cada um com seu guia.

Nenhuma instalação, nenhuma ferramenta, nenhuma dependência: só abrir o `index.html` da
pasta no navegador.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-estrutura`](01-estrutura/) | HTML puro | tags, árvore, atributos, `id`, semântica, o inspetor (F12) |
| 2 | [`02-estilo`](02-estilo/) | CSS | seletores, cascata, herança, variáveis, box model, flexbox |
| 3 | [`03-desenho`](03-desenho/) | JS: primeiro quadrado | DOM, contexto do canvas, `fillRect`, células vs pixels, ler erros |
| 4 | [`04-movimento`](04-movimento/) | o quadrado anda | game loop, `let` vs `const`, funções, apagar e repintar |
| 5 | [`05-teclado`](05-teclado/) | as setas funcionam | eventos, objeto de evento, `preventDefault`, `switch` |
| 6 | [`06-cobra`](06-cobra/) | vira uma cobra | arrays, `unshift`/`pop`, `forEach`, cópia de objeto |
| 7 | [`07-maca`](07-maca/) | algo para comer | `Math.random`, `do/while`, `some`, colisão por igualdade |
| 8 | [`08-colisao`](08-colisao/) | dá para perder | guard clause, off-by-one, `slice`, `clearInterval` |
| 9 | [`09-interface`](09-interface/) | placar, tempo, reiniciar | `textContent`, `relative`/`absolute`, HTML vs canvas |
| — | [`final`](final/) | visual pixelado | resolução vs tamanho na tela, sprites, escala inteira |

Cada pasta é **independente e roda sozinha**. Você pode abrir qualquer uma, quebrar tudo,
e continuar na seguinte sem prejuízo.

---

## Como usar

1. Abra o `index.html` da pasta do passo e **jogue** um pouco.
2. Leia o `GUIA.md` daquela pasta.
3. Leia o código-fonte — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios do fim do guia. **Não pule esta parte:** é onde o conhecimento sai
   do papel.
5. Só então vá para o próximo passo.

Do passo 3 em diante, mantenha o **F12** aberto na aba *Console*. É lá que os erros
aparecem, e ler um erro é uma habilidade tão importante quanto escrever código.

---

## Depois da trilha

O guia do [`final`](final/GUIA.md) traz **37 exercícios em 7 níveis**, que vão bem
além da cobrinha: movimento contínuo com `requestAnimationFrame` e delta time, colisão
entre retângulos, ricochete, teclas simultâneas para dois jogadores, máquina de estados,
oponente controlado por código e som.

Quem terminar os 37 tem tudo o que precisa para escrever um jogo próprio sem seguir
tutorial nenhum.

---

## Dica para quebrar as coisas com segurança

Antes de mexer em uma pasta, faça uma cópia dela. Depois estrague o que quiser: apague
linhas, troque números, inverta a ordem das coisas.

> **Ver o código quebrar de um jeito que você previu ensina mais do que ver o código
> funcionar.** É a diferença entre saber que uma linha está lá e saber por que ela está.
