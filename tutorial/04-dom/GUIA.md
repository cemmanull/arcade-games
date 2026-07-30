# Lição 4 — DOM

**Rode:** abra o `index.html` e mexa em tudo.

---

## O que é o DOM

**DOM = Document Object Model.**

Quando a página carrega, o navegador **não** guarda o seu HTML como texto. Ele monta uma
**árvore de objetos vivos** e a entrega ao JavaScript numa variável pronta chamada
`document`.

Alterar esses objetos muda a página na hora. É essa ponte que transforma um documento
parado em um programa.

Três verbos resolvem quase tudo:

1. **encontrar** um elemento;
2. **alterar** ou **criar**;
3. **reagir** a eventos.

---

## 1. Encontrar

```js
document.getElementById("contador")     // um elemento, pelo id
document.querySelector(".destaque")     // o PRIMEIRO que casa com o seletor
document.querySelectorAll("li")         // TODOS que casam
```

`querySelector` aceita **qualquer seletor de CSS** — os mesmos da lição 2. Por isso
costuma ser o único de que se precisa.

> **Busque uma vez e guarde numa constante.** Buscar de novo dentro de uma função chamada
> com frequência é varrer a árvore inteira repetidamente, à toa.

Se a busca não encontrar nada, você recebe `null` — e a próxima linha explode com
*"Cannot read properties of null"*. Quando vir esse erro, verifique o nome do id e se o
`<script>` tem `defer`.

---

## 2. O princípio central

```js
let valorDoContador = 0;          // o estado REAL
contador.textContent = valorDoContador;   // o DOM é só o ESPELHO
```

O número vive numa variável do JavaScript. O `<strong>` na página apenas **mostra**.

Nunca leia o valor de volta da tela para fazer contas. No instante em que você trata o DOM
como fonte de verdade, o programa passa a depender de *como as coisas estão escritas* — e
quebra quando alguém trocar `3` por `Pontos: 3`.

O padrão é sempre o mesmo, em qualquer aplicação:

```
evento → muda o estado → redesenha a partir do estado
```

---

## 3. Alterar

### Texto

```js
elemento.textContent = "novo texto";
```

**`textContent` vs `innerHTML`:** o primeiro trata tudo como texto puro; o segundo
interpreta tags.

> Use `textContent`. Se o conteúdo vier de um usuário, `innerHTML` transforma a sua página
> numa porta de entrada para código de outra pessoa — isso tem nome, **XSS**, e é uma das
> falhas de segurança mais comuns da web. Só use `innerHTML` para HTML que você mesmo
> escreveu.

### Estilo

```js
elemento.classList.toggle("destaque");    // preferível
elemento.style.color = "red";             // só quando o valor é calculado
```

`classList` tem `add`, `remove`, `toggle` e `contains`.

**Prefira `classList`.** A aparência continua no arquivo de CSS, onde é fácil de achar e
mudar; o JavaScript só decide **quando** aplicar. Escrever pelo `style` espalha aparência
pelo código e cria uma regra tão específica que o CSS não consegue mais sobrescrever.

Use `style` para valores realmente calculados: uma posição, uma cor sorteada, uma largura
que depende de um número.

### Mostrar e esconder

```js
elemento.hidden = !elemento.hidden;
```

⚠️ `hidden` funciona porque o navegador aplica `display: none`. Se o seu CSS definir um
`display` para esse elemento, **a sua regra vence** e ele aparece mesmo "escondido".
Solução: escreva também `#meu-elemento[hidden] { display: none; }`.

---

## 4. Criar elementos

Três passos, e esquecer o terceiro é clássico:

```js
const item = document.createElement("li");   // 1. cria (solto, invisível)
item.textContent = "Café";                   // 2. configura
lista.appendChild(item);                     // 3. ENCAIXA na árvore
```

Enquanto não for encaixado, o elemento existe na memória e não aparece em lugar nenhum.

Outros úteis: `prepend`, `insertBefore`, `elemento.remove()`.

### Redesenhar tudo a partir do estado

A função `desenharLista()` **apaga a lista inteira e reconstrói do zero**, toda vez.

Parece desperdício. É a abordagem certa:

- a tela **nunca** fica dessincronizada dos dados;
- não existe "atualizar só o item 3" — que é exatamente onde nascem os bugs.

É a mesma ideia do canvas nos jogos (apagar e repintar) e é, em essência, o que
bibliotecas como React fazem por baixo, com otimizações para não refazer o que não mudou.

---

## 5. Eventos

```js
alvo.addEventListener("nome-do-evento", funcaoQueResponde);
```

Os mais usados:

| Evento | Dispara quando |
|---|---|
| `click` | clique |
| `input` | a cada caractere digitado / arrastar do range |
| `change` | o campo perde o foco com o valor alterado |
| `submit` | o formulário é enviado |
| `keydown` / `keyup` | tecla pressionada / solta |
| `mousemove` | o mouse se move |

`input` dispara a cada tecla; `change` só no fim. Para resposta ao vivo, use `input`.

### O objeto de evento

O navegador **entrega um objeto** com os detalhes:

```js
elemento.addEventListener("keydown", evento => {
    evento.key        // qual tecla
    evento.clientX    // onde estava o mouse
    evento.target     // qual elemento disparou
});
```

### Passar a função, não chamá-la

```js
botao.addEventListener("click", minhaFuncao);     // certo
botao.addEventListener("click", minhaFuncao());   // errado
```

Com parênteses você executa **agora** e entrega o resultado. Sem, entrega a função para o
navegador chamar depois.

---

## 6. Formulários

```js
formulario.addEventListener("submit", evento => {
    evento.preventDefault();
    const texto = campo.value.trim();
    ...
});
```

Três coisas para levar:

1. **Ouça o `submit`, não o clique do botão.** Assim o Enter dentro do campo também
   funciona, de graça.
2. **`preventDefault()` é obrigatório.** O comportamento padrão de um formulário é
   recarregar a página — e tudo o que o seu JavaScript fez desaparece.
3. **`.value` é sempre uma string**, mesmo em `type="number"` ou `"range"`. Sem
   `Number(...)`, `"16" + 1` dá `"161"`.

Detalhe de cuidado com quem usa: depois de adicionar um item, o código faz
`campo.focus()`. Quem está digitando não quer ter que pegar o mouse de novo.

---

## 7. Coordenadas do mouse

```js
const area = elemento.getBoundingClientRect();
const x = evento.clientX - area.left;
```

`clientX`/`clientY` são relativos à **janela**. Para saber a posição dentro de um
elemento, desconte onde ele começa. `getBoundingClientRect()` devolve posição e tamanho
reais do elemento na tela.

Guarde essa conta: ela é obrigatória em qualquer coisa desenhável — pintura, arrastar,
jogos com mouse.

---

## Experimente

Primeiro no console, com a página aberta:

1. `document.querySelector("h1").textContent = "Mudei!"`
2. `document.body.style.background = "#111"` e depois
   `document.querySelectorAll("section").forEach(s => s.style.borderColor = "red")`
3. `document.querySelectorAll("button").length`

Depois, no código:

4. Faça o botão *Somar 1* somar 5. Repare que você mexe **no estado**, não no texto.
5. Adicione um botão "limpar tudo" que esvazia a lista de itens.
6. Impeça itens repetidos: se o texto já existe em `itens`, não adicione (dica: `includes`).
7. Faça cada `<li>` ficar riscado ao ser clicado (dica: `classList.toggle` e uma classe
   nova no CSS com `text-decoration: line-through`).
8. Troque `textContent` por `innerHTML` na criação dos itens e adicione um item chamado
   `<img src=x onerror="alert('invadido')">`. Veja o alerta disparar — você acabou de
   demonstrar um XSS em você mesmo. Depois volte para `textContent`.
9. Guarde a lista no `localStorage` para ela sobreviver ao recarregamento:
   `localStorage.setItem("itens", JSON.stringify(itens))` e, ao iniciar,
   `JSON.parse(localStorage.getItem("itens") || "[]")`.

---

**Anterior:** [`03-javascript`](../03-javascript/) · **Próximo:**
[`05-projeto`](../05-projeto/) — juntar tudo em algo utilizável.
