# Xenomorph: Protocolo de Extinção — um planeta a partir de uma semente

Nove passos e um final, de uma sala escrita como texto até um metroidvania com elementos roguelike:
um planeta gerado a partir de uma semente, uma habilidade que abre caminhos, três espécies com
máquinas de estado, um ecossistema que evolui, a Matriarca — e uma base onde a campanha continua
depois de cada morte. Construído a partir de um documento de design escrito antes do código: o
[`xenomorph_gdd.md`](xenomorph_gdd.md).

Cada pasta roda sozinha: abra o `index.html` e leia o `GUIA.md` ao lado.

---

## A trilha

| Passo | Pasta | O que entra | Você aprende |
|---|---|---|---|
| 1 | [`01-sala`](01-sala/) | a sala parada | o mundo em texto, o que colide × o que aparece, bordas deduzidas, marcadores, caixa pelo canto |
| 2 | [`02-gravidade`](02-gravidade/) | o soldado anda e cai | acelerar e frear, gravidade, colisão um eixo por vez, pedaços de meio bloco, `EPSILON`, controles como tabela |
| 3 | [`03-salto`](03-salto/) | pular | salto variável, tempo de coiote, pedido guardado, plataforma de mão única, esquiva |
| 4 | [`04-armas`](04-armas/) | atirar | mira como vetor, armas como fichas, estado × ficha, recarga, tiros em pedaços, painel em HTML |
| 5 | [`05-criaturas`](05-criaturas/) | três espécies | máquina de estados em cada criatura, visão por linha, cercar por alvos, parábola calculada, ferir num lugar só |
| 6 | [`06-semente`](06-semente/) | um planeta | gerador pseudoaleatório, hash, fluxos independentes, geração em camadas, módulos e compatibilidade, o plano × o que mudou |
| 7 | [`07-impulso`](07-impulso/) | a habilidade | chaves e fechaduras, validação por busca em largura, descartar e tentar outra semente, mapa do gerador |
| 8 | [`08-matriarca`](08-matriarca/) | o miniboss | chefe com dez estados e três fases, ponto fraco derivado do estado, evolução por regras visíveis, ninhos |
| 9 | [`09-base`](09-base/) | o ciclo roguelike | expedição × campanha, economia como regra, salvar e ler com desconfiança, versão do formato |
| — | [`final`](final/) | armas e modificações, eventos, pausa, som, acessibilidade, toque | dados × sistemas em arquivos, modificações como funções, relógio por criatura, opções à parte, 20 exercícios |

---

## Por que este módulo vem por último

Ele usa quase tudo o que o curso ensinou — e cada passo diz de onde veio cada peça:

| | De onde vem |
|---|---|
| o mundo é um texto que vira matriz | Pac-Man, Tetris |
| delta time, caixas, máquina de estados do jogo | Pong |
| listas que nascem e morrem, fichas de dados, temporizadores, partículas | Dealer? Out! |
| mira, leques, chefe com fases, telegrafar | Shoot 'em up |
| busca em largura, comportamento emergente por alvos | Pac-Man |
| código em arquivos por assunto, ordem dos scripts | xadrez, Dealer? Out! |
| ler o `localStorage` com desconfiança | Tetris |

E acrescenta três coisas que nenhum outro módulo tinha: **física de plataforma** (o soldado tem
peso, e o jogo esconde perdões), **geração procedural com semente** (aleatório, mas repetível, e
conferido antes de jogar) e **progressão entre partidas** (duas memórias com tempos de vida
diferentes).

**Pré-requisito:** o Pac-Man (e, por ele, o Tetris e o Pong); o Shoot 'em up ajuda no chefe.

---

## Do documento ao jogo

Como no Dealer? Out!, cada guia diz qual seção do GDD está sendo atendida, e o guia final traz a
tabela completa — do pedido ao código. O GDD descreve um jogo enorme (sete biomas, oito armas, dez
inimigos, cinco chefes) e pede, na seção 14, que se priorize um protótipo de **doze itens**. Os doze
estão aqui. O guia final também lista, com honestidade, o que ficou de fora e onde cada peça
entraria.

---

## Verificação

Como os outros módulos, este foi testado, não só escrito. Cada passo rodou num navegador real, sem
interface, com o loop movido quadro a quadro por um script:

- **nenhum erro** de console em nenhum dos dez passos;
- **física:** o salto completo sobe 32,7 px (pouco mais de 4 blocos), um toque sobe 9,3 px; um aperto
  3 quadros depois da beirada ainda pula (coiote) e um aperto 4 quadros antes de aterrissar também
  (pedido guardado); um robô apertando teclas ao acaso por milhares de quadros nunca deixou o
  soldado dentro de uma parede, em nenhum passo;
- **alcance com a física real:** uma busca em largura sobre as posições em que o soldado consegue
  ficar de pé, tentando todas as combinações de corrida, pulo e direção, alcançou as nove
  superfícies da sala do passo 3 — e, na primeira versão, mostrou que uma plataforma ficava perto
  demais do teto para alguém caber em pé sobre ela;
- **módulos:** a mesma busca entrou em cada um dos sete módulos por cada abertura e alcançou todas as
  saídas; na primeira versão, três módulos tinham degraus de 5 blocos e foram redesenhados antes de
  entrar no gerador;
- **armas:** 15 tiros em 2 s com o rifle; o tiro diagonal sai a 300 px/s, como o reto; nenhum tiro
  atravessou uma parede;
- **criaturas:** o saltador pousou exatamente no ponto mirado (75,0 px); o cuspe que erra vira poça
  onde o soldado estava; nada fere durante a esquiva;
- **semente:** a mesma semente gerou o mesmo mundo, sala por sala; mudar a chance dos itens não
  moveu nenhuma sala nem criatura; 2.000 mundos sem sala desconectada nem porta sem volta; as 36
  portas de um mundo atravessadas uma a uma;
- **validação:** em 3.000 sementes, 7% das tentativas foram rejeitadas no passo 7 (todas pelo motivo
  previsto: a chave atrás da fechadura que só ela abre), e nenhuma semente precisou de mais que 5;
  com o covil, no passo 8, 0,6 rejeição por mundo, no máximo 8 tentativas, e o covil sempre entre 7
  e 14 portas do pouso;
- **Matriarca:** um robô imortal, mirando sozinho, passou pelos dez estados e pelas três fases e a
  derrubou em 65 s; a armadura deixou passar 3,5 de um tiro de 10, e o ponto fraco exposto, 10;
  nunca mais que 4 filhotes vivos;
- **ecossistema:** no nível *agitado*, um reforço nasceu com 1,3 vez a vida, carapaça dourada e
  resistente à arma mais usada; com 20% de vida, o relógio da evolução andou pela metade;
- **campanha:** morrer com 5 amostras guardou 2; extrair levou exatamente 1 s segurando ↑; depois de
  recarregar a página, amostras, melhorias, Impulso, registros e bestiário estavam lá; `{lixo` no
  armazenamento abriu uma campanha nova, e campos inválidos foram saneados um a um;
- **final:** a divisão em 26 arquivos passou nos testes do passo 9 antes de qualquer novidade; cada
  modificação foi testada isolada (ricochete, perfuração, congelamento a 40%, sifão, fragmentação);
  1.500 mundos deram as raridades em 60% / 30% / 10%; pausar congelou todos os relógios; remapear o
  pulo para M funcionou e foi desfeito; o botão de toque pulou; um robô jogou 9.000 quadros em
  várias expedições sem nenhum erro;
- numa tela de celular (390×750), painel, tela de jogo, botões de toque e mapa cabem sem rolar.

---

## Como estudar

1. Abra o `index.html` e **jogue**.
2. Leia o `GUIA.md`.
3. Leia o código — os comentários explicam cada conceito onde ele aparece.
4. Faça os exercícios. Vários pedem para você quebrar o código de propósito.
5. Aperte **H**. A partir do passo 7, aperte duas vezes: o mapa do gerador mostra o planeta inteiro,
   a rota obrigatória e por que as sementes rejeitadas foram rejeitadas.
6. Volte ao [GDD](xenomorph_gdd.md) e encontre a seção que o passo atendeu.

Antes de mexer numa pasta, faça uma cópia.

---

**Pré-requisito:** [`../pacman`](../pacman/) · **Índice:** [`../README.md`](../README.md)
