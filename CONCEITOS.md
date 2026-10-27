# Conceitos — onde aprender, onde reencontrar

Um índice de consulta para o curso. Cada linha diz **onde o conceito é ensinado** (a pasta do passo)
e **onde ele volta a ser usado**. Quando um conceito reaparece em outro módulo, o guia de lá costuma
dizer "isto veio de…"; aqui você vê o caminho inteiro de uma vez. Um traço (—) quer dizer que o
conceito é específico daquele passo.

Para a ordem dos módulos, volte ao [`README.md`](README.md).

---

## Linguagem e DOM

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| tags, árvore, atributos, semântica | [`tutorial/01-html`](tutorial/01-html/) | [`jogo-da-cobrinha/01-estrutura`](jogo-da-cobrinha/01-estrutura/) |
| seletores, cascata, box model, flexbox, grid | [`tutorial/02-css`](tutorial/02-css/) | [`jogo-da-cobrinha/02-estilo`](jogo-da-cobrinha/02-estilo/) |
| variáveis, funções, arrays, objetos | [`tutorial/03-javascript`](tutorial/03-javascript/) | todos os jogos |
| encontrar e criar elementos, eventos | [`tutorial/04-dom`](tutorial/04-dom/) | [`jogo-da-cobrinha/05-teclado`](jogo-da-cobrinha/05-teclado/) |
| ler erros no Console (F12) | [`jogo-da-cobrinha/03-desenho`](jogo-da-cobrinha/03-desenho/) | todos os jogos |
| `let` × `const`, funções pequenas | [`jogo-da-cobrinha/04-movimento`](jogo-da-cobrinha/04-movimento/) | todos os jogos |
| guard clause | [`jogo-da-cobrinha/08-colisao`](jogo-da-cobrinha/08-colisao/) | [`pong/07-placar`](pong/07-placar/) |
| arrays: `unshift`/`pop`, `some`, `slice` | [`jogo-da-cobrinha/06-cobra`](jogo-da-cobrinha/06-cobra/) | [`tetris/06-linhas`](tetris/06-linhas/) |

## Canvas e desenho

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| contexto do canvas, `fillRect`, células × pixels | [`jogo-da-cobrinha/03-desenho`](jogo-da-cobrinha/03-desenho/) | [`pong/01-tela`](pong/01-tela/) |
| HTML × canvas (o que desenhar onde) | [`jogo-da-cobrinha/09-interface`](jogo-da-cobrinha/09-interface/) | [`pong/07-placar`](pong/07-placar/), [`xadrez/01-tabuleiro`](xadrez/01-tabuleiro/) |
| escala inteira do pixel, pixel art | [`jogo-da-cobrinha/final`](jogo-da-cobrinha/final/) | [`pong/01-tela`](pong/01-tela/) |
| sprites feitos de texto | [`dealer-out/01-tela`](dealer-out/01-tela/) | — |
| segundo canvas (peça seguinte) | [`tetris/07-proxima`](tetris/07-proxima/) | — |
| coordenadas pelo centro | [`shoot-em-up/01-ceu`](shoot-em-up/01-ceu/) | [`shoot-em-up/05-colisao`](shoot-em-up/05-colisao/) |
| rolagem com `%` e paralaxe | [`shoot-em-up/01-ceu`](shoot-em-up/01-ceu/) | [`dealer-out/final`](dealer-out/final/) |
| partículas | [`dealer-out/07-combos`](dealer-out/07-combos/) | [`xenomorph/final`](xenomorph/final/) |
| `arc` e paredes deduzidas dos vizinhos | [`pacman/01-labirinto`](pacman/01-labirinto/) | [`xenomorph/01-sala`](xenomorph/01-sala/) (bordas deduzidas) |

## Tempo e loop

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| game loop com `setInterval`, apagar e repintar | [`jogo-da-cobrinha/04-movimento`](jogo-da-cobrinha/04-movimento/) | [`pong/02-loop`](pong/02-loop/) (substituído) |
| `requestAnimationFrame` e delta time | [`pong/02-loop`](pong/02-loop/) | [`pacman/02-movimento`](pacman/02-movimento/), [`xenomorph/02-gravidade`](xenomorph/02-gravidade/) |
| acumulador de tempo | [`tetris/03-queda`](tetris/03-queda/) | [`dealer-out/03-chuva`](dealer-out/03-chuva/), [`shoot-em-up/03-tiros`](shoot-em-up/03-tiros/) |
| cadência (acumulador sem crédito) | [`shoot-em-up/03-tiros`](shoot-em-up/03-tiros/) | [`xenomorph/04-armas`](xenomorph/04-armas/) |
| temporizadores e fases derivadas | [`dealer-out/06-atordoamento`](dealer-out/06-atordoamento/) | [`xenomorph/03-salto`](xenomorph/03-salto/) |
| escala do tempo | [`dealer-out/08-poderes`](dealer-out/08-poderes/) | — |
| tempo para travar a peça | [`tetris/08-velocidade`](tetris/08-velocidade/) | — |
| menu, pausa e recomeço | [`pong/final`](pong/final/) | [`tetris/final`](tetris/final/), [`pacman/final`](pacman/final/) |

## Entrada

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| eventos de teclado, `preventDefault` | [`jogo-da-cobrinha/05-teclado`](jogo-da-cobrinha/05-teclado/) | todos os jogos |
| teclas presas (mapa de teclas) | [`pong/04-raquetes`](pong/04-raquetes/) | [`tetris/04-controles`](tetris/04-controles/) |
| evento por toque × tecla presa, `evento.repeat` | [`tetris/04-controles`](tetris/04-controles/) | [`tetris/08-velocidade`](tetris/08-velocidade/) (repetição própria) |
| teclado e toque viram uma intenção, pointer events | [`dealer-out/02-movimento`](dealer-out/02-movimento/) | [`shoot-em-up/final`](shoot-em-up/final/), [`pacman/final`](pacman/final/) |
| intenção em dois eixos, normalizar a diagonal | [`shoot-em-up/02-nave`](shoot-em-up/02-nave/) | [`xenomorph/02-gravidade`](xenomorph/02-gravidade/) |
| intenção guardada até o próximo centro | [`pacman/02-movimento`](pacman/02-movimento/) | — |
| pedido guardado (buffer) | [`xenomorph/03-salto`](xenomorph/03-salto/) | — |

## Colisão

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| colisão por igualdade de casa | [`jogo-da-cobrinha/07-maca`](jogo-da-cobrinha/07-maca/) | [`pacman/03-pastilhas`](pacman/03-pastilhas/) |
| ricochete por troca de sinal | [`pong/03-paredes`](pong/03-paredes/) | [`pong/06-angulo`](pong/06-angulo/) |
| clamp | [`pong/04-raquetes`](pong/04-raquetes/) | [`shoot-em-up/02-nave`](shoot-em-up/02-nave/) |
| AABB e o bug da bola grudada | [`pong/05-colisao`](pong/05-colisao/) | [`dealer-out/05-colisao`](dealer-out/05-colisao/), [`xenomorph/01-sala`](xenomorph/01-sala/) |
| "cabe?" antes de mover | [`tetris/03-queda`](tetris/03-queda/) | [`tetris/05-rotacao`](tetris/05-rotacao/) |
| caixa de colisão com perdão | [`dealer-out/05-colisao`](dealer-out/05-colisao/) | [`xenomorph/03-salto`](xenomorph/03-salto/) |
| círculos, muitos contra muitos | [`shoot-em-up/05-colisao`](shoot-em-up/05-colisao/) | [`xenomorph/04-armas`](xenomorph/04-armas/) |
| colisão um eixo por vez, `EPSILON` | [`xenomorph/02-gravidade`](xenomorph/02-gravidade/) | [`pacman/02-movimento`](pacman/02-movimento/) (`EPSILON`) |

## Dados e estado

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| estado → ações → tela (a tela é o espelho) | [`tutorial/05-projeto`](tutorial/05-projeto/) | todos os jogos |
| matriz do mundo, `poco[linha][coluna]` | [`tetris/01-poco`](tetris/01-poco/) | [`pacman/01-labirinto`](pacman/01-labirinto/), [`xenomorph/01-sala`](xenomorph/01-sala/) |
| formas como dados | [`tetris/02-pecas`](tetris/02-pecas/) | [`tetris/05-rotacao`](tetris/05-rotacao/) (empurrões como dados) |
| mapa como texto, conferir dados | [`pacman/01-labirinto`](pacman/01-labirinto/) | [`xenomorph/01-sala`](xenomorph/01-sala/) |
| máquina de estados do jogo | [`pong/07-placar`](pong/07-placar/) | [`tetris/07-proxima`](tetris/07-proxima/), [`pacman/07-vidas`](pacman/07-vidas/) |
| listas que nascem e morrem | [`dealer-out/03-chuva`](dealer-out/03-chuva/) | [`shoot-em-up/03-tiros`](shoot-em-up/03-tiros/), [`xenomorph/04-armas`](xenomorph/04-armas/) |
| catálogo de dados, fichas | [`dealer-out/04-catalogo`](dealer-out/04-catalogo/) | [`xenomorph/04-armas`](xenomorph/04-armas/) |
| tabela de pontos, curva como tabela | [`tetris/06-linhas`](tetris/06-linhas/), [`tetris/08-velocidade`](tetris/08-velocidade/) | [`pacman/06-modos`](pacman/06-modos/), [`pacman/08-niveis`](pacman/08-niveis/) |
| efeitos como dados | [`dealer-out/08-poderes`](dealer-out/08-poderes/) | [`xenomorph/04-armas`](xenomorph/04-armas/) |
| roteiro como dados | [`shoot-em-up/07-roteiro`](shoot-em-up/07-roteiro/) | — |
| estado imutável | [`xadrez/02-pecas`](xadrez/02-pecas/) | [`tetris/05-rotacao`](tetris/05-rotacao/), [`xadrez/06-especiais`](xadrez/06-especiais/) |
| estado do jogo × estado da interface | [`xadrez/03-selecionar`](xadrez/03-selecionar/) | — |

## IA e busca

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| adversário como limitação deliberada | [`pong/08-computador`](pong/08-computador/) | — |
| regra do cruzamento, andar × decidir | [`pacman/04-fantasma`](pacman/04-fantasma/) | [`pacman/05-personalidades`](pacman/05-personalidades/) |
| alvos como funções, comportamento emergente | [`pacman/05-personalidades`](pacman/05-personalidades/) | [`xenomorph/05-criaturas`](xenomorph/05-criaturas/) (cercar por alvos) |
| máquina de estados numa entidade | [`shoot-em-up/08-chefe`](shoot-em-up/08-chefe/) | [`xenomorph/05-criaturas`](xenomorph/05-criaturas/), [`xenomorph/08-matriarca`](xenomorph/08-matriarca/) |
| busca em largura | [`pacman/06-modos`](pacman/06-modos/) | [`xenomorph/07-impulso`](xenomorph/07-impulso/) |
| minimax e função de avaliação | [`xadrez/07-computador`](xadrez/07-computador/) | — |
| poda alfa-beta, ordenação, quiescence | [`xadrez/08-alfa-beta`](xadrez/08-alfa-beta/) | — |
| chefe com fases, telegrafar o ataque | [`shoot-em-up/08-chefe`](shoot-em-up/08-chefe/) | [`xenomorph/08-matriarca`](xenomorph/08-matriarca/) |
| visão por linha | [`xenomorph/05-criaturas`](xenomorph/05-criaturas/) | — |

## Matemática

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| vetor de velocidade | [`pong/02-loop`](pong/02-loop/) | todos os jogos de movimento contínuo |
| ângulo pelo ponto de impacto, teto de velocidade | [`pong/06-angulo`](pong/06-angulo/) | — |
| `Math.random`, `do/while` | [`jogo-da-cobrinha/07-maca`](jogo-da-cobrinha/07-maca/) | [`dealer-out/04-catalogo`](dealer-out/04-catalogo/) |
| saco de sete, Fisher-Yates | [`tetris/07-proxima`](tetris/07-proxima/) | — |
| sorteio ponderado | [`dealer-out/04-catalogo`](dealer-out/04-catalogo/) | [`dealer-out/09-dificuldade`](dealer-out/09-dificuldade/) |
| `lerp` e curva de dificuldade | [`dealer-out/09-dificuldade`](dealer-out/09-dificuldade/) | [`pacman/08-niveis`](pacman/08-niveis/) |
| seno, easing, posição como função do tempo | [`shoot-em-up/04-inimigos`](shoot-em-up/04-inimigos/) | — |
| `atan2`, leque e anel de tiros | [`shoot-em-up/06-contra-ataque`](shoot-em-up/06-contra-ataque/) | [`xenomorph/04-armas`](xenomorph/04-armas/) (mira, leques) |
| girar uma matriz | [`tetris/05-rotacao`](tetris/05-rotacao/) | — |
| gerador pseudoaleatório com semente, hash | [`xenomorph/06-semente`](xenomorph/06-semente/) | [`xenomorph/07-impulso`](xenomorph/07-impulso/) |

## Arquitetura e arquivos

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| dividir em arquivos por assunto, ordem dos scripts | [`xadrez/07-computador`](xadrez/07-computador/) | [`dealer-out/final`](dealer-out/final/), [`xenomorph/final`](xenomorph/final/) |
| do documento de design (GDD) ao código | [`dealer-out/README.md`](dealer-out/README.md) | [`xenomorph/README.md`](xenomorph/README.md) |
| dados × sistemas em arquivos | [`xenomorph/final`](xenomorph/final/) | — |
| mostrar o invisível (tecla **H**) | [`dealer-out/05-colisao`](dealer-out/05-colisao/) | [`shoot-em-up/05-colisao`](shoot-em-up/05-colisao/), [`pacman/04-fantasma`](pacman/04-fantasma/), [`xenomorph/02-gravidade`](xenomorph/02-gravidade/) |
| perdões escondidos (coiote, pedido guardado) | [`xenomorph/03-salto`](xenomorph/03-salto/) | — |

## Persistência

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| `localStorage` com `try/catch` | [`tutorial/05-projeto`](tutorial/05-projeto/) | [`tetris/final`](tetris/final/) |
| desconfiar do que se lê (recorde) | [`tetris/final`](tetris/final/) | [`xenomorph/09-base`](xenomorph/09-base/), [`pacman/final`](pacman/final/) |
| salvar com versão do formato | [`xenomorph/09-base`](xenomorph/09-base/) | — |

## Som e acessibilidade

| Conceito | Onde se aprende | Onde se reusa |
|---|---|---|
| `alt`, `<label>`, foco visível, semântica | [`tutorial/01-html`](tutorial/01-html/) | todos os módulos |
| tabuleiro de 64 `<button>`, teclado e leitor de tela | [`xadrez/01-tabuleiro`](xadrez/01-tabuleiro/) | [`xadrez/final`](xadrez/final/) |
| não depender só da cor | [`dealer-out/04-catalogo`](dealer-out/04-catalogo/) | — |
| som sintetizado (áudio agendado) | [`dealer-out/final`](dealer-out/final/) | [`shoot-em-up/final`](shoot-em-up/final/), [`pacman/final`](pacman/final/) |
| internacionalização, PWA, mods | [`dealer-out/final`](dealer-out/final/) | — |
