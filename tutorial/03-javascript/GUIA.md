# Lição 3 — JavaScript (a linguagem)

**Rode:** abra o `index.html` **com o Console aberto** (F12 → aba *Console*).

---

## O que é

HTML estrutura. CSS veste. **JavaScript decide, calcula e reage.**

É a única linguagem de programação que roda nativamente em todo navegador. Nesta lição
ela ainda não toca na página — isso é a lição 4. Aqui interessa a linguagem em si.

O console não é só saída: **você pode escrever nele**. Digite `2 + 2`, aperte Enter.
Depois `pessoa`, `dobrar(21)`, `numeros.map(n => n * 10)`. É o melhor lugar do mundo para
testar uma ideia de três segundos.

---

## Variáveis

```js
const nome = "Maria";   // não pode ser reatribuída
let idade = 30;         // pode
```

Existe uma terceira palavra, `var`, de antes de 2015. Regras de escopo confusas,
substituída. Você vai vê-la em código antigo; não escreva mais.

> **Use `const` por padrão.** Troque para `let` só quando o valor precisar mudar de
> verdade. Quem lê o código descobre de relance o que fica parado — e o que fica parado é
> onde não pode haver bug.

### Nomes

```js
let d = 86400000;                        // ruim
const MILISSEGUNDOS_POR_DIA = 86400000;  // bom
```

Nomes bons são a documentação mais barata que existe, e a única que nunca fica
desatualizada. Evite abreviar (`cfg`, `tmp`, `val`, `x2`): você economiza três letras hoje
e paga em decifração toda vez que reler.

---

## Tipos

| Tipo | Exemplo |
|---|---|
| string | `"texto"`, `'texto'`, `` `texto` `` |
| number | `42`, `3.14` — não há int/float separados |
| boolean | `true`, `false` |
| null | vazio **de propósito** |
| undefined | ninguém pôs valor aqui |
| object | `{ chave: valor }` |
| array | `[1, 2, 3]` (um tipo de objeto) |

**`null` vs `undefined`** importa na hora de depurar: `undefined` é esquecimento ou "ainda
não chegou"; `null` é intenção. Quando um erro seu falar em `undefined`, a pergunta é
sempre: *quem deveria ter preenchido isso, e rodou antes?*

### Template strings

```js
`${primeiro} tem ${idade} anos`
```

As crases aceitam `${...}` no meio e quebras de linha de verdade. Prefira sempre — somem
as aspas e os sinais de `+`.

---

## Operadores

```js
+  -  *  /  %  **
```

O **`%` (resto)** é muito mais útil do que parece:

| Uso | Escrita |
|---|---|
| par ou ímpar | `n % 2 === 0` |
| dar a volta numa lista | `(indice + 1) % tamanho` |
| a cada 5 vezes | `contador % 5 === 0` |

### Comparação: sempre `===`

Os operadores de dois caracteres (`==`, `!=`) convertem os tipos sozinhos:

```js
"5" == 5           // true  😬
0 == ""            // true  😬
null == undefined  // true  😬
```

Use `===` e `!==`. Não há motivo para os outros.

### Falsy

Contam como falso num `if`: `false`, `0`, `""`, `null`, `undefined`, `NaN`.
**Todo o resto é verdadeiro** — inclusive `"0"`, `[]` e `{}`.

Isso permite escrever `if (nome)` em vez de `if (nome !== "")`. Mas cuidado:
`if (quantidade)` é **falso quando a quantidade é zero**, o que raramente é o que você
queria dizer.

---

## Condicionais

```js
if (nota >= 9)      { ... }
else if (nota >= 6) { ... }
else                { ... }

const situacao = nota >= 6 ? "aprovado" : "reprovado";   // ternário
```

O ternário é ótimo para escolher entre **dois** valores. Se você sentir vontade de
encadear vários, use `if` — ninguém lê três ternários aninhados, nem quem os escreveu.

No `switch`, cuidado com o **`break`**: sem ele a execução escorrega para o caso seguinte
e executa também.

---

## Arrays

```js
const numeros = [10, 20, 30, 40, 50];
numeros[0]                     // 10 — a contagem começa em ZERO
numeros[numeros.length - 1]    // o último
```

A contagem começar em zero é a fonte do **off-by-one**, o erro mais comum da programação.
Numa lista de 5 itens, os índices válidos vão de 0 a 4.

### Nas pontas

| Método | Onde | O que faz |
|---|---|---|
| `push` / `pop` | fim | insere / remove |
| `unshift` / `shift` | início | insere / remove |

### Percorrer — a parte mais útil da linguagem

| Método | Devolve |
|---|---|
| `map` | uma lista nova, com cada item transformado |
| `filter` | uma lista só com quem passa no teste |
| `find` | o **primeiro** que passa |
| `some` | `true` se **algum** passa |
| `every` | `true` se **todos** passam |
| `reduce` | um único valor acumulado |
| `includes` / `indexOf` | contém? / em que posição? |
| `slice` | um pedaço (não altera o original) |

Nenhum deles precisa de contador nem de condição de parada — e é exatamente aí que moram
os erros de um `for` escrito à mão.

### Arrow function

```js
n => n * 2
// é o mesmo que
function (n) { return n * 2; }
```

Quando o corpo é uma expressão só, o `return` fica implícito. Leia como *"dado um n,
devolva n vezes 2"*.

### ⚠️ Métodos que alteram o original

`sort()`, `reverse()`, `splice()` **modificam o array em que são chamados**. `map`,
`filter` e `slice` devolvem um novo. Quando quiser preservar o original:

```js
[...numeros].sort()   // copia antes de ordenar
```

---

## Objetos

```js
const pessoa = { nome: "Ana", idade: 28 };
pessoa.nome        // notação de ponto — o normal
pessoa["idade"]    // colchete — quando a chave está numa variável
```

`Object.keys(obj)` e `Object.values(obj)` devolvem as chaves e os valores como lista.

### Array de objetos

```js
const time = [
    { nome: "Ana", pontos: 30 },
    { nome: "Beto", pontos: 12 }
];
```

É a estrutura mais comum de todas: qualquer lista de coisas do mundo real, e o formato em
que praticamente todo dado chega de um servidor. Combinada com `map`/`filter`/`reduce`,
resolve a maior parte do trabalho do dia a dia.

### ⚠️ A armadilha da referência

```js
const original = { valor: 1 };
const apelido = original;    // NÃO é uma cópia
apelido.valor = 999;
original.valor               // 999  😱

const copia = { ...original };   // agora sim
```

Objetos são compartilhados por **referência**. Atribuir não copia: os dois nomes apontam
para o mesmo objeto na memória.

> Essa é a causa de uma parcela enorme dos bugs difíceis de JavaScript, porque o erro
> acontece em um lugar e **aparece em outro**. Regra: **para alterar um objeto sem afetar
> o original, copie primeiro.**

---

## Laços

```js
for (let i = 0; i < 3; i++)      // quando você precisa do índice
for (const n of lista)            // quando você quer os valores — mais legível
while (condicao)                  // quando não se sabe quantas voltas
```

⚠️ Se a condição de um `while` nunca ficar falsa, **a página trava** — o navegador congela
e você precisa fechar a aba. Antes de rodar um `while`, confira o que faz a condição
mudar.

---

## Funções

```js
function dobrar(numero) {
    return numero * 2;
}

function saudacao(quem = "mundo") {   // valor padrão
    return `Olá, ${quem}!`;
}
```

Declarar **não** executa. Uma função é uma receita guardada.

### Duas famílias

1. as que **calculam e devolvem** um valor, sem mexer em nada por fora;
2. as que **fazem** algo: alteram variáveis de fora, escrevem na tela.

As da primeira família são muito mais fáceis de entender e testar: mesma entrada, mesma
saída, sempre. **Quando puder escolher, escolha a primeira.**

### Uma coisa só

Uma função deve fazer uma coisa, e o nome deve dizer qual. Se você precisa ler o corpo
para saber o que ela faz, o nome está ruim. Se o nome tem um "e" no meio
(`salvarEEnviar`), provavelmente são duas funções disfarçadas de uma.

### Escopo

Variáveis declaradas com `let`/`const` dentro de `{ }` só existem ali dentro.

---

## Ler um erro

Um erro no console traz **tipo**, **mensagem**, **arquivo** e **linha**. Leia nessa ordem.

```
Uncaught TypeError: Cannot read properties of null (reading 'nome')
    at script.js:42
```

*Na linha 42, tentei ler `.nome` de algo que é `null`.*

A linha indicada é onde o erro **apareceu**; a causa costuma estar um pouco antes, em quem
preparou aquele valor.

> Um erro no console não é um castigo — é a única coisa no computador tentando te ajudar.

---

## Experimente

No console, com a página aberta:

1. `numeros.map(n => n * 10)` · `numeros.filter(n => n % 20 === 0)`
2. `time.sort((a, b) => b.pontos - a.pontos)` — e depois `time` de novo. O array original
   mudou: `sort` altera no lugar.
3. Escreva `function saudar(nome) { return "Oi, " + nome; }` direto no console e chame.
4. `const x = null; x.qualquerCoisa` — leia o erro com atenção.
5. `[1,2,3].reduce((a, b) => a + b, 0)` e depois tente calcular a média do array `numeros`.
6. No arquivo, transforme o `for` clássico da seção 7 em um `for...of` e depois em um
   `forEach`.
7. Escreva uma função `ehPar(numero)` que devolve `true` ou `false`, e use-a com
   `numeros.filter(ehPar)`. Repare que você passou a função **sem parênteses**.

---

**Anterior:** [`02-css`](../02-css/) · **Próximo:** [`04-dom`](../04-dom/) — o JavaScript
finalmente mexe na página.
