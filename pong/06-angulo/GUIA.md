# Pong — Passo 6: O ângulo

**Mudou:** `script.js`
**Rode:** abra o `index.html`. Rebata com o centro e depois com a ponta da raquete.

---

## O que você vê

O mesmo jogo do passo anterior — e uma sensação completamente diferente.

Agora **você decide** para onde a bola vai. Bater no centro devolve quase reta; bater na
ponta manda-a inclinada. Existe jogada, existe intenção, existe estratégia.

> Este passo não adiciona nenhuma funcionalidade nova. Muda uma regra — e é a diferença
> entre um jogo que **funciona** e um jogo que é **divertido**.

Guarde essa observação: em jogos, a distância entre "está pronto" e "está bom" quase nunca
é uma lista de recursos. É o ajuste de meia dúzia de regras.

---

## As quatro etapas de uma rebatida

Elas se repetem em qualquer física de ricochete controlado:

```js
// 1 e 2. onde bateu, normalizado para -1 .. +1
const deslocamento = (centroDaBola - centroDaRaquete) / (raquete.altura / 2);

// 3. vira ângulo
const angulo = deslocamentoLimitado * ANGULO_MAXIMO_DE_SAIDA;

// 4. de volta a um par de velocidades
bola.velocidadeX = Math.cos(angulo) * novaRapidez * sentido;
bola.velocidadeY = Math.sin(angulo) * novaRapidez;
```

### A etapa que costuma faltar: normalizar

Dividir a distância pela **metade da altura da raquete** transforma "13 pixels acima do
centro" em "0,65 do caminho até a ponta".

O número deixa de depender do tamanho da raquete. Mude `ALTURA_DA_RAQUETE` para 40 e tudo
continua funcionando na mesma proporção — sem tocar em mais nada.

> **Normalizar para −1..1 ou 0..1 é um hábito que resolve uma classe inteira de problemas.**
> Sempre que uma medida física entrar numa fórmula, pergunte-se: isto está em unidades que
> vão mudar?

### `Math.hypot`

```js
const rapidezAtual = Math.hypot(bola.velocidadeX, bola.velocidadeY);
```

A rapidez é a hipotenusa do triângulo formado pelas duas velocidades. Pitágoras devolvendo
"quão rápido a bola está indo", independentemente da direção.

Isso permite mudar o **ângulo** preservando a **rapidez** — que é exatamente o que uma
rebatida faz.

---

## O teto de velocidade não é um capricho

```js
Math.min(rapidezAtual * 1.05, VELOCIDADE_MAXIMA_DA_BOLA)
```

Sem ele, em poucas jogadas a bola andaria **mais que a própria largura por quadro** — e
passaria de um lado da raquete para o outro sem nunca se sobrepor a ela. A colisão do passo
5 simplesmente não a veria.

> **Colisão por sobreposição só funciona enquanto os objetos não pulam por cima uns dos
> outros.**

Quando velocidades altas são inevitáveis, a solução se chama **colisão contínua**: em vez
de testar a posição final, testa-se o *caminho percorrido* entre um quadro e o outro. É o
que jogos comerciais fazem, e é o exercício 6.

---

## Experimente

1. Mude `ANGULO_MAXIMO_DE_SAIDA` para `Math.PI / 6` (30°) e depois `Math.PI / 2.2` (~82°).
   O primeiro deixa o jogo morno; o segundo, quase incontrolável. Em algum lugar entre os
   dois está o seu jogo.
2. Remova o `Math.min` do teto e jogue um ponto longo. A bola acaba atravessando a raquete.
3. Mude `ACELERACAO_POR_REBATIDA` para `1.30`. Chega ao teto em três toques.
4. Troque `ALTURA_DA_RAQUETE` para 40 e confirme que o ângulo continua proporcional —
   é a normalização trabalhando.
5. **Efeito (spin):** se a raquete estava se movendo no instante da rebatida, some parte da
   velocidade dela ao `velocidadeY` da bola. Você vai precisar guardar a posição anterior
   da raquete para saber a velocidade dela.
6. **Colisão contínua (difícil):** guarde a posição da bola antes de mover e teste se o
   segmento entre as duas posições cruza a raquete. Resolve o atravessamento de vez.

---

**Anterior:** `05-colisao` · **Próximo:** `07-placar` — o jogo passa a ter vencedor.
