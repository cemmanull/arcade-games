# Pong — movimento contínuo e física

Oito passos, do primeiro retângulo parado até um jogo completo com adversário automático.

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-tela`](01-tela/) | as peças paradas | objetos com a mesma forma, escala inteira do pixel |
| 2 | [`02-loop`](02-loop/) | a bola se move | vetor de velocidade, `requestAnimationFrame`, delta time |
| 3 | [`03-paredes`](03-paredes/) | ela quica | ricochete por troca de sinal, corrigir posição junto |
| 4 | [`04-raquetes`](04-raquetes/) | você joga | mapa de teclas presas, clamp, dois jogadores |
| 5 | [`05-colisao`](05-colisao/) | ela é rebatida | AABB, o bug da bola grudada |
| 6 | [`06-angulo`](06-angulo/) | o jogo fica bom | ângulo pelo ponto de impacto, normalizar, teto de velocidade |
| 7 | [`07-placar`](07-placar/) | há um vencedor | HTML vs canvas, máquina de estados, guard clause |
| 8 | [`08-computador`](08-computador/) | um adversário | dificuldade como limitação deliberada |
| — | [`final`](final/) | menu, pausa, som | o guia completo, com 13 exercícios |

---

## Por que este módulo vem depois da cobrinha

Parece mais simples — duas barras e uma bola. Não é.

A cobrinha vive numa **grade**: tudo anda de casa em casa, as posições são inteiras e
colidir é comparar igualdade. Aqui nada disso vale.

| | Cobrinha | Pong |
|---|---|---|
| Posição | `{coluna: 5, linha: 3}` | `x: 73.42, y: 51.08` |
| Direção | `"cima"`, `"baixo"`… | `velocidadeX`, `velocidadeY` |
| Tempo | `setInterval` de 150ms | `requestAnimationFrame` + delta time |
| Entrada | última tecla apertada | quais teclas estão **presas agora** |
| Colisão | `a.coluna === b.coluna` | sobreposição de áreas |

As quatro peças de um jogo — loop, movimento, entrada e colisão — mudam todas. O que você
aprender aqui serve para plataforma, corrida, tiro: praticamente todo jogo que não seja de
turnos.

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Vários deles pedem para você **quebrar** o código de propósito: é
   onde a lição gruda.

Antes de mexer numa pasta, faça uma cópia.

---

**Antes:** [`../jogo-da-cobrinha`](../jogo-da-cobrinha/) ·
**Depois:** [`../xadrez`](../xadrez/)
