# Dique — Passo 3: O picking

**Mudou:** `regras.js` (o picking: `telaParaGirado`, `acharCasaPeloRaio`, `facesDaCasa`, `acharCasaPorForcaBruta`, `casaDaTela`), `script.js` (o toque acha a casa pelo raio, **dois toques** marcam e confirmam, pinos, aviso para o leitor de tela, o H mostra o raio e a conferência) e `index.html` (botão Aplicar e o `#aviso`); `style.css` ganha o aviso
**Rode:** abra o `index.html`, toque (ou clique) num bloco **alto**, toque de novo na mesma casa, use as **setas** e **Enter**, e aperte **H**.

---

## O que você vê

A mesma ilha do passo 2, e agora o dedo **acerta o que vê**: toque no topo do pico e o contorno amarelo cai no pico, não
no chão atrás dele. Toque numa lateral e é o mesmo bloco. O toque funciona em **dois tempos**: o primeiro **marca** a
casa (contorno com **borda dupla**), o segundo, na **mesma** casa, **confirma** e põe um **pino** (uma bandeirinha;
um terceiro toque o retira). Tocar noutra casa só move a marca.

Teclado: as setas movem o cursor (como no passo 2) e **Enter** ou **Espaço** confirmam direto, sem marcar antes. O botão
**Aplicar** faz o mesmo. Tudo o que muda é anunciado no `#aviso`, que o leitor de tela lê ("Marcada a casa 4, 3,
altura 4. Toque de novo na mesma casa para confirmar").

Com **H**: as colunas que o raio atravessou (losangos brancos no chão, de frente para trás), a **face** que ele
acertou (contorno grosso amarelo, topo ou lateral) e, embaixo, três linhas: o resultado do **raio**, o da **força
bruta** (que diz IGUAL ou DIFERENTE) e o que a **inversa sem altura** do passo 1 responderia, para você ver o erro
que este passo conserta.

---

## 1. O problema: o mesmo pixel, vários candidatos

Com alturas, um pixel pode ser o topo de um bloco alto, a lateral de outro ou o chão lá atrás. A inversa do passo 1
(`telaParaMundo(sx, sy, 0)`) só acerta o chão. Mas o pixel é o encontro de uma **reta** (o raio do olho) com os
blocos, e a matemática da reta já está pronta: `telaParaGirado(sx, sy, z)` é a inversa **sem o último giro**, e
diz qual ponto `(x', y')` do plano de altura `z` está sob o pixel:

```js
function telaParaGirado(sx, sy, z) {
    const dx = sx - ORIGEM.x, dy = sy - ORIGEM.y + z * ALTURA_DO_DEGRAU;
    return { x: INVERSA[0][0] * dx + INVERSA[0][1] * dy, y: INVERSA[1][0] * dx + INVERSA[1][1] * dy };
}
```

Variando `z`, o ponto anda em linha reta: a cada unidade de `z`, `x'` e `y'` mudam **o mesmo tanto**
(`2 · ALTURA_DO_DEGRAU / LARGURA_DO_BLOCO`, 2/3 aqui). Descer o raio é andar na diagonal `(−1, −1)` da grade,
**para longe de quem olha**, enquanto `z` cai de `ALTURA_MAXIMA` (4) até 0.

---

## 2. O raio desce pelas colunas: o DDA de novo

*Reusa `reflexo/03-um-raio` (o DDA: andar a grade casa a casa, sempre até a próxima linha).*

No Reflexo o raio andava num plano, de casa em casa. Aqui o raio entra por cima e desce, atravessando uma **coluna**
(um bloco inteiro, do chão ao topo) por vez. Em cada coluna há duas perguntas, nesta ordem:

```js
if (z < altura) return { ..., face: face, z: z };                // entrou por baixo do topo: bateu na lateral
if (zDeSaida <= altura) return { ..., face: "topo", z: altura }; // desceu até o topo antes de sair da coluna
```

- Se o raio **já está abaixo do topo** ao entrar na coluna, ele entrou pelo lado: **lateral**. Qual? Depende da
  linha da grade que cruzou: `x'` leva à lateral **direita**, `y'` à **esquerda** (são as duas que a tela vê).
- Senão, se ele chega à altura do topo **antes de sair**, bateu no **topo**.
- Senão, a coluna não é obstáculo, e o raio segue para a próxima.

```js
const zDeSaida = z - Math.min(faltaX, faltaY) / CASAS_POR_ALTURA;   // z em que ele sai desta coluna
...
if (faltaX <= faltaY) { coluna--; faltaY -= faltaX; faltaX = 1; face = "direita"; }
else { linha--; faltaX -= faltaY; faltaY = 1; face = "esquerda"; }
```

`faltaX` e `faltaY` são o que o DDA do Reflexo chamava de distância até a próxima linha: quanto falta, andando
para trás, até `x'` ou `y'` virar um número inteiro. O menor dos dois decide qual linha vem primeiro. O laço
termina quando o raio sai do mapa pelos fundos (`coluna` ou `linha` negativa) ou chega ao chão (`z < 0`) **fora**
do mapa: aí devolve `null`, e tocar no mar aberto não marca nada.

A função devolve `{ x, y, face, z, visitadas }`: a casa do **mapa** (`casaDaTela` desfaz o giro), a face
(`"topo"`, `"esquerda"`, `"direita"`), a altura do impacto e as colunas visitadas, para o H desenhar.

**A água conta como topo.** Onde o terreno está abaixo do nível, quem aparece é a superfície da água, 12 px mais
alta (`alturaVisivel`, do passo 2). O raio usa essa altura, então tocar num lago acerta a casa do lago, e não a
casa de trás, onde o fundo "estaria" por baixo do azul.

---

## 3. A força bruta é a referência

*Reusa `reflexo/06-objetos` (quem cobre quem, em ordem de distância).*

Um algoritmo esperto precisa de um ingênuo para ser julgado. A força bruta não faz nenhuma conta de raio: pega
**os polígonos que o desenho pinta** e pergunta, um a um, se o pixel cai dentro:

```js
function acharCasaPorForcaBruta(sx, sy) {
    for (let i = listaDeDesenho.length - 1; i >= 0; i--) {          // da mais próxima para a mais longe
        const casa = listaDeDesenho[i], faces = facesDaCasa(casa.x, casa.y);
        const face = Object.keys(faces).find(function (nome) { return poligonoContem(faces[nome], { x: sx, y: sy }); });
        if (face) return { x: casa.x, y: casa.y, face: face };      // o primeiro que contém o pixel vence
    }
    return null;
}
```

É a **lista do pintor lida de trás para a frente**: o que foi pintado por último é o que se vê, então o primeiro
polígono que contém o pixel é a resposta. `poligonoContem` testa um polígono convexo com o produto vetorial (o pixel
fica do mesmo lado de todas as arestas). São até 300 polígonos por toque, contra poucas colunas do raio: por isso o
jogo usa o raio, e a força bruta só confere. O H mostra as duas respostas lado a lado.

**A prova está numa página de teste:** para 20 terrenos sorteados com semente, nos 4 giros, em todos os pixels de
uma grade da tela, o raio e a força bruta dão a mesma casa e a mesma face. Se um dia o DDA errar um sinal, a
página mostra o primeiro pixel em que eles discordam.

---

## 4. Dois toques: marcar e confirmar

*Reusa `tetris/04-controles` (entrada vira intenção).*

No celular, o losango de um bloco tem 36×18 px, menor que um dedo. Errar o bloco ao confirmar uma jogada seria
frustrante, então o toque tem **dois tempos** (decisão do GDD): o primeiro só **marca**, o segundo confirma.

```js
function tocar(casa) {
    if (marcada && casa.x === cursor.x && casa.y === cursor.y) return aplicar();   // 2º toque, mesma casa
    cursor = { x: casa.x, y: casa.y };                                             // 1º toque, ou casa nova
    marcada = true;
}
```

`marcada` é o estado de "esperando a confirmação". Mexer o cursor com as setas **desmarca** (quem usa o teclado
não precisa de dois tempos: Enter confirma direto). `aplicar()` é, por enquanto, só colocar ou tirar um pino
(`pinos`, um conjunto de `"x,y"`): é o lugar onde o passo 5 vai pôr **Erguer** e **Cavar**. Mouse, toque,
teclado e botão desembocam nas mesmas duas funções, `tocar` e `aplicar`.

Dois cuidados de teclado, de quem já se queimou: **Enter e Espaço num botão** já acionam o botão, então o ouvinte do
documento os ignora quando o alvo é um `BUTTON` (senão aplicaria duas vezes); e **Ctrl/Cmd/Alt + tecla** é do
navegador (Ctrl+R recarrega a página), não gira a vista.

---

## 5. Tudo por teclado, e anunciado

As setas andam pela tela (`casaVizinha`, do passo 2), e a cada movimento o `avisar` escreve em
`<p id="aviso" role="status">` o que o leitor de tela deve dizer: a casa, a altura e se ela está escondida atrás de um
bloco. Anunciamos **por evento**, nunca por quadro: um `aria-live` que mudasse 60 vezes por segundo seria ruído.
O H continua com `aria-live="off"`. O cursor mantém o que o passo 2 ensinou: pintado na vez da casa dele, e
**tracejado por cima de tudo** se um bloco o esconde; a marca de "pronto para confirmar" é a **borda dupla**
(forma, não só cor).

---

## 6. O que o passo 3 ainda não sabe

- **Rolar e aproximar** o mapa: o passo 4 põe uma câmera na frente de tudo, e o picking continua certo porque ele só
  precisa que a câmera seja desfeita antes.
- **Pino não é jogada.** Erguer, cavar e a água que sobe são do passo 5.
- A ilha ainda cabe inteira no canvas; é por isso que o toque não disputa com a rolagem.

---

## Experimente

1. Aperte **H** e passe o mouse por um bloco alto de lado: quais lados o raio acerta, `esquerda` ou `direita`? Gire a
   vista com **Q** e repita. O que troca de nome, e por quê?
2. Ponha o mouse num pixel do **topo** do pico e leia a linha "inversa sem altura". Em quantas casas ela erra, e para
   que lado? Mude o `ALTURA_DO_DEGRAU` para `6` e veja o erro encolher.
3. Troque `ALTURA_MAXIMA` por `2` no `regras.js` e toque no topo do pico (altura 4). O que o raio devolve, e por que o
   topo já não é acertado? (Dica: o raio começa a descer de onde?)
4. Em `acharCasaPeloRaio`, troque `z < altura` por `z <= altura`. O H diz IGUAL em todo pixel? Procure pixels na aresta
   entre o topo e uma lateral.
5. Troque `faltaX <= faltaY` por `faltaX < faltaY`. Algo muda na tela? Em que pixels, e por que quase nunca?
6. Marque uma casa e aperte **R**. A marca continua? Mude `girarVista` para desmarcar e explique por que isso seria
   (ou não) melhor para quem usa o dedo.
7. Marque uma casa **escondida** atrás do pico com as setas. O que o contorno faz? Toque no pico por cima dela: o
   que é marcado?
8. **Quebre de propósito:** em `acharCasaPorForcaBruta`, troque o laço para ir de `0` até o fim (da mais longe para a
   mais perto). O H diz DIFERENTE onde? Por que a ordem do laço é a ordem do pintor ao contrário?

---

**Anterior:** [`02-alturas`](../02-alturas/) · **Próximo:** [`04-camera`](../04-camera/) — o mapa rola e aproxima, e o dedo continua acertando; o dique alto esconde uma casa até você girar a vista.
