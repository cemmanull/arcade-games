# Currículo — Passo 6: Compartilhar

**Mudou:** o `<head>` do `index.html` (descrição, `theme-color`, as tags **Open Graph**, o ícone embutido e o marcador de endereço) e **uma linha** do `script.js` (`mostrarTema` pinta a barra do navegador). O `<body>`, o `projetos.js` e o `style.css` são os do passo 5.
**Rode:** abra o `index.html` e olhe a **aba**: agora ela tem um ícone. Depois abra as ferramentas do desenvolvedor (F12), aba "Elementos", e leia o `<head>`.

---

## O que você vê

Quase nada na página, e esse é o ponto: o `<head>` é o que **os outros** leem. O navegador (aba, histórico, favoritos), o buscador
(o resultado de pesquisa) e o aplicativo onde alguém cola o seu link (WhatsApp, LinkedIn, Discord) leem a página **antes
de qualquer pessoa**. Um currículo com `<head>` vazio aparece como um endereço seco, sem nome nem imagem.

---

## 1. O `<head>`, tag por tag

Você já conhece a estrutura do [tutorial de HTML](../../tutorial/01-html/). Aqui estão todas as peças deste currículo:

| Tag | O que faz |
|---|---|
| `<html lang="pt-BR">` | o leitor de tela escolhe a voz certa; o navegador oferece a tradução certa |
| `<meta charset>` e `viewport` | acentos corretos; sem o `viewport`, um celular de 390 px desenha a página como se tivesse 980 px |
| `<title>` | o texto da aba, do histórico e do resultado de busca: "Nome — Programação web e game design" |
| `<meta name="description">` | o resumo que a busca mostra sob o título (até uns 155 caracteres) |
| `og:title`, `og:description` | título e resumo do **cartão de pré-visualização** |
| `og:image` | a imagem do cartão (1200×630) |
| `og:url`, `og:type`, `og:locale` | o endereço oficial, o tipo (`website`) e o idioma (`pt_BR`); evitam cartões duplicados |
| `<link rel="icon">` | o ícone da aba |
| `theme-color` | a cor da barra do navegador no celular |

"og" vem de **Open Graph**, um combinado criado para as redes sociais lerem páginas. Nenhum navegador usa essas tags
para desenhar a sua página. Só os aplicativos que **buscam o seu link na internet** as leem.

---

## 2. O cartão só existe depois de publicar

Quando alguém cola o seu link no WhatsApp, o **servidor** do WhatsApp (e não o celular da pessoa) baixa a sua página, lê as tags
`og:` e monta o cartão. Por isso:

- Num arquivo no seu computador (`file://`), **nenhuma rede vai conseguir ler** a sua página. O cartão não aparece, e é normal.
- O `og:image` e o `og:url` precisam de **endereço absoluto** (`https://…`). O servidor da rede não sabe o que é `./cartao.png` nem de
  que pasta ele sai.
- Por isso, neste passo, eles têm **marcadores**: `https://SEU-USUARIO.github.io/SEU-REPOSITORIO/`. O comentário no `<head>`
  avisa. Eles são **falsos de propósito**: nenhum endereço real foi inventado. No [passo 7](../07-publicar/) você descobre o seu e troca.

Então o que dá para conferir agora, em casa? **Que as tags existem** e que o texto cabe: `description` com até uns 155 caracteres
(mais que isso, a busca corta), `og:title` curto. Leia cada uma em voz alta. Seria bom receber essa mensagem?

---

## 3. O ícone sem arquivo

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' …%3E%3C/svg%3E">
```

É o mesmo truque da miniatura do [passo 3](../03-projetos/): um SVG é texto, e um endereço `data:` leva o próprio conteúdo no lugar
do arquivo. Vantagens: nenhum arquivo para esquecer na hora de publicar e nenhum erro 404 de `favicon.ico` no console. Os
caracteres `<`, `>` e `#` aparecem como `%3C`, `%3E` e `%23` porque o endereço não pode ter símbolos soltos.

---

## 4. `theme-color` para os dois temas

```html
<meta name="theme-color" content="#f7f7fb" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#12121a" media="(prefers-color-scheme: dark)">
```

No celular, a barra de cima do navegador pega essa cor. São as mesmas cores de `--fundo` do [passo 5](../05-acabamento/), uma para cada
tema, escolhidas por `media`, como no CSS. Se você trocar a paleta, troque aqui também.

Só que `media="(prefers-color-scheme: dark)"` olha o **sistema**, e a pessoa pode ter escolhido o outro tema no botão (`data-tema`).
Então o `script.js` acerta isso: `mostrarTema`, que roda ao carregar, ao clicar no botão e quando o sistema muda de tema, copia a cor do fundo
que está **de fato** na tela (`getComputedStyle(document.body).backgroundColor`) para as duas tags. Os valores do `<head>` ficam como o primeiro palpite,
antes de o script rodar. Teste: com o sistema no claro, aperte **Tema escuro** e, em F12, olhe o `content` das tags mudar.

---

## 5. A imagem do cartão e a privacidade

`og:image` é a primeira coisa que o destinatário vê. Duas regras:

1. **Não use uma foto sua** sem querer de verdade que ela circule: o cartão é copiado, salvo e repassado.
   **Fotos de menores de idade, nunca.** Um bom cartão é só o **seu nome e a frase** sobre uma cor, e dá para fazer com uma captura da
   própria página: `node verificacao/rodar.mjs --captura curriculo/06-compartilhar/index.html --largura 1200 --altura 630`
   (precisa de Node e do Chrome; sem isso, um print do navegador serve).
2. Dê o **`og:image:alt`**: o texto que descreve o cartão para quem não o vê.

O arquivo `cartao.png` só existe na pasta publicada. Aqui, por não haver arquivo de imagem nos passos (só no `final`), ele é só o nome combinado.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| `<meta name="description">` | o resumo que a busca mostra |
| Open Graph (`og:`) | o cartão de pré-visualização das redes |
| endereço absoluto | o que quem está fora da sua máquina consegue abrir |
| marcador (`SEU-USUARIO`) | um valor falso e avisado, para trocar depois |
| `data:` no `rel="icon"` | ícone sem arquivo |
| `theme-color` com `media` | a cor da barra, uma para cada tema |

---

## Experimente

1. **Seu título.** Troque o nome no `<title>` e no `og:title`. Quantas vezes ele aparece no `<head>`?
2. **Corte.** Escreva uma `description` de 300 caracteres. O que a busca mostraria? Reescreva em 150.
3. **O ícone.** Troque a cor e a letra do SVG do ícone. Lembre de trocar `#` por `%23`.
4. **O que falta?** Tire a linha do `viewport`, abra a página no modo celular (F12) e compare com 390 px.
5. **Tradução.** Troque `lang="pt-BR"` por `lang="en"` e peça a um leitor de tela para ler a página. O que muda?
6. **Seu cartão.** Gere uma captura de 1200×630 do seu currículo e olhe: o nome e a frase se leem em miniatura (300 px de largura)?

---

**Anterior:** [`05-acabamento`](../05-acabamento/) · **Próximo:** [`07-publicar`](../07-publicar/) — o passo opcional que coloca a página na internet com o GitHub Pages: o único que pede conta e conexão, e o momento de trocar os marcadores pelos endereços reais.
