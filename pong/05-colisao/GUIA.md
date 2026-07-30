# Pong — Passo 5: A colisão

**Mudou:** `script.js`
**Rode:** abra o `index.html`. W/S e ↑/↓.

---

## O que você vê

**Um jogo.** A bola é rebatida, a partida se sustenta, dá para jogar de dois.

Ainda sem placar (passo 7) e o ricochete é sempre reto — bater no centro ou na ponta dá no
mesmo. É o passo 6 que conserta isso, e é ele que transforma "funciona" em "é divertido".

---

## AABB — a colisão mais usada em jogos 2D

**Axis-Aligned Bounding Box**: caixa alinhada aos eixos, ou seja, retângulos que não giram.

```js
function seSobrepoe(a, b) {
    return a.x < b.x + b.largura &&
           a.x + a.largura > b.x &&
           a.y < b.y + b.altura &&
           a.y + a.altura > b.y;
}
```

A ideia inteira em uma frase:

> **Dois retângulos se sobrepõem quando se sobrepõem nos dois eixos ao mesmo tempo.**

Leia cada linha como *"a começa antes de b terminar"* e *"a termina depois de b começar"*,
nos dois eixos. Desenhe dois retângulos no papel e teste as quatro comparações com números
— quando ficar óbvio, você tem essa técnica no bolso para sempre. Ela serve para tiro,
plataforma, coleta de itens, colisão com cenário, tudo.

### Por que a comparação da cobrinha não serve mais

| | Cobrinha | Pong |
|---|---|---|
| Posições | inteiros numa grade | decimais |
| Colidir | `a.coluna === b.coluna` | as áreas se sobrepõem? |

Com decimais, dois objetos praticamente **nunca** ocupam o mesmo ponto exato: a bola pula
de 73,4 para 74,6 e passa "por cima" de 74 sem nunca estar lá. Comparar igualdade
detectaria a colisão quase nunca.

Não é um detalhe do Pong: é a diferença entre jogos de grade (xadrez, tetris, campo minado)
e jogos contínuos (plataforma, corrida, tiro).

---

## A função que não sabe quem está colidindo

`seSobrepoe(a, b)` aceita **qualquer** par de objetos com `x`, `y`, `largura` e `altura`.

Foi para isso que demos a mesma forma a todos, lá no passo 1. A decisão parecia gratuita
naquele momento; aqui ela paga.

---

## Só testar a raquete relevante

```js
const raquete = bola.velocidadeX < 0 ? raqueteEsquerda : raqueteDireita;
```

Além de evitar trabalho, isso previne um **bug real**: uma bola que acabou de sair da
raquete ainda está sobreposta a ela por uma fração de pixel. Ela seria "rebatida" de novo,
invertendo a velocidade outra vez — e ficaria grudada, vibrando na frente da raquete.

É o mesmo problema do passo 3, com outra roupa. E a solução também é a mesma:

```js
bola.x = raquete.x - bola.largura;      // 1. empurra para fora
bola.velocidadeX = -bola.velocidadeX;   // 2. inverte
```

> **Ao colidir, conserte a posição e a velocidade, sempre juntas.**

---

## Experimente

1. Comente a linha que empurra a bola para fora (`bola.x = ...`). Ela gruda na raquete e
   vibra. Esse é o bug, ao vivo, pela segunda vez.
2. Troque `const raquete = ...` por testar **as duas** raquetes sempre. Rebata a bola bem
   na quina e observe o comportamento errático.
3. Aumente `VELOCIDADE_DA_BOLA` para 600. A bola **atravessa** a raquete sem colidir.
   Por quê? *(Quanto ela anda por quadro? Quanto mede a raquete?)* Este é o limite
   fundamental da colisão por sobreposição.
4. Faça a raquete ficar mais grossa (`LARGURA_DA_RAQUETE = 12`) e repita o teste anterior.
   O problema melhora — e ainda existe.
5. Pinte a raquete de outra cor no quadro em que ela rebate (dica: uma variável que guarda
   o instante da última rebatida).
6. Use `seSobrepoe` para algo novo: um quadrado parado no meio da tela em que a bola
   também quica.

---

**Anterior:** `04-raquetes` · **Próximo:** `06-angulo` — onde o jogo ganha intenção.
