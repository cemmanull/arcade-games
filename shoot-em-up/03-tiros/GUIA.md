# Shoot 'em up — Passo 3: Os tiros

**Mudou:** `script.js` e a linha de ajuda
**Rode:** abra o `index.html`. Segure Espaço.

---

## O que você vê

Uma fileira de tiros subindo, sempre com o mesmo espaço entre eles. Martele a tecla o mais
rápido que puder: a cadência não muda. Um brilho pisca na ponta da nave a cada tiro.

---

## Tiros moram numa lista

```js
let tiros = [];

function criarTiro() {
    tiros.push({ x: nave.x, y: nave.y - SPRITE_DA_NAVE.length / 2 });
}

function removerTirosQueSairam() {
    tiros = tiros.filter(tiro => tiro.y > -4);
}
```

Até aqui cada coisa do jogo tinha o seu nome: `nave`, `bola`, `raquete`. Não dá para dar um
nome a cada tiro: quantos existem **agora** depende do instante. Quando o número de objetos
muda, eles moram numa **lista**, e o resto do código fala com a lista, nunca com um tiro
específico:

```js
tiros.forEach(tiro => { tiro.y -= VELOCIDADE_DO_TIRO * tempo; });
```

Três tiros ou trezentos, a linha é a mesma. Nascer é `push`; morrer é o `filter`, que monta
uma lista **nova** só com quem passou no teste (`criarTiro` e `removerTirosQueSairam`, no
`script.js`). Sem a limpeza, nada muda na tela, mas a lista cresceria oito itens por segundo,
para sempre: um **vazamento** silencioso, que só aparece na memória e na lentidão de quem joga
por uma hora. (O Tetris, no passo 6, já usou `filter` para limpar linhas.)

Toda criação passa por uma função só (`criarTiro`): todo tiro nasce com todos os campos, e é
impossível esquecer um.

O tiro nasce na **ponta** da nave (o centro menos meia altura). Nascer no centro faria ele
aparecer "dentro" dela por um quadro.

---

## A cadência: um acumulador que não pode acumular crédito

```js
function atirar(tempo) {
    recarga -= tempo;

    if (!estaPressionada(" ")) {
        recarga = Math.max(recarga, 0);   // a trava
        return;
    }

    while (recarga <= 0) {
        criarTiro();
        recarga += INTERVALO_ENTRE_TIROS;
    }
}
```

É o acumulador de tempo do Tetris (passo 3, a queda): desconta o tempo, dispara ao chegar em
zero, recarrega com `+=` para a sobra não se perder. Um jogo, um relógio: nada de
`setInterval` para a arma, que ignoraria a pausa. Mas há uma linha a mais — a trava.

### O bug sem a trava

A queda do Tetris **nunca parava**. A arma para o tempo todo: você solta o Espaço para
desviar, pensa, volta a atirar.

Sem a trava, enquanto você não atira a recarga continua descendo: −1, −2, −3… Ao apertar
Espaço depois de três segundos parado, o `while` paga **a dívida inteira de uma vez**: 24
tiros num único quadro, todos empilhados no mesmo pixel. Na tela parece um tiro só. No
passo 5, quando os tiros causarem dano, vai parecer um tiro que mata qualquer coisa.

| | Queda do Tetris | Arma |
|---|---|---|
| Para de vez em quando? | nunca | o tempo todo |
| O tempo parado conta? | sim, tudo conta | não: a recarga para em zero |
| Sem trava | — | rajada de dezenas de tiros num quadro |

> **Um acumulador que pode ficar parado não pode acumular crédito.**

### Por que `while` e não `if`?

Com o intervalo de 0,125 s e quadros de 0,016 s, o `if` daria no mesmo. Mas com uma arma
mais rápida — 0,01 s, por exemplo — mais de um tiro precisa sair por quadro, e só o `while`
entrega a cadência certa.

---

## O clarão

```js
const DURACAO_DO_CLARAO = 0.04;
```

Um "+" branco na ponta da nave por quatro centésimos de segundo. Quase invisível — e sem ele
o tiro parece brotar do nada. Detalhes assim, que ninguém percebe quando estão lá e todo
mundo sente quando faltam, são o que faz uma arma "pesar" na mão.

### Temporizador: um número que desce

```js
tempoDoClarao = DURACAO_DO_CLARAO;                          // ao atirar
tempoDoClarao = Math.max(0, tempoDoClarao - tempo);         // todo quadro
if (tempoDoClarao <= 0) return;                             // no desenho: acabou, não desenha
```

Um efeito que dura um tempo é só um número: acendeu, vira a duração; a cada quadro desce
`tempo`; enquanto for maior que zero, o efeito existe. Por que não `setTimeout`? Porque ele
tem o próprio relógio: não obedece a pausa, e dois relógios no mesmo jogo acabam discordando.
O `Math.max(0, ...)` impede que o número fique negativo e acumule lixo. Este mesmo molde
volta em todo o módulo: o golpe na nave (passo 5), a invencibilidade (passo 6), o aviso de
fase (passo 7).

---

## Experimente

1. Comente a linha `recarga = Math.max(recarga, 0)`. Fique parado três segundos, aperte
   Espaço uma vez e confira no console: `tiros.length`.
2. Mude `INTERVALO_ENTRE_TIROS` para `0.01`. Depois troque o `while` por `if`. Conte quantos
   tiros saem por segundo em cada caso.
3. Dois canos: cada tiro sai em dobro, das pontas das asas (`nave.x - 3` e `nave.x + 3`).
4. Faça os tiros herdarem um pouco da velocidade lateral da nave. Para isso cada tiro vai
   precisar guardar a sua própria velocidade.
5. Mostre embaixo da tela quantos tiros estão vivos, como um contador de depuração. Qual é
   o máximo?
6. Faça o Espaço precisar ser apertado de novo para cada tiro (sem segurar). Qual dos dois
   jeitos é mais divertido? E qual cansa o dedo?

---

**Anterior:** [`02-nave`](../02-nave/) · **Próximo:** [`04-inimigos`](../04-inimigos/) — alvos, cada um com o seu jeito de
voar.
