# Do zero ao jogo — HTML, CSS e JavaScript

Um curso completo em quatro módulos, do primeiro `<h1>` a um programa de xadrez que joga
contra você.

**Nenhuma instalação.** Nenhum framework, nenhum `npm install`, nenhum servidor. Todo
arquivo aqui abre com um duplo clique no navegador.

---

## Os módulos, em ordem

### 1. [`tutorial/`](tutorial/) — as três linguagens

Cinco lições para quem nunca escreveu código. Termina com uma lista de tarefas que salva
no navegador.

| Lição | Assunto |
|---|---|
| [`01-html`](tutorial/01-html/) | tags, árvore, atributos, formulários, semântica |
| [`02-css`](tutorial/02-css/) | seletores, cascata, box model, flexbox, grid, responsivo |
| [`03-javascript`](tutorial/03-javascript/) | variáveis, tipos, laços, funções, arrays, objetos |
| [`04-dom`](tutorial/04-dom/) | o JavaScript mexendo na página; eventos |
| [`05-projeto`](tutorial/05-projeto/) | tudo junto: uma lista de tarefas de verdade |

### 2. [`jogo-da-cobrinha/`](jogo-da-cobrinha/) — construir um jogo, passo a passo

Dez passos, cada um acrescentando uma ideia. É aqui que entram o `<canvas>` e o game loop.

Cada passo é uma pasta que roda sozinha: você vê o jogo nascer, do primeiro quadrado
parado até a versão pixelada completa. Termina com **37 exercícios** que preparam para o
módulo seguinte.

### 3. [`pong/`](pong/) — movimento contínuo e física

Oito passos. Onde a grade acaba: posições fracionárias, vetores de velocidade,
`requestAnimationFrame`, delta time, colisão AABB, ricochete com ângulo, dois jogadores no
mesmo teclado e um oponente controlado por código.

### 4. [`xadrez/`](xadrez/) — regras complexas e um computador que pensa

Oito passos. Sem física, sem reflexo: o desafio vira o do software profissional — regras
cheias de exceção, um programa grande demais para um arquivo só, e um adversário que
decide, com minimax e poda alfa-beta.

Também mostra que nem todo jogo precisa de canvas: o tabuleiro são 64 botões numa grade
de CSS, jogáveis por teclado e legíveis por leitor de tela.

---

## Como estudar

1. Abra o `index.html` e **use** o que está ali.
2. Leia o `GUIA.md` da pasta.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. **Não pule esta parte:** é onde o conhecimento sai do papel.

Mantenha o **F12** aberto o tempo todo. Ler um erro é uma habilidade tão importante quanto
escrever código.

> Antes de mexer numa pasta, faça uma cópia. Depois estrague o que quiser: apague linhas,
> troque números, inverta a ordem das coisas. **Ver o código quebrar de um jeito que você
> previu ensina mais do que vê-lo funcionar.**

---

## O que atravessa o curso inteiro

**Três linguagens, três papéis.** HTML diz *o que existe*, CSS diz *como aparece*, JS diz
*o que acontece*. Quando se misturam, ninguém sabe mais onde procurar.

**Estado real e estado visível.** Os dados moram em variáveis; a tela é só o espelho.
O fluxo corre numa direção só: `evento → muda o estado → redesenha`. Nunca se lê a tela
para saber o que é verdade.

**Separe o que a coisa É do jeito como ela APARECE.** A cobrinha guarda `{coluna, linha}`,
não pixels — e é por isso que trocar o visual inteiro no último passo não altera uma
única regra do jogo.

**Escolha a ferramenta pelo problema.** Canvas para pintura que muda 60 vezes por segundo;
HTML para peças discretas e clicáveis. O xadrez não usa canvas, e ganha acessibilidade e
navegação por teclado de graça.

**Correto primeiro, rápido depois.** E só depois de medir.

**Acessibilidade não é enfeite.** `alt`, `<label>` ligado ao campo, foco visível,
`aria-label`. Cada um custa uma linha e decide se alguém consegue ou não usar o que você
fez.

---

## Trinta e cinco passos, todos executáveis

| Módulo | Passos | Formato |
|---|---|---|
| tutorial | 5 lições | uma linguagem por vez |
| jogo-da-cobrinha | 9 passos + final | do primeiro quadrado ao pixel art |
| pong | 8 passos + final | do retângulo parado ao adversário automático |
| xadrez | 8 passos + final | do tabuleiro vazio ao minimax com poda |

Cada pasta é **independente e roda sozinha**. Você pode abrir qualquer uma, quebrar tudo, e
continuar na seguinte sem prejuízo.

---

## Verificação

O código deste curso foi testado, não só escrito:

- os scripts de **todos os passos** rodam num DOM simulado, com as invariantes conferidas
  (nada sai da tela, o estado se mantém coerente, a interação produz o lance certo);
- a física do Pong foi simulada por 90 segundos em cada passo: teto de velocidade
  respeitado, nada atravessa nada, nenhuma raquete escapa;
- o gerador de movimentos do xadrez passa no **perft** em cinco posições padrão, incluindo
  as clássicas de armadilha — 197.281 posições conferidas na profundidade 4 a partir da
  posição inicial;
- as 134 referências entre arquivos foram checadas uma a uma.
