# Passo 3 — Desenho

**Novo:** `script.js` (e uma linha no HTML para carregá-lo)
**Rode:** abra o `index.html`.

---

## O que você vê

Um quadradinho ciano parado dentro do tabuleiro, um pouco acima e à esquerda do centro.

Três linguagens, três papéis — agora todas presentes:

| Arquivo | Responsabilidade | Pergunta que responde |
|---|---|---|
| `index.html` | Estrutura | **o que** existe na página? |
| `style.css` | Aparência | **como** isso se parece? |
| `script.js` | Comportamento | o que **acontece**? |

---

## Conceitos deste passo

### O DOM

Quando a página carrega, o navegador não guarda o seu HTML como texto. Ele monta uma
**árvore de objetos vivos** e a entrega ao JavaScript em uma variável pronta chamada
`document`.

```js
const tela = document.getElementById("jogo");
```

Essa linha percorre a árvore atrás do elemento com `id="jogo"` e devolve o objeto que o
representa. Alterar esse objeto muda a página na hora.

DOM = *Document Object Model*. É o nome dessa árvore. Você vai usá-la o tempo todo.

### O canvas é diferente de todo o resto

Para qualquer outro elemento, você muda a aparência pelo CSS. O canvas não: ele é uma
**folha em branco**, e a única forma de colocar algo nele é desenhar por código.

```js
const pincel = tela.getContext("2d");
```

A tag em si não sabe desenhar; quem sabe é o **contexto**, que pedimos a ela.

### O pincel tem memória

```js
pincel.fillStyle = COR_COBRA;   // só escolhe a cor, não desenha
pincel.fillRect(x, y, 20, 20);  // pinta com a cor escolhida
```

`fillStyle` é como pegar um pote de tinta: fica valendo para tudo o que vier depois, até
você pegar outro pote. Por isso a **ordem das linhas importa** — escolher a cor depois
de pintar não faz nada.

E a ordem também define o que fica por cima: **quem pinta depois cobre quem pintou
antes.** É por isso que o fundo vem primeiro.

### `fillRect(x, y, largura, altura)`

Duas armadilhas, as duas clássicas:

1. **`x` e `y` são o canto superior esquerdo**, não o centro.
2. **O eixo Y cresce para baixo.** A origem `(0,0)` fica no canto de cima à esquerda, ao
   contrário do gráfico da escola. "Subir" é diminuir o `y`.

### Células, não pixels

Esta é a decisão mais importante do projeto inteiro:

```js
const cabeca = { coluna: 5, linha: 5 };   // o estado pensa em CÉLULAS

const x = cabeca.coluna * PIXELS_POR_CELULA;   // o desenho converte em PIXELS
```

O tabuleiro é uma grade de 20×20 casinhas. A lógica do jogo trabalha com números
inteiros pequenos (0 a 19); só o desenho sabe que uma casinha vale 20 pixels.

Parece detalhe. Não é. Nos próximos passos, andar vai ser `coluna += 1` em vez de
`x += 20`, e bater na parede vai ser `coluna >= COLUNAS` em vez de uma conta com
larguras. E, no passo final, vamos trocar **todo** o visual do jogo sem tocar em uma
única regra.

> **Separe o que a coisa É do jeito como ela APARECE.** Vale para jogos, para sites e
> para qualquer programa que você venha a escrever.

### `const` e o número que não se repete

```js
const COLUNAS = tela.width / PIXELS_POR_CELULA;
```

Poderíamos escrever `const COLUNAS = 20`. Mas aí o tamanho do tabuleiro estaria dito em
dois lugares — no HTML e aqui — e um dia alguém mudaria só um deles. Calcular a partir da
fonte original elimina a chance do erro em vez de pedir cuidado.

### `defer`

```html
<script src="script.js" defer></script>
```

Sem `defer`, o script roda no meio do `<head>`, quando o `<canvas>` ainda não existe.
`getElementById` devolve `null`, e a próxima linha explode com uma mensagem obscura.

Quando um erro seu mencionar `null` logo ao carregar a página, desconfie desta palavra.

---

## Como ler um erro (você vai precisar)

Aperte **F12** e vá na aba **Console**. É lá que aparecem os erros do JavaScript e é o
primeiro lugar a olhar quando algo não funciona.

Teste agora, de propósito: troque `getElementById("jogo")` por `getElementById("joog")`
e recarregue. Aparece algo como:

```
Uncaught TypeError: Cannot read properties of null (reading 'getContext')
    at script.js:34
```

Leia da direita para a esquerda: **na linha 34**, tentou usar `getContext` **de algo que
é `null`**. Ou seja: a busca não achou elemento nenhum. Corrija o nome e siga.

> Um erro no console não é um castigo — é a única coisa no computador que está tentando
> te ajudar. Ler o nome do arquivo e o número da linha resolve a maioria dos problemas.

---

## Experimente

1. Mude `cabeca` para `{ coluna: 0, linha: 0 }`. O quadrado vai para o canto **superior**
   esquerdo — a prova de que o Y cresce para baixo.
2. Tente `{ coluna: 19, linha: 19 }` e depois `{ coluna: 20, linha: 20 }`. O segundo
   desaparece: com 20 colunas, os índices válidos vão de 0 a 19. Guarde essa cena, ela
   volta no passo 8.
3. Inverta as duas últimas linhas do arquivo (pinte antes de escolher a cor). O quadrado
   sai da cor do fundo — porque o `fillStyle` que valia era o anterior.
4. Pinte um segundo quadrado em outra célula. Você vai precisar repetir três linhas; guarde
   esse incômodo, ele é resolvido no passo 6.
5. Comente as duas linhas do fundo. O quadrado continua lá, mas sobre o fundo do CSS —
   prova de que o canvas é transparente até alguém pintá-lo.

---

**Anterior:** `02-estilo` · **Próximo:** `04-movimento` — o quadrado ganha vida.
