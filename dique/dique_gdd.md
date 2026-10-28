# DIQUE — Documento de design (GDD)

> **Rascunho aguardando aprovação do usuário (TODO IS-A).** O conceito e o nome já foram escolhidos por ele
> em 2026-10-27 (IS-C, HANDOFF §3.6). Nenhum código nem pasta de passo existe ainda.

Módulo 9 do curso: o jogo **2.5D isométrico**. Fica entre *Reflexo* (raycaster) e *Proa Acesa* (three.js),
e é a ponte de câmera: aqui a projeção é uma **matriz 2×2** escrita à mão, e o toque na tela vira, com alturas,
um **raio que desce pelas colunas do mapa**. A ordem do curso é `tutorial → jogo-da-cobrinha → pong → tetris →
shoot-em-up → pacman → xadrez → xenomorph → reflexo → dique → proa-acesa`.

## 1. Conceito

Uma vila de pescadores vive em terraços numa ilha. A **maré** sobe e desce segundo uma **tábua de marés**.
Entre uma maré e outra você tem poucos **blocos de terra**: ergue diques e abre valas. Quando a maré chega, a
água invade a ilha **por busca em largura, por altura**: entra em toda casa mais baixa que o nível que a água
alcança a partir do mar. Você assiste passo a passo e conta as casas salvas.

**A tensão central: terra não se cria, só se muda de lugar.** Cada bloco de dique sai de uma vala em outro
ponto, e a vala é o lugar mais baixo, aquele para onde a água corre primeiro. Toda jogada é a pergunta
"de onde tiro a terra e onde a água vai parar?".

- **Fim do dia:** a tábua acabou. Salvou casas suficientes (a meta do dia), o dia passa.
- **Fim do jogo:** não há vidas. Dia perdido se repete; estrelas medem a folga (seção 4.8).
- **Técnica:** projeção isométrica por matriz, picking com alturas, ordem do pintor, enchente por altura.

## 2. Pilares

1. **Altura é a regra.** Ela decide onde o dedo acerta e por onde a água passa. Nada decorativo.
2. **Pensar antes, assistir depois.** Por turnos, sem relógio: moldar é calmo; a maré é um filme curto que
   se pode rever.
3. **O invisível aparece.** A tecla **H** (e o botão "Ver") mostra o raio do toque, as alturas em número, o
   alcance da água e as casas escondidas atrás de um dique.
4. **A matemática é o jogo.** Matriz, inversa, raio, ordem de desenho: cada ideia entra num passo e já se joga.
5. **Confortável.** Água sem relâmpago, movimento opcional, sem pressa nem derrota súbita.

## 3. Controles (teclado, mouse e toque)

Todos viram as mesmas **intenções**: `moverCursor(dx, dy)`, `aplicar()`, `escolherFerramenta(f)`,
`girarVista(+1|-1)`, `rolar(dx, dy)`, `aproximar(+1|-1)`, `desfazer()`, `liberarMare()`, `alternarVer()`,
`pausar()`. Mouse e toque usam Pointer Events, um só caminho.

| Intenção | Teclado | Mouse | Toque (390×750, vertical) |
|---|---|---|---|
| Escolher o bloco | setas (relativas à tela, valem em qualquer giro) | clicar | **tocar o bloco** |
| Aplicar a ferramenta | Enter ou Espaço | clicar de novo no bloco já marcado | botão "Aplicar" (ou 2º toque) |
| Ferramenta Erguer / Cavar | 1 / 2 | botões | botões grandes |
| Girar a vista 90° | Q ⟲ e R ⟳ | botões | botões ⟲ ⟳ |
| Rolar | W A S D | arrastar com o botão pressionado | **arrastar um dedo** |
| Aproximar / afastar | + e − | roda do mouse | botão "Perto/Longe" |
| Desfazer | Z | botão | botão "Desfazer" |
| Liberar a maré | M | botão | botão "Maré" |
| Ver o invisível | H | botão | botão "Ver" |
| Pausa | P ou Esc | botão | botão "II" |

**Tocar um bloco com altura** é o assunto do passo 03: o dedo cai num ponto da tela, e o jogo descobre qual
bloco está ali, topo ou lateral, olhando as colunas de frente para trás (seção 4.3).

**Esquema de toque** (esboço, **não medido em aparelho**), 390×750 sem rolar a página:
- topo: HUD de 56 px (dia, blocos, casas); depois o mapa em canvas de 390×420; depois a **tábua de marés**
  (faixa de fichas, 64 px); embaixo duas fileiras de botões de 48×48 ou maiores.
- Ilhas de até 10×10 com bloco de 36 px de largura cabem em 360 px: tudo visível no zoom "Longe".
  Em "Perto" o bloco tem 72 px e a ilha rola.
- **Toque × rolagem:** um arrasto maior que 8 px rola o mapa; menor que isso é toque e escolhe o bloco.
  O primeiro toque marca e mostra o efeito prévio (a vala e o dique em tracejado); o segundo no mesmo bloco aplica.
  `touch-action: none` no canvas; o `pointerId` do dedo que rola é guardado.
- **Alvo ≥ 48 px:** no zoom "Longe" o losango do bloco tem só 36×18 px. Por isso o toque *marca* e há um cursor
  movido pelos botões de seta (48 px) para acertar blocos vizinhos; o zoom "Perto" é o caminho de precisão.
- Rotação do aparelho: no modo horizontal os botões vão para uma coluna ao lado.

**Riscos do toque:** rolagem, zoom e "puxar para atualizar" do navegador disputam o arrasto; Pointer Events
não foram testados em iOS Safari; um losango de 36×18 pode ser pequeno para dedos grandes (por isso o 2º toque
e o cursor).

## 4. Mecânicas

### 4.1 Terreno e mundo
Cada ilha é um **mapa em texto** (eco de `pacman/01-labirinto`) em duas camadas: alturas e objetos.
Altura é um dígito `0`–`4` (blocos empilhados); `~` é mar (altura 0, fonte da água); `N` é nascente
(só conta na chuva); `C` é casa (sobre a altura da casa); `P` é cais. Ilhas de 8×8 a 10×10.
A borda de fora é sempre mar em pelo menos um lado (validado).

### 4.2 Mundo → tela: uma matriz 2×2
Com bloco de largura `L` na tela, o ponto de chão `(x, y)` e a altura `z` caem em
`(sx, sy) = M · (x, y) + (0, −z·A)`, onde `M = [[L/2, −L/2], [L/4, L/4]]` (losango 2:1) e `A` é a altura de
um degrau. **É exatamente a conta que o three.js faz com uma câmera ortográfica**, só que lá a matriz é 4×4.
O determinante é `L²/4`, nunca zero, por isso existe a **inversa** `M⁻¹`: tela → chão.
**Girar a vista em 90°** é uma troca antes da matriz: `(x, y) → (N−1−y, x)` (eco do giro de peça em
`tetris/05-rotacao`), repetida `r` vezes; `r` vai de 0 a 3.

### 4.3 Picking com alturas: um raio que desce pelas colunas
A inversa responde "que ponto do chão está sob o dedo?" só se tudo tivesse altura 0. Com alturas, o
mesmo pixel pode ser o topo de um bloco alto, a lateral de outro, ou o chão lá atrás. O raio do dedo
corta os blocos de **frente para trás**: o jogo testa, coluna por coluna ao longo do raio (o DDA de
`reflexo/03-um-raio`, agora em diagonal), se o ponto cai no **topo** ou na **lateral** do bloco, e fica com o
primeiro. É o que o `THREE.Raycaster` do Proa Acesa automatiza. A página de teste compara com uma
**referência de força bruta**: testar o polígono de todos os blocos, do mais próximo ao mais longe.

### 4.4 Ordem de desenho: o algoritmo do pintor
Sem z-buffer (o do `reflexo/06-objetos` era por coluna): desenha-se **de trás para a frente**, ordenando por
`(x' + y')` já girado e, no empate, por altura. Cada bloco vira topo e duas laterais (polígonos).
Vale enquanto os blocos são caixas inteiras da grade; sprites (casa, barco) entram na ordem do bloco onde
estão. **A água é uma camada translúcida na mesma ordem**: a superfície do nível `T` sobre cada bloco
alagado é desenhada logo depois do bloco, para um dique à frente cobrir a água de trás e a água da frente
deixar ver o dique atrás. Limite honesto: o pintor erra com peças que cruzam várias casas; o jogo não as tem.

### 4.5 A maré: uma máquina de estados e uma tábua
Duas máquinas, ambas por turnos:
- **Dia:** `ler → moldar → mare → contar → (proximo ler | fim)`.
- **Maré:** `vazante → baixa → enchente → preamar → vazante`.

A **tábua** é uma lista de fichas (dados, eco de `tetris/08-velocidade`): 
`{ nivel, passos, volume, chuva, blocos }`: o `nivel` que a água alcança (em degraus de altura), por quantos
`passos` ela avança, o `volume` de água por passo, se há `chuva`, e quantos `blocos` você recebe antes da
maré. O jogador **lê a tábua inteira** antes de moldar: nada de surpresa.

### 4.6 A enchente: busca em largura por altura
A cada passo a água expande a partir do mar. Um bloco alaga se (a) é vizinho (4 direções) de um bloco já
alagado e (b) sua altura é **menor que o nível** `nivel`. Casas e cais seguem a altura do terreno.
Sem volume, é a busca em largura do Pac-Man (`pacman/06-modos`) com um filtro de altura. Com volume, a
fronteira é consumida **da mais baixa para a mais alta** (empate: menor distância, depois índice), um
bloco por unidade de `volume`: a água enche a vala antes de subir o terraço. Por isso a vala atrai a água
e protege o que está atrás. A casa cujo bloco alagou está **perdida**; a que não, **salva**.
Chuva: as nascentes `N` viram fontes extras com nível 1 e o `volume` da ficha sobe.
A água só avança; a vazante (a descida) existe para a tábua e para desenhar, não para devolver casas.

### 4.7 Moldar: Erguer e Cavar
- **Erguer** +1 de altura num bloco (máx. 4) gasta 1 bloco do estoque.
- **Cavar** −1 (mín. 0) devolve 1 bloco ao estoque. Não se cava sob casa nem em mar.
- O estoque começa com o `blocos` da ficha, e **sobra de uma maré vale na seguinte**.
- Estado **imutável**: cada jogada gera um terreno novo (eco de `xadrez/05-xeque` e `reflexo/07-espelhos`);
  desfazer é voltar um terreno. A maré liberada **não** pode ser desfeita; reiniciar o dia volta à cópia original.

### 4.8 Casas, pontos, estrelas
A casa tem texto de estado (ver seção 7): salva ou perdida. Pontos: 100 por casa salva, 10 por bloco que
sobrou, 50 se a meta for batida com o `par` da fase. **Estrelas:** 1 = meta do dia; 2 = todas as casas; 3 = todas
as casas com no máximo o `par` de jogadas. Recorde por dia em `localStorage`, lido com `try/catch` e
saneado campo a campo.

## 5. Progressão

Os dias são **dados**: `{ mapa: [...], tabua: [ficha...], meta, par, dica }`. Três eixos, um de cada vez:
1. mais casas e mais terraços (a leitura de altura fica difícil);
2. tábuas com várias marés e **sizígia** (nível +1, mais volume);
3. **chuva** com nascentes, e dias em que cavar o certo exige girar a vista (o dique alto esconde a casa de trás).

~10 dias: 1–2 ensinam erguer; 3–4, cavar; 5–6, duas marés; 7–8, sizígia; 9–10, chuva e tudo junto.

**Solubilidade validada por busca** (eco de `xenomorph/06-semente`, "tentou todas as combinações").
Um **robô** testa jogadas antes da maré: o conjunto de ações é `{erguer(b), cavar(b)}` por bloco candidato,
e a ordem não importa (basta o multiconjunto, não a sequência). Para cada ficha da tábua, em ordem:
1. gera os terrenos alcançáveis com até `blocos` ações (busca em profundidade com aprofundamento
   iterativo, e **memória** de terrenos já vistos, para não repetir);
2. para cada um, simula a maré inteira (4.6) e guarda os que ainda salvam a meta;
3. segue para a ficha seguinte só a partir deles (a sobra de blocos entra no estado).

Candidatos podados: só blocos a até 2 de distância de um bloco alagável ou de uma casa (os outros não
mudam o resultado). O robô tem **teto de 2 milhões de estados**: passou do teto, o dia **não é certificado**
e a validação falha. Um dia só entra se: (a) tem solução; (b) o `par` do dado é o menor achado pelo robô
(ordem crescente de ações); (c) **não** é trivial (com zero jogadas, a meta não é batida); (d) mapa fechado,
casas fora do mar, `N` só em dias com chuva. Ele roda como **página de teste do harness**, não no jogo.

## 6. Arte

- **Terreno:** polígonos planos (topo losango, duas laterais mais escuras), porque o losango *é* a
  lição de matriz. Paleta por altura: 0 areia `#d9c27a`, 1 relva `#7fb069`, 2 relva escura `#4f8a4c`,
  3 rocha `#8d8d8d`, 4 neve de pedra `#d0d4d8`; lateral 30% mais escura (calculada uma vez).
- **Sprites em texto 12×12** (estilo do curso, caractere → cor): casa (telhado vermelho), casa alagada
  (telhado com ondas), barco, bandeirola da meta. **Sprites em texto até o `final`**; no `final` seguem texto.
- **Água:** superfície azul `#2a6fdb` com alfa 0,55 mais uma **linha branca na borda** do bloco alagado
  (forma, não só cor). Ondas: deslocamento suave do alfa; desligado com movimento reduzido.
- **Legibilidade em 390×750:** contorno fino de 1 px em todo bloco, números de altura no modo Ver,
  cursor em amarelo com borda dupla, texto do HUD ≥ 16 px.
- **Som sintetizado (Web Audio):** tom do bloco que sobe/desce, marola crescente da maré, "plop" da vala,
  acorde de dia vencido, tom grave de casa perdida. Sempre com botão de silêncio.

## 7. Acessibilidade

- **Nunca só por cor:** casa salva = ícone de casa + **"✓ Salva"**; perdida = casa torta + **"✗ Alagada"**;
  a água tem **borda branca e padrão de ondas**, o terreno tem **número de altura** (modo Ver). HUD com
  texto: "Casas 4/6", "Blocos 2".
- **Reduzir movimento** (`prefers-reduced-motion` e opção): sem ondas animadas, sem rolagem suave, sem
  pulso no cursor; a maré pode ser mostrada **passo a passo por botão** (não há filme).
- **Teclado para tudo:** cursor, ferramentas, giro, zoom, rolagem, maré, desfazer, pausa. Foco visível;
  `aria-live` anuncia "Bloco 4,3 subiu para 2", "Maré: 3 casas alagadas", "Dia vencido". Um **resumo em texto** das alturas
  (lista) fica disponível ao leitor de tela.
- **Alvos ≥ 48 px** para botões; no mapa, a regra de 2 toques e o cursor (seção 3).
- Sem relâmpagos nem alternância rápida de brilho; contraste do HUD ≥ 4,5:1. Cabe em 390×750 sem rolar.

## 8. Arquitetura de arquivos

**Regra:** lógica separada do desenho, testável **sem canvas**.
- `regras.js` (puro, sem DOM, **desde o passo 01**): mapa, alturas, matriz, inversa, giro, picking, ordem,
  enchente, maré, jogadas imutáveis, validação. Funções e objetos literais; não conhece `canvas`.
- `script.js`: canvas, entrada, laço, HUD. Faz o desenho com o que `regras.js` devolve.
- Scripts clássicos `<script src defer>`, escopo global; **ordem importa**; **sem `import`/`export`, sem
  `class`**; abre por duplo clique. Cada passo é uma pasta autocontida (`index.html`, `style.css`,
  `regras.js`, `script.js`, `GUIA.md`) que **copia o anterior e acrescenta**.
- Só o `final` divide por assunto, porque é a lição de arquivos: `projecao.js` (matriz, inversa, picking,
  ordem), `regras.js` (terreno, maré, enchente), `fases.js` (dados dos dias), `desenho.js`, `entrada.js`,
  `audio.js`, `jogo.js`.
- Pastas dos passos: `01-grade`, `02-alturas`, `03-picking`, `04-camera`, `05-enchente`, `06-fichas`,
  `07-dias`, `08-celular`, `final`.

## 9. Orçamento de linhas

Contagem: **JS próprio** (sem `GUIA.md`, `index.html`, `style.css`, nem os mapas dos dias). Teto **duro**:
estourou, corta-se escopo, não o teto. Menor que o Reflexo (2.500).

| Passo | Teto de JS (acumulado) | Teto de CSS |
|---|---|---|
| 01-grade | 120 | 60 |
| 02-alturas | 240 | 70 |
| 03-picking | 380 | 80 |
| 04-camera | 540 | 90 |
| 05-enchente | 800 | 100 |
| 06-fichas | 1.000 | 110 |
| 07-dias | 1.250 | 120 |
| 08-celular | 1.350 | 130 |
| **final** | **2.000** (somando todos os arquivos) | 220 |

- `GUIA.md` ≤ **250** linhas por passo; o do `final` ≤ 450, com ~15 exercícios.
- Mapas e fichas dos ~10 dias à parte, ≤ 300 linhas de texto. Funções ≤ 40 linhas; arquivo do `final` ≤ 450.
- **Medir antes de otimizar:** o desenho inteiro redesenha ~100 blocos por quadro; o passo 08 mede ms/quadro,
  e só então se pensa em cache de camadas. Nada de otimização sem número.

## 10. Verificação (o que a página de cada passo prova)

Páginas em `verificacao/dique/NN-passo.html`, no harness existente (`verificacao/rodar.mjs`).

| Passo | A página afirma |
|---|---|
| 01 | **ida e volta**: mundo → tela → mundo devolve o ponto (erro < 1e-9) em 1.000 pontos, nos 4 giros; `det ≠ 0`; ilha 10×10 cabe em 390 px |
| 02 | **ordem do pintor**: para todo par de blocos cujos polígonos se sobrepõem na tela, o desenhado depois está mais perto (`x'+y'` maior ou, no empate, mais alto), nos 4 giros |
| 03 | **picking** com alturas bate com a força bruta (polígono a polígono) em todos os pixels de uma grade da tela, para 20 terrenos aleatórios com semente; bloco, e se topo ou lateral |
| 04 | rolar e aproximar não mudam o resultado do picking (mesmo bloco sob o mesmo ponto de mundo); 4 giros voltam ao início; limites da rolagem; sem rolagem da página em 390×750 |
| 05 | **enchente = preenchimento independente** (outra implementação: ponto fixo sobre a grade inteira), sem volume; com volume, ordem baixa → alta; monotonia (alagado nunca seca) |
| 06 | a **tábua é aplicada nos instantes certos** (nível, passos, volume e blocos conferidos passo a passo); a máquina de estados só faz transições válidas; estoque de blocos conserva |
| 07 | **cada dia é certificado**: tem solução, `par` = menor achado, não é trivial, mapa fechado; teto de estados respeitado; falha proposital é detectada |
| 08 | página de medição no celular (seção 12); acessibilidade: Tab/teclado alcançam tudo, `aria-live`, alvos ≥ 48 px em 360 e 390 |
| final | os de cima, mais jogo completo por script (um dia vencido por teclado), `localStorage` corrompido não quebra, movimento reduzido, sem erro de console, links |

## 11. Fora de escopo

Altura que não seja inteira; rampas, escadas e personagens que andam; blocos que cruzam várias casas
(quebraria o pintor); sprites em arquivo; sombras; física de fluidos de verdade; erosão; multijogador;
editor de dias; dias procedurais; relógio em tempo real; música composta; recursos e economia da vila.

## 12. Originalidade (obrigatória)

**Exigência do usuário:** jogo de gênero original, sem nome, fase ou arte de jogo existente.

### 12.1 Nome (Steam e itch.io, em 2026-10-27, HANDOFF §3.6)
- **Steam `Dique`:** nenhum jogo com esse título.
- **itch.io `Dique`:** nenhum título igual; só páginas "Arte no Dique", sem relação.
- Limite: só Steam (`storesearch`) e itch.io (`search`); não é exaustiva.

### 12.2 Vizinhos de mecânica (HANDOFF §3.6)
| Vizinho | Como o Dique difere |
|---|---|
| **Moonpull** (itch.io) | "você é a lua… um arrasto define a maré". Lá o jogador **escolhe o nível da água**. Aqui a maré é dada pela tábua e o jogador **molda o terreno**: o controle oposto. |
| **Dike Defender** (itch.io) | Plataforma 2D sobre adiar o rompimento de um dique. Aqui é quebra-cabeça por turnos em isométrico. |
| **Dike Keepers** (itch.io) | Ação contra ratos-almiscarados. Aqui não há inimigo nem ação. |
| **Timberborn** (Steam) | Colônia de castores com água e represas: outro gênero e outra escala. Aqui não há colônia nem economia. |

**Veredito:** terreno que contém água e terraços são tropos; o que pertence a este jogo é a combinação
**tábua dada + terra que só muda de lugar (cada dique sai de uma vala) + enchente por altura em isométrico**.
Nada encontrado combina as três.
**Guarda de projeto:** **nunca** deixar o jogador escolher ou mexer no nível da água (o centro do Moonpull);
a maré é dado. Tampouco acrescentar estoque, tempo real ou "defender" com recursos. Se isso mudar, rever
esta seção. Repetir a busca antes de publicar.

## 13. Perguntas em aberto (só as que dependem do usuário)

1. **Dois toques para aplicar** (marcar e confirmar) ou um só? Recomendo dois: o losango de 36 px é pequeno
   para o dedo. Custa um toque a mais.
2. **Medir num celular real** (N8): os 36 px e o ms/quadro do desenho são hipóteses até o passo 08.
3. **Teto de 2.000 linhas** no `final` está bem, ou prefere mais curto?

## 14. Mapa passo → seção

Pré-requisitos mínimos: **pacman, xadrez, reflexo** (tetris recomendado). "Reusa" cita módulo/passo.

| Passo | Conceito novo | Reusa | Seção |
|---|---|---|---|
| **01-grade** (IS1) | mapa em texto, projeção por matriz 2×2, inversa, ida e volta | `pacman/01-labirinto` (mapa em texto); `reflexo/01-planta` (vista de cima, planta) | 4.1, 4.2 |
| **02-alturas** (IS2) | alturas, topo e laterais, **ordem do pintor** (× z-buffer), água translúcida | `reflexo/06-objetos` (z-buffer, ordem por distância); `shoot-em-up/04-inimigos` (listas de objetos) | 4.4, 6 |
| **03-picking** (IS3) | toque com alturas: raio por colunas, topo × lateral, força bruta como referência | `reflexo/03-um-raio` (DDA); `tetris/04-controles` (entrada → intenção) | 3, 4.3 |
| **04-camera** (IS4) | rolagem, zoom, **girar a vista 90°**, dique que esconde a casa, H | `tetris/05-rotacao` (rotação 90° de grade); `jogo-da-cobrinha/05-teclado` | 3, 4.2, 4.4 |
| **05-enchente** (IS5) | a mecânica: erguer/cavar, BFS por altura, volume, casas salvas | `pacman/06-modos` (BFS); `pacman/04-fantasma` (campo de distância); `xadrez/05-xeque` (estado imutável) | 4.6, 4.7 |
| **06-fichas** (IS6) | máquina de estados (dia e maré), **tábua como fichas**, chuva, estoque entre marés | `pacman/06-modos` (estados); `tetris/08-velocidade` (curva como tabela); `shoot-em-up/07-roteiro` | 4.5, 4.8 |
| **07-dias** (IS7) | dias como dados, dificuldade por eixo, **validação por busca**, `par` | `xenomorph/06-semente` (validação); `reflexo/08-sombras` (BFS em jogo) | 5 |
| **08-celular** (IS8) | toque 2 passos, alvos ≥ 48 px, **página de medição no celular** (entra no N8), acessibilidade | `verificacao/medicao` (páginas de medição); `tetris/final` (toque); `reflexo/05-texturas` (medir ms/quadro) | 3, 7, 9, 10 |
| **final** (IS9) | menu, pausa, som, recorde, opções, **arquivos por assunto**, ~15 exercícios | `xadrez/final` (vários arquivos); `tetris/final` (toque, `localStorage`) | 7, 8, 9 |

**Tetos de JS acumulados:** IS1 120 · IS2 240 · IS3 380 · IS4 540 · IS5 800 · IS6 1.000 · IS7 1.250 · IS8 1.350 · IS9 2.000.
**Ponte para o Proa Acesa:** a água da vila vira o mar do módulo seguinte; o picking por colunas é o
`THREE.Raycaster` do passo `06-iluminar`; a matriz 2×2 é a câmera do `01-cena`.
