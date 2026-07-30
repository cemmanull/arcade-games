# Passo 8 — Colisão

**Mudou:** `script.js`
**Rode:** abra o `index.html`, com o Console (F12) aberto.

---

## O que você vê

O jogo congela quando você bate na parede ou no próprio corpo, e o console anuncia o fim.

O jogo está **completo como regra**: tem objetivo, tem crescimento, tem derrota. O que
falta daqui em diante é tudo interface — dizer ao jogador o que está acontecendo, e
deixá-lo jogar de novo.

---

## Conceitos deste passo

### Guard clause

```js
if (colidiu(cabeca)) {
    terminarJogo();
    return;
}

// ... o caminho normal, sem indentação extra
```

Trate o caso ruim **primeiro** e saia da função com `return`.

A alternativa seria embrulhar as trinta linhas seguintes em um
`if (!colidiu(cabeca)) { ... }`, empurrando tudo para a direita e obrigando o leitor a
segurar uma condição na cabeça até o fim.

Com a guarda, o caminho normal fica reto e o excepcional fica visível lá em cima. É um
dos hábitos que mais melhoram a legibilidade de qualquer código — não só de jogos.

### Uma função que só responde

```js
function colidiu(cabeca) { ... return true/false; }
```

Repare no que ela **não** faz: não termina o jogo, não desenha, não zera nada. Ela olha e
responde. Quem decide o que fazer com a resposta é quem perguntou.

Isso é separar a **decisão** da **ação**. O ganho é concreto: você pode chamar `colidiu`
para testar uma jogada hipotética — "e se eu fosse para cima?" — sem risco de encerrar a
partida sem querer. É exatamente isso que um oponente controlado por código precisa
fazer para decidir seu movimento.

> Funções com nome de pergunta (`colidiu`, `estaVazio`, `podeAndar`) devem responder e
> ir embora.

### Off-by-one — o erro mais comum que existe

```js
cabeca.coluna >= COLUNAS   // certo
cabeca.coluna > COLUNAS    // errado
```

Com 20 colunas, as válidas vão de **0 a 19**. A coluna 20 já está fora. Com `>`, a cobra
andaria uma casa **para dentro da parede** antes de morrer.

O erro tem nome próprio em inglês — *off-by-one* — de tão frequente. Sempre que houver um
limite, pare e pergunte: **o último valor entra ou não entra?**

### `slice(0, -1)` — e uma regra sutil de jogo

```js
cobra.slice(0, -1).some(...)
```

`slice(0, -1)` devolve uma cópia da lista **sem o último item**. O índice negativo conta
de trás para frente.

Por que ignorar a cauda? Porque ela vai sair do lugar **neste mesmo passo**: a cabeça
entra na casa que a cauda acabou de desocupar. Sem esse detalhe, a cobra morreria ao
encostar na própria ponta em situações que o jogador jamais entenderia como erro dele.

Detalhes assim são o que separa "o código roda" de "o jogo é justo". Nenhum jogador vai
elogiar essa linha — mas todos sentiriam a falta dela.

### `clearInterval` — desligar o que se ligou

```js
let cronometroDoJogo;
cronometroDoJogo = setInterval(darUmPasso, 150);  // liga e guarda o número
clearInterval(cronometroDoJogo);                  // desliga
```

`setInterval` devolve um número de identificação. **É só com ele que dá para desligar.**
Se você não guardar, o cronômetro roda para sempre e não há como pará-lo.

Sem o `clearInterval`, `darUmPasso` continuaria rodando em segundo plano com o jogo
"acabado", consumindo processador e produzindo bugs fantasma — do tipo que aparece só
depois de dez minutos e ninguém consegue reproduzir.

> **Todo recurso que se liga precisa de um lugar onde se desliga.** Cronômetros,
> ouvintes de evento, conexões, arquivos abertos. Vale para a linguagem que for.

---

## Experimente

1. Troque `>= COLUNAS` por `> COLUNAS` e bata na parede: a cobra entra uma casa dentro
   dela antes de morrer. Off-by-one visível a olho nu.
2. Tire o `.slice(0, -1)` (deixe só `cobra.some(...)`) e ande em linha reta. A cobra morre
   sozinha, sem que você tenha feito nada de errado.
3. Comente o `clearInterval` dentro de `terminarJogo`. O console vira uma cachoeira de
   "Fim de jogo" — o loop nunca parou.
4. **Faça a cobra atravessar as paredes** e sair do outro lado em vez de morrer. Dica: o
   operador `%` (resto da divisão) resolve em uma linha por eixo, mas cuidado com números
   negativos — teste indo para a esquerda a partir da coluna 0.
5. Adicione obstáculos: uma lista de 5 posições fixas sorteadas no início, desenhadas em
   outra cor, que também matam. Você vai reusar a estrutura de `colidiu` quase intacta —
   sinal de que ela estava bem escrita.
6. Faça a cobra morrer só depois de 3 batidas, com um contador de vidas.

---

**Anterior:** `07-maca` · **Próximo:** `09-interface` — o jogo passa a conversar com o
jogador.
