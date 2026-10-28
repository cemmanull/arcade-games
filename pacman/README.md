# Pac-Man — a grade, o deslizar e quatro fantasmas

Oito passos, de um labirinto escrito como texto até o jogo completo, com quatro fantasmas de
personalidades diferentes, modos, fases, frutas, som, recorde e controle por deslize.

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-labirinto`](01-labirinto/) | o labirinto | mapa como texto, conferir dados, paredes deduzidas dos vizinhos, `arc` |
| 2 | [`02-movimento`](02-movimento/) | o Pac-Man anda | pixels e grade juntos, decidir nos centros, intenção guardada, `EPSILON`, túnel |
| 3 | [`03-pastilhas`](03-pastilhas/) | comer | o mapa muda, contar uma vez e descontar, recomeçar de uma cópia |
| 4 | [`04-fantasma`](04-fantasma/) | um perseguidor | a regra do cruzamento, andar separado de decidir, funções como argumento |
| 5 | [`05-personalidades`](05-personalidades/) | quatro fantasmas | alvos como funções, comportamento emergente, a casa com regras próprias |
| 6 | [`06-modos`](06-modos/) | dispersar, perseguir, fugir | tabela de horários, meia-volta como aviso, busca em largura |
| 7 | [`07-vidas`](07-vidas/) | um jogo de verdade | máquina de estados do jogo, durações como dados, recomeços aninhados |
| 8 | [`08-niveis`](08-niveis/) | fases e frutas | a ficha da fase, velocidades como frações, válvulas de escape |
| — | [`final`](final/) | menu, pausa, som, recorde, deslize | o guia completo, com 15 exercícios |

---

## Por que este módulo vem depois do Tetris e do Shoot 'em up

Ele junta quase tudo:

| | De onde vem |
|---|---|
| o mundo é uma matriz | Tetris |
| deslizar com delta time | Pong |
| colidir por igualdade de casa | cobrinha |
| tabelas no lugar de código | Tetris |
| máquina de estados | todos |

E acrescenta **inteligência de jogo de ação**: não a do módulo de xadrez, mais adiante, que pensa lances à frente, mas
regras de uma linha que, juntas, parecem um plano. Quatro fantasmas, a mesma regra, alvos
diferentes — e eles cercam.

**Pré-requisito:** o Tetris (que já depende do Pong). Vir depois do Shoot 'em up ajuda, mas não é obrigatório.

---

## O labirinto

Desenho próprio deste curso, inspirado no do jogo original: 28 × 30 casas, simétrico, com túnel, uma
casa para os fantasmas, 234 pastilhas e 4 energizantes. Antes de virar código, foi conferido por um
script: todos os corredores se ligam e **não há nenhum beco sem saída** (num jogo de perseguição, um
beco é uma armadilha sem escapatória).

---

## Verificação

Como os outros módulos, este foi testado, não só escrito. Cada passo rodou num navegador real, sem
interface, com o loop movido quadro a quadro por um script:

- **nenhum erro** de console em nenhum dos nove passos;
- um robô apertando setas ao acaso por 30.000 quadros em cada passo jogável: o Pac-Man e os fantasmas que
  estão no labirinto **nunca** ocupam uma parede e nunca saem da linha central dos corredores; o
  túnel funciona; mais de 220 casas diferentes visitadas em cada um;
- comer as 238 pastilhas dá 2.540 pontos, faz o labirinto piscar e o refaz cheio;
- um fantasma sozinho alcança um Pac-Man parado num canto em 4 segundos;
- os quatro saem da casa nos tempos certos (0, 1, 5 e 9 s), e os alvos batem com as regras num
  cenário fixo (rosa 4 casas à frente, ciano no dobro da seta do vermelho, laranja no canto quando
  perto);
- os modos trocam aos 7, 27, 34, 54 e 59 segundos; quatro fantasmas comidos num susto valem 3.000;
  os olhos voltam e revivem em menos de 3 segundos; a busca em largura alcança todas as casas
  livres (a mais distante da porta está a 35 passos);
- vidas: ser pego mantém as pastilhas comidas; na terceira vez, fim; reiniciar zera tudo; limpar o
  labirinto passa para a fase 2 com 238 pastilhas;
- níveis: as velocidades seguem a tabela (60 → 67,5 → 75 px/s para o Pac-Man), o fantasma no túnel
  cai para 30 px/s, a fruta aparece na 70ª pastilha, vale o que a tabela diz e some sozinha;
- no final: pausar durante o "Pronto!" volta para o "Pronto!", a pausa congela tudo, trocar de
  janela pausa, um deslize em "L" dá duas intenções, a vida extra vem uma vez só aos 10.000, o
  recorde é salvo e um `localStorage` com lixo não quebra nada;
- numa tela de celular (390×750), placar, labirinto e botões cabem sem rolar.

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Vários pedem para você quebrar o código de propósito.
5. Use a tecla **H** sem medo: ver o que os fantasmas pensam é metade da aula.

Antes de mexer numa pasta, faça uma cópia.

---

**Pré-requisito:** [`../tetris`](../tetris/) · **Antes:** [`../shoot-em-up`](../shoot-em-up/) · **Depois:** [`../xadrez`](../xadrez/) · **Índice:** [`../README.md`](../README.md)
