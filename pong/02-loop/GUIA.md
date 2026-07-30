# Pong — Passo 2: O loop

**Mudou:** `script.js`
**Rode:** abra o `index.html`.

---

## O que você vê

A bola sai do centro, atravessa a tela na diagonal e **some**. Depois, nada.

Está certo. Ninguém contou a ela que existem paredes — isso é o passo 3. Aproveite: seu
jogo tem um bug que você entende por completo, que é a situação mais confortável que existe
em programação.

---

## 1. Velocidade é um par de números

```js
velocidadeX: 63,
velocidadeY: 28
```

Na cobrinha havia `direcao` com quatro valores: `"cima"`, `"baixo"`, `"esquerda"`,
`"direita"`. Quatro palavras, quatro direções.

Este par faz muito mais: carrega **direção e rapidez ao mesmo tempo** e representa
**qualquer** ângulo. Um `switch` de quatro casos jamais descreveria um movimento a 37 graus.

Isso tem nome: é um **vetor**.

```js
bola.x += bola.velocidadeX * tempo;
bola.y += bola.velocidadeY * tempo;
```

Duas linhas substituem o `switch` inteiro — e fazem mais.

---

## 2. `requestAnimationFrame`

```js
function quadroAQuadro(instanteAtual) {
    ...
    requestAnimationFrame(quadroAQuadro);   // agenda o próximo
}
requestAnimationFrame(quadroAQuadro);        // dá a partida
```

Uma função **que se agenda de novo**. Não há laço nenhum: cada quadro pede o próximo, e é
isso que mantém a roda girando.

Vantagens sobre o `setInterval` da cobrinha:

| | `setInterval` | `requestAnimationFrame` |
|---|---|---|
| Ritmo | fixo, que você escolhe | o da tela (60Hz, 120Hz, 144Hz…) |
| Sincronia com a tela | nenhuma — pode "rasgar" a imagem | garantida |
| Aba em segundo plano | continua rodando e gastando bateria | pausa sozinho |
| Tempo | você não sabe quanto passou | recebe um carimbo preciso |

---

## 3. Delta time — a ideia central deste passo

```js
const segundos = (instanteAtual - instanteDoQuadroAnterior) / 1000;
bola.x += bola.velocidadeX * segundos;
```

**Por que isso existe:** telas rodam a taxas diferentes. Se cada quadro movesse a bola uma
quantidade fixa, o jogo ficaria **mais rápido em máquinas melhores** — e quem tem tela de
144Hz jogaria um jogo 2,4 vezes mais veloz.

Multiplicando pelo tempo realmente decorrido, a velocidade vale o mesmo em qualquer lugar.

> É por isso que as constantes deste jogo estão em **pixels por segundo**, nunca "por
> quadro". Anote a unidade nos seus nomes e constantes; metade dos bugs de física vem de
> misturar unidades.

Este bug é dos piores porque **você nunca o vê**: na sua máquina, está perfeito.

### O teto no delta

```js
const tempo = Math.min(segundos, 0.05);
```

Se a aba ficar 10 segundos em segundo plano, o primeiro quadro de volta traria um delta
gigante — e a bola saltaria de um lado ao outro da tela de uma vez, atravessando tudo pelo
caminho.

Limitar a 0,05s (equivalente a 20 quadros por segundo) é a proteção padrão.

> **Prefira o jogo engasgar a ele teleportar.** Essa linha evita a classe inteira de bugs
> de "atravessou a parede".

---

## 4. Posições fracionárias

```js
bola.x   // 73.42
```

Se a velocidade é 70 px/s e passaram 0,016s, a bola anda **1,12 pixel**.

Na cobrinha, as posições eram sempre inteiras. Aqui, quase nunca. Duas consequências:

**Na hora de desenhar**, arredondamos:

```js
pincel.fillRect(Math.round(objeto.x), Math.round(objeto.y), ...)
```

Sem isso, o canvas tenta pintar "quase" um pixel e "quase" o vizinho, suavizando a borda —
e o quadrado sai borrado, arruinando o visual pixelado. Repare que a posição **real**
continua fracionária: o arredondamento é só para a pintura.

**Na hora de colidir**, comparar igualdade deixa de funcionar. `bola.x === raquete.x` seria
verdadeiro quase nunca. É o assunto do passo 5.

---

## Experimente

1. Mude `VELOCIDADE_DA_BOLA` para 300 e para 10.
2. Zere `velocidadeY` — a bola anda na horizontal. Zere `velocidadeX` — na vertical.
   Agora tente fazer isso com o `switch` da cobrinha.
3. Troque `Math.min(segundos, 0.05)` por `segundos` puro. Abra a página, mude de aba por
   uns 10 segundos e volte: a bola pula a tela inteira de uma vez.
4. Tire o `Math.round` do `desenharRetangulo` e olhe bem a bola em movimento: as bordas
   ficam cinzentas e trêmulas.
5. Imprima o delta no console: `console.log(segundos)`. Você vai ver números perto de
   0,0167 — que é 1/60. Se der 0,0083, sua tela é de 120Hz.
6. Some `bola.velocidadeY += 100 * tempo` dentro de `atualizar`. Acabou de inventar a
   gravidade.

---

**Anterior:** `01-tela` · **Próximo:** `03-paredes` — a bola descobre que existem limites.
