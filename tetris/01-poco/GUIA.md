# Tetris — Passo 1: O poço

**Rode:** abra o `index.html`.

---

## O que você vê

Uma tela em pé, um pontinho marcando cada casa e, no fundo, umas linhas de blocos
coloridos já empilhados. Nada se mexe.

---

## A decisão deste passo

```js
poco[linha][coluna]   // null = vazio; "T", "I", "L"… = um pedaço de peça
```

**A grade é o estado do jogo.**

Na cobrinha, a grade era só o chão onde a cobra andava: o estado era a lista de pedaços da
cobra. Aqui é diferente. Quando uma peça para, ela deixa de ser uma peça e **vira casas
ocupadas do poço**. Tudo o que importa — onde ainda cabe algo, quais linhas estão
completas, se o jogo acabou — se responde olhando a matriz.

E a tela é só o espelho dela: o desenho sai inteiro dos dados, casa por casa.

> **O desenho é uma consequência dos dados, nunca o contrário.**

---

## Matriz: um array de arrays

```js
function criarPocoVazio() {
    return Array.from({ length: LINHAS }, () => criarLinhaVazia());
}
```

Vinte linhas, cada uma um array de dez casas. Para ler uma casa, dois índices:
`poco[19][0]` é a casa da última linha, primeira coluna.

### A ordem dos índices

`poco[linha][coluna]` — **primeiro a linha (y), depois a coluna (x)**. É o contrário do
hábito da matemática, e trocar os dois é o erro mais comum com matrizes. Os sintomas são
estranhos: o desenho sai girado, ou o programa tenta ler a "linha 15" de uma linha que só
tem 10 casas e recebe `undefined`.

### A armadilha do `fill`

```js
new Array(LINHAS).fill(criarLinhaVazia())   // ERRADO
```

Parece igual e não é. O `fill` avalia o argumento **uma vez** e põe **o mesmo array** em
todas as posições. São vinte nomes para uma única linha: pintar uma casa em qualquer uma
delas pinta a coluna inteira.

`Array.from` chama a função **uma vez por posição**, e cada linha nasce independente.

> Objetos e arrays em JavaScript são passados **por referência**. Copiar a variável não
> copia o conteúdo — só dá outro nome para a mesma coisa.

---

## Guardar a letra, não a cor

```js
poco[19][0] = "I";              // o que a casa É
CORES["I"]   // "#00f0ff"        // como ela APARECE
```

O poço não sabe de cor nenhuma. A cor é consultada na tabela só na hora de desenhar.
Trocar a paleta inteira vira mudar sete linhas — e nada no jogo percebe.

É a mesma lição do final da cobrinha, que trocou o visual inteiro sem encostar em uma
regra.

---

## Detalhes que valem notar

### Um desenho legível dentro do código

```js
const EXEMPLO = [
    "....T.....",
    "...TTT..O.",
    ...
];
```

Cada string é uma linha, cada caractere uma casa. Dá para **ver** o resultado antes de
abrir o navegador — e mudar o desenho é editar texto. A técnica volta no xadrez (o FEN) e
serve para fases inteiras de jogos de plataforma.

### A conversão casa → pixel mora em um lugar só

```js
const x = coluna * TAMANHO_DA_CELULA;
```

Só `desenharCelula` sabe o que é um pixel. O resto do programa fala em colunas e linhas.

### Relevo com quatro retângulos

Uma faixa clara em cima e à esquerda, uma escura embaixo e à direita. Cada célula parece um
bloco, e não há nada de 3D.

---

## Experimente

1. Mude o `EXEMPLO`: desenhe suas iniciais com blocos, ou uma linha completa de dez letras.
2. Troque a cor de `T` para branco. Confira que nenhuma outra linha do código precisou
   mudar.
3. Mude `TAMANHO_DA_CELULA` para 6 e ajuste o `width`/`height` do canvas no HTML para
   60×120. Depois tente esquecer de ajustar o HTML e veja o que acontece.
4. **O bug do `fill`, ao vivo:** troque o `Array.from` por
   `new Array(LINHAS).fill(criarLinhaVazia())`. Recarregue. Por que todas as linhas
   ficaram iguais à última?
5. Em `desenhar`, troque `poco[linha][coluna]` por `poco[coluna][linha]`. Leia o erro no
   console (F12) e explique o que ele diz.
6. Faça o poço ter 12 colunas e 24 linhas. O que precisou mudar além das constantes?

---

**Próximo:** [`02-pecas`](../02-pecas/) — as sete peças, e a decisão de guardá-las como pequenas matrizes.
