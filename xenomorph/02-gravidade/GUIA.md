# Xenomorph — Passo 2: A gravidade

**Mudou:** os três arquivos
**Rode:** abra o `index.html`, segure → e depois aperte H.

---

## O que você vê

O soldado começa numa plataforma alta. Segure → e ele **arranca** (não sai já correndo), anda até
a beirada e **cai** — de plataforma em plataforma, até o chão e a parede da direita. Solte a tecla
e ele **freia**, em vez de parar seco. Olhando para a esquerda, o desenho vira.

Com **H**: a caixa de colisão em ciano, os blocos que ela ocupa em amarelo, uma linha verde sob os
pés quando ele está no chão, e as duas velocidades no canto.

---

## 1. Acelerar em vez de teletransportar

```js
const alvo = intencao * FISICA.velocidadeMaxima;
const taxa = intencao !== 0 ? FISICA.aceleracao : FISICA.frenagem;

soldado.vx = aproximar(soldado.vx, alvo, taxa * tempo);
```

No Pong, apertar a seta fazia a raquete andar já na velocidade máxima. Um corpo com peso não é
assim. Aqui a intenção (−1, 0 ou 1) vira um **alvo** de velocidade, e a velocidade real
**aproxima-se** dele um pouco a cada quadro. Soltar as teclas é só um alvo zero — a mesma conta
faz o soldado frear.

`aproximar` anda até o alvo **sem passar dele**. Sem isso, o soldado frearia além do zero e sairia
andando de ré.

| Número | Valor | Sensação |
|---|---|---|
| `aceleracao` | 900 px/s² | chega à velocidade máxima em 0,09 s: obediente, mas com peso |
| `frenagem` | 1200 px/s² | parar é mais rápido que arrancar: precisão para parar na beirada |
| `velocidadeMaxima` | 80 px/s | atravessa a sala em uns 3 segundos |

O GDD pede exatamente isso na seção 4: *"aceleração, desaceleração e controle aéreo
ajustáveis"*. Ajustáveis = numa tabela, `FISICA`, longe do código que os usa.

---

## 2. A gravidade é só mais uma aceleração

```js
soldado.vy = Math.min(soldado.vy + FISICA.gravidade * tempo, FISICA.quedaMaxima);
```

Para baixo, **o tempo todo** — inclusive em quem está no chão. Parece desperdício, mas é o que faz
o soldado cair sozinho quando o piso acaba: ninguém precisa avisá-lo de que a plataforma terminou.
O chão não desliga a gravidade; ele apenas não deixa o corpo passar.

`quedaMaxima` é a velocidade terminal: sem ela, uma queda longa ficaria cada vez mais rápida, até
ninguém conseguir reagir.

---

## 3. Colidir um eixo de cada vez

```js
if (pedacoX !== 0 && moverNoEixoX(corpo, pedacoX)) { corpo.vx = 0; ... }
if (pedacoY !== 0 && moverNoEixoY(corpo, pedacoY)) { corpo.vy = 0; ... }
```

Anda em x; se entrou numa parede, recua até encostar. **Depois** anda em y; se entrou no chão ou no
teto, recua.

Se os dois andassem juntos, o soldado caindo junto a uma parede entraria num canto — e não daria
para saber se ele bateu no **chão** (e deve parar de cair) ou na **parede** (e deve parar de
andar). Um eixo por vez, a resposta é sempre clara: a colisão em x só pode ser parede; a em y, chão
ou teto.

### Encostar na face

```js
corpo.x = dx > 0 ? coluna * TAMANHO_DO_BLOCO - corpo.largura   // indo para a direita
                 : (coluna + 1) * TAMANHO_DO_BLOCO;           // indo para a esquerda
```

Não se desfaz o movimento: a caixa é posta **exatamente** encostada na face do bloco. Sem frestas,
sem tremedeira.

### `noChao` é descoberto, não decidido

```js
if (pedacoY > 0) corpo.noChao = true;
```

Ninguém diz ao soldado que ele está no chão. A cada quadro a gravidade o empurra um pouquinho para
baixo, e se esse empurrão foi barrado, **há chão**. O passo 3 vai perguntar isso para saber se ele
pode pular.

---

## 4. Pedaços de no máximo meio bloco

```js
const PASSO_MAXIMO = TAMANHO_DO_BLOCO / 2;
```

Caindo a 260 px/s num quadro lento (0,05 s), o soldado anda **13 pixels** — mais que um bloco.
Num salto só, ele estaria acima de um piso de 8 pixels num quadro e abaixo dele no seguinte, sem
nunca ter estado **dentro**. E a colisão só enxerga o que está dentro.

Por isso o movimento do quadro é gasto em pedaços de até 4 pixels, e cada pedaço é conferido. É a
mesma ideia do Pac-Man (*nenhum pedaço pula um centro de casa*), por outro motivo: aqui, *nenhum
pedaço pula um bloco*.

> Esse bug tem nome — **tunelamento** — e aparece em todo jogo com coisas rápidas e paredes finas.
> Os tiros do passo 4 vão precisar da mesma proteção.

---

## 5. O `EPSILON`: encostar não é entrar

```js
const bordaDaFrente = dx > 0 ? corpo.x + corpo.largura - EPSILON : corpo.x;
```

Uma caixa em `x = 10` com largura 6 vai até 16 — exatamente onde **começa** o bloco da coluna 2. Ela
encosta nele, mas não entra. Se a conta usasse 16, o soldado encostado numa parede seria
"empurrado" para fora dela a cada quadro, e não conseguiria nem descer escorregando. O último pixel
que a caixa ocupa é o 15,999…

---

## Detalhes que valem notar

### Os controles são uma tabela

```js
const CONTROLES = { esquerda: ["arrowleft", "a"], direita: ["arrowright", "d"] };
if (acao("esquerda")) ...
```

O código pergunta *"o jogador quer ir para a esquerda?"*, nunca *"a seta está apertada?"*. O GDD
pede, na seção 11, que o jogador possa **remapear** os controles: com esta tabela, isso é trocar
uma lista de teclas.

### Espelhar sem desenhar de novo

```js
const coluna = espelhado ? largura - 1 - dx : dx;
```

Olhando para a esquerda, o mesmo sprite é lido de trás para a frente. Nenhum desenho novo.

### A mesma função para qualquer corpo

`moverComColisao(corpo, tempo)` recebe o corpo como argumento. Hoje só o soldado a usa; no passo 5,
as criaturas vão usá-la sem uma linha nova. O GDD pede isso na seção 12: *"Evite duplicar código
para cada tipo de inimigo"*.

---

## Experimente

1. Troque `aceleracao` e `frenagem` por 99999. O soldado vira a raquete do Pong. Melhor ou pior?
2. Agora por 150. Como é andar sobre gelo?
3. Mude `PASSO_MAXIMO` para 20 e `quedaMaxima` para 600. O soldado atravessa algum piso? (Com H
   ligado fica mais fácil de ver.)
4. Troque o `- EPSILON` por nada nas duas funções. Encoste numa parede e observe a caixa.
5. Junte os dois eixos: mova x e y de uma vez e só depois confira a colisão. Em que situação o
   soldado fica preso?
6. Faça a gravidade puxar para **cima** (`gravidade: -900`). O que precisa mudar para `noChao`
   continuar fazendo sentido?

---

**Anterior:** `01-sala` · **Próximo:** `03-salto` — pular, com o perdão que todo jogo de plataforma
esconde.
