# Xadrez — regras complexas e um computador que pensa

Oito passos, do tabuleiro vazio até um adversário que enxerga quatro lances à frente.

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-tabuleiro`](01-tabuleiro/) | 64 casas | CSS Grid, array de 64, por que não usar canvas |
| 2 | [`02-pecas`](02-pecas/) | as peças | representação, FEN, peças imutáveis |
| 3 | [`03-selecionar`](03-selecionar/) | mover (sem regras) | estado do jogo vs estado da interface |
| 4 | [`04-como-andam`](04-como-andam/) | como cada peça anda | três padrões para seis peças |
| 5 | [`05-xeque`](05-xeque/) | xeque, mate, afogamento | pseudo-legal → legal, cópias de estado |
| 6 | [`06-especiais`](06-especiais/) | roque, en passant, promoção | estado imutável, desfazer numa linha |
| 7 | [`07-computador`](07-computador/) | um adversário | dividir em 3 arquivos, minimax, avaliação |
| 8 | [`08-alfa-beta`](08-alfa-beta/) | ele fica rápido | poda alfa-beta, ordenação, quiescence |
| — | [`final`](final/) | interface completa | o guia completo, com 15 exercícios |

---

## Por que este módulo vem por último

Cobrinha e Pong são jogos de **reflexo**: pouca regra, muito movimento. O xadrez inverte
tudo. Não há física, não há loop de 60 quadros por segundo, nada se move sozinho.

O desafio passa a ser o da maior parte do software profissional:

1. **regras complexas, cheias de exceções** — roque, en passant, promoção, cravada;
2. **um adversário que decide** — como fazer um computador escolher um bom lance;
3. **um programa grande demais para um arquivo só** — como dividi-lo.

E há uma decisão de projeto logo no passo 1: **este jogo não usa canvas.** O tabuleiro são
64 `<button>` numa grade de CSS, porque um tabuleiro é uma grade e porque casas clicáveis,
focáveis por teclado e anunciáveis por leitores de tela são elementos de verdade, não
pintura.

> Canvas é para pintura que muda muitas vezes por segundo. Interface feita de peças
> discretas e clicáveis é HTML. **Escolher a ferramenta pelo problema vale mais do que usar
> sempre a mais poderosa.**

---

## Verificação

As regras deste módulo passam no **perft** — o teste padrão da comunidade de xadrez — em
cinco posições, incluindo as clássicas de armadilha:

| Posição | Profundidade | Esperado |
|---|---|---|
| inicial | 4 | 197.281 |
| Kiwipete (roques, en passant, cravadas) | 3 | 97.862 |
| finais com en passant que dá xeque | 4 | 43.238 |
| promoções | 3 | 9.467 |

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Muitos usam o console para carregar posições de teste com FEN.

---

**Antes:** [`../pong`](../pong/) · **Índice:** [`../README.md`](../README.md)
