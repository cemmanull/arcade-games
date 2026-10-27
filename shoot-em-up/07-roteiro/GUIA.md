# Shoot 'em up — Passo 7: O roteiro

**Mudou:** os três arquivos (um aviso por cima do canvas, e a mensagem de vitória)
**Rode:** abra o `index.html` e jogue duas vezes. Repare que as duas partidas são iguais.

---

## O que você vê

"Prepare-se". Dois drones, um de cada lado. Cinco em diagonal. Duas colunas de ondas. Três
mergulhadores em fila. "Blindado!" — e ele entra. A fase tem forma: começo, meio e uma última
onda. Sobreviva a tudo e aparece **Fase completa!**.

E a segunda partida é igual à primeira. De propósito.

---

## Sorteio contra coreografia

Até o passo 6, os inimigos eram sorteados. Funciona, e toda partida parece igual **justamente
porque** nenhuma tem forma: é sempre a mesma sopa.

Fase de jogo de nave é **coreografia**. Alguém decidiu que naquele segundo entram cinco drones
em diagonal, e que logo depois vem um respiro. Repetir a fase é aprender a fase — e melhorar
nela é a graça do gênero.

> **Aleatório é fácil de fazer e difícil de tornar interessante.** Desenhado à mão é o
> contrário.

---

## A fase é dados

```js
const ROTEIRO = [
    { tempo: 0.5, aviso: "Prepare-se" },
    { tempo: 2,   tipo: "drone", x: 30 },
    { tempo: 2,   tipo: "drone", x: 90 },
    { tempo: 4,   tipo: "drone", x: 20, quantidade: 5, espaco: 0.35, passoX: 20 },
    ...
];
```

Leia de cima para baixo e você **vê** a fase. Para mudá-la, ninguém precisa entender o resto
do código: é editar números. É o mesmo princípio do catálogo do Dealer? Out!, agora aplicado ao
**tempo**.

E eventos de tipos diferentes convivem na mesma linha do tempo: um aviso e um inimigo são
ambos "algo que acontece no segundo tal".

---

## 1. Escreva para quem escreve, converta para quem executa

```js
{ tempo: 4, tipo: "drone", x: 20, quantidade: 5, espaco: 0.35, passoX: 20 }
```

Para quem escreve a fase, "cinco drones, um a cada 0,35 s, andando 20 pixels" é uma linha. Para
quem executa, seria mais simples ter cinco eventos soltos. Os dois desejos são atendidos por
uma função que roda **uma vez**, antes de a fase começar:

```js
function expandirRoteiro(roteiro) {
    const lista = [];
    roteiro.forEach(item => {
        for (let i = 0; i < (item.quantidade || 1); i++) {
            lista.push({
                ...item,
                tempo: item.tempo + i * (item.espaco || 0),
                x: item.x + i * (item.passoX || 0)
            });
        }
    });
    return lista.sort((a, b) => a.tempo - b.tempo);
}
```

| Formato | Para quem | Como é |
|---|---|---|
| `ROTEIRO` | quem desenha a fase | atalhos, qualquer ordem, legível |
| `eventos` | o loop do jogo | um evento por coisa, em ordem de tempo |

> Converter dados de um formato bom para pessoas num formato bom para a máquina, **uma vez**,
> é uma das técnicas mais úteis da programação. Compiladores fazem isso com código inteiro.

### `{ ...item, tempo: ... }`

O espalhamento, agora em **objetos**: copia todos os campos de `item` e troca só os que vêm
depois. O tipo, o aviso, tudo vai junto; só `tempo` e `x` mudam.

### `sort` precisa saber comparar

```js
lista.sort((a, b) => a.tempo - b.tempo)
```

A função diz quem vem antes: negativo põe `a` antes, positivo põe `b` antes. Sem ela, o `sort`
compararia os objetos **como texto** — e todo objeto vira `"[object Object]"`.

Ordenar deixa quem escreve livre da ordem: a formação que começa em 4 s termina em 5,4 s, e se
mistura com o que vem depois. A máquina organiza.

---

## 2. O cursor: não procure o que você pode apontar

```js
while (proximoEvento < eventos.length && eventos[proximoEvento].tempo <= tempoDaFase) {
    executarEvento(eventos[proximoEvento]);
    proximoEvento += 1;
}
```

Um relógio (`tempoDaFase`) e um dedo apontando para o próximo evento (`proximoEvento`). Tudo
antes do dedo já aconteceu.

O laço **não** percorre o roteiro inteiro perguntando "já é a sua hora?". Como a lista está
ordenada, se o próximo ainda não chegou, **nenhum dos seguintes chegou**. Uma comparação por
quadro, com 20 ou com 2.000 eventos.

E é `while`, não `if`: os dois drones de 2 s nascem no mesmo quadro.

---

## 3. Quando a fase acaba

```js
const roteiroAcabou = proximoEvento >= eventos.length;
if (roteiroAcabou && inimigos.length === 0) { ... vitória ... }
```

As **duas** condições. Só com a primeira, a vitória chegaria com o último blindado ainda na tela,
atirando.

---

## Detalhes que valem notar

### Reiniciar é voltar o cursor

```js
tempoDaFase = 0;
proximoEvento = 0;
```

A lista `eventos` nunca muda: é só o dedo e o relógio que voltam ao começo. Por isso ela pode ser
`const`.

### O aviso é HTML

Texto por cima do canvas, como no Dealer? Out!, com `role="status"` para que um leitor de tela
anuncie "Blindado!" quando ele aparece. O CSS usa `pointer-events: none`: o aviso nunca bloqueia
um clique.

---

## Experimente

1. Escreva a sua própria fase. Comece com três eventos e vá aumentando. Teste a fase do jeito
   que um designer testa: jogando, mudando um número, jogando de novo.
2. Ponha um evento com `tempo: 1` **no fim** do `ROTEIRO`. Ele acontece no segundo 1? Por quê?
   Agora apague o `sort` e repita.
3. Crie um tipo de evento novo: `{ tempo: 20, cor: "#200010" }`, que muda a cor do fundo.
   Onde ele entra no código?
4. Faça uma formação em "V": dois itens começando no mesmo instante, um com `passoX` positivo e
   outro negativo.
5. Mostre uma barra de progresso da fase: `tempoDaFase` dividido pelo tempo do último evento.
6. Faça o roteiro **repetir** ao terminar, com os inimigos 20% mais rápidos. Onde guardar esse
   multiplicador?

---

**Anterior:** `06-contra-ataque` · **Próximo:** `08-chefe` — no fim da fase, alguém maior.
