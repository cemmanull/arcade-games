# Xenomorph — Passo 8: A Matriarca

**Mudou:** os quatro arquivos (a barra do chefe e o ecossistema no HTML)
**Rode:** abra o `index.html`, pegue o Impulso, atravesse a floresta — e fique tempo demais num lugar
só.

---

## O que você vê

No fundo da floresta, uma arena: o **covil**. Lá dorme a **Matriarca**. Chegue perto e a porta
atrás de você vira uma boca cheia de dentes, a barra de vida dela aparece, e a luta começa.

Ela anda na sua direção e, a cada poucos segundos, **avisa** e ataca:

| Aviso | Ataque |
|---|---|
| o saco de ovos acende | **ovos**: o saco se abre e solta rastejadores (no máximo 4 vivos) |
| o saco de ovos acende | **cuspe**: três parábolas de ácido, em leque |
| os olhos piscam | **investida**: corre até bater na parede — e fica tonta, com o saco aberto |
| marcas vermelhas no teto | **chuva**: gotas de ácido caem onde estavam as marcas |

Com o saco **fechado**, os tiros soltam faíscas cinzas e mal arranham. Com ele **aberto**, ferem
de verdade. Abaixo de 60% de vida ela se enfurece; abaixo de 25%, se desespera. Ao cair, larga os
**dados da colônia**, e o covil se abre.

E o planeta reage. No painel, o **ecossistema** de cada região começa *calmo* e, com o tempo que
você passa nela, fica *inquieto*, *agitado*, *furioso*. Criaturas que nascem depois disso têm
carapaça **dourada** (mais vida), a borda **da cor da sua arma favorita** (resistem a ela), e, ao
voltar a uma sala, encontram-se **reforços**. Os **ninhos** soltam rastejadores até serem
destruídos.

---

## 1. Um chefe é uma máquina de estados maior

```js
const ESTADOS_DA_MATRIARCA = {
    dormindo, despertando, andando, aviso,
    ovos, cuspe, investida, atordoada, chuva,
    morrendo
};
```

O chefe do Shoot 'em up tinha três estados. A Matriarca tem dez — e cada um é uma função pequena.
O que torna a luta rica não é nenhuma função complicada: é a **ordem** em que elas se encadeiam.

```
dormindo → despertando → andando → aviso → (ataque) → andando → aviso → ...
                                               ↘ investida → atordoada ↗
```

Cada ataque é um estado. O `aviso` sabe qual ataque vem depois dele (`proximoAtaque`) e o anuncia
do seu jeito.

### As fases são uma tabela

```js
fases: [
    { ateVida: 0.6,  rapidez: 20, pausa: 1.6, ataques: ["ovos", "cuspe", "cuspe"] },
    { ateVida: 0.25, rapidez: 32, pausa: 1.2, ataques: ["investida", "ovos", "cuspe", "investida"] },
    { ateVida: 0,    rapidez: 44, pausa: 0.8, ataques: ["investida", "chuva", "ovos", "investida", "chuva"] }
]
```

O esqueleto do chefe do Shoot 'em up: a fase é **calculada** a partir da vida (`findIndex`), e os
ataques saem da lista da fase em **ciclo** (`%`). Trocar de fase limpa o ácido da tela — um respiro.
O GDD pede *"múltiplas fases, padrões de ataque reconhecíveis, pontos fracos e mudanças de
comportamento"* (seção 8): as quatro coisas estão nesta tabela e no próximo item.

### Ela não mora na lista

A Matriarca não é uma criatura de `criaturas`: é uma só, com regras que nenhuma outra tem. Mora no
**estado do covil** — por isso continua lá, dormindo, ferida ou morta, se o soldado sair e voltar.

---

## 2. Um ponto fraco é uma consequência do estado

```js
function mudarEstadoDaMatriarca(novoEstado) {
    ...
    matriarca.exposta = novoEstado === "ovos" || novoEstado === "atordoada";
}

const fator = matriarca.exposta ? 1 : MATRIARCA.armadura;   // 0,35
```

Ninguém "liga a vulnerabilidade" e depois esquece de desligar. O saco de ovos está aberto **porque**
ela está pondo ovos ou tonta — e em nenhum outro momento. Um campo derivado, recalculado a cada
troca de estado, no único lugar por onde toda troca passa.

O teste mediu: um tiro de 10 tira 3,5 com o saco fechado e 10 com ele aberto. Quem espera a hora
certa vence mais rápido do que quem atira sem parar — e o jogo **ensina** isso com uma faísca cinza.

### A investida é uma armadilha para ela mesma

Ela corre até `bateuNaParede` — o mesmo campo que faz os rastejadores darem meia-volta — e fica
tonta. O aviso (os olhos piscando) dá tempo de pular por cima; quem pulou ganha 1,3 s de saco
aberto.

---

## 3. A arena se fecha com uma letra

```js
trocarBloco(0, linha, fechar ? "%" : ".");
```

O truque da membrana, ao contrário: em vez de abrir uma porta trocando um caractere, fecha-se. O
selo `%` é sólido e tem outra cara (dentes, não veias). Quando ela morre, os selos voltam a ser ar.

O covil é escolhido pelo **gerador**: a sala sem saída da floresta mais distante do pouso, com a
porta de lado. Quando a floresta cresce sem nenhuma sala assim, o validador rejeita o mundo — e
quando o covil fica perto demais da entrada da floresta, também. Em 3.000 sementes, uma semente
precisou, em média, de 1,6 tentativa; nenhuma, de mais que 8.

---

## 4. Dificuldade que sobe por regras visíveis

```js
const EVOLUCAO = [
    { aPartirDe: 0,   nome: "calmo",    vida: 1,   reforcos: 0, resistencia: false },
    { aPartirDe: 75,  nome: "inquieto", vida: 1.3, reforcos: 0, resistencia: false },
    { aPartirDe: 150, nome: "agitado",  vida: 1.3, reforcos: 1, resistencia: true },
    { aPartirDe: 240, nome: "furioso",  vida: 1.6, reforcos: 2, resistencia: true }
];
```

O GDD quer um ecossistema que evolui (seção 5) — e, na mesma seção, avisa: a evolução deve seguir
*"regras definidas e controladas, evitando que o jogo aumente a dificuldade de maneira injusta ou
imprevisível"*. As duas coisas cabem numa tabela:

- **definida**: cada nível diz exatamente o que muda;
- **controlada**: um relógio por região, e o nível é **calculado** dele, nunca guardado;
- **previsível**: o painel mostra o nível, com uma cor que esquenta, e um aviso anuncia cada subida;
- **justa**: com menos de 30% de vida, o relógio anda pela metade — a *"dificuldade adaptativa
  baseada nos recursos disponíveis"* numa linha.

### Um lugar só para a evolução

```js
function evoluir(criatura, regiao) { ... }
```

Toda criatura que nasce passa por aqui: as do plano do gerador, as dos ninhos, os filhotes da
Matriarca, os reforços. Se cada fábrica aplicasse a evolução por conta própria, uma delas
esqueceria. É o princípio de `ferirSoldado` (passo 5): **o que precisa acontecer sempre, acontece
num lugar só**.

### A resistência à arma favorita

Todo dano é anotado por arma e por região. A partir do nível *agitado*, criaturas novas resistem à
arma que mais feriu naquela região — e mostram isso: a borda delas ganha **a cor da arma** (ciano
para o rifle, âmbar para a espingarda). O jogador lê a regra no desenho, e troca de arma. *"Criaturas
podem desenvolver resistência a armas utilizadas repetidamente"*, com aviso.

---

## 5. O ninho é uma criatura que não anda

```js
ninho: { pulsando: ninhoPulsa }
```

Uma ficha nova, um estado, uma função. Ele usa o motor de estados do passo 5 sem mudar uma linha:
a cada 5 s, se tiver menos de 3 filhotes vivos, solta um rastejador que já nasce perseguindo. Cada
filhote guarda a mãe (`mae`), e é assim que o ninho conta os seus. O mesmo campo serve à Matriarca.

---

## Verificado

- Um robô imortal, mirando sozinho e pulando quando ela chegava perto, lutou contra a Matriarca:
  passou pelos dez estados e pelas três fases e a derrubou em 65 s. Os selos abriram, a barra sumiu,
  os dados caíram no chão, e apanhá-los terminou a expedição.
- Nunca mais que 4 filhotes vivos dela, nem mais que 3 de um ninho.
- No nível *agitado*, voltar a uma sala trouxe um reforço com vida 5 (4 × 1,3), carapaça dourada e
  resistente à espingarda — a arma que mais tinha ferido na região.
- Com 20% de vida, um segundo de jogo avançou o relógio do ecossistema em meio segundo.

---

## Experimente

1. Ponha `armadura: 1`. A luta fica mais curta — e mais chata?
2. Tire o aviso da investida (`aviso: 0`). Quantas vezes você é atropelado?
3. Acrescente uma quarta fase, abaixo de 10%, com um ataque novo: a **onda de choque** — ao pousar
   de um salto, ela solta duas gotas rasteiras para os lados.
4. Faça a Matriarca **lembrar** das expedições: a cada vitória sobre ela, a lista de ataques da
   primeira fase ganha uma investida (o GDD sugere: *"chefes podem adquirir variações de ataques
   em expedições futuras"*). O que precisa ser guardado entre expedições? (É o próximo passo.)
5. Mude a tabela `EVOLUCAO` para que o nível *furioso* chegue aos 60 s. O jogo continua justo? E se
   a regra de piedade sumir?
6. Faça os reforços nascerem **fora da tela** e entrarem pela porta, em vez de aparecerem nos pontos
   marcados.

---

**Anterior:** `07-impulso` · **Próximo:** `09-base` — morrer deixa de ser o fim.
