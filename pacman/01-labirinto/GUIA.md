# Pac-Man — Passo 1: O labirinto

**Rode:** abra o `index.html`.

---

## O que você vê

O labirinto inteiro: paredes azuis com quinas arredondadas, as pastilhas, os quatro
energizantes nos cantos, a casa dos fantasmas com a porta rosa no meio, e o Pac-Man parado
embaixo. Nada se move.

---

## 1. O labirinto é um texto

```js
const MAPA_EM_TEXTO = [
    "############################",
    "#............##............#",
    "#.####.#####.##.#####.####.#",
    "#o####.#####.##.#####.####o#",
    ...
];
```

O `EXEMPLO` do Tetris e os sprites de texto da cobrinha usavam a mesma ideia; aqui ela vai ao
máximo: **o nível inteiro** é um desenho feito de caracteres. Dá para ver o labirinto lendo o
código, e criar outro é editar texto.

| Caractere | Casa |
|---|---|
| `#` | parede |
| `.` | pastilha |
| `o` | energizante |
| (espaço) | corredor vazio |
| `-` | porta da casa dos fantasmas |
| `G` | dentro da casa dos fantasmas |

### Do texto para a matriz

```js
function criarMapa() {
    return MAPA_EM_TEXTO.map(linha => linha.split(""));
}
```

`split("")` quebra cada string em caracteres: o resultado é `mapa[linha][coluna]`, como o poço
do Tetris. Por que não usar o texto direto? Porque **strings são imutáveis** em JavaScript — não
dá para trocar um caractere no meio de uma. E o mapa vai mudar: a cada pastilha comida, um `.`
vira espaço.

### Deduzir em vez de digitar

```js
const COLUNAS = MAPA_EM_TEXTO[0].length;
const LINHAS = MAPA_EM_TEXTO.length;
```

O tamanho do labirinto sai do próprio labirinto. Desenhe um maior e tudo se ajusta (menos o
tamanho do canvas no HTML — o exercício 3 mostra o que acontece).

---

## 2. Confira os dados antes de usar

```js
if (linha.length !== COLUNAS) {
    console.error(`Linha ${i} do mapa tem ${linha.length} casas; deveria ter ${COLUNAS}.`);
}
```

Um labirinto com uma linha de 27 caracteres no meio de linhas de 28 **não dá erro nenhum**:
só desenha torto, e o fantasma atravessa uma parede três passos depois, longe da causa. Três
linhas de verificação, rodadas uma vez, apontam o problema na hora — e dizem **qual** linha.

> **Dados escritos à mão têm erros escritos à mão.** Quem os lê primeiro deve conferi-los.

---

## 3. A parede que se desenha sozinha

Uma casa de parede não sabe se é a quina de um bloco, o meio de um muro ou a ponta de uma ilha.
Mas pode **perguntar aos vizinhos**:

```js
const livreEmCima = !ehParede(coluna, linha - 1);
const livreAEsquerda = !ehParede(coluna - 1, linha);
...
```

Onde a vizinha é corredor, há uma borda — e a borda ganha uma linha. As linhas ficam 2 pixels
para dentro da parede, e cada uma só se estica até o fim da casa se a vizinha daquele lado
também for parede. Senão, para no canto, onde encontra a outra linha: é isso que fecha as
quinas sem deixar pontas.

```
  vizinha de cima é corredor  →  ─────────
                                 │ parede
  vizinha da esquerda também  →  │
```

### As quinas de dentro

Quando as duas vizinhas são parede mas a da **diagonal** é corredor, as linhas das casas ao lado
não se encontram: falta um pedacinho de L. Quatro testes de diagonal o desenham.

Nada disso está no texto do mapa. É **deduzido** — e por isso qualquer labirinto que você
escrever sai desenhado certo, sem uma linha de código a mais.

### Fora do mapa conta como parede

```js
if (linha < 0 || linha >= LINHAS || coluna < 0 || coluna >= COLUNAS) {
    return true;
}
```

Quem pergunta pela vizinha da borda não precisa se preocupar com índices que não existem. É o
"fim da grade" do Tetris, de novo.

---

## 4. Um círculo com uma fatia faltando

```js
pincel.moveTo(x, y);
pincel.arc(x, y, 6.5, Math.PI + boca, Math.PI - boca);
pincel.closePath();
pincel.fill();
```

`arc` desenha um arco pelo **centro**, do ângulo inicial ao final (em radianos, contando a
partir da direita, no sentido horário). Começando no centro com `moveTo` e fechando com
`closePath`, o arco vira uma fatia de pizza — ou, aqui, uma pizza sem uma fatia. É o único
desenho do curso que não é feito de retângulos: o Pac-Man **é** um círculo.

---

## Experimente

1. Mude o labirinto: abra uma passagem nova, feche outra. As paredes se redesenham sozinhas.
2. Apague um caractere de uma linha do meio. Olhe o console (F12) e depois o desenho.
3. Acrescente uma linha ao labirinto. O que fica de fora da tela? O que precisa mudar no HTML?
4. Mude `I` e `F` em `desenharParede` (por exemplo, 0 e 7). O que acontece com as quinas?
5. Comente os quatro testes de diagonal e procure as quinas de dentro abertas.
6. Mude a boca do Pac-Man para `0.05 * Math.PI` e para `0.45 * Math.PI`. Depois vire-a para
   cima (dica: `-Math.PI / 2` é para cima).

---

**Próximo:** [`02-movimento`](../02-movimento/) — o Pac-Man anda, e só vira onde pode.
