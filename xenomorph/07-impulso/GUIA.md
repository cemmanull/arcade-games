# Xenomorph — Passo 7: O impulso

**Mudou:** os quatro arquivos
**Rode:** abra o `index.html` com `?semente=R9` no fim do endereço, e aperte **H** duas vezes.

---

## O que você vê

A passagem do complexo para a floresta está tapada por uma **membrana** que pulsa. Esquive contra
ela e nada acontece — só um aviso: *"A membrana resiste. Algo mais forte talvez a rompa."* Em
algum canto do complexo, longe do pouso, há uma cápsula dourada: o **Impulso Cinético**. Com ele, a
esquiva rasga a membrana, e a floresta se abre. No fundo dela, os **dados da colônia**: a missão.

No caminho, o minimapa marca em vermelho as portas ainda tapadas. Algumas levam a **salas
secretas** com um tanque de vida — vistas logo no começo, abertas só na volta.

Com **H** uma vez: as caixas, e agora também os **pontos de surgimento** da sala (X amarelo onde
nasceu uma criatura, cinza onde o sorteio deixou vazio) e as zonas seguras em volta das portas.
Com **H** de novo: o **mapa do gerador** — o planeta inteiro, inclusive o que você ainda não viu.

---

## 1. Uma habilidade é um campo e um "se"

```js
impulso: false,   // no soldado
...
if (!soldado.impulso) { ...a membrana resiste...; return; }
trocarBloco(coluna, linha, ".");
```

Toda a progressão de um metroidvania cabe nisso: um booleano, e uma pergunta feita no lugar certo.
A esquiva já existia (passo 3); agora, durante ela, a coluna logo à frente do soldado é examinada,
e com a habilidade toda membrana ali vira ar.

Romper é **trocar um caractere** na matriz da sala. E como a matriz mora no estado da sala (passo 6),
a membrana continua rompida quando o soldado volta — e o minimapa, que pergunta à matriz, para de
pintá-la de vermelho.

O GDD descreve a habilidade assim (seção 6): *"Impulso Cinético: permite atravessar obstáculos
específicos e executar uma investida horizontal."* E pede (seção 2) que *"algumas áreas devem
exigir habilidades específicas"* — e que, com a habilidade, o jogador possa *"retornar a regiões
anteriores para encontrar passagens secretas"*. As salas secretas existem para isso.

---

## 2. Chaves e fechaduras no gerador

```js
portao.membranas.push("L");                          // a fechadura obrigatória
vizinha(mundo, sala, porta).membranas.push(...);     // as fechaduras dos segredos
colocarItem(escolher(sortear, metadeMaisDistante), "impulso", sortear);   // a chave
colocarItem(maisDistante, "dados", sortear);         // o objetivo
```

Uma quarta camada de geração, com o seu próprio fluxo (`"progressao"`):

| Peça | Onde |
|---|---|
| o **portão** | a passagem do complexo para a floresta — sempre |
| os **segredos** | salas do complexo com uma porta só, de lado — metade delas |
| a **chave** (Impulso) | sorteada entre a metade das salas do complexo **mais longe** do pouso |
| o **objetivo** (dados) | a sala da floresta mais longe do pouso |

A membrana fica sempre do lado de quem **chega**: na sala de onde se vê a porta tapada.

---

## 3. Gerar simples, conferir depois

Repare no sorteio da chave: ele **não** olha para as membranas. Às vezes a chave cai justamente
numa sala secreta — atrás da fechadura que só ela abre. Um mundo impossível.

O gerador não tenta evitar isso. Quem percebe é o **validador**:

```js
const semImpulso = salasAlcancaveis(mundo, pouso, false);
const comImpulso = salasAlcancaveis(mundo, pouso, true);

if (!semImpulso.has(salaDaChave)) problemas.push("... seria exigido antes de ser obtido.");
```

A ferramenta é a busca em largura do Pac-Man, sobre salas, feita **duas vezes**: fingindo que o
soldado não tem o Impulso, e fingindo que tem. A diferença entre as duas respostas é tudo o que a
habilidade abre. E as perguntas são a lista do GDD (seção 13), quase palavra por palavra:

| O GDD pede para validar… | O validador pergunta |
|---|---|
| se as habilidades podem ser obtidas antes de serem exigidas | a chave está em `semImpulso`? |
| se existe uma rota de progressão válida | o objetivo está em `comImpulso` e **não** em `semImpulso`? |
| se não há portas obrigatórias bloqueadas para sempre | toda sala está em `comImpulso`? |
| se os pontos de surgimento são seguros | nenhuma criatura no pouso, nenhuma colada numa porta? |

Achou problema? O mundo é **descartado**, e outro é gerado com a semente derivada `R9#1`, depois
`R9#2`… A sequência é tão repetível quanto a semente: quem digitar `R9` recebe sempre o mesmo mundo
aceito — e o mesmo histórico de rejeitados.

> Tentar acertar de primeira exigiria que o sorteio da chave soubesse das membranas, que as
> membranas soubessem da chave, e que os dois soubessem de qualquer regra futura. Gerar simples e
> conferir depois separa as duas tarefas: o gerador pode errar, e o validador é uma lista de
> perguntas que cresce sem mexer no gerador.

### Medido

Em 3.000 sementes, 7% das tentativas foram rejeitadas — **todas** pelo motivo previsto (a chave
atrás de uma membrana) — e nenhuma semente precisou de mais que 5 tentativas.

### O que o validador não confere

Se cada módulo, **por dentro**, deixa ir de uma porta à outra. Essa é a responsabilidade de quem
desenha módulos, e foi conferida uma vez, com a física do jogo, antes de eles entrarem no gerador
(passo 6). Validar isso a cada expedição custaria caro e não pegaria nada novo: os módulos não
mudam.

---

## 4. Itens como uma tabela de funções

```js
const AO_PEGAR = {
    capsula: () => { if (soldado.vida === soldado.vidaMaxima) return false; ... },
    tanque:  () => { soldado.vidaMaxima += VIDA_DO_TANQUE; ... },
    impulso: () => { soldado.impulso = true; ... },
    dados:   () => { concluirExpedicao(); ... }
};
```

Os efeitos do Dealer? Out!, de novo. A aparência de cada item está em `ITENS` (dados); o que ele faz,
em `AO_PEGAR` (código). Devolver `false` quer dizer "não peguei": a cápsula de vida fica no chão
quando a vida está cheia — ela vai fazer falta depois.

---

## 5. Mostrar o que o gerador pensou

O GDD pede, na seção 12, *"ferramentas de depuração para visualizar conexões entre salas, pontos de
surgimento, rotas obrigatórias e áreas inacessíveis"*. A segunda visão do H é exatamente isso:

| No mapa do gerador | Significa |
|---|---|
| linha branca | uma porta |
| linha vermelha grossa | uma porta com membrana |
| linha amarela | a rota obrigatória: pouso → Impulso → dados |
| sala listrada | só alcançável com o Impulso |
| número | a distância até o pouso, em portas |
| P, I, D, T | pouso, Impulso, dados, tanque |
| embaixo | a semente aceita e o motivo da primeira rejeitada |

A rota amarela é calculada com a **mesma** busca do validador, com uma lembrança a mais: de onde
cada sala foi alcançada. Do fim, volta-se até o começo.

É uma ferramenta de quem **faz** o jogo, não de quem joga — por isso revela tudo. Quando o
validador rejeitar uma semente e você não entender por quê, é aqui que se olha.

---

## Experimente

1. Ponha `chanceDeSegredo: 1`. Quantas tentativas as sementes passam a precisar? E com 0?
2. Faça o sorteio da chave **evitar** salas secretas. O validador ainda rejeita alguma coisa? Ele
   ainda é útil?
3. Crie uma segunda fechadura: uma membrana **dentro da floresta**, com uma segunda chave (o Salto
   Duplo do GDD?) do lado de cá. O que o validador precisa perguntar a mais?
4. Faça os tiros da espingarda também romperem membranas. O jogo continua um metroidvania?
5. Escreva um validador mais exigente: a rota obrigatória precisa passar por **pelo menos 6 salas**
   (uma expedição curta demais é chata). Quantas sementes passam a ser rejeitadas?
6. No mapa do gerador, pinte de outra cor as salas que você **já visitou**.

---

**Anterior:** `06-semente` · **Próximo:** `08-matriarca` — algo guardava os dados.
