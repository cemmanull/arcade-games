# Shoot 'em up — Passo 6: O contra-ataque

**Mudou:** os três arquivos (o placar ganhou as vidas; há uma mensagem de fim)
**Rode:** abra o `index.html` e tente sobreviver. Fique parado alguns segundos e veja quem
mira em você.

---

## O que você vê

Os inimigos atiram. O vermelho mira **em você**. O verde abre um leque de três. O roxo, no
instante em que para, solta um leque de cinco. O blindado gira anéis de dez balas.

Ao ser atingida, a nave explode em faíscas, todas as balas da tela somem, e ela volta
piscando — invencível por dois segundos. Três vidas, e o jogo acaba.

---

## 1. Mirar: da diferença ao ângulo

```js
function anguloAteANave(origem) {
    return Math.atan2(nave.y - origem.y, nave.x - origem.x);
}
```

A diferença entre os dois centros, `(dx, dy)`, é uma seta que aponta do atirador para a nave.
`Math.atan2(dy, dx)` devolve o **ângulo** dessa seta, em radianos. (Repare: **y primeiro**. É a
convenção da função, e trocar a ordem é o erro mais comum com ela.)

E do ângulo de volta a uma velocidade, a conta do saque do Pong:

```js
vx: Math.cos(angulo) * velocidade,
vy: Math.sin(angulo) * velocidade
```

### Por que não normalizar, como no passo 2?

Para um tiro só, daria no mesmo: `(dx, dy) / comprimento * velocidade`. Mas um leque precisa
**girar** a direção um pouco para cada lado — e girar, com o ângulo na mão, é só **somar**.

| Quero… | Melhor ferramenta |
|---|---|
| ir na direção de algo | normalizar `(dx, dy)` |
| ir na direção de algo, **girado** | `atan2`, somar ao ângulo, `cos`/`sin` |
| saber quanto falta até algo | `Math.hypot(dx, dy)` |

---

## 2. Padrões são funções numa tabela

```js
const PADROES = {
    mirado: (atirador, ataque) => { ... },
    leque:  (atirador, ataque) => { ... },
    anel:   (atirador, ataque) => { ... }
};

PADROES[ataque.padrao](inimigo, ataque);
```

E cada tipo diz no catálogo qual usa, com que números:

```js
ataque: { padrao: "leque", primeiro: 1.2, intervalo: 2.4, velocidade: 45, quantidade: 3, abertura: 0.35 }
```

O mesmo padrão com números diferentes dá ataques diferentes: o leque de 3 do verde e o de 5
do roxo são uma função só.

### O leque

```js
const desvio = (i - (ataque.quantidade - 1) / 2) * ataque.abertura;
```

Com 5 balas, `i` vai de 0 a 4, e `i - 2` vai de −2 a 2: a contagem **centralizada no zero**. A
bala do meio vai direto na nave; as outras se abrem igualmente para os dois lados. Com 4
balas, os desvios são −1,5, −0,5, 0,5 e 1,5 — e a nave fica **entre** duas balas.

### O anel

```js
const passo = (Math.PI * 2) / ataque.quantidade;
const giro = atirador.t * 0.7;
dispararEmAngulo(atirador, giro + i * passo, velocidade);
```

O círculo inteiro (2π) em partes iguais. Não mira em ninguém — e por isso tem sempre um **vão**.
O `giro` faz dois anéis seguidos saírem diferentes: os vãos mudam de lugar, e o jogador
precisa ler cada um.

---

## 3. Perder, com justiça

Três regras, todas para que a derrota pareça culpa de quem joga:

| Regra | Sem ela |
|---|---|
| **Ninguém atira à queima-roupa** (menos de 30 px acima da nave) | balas que nascem em cima de você: sorteio, não desafio |
| **Ao ser atingida, todas as balas somem** | renascer dentro da mesma chuva: morrer duas vezes pelo mesmo erro |
| **Dois segundos de invencibilidade, piscando** | o inimigo que te acertou acerta de novo no quadro seguinte |

E as balas não somem em silêncio: cada uma vira uma faísca. O jogador **vê** o perigo indo
embora, em vez de se perguntar para onde ele foi.

### Uma colisão, uma vida

```js
const balaQueAcertou = balas.find(...);
const inimigoQueBateu = inimigos.find(...);
if (!balaQueAcertou && !inimigoQueBateu) return;
perderVida();
```

`find` para no primeiro. Uma bala e um inimigo acertando no mesmo quadro custam **uma** vida
— a regra do Dealer? Out!.

### Piscar é texto

```js
if (invencivel > 0 && Math.floor(invencivel * 15) % 2 === 0) return;
```

A nave some e volta 15 vezes por segundo. Ninguém precisa ler "invencível": piscar diz isso
em qualquer idioma. É o truque da bola no saque do Pong.

---

## Detalhes que valem notar

### O que mata é desenhado por último

```js
desenharParticulas();
desenharBalas();   // por cima de tudo
```

Explosões são enfeite; balas são perigo. **O que pode te matar nunca fica escondido atrás de
enfeite.** É também por isso que as balas são rosa com miolo branco: nenhuma outra coisa na
tela tem essa cara.

### Cada bala com a sua velocidade

Os tiros da nave sobem todos iguais; as balas saem em todas as direções. Por isso cada bala
guarda `vx` e `vy` — e se move somando passinhos, porque é disparada e esquecida, não
coreografada.

### Reiniciar zera tudo

`iniciarPartida` esvazia **todas** as listas. Esquecer as balas faria a partida nova começar
com as balas da anterior no ar.

---

## Experimente

1. Troque a ordem do `atan2` para `(dx, dy)`. Para onde os vermelhos atiram agora?
2. Mude o leque do verde para 4 balas. Fique parado na frente dele. O que acontece?
3. Desligue a regra da queima-roupa (`DISTANCIA_MINIMA_PARA_ATIRAR = 0`) e passe embaixo de um
   vermelho.
4. Tire o `balas = []` de `perderVida`. Jogue até perder uma vida perto de um blindado.
5. Crie um padrão `espiral`: um tiro só, mas com o ângulo girando um pouco a cada disparo
   (guarde o ângulo no inimigo) e um intervalo bem curto.
6. **Mirar à frente:** em vez de mirar onde a nave está, mire onde ela estará quando a bala
   chegar. Você vai precisar da velocidade da nave — guarde a intenção do quadro.

---

**Anterior:** [`05-colisao`](../05-colisao/) · **Próximo:** [`07-roteiro`](../07-roteiro/) — a fase deixa de ser sorteio e vira
uma coreografia.
