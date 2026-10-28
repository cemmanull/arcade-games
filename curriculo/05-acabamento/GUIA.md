# Currículo — Passo 5: O acabamento

**Mudou:** `style.css` (as cores viram um par claro/escuro com `light-dark()`, mais `prefers-reduced-motion`, a folha de impressão `@media print` e o modo da tecla H), `script.js` (o tema com `localStorage`, `lerTemaSalvo`, e a tecla **H**: `alternarEstrutura`, `marcarEstrutura`) e `index.html` (seção **Sobre mim**, perfil no contato, botão de tema e botão "Ver estrutura").
**Rode:** abra o `index.html`, aperte **Tema escuro**, recarregue a página. Aperte **H**. Aperte **Ctrl+P** e olhe a prévia da impressão.

---

## Antes de escrever qualquer coisa sua: privacidade

> **Uma página pública é lida por qualquer pessoa, e o que foi publicado pode ser copiado para sempre.**
> Mesmo que você apague depois, alguém pode já ter guardado.
>
> **Não publique:** endereço de casa, telefone pessoal, CPF, RG ou outro documento, data de nascimento completa,
> fotos de menores de idade, nome da escola com turma e horário, dados bancários.
>
> **Prefira:** cidade e estado, um **e-mail dedicado ou um alias** (um endereço só para isso, que você pode
> apagar), e um link para um perfil profissional.
>
> **Tem menos de 18 anos?** Converse com quem é responsável por você **antes** de publicar (o passo 7 volta a isso).

O modelo traz só dados inventados (`alex@exemplo.invalid`). Quando trocar pelos seus, use esta lista.
Formulário de contato precisa de servidor, e serviço externo de formulário entrega os dados de quem escreve a terceiros:
por isso o contato aqui é um `mailto:`. O modelo **não tem foto**. Se quiser uma, é decisão sua, por sua conta e risco.

---

## O que você vê

O mesmo currículo, agora com **tema claro ou escuro**, um **Sobre mim**, o perfil no contato e um botão
**Ver estrutura (H)** no rodapé. Aperte **Ctrl+P**: some o menu, o fundo vira branco, e cada link mostra o endereço
ao lado. É um PDF pronto (escolha "Salvar como PDF" na janela de impressão). **Nada anima sozinho.**

---

## 1. Tema claro e escuro

```css
:root {
    color-scheme: light dark;
    --fundo: light-dark(#f7f7fb, #12121a);
    --texto: light-dark(#1b1b26, #ececf5);
}
```

`light-dark(claro, escuro)` escolhe a cor conforme o **tema da pessoa** (`prefers-color-scheme`, o que o sistema
pede). Os dois valores da mesma variável ficam **lado a lado**, e nenhuma regra de elemento muda: é a vantagem de
ter feito variáveis no [passo 2](../02-layout/). `color-scheme` também escurece o que é do navegador (barras de rolagem, campos).

Mas quem escolhe é a **pessoa**, e não só o sistema. O botão grava a escolha no `<html>`:

```css
:root[data-tema="claro"]  { color-scheme: light; }
:root[data-tema="escuro"] { color-scheme: dark; }
```

Sem `data-tema`, vale o sistema. Com ele, vale o botão. O botão tem `aria-pressed`, e o rótulo continua "Tema escuro": o
leitor de tela diz "Tema escuro, ligado", em vez de um texto que muda.

### Contraste: um número, não um palpite

Texto normal precisa de **4,5:1** contra o fundo nos **dois** temas; contornos e foco, **3:1**. A razão é calculada a
partir da luminância de cada cor (a fórmula está nas regras de acessibilidade da W3C, WCAG). Por isso o texto suave é
`#4a4a5c` no claro e `#b8b8cc` no escuro: cinza demais cansa e some. Quando trocar as cores, confira cada par num medidor de contraste.

---

## 2. Guardar a escolha: `localStorage` com cuidado

```js
function lerTemaSalvo() {
    try {
        const tema = localStorage.getItem(CHAVE_DO_TEMA);
        return tema === "claro" || tema === "escuro" ? tema : null;
    } catch (erro) {
        return null;
    }
}
```

Como no [projeto de tarefas](../../tutorial/05-projeto/), o `try/catch` segura um dado estragado. Aqui há **duas** defesas:

1. o `try/catch` cobre o `localStorage` bloqueado (modo privado, política do navegador);
2. a comparação com `"claro"` e `"escuro"` cobre o dado **corrompido**: se o valor for qualquer outra coisa (alguém
   escreveu `lixo{{{` lá), ele é ignorado e a página segue o sistema.

Dado que vem de fora, mesmo que seja do próprio navegador, **se confere antes de usar**. Teste no console:
`localStorage.setItem("curriculo-tema", "lixo")` e recarregue.

---

## 3. Movimento: nada por padrão

Nenhuma animação roda sozinha nesta página. O único movimento é a troca de cor de um botão (`transition`, 0,15 s) quando o
mouse passa. Mesmo isso some para quem pediu menos movimento ao sistema:

```css
@media (prefers-reduced-motion: reduce) {
    * { transition: none !important; animation: none !important; }
}
```

É a mesma regra do [projeto de tarefas](../../tutorial/05-projeto/), em três linhas.

---

## 4. A folha de impressão

```css
@media print {
    nav, button, iframe, details, .pular { display: none !important; }
    a[href]:not([href^="#"])::after { content: " (" attr(href) ")"; }
    .cartao { break-inside: avoid; }
}
```

Papel não tem clique: um link só serve se o **endereço estiver escrito**. `attr(href)` copia o endereço do próprio
link para depois dele. Os links internos (`#projetos`) ficam de fora. `break-inside: avoid` impede um cartão de ser
cortado entre duas folhas. O menu, os botões e o `iframe` não fazem sentido no papel e somem. E `color-scheme: light` força o
fundo branco, mesmo se a pessoa estiver no tema escuro. Confira na prévia de **Ctrl+P**: cabe em A4?

---

## 5. A tecla H: ver o invisível

Convenção do curso desde os jogos: **H** mostra o que não se vê. Aqui, a **estrutura** da página:

- cada **marco** ganha um contorno **tracejado** e o seu nome (`header`, `nav`, `section #projetos`…);
- cada **título** ganha o nível ao lado (`[h2]`);
- o aviso do rodapé lista os títulos **na ordem em que um leitor de tela os leria**.

É o que você montou à mão no [passo 1](../01-estrutura/), agora à vista. A forma (tracejado e texto) mostra a estrutura; a
cor sozinha não mostraria. O botão **Ver estrutura (H)** existe para quem está no celular e não tem a tecla. Ele é uma
ferramenta de quem **constrói** a página: antes de publicar, você pode apagá-lo (exercício 6).

---

## 6. Sobre mim e contato

Duas ou três frases, em primeira pessoa, que dizem **o que você faz e o que busca**. Sem história de vida: o recrutador tem
30 segundos. No contato: um e-mail dedicado, um perfil profissional e cidade e estado. **Só isso.** Releia a lista de privacidade lá em cima.

---

## Conceitos novos

| Conceito | Para que serve |
|---|---|
| `color-scheme` e `light-dark()` | duas cores na mesma variável, escolhidas pelo tema |
| `data-tema` no `<html>` | a escolha da pessoa, que vence o sistema |
| `try/catch` + conferir o valor | `localStorage` bloqueado ou corrompido não quebra a página |
| contraste 4,5:1 e 3:1 | texto e contorno legíveis nos dois temas |
| `prefers-reduced-motion` | sem transição para quem pediu menos movimento |
| `@media print` | uma versão para o papel (ou o PDF) |
| `attr(href)` em `::after` | escrever o endereço de cada link na impressão |
| `aria-pressed` | botão que liga e desliga, anunciado como tal |

---

## Experimente

1. **Sua paleta.** Troque `--destaque` nos dois temas. Calcule o contraste de cada par e anote os números.
2. **Estrague o dado.** `localStorage.setItem("curriculo-tema", "lixo")` no console e recarregue. Depois comente o `try/catch` e repita.
3. **Sistema.** Mude o tema do seu sistema operacional com a página aberta e **sem** ter clicado no botão. O que muda?
4. **Prévia de impressão.** Ctrl+P: algum cartão é cortado ao meio? Tente tirar o `break-inside` e ver.
5. **Só o teclado.** Tecle H, Tab, Enter. O contorno do foco continua visível nos dois temas e com a estrutura à mostra?
6. **Sem ferramentas.** Apague o botão "Ver estrutura" e o `#aviso-estrutura` do HTML e as linhas de `script.js` que os usam. A página ainda funciona? (Se não, o que você esqueceu?)
7. **Currículo de papel.** Gere o PDF e abra. Os endereços dos links estão legíveis? Algum dado de verdade escapou para ele?

---

**Anterior:** [`04-amostras`](../04-amostras/) · **Próximo:** [`06-compartilhar`](../06-compartilhar/) — o `<head>` completo: título, descrição, ícone embutido e o cartão de pré-visualização que aparece quando alguém compartilha o seu link.
