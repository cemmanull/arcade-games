# Tetris — de volta à grade

Oito passos, de um poço parado até um jogo completo com níveis, peça fantasma, recorde e
controles de toque.

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-poco`](01-poco/) | o poço parado | matriz, `poco[linha][coluna]`, a armadilha do `fill`, guardar a letra e não a cor |
| 2 | [`02-pecas`](02-pecas/) | as sete peças | formas como dados, formas quadradas, posição da peça + posição na matriz |
| 3 | [`03-queda`](03-queda/) | a peça cai e trava | acumulador de tempo, testar antes de mover, a peça vira poço |
| 4 | [`04-controles`](04-controles/) | você joga | evento por toque × tecla presa, `evento.repeat`, laço de corpo vazio |
| 5 | [`05-rotacao`](05-rotacao/) | a peça gira | girar uma matriz, imutabilidade, empurrões como dados |
| 6 | [`06-linhas`](06-linhas/) | linhas somem | limpar é filtrar, o bug do `splice` no laço, tabela de pontos |
| 7 | [`07-proxima`](07-proxima/) | uma partida | saco de sete, Fisher-Yates, segundo canvas, máquina de estados |
| 8 | [`08-velocidade`](08-velocidade/) | o jogo acelera | curva como tabela, peça fantasma, repetição própria, tempo para travar |
| — | [`final`](final/) | menu, pausa, som, recorde, guardar, toque | o guia completo, com 15 exercícios |

---

## Por que este módulo vem depois do Pong

A cobrinha vivia numa **grade**. O Pong abandonou a grade e trouxe o **tempo contínuo**. O
Tetris junta os dois: as peças andam de casa em casa, mas o loop por baixo é o do Pong.

| | Cobrinha | Pong | Tetris |
|---|---|---|---|
| Posição | `{coluna, linha}` | `x: 73.42` | `{coluna, linha}` |
| O mundo | uma lista de pedaços | três objetos | **uma matriz** |
| Loop | `setInterval` | `requestAnimationFrame` | `requestAnimationFrame` + acumuladores |
| Colisão | igualdade | sobreposição (AABB) | "cabe?" — perguntar antes de mover |
| Entrada | última tecla | teclas presas | os dois, cada um para a sua ação |

E uma ideia nova, que vale para o resto da carreira: quando uma peça para, **ela deixa de
existir como objeto** e vira casas do poço. O estado inteiro do jogo é uma matriz e uma peça.

Vem logo depois do Pong.

---

## Verificação

Como os outros módulos, este foi testado, não só escrito. Cada passo rodou num navegador
real, sem interface, com o loop movido quadro a quadro por um script:

- **nenhum erro** de console em nenhum dos nove passos;
- um robô apertando teclas ao acaso por 30.000 quadros em cada passo jogável: a peça em jogo
  **nunca** ocupa uma casa ocupada nem sai do poço, e o poço continua com 20×10;
- girar qualquer peça quatro vezes devolve a forma original, e girar e desgirar também; o
  catálogo de peças termina intacto;
- o saco de sete: em 1.000 sacos seguidos, cada bloco de sete tem as sete peças, 1.000 de
  cada;
- repetição de tecla: um toque move na hora, nada repete antes de 0,17 s, depois repete;
- tempo para travar: a peça no chão espera, um movimento renova a espera, e girar sem parar
  no chão **não** adia para sempre (trava em menos de 2 s) — a primeira versão adiava, e foi
  este teste que achou;
- no final: guardar troca uma vez por peça; a pausa congela tudo, inclusive as linhas
  piscando; trocar de janela pausa; o toque move e repete como o teclado; o fim de jogo salva
  o recorde, um `localStorage` com lixo não quebra nada, e "jogar de novo" zera o estado;
- numa tela de celular (390×750), poço, caixas e botões de toque cabem sem rolar.

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Vários pedem para você quebrar o código de propósito: é onde a lição
   gruda.

Antes de mexer numa pasta, faça uma cópia.

---

**Antes:** [`../pong`](../pong/) · **Depois:** [`../dealer-out`](../dealer-out/) · **Índice:** [`../README.md`](../README.md)
