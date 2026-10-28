# Shoot 'em up — muitos contra muitos

Oito passos, de um céu rolando até um jogo de nave completo, com roteiro de fase, chefe com
três fases, armas, bomba, recorde e controles de toque.

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-ceu`](01-ceu/) | o céu rola | o centro em vez do canto, rolagem calculada com `%`, paralaxe |
| 2 | [`02-nave`](02-nave/) | a nave voa | intenção em dois eixos, o bug da diagonal, normalizar |
| 3 | [`03-tiros`](03-tiros/) | segure para atirar | cadência, o acumulador que não pode acumular crédito |
| 4 | [`04-inimigos`](04-inimigos/) | três jeitos de voar | posição como função do tempo, seno, curvas de suavização |
| 5 | [`05-colisao`](05-colisao/) | os tiros acertam | círculos, muitos contra muitos, marcar e varrer, mostrar o invisível |
| 6 | [`06-contra-ataque`](06-contra-ataque/) | eles atiram de volta | `atan2`, leque e anel, perder com justiça |
| 7 | [`07-roteiro`](07-roteiro/) | a fase vira coreografia | dados para pessoas × dados para a máquina, `sort`, cursor |
| 8 | [`08-chefe`](08-chefe/) | a nave-mãe | máquina de estados numa entidade, fases pela vida, telegrafar, `<progress>` |
| — | [`final`](final/) | menu, pausa, som, recorde, armas, foco, bomba, toque, voltas | o guia completo, com 15 exercícios |

---

## Por que este módulo vem depois do Tetris

O Tetris deu o chão: tempo contínuo com acumuladores, dados em tabelas, a máquina de estados, o
recorde no `localStorage`. Mas o mundo dele cabia numa **matriz**, e a peça que para deixa de
ser objeto. Aqui o mundo é feito de objetos que **vivem e morrem em listas** (tiros, inimigos,
balas, faíscas), cada um com posição própria. Os primeiros passos ensinam essa vida em lista, o
catálogo de tipos e os temporizadores; o resto gasta os passos no que um jogo de nave exige a
mais:

| | Tetris | Shoot 'em up |
|---|---|---|
| O mundo | **uma matriz** e uma peça | **listas** de objetos que nascem e morrem |
| Posição | `{coluna, linha}`, casa a casa | **centro** em pixels, contínua |
| Colisão | "cabe?", perguntar antes de mover | **círculos**, muitos contra muitos |
| Movimento | a peça cai um passo por intervalo | **trajetos como funções do tempo** |
| Perigo | a pilha que sobe | **mira em você** (`atan2`, leques, anéis) |
| De onde vêm os objetos | saco de sete | **roteiro** escrito à mão, com cursor |
| Estados | do jogo | do jogo **e** de um personagem (o chefe) |

E bastante trigonometria — sempre a mesma pouca: `Math.hypot`, `Math.atan2`, `Math.cos`,
`Math.sin`. Quatro funções que, entendidas uma vez, servem para o resto da vida.

---|---|---|
| Posição | canto | **centro** |
| Colisão | AABB, um contra muitos | **círculos, muitos contra muitos** |
| Movimento | cair em linha reta | **trajetos como funções do tempo** |
| Perigo | cai do céu | **mira em você** |
| Origem dos objetos | gerador com sorteio | **roteiro** escrito à mão |
| Estados | do jogo | do jogo **e** do chefe |

E bastante trigonometria — sempre a mesma pouca: `Math.hypot`, `Math.atan2`, `Math.cos`,
`Math.sin`. Quatro funções que, entendidas uma vez, servem para o resto da vida.

---

## Verificação

Como os outros módulos, este foi testado, não só escrito. Cada passo rodou num navegador real,
sem interface, com o loop movido quadro a quadro por um script:

- **nenhum erro** de console em nenhum dos nove passos;
- um robô apertando teclas ao acaso por 20.000 quadros em cada passo: a nave nunca sai da tela,
  e nenhuma lista cresce sem parar (o máximo visto foi 7 tiros, 13 inimigos e 39 balas vivas);
- a diagonal anda exatamente o mesmo que a reta; três segundos sem atirar e um toque no Espaço
  produzem **um** tiro, não uma rajada;
- um tiro acerta um inimigo só, mesmo com dois sobrepostos; o blindado aguenta exatamente 6;
  a colisão de círculos acerta na borda (3,9 encosta, 4 não);
- o tiro mirado vai direto na nave; o leque de 5 sai a 55,6°, 72,8°, 90°, 107,2° e 124,4°; o anel
  de 10 sai com a mesma rapidez em todas as direções; ninguém atira à queima-roupa;
- perder uma vida apaga as balas e dá invencibilidade; uma bala durante a invencibilidade não
  tira vida; "jogar de novo" zera todas as listas;
- o roteiro expande em 59 eventos ordenados, e as formações saem nos instantes e colunas certos;
- o chefe passa por entrando → lutando → explodindo, troca de fase aos 60% e aos 25% e avisa
  antes dos ataques;
- no final: as cápsulas sobem a arma até 4 tiros e depois viram pontos; a bomba apaga as balas,
  derruba o blindado e é gasta; o foco anda a 45%; a pausa congela até o céu; trocar de janela
  pausa; o arrasto relativo move a nave na escala certa e atira sozinho; depois do chefe vem a
  volta 2, com 3 s de descanso, uma bomba a mais e balas 25% mais rápidas; o recorde é salvo, e
  um `localStorage` com lixo não quebra nada;
- numa tela de celular (390×750), placar, barra do chefe, tela de jogo e botões de toque cabem sem rolar.

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Vários pedem para você quebrar o código de propósito: é onde a lição
   gruda.

Antes de mexer numa pasta, faça uma cópia.

---

**Pré-requisito:** [`../tetris`](../tetris/) · **Antes:** [`../tetris`](../tetris/) · **Depois:** [`../pacman`](../pacman/) · **Índice:** [`../README.md`](../README.md)
