# Passo 1 — Estrutura

**Arquivos:** `index.html`
**Rode:** abra o `index.html` no navegador.

---

## O que você vê

A palavra "Cobrinha" em letras grandes. Mais nada.

Isso está certo. O canvas existe na página, mas é uma folha **transparente** sobre um
fundo branco — invisível. Você acabou de encontrar a primeira lição de verdade:

> **O que você não vê pode estar lá.** Um elemento pode existir, ocupar espaço e não
> aparecer.

## Enxergando o invisível (o inspetor)

Aperte **F12** (ou clique com o botão direito → *Inspecionar*). Abre o painel de
ferramentas do navegador — a coisa mais útil que existe para quem faz páginas.

Na aba **Elements** (ou *Elementos*) você vê o seu HTML. Passe o mouse sobre a linha
do `<canvas>`: o navegador **acende um retângulo** na página mostrando onde ele está.
400 por 400, bem ali embaixo do título.

Volte a esse painel sempre que algo "não aparecer". Na maioria das vezes o elemento
está na página, mas transparente, com tamanho zero, ou escondido atrás de outro.

---

## Conceitos deste passo

### Tag

A unidade básica do HTML. Quase toda tag abre, contém e fecha:

```html
<h1>Cobrinha</h1>
 ^abre  ^conteúdo  ^fecha
```

Algumas não têm conteúdo e por isso não fecham, como `<meta charset="UTF-8">`.

### A árvore

Tags dentro de tags formam uma hierarquia de pais e filhos:

```
html
├── head          (informação sobre a página — invisível)
│   ├── meta
│   ├── meta
│   └── title
└── body          (o conteúdo visível)
    ├── h1
    └── canvas
```

Essa árvore é a coisa mais importante do HTML. É ela que o CSS percorre para aplicar
estilo, e é ela que o JavaScript enxerga para mexer na página. Você vai ouvir o nome
dela mais tarde: **DOM**.

### Atributo

Informação extra dentro da tag: `lang="pt-BR"`, `id="jogo"`, `width="400"`.

O `id` é especial: é um nome **único** na página inteira. Duas coisas não podem ter o
mesmo `id`. É por ele que vamos localizar o canvas nos próximos passos.

### `<head>` e `<body>`

| | Para que serve |
|---|---|
| `<head>` | informações **sobre** a página: título da aba, codificação, arquivos a carregar |
| `<body>` | o que o usuário **vê** |

### Semântica

Existe uma tag genérica, `<div>`, que serve para tudo. Ainda assim usamos `<h1>` para o
título. Por quê?

Porque `<h1>` **significa** "título principal desta página". O Google usa isso para
entender do que a página trata; um leitor de tela usa para navegar; o navegador usa para
montar um sumário. `<div>` não significa nada.

> **Escolha a tag pelo significado, nunca pela aparência.** Se você quer letra grande,
> isso é trabalho do CSS — que chega no próximo passo.

---

## Experimente

1. Troque `<h1>` por `<h6>` e recarregue. A letra encolhe — mas você acabou de dizer ao
   navegador que esse título é o **menos** importante da página. Volte para `<h1>`.
2. Apague a linha `<meta charset="UTF-8">` e recarregue. Dependendo do navegador, os
   acentos do texto interno do canvas quebram. Coloque de volta.
3. Mude `width="400"` para `width="200"` e observe o retângulo aceso no inspetor mudar
   de tamanho.
4. Escreva qualquer frase entre `<body>` e `<h1>`. Repare que texto solto funciona, mas
   você perdeu a informação de **o que aquilo é**.

---

**Próximo:** `02-estilo` — dar cor e forma a tudo isso.
