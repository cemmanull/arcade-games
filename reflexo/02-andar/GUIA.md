# Reflexo — Passo 2: Andar

**Mudou:** `script.js` (a seção 1 ganhou as constantes `VELOCIDADE_DE_ANDAR`, `VELOCIDADE_DE_GIRO`,
`RAIO_DO_CORPO` e `CASAS_SOLIDAS`; a 2, o relógio `instanteDoQuadroAnterior`; a 4, o corpo desenhado com
`RAIO_DO_CORPO`; a "teclado e loop" virou a seção 5, de entrada, e as seções 6, andar e colidir, e 7, o
laço com tempo, são novas; a seção 3 não mudou), `index.html` (os botões e a ajuda) e `style.css` (o
estado "apertado" dos botões).
**Rode:** abra o `index.html`. Use **W A S D** e as setas ← →, ou os botões da tela. Depois
aperte **H**.

---

## O que você vê

A mesma planta do passo 1, mas agora o zelador anda. **W** e **S** (ou ↑ e ↓) o levam para
onde a seta aponta e para trás; **A** e **D** dão passos de lado; ← e → giram a seta. Segure **W** e
**D** juntos: ele anda na diagonal, **sem correr mais** que andando reto. Empurre-o contra uma
parede: ele para encostado e, se você empurra em diagonal, **desliza** ao longo dela.

Embaixo do desenho há seis botões (⟲ ▲ ⟳ / ◀ ▼ ▶) que fazem exatamente o mesmo, para celular.
Com **H**: a grade e os números do zelador, agora mudando a cada quadro.

> **Toque neste passo:** só os botões. O esquema final do jogo (arrastar o dedo sobre a imagem
> para girar) precisa da imagem em primeira pessoa e chega depois. Os botões ⟲ ⟳ lembram o plano B
> do GDD, que gira em passos de 15°; aqui eles giram **continuamente** enquanto apertados, igual às
> setas ← →, e valem como teste da ideia "teclado e toque viram a mesma intenção" (o exercício 9
> faz a versão em passos de 15°).

---

## 1. Teclado e toque viram a mesma intenção

*Reusa `dealer-out/02-movimento` (entrada → intenção).*

```js
const entradasAtivas = new Map();   // "tecla:w", "ponteiro:3:frente" → "frente"
const acoesAtivas = new Set();      // a visão derivada: os nomes das ações seguradas

function lerIntencao() {
    const eixo = (positiva, negativa) => Number(acoesAtivas.has(positiva)) - Number(acoesAtivas.has(negativa));
    return { frente: eixo("frente", "tras"), lado: ..., giro: ... };
}
```

Teclas e botões **não movem ninguém**. Cada **entrada** (uma tecla, um dedo) liga uma **ação**
no mapa `entradasAtivas`, e `mudarEntrada` refaz o conjunto `acoesAtivas` a partir dele: uma ação
vale **enquanto alguma entrada a segurar**. Quem transforma isso em movimento é `atualizar`, que só
enxerga a **intenção**: três números, cada um `-1`, `0` ou `1`.

Por que o mapa de entradas, e não só um conjunto de ações? Porque a mesma ação pode vir de duas
entradas. Segure **W**, aperte ↑ e solte ↑: com um conjunto simples, o `keyup` de ↑ apagaria
`"frente"` e o zelador pararia com a W ainda apertada. O mesmo vale para tecla + botão e para dois
dedos no mesmo botão (cada dedo tem o seu `pointerId`, e o GDD pede esse cuidado). A chave do
botão junta o `pointerId` e a ação (`ponteiro:3:frente`). O `:acao` não é necessário para o jogo
funcionar (um dedo só aperta um botão por vez); ele só deixa a chave legível ao depurar. Um dedo que
escorrega de ▲ para ▶ não liga o ▶, porque o `pointerdown` dele nunca aconteceu: no toque o dedo
continua **preso ao ▲** (captura implícita do ponteiro) até levantar, e com o mouse o `pointerleave`
do ▲ o solta (veja "O botão também solta", abaixo).

Cuidados que existem por causa de bugs reais:

- **Apertar frente e trás ao mesmo tempo** vale `1 - 1 = 0`: ele fica parado. Não é um erro, é a
  conta.
- **`blur`** solta tudo: se você soltar a tecla com outra janela em foco, o `keyup` nunca
  chega, e o zelador andaria para sempre.
- **O botão também solta quando o dedo ou o mouse sai dele** (`pointerleave`). No celular o
  dedo fica preso ao botão em que começou, mas o mouse não.
- **Pressão longa no celular** seleciona texto e abre menu de contexto, e o iOS pode até cancelar o
  toque (`pointercancel`) no meio. Por isso os botões têm `user-select: none`,
  `-webkit-touch-callout: none` e um `contextmenu` com `preventDefault`.
- **O botão mostra que está apertado** (classe `segurado`, mais a pseudoclasse `:active`):
  mais claro, com a borda do feixe e afundado 2 px. Não depende só da cor. Quem anda pelo
  teclado vê o botão correspondente afundar também: a mesma intenção.

---

## 2. Andar relativo à direção

```js
const ordemX = jogador.dx * frente - jogador.dy * lado;
const ordemY = jogador.dy * frente + jogador.dx * lado;
```

No passo 1, `(dx, dy)` era para onde o zelador **olha**. Aqui ele vira a régua do movimento:

- **frente** soma `(dx, dy)`: andar para onde se olha;
- **lado direito** soma `(-dy, dx)`: a mesma seta **girada 90°**. Olhando para a direita
  `(1, 0)`, o lado direito é `(0, 1)`, para baixo na tela. Confira com a mão no papel.
- **trás** e **lado esquerdo** são os negativos (`frente = -1`).

A ordem `(ordemX, ordemY)` é, então, "para onde o jogador quer ir, no mundo". Por isso girar e
andar são independentes: a tecla **W** é sempre "para onde estou olhando", qualquer que seja o
ângulo.

### A diagonal não pode ser mais rápida

Frente (`1`) e lado (`1`) juntos dão um vetor de comprimento `√2 ≈ 1,41`. Sem cuidado, andar de
viés seria 41% mais rápido que andar reto, o velho bug de todo jogo que ganhou "strafe". A cura
é a **normalização**: dividir o vetor pelo próprio comprimento.

```js
const tamanho = Math.hypot(ordemX, ordemY);
const passo = VELOCIDADE_DE_ANDAR * tempo / tamanho;
moverComColisao(ordemX * passo, ordemY * passo);
```

Qualquer direção de entrada vira um vetor de comprimento 1 vezes `VELOCIDADE_DE_ANDAR`.
Se `tamanho` é `0` (nada apertado, ou frente e trás se anulando), a função sai antes: dividir
por zero daria `NaN`, e um `NaN` na posição estraga o jogo inteiro sem avisar.

---

## 3. Girar

```js
jogador.angulo = (jogador.angulo + delta + 2 * Math.PI) % (2 * Math.PI);
atualizarDirecao();
```

Girar é somar ao ângulo: `giro × VELOCIDADE_DE_GIRO × tempo`. Girar para a direita **aumenta**
o ângulo, porque o eixo y desce (o sentido horário na tela). O `%` mantém o ângulo entre `0` e
`2π`, para o número não crescer sem fim. Somar `2π` antes evita o resto negativo do JavaScript
(`-1 % 3` dá `-1`), o mesmo cuidado do túnel do Pac-Man. E depois de **todo** giro a seta é
refeita com `atualizarDirecao()`: lembra do passo 1? A direção nunca é guardada à mão.

---

## 4. Colisão: um círculo contra a grade

*Reusa `pong/05-colisao` (colisão conferida por eixo) e `xenomorph/02-gravidade` (um eixo de
cada vez).*

O corpo é um **círculo de raio `0.25`** casa. Perguntar "este círculo bate numa casa
sólida?" tem uma conta simples:

```js
const pertoX = Math.min(Math.max(x, coluna), coluna + 1);
const pertoY = Math.min(Math.max(y, linha), linha + 1);
if (ehSolida(coluna, linha) && Math.hypot(x - pertoX, y - pertoY) < RAIO_DO_CORPO) ...
```

`(pertoX, pertoY)` é o ponto **da casa** mais perto do centro do círculo: o centro, se ele
está dentro dos limites da casa; senão, o ponto da borda ou do canto. Se esse ponto está a menos
de um raio, bateu. Só as casas que o quadrado do círculo cobre precisam ser conferidas: no
máximo 4.

O que é sólido? `CASAS_SOLIDAS = "#%DER"`: tijolo, pedra, **porta** (ainda fechada, nenhum
receptor existe), emissor e receptor. **Espelhos não bloqueiam**, como pede o GDD: o jogador
passa pela casa do espelho. Fora do mapa também é sólido (`ehSolida` devolve `true`), uma rede
de segurança a mais, além da conferência do `verificarMapa`.

### Um eixo de cada vez

```js
if (!corpoBateNaParede(jogador.x + passoX, jogador.y)) jogador.x += passoX;
if (!corpoBateNaParede(jogador.x, jogador.y + passoY)) jogador.y += passoY;
```

Primeiro tenta andar em x; **depois** tenta andar em y, já com o x novo. É isso que faz o
corpo **deslizar**: empurrando em diagonal contra uma parede vertical, o passo em x é recusado,
mas o passo em y passa. Se os dois eixos fossem testados juntos, qualquer batida cancelaria o
movimento inteiro e o zelador "grudaria" na parede.

### O passo precisa ser menor que 1 + 2 raios

A colisão só confere o **destino** de cada passo, não o caminho até lá. Então um passo pode
**atravessar** uma parede (o *tunelamento* do Xenomorph) se o corpo começa inteiro de um lado e
termina inteiro do outro: o centro sai de `parede - raio` e chega a `parede + 1 + raio`. Numa
parede de uma casa, isso é um passo de **1 + 2 × 0,25 = 1,5 casa**. Cada quadro anda no máximo
`3 casas/s × 0,05 s = 0,15` casa, dez vezes menos. Com o teto de 0,05 s em `quadroAQuadro`
(que vale mesmo se a aba ficar em segundo plano) o limite só seria alcançado a
`1,5 / 0,05 = 30` casas por segundo, no eixo (na diagonal o passo por eixo é menor). A 60
quadros por segundo reais (cerca de 0,017 s) seriam 90 casas por segundo. Raio maior protege mais:
com `0.45`, o passo perigoso é de 1,9.

### O que não está aqui

Quando um passo é recusado, o corpo **para onde estava**, sem encostar exatamente na face.
Um zelador lento deixa uma folga de até um passo (0,15 casa) entre ele e a parede. O Xenomorph
encosta a caixa na face (veja o exercício 7).

---

## 5. A atualização separada do desenho

```js
function quadroAQuadro(instanteAtual) {
    const tempo = Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, 0.05);
    instanteDoQuadroAnterior = instanteAtual;

    atualizar(tempo);
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}
```

O tempo em segundos entre dois quadros (`tempo`) multiplica **toda** velocidade. Em 60 ou em 144
quadros por segundo o zelador anda a mesma distância por segundo. `atualizar` muda os números;
`desenhar` só lê. Essa separação deixa o jogo testável sem canvas, e é o que o GDD pede de
`regras` versus `desenho` no jogo completo.

---

## Experimente

1. Mude `VELOCIDADE_DE_ANDAR` para `6` e depois para `30`: nada muda, a seção 4 explica por quê.
   O corpo só atravessa uma parede de uma casa com um passo de **1,5** casa. A 60 quadros por
   segundo o passo é `velocidade / 60`: qual velocidade o alcança? Confira com `60` (não deve
   atravessar), `120` e `300`, andando em linha reta contra a porta `D` (casa 5, linha 3;
   alinhe o olhar com ← →). Acima do limite ele atravessa **às vezes**: depende de onde o
   passo anterior parou. Depois suba `RAIO_DO_CORPO` para `0.45` e refaça a conta.
2. Troque `RAIO_DO_CORPO` por `0.45` e tente passar pelo corredor de uma casa. E por `0.05`?
   Aperte **H** e veja o círculo do corpo.
3. Em `lerIntencao`, troque `"frente"` e `"tras"` de lugar. O que muda no teclado? O que mudou no
   toque? O que **não** precisou mudar?
4. **Quebre de propósito:** em `andar`, apague a divisão por `tamanho`. Meça (com **H**) quanto
   o zelador anda em 1 segundo reto e em 1 segundo na diagonal.
5. **Quebre de propósito:** em `moverComColisao`, confira os dois eixos juntos com um só `if`
   (`corpoBateNaParede(x + passoX, y + passoY)`). Empurre o zelador em diagonal contra uma parede.
6. **Quebre de propósito:** apague a linha `window.addEventListener("blur", ...)`. Segure **W**,
   troque de janela com Alt+Tab e solte a tecla. O que acontece quando você volta?
7. Faça o corpo encostar na parede: quando `corpoBateNaParede` recusar o passo, em vez de
   ficar parado, avance em passos cada vez menores até colar. Dica: o `xenomorph/02-gravidade`
   tem a ideia.
8. Tire `"E"` de `CASAS_SOLIDAS`. Dá para entrar no emissor? Por que o mapa final vai querer
   que ele seja sólido?
9. Troque o giro contínuo dos botões ⟲ ⟳ pelo plano B do GDD: cada toque gira 15° de uma vez
   (`girar(15 * Math.PI / 180)` num `pointerdown`). O que é pior no celular? E o que fica
   mais fácil de mirar?

---

**Anterior:** [`01-planta`](../01-planta/) · **Próximo:** [`03-um-raio`](../03-um-raio/) — a luz sai do emissor e a planta desenha o caminho do raio, casa a casa.
