# Dique — Passo 1: A grade

**Mudou:** os quatro arquivos (é o primeiro passo): `index.html`, `style.css`, `regras.js`, `script.js`
**Rode:** abra o `index.html`, passe o mouse (ou o dedo) pela ilha, use as **setas** e depois aperte **H**.

---

## O que você vê

Uma ilha de 10×10 casas, vista de cima e de lado ao mesmo tempo: cada casa é um **losango**, como numa
vista isométrica. O mar é azul; a terra vai da areia (altura 0) à relva e à rocha, e o cinza-claro é o pico.
Nada se mexe sozinho. Um contorno **amarelo** marca a casa sob o mouse ou o dedo, e as **setas** do teclado
andam com ele pela tela (a seta para a direita vai para a casa que está à direita na tela, em qualquer giro).

Com **H** (ou o botão **Ver**) aparecem os eixos do mundo (`x` vermelho, `y` azul), o número de altura de cada
casa (em branco, com contorno escuro: lê-se sobre qualquer cor de terreno) e, embaixo, a **matriz** que desenhou tudo, a **inversa** dela, o determinante e o ponto do chão que a
inversa descobriu sob o dedo. É o hábito do curso: mostrar o invisível.

Este passo é plano de propósito: a altura só aparece como cor e como número. O passo 2 levanta os blocos.
O truque do módulo inteiro está aqui, numa conta de duas linhas.

---

## 1. O mapa é um texto

*Reusa `pacman/01-labirinto` (mapa em texto, grade).*

```js
const ALTURAS_EM_TEXTO = [
    "~~~~~~~~~~",
    "~~~1111~~~",
    ...
];
```

Igual ao labirinto do Pac-Man: cada caractere é uma casa, `split("")` faz a matriz `alturas[y][x]`
(primeiro a linha). A diferença é o que o caractere diz: um **dígito de 0 a 4** é a altura da casa em
blocos empilhados, e `~` é o mar (altura 0, e é de onde a água virá). A borda é sempre mar: quem anda ou
alaga nunca precisa perguntar se a casa existe.

`TAMANHO` é deduzido do texto (`ALTURAS_EM_TEXTO.length`), nunca escrito à mão. Trocar o mapa por outro
quadrado muda a ilha, e o canvas se ajusta sozinho: o `script.js` calcula a largura (`TAMANHO × L + 24`) e a altura
(`ORIGEM.y + TAMANHO × L/2 + 12`) a partir do mapa, e o `ORIGEM` também sai de `TAMANHO`.

---

## 2. Do mundo para a tela: uma matriz 2×2

*Reusa `reflexo/01-planta` (a planta, a vista de cima, as casas medidas em casas e não em pixels).*

No Reflexo a planta era uma grade de quadrados. Aqui a grade é a **mesma**, mas a tela a enxerga de
lado: o eixo `x` do mundo desce para a direita, o eixo `y` desce para a esquerda. Cada casa vira um
losango com o dobro de largura que de altura (2:1).

Isso é uma **transformação linear**, e uma transformação linear no plano é uma **matriz 2×2**:

```
            ┌  L/2   −L/2 ┐         ┌  18  −18 ┐
      M  =  │             │    =    │          │      (L = 36, a largura do losango)
            └  L/4    L/4 ┘         └   9    9 ┘

   [ sx ]   [ origem.x ]       [ u ]
   [ sy ] = [ origem.y ]  +  M [ v ]
```

No código ela é só um dado:

```js
const MATRIZ = [[LARGURA_DO_BLOCO / 2, -LARGURA_DO_BLOCO / 2], [LARGURA_DO_BLOCO / 4, LARGURA_DO_BLOCO / 4]];

function projetar(u, v) {
    return { x: ORIGEM.x + MATRIZ[0][0] * u + MATRIZ[0][1] * v, y: ORIGEM.y + MATRIZ[1][0] * u + MATRIZ[1][1] * v };
}
```

Duas contas para fixar, com a casa `(3, 1)`:

- `sx = 18·3 − 18·1 = 36` e `sy = 9·3 + 9·1 = 36` (mais a origem).
- Ande uma casa em `x`: o ponto desce `(+18, +9)`. Ande uma em `y`: `(−18, +9)`. São as duas **colunas** da matriz.
  Os quatro cantos de uma casa saem de somar essas duas colunas, e é isso que `cantosDoBloco` faz.

Com **H**, os eixos vermelho e azul são as duas colunas da matriz, esticadas até 10 casas. A **origem**
(`ORIGEM`) só empurra o desenho para o meio do canvas: ela cai no canto `(0, 0)`, com 12 px de margem.

**É a conta que o three.js faz** com uma câmera ortográfica: `proa-acesa` usa uma matriz 4×4, e esta é a mesma
ideia com menos linhas e colunas.

---

## 3. A inversa: da tela de volta para o mundo

Para o mouse e o dedo, a pergunta é a contrária: "que casa está sob este pixel?". Se `M` leva do mundo à
tela, a **inversa** `M⁻¹` leva da tela ao mundo. Ela existe porque o **determinante** não é zero:

```
det M = (L/2)(L/4) − (−L/2)(L/4) = L²/4 = 324
                                                     ┌  9   18 ┐     ┌  0,0278  0,0556 ┐
   [[a, b], [c, d]]⁻¹ = 1/det · [[d, −b], [−c, a]]   │         │ /324 =                  │
                                                     └ −9   18 ┘     └ −0,0278  0,0556 ┘
```

```js
const INVERSA = [[MATRIZ[1][1], -MATRIZ[0][1]], [-MATRIZ[1][0], MATRIZ[0][0]]].map(function (linha) {
    return linha.map(function (numero) { return numero / DETERMINANTE; });
});
```

`telaParaMundo(sx, sy)` tira a origem, multiplica pela inversa e entrega um ponto **com decimais**
(`3.7, 2.1` quer dizer "dentro da casa 3, 2"). O `Math.floor` do `apontar` descobre a casa.

A prova de que as duas contas são a mesma coisa pelo avesso é a **ida e volta**: mundo → tela → mundo
devolve o ponto de onde saiu. A página de teste do passo faz isso com 1.000 pontos e exige erro
menor que `1e-9`, só ruído de número decimal. Se você errar um sinal na inversa, a casa amarela passa a andar
para o lado errado do mouse.

**Um limite que vai nos assombrar.** `telaParaMundo` só acerta o **chão**. Quando a casa ganhar altura
(passo 2), o mesmo pixel pode ser o topo de um bloco alto ou o chão lá atrás: a inversa não sabe. Resolver isso é o
passo 3, o "picking com alturas".

---

## 4. Girar a vista: uma troca antes da matriz

*Prévia de `tetris/05-rotacao` (girar uma grade em 90°).*

Para ver a ilha por outro lado, não se mexe na matriz: **gira-se o ponto antes** de projetar.
Um giro de 90° leva `(x, y)` para `(TAMANHO − y, x)`:

```js
function girarPonto(x, y, vezes) {
    let ponto = { x: x, y: y };
    for (let giro = 0; giro < vezes; giro++) ponto = { x: TAMANHO - ponto.y, y: ponto.x };
    return ponto;
}
```

`rotacao` (0 a 3) diz quantos giros a vista deu. `mundoParaTela` gira e depois projeta; `telaParaMundo`
inverte a matriz e depois gira **`4 − rotacao`** vezes: quatro giros dão a volta inteira, então esses giros
extras desfazem os primeiros. Aqui ainda não há botão de girar (ele chega no passo 2, onde girar a vista é o que
torna visível a ordem de pintura), mas o teste põe `rotacao` em 0, 1, 2 e 3 e confere a ida e volta nos quatro.

---

## 5. Dois arquivos de código: o que sabe e o que desenha

O passo tem dois scripts, e **a ordem no `index.html` importa**: scripts clássicos dividem o escopo
global, e o `script.js` usa `MATRIZ`, `alturas` e `telaParaMundo`, que o `regras.js` precisa ter declarado antes.

```html
<script src="regras.js" defer></script>
<script src="script.js" defer></script>
```

- **`regras.js`** é puro: mapa, matriz, inversa, giro. Não conhece `canvas`, `document` nem o mouse. Por
  isso uma página de teste carrega só ele e confere a matemática sem desenhar nada.
- **`script.js`** é a casca: canvas, mouse e dedo (`pointermove`), a tecla **H**, o laço de `requestAnimationFrame`.

O estado vive em variáveis globais simples: `alturas`, `MATRIZ`, `INVERSA`, `rotacao`, `cursor`.
O mouse e o dedo usam o mesmo caminho (Pointer Events), e `touch-action: none` no CSS impede o dedo de rolar a página.

As **setas** fecham o caminho do teclado: `casaVizinha(x, y, dx, dy)` (no `regras.js`) gira a casa para a vista,
soma `(dx, dy)` e desgira de volta. Por isso "direita" é sempre a direita **da tela**, e a casa de fora do mapa
vira `null` (o cursor fica onde está). Teclado e toque chegam à mesma intenção: marcar uma casa.

---

## Experimente

1. Troque `LARGURA_DO_BLOCO` para `48`. Quanto mede agora o canvas (`tela.width`)? Escreva a conta com `TAMANHO × L`
   e confira no console. Cabe em 390 px? (O CSS encolhe o desenho, mas o que o `apontar` calcula continua certo? Por quê?)
2. Mude `MATRIZ` para `[[L/2, −L/2], [L/2, L/2]]` (losangos quadrados, 1:1). Aperte **H**: o que mudou na inversa?
   O mouse ainda acerta a casa amarela?
3. Zere uma coluna: `[[L/2, 0], [L/4, 0]]`. O determinante cai a zero. O que aparece na tela? Por que não existe
   inversa, e o que o `telaParaMundo` devolve?
4. Troque o sinal de um número da `INVERSA` sem mexer na `MATRIZ`. Descreva, antes de rodar, para onde o amarelo vai.
5. No console, em qualquer giro: `telaParaMundo(...Object.values(mundoParaTela(3.2, 7.9)))` e compare com
   `3.2, 7.9`. Faça com `rotacao = 1`, `2` e `3`.
6. Escreva um mapa seu de 8×8 (mude só o texto, com mar na borda). Calcule antes a largura e a altura do canvas e o
   `ORIGEM`; depois confira `tela.width`, `tela.height` e `ORIGEM` no console.
7. Com **H** ligado, ponha o cursor numa casa de relva clara e leia o número dela. Ele está legível? Tire o
   `strokeText` do `rotular` e compare: o que o contorno escuro resolve?
8. **Quebre de propósito:** em `telaParaMundo`, troque `4 - rotacao` por `rotacao`. No console, ponha `rotacao = 1`
   e repita o exercício 5. Em quais giros o erro some, e por quê?

---

**Anterior:** [`dique_gdd.md`](../dique_gdd.md) · **Próximo:** [`02-alturas`](../02-alturas/) — a ilha ganha altura: cada casa vira um bloco, e a ordem de pintar passa a decidir o que se vê.
