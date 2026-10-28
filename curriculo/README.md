# Criando seu currículo online — a sua página, feita só com o que você aprendeu

Sete passos e um final, de uma página em HTML puro até um currículo de programação web e game design com
os seus projetos como prova: miniatura, trecho do código, link para o jogo, tema claro e escuro, folha de
impressão e um `<head>` que cria o cartão de pré-visualização quando alguém compartilha o endereço.
Não é um jogo: é uma página que **você** escreve, em cima de um modelo com dados inventados (Alex Exemplo).

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado. Só o passo 7 precisa de conta e
de internet, e é opcional.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-estrutura`](01-estrutura/) | a página em HTML semântico | `header`, `nav`, `main`, `section`, `footer`, ordem dos títulos, âncoras, "pular para o conteúdo" |
| 2 | [`02-layout`](02-layout/) | o visual, do celular ao computador | mobile first, `rem`, variáveis, flexbox no menu, grade com `auto-fit`/`minmax` |
| 3 | [`03-projetos`](03-projetos/) | os cartões vêm de dados | `projetos.js`, conferir antes de desenhar, `textContent` no lugar de `innerHTML` |
| 4 | [`04-amostras`](04-amostras/) | prova em cada cartão | trecho de código em `<pre><code>`, "Jogar aqui" com `<iframe>` sob demanda, `Esc` e foco |
| 5 | [`05-acabamento`](05-acabamento/) | tema, movimento, papel | `light-dark()`, `localStorage` com `try/catch`, contraste, `@media print`, tecla **H** |
| 6 | [`06-compartilhar`](06-compartilhar/) | o `<head>` completo | `title`, `description`, Open Graph, ícone embutido, `theme-color` |
| 7 | [`07-publicar`](07-publicar/) | no ar, de graça (opcional) | GitHub Pages, caminhos relativos e absolutos, conferir no celular |
| — | [`final`](final/) | o modelo completo, com miniaturas | "troque estes dados", checklist de privacidade, 12 exercícios |

---

## Por que este módulo vem por último

Os outros módulos ensinam a **fazer** coisas. Este ensina a **mostrá-las**. Não traz técnica pesada nova:
junta o que o curso já deu (HTML do [tutorial](../tutorial/), dados no lugar de código como nas
[fichas do Xenomorph](../xenomorph/), `localStorage` como no projeto de tarefas) e aponta para os jogos que
você já terminou. Quem lê um currículo, em geral no celular e em trinta segundos, quer saber **quem é**,
**o que sabe**, **o que já fez** e **como falar com você**, nesta ordem, e cada afirmação vem com a sua prova:
"sei canvas" aparece junto de um jogo que usa canvas.

O modelo mostra quatro jogos do curso (cobrinha, tetris, xadrez e xenomorph). Você escolhe de três a cinco
dos seus: onze jogos no mesmo currículo diluem os melhores.

---

## Privacidade, antes de qualquer coisa

Uma página pública é lida por qualquer pessoa e pode ser copiada para sempre. **Não publique** endereço de
casa, telefone pessoal, CPF, RG ou outro documento, data de nascimento completa, fotos de menores de idade,
nome da escola com turma e horário, nem dados bancários. **Prefira** cidade e estado, um e-mail dedicado e um
link para um perfil profissional. Quem tem menos de 18 anos conversa com quem é responsável **antes** de
publicar. A lista completa está no [`final/GUIA.md`](final/GUIA.md).

---

## Verificação

Este módulo foi conferido no navegador, não só escrito:

- nenhum erro de console ao abrir o `index.html` de cada passo e do `final`;
- sem rolagem para o lado em 390×750 e em 1280×800 (com capturas olhadas uma a uma);
- um `projetos.js` com erro de sintaxe mostra o aviso na página, e o botão de tema, a tecla **H** e o
  `Esc` continuam funcionando;
- a folha de impressão sai em A4, sem menu nem botões, com o endereço só dos links externos;
- as quatro miniaturas do `final` pesam menos de 60 KB cada.

---

## Como estudar

1. Abra o `index.html` de cada passo e **mexa**: troque um nome, estrague um dado de propósito.
2. Leia o `GUIA.md`; os comentários do código explicam cada ideia onde ela aparece.
3. No `final`, troque os dados do modelo pelos seus (o guia diz exatamente quais) e faça os exercícios.
4. Publicar é opcional: o currículo funciona com duplo clique e vira PDF com **Ctrl+P**.

Antes de mexer numa pasta, faça uma cópia.

---

**Pré-requisito:** [`../tutorial`](../tutorial/) (HTML, CSS, DOM e `localStorage`, passos 1 a 5) · **Antes:** [`../proa-acesa`](../proa-acesa/) · **Depois:** nenhum, é o último módulo · **Índice:** [`../README.md`](../README.md)
