# Currículo — Passo 1: A estrutura

**Novo neste passo:** tudo. `index.html` (a página inteira, só HTML semântico, dados fictícios) e `style.css` (45 linhas: o mínimo para ler e para ver o foco do teclado).
**Rode:** abra o `index.html`. Depois aperte **Tab** várias vezes e veja onde o foco passa.

Este é o último módulo do curso, e ele não é um jogo: é a **sua página**. No fim você terá um currículo online de
programação web e game design, feito só com o que aprendeu, com **amostras** dos seus projetos. Quem vai ler é
alguém com pressa (um recrutador, um professor), quase sempre no celular. Ele precisa achar, nesta ordem:
**quem você é** (uma frase), **o que sabe fazer**, **o que já fez** e **como falar com você**.

---

## O que você vê

Uma página simples, de uma coluna, com um nome, três seções e um rodapé. Quase sem enfeite. Isso é de propósito:
neste passo o que importa é a **estrutura**, a mesma que o leitor de tela, o buscador e o Tab enxergam. O layout vem
no passo 2.

O nome é Alex Exemplo e todos os dados são inventados (`alex@exemplo.invalid` nem é um endereço que existe). No
passo 5 você vai ver por que **não se coloca dado pessoal de verdade numa página pública**.

---

## 1. Marcos: o mapa da página

```html
<header>…</header>
<nav aria-label="Seções do currículo">…</nav>
<main id="principal">
    <section aria-labelledby="titulo-projetos">…</section>
</main>
<footer>…</footer>
```

Lembra do `<div>` do [tutorial de HTML](../../tutorial/01-html/)? Ele não diz nada sobre o que contém. Estas tags
dizem: `header` é a abertura, `nav` é a navegação, `main` é o conteúdo principal, `footer` é o fim. São os **marcos**
(*landmarks*), e um leitor de tela deixa a pessoa **pular direto** de um para outro, como quem olha o mapa antes de andar.

Regras desta página:

- **Um** `header`, **um** `main`, **um** `footer`.
- O `nav` tem `aria-label`. Se houver dois `nav` (menu e rodapé, por exemplo), o nome é o que os diferencia.
- Cada `section` aponta para o próprio título com `aria-labelledby`. O leitor anuncia "região Projetos".

---

## 2. Títulos: um índice que não pode pular degrau

```
h1  Alex Exemplo
 ├─ h2  Habilidades
 ├─ h2  Projetos
 │   ├─ h3  Jogo da Cobrinha
 │   └─ h3  Tetris
 └─ h2  Contato
```

- **Um só `h1`**: o nome. É o assunto da página.
- `h2` para cada seção, `h3` para cada projeto dentro dela.
- **Nunca pule nível** (de `h2` direto para `h4`). Quem navega por títulos se perde.
- Escolha o título pelo **significado**, não pelo tamanho. Se o `h3` ficou grande demais ou pequeno demais, isso se
  arruma no CSS.

Agora imagine só ouvir a página: um leitor de tela lê a lista acima. Se ela fizer sentido,
a estrutura está boa.

---

## 3. Âncoras: links para dentro da própria página

```html
<a href="#projetos">Projetos</a>
…
<section id="projetos">
```

`#projetos` significa "vá para o elemento cujo `id` é `projetos`". Dois cuidados: o `id` **precisa existir** (um
erro de digitação é um link que não vai a lugar nenhum) e **cada `id` aparece uma vez só**. Em "Habilidades", cada
item termina com **"Prova: …"** e um link `#projeto-cobrinha` para o projeto que a comprova. Uma afirmação sem prova
é só enfeite.

---

## 4. Pular para o conteúdo

```html
<a class="pular" href="#principal">Pular para o conteúdo</a>
```

É o **primeiro** elemento do `body`. Quem usa o teclado precisaria apertar Tab por todo o menu, em toda página que
visita. Este link permite saltar direto para o `<main id="principal">`. Ele fica fora da tela e **aparece quando
recebe o foco** (veja a regra `.pular:focus` no CSS). Aperte Tab assim que abrir a página.

E o contorno do foco? `a:focus-visible` desenha 3 px de laranja escuro em volta do link ativo. Sem ele, quem usa o
teclado fica cego dentro da própria página. Isso já foi dito no tutorial de CSS, e vale o resto do módulo.

---

## 5. Os projetos apontam para o `final/` de cada jogo

```html
<a href="../../tetris/final/index.html">Abrir o Tetris</a>
```

O caminho é **relativo**: `../..` sobe duas pastas (de `01-estrutura` para `curriculo` e daí para a raiz do curso) e
desce para o jogo. Termina em `index.html` porque, ao abrir a página com duplo clique, o navegador mostraria a lista
de arquivos da pasta em vez do jogo. Caminhos relativos também são o que faz a página funcionar depois, no passo 7,
quando ela estiver na internet.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| `header`, `nav`, `main`, `section`, `footer` | marcos: o mapa da página para o leitor de tela |
| `aria-label`, `aria-labelledby` | dá nome a uma região |
| `h1 > h2 > h3` | índice da página; sem pular nível |
| `id` e `href="#id"` | link para dentro da página |
| link "pular" | primeiro foco do teclado, leva ao `main` |
| `lang="pt-BR"` | o leitor de tela usa a voz certa |

---

## Experimente

1. **Seu nome.** Troque "Alex Exemplo" no `<h1>` e no `<title>` (a aba do navegador). O que mais no arquivo repete o nome?
2. **Uma seção nova.** Crie "Formação" com `section`, `aria-labelledby`, `h2`, um link no `nav` e um `id`. Teste o link.
3. **Quebre um `id`.** Mude `id="contato"` para `id="contatos"` e clique em "Contato". O que acontece? Conserte.
4. **Pule um nível.** Troque um `<h3>` por `<h5>`. A página parece igual? Por que isso é um problema mesmo assim?
5. **Teclado só.** Use somente Tab, Shift+Tab e Enter: dá para chegar a todos os links? O contorno está sempre visível?
6. **Ouça a página.** Ligue o leitor de tela do seu sistema (ou uma extensão) por um minuto e navegue só por títulos e marcos.

---

**Anterior:** [`08-depuracao`](../../proa-acesa/08-depuracao/) (Proa Acesa) · **Próximo:** [`02-layout`](../02-layout/) — a mesma página ganha um layout que começa no celular e cresce até a tela grande, com variáveis de cor e uma grade de cartões.
