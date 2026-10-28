# Pac-Man — Passo 3: As pastilhas

**Mudou:** os três arquivos (o placar)
**Rode:** abra o `index.html` e coma.

---

## O que você vê

As pastilhas somem por onde o Pac-Man passa, e o placar conta: 10 pontos por pastilha, 50 por
energizante, e quantas faltam. Os energizantes piscam. Coma todas as 238 e o labirinto pisca em
branco, se refaz cheio, e o Pac-Man volta ao começo.

---

## 1. O mapa muda

```js
mapa[linha][coluna] = " ";
```

Comer é trocar um caractere da matriz. A pastilha some da tela **sozinha**, porque o desenho só
espelha o mapa — nenhuma linha de desenho precisou saber que pastilhas podem ser comidas.

É a lição do poço do Tetris: **a grade é o estado do jogo.** Lá, peças viravam casas ocupadas;
aqui, pastilhas viram casas vazias.

### Uma tabela de pontos

```js
const PONTOS_POR_CASA = { ".": 10, "o": 50 };

if (!(casa in PONTOS_POR_CASA)) return;
pontos += PONTOS_POR_CASA[casa];
```

O caractere da casa é a chave. Nenhum `if (casa === ".") ... else if (casa === "o")`: uma fruta
nova (passo 8) vai ser uma linha a mais na tabela. E `in` pergunta se a chave existe.

---

## 2. Contar uma vez, depois só descontar

```js
let pastilhasRestantes = contarPastilhas();   // uma vez, no começo
...
pastilhasRestantes -= 1;                       // a cada pastilha comida
```

Quantas faltam? Daria para varrer as 840 casas a cada quadro e contar. Funcionaria — e
seria trabalho jogado fora 60 vezes por segundo para responder uma pergunta cuja resposta só
muda quando o Pac-Man come.

Contando uma vez e descontando a cada pastilha, o número está **sempre certo** e custa uma
subtração.

> **Se você sabe exatamente quando um número muda, atualize-o nessa hora** em vez de
> recalculá-lo do zero o tempo todo.

O cuidado: agora há **dois** lugares que precisam concordar (o mapa e o contador). É por isso
que `comer` faz as duas coisas juntas, na mesma função, e que recomeçar recalcula o contador do
mapa novo.

---

## 3. Recomeçar é ler o texto de novo

```js
function recomecarLabirinto() {
    mapa = criarMapa();
    pastilhasRestantes = contarPastilhas();
    posicionarPacMan();
}
```

O `MAPA_EM_TEXTO` nunca foi alterado: o que o Pac-Man comeu foi uma **cópia**. Para refazer o
labirinto, basta outra cópia do original. Se o jogo tivesse comido o original, não haveria de
onde recomeçar.

É a mesma separação do catálogo do Tetris (que a rotação não podia estragar): **o modelo fica
intacto; o jogo mexe numa cópia.**

---

## 4. A comemoração é um temporizador

```js
if (tempoDeComemoracao > 0) {
    tempoDeComemoracao -= tempo;
    if (tempoDeComemoracao <= 0) recomecarLabirinto();
    return;
}
```

Dois segundos em que o mundo espera e as paredes piscam. Um número que desce, e uma guard
clause que congela o resto — a técnica do pisca-pisca das
linhas do Tetris.

---

## Detalhes que valem notar

### O túnel, de novo

`comer` passa a coluna pelo mesmo conserto do túnel: no meio da travessia, o `x` do Pac-Man pode
estar fora do mapa por um instante.

### Piscar com o resto da divisão

```js
if (Math.floor(tempoTotal * 4) % 2 === 1) break;   // energizante apagado
```

O truque da bola no saque do Pong: `Math.floor(t * 4)` conta quartos de segundo; `% 2` alterna
entre 0 e 1.

---

## Experimente

1. Mude o valor do energizante para 500. Como isso muda o seu caminho pelo labirinto?
2. Troque o contador por uma recontagem a cada quadro (`pastilhasRestantes = contarPastilhas()`
   dentro de `atualizar`). O resultado na tela muda? O que mudou?
3. Esqueça de chamar `contarPastilhas()` em `recomecarLabirinto`. Limpe o labirinto duas vezes.
4. No jogo original, o Pac-Man fica um pouquinho mais lento enquanto come. Faça isso: um quadro
   sem andar a cada pastilha comida. O que fica mais fácil para quem persegue?
5. Escreva um labirinto pequeno (10×10) só para testar a comemoração sem precisar comer 238
   pastilhas.

---

**Anterior:** [`02-movimento`](../02-movimento/) · **Próximo:** [`04-fantasma`](../04-fantasma/) — alguém começa a perseguir.
