# Verificação

Páginas de teste que rodam o código **real** de um passo do curso, com o relógio e o sorteio
trocados por versões falsas, e conferem as regras do jogo. Sem biblioteca, sem instalação.

## Abrir um teste (duplo clique)

Abra, por exemplo, `verificacao/tetris/03-queda.html`. Cada linha começa com `PASS` ou `FALHA`;
a última diz `RESULTADO: 34 ok, 0 falhas`.

## Rodar todos, sem interface

Precisa do Node (22 ou mais novo) e do Chrome ou Edge instalado:

```
node verificacao/rodar.mjs
```

Procura cada `verificacao/**/*.html`, abre no Chrome headless e lê a linha `RESULTADO`. Sai com
código diferente de zero se houver falha **ou** se a página não chegar a escrever o resultado.
Se o navegador não for achado, defina a variável `CHROME` com o caminho do executável.
Um trecho do caminho filtra (`node verificacao/rodar.mjs tetris`); o caminho de um `.html`
roda só aquele arquivo.

## Fumaça: todas as páginas do curso

```
node verificacao/rodar.mjs --fumaca
```

Abre cada `index.html` do repositório (4 por vez, 2 s cada) e lista os erros de console: exceções
não tratadas, `console.error` e recursos que não carregaram. Usa o DevTools Protocol do Chrome
(o `WebSocket` do Node), que entrega cada erro com o texto e a página certa. Não corrige nada: só
informa. A última execução (80 páginas, cerca de 45 s) achou:

- `dealer-out/final`: o `manifest.webmanifest` é bloqueado por CORS em `file://` (o PWA só
  funciona servido por http/https);
- `tutorial/01-html`: carrega `nao-existe.png` de propósito (o exercício é ver a imagem quebrada);
- `tutorial/05-projeto`: `ReferenceError: Cannot access 'CHAVE_DE_ARMAZENAMENTO' before
  initialization`.

## Escrever um teste novo

Copie `tetris/03-queda.html`. Três truques fazem tudo funcionar por `file://`:

1. **Carregue os scripts do passo direto na página**, com
   `<script src="../../<modulo>/<passo>/script.js">`, e copie o esqueleto do `index.html` do
   passo (os `id` que o script procura). Módulos ES e `iframe` de outro arquivo não funcionam por
   `file://`.
2. **Carregue `../apoio.js` antes do jogo.** Ele troca `requestAnimationFrame`, `performance.now`
   e `Math.random`; depois, `avancarQuadro(milissegundos)` entrega um quadro ao loop, e
   `semearSorteio(n)` torna o sorteio repetível.
3. **Leia o estado do jogo pelo nome.** Os `let`/`const` do topo de um script clássico são
   visíveis para os scripts seguintes da mesma página (`poco`, `pecaAtual`, `cabe(...)`).

Termine o script de teste com `finalizar()`. Use `testar(nome, funcao)` para agrupar casos e
`conferir` / `conferirIgual` para as afirmações.
