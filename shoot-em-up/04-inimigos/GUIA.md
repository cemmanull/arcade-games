# Shoot 'em up — Passo 4: Os inimigos

**Mudou:** `script.js`
**Rode:** abra o `index.html` e observe como cada um voa.

---

## O que você vê

Três tipos de inimigo descendo: o vermelho em linha reta, o verde em zigue-zague, e o roxo,
que desce freando, para, encara — e mergulha acelerando. Os tiros ainda os atravessam.

---

## Dois jeitos de mover

Até aqui, todo movimento do curso foi **somar um passinho por quadro**:

```js
bola.x += bola.velocidadeX * tempo;      // Pong
tiro.y -= VELOCIDADE_DO_TIRO * tempo;    // passo 3
```

Os inimigos usam outro jeito: **a posição é uma função do tempo**.

```js
trajeto: (inimigo, t) => ({
    x: inimigo.origemX + Math.sin(t * 2.5) * 22,
    y: inimigo.origemY + 28 * t
})
```

O inimigo só guarda **de onde partiu** e **há quanto tempo existe**. A cada quadro, o relógio
dele anda (`t += tempo`) e a função responde onde ele está.

| | Somar passinhos | Função do tempo |
|---|---|---|
| Guarda | posição e velocidade | origem e tempo de vida |
| A cada quadro | `x += vx * tempo` | `x = trajeto(t).x` |
| Bom para | coisas que reagem (quicam, são empurradas) | caminhos coreografados |
| Erros | se acumulam quadro a quadro | não existem: é sempre a conta exata |
| "Onde estará em 2 s?" | só simulando | `trajeto(inimigo, t + 2)` |

A bola do Pong **reage** — quica, é rebatida — e por isso soma passinhos. Um inimigo de nave
segue uma **coreografia** desenhada por quem fez a fase. Para coreografia, a função do tempo
é imbatível: desenhar um caminho vira escrever uma conta.

> **Funções que só calculam podem ser perguntadas sobre o futuro.** A última coluna da
> tabela vai servir para mirar à frente do alvo (exercício 5).

---

## As contas dos três trajetos

### Reta

```js
y: inimigo.origemY + 35 * t
```

Velocidade constante: 35 pixels por segundo, para sempre.

### Seno: o balanço

```js
x: inimigo.origemX + Math.sin(t * 2.5) * 22
```

`Math.sin` vai de −1 a 1 e volta, sem parar. Multiplicado por **22**, o inimigo oscila 22
pixels para cada lado (a *amplitude*). O **2.5** diz quão depressa ele balança (a
*frequência*). Dois números, e você tem todos os zigue-zagues possíveis.

### Três trechos: frear, parar, mergulhar

```js
if (t < 1)   return { ..., y: origemY + 50 * (1 - (1 - t) ** 2) };   // freando
if (t < 1.8) return { ..., y: origemY + 50 };                         // parado
const m = t - 1.8;
return { ..., y: origemY + 50 + 160 * m * m };                        // acelerando
```

Cada trecho começa onde o anterior terminou (confira: em `t = 1` o primeiro dá 50; o segundo
também). Se não começasse, o inimigo **teleportaria** na emenda.

`1 - (1 - t)²` e `t²` são **curvas de suavização** (*easing*): uma chega devagar, a outra sai
devagar. Toda animação que parece natural usa alguma — nada no mundo real começa ou para de
uma vez.

---

## Funções no catálogo

```js
const INIMIGOS = {
    drone: { sprite: [...], cores: {...}, trajeto: (inimigo, t) => ({ ... }) },
    ...
};

const posicao = INIMIGOS[inimigo.tipo].trajeto(inimigo, inimigo.t);
```

O catálogo do Dealer? Out! guardava números e textos; este guarda também **comportamento**.
Funções são valores em JavaScript: cabem num objeto como qualquer outro.

O resultado: um tipo novo de inimigo é um item novo no catálogo. `moverInimigos` não tem
`if (tipo === "onda")` nenhum, e não vai precisar ter.

---

## Detalhes que valem notar

### `({ ... })` na seta

```js
(inimigo, t) => ({ x: ..., y: ... })
```

Os parênteses em volta das chaves dizem "isto é um objeto". Sem eles, o JavaScript leria as
chaves como o **corpo** da função — e ela devolveria `undefined`.

### Posicionar ao nascer

`criarInimigo` chama `posicionar` antes de pôr o inimigo na lista. Sem isso, ele passaria um
quadro em `(0, 0)` — um piscar no canto da tela.

---

## Experimente

1. Mude o 22 e o 2.5 da onda. Depois troque `Math.sin` por `Math.cos`. O que muda?
2. Crie um quarto tipo que desce em espiral: some um `Math.cos` no `y` também.
3. Crie um inimigo que entra pela **lateral** e atravessa a tela na horizontal. O que
   precisa mudar na limpeza (`removerInimigosQueSairam`)?
4. Quebre a emenda do mergulhador: troque o `50` do segundo trecho por `40`. Observe o salto.
5. Use a pergunta sobre o futuro: desenhe um pontinho onde cada inimigo estará daqui a meio
   segundo (`trajeto(inimigo, inimigo.t + 0.5)`).
6. Faça a onda acelerar o balanço com o tempo (`Math.sin(t * t)`). Fica divertido ou
   injusto?

---

**Anterior:** `03-tiros` · **Próximo:** `05-colisao` — muitos contra muitos.
