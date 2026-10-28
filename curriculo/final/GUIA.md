# Currículo — passo final

**Anterior:** [`07-publicar`](../07-publicar/) (opcional) ou [`06-compartilhar`](../06-compartilhar/)
**Rode:** abra o `index.html`. Depois **Ctrl+P** para ver o PDF.
**Teclas:** **H** mostra os marcos e a ordem dos títulos · **Esc** fecha o "Jogar aqui" · **Tab** percorre a página.

Este é o fim do módulo e o ponto de partida do **seu** currículo: uma página pronta, com dados **inventados** (Alex Exemplo),
para você trocar pelos seus. No fim há 12 exercícios.

## O que mudou do passo 6 para aqui

Nenhuma linha de lógica. O `script.js` é o do passo 6, e o `style.css` também, menos uma regra: a miniatura passou de 16:9 para um **quadrado** (a captura de celular é alta e estreita, e uma faixa 16:9 mostraria só o topo). Mudou, fora isso, o que é **conteúdo**:

| | Passo 6 | Final |
|---|---|---|
| Miniaturas | bloco colorido com a inicial | **quatro PNGs** reais em `amostras/` (só aqui o curso usa arquivo de imagem) |
| `projetos.js` | `imagem: ""` | `imagem: "amostras/tetris.png"` e um `alt` que diz o que o jogo é |
| `index.html` | comentário do passo | aviso de privacidade e a marca **TROQUE** em cada dado pessoal |
| Este guia | conceitos | **o que trocar, a lista de privacidade e os exercícios** |

---

## 1. Troque estes dados

O modelo foi feito para você mexer em **dados, nunca em código**. São só dois arquivos de texto e uma pasta.

### `index.html` (procure a palavra `TROQUE`)

| Onde | O que trocar |
|---|---|
| `<title>`, `<h1>`, `og:title`, `og:image:alt` | o seu nome (e a frase, se mudar) |
| `<meta name="description">`, `og:description` | uma frase sua, até uns 155 caracteres |
| `<link rel="icon">` | a letra e a cor do ícone (no endereço `data:`, `#` vira `%23`) |
| `<p>` do cabeçalho | quem é você, em uma linha |
| **Sobre mim** | duas ou três frases em primeira pessoa |
| **Habilidades** | cada `href="#projeto-…"` precisa ser o `id` de um projeto seu |
| **Contato** | e-mail dedicado, perfil profissional, cidade e estado. **Nada além disso.** |
| `og:url`, `og:image` | só depois de publicar (passo 7): são marcadores `SEU-USUARIO` |

### `projetos.js` (um objeto por projeto)

| Campo | O que é |
|---|---|
| `id` | letras minúsculas sem acento, números e hífen (`meu-jogo`); vira o endereço `#projeto-meu-jogo` |
| `nome`, `resumo` | o nome do projeto e o que ele é, em uma ou duas frases |
| `tecnicas` | o que você usou, em palavras curtas (viram etiquetas de texto) |
| `pasta` | o caminho até o `index.html` do jogo, **a partir desta página** |
| `imagem`, `alt` | o PNG de `amostras/` e o que o jogo é, para quem não vê a imagem |
| `cor` | só vale sem `imagem`: uma cor escura para o bloco com a inicial |
| `internet`, `jogarAqui` | `true` se o jogo precisa de internet; `true` para ligar o botão "Jogar aqui" |
| `arquivo`, `oQueMostra`, `trecho` | de onde veio o código, o que ele mostra e as 8 a 15 linhas, **copiadas sem mudar nada** |

### `amostras/`

Uma miniatura por projeto, em PNG, até **60 KB** cada. Troque os arquivos pelos seus (veja a seção 3).

**Não mexa** em `script.js` nem em `style.css` para fazer o currículo ser seu. Se o `projetos.js` tiver um erro, a página
**avisa o que consertar** em vez de quebrar (passo 3): leia o aviso, e abra o console (F12) se o aviso mandar.

> O modelo traz **quatro** cartões: cobrinha, tetris, xadrez e xenomorph. O cartão do jogo **3D** (Proa Acesa) entra quando
> o `final` dele existir; hoje esse módulo só tem passos, e um cartão sem `final` seria um link quebrado.

---

## 2. A lista de privacidade (leia antes de escrever qualquer coisa sua)

> **Uma página pública é lida por qualquer pessoa, e o que foi publicado pode ser copiado para sempre.** Mesmo que você
> apague depois, alguém pode já ter guardado.

**Não publique:**

- endereço de casa;
- telefone pessoal;
- CPF, RG ou qualquer outro documento;
- data de nascimento completa;
- fotos de menores de idade (o modelo não tem foto; se você quiser uma, é decisão sua, por sua conta e risco);
- nome da escola com turma e horário;
- dados bancários.

**Prefira:**

- cidade e estado, e não a rua;
- um **e-mail dedicado ou alias**, um endereço só para isso, que você pode apagar;
- um link para um perfil profissional.

**Confira antes de publicar:**

- [ ] Abri `index.html` e `projetos.js` e li cada texto procurando número, endereço ou nome que não devia estar ali.
- [ ] O e-mail do **Contato** é o dedicado, e não o pessoal.
- [ ] Nenhum campo de projeto cita colega, professor ou escola.
- [ ] As miniaturas não mostram nome, e-mail, notificação ou aba aberta do meu computador.
- [ ] Gerei o PDF (**Ctrl+P**) e li o PDF também.
- [ ] Se tenho menos de 18 anos, conversei com quem é responsável por mim **antes** de publicar.
- [ ] Todas as imagens são minhas (ou têm licença); nenhuma imagem de terceiros sem permissão.

**Contato:** um link `mailto:`. Um formulário precisa de um servidor, e um serviço externo de formulário entrega os dados de quem
escreve a terceiros: ficam fora do curso.

**Crédito:** o código dos jogos é **seu**, feito por você. Cada cartão termina com "Feito seguindo o curso *Do zero ao jogo*", com
link (o endereço **absoluto** `https://github.com/cemmanull/arcade-games`, que continua valendo depois de publicado). Texto e arte do curso
que você copiar mantêm o crédito.

---

## 3. As miniaturas

Cada cartão tem uma miniatura em PNG, uma captura do `final/` do jogo no tamanho de um celular (390×750). Ficam em `amostras/`,
e **é só aqui que o curso usa arquivo de imagem**: nos passos 1 a 6 o bloco colorido era um SVG escrito dentro do código.

Duas maneiras de fazer as suas:

- **Print manual (o caminho principal).** Abra o jogo, deixe a janela do tamanho de um celular (F12, modo celular, 390×750), tire um print e salve em `amostras/`.
- **Pelo script do curso, se você tem Node e Chrome:**

```
node verificacao/rodar.mjs --captura jogo-da-cobrinha/final/index.html --largura 390 --altura 750 --escala 0.6 --saida curriculo/final/amostras/cobrinha.png
```

**Peso:** uma miniatura de até **60 KB** carrega rápido no celular. Passou disso? Reduza a `--escala` (ou o tamanho do print) e confira o arquivo de novo.

**O `alt` diz o que o jogo é**, e não "captura de tela": "Tetris: peças coloridas caem num poço e formam linhas que somem."
Quem usa leitor de tela não vê a imagem, e o texto é tudo que recebe. Uma miniatura que só mostra o menu do jogo continua precisando de um `alt` que fale do **jogo**.

> As miniaturas envelhecem: se você mudar o jogo, tire outra. O código do currículo não sabe disso, e ele nunca consulta a imagem.

---

## 4. Como as peças se encaixam

```
projetos.js  →  conferirProjetos  →  criarCartao  →  <div id="lista-projetos">
   (dados)         (avisa o erro)      (textContent)         (a página)
```

| De onde veio | O que o `final` usa |
|---|---|
| [Passo 1](../01-estrutura/) | marcos (`header`, `nav`, `main`, `section`, `footer`), um só `h1`, títulos sem pular nível, "pular para o conteúdo" |
| [Passo 2](../02-layout/) | mobile first em `rem`, variáveis, menu que quebra de linha, grade `auto-fit` (três colunas em 1280 px, uma em 390 px) |
| [Passo 3](../03-projetos/) | dados num `.js`, conferência antes de desenhar, `textContent`, `lerProjetos` (`try … catch`) se o arquivo de dados quebrar |
| [Passo 4](../04-amostras/) | trecho em `<pre><code>`, selo "abre sem internet", "Jogar aqui" sob demanda, `Esc` só com o foco no cartão (dentro do jogo as teclas são dele) |
| [Passo 5](../05-acabamento/) | tema que segue o sistema e lembra a escolha, contraste, sem movimento, impressão em A4, tecla **H** |
| [Passo 6](../06-compartilhar/) | `<head>` completo: `lang`, `title`, `description`, Open Graph, ícone embutido, `theme-color` |
| [Passo 7](../07-publicar/) | o que fazer para colocar no ar, e quais links viajam com a página |

**Jogar aqui.** O botão vem **desligado** (`jogarAqui: false`). O quadro tem a proporção de um celular (390×750) e, no máximo, 390 px de largura.
Num computador cabe inteiro; **no celular, o link "Abrir" é a melhor forma de jogar**, porque o jogo ocupa a tela toda.

**Quem não publicar** termina aqui: um currículo que abre com duplo clique e vira PDF com **Ctrl+P**. Os links dos cartões (`../../tetris/final/index.html`) funcionam
na pasta do curso; para publicar, leve os `final/` junto ou tire os links (passo 7).

---

## Exercícios

1. **Seus dados.** Troque nome, frase, "Sobre mim" e Contato (seção 1). Passe a lista de privacidade (seção 2) item por item. Peça a alguém que leia a página e diga o que ela revela sobre você.
2. **Seus projetos.** Troque os quatro cartões por de três a cinco dos **seus** jogos. Ajuste `id`, `pasta` e as habilidades do HTML. O que acontece com um link `#projeto-…` cujo `id` você trocou?
3. **Suas miniaturas.** Tire uma miniatura de cada jogo (seção 3), de até 60 KB. Escreva cada `alt` e leia em voz alta: ele diz o que o jogo **é**?
4. **Seu trecho.** Escolha em cada jogo **uma ideia pequena e inteira**, de 8 a 15 linhas, e copie sem mudar nada. Preencha `arquivo` e `oQueMostra`. Quem ler o trecho consegue achá-lo no arquivo que você citou?
5. **Traduza.** Copie a pasta `final` para `final-en`. Traduza os textos do `index.html` e do `projetos.js` para o inglês e troque `<html lang="pt-BR">` por `<html lang="en">` (ou marque `lang="en"` só no que ficou em inglês, dentro de uma página em português). Peça a um leitor de tela para ler cada versão. O que muda na voz?
6. **Sua paleta.** Troque `--destaque` e `--foco` nos **dois** temas (`light-dark(claro, escuro)`). Calcule o contraste de cada par: texto normal pede 4,5:1; contorno e foco pedem 3:1. Qual par não passou?
7. **Jogar aqui.** Ligue `jogarAqui: true` num projeto. Jogue só com o teclado: quando o `Esc` deixa de fechar? Abra a página num celular: o quadro cabe? Por que o link "Abrir" ganha no celular?
8. **Quebre de propósito.** Em `projetos.js`, apague uma vírgula e recarregue. Leia o aviso. O botão de tema e a tecla **H** ainda funcionam? Depois repita um `id`, use um `id` com espaço e tire um `alt`: cada mensagem diz o que consertar?
9. **O papel.** **Ctrl+P**, A4. Cabe em duas folhas? Algum cartão é cortado ao meio? Os links externos mostram o endereço e o e-mail aparece uma vez só? Tire o `break-inside: avoid` para ver a diferença.
10. **Só teclado, só celular.** Do começo ao fim com **Tab**: a ordem bate com a que os olhos seguem, e o foco é sempre visível nos dois temas? Em 390 px (e em 200% de zoom) há rolagem para o lado? Procure o que estoura.
11. **O link compartilhado.** Releia o `<head>`: `title`, `description` (até uns 155 caracteres), `og:title`. O que a busca mostraria? O cartão só existe depois de publicar: por quê?
12. **O teste dos 30 segundos.** Mostre a página a alguém por 30 segundos, sem explicar nada, e peça que diga quem você é, o que sabe e como falar com você. Se ele errar, reescreva a frase do cabeçalho. **Opcional:** publique (passo 7) e repita no celular.

---

## O que você levou daqui

HTML semântico e acessível, CSS mobile first com variáveis e dois temas, JavaScript que **lê dados**, confere e desenha, `localStorage` à
prova de dado estragado, uma folha de impressão e um `<head>` que fala com buscadores e redes sociais. E um hábito que vale mais que a técnica:
**cada afirmação vem com uma prova** que o leitor pode abrir.

O código é seu e o currículo também. Se algum dia você tiver outro projeto, o trabalho é um objeto novo em `projetos.js`, e o código não muda.

---

**Anterior:** [`07-publicar`](../07-publicar/) · **Módulo:** [`README.md`](../README.md)

**Pré-requisito:** [`../../tutorial`](../../tutorial/) · **Antes:** [`../../proa-acesa`](../../proa-acesa/) · **Depois:** nenhum, é o último módulo · **Índice:** [`../../README.md`](../../README.md)
