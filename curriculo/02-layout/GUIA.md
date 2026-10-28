# Currículo — Passo 2: O layout

**Mudou:** `style.css` (de 45 para 110 linhas: variáveis de cor e espaço, o menu em flexbox, a grade de cartões com `auto-fit`/`minmax`, uma única `@media`) e `index.html` (só três classes novas: `habilidades`, `projetos` e `cartao`, mais um `<div class="projetos">` em volta dos cartões). O texto e os marcos são os do passo 1.
**Rode:** abra o `index.html`, depois **estique e encolha a janela** do navegador (ou use o modo celular das ferramentas do desenvolvedor, F12).

---

## O que você vê

A mesma página, vestida. No celular (390 px de largura) tudo cabe numa coluna e o menu quebra de linha. Numa tela grande (1280 px), o título e o menu dividem a primeira linha e os cartões se espalham em **três colunas**. Não existe rolagem para o lado em nenhum tamanho. Você não escreveu uma regra por aparelho: escreveu uma regra de como se comportar quando falta ou sobra espaço.

---

## 1. Mobile first

Escreva primeiro o CSS do celular, sem `@media`. Só no fim, numa única `@media (min-width: 48rem)`, diga o que **muda** quando há mais espaço:

```css
/* vale sempre */
h1 { font-size: 2rem; }

/* só de 48rem (768 px) para cima */
@media (min-width: 48rem) {
    h1 { grid-area: titulo; font-size: 2.75rem; }
}
```

Por que nessa ordem? O celular é a tela mais apertada, e o que cabe nela cabe em qualquer lugar. Aumentar é fácil; o caminho contrário obriga a desfazer coisas. O [projeto de tarefas](../../tutorial/05-projeto/) já fez assim.

**`rem`, não `px`.** `1rem` é o tamanho de letra que a pessoa escolheu no navegador (16 px por padrão). Quem aumenta a fonte, ou dá zoom de 200%, recebe um layout que cresce junto, em vez de texto estourando a caixa.

---

## 2. Variáveis: troque uma vez, muda em tudo

```css
:root {
    --fundo: #f7f7fb;
    --texto: #1b1b26;
    --destaque: #3b3bb3;
    --espaco: 1rem;
}

body { color: var(--texto); background: var(--fundo); }
```

Se o seu currículo for verde, você troca `--destaque` em um lugar. No passo 5 as mesmas variáveis ganham uma segunda versão para o tema escuro **sem tocar em nenhuma regra de elemento**. Veja [CSS](../../tutorial/02-css/) se `var()` ainda parecer estranho.

`--foco` guarda a cor do contorno do teclado: um laranja escuro que passa de 4,5:1 sobre o fundo claro (e passa muito além dos 3:1 que o contorno exige).

---

## 3. O menu: flexbox que quebra de linha

```css
nav ul { display: flex; flex-wrap: wrap; gap: 0.5rem; list-style: none; }
nav a  { display: inline-flex; align-items: center; min-height: 3rem; }
```

`flex-wrap: wrap` é a linha que deixa o menu **quebrar** em vez de empurrar a página para o lado. `min-height: 3rem` dá a cada link **48 px de altura**, o tamanho mínimo confortável para um dedo. Em tela de toque, um alvo menor é uma fonte de toques errados. Isso vale para o menu e para o link de cada cartão.

---

## 4. A grade de cartões

```css
.projetos {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: var(--espaco);
}
```

Leia assim: "faça **quantas colunas couberem**, cada uma com **pelo menos 16rem** e dividindo o que sobrar igualmente".

- Em 390 px sobram 358 px dentro das margens (390 − 2 × 16): cabe **uma** coluna de 16rem (256 px). Duas pedem 2 × 256 + 16 (o vão) = **528 px** de espaço útil, o que acontece numa janela de uns 560 px.
- Em 1280 px o corpo (`max-width: 70rem`, 1120 px) já parou de crescer e perde 2rem de cada lado: sobram 1056 px. **Três** colunas pedem 800 px e cabem. Quatro pediriam 4 × 256 + 3 × 16 = 1072 px e não cabem: o modelo tem três colunas em 1280 px, nunca quatro.
- A 2ª coluna aparece perto de 560 px de janela; a 3ª, perto de 864 px. Num computador, a barra de rolagem come uns 15 px, e o limite sobe na mesma medida.
- Em qualquer largura no meio, o número se ajusta sozinho. Nenhuma `@media` foi necessária.

`auto-fit` junta as colunas vazias e deixa os cartões esticarem; troque por `auto-fill` e veja a diferença com poucos cartões.

---

## 5. Onde a `@media` é mesmo necessária

Só o cabeçalho usa uma. A grade resolve o resto sozinha. Nomear áreas torna a grade legível:

```css
header {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: "titulo menu" "frase frase";
}
```

No HTML a ordem continua **título, frase, menu**. É a ordem que o leitor de tela e o Tab seguem. O CSS reorganiza o que se vê, **sem mexer na ordem de leitura**.

> Cuidado: quando o visual e a ordem do HTML se separam demais, o foco do teclado parece pular de lugar. Aqui a diferença é pequena de propósito.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| mobile first | escrever o celular primeiro e só **acrescentar** nas telas maiores |
| `rem` | unidade que acompanha o tamanho de letra escolhido pela pessoa |
| variáveis `--nome` | uma cor ou espaço definido uma vez, usado em todo lugar |
| `flex-wrap: wrap` | os itens quebram de linha em vez de estourar |
| `repeat(auto-fit, minmax(16rem, 1fr))` | colunas que se ajustam ao espaço, sem `@media` |
| `grid-template-areas` | nomear as áreas da grade e reposicioná-las |
| `min-height: 3rem` | alvo de toque de pelo menos 48 px |

---

## Experimente

1. **Outra cor.** Troque `--destaque` e `--borda`. Quanto do site muda? Quantas linhas você mexeu?
2. **Mais estreito.** Em F12, mude a largura para **360 px**. Há rolagem para o lado? Procure o que estoura.
3. **Zoom de 200%.** Aperte Ctrl e `+` até 200%. O texto reflui ou fica cortado?
4. **Duas colunas.** Troque `16rem` por `20rem`. Calcule antes: três colunas pedem 3 × 320 + 2 × 16 = 992 px de espaço útil. Em que largura de janela os cartões passam de 3 para 2? Confira no navegador.
5. **`auto-fill`.** Troque `auto-fit` por `auto-fill` e apague três cartões. Descreva a diferença.
6. **Marcos intactos.** Sem tocar no HTML, mude o título para a esquerda e o menu para baixo, só no CSS. A ordem do Tab mudou?

---

**Anterior:** [`01-estrutura`](../01-estrutura/) · **Próximo:** [`03-projetos`](../03-projetos/) — os cartões deixam de ser escritos à mão: cada projeto vira um objeto num arquivo de dados e o JavaScript desenha um cartão por objeto, depois de conferir os dados.
