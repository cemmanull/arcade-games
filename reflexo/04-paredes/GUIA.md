# Reflexo — Passo 4: Paredes

**Mudou:** `script.js` (a seção 8 é nova: o tamanho da imagem; `atualizarRaio` virou
`atualizarRaios`, um raio por coluna, mais um raio à parte para o olhar; `desenhar` escolhe entre a imagem e a planta, e a imagem é a
função nova `desenharVisao`; a planta ganhou o leque de raios e a leitura, uma linha; a paleta
ganhou teto, piso e as casas `D`, `E`, `R`, com cores mais escuras na planta; `lancarRaio` ganhou o
parâmetro `registrar`; o ângulo inicial é 0,25 rad), `index.html` (dois canvas
num `#palco`) e `style.css` (`#palco`, `#visao`, `[hidden]` e a leitura de 5 linhas).
A conta do DDA, a colisão e a entrada são **as mesmas** do passo 3 (a busca já não aloca objetos: seção 1).
**Rode:** abra o `index.html`. Ande e gire como antes. **H** troca a imagem pela planta.

---

## O que você vê

Pela primeira vez o jogo é **3D**: o corredor do início, em primeira pessoa. Paredes de tijolo e
de pedra, teto escuro e piso um pouco mais claro. Quanto mais perto, mais alta a parede. As faces
viradas para um lado da sala são **mais escuras** que as do outro, o que separa uma parede da
vizinha sem nenhuma luz de verdade. Ande até uma parede: ela cresce até encher a imagem.

Com **H** a imagem **dá lugar à planta** (o GDD diz "troca", não "sobrepõe"): a grade, um **leque
de raios** saindo do zelador, e o raio do olhar em destaque, o mesmo do passo 3. Embaixo, os números,
agora com uma linha nova sobre a altura do raio do olhar. Aperte **H** de novo e a imagem volta.

> Ainda não há texturas, névoa, objetos nem espelhos: cada um é um passo. O que este passo
> prova é que **um raio por coluna e uma divisão** bastam para fazer profundidade.

---

## 1. Um raio por coluna

*Reusa o DDA do passo 3 e `shoot-em-up` (a trigonometria do seno e do cosseno).*

A imagem tem 320 colunas de pixels (195 na vertical, veja a seção 6). Para cada uma, o jogo lança um
raio com o `lancarRaio` do passo 3, **sem mexer na busca**. O que muda é só a direção:
cada coluna olha um pouco para um lado.

```js
for (let coluna = 0; coluna < larguraDaVisao; coluna++) {
    const camera = 2 * (coluna + 0.5) / larguraDaVisao - 1;   // -1 na esquerda, 0 no meio, +1 na direita
    ...
    resultado.perpendicular = resultado.distancia * cosseno;
    resultado.altura = k / resultado.perpendicular;
    raiosDaTela[coluna] = resultado;
}
```

O `+ 0.5` mira o **meio** do pixel, não a quina dele. O resultado de cada coluna fica em
`raiosDaTela[coluna]`: lista de dados que o desenho só lê, a mesma separação entre `atualizar` e
`desenhar` do passo 3.

**O raio do olhar é outro raio.** Com 320 colunas (um número par) nenhuma aponta exatamente para onde
o zelador olha: a do meio está 0,003 do centro do plano. Por isso `raio`, o do passo 3, é lançado à
parte, na direção `(dx, dy)`, e é ele que o H destaca e que a leitura mostra (no início, a distância
2,021 do passo 3). Três economias: os 320 raios da imagem **não guardam** os cruzamentos (`registrar`; só o H os
lê), **reaproveitam os mesmos 320 objetos** a cada quadro (`percorrerAGrade` os preenche, com variáveis simples:
eram uns 77 mil objetos por segundo) e o passo fixo da comparação só é refeito com o H ligado e a pose mudada.

---

## 2. O plano da câmera e o campo de visão

Imagine uma janela de vidro a 1 casa do olho, perpendicular a ele. A imagem é o que se vê por
ela. A janela tem uma **largura**, e é ela que define o **campo de visão** (FOV): janela larga,
muita sala; estreita, pouca.

```js
const CAMPO_DE_VISAO = 66 * Math.PI / 180;
const PLANO = Math.tan(CAMPO_DE_VISAO / 2);   // metade da janela, a 1 casa do olho
```

Com o FOV, a metade da janela é uma **tangente**: o triângulo olho → centro da janela → borda
tem cateto 1 (a distância até a janela) e o cateto oposto `PLANO`. Cada coluna aponta para
`olhar + plano × camera`, onde `plano` é o vetor **perpendicular** ao olhar, o mesmo "lado direito"
`(-dy, dx)` que o passo 2 usou para o passo lateral:

```js
const inclinadoX = jogador.dx - jogador.dy * PLANO * camera;
const inclinadoY = jogador.dy + jogador.dx * PLANO * camera;
```

Esse vetor não tem comprimento 1, então é dividido por `Math.hypot` antes de entrar em
`lancarRaio`, que precisa de uma direção unitária.

| FOV | `PLANO` | efeito |
|---|---|---|
| 50° | 0,47 | vê pouco da sala; paredes grandes |
| **66°** | **0,65** | o padrão do GDD |
| 90° | 1,00 | vê muito; paredes pequenas, borda esticada |

O GDD manda que o FOV seja **ajustável** (50° a 90°) nas opções do jogo final, por conforto: aqui
é uma constante para você mexer (exercício 1).

---

## 3. Altura = k / distância

Quanto maior a distância, menor a parede: pense numa pessoa se afastando. Por triângulos
semelhantes, a altura na imagem é `k / distância`, com `k` constante:

```js
const k = larguraDaVisao / (2 * PLANO);   // pixels de uma parede de 1 casa a 1 casa de distância
altura: k / perpendicular
```

`k` vem de uma regra de três: a janela, que mede `2 × PLANO` casas a 1 casa de distância,
ocupa `larguraDaVisao` pixels. Então 1 casa a 1 casa de distância ocupa
`larguraDaVisao / (2 × PLANO)` pixels. Para 320 colunas e 66°, `k ≈ 246`: uma parede de 1 casa
a 4 casas mede 62 pixels, a 8 casas, 31. **Dobrou a distância, metade da altura**: é o que o
teste deste passo (`verificacao/reflexo/04-paredes.html`) confere em todas as colunas. Na imagem vertical (195 colunas), `k ≈ 150`, a
altura da imagem: uma parede a 1 casa a enche.

A coluna é desenhada **centrada** na imagem: o olho está na metade da altura da parede. Se a
conta passa da altura da imagem (parede muito perto), `desenharVisao` corta em `alturaDaVisao`.

---

## 4. O olho de peixe

O DDA devolve a distância **ao longo do raio**. Mas a altura precisa da distância **perpendicular
à janela**. Numa parede reta de frente para você, o raio do canto da imagem anda mais que o do
meio, só porque é inclinado: a parede é a mesma, mas a conta daria colunas laterais mais baixas, e
uma parede reta apareceria **curva**, como numa lente "olho de peixe".

```js
const cosseno = jogador.dx * direcaoX + jogador.dy * direcaoY;
const perpendicular = resultado.distancia * cosseno;
```

O produto escalar do olhar com o raio (ambos de comprimento 1) é o **cosseno** do ângulo entre
eles, e `distância × cosseno` é a projeção da distância no eixo do olhar: justamente a perpendicular.
Conferência numérica da mesma página: de frente para uma parede a 7 casas, a distância ao longo do raio da
coluna da ponta é cerca de 8,3 (`7 / cos 33°`), e a perpendicular é **7 em todas as colunas**, logo
todas têm a mesma altura. Experimente tirar a multiplicação (exercício 2).

---

## 5. Os lados x e y

O `lado` do passo 3 enfim serve para algo. Se o raio terminou cruzando uma linha **vertical** da
grade (`"x"`), ele bateu numa face voltada para o leste ou o oeste; se uma **horizontal**
(`"y"`), numa face voltada para o norte ou o sul. As faces `y` ganham uma película preta de 40% por cima:

```js
if (umRaio.lado === "y") {
    pincelVisao.fillStyle = SOMBRA_DO_LADO_Y;
    pincelVisao.fillRect(coluna, topo, 1, altura);
}
```

É a luz mais barata que existe: ninguém precisa de lâmpada, só de dois tons. Mas é ela que faz a
quina de uma pilastra parecer uma quina. Cada coluna é pintada com a cor da casa batida (tijolo,
pedra, e cores provisórias para porta, emissor e receptor, que o passo 5 troca por texturas).

---

## 6. Baixa resolução, escala inteira

*O GDD, seções 6 e 8.*

O canvas `#visao` tem **320×200** pixels de verdade (ou **195×150** em tela vertical) e é
**ampliado pelo navegador** com `image-rendering: pixelated`. São poucas colunas, poucos raios: o custo
fica sob controle e o visual fica de "pixel grande". A ampliação precisa ser por um número
**inteiro**: com 2,4 vezes, alguns pixels saem com 2 pontos de largura e outros com 3, e a
parede "treme" ao girar. `ajustarVisao` escolhe a resolução pela orientação da janela e a
escala inteira que cabe:

```js
visao.width = larguraDaVisao;   // mudar o tamanho de um canvas também o apaga
visao.style.width = larguraDaVisao * escala + "px";
```

195×150 dobrado dá 390×300: ocupa a largura de um celular de 390, enquanto 320×200 caberia só
1× (320 pixels, sobrando margem dos dois lados). Numa janela de 360 de largura a escala cai para 1 (195 pixels de largura).
Uma mudança de orientação chama `ajustarVisao` de novo (`resize`).

**Caber sem rolar.** A escala é a maior que cabe na largura **e** na altura que sobra depois do resto da
página. Esse resto não é um número chutado: `medirOResto` soma a altura real do título, da leitura,
dos botões e da ajuda, mais os espaços e as margens do `body` (a ajuda, por exemplo, ocupa duas linhas
numa tela estreita). A planta do H também é limitada a essa altura, e o `#palco` reserva a **maior**
das duas, a imagem ou a planta: ligar o H não empurra o resto da página.

**Como a imagem é desenhada.** Aqui, a coluna é um `fillRect` de 1 pixel de largura, o mais
simples. O GDD escolheu, depois de medir (seção 8.2), escrever os pixels num buffer `ImageData`,
bem mais rápido que dezenas de desenhos por quadro; isso entra no passo 5, com texturas, onde
as duas técnicas são medidas lado a lado. Este passo **não mediu** o tempo por quadro.

---

## 7. O H troca a imagem pela planta

*Reusa a tecla H do curso.*

```js
visao.hidden = depuracaoLigada;
tela.hidden = !depuracaoLigada;
```

A planta do passo 3 continua inteira (casas, raio do olhar, cruzamentos), mais o **leque**:
um raio a cada poucas colunas, de linhas finas. Dá para ver o campo de visão como um triângulo
e as paredes que cada raio achou. As letras amarelas (D, E, R) têm contraste de pelo menos 4,5:1 com
o fundo da casa, por isso a planta usa `COR_NA_PLANTA`, cores mais escuras que as da imagem.
O atributo `hidden` esconde um elemento, mas o CSS `canvas { display: block }` o vence; por isso o
`style.css` tem `[hidden] { display: none; }`. Sem ele os dois canvas apareceriam.

---

## 8. O que a página de verificação confere

`verificacao/reflexo/04-paredes.html` (`node verificacao/rodar.mjs reflexo`) carrega este `script.js` e
confere:

- o DDA de sempre (os casos fixos do passo 3) e as direções das colunas: o desvio de cada uma é
  `atan(PLANO × câmera)`, crescendo da esquerda para a direita;
- de frente para uma parede reta, as 320 faixas têm a mesma altura (`k / 1,5`), e a distância
  **crua** cresce para as bordas: é a prova do olho de peixe;
- `altura × perpendicular = k`, dobrar a distância divide a altura por dois, e 60 poses sorteadas ×
  320 colunas batem com uma referência independente (casa, face, distância e altura);
- as duas faces: a sombra do lado `y` aparece em exatamente as colunas `y`;
- colado à parede, a altura é cortada na da imagem; retrato ou paisagem escolhem 195×150 ou 320×200,
  com escala inteira, e o palco reserva a altura certa;
- H troca imagem e planta, a entrada (tecla + botão) e um robô de 1.500 quadros sem nada fora da
  imagem.

---

## Experimente

1. Mude `CAMPO_DE_VISAO` para 50° e depois para 90°. Quanto vale `k` em cada caso? O que acontece
   com a altura das paredes, e com o que se vê nas bordas da imagem? Veja o leque no H.
2. **Quebre de propósito:** em `atualizarRaios`, use `resultado.distancia` em vez de
   `perpendicular` na altura. De frente para uma parede reta, o que se vê? Gire um pouco: as
   bordas da parede se curvam?
3. Troque `k` por `alturaDaVisao`, o atalho que muitos tutoriais usam. Qual a diferença de
   altura em relação ao `k` calculado? Em que situação o `k` calculado é o correto?
4. Mude `SOMBRA_DO_LADO_Y` para `"rgba(0, 0, 0, 0)"`. Dá para distinguir as quinas? Depois suba
   para `0.7`: o que se perde nas paredes escuras?
5. Névoa de brinquedo: em `desenharVisao`, depois de pintar a parede, pinte por cima um retângulo
   preto com alfa `Math.min(0.8, umRaio.perpendicular / 12)`. Compare com o passo 5.
6. Aumente a resolução em `ajustarVisao` para 640×400 (e a escala cai pela metade). Quanto tempo
   demora `atualizarRaios` + `desenharVisao`? Meça com `console.time` e compare com os 16,7 ms de
   um quadro a 60 por segundo.
7. Apague a regra `[hidden] { display: none; }` do CSS. O que aparece? Por que o atributo não
   basta?
8. Faça o zelador olhar exatamente para uma quina entre duas paredes (use H). O que cada coluna
   dos dois lados da quina mostra? Por que as colunas da quina têm sombras diferentes?

---

**Anterior:** [`03-um-raio`](../03-um-raio/) · **Próximo:** [`05-texturas`](../05-texturas/) — a parede ganha tijolos de verdade, e as duas técnicas de desenho são medidas.
