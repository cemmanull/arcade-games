# REFLEXO — Documento de design (GDD)

> **Aprovado pelo usuário em 2026-10-27** (TODO N6), com o nome **Reflexo**. A checagem de nome (seção 11)
> achou um jogo chamado exatamente "Reflexo" no itch.io (narrativo, sem relação) e títulos parecidos; o
> usuário manteve o nome.

Módulo 9 do curso: o primeiro jogo em **2.5D**, um raycaster feito à mão, sem biblioteca. É a ponte
entre o canvas 2D de todos os jogos anteriores e o three.js de *Proa Acesa* (módulo 11, depois do isométrico).

## 1. Conceito

Você é um autômato zelador de um observatório subterrâneo onde a luz parou de chegar. Em primeira
pessoa, num labirinto de salas em grade, você gira espelhos de 45° para guiar um feixe de luz até
**receptores**, e cada receptor aceso abre uma **porta**. Pelos corredores rondam as **sombras**,
criaturas vivas que o perseguem. Só o feixe as desfaz.

**A tensão central: o mesmo feixe é chave e arma.** Virar um espelho para atingir uma sombra pode
tirar a luz de um receptor e fechar a porta de que você precisa. Toda partida é a pergunta "para
onde aponto a luz agora?".

- **Fim da fase:** todos os receptores acesos ao mesmo tempo abrem a saída, e você chega a ela.
- **Fim do jogo:** três vidas. Tocar numa sombra tira uma vida.
- **Técnica:** raycasting DDA sobre a grade. **O feixe é calculado pelo mesmo DDA que desenha a tela**
  (seção 4.3), e a reflexão é o ricochete do Pong.

## 2. Pilares

1. **Um feixe, dois usos.** Nenhuma regra nova: chave e arma são a mesma linha de luz.
2. **O invisível aparece.** A tecla **H** troca a vista por uma planta de cima com os raios, a grade
   e o campo de distância das sombras ("mostrar o invisível", hábito do curso).
3. **A matemática é o jogo.** Cada ideia (raio, plano da câmera, textura, z-buffer, reflexão) entra
   num passo e já se joga.
4. **Confortável.** FOV ajustável, nenhum balanço de câmera, nenhum relâmpago, nada de enjoo.

## 3. Controles (teclado e toque)

Os dois viram as mesmas **intenções**: `andar(frente, lado)`, `girar(delta)`, `acionarEspelho()`,
`alternarPlanta()`, `pausar()`.

| Intenção | Teclado | Toque (390×750, vertical) |
|---|---|---|
| Andar / recuar | W S ou setas ↑ ↓ | botões ▲ ▼ (manter pressionado) |
| Passo lateral | A D | botões ◀ ▶ |
| Girar | ← → ou mouse (clique prende o ponteiro) | **arrastar o dedo sobre a imagem** |
| Girar o espelho à frente | Espaço ou E | botão "Espelho" |
| Planta com os raios (H) | H | botão "Planta" |
| Pausa | P ou Esc | botão "II" |

**Esquema de toque** (esboço, **não medido em aparelho**):
- Tela vertical: a imagem ocupa o topo (390×300 CSS) e os controles, a metade de baixo.
  Esquerda: cruz de movimento. Direita: "Espelho" grande e "Planta". Alvos de pelo menos 48 px.
- Arrastar horizontal sobre a imagem gira (sensibilidade nas opções). Em `pointerdown` o jogo guarda
  o `pointerId`, para segurar um botão de andar com um dedo e arrastar com outro.
- "Espelho" age na **casa à frente, a até 1,5 casa**. Não é preciso mirar em pixel nenhum.
- Se o arrasto cansar ou falhar, as opções oferecem botões ⟲ ⟳ de giro em passos de 15°.

**Riscos do toque:**
- rolagem, zoom e "puxar para atualizar" disputam o arrasto: `touch-action: none`;
- dois dedos simultâneos dependem de Pointer Events, que não foram testados em iOS Safari;
- o polegar cobre a imagem se os botões subirem demais;
- giro por arrasto pode cansar ou enjoar (sensibilidade baixa por padrão); a rotação do aparelho muda as
  proporções (no modo horizontal, controles em sobreposição).

## 4. Mecânicas

### 4.1 Mapa e mundo
Cada fase é um **mapa em texto** (eco do Pac-Man). Legenda: `#` parede de tijolo, `%` pedra,
`.` chão, `E` emissor, `/` e `\` espelhos, `R` receptor, `D` porta (liga a um receptor), `S` fenda
de sombra, `J` início do jogador, `X` saída. Emissores são fixos, na direção dos eixos, e saem do
centro da casa; espelhos ficam no centro da casa. As bordas são sempre paredes (validado).

### 4.2 Jogador
Posição `(x, y)` e ângulo. A direção é `(cos, sin)` do ângulo (trigonometria do Shoot'em up) e o
plano da câmera é perpendicular a ela. Andar é relativo à direção. A colisão com a grade usa um
**raio do corpo** e resolve **um eixo por vez**, para deslizar na parede.

### 4.3 O feixe (mesmo DDA que a tela)
Uma única função `lancarRaio(origem, direcao, parar_em_espelho)` percorre a grade casa a casa.
- **Tela:** um raio por coluna, atravessando espelhos.
- **Feixe:** parte do centro do emissor e **para na casa de um espelho**; o jogo reflete a direção e
  lança outro raio do centro dele. Limite de **8 quiques**.
- **Reflexão** (eixo y para baixo): `/` troca `(dx, dy)` por `(−dy, −dx)`; `\` por `(dy, dx)`. É a
  troca de componente do ricochete do Pong. Com emissores nos eixos e espelhos nos centros, o
  feixe nunca sai do eixo, então a conta é exata, sem tolerância de ponto flutuante.
- O resultado é uma lista de segmentos `{x0, y0, x1, y1}` e o conjunto de casas iluminadas.

### 4.4 Desenhar o feixe e os espelhos
Sem geometria nova. Cada segmento do feixe e cada diagonal de espelho é um **plano fino**: por
coluna, interseção raio × segmento; se a distância é menor que a da parede (z-buffer por coluna),
desenha uma faixa fina na altura dos olhos (feixe) ou uma faixa alta prateada (espelho).

### 4.5 Receptores, portas, saída
Um receptor é aceso se um segmento do feixe termina nele. Cada porta tem uma lista de receptores;
só abre com **todos** acesos agora. Perdeu a luz, fecha (se a porta fecha em cima de alguém, ela
só reabre quando a casa esvaziar: sem esmagar). Em fases avançadas, um receptor **trava** (fica
aceso para sempre): o quebra-cabeça vira "ordem".

### 4.6 Espelhos e estado imutável
`acionarEspelho()` não mexe no objeto: **gera uma sala nova** com aquele espelho invertido (estado
imutável do Xadrez). Reiniciar a fase volta à cópia original, sem desfazer à mão. Espelho ocupa a
casa e **não** bloqueia o jogador (ele passa pela borda do espelho; o plano fino é só visual).

### 4.7 Sombras
- **Máquina de estados:** `nasce → ronda → persegue → dissolve` (exposta na planta H).
- **Perseguir:** campo de distância por **busca em largura** (Pac-Man) a partir do jogador, refeito
  quando ele troca de casa. A sombra desce o campo, mais lenta que o jogador (70%).
- **A luz as desfaz:** sombra numa casa iluminada acumula exposição; com **0,5 s**, dissolve.
  Meio segundo força o jogador a *segurar* o feixe, e é aí que a tensão central acontece.
- **Reaparecem** a cada 12 s numa fenda `S`, até o máximo da fase.
- **Contato:** tira uma vida e dá 1,5 s de invulnerabilidade, com a sombra recuando.
- O feixe **não machuca** o jogador. A luz só atinge sombras.

### 4.8 Sala, vidas, pontuação
Pontos por receptor aceso (100), sombra desfeita (50) e tempo restante (só bônus). Recorde por fase em `localStorage`, lido com `try/catch` e saneado campo a campo.

## 5. Progressão

As fases são **dados**: `{ mapa: [...], portas: [...], sombras: { max, intervalo }, dica }`. Sobem
a dificuldade três eixos, um por vez:
1. mais espelhos e mais emissores;
2. receptores que travam, e portas com vários receptores;
3. mais sombras, e mais rápidas.

Previstas ~8 fases: 1–2 ensinam espelho; 3–4, porta de dois receptores; 5–6, sombras; 7–8, tudo junto.

**Solubilidade validada por busca** (eco do Xenomorph, `xenomorph/06-semente`: "tentou todas as
combinações"). Um **robô** explora o espaço `(máscara dos espelhos, casa do jogador)` por busca em
largura: andar até casa livre (portas conforme o feixe atual), acionar espelho adjacente. Com até 8
espelhos são 2⁸ × ~400 casas, uns 100 mil estados. A fase é **solúvel** se algum estado alcança a saída.
O robô roda como página de teste do harness (o harness de verificação, D6) e confere também bordas fechadas, um só
jogador e todo receptor ligado a uma porta. **Sombras ficam fora da prova** (são pressão, não regra).

## 6. Arte

- **Resolução interna:** 320×200 na horizontal; **195×150 na vertical**, dobrada para 390×300 CSS.
  Canvas com `image-rendering: pixelated` e **escala inteira** (320×200 em 390 de largura caberia só
  1×, por isso a predefinição vertical própria).
- **Texturas 16×16 como texto**, caractere → cor (estilo dos sprites do curso): tijolo, pedra,
  receptor (anel com núcleo), chão. Sprite da sombra 16×16 com transparência (`.`).
- **Paleta:** fundo azul-noite `#08080e`; tijolo vermelho apagado `#964632`; pedra cinza-azulado;
  **feixe ciano claro `#bff`**; sombra roxa `#783ebe` com olhos amarelos. O resto é névoa.
- **Névoa:** por distância, 32 níveis, as texturas já sombreadas **uma vez**, na carga.
- **Chão e teto:** gradiente por linha (barato) ou texturizados (opcional, medido no passo 05).
- **Som sintetizado (Web Audio):** zumbido do feixe (frequência sobe com o nº de quiques), clique do
  espelho, tom de receptor, rangido de porta, sussurro da sombra se aproximando, "puff" ao dissolver.

## 7. Acessibilidade

- **FOV ajustável** (50°–90°, padrão 66°), **sensibilidade** de giro e **velocidade** nas opções.
- **Sem balanço de câmera**, nunca. `prefers-reduced-motion`: sem pulsos animados no feixe, sem
  suavização do giro, sem piscar ao tomar dano.
- **Nunca só por cor:** o feixe tem *forma* (faixa contínua com pulsos de brilho ao longo do
  comprimento) e o receptor, *forma e texto* (anel cheio = aceso, anel vazio = apagado; HUD "Receptores
  2/3"). Sombra se distingue por silhueta e movimento. Vidas são ícones **e** número.
- **Teclado completo**, foco visível, pausa a qualquer hora; `aria-live` para "Porta aberta", "Sombra
  desfeita", "Vida perdida". Cabe em 390×750 sem rolar; alvos de toque ≥ 48 px.
- Sem relâmpagos nem alternância rápida de brilho; HUD claro sobre faixa escura.

## 8. Arquitetura de arquivos

**Regra:** a lógica é separada do desenho para ser testável **sem canvas**.
- `regras` (puro, sem DOM): mapa, `lancarRaio`, `tracarFeixe`, estado imutável, receptores e portas,
  busca em largura, sombras, validação. Funções e objetos literais. Não conhece `canvas`.
- `desenho` (usa o canvas): colunas, texturas, névoa, sprites, planta H, HUD.
- `entrada`: teclado, mouse, toque → intenções. `jogo`: laço (rAF + dt), estados, menu, pausa.

Scripts clássicos com `<script src defer>`, escopo global compartilhado; **ordem importa**; **sem
`import`/`export`, sem `class`**; `localStorage` saneado. Cada passo é uma pasta autocontida
(`index.html`, `style.css`, `script.js`, `GUIA.md`) que **copia o anterior e acrescenta**. Só o `final`
divide em arquivos por assunto: `mapas.js`, `regras.js`, `sombras.js`, `desenho.js`, `entrada.js`,
`audio.js`, `jogo.js`.

### 8.1 Técnica de desenho escolhida (a partir do spike)

**Buffer `ImageData` escrito pixel a pixel** (`Uint32Array` por cima do `ImageData`, um `putImageData`
por quadro), com texturas **pré-sombreadas** em 32 níveis de névoa. As fatias `drawImage` por coluna
**perdem**: dez a trinta vezes mais caras, e instáveis (seção 8.2). A planta H e o HUD seguem em canvas
2D normal, por cima, em outro canvas.

### 8.2 Resultados do spike (N2)

Raycaster 320×200 (195×150 na vertical), 24×24, DDA, correção do olho de peixe (distância
perpendicular), 16×16 texturas, névoa, 1 sprite com z-buffer, feixe com quiques e espelhos. **ms por
quadro = atualizar + desenhar**, média de 600 quadros (60 de aquecimento), Chrome headless.
`1×` é CPU livre; `4×` é `Emulation.setCPUThrottlingRate`.

| Abordagem | 1280×800, 1× | 1280×800, 4× | 390×750 (DPR 3), 1× | 390×750, 4× |
|---|---|---|---|---|
| A. `drawImage` por coluna, 320×200 | 9,2 | 22,2 | 4,7 | 22,6 |
| B. `ImageData` por pixel, 320×200 | **0,41** | **1,15** | **0,30** | **0,72** |
| B + chão e teto texturizados, 320×200 | 0,66 | 1,28 | 0,42 | 0,93 |
| A, 195×150 | — | — | 5,1 | 10,6 |
| B + chão e teto, 195×150 | — | — | **0,24** | **0,56** |
| **Pior caso** (nariz na parede), 320×200: A / B / B+chão | 11,9 / 0,33 / 0,54 | 32,1 / 1,59 / 2,20 | — | — |

Orçamento: 16,7 ms (60 quadros/s). **B cabe com folga de ao menos 7×, mesmo em 4×.** A estoura o
orçamento em 4× (22 a 32 ms).

**Ressalvas (fato, depois inferência):**
- Fato: o relógio é de uma máquina de mesa, com a tela desenhada em software (SwiftShader), canvas
  com `willReadFrequently` e descarga forçada por quadro. Sem isso, A tem uma queda brusca de ~17
  para ~200 ms por quadro (leitura de volta da GPU). Fora do laço de medição, em `requestAnimationFrame`
  normal, A "só" enfileira (2,3 ms) e o intervalo fica em 16,8 ms: **a conta real da GPU não foi medida**.
- Fato: o estrangulamento a 4× é irregular. Um quadro de calibração de laço fixo mostrou entre 1,1× e
  4,3× (um caso de B+chão a 4× provavelmente ficou menos estrangulado). A tabela mostra o **pior** dos
  medidos, não uma média confiável.
- Inferência: celulares de médio porte ficam entre 2× e 6× um desktop; com ≥ 7× de folga, B deve
  segurar 60 quadros/s. **Não medido em celular de verdade** (risco da seção 12).

Chão texturizado custa +0,2 a +0,9 ms. Entra como **opção medida no passo 05**.

## 9. Orçamento de linhas

Contagem: **JS próprio** (sem `GUIA.md`, `index.html`, `style.css`, mapas de dados). O Xenomorph
chegou a 28 mil linhas no total; aqui o teto é **duro**: estourou, corta-se escopo, não o teto.

| Passo | Teto de JS (acumulado) | Teto de CSS |
|---|---|---|
| 01-planta | 150 | 60 |
| 02-andar | 260 | 70 |
| 03-um-raio | 360 | 80 |
| 04-paredes | 520 | 90 |
| 05-texturas | 760 | 100 |
| 06-objetos | 960 | 110 |
| 07-espelhos | 1.400 | 140 |
| 08-sombras | 1.850 | 160 |
| **final** | **2.500** (somando todos os arquivos) | 300 |

- `final` ≤ 2.500 linhas de JS, ~40% do JS do Xenomorph (6,3 mil). Cada `GUIA.md` de passo ≤ 250 linhas;
  o do `final` ≤ 450 com ~15 exercícios.
- Mapas das fases (~8) à parte, ≤ 400 linhas de texto. Funções ≤ 40 linhas; arquivo do `final` ≤ 500.

## 10. Fora de escopo

- Texturas em arquivo; modelos; teto e chão em alturas diferentes; escadas; paredes de altura variável.
- Espelhos em ângulos livres; prismas, lentes, cores de luz; mais de um tipo de emissor.
- Multijogador; editor de fases; fases procedurais; olhar para cima e baixo; pulo; armas.
- Sombras com IA além de "descer o campo de distância"; música composta.

## 11. Originalidade (obrigatória)

**Exigência do usuário:** jogo de gênero original, não recriação nem cópia renomeada.

### 11.1 Checagem de nome (Steam e itch.io, em 2026-10-26)

| Busca | Resultado |
|---|---|
| Steam `Reflexo` | nenhum jogo com esse título |
| itch.io `Reflexo` | **"Reflexo" (andressajohann.itch.io/reflexo)**: jogo reflexivo de escolhas, ético e introspectivo, sem relação de mecânica |
| itch.io, variações | "Reflexos Fragmentados" (aventura/plataforma 2D), "Reflexo oxelfeR" (horror, simulador de caminhada), "Reflexo do Inimigo" (quebra-cabeça 3D com espelhos, labirinto, terceira pessoa), "Contra;Reflexo" (quebra-cabeça 2D de luz com espelhos e lentes, Android, alunos do IFRN), "Através do Reflexo" (visual novel), "Jogo de Reflexo", "teste de reflexo" |

**Veredito do nome:** o título exato já existe (outro gênero), e dois dos vizinhos ("Reflexo do Inimigo",
"Contra;Reflexo") são quebra-cabeças de espelho e luz, o que pode confundir quem procura. **"Reflexo"
fica só como título de trabalho.** Alternativas conferidas **da mesma forma** (nenhum título igual no
itch.io nem na Steam; o itch.io devolveu só resultados aproximados sem relação):
1. **Lampejo** (clarão rápido);
2. **Facho** (feixe de luz);
3. **Luzeiro** (o que dá luz; soa a lugar).
Limite: só Steam e itch.io (não Google Play nem registro de marcas).

### 11.2 Checagem de mecânica

| Mais próximos | Como o Reflexo difere |
|---|---|
| **Lightmatter** (Steam, 2020): "puzzler em primeira pessoa em que sombras matam" | Lá a sombra é um **ambiente letal parado** e a luz é abrigo. Aqui as sombras são **criaturas que perseguem** e o feixe **as desfaz**; e o feixe é o quebra-cabeça. |
| **The Talos Principle** e **Portal 2** (Steam): redirecionar lasers em primeira pessoa | Mesma família de puzzle (é gênero antigo), mas 3D completo, sem inimigo que o laser desfaça. Aqui o feixe é arma. |
| **Contra;Reflexo**, **Reflect Laser**, **Laser Mirror Puzzle**, **Twister Laser**, **Bouncy Beam**, **Lumen Lab** (itch.io/Steam) | Todos 2D, **de cima**, sem pressão em tempo real. Aqui é primeira pessoa, com perseguidores. |
| **Reflexo do Inimigo** (itch.io) | Labirinto 3D de terceira pessoa com espelhos que "contêm ameaças"; sem feixe nem tese de luz como arma. |
| **Alan Wake** (Steam): lanterna como arma | Luz como arma em ação, mas sem espelhos nem quebra-cabeça de caminho do feixe. |

**Veredito:** o **quebra-cabeça de feixe e espelhos** é gênero (existe desde os anos 80) e a **luz que
afasta o escuro** é tropo. O que pertence a este jogo é a **combinação**: raycaster à mão +
**um único feixe que é chave e arma** + perseguidores em tempo real, em que mexer num espelho para
atacar pode trancar uma porta. Nenhum título encontrado combina os três. **Nenhuma mecânica está
próxima demais de um jogo específico**; nada mudou no design.
**Guarda de projeto:** não acrescentar "ficar na luz protege" (o centro do Lightmatter). A luz só
ataca. Se isso mudar, rever esta seção.
Limite: busca por palavras em 2 lojas (o itch.io limitou requisições); não é exaustiva.

## 12. Riscos em aberto
- **Celular de verdade** não foi medido; a folga vem do desktop estrangulado (seção 8.2).
- **Toque:** giro por arrasto e dois dedos nunca foram testados (seção 3).
- **Enjoo:** FOV e ausência de balanço mitigam; não testado com pessoas.

## 13. Mapa passo → seção

Pré-requisitos mínimos: **pacman, shoot-em-up, xadrez** (xenomorph recomendado). "Reusa" cita módulo/passo.

| Passo | Conceito novo | Reusa | Seção |
|---|---|---|---|
| **01-planta** | mapa em texto, vista de cima, posição, ângulo, vetor direção | `pacman/01-labirinto` (mapa em texto, grade); `shoot-em-up` (seno e cosseno) | 4.1, 4.2 |
| **02-andar** | andar relativo à direção, colisão com raio, um eixo por vez | `pong/05-colisao` (colisão por eixo); `tetris/final` (entrada → intenção) | 3, 4.2 |
| **03-um-raio** | DDA casa a casa; a planta desenha o raio | grade do Pac-Man; tecla H do curso | 4.3 |
| **04-paredes** | um raio por coluna, plano da câmera, FOV, altura = k/distância, olho de peixe | `shoot-em-up` (trigonometria) | 4.3, 6, 7 |
| **05-texturas** | textura como texto, amostrar a coluna, névoa, resolução baixa escalada, **medir ms/quadro** (técnica A × B) | sprites em texto de todo o curso | 6, 8.1, 8.2 |
| **06-objetos** | sprites no espaço da câmera, projeção, z-buffer por coluna, ordem por distância | `shoot-em-up` (muitos objetos); `shoot-em-up/04-inimigos` | 4.4, 4.7 |
| **07-espelhos** | feixe = DDA que quica, receptor abre porta, sala imutável, reiniciar de cópia | `pong/03-paredes` (ricochete = sinal trocado); `xadrez/05-xeque` (estado imutável) | 4.3, 4.5, 4.6 |
| **08-sombras** | máquina de estados, campo de distância por BFS, a luz desfaz, vidas | `pacman/06-modos` (BFS, estados); `pacman/04-fantasma` (perseguidor) | 4.7, 4.8 |
| **final** (R9) | fases como dados, **validação de solubilidade por busca**, menu, pausa, som, recorde, toque, opções, H com raios; ~15 exercícios | `xenomorph/06-semente` (validação por busca); `xadrez/07-computador` (vários arquivos); `tetris/final` (toque) | 5, 7, 8, 9 |

