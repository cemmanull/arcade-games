# Lição 5 — Projeto: lista de tarefas

**Rode:** abra o `index.html`. Adicione tarefas, marque, filtre, **recarregue a página**.

---

## O que você construiu

Um aplicativo de verdade: adiciona, marca como concluída, remove, filtra e **lembra de
tudo** ao fechar o navegador. Sem biblioteca, sem instalação, sem servidor.

As quatro lições anteriores, juntas:

| Lição | Aparece aqui como |
|---|---|
| HTML | `<form>`, `<ul>`, labels ligados, atributos `data-` |
| CSS | mobile first, flexbox, variáveis, estados, foco visível |
| JavaScript | arrays de objetos, `filter`, `find`, `some`, funções puras |
| DOM | criar elementos, eventos, `classList`, `textContent` |

---

## A arquitetura — a parte que mais importa

Este é o desenho que quase todo programa de interface tem, e que vale levar para qualquer
projeto futuro:

```
ESTADO      →  os dados, em variáveis JavaScript  (tarefas, filtroAtual)
AÇÕES       →  funções que MUDAM o estado          (adicionar, remover…)
RENDERIZAR  →  desenha a tela A PARTIR do estado   (renderizar)
EVENTOS     →  ligam o que o usuário faz às ações
```

E o fluxo corre **sempre em uma direção só**:

```
usuário → evento → ação → muda o estado → renderiza → tela
```

Nunca o contrário. A tela jamais é consultada para saber o que é verdade.

> Essa regra é o que impede uma interface de "se perder" — daquele jeito em que o contador
> diz 3, a lista mostra 4 itens e ninguém sabe qual está certo. É também, em essência, a
> ideia por trás de React, Vue, Svelte e companhia.

### Redesenhar tudo

`renderizar()` apaga a lista e a reconstrói inteira, toda vez. Parece desperdício e é a
escolha certa: **não existe "atualizar só o item 3"** — que é exatamente onde nascem os
bugs de interface. Com uma lista de milhares de itens você otimizaria; com dezenas, o
navegador nem sente.

---

## Conceitos novos desta lição

### `localStorage`

```js
localStorage.setItem("tarefas", JSON.stringify(tarefas));
JSON.parse(localStorage.getItem("tarefas") || "[]");
```

Guarda dados no navegador, presos ao endereço do site. Sobrevivem a fechar a aba e
desligar o computador.

Duas regras:

1. **Só guarda texto.** Objetos e listas precisam passar por `JSON.stringify` na ida e
   `JSON.parse` na volta.
2. **Não é banco de dados.** O espaço é de poucos megabytes, o dado é daquele navegador
   naquele computador, e some se o usuário limpar os dados do site.

### `try/catch`

```js
try {
    return JSON.parse(textoSalvo);
} catch (erro) {
    console.warn("Dado salvo inválido, começando do zero.", erro);
    return [];
}
```

*Tente executar; se der erro, caia no `catch` em vez de quebrar a página.*

Aqui ele protege contra um dado corrompido no `localStorage`. É raro — e deixaria o
aplicativo inutilizável **para sempre**, sem que o usuário entendesse por quê, já que
recarregar não resolveria. Um `try/catch` em toda leitura de dado externo é barato.

### Atributos `data-`

```html
<button data-filtro="pendentes">Pendentes</button>
```
```js
botao.dataset.filtro   // "pendentes"
```

Qualquer atributo começado por `data-` é livre para você inventar, e o JavaScript o lê
pelo `dataset`. É como guardar uma informação **no próprio elemento**, em vez de manter
uma tabela paralela ligando botões a comportamentos.

### `id` em vez de posição

```js
{ id: Date.now(), texto: "...", concluida: false }
```

A tarefa é identificada por um id, não pela posição na lista. Posições mudam quando algo é
removido — e aí o botão "remover" da linha 3 apagaria a tarefa errada. É um bug clássico,
e o id o elimina de vez.

### `classList.toggle` com segundo argumento

```js
botao.classList.toggle("ativo", estaAtivo);   // liga se true, desliga se false
```

Evita um `if/else` de quatro linhas.

---

## Acessibilidade: cinco detalhes que fazem diferença

Nenhum deles é enfeite; todos custam uma linha.

1. **`<label>` ligado a cada campo.** Um `placeholder` **não** substitui: ele some assim
   que se digita, e quem usa leitor de tela nunca o ouve como nome do campo.
2. **A classe `.apenas-leitor-de-tela`** esconde um texto visualmente mantendo-o para
   leitores de tela. `display: none` o removeria para todos. É a receita padrão — vale
   copiar para qualquer projeto.
3. **`aria-label` no botão `×`.** O caractere "×" não significa nada em voz alta; o
   `aria-label` dá ao botão um nome de verdade, incluindo qual tarefa ele remove.
4. **`:focus-visible` sempre visível.** Aperte Tab na página: o contorno anda pelos
   elementos. Sem ele, quem navega por teclado fica cego dentro da própria página.
5. **`prefers-reduced-motion`.** Quem pediu ao sistema para reduzir animações — por
   enjoo ou vertigem — recebe a interface sem transições.

E um de usabilidade: depois de adicionar, o código faz `campoTarefa.focus()`. Quem está
digitando não quer pegar o mouse de novo.

---

## Você terminou o tutorial

Com HTML, CSS e JavaScript puros, sem instalar nada, você já consegue construir uma
interface completa. Tudo o que vem depois — frameworks, ferramentas de build, TypeScript —
é construído **em cima** disso, e faz muito mais sentido depois desta base.

---

## Experimente

1. **Editar tarefa:** duplo clique no texto vira um campo editável (dica: evento
   `dblclick`, criar um `<input>`, e salvar no `blur` ou no Enter).
2. **Reordenar:** botões ↑ e ↓ em cada tarefa. Dica: `splice` para remover e inserir na
   posição nova.
3. **Data:** guarde `criadaEm: Date.now()` e mostre "há 3 minutos" abaixo do texto.
4. **Prioridade:** um `<select>` com alta/média/baixa, uma cor de borda para cada, e
   ordenação por prioridade.
5. **Contador no título da aba:** `document.title = \`(${pendentes}) Minhas tarefas\``.
6. **Tema escuro:** um botão que alterna uma classe no `<body>` e salva a preferência no
   `localStorage`. Como todas as cores são variáveis, você só redefine o `:root`.
7. **Confirmação:** peça confirmação antes de "limpar concluídas" (dica: `confirm()`).
8. **Teste a resiliência:** abra o console e escreva
   `localStorage.setItem("tarefas", "lixo{{{")`, depois recarregue. O `try/catch` segura o
   tranco — comente-o e repita para ver a diferença.

---

## Para onde ir agora

**[`../jogo-da-cobrinha`](../../jogo-da-cobrinha/)** — dez passos construindo um jogo, onde
entra o `<canvas>` e o game loop.

Ou os projetos completos: **[`../pong`](../../pong/)** (movimento contínuo, física de
ricochete, oponente automático) e **[`../xadrez`](../../xadrez/)** (regras complexas e um
computador que pensa).

---

**Anterior:** [`04-dom`](../04-dom/)
