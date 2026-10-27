# Xenomorph — passo final

**Anterior:** `09-base`
**Rode:** abra o `index.html`. A campanha fica salva no navegador.
**Controles:** ← → ou A D andam · ↑ ↓ miram · Espaço, Z ou K pulam (segure para ir mais alto) ·
↓ + pular desce pela grade · X ou J atiram · Q troca de arma · R recarrega · Shift, C ou L esquivam
· ↑ usa estações e terminais (segurado ao lado da nave, extrai) · P ou Esc pausa · H mostra o
invisível. Todas as teclas de ação podem ser trocadas nas **Opções** da base. No celular, botões
na tela.

Este é o fim da trilha — do módulo e do curso — e também o material de referência: o código está
comentado, e este guia reúne os conceitos. No fim há 20 exercícios, e uma lista honesta do que o
GDD pede e este protótipo ainda não faz.

---

## O que mudou do passo 9 para aqui

| | Passo 9 | Final |
|---|---|---|
| Código | um `script.js` e o `gerador.js` | **7 arquivos de dados** em `dados/` e **19 sistemas** em `scripts/` |
| Armas | rifle e espingarda | + **metralhadora experimental** e **canhão de partículas** (atravessa 3), liberadas na base; o soldado escolhe **quais duas** levar |
| Modificações | — | **7 módulos de arma** em 3 raridades (60% comum, 30% raro, 10% épico): cano longo, gatilho leve, munição perfurante, ricochete, núcleo criogênico, sifão de biomassa, carga de fragmentação |
| Eventos | — | **estação médica** (cura uma vez) e **terminais** com os **registros da colônia**, que se acumulam na campanha e contam a história |
| Estados | base, jogando, fim | + **pausado** (P, Esc, botão, ou sozinho ao trocar de janela) |
| Som | — | 18 sons sintetizados, **batimento** que acelera com criatura caçando perto, avisos sonoros nos ataques |
| Acessibilidade | — | **remapear** cada ação, **efeitos reduzidos**, vibração, números de dano, som — salvos à parte da campanha |
| Toque | — | direcional e botões de ação na tela, onde não há teclado |
| Corpo | um quadro | **quatro**: parado, dois passos, no ar |
| Combate | — | **números de dano** com algarismos de 3×5 pixels, **tremor** de tela |

Nenhuma regra dos passos anteriores mudou. As novidades **usam** o que já existia: as modificações
são funções sobre a ficha da arma; os eventos são itens que não se apanham; a pausa é um estado; o
toque e o remapeamento são entradas para a tabela `CONTROLES`.

---

## O mapa: do GDD ao código

O [GDD](../xenomorph_gdd.md) foi escrito antes do código — e pede muito mais do que um protótipo
cabe. A seção 14 diz o que priorizar: doze itens. Os doze estão aqui:

| GDD §14 | Pedido | Onde | Passo |
|---|---|---|---|
| 1 | um personagem controlável | `scripts/fisica.js`, `dados/fisica.js` | 2, 3 |
| 2 | um sistema de combate funcional | `scripts/armas.js`, `scripts/combate.js` | 4, 5 |
| 3 | pelo menos três tipos de inimigos | rastejador, saltador, cuspidora (+ ninho): `scripts/criaturas.js` | 5, 8 |
| 4 | um conjunto inicial de armas | `dados/armas.js` | 4, final |
| 5 | um mapa pseudoaleatório com salas conectadas | `scripts/gerador.js`, `dados/mundo.js` | 6 |
| 6 | uma habilidade de exploração desbloqueável | o Impulso Cinético: `romperMembranas` | 7 |
| 7 | um miniboss | a Matriarca: `scripts/matriarca.js` | 8 |
| 8 | um sistema de morte e reinício | `encerrarExpedicao`, a base | 5, 9 |
| 9 | progressão permanente | `MELHORIAS`, habilidades e armas na campanha | 9, final |
| 10 | salvamento da campanha | `salvarCampanha` / `sanearCampanha` | 9 |
| 11 | uma interface funcional | painel, minimapa, base, avisos: `scripts/interface.js`, `scripts/base.js` | 4–final |
| 12 | uma seed reproduzível para cada mapa | `scripts/sorte.js`, `gerarMundo(semente)` | 6 |

E o resto do documento, seção por seção:

| GDD | Pedido | Onde | Passo |
|---|---|---|---|
| 1 | 2D lateral, complexo abandonado, sombrio | a sala em texto, as paletas | 1 |
| 2 | salas conectadas, seed, áreas obrigatórias acessíveis | gerador em camadas + validador | 6, 7 |
| 2 | estrutura metroidvania, biomas com identidade | duas regiões fixas, paletas e pesos próprios | 6 |
| 2, 6 | áreas que exigem habilidade; voltar com ela | membranas; salas secretas com tanque | 7 |
| 2 | atalhos entre regiões já exploradas | `criarAtalhos` | 6 |
| 3 | o ciclo de doze passos; perder parte dos recursos | expedição × campanha, `FRACAO_GUARDADA_NA_MORTE` | 9 |
| 3 | habilidades persistentes; armas e modificações variáveis | `campanha.habilidades`; modificações por expedição | 9, final |
| 4 | corrida, salto variável, esquiva, mira em 8 direções, controle aéreo | `FISICA`, `direcaoDaMira` | 2–4 |
| 4 | cada arma com dano, alcance, cadência, recarga; duas equipadas | `ARMAS`, `equipamento` | 4, final |
| 4 | IA por estados; reagir ao ambiente e à arma | `COMPORTAMENTOS`, `enxerga`, `empurrao` | 5 |
| 5 | ecossistema que evolui por regras controladas | `EVOLUCAO`, `nivelDaRegiao`, `evoluir` | 8 |
| 5 | resistência à arma mais usada; ninhos com reforços | `armaMaisUsada`, `ninhoPulsa`, `chamarReforcos` | 8 |
| 5 | dificuldade adaptativa | distância ao pouso, relógio por região, regra de piedade | 6, 8 |
| 5, 8 | chefes que mudam em expedições futuras | `ATAQUES_APRENDIDOS` | 9 |
| 7 | modificações com raridades e efeitos | `MODIFICACOES`, `RARIDADES`, `fichaDaArma` | final |
| 8 | chefe com fases, padrões, ponto fraco | `MATRIARCA.fases`, `exposta` | 8 |
| 8 | eventos aleatórios | estação médica, terminais: `distribuirEventos` | final |
| 9 | base: melhorias, armas, registros, história | `scripts/base.js` | 9, final |
| 9 | a base evolui visualmente | luzes, Impulso, núcleos de dados no hangar | 9 |
| 10 | sons para inimigos próximos, ataques, portas secretas, eventos | `SONS`, `atualizarBatimento` | final |
| 11 | vida, munição, recarga, mapa explorado, objetivo, bestiário | painel, minimapa, `BESTIARIO` | 4–9 |
| 11 | mapa sem revelar o desconhecido; portas bloqueadas em destaque | `desenharMinimapa`, `estadoDaPorta` | 6, 7 |
| 11 | remapear, vibração, efeitos visuais, indicadores | `scripts/opcoes.js` | final |
| 12 | sistemas separados; configuração externa; sem código duplicado por inimigo | `dados/` × `scripts/`; um motor de estados | 5, 6, final |
| 12 | ferramentas de depuração | tecla H: caixas, estados, pontos de surgimento, mapa do gerador | 2–7 |
| 13 | fluxos independentes; validar; descartar e tentar outra seed | `criarFluxo`, `validarMundo`, `gerarMundo` | 6, 7 |
| 13 | módulos feitos à mão, com regras de compatibilidade | `MODULOS`, `escolherModulos`, `conferirModulos` | 6 |

> Um documento de design é uma lista de perguntas. Esta tabela é a lista de respostas — e a
> próxima seção, a lista das que ainda faltam.

---

## O que ficou fora do protótipo

O GDD descreve um jogo grande, e diz ele mesmo (seção 14): *"Depois que o protótipo estiver
estável, expanda gradualmente o número de biomas, inimigos, habilidades, armas, eventos e
chefes."* Isto é o que ainda **não** existe — e, para cada um, onde ele entraria:

| O GDD pede | Falta | Entraria em |
|---|---|---|
| sete biomas | cinco (minas, instalação militar, oceano de biomassa, colmeia, núcleo) | `REGIOES` + `PALETAS` + a grade do gerador |
| oito armas | lança-chamas criogênico, lâmina energética, micromísseis, arma biológica | `ARMAS` (a lâmina pede um ataque sem projétil) |
| dez tipos de inimigo | tanques, parasitas, caçadores camuflados, drones, predadores que trocam de sala, guardiões | fichas + estados novos no motor |
| oito habilidades | salto de fase, gancho, salto duplo, pulso sísmico, escudo, visão espectral, sobrecarga neural | um campo no soldado, um "se" — e uma fechadura nova no gerador |
| agarrar-se, deslizar, escalar paredes | os três | `scripts/fisica.js` |
| cinco chefes | quatro (Devorador, Sentinela, Caçador Primordial, Coração da Colmeia) | uma máquina como a da Matriarca |
| eventos com escolha e consequência | resgatar sobreviventes, sinal-armadilha, comerciante, defender uma área | `distribuirEventos` + `AO_USAR` |
| pulo entre salas por elevadores e túneis | só portas, poços e grades | novos tipos de abertura nos módulos |

Vários exercícios abaixo são exatamente esses itens.

---

## 1. Dados de um lado, sistemas do outro

```
dados/      mundo · fisica · aparencia · armas · criaturas · progressao · controles
scripts/    sorte · gerador · estado · opcoes · som · entrada · fisica · armas · criaturas
            matriarca · combate · ecossistema · mundo · campanha · base · desenho
            depuracao · interface · principal
```

O GDD pede (seção 12) *"sistemas independentes e reutilizáveis"* e *"configurações externas para
definir atributos de armas, inimigos, salas, itens e habilidades"*. Os passos já separavam **fichas**
de **comportamento** dentro de um arquivo; o final separa os arquivos. Quem quiser um jogo mais
difícil mexe em `dados/`; quem quiser um jogo diferente mexe em `scripts/`.

### A ordem dos scripts é um contrato

Scripts comuns (não módulos — o jogo abre com duplo clique, em `file://`) dividem o mesmo escopo
global, e cada um só pode usar **ao carregar** o que os anteriores já declararam. Funções de um
arquivo posterior existem — mas só depois que ele carregar.

A regra que evita o problema: **nenhum código de topo chama função de outro arquivo**. Por isso
`estado.js` declara `let campanha = null;` em vez de `let campanha = carregarCampanha();` — a
divisão em arquivos encontrou exatamente esse erro (*"Cannot access 'VERSAO_DA_CAMPANHA' before
initialization"*) e ele foi resolvido assim. Quem liga os fios é `principal.js`, o último.

Antes de acrescentar qualquer novidade, a divisão foi **testada sozinha**: todos os testes do passo 9
passaram no final dividido, sem mudar um resultado. Refatorar e mudar comportamento no mesmo passo
deixaria qualquer bug sem dono.

---

## 2. Uma modificação é uma função sobre a ficha

```js
ricochete: {
    raridade: "raro",
    aplicar: ficha => ({ ...ficha, ricochetes: 1 })
},

function fichaDaArma(arma) {
    const ficha = ARMAS[arma.tipo];
    return arma.modificacao ? MODIFICACOES[arma.modificacao].aplicar(ficha) : ficha;
}
```

A arma modificada não tem código próprio: tem **números diferentes**. Quem atira pede
`fichaDaArma` e nunca sabe se ela foi modificada. Os efeitos que não são números (quicar,
congelar, curar, explodir) viajam **no projétil**, e o combate os interpreta onde fazem sentido —
o ricochete na parede, o congelamento no acerto, o sifão e a fragmentação no abate.

### Sortear em dois tempos

```js
const raridade = escolherPonderado(sortear, pesos);          // 60 / 30 / 10
const daRaridade = Object.keys(MODIFICACOES).filter(...);    // depois, qual delas
```

Se o sorteio fosse direto entre os sete módulos, o peso de uma raridade dependeria de quantos
módulos ela tem — acrescentar um épico deixaria os épicos mais comuns. Em dois tempos, a raridade
manda. O teste conferiu em 1.500 mundos: 60%, 30%, 10%.

### Congelar é desacelerar o relógio

```js
const tempoDela = criatura.lenta > 0 ? tempo * RITMO_DA_CRIATURA_LENTA : tempo;
```

Multiplicar só a velocidade não serviria: o bote do saltador define `vx` **uma vez** e depois o deixa
em paz. Desacelerando o **tempo da criatura**, tudo o que ela faz — andar, cair, esperar, mirar —
anda a 40%. A escala do tempo dos poderes do Dealer? Out!, numa criatura só.

---

## 3. Eventos são itens que não se apanham

```js
ITENS.estacao = { ..., interativo: true };
const AO_USAR = { estacao: item => { ... }, terminal: item => { ... } };
```

A estação e o terminal são itens: nascem no gerador (num fluxo próprio, `"eventos"`), moram no estado
da sala, são desenhados pela mesma função. A diferença é uma propriedade: `interativo`. Tocar mostra
a dica; ↑ usa.

O terminal guarda a **história** na campanha (`registrosLidos`), salva na hora, como o Impulso: a
história avança entre as expedições, e a base mostra o que já foi lido — o *"investigar a história
da invasão"* do GDD.

---

## 4. A pausa é um estado

```js
function alternarPausa() {
    if (estado === "jogando") { estado = "pausado"; ... }
    else if (estado === "pausado") { estado = "jogando"; ... }
}
```

O loop só atualiza quando o estado é `jogando`. Pausar é trocar o estado — e **todos** os relógios
param de graça, porque todos são contados no loop: o do coiote, o da recarga, o da evolução, o da
Matriarca, o das poças. O teste pausou e rodou 30 quadros: o relógio do jogo andou zero. Trocar de
janela pausa sozinho.

### Um relógio que não volta

```js
const tempo = Math.max(0, Math.min(segundosDesdeOUltimoQuadro, 0.05));
```

O teto de 0,05 s vem do Pong. O piso de zero é novo: um teste que misturou dois relógios produziu um
intervalo **negativo**, o relógio do ecossistema andou para trás e o nível deixou de existir. Um
navegador não faz isso — mas uma linha a mais faz o jogo não depender disso.

---

## 5. Som em tabela, e um batimento

```js
batida: { frequencia: 70, frequenciaFinal: 40, duracao: 0.09, volume: 0.07, tipo: "sine" },
item:   { notas: [660, 880], intervalo: 0.06 },
```

Cada som é uma linha: um tom com envelope, ou um arpejo. E o GDD pede *"sons distintos para
identificar inimigos próximos, ataques perigosos, portas secretas e eventos especiais"*:

| Pedido | Som |
|---|---|
| inimigos próximos | o **batimento**: entre 1,1 s e 0,35 s por batida, conforme a criatura caçando mais próxima |
| ataques perigosos | um aviso agudo em cada telegrafar (agachar, mirar, avisos da Matriarca) |
| portas secretas | um zumbido grave ao entrar numa sala com membrana inteira |
| eventos | arpejos para itens, módulos, cura, terminal, extração |

Um bug pego nos testes: a segunda batida chamava o oscilador direto, pulando a pergunta "o som está
ligado?". Tocaria com o som desligado — e quebraria num navegador sem áudio. Agora **todo** som passa
por `tocarSom`: o lugar único, de novo.

---

## 6. Acessibilidade é configuração

```js
opcoes = { som, efeitosReduzidos, vibracao, numerosDeDano, teclas: { pular: ["m"] } };
```

Cada pedido da seção 11 do GDD é um campo e um controle na base. Três escolhas que valem notar:

- **As opções não moram na campanha.** São preferências de quem joga, não progresso. Apagar a
  campanha não pode desfazer o remapeamento de quem só consegue jogar com outras teclas.
- **Remapear é trocar uma lista em `CONTROLES`** — a tabela que o passo 2 criou para isto. Nenhuma
  linha da física mudou. Uma tecla nova sai de qualquer outra ação que a usava: duas ações na mesma
  tecla seriam um bug inexplicável.
- **Efeitos reduzidos começam ligados** para quem pediu menos movimento ao sistema
  (`prefers-reduced-motion`): o tremor de tela, que causa enjoo em muita gente, nunca acontece.

### O toque é a mesma entrada

```html
<button data-acao="pular">Pulo</button>
```

Cada botão diz a sua ação. Tocar liga o interruptor dela (`toquesPressionados`) e faz o pedido pelo
mesmo caminho do teclado (`pedirAcao`). `acao("pular")` pergunta às duas fontes. No celular de
390×750 do teste, a tela, o painel e os botões couberam sem rolar.

---

## Verificado

Além de tudo o que os nove passos já verificaram:

- todos os testes do passo 9 passaram no final dividido em arquivos, antes de qualquer novidade;
- pausa: o relógio do jogo não andou em 30 quadros pausados; trocar de janela pausou;
- arsenal: liberar a metralhadora custou 30 amostras, e escolhê-la trocou a arma mais antiga das
  duas levadas;
- cada modificação, isolada: o ricochete quicou no teto; a munição perfurante feriu duas criaturas
  em fila; o congelamento fez o relógio de um saltador andar 0,04 s em 0,1 s; o sifão devolveu 4 de
  vida; a fragmentação tirou 4 de uma vizinha;
- 1.500 mundos: 1,09 módulo por mundo, nas proporções 60% / 30% / 10%;
- a estação curou 10 → 100 e ficou apagada; o terminal mostrou o primeiro registro e o salvou;
- remapear o pulo para M: o Espaço deixou de pular, o M passou a pular, e "Restaurar teclas" voltou
  ao padrão;
- com efeitos reduzidos, pedir um tremor não tremeu;
- o botão de toque "Pulo" fez o soldado pular e soltou ao levantar o dedo;
- um robô jogou 9.000 quadros ao acaso, em várias expedições: nenhum erro, nunca dentro de uma
  parede.

---

## Exercícios

### Ajustar

1. Crie uma quarta raridade, **lendária**, com peso 2 e um módulo só. Quantos arquivos você mudou?
2. Mude a ordem dos scripts no `index.html`: ponha `estado.js` antes de `dados/aparencia.js`. Leia o
   erro. Por que ele acontece **ao carregar**, e não durante o jogo?
3. Deixe o batimento audível a 200 px. O jogo fica mais tenso — ou só mais barulhento?
4. Escreva um módulo de sala novo para a floresta, só com `aberturas: "NS"`. O gerador passa a usá-lo?
   Ele é necessário?

### Construir

5. **Salto duplo** (GDD, seção 6): uma habilidade comprada na base. Um campo, um contador de saltos
   no ar — e uma fechadura nova: plataformas altas demais para um salto só, numa sala secreta.
6. **Lâmina energética**: uma arma sem projétil — um retângulo de dano na frente do soldado por
   0,1 s. O que em `disparar` deixa de servir?
7. **Minas Infectadas**: uma terceira região, nas linhas de baixo da grade, com paleta e pesos
   próprios. O que muda no gerador? E no validador?
8. **Comerciante clandestino** (GDD, seção 8): um evento que troca amostras carregadas por um módulo
   à escolha.
9. **A escolha**: um evento com duas opções — salvar os suprimentos (cápsulas na sala) ou destruir a
   fonte de contaminação (o ecossistema da região volta a "calmo"). Uma consequência mecânica de
   cada lado.
10. **Caçador camuflado**: uma criatura invisível até ficar a 40 px — e a habilidade **Visão
    Espectral**, que a revela de longe.
11. **Predador que troca de sala** (GDD, seção 5): quando o soldado sai, ele o segue pela porta 3 s
    depois. Onde ele mora enquanto está "entre" salas?
12. **Placar de sementes**: a base guarda o tempo da melhor expedição de cada semente, e um botão
    "Repetir" desce de novo no mesmo planeta.
13. **Mapa grande**: uma tecla que mostra o minimapa em tela cheia, com o nome de cada região.

### Difícil

14. **Validar por dentro**: leve para o jogo o teste de alcance com a física real (a busca em largura
    sobre posições de pé que verificou os módulos) e rode-o em `conferirModulos`. Quanto tempo ele
    leva? Vale a pena a cada carregamento?
15. **Segunda fechadura**: o Salto Duplo como chave **obrigatória** para a floresta, e o Impulso só
    para os segredos. O validador precisa de uma busca com **conjuntos** de habilidades — escreva-a.
16. **Gerador por gramática**: em vez de crescer manchas, escreva a missão como uma sequência
    ("pouso → corredor → chave → portão → arena") e encaixe salas nela. Compare as taxas de rejeição.
17. **Robô jogador**: um soldado automático que atravessa uma semente inteira — vai até o Impulso,
    rompe o portão, derrota a Matriarca. Use a rota do mapa do gerador e o teste de alcance.
18. **Gravar uma partida**: guarde só a semente e as teclas de cada quadro. Reproduza a partida
    inteira. O que, no código, ainda **não** é determinístico? (Dica: procure `Math.random`.)
19. **Migrar a campanha**: suba a versão para 2, mude o formato de `melhorias` e escreva
    `migrarDaVersao1`. Teste com uma campanha da versão 1 gravada de verdade.
20. **O Coração da Colmeia**: o chefe final, no núcleo do planeta, numa região nova abaixo da
    floresta — liberada só depois de cinco missões cumpridas.

---

## O que você levou daqui

Física de plataforma com colisão por eixo, perdões invisíveis, mira como vetor, armas como fichas,
máquinas de estados em cada criatura, comportamento emergente, parábolas calculadas, sorte com
semente, fluxos independentes, geração em camadas, módulos feitos à mão, compatibilidade de
aberturas, validação por busca em largura, gerar simples e conferir depois, chaves e fechaduras, um
chefe com fases e ponto fraco, evolução por regras visíveis, duas memórias com tempos de vida
diferentes, ler com desconfiança, dados separados de sistemas, modificações como funções,
acessibilidade como configuração.

E, do curso inteiro: **separe o que a coisa é de como ela aparece; escreva os dados como dados; um
lugar só para o que precisa acontecer sempre; teste antes de mover; e mostre o invisível quando não
entender o que o programa está fazendo.**

---

**Antes:** [`../09-base`](../09-base/) · **Índice:** [`../README.md`](../README.md)
