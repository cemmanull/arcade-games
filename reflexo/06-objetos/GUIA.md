# Reflexo — Passo 6: Objetos

**Mudou:** `script.js` (a seção 2 ganhou a paleta dos sprites, o `CATALOGO_DE_SPRITES` e a lista
`OBJETOS`; a 5 sombreia também os sprites; a seção 7 é nova: o espaço da câmera e a projeção; o
`zBuffer` é preenchido em `atualizarRaios`; `desenharVisao` desenha os sprites depois das paredes; o H
ganha os objetos na planta; **saem** a técnica A e a medição do passo 5, que já cumpriram o papel),
`index.html` (a ajuda e o botão **Planta**) e `style.css` (o botão). O ângulo inicial é `0`: o zelador olha para o leste.
A busca do raio, a colisão, a entrada e a textura das paredes são **as mesmas** do passo 5.
**Rode:** abra o `index.html`. No início, uma **sombra** está no corredor, à sua frente. Ande, gire e
contorne as paredes: há mais cinco objetos no mapa. Aperte **H** (ou o botão **Planta**).

---

## O que você vê

Figuras em pé no chão da sala: **sombras** roxas, que são línguas de escuro (uma chama inclinada, de ponta fina,
sem saia nem olhos, só um brilho amarelo) e **cristais** azul-claros que flutuam um pouco acima do piso. Elas ficam menores e mais escuras (névoa) quanto mais longe, e sempre
**de frente para você**, de qualquer ângulo: são "cartazes" (*billboards*), não modelos 3D. Quando uma
parede está no caminho, a figura **some atrás dela**, coluna por coluna. Há um cristal escondido atrás
da parede do início, na linha do olhar. Para chegar nele, desça pela coluna 4 até a linha 7, siga para o leste
até a coluna 6 e suba pelo corredor dela: o cristal está no alto.

Com **H**, a planta mostra cada objeto: **círculo** é sombra, **losango** é cristal (a forma, não só a
cor); **cheio** é o objeto que está na frente do olho, **vazado** é o que ficou para trás.

---

## 1. Objetos são dados

*Reusa `shoot-em-up/03-tiros`, `04-inimigos` e `05-colisao` (listas de objetos que nascem e morrem, dados em catálogo).*

No Shoot'em up, o catálogo diz como cada inimigo **é** e a lista diz **onde** está cada um. Aqui:

```js
const CATALOGO_DE_SPRITES = { sombra: { tamanho: 0.8, elevacao: 0, cor: "#b07cf0", arte: [ ...16 linhas... ] },
                              cristal: { tamanho: 0.5, elevacao: 0.2, cor: "#bbffff", arte: [ ... ] } };
const OBJETOS = [ { tipo: "sombra", x: 3.5, y: 1.5 }, { tipo: "cristal", x: 6.5, y: 1.5 }, ... ];
```

A arte é texto de 16×16, como as texturas do passo 5, mas o **ponto (`.`) é transparente**. Para pôr
um objeto novo no mundo basta uma linha em `OBJETOS`; um tipo novo, uma entrada no catálogo. Nenhuma
função muda. `tamanho` é o lado em casas (1 = a altura de uma parede) e `elevacao`, a altura da base
acima do chão. `verificarArtes` confere as linhas e que todo objeto tem um tipo que existe.

Como no Shoot'em up, a lista é percorrida com `map`, `filter` e `forEach`: nada de laço escrito à mão
para cada objeto.

---

## 2. O espaço da câmera

O mundo tem o `x` e o `y` do mapa. A imagem pergunta outra coisa: **quanto à frente** e **quanto à
direita** do olho está cada objeto? É um **novo sistema de coordenadas**, o da câmera. A mudança do
mundo para a câmera é a **rotação inversa** do olhar: com o olhar `(dx, dy)` e a direita `(-dy, dx)`
(o mesmo "lado direito" do passo 2), cada coordenada é um produto escalar do vetor "olho → objeto":

```js
const profundidade = paraOObjetoX * jogador.dx + paraOObjetoY * jogador.dy;    // para a frente
const lateral = -paraOObjetoX * jogador.dy + paraOObjetoY * jogador.dx;        // para a direita
```

Confira com um caso fácil: olhando para o leste (`dx = 1`, `dy = 0`), um objeto 3 casas à frente e 0,7
abaixo no mapa (o `y` desce) tem profundidade 3 e lateral 0,7: está à direita. A `profundidade` é a mesma
**distância perpendicular** que as paredes usam no passo 4: por isso as duas podem ser **comparadas**
(seção 4). Objeto com `profundidade < PROFUNDIDADE_MINIMA` (0,2 casa) é **descartado**: se for negativo,
está atrás do olho, e o desenho o projetaria de cabeça para baixo; se for quase zero, a divisão por ela
explodiria o tamanho.

---

## 3. Projetar na imagem

A coluna do passo 4 era `camera = 2 × (coluna + 0.5) / largura − 1`, e o raio apontava para
`olhar + plano × camera`. Um objeto que está **sobre** esse raio tem `lateral = profundidade × PLANO × camera`
(é a mesma conta, ao contrário), então a coluna dele sai de `lateral / (profundidade × PLANO)`:

```js
const alturaDeUmaCasa = larguraDaVisao / (2 * PLANO) / profundidade;   // k / profundidade, as paredes
const centro = larguraDaVisao / 2 + lateral * alturaDeUmaCasa;         // coluna do meio do sprite
const lado = tamanho * alturaDeUmaCasa;                                // largura = altura = lado
const base = (alturaDaVisao + alturaDeUmaCasa) / 2 - elevacao * alturaDeUmaCasa;
```

O `k` do passo 4 reaparece: um sprite de 1 casa mede o mesmo que uma parede na mesma profundidade.
O chão do mundo fica na **base** da parede (metade da altura dela abaixo do centro da imagem); a
`elevacao` sobe a figura. O retângulo `{ esquerda, direita, topo, base }` fica no sprite, junto com a
`profundidade` e a `lateral`: tudo que o desenho precisa já está ali, e dá para conferir **sem canvas**.

---

## 4. O z-buffer: uma distância por coluna

A figura pode estar **atrás** de uma parede. A cena já sabe a distância da parede em cada coluna: é a
`perpendicular` de cada raio. Guardá-las num vetor, uma por coluna, é o **z-buffer**:

```js
zBuffer[coluna] = resultado.perpendicular;     // em atualizarRaios, uma por coluna
```

Cada coluna do sprite é testada contra ele (`colunasNaFrenteDaParede`): só entra se
`sprite.profundidade < zBuffer[coluna]`. As que passam ficam em `sprite.colunas`, e **só elas** são
desenhadas. Um sprite meio escondido atrás de uma quina mostra só a metade que está livre; um sprite
inteiro atrás da parede tem `colunas = []` e nada aparece. Ele continua na lista `spritesDaTela` (está
na frente do olho), mas **tapado**: a H mostra quantos aparecem de verdade.

O z-buffer é preenchido na passada das paredes, **antes** de qualquer sprite, e vale por quadro. Não
precisa de nada de 3D: é um vetor de 320 números.

---

## 5. A ordem: do mais longe ao mais perto

Dois sprites na mesma coluna: qual aparece por cima? O mais **perto**. O desenho pinta um depois do
outro, e o que vem por último cobre o anterior (o "algoritmo do pintor"), então a lista é ordenada pela
`profundidade`, do **maior para o menor**:

```js
.sort((umSprite, outro) => outro.profundidade - umSprite.profundidade)
```

A ordem dos dados em `OBJETOS` não importa: `projetarObjetos` refaz `spritesDaTela` a cada quadro, do
mais longe ao mais perto. (Ordenar pela profundidade, e não pela distância em linha reta, usa a mesma
medida do z-buffer. Dois sprites muito próximos nas bordas da imagem podem se cruzar na ordem pelas duas
medidas: é um limite do método, não um defeito do código.)

---

## 6. Transparência e névoa

O `.` da arte vira o número `0` no buffer (`TRANSPARENTE`): um pixel de alfa zero, que as cores reais
nunca têm (elas têm alfa 255). `desenharSprite` **pula** esse pixel, então o que estava embaixo (parede,
chão, outro sprite mais longe) continua à mostra. A névoa é a do passo 5: `sombrearEmNiveis` cria os 32
níveis de cada sprite, sem tocar no pixel transparente, e a profundidade escolhe o nível. O resultado:
uma sombra longe fica quase da cor da névoa, como a parede ao lado dela.

---

## 7. O que o H mostra

```text
(pose do corredor da linha 9, olhando para o leste)
sprites: 6 na frente de 6
aparecem 3 · fora do campo 2 · tapados 1
agora: 0.84 ms de 16.7 (195×150)
```

"Na frente de 6" é `spritesDaTela.length`: profundidade ≥ 0,2, ou seja, na frente do olho, **mesmo fora do campo de visão**.
Desses, "aparecem" têm pelo menos uma coluna que passou no z-buffer; "fora do campo" estão à esquerda ou à direita
da imagem; "tapados" estão dentro do campo, mas atrás de uma parede. As três contas somam a primeira. Só os
**tapados** são obra do z-buffer; gire e veja os números trocarem.

---

## Experimente

1. Acrescente um objeto à lista `OBJETOS` na casa `(9.5, 1.5)`. Quantas linhas de código você mudou fora
   dos dados?
2. **Quebre de propósito:** em `colunasNaFrenteDaParede`, troque `<` por `>`. Quem aparece agora? Por que
   é o mesmo que "ver através" das paredes e tapar o que está perto?
3. Tire o `if (profundidade < PROFUNDIDADE_MINIMA) return null`. Dê as costas para uma sombra: o que
   acontece com ela, e por quê? (Dica: o sinal da profundidade.)
4. Inverta a ordenação (`umSprite.profundidade - outro.profundidade`) e fique no corredor da linha 9, em
   que três objetos se sobrepõem: qual aparece por cima?
5. Mude `tamanho` da sombra para `1.6` e a `elevacao` do cristal para `0.5`. A figura passa pelo teto? O
   que isso diz sobre "altura variável", que o GDD deixa fora de escopo?
6. Troque `lateral` por `-lateral` em `centro`. A sombra do início vai para o outro lado da imagem. Qual
   lado do mundo corresponde à "direita" da câmera, e por que o sinal da `lateral` importa?
7. Desenhe um terceiro tipo, "lanterna", no catálogo (16 linhas, com `.` transparente) e ponha uma no
   mapa. Que nível de névoa uma lanterna a 8 casas recebe?
8. Faça os objetos andarem: dê um `vx` a cada objeto e some `vx * tempo` em `atualizar`. O que muda no
   z-buffer e na lista de sprites? (Esse é o gancho da sombra de verdade, no passo 8.)

---

**Anterior:** [`05-texturas`](../05-texturas/) · **Próximo:** [`07-espelhos`](../07-espelhos/) — o feixe de luz, que quica nos espelhos e abre portas.
