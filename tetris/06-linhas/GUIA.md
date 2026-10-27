# Tetris — Passo 6: As linhas

**Mudou:** `script.js`, `index.html` e `style.css` (o placar)
**Rode:** abra o `index.html`. Derrube um I em pé na coluna da direita.

---

## O que você vê

Quatro linhas somem de uma vez, tudo o que estava em cima desce, e o placar marca 800. É
um jogo.

---

## Limpar é filtrar

```js
function limparLinhas() {
    const restantes = poco.filter(linha => linha.includes(null));
    const quantas = LINHAS - restantes.length;

    while (restantes.length < LINHAS) {
        restantes.unshift(criarLinhaVazia());
    }

    poco = restantes;
}
```

1. `filter` fica só com as linhas que **ainda têm alguma casa vazia** — ou seja, descarta
   as completas. O poço encolhe.
2. Para cada linha descartada, uma vazia entra **no topo** com `unshift`.

Ninguém move casa nenhuma. Tudo o que estava acima de uma linha removida "desce" porque
mudou de **posição na lista**.

Esse é o retorno da decisão do passo 1: guardar o poço como **uma lista de linhas**. A
operação que o jogo precisa — "tirar uma linha inteira" — é uma operação natural de lista.
Se o poço fosse uma lista única de 200 casas, seria um laço cheio de contas com índices.

> **Escolha a estrutura de dados pela operação que você mais vai fazer.**

### O bug que o `filter` evita

O caminho óbvio seria percorrer o poço e remover com `splice` as linhas cheias:

```js
for (let i = 0; i < poco.length; i++) {
    if (!poco[i].includes(null)) poco.splice(i, 1);   // BUG
}
```

Ao remover a linha 18, a 19 escorrega para o lugar 18 — e o laço, que já está indo para o
19, **pula** a que acabou de chegar. Com duas linhas completas seguidas, uma fica para trás.

O `filter` não tem esse problema porque **não mexe na lista enquanto a percorre**: ele
monta uma nova. Mexer numa lista enquanto se anda por ela é uma das fontes de bug mais
antigas da programação.

---

## A tabela de pontos

```js
const PONTOS_POR_LINHAS = [0, 100, 300, 500, 800];
pontos += PONTOS_POR_LINHAS[quantas];
```

O índice é a quantidade de linhas. Nenhum `if (quantas === 1) ... else if ...`: a regra é
um dado.

E repare que a tabela **não cresce em linha reta**: quatro linhas valem 800, não 400. É
ela que ensina o jogador a arriscar — deixar uma chaminé aberta e esperar pelo I paga o
dobro. **O número numa tabela decide como as pessoas jogam.**

---

## O placar é HTML

Como no Pong: texto de verdade, que pode ser ampliado, selecionado e lido por um leitor de
tela, mora no HTML. O canvas fica só com o que é gráfico.

```js
campoPontos.textContent = pontos;
```

E o placar só é atualizado quando algo muda — ao limpar linhas, ao recomeçar — e não a cada
quadro. Mexer no DOM 60 vezes por segundo sem necessidade é um desperdício que o navegador
cobra.

---

## Detalhes que valem notar

### Guard clause

```js
if (quantas === 0) return;
```

A maioria das peças não limpa linha nenhuma. Sair cedo deixa o resto da função falar só do
caso interessante.

### `includes(null)`

"Esta linha ainda tem alguma casa vazia?" é exatamente o que `includes` pergunta. O `null`
escolhido no passo 1 para "vazio de propósito" rende uma frase legível aqui.

---

## Experimente

1. Troque o `filter` pelo laço com `splice` mostrado acima. Monte um exemplo com duas
   linhas completas seguidas e veja uma sobrar. Depois corrija percorrendo de **baixo para
   cima** (`i--`) — por que assim funciona?
2. Mude a tabela para `[0, 100, 200, 300, 400]`. Ainda vale a pena esperar pelo I?
3. Troque `unshift` por `push`. As linhas vazias vão para o fundo. Descreva o que acontece
   com os blocos.
4. Mostre no placar o **maior combo de linhas** da partida (1, 2, 3 ou 4).
5. Faça o placar piscar quando houver um "tetris" (quatro linhas): uma classe CSS com
   animação, adicionada e removida pelo script.

---

**Anterior:** `05-rotacao` · **Próximo:** `07-proxima` — um sorteio justo, a próxima peça
e um fim de jogo de verdade.
