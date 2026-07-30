# Lição 2 — CSS

**Rode:** abra o `index.html`. Leia o `style.css` em paralelo.

---

## O que você vê

A mesma matéria-prima da lição 1 — títulos, parágrafos, caixas — agora com cor,
espaçamento, alinhamento e reação ao mouse.

O HTML desta lição é quase todo `<div>` e `<p>`. Toda a diferença está no arquivo ao
lado.

---

## A forma de uma regra

```css
seletor {
    propriedade: valor;
}
```

**CSS = Cascading Style Sheets**, folhas de estilo em *cascata*. Vamos ao que essa palavra
significa.

---

## Seletores e especificidade

| Seletor | Pega | Símbolo |
|---|---|---|
| `p` | pela tag | — |
| `.destaque` | pela classe | ponto |
| `#unico` | pelo id | jogo da velha |
| `#placar p` | descendente: `p` dentro de `#placar` | espaço |
| `input[type="text"]` | pelo atributo | colchetes |
| `button:hover` | por estado | dois-pontos |

Quando duas regras disputam o mesmo elemento, vence a mais **específica**:

```
id (#)  >  classe (.)  >  tag
```

Em caso de empate, vence a que estiver **mais abaixo** no arquivo. Isso é a cascata.

> Quando um estilo "não funciona", quase sempre ele está funcionando — e sendo derrotado.
> **F12 → aba Styles**: as regras vencidas aparecem **riscadas**. Isso resolve o mistério
> em dois segundos, e é a habilidade de depuração de CSS mais importante que existe.

Use **classes para quase tudo**. Ids têm especificidade alta demais: para sobrescrever um
`#id` você precisa de outro `#id`, e isso vira uma escalada difícil de desfazer.

Um elemento pode ter várias classes (`class="destaque grande"`) e recebe todas. É assim
que se combinam estilos pequenos e reutilizáveis.

---

## Herança

Propriedades de **texto** (`color`, `font-family`, `line-height`) descem do pai para os
filhos automaticamente. Por isso a fonte é definida uma vez no `body` e vale para a
página inteira.

Propriedades de **caixa** (`border`, `padding`, `background`) **não** são herdadas — senão
cada elemento interno repetiria a borda do pai.

---

## Box model

```
┌─────────── margin — empurra os VIZINHOS ─────────────┐
│  ┌──────── border — a linha visível ──────────────┐  │
│  │  ┌───── padding — empurra o CONTEÚDO ───────┐  │  │
│  │  │              conteúdo                    │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

A diferença prática: **padding fica dentro do fundo colorido; margin fica fora.** Compare
as três caixas da seção 2 da página.

### `box-sizing: border-box`

```css
* { box-sizing: border-box; }
```

Por padrão, `width: 100px` + `padding: 20px` resulta numa caixa de **140px** — a largura
conta só o conteúdo. Com `border-box`, a largura passa a ser o total, padding e borda
incluídos.

Essas três linhas são a primeira coisa que se escreve em praticamente todo projeto CSS do
mundo. O padrão da linguagem é uma decisão dos anos 90 que ninguém defende hoje, mas que
não pode ser mudada sem quebrar a web inteira.

---

## Flexbox — uma direção

As propriedades vão no **pai**; o efeito aparece nos **filhos**.

| Propriedade | Faz |
|---|---|
| `display: flex` | ativa |
| `flex-direction` | `row` (padrão) ou `column` — escolhe o eixo principal |
| `justify-content` | alinha **ao longo** do eixo principal |
| `align-items` | alinha no eixo **perpendicular** |
| `gap` | espaço entre os filhos |
| `flex-wrap: wrap` | deixa quebrar para a linha de baixo |

O que confunde todo mundo: se você troca `row` por `column`, `justify-content` e
`align-items` **trocam de eixo**. A regra é: *`justify-content` sempre segue a direção que
você escolheu*.

Valores úteis de `justify-content`: `flex-start`, `center`, `space-between` (um em cada
ponta), `space-around`.

---

## Grid — duas direções

```css
display: grid;
grid-template-columns: repeat(3, 1fr);
```

`fr` é uma unidade de **fração do espaço disponível**. `1fr 2fr` faz a segunda coluna
ficar com o dobro da primeira.

**Quando usar cada um:**

- **flexbox** → uma fileira de coisas: menu, barra de botões, lista horizontal;
- **grid** → um layout de verdade: galeria, painel, a página inteira.

Não são rivais. É comum ter um grid no layout da página e flexbox dentro de cada peça.

---

## Estados

```css
.botao          { background: azul; transition: background 0.2s; }
.botao:hover    { background: azul-escuro; }
.botao:active   { transform: translateY(2px); }
```

`transition` vai no estado **normal**, não no `:hover` — assim a animação acontece na ida
*e* na volta.

### `:focus-visible` e uma regra de acessibilidade

`:focus-visible` aparece quando o elemento recebe foco pelo **teclado** (Tab), mas não
quando é clicado com o mouse.

> **Nunca escreva `outline: none` sem colocar outro indicador no lugar.** Quem navega por
> teclado — por deficiência motora, por preferência, ou porque o mouse quebrou — ficaria
> sem saber onde está na página. Aperte Tab nesta lição e veja o contorno andando pelos
> elementos.

---

## Posicionamento

| Valor | Comportamento |
|---|---|
| `static` | o padrão: fica onde o fluxo colocou |
| `relative` | igual, mas vira **referência** para filhos absolutos |
| `absolute` | sai do fluxo; posiciona-se pelo ancestral posicionado mais próximo |
| `fixed` | preso à janela; não rola com a página |
| `sticky` | normal até um limite, e então gruda |

A dupla **`relative` no pai + `absolute` no filho** é o padrão para sobrepor camadas:
etiquetas, distintivos, legendas, modais.

Sem o `relative` no pai, o filho absoluto mede as distâncias a partir da **página
inteira** — e é assim que ele vai parar no canto errado da tela. Essa é a explicação para
90% dos "meu `absolute` foi para o lugar errado".

---

## Unidades

| Unidade | É relativa a |
|---|---|
| `px` | nada — tamanho fixo |
| `em` | o tamanho da fonte do **pai** |
| `rem` | o tamanho da fonte da **raiz** (`<html>`) |
| `%` | o tamanho do **pai** |
| `vw` / `vh` | 1% da largura / altura da **janela** |
| `fr` | fração do espaço livre (só em grid) |

Use `rem` para tamanhos que devem acompanhar a preferência de fonte do usuário, `px` para
detalhes finos (bordas), `%` e `fr` para layout.

---

## Responsivo

```css
@media (max-width: 600px) {
    .demo-cartas { grid-template-columns: 1fr; }
}
```

Um bloco de regras que só vale sob certas condições. Estreite a janela desta lição abaixo
de 600px: o fundo muda de cor (para você ver disparar) e as cartas empilham.

**Mobile first** é a ordem recomendada: escreva primeiro o estilo do celular, sem media
query, e use `min-width` para adicionar o que telas maiores ganham. Sai mais simples,
porque a tela pequena é o caso mais restrito. (Nesta lição fizemos o contrário de
propósito, por ser mais fácil de demonstrar.)

---

## Variáveis

```css
:root { --cor-principal: #2563eb; }
.botao { background: var(--cor-principal); }
```

**Um fato, um lugar.** Quando um valor está escrito em dois lugares, mais cedo ou mais
tarde alguém muda só um dos dois.

---

## Experimente

1. Troque as cinco variáveis do `:root` por um tema escuro. Nenhuma outra linha pode ser
   tocada.
2. Comente `box-sizing: border-box` e observe as caixas da seção 2 crescerem.
3. Na `.demo-flex`, troque `justify-content` por `flex-start`, `center` e `space-around`.
   Depois mude `flex-direction` para `column` e veja os dois alinhamentos trocarem de eixo.
4. Na `.demo-grid`, experimente `grid-template-columns: 1fr 2fr` e depois
   `repeat(auto-fit, minmax(120px, 1fr))` — este último se adapta sozinho ao espaço, sem
   media query nenhuma.
5. Apague o `position: relative` de `.demo-posicao` e veja a etiqueta pular para o canto
   da página.
6. Aperte **Tab** várias vezes na página e observe o contorno de foco. Depois apague a
   regra `:focus-visible` e repita: você acabou de tornar a página inutilizável para quem
   não usa mouse.
7. Mude o `@media` de `max-width: 600px` para `900px` e recarregue sem estreitar a janela.
8. Abra o F12 e edite valores direto no painel *Styles*. É assim que se experimenta CSS de
   verdade — sem salvar arquivo e recarregar a cada tentativa.

---

**Anterior:** [`01-html`](../01-html/) · **Próximo:** [`03-javascript`](../03-javascript/)
