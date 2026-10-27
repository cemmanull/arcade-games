# Faroleiro — Passo 1: A cena

**Mudou:** os três arquivos (é o ponto de partida do módulo).
**Rode:** abra o `index.html`. **Este módulo precisa de internet na primeira vez**, para baixar o
three.js; é a única exceção do curso. Depois o navegador guarda a biblioteca.

---

## O que você vê

Uma caixa colorida girando num fundo azul-noite, ocupando a tela inteira abaixo do título. Cada
face tem uma cor diferente, conforme a direção para onde ela aponta. Redimensione a janela: a caixa
não estica nem amassa.

Desligue a internet e recarregue: em vez de uma tela vazia, aparece um aviso em português dizendo
o que houve.

> O jogo completo está descrito em [`faroleiro_gdd.md`](../faroleiro_gdd.md): uma noite de
> tempestade, o farol apagado e o faroleiro numa barca, levando um comboio de barcos de pesca até o
> porto. Hoje só montamos o palco.

---

## 1. A ponte: three.js é um módulo, o curso é de scripts clássicos

```html
<script type="importmap"> ...endereço do three.js no CDN... </script>
<script type="module">import * as THREE from "three"; window.THREE = THREE;</script>
<script src="script.js" defer></script>
```

Desde o primeiro módulo usamos `<script src defer>`, que compartilham um escopo global. O
three.js moderno vem como **módulo ES** (`import`/`export`), e o curso não usa `import` próprio
porque módulos locais não carregam por `file://` (duplo clique).

A saída são três peças, **nesta ordem**:

1. o **import map** diz que `"three"` significa tal endereço na internet;
2. um módulo **inline** (escrito dentro do HTML, então carrega por `file://`) importa o three.js e
   o pendura em `window.THREE`;
3. o `script.js` clássico, depois, enxerga `THREE` como uma variável global qualquer.

A versão (`0.186.1`) está escrita inteira no endereço. Fixar a versão evita que uma atualização
do CDN quebre o jogo sem você mexer em nada. Como cada passo é independente, **o endereço se repete
em todo `index.html`**.

---

## 2. Cena, câmera, renderizador

```js
cena = new THREE.Scene();
camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
renderizador = new THREE.WebGLRenderer();
renderizador.render(cena, camera);
```

| Objeto | Papel |
|---|---|
| `Scene` | o mundo: uma árvore onde tudo se pendura com `cena.add(...)` |
| `PerspectiveCamera` | de onde olhamos: campo de visão (60° na vertical), proporção, perto e longe |
| `WebGLRenderer` | desenha a cena vista pela câmera num `<canvas>` que ele mesmo cria |

Os eixos: **x** para a direita, **y** para cima, **z** vindo na sua direção. A câmera em
`(0, 1.5, 5)` está 5 unidades "para trás" da caixa, que fica na origem. Neste módulo uma unidade é
um **metro**.

O que se vê é uma **malha**: uma **geometria** (a forma: `BoxGeometry`) mais um **material** (a
aparência). Aqui o `MeshNormalMaterial` pinta cada face pela direção dela e dispensa luz; luz e
materiais de verdade ficam para o passo 2.

---

## 3. O loop, outra vez (reuso do `pong/02-loop`)

```js
const tempo = Math.min(segundosDesdeOUltimoQuadro, 0.05);
atualizar(tempo);
desenhar();
requestAnimationFrame(quadroAQuadro);
```

É o mesmo laço do Pong, passo 2: `requestAnimationFrame` entrega o carimbo de tempo, o delta time
faz a velocidade valer igual em qualquer tela, e o teto de 0,05 s impede o salto depois de a aba
ficar parada. A velocidade agora é em **radianos por segundo**:

```js
caixa.rotation.y += VELOCIDADE_DE_GIRO * tempo;
```

`atualizar` mexe nos números; `desenhar` só mostra. Manter as duas separadas vale ouro daqui
para frente: toda a lógica do jogo vai morar em `atualizar`.

---

## 4. Redimensionar sem esticar

```js
renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderizador.setSize(largura, altura, false);
camera.aspect = largura / altura;
camera.updateProjectionMatrix();
```

- **Tamanho:** o `false` manda o three.js **não** mexer no CSS do canvas; quem decide o tamanho na
  página é o `style.css`. O canvas só ajusta a quantidade de pixels internos.
- **Densidade:** telas de celular têm 2 ou 3 pixels físicos por pixel de CSS. Desenhar todos eles
  é caro e quase ninguém percebe a diferença; o teto em 2 poupa a GPU.
- **Proporção:** a câmera precisa saber o novo formato (`aspect`), e depois recalcular a matriz.
  Esquecer essa linha é o jeito mais comum de ver o mundo esticado.

A função roda uma vez ao iniciar e a cada evento `resize`.

---

## 5. Falhar com educação

```js
if (typeof THREE === "undefined") { mostrarAviso("..."); return; }
try { renderizador = new THREE.WebGLRenderer(); } catch (erro) { mostrarAviso("..."); return; }
```

Dois jeitos de o 3D não funcionar, e os dois viram **uma frase em português**, não uma tela preta:

- **Sem internet:** o CDN não responde, a ponte falha e `THREE` nunca existe. `typeof` é a única
  forma segura de perguntar por uma variável que talvez não exista (sem ele, daria erro).
- **Sem WebGL:** navegador muito antigo ou aceleração desligada. O construtor lança uma exceção,
  e o `try/catch` a captura, como você fez com o `localStorage` no módulo `tutorial`.

O aviso é um `<p role="alert">`, que leitores de tela anunciam na hora.

---

## Experimente

1. Troque `MeshNormalMaterial` por `MeshBasicMaterial({ color: 0xff8a4d })`. A caixa vira uma
   silhueta laranja, sem relevo: sem luz, sem sombreado.
2. Mude `CAMPO_DE_VISAO` para 30 e depois para 110. Qual parece uma lente de longe e qual parece
   um "olho de peixe"?
3. Mova a câmera: `camera.position.set(0, 4, 5)`. A caixa foi para baixo da tela. Por quê? (A
   câmera ainda olha em frente; falta `camera.lookAt(0, 0, 0)`.)
4. Mude `caixa.rotation.y` para `rotation.x`, e depois some as duas.
5. Apague a linha `camera.updateProjectionMatrix()` e redimensione a janela.
6. Troque `Math.min(devicePixelRatio, 2)` por `1`: a imagem fica serrilhada em tela de alta
   densidade. E por 3, o que acontece com a velocidade?
7. Corte a internet (modo avião) e recarregue; depois, no `index.html`, estrague a versão do
   endereço (`three@0.0.1`) e veja o mesmo aviso.

---

**Anterior:** [`faroleiro_gdd.md`](../faroleiro_gdd.md) · **Próximo:** [`02-ilha`](../02-ilha/) — uma caixa solitária ganha luz, mar e uma barca de verdade.
