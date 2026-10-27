# Proa Acesa — Passo 4: O feixe

**Mudou:** `index.html` (painel e dois botões), `style.css` (os botões) e `script.js` (a barca anda,
a lanterna mira, a câmera segue). Ondas, névoa e entardecer do passo 3 continuam iguais.
**Rode:** abra o `index.html`. Teclado: **A/D** ou **←/→** viram a barca; **Q/E** giram a lanterna e
**↑/↓** levantam e abaixam o feixe (segure); **H** mostra os eixos e um painel. Mouse: mexa sobre o
mar. Toque: os botões ◀ ▶ (com **Tab** e **Enter**/**Espaço** também funcionam) e arraste o dedo na
**metade de cima** da tela.

---

## O que você vê

A barca nasce 8 m ao lado da ilha e navega sozinha para a frente, a 5 m/s; a câmera vai atrás. Você
a vira com o leme e **mira a lanterna** por conta própria: o feixe gira para os lados e para
cima/baixo, com um pouco de inércia, até 75° para cada lado da proa. Solte tudo e a lanterna volta a
olhar para a frente, um pouquinho para baixo, onde a luz toca o mar. Nas curvas ela **atrasa**: o
feixe fica um instante no rumo antigo e só então acompanha a proa. Com **H**, o painel mostra a
conta: `proa 30° + guinada 20° = mundo 50°`.

---

## 1. Várias fontes, uma intenção

Teclado, botões de toque e ponteiro (mouse ou dedo) dizem **o que o jogador quer**. Só esse objeto
é lido pelo resto do jogo:

```js
let intencao = { leme: 0, guinadaAlvo: 0, arfagemAlvo: REPOUSO_DA_ARFAGEM };
```

É a ideia do `jogo-da-cobrinha/05-teclado` (a tecla vira uma direção desejada) e do
`dealer-out/02-movimento` (teclas **seguradas** movem enquanto durarem).

- Teclado e botões ligam **ações** (`esquerda`, `miraDireita`...) em `acoes`; a tabela `TECLAS` diz
  qual tecla liga qual ação. Os botões ◀ ▶ são `<button>`: o dedo (`pointerdown`) e também
  **Enter/Espaço** os seguram, e um `click` sem ponteiro (`detail === 0`, o que leitor de tela e
  comando de voz mandam) vale um toque curto de 0,25 s.
- O ponteiro calcula **ângulos**: a posição horizontal vira a guinada alvo, e a metade de cima da
  tela levanta o feixe. No **toque**, só a metade de cima mira: embaixo ficam os botões.
- Mexer o mouse ou arrastar o dedo **assume a mira por 2 s** (`DURACAO_DO_COMANDO_DO_PONTEIRO`).
  Passados os 2 s, a lanterna volta a seguir a proa. Apertar uma tecla de mira vence o ponteiro na
  hora: as duas fontes são a **mesma** intenção.
- **Q/E e ↑/↓ giram o alvo**, não o jogam no limite: segurada, a tecla empurra o alvo a
  `TAXA_DO_ALVO_DA_MIRA` (2 rad/s); solta, o alvo volta ao repouso na mesma taxa.
- `leme` vale −1..1 (**+1 = esquerda**, o sentido anti-horário visto de cima).

Detalhes que evitam bugs: `keyup` solta a ação; `blur` solta tudo; `Ctrl`/`Alt`/`Meta` e a
repetição automática são ignorados; sair do palco com o mouse ou um `pointercancel` solta a mira;
`contextmenu` é cancelado (e o CSS tira o menu de segurar do iOS): sem isso, segurar o botão com o
dedo abre um menu e o navegador cancela o giro.

---

## 2. `clamp` e aceleração angular com teto

```js
function aproximar(valor, alvo, passo) {
    return valor + clamp(alvo - valor, -passo, passo);
}
```

`clamp` é o que prendia a raquete na tela no `pong/04-raquetes`; agora vem pronto do three.js
(`THREE.MathUtils.clamp`, pego uma vez em `iniciar`, junto com o `lerp` do passo 3). `aproximar` anda
de `valor` na direção de `alvo`, no máximo `passo` de cada vez. Com `passo = aceleração × tempo`
a velocidade deixa de saltar: o leme em −1 não vira a barca de uma vez, ela **ganha giro** aos
poucos (`giroDaBarca = aproximar(giroDaBarca, leme × 1,4, 4 × tempo)`). São três números por eixo:
**velocidade máxima** (1,4 rad/s na barca), **aceleração** (4 rad/s²) e a **posição** que resulta deles.

---

## 3. A lanterna corre atrás do alvo

```js
function seguirAlvo(eixo, alvo, tempo) {
    const velocidadeDesejada = clamp((alvo - eixo.angulo) * GANHO_DA_MIRA, -VELOCIDADE_MAXIMA_DA_MIRA, VELOCIDADE_MAXIMA_DA_MIRA);
    eixo.velocidade = aproximar(eixo.velocidade, velocidadeDesejada, ACELERACAO_DA_MIRA * tempo);
    eixo.angulo = clamp(eixo.angulo + eixo.velocidade * tempo, eixo.minimo, eixo.maximo);
}
```

1. Quanto mais longe do alvo, mais rápido a lanterna **quer** ir (`erro × ganho`), até o teto.
   Perto do alvo, a velocidade desejada cai: ela **freia ao chegar**.
2. A velocidade real só muda o que a aceleração deixa (`aproximar`).
3. O ângulo anda e é preso entre `minimo` e `maximo` **do eixo**. Cada eixo tem os seus: a guinada
   vai de −75° a +75°; a arfagem, de −20° (quase na água) a +60° (para o alto, não por cima das
   costas). Um limite só para os dois, como na primeira versão, deixava o feixe afundar 75° na água.

Cada eixo é um objeto `{ angulo, velocidade, minimo, maximo }`: a função não sabe se é guinada ou arfagem.

**O atraso na curva.** Quando a barca gira, a lanterna **não** gira junto:

```js
guinada.angulo -= giroDaBarca * tempo;   // o feixe fica no rumo; seguirAlvo o puxa de volta para 0
```

O ângulo local diminui o quanto a proa girou: o feixe continua apontando para o mesmo lugar do
mundo e a velocidade desejada (`erro × ganho`) o traz de volta. Numa curva constante o erro se
estabiliza onde `erro × 5 = giro`: com 1,4 rad/s, uns 0,26 rad (15°; medido −0,257). É o "segue a
proa com atraso" do GDD §3, de graça.

---

## 4. Guinada e arfagem: dois pivôs no grafo

```text
barca                  rotation.y = proa
└── lanterna           rotation.y = guinada
    └── feixe          rotation.x = arfagem
        └── cone + SpotLight + alvo
```

É o "estado × desenho" do `xadrez/01-tabuleiro` outra vez: o **estado** são os números (`proa`,
`guinada`, `arfagem`) e a malha só os mostra (`lanterna.rotation.y = guinada.angulo`). Como o feixe
é filho da lanterna, ele herda a guinada; cone, `SpotLight` e alvo giram juntos com ele.

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
const frente = feixe.getWorldDirection(rascunho.ponto).negate();
const noMundo = Math.atan2(-frente.x, -frente.z);
```

**Pegadinha do `-z`:** `getWorldDirection` devolve o eixo **+z** do objeto (só a câmera devolve o
−z). O feixe, como a proa da barca, sai pelo **−z**; por isso o `.negate()`. Gire a lanterna com
**Q** e veja o painel e os eixos azuis (z) concordarem. Os números dão a volta: 170° + 30° mostra −160°.

A câmera usa a conversão no sentido contrário, **local → mundo**:

```js
barca.localToWorld(rascunho.ponto.set(0, 5, 8))   // 5 m acima e 8 m atrás, no espaço da barca
```

Esse ponto é "sempre atrás da barca" **no sistema dela**; `localToWorld` o leva para onde ele está
no mapa agora. Antes, a barca chama `barca.updateMatrixWorld()`: a matriz de mundo só se atualiza no
desenho e a câmera precisa da posição **deste** quadro. O `rascunho` é um `Vector3` guardado e
reaproveitado: `new THREE.Vector3` a cada quadro dá trabalho ao coletor de lixo.

---

## 6. A câmera que segue

```js
seguirComACamera(1 - Math.exp(-SUAVIDADE_DA_CAMERA * tempo));   // camera.position.lerp(ponto ideal, fracao)
```

O `lerp` do passo 3 outra vez: a cada quadro a câmera anda uma **fração** do caminho até o ponto
ideal. A fração **não** pode ser `suavidade × tempo`: a 30 quadros por segundo a câmera seguiria mais
frouxa que a 144. A fração `1 − e^(−suavidade × tempo)` dá o mesmo resultado por segundo em qualquer
taxa de quadros (é o `THREE.MathUtils.damp`). Numa reta o atraso estabiliza em `velocidade ÷
suavidade` (5 ÷ 5 = 1 m); medido: 0,92 m a 30 quadros por segundo, 0,96 m a 60 e 0,98 m a 144. A
câmera olha 6 m **à frente** da proa. No celular em pé o campo de visão sobe de 60° para 80°.

---

## 7. O mar acompanha, de quadradinho em quadradinho

```js
mar.position.set(naGrade(barca.position.x), 0, naGrade(barca.position.z));
```

O plano tem 90 m e a barca anda 5 m/s: sem seguir, em 9 s ela sairia do mar. Mas colar o plano na
posição exata da barca fazia as facetas do `flatShading` **nadarem**: cada vértice caía num lugar
novo do mundo a cada quadro. Por isso o plano só anda em múltiplos do quadradinho (`TAMANHO_DO_MAR /
DIVISOES_DO_MAR` = 1,41 m): os vértices ficam nos mesmos pontos do mundo e as ondas usam a
**posição no mundo** (`x + mar.position.x`). O mar fica até 0,7 m fora de centro; ninguém vê.

---

## Experimente

1. Mude `VELOCIDADE_MAXIMA_DA_MIRA` para 0,5: a lanterna fica pesada como um farol de verdade.
2. Mude `ACELERACAO_DA_MIRA` para 1 e depois para 100. Com 100, ainda existe inércia?
3. Troque `LIMITE_DA_GUINADA` por `Math.PI` (180°): o que o painel mostra com a lanterna virada de
   costas? Agora ponha `ARFAGEM_MAXIMA` em `Math.PI` e segure **↑**: o feixe passa por cima das
   costas. Por que guinada e arfagem não podem dividir um limite só?
4. Em `aproximar`, troque `clamp` por `valor + (alvo - valor)`: a velocidade vira um salto e a
   barca vira de uma vez, sem inércia.
5. Tire o `.negate()` do painel e gire a lanterna com **Q**: o `mundo` passa a mostrar o oposto?
6. Mude `SUAVIDADE_DA_CAMERA` para 1 e depois para 50. Qual é o atraso em metros numa reta?
7. Apague a linha `guinada.angulo -= giroDaBarca * tempo`: a lanterna volta a girar rígida com a
   proa. Compare uma curva fechada com e sem ela.
8. Segure **A**, aperte **←** e solte só a seta. A barca continua virando? Por que ela para? (`acoes`
   guarda a **ação**, não a tecla.) O passo 05 conserta isso guardando **quais entradas** a seguram.

---

**Anterior:** [`03-mar`](../03-mar/) · **Próximo:** [`05-barcos`](../05-barcos/) — o comboio de barcos de pesca, que seguem a barca e balançam a cauda.
