# Tetris — passo final

**Anterior:** [`08-velocidade`](../08-velocidade/)
**Rode:** abra o `index.html`.
**Controles:** ← → mover · ↑ ou X girar · Z girar ao contrário · ↓ descer · Espaço derrubar ·
C guardar · P ou Esc pausar. Num celular, aparecem botões de toque.

Este é o fim da trilha e também o material de referência: o código está comentado, e este
guia reúne todos os conceitos do módulo. No fim há 15 exercícios.

## O que mudou do passo 8 para aqui

Nenhuma regra da queda, da colisão ou da rotação. Só o acabamento:

| | Passo 8 | Final |
|---|---|---|
| Estados | `menu`, `jogando`, `fim` | + `pausado` (P, Esc, ou ao trocar de janela) |
| Linhas completas | somem na hora | piscam por 0,3 s, depois somem |
| Guardar peça | — | C troca a peça atual pela guardada, uma vez por peça |
| Entrada | `switch` de teclas | tabela tecla → comando; teclado e toque usam os mesmos comandos |
| Som | — | bipes e arpejos sintetizados |
| Recorde | — | salvo no navegador com `localStorage` |
| Layout | poço + painel | grade de três colunas; no celular, outra figura |

---

## Por que este módulo vem depois do Pong

A cobrinha vivia numa grade. O Pong abandonou a grade e trouxe o tempo contínuo. O Tetris
**junta os dois**: posições inteiras numa grade, e um loop com delta time por baixo.

| | Cobrinha | Pong | Tetris |
|---|---|---|---|
| Posição | `{coluna, linha}` | `x: 73.42` | `{coluna, linha}` |
| Mundo | uma lista de pedaços | três objetos | **uma matriz** |
| Loop | `setInterval` | `requestAnimationFrame` | `requestAnimationFrame` + acumuladores |
| Colisão | igualdade | sobreposição (AABB) | "cabe?" — testar antes de mover |
| Entrada | última tecla | teclas presas | os dois, cada um na sua ação |

A grande novidade é que **o mundo é a matriz**. Quando uma peça para, ela deixa de existir
como objeto e vira casas do poço.

---

## 1. Matriz: um array de arrays

```js
poco[linha][coluna]   // null = vazio; "T", "I"… = ocupado
```

Primeiro a linha (y), depois a coluna (x) — o contrário do hábito da matemática.

```js
Array.from({ length: LINHAS }, () => criarLinhaVazia())   // certo
new Array(LINHAS).fill(criarLinhaVazia())                 // ERRADO: 20 nomes para 1 linha
```

O poço guarda a **letra** da peça, não a cor. A cor é consultada no catálogo na hora de
desenhar: o que a coisa é, separado de como ela aparece.

---

## 2. Peças são dados

```js
T: { cor: "#c46bff", forma: [[0, 1, 0], [1, 1, 1], [0, 0, 0]] }
```

Uma função desenha qualquer peça, uma decide se qualquer peça cabe, uma gira qualquer
peça. Acrescentar uma oitava peça é acrescentar uma linha no catálogo.

Todas as formas são **quadradas**, e o I fica na segunda linha do seu 4×4. Parecia
desperdício no passo 2; no passo 5, é o que faz a rotação funcionar sem casos especiais.

E a soma que aparece em todo lugar:

```js
peca.coluna + x,  peca.linha + y   // posição da peça + posição na matriz
```

---

## 3. Testar antes de mover

```js
function cabe(forma, coluna, linha) { ... }   // só responde; nunca muda nada
```

No Pong, a bola entrava na parede e era empurrada de volta. Aqui a pergunta vem **antes**,
e a peça que não caberia simplesmente fica onde está. Nada a desfazer.

Repare quantas coisas diferentes são essa mesma pergunta:

| Quem pergunta | Pergunta |
|---|---|
| `moverPeca` | caberia uma casa para o lado / para baixo? |
| `girarPeca` | a forma girada caberia aqui? E um pouco ao lado? E acima? |
| `derrubarPeca` | caberia mais uma linha abaixo? (repetido até não caber) |
| `linhaDoFantasma` | a mesma, sem mover nada |
| `estaNoChao` | caberia uma linha abaixo? |
| `nascerPeca` | a peça nova cabe no topo? Se não, fim de jogo |

> **Uma função que só responde pode ser chamada com qualquer hipótese, quantas vezes for
> preciso.** É essa propriedade que deixa a rotação testar seis posições antes de escolher.

A parede e o chão não são objetos: são o **fim da grade**.

---

## 4. Tempo contínuo, movimento em passos

```js
acumuladorDeQueda += tempo;
while (acumuladorDeQueda >= intervalo) {
    acumuladorDeQueda -= intervalo;   // subtrair, não zerar
    moverPeca(0, 1);
}
```

O loop entrega frações de segundo; a peça só anda casas inteiras. O acumulador junta o
tempo e o gasta em passos. **Subtrair** o intervalo (em vez de zerar) não joga sobras fora.

O mesmo truque aparece três vezes no jogo, com usos diferentes:

| Relógio | Conta | Quando estoura |
|---|---|---|
| `acumuladorDeQueda` | para cima | a peça desce uma linha |
| `tempoAteRepetir` | para baixo | a peça anda uma casa para o lado (← → presas) |
| `tempoNoChao` | para cima | a peça trava |

E um quarto, mais simples: `tempoDaLimpeza`, que segura as linhas piscando.

---

## 5. Girar uma matriz, e os empurrões

```js
horário:      nova[y][x] = antiga[n - 1 - x][y]
anti-horário: nova[y][x] = antiga[x][n - 1 - y]
```

A coluna `x`, lida de baixo para cima, vira a linha `x`. O `map` cria arrays **novos**: o
catálogo nunca é alterado (girar no lugar estragaria todas as peças futuras do mesmo tipo).

Se a forma girada não cabe, o jogo tenta uma lista de **empurrões** — `[0,0]`, um para cada
lado, dois para cada lado, um para cima — e fica com o primeiro que servir. A lista é dados:
mudar a estratégia é editar uma linha.

---

## 6. Limpar é filtrar

```js
const restantes = poco.filter(linha => linha.includes(null));
while (restantes.length < LINHAS) restantes.unshift(criarLinhaVazia());
```

Nenhuma casa é movida: as linhas acima "descem" porque mudaram de posição na lista. E o
`filter` não pula índices, porque não altera a lista enquanto a percorre — o bug clássico
do `splice` dentro de um `for`.

> **Escolha a estrutura de dados pela operação que você mais vai fazer.** Uma lista de
> linhas faz de "tirar uma linha" uma operação natural.

---

## 7. Aleatório justo: o saco de sete

```js
if (saco.length === 0) saco = embaralhar([...TIPOS]);
return saco.pop();
```

Cada sete peças, uma de cada; nunca mais de 12 peças sem um I. E o embaralhar é o de
Fisher-Yates — `sort(() => Math.random() - 0.5)` **não** é justo.

> Aleatoriedade é ferramenta de design: você escolhe quanto acaso o jogador aguenta.

---

## 8. Justiça na velocidade

O jogo chega a quase 60 linhas por segundo. Quatro mecanismos o mantêm justo:

1. **Peça fantasma** — mostra onde a peça vai cair. Não facilita: torna o erro visível
   antes de acontecer.
2. **Repetição própria** — ← e → repetem nos tempos do jogo (0,17 s de espera, depois 20 por
   segundo), não nos do sistema operacional, que variam de máquina para máquina.
3. **Tempo para travar** — meio segundo no chão, renovado a cada movimento, até 15 vezes.
   Só uma linha mais funda devolve os adiamentos.
4. **Ver a próxima e guardar uma** — informação e uma saída de emergência, com limite: uma
   troca por peça.

O item 3 tem uma história: a primeira versão deixava girar no chão para sempre, e foi um
teste automático que achou a brecha (veja o guia do passo 8).

> **Toda regra que dá vantagem ao jogador precisa de um teto, e o teto precisa ser testado
> por alguém tentando quebrá-lo.**

---

## 9. Comandos: teclado e toque pela mesma porta

```js
const TECLAS = { arrowleft: "esquerda", a: "esquerda", " ": "derrubar", c: "guardar", ... };
```

```html
<button data-comando="esquerda">←</button>
```

O jogo não conhece teclas nem botões: conhece **comandos**. O teclado traduz pela tabela;
os botões de toque dizem o seu comando num atributo `data-*`. Os dois chamam as mesmas
`pressionar` e `soltar`.

Acrescentar um atalho é uma linha na tabela. Acrescentar um controle de videogame seria
outra porta de entrada que chama as mesmas funções — sem tocar no jogo.

### Soltar de todos os jeitos

```js
["pointerup", "pointerleave", "pointercancel"].forEach(...)
window.addEventListener("blur", ...)
```

Um comando que é **apertado** de um jeito pode ser **solto** de vários: dedo levantado,
dedo que escorregou para fora do botão, gesto cancelado pelo sistema, janela que perdeu o
foco. Esquecer um deles deixa uma peça deslizando sozinha.

E trocar de janela no meio da partida **pausa** o jogo — ninguém deveria perder por causa de
uma notificação.

---

## 10. A máquina de estados

```js
let estado = "menu";   // "menu" | "jogando" | "pausado" | "fim"
```

O pisca-pisca das linhas **não** virou um estado: é um temporizador dentro de `"jogando"`.
Por isso pausar no meio dele congela o pisca-pisca também, sem uma linha de código a mais —
o loop simplesmente não chama `atualizar`.

Fora de `"jogando"` e `"pausado"`, o teclado nem cancela as teclas: o Espaço e o Enter
continuam acionando os botões da página.

---

## 11. Recorde com `localStorage`

```js
function lerRecorde() {
    try {
        const valor = Number(localStorage.getItem(CHAVE_DO_RECORDE));
        return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : 0;
    } catch (erro) {
        return 0;
    }
}
```

Duas precauções que valem para qualquer coisa salva no navegador:

1. **`try/catch`** — em janela anônima ou com o armazenamento bloqueado, o acesso **lança
   um erro**. Um recorde que não salva não pode derrubar o jogo.
2. **Desconfiar do que se lê** — o valor pode ser lixo. `Number("abc")` é `NaN`; só um
   número finito e positivo é aceito.

---

## 12. Som agendado

```js
oscilador.start(contextoDeAudio.currentTime + atraso);
```

O mesmo oscilador do Pong, com uma diferença: o bipe pode ser **agendado** no relógio do
áudio. Três bipes com atrasos de 0, 0,07 e 0,14 viram um arpejo, sem `setTimeout` — e com
precisão de amostra, não de quadro.

Mais linhas, arpejo mais longo: o som conta a jogada antes de o olho chegar ao placar.

---

## 13. Layout por figura

```css
grid-template-areas: "esquerdo tela direito";
```

O layout desenhado com nomes, dentro do CSS. No celular, os painéis recebem
`display: contents` — deixam de ser caixas, e os filhos passam a ser itens da grade —, e as
seis caixas se arrumam em duas linhas de três acima do poço. O HTML não muda.

Os botões de toque aparecem com `@media (hover: none) and (pointer: coarse)`: a pergunta é
**como o aparelho é usado**, não o tamanho da tela.

---

## Exercícios

### Ajustar

1. Mude `TEMPO_PARA_TRAVAR` para `0` e jogue no nível 8 (comece nele mudando
   `nivel = 1` em `iniciarPartida`). Depois para `2`. Qual é o valor certo, e por quê?
2. Tire a peça fantasma. Jogue cinco minutos. Ponha de volta.
3. Mude a tabela de pontos para que duas linhas valham mais que um "tetris". Como isso muda
   a forma de jogar?
4. Troque a paleta das peças inteira. Quantas linhas de código mudaram?

### Construir

5. **Três próximas** em vez de uma. O saco precisa ser enchido antes de esvaziar.
6. **Lixo que sobe**: a cada 30 segundos, uma linha cinza com um buraco aleatório entra
   pelo fundo e empurra o poço para cima. Dica: `poco.shift()` e `poco.push(...)`.
7. **Modo 40 linhas**: um cronômetro corre até o jogador limpar 40 linhas; o recorde passa
   a ser o **menor** tempo.
8. **Contagem regressiva** de 3 segundos antes de a partida começar e ao sair da pausa.
9. **Texto flutuante**: "TETRIS!" ou "+800" sobe e some acima das linhas limpas. Pode ser
   HTML posicionado sobre o canvas (como as mensagens) ou texto desenhado no canvas.
10. **Música**: agende a melodia de *Korobeiniki* (canção folclórica russa, em domínio
    público) com o mesmo `tocarSom` e um atraso por nota. Uma tabela `[frequência, duração]`
    resolve.
11. **Toque por gestos**: arrastar o dedo sobre o poço move a peça, um toque rápido gira e
    um arraste para baixo derruba. Use pointer events e a conversão de escala do canvas
    (`getBoundingClientRect`).

### Difícil

12. **Super Rotation System**: troque a lista única de empurrões pela tabela oficial, com
    uma lista por peça e por par de rotações (0→1, 1→2...). Você vai precisar guardar em
    que rotação a peça está.
13. **T-spin**: detecte quando um T trava logo depois de uma rotação, com três dos quatro
    cantos do seu 3×3 ocupados, e pague mais por isso.
14. **Dois jogadores**, cada um com o seu poço, lado a lado. Limpar duas ou mais linhas
    manda linhas de lixo para o poço do outro. Dica: tudo o que hoje é variável solta vira
    campo de um objeto `jogador`.
15. **Um robô que joga**: para cada peça, teste todas as rotações e colunas com `cabe` e a
    queda instantânea **numa cópia do poço**, dê uma nota a cada resultado (altura, buracos,
    linhas limpas) e escolha a melhor. É o minimax — que o módulo de xadrez desenvolve mais adiante — com uma profundidade só.

---

## O que você levou daqui

Matrizes e a armadilha da referência, formas como dados, testar antes de mover, acumuladores
de tempo, rotação de matriz, filtrar em vez de remover, aleatório justo com Fisher-Yates,
curva de dificuldade como tabela, repetição de tecla própria, tempo para travar com teto,
comandos que unem teclado e toque, `localStorage` à prova de falhas, som agendado e layout
com `grid-template-areas`.

A matriz e o "cabe?" servem para qualquer jogo de grade: campo minado, 2048, Sokoban,
Puyo Puyo, jogos de combinar três.

---

**Anterior:** [`08-velocidade`](../08-velocidade/) · **Módulo:** [`README.md`](../README.md)

**Pré-requisito:** [`../../pong`](../../pong/) · **Antes:** [`../../pong`](../../pong/) · **Depois:** [`../../dealer-out`](../../dealer-out/) · **Índice:** [`../../README.md`](../../README.md)
