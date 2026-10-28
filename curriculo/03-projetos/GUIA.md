# Currículo — Passo 3: Projetos como dados

**Mudou:** `projetos.js` (novo: a lista `const projetos = [ … ]`, um objeto por projeto), `script.js` (novo: `lerProjetos`, `conferirProjetos`, `criarCartao` e as funções que montam cada pedaço), `index.html` (os quatro cartões escritos à mão **sumiram**; no lugar ficou `<div id="lista-projetos">`) e `style.css` (miniatura, etiquetas de técnica e a caixa de aviso).
**Rode:** abra o `index.html`. Depois abra `projetos.js`, troque um `nome`, salve e recarregue. Depois apague o `alt` de um projeto e recarregue de novo.

---

## O que você vê

A página parece a do passo 2, mas agora cada cartão tem uma **miniatura**: um bloco colorido com a inicial do projeto. Nada do que aparece nos cartões está no HTML: ele vem de `projetos.js`. Se você apagar um campo obrigatório, os cartões somem e no lugar aparece uma lista de problemas ("Projeto 2: falta alt"). A página nunca desenha cartão pela metade.

---

## 1. Dados no lugar de código

No passo 2, trocar de projeto significava editar HTML. Agora:

```js
{
    id: "tetris",
    nome: "Tetris",
    resumo: "Peças que giram e travam num poço…",
    tecnicas: ["matrizes", "rotação", "localStorage", "som"],
    pasta: "../../tetris/final/index.html",
    imagem: "",
    alt: "Tetris: peças coloridas caem num poço…",
    cor: "#5b3fa0"
}
```

Quem escreve o currículo mexe nos **dados**; o código que os desenha nunca muda. É a mesma ideia do catálogo de
inimigos do [Shoot-em-up](../../shoot-em-up/04-inimigos/) e das fichas do Xenomorph: o que muda entre uma criatura e
outra é um número numa tabela, não uma função nova. E é o desenho de arquitetura do [projeto de tarefas](../../tutorial/05-projeto/):

```
DADOS (projetos)  →  CONFERIR  →  RENDERIZAR (cartões)
```

A tela **nunca** é consultada para saber o que é verdade. Os dados mandam.

**Por que `projetos.js` e não `projetos.json` com `fetch`?** Porque uma página aberta com duplo clique (`file://`)
não pode ler outros arquivos com `fetch`: o navegador bloqueia. Um `<script>` comum não tem essa limitação. O arquivo
só declara `const projetos`, e o `script.js` (carregado depois, os dois com `defer`) o enxerga.

---

## 2. Conferir antes de desenhar

Um erro de digitação num dado não pode virar um cartão quebrado, um link morto ou uma imagem sem texto alternativo.
Por isso `conferirProjetos` roda **antes** de qualquer desenho e devolve uma lista de problemas em português:

```js
const problemas = conferirProjetos(projetos);
if (problemas.length > 0) {
    mostrarProblemas(problemas);
    return;
}
```

Ela confere, para cada projeto: `id`, `nome`, `resumo`, `pasta` e `alt` não vazios; `tecnicas` uma lista de textos
com pelo menos um; `nome` e `id` **sem repetição** (um campo que falta é avisado como "falta", não também como "repetido"); `id` só com letras minúsculas sem acento, números e hífen, porque ele vira o endereço `#projeto-<id>` e um espaço quebraria o link sem avisar; e `cor` válida quando não há imagem. Veja que a função
**só responde** (devolve a lista); quem decide o que fazer com os problemas é `desenharProjetos`. É a mesma separação
do [Pac-Man](../../pacman/01-labirinto/), que confere o mapa do labirinto antes de usá-lo.

E se o erro estiver no próprio `projetos.js`? Há dois jeitos de ele falhar, e o script trata os dois com uma pequena função, `lerProjetos`, que lê a lista dentro de um `try … catch` e devolve a lista **ou o motivo**. Nos dois casos aparece um aviso na página (nos passos seguintes, o tema e as teclas continuam funcionando):

- **Erro de sintaxe** (uma vírgula esquecida): o navegador descarta o arquivo inteiro e a constante `projetos` **nem é declarada**. Nesta página `projetos` também é o `id` de uma `<section>`, e o navegador cria uma variável global para cada `id`: então `projetos` passa a ser o **elemento**, e `Array.isArray` o recusa ("projetos precisa ser uma lista");
- **Erro na hora de rodar** (`nome: Tetris`, sem aspas): a constante é criada, mas o arquivo para antes de lhe dar um valor, e ela fica **inutilizável**. Qualquer leitura, até `typeof projetos`, lança "Cannot access 'projetos' before initialization". Por isso a leitura fica no `try`, e o `catch` devolve "projetos.js não terminou de carregar: veja o erro no console (F12)".

Em ambos, o console (F12) mostra o arquivo e a linha do erro.

> O `alt` obrigatório **não é burocracia**: uma imagem sem ele é invisível para quem usa leitor de tela, e o
> dado que o torna obrigatório garante que o cartão nunca saia sem ele.

---

## 3. Criar elementos, sempre com `textContent`

```js
function criarElemento(nomeDaTag, texto, classe) {
    const elemento = document.createElement(nomeDaTag);
    elemento.textContent = texto;
    if (classe) elemento.className = classe;
    return elemento;
}
```

É a receita do [DOM](../../tutorial/04-dom/): criar, preencher, acrescentar (o terceiro parâmetro, `classe`, é opcional: serve para as etiquetas e, adiante, o selo). O ponto que importa aqui é `textContent`
em vez de `innerHTML`. Teste: mude um `nome` para `Tetris <b>(o melhor)</b>`. A página mostra os sinais `<b>`
**como texto**, porque `textContent` nunca interpreta marcação. Com `innerHTML` o navegador obedeceria o que estivesse
no dado. Num currículo em que você só digita seus próprios textos isso parece inofensivo. Mas o hábito é o mesmo que
evita injeção de código em toda página que mostra texto vindo de fora.

`criarCartao` é só uma montagem de peças pequenas (`criarMiniatura`, `criarTecnicas`, `criarLinkDoJogo`), cada uma
fazendo uma coisa.

---

## 4. A miniatura sem arquivo de imagem

Até o `final` (que traz as imagens de verdade) o cartão não tem arquivo de imagem. Mas continua sendo uma `<img>`, com `alt`:

```js
imagem.alt = projeto.alt;
imagem.src = projeto.imagem || criarBlocoColorido(projeto);
```

`criarBlocoColorido` monta um **SVG**, que é só texto (um retângulo da cor do projeto e a inicial do nome), e o entrega no
próprio `src`, no formato `data:image/svg+xml,…`. Nenhum arquivo, nenhum pedido ao servidor. Pontos para guardar:

- Como é uma `<img>`, o `alt` vale como em qualquer imagem: ele diz **o que o projeto é**, e não "captura de tela".
  É o `<img alt>` do [tutorial de HTML](../../tutorial/01-html/).
- A **inicial** do nome dentro do bloco diz qual projeto é. A cor sozinha não bastaria: quem não distingue verde de
  marrom ainda lê a letra.
- Se o objeto tiver `imagem: "amostras/tetris.png"`, essa imagem **substitui** o bloco, com o mesmo `alt`.
- O texto branco só é legível se a `cor` for **escura**. É por isso que os dados usam verde-floresta e roxo fundo.
- A `cor` só entra no SVG depois de passar pela conferência (`#` e seis dígitos). Dado que vai parar dentro de
  marcação precisa ser conferido.

---

## 5. Etiquetas de técnica: texto, não cor

As `tecnicas` viram uma lista com borda e texto. Cada etiqueta **é** a palavra ("canvas", "som"). Se um dia você
pensar em colorir por categoria (verde = jogos, azul = site), lembre que isso só funciona para quem enxerga as cores:
a palavra tem de continuar lá.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| `const projetos = [ … ]` num `.js` | dados que funcionam em `file://`, sem `fetch` |
| `conferirProjetos(lista)` | valida os dados e devolve uma lista de problemas |
| `Set` | lembrar o que já apareceu (nomes e ids repetidos) |
| `textContent` | texto vira texto, nunca marcação |
| `replaceChildren()` | esvaziar um elemento antes de desenhar de novo |
| `data:image/svg+xml,…` | uma imagem SVG sem arquivo, escrita no próprio `src` |
| `encodeURIComponent` | deixar um texto seguro para ir dentro de um endereço |

---

## Experimente

1. **Um projeto seu.** Troque o Tetris por outro jogo do curso (ele tem `final/`?). Mude `id`, `nome`, `pasta`, `cor` e o link da habilidade no `index.html`: o que acontece com o link antigo?
2. **Dados errados.** Deixe `pasta: ""`, depois repita o `nome` de outro projeto, depois tire o `alt`. Leia cada mensagem: ela diz o que consertar?
3. **Nova regra.** Faça `conferirProjetos` recusar um `resumo` com mais de 160 caracteres.
4. **Marcação.** Escreva `<b>` num `resumo`. Por que ele não vira negrito? Troque `textContent` por `innerHTML` **só para ver** e desfaça.
5. **Quinto cartão.** Adicione um projeto só nos dados, sem tocar no HTML nem no CSS. Quantas colunas aparecem em 1280 px?
6. **A ordem.** Reordene os objetos de `projetos`. Qual projeto você quer que o leitor veja primeiro?

---

**Anterior:** [`02-layout`](../02-layout/) · **Próximo:** [`04-amostras`](../04-amostras/) — cada cartão ganha uma amostra de verdade: um trecho do código, copiado do jogo, e um botão opcional "Jogar aqui" que só carrega o jogo quando você pede.
