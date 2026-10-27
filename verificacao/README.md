# Verificação

Páginas de teste que rodam o código **real** de um passo do curso, com o relógio e o sorteio
trocados por versões falsas, e conferem as regras do jogo. Sem biblioteca, sem instalação.

## Arquivos do executor

`rodar.mjs` é a porta de entrada (opções, modo normal). `fumaca.mjs`, `links.mjs` e `captura.mjs`
são os outros modos; `navegador.mjs` acha o Chrome, cria o perfil temporário e controla os
processos; `cdp.mjs` é o cliente do DevTools Protocol, e `depuracao.mjs` junta os dois para a
fumaça e a captura (abrir o Chrome, abrir uma página, coletar os erros dela).

## Abrir um teste (duplo clique)

Abra, por exemplo, `verificacao/tetris/03-queda.html`. Cada linha começa com `PASS` ou `FALHA`;
a última diz `RESULTADO: 35 ok, 0 falhas`.

## Rodar todos, sem interface

Precisa do Node (22 ou mais novo) e do Chrome ou Edge instalado:

```
node verificacao/rodar.mjs
```

Procura cada `verificacao/**/*.html`, abre no Chrome headless e lê o texto de `#resultado`.
Sai com código diferente de zero se **qualquer** linha `FALHA` aparecer (antes ou depois da linha
`RESULTADO`, inclusive um erro que estoura num `setTimeout` depois de `finalizar()`), se a página
não chegar a escrever o resultado ou se passar de 120 s (aí o navegador e os filhos dele são
mortos; se um filho órfão ainda segurar a saída, o executor desiste dele após mais 5 s). Quando o navegador falha, o motivo real é impresso (não executou, código de saída, sinal).

Navegador: a variável `CHROME` vence; senão os lugares comuns (Windows, macOS, `~/Applications`,
`/opt/google/chrome`, `/usr/bin`, snap) e por fim o `PATH` (`where`/`which` para `chrome`,
`google-chrome`, `chromium`, `microsoft-edge` e variantes). Um `CHROME` que não existe ou não é
executável encerra com uma mensagem clara (código 2).

Um trecho do caminho filtra (`node verificacao/rodar.mjs tetris`); o caminho de um `.html`
roda só aquele arquivo.

O modo normal **não** entra em `verificacao/medicao/` (páginas de medição para abrir no celular)
nem em `verificacao/autoteste/` (o autoteste do executor): essas pastas só rodam por caminho
explícito (`node verificacao/rodar.mjs verificacao/medicao/<pagina>.html`).

## Fumaça: todas as páginas do curso

```
node verificacao/rodar.mjs --fumaca
```

Abre cada `index.html` do repositório (4 por vez) e lista os erros de console: exceções não
tratadas, `console.error` e recursos que não carregaram. Cada página espera o evento `load` (teto
de 15 s) mais 1 s de folga para erros tardios. Usa o DevTools Protocol do Chrome (o `WebSocket` do
Node), que entrega cada erro com o texto e a página certa; um comando sem resposta em 30 s ou um
Chrome que morre viram erro, não travamento. No fim o Chrome é encerrado e a pasta de perfil
temporária (`%TEMP%/verificacao-*`) é apagada, com novas tentativas no Windows; se a pasta ficar
presa, o executor encerra só os processos que têm o nome dela na linha de comando. Não corrige nada:
só informa. Cerca de 35 s para as 80 páginas.

### Erros esperados

A tabela `ERROS_ESPERADOS` no topo de `fumaca.mjs` lista erros que fazem parte do curso. Eles saem
como `esperado` (com o motivo) e não reprovam a execução; qualquer outro erro na mesma página
continua reprovando. Cada entrada tem a página, um padrão que casa com a linha de erro **inteira** e o motivo.

| Página | Erro | Motivo |
|--------|------|--------|
| `tutorial/01-html/index.html` | `ERR_FILE_NOT_FOUND` de `nao-existe.png` e `tambem-nao-existe.png` | a lição mostra o texto `alt` de uma imagem que não existe, de propósito |
| `dealer-out/final/index.html` | `manifest.webmanifest` bloqueado por CORS (e o `ERR_FAILED` que o acompanha) | em `file://` o PWA não carrega o manifesto; o jogo abre por duplo clique, mas só instala servido por https (ver `dealer-out/final/GUIA.md`) |

Para acrescentar uma entrada, descreva a linha toda, com o nome do arquivo ou recurso: o executor
impõe `^…$` a todo padrão, então uma mensagem que apenas *contém* o texto não é aceita.

## Captura: uma imagem da página

```
node verificacao/rodar.mjs --captura <arquivo.html> [--largura N] [--altura N] [--escala N] [--saida caminho.png]
```

Abre a página no Chrome headless (o mesmo caminho da fumaça: perfil temporário, DevTools Protocol),
ajusta a janela **antes** de navegar, espera o evento `load` (teto de 15 s) mais 1 s de folga e grava
um PNG (`Page.captureScreenshot`). Padrões: 1280×800, escala 1 (`--escala 2` dá uma imagem com o
dobro de pixels, como num celular de tela densa). Sem `--saida`, o PNG vai para a pasta temporária
do sistema com um nome que traz a página e o tamanho (`captura-tetris-final-index-390x750@2x.png`);
o caminho absoluto sai impresso. Funciona com WebGL (o Chrome roda com SwiftShader por software;
o módulo 3D ainda precisa de internet para o three.js do CDN).

Os erros de console vistos durante a carga também são impressos, só para informar: não mudam o
código de saída. Limites: largura e altura de 1 a 8000, escala de 0,1 a 4. Para olhar o resultado,
abra o PNG (um agente pode lê-lo como imagem).

Saída: 0 PNG gravado; 1 a página não carregou (ou não terminou em 15 s) ou a captura falhou, e nenhum
arquivo é gravado; 2 navegador não encontrado, arquivo inexistente ou opção inválida.

## Links: Markdown sem link quebrado

```
node verificacao/rodar.mjs --links
```

Confere todo link relativo `[texto](destino)` (e imagem `![alt](destino)`) de cada `.md` que o git
conhece (`git ls-files -co --exclude-standard`, ou seja, versionados e novos que não são
ignorados). O destino é resolvido a partir da pasta do arquivo; `/caminho` parte da raiz do
repositório. Ignora `http(s):`, `mailto:` e demais esquemas, links só de âncora (`#secao`) e o que
está em blocos de código ou entre crases. Maiúsculas e minúsculas precisam bater com o arquivo
(o GitHub distingue, o Windows não). Âncoras dentro de outro arquivo (`arquivo.md#secao`) não são
conferidas, nem links por referência (`[x]: destino`). Imprime cada link quebrado com arquivo e
linha e sai com 1 se houver algum. Última execução: 101 arquivos, 521 links, 0 quebrados.

## Autoteste: o executor se testa

```
node verificacao/rodar.mjs --autoteste
```

Planta 13 defeitos conhecidos e confere que o executor **atual** reprova (ou aprova, nos controles)
cada um, com o código de saída e as linhas-chave esperados. Leva cerca de 30 s e sai com 1 se algum
mutante tiver outro resultado. A tabela está em `verificacao/autoteste/autoteste.mjs`:

| Grupo | Mutantes |
|-------|----------|
| Página de teste (os `.html` de `verificacao/autoteste/`) | controle que passa; expectativa errada; só a primeira afirmação falha; erro em `setTimeout` depois de `finalizar()`; erro antes de `finalizar()`; laço infinito (teto de 3 s); `CHROME` inexistente |
| Fumaça (repositório falso com a página `tutorial/01-html`) | `console.error` extra; exceção não tratada extra; mensagem que só *contém* um erro esperado; controle só com os 2 esperados |
| Links (repositório falso com `git init`) | link quebrado, caixa errada e código ignorado; controle sem quebrados |

Os repositórios falsos são cópias dos módulos `.mjs` do executor atual numa pasta temporária
(`autoteste-*`), apagada no fim; o repositório real não é alterado. Todo filho roda com
`TEMP`/`TMP`/`TMPDIR` apontando para essa pasta, então um perfil `verificacao-*` que sobrar (Chrome
não encerrado) reprova o mutante em vez de passar despercebido.

Variável `LIMITE_DA_PAGINA_EM_SEGUNDOS`: teto de uma página de teste no modo normal (padrão 120).
O autoteste usa 3 só no laço infinito, para não esperar 2 minutos. Para acrescentar um mutante,
junte uma entrada em `listarMutantes` (e, se for de página, um `.html` em `verificacao/autoteste/`).

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

Se o jogo desenha num `<canvas>`, o teste de `tetris/03-queda.html` troca `getContext` por um
contexto que ignora o desenho (o teste confere regras, não pixels): o robô de 30.000 quadros caiu
de cerca de 17 s para 3 s. Em loops que esperam o jogo, confira o retorno de `avancarQuadro` e
limite as voltas.

Termine o script de teste com `finalizar()`. Use `testar(nome, funcao)` para agrupar casos e
`conferir` / `conferirIgual` para as afirmações.
