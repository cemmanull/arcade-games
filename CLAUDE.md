# CLAUDE.md — arcade-games

Curso em pt-BR, "do zero ao jogo": HTML, CSS e JavaScript puros, um módulo por jogo, cada passo uma
pasta que roda sozinha. Estado do trabalho em andamento: `TODO.md` e `HANDOFF.md`.

## Stack
- Site estático. Sem build, sem `package.json`, sem framework, sem dependência.
- Todo módulo abre com **duplo clique** no `index.html` (`file://`). Isso é requisito do curso, não
  conveniência.
- Única exceção aceita: o módulo 3D (three.js) precisa de internet para baixar a biblioteca do CDN.
  Nunca precisa de instalação.

## Comandos
- Rodar um passo: abrir `<modulo>/<passo>/index.html` no navegador.
- Verificação (Chrome + Node 22+, sem npm; detalhes em `verificacao/README.md`):
  - `node verificacao/rodar.mjs` — roda as páginas de teste `verificacao/<modulo>/<passo>.html`;
  - `node verificacao/rodar.mjs --fumaca` — abre todo `index.html` e falha em erro de console fora da
    tabela `ERROS_ESPERADOS` de `verificacao/fumaca.mjs` (cada padrão casa com a linha inteira);
  - `node verificacao/rodar.mjs --links` — confere todo link relativo dos `.md` (inclusive maiúsculas).
  Os três precisam sair com 0 antes de qualquer merge.
- Página de teste nova: copiar o esqueleto de uma existente; carregar `../apoio.js` e depois os
  scripts reais do passo; se mexer em `localStorage`, guardar e devolver o valor do aluno.
- Conferir uma página avulsa sem interface (Chrome headless; funciona com `file://`):
  `chrome --headless=new --user-data-dir=<pasta-temporária> --virtual-time-budget=5000 --dump-dom file:///<caminho>/index.html`
  (no Windows: `"/c/Program Files/Google/Chrome/Application/chrome.exe"`; para WebGL, acrescente
  `--enable-unsafe-swiftshader`).

## Raiz
- `README.md` — a trilha: ordem dos módulos, pré-requisito mínimo e o porquê da ordem.
- `CONCEITOS.md` — conceito → onde se aprende (o módulo **mais cedo na ordem** que o ensina) → onde se
  reusa.
- `verificacao/` — o harness (ver Comandos).
- Ao acrescentar ou mover um módulo, atualizar juntos: a tabela do `README.md`, as linhas de
  `CONCEITOS.md`, os rodapés do módulo e dos vizinhos (`README.md` e `final/GUIA.md`), e rodar
  `--links`.

## Estrutura de um módulo
- `<modulo>/README.md` — trilha (tabela de passos), "por que vem depois de X", verificação, como
  estudar, rodapé com pré-requisito e índice.
- `<modulo>/0N-nome/` — um passo: `index.html`, `style.css`, `script.js`, `GUIA.md`. O código do
  passo anterior é copiado para frente e alterado; cada pasta é independente.
- `<modulo>/final/` — o jogo completo, com o guia mais longo e os exercícios. O código se divide em
  arquivos por assunto (`regras.js`, `desenho.js` …) no `final` ou a partir do passo em que dividir é a
  própria lição (precedentes: `xadrez/07-computador`, `xenomorph/06-semente`). Antes disso, um
  `script.js` por passo.
- Módulos feitos a partir de um documento de design têm `<modulo>/<modulo>_gdd.md`.

## Convenções
- Conteúdo, nomes de pastas, arquivos, identificadores e comentários em **pt-BR**; pastas em
  kebab-case (`01-planta`, `final`). Mensagens de commit em inglês.
- Scripts clássicos com `<script src="…" defer>`, compartilhando o escopo global. **A ordem dos
  scripts importa**: um arquivo só usa ao carregar o que os anteriores já declararam.
- **Nenhum `import`/`export` próprio**: módulos ES não carregam por `file://` (verificado no Chrome).
- **Nenhuma `class`** no código do curso: objetos literais e funções. Usar classes de bibliotecas
  (`new THREE.Mesh`) é permitido.
- Modelo do `GUIA.md` de passo: `# <Módulo> — Passo N: <Nome>` · `**Mudou:**` · `**Rode:**` ·
  `## O que você vê` · seções de conceito numeradas · `## Experimente` ·
  `**Anterior:** … · **Próximo:** … — <gancho>`.
- Rodapé de módulo (no `README.md` e no `final/GUIA.md`, um nível mais fundo):
  `**Pré-requisito:** … · **Antes:** … · **Depois:** … · **Índice:** [README raiz]`, sempre com o
  pré-requisito. No `final/GUIA.md`, antes dele, a linha
  `**Anterior:** [último passo] · **Módulo:** [README do módulo]`.
- Tecla **H** liga a depuração visual ("mostrar o invisível").
- `localStorage` é sempre lido com `try/catch` e saneado campo a campo.
- A interface cabe numa tela de celular de 390×750 sem rolar; teclado e toque viram a mesma
  intenção.
- Som sintetizado com Web Audio. Sprites e texturas como texto dentro do código; arquivos de imagem
  só no `final` (o Dealer? Out! é o exemplo).
- Antes de acrescentar qualquer dependência, ferramenta ou arquivo de infraestrutura: o curso promete
  "nenhuma instalação".

## Armadilhas
- three.js só chega a scripts clássicos por uma **ponte**: `<script type="importmap">` com a versão
  exata no CDN, depois um `<script type="module">` inline que importa e põe em `window`, e só então
  os `<script defer>` do jogo. O script inline precisa vir **antes** dos `defer`. O jogo confere
  `typeof THREE === "undefined"` e mostra um aviso (sem internet ou sem WebGL).
- A versão fixada do three.js se repete em cada `index.html` do módulo 3D, porque import maps são
  inline e os passos são independentes. Para trocar de versão, buscar e substituir em todos.
- Chaves e certificados nunca entram no repo (`.gitignore`). A pasta `https-local/` do Dealer? Out!
  original ficou de fora de propósito.
- Fins de linha: `.gitattributes` força LF. Não converter à mão.
- O repo fica dentro do OneDrive. Se o git reclamar de `index.lock` ou aparecerem cópias "-PC",
  pausar a sincronização. Prefira agentes em paralelo na mesma cópia, com arquivos disjuntos, a
  worktrees.
- No Windows, `grep $'\r'` não é confiável para detectar CRLF; use `git ls-files --eol`.
- No Windows, **não rode `chrome.exe --version`**: não imprime nada e abre o navegador com o perfil padrão
  do usuário, que fica preso ao processo do terminal. Para a versão:
  `(Get-Item "C:\Program Files\Google\Chrome\Application\chrome.exe").VersionInfo.ProductVersion`. Todo
  Chrome de teste deve ser `--headless=new` com `--user-data-dir` temporário.
- `Emulation.setCPUThrottlingRate` do Chrome não serve para simular celular nesta máquina: 4× e 8×
  deixaram o JS só 1,2–1,5× mais lento. Desempenho em celular só vale medido num aparelho real.
