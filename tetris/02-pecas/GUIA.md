# Tetris — Passo 2: As peças

**Mudou:** `script.js`
**Rode:** abra o `index.html` e recarregue algumas vezes.

---

## O que você vê

Uma peça no topo do poço, sorteada a cada carregamento. Ainda parada.

---

## A decisão deste passo: a forma é uma matriz

```js
T: {
    cor: "#c46bff",
    forma: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
    ]
}
```

Daria para escrever uma função de desenho para cada peça — sete funções cheias de
`fillRect`. Funcionaria hoje. Mas cada coisa nova que o jogo precisa fazer com uma peça
(cair, colidir, girar, mostrar a próxima) exigiria sete versões também.

Guardando a forma como dados, **uma** função resolve qualquer peça:

```js
function desenharPeca(peca) {
    peca.forma.forEach((linhaDaForma, y) => {
        linhaDaForma.forEach((valor, x) => {
            if (valor === 1) {
                desenharCelula(peca.coluna + x, peca.linha + y, cor);
            }
        });
    });
}
```

> **Quando sete coisas diferem só nos dados, escreva o código uma vez e os dados sete.**

---

## A soma que vai aparecer em todo lugar

```js
peca.coluna + x
peca.linha + y
```

Posição da peça **mais** posição dentro da forma. A peça guarda onde fica o canto da sua
matriz; cada quadrado está a `x` colunas e `y` linhas desse canto.

Essa conta vai reaparecer na colisão, ao travar a peça, na peça fantasma. Vale reconhecê-la
de longe.

---

## Formas quadradas, mesmo quando a peça não é

O T ocupa 3×2, mas a matriz é 3×3. O I ocupa 4×1, mas a matriz é 4×4 — e ele fica na
**segunda** linha, não na primeira.

Parece desperdício. É preparação: no passo 5, girar uma peça vai ser girar a matriz
inteira em torno do centro. Com a margem certa, a peça gira **no lugar**, sem saltar para o
lado, e sem nenhum `if` para tratar a peça I.

---

## A peça flutua sobre o poço

```js
const pecaAtual = { tipo: "T", forma: [...], coluna: 3, linha: 0 };
```

A peça que cai **não está dentro do poço**. É um objeto separado, desenhado por cima. Ela
só vira casas do poço quando parar — e esse é o assunto do próximo passo.

Duas coisas no estado do jogo, com papéis diferentes:

| | O poço | A peça atual |
|---|---|---|
| O que é | o que já parou | o que está caindo |
| Forma | matriz 10×20 | matriz pequena + posição |
| Muda quando | uma peça trava, uma linha some | a cada movimento |

---

## Detalhes que valem notar

### A lista de tipos se deduz do catálogo

```js
const TIPOS = Object.keys(PECAS);   // ["I", "O", "T", "S", "Z", "J", "L"]
```

Acrescente uma peça no catálogo e ela entra no sorteio sozinha. **Um número escrito duas
vezes é um número que um dia vai divergir** — e uma lista também.

### Centralizar numa grade

```js
coluna: Math.floor((COLUNAS - forma[0].length) / 2)
```

(10 − 3) / 2 = 3,5. Não existe coluna três e meia: `Math.floor` arredonda para baixo. No
Pong, 3,5 pixels era uma posição válida; numa grade, não.

---

## Experimente

1. Crie uma oitava peça no catálogo — um "+" de cinco quadrados, por exemplo. Ela entra no
   sorteio sem mais nenhuma mudança. Por quê?
2. Troque `const pecaAtual = criarPeca(sortearTipo())` por `criarPeca("I")` e depois por
   `criarPeca("O")`. Repare onde cada uma nasce.
3. Mude `linha: 0` para `linha: 10`. A peça aparece no meio do poço — e por cima dos
   blocos, se você subir o exemplo. Nada impede isso ainda: guarde a ideia para o próximo
   passo.
4. Desenhe as sete peças lado a lado, cada uma numa posição fixa, usando um laço sobre
   `TIPOS` e a mesma `desenharPeca`.
5. Faça os zeros da matriz aparecerem: desenhe-os com uma cor bem escura. Você vai ver a
   "caixa" de cada peça, inclusive a margem que o I carrega.

---

**Anterior:** [`01-poco`](../01-poco/) · **Próximo:** [`03-queda`](../03-queda/) — a peça cai, para, e vira poço.
