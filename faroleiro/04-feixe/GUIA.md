# Faroleiro — Passo 4: O feixe

**Mudou:** `index.html` (painel e dois botões), `style.css` (os botões) e `script.js` (a barca anda,
a lanterna mira, a câmera segue). Ondas, névoa e entardecer do passo 3 continuam iguais.
**Rode:** abra o `index.html`. Teclado: **A/D** ou **←/→** viram a barca; **Q/E** giram a lanterna;
**↑/↓** levantam e abaixam o feixe; **H** mostra os eixos e um painel. Mouse: mexa sobre o mar.
Toque: os botões ◀ ▶ e arraste o dedo na tela.

---

## O que você vê

A barca navega sozinha para a frente, a 5 m/s, e a câmera vai atrás dela. Você a vira com o leme e
**mira a lanterna** por conta própria: o feixe gira para os lados e para cima/baixo, com um pouco
de inércia, e nunca passa de 75° para cada lado da proa. Solte tudo e a lanterna volta a olhar para
a frente, um pouquinho para baixo, onde a luz toca o mar. Com **H**, o painel mostra a conta:
`proa 30° + guinada 20° = mundo 50°`.

---

## 1. Várias fontes, uma intenção

Teclado, botões de toque e ponteiro (mouse ou dedo) fazem a mesma coisa: dizer **o que o jogador
quer**. Só esse objeto é lido pelo resto do jogo:

```js
let intencao = { leme: 0, guinadaAlvo: 0, arfagemAlvo: REPOUSO_DA_ARFAGEM };
```

É a ideia do `jogo-da-cobrinha/05-teclado` (a tecla vira uma direção desejada, e o jogo lê a
direção) e do `dealer-out/02-movimento` (teclas **seguradas** movem enquanto durarem).

- Teclado e botões ligam **ações** (`esquerda`, `direita`, `miraEsquerda`...) em `acoes`; uma
  tabela (`TECLAS`) diz qual tecla liga qual ação, e os botões ◀ ▶ ligam as mesmas.
- O ponteiro calcula **ângulos**: a posição horizontal na tela vira a guinada alvo, e a metade de
  cima levanta o feixe.
- `lerIntencao()` junta tudo, uma vez por quadro. `leme` vale −1..1 (**+1 = esquerda**, o sentido
  anti-horário visto de cima).

Detalhes que evitam bugs: `keyup` solta a ação; perder o foco da aba (`blur`) solta tudo, senão a
barca fica virando sozinha; `Ctrl`/`Alt`/`Meta` e a repetição automática são ignorados; um
`pointerleave` ou `pointercancel` solta a mira.

---

## 2. `clamp` e aceleração angular com teto

```js
function clamp(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

function aproximar(valor, alvo, passo) {
    return valor + clamp(alvo - valor, -passo, passo);
}
```

`clamp` é o mesmo que prendia a raquete na tela no `pong/04-raquetes`. `aproximar` anda de `valor`
na direção de `alvo`, no máximo `passo` de cada vez. Com `passo = aceleração × tempo`, a velocidade
deixa de saltar: o leme em −1 não vira a barca de uma vez, ela **ganha giro** aos poucos:

```js
giroDaBarca = aproximar(giroDaBarca, intencao.leme * GIRO_MAXIMO_DA_BARCA, ACELERACAO_DO_GIRO * tempo);
proa += giroDaBarca * tempo;
```

São três números por eixo: **velocidade máxima** (1,4 rad/s na barca), **aceleração** (4 rad/s²)
e a **posição** que resulta deles. Tudo em radianos por segundo, multiplicado por `tempo`, como
sempre.

---

## 3. A lanterna corre atrás do alvo

```js
function seguirAlvo(eixo, alvo, tempo) {
    const velocidadeDesejada = clamp((alvo - eixo.angulo) * GANHO_DA_MIRA, -VELOCIDADE_MAXIMA_DA_MIRA, VELOCIDADE_MAXIMA_DA_MIRA);
    eixo.velocidade = aproximar(eixo.velocidade, velocidadeDesejada, ACELERACAO_DA_MIRA * tempo);
    eixo.angulo = clamp(eixo.angulo + eixo.velocidade * tempo, -LIMITE_DA_MIRA, LIMITE_DA_MIRA);
}
```

1. Quanto mais longe do alvo, mais rápido a lanterna **quer** ir (`erro × ganho`), até o teto.
   Perto do alvo, a velocidade desejada cai para perto de zero: ela **freia ao chegar**.
2. A velocidade real só muda o que a aceleração deixa (`aproximar`).
3. O ângulo anda e é preso em ±75° (`LIMITE_DA_MIRA`). Mesmo que o alvo viesse errado, a mira não
   passa disso.

Os mesmos três passos servem para a **guinada** (esquerda/direita) e a **arfagem** (cima/baixo):
cada eixo é um objeto `{ angulo, velocidade }` e a função não sabe qual é qual.

---

## 4. Guinada e arfagem: dois pivôs no grafo

```text
barca                  rotation.y = proa
└── lanterna           rotation.y = guinada
    └── feixe          rotation.x = arfagem
        └── cone + SpotLight + alvo
```

```js
lanterna.rotation.y = guinada.angulo;
feixe.rotation.x = arfagem.angulo;
```

É o "estado × desenho" do `xadrez/01-tabuleiro` outra vez: o **estado** são os números
(`proa`, `guinada`, `arfagem`) e a malha só os mostra. Como o feixe é filho da lanterna, ele herda
a guinada; como cone, `SpotLight` e alvo são filhos do feixe, giram juntos.

---

## 5. Local × mundo

Cada giro acima é **local**: a `guinada` é medida a partir da proa, não do mapa. Mas o jogo vai
precisar saber para onde o feixe aponta **no mundo** (é com isso que se decide se um recife está na
luz). Para giro em volta de `y`, a conta é uma soma:

```text
direção no mundo = proa + guinada
```

O painel (tecla **H**) confere isso perguntando ao three.js, sem fazer a soma:

```js
const frente = feixe.getWorldDirection(new THREE.Vector3()).negate();
const noMundo = Math.atan2(-frente.x, -frente.z);
```

**Pegadinha do `-z`:** `getWorldDirection` devolve o eixo **+z** do objeto no mundo
(só a câmera devolve o −z, que é para onde ela olha). O feixe, como a proa da barca, sai pelo **−z**.
Por isso o `.negate()`: sem ele, o painel diria que a luz aponta para trás. Gire a lanterna com **Q**
e veja o painel e os eixos azuis (z) da lanterna concordarem. Os números dão a volta em 360°: 170°
de proa + 30° de guinada mostra −160°.

A câmera usa a conversão no sentido contrário, **local → mundo**:

```js
barca.localToWorld(new THREE.Vector3(0, 5, 8))   // 5 m acima e 8 m atrás, no espaço da barca
```

Esse ponto é "sempre atrás da barca" **no sistema dela**; `localToWorld` o leva para onde ele está
no mapa agora, com a proa e a posição aplicadas. Antes, a barca chama `barca.updateMatrixWorld()`,
porque a matriz de mundo só se atualiza no desenho e a câmera precisa da posição **deste** quadro.

---

## 6. A câmera que segue

```js
camera.position.lerp(barca.localToWorld(new THREE.Vector3(0, 5, 8)), fracao);
camera.lookAt(barca.localToWorld(new THREE.Vector3(0, 1, -6)));
```

O `lerp` do passo 3 outra vez: a cada quadro a câmera anda uma **fração** do caminho até o ponto
ideal, em vez de colar nele. `fracao = suavidade × tempo` (limitado a 1), então a câmera atrasa um
pouco nas curvas e o jogo ganha sensação de peso. Numa reta, o atraso estabiliza em `velocidade ÷
suavidade` (5 ÷ 5 = 1 m). A câmera olha 6 m **à frente** da proa, para o jogador ver para onde vai.

Na largura estreita do celular em pé, o campo de visão sobe de 60° para 80° (`camera.fov`), para a
cena caber na tela.

---

## 7. O mar acompanha

```js
mar.position.set(barca.position.x, 0, barca.position.z);
posicoes.setY(i, alturaDoMar(posicoes.getX(i) + mar.position.x, posicoes.getZ(i) + mar.position.z, tempoTotal));
```

O plano tem 90 m e a barca anda 5 m/s: sem isso, em 9 s ela sairia do mar. O plano passa a andar
junto, e as ondas passam a usar a **posição no mundo** (`x + mar.position.x`), para as cristas
ficarem no lugar enquanto a barca as atravessa.

---

## Experimente

1. Mude `VELOCIDADE_MAXIMA_DA_MIRA` para 0,5: a lanterna fica pesada como um farol de verdade.
2. Mude `ACELERACAO_DA_MIRA` para 1 e depois para 100. Com 100, ainda existe inércia?
3. Troque `LIMITE_DA_MIRA` por `Math.PI` (180°). O que o painel mostra com a lanterna virada de
   costas para a proa?
4. Em `aproximar`, troque `clamp` por `valor + (alvo - valor)`: a velocidade vira um salto e a
   barca vira de uma vez, sem inércia.
5. Tire o `.negate()` do painel e gire a lanterna com **Q**: o `mundo` passa a mostrar o oposto?
6. Mude `SUAVIDADE_DA_CAMERA` para 1 e depois para 50. Qual é o atraso em metros numa reta?
7. Mude o ponto da câmera para `(6, 3, 0)` (de lado). A câmera continua "atrás"? Por que não?
8. Segure **A**, aperte **←** e solte só a seta. A barca continua virando? Por que ela para? (As
   `acoes` guardam a **ação**, não a tecla. Como você consertaria?)

---

**Anterior:** [`03-mar`](../03-mar/) · **Próximo:** `05-barcos` — o comboio de barcos de pesca, que seguem a barca e balançam a cauda.
