# Lição 1 — HTML

**Rode:** abra o `index.html` no navegador.

---

## O que você vê

Uma página feia, preta no branco, com fonte serifada. Duas imagens quebradas (de
propósito).

**É assim que o HTML é sozinho.** Tudo o que aparece na tela é a aparência *de fábrica*
do navegador. Toda página do mundo — do jornal ao banco — começa exatamente assim, e
depois é vestida com CSS.

Você precisa conhecer essa camada nua. Quem aprende HTML e CSS ao mesmo tempo acaba
achando que `<h1>` "é a letra grande" — e isso leva a páginas mal construídas, que o
Google não entende e que ninguém consegue usar com leitor de tela.

---

## O que é o HTML

**HTML = HyperText Markup Language.** Uma linguagem de *marcação*, não de programação:
ela não calcula nem decide nada. Ela **etiqueta** pedaços de conteúdo dizendo o que cada
um é.

```html
<p>Um parágrafo.</p>
 ^     ^          ^
abre  conteúdo   fecha
```

Isso é uma **tag**. A maioria abre e fecha; algumas, como `<img>` e `<meta>`, não têm
conteúdo e por isso não fecham.

### Atributos

Informação extra dentro da tag de abertura:

```html
<a href="https://exemplo.com" target="_blank">um link</a>
   ^nome ^valor
```

### A árvore

Tags dentro de tags formam pais e filhos:

```
html
├── head              (informação sobre a página)
│   ├── meta
│   └── title
└── body              (o conteúdo visível)
    ├── h1
    ├── p
    └── ul
        ├── li
        └── li
```

Essa árvore é a estrutura mais importante da web. O CSS a percorre para aplicar estilo, e
o JavaScript a manipula para mudar a página. Você vai reencontrá-la na lição 4 com o nome
de **DOM**.

---

## As tags que importam

### Texto

| Tag | Para |
|---|---|
| `<h1>`…`<h6>` | títulos, do mais ao menos importante |
| `<p>` | parágrafo |
| `<strong>` | importante (não "negrito") |
| `<em>` | ênfase (não "itálico") |
| `<a href="...">` | link |
| `<code>` | trecho de código |
| `<br>` | quebra de linha forçada — use com parcimônia |
| `<hr>` | divisória temática |

> `<strong>` e `<em>` têm **significado** e são anunciados por leitores de tela. As
> antigas `<b>` e `<i>` só mudam a aparência. Se você quer só aparência, isso é CSS.

O HTML **ignora as quebras de linha** que você escreve no arquivo. Pode formatar o código
como quiser: quem decide onde o texto quebra é a largura da janela.

### Listas

```html
<ul>  <!-- unordered list: sem ordem, vira bolinhas -->
<ol>  <!-- ordered list: com ordem, vira números -->
<li>  <!-- list item: cada item -->
```

Os números do `<ol>` são gerados pelo navegador. **Nunca digite "1." à mão** — se você
inserir um item no meio, todos os outros ficam errados.

### Imagens

```html
<img src="foto.png" alt="Descrição da foto em palavras">
```

O `alt` é **obrigatório**. Ele é lido em voz alta por leitores de tela e aparece quando a
imagem não carrega — como nesta lição, onde as duas imagens estão quebradas de propósito
para você ver o `alt` funcionando.

Imagem puramente decorativa leva `alt=""` (vazio, mas presente): assim o leitor de tela a
ignora, em vez de ler o nome do arquivo em voz alta.

### Tabelas

`<table>` → `<thead>`/`<tbody>` → `<tr>` (linha) → `<th>` (cabeçalho) ou `<td>` (dado).

Tabela é para **dados tabulares** — coisas que realmente têm linhas e colunas. Nos anos
90 tabelas eram usadas para posicionar elementos na página; hoje isso é trabalho do CSS.

### Formulários

```html
<label for="nome">Seu nome:</label>
<input type="text" id="nome">
```

O `for` do label aponta para o `id` do campo. Isso **não é enfeite**:

- clicar no texto foca o campo (uma área de toque bem maior no celular);
- o leitor de tela anuncia *"Seu nome, campo de texto"* em vez de só *"campo de texto"*.

O `type` do input muda tudo: `text`, `number`, `email`, `password`, `date`, `color`,
`range`, `checkbox`, `radio`, `file`. No celular, ele também escolhe **qual teclado
aparece** — `type="number"` abre o teclado numérico.

⚠️ Um `<button>` dentro de um `<form>` sem `type` é um botão de **enviar**: ele recarrega
a página. Se o botão só serve para rodar um script, escreva `type="button"`.

### Agrupar

`<div>` é uma caixa genérica sem significado. `<span>` é a versão para pedaços de texto
dentro de uma linha.

Use as duas **quando não houver uma tag com significado que sirva**. Quando houver,
prefira a que significa algo:

`<header>` · `<nav>` · `<main>` · `<section>` · `<article>` · `<aside>` · `<footer>`

Por dentro elas se comportam igual a uma `<div>`. A diferença é a informação que carregam
— e escrever `<div class="header">` em vez de `<header>` é jogar essa informação fora de
graça.

---

## O princípio que atravessa tudo

> **Escolha a tag pelo significado do conteúdo, nunca pela aparência.**

Isso se chama **HTML semântico**, e o retorno é concreto:

- **buscadores** entendem a estrutura da sua página;
- **leitores de tela** conseguem navegar por títulos e seções — sem isso, uma pessoa cega
  ouve a página inteira do começo, toda vez;
- o **modo de leitura** do navegador funciona;
- e o **CSS fica mais fácil**, porque a estrutura já faz sentido.

Se você quer letra grande, não use `<h1>`. Use `<p>` e mande o CSS aumentar a letra.

---

## O inspetor (F12)

Aperte **F12** (ou botão direito → *Inspecionar*). Vá na aba **Elements** / *Elementos*.

Você vê o seu HTML como árvore. Passe o mouse sobre uma linha: o navegador acende o
elemento correspondente na página. Clique numa tag e edite o texto ali mesmo — a página
muda na hora (e volta ao normal quando você recarregar).

Este painel é a ferramenta mais útil que existe para quem faz páginas. Abra-o sempre.

---

## Experimente

1. Troque todos os `<h2>` por `<p>` e recarregue. A página continua legível para você —
   mas acabou de perder o índice inteiro. Aperte F12, procure o painel *Accessibility* e
   veja o que sobrou da estrutura.
2. Conserte a primeira imagem: baixe qualquer foto para a pasta e ajuste o `src`.
3. Apague o `alt` da segunda imagem. Sem ele, uma imagem quebrada some sem deixar rastro —
   e para quem usa leitor de tela, é como se ela nunca tivesse existido.
4. Adicione uma terceira coluna à tabela.
5. Ligue um `<label>` novo a um `<input>` novo e clique no texto do label para ver o campo
   receber o foco. Depois quebre a ligação (mude o `for`) e note a diferença.
6. Troque o `<button type="button">` por `<button>` e clique. A página pisca e recarrega —
   você acabou de enviar um formulário sem querer.
7. Coloque a página inteira dentro de `<main>` e crie um `<header>` com o `<h1>`.

---

**Próximo:** [`02-css`](../02-css/) — a mesma estrutura, vestida.
