# Proa Acesa — Passo 7: A tempestade

**Mudou:** as noites viram **dados**: `fichas` em `regras.js`, uma por noite (duração, barcos, recifes, névoa, vento,
relâmpagos, meta), e `comecarNoite` monta o mundo a partir dela. Chegam a **chuva** (um `InstancedMesh`), o
**relâmpago** (um evento com hora marcada), a opção **reduzir clarões**, o **calor da lanterna** com dois focos e o
**amanhecer**. O HUD ganha relógio, calor e mensagens. O mar passa a ter 130 m (a borda some na névoa).
**Rode:** abra o `index.html`. **A/D**, **S**, **Q/E** e **↑/↓** como antes; **Espaço**, clique do mouse ou o botão
**Foco** trocam o foco; o botão **Clarões** liga "reduzir clarões". **H** mostra os draw calls; **C** troca o jeito
de desenhar a chuva; **R** recomeça a noite.

---

## O que você vê

Cinco noites, uma depois da outra: leve os barcos ao anel do porto antes do amanhecer. A névoa engrossa, o vento
empurra todo mundo de lado e, a partir da noite 2, **relâmpagos** acendem o mar por um instante e mostram **todos**
os recifes. Chove sempre. A lanterna tem dois focos: o **estreito** alcança longe mas esquenta; o **largo** cobre
mais, alcança menos e esfria. Esquentou demais, ela **apaga por 4 s** ("LANTERNA ESFRIANDO"). Nos últimos 15 s
o céu clareia, a névoa some e o alcance cresce. Acabou a noite com a meta cumprida? A próxima começa em 4 s.

---

## 1. A noite é uma ficha

```js
{ nome: "Garoa", duracao: 150, barcos: 3, recifes: 12, colunas: 2, nevoa: 0.3, deriva: 0.3, relampagosPorMinuto: 2, meta: 2 }
```

| Noite | Duração | Barcos | Recifes (colunas) | Névoa | Estreito / largo | Deriva | Relâmp./min | Meta |
|---|---|---|---|---|---|---|---|---|
| 1 Calmaria | 120 s | 2 | 8 (0) | 0,15 | 42,6 / 22,2 m | 0 | 0 | 2 |
| 2 Garoa | 150 s | 3 | 12 (2) | 0,30 | 39,1 / 20,4 m | 0,3 m/s | 2 | 2 |
| 3 Ventania | 150 s | 4 | 16 (3) | 0,45 | 35,7 / 18,6 m | 0,6 m/s | 4 | 3 |
| 4 Cerração | 180 s | 4 | 20 (4) | 0,60 | 32,2 / 16,8 m | 0,9 m/s | 6 | 3 |
| 5 Tormenta | 180 s | 5 | 24 (5) | 0,75 | 28,8 / 15,0 m | 1,2 m/s | 8 | 4 |

É a **curva como tabela** do `tetris/08-velocidade` (lá, os intervalos de queda por nível). Uma tabela dá para
**afinar**: achou a noite 4 injusta? Mude um número. O alcance não está na ficha: sai da fórmula do GDD §4.2,
`alcance = base × (1 − 0,5 × névoa)` (base 46 m no estreito e 24 m no largo), a mesma névoa que engrossa o
`FogExp2` da cena (`densidade = 0,02 × (1 + névoa)`). O desenho e a regra concordam porque lêem o mesmo número.

`comecarNoite(indice)` esvazia as listas (as malhas dos barcos saem pela lista `barcosRemovidos`), copia os
recifes das listas `RECIFES_BAIXOS` e `COLUNAS` (a noite N usa os primeiros `recifes − colunas` baixos e as
primeiras `colunas` altas), põe a barca na `PARTIDA`, zera o calor e cria o comboio. Ela sobe `noite.geracao`: o
`script.js` compara com `noiteDesenhada` e **refaz o desenho dos recifes**. A regra manda, o desenho obedece.
As posições dos recifes saíram de um gerador com semente e de uma **busca em largura** que conferiu: em **todas**
as noites há caminho da partida ao porto, com folga para o comboio. (O `final` fará isso a cada partida.)

O fim da noite também é regra: acabou o tempo ou a fila esvaziou? `noite.salvos >= meta` vence e avança;
senão a **mesma** noite se repete; 3 naufrágios recomeçam da noite 1 (GDD §4.7). Por 4 s o mundo congela e a
mensagem diz o resultado.

---

## 2. O relâmpago é um evento com hora marcada

```js
for (let hora = intervalo / 2; hora <= ficha.duracao - SEGUNDOS_DA_AURORA; hora += intervalo) { horas.push(hora); }
```

`roteiroDeRelampagos` gera a lista de horas (na noite 2: 15, 45, 75, 105 e 135 s). É o **roteiro** do
`shoot-em-up/07-roteiro`: eventos numa lista ordenada e um índice (`proximoRelampago`) que só avança, então o
jogo olha **um** número por quadro, não a lista inteira. Quando a hora chega, `noite.segundosDoRelampago` sai de
−1 e conta; passada a duração, volta a −1.

Enquanto o clarão dura, `atualizarBrasas` põe **brasa cheia em todos os recifes**, sem iluminá-los: eles
aparecem como lembrança, e a lembrança esfria em 3 s. O clarão é informação, não só efeito.

---

## 3. Reduzir clarões (acessibilidade)

Luz que pisca pode causar crises em quem tem fotossensibilidade (WCAG 2.3.1: no máximo 3 clarões por segundo,
e o padrão já fica bem abaixo: no máximo 8 por minuto). Mesmo assim, o **salto** de brilho de um quadro para
outro é o que machuca. `brilhoDoRelampago()` devolve o brilho (0 a 1) em cada instante:

| Modo | Curva | Salto máximo entre dois quadros de 16,7 ms |
|---|---|---|
| normal | degrau: 1 por 0,25 s, depois 0 | 0,75 (o fundo muda de cor de uma vez) |
| **reduzir clarões** | rampa suave (3t² − 2t³): sobe em 0,6 s até 25%, desce em 0,6 s | 0,008 |

A opção liga por três caminhos, e todos chegam à mesma variável (`reduzirClaroes`): o botão **Clarões** (toque,
mouse, **Tab + Enter/Espaço**), e, ao abrir, o `prefers-reduced-motion` do sistema. O botão é um `<button>`
comum, com `aria-pressed` e um ✓ no texto quando ligado: o estado nunca é só cor. A lanterna que **esfria** também
não pisca: só muda a mensagem e o medidor.

---

## 4. A chuva instanciada e os draw calls

```js
const instanciada = new THREE.InstancedMesh(geometria, material, GOTAS);   // 2.000 gotas, UMA chamada de desenho
instanciada.setMatrixAt(i, rascunho.matriz.makeTranslation(x, y, z));
instanciada.instanceMatrix.needsUpdate = true;
```

Cada gota é a **mesma** geometria e o **mesmo** material, só a posição muda. A tecla **C** alterna os três jeitos de
desenhar e **H** mostra `renderer.info.render.calls`. Medido neste passo, noite 1, tela de 400 × 200 no Chrome
headless (sem GPU, então os milissegundos não valem; **os draw calls valem**):

| Chuva | Draw calls | Triângulos |
|---|---|---|
| nenhuma | 42 | 9.646 |
| `InstancedMesh` (2.000 gotas) | 43 | 33.606 |
| 2.000 `Mesh` avulsas | 2.042 | 33.606 |

É a conclusão do spike do GDD §9 (35 contra 2.034): **a instância vale 2.000 draw calls**, com os mesmos
triângulos. (As malhas avulsas desligam o corte pelo campo de visão para contar todas, como o spike; com o corte
ligado seriam ~1.300 na tela.) A lista de gotas é **reciclada**, como a do `dealer-out/03-chuva`: a gota que
passa do chão volta ao topo, e a caixa de 50 × 16 × 50 m anda junto com a barca. A lista nunca cresce. E o
`InstancedMesh` precisa de `frustumCulled = false`: a esfera de corte dele é a de **uma** gota, na origem.

---

## 5. O calor e os dois focos

| Foco | Meio-ângulo | Alcance-base | Calor |
|---|---|---|---|
| estreito | 7° | 46 m | **+0,12 por segundo** |
| largo | 16° | 24 m | **−0,06 por segundo** |

Calor 1 (100%) é **sobrecarga**: a lanterna apaga por 4 s e volta com calor 0,4. Apagada, ela não ilumina
nenhum recife (só valem as lembranças e os relâmpagos), o cone e o `SpotLight` somem e a mensagem conta "LANTERNA
ESFRIANDO 3 s". Encalhada, o estreito esquenta o **dobro**. O GDD também diz "parado nos dois: −0,02 por
segundo"; li "parado" como **encalhada** (a única vez em que a barca fica parada de verdade), e nela os dois
focos esfriam 0,02 a mais. O medidor tem **número (%)**, uma barra (`<meter>`) e o nome do foco.

O cone desenhado nasce com 1 m de comprimento e 1 m de raio, e `ajustarFeixe` o **estica** (`cone.scale`) para o
foco e o alcance de cada quadro: sem geometria nova por quadro, e o desenho é sempre o leque da regra (passo 6).

---

## 6. Amanhecer, vento e o que não é o jogo

Nos últimos 15 s, `noite.aurora` vai de 0 a 1. `aplicarCeu` mistura o fundo da noite com a cor da manhã, a névoa
(`noite.nevoa = ficha.nevoa × (1 − aurora)`) some e o alcance da lanterna cresce, porque a regra lê a mesma
névoa. O **vento** é `derivar(coisa, tempo)`: soma `ficha.deriva × tempo` ao `x` da barca e dos barcos. Barca
**encalhada não deriva**: sem essa guarda, o vento a empurraria para dentro do recife a cada quadro, e o
encalhe nunca acabaria.

**Limitação deste passo, de propósito.** Cada noite refaz os recifes, e o grupo velho só **sai da cena**:
as geometrias e os materiais continuam na GPU. Meça: ligue **H** (todos os recifes passam a ser desenhados), aperte
**R** vinte vezes e leia `renderizador.info.memory.geometries` no console: **28 → 309**. O passo 8 mede isso na
tela e conserta com `dispose()`.

---

## Experimente

1. Ponha `relampagosPorMinuto: 200` na noite 5 (3,3 clarões por segundo, acima do limite de 3 do WCAG). Jogue
   com e sem **Clarões**: o que muda no que se vê? E nos recifes que aparecem?
2. Aperte **C** duas vezes e olhe os draw calls (**H**). Depois mude `GOTAS` para 500: os draw calls das
   malhas avulsas acompanham? E os da chuva instanciada?
3. Troque `calorPorSegundo` do estreito para 0,3. Em quantos segundos a lanterna apaga? E se o foco largo
   esfriasse 0,3?
4. Faça a noite 1 durar 20 s. O que o relógio e o céu fazem, já que a aurora ocupa 15 s dela?
5. Ponha `deriva: 3` na noite 1 e tente chegar ao porto. Por que a barca precisa de proa torta para andar reto?
6. Mude a ordem de `RECIFES_BAIXOS`. A noite 1 ainda tem caminho até o porto? (A busca em largura que confere isso
   fica fora do jogo: no `final` ela roda a cada partida.)
7. Aperte **R** vinte vezes com **H** ligado e anote a memória. Qual linha de `construirRecifes` falta?

---

**Anterior:** [`06-iluminar`](../06-iluminar/) · **Próximo:** [`08-depuracao`](../08-depuracao/) — o invisível aparece (H), o `OrbitControls` gira a câmera e o `dispose()` fecha o vazamento.
