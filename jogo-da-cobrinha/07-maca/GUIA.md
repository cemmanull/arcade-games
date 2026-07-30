# Passo 7 — A maçã

**Mudou:** `script.js`
**Rode:** abra o `index.html` e **deixe o Console aberto (F12)** — é lá que está o placar
por enquanto.

---

## O que você vê

Um quadrado rosa em algum lugar do tabuleiro. Passe por cima: ele reaparece em outro
lugar, a cobra cresce um segmento e o console anuncia os pontos.

O jogo agora tem um objetivo. Falta só ter como perder — isso é o próximo passo.

---

## Conceitos deste passo

### Sortear um número inteiro

```js
Math.floor(Math.random() * COLUNAS)
```

Leia de dentro para fora:

| Pedaço | Devolve |
|---|---|
| `Math.random()` | um decimal entre 0 (inclusive) e 1 (exclusive) — `0.0374...` |
| `× COLUNAS` | um decimal entre 0 e 19,999... |
| `Math.floor(...)` | joga fora as casas decimais → um inteiro de 0 a 19 |

**Por que `floor` e não `round`?** Com arredondamento normal, os valores 0 e 19 sairiam
com metade da chance dos outros (só "meia faixa" leva a eles). Um sorteio torto que quase
ninguém percebe e que aparece em código profissional o tempo todo.

Guarde a fórmula, ela é sempre a mesma: **`Math.floor(Math.random() * quantidade)` dá um
índice válido de 0 a quantidade−1.**

### `do/while` — tentar de novo até dar certo

```js
do {
    maca = { ...sorteia... };
} while (caiu em cima da cobra);
```

`do/while` **executa primeiro e testa depois**, ao contrário do `while` comum. É
exatamente o que se quer aqui: sorteie ao menos uma vez; se deu ruim, repita.

Este é o padrão "tentativa e rejeição", e é a solução certa enquanto a maioria das
tentativas dá certo. Se a cobra ocupasse quase todo o tabuleiro, ele começaria a ficar
lento — aí valeria montar a lista de células livres e sortear uma. Não vale a pena antes
disso: seria mais código para um problema que não existe.

### `some()` — "existe algum que...?"

```js
cobra.some(parte => parte.coluna === maca.coluna && parte.linha === maca.linha)
```

Percorre a lista e devolve `true` no primeiro item que satisfaz a condição, parando ali.
É a versão legível de um `for` com `if` e `break` dentro.

Leia como português: *existe alguma parte da cobra na mesma célula da maçã?*

### Colisão por igualdade

```js
const comeu = cabeca.coluna === maca.coluna && cabeca.linha === maca.linha;
```

Comer é **estar na mesma célula**. Dois inteiros comparados, e acabou.

Isso só é tão simples porque tudo está alinhado numa grade. Em um jogo com posições
decimais, dois objetos praticamente nunca ficam no mesmo ponto exato — e colidir passa a
significar *"duas áreas se sobrepõem"*, que dá bem mais trabalho.

Não é um detalhe da cobrinha: é a diferença entre jogos de grade (xadrez, tetris,
campo minado) e jogos contínuos (plataforma, corrida, tiro). A escolha da grade é o que
está te poupando desse trabalho.

### Uma variável extra com nome bom

```js
const comeu = cabeca.coluna === maca.coluna && cabeca.linha === maca.linha;
if (comeu) { ... }
```

Daria para pôr a comparação inteira dentro do `if`. Mas aí o leitor precisaria decifrar
quatro comparações para descobrir *o que aquilo significa*.

> **Uma variável bem nomeada é o comentário mais barato que existe** — e o único que
> nunca fica desatualizado.

### `console.log`

```js
console.log("Pontos:", pontos);
```

Escreve no Console do navegador (F12 → *Console*). É a ferramenta de depuração mais usada
do mundo: quando não souber o que está acontecendo, imprima o valor e olhe.

Aqui ele é o nosso placar provisório. No passo 9 vira texto de verdade na página.

### Ordem de inicialização

```js
sortearMaca();      // a maçã precisa existir...
desenhar();         // ...antes que alguém tente desenhá-la
```

Inverta as duas linhas e o console mostra
`Cannot read properties of undefined (reading 'coluna')`.

Traduzindo: *tentei ler `.coluna` de algo que não existe*. Toda vez que você vir
`undefined` nessa frase, a pergunta é a mesma: **quem deveria ter criado isso, e rodou
antes?**

---

## Experimente

1. Coma várias maçãs e observe o console. Depois comente o `console.log` e sinta a falta:
   é o que o passo 9 vai resolver.
2. Troque `Math.floor` por `Math.round` e jogue bastante. O sorteio continua "funcionando"
   — mas as bordas do tabuleiro passam a receber menos maçãs. Bugs estatísticos não
   quebram nada; só deixam o jogo estranho.
3. Faça a maçã valer mais a cada vez: `PONTOS_POR_MACA` precisa deixar de ser `const`.
   Pense se essa é mesmo a melhor solução.
4. Comente o `do/while` (deixe só o sorteio simples) e jogue até a maçã nascer dentro da
   cobra. Repare que ela fica **inalcançável** se nascer no meio do corpo.
5. Faça a maçã ser menor que a célula: desenhe-a com uma margem de 5 pixels de cada lado.
   Dica: `maca.coluna * PIXELS_POR_CELULA + 5` e uma largura de `PIXELS_POR_CELULA - 10`.
   Repare que a colisão **não muda** — o desenho e a regra são coisas independentes.
6. Faça duas maçãs ao mesmo tempo. Você vai descobrir sozinho por que um array seria
   melhor que duas variáveis.

---

**Anterior:** `06-cobra` · **Próximo:** `08-colisao` — finalmente dá para perder.
