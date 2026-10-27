# Shoot 'em up — Passo 2: A nave

**Mudou:** `script.js` e a linha de ajuda
**Rode:** abra o `index.html`. Setas ou WASD.

---

## O que você vê

A nave voa para todos os lados — inclusive na diagonal, segurando duas teclas — e para na
borda da tela.

---

## Intenção, de novo

```js
let intencaoX = 0;
let intencaoY = 0;

if (estaPressionada("arrowleft", "a"))  intencaoX -= 1;
if (estaPressionada("arrowright", "d")) intencaoX += 1;
if (estaPressionada("arrowup", "w"))    intencaoY -= 1;
if (estaPressionada("arrowdown", "s"))  intencaoY += 1;
```

A mesma ideia do Dealer? Out!: as teclas não movem a nave, elas dizem para onde ela **quer**
ir. A diferença é que agora a intenção tem **dois** eixos. E ← com → se anulam em zero, que é
o que os dedos esperam.

O teclado é o do Pong — o painel de interruptores. Aqui ele é ainda mais necessário: um jogo
de nave com duas teclas presas ao mesmo tempo é a regra, não a exceção.

---

## O bug da diagonal

Com ← e ↑ juntas, a intenção é `(-1, -1)`. Quanto mede esse vetor?

```
     (-1, -1)
        ●
        |\
      1 | \  √2 ≈ 1,41
        |  \
        ●───●
          1
```

A diagonal de um quadrado de lado 1. Pitágoras — o `Math.hypot` do Pong — dá √2. Multiplicado
pela velocidade, **a nave andaria 41% mais rápido na diagonal.**

Parece detalhe. Não é: quem joga descobre em minutos, e passa a voar sempre torto, porque é
mais rápido. Um bug de matemática vira uma estratégia — e uma estratégia boba.

### A cura: normalizar

```js
const comprimento = Math.hypot(intencaoX, intencaoY);

if (comprimento > 0) {
    intencaoX /= comprimento;
    intencaoY /= comprimento;
}
```

Dividir cada componente pelo comprimento deixa o vetor com tamanho **1**, sem mudar a direção.
`(-1, -1)` vira `(-0,707, -0,707)`. Agora a velocidade vale o mesmo em qualquer direção.

| Intenção | Comprimento | Depois de normalizar |
|---|---|---|
| `(1, 0)` | 1 | `(1, 0)` — nada muda |
| `(-1, -1)` | 1,41 | `(-0,71, -0,71)` |
| `(0, 0)` | 0 | não divide: seria dividir por zero |

**Normalizar** é das operações mais usadas em jogos. No passo 6, os inimigos vão usá-la para
mirar.

> Um vetor normalizado responde só **para onde**. Quanto, quem decide é quem multiplica.

---

## O clamp com o centro

```js
const meiaLargura = SPRITE_DA_NAVE[0].length / 2;
nave.x = Math.max(meiaLargura, Math.min(nave.x, tela.width - meiaLargura));
```

O clamp do Pong. Como `x` é o centro, a nave pode chegar só até metade do seu tamanho perto
da borda. É a conta que guardar o centro cobra — e ela é pequena.

---

## Detalhes que valem notar

### Parâmetros variáveis

```js
function estaPressionada(...teclas) {
    return teclas.some(tecla => teclasPressionadas[tecla] === true);
}
```

Os três pontos juntam **todos os argumentos** num array. `estaPressionada("arrowleft", "a")`
recebe `["arrowleft", "a"]`, e `some` pergunta se pelo menos uma está presa.

### `for...in` para soltar tudo

```js
for (const tecla in teclasPressionadas) {
    teclasPressionadas[tecla] = false;
}
```

`for...in` percorre as **chaves** de um objeto. Não importa quais teclas foram apertadas
desde que a página abriu: todas ficam soltas.

---

## Experimente

1. Comente o bloco de normalização. Voe na horizontal e depois na diagonal, cronometrando
   de uma borda à outra. Dá para sentir os 41%?
2. Tire o `if (comprimento > 0)` e solte todas as teclas. Leia o que aparece com
   `console.log(nave.x)`. O que é `NaN`, e por que ele "contamina" todas as contas seguintes?
3. Faça a nave andar mais devagar para trás (↓) do que para a frente.
4. Deixe a nave sair pela esquerda e voltar pela direita, como o céu do passo 1. Dica: `%`
   com números negativos não faz o que você espera — teste `-5 % 120` no console.
5. Faça a nave inclinar: desenhe um sprite diferente quando `intencaoX` for diferente de 0.
   Onde guardar a intenção para o desenho poder ler?

---

**Anterior:** `01-ceu` · **Próximo:** `03-tiros` — segure para atirar.
