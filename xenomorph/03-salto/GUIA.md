# Xenomorph — Passo 3: O salto

**Mudou:** os três arquivos (a ajuda no HTML)
**Rode:** abra o `index.html` e suba até a plataforma do canto de cima, à direita.

---

## O que você vê

A sala foi redesenhada para pular. Os pisos finos, de grade, são **plataformas de mão única**:
pulando por baixo, o soldado as atravessa; caindo por cima, pisa nelas; com **↓ + pular**, desce
por elas.

Segure o pulo e ele vai alto — um pouco mais de 4 blocos. Dê um toque e ele mal sai do chão.
Com **Shift**, um arranque curto em linha reta, deixando um rastro ciano; no ar, uma vez por salto.

Com **H**, além das caixas, duas barras que encolhem: o **tempo de coiote** (verde) e o **pedido
de salto** (amarelo). São os perdões, ao vivo.

---

## 1. O salto é uma linha

```js
soldado.vy = -FISICA.velocidadeDoSalto;
```

Uma velocidade para cima, e a gravidade do passo 2 faz o resto: freia a subida, para no alto,
puxa de volta. Nenhum código de "subir" e "descer". A altura sai da física do ensino médio:

```
altura = velocidade² / (2 × gravidade) = 250² / 1800 ≈ 35 px
```

Quadro a quadro a conta perde um pouco — o teste mediu 33 px. É desse número que saem as **regras
de quem desenha salas**: nenhum degrau com mais de 3 blocos, para sobrar folga a quem não pular
perfeito.

### Cair é mais pesado que subir

```js
const gravidade = soldado.vy < 0 ? FISICA.gravidade : FISICA.gravidadeNaDescida;
```

Com a mesma gravidade nos dois sentidos, o pulo parece flutuar no alto. Com mais na descida, ele
fica firme, e o soldado volta a tempo de reagir. A física real não é assim — o jogo não precisa
ser a física real; precisa **parecer certo**.

---

## 2. O salto variável

```js
if (soldado.saltando && soldado.vy < 0 && !acao("pular")) {
    soldado.vy *= FISICA.corteDoSalto;
    soldado.saltando = false;
}
```

Soltou o botão ainda subindo? A subida é cortada pela metade. Segurar vai a 33 px; um toque, a
9 px; tudo no meio é possível. O jogador escolhe a altura **com o dedo**, sem um botão para cada
altura — é o *"salto variável"* da seção 4 do GDD.

`saltando` garante que o corte acontece uma vez só, e só num salto: cair de uma plataforma sem
segurar nada não deve ser cortado.

---

## 3. Os perdões invisíveis

### O pedido guardado

O jogador aperta pular **três quadros antes** de tocar o chão. Para ele, apertou na hora. Para o
computador, apertou no ar — e, sem perdão, o aperto se perde: *"o jogo comeu o comando"*.

```js
if (CONTROLES.pular.includes(tecla)) soldado.pedidoDeSalto = FISICA.validadeDoPedido;
```

O aperto vira um **pedido com prazo de validade** (0,1 s). Enquanto valer, o loop tenta atendê-lo
a cada quadro. Tocou o chão a tempo? Pula.

### O tempo de coiote

O jogador corre e aperta pular **três quadros depois** de sair da beirada. Para ele, ainda estava
no chão.

```js
if (soldado.tempoDeCoiote <= 0) return;   // e não: if (!soldado.noChao) return;
```

"Poder pular" deixa de ser *estar no chão* e passa a ser *ter estado no chão há menos de 0,1 s*.
(O nome vem do desenho animado: o coiote corre para fora do penhasco e só cai quando olha para
baixo.)

| Perdão | O jogador apertou… | O jogo finge que… |
|---|---|---|
| pedido guardado | um pouco **antes** de poder | apertou na hora certa |
| tempo de coiote | um pouco **depois** de poder | ainda estava no chão |

Nenhum jogador percebe que foi perdoado. Todo jogador percebe quando **não** foi. O teste deste
passo provou os dois: um aperto 3 quadros depois da beirada pula, e um 4 quadros antes de aterrissar
também — com 0,08 s de coiote, o primeiro falhava, e o número subiu para 0,1.

> Esses dois temporizadores são o mesmo mecanismo do Dealer? Out!: um número que desce até zero,
> e "vale" enquanto for maior que zero. Quase todo o *game feel* de um jogo de plataforma é feito
> deles.

---

## 4. Um bloco que colide de um lado só

```js
"-": { solido: false, plataforma: true, desenho: "plataforma" }
```

A plataforma **não é sólida**: para quem anda de lado ou sobe, ela é ar. Ela tem outra
propriedade, que a colisão consulta num caso só:

```js
const pisaNaPlataforma = dy > 0                               // descendo
    && corpo.atravessando <= 0                                // sem ter pedido para descer
    && pesAntes <= linha * TAMANHO_DO_BLOCO + EPSILON;        // vindo de CIMA dela
```

A terceira condição é a sutil. Quem pulou por baixo e está com meio corpo dentro da plataforma, ao
começar a cair, **não** deve ser puxado para cima dela de repente. Só segura quem tinha os pés
acima dela antes deste pedaço de movimento.

E descer é desligar a plataforma por 0,2 s: `atravessando`, mais um temporizador.

### A forma conta a regra

A plataforma é desenhada **fina**, só nos 3 pixels de cima, e com furos. O jogador entende sem
manual que ela é diferente do metal grosso — e que dá para passar por baixo.

---

## 5. A esquiva

```js
soldado.vx = direcao * FISICA.velocidadeDaEsquiva;
soldado.vy = 0;
soldado.esquiva = FISICA.duracaoDaEsquiva;
```

Velocidade fixa, sem gravidade, por 0,15 s: uma linha reta. Durante ela, o soldado não corre, não
pula e não cai — `atualizar` simplesmente não chama essas funções. No ar, uma por salto; o chão
devolve.

Ao terminar, a velocidade é **limitada** à de corrida. Sem isso, o soldado sairia da esquiva a
230 px/s e iria freando com o controle fraco do ar — um escorregão bem maior que o arranque.

Ela ainda não serve para nada além de andar rápido. No passo 5, as criaturas vão dar a ela o seu
motivo de existir.

---

## Detalhes que valem notar

### Controle mais fraco no ar

```js
const taxa = soldado.noChao ? (...aceleracao...) : (...aceleracaoNoAr...);
```

No ar dá para corrigir o salto, mas não dar meia-volta instantânea. São os dois números do
*"controle aéreo ajustável"* do GDD.

### Segurar não é apertar

```js
if (evento.repeat) return;
```

Segurar a tecla faz o navegador repetir o `keydown`. Sem esse teste, segurar pular criaria um
pedido novo a cada repetição, e o soldado pularia de novo sozinho ao aterrissar.

### O rastro

Uma lista que nasce e morre (`rastro`), desenhada com o mesmo sprite numa cor só e
`globalAlpha` diminuindo com a idade. Ele não muda nenhuma regra — e deixa a esquiva legível.

---

## Verificado

Um robô que conhece só a física do jogo partiu do chão e tentou, de cada posição alcançada, todas
as combinações de corrida, direção e tempo de pulo — uma **busca em largura** sobre as posições
em que o soldado consegue ficar de pé. Ele alcançou as nove superfícies da sala. Na primeira
versão, a plataforma do canto não aparecia na lista: ficava tão perto do teto que o soldado não
cabia em pé sobre ela. A sala foi corrigida.

---

## Experimente

1. Mude `corteDoSalto` para 1. O salto variável some — qual fica mais difícil de alcançar?
2. Zere `tempoDeCoiote` e `validadeDoPedido`. Jogue um minuto. Depois volte e compare.
3. Iguale `gravidadeNaDescida` à `gravidade`. O pulo fica mais "lunar"?
4. Faça a esquiva **para cima** quando ↑ estiver apertado. Que número do `FISICA` você reaproveitou?
5. Crie uma plataforma que **some** 0,5 s depois de pisada (um bloco novo e um temporizador por
   bloco). Onde ficaria esse temporizador?
6. Desenhe uma sala nova com um degrau de 5 blocos. Consegue subir? A regra dos 3 blocos faz
   sentido?

---

**Anterior:** [`02-gravidade`](../02-gravidade/) · **Próximo:** [`04-armas`](../04-armas/) — mirar em oito direções, e armas que são
dados.
