# Tetris — Passo 7: A próxima peça

**Mudou:** tudo — `script.js`, `index.html` e `style.css` (o painel, a mensagem, o botão)
**Rode:** abra o `index.html` e clique em **Iniciar**.

---

## O que você vê

Uma partida de verdade: começa no botão, mostra a próxima peça num painel ao lado e
termina quando o poço enche. O poço começa vazio — o exemplo dos passos anteriores saiu.

---

## 1. Aleatório não é o mesmo que justo

Até aqui cada peça era sorteada com `Math.random`, independente das outras. Isso permite
cinco S seguidos. Ou trinta peças sem nenhum I. É aleatório — e quem perde por isso sente
que o jogo roubou.

A saída é o **saco**:

```js
function tirarDoSaco() {
    if (saco.length === 0) {
        saco = embaralhar([...TIPOS]);
    }
    return saco.pop();
}
```

As sete peças entram num saco, embaralhadas, e saem uma a uma. Só quando o saco esvazia ele
é enchido de novo. A sorte continua existindo — você não sabe a ordem —, mas dentro de
limites: em cada sete peças seguidas (contadas desde o começo do saco) há exatamente uma de
cada, e **nunca passam mais de 12 peças sem um I**.

> **Aleatoriedade é uma ferramenta de design, não uma lei da natureza.** Você escolhe quanto
> acaso o jogador aguenta.

### Embaralhar direito: Fisher-Yates

```js
for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
}
```

Do fim para o começo: em cada posição `i`, sorteia uma posição `j` entre 0 e `i` e troca
as duas. A parte já percorrida está decidida e não é mais tocada. Cada uma das 5040 ordens
possíveis tem exatamente a mesma chance.

A tentação comum — `lista.sort(() => Math.random() - 0.5)` — **não é justa**. O `sort`
espera uma comparação coerente ("se a < b e b < c, então a < c"); com uma moeda no lugar,
ele produz algumas ordens bem mais que outras.

### `[...TIPOS]`

Os três pontos espalham a lista dentro de uma nova: é uma **cópia**. Embaralhar a própria
`TIPOS` funcionaria hoje e estragaria, sem aviso, qualquer código que contasse com a ordem
original. A referência do passo 1, outra vez.

---

## 2. A próxima peça à vista

Saber o que vem depois transforma **reação em planejamento**. É uma informação pequena que
muda o jogo inteiro.

A fila tem dois lugares: a peça que cai e a que está à vista.

```js
function nascerProxima() {
    pecaAtual = criarPeca(proximoTipo);
    proximoTipo = tirarDoSaco();
}
```

### A mesma arte, em outro canvas

```js
function desenharBloco(contexto, x, y, cor) { ... }
```

O desenho do bloco foi separado da célula. `desenharCelula` fala de colunas e linhas **do
poço**; `desenharBloco` só sabe de pixels e de **qual canvas** pintar. A caixa da próxima
peça não tem colunas do poço — e usa a mesma arte sem uma linha duplicada.

### Centralizar o que importa

A matriz do I tem uma linha vazia em cima e duas embaixo. Centralizar a **matriz** deixaria
a peça torta na caixa. Então primeiro medimos os quadrados de verdade — menor e maior coluna
e linha ocupadas — e centralizamos **esse** retângulo.

E a caixa só é redesenhada quando nasce uma peça, não 60 vezes por segundo. Nem tudo
precisa entrar no loop.

---

## 3. A máquina de estados volta

```js
let estado = "menu";   // "menu" | "jogando" | "fim"
```

A mesma ideia do Pong. Cada parte do código consulta essa variável:

| Onde | O que faz com o estado |
|---|---|
| o loop | só aplica a gravidade se for `"jogando"`; desenha sempre |
| o teclado | fora de `"jogando"`, ignora as teclas — e não as cancela |
| `nascerProxima` | se a peça nasce sem caber, muda para `"fim"` |
| o botão | muda para `"jogando"` |

### O fim de jogo é uma pergunta que já existia

```js
if (!cabe(pecaAtual.forma, pecaAtual.coluna, pecaAtual.linha)) {
    terminarPartida();
}
```

Nenhuma regra nova: é a mesma `cabe` do passo 3, feita no lugar onde a peça nasce.

---

## Detalhes que valem notar

### Reiniciar é zerar tudo, num lugar só

`iniciarPartida` põe **todo** o estado de volta no ponto de partida: o poço, o saco, os
pontos, a tecla ↓. Esqueça uma variável e ela vaza de uma partida para a outra — o placar
que não zera, o saco com sobras da anterior.

### `botaoIniciar.blur()`

Depois do clique, o botão fica com o foco. E o Espaço, num botão focado, **clica nele**: a
primeira derrubada reiniciaria a partida. Tirar o foco resolve.

### O poço da partida que acabou continua visível

O loop desenha mesmo no estado `"fim"`. É por isso que, atrás da mensagem, dá para ver como
o poço terminou.

---

## Experimente

1. Volte ao sorteio puro (`TIPOS[Math.floor(Math.random() * TIPOS.length)]`) e jogue
   duas partidas. Depois volte ao saco. Dá para sentir a diferença?
2. Troque o Fisher-Yates por `lista.sort(() => Math.random() - 0.5)`. Escreva um teste no
   console: embaralhe `[0, 1, 2]` 60.000 vezes e conte quantas vezes sai cada uma das seis
   ordens. Faça o mesmo com o Fisher-Yates.
3. Mostre **as três próximas** peças em vez de uma. Dica: o saco pode ficar com poucas
   peças — encha antes de ele esvaziar.
4. Comente `botaoIniciar.blur()`, comece uma partida com o mouse e aperte Espaço.
5. Faça o saco ter duas peças de cada tipo (14 no total). O jogo fica mais ou menos
   previsível?
6. No fim de jogo, pinte o poço inteiro de cinza, linha por linha, de baixo para cima.

---

**Anterior:** `06-linhas` · **Próximo:** `08-velocidade` — o jogo acelera, e precisa
continuar justo.
