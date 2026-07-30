# Passo 2 — Estilo

**Novo:** `style.css` (e uma linha no HTML para carregá-lo)
**Rode:** abra o `index.html`.

---

## O que você vê

Fundo quase preto, título ciano brilhando, e um quadrado de 400×400 com borda acesa,
tudo centralizado na tela.

Compare com o passo 1 e repare no que **não** mudou: o HTML continua com as mesmas tags,
na mesma ordem, sem uma cor sequer escrita dentro dele. Toda essa diferença veio de um
arquivo separado.

> **Esta é a primeira grande decisão de arquitetura da web:** o HTML diz *o que existe*,
> o CSS diz *como aparece*. Quando os dois se misturam, o projeto vira um lugar onde
> você não sabe mais onde procurar.

---

## Conceitos deste passo

### A forma de uma regra

```css
h1 {                    /* seletor: quais elementos */
    font-size: 34px;    /* propriedade: valor */
    color: #00f0ff;
}
```

### Seletores

| Seletor | Pega |
|---|---|
| `body` | todo elemento `<body>` (pelo nome da tag) |
| `#jogo` | o elemento com `id="jogo"` — `#` é id, é único |
| `.item` | todos com `class="item"` — `.` é classe, pode repetir |

Ainda usamos só o primeiro tipo. Os outros chegam quando a página tiver mais peças.

### Cascata — o "C" de CSS

Duas regras podem disputar o mesmo elemento. O `<body>` define `color`, e essa cor é
herdada pelo `<h1>` — mas a regra do `<h1>` também define `color`. Quem vence?

A mais **específica**: `#id` > `.classe` > `tag`. Em caso de empate, vence a que estiver
mais **abaixo** no arquivo.

Guarde isso. Quando um estilo "não funcionar", 90% das vezes ele está funcionando — e
sendo derrotado por outro mais específico. O inspetor (F12 → aba *Styles*) mostra as
regras vencidas **riscadas**, o que resolve o mistério em dois segundos.

### Herança

Propriedades de texto (`color`, `font-family`, `letter-spacing`) descem do pai para os
filhos automaticamente. Por isso o título já nasceu com Courier New: quem mandou foi o
`<body>`.

Nem tudo é herdado — `border` não desce, senão cada elemento de dentro repetiria a borda
do pai. A regra prática: **o que descreve texto costuma ser herdado; o que descreve a
caixa, não.**

### Variáveis

```css
:root { --cor-neon: #00f0ff; }   /* declara */
h1    { color: var(--cor-neon); } /* usa */
```

O valor existe em um lugar só. É o mesmo princípio que vale para código em geral:
**um fato, um lugar.** Quando um valor está escrito em dois lugares, mais cedo ou mais
tarde alguém muda só um dos dois.

### Box model

Toda caixa tem quatro camadas, de dentro para fora:

```
┌─────────── margin (empurra os vizinhos) ────────────┐
│  ┌──────── border (a borda visível) ─────────────┐  │
│  │  ┌───── padding (recheio interno) ─────────┐  │  │
│  │  │             conteúdo                    │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Metade dos problemas de espaçamento é confundir `padding` (por dentro, empurra o
conteúdo) com `margin` (por fora, empurra os vizinhos).

### Flexbox

`display: flex` vai no **pai**, mas o efeito aparece nos **filhos**:

| Propriedade | O que faz |
|---|---|
| `flex-direction: column` | empilha os filhos verticalmente |
| `justify-content` | alinha ao longo do eixo principal (aqui, o vertical) |
| `align-items` | alinha no eixo perpendicular (aqui, o horizontal) |
| `gap` | espaço entre os filhos |

Com `flex-direction: row` (o padrão), os dois últimos trocam de eixo. Isso confunde todo
mundo no começo; a regra é: **`justify-content` segue a direção que você escolheu.**

### `display: block` no canvas

Sem essa linha, o navegador trata o canvas como se fosse uma letra dentro de um texto,
e reserva um espacinho embaixo para o pé do "g". Aparece uma faixa fininha que ninguém
entende de onde veio. Essa é a resposta para o clássico *"por que tem um espaço embaixo
da minha imagem?"*.

---

## Experimente

1. Troque as quatro variáveis do `:root` por tons de verde. Nenhuma outra linha pode ser
   tocada. Se você precisou tocar, é porque alguma cor está escrita fora do lugar.
2. Comente a linha `background-color` do `canvas` (`/* ... */`) e recarregue. Ele some —
   e você volta ao passo 1.
3. Troque `flex-direction: column` por `row` e veja o título ir para o lado do canvas.
   Repare que `justify-content` e `align-items` trocaram de eixo.
4. Apague `margin: 0` do `body` e olhe bem nos cantos: aparece uma faixa branca. É a
   margem de fábrica do navegador, que existe em toda página desde sempre.
5. Aumente o `gap` para `80px`. Um valor, dois espaçamentos resolvidos.

---

**Anterior:** `01-estrutura` · **Próximo:** `03-desenho` — o JavaScript entra em cena e
pinta o primeiro quadrado.
