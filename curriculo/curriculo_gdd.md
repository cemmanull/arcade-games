# CURRÍCULO — Documento de design (GDD)

> **Rascunho aguardando aprovação do usuário.** Pedido dele (2026-10-27): "adicione um modulo ao final:
> criando seu curriculo online […] uma página contendo amostras dos conhecimentos adquiridos que servirá
> como curriculo para o aluno para programação web e game design." Nenhum código nem pasta de passo existe.

Módulo 11 e **último** do curso. Ordem: `tutorial → jogo-da-cobrinha → pong → tetris → shoot-em-up →
pacman → xadrez → xenomorph → reflexo → dique → proa-acesa → curriculo`. Não é um jogo: é a página do
próprio aluno, feita só com o que o curso ensinou, mostrando **amostras** dele.

## 1. Conceito

Uma página única e estática, em pt-BR, que funciona como currículo de **programação web e game design**.
Quem lê: recrutadores (30 segundos, quase sempre no celular), professores e colegas. Ela precisa dizer, nesta
ordem: **quem é** (uma frase), **o que sabe fazer** (habilidades ligadas a prova), **o que já fez** (projetos
com imagem, descrição e link) e **como falar com a pessoa**.

- **Cada afirmação tem prova.** "Sei canvas" vem junto de um jogo que o usa, não de uma barra de 90%.
- **O aluno escolhe e escreve.** O módulo entrega um **modelo com dados fictícios**; o aluno troca os dados,
  não o código (a ideia de "dados no lugar de código", seção 3).
- **É um exercício de síntese:** HTML semântico, CSS responsivo, JS que lê dados e cria elementos,
  `localStorage` para o tema, acessibilidade. Nenhuma técnica nova pesada.

## 2. Passos

Pastas planejadas (nenhuma criada): `01-estrutura`, `02-layout`, `03-projetos`, `04-amostras`,
`05-acabamento`, `06-compartilhar`, `07-publicar` (opcional), `final`. Cada passo é independente
(`index.html`, `style.css`, `script.js` quando houver, `GUIA.md`), como no resto do curso.

| Passo | Conceito novo | Reusa |
|---|---|---|
| 01-estrutura | Página de currículo em HTML semântico: `header`, `nav`, `main`, `section`, `footer`; ordem de títulos `h1 > h2 > h3`; âncoras `#projetos`; link "pular para o conteúdo" | [`tutorial/01-html`](../tutorial/01-html/) (tags, `<a>`, `<img alt>`) |
| 02-layout | Layout **mobile first** em 390×750 que cresce até 1280: flex na barra, grid de cartões com `auto-fit`/`minmax`; variáveis de cor e espaçamento | [`tutorial/02-css`](../tutorial/02-css/), [`tutorial/05-projeto`](../tutorial/05-projeto/) (mobile first, flexbox, foco visível) |
| 03-projetos | **Projetos como dados:** `const projetos = [{nome, resumo, tecnicas, pasta, imagem, alt}]` e uma função que cria um cartão por objeto; conferir os dados antes de desenhar | [`tutorial/04-dom`](../tutorial/04-dom/) (criar elementos, `textContent`), [`shoot-em-up/04-inimigos`](../shoot-em-up/04-inimigos/) (catálogo de dados), [`pacman/01-labirinto`](../pacman/01-labirinto/) (conferir dados) |
| 04-amostras | **Amostras:** miniatura com texto alternativo, link para o `final/` do jogo, trecho de código comentado em `<pre><code>`, botão opcional "jogar aqui" que cria o `<iframe>` só ao clicar (`title`, `loading="lazy"`) | [`tetris/02-pecas`](../tetris/02-pecas/) (dados como tabela), [`xadrez/01-tabuleiro`](../xadrez/01-tabuleiro/) (DOM no lugar de canvas) |
| 05-acabamento | **Acessibilidade e tema:** claro/escuro com `prefers-color-scheme` e botão que grava a escolha em `localStorage` (leitura com `try/catch`, saneada); `prefers-reduced-motion`; **folha de impressão** (`@media print`: some a navegação, links mostram a URL); sobre mim e contato | [`tutorial/05-projeto`](../tutorial/05-projeto/) (`localStorage`); tecla **H** (convenção do curso): aqui mostra regiões e ordem dos títulos |
| 06-compartilhar | `<head>` completo: `lang="pt-BR"`, `title`, `description`, Open Graph, favicon embutido (`data:` SVG), `theme-color`; como o link aparece quando compartilhado | [`tutorial/01-html`](../tutorial/01-html/) (estrutura do `<head>`) |
| 07-publicar *(opcional)* | **Colocar no ar** com GitHub Pages: repositório, Settings > Pages, URL, caminhos relativos, conferir no celular. Único passo que exige conta e internet | só o navegador; sem código novo |
| final | O modelo completo com dados fictícios, instruções "troque estes dados", checklist de privacidade, ~12 exercícios | todos os anteriores |

Quem não publicar termina no `final` com um currículo que abre com duplo clique e vira PDF com Ctrl+P.

## 3. Como as amostras entram

| Opção | Vantagens | Problemas |
|---|---|---|
| **Link** para o `final/` de cada jogo | Custo de carga zero; teclado e foco normais; funciona em `file://` e em http | O leitor sai do currículo; o 3D precisa de internet (exceção já aceita pelo curso) |
| **`<iframe>` sempre carregado** | Mostra o jogo na hora | Carrega 5 a 11 jogos juntos (canvas, áudio, WebGL): lento no celular; **armadilha de teclado** (as setas movem o jogo ou rolam a página?); dois contextos de foco; tamanho pensado para 390×750; em `file://` cada pasta é uma origem separada; o 3D baixa o three.js a cada iframe |
| **`<iframe>` sob demanda** ("jogar aqui") | Só custa quando o leitor pede; o foco só entra se ele clicar | A armadilha de teclado continua: exige "Fechar" e `Esc`; a altura de 750 px empurra a página |
| **Miniatura estática** (PNG) | Rápida, imprime, funciona sem internet e para leitor de tela (com `alt`) | Arquivo de imagem (o curso só aceita no `final`); envelhece se o jogo mudar |
| **Trecho de código** `<pre><code>` | Prova que o aluno entende; o recrutador técnico lê | Largo no celular (rolagem horizontal só dentro do bloco); o aluno escolhe 8 a 15 linhas |
| **Projetos como arquivo de dados** (`projetos.js`) | Trocar de projeto é editar um objeto; testável (seção 8) | `fetch` de `.json` falha em `file://`: os dados são um `.js` clássico que declara `const projetos` |

**Recomendação (padrão):** cartões **dirigidos por dados** (`projetos.js`), cada um com **miniatura + `alt` +
resumo + técnicas + link para o `final/`**, mais **um** trecho de código por projeto. O **"jogar aqui"** (iframe
sob demanda, com Fechar e `Esc`) vem desligado e liga com `jogarAqui: true` no objeto. As miniaturas saem de
`node verificacao/rodar.mjs --captura <jogo>/final/index.html --largura 390 --altura 750` (um PNG por projeto,
≤ 60 KB, em `final/amostras/`). Sem Node, vale um print manual ou um bloco colorido com o nome (o `alt` e o
link continuam).

*Alvos conferidos com `ls`:* `final/` existe em [`jogo-da-cobrinha`](../jogo-da-cobrinha/final/),
[`pong`](../pong/final/), [`tetris`](../tetris/final/), [`shoot-em-up`](../shoot-em-up/final/),
[`pacman`](../pacman/final/), [`xadrez`](../xadrez/final/) e [`xenomorph`](../xenomorph/final/).
`reflexo`, `dique` e `proa-acesa` têm hoje só passos; seus cartões só entram no modelo quando o `final/` existir.

## 4. Acessibilidade e responsividade

- **Marcos:** um `header`, um `nav` com `aria-label`, um `main`, `section` com `aria-labelledby`, um `footer`.
  O link "pular para o conteúdo" é o primeiro foco.
- **Títulos:** um só `h1` (o nome); `h2` por seção; `h3` por projeto; nunca pular nível.
- **Imagens:** toda miniatura com `alt` que diz **o que o jogo é**, não "captura de tela"; decorativa, `alt=""`.
- **Foco visível** em todo link e botão (contorno ≥ 3 px, contraste ≥ 3:1); alvos ≥ 48 px no celular.
- **Contraste ≥ 4,5:1** para texto normal nos dois temas, medido por script (seção 8).
- **Sem informação só por cor:** "jogável" ou "só com internet" em texto e ícone, não só em cor.
- **Movimento:** nada anima por padrão; toda transição respeita `prefers-reduced-motion`.
- **Só teclado:** Tab percorre menu, cartões, "jogar aqui", tema e contato na ordem visual; `Esc` fecha o iframe
  e o foco volta ao botão que o abriu.
- **Responsivo:** sem rolagem horizontal em 360, 390 e 1280; o texto reflui até 200% de zoom; unidades `rem`.
- **Impressão:** `@media print` esconde `nav`, botões e iframes; fundo branco, texto preto, URL ao lado do link;
  cabe em A4; `break-inside: avoid` nos cartões.

## 5. Meta tags e Open Graph

| Tag | O que faz |
|---|---|
| `<html lang="pt-BR">` | O leitor de tela escolhe a voz certa; o navegador oferece tradução correta |
| `<meta charset="utf-8">` e `viewport` | Acentos certos; layout de celular (sem o viewport, 390 px vira 980 px) |
| `<title>` | Texto da aba, do histórico e do resultado de busca: "Nome — Programação web e game design" |
| `<meta name="description">` | Resumo (≤ ~155 caracteres) que a busca mostra sob o título |
| `og:title`, `og:description` | Título e resumo do **cartão de pré-visualização** no WhatsApp, LinkedIn, Discord |
| `og:image` | Imagem do cartão (1200×630). **Precisa ser URL absoluta** (`https://…`) depois de publicada: o rastreador da rede não resolve caminho relativo nem `file://` |
| `og:url`, `og:type` (`website`), `og:locale` (`pt_BR`) | Endereço canônico e tipo; evitam cartões duplicados |
| `<link rel="icon">` | Ícone da aba; um SVG embutido via `data:` dispensa arquivo e o 404 de `favicon.ico` |
| `theme-color` | Cor da barra do navegador no celular |

O guia explica que **o cartão só aparece depois de publicar** (as redes buscam a URL na internet); localmente
só se confere que as tags existem (seção 8). `og:image` não deve ser uma foto pessoal sem o aluno querer.

## 6. Publicação (a exceção explícita do curso)

Passo opcional, avisado no topo: **é o único do curso que exige conta e internet**. Todo o resto continua abrindo
com duplo clique. Roteiro (GitHub Pages): criar a conta; criar um repositório **público**; enviar a pasta do
currículo (upload pelo site, sem instalar o Git); *Settings > Pages > Deploy from a branch > `main` / root*;
esperar o endereço `https://<usuario>.github.io/<repositorio>/`; abrir no celular. Use **caminhos relativos**
(`./amostras/x.png`), porque o endereço leva o nome do repositório no meio; `og:image` e `og:url` passam a
absolutos. Alternativas, uma linha cada, sem tutorial: Netlify Drop (arrastar a pasta) e Cloudflare Pages. Se o
aluno ligar o "jogar aqui", os `final/` escolhidos precisam ir **juntos** na pasta publicada, senão o link
quebra; o guia mostra como e quanto pesa.

## 7. Privacidade e licença

- O modelo traz **só dados fictícios** (nome "Alex Exemplo", e-mail `alex@exemplo.invalid`, cidade genérica).
- **Aviso em destaque no guia e no `final`:** uma página pública é lida por qualquer pessoa e copiada para sempre.
  **Não publique:** endereço de casa, telefone pessoal, CPF, RG ou outro documento, data de nascimento completa,
  fotos de menores de idade, nome da escola com turma e horário, dados bancários. **Prefira:** cidade e estado,
  **e-mail dedicado ou alias**, link para perfil profissional.
- **Menor de idade:** conversar com os responsáveis antes de publicar; o passo 07 diz isso.
- **Contato:** `mailto:` com alias. Formulário exige backend (fora de escopo); serviço externo de formulário
  envia dados a terceiros e fica fora do curso.
- **Licença:** o código dos jogos é do próprio aluno, feito por ele no curso; cada cartão traz a linha
  "feito seguindo o curso *Do zero ao jogo*" com link, como crédito. Texto e arte do curso que o aluno copiar
  mantêm o crédito. Nenhuma imagem de terceiros sem licença.

## 8. Verificação (`verificacao/curriculo/NN-passo.html`, harness existente)

| Passo | A página afirma |
|---|---|
| 01 | exatamente 1 `h1`; níveis de título nunca saltam; existem `header`, `nav`, `main`, `footer`; todo `href="#x"` aponta para um `id` existente; todo `input`/`button` tem nome acessível |
| 02 | sem rolagem horizontal em 390×750 e 1280×800 (`scrollWidth <= clientWidth`); grid com 1 coluna em 390 e ≥ 2 em 1280; captura gerada com `--captura` nos dois tamanhos |
| 03 | **cartões renderizados = dados:** mesmo número, ordem e nomes; dados inválidos (sem `alt`, `pasta` vazia, nome repetido) são rejeitados pela conferência; texto entra por `textContent` (um nome com `<b>` não vira marcação) |
| 04 | toda `<img>` tem `alt` não vazio (ou `alt=""` marcada como decorativa); "jogar aqui" não cria `iframe` antes do clique, cria 1 depois, e `Esc` o remove e devolve o foco; todo `iframe` tem `title` |
| 05 | **contraste calculado** (luminância WCAG) de cada par texto/fundo da paleta, nos dois temas, ≥ 4,5:1; `localStorage` corrompido não quebra o tema; a folha de impressão oculta `nav`; `prefers-reduced-motion` zera as transições |
| 06 | existem `lang="pt-BR"`, `title`, `description`, `og:title`, `og:description`, `og:image`, `og:url`, `icon`; `description` ≤ 160 caracteres; no modelo local, `og:image` é marcador avisado como tal |
| 07 | sem página (não há código); o `GUIA.md` entra na verificação de links |
| final | todos os de cima, mais `--fumaca` sem erro de console e a regra de privacidade: nenhum padrão de CPF, telefone ou e-mail real (só `@exemplo.invalid`) nos dados do modelo |

- **Links:** `node verificacao/rodar.mjs --links` só lê `.md`. Os `href`/`src` do HTML pedem uma extensão pequena de
  `verificacao/links.mjs` (ler `.html` também) **ou** uma página de teste que confira `pasta` e `imagem` dos
  dados contra um inventário escrito na própria página. Recomendo a extensão do `links.mjs`; fica para a
  implementação e exige aprovação, por mexer no harness.
- **Limites honestos:** o script confere os valores das variáveis de cor, não cada pixel; a pré-visualização das
  redes sociais não é testável offline; rolagem horizontal em 390×750 depende de a página de teste medir a
  página real (iframe em `file://` pode ser bloqueado, então talvez seja só pela captura).

## 9. Orçamento

O **menor módulo** do curso. Teto **duro** (estourou, corta-se escopo, não o teto):

| Medida | Teto |
|---|---|
| JS próprio, somado no `final` | **300 linhas** (`projetos.js` à parte, ≤ 120 linhas de texto) |
| CSS no `final` | **400 linhas** (por passo: 60, 120, 180, 280, 340, 360; `final` 400) |
| HTML do modelo | ≤ 200 linhas |
| `GUIA.md` por passo | ≤ **200** linhas; o do `final` ≤ 300, com ~12 exercícios |
| Função | ≤ 30 linhas |
| Imagens | ≤ 60 KB cada, ≤ 12 no total, só no `final` |

## 10. Fora de escopo

Framework, bundler, `npm`, gerador de site estático, CMS, TypeScript; analytics, rastreadores, pixel, fontes
remotas, botão "curtir" ou qualquer recurso de terceiros em tempo de execução; formulário com backend; login;
blog; domínio próprio e DNS; SEO avançado; PDF gerado por código (basta Ctrl+P); versão multilíngue como passo
(ver pergunta 4); animações de rolagem.

## 11. Perguntas em aberto (só as que dependem do usuário)

1. **Quais jogos o modelo mostra como projetos?** Opções: (a) os do próprio curso; (b) só exemplos inventados.
   *Recomendo (a), com 5 cartões* (cobrinha, tetris, xadrez, xenomorph e o jogo 3D quando existir), porque dá
   prova real e testável. O aluno **escolhe 3 a 5 dos seus** e troca os dados: 11 jogos do mesmo curso diluem o
   currículo (quem quiser pode listar todos numa seção "Trilha completa").
2. **Iframe ou link como padrão?** *Recomendo link + miniatura, com "jogar aqui" opcional* (seção 3).
3. **Publicar é obrigatório?** *Recomendo opcional* (passo 07): obrigar quebraria a promessa "nenhuma instalação,
   nenhum servidor" e exigiria conta, o que não se deve impor a menores.
4. **Versão em inglês?** Vagas de programação costumam pedir inglês. *Recomendo só pt-BR no curso* e um exercício
   do `final` ("traduza os dados e marque `lang="en"`"), em vez de um passo.
5. **Miniaturas com `--captura` exigem Node e Chrome**, e o curso promete "nenhuma instalação". *Recomendo
   entregar prontas as miniaturas do modelo*, com a captura como atalho opcional e o print manual como caminho
   principal.
6. **Imagens em arquivo só no `final`** (regra do `CLAUDE.md`). *Recomendo manter:* os passos 01 a 05 usam blocos
   de cor e SVG embutido; só o `final` carrega PNG.
7. **Foto do aluno no modelo?** *Recomendo não incluir* (privacidade, seção 7); o guia explica como adicionar,
   por conta e risco dele.

## 12. Mapa passo → seção

| Passo | Seções |
|---|---|
| 01-estrutura | 1, 4 (marcos, títulos) |
| 02-layout | 4 (responsivo) |
| 03-projetos | 3 (dados), 7 |
| 04-amostras | 3, 4 (imagens, foco) |
| 05-acabamento | 4 (tema, movimento, impressão), 7 |
| 06-compartilhar | 5 |
| 07-publicar | 6, 7 |
| final | todas |

Ao implementar, atualizar juntos: tabela do `README.md`, linhas do `CONCEITOS.md` (HTML semântico, metadados,
publicação), rodapés de `proa-acesa` (**Depois:** currículo) e do novo módulo, e rodar `--links`.
