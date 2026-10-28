# Currículo — Passo 4: As amostras

**Mudou:** `projetos.js` (cada projeto ganha `internet`, `jogarAqui`, `arquivo`, `oQueMostra` e `trecho`), `script.js` (selo, `criarTrecho`, crédito e o botão **Jogar aqui** com `abrirJogo`/`fecharJogo`; `conferirProjetos` confere o trecho) e `style.css` (botão, `<details>`, `<pre>`, o `iframe` com a proporção de um celular). O `index.html` só muda no comentário.
**Rode:** abra o `index.html`, abra "Ver um trecho do código" num cartão e role o código com Tab e as setas. Depois, em `projetos.js`, troque `jogarAqui: false` por `true` no primeiro projeto, recarregue e clique em **Jogar aqui**. Aperte **Esc** (com o foco no botão).

---

## O que você vê

Cada cartão passa a **provar** o que afirma, de três jeitos, do mais leve ao mais pesado:

1. o **link** "Abrir ..." leva ao jogo (custo zero para a página);
2. um **trecho de código** real, escondido num `<details>`, para o leitor técnico ver que você entende o que fez;
3. opcionalmente, o botão **Jogar aqui**, que traz o jogo para dentro do currículo.

E um selo em **texto**: "✓ Abre sem internet" ou "⚠ Precisa de internet". Um jogo em 3D, por exemplo, baixa uma biblioteca da internet, e o leitor deve saber disso antes de clicar.

---

## 1. Por que o link é o padrão e o `iframe` é opcional

| Jeito | O que custa |
|---|---|
| Link | nada: o leitor sai do currículo, mas o teclado e o foco continuam normais |
| `<iframe>` sempre carregado | quatro jogos (canvas, som) carregando juntos no celular, e **as setas** do teclado: movem o jogo ou rolam a página? |
| `<iframe>` ao clicar | só custa quando o leitor pede; mas a armadilha de teclado continua |

Por isso o botão vem **desligado** (`jogarAqui: false`) e o `iframe` **só existe depois do clique**:

```js
const quadro = document.createElement("iframe");
quadro.src = projeto.pasta;
quadro.title = `Jogo: ${projeto.nome}`;     // o leitor de tela anuncia o título do quadro
quadro.loading = "lazy";
```

Todo `<iframe>` precisa de `title`, assim como toda imagem precisa de `alt`. Sem ele o leitor de tela diz só "quadro".

### A armadilha de teclado, com honestidade

Quando o foco está **dentro** do jogo, as teclas são do jogo: o `keydown` da sua página nunca as recebe (o `iframe` é outro documento e, em `file://`, até outra origem). Por isso o `Esc` fecha o jogo **só com o foco no cartão**: no botão (logo depois de clicar em "Jogar aqui"), no **Fechar** ou no próprio cartão. O `keydown` confere `jogoAberto.cartao.contains(document.activeElement)`; quem está lendo outro trecho da página e aperta `Esc` não perde o jogo. Para sair de dentro do jogo:

- o botão vira **Fechar** (aperte Enter nele);
- **Tab** e **Shift+Tab** saem do jogo, em jogos que não prendem o foco;
- ao fechar com `Esc`, o foco **volta ao botão** que abriu. Sem isso, o foco some junto com o `iframe` e quem usa teclado volta ao topo da página.

Quando você publicar (passo 7) os `final/` dos jogos precisam ir **junto** na pasta, senão o `iframe` mostra uma página de erro.

### O tamanho do quadro, com honestidade

Os jogos do curso foram feitos para uma tela de celular de 390×750. O quadro tem essa proporção e, no máximo, 390 px de largura:

```css
.cartao iframe { width: 100%; max-width: 390px; aspect-ratio: 390 / 750; }
```

Num computador o jogo cabe inteiro. **Num celular de 390 px o cartão é mais estreito que a tela** (sobram uns 320 px depois das margens), então o quadro encolhe e o jogo, que pedia 390, aperta. Por isso, **no celular, o link "Abrir" é a melhor forma de jogar**: o jogo ocupa a tela toda. O "Jogar aqui" é uma conveniência para quem está no computador.

---

## 2. Só um jogo aberto, e `Esc` em um lugar

```js
let jogoAberto = null;   // { botao, quadro, cartao, projeto }
```

Uma variável diz **o que está aberto**. `alternarJogo` fecha o que estiver aberto e só abre o novo se o clique foi em outro botão. Assim há no máximo um `iframe`, e o `Esc` não precisa descobrir qual fechar. É o estado → ação → tela do [projeto de tarefas](../../tutorial/05-projeto/), em miniatura.

O botão muda de nome e de estado: `aria-expanded="true"` avisa ao leitor de tela que "aqui há algo aberto", e o rótulo inclui o jogo (`Jogar aqui: Tetris`), para que quatro botões iguais não soem iguais.

---

## 3. O trecho de código: `<pre><code>`

```js
bloco.tabIndex = 0;
bloco.setAttribute("role", "region");
bloco.setAttribute("aria-label", `Código de ${projeto.arquivo}`);
```

- `<pre>` mantém espaços e quebras de linha; `<code>` diz "isto é código".
- O código é **mais largo que o celular**. A rolagem fica **dentro** do bloco (`overflow-x: auto`), e a página continua sem rolagem lateral.
- Um bloco que rola só funciona para o teclado se puder **receber foco**: é o `tabIndex = 0`. Teste: aperte Tab até o bloco e use as setas.
- Cada trecho tem de 8 a 15 linhas e é **copiado, sem mudar nada**, do `final/` do jogo, com o nome do arquivo ao lado. Quem lê consegue conferir. O que você **diz** sobre o trecho vai em `oQueMostra`, **fora** do código.

Como escolher o trecho: algo que mostre **uma ideia**, pequena e inteira. A rotação do Tetris (uma conta com a matriz), a ficha de uma criatura (dados) ou `casaAtacada` do Xadrez (regra) mostram mais do que 15 linhas de configuração.

> Cuidado com a crase: o trecho está num texto entre crases (`` ` ``). Se o código copiado tiver uma crase ou `${`, ele quebra o arquivo. Os trechos desta página não têm.

---

## 4. Crédito e privacidade

Cada cartão termina com "Feito seguindo o curso *Do zero ao jogo*", com link. É o crédito de quem ensinou. O link é um endereço **absoluto** (`https://github.com/cemmanull/arcade-games`): um caminho como `../../README.md` só existe na pasta do curso e quebraria depois de publicado. O código dos jogos é **seu**, feito por você, mas o texto e a arte do curso, se você copiar, mantêm o crédito. Nada de imagem de terceiros sem licença.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| `<details>` e `<summary>` | abrir e fechar sem JavaScript, com teclado e leitor de tela |
| `<pre><code>` | mostrar código com os espaços preservados |
| `tabIndex = 0` | deixa um bloco que rola receber o foco |
| `iframe` com `title` | um jogo dentro da página, anunciado pelo nome |
| `loading="lazy"` | só carrega quando estiver perto de aparecer |
| `aria-expanded` | informa se o botão abriu algo |
| `keydown` + `Esc` | fechar com o teclado e devolver o foco |
| texto + ícone (✓ ⚠) | informação que não depende da cor |

---

## Experimente

1. **Liga e desliga.** Ligue `jogarAqui` no Tetris e jogue dentro do currículo. Dá para jogar só com o teclado? Quando o `Esc` deixa de funcionar?
2. **Seu trecho.** Troque o trecho do primeiro projeto por 8 a 15 linhas suas, copiadas **sem mudar nada**. Escreva `arquivo` e `oQueMostra`.
3. **Só um.** Ligue `jogarAqui` em dois projetos e abra um depois do outro. O que acontece com o primeiro?
4. **Sem título.** Apague a linha do `title` do `iframe`, ligue um leitor de tela (ou olhe a árvore de acessibilidade em F12) e compare.
5. **Pesado.** Abra o painel de rede (F12) e compare o que baixa a página com e sem o `iframe` aberto. Por que o padrão é o link?
6. **O selo.** Marque `internet: true` em um projeto. O que muda no cartão além da cor? (Dica: nada depende dela.)
7. **A ordem do Tab.** Aperte Tab por um cartão inteiro. A ordem bate com a ordem que você leria com os olhos?

---

**Anterior:** [`03-projetos`](../03-projetos/) · **Próximo:** [`05-acabamento`](../05-acabamento/) — tema claro e escuro que lembra sua escolha, folha de impressão para virar PDF, uma seção "Sobre mim" e uma tecla **H** que mostra a estrutura invisível da página.
