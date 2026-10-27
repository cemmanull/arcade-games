# Reflexo — Passo 3: Um raio

**Mudou:** `script.js` (a seção 7, o DDA, é nova; a seção 4 desenha o raio, as casas visitadas e os
cruzamentos; o jogador perdeu a seta, que virou o raio; `atualizar` refaz o raio a cada quadro; o
ângulo inicial passou a 0,25 rad para o raio sair comprido), `index.html` (a legenda do H e o
`aria-label` do canvas) e `style.css` (a leitura reserva 4 linhas).
**Rode:** abra o `index.html`. Ande e gire como no passo 2, e aperte **H**.

---

## O que você vê

A mesma planta, mas agora do zelador sai uma **linha ciano**: o raio. Ela vai na direção em que
ele olha e **para na primeira parede**. No ponto de impacto há uma bolinha branca, e a casa
atingida ganha um **contorno amarelo**. Gire com ← → e o raio varre a sala; ande e ele encurta e
alonga.

Com **H** aparece o que o DDA fez para achar a parede:

- as **casas que ele visitou** ficam com um fundo amarelo claro;
- cada **linha da grade que ele cruzou** ganha uma marca: **círculo** para uma linha vertical,
  **quadrado** para uma horizontal (a forma, não só a cor, diz qual é qual);
- abaixo do desenho, a casa batida, o **lado** (`x` ou `y`), a distância e uma comparação:
  quantos passos o DDA deu e quantos daria um raio andando em passos fixos de `0.1`.

> O raio ainda não faz nada além de existir. O passo 4 lança **um por coluna da tela**, e o
> passo 7 o faz quicar em espelhos. Tudo parte desta função.

---

## 1. O que se quer de um raio

*Reusa `pacman/01-labirinto` (o mundo é uma grade de casas).*

Um raio é uma origem `(x, y)` e uma **direção** `(dx, dy)` de comprimento 1, a mesma seta do
passo 1. A pergunta é: **andando nessa direção, qual é a primeira casa sólida?** A resposta tem
cinco partes, e a função devolve todas num objeto (o mesmo que a variável global `raio`):

```js
{ coluna, linha,        // a casa sólida que ele bateu
  lado,                 // "x": cruzou uma linha vertical da grade; "y": uma horizontal
  distancia,            // do olho até o impacto
  x, y,                 // o ponto do impacto, em casas
  cruzamentos }         // a lista de linhas que cruzou no caminho (o que o H mostra)
```

"Sólida" é a mesma `ehSolida` da colisão do passo 2: tijolo, pedra, porta, emissor e receptor.
Espelhos deixam o raio passar (no passo 7 o feixe vai parar neles). Fora do mapa também é
sólido, então **todo raio termina**: o mapa é fechado, e mesmo um mapa aberto por engano acaba
na borda.

---

## 2. Por que não andar em passos fixos

O primeiro jeito em que todo mundo pensa é andar o raio um pouquinho de cada vez e perguntar "já
pisei numa parede?". Ele está no código só para ser comparado (`lancarRaioPorPassos`):

```js
while (!ehSolida(Math.floor(origemX + direcaoX * distancia), Math.floor(origemY + direcaoY * distancia))) {
    distancia += tamanhoDoPasso;
}
```

Ele funciona, e é um mau negócio por **dois** motivos.

**Custo.** A distância só é tão boa quanto o passo. Com passo `0.1` o erro chega a `0.1` casa; para
errar `0.01`, são 100 conferências **por casa** atravessada. Um raio de 14 casas custa 1.400
conferências, e o passo 4 vai lançar um raio por coluna (320), 60 vezes por segundo. O DDA dá no
máximo **uma conferência por casa visitada**, qualquer que seja a precisão, e a resposta é
**exata**. Compare no H: `DDA 3 passos | fixo 0.1: 21`.

**Tunelamento.** É o mesmo defeito do passo 2: conferir só os **pontos** onde se pisa e nunca o
caminho entre eles. Com passo grande, o raio salta por cima de uma parede fina (experimente
`PASSO_FIXO = 2`). Com passo pequeno ele ainda perde um **canto** de parede, que o raio só
arranha por um trecho mais curto que o passo: parede que o jogador veria some do desenho. Diminuir
o passo reduz o defeito, nunca o elimina, e custa mais. O DDA não tem esse problema por
construção: ele **não escolhe onde pisar**, ele só visita as casas por onde a linha passa, uma a
uma.

---

## 3. O DDA: duas réguas

Um raio de direção `(dx, dy)` e comprimento 1 cruza uma **linha vertical** da grade a cada
`1 / |dx|` de distância, e uma **horizontal** a cada `1 / |dy|`. Quanto mais inclinado o raio
para o lado, mais cedo cruza a próxima vertical. Cada eixo vira uma "régua":

```js
{ passo: 1 ou -1,    // para onde andar a casa quando cruzar
  delta: 1 / |d|,    // distância entre duas linhas deste eixo
  proximo: ... }     // distância, desde a origem, até a PRÓXIMA linha deste eixo
```

O laço é o mais curto possível: **a régua com o menor `proximo` vence**. O raio entra na casa
vizinha daquele lado, a régua avança um `delta`, e se a casa nova é sólida, acabou:

```js
lado = eixos.x.proximo < eixos.y.proximo ? "x" : "y";
distancia = eixos[lado].proximo;
eixos[lado].proximo += eixos[lado].delta;
// ... coluna += passo (se "x") ou linha += passo (se "y")
```

Confira com o início do jogo, que dá para fazer à mão. O zelador está em `(1.5, 1.5)` olhando
`0.25` rad, `(dx, dy) = (0.969, 0.247)`:

| régua | `delta` | `proximo` inicial |
|---|---|---|
| x | 1 / 0,969 = 1,032 | 0,5 × 1,032 = **0,516** (a linha x = 2 está a meia casa) |
| y | 1 / 0,247 = 4,042 | 0,5 × 4,042 = **2,021** (a linha y = 2) |

1. a menor é a de x (0,516): entra na casa (2, 1), que é chão; `proximo` de x vira 1,548;
2. a menor é a de x (1,548): entra na casa (3, 1), chão; `proximo` de x vira 2,580;
3. a menor é a de **y** (2,021): entra na casa (3, 2), que é **pedra**. Parou: `lado = "y"`,
   `distancia = 2,021`.

É exatamente a leitura do H: `raio: casa (3, 2) lado y dist 2.021` e `DDA 3 passos`.

O ponto de impacto sai de graça: `origem + direção × distância`. E o `lado` guarda **qual face**
foi atingida: uma face vertical da casa (`"x"`) ou uma horizontal (`"y"`). No passo 4, esse
detalhe vira sombreamento.

---

## 4. Os casos de canto

Um raio de verdade aponta para qualquer lugar, inclusive os lugares chatos:

- **Direção `0` num eixo** (por exemplo `(1, 0)`): `1 / 0` é `Infinity` em JavaScript, e a régua
  vira "nunca cruza". `prepararEixo` trata esse caso à parte e devolve `proximo: Infinity`, que diz a
  intenção em voz alta. O resultado seria o mesmo sem o ramo (o `Infinity × (distância até a linha)`
  continua `Infinity`, porque essa distância nunca é `0` para direção não negativa), então o ramo é
  clareza e proteção contra uma mudança futura, não um conserto. O perigo de verdade é o `NaN`
  (direção `NaN`, vinda de uma conta quebrada em outro lugar): toda comparação com `NaN` dá falso, o
  laço escolhe `"y"` a cada volta, anda uma casa por vez para baixo até a primeira casa sólida e devolve
  `distancia: NaN`. Termina, mas com um resultado inútil.
- **Quase paralelo** (`dy = 1e-12`): `delta` é gigantesco mas finito, e o laço apenas nunca escolhe
  esse eixo. Funciona sem tratamento.
- **Origem exatamente numa linha da grade**: para direção **negativa**, o primeiro `proximo` é `0`,
  e o raio entra na casa vizinha de imediato. Para direção **positiva**, a conta dá uma casa
  inteira (`proximo = delta`), porque a casa da origem é a que fica à direita (ou abaixo) da linha.
  Nos dois casos a conta continua certa.
- **Empate** (o raio passa exatamente pela quina de quatro casas, como a 45° saindo do centro de
  uma casa): o `<` manda o empate para o eixo **y** primeiro. É uma regra arbitrária, mas fixa:
  todo empate é decidido do mesmo jeito.
- **Termina sempre**: cada volta anda uma casa, e o mundo é finito (fora do mapa é parede).

### O que a página de verificação confere

`verificacao/reflexo/03-um-raio.html` (rode `node verificacao/rodar.mjs reflexo`) carrega o
`script.js` deste passo e confere, entre outras coisas:

- o raio do início contra a conta à mão da seção 3 (casa (3, 2), lado `y`, distância 2,021, três
  cruzamentos);
- casos fixos (direção nula, quase paralelo, origem sobre uma linha, origem dentro de pedra);
- direções degeneradas (`0`, `NaN`, `Infinity`, `1e-300`...) a partir de 4 origens: todas terminam numa
  casa sólida inteira, e origens `NaN` ou infinitas voltam sem andar;
- **24.000 raios sorteados** contra uma referência independente (interseção do raio com cada casa
  sólida), e a coerência do caminho de cruzamentos; os empates exatos de quina só passam pelos
  invariantes;
- o passo fixo: a parede fina que um passo de 2 atravessa, e 20.000 raios em que o passo de 0,1 erra a
  casa em alguns, enquanto o DDA nunca;
- o raio que acompanha o jogador (andar, recuar, girar) e um robô de 6.000 quadros com entrada
  aleatória; a leitura do H (`DDA 3 passos | fixo 0.1: 21`) e a regra de entrada tecla + botão.

---

## 5. Atualizar separado de desenhar

```js
function atualizar(tempo) {
    ...
    andar(frente, lado, tempo);
    atualizarRaio();            // raio = lancarRaio(jogador.x, jogador.y, jogador.dx, jogador.dy)
}
```

O raio é **estado**, refeito em `atualizar` depois que o corpo se mexeu. `desenhar` só lê `raio`.
Isso permite conferir o resultado sem canvas (`raio.coluna`, `raio.lado`...), e é o que o GDD pede
de `regras` contra `desenho`. `lancarRaio` em si não conhece o `jogador` nem o canvas: recebe
números e devolve um objeto. Por isso o passo 4 pode chamá-la 320 vezes, uma por coluna.

---

## 6. Desenhar o raio, e o H de sempre

*Reusa a tecla H do curso ("mostrar o invisível").*

```js
function desenharRaio() {            // contorno da casa, linha do olho ao impacto, bolinha
function desenharCruzamentos() {     // só com H: casas visitadas e marcas nas linhas cruzadas
```

O raio não precisa de H: ele é o assunto do passo. O que o H revela é **como** o DDA chegou lá. As
marcas de cruzamento vêm do mesmo laço que calcula o raio (`cruzamentos.push(...)`), então o que
se vê é o que foi calculado, não uma reconstrução. A regra do GDD para acessibilidade vale
desde já: o feixe tem forma (linha com ponto no fim), a casa batida tem contorno, e as duas
espécies de cruzamento se distinguem por círculo e quadrado, não pela cor.

---

## Experimente

1. Gire devagar com ← e olhe a linha `lado` (com **H**). Em quais ângulos ele é `x` e em quais é
   `y`? Preveja antes de olhar: depende de qual régua, a vertical ou a horizontal, chega primeiro.
2. Mude `PASSO_FIXO` para `1`, depois `2` e `0.01`. Anote os passos e a distância do raio de passo
   fixo. Com `2`, ele atravessa a parede de uma casa? Em que ponto ele acaba?
3. **Quebre de propósito:** em `prepararEixo`, apague o ramo `direcao < 0 ? origem - Math.floor(origem)`
   e use sempre `Math.floor(origem) + 1 - origem`. Os raios para a direita e para baixo continuam
   certos; os outros, não. Por quê? Olhe onde cai a bolinha branca.
4. Tire `"D"` de `CASAS_SOLIDAS`. Aponte o zelador para a porta da casa (5, 3): para onde vai o
   raio agora, e quantos passos o DDA dá?
5. **O feixe para no espelho:** o GDD pede que o feixe pare na casa de um espelho (a ideia do
   passo 7). Mude a condição de parada do laço para também parar em `/` e `\\`. Dica: uma segunda
   função, `paraORaio(coluna, linha)`, que usa `ehSolida` e acrescenta os espelhos.
6. Meça: chame `lancarRaio` e `lancarRaioPorPassos` 100.000 vezes cada uma com `console.time`.
   Quantas vezes o DDA é mais rápido com passo `0.1`? E com `0.01`?
7. Do centro da casa (1,5, 1,5) lance um raio a 45° (`Math.SQRT1_2, Math.SQRT1_2`). Ele passa
   exatamente pela quina da pedra. Anote a casa e o `lado` em que ele bate. Troque `<` por `<=`
   em `lancarRaio`: o que muda, e o que não muda? Por que o empate não é um bug?
8. Acrescente um segundo raio, 90° à direita do primeiro. Quantas linhas mudam em `desenhar`? E em
   `lancarRaio`? (Esse é o argumento para o passo 4: a função já serve para qualquer raio.)

---

**Anterior:** [`02-andar`](../02-andar/) · **Próximo:** [`04-paredes`](../04-paredes/) — um raio por coluna da tela, e a altura da parede vira a primeira pessoa.
