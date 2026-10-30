# Dique — Passo 8: Para a mão

**Mudou:** `script.js` (o botão **Calmo** e a tecla **O**: `definirMovimento`, que também segue o sistema se ele mudar com o jogo aberto; o resumo em texto, `atualizarResumo`; os avisos do GDD §7; o painel com **"Casas 3/4"**; o tempo de cada quadro, `ultimoTempoDeQuadro`), `index.html` (o botão Calmo, a lista `#resumo`, `role="img"` no canvas) e `style.css` (a leitura do H vem por último e some quando vazia, o resumo só aparece com o foco). `regras.js` é o do passo 7. Fora do passo: [`verificacao/medicao/dique-08.html`](../../verificacao/medicao/dique-08.html), a página que mede o jogo **no seu celular**.
**Rode:** abra o `index.html`. Aperte **Tab** e veja o foco andar pelos botões; aperte **O** (a maré passa a andar um passo por toque); aperte **L** (o resumo do mapa em texto cobre a tela) e **Esc** (ele sai).

---

## O que você vê

O jogo é o do passo 7, só que agora cabe na mão e conversa com quem não vê a tela:

- O painel diz **"Maré 1/2 · Blocos 1 · Casas 3/4"**: a contagem das casas vem em palavras, não só em ✓ e ✗.
- Há um botão **Calmo**: ligado, a água não ondula, a chuva fica parada e a maré deixa de correr sozinha. Cada toque em **Maré** dá **um passo** da água.
- **Tab** percorre os 16 botões, e o foco é sempre um contorno amarelo de 3 px. A tecla **L** (ou o último **Tab**) abre o **resumo**: uma lista, uma linha por fileira da ilha, "x3 altura 1 com água casa ✗ Alagada".
- Tudo cabe em **390×750 sem rolar**, e em **360 de largura sem rolagem horizontal**, com todo botão de pelo menos 48×48 px.

---

## 1. Alvo de 48 px, e o toque em dois passos

*Reusa `tetris/final` (os botões do toque) e o passo 3 (marcar e confirmar).*

O losango de um bloco, em "Longe", tem 36×18 px: pequeno para um dedo. O jogo não tenta acertar com a ponta do dedo; faz duas coisas:

1. **O primeiro toque marca**, o segundo, no mesmo bloco, **aplica** (a regra do passo 3, `tocar`). Quem erra o bloco marca outro e não estraga nada.
2. **O cursor anda por botões de 48 px** (← ↑ ↓ →), e o zoom **Perto** dobra o bloco para 72×36.

No dia 10 as setas deixam de ser conforto. O centro, (4, 4), fica atrás das quinas de altura 3 em **todos** os giros, e nenhum toque no mapa o acerta. Toque num bloco perto dele e ande com as setas até lá: atrás do bloco o cursor fica tracejado, e o aviso diz "Cursor no bloco 4,4, altura 0, escondido atrás de outro bloco". Então toque **Aplicar**: ele age na casa do cursor, não na do último toque.

```css
button { min-width: 48px; min-height: 48px; }
```

A conta do espaço, em pixels, de cima para baixo, em 390×750: título 31, mapa 240, painel 18, meta 15, tábua 14, ferramentas **104** (duas fileiras, com o Calmo na segunda), botões 48, setas 48, aviso 51, mais as folgas de 8 px. Termina em 657 de 750. Em 360 de largura o mapa encolhe (`max-width: 100%`) e o total é 638 de 640 (360×640 não é requisito, mas cabe). A página de teste confere os dois tamanhos: sem rolagem horizontal, todo botão com largura **e** altura de pelo menos 48.

Duas escolhas que liberaram espaço: a leitura do **H** deixou de reservar 59 px no fim da página (vazia, some com `:empty`; com H, é o **último** item, depois do aviso, então nada acima dela se mexe e nada fica coberto), e o espaço entre os itens caiu de 12 para 8 px. Com o H ligado, a página mais alta mede 733 de 750 em 390×750 (a leitura tem até 4 linhas): continua sem rolar. Em 360×640 o H faz a página rolar (703 de 640), mas não cobre nada. Uma versão anterior prendia a leitura no pé da janela (`position: fixed`) para caber também em 360×640, e ela cobria o aviso (a voz do jogo) e, em alguns dias, as setas: **cabe em 390×750 e rola em 360×640 é melhor que cobrir o que o jogador precisa ler**. O `#aviso` continua com altura fixa (três linhas): um botão que pula de lugar quando o aviso muda é um toque errado.

---

## 2. Nunca só por cor

*Reusa a regra do GDD §7.*

A água é azul, mas **não é a cor que a distingue**: tem **borda branca** onde termina, e o H mostra as alturas em **números**. A casa mostra o resultado em **forma e palavra**:

```js
const TEXTO_DA_MARCA = { "✓": "✓ Salva", "✗": "✗ Alagada", "": "" };
```

No mapa a casa ganha `✓` ou `✗` (o canvas não tem espaço para a palavra inteira num bloco de 36 px). A palavra está no **painel** ("Casas 3/4"), no **aviso** ("Maré: 2 casas alagadas") e no **resumo** ("casa ✗ Alagada"). Quem não distingue vermelho de verde, ou não vê o mapa, lê o mesmo estado.

---

## 3. Reduzir movimento: o sistema e o jogador

Antes do passo 8 só valia `prefers-reduced-motion`, que o jogador não controla dentro do jogo. Agora o `movimentoReduzido` é uma **variável**, ligada pelas duas coisas:

```js
const pedidoDoSistema = window.matchMedia("(prefers-reduced-motion: reduce)");
let movimentoReduzido = pedidoDoSistema.matches;   // o botão Calmo (ou a tecla O) a troca

function definirMovimento(reduzido) {
    movimentoReduzido = reduzido;
    botaoDoMovimento.setAttribute("aria-pressed", reduzido);
    avisar(reduzido ? "Movimento reduzido: ..." : "Movimento normal: ...");
}
```

Ligado, o jogo muda **quatro coisas**, todas já lendo `movimentoReduzido`: a onda de alfa da água fica parada, a chuva não cai, o filme da maré não corre (`atualizar` retorna antes dele) e **M** (ou o botão Maré) dá **um passo** da água por toque, como no GDD §7. O botão é um `aria-pressed`, então o leitor diz "Calmo, ativado". O sistema pode mudar de ideia com o jogo aberto: `pedidoDoSistema.addEventListener("change", …)` chama `definirMovimento` de novo (e o aviso diz o que mudou, porque a maré passa a andar de outro jeito), **até o jogador tocar no Calmo**; depois disso a escolha dele manda mais que a do sistema. O `if (pedidoDoSistema.addEventListener)` protege o Safari antes do 14, que não tem esse método: lá o jogo só lê a preferência na carga, em vez de parar com erro. A escolha **não é guardada** ao recarregar: o recorde e as opções, com `localStorage`, são do `final`.

---

## 4. O teclado alcança tudo

Cada botão tem um `data-acao`, e **um ouvinte só** no `document` o atende. O teclado chama as mesmas funções:

| Tecla | Faz | Tecla | Faz |
|---|---|---|---|
| **setas** | o cursor (relativo à tela, em qualquer giro) | **Q** / **R** | gira a vista |
| **Enter** / **Espaço** | aplica no bloco do cursor | **+** / **−** | perto / longe |
| **1** / **2** | Erguer / Cavar | **W A S D** | rola o mapa |
| **Z** | desfaz | **H** | mostra o invisível |
| **M** | libera a maré, depois chama a ficha ou o dia seguinte | **O** | liga ou desliga o movimento reduzido |
| **N** | recomeça o dia | **L** | abre o resumo em texto (**Esc** sai) |

Dois cuidados: num **botão** focado, Enter e Espaço acionam **o botão** (o jogo não aplica por cima); e no **resumo** as teclas voltam a ser do leitor (rolar, ler), e só **Esc** o fecha. O foco aparece sempre: `button:focus-visible` e o resumo têm contorno amarelo de 3 px. Não há armadilha de foco: o último **Tab** do resumo sai para fora da página e o seguinte volta ao primeiro botão.

---

## 5. O leitor de tela: o aviso e o resumo

*Reusa o `#aviso` com `role="status"`, que existe desde o passo 3.*

O `#aviso` é uma região **viva** e **educada**: cada evento escreve nele **uma frase curta**, e o leitor a anuncia sem interromper. Nunca por quadro: um texto novo a 60 vezes por segundo seria ruído. As frases do GDD §7:

| Evento | Frase |
|---|---|
| Aplicar | "Bloco 4,3 subiu para 2. Blocos no estoque: 1" |
| Preamar | "Maré: 3 casas alagadas" |
| Fim do dia | "Dia vencido: 3 de 3 casas salvas, meta 3, jogadas 1 (par 1). M abre o próximo dia. N recomeça" |
| Calmo | "Movimento reduzido: a maré anda um passo por toque em Maré" |

Aqui "**bloco**" é uma casa do mapa e "**casa**" é uma construção (o texto antes misturava as duas).

O **resumo** é o que um leitor de tela não tira do canvas: `<ol id="resumo" tabindex="0">`, uma linha por fileira, com altura, água, objeto e o estado da casa. Fica **fora da vista** com `clip-path`, não com `display: none` (que o esconderia do leitor), e **aparece quando recebe o foco**: cobre a tela com texto grande, para quem usa só o teclado também o ver. Ele só se reescreve quando o texto muda (`ultimoResumo`), e só nos eventos (`mostrarAgua`, `contarAMare`, `terminarAVazante`), nunca por quadro.

---

## 6. Contraste

Fundo `#0b1020`. Razões calculadas com a fórmula da WCAG, para o texto do HUD e dos botões:

| Par | Razão |
|---|---|
| título e painel `#ffe14d` no fundo | 14,5 |
| texto `#eaf0ff` no fundo (meta, tábua, aviso) | 16,6 |
| texto `#9aa6c4` no fundo | 7,8 |
| botão `#eaf0ff` sobre `#1b2748` | 12,9 |
| botão pressionado `#101820` sobre `#ffe14d` | 13,7 |
| foco `#ffe14d` sobre o botão | 11,3 |

O mínimo exigido é **4,5**. O botão pressionado também é **sublinhado**: o estado não depende só da cor.

---

## 7. Medir no celular, antes de otimizar

*Reusa `verificacao/medicao` e `reflexo/05-texturas` (medir ms/quadro).*

O jogo redesenha as ~100 casas a cada quadro. O GDD não deixa otimizar isso sem número, e o número que importa é o **do seu celular**: o computador não imita um celular (já tentamos). Por isso o passo guarda, a cada quadro, três tempos:

```js
ultimoTempoDeAtualizacao, ultimoTempoDeDesenho, ultimoTempoDeQuadro    // ms, CPU
```

E existe a **página de medição** `verificacao/medicao/dique-08.html`: ela serve o jogo e roda **dois cenários** (cerca de meio minuto): o dia 1 parado (o leve) e o dia 10 na preamar com chuva, H ligado e zoom perto (o pesado). O passo a passo para abrir no celular está no [`LEIAME`](../../verificacao/medicao/LEIAME.md) da pasta. O resultado vem como `mediana / p95 / máximo`, e **60 quadros por segundo** pedem 16,7 ms por quadro inteiro.

No computador de desenvolvimento, em Chrome sem placa de vídeo, o desenho custou **2,0 / 3,7 / 4,7 ms** (leve) e **3,2 / 4,6 / 7,2 ms** (pesado), e os 60 fps ficaram. **Isso não diz nada do celular.** Se o seu aparelho passar de uns 8 ms, o próximo passo é um cache de camadas (o terreno parado em um canvas fora da tela); se não passar, ele não existe, e o curso não o escreve.

---

## 8. O que o passo 8 ainda não sabe

- **Aparelho real.** Os 36 px do bloco, os 48 px dos botões e os ms por quadro são hipóteses até alguém medir e tocar num celular. Os **Pointer Events não foram testados no iOS Safari**.
- **Opção guardada.** O Calmo volta ao do sistema ao recarregar; `localStorage`, menu, pausa, som e estrelas são do `final`.
- **Teste com leitor de tela de verdade.** Os avisos e o resumo foram conferidos no DOM (o texto certo, no lugar certo), não ouvidos num NVDA, VoiceOver ou TalkBack.

---

## Experimente

1. Aperte **Tab** sem mouse até o fim. Quantos botões o foco visita antes do resumo? Algum botão fica de fora?
2. Aperte **O** no meio da enchente. A maré para sozinha? E **O** de novo, ela volta a correr?
3. Ligue o **Calmo** e jogue o dia 1 só com o teclado: **setas** até a brecha, **Enter**, **M** quatro vezes. O que o aviso diz em cada toque?
4. Aperte **L**, leia a linha de um bloco com casa e feche com **Esc**. Libere a maré e abra o resumo de novo: a casa diz "✓ Salva" ou "✗ Alagada"?
5. Em `style.css`, troque `clip-path: inset(50%)` do `.so-leitor` por `display: none`. O que o leitor de tela faz? E o **L**?
6. Tire `min-height: 48px` do `button` e olhe a página em 360 de largura. Que botões ficam pequenos? (A página de teste os pegaria.)
7. Abra `verificacao/medicao/dique-08.html` no computador e aperte **Medir**. Qual cenário custa mais? Por quê (conte as casas com água e o H)?
8. Com o jogo aberto, ligue e desligue "reduzir animações" no sistema (no Chrome, o painel Rendering do DevTools emula isso). O Calmo acompanha? E depois que você toca no Calmo?
9. No dia 10, jogue só tocando, sem teclado, e erga o centro, (4, 4). Toque onde ele estaria, em cada giro: que bloco o toque marca? Depois chegue a ele pelos botões de seta (o que o aviso diz?) e toque **Aplicar**.
10. **Quebre de propósito:** em `avisar`, escreva também no `#resumo`. O leitor de tela fica falando? Por que o aviso é uma frase e o resumo, uma lista que só se reescreve quando muda?

---

**Anterior:** [`07-dias`](../07-dias/) · **Próximo:** `final` — o menu, a pausa, o som, o recorde e as opções, com o código dividido em arquivos por assunto (`projecao.js`, `fases.js`, `desenho.js`, `entrada.js`…).
