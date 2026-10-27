# Tetris — Passo 3: A queda

**Mudou:** `script.js`
**Rode:** abra o `index.html` e só olhe.

---

## O que você vê

As peças caem sozinhas, uma linha por segundo. Param no fundo ou no que encontrarem pelo
caminho, ficam lá, e uma nova nasce no topo. Quando o poço enche, ele se esvazia e tudo
recomeça.

---

## 1. Tempo contínuo, movimento em passos

O loop é o do Pong, sem tirar nem pôr: `requestAnimationFrame`, delta time em segundos,
teto de 0,05 s. Mas a peça **não pode andar 0,3 linha**. Numa grade, ou ela está numa linha
ou na outra.

A ponte entre os dois mundos é um **acumulador**:

```js
acumuladorDeQueda += tempo;

while (acumuladorDeQueda >= INTERVALO_DE_QUEDA) {
    acumuladorDeQueda -= INTERVALO_DE_QUEDA;
    moverPeca(0, 1);
}
```

O tempo vai pingando, quadro a quadro. Quando junta um intervalo inteiro, ele é **gasto**
numa linha.

### Subtrair, não zerar

Se o acumulador chegou a 1,013 e você fizesse `acumuladorDeQueda = 0`, os 0,013 de sobra
iriam para o lixo. Quadro após quadro, as sobras perdidas atrasam o relógio — e quanto mais
lenta a máquina, maiores elas são. Subtraindo, o tempo é contado inteiro.

### Por que não voltar ao `setInterval`?

Porque o loop agora faz mais do que mover a peça: ele desenha 60 vezes por segundo, e logo
vai cuidar do teclado, da peça fantasma e de animações. E o intervalo da queda vai **mudar
no meio do caminho** — mais rápido ao segurar ↓, mais rápido a cada nível. Com o
acumulador, mudar o intervalo é mudar um número.

| | Cobrinha | Pong | Tetris |
|---|---|---|---|
| Loop | `setInterval` | `requestAnimationFrame` | `requestAnimationFrame` |
| Movimento | uma casa por tique | contínuo | uma casa por intervalo acumulado |
| Posição | inteira | decimal | inteira |

---

## 2. Testar antes de mover

```js
function cabe(forma, coluna, linha) { ... }   // só responde, não muda nada

function moverPeca(dc, dl) {
    if (!cabe(pecaAtual.forma, coluna + dc, linha + dl)) return false;
    pecaAtual.coluna += dc;
    pecaAtual.linha += dl;
    return true;
}
```

No Pong, a bola **entrava** na parede e era empurrada de volta: corrigir a posição e a
velocidade, sempre juntas. Aqui isso nunca acontece. A pergunta vem **antes** — "a peça
caberia lá?" — e, se a resposta for não, ela simplesmente fica onde está.

Numa grade isso é possível porque os lugares são poucos e discretos: dá para perguntar por
cada um. No Pong, não havia um "próximo lugar" para testar — havia infinitos.

> **Uma função que só responde pode ser chamada quantas vezes você quiser, com qualquer
> posição hipotética, sem medo de estragar nada.** O passo 5 vai chamá-la seis vezes
> seguidas para decidir uma única rotação.

### A parede não existe

```js
colunaNoPoco < 0 || colunaNoPoco >= COLUNAS || linhaNoPoco >= LINHAS
```

Não há objeto "parede" nem objeto "chão". Há só o **fim da grade**. Bater na parede é tentar
usar uma coluna que não existe. Uma regra a menos para escrever.

---

## 3. Travar: a peça vira poço

```js
poco[pecaAtual.linha + y][pecaAtual.coluna + x] = pecaAtual.tipo;
```

Quando a peça não consegue descer, seus quadrados são copiados para dentro da matriz. Daí
em diante o poço não lembra que aqueles quadrados foram uma peça — são casas ocupadas como
as outras.

É por isso que o estado do Tetris é tão pequeno: **um poço e uma peça.** Todas as peças
que já caíram moram dentro da mesma matriz.

### O `break` depois de travar

Se o quadro trouxe tempo para descer duas linhas e a peça travou na primeira, a peça nova
não deve gastar a segunda. O `break` sai do laço, e `nascerPeca` zera o acumulador.

---

## Experimente

1. Mude `INTERVALO_DE_QUEDA` para `0.05`. O poço enche em segundos. Agora para `3`.
2. **Zerar em vez de subtrair:** troque `acumuladorDeQueda -= INTERVALO_DE_QUEDA` por
   `acumuladorDeQueda = 0`. Com intervalo de 1 s você não nota. Ponha `0.02` e conte:
   quantas linhas por segundo a peça desce agora? (Dica: o laço `while` deixa de servir para
   alguma coisa.)
3. Em `cabe`, apague a condição `linhaNoPoco >= LINHAS`. Leia o erro no console quando a
   primeira peça chega ao fundo. Por que é um `TypeError`?
4. Em `travarPeca`, apague a chamada `nascerPeca()`. O que acontece com a peça que travou?
   E com o jogo?
5. Faça as peças nascerem sempre na coluna 0. O poço enche torto — e mais rápido.
6. Mostre no console quantas peças já caíram desde que o poço esvaziou pela última vez.

---

**Anterior:** [`02-pecas`](../02-pecas/) · **Próximo:** [`04-controles`](../04-controles/) — você assume o controle.
