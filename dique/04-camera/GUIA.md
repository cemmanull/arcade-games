# Dique — Passo 4: A câmera

**Mudou:** `regras.js` (a câmera: `camera`, `paraATela`, `paraOMapa`, `limitarCamera`, `rolar`, `aproximar`, `casaSobOPixel`, `casasEscondidas`; o mapa ganha um **dique alto** na frente de uma casa), `script.js` (o canvas vira a janela, arrastar e teclas rolam, a roda e `+` `−` aproximam, o toque passa pela câmera, o H lista as casas escondidas, o fundo sem contorno sob a água) e `index.html` (botões Longe e Perto e os **quatro botões de seta** do cursor); `style.css` deixa os botões quebrarem de linha e dá ao `#aviso` altura fixa
**Rode:** abra o `index.html`, aperte **+** (ou o botão **Perto**), arraste o mapa (ou use **W A S D**), gire com **Q** e **R**, e aperte **H**.

---

## O que você vê

A ilha agora está numa **janela** de 384×300. Em "Longe" (zoom 1) ela cabe inteira e fica no centro; em "Perto" (zoom
2) ela é maior que a janela e **rola**: arraste com o mouse ou o dedo, ou use **W A S D**. A roda do mouse e as teclas
**+** e **−** aproximam e afastam. O contorno dos blocos continua com **1 px** em qualquer zoom.

O toque continua certo: marcar, confirmar e as setas funcionam como no passo 3, com a câmera onde estiver. Se o
cursor sair da janela (zoom 2 e setas), a janela **anda atrás dele**. Os **botões de seta** (← ↑ ↓ →, 48 px) movem o
cursor como as setas do teclado, em qualquer giro. O zoom e a rolagem **por teclas** são anunciados no `#aviso` ("Zoom: perto",
"Mapa rolado para cima", "Sem mais mapa para a esquerda"); o arrasto fica mudo, para não falar a cada pixel. O `#aviso` tem
altura fixa, para os botões não pularem.

No canto da frente da ilha há um **dique alto** (altura 4). Atrás dele está uma casa que você não vê. Gire com
**Q** ou **R** e ela aparece. Com **H**, as casas escondidas ganham um contorno **tracejado** e a letra por cima do
dique, e a leitura lista quais são.

---

## 1. A câmera é uma segunda matriz

Até aqui o desenho ia direto para o canvas: `projetar` dava o pixel. Agora o canvas é uma **janela** e o desenho
passa por mais uma conta, tão simples quanto a primeira, uma **escala** e um **deslocamento**:

```
(pixel da janela) = (pixel do mapa) × zoom + (desvioX, desvioY)
```

Dois passos de ida e volta, exatamente como `mundoParaTela` e `telaParaMundo`:

```js
function paraATela(ponto) { return { x: ponto.x * camera.zoom + camera.desvioX, y: ponto.y * camera.zoom + camera.desvioY }; }
function paraOMapa(pixel) { return { x: (pixel.x - camera.desvioX) / camera.zoom, y: (pixel.y - camera.desvioY) / camera.zoom }; }
```

No desenho, a câmera não aparece no `projetar`, nem em `cantosDoBloco`, nem na ordem do pintor: todos continuam
trabalhando em **pixels do mapa**. Quem aplica a câmera é o próprio canvas, **uma vez por quadro**:

```js
pincel.setTransform(camera.zoom, 0, 0, camera.zoom, camera.desvioX, camera.desvioY);    // daqui em diante, tudo é pixel do mapa
desenharCasas();
pincel.setTransform(1, 0, 0, 1, 0, 0);                                                  // de volta ao pixel da janela
```

`setTransform` recebe uma matriz 2×3: os quatro primeiros números são a escala, e os dois últimos, o deslocamento.
É a mesma ideia da matriz do passo 1, com uma coluna a mais para o deslocamento. A espessura do traço **escala junto**,
e por isso o desenho usa `1 / camera.zoom` quando quer 1 px de verdade na janela.

---

## 2. Rolar: o mapa nunca sai da janela

`rolar(dx, dy)` soma ao desvio e chama `limitarCamera`, que decide o que é permitido, eixo por eixo:

```js
const sobra = eixo[2] - eixo[1] * camera.zoom;      // janela − mapa ampliado: negativo se o mapa não cabe
camera[eixo[0]] = sobra >= 0 ? sobra / 2 : Math.min(0, Math.max(sobra, camera[eixo[0]]));
```

- Se o mapa **cabe** (`sobra ≥ 0`), fica no **centro**: rolar não faz nada.
- Senão, o desvio fica entre `sobra` (a borda de trás do mapa encosta na janela) e `0` (a de frente). Nunca aparece
  vazio entre o mapa e a borda.

**Arrastar ou tocar?** Um dedo que treme não pode rolar o mapa, e um arrasto não pode marcar casa. A regra do
GDD: um arrasto de mais de **8 px** rola; menos que isso, ao soltar, é um **toque**. Os ouvintes de `pointermove`,
`pointerup` e `pointercancel` ficam na `window`, não no canvas, para o arrasto continuar quando o dedo sai dele; guarda-se o
`pointerId` do dedo que arrasta e os outros ponteiros são ignorados: um **segundo dedo** que encosta não rouba o arrasto,
não rola nada e, ao se levantar, não é um toque (`if (dedo && evento.pointerId !== dedo.id) return;`, no `pointerdown`, no `pointermove`
e no `pointerup`). Só o **botão principal** (`evento.button === 0`) começa o gesto, e só a soltura **dele**, sem arrasto, é um toque. Soltar **qualquer**
botão do ponteiro que o jogo segue encerra o gesto (`dedo = null` antes de qualquer outra decisão): com dois botões do mouse
apertados, soltar o principal primeiro e o outro depois faria o `pointerup` final chegar com `button` de outro botão, e um
`return` antes de zerar `dedo` deixaria o arrasto grudado no mouse. E **soltar fora da janela nunca marca**: no `pointerup`, o pixel passa por `pixelDentroDoCanvas` antes de virar toque. O CSS `touch-action: none` no canvas impede o
navegador de rolar a página ou puxá-la para atualizar. *Reusa `tetris/04-controles` (a entrada vira intenção: tocar,
rolar, aproximar são funções, e o mouse, o dedo e as teclas só as chamam).*

---

## 3. Aproximar: o ponto sob o foco não se mexe

Mudar `camera.zoom` sozinho faria o mapa "fugir" do dedo ou do mouse. O certo é escolher um **foco** (um pixel da
janela) e exigir que o ponto do **mapa** que estava sob ele continue lá:

```js
const sobOFoco = paraOMapa(foco);                              // o que está sob o foco, antes
camera.zoom = ZOOMS[nivel];
camera.desvioX = foco.x - sobOFoco.x * camera.zoom;            // foco = mapa × zoom + desvio  →  desvio = foco − mapa × zoom
camera.desvioY = foco.y - sobOFoco.y * camera.zoom;
limitarCamera();
```

A roda usa o ponteiro como foco; `+`, `−` e os botões usam o centro da janela. `ZOOMS = [1, 1.5, 2]` são três
degraus (nada de zoom contínuo: tudo continua na grade de pixels do passo 1).

**A roda soma antes de aproximar.** Um mouse manda `deltaY = ±100` por clique, mas um trackpad manda dezenas de eventos de
poucos pixels por gesto: se cada um desse um degrau, um só deslize iria do Longe ao Perto. Por isso a roda **acumula**
`deltaY` e só dá um degrau quando a soma passa de `LIMIAR_DA_RODA` (100), zerando-a depois. A soma também **recomeça do zero**
quando o sentido **inverte** (meio degrau para cima não ajuda o degrau para baixo) e depois de uma **pausa** de 300 ms sem eventos
(`PAUSA_DA_RODA`; um gesto velho não completa o seguinte). `deltaY === 0` (deslize
horizontal, Shift + roda) não faz nada; `preventDefault` continua, para a página não rolar. O `deltaMode` diz a unidade: pixels (×1), linhas
(o Firefox, ×40: três linhas por clique valem mais que um degrau) ou páginas (×`LIMIAR_DA_RODA`: uma página vale um degrau) — `PIXELS_POR_DELTA_DA_RODA`. A mensagem do zoom diz onde ele está e, se já estava no limite, que **parou** ("Zoom: perto (limite)").

---

## 4. O picking com a câmera: desfazer, depois descer

O toque chega em pixels da **janela**. O picking do passo 3 trabalha em pixels do **mapa**. A ponte é uma linha:

```js
function casaSobOPixel(pixel) {
    const ponto = paraOMapa(pixel);              // desfaz a câmera
    return acharCasaPeloRaio(ponto.x, ponto.y);  // e é o passo 3, sem mudar uma vírgula
}
```

O raio é o do passo 3, inclusive o tratamento do **canto** (pixel sobre a linha da grade, `MARGEM_DO_PONTO_FLUTUANTE` e `acharVizinhaNoCanto`). É por isso que rolar e aproximar **não podem** mudar quem está sob um ponto do mundo: a câmera é desfeita
antes de qualquer pergunta. A página de teste prova: para um ponto do mapa qualquer, em qualquer zoom e rolagem, o
pixel `paraATela(ponto)` aponta a mesma casa e a mesma face que a força bruta dá para o ponto. E que a ida e volta
`paraOMapa(paraATela(p))` devolve `p`.

*A ponte para o `proa-acesa`:* o que aqui é `paraOMapa` é, no three.js, "des-projetar" o pixel com a câmera
(`THREE.Raycaster.setFromCamera`); e o `setTransform` é a matriz da câmera de lá, com uma dimensão a mais.

---

## 5. O dique que esconde a casa

*Reusa `reflexo/06-objetos` (quem cobre quem, e o que o jogador não vê).*

No mapa há agora um dique alto (`4`) na frente da casa `(7, 7)`. Pelo passo 2, o que está à frente cobre o que está
atrás. O novo é **perguntar** isso ao jogo: `casasEscondidas()` devolve as casas `C` para as quais
`quemEsconde(x, y)` (do passo 2) acha um bloco à frente cobrindo o centro do topo. A casa não some do mapa, só da
vista: **girar** a vista (`Q`, `R`, o `girarVista` do passo 2, que refaz a lista do pintor) muda quem está à frente,
e a casa aparece. É essa a jogada que o jogo vai pedir: cavar o certo exige ver a casa de trás.

O **H** desenha por cima do dique o contorno **tracejado** da casa escondida e a letra `C` de novo (forma, não só
cor) e escreve na leitura as casas escondidas de agora, "(3, 2) (7, 7)". Gire e a lista muda. Ao girar,
o `aviso` anuncia o giro e quantas casas ficaram escondidas, para quem não vê a tela.

*"Cobre" é estrito.* `silhuetaCobre` pergunta se o pixel está **dentro** da silhueta do bloco da frente; encostar na
borda não é cobrir (`>` e `<`, nunca `>=` e `<=`). Foi o que tirou a casa `(2, 6)` da lista: o centro do topo dela caía
exatamente na aresta da silhueta de um bloco vizinho, e a casa está inteira à vista.

---

## 6. Teclado para tudo

*Reusa `jogo-da-cobrinha/05-teclado` (cada tecla troca uma intenção, nunca mexe no estado por conta própria).*

| Tecla | Faz |
|---|---|
| setas | movem o cursor pela tela; a janela anda atrás dele (`mostrarCursor`) |
| Enter, Espaço | confirmam na casa do cursor (segurar confirma **uma vez**: `evento.repeat` é ignorado) |
| botões ← ↑ ↓ → | movem o cursor, como as setas |
| W A S D | rolam o mapa |
| + (ou =), − | aproximam e afastam |
| Q, R | giram a vista |
| H | liga o invisível |

`mostrarCursor` rola o **mínimo** para o cursor ficar a 24 px da borda da janela: sem ele, com zoom 2, as setas
levariam o cursor para fora da tela e o teclado não alcançaria a ilha toda. Teclas com Ctrl, Cmd ou Alt ficam para o
navegador. A roda do mouse chama `preventDefault` (por isso o ouvinte é `{ passive: false }`): aproxima o mapa, e a
página não rola.

---

## 7. O que o passo 4 ainda não sabe

- **Pinça** com dois dedos: nesta etapa o segundo dedo é ignorado; o zoom é por botão, tecla ou roda.
- **Inércia** (o mapa continuar deslizando depois de soltar): não há, e movimento reduzido nem precisaria dela.
- **Pointer Events em iOS Safari** e o ms/quadro do desenho inteiro redesenhado por quadro não foram medidos num
  aparelho. Isso é a lição do passo 8.
- Os blocos ainda não fazem nada. A enchente, e as casas salvas ou alagadas, são do passo 5.

---

## Experimente

1. Aperte **+** duas vezes e role tudo para um canto com **D** e **S**: onde a borda do mapa encosta na da janela?
   Tire o `Math.max(sobra, …)` do `limitarCamera` e repita. O que aparece depois da borda?
2. Mude `ZOOMS` para `[0.5, 1, 2, 3]`. Com 0,5 o mapa fica menor que a janela: ele fica no centro? O que o `limitarCamera`
   diz sobre isso, e o toque continua acertando?
3. Em `aproximar`, troque `foco` por `CENTRO_DA_VISTA` na roda do mouse. Ponha o mouse num bloco e gire a roda:
   o bloco foge. Explique pela fórmula do desvio.
4. Mude `LIMITE_DO_TOQUE` para `0` e toque num bloco com o mouse (qualquer tremida). O que acontece? E com `40`?
5. Com **H** ligado, em zoom 2, passe o mouse pelo dique e confira que a leitura diz IGUAL. Role o mapa e passe o
   mouse pelo **mesmo** ponto do mundo: a casa e a face são as mesmas?
6. Gire a vista até a casa `(7, 7)` aparecer e depois até sumir de novo. Quais giros a escondem? Ponha um `4` em
   `(8, 7)` e repita: algum giro a esconde a mais?
7. Troque `1 / camera.zoom` por `1` em `desenharCasas` e aproxime. O contorno engrossa? Por quê?
8. **Quebre de propósito:** em `casaSobOPixel`, troque `paraOMapa(pixel)` por `pixel`. Com zoom 1 o mapa está
   centrado, com desvio `(0, 24)`: o toque erra por quanto? Aproxime e toque: o que é marcado?
9. Mude `LIMIAR_DA_RODA` para `1`: cada evento da roda passa a dar um degrau. Num trackpad, o que acontece com um só deslize? Volte
   para `100` e role com Shift: o zoom muda? E apertar o botão **direito** do mouse sobre um bloco, ou soltar o esquerdo
   fora do canvas: algum dos dois marca?

---

**Anterior:** [`03-picking`](../03-picking/) · **Próximo:** [`05-enchente`](../05-enchente/) — a água entra por busca em largura e as casas se salvam ou se perdem; o dique que você ergue (e a vala que você cava) decide quantas.
