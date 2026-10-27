# Do zero ao jogo — HTML, CSS e JavaScript

Um curso completo em nove módulos, do primeiro `<h1>` a um programa de xadrez que joga contra
você e a um metroidvania gerado a partir de uma semente.

**Nenhuma instalação.** Nenhum framework, nenhum `npm install`, nenhum servidor. Todo arquivo aqui
abre com um duplo clique no navegador.

---

## A trilha, em ordem

Cada módulo é um jogo (o primeiro é a base de tudo) e cada passo é uma pasta que roda sozinha.
A coluna da direita diz o **mínimo** que você precisa ter feito antes.

| # | Módulo | Entra de novo | Pré-requisito mínimo |
|---|---|---|---|
| 0 | [`tutorial`](tutorial/) | HTML, CSS, JS, DOM | nenhum |
| 1 | [`jogo-da-cobrinha`](jogo-da-cobrinha/) | canvas, game loop, grade | tutorial |
| 2 | [`pong`](pong/) | tempo contínuo (rAF + dt), AABB, máquina de estados | cobrinha |
| 3 | [`tetris`](tetris/) | matriz, acumuladores, imutabilidade, dados como tabela | pong |
| 4 | [`dealer-out`](dealer-out/) | listas vivas, catálogos, temporizadores, toque, GDD, vários arquivos | pong (tetris recomendado) |
| 5 | [`shoot-em-up`](shoot-em-up/) | trigonometria, círculos, muitos × muitos, roteiro, chefe | dealer-out |
| 6 | [`pacman`](pacman/) | grade + deslize, IA por alvos, busca em largura | tetris, dealer-out |
| 7 | [`xadrez`](xadrez/) | regras complexas, DOM no lugar de canvas, minimax e alfa-beta | pong (pacman recomendado) |
| 8 | [`xenomorph`](xenomorph/) | física de plataforma, geração procedural com semente, progressão | pacman, shoot-em-up |

### Por que esta ordem

- **Tetris antes do Dealer? Out!** Os dois só pedem o Pong, mas o Tetris é a rampa mais suave: volta
  à grade da cobrinha, com o loop do Pong por baixo, e acrescenta uma ideia por vez. O Dealer? Out!
  já espera que você lide com dezenas de objetos, vários arquivos e um documento de design.
- **Xadrez depois do Pac-Man.** A inteligência dos adversários cresce degrau a degrau: uma **regra
  reativa** (o computador do Pong), depois **alvos** (os fantasmas do Pac-Man), depois **busca em
  grafo** (a busca em largura) e, por fim, **busca em árvore de jogo** (minimax com poda). O xadrez só
  exige o Pong de verdade; quem estiver curioso pode fazê-lo antes.
- **Shoot 'em up depois do Dealer? Out!**, porque reusa listas vivas, catálogos e temporizadores sem
  explicá-los de novo. **Xenomorph por último**, porque junta quase tudo o que veio antes.

Os guias dizem de onde vem cada peça; o índice [`CONCEITOS.md`](CONCEITOS.md) reúne tudo numa
consulta só: conceito, onde se aprende, onde se reusa.

---

## Os módulos

### 0. [`tutorial/`](tutorial/) — as três linguagens

Cinco lições para quem nunca escreveu código: HTML, CSS, a linguagem JavaScript, o DOM e um projeto
final, uma lista de tarefas que salva no navegador.

### 1. [`jogo-da-cobrinha/`](jogo-da-cobrinha/) — construir um jogo, passo a passo

Nove passos e um final. É aqui que entram o `<canvas>` e o game loop: do primeiro quadrado parado até
a versão pixelada completa. O guia final traz **37 exercícios**.

### 2. [`pong/`](pong/) — movimento contínuo e física

Oito passos e um final. Onde a grade acaba: posições fracionárias, vetores de velocidade,
`requestAnimationFrame`, delta time, colisão AABB, ricochete com ângulo, dois jogadores no mesmo
teclado e um oponente controlado por código.

### 3. [`tetris/`](tetris/) — de volta à grade

Oito passos e um final. O mundo vira uma matriz, as peças são dados, o tempo passa em acumuladores e
tudo o que se testa, testa-se antes de mover. Termina com níveis, peça fantasma, recorde e controles
de toque.

### 4. [`dealer-out/`](dealer-out/) — do documento de design ao jogo

Nove passos e um final, construídos a partir de um [documento de design](dealer-out/dealer-out_gdd.md)
escrito antes do código. Objetos que nascem e morrem, catálogos de dados, temporizadores, combos,
poderes, dificuldade progressiva, teclado e toque como a mesma intenção. O final se divide em arquivos
por assunto.

### 5. [`shoot-em-up/`](shoot-em-up/) — muitos contra muitos

Oito passos e um final. Coordenadas pelo centro, trajetos por seno, colisão entre círculos, tiros
mirados com `atan2`, a fase escrita como roteiro e uma nave-mãe com fases.

### 6. [`pacman/`](pacman/) — a grade, o deslizar e quatro fantasmas

Oito passos e um final. Um labirinto escrito como texto, movimento por pixels sobre uma grade e
fantasmas com uma regra só e alvos diferentes, que juntos parecem um plano. A busca em largura
aparece para os olhos dos fantasmas voltarem para casa.

### 7. [`xadrez/`](xadrez/) — regras complexas e um computador que pensa

Oito passos e um final. Sem física, sem reflexo: o desafio é o do software profissional, com regras
cheias de exceção, um programa grande demais para um arquivo só e um adversário que decide, com
minimax e poda alfa-beta.

Também mostra que nem todo jogo precisa de canvas: o tabuleiro são 64 botões numa grade de CSS,
jogáveis por teclado e legíveis por leitor de tela.

### 8. [`xenomorph/`](xenomorph/) — um planeta a partir de uma semente

Nove passos e um final, também a partir de um [documento de design](xenomorph/xenomorph_gdd.md). Física
de plataforma (o soldado tem peso), um planeta gerado por uma semente e conferido antes de jogar,
três espécies com máquinas de estado, uma chefe e uma base onde a campanha continua depois de cada
morte.

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

**Dados no lugar de código.** Formas de peças, catálogos de objetos, tabelas de pontos e de
velocidade, o roteiro de uma fase, os modos dos fantasmas: quando uma regra vira uma tabela, mudar o
jogo é mudar um número, não reescrever uma função. Aparece no Tetris, no Dealer? Out!, no Shoot 'em
up, no Pac-Man e no Xenomorph.

**Mostre o invisível.** Caixas de colisão, o alvo de cada fantasma, o estado de cada criatura: o que
você não vê, você não consegue depurar. Nos quatro módulos mais recentes a tecla **H** liga essa
visão (Dealer? Out!, Shoot 'em up, Pac-Man e Xenomorph).

**O que vem de fora, confira.** O `localStorage` pode estar vazio, bloqueado ou com lixo. Lê-se
dentro de `try/catch` e campo a campo, do projeto do tutorial ao Xenomorph.

**Correto primeiro, rápido depois.** E só depois de medir.

**Acessibilidade não é enfeite.** `alt`, `<label>` ligado ao campo, foco visível,
`aria-label`. Cada um custa uma linha e decide se alguém consegue ou não usar o que você
fez.

---

## Oitenta pastas, todas executáveis

| Módulo | Passos | Formato |
|---|---|---|
| tutorial | 5 lições | uma linguagem por vez |
| jogo-da-cobrinha | 9 passos + final | do primeiro quadrado ao pixel art |
| pong | 8 passos + final | do retângulo parado ao adversário automático |
| tetris | 8 passos + final | do poço vazio aos níveis, ao recorde e ao toque |
| dealer-out | 9 passos + final | da tela parada ao arcade instalável |
| shoot-em-up | 8 passos + final | do céu rolando à nave-mãe |
| pacman | 8 passos + final | do labirinto em texto aos quatro fantasmas |
| xadrez | 8 passos + final | do tabuleiro vazio ao minimax com poda |
| xenomorph | 9 passos + final | da sala parada ao ciclo de expedições |

São 72 passos numerados (5 lições + 67 passos de jogo) e 8 pastas `final`. Cada pasta é
**independente e roda sozinha**. Você pode abrir qualquer uma, quebrar tudo, e continuar na seguinte
sem prejuízo.

---

## Verificação

Os módulos `tetris`, `dealer-out`, `shoot-em-up`, `pacman`, `xadrez` e `xenomorph` trazem, no próprio
`README.md`, uma seção "Verificação" com o que foi conferido neles: simulações de física e de jogo,
robôs apertando teclas ao acaso, geração de mapas validada e, no xadrez, o teste de regras chamado
perft. Leia lá o que cada afirmação cobre e o que ficou de fora.

O `tutorial`, a `jogo-da-cobrinha` e o `pong` não têm essa seção; o que se garante neles é que cada
pasta abre por `file://` e roda sozinha.
