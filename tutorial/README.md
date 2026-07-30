# Tutorial — HTML, CSS e JavaScript

O começo de tudo. Cinco lições, nenhuma instalação: cada pasta tem um `index.html` para
abrir no navegador e um `GUIA.md` para ler junto.

Se você nunca escreveu uma linha de código, comece aqui.

---

## As lições

| # | Pasta | Assunto | O que você sai sabendo |
|---|---|---|---|
| 1 | [`01-html`](01-html/) | Estrutura | tags, árvore, atributos, formulários, tabelas, semântica |
| 2 | [`02-css`](02-css/) | Aparência | seletores, cascata, box model, flexbox, grid, responsivo |
| 3 | [`03-javascript`](03-javascript/) | A linguagem | variáveis, tipos, condicionais, laços, funções, arrays, objetos |
| 4 | [`04-dom`](04-dom/) | JS + página | encontrar, alterar, criar elementos, eventos, formulários |
| 5 | [`05-projeto`](05-projeto/) | Tudo junto | uma lista de tarefas completa, que salva no navegador |

---

## Como estudar

1. Abra o `index.html` da lição e **mexa na página**.
2. Leia o `GUIA.md`.
3. Leia o código-fonte — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios do fim do guia. **Não pule:** é onde o conhecimento sai do papel.

Mantenha o **F12** aberto o tempo todo:

- aba **Elements** — a árvore da página, editável ao vivo;
- aba **Console** — erros do JavaScript e um lugar onde você pode escrever código;
- aba **Styles** — quais regras de CSS venceram, e quais aparecem **riscadas** por terem
  perdido.

---

## As três linguagens

| | Responsabilidade | Pergunta que responde |
|---|---|---|
| **HTML** | Estrutura | **o que** existe na página? |
| **CSS** | Aparência | **como** isso se parece? |
| **JavaScript** | Comportamento | o que **acontece**? |

Manter as três separadas é a primeira decisão de arquitetura da web. Quando se misturam —
estilo dentro do HTML, comportamento dentro de uma tag — o projeto vira um lugar onde
ninguém sabe mais onde procurar.

---

## Depois daqui

**[`../jogo-da-cobrinha`](../jogo-da-cobrinha/)** — dez passos construindo um jogo do zero,
onde entram o `<canvas>` e o game loop.

Depois, os projetos completos: **[`../pong`](../pong/)** e **[`../xadrez`](../xadrez/)**.
