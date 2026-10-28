# Proa Acesa — Passo 8: A depuração

**Mudou:** o `index.html` traz o **`OrbitControls`** pela import map; a tecla **H** passa a mostrar o **invisível**
(o leque da regra, os discos de colisão, o círculo da ilha, o alvo de cada barco) e as **medidas** (draw calls,
tempo, memória da GPU); e, ao recomeçar a noite, os recifes velhos recebem **`dispose()`**: a memória deixa
de crescer. O jogo em si é o do passo 7, com a **busca em largura** que confere as noites (`haCaminhoAtePorto`).
**Rode:** abra o `index.html` e aperte **H**. Arraste para girar a câmera em volta da barca, role a roda para
aproximar. **R** recomeça a noite; **C** troca a chuva; **H** de novo volta ao jogo.

---

## O que você vê

Com **H** ligado a câmera deixa de ser a do jogo e passa a ser sua: o `OrbitControls` gira em torno da barca e a
carrega junto, então ela segue a barca onde ela for (sem a conta que enquadra o comboio, que volta quando H desliga). O mar se enche de **anéis laranja**: um por
recife, com o raio de onde o barco bate (raio do recife + 1,2 m), até nos recifes que a lanterna esqueceu. À frente
da barca aparece o **leque** da regra, laranja e translúcido, do tamanho do foco de agora. Uma **linha branca** liga cada
barco ao seu alvo (o primeiro à barca, os outros ao da frente). O círculo da ilha aparece quando você gira até ela. Num canto,
o painel: draw calls, triângulos, milissegundos de JS e de desenho, e a memória da GPU.

---

## 1. O `OrbitControls` pela import map

O `OrbitControls` não vem no `three.js` "puro": é um **addon**, um arquivo a mais da biblioteca. A import map do passo
1 já tinha a linha `"three/addons/"`; agora o módulo inline do `index.html` o usa:

```html
<script type="module">
    import * as THREE from "three";
    import { OrbitControls } from "three/addons/controls/OrbitControls.js";
    window.THREE = THREE;
    window.OrbitControls = OrbitControls;
</script>
```

É a mesma **ponte** do `THREE`: o módulo importa e põe em `window`, e os scripts clássicos (que não podem usar
`import`) leem `OrbitControls` como uma global. Se a internet falhar, o módulo inteiro falha junto, `THREE`
fica indefinido e o aviso de sempre aparece.

```js
controles = new OrbitControls(camera, renderizador.domElement);
controles.enabled = false;        // só com H: no jogo, a câmera é do jogo
```

Com **H**, `controles.enabled` liga e o `script.js` deixa de chamar `seguirComACamera`. Há dois cuidados. O
`OrbitControls` gira a câmera em torno de um `target`, que não anda sozinho: `orbitarEmVoltaDaBarca` soma à
câmera o quanto a barca andou, move o `target` junto e chama `controles.update()`. E o arrastar do mouse e do dedo
passa a ser dele: `aoMirarComPonteiro` sai logo que `depurando` é verdadeiro, senão arrastar giraria a câmera **e**
mudaria a mira, e o clique do mouse ainda trocaria o foco.

---

## 2. H mostra o invisível

| O que é | Onde mora a verdade | O que se desenha |
|---|---|---|
| leque da lanterna | `lanternaDaBarca` (meio-ângulo e alcance de agora), `proa + guinada` | setor `CircleGeometry` deitado no mar; um por foco, o do foco atual aparece |
| colisão dos recifes | `recife.raio + RAIO_DO_BARCO` | anel laranja, filho da pedra de cada recife |
| colisão da ilha | `ilha.raio + RAIO_DO_BARCO` | anel laranja na posição da ilha |
| alvos do comboio | `alvoDoBarco(barco)` | um `LineSegments`: 2 pontos por barco, `setDrawRange` com a fila de agora |

Quase tudo é **o desenho de um número que a regra já tem**: por isso `atualizarDepuracao` só **lê** `regras.js` e
copia para as malhas, como o resto do jogo. Se o anel não bate com o que acontece na tela, a regra e o desenho
discordam, e é um bug (foi assim que apareceu o da ilha, que era só desenhada). O leque nasce com raio 1 e é
**esticado** por `scale`, como o cone do passo 7; as geometrias dos desenhos são criadas **uma vez** (as linhas
têm espaço para 8 barcos).

---

## 3. `dispose()` e `renderer.info.memory`

No passo 7, cada noite refazia os recifes e o grupo velho só **saía da cena**. Tirar da cena não libera nada: a
geometria e o material continuam na GPU. A prova está em `renderizador.info.memory`, que conta o que o three.js
tem de **carregado**. Com **H** ligado (para todos os recifes serem desenhados), 20 reinícios com **R**:

| Passo | Geometrias antes | Geometrias depois de 20 reinícios |
|---|---|---|
| 7 (sem `dispose`) | 28 | **309** |
| 8 (com `descartar`) | 36 | **37** |

(Na noite 5, com 24 recifes: 319 → 519 no passo 7, 69 → 69 no 8. No 8 a partida tem mais geometrias porque os desenhos da
depuração contam; o +1 é um anel de espuma que acendeu naquele quadro, não um acúmulo.) A correção é uma função:

```js
function descartar(grupo) {
    cena.remove(grupo);
    grupo.traverse(function (objeto) {
        if (objeto.geometry) { objeto.geometry.dispose(); }
        if (objeto.material) { objeto.material.dispose(); }
    });
}
```

`traverse` visita o grupo e todos os descendentes. Só serve para o que **não é compartilhado**: as geometrias e os
materiais dos barcos de pesca (`partes`) são usados por todos, então ficam. Só aparece no contador o que **já foi
desenhado** (com H desligado, os recifes esquecidos nem sobem para a GPU, e o vazamento é lento): é por isso que a
medida pede H ligado. É o mesmo tipo de vazamento da lista de tiros do `shoot-em-up/03-tiros` que ninguém esvazia,
só que na GPU em vez de na memória do JavaScript.

---

## 4. A busca em largura: toda noite tem caminho?

Os recifes das cinco noites são **fixos** (duas listas, sem sorteio). Para provar que nenhuma noite é impossível,
`haCaminhoAtePorto` faz uma **busca em largura** (a do `pacman/06-modos`) numa grade de 4 m sobre o mundo:

```js
const fila = [largada], vistas = new Set([largada[1] * lado + largada[0]]);
for (let i = 0; i < fila.length; i++) {          // a fila CRESCE enquanto é lida: vizinhos entram no fim
    if (distanciaEntre(centroDa(fila[i][0], fila[i][1]), porto) < porto.raio) { return true; }
    ...                                           // cada vizinho livre e ainda não visto entra na fila
}
return false;
```

Ela parte da célula da `PARTIDA`, anda para cima, baixo, esquerda e direita e só pisa em célula a mais de
`FOLGA_DO_CAMINHO` (6 m) de qualquer recife ou da ilha, contando o raio do barco: é a folga para o comboio passar.
Chegou a uma célula dentro do porto? `true`. A fila esvaziou sem chegar? `false`. Ela confere a noite **montada
agora**; para as cinco: `fichas.every(function (f, i) { comecarNoite(i); return haCaminhoAtePorto(); })`, que dá
`true`. O mesmo `PARTIDA` é o lugar seguro onde o comboio nasce quando a barca está cercada (`criarComboio`). O
jogo não chama a busca: ela é uma **prova**, e o `final` a rodará a cada partida, depois de sortear os recifes.

---

## 5. Medidas que o jogo oferece

O painel mostra o que o jogo lê de graça. Para uma página de **medição no celular**, estes nomes existem como
globais: `ultimoTempoDeQuadro` (milissegundos de JS: atualizar + mandar desenhar), `ultimoTempoDeAtualizacao`,
`ultimoTempoDeDesenho` e `renderizador.info` (`render.calls`, `render.triangles`, `memory.geometries`,
`memory.textures`). Cuidado com a leitura: o tempo de desenho é o da CPU mandando comandos; a GPU termina depois, e
só um aparelho de verdade diz quanto custa (no Chrome headless da máquina de desenvolvimento, nenhum número de
tempo vale, só as **contagens**).

---

## Experimente

1. Com **H** ligado, mude o foco (**Espaço**). O leque acompanha? Compare o que ele cobre com o que a lanterna
   realmente ilumina: algum recife dentro do leque fica escuro? (Dica: colunas.)
2. Tire a linha `controles.enabled = false` de `montarCena` e abra o jogo. O que acontece com a câmera
   ao arrastar o mouse **sem** H?
3. Em `descartar`, comente `objeto.material.dispose()`. A contagem de **geometrias** muda? E a de
   **texturas**? O que é `renderizador.info.programs`?
4. Troque `descartar(grupoDeRecifes)` por `cena.remove(grupoDeRecifes)` (o passo 7) e meça com **R** e **H**.
5. Faça `descartar` também descartar as geometrias de `partes` ao fim de cada noite. O que acontece com os
   barcos da noite seguinte? (O three.js sobe de novo o que você descartou, se ainda for usado.)
6. Aperte **H**, gire a câmera para ver a **ilha** e empurre a barca para dentro do anel dela. Quem bate primeiro:
   o anel ou o casco? Mude `RAIO_DO_BARCO` e veja os anéis crescerem.
7. Acrescente à depuração o círculo do **porto** (raio 9 m). Quais linhas de `criarDepuracao` você copia?
8. Ponha um recife grande no meio do corredor da noite 1 e rode `haCaminhoAtePorto()` no console. Quando ela passa a
   dizer `false`? Mude `FOLGA_DO_CAMINHO` para 2 e veja o que muda (e se o comboio caberia mesmo assim).

---

**Anterior:** [`07-tempestade`](../07-tempestade/) · **Próximo:** `final` — o jogo completo: semente e busca em largura, menu, pausa, som, recorde, toque.
