# Tetris — Passo 5: A rotação

**Mudou:** `script.js` e a linha de ajuda
**Rode:** abra o `index.html`. ↑ ou X giram no sentido horário, Z no anti-horário.

---

## O que você vê

A peça gira. E se você encostá-la na parede e girar, ela não recusa: se ajeita uma ou duas
casas para dentro e gira mesmo assim.

---

## Girar uma matriz

```
    0 1 0          0 1 0
    1 1 1    ->    0 1 1
    0 0 0          0 1 0
```

A regra cabe numa frase: **a coluna `x` da forma original, lida de baixo para cima, vira a
linha `x` da forma nova.**

```js
function girarMatriz(forma, sentido) {
    const n = forma.length;
    return forma.map((linhaDaForma, y) =>
        linhaDaForma.map((_, x) =>
            sentido > 0 ? forma[n - 1 - x][y]      // horário
                        : forma[x][n - 1 - y]      // anti-horário
        )
    );
}
```

Não decore a fórmula: **confira com o lápis.** Pegue uma casa da matriz nova, aplique a
conta e veja de onde ela vem na antiga. Faça isso com duas ou três casas e a fórmula deixa
de ser mágica.

### O retorno do passo 2

Toda forma é **quadrada**. É isso que faz uma única fórmula servir para o O (2×2), para os
3×3 e para o I (4×4). E é a margem vazia do I — deitado na *segunda* linha do seu quadrado
— que o faz girar no lugar em vez de saltar para o lado.

A decisão foi tomada três passos atrás, quando parecia desperdício.

---

## Uma matriz nova, nunca a antiga

```js
pecaAtual.forma = formaGirada;   // troca a referência; o catálogo fica intacto
```

`map` devolve arrays **novos**. Isso importa porque a forma da peça atual, quando ela nasce,
**é a própria matriz do catálogo** — não uma cópia (lembre da referência, no passo 1). Se a
rotação mexesse na matriz no lugar, o T girado passaria a ser o T de todas as peças T que
ainda vão nascer.

É a mesma lição do xadrez: **estado que não se altera não estraga por acidente.**

---

## Os empurrões

```js
const EMPURROES = [[0, 0], [-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];

for (const [dc, dl] of EMPURROES) {
    if (cabe(formaGirada, coluna + dc, linha + dl)) {
        // aplica e para
    }
}
```

A peça girada pode não caber exatamente onde está: o I deitado encostado na parede, girado,
invadiria a coluna −1. Em vez de recusar, o jogo tenta **algumas posições vizinhas**, em
ordem, e fica com a primeira que servir.

Aqui o passo 3 paga de novo: `cabe` só responde, não muda nada. Chamá-la seis vezes com
posições hipotéticas é seguro, e só a escolhida é aplicada.

### Dados, não `if`s

A lista de tentativas é um array. Mudar a ordem, tirar o empurrão para cima ou acrescentar
um novo é editar uma linha — o código que percorre a lista não muda.

> Os jogos oficiais usam uma tabela bem maior, diferente para cada peça e para cada par de
> rotações (o *Super Rotation System*). A ideia é exatamente esta; só a tabela cresce.

---

## Detalhes que valem notar

### `for...of` com desestruturação

```js
for (const [deslocamentoColuna, deslocamentoLinha] of EMPURROES)
```

Cada item da lista é um par; os colchetes do lado esquerdo **desmontam** o par em duas
variáveis. É o mesmo que `const par = EMPURROES[i]; const dc = par[0]; const dl = par[1];`,
em uma linha.

### `return` dentro do laço

A primeira tentativa que serve encerra a função. Não faz sentido testar as outras — e pior,
se o laço continuasse, a peça poderia ser girada duas vezes.

---

## Experimente

1. **Estrague o catálogo de propósito:** em `girarPeca`, logo depois de
   `pecaAtual.forma = formaGirada`, escreva `PECAS[pecaAtual.tipo].forma = formaGirada`.
   Gire um T e jogue até aparecer o próximo T. Como ele nasceu? É o que aconteceria se a
   rotação alterasse a matriz no lugar.
2. Deixe `EMPURROES` só com `[0, 0]`. Encoste um I deitado na parede e tente girar.
3. Tire o `[0, -1]`. Tente girar um T apoiado no fundo do poço com a ponta para baixo.
4. Mova o I do catálogo para a **primeira** linha do 4×4. Gire várias vezes e observe a
   peça "andar" pelo poço.
5. Imprima no console a matriz girada (`console.table(formaGirada)`) e confira a regra
   da coluna lida de baixo para cima.
6. Faça o O não girar: um `if` no começo de `girarPeca`. Precisa? O que muda na prática?

---

**Anterior:** `04-controles` · **Próximo:** `06-linhas` — o poço finalmente se esvazia.
