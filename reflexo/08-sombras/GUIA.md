# Reflexo — Passo 8: Sombras

**Mudou:** `script.js` (a seção 10 é nova: o campo de distância, a máquina de estados das sombras, a luz que as desfaz, o
contato e as vidas; `OBJETOS.concat(sombras)` põe as sombras vivas na projeção do passo 6, com `escala`; a planta ganha o
campo, as sombras e o símbolo do estado de cada uma; o painel ganha vidas e pontos; `atualizar` para quando o jogo acaba;
`reiniciarSala` limpa as sombras e, depois do fim de jogo, devolve as vidas; o mapa ganha duas fendas `S`; a sombra volta
ao catálogo), `index.html` (a ajuda) e `style.css` (o contorno de invulnerável). O feixe, os espelhos, a sala imutável e as
portas são **os mesmos** do passo 7.
**Rode:** abra o `index.html`. Em dois segundos nasce uma **sombra** numa fenda; ela ronda, sente você e persegue. Faça o
feixe passar por ela: meio segundo de luz a desfaz. **H** mostra o campo de distância.

---

## O que você vê

Chamas roxas de escuro, inclinadas, de ponta fina e com fagulhas soltas ao redor: as **sombras**. Não têm saia nem par de
olhos; só um brilho. Elas **nascem** pequenas numa fenda (`S`), **rondam** devagar, e quando você está a até 8 passos de
caminho (não em linha reta: as paredes contam) **perseguem** a 70% da sua velocidade. Se o feixe passa pela casa delas por
meio segundo, **dissolvem** (+50 pontos) e encolhem até sumir. Se **tocam** em você, você perde **uma** vida (são três), fica
invulnerável por 1,5 s (um contorno **parado** ao redor da imagem; nada pisca) e a sombra que tocou **recua**.

O painel mostra `Vidas ♥♥♥ 3` (os ícones e o número, GDD seção 7), os pontos, os receptores, as portas e quantas sombras há.
Com **H**, a planta mostra, em cada casa, **quantos passos faltam até você**, e cada sombra como um círculo roxo com o
símbolo do estado: `+` nasce, `~` ronda, `!` persegue, `<` recua, `*` dissolve.

> A luz **só ataca**. Ficar em cima do feixe não protege ninguém (GDD, seção 11): o teste está no exercício 5. A tensão do
> jogo é a de sempre, um feixe que é chave e arma: virar um espelho para pegar uma sombra pode tirar a luz do receptor
> e fechar a porta de que você precisa.

---

## 1. Uma sombra é um objeto com estado

*Reusa `shoot-em-up` (uma lista de inimigos que se atualiza) e o catálogo do passo 6.*

Cada sombra vive em `sombras`, uma lista que **muda a cada quadro**: nasce, some. Ela tem o formato de um objeto do passo 6
(`tipo`, `x`, `y`), então `projetarObjetos` a projeta junto com o cristal (`OBJETOS.concat(sombras)`), com z-buffer, névoa e
ordem por distância, sem mudar nada. A novidade é a `escala` (de 0,2 a 1): a sombra **cresce** ao nascer e **encolhe** ao
dissolver, com a base sempre no chão.

```js
{ tipo: "sombra", x, y, estado: "nasce", desde, exposicao: 0, escala: 0.2, alvoX, alvoY, anterior }
```

`desde` é o instante (em segundos **de jogo**) em que entrou no estado. O tempo de jogo, `tempoDeJogo`, é a soma dos `tempo` de
cada quadro, e só passa quando o jogo anda: pausar o laço pausa as sombras, e o teste com relógio falso as vê andar.

---

## 2. A máquina de estados

*Reusa `pacman/06-modos` (os fantasmas trocam de modo). GDD, seção 4.7.*

| Estado | O que faz | Sai quando |
|---|---|---|
| `nasce` | cresce na fenda; não faz nem sofre nada | 1 s → `ronda` |
| `ronda` | anda ao acaso, a 1,2 casa/s | o campo diz "a até 8 passos" → `persegue` |
| `persegue` | desce o campo, a 70% do zelador | o campo não chega, ou chega a mais de 16 → `ronda` |
| `recua` | depois de tocar, sobe o campo (foge) | 1,5 s → `ronda` |
| `dissolve` | encolhe | 0,4 s → sai da lista |

Qualquer estado vivo (`ronda`, `persegue`, `recua`) vai a `dissolve` se a exposição à luz chega a 0,5 s (seção 5). A decisão
fica em `decidirEstado`, uma função pequena que só **olha** o campo e o relógio; o movimento é `andarComASombra`, e o contato,
`verificarContato`. Cada estado tem **um** lugar onde mudar (`mudarDeEstado`), então é fácil achar quem trocou.

**Nascimento.** A fase é dado (`SOMBRAS = { max: 2, intervalo: 12, primeira: 2 }`): a primeira nasce aos 2 s, uma nova a cada
12 s, até 2 ao mesmo tempo, numa fenda `S` a mais de 3 casas de você.

---

## 3. O campo de distância: busca em largura

*Reusa `pacman/06-modos` (a distância até o alvo). GDD, seção 4.7.*

Como a sombra sabe o caminho até você, contornando paredes? Em vez de procurar um caminho **por sombra**, calcula-se um **campo**
**uma vez**: a distância, em passos, de cada casa até o zelador. A busca em largura parte da casa dele com distância 0; uma
**fila** guarda as casas por visitar, e cada vizinha livre ganha a distância de quem a descobriu mais um:

```js
campoDeDistancia[origem] = 0;  fila = [origem];
while (há casas na fila) { atual = tira a primeira;
    para cada vizinha livre ainda sem número: campoDeDistancia[vizinha] = campoDeDistancia[atual] + 1; põe na fila }
```

Como a fila é visitada na ordem de chegada, todas as casas a 1 passo vêm antes das de 2 passos: **o primeiro número que uma
casa recebe já é o menor**. Casas que a busca não alcança ficam com `-1` (a sala da porta fechada, por exemplo). A porta fechada
é parede para a busca, então o campo **contorna**; quando a porta abre ou fecha, `versaoDasPortas` sobe e o campo é refeito.
Fora isso, ele só é refeito quando o zelador **troca de casa** (`atualizarCampo`): 192 casas, uma vez por troca, e **todas** as
sombras usam o mesmo.

É um `Int16Array` por cima da grade (o mesmo `linha × COLUNAS + coluna` do receptor aceso), e é o que o **H** desenha.

---

## 4. Descer o campo

Perseguir é: na casa em que está, olhar as quatro vizinhas livres e ir para a de **menor número** (`melhorVizinha`). Como o
número cai de 1 em 1 até o `0` da casa do zelador, a sombra chega nele **pelo caminho mais curto**, sem saber de mapa nenhum.
Na casa dele (`0`), ela vai direto ao ponto onde ele está. Recuar é o mesmo com o sinal trocado: **maior** número.

A sombra anda de centro de casa em centro de casa (`alvoX`, `alvoY`) e gasta a distância do quadro (`velocidade × tempo`) em
trechos, para que um quadro lento (o teto é 0,05 s) não a faça pular uma esquina. Rondar é sortear uma vizinha, sem voltar por
onde veio se houver outra saída (`anterior`).

---

## 5. A luz desfaz

*GDD, seção 4.7: "meio segundo força o jogador a segurar o feixe".*

A luz é a lista `luz.segmentos` do passo 7. Uma sombra está **iluminada** se o corpo dela toca o feixe: a distância do centro
dela ao segmento é menor que `RAIO_DA_LUZ + RAIO_DA_SOMBRA` (meia casa de luz mais o corpo). `atualizarExposicao` soma o `tempo`
da sombra enquanto ela está iluminada e **subtrai** quando não está (nunca abaixo de 0); com `SEGUNDOS_PARA_DISSOLVER` (0,5 s),
ela passa a `dissolve`, o jogo soma `PONTOS_POR_SOMBRA` e avisa "Sombra desfeita".

Uma sombra que **cruza** o feixe de lado fica uns 0,7 s dentro da faixa (1,5 casa a 2,1 casas/s): dissolve. Uma que só
**encosta** e sai esfria sem dissolver. E uma que vem **pelo** feixe, de frente, nem chega. Por isso o jogador quer **segurar** o
feixe onde as sombras vão passar, e isso tira a luz do receptor (seção 4 do passo 7).

**A luz nunca protege.** Nada no código pergunta se o zelador está no feixe: o contato (seção 6) não consulta `luz`. É uma
decisão de design (GDD, seção 11) que o teste confere: o zelador em cima do feixe, uma sombra encostando, uma vida a menos.

---

## 6. Vidas, contato e reiniciar

*Reusa `pacman/07-vidas`. GDD, seção 4.8.*

`verificarContato` compara a distância corpo a corpo (`RAIO_DO_CORPO + RAIO_DA_SOMBRA`, 0,5 casa) e, se tocou e o zelador **não**
está invulnerável (`tempoDeJogo < invulneravelAte`), tira **uma** vida, liga a invulnerabilidade de 1,5 s e põe **aquela** sombra
em `recua`. Uma sombra que acabou de tocar não toca de novo, e as outras também não, durante a invulnerabilidade: **um contato
= uma vida**. Sem vidas, `fimDeJogo` é verdadeiro: `atualizar` não anda mais ninguém (só desenha), e o painel diz "Fim de jogo:
R recomeça".

**R** (ou o botão **Reiniciar**) faz o que fazia no passo 7: volta à sala congelada (`sala = salaInicial`), o zelador ao começo, as
portas fechadas, a luz refeita, **e** tira todas as sombras. As **vidas e os pontos ficam**: reiniciar não é um jeito de se curar. Se o
jogo **acabou**, é um jogo novo: 3 vidas, 0 pontos. Cada receptor vale 100 pontos **uma vez** (`receptoresPontuados`), para não dar
para girar um espelho de um lado para o outro e ganhar de novo.

---

## 7. Medir no celular

`quadroAQuadro` guarda o tempo do último quadro (atualizar + desenhar), em milissegundos, em `ultimoTempoDeQuadro`; a linha "agora"
do H mostra a média móvel (`msAoVivo`). Só a técnica B do passo 5 existe: ela é a única. A medição de um celular de verdade é o
próximo trabalho (GDD, seção 12); este passo só deixa o número à mão.

---

## Experimente

1. Pare de frente para um corredor e deixe uma sombra vir. Quantos passos de campo ela tem quando passa de `ronda` para
   `persegue`? Mude `RAIO_DE_PERCEPCAO` para 3 e para 20.
2. Mude `PROPORCAO_DA_VELOCIDADE` para 1,2 e fuja. O que muda no jogo? E se ela for 0,3: ainda dá para desfazer uma sombra só
   com o feixe?
3. Aperte **H** e ande: os números do campo mudam quando você troca de casa, e não quando a sombra anda. Por quê? Abra e feche a
   porta e veja o outro lado ganhar e perder números.
4. Em `melhorVizinha`, troque `descendo` por `!descendo`. Quem foge de quem? O que isso diz sobre o campo ser a única informação
   de que a sombra precisa?
5. **Teste a regra do GDD:** fique em cima do feixe (o trecho que desce do espelho `(3, 5)`) e deixe uma sombra tocar em você. Perde a
   vida? Agora imagine uma versão em que não perdesse: por que o jogo ficaria sem tensão?
6. Troque `SEGUNDOS_PARA_DISSOLVER` por 0,1 e depois por 2. Em qual deles o feixe ainda é uma arma *e* uma chave?
7. Mude `SOMBRAS.max` para 4. Com a porta fechada, o campo alcança as sombras que nascem na fenda do leste?
   O que elas fazem? (Dica: leia `passosDaCasa`.)
8. Dê a cada sombra uma `velocidade` própria (um campo em cada objeto) e faça as que nascem depois serem mais rápidas, como as
   fases do GDD (seção 5).

---

**Anterior:** [`07-espelhos`](../07-espelhos/) · **Próximo:** `final` — as fases como dados, a validação por busca, o menu, a pausa, o som, o recorde e as opções.
