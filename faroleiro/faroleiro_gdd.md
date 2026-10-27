# FAROLEIRO — Game Design Document

> Rascunho para aprovação (TODO N6). Título de trabalho. Pasta e passos: `faroleiro/` (F1–F9 do `TODO.md`).
> **Atenção:** a checagem de originalidade (seção 11) achou um jogo com o mesmo laço central do conceito
> aprovado em `HANDOFF.md` §3.4. Este GDD já traz o conceito **revisado**; o antigo está na seção 11.

## 1. Conceito

Noite de tempestade. O farol da ilha apagou e um comboio de barcos de pesca está perdido no escuro, entre
recifes. Você é o **faroleiro**: sai numa barca com uma lanterna para levar o comboio até o porto, aos pés
do farol apagado.

A lanterna é o seu único olho. Os recifes só **aparecem enquanto o cone de luz está sobre eles**; fora dele,
ficam no escuro e viram uma lembrança que se apaga em 3 s. Os barcos de pesca não enxergam nada: só seguem
a barca. Eles fazem as curvas por dentro e **balançam a cauda** (como a cobrinha, mas no mar): quem vira
seco leva o comboio para cima dos recifes.

- **Gênero:** navegação e condução de comboio com visibilidade limitada, em 3D (câmera atrás da barca).
- **Plataforma:** navegador, desktop e celular em pé (390×750). Abre com duplo clique; **precisa de
  internet** só para baixar o three.js (única exceção do curso, ver `CLAUDE.md`).
- **Partida:** 5 noites de 2 a 3 minutos; recorde em `localStorage`.
- **Fim:** a noite acaba no amanhecer (vitória se chegaram barcos suficientes) ou com 3 naufrágios.

## 2. Pilares

1. **A luz é informação.** O que você não ilumina, você não sabe. Ver custa atenção, não só pontaria.
2. **Todo ganho tem custo.** Foco estreito alcança longe e esquenta; foco largo cobre mais e alcança pouco.
3. **O comboio tem corpo.** Curva larga, ou a cauda bate. É a mesma ideia da cobrinha, agora com inércia.
4. **A regra no plano, o desenho na GPU.** Toda a lógica vive no plano XZ, sem three.js, e roda no harness
   de `verificacao/` sem WebGL. O three.js só desenha.
5. **Mostrar o invisível.** A tecla **H** liga cones, raios, caminhos e distâncias (hábito do curso).

## 3. Controles

Teclado, mouse e toque viram as mesmas intenções: `leme` (-1..1), `miraRelativa` (rad), `foco`, `devagar`.

| Intenção | Teclado | Mouse | Toque (390×750) |
|---|---|---|---|
| Leme | A/D ou setas | — | botões ◀ ▶ no canto inferior esquerdo (64 px) |
| Mirar a lanterna | Q/E (gira) | mover o mouse sobre o mar | arrastar na metade de cima da tela |
| Foco estreito × largo | Espaço (alterna) | clique | botão **Foco** (64 px, canto inferior direito) |
| Devagar (2,5 m/s) | S (segurar) | botão direito (segurar) | botão **Devagar** (64 px, acima do Foco) |
| Pausa | Esc ou P | — | botão ❚❚ no topo |
| Depuração | H | — | botão **H** no menu de pausa |
| Som, reduzir clarões | M · menu | menu | menu |

- Sem arrastar, a lanterna **segue a proa** com atraso (aceleração angular com teto); arrastar assume a mira
  por 2 s e depois volta a seguir. A mira é limitada a ±75° da proa.
- O jogo pausa sozinho ao perder o foco da aba. Nenhuma tecla é obrigatória só com o mouse e vice-versa.

## 4. Mecânicas

Unidades: metros, y para cima, ângulos em radianos, sentido anti-horário visto de cima. Todo número abaixo
mora em `fichas.js` (no `final`) ou numa tabela no topo do `script.js` (passos).

### 4.1 Mundo lógico (plano XZ)
Barca, barcos, recifes e porto são círculos `{x, z, raio}` num mundo de 160×160 m. A altura (ondas, balanço) é
só desenho. Posição e proa dos barcos vêm de `{x, z, proa}`; as malhas apenas copiam esses valores.

### 4.2 Barca e lanterna
- Velocidade 5 m/s (devagar: 2,5). Giro máximo 1,4 rad/s, com aceleração angular de 4 rad/s².
- Grafo de cena: `barca → lanterna (guinada) → braço (arfagem) → { SpotLight, cone }`. A direção do feixe no
  mundo é a proa **mais** a guinada local: o passo F4 usa isso para ensinar transformação local × mundial.
- Foco **estreito**: meio-ângulo 7°, alcance-base 46 m. Foco **largo**: 16°, alcance-base 24 m.
- `alcance = alcanceBase × (1 − 0,5 × névoa)`; a névoa da cena (`FogExp2`) usa o mesmo número, então o que o
  jogador vê e o que a regra decide concordam.

### 4.3 Recife visto × recife lembrado
Para cada recife por quadro:
1. **Dentro do cone?** Produto escalar entre a direção do feixe e o vetor até o recife (mais o raio do recife):
   `dot > cos(meioAngulo)` e `distância ≤ alcance`.
2. **Oclusão.** `THREE.Raycaster` do bico da lanterna até o recife contra as **pedras altas** (colunas de 5 m).
   Recife atrás de coluna não é visto. É o eco do DDA do Reflexo: lá o raio andava célula a célula, aqui o
   three.js entrega o primeiro acerto.
3. Visto: `brasa = 3,0 s`. Cada quadro sem ver, `brasa -= dt`. Com `brasa > 0` o recife aparece (apagando).
O recife aparece com **forma e contorno** (anel de espuma + boia listrada), não só com cor mais clara.

### 4.4 Comboio (steering)
- Cada barco segue o da frente: **buscar** a posição dele e **chegar** (frear) a 7 m. Velocidade máx. 95% da
  barca, giro máx. 1,1 rad/s (menor que o da barca: é isso que faz a cauda balançar).
- Barco atrás de mais de 35 m "se perde na névoa" e conta como naufrágio.
- Barco que toca um recife (raio do barco 1,2 m) **naufraga**: afunda por 2,5 s e sai da fila; os de trás
  passam a seguir o da frente dele.
- A barca que toca um recife **encalha**: 2 s parada e o foco estreito esquenta ×2. Não conta naufrágio.

### 4.5 Calor da lanterna
- `calor` de 0 a 1. Estreito: +0,12/s. Largo: −0,06/s. Parado nos dois: −0,02/s.
- `calor = 1` → **sobrecarga**: lanterna apagada por 4 s, depois `calor = 0,4`. No escuro só vale a lembrança.
- Medidor com **número (%) e ícone**, não só barra colorida.

### 4.6 Tempestade
- **Névoa** `n` (0–1) por noite: encurta o alcance e escurece a cor de fundo.
- **Deriva**: vento empurra a barca e os barcos de lado (m/s, tabela abaixo).
- **Chuva**: 2.000 gotas instanciadas (`InstancedMesh`). Opção "chuva leve" usa 800.
- **Relâmpago**: por 0,25 s ilumina o mar e revela todos os recifes (`brasa` cheia). Com "reduzir clarões" vira
  uma subida suave de 0,6 s com no máximo 25% de brilho (seção 7).
- **Amanhecer**: nos últimos 15 s o céu e a névoa fazem `lerp` para a cor da manhã e o alcance cresce.

### 4.7 Vitória, derrota, pontos
- Porto: círculo de 9 m na boca da baía. Barco que entra **está salvo** e sai da fila.
- Vence a noite quem salva a **meta** de barcos antes do amanhecer. Derrota: 3 naufrágios no jogo todo
  (zeram ao vencer a noite 5, não entre noites).
- Pontos: 100 por barco salvo; +10 por segundo de sobra; −0 por encalhe. Sem multiplicador (MVP).

### 4.8 Noites como dados
| Noite | Duração (s) | Barcos | Recifes | Colunas | Névoa | Estreito / largo (m) | Deriva (m/s) | Relâmpagos/min | Meta |
|---|---|---|---|---|---|---|---|---|---|
| 1 Calmaria | 120 | 2 | 8 | 0 | 0,15 | 42 / 22 | 0 | 0 | 2 |
| 2 Garoa | 150 | 3 | 12 | 2 | 0,30 | 39 / 20 | 0,3 | 2 | 2 |
| 3 Ventania | 150 | 4 | 16 | 3 | 0,45 | 36 / 19 | 0,6 | 4 | 3 |
| 4 Cerração | 180 | 4 | 20 | 4 | 0,60 | 32 / 17 | 0,9 | 6 | 3 |
| 5 Tormenta | 180 | 5 | 24 | 5 | 0,75 | 29 / 15 | 1,2 | 8 | 4 |

Valores provisórios: a curva é conferida no passo 07 com um **robô** (jogador automático) que segue o
corredor seguro; se o robô não salva a meta, a noite está injusta.

### 4.9 Geração justa dos recifes
Posições vêm de uma semente por noite (PRNG de `xenomorph/06-semente`). Depois de gerar, uma **busca em
largura** numa grade de 4 m (`pacman/`) confere que existe um caminho da partida ao porto com folga de 6 m
para o comboio. Sem caminho, sorteia de novo. Nenhum recife nasce a menos de 12 m da partida.

## 5. Progressão
- Linear: 5 noites, uma tabela (4.8). Nada de loja nem upgrades no MVP.
- Cada noite introduz **uma** ideia: 1 só ver e conduzir; 2 as colunas (oclusão); 3 calor importa;
  4 a névoa obriga a escolher o foco; 5 relâmpago e deriva juntos.
- Fim de noite mostra: barcos salvos, naufrágios, tempo de sobra, recorde. Depois da 5, "modo infinito" é
  **fora de escopo** (exercício do guia final).

## 6. Arte (só primitivas do three.js)
- **Nada de modelos, loaders ou imagens.** Tudo é `Box`, `Cylinder`, `Cone`, `Dodecahedron`, `Plane`,
  `Sphere`. Material `MeshStandardMaterial` com `flatShading: true` (visual facetado, barato).
- Barca: casco (caixa), cabine, **lanterna** (cilindro emissivo). Barcos de pesca: casco menor, mastro e
  **flâmula com forma própria por barco** (triângulo, quadrado, círculo...) para distinguir sem cor.
- Farol apagado: cone + cilindro; a lâmpada acende na vitória da noite 5.
- Mar: plano 90×90 m, 64×64 segmentos, y por soma de senos (F3). Ilha: cilindro baixo.
- Câmera: atrás e acima da barca (8 m, 5 m de altura), suavizada com `lerp`; FOV 60.
- **Paleta** (contraste ≥ 4,5:1 nos textos): fundo `#07111c`, mar `#14344f`, luz `#fff1c8`, recife visto
  `#e8e3d4`, recife lembrado `#7f8a94`, perigo/sobrecarga `#ff8a4d`, manhã `#f3c98b`, texto `#dfe9f3`.
- Os barcos têm **uma luz pequena própria** (esfera emissiva): na prova do spike, sem ela o barco some na
  névoa.

## 7. Acessibilidade
- **Reduzir clarões** (menu, e começa ligado se o sistema pedir `prefers-reduced-motion`): relâmpago vira
  subida suave, sem salto de brilho; a sobrecarga não pisca; a tela nunca tem mais de 3 clarões por segundo
  (WCAG 2.3.1) e o padrão já fica abaixo disso (≤ 8 por minuto, de 0,25 s).
- **Cor nunca é a única pista:** recife visto × lembrado muda forma (contorno cheio × pontilhado) e brilho;
  calor tem número; barcos têm flâmulas distintas; sobrecarga mostra texto "LANTERNA ESFRIANDO 4 s".
- **Legível em 390×750:** texto ≥ 16 px, alvos de toque ≥ 64 px, HUD em duas linhas no topo, nada rola.
- Teclado completo; foco visível nos botões; `aria-live="polite"` para "Barco salvo", "Naufrágio",
  "Lanterna esfriando"; aviso sem internet/WebGL em `role="alert"`.
- Opções: som liga/desliga, chuva leve, reduzir movimentos (menos amplitude do mar), FOV 60–80.
- Sem tempo limite de decisão fora do relógio da noite; a pausa é livre.

## 8. Arquitetura de arquivos
- **Ponte** (igual em todo `index.html`; a versão se repete em cada passo, porque import map é inline):
  ```html
  <script type="importmap">{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.min.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/" } }</script>
  <script type="module">import * as THREE from "three"; window.THREE = THREE;</script>
  <script src="regras.js" defer></script><script src="script.js" defer></script>
  ```
  O módulo inline vem **antes** dos `defer`. O jogo confere `typeof THREE === "undefined"` e mostra o aviso.
- Nenhum `import`/`export` nem `class` no código do curso. Só `THREE.*` de biblioteca.
- **Passos 01–04:** um `script.js`. **Do 05 em diante:** `regras.js` (lógica no plano XZ, **sem `THREE`**,
  testável no harness) + `script.js` (cena, desenho, entrada, laço). Essa é a única divisão antes do
  `final`: ela é a lição do passo 05 ("o que a coisa É × como APARECE").
- **`final/`** divide por assunto, na ordem de carga: `fichas.js` (tabelas), `regras.js`, `geracao.js`
  (semente + BFS), `mundo.js` (cena e malhas), `entrada.js`, `som.js` (Web Audio, nada de arquivo),
  `interface.js`, `principal.js`.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`; `antialias` só se `devicePixelRatio < 2`; sombras
  **desligadas**; chuva sempre instanciada; `dispose()` de geometria/material ao trocar de noite.

## 9. Orçamento e o que o spike mediu

**Linhas de JS próprias** (cumulativo por passo, sem contar `three.js`; um passo estourou = corte, não
exceção):

| Passo | F1 | F2 | F3 | F4 | F5 | F6 | F7 | F8 | final |
|---|---|---|---|---|---|---|---|---|---|
| Teto | 120 | 220 | 300 | 420 | 650 | 800 | 1.000 | 1.100 | **2.000** |

Total do módulo ≤ **7.000 linhas** de JS (o xenomorph chegou a 28 mil). CSS ≤ 120 por passo e ≤ 200 no
`final`. `GUIA.md` ≤ 200 linhas por passo, ≤ 450 no `final`. 15 exercícios no `final`, no máximo.

**Spike** (descartável, fora do repo): cena com ilha, farol, mar 64×64 por seno, névoa, SpotLight + cone, 8 barcos,
12 recifes, teste do cone, `Raycaster` e chuva. 600 quadros após 60 de aquecimento, Chrome 155 com `file://`,
**GPU real Intel HD Graphics 4000** (ANGLE/D3D11), um aparelho fraco de 2012; o headless daqui **não** usou SwiftShader.
Quadros sem limite de 60 Hz, para ver o custo real.

| Cenário | JS (ms) | Render (ms) | ms/quadro | Draw calls | Triângulos |
|---|---|---|---|---|---|
| 1280×800, sem chuva | 0,8 | 5,6 | 7,7 | 34 | 8.952 |
| 1280×800, chuva instanciada | 1,5 | 6,3 | 8,9 | 35 | 32.952 |
| 390×750 @2, sem chuva | 0,8 | 1,9 | 5,1 | 29 | 8.892 |
| 390×750 @2, chuva instanciada | 1,6 | 3,6 | 6,7 | 29 | 32.880 |
| 1280×800, chuva **sem** instância | 2,1 | 20,8 | 23,9 | **2.034** | 32.952 |
| 390×750 @2, chuva **sem** instância | 2,3 | 24,7 | 26,7 | **2.030** | 32.904 |

Leitura:
- **A instância vale 2.000 draw calls:** 35 contra 2.034, de 8,9 para 23,9 ms. É o número do passo 07.
- A chuva custa ~0,7 ms de JS (atualizar 2.000 matrizes) e ~1–2 ms de render. Cabe, com folga.
- **Mar animado por seno** (4.225 vértices a cada quadro) cabe em < 1 ms de JS; `flatShading` dispensa recalcular
  normais.
- `pixelRatio` com tela @3 relatou 2: o teto funciona. Em 390×750, @2 custa 2–3 vezes menos que 1280×800.
- **Limite honesto:** a limitação de CPU 4× pelo CDP **não funcionou** neste Chrome (JS subiu só 1,2–1,5× mesmo
  com 8×; um laço puro confirmou ~1,4×). Não há número de celular. Estimativa (inferência, não medida): o JS
  de 1,6 ms vira ~6–10 ms num celular médio; o orçamento de 16,7 ms ainda fecha. **Medir num aparelho real
  antes do `final`.** Sombras ficam desligadas por precaução; não foram medidas.
- Sem internet (`--host-resolver-rules` bloqueando o CDN): o aviso aparece, `THREE` fica `undefined`, nenhuma
  exceção não tratada; só 2 erros de rede no console (a falha é do navegador, não do jogo). Sem WebGL
  (`--disable-gpu`): o `try/catch` em volta de `new THREE.WebGLRenderer` mostra o aviso.

## 10. Fora de escopo
Modelos, texturas e arquivos de imagem; sombras dinâmicas; pós-processamento; física de fluidos; multijogador;
loja e upgrades; modo infinito; áudio em arquivo; PWA; i18n; save em nuvem; gamepad; bundler, `npm`,
TypeScript, `class`. Plano B se este conceito não passar: "Estilingue gravitacional" (HANDOFF §3.4), **ainda
sem checagem de originalidade**.

## 11. Originalidade (verificação de 2026-10-26)

Método: busca na Steam (`storesearch` e `appdetails`) e no itch.io (`/search`, títulos e descrições). Não é
exaustivo: não cobre Google Play, App Store, Newgrounds, YouTube nem jogos sem página pública.

**Nome.** "Faroleiro" na Steam: 0 resultados (também "Farolero"). "Lighthouse Keeper" na Steam: 6, todos
aventura/sobrevivência (ids 2023050, 1469370, 4422050, 1577510, 5310470 e uma demo). No itch.io há
"O Faroleiro" (kupts, shmup de mago), "O Último Faroleiro" (cogulezo-games, **em português**: feixe contra
criaturas do mar) e "Far Ol" (bomdiajj, comandos aos barcos). Nenhum se chama só "Faroleiro", mas
"O Último Faroleiro" tem tema e língua próximos: **decisão do usuário** se mantém o título (seção 12).

**Mecânica.** O subgênero "farol guia navios" é muito povoado no itch.io (dezenas de jogos de game jam só nas buscas feitas).
Os mais próximos:
- **Beamward** (antonbakinowsky.itch.io/beamward): "todo navio que o feixe toca enche um anel de luz e segue
  para o porto enquanto o anel dura; se secar, o navio deriva às cegas para os recifes"; sombras de rochas,
  névoa, chuva, relâmpago, tormenta final. **É o laço do conceito aprovado.**
- **Signal Tower** (tinygamesstudio.itch.io/signal-tower): feixe, sinalizadores e boias guiam navios por rochas.
- **Eldritch Shores** (both-potatoes.itch.io/eldritch-shores): iluminar pedras faz os navios desviarem delas.
- **The Light Stays On** (benjrose.itch.io/the-light-stays-on): 3D; o feixe ilumina o caminho do navio.
- **Lighthouse Keeper 3D** (wobblebox.itch.io/lighthouse-keeper): 3D; mirar o feixe para guiar navios.
- **Keeper** (bomborascla.itch.io/keeper): quebra-cabeça de espelhos; barcos seguem a luz até o porto.
- **Mayday Coast**, **Safe Harbour**, **Lighthouse** (geohan e danigamedev): luz sobre pedra/navio guia o navio.
- Para o conceito **revisado**: **Fog & Whisper** (lucian-studio.itch.io/fog-whisper, remar um barco com
  lanterna na névoa, sobrevivência de terror, sem comboio) e **The Convoy** (juuhish.itch.io/the-convoy,
  quebra-cabeça de grade em PuzzleScript). Nenhum conduz uma fila de barcos com cauda, vendo só dentro do cone.

**Veredito.**
- Conceito aprovado ("o barco só vê os recifes sob o feixe e desvia"): **não é original**; Beamward já tem esse
  laço, com névoa, chuva, relâmpago e oclusão por rochas. Seria uma recriação com outro nome. **Mudado.**
- O que mudou: a luz deixa de informar o **barco** e passa a informar o **jogador**. O feixe sai do farol
  fixo e vai para uma barca que o jogador pilota; os barcos viram um **comboio com inércia**; o desafio passa
  a ser ler o mar no escuro e fazer curvas largas. Mantém-se: lanterna, calor, névoa, tempestade, produto
  escalar e `Raycaster`, e o plano de passos F1–F9.
- Conceito revisado: **sem jogo idêntico achado** nas buscas acima. Risco residual: a sensação "lanterna +
  barco" lembra o subgênero; a identidade está em condução de fila + visibilidade limitada. Repetir a busca
  antes de publicar.

## 12. Perguntas em aberto
1. Aprovar o conceito revisado (seção 11), ou escolher o plano B (a checar), ou manter o antigo sabendo da
   semelhança com Beamward?
2. Manter o título "Faroleiro" apesar de "O Último Faroleiro" (itch.io, em português)?
3. Dois arquivos (`regras.js` + `script.js`) a partir do passo 05 contrariam "um arquivo por passo"? Proposta: sim, é a lição.
4. Medir num celular real antes do `final` (o spike não mediu).

## 13. Mapa passo → seção
| Passo | Conceito novo | Reaproveita | Seção |
|---|---|---|---|
| F1 `01-cena` | import map, ponte `THREE`, cena/câmera/renderer, redimensionar, aviso sem internet | `pong/02-loop` (rAF + dt) | 8 |
| F2 `02-ilha` | geometrias, materiais, luzes, **grafo de cena** (barca → lanterna → feixe) | estado × desenho (`xadrez/01-tabuleiro`) | 4.2, 6 |
| F3 `03-mar` | vértices por seno, névoa, `lerp` dia→noite | trajetos por seno (`shoot-em-up/04-inimigos`), `lerp` (`dealer-out/09-dificuldade`) | 4.6, 6 |
| F4 `04-feixe` | `SpotLight` + cone filhos, guinada/arfagem, local × mundo, aceleração angular, câmera que segue | `clamp` (`pong/04-raquetes`), entrada como intenção (`jogo-da-cobrinha/05-teclado`) | 3, 4.2 |
| F5 `05-barcos` | mundo no plano XZ em `regras.js`, buscar/chegar, comboio, listas vivas | rastro (`jogo-da-cobrinha/06-cobra`), alvos como função (`pacman/05-personalidades`), `atan2` (`shoot-em-up/06-contra-ataque`), listas (`dealer-out/03-chuva`) | 4.1, 4.4 |
| F6 `06-iluminar` | produto escalar (cone), `THREE.Raycaster`, brasa (lembrança) | visão da criatura (`xenomorph/05-criaturas`), DDA (`reflexo/`), temporizadores (`dealer-out/06-atordoamento`) | 4.3 |
| F7 `07-tempestade` | noites como fichas, chuva instanciada, draw calls medidos, relâmpago, calor | curva como tabela (`tetris/08-velocidade`), roteiro (`shoot-em-up/07-roteiro`), partículas (`dealer-out/03-chuva`) | 4.5–4.8 |
| F8 `08-depuracao` | `OrbitControls` pela import map, H mostra o invisível, `dispose()`, `renderer.info.memory` | vazamento de listas (`dealer-out`) | 2, 8 |
| F9 `final` | semente + BFS, menu, pausa, som, recorde, toque, qualidade, reduzir clarões, exercícios | semente (`xenomorph/06-semente`), BFS (`pacman`), `localStorage` (`tetris`), toque (`dealer-out`) | 4.9, 5, 7, 8 |
