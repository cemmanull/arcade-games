# Xadrez — Passo 2: As peças

**Mudou:** `script.js` e `style.css`
**Rode:** abra o `index.html`. Clique nas casas com o console aberto.

---

## O que você vê

A posição inicial do xadrez. As 32 peças no lugar.

---

## A decisão central: uma peça não sabe onde está

```js
{ cor: "brancas", tipo: "cavalo" }     // e nada mais
```

Seria natural escrever `{ cor, tipo, linha, coluna }`. **Não faça isso.**

Se a peça guardasse a própria posição, existiriam **duas fontes de verdade**: o índice do
array e o campo dentro da peça. Elas concordariam quase sempre — e, no dia em que
discordassem (um movimento que atualiza uma e esquece a outra), o bug seria daqueles que
levam uma tarde e aparecem longe da causa.

> **Quem sabe onde a peça está é o tabuleiro.** A posição é o índice do array; a peça é só
> *o que* está ali.

Esse princípio tem nome fora do xadrez: **um fato, um lugar**. Toda vez que você guardar a
mesma informação em dois lugares, está criando a chance de elas divergirem.

### Uma consequência agradável

Como a peça nunca muda, podemos criar **uma única de cada tipo** e reutilizá-la em todas as
casas. As 8 torres do tabuleiro são, na memória, dois objetos.

`Object.freeze` garante que ninguém altere uma delas por acidente — o que estragaria todas
as outras de uma vez.

---

## Casa vazia é `null`

```js
const casas = new Array(64).fill(null);
```

Não `undefined`, não `0`, não `""`. `null` significa **"vazio de propósito"**, e é isso
mesmo que uma casa vazia é.

`if (peca === null)` se lê como português. Um dia você vai agradecer por não ter escolhido
`0`.

---

## FEN — ler um formato que já existe

```js
"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
```

O formato padrão para escrever uma posição de xadrez em uma linha. Minúsculas são pretas,
MAIÚSCULAS são brancas, um número quer dizer "tantas casas vazias seguidas", e a barra
separa as fileiras — da oitava para a primeira.

Aceitar esse formato custou 20 linhas e comprou três coisas:

1. a posição inicial deixou de ser 32 linhas escritas à mão;
2. dá para carregar **qualquer** posição para testar — um final, um problema de mate, uma
   armadilha de abertura;
3. é o formato que todo programa de xadrez do mundo entende.

> **Ler um formato existente quase sempre custa menos do que inventar o seu** — e te dá
> acesso a tudo que já foi escrito nele.

Experimente no console: `carregarPosicao("8/8/4k3/8/8/4K3/8/8")`.

---

## Montar uma vez, desenhar sempre

```js
montarTabuleiro()   // cria os 64 botões UMA VEZ
desenhar()          // atualiza o conteúdo deles, sempre que preciso
```

Nas lições anteriores o conselho foi *"apague tudo e redesenhe"*. Aqui reaproveitamos os
elementos — e o motivo é concreto:

> Recriar os botões destruiria o que está com o **foco do teclado**. Quem joga sem mouse
> perderia o lugar no tabuleiro a cada jogada.

O princípio continua valendo: o conteúdo é sempre derivado do estado. O que muda é que
reaproveitamos as caixas em vez de jogá-las fora.

---

## Peças de texto, não imagens

```js
SIMBOLOS.brancas.rei   // "♔"
```

O Unicode tem símbolos de xadrez desde os anos 90. Eles acompanham o tamanho da fonte,
nunca ficam borrados, não precisam ser baixados e podem ser copiados junto com o texto.

### O detalhe curioso do CSS

Os símbolos **brancos** (♔♕♖) são apenas **contornos vazados** — eles desaparecem sobre as
casas claras.

A solução é pintá-los de branco e dar um contorno escuro com quatro `text-shadow`, uma para
cada direção. É o truque padrão para simular contorno em texto.

---

## Acessibilidade por uma linha

```js
casa.setAttribute("aria-label", "e4, cavalo branco");
```

Sem isso, um leitor de tela anuncia "botão" 64 vezes. Com isso, uma pessoa cega consegue
percorrer o tabuleiro e saber o que há em cada casa.

Sempre que um elemento tem significado que não está no seu texto visível, ele precisa de um
nome acessível.

---

## Experimente

No console:

1. `casas[0]` — a torre preta de a8. `casas[60]` — o rei branco.
2. `casas.filter(p => p && p.tipo === "peao").length` → 16.
3. `casas = carregarPosicao("8/8/4k3/8/8/4K3/8/8"); desenhar()` — só dois reis.
4. `casas[35] = PECAS.brancas.dama; desenhar()` — uma dama do nada.

No código:

5. Troque o `POSICAO_INICIAL` por uma abertura conhecida:
   `"rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR"`.
6. Faça as peças pretas ficarem vermelhas, com uma classe `.peca-preta`.
7. Adicione um contador de material no rodapé: peão 1, cavalo e bispo 3, torre 5, dama 9.
8. Tente `casas[0].tipo = "dama"`. Não funciona — `Object.freeze` protegeu a peça. E ainda
   bem: se funcionasse, **todas** as torres pretas virariam damas de uma vez.

---

**Anterior:** `01-tabuleiro` · **Próximo:** `03-selecionar` — as peças começam a se mover.
