# Xadrez — Passo 1: O tabuleiro

**Rode:** abra o `index.html`, com o console (F12) aberto. Clique nas casas.

---

## O que você vê

Um tabuleiro de 64 casas, alternando claras e escuras, com o nome de cada uma escrito nela
(temporário — some no passo 2). Clicar imprime a casa no console.

Confira a orientação: **a1 embaixo à esquerda, h8 em cima à direita.**

---

## A decisão que abre o módulo: sem canvas

Cobrinha e Pong pintavam pixels num `<canvas>`. Aqui não há nenhum.

Um tabuleiro de xadrez não é pintura que muda 60 vezes por segundo — são **64 casas
discretas, que se clicam uma a uma**. Isso é HTML.

Três consequências práticas, todas de graça:

1. **CSS Grid resolve o layout** em três linhas;
2. **cada casa é um `<button>`**: clicável, focável por Tab, dispara com Enter;
3. **um leitor de tela consegue anunciá-la** — no canvas, tudo é uma imagem muda.

> **Canvas é para pintura que muda muitas vezes por segundo. Interface feita de peças
> discretas e clicáveis é HTML.** Escolher a ferramenta pelo problema vale mais do que usar
> sempre a mais poderosa.

---

## CSS Grid

```css
#tabuleiro {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    aspect-ratio: 1;
}
```

- `1fr` é uma unidade de **fração do espaço disponível**; oito delas repartem a largura
  igualmente;
- `aspect-ratio: 1` mantém o quadrado perfeito em qualquer largura;
- **não dizemos nada sobre as linhas**: colocamos 64 filhos numa grade de 8 colunas e o
  navegador quebra em 8 linhas sozinho.

Antes do Grid, isto exigia floats, cálculos de porcentagem e um truque com `padding` para
manter a proporção. Vale saber o que foi resolvido de graça.

### `vmin`

```css
--tamanho-do-tabuleiro: min(78vmin, 560px);
```

`vmin` é 1% do **menor** lado da janela. O tabuleiro cabe tanto num celular em pé quanto
num monitor deitado — **sem nenhuma media query**.

---

## Array de 64, não matriz 8×8

```js
indice = linha * 8 + coluna
```

Poderíamos usar oito arrays dentro de um. Um array plano é mais simples de percorrer e
**muito** mais rápido de copiar — e, no passo 7, o computador vai copiar este tabuleiro
dezenas de milhares de vezes por jogada.

Quando precisamos raciocinar em duas dimensões, convertemos com três funçõezinhas:
`linhaDe`, `colunaDe`, `indiceDe`.

### A convenção

| | |
|---|---|
| índice 0 | a8 — canto superior esquerdo, onde as pretas começam |
| índice 63 | h1 — canto inferior direito, onde as brancas começam |
| linha 0 | oitava fileira · linha 7 = primeira |
| coluna 0 | coluna "a" · coluna 7 = "h" |

A linha **cresce para baixo**, como no canvas e como numa planilha: é a ordem em que a
página é lida, e por isso a mais natural para desenhar.

---

## A cor da casa em uma linha

```js
const ehClara = (linhaDe(indice) + colunaDe(indice)) % 2 === 0;
```

Some as coordenadas de qualquer casa de um tabuleiro real e confira. É o mesmo padrão de um
piso quadriculado — e ele cai direto numa linha de código, sem tabela nenhuma.

> Vale procurar esse tipo de regularidade antes de escrever dados na mão. Muita coisa que
> parece precisar de uma tabela é só uma continha.

---

## HTML gerado por código

O `<div id="tabuleiro">` está **vazio** no HTML. As 64 casas nascem em JavaScript.

Escrever 64 elementos à mão seria possível — e insuportável de manter. **Sempre que um HTML
fica repetitivo, é sinal de que ele deveria ser gerado.**

---

## Experimente

1. Mude `repeat(8, 1fr)` para `repeat(4, 1fr)` e veja o navegador reorganizar tudo em 16
   linhas, sozinho.
2. Troque a condição da cor para `% 3 === 0` e observe o padrão quebrar — depois entenda
   por quê.
3. Aperte **Tab** várias vezes e veja o foco andar pelas casas. Agora imagine fazer isso
   com um canvas.
4. Faça as casas mostrarem o **índice** (0 a 63) em vez do nome, e confira a fórmula
   `linha * 8 + coluna` com os olhos.
5. Adicione as coordenadas nas bordas: letras embaixo, números à esquerda. Dica: um
   pseudo-elemento `::before` só nas casas da primeira coluna.
6. Faça o tabuleiro nascer virado (h1 no canto superior esquerdo). Dica: percorra os
   índices ao contrário. Guarde a ideia — ela vira um botão no passo final.

---

**Próximo:** `02-pecas` — o tabuleiro ganha ocupantes.
