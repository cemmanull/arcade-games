# Tetris — Passo 8: A velocidade

**Mudou:** `script.js` e uma caixa nova no painel (o nível)
**Rode:** abra o `index.html` e jogue até o nível 3 ou 4.

---

## O que você vê

A cada 10 linhas o nível sobe e as peças caem mais rápido. Um contorno mostra onde a peça
vai cair. Segurar ← ou → desliza a peça logo, sem aquele meio segundo de espera. E a peça,
ao tocar o chão, ainda deixa você empurrá-la para o lado por um instante.

Este passo é metade velocidade e metade **justiça**: um jogo rápido só é divertido se o
jogador sentir que errou por culpa própria.

---

## 1. A curva de dificuldade é uma tabela

```js
const INTERVALOS_DE_QUEDA = [
    1.0, 0.79, 0.62, 0.47, 0.36, 0.26, 0.19,
    0.14, 0.1, 0.07, 0.05, 0.035, 0.025, 0.017
];
```

Segundos por linha, um número por nível. Depois do último, o último vale para sempre.

Uma fórmula também serviria (`0.8 ** nivel`, por exemplo). A tabela tem uma vantagem: dá
para **afinar**. Achou o salto do nível 6 para o 7 alto demais? Mude um número. Numa
fórmula, mexer em um nível mexe em todos.

E os pontos usam o nível como multiplicador: quatro linhas no nível 8 valem 6.400. O
risco de jogar rápido é pago.

### Os pontos usam o nível de antes

```js
pontos += PONTOS_POR_LINHAS[quantas] * nivel;
linhasFeitas += quantas;
nivel = 1 + Math.floor(linhasFeitas / LINHAS_POR_NIVEL);
```

A ordem das três linhas é uma decisão: as linhas que fazem você passar de nível ainda são
pagas pelo nível em que você estava.

---

## 2. A peça fantasma

```js
function linhaDoFantasma() {
    let linha = pecaAtual.linha;
    while (cabe(pecaAtual.forma, pecaAtual.coluna, linha + 1)) {
        linha += 1;
    }
    return linha;
}
```

É a queda instantânea do passo 4, **sem mover nada**. Pela terceira vez, `cabe` só responde
— e por isso serve para prever.

No nível 10 a peça desce 14 linhas por segundo. Ninguém tem tempo de contar casas. O
fantasma não deixa o jogo mais fácil: deixa o erro **visível antes de acontecer**, e esse é
o tipo de ajuda que não tira o mérito de ninguém.

### `globalAlpha`

```js
pincel.globalAlpha = 0.15;
// ...
pincel.globalAlpha = 1;
```

Muda a opacidade de **tudo** o que for pintado depois. Esquecer de devolver a 1 desbota o
resto do quadro inteiro — o tipo de bug que parece vir de outro lugar.

---

## 3. A repetição nossa

No passo 4, segurar ← usava a repetição do sistema operacional: meio segundo de espera,
depois umas 30 por segundo — e tudo isso é configuração do usuário, diferente em cada
máquina.

Agora as repetições automáticas são **ignoradas** (`evento.repeat`), e o loop repete com
tempos escolhidos para o jogo:

```js
const ATRASO_DA_REPETICAO = 0.17;     // espera antes de começar a repetir
const INTERVALO_DA_REPETICAO = 0.05;  // depois, um passo a cada 0,05 s
```

O relógio é **outro acumulador**, contando para baixo:

```js
tempoAteRepetir -= tempo;
while (tempoAteRepetir <= 0) {
    moverPeloJogador(direcaoRepetida);
    tempoAteRepetir += INTERVALO_DA_REPETICAO;
}
```

| | Passo 4 | Passo 8 |
|---|---|---|
| Quem repete | o sistema operacional | o loop do jogo |
| Espera inicial | ~0,5 s (varia) | 0,17 s |
| Ritmo | ~30/s (varia) | 20/s |
| Igual em toda máquina? | não | sim |

O jogo agora combina os **dois** modelos de teclado: o evento diz *quando* a tecla foi
apertada (para mover na hora), e o interruptor diz *se ela continua* apertada (para
repetir).

### A tecla que nunca é solta

```js
window.addEventListener("blur", soltarTudo);
```

Segure → e dê alt+tab. O `keyup` acontece em outra janela e nunca chega aqui: a peça
deslizaria para sempre. Ao perder o foco, o jogo solta tudo. Todo jogo com "tecla presa"
precisa disto, e quase ninguém lembra.

---

## 4. Um tempinho antes de travar

Até o passo 7, a peça travava **no instante** em que não conseguia descer. No nível 1,
tudo bem. No nível 10, ela travaria antes que você conseguisse empurrá-la para debaixo de
uma saliência.

Agora, no chão, um segundo relógio conta meio segundo antes de travar — e cada movimento
do jogador renova a espera:

```js
const TEMPO_PARA_TRAVAR = 0.5;
const MAXIMO_DE_ADIAMENTOS = 15;
```

### O teto, e o bug que ele não bastou para evitar

Sem teto, daria para girar uma peça no chão para sempre. Com 15 adiamentos, do 16º
movimento em diante a peça trava assim que estiver apoiada.

Só que a primeira versão deste passo **ainda deixava girar para sempre**. Um teste que
girava a peça no chão sem parar a viu passar 100 segundos sem travar. A causa: o empurrão
para cima da rotação (o `[0, -1]` do passo 5) tirava a peça do chão, e a versão antiga zerava
o relógio sempre que a peça estava no ar.

A correção tem duas partes:

```js
function registrarDescida() {
    if (pecaAtual.linha > linhaMaisBaixa) {   // um chão NOVO, mais fundo
        linhaMaisBaixa = pecaAtual.linha;
        tempoNoChao = 0;
        adiamentos = 0;
    }
}
```

1. Só renova o relógio e os adiamentos quando a peça alcança uma linha **mais funda** do
   que nunca. Subir e descer de volta não conta como progresso.
2. Na gravidade, o chão é avaliado **no mesmo quadro** em que a peça desce (um `if`
   separado, não um `else`). Deixar para o quadro seguinte abria uma brecha de um quadro:
   tempo suficiente para um giro tirá-la do chão de novo.

> **Toda regra que dá uma vantagem ao jogador precisa de um teto — e o teto precisa ser
> testado por alguém que tente quebrá-lo.** Foi um robô de teste, e não uma partida
> normal, que achou essa brecha.

### Quem pediu o movimento

```js
function moverPeloJogador(dc) {
    if (moverPeca(dc, 0)) adiarTrava();
}
```

A gravidade usa `moverPeca`; o jogador usa `moverPeloJogador`. Se a gravidade também
renovasse a espera, a peça no chão nunca travaria.

---

## Experimente

1. Comece já no nível 10: mude `nivel = 1` para `nivel = 10` em `iniciarPartida`. Agora
   ponha `TEMPO_PARA_TRAVAR = 0` e tente de novo.
2. Mude `ATRASO_DA_REPETICAO` para `0` e para `0.5`. Por que o atraso existe?
3. Desligue o fantasma e jogue no nível 8. Depois religue.
4. Comente `window.addEventListener("blur", soltarTudo)`. Segure →, dê alt+tab e volte.
5. **Reproduza o bug:** volte `if (estaNoChao())` para um `else` em `aplicarGravidade` e
   tente travar uma peça girando sem parar com Z e X apoiada no chão.
6. Troque a tabela por uma fórmula: `Math.max(0.017, 0.8 ** (nivel - 1))`. Compare os
   números com os da tabela.
7. Mostre no painel quantas linhas faltam para o próximo nível.

---

**Anterior:** [`07-proxima`](../07-proxima/) · **Próximo:** [`final`](../final/) — menu, pausa, som, recorde, guardar uma
peça e controles de toque.
