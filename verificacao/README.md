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
nem em `verificacao/autoteste/` (o autoteste do executor). O autoteste roda com `--autoteste` (seção
abaixo), e uma página dele, por caminho explícito. As páginas de medição não são páginas de teste (não
escrevem `<pre id="resultado">`): `node verificacao/medicao/conferir.mjs` as abre com `?auto=1&quadros=5&aquecimento=2` e
falha se faltar no esqueleto um `id` ou `data-acao` que o passo procura, se houver erro de console ou se a medição não
terminar. Não entra no gate dos quatro comandos; roda antes de pedir uma medição no celular.

Uma opção desconhecida (como `--help` ou um erro de digitação) para com saída 2, sem rodar nada.

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

O Proa Acesa reparte as verificações dos passos 5 a 8 em `proa-acesa/apoio-proa.js` (nascimento do comboio, trava e modo dos clarões, enquadramento da câmera, Espaço depois do clique, chuva, mar e névoa): funções com prefixo `verif…` que usam o `conferir` do `apoio.js`; carregue-o **depois** de `../apoio.js` e antes dos scripts do jogo.

O Dique reparte o que as páginas dos passos 1 a 8 têm em comum em `dique/apoio-dique.js` (a conta de enchente do teste por ponto fixo e por relaxamento, o gravador de polígonos do canvas, o clique de verdade em cada botão `[data-acao]`, o passo inteiro num `iframe` com `srcdoc` para tamanhos de tela e movimento reduzido, e a linha `TEMPO` com o tempo de execução da própria página, sem a abertura do navegador, que só vale aberta por duplo clique: no executor o Chrome roda em tempo virtual e o tempo real é o da linha `PASS`): carregue-o **depois** de `../apoio.js` e antes dos scripts do jogo; as páginas dos passos 4 a 6 guardam o miolo do `<body>` do `index.html` numa constante e o inserem na página e no `iframe`. Ele traz também o pintor de trás para a frente do teste (`montarCenarioDoPintor`, `acharPeloPintorDeTrasParaAFrente`, `pontosInteirosSobreArestas`) e o caso ARESTAS COMPARTILHADAS dos passos 4 a 6 (`conferirArestasComunsComCamera`): pontos de coordenada inteira sobre as arestas de duas casas ou mais, montados como pixel da janela com zoom e rolagem inexatos, e o raio do jogo tem de dar a mesma casa e face que esse pintor (a última pintada vence). O 4 passa ao ajudante a força bruta da própria página (`referenciaDoGiro`); o 3, sem câmera, tem o mesmo caso na página. Plantar o defeito (tirar `+ MARGEM_DO_PONTO_FLUTUANTE` do `Math.floor` de entrada em `acharCasaPeloRaio`) deixa o caso vermelho nos passos 3 a 6.

A página do passo 7 (`dique/07-dias.html`) roda o robô de `regras.js` nos dez dias (pares e estados da tabela do GUIA: um ajuste da poda tem de mudar os dois), planta defeitos em cópias dos dias (mapa torto, `par` errado, dia trivial, sem solução, teto), confere que `certificarDia` devolve o jogo como estava (no meio de uma partida e com `diaCarregado === null`), varre os pixels do canvas atrás da casa-chave do dia 10, lista os 55 planos de 5 jogadas e as casas que todos tocam, joga um plano por dia pelo teclado (campanha até voltar ao dia 1) e clica cada `[data-acao]`; leva uns 15 a 25 s.

A página do passo 8 (`dique/08-celular.html`) abre o passo inteiro em iframes de 390×750 e 360×640 (alvos de 48 px, `#leitura` do H que não cobre o `#aviso` nem as setas em 16 combinações de dia × giro, Tab, foco e Esc do resumo, `matchMedia` falso para o movimento reduzido) e joga quatro dias pelos botões de verdade conferindo o `#resumo` contra o texto vivo depois de toda ação; o toque em dois passos e o limite de 8 px do arrasto usam `PointerEvent` sintético no canvas. Para medir a barra de rolagem como o celular a vê (flutuante), o caso da leitura do H esconde a do Chrome com `scrollbar-width: none`. A página de medição do passo (`verificacao/medicao/dique-08.html`) se confere com `node verificacao/medicao/conferir.mjs`.

**Cópias de marcação do Dique.** Cada cópia à mão do `<body>` de um passo (as constantes `MARCACAO_DO_PASSO` dos passos 4 a 6 e os recortes dos passos 1 a 3: botões e `<pre>`, sem o canvas 1×1, o `<h1>` e a ajuda) fica entre as linhas `ESPELHO:inicio dique/NN-passo/index.html corpo|trecho` e `ESPELHO:fim` (comentário HTML, ou `//` num `<script>`), e `node verificacao/curriculo/espelho.mjs --conferir` a compara com o `index.html` do passo, sem `<script>`, comentários e espaços; a falha traz a página, a linha da marca e a peça que difere (um `data-acao`, um `title`...). Aqui o script só **confere**: o modo sem flag não reescreve estas cópias, porque os recortes dos passos 1 a 3 não saem de uma regra e as páginas 4 a 6 são código de teste editado por várias mãos; acertar a cópia é uma edição de uma linha, guiada pela mensagem. Toda página de `verificacao/dique/` com `id="jogo"` precisa de ao menos uma marca. Ficam fora, de propósito: os esqueletos mínimos em `srcdoc` do `02-alturas.html` (`#botoes` vazio, para testar o script sem a marcação) e as páginas de `verificacao/medicao/`.

O currículo testa um **espelho**: por `file://` uma página não lê o `index.html` de outra pasta, então cada `curriculo/NN-passo.html` guarda uma cópia dele entre as linhas `ESPELHO:inicio` e `ESPELHO:fim` e a abre num `iframe` com `srcdoc` e `<base href>` na pasta do passo (o CSS e o JS carregados são os de verdade). A cópia nunca é feita à mão: mudou um `curriculo/<passo>/index.html`, rode `node verificacao/curriculo/espelho.mjs`; `--conferir` não escreve e sai com 1 se um espelho ficou velho, se uma cópia de marcação do Dique (parágrafo acima) ficou velha, se um arquivo do inventário ou um trecho de código não bate com a árvore, se uma miniatura do `final` falta, sobra ou passa de 60 KB, ou se aparece dado pessoal fora de `@exemplo.invalid`. As páginas repartem `curriculo/apoio-curriculo.js` (inventário, trechos, padrões de dado pessoal, abrir o passo), `apoio-acabamento.js` (passo 5, impressão do 6 e `final`: contraste, tema, `localStorage`, H, movimento reduzido) e `apoio-compartilhar.js` (o `<head>` do 6 e do `final`), nessa ordem, depois de `../apoio.js`.

Se o jogo desenha num `<canvas>`, o teste de `tetris/03-queda.html` troca `getContext` por um
contexto que ignora o desenho (o teste confere regras, não pixels): o robô de 30.000 quadros caiu
de cerca de 17 s para 3 s. Em loops que esperam o jogo, confira o retorno de `avancarQuadro` e
limite as voltas.

Termine o script de teste com `finalizar()`. Use `testar(nome, funcao)` para agrupar casos e
`conferir` / `conferirIgual` para as afirmações.
