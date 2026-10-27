# Shoot 'em up — Passo 8: O chefe

**Mudou:** os três arquivos (a barra de vida do chefe)
**Rode:** abra o `index.html` e chegue ao fim do roteiro (uns 50 segundos).

---

## O que você vê

"Alerta: nave-mãe". Uma barra de vida aparece acima da tela e a nave-mãe desce, devagar, sem
atirar. Então ela passeia de um lado a outro, alternando um leque e uma rajada de três tiros
mirados. Antes de cada ataque, o **núcleo pisca**.

Abaixo de 60% de vida, as balas da tela somem — "Ele mudou!" — e começam os anéis. Abaixo de
25%, "Fúria!": anéis seguidos que giram e formam uma espiral. Na vida zero, dois segundos de
explosões e **Vitória!**.

---

## 1. Uma máquina de estados dentro de uma entidade

```js
switch (chefe.estado) {
    case "entrando":   atualizarEntrada(); break;
    case "lutando":    moverChefe(); atacar(tempo); break;
    case "explodindo": atualizarExplosaoDoChefe(); break;
}
```

A máquina de estados do Pong e do Tetris controlava **o jogo inteiro** (menu, jogando, fim).
Esta controla **um personagem**. A ideia é a mesma: o chefe está sempre em exatamente um
estado, e cada estado só cuida do que faz sentido nele.

| Estado | Move | Atira | Leva dano | Termina quando |
|---|---|---|---|---|
| `entrando` | desce freando | não | não | 2,5 s |
| `lutando` | passeia | sim | sim | vida zero |
| `explodindo` | não | não | não | 2 s → vitória |

Escrever isso com booleanos (`entrou`, `morreu`, `podeAtirar`…) daria combinações impossíveis.
Com um estado só, a tabela acima **é** o código.

### Cada estado com o seu relógio

```js
function mudarEstadoDoChefe(novoEstado) {
    chefe.estado = novoEstado;
    chefe.tempoNoEstado = 0;
}
```

`tempoNoEstado` zera a cada troca. Por isso dá para escrever "a entrada dura 2,5 s" sem saber
em que segundo da partida ela começou.

---

## 2. A fase é derivada da vida

```js
const FASES_DO_CHEFE = [
    { ateVida: 0.6,  ataques: [ ... ] },
    { ateVida: 0.25, ataques: [ ... ] },
    { ateVida: 0,    ataques: [ ... ] }
];

const novaFase = FASES_DO_CHEFE.findIndex(fase => fracao > fase.ateVida);
```

A fase não é decidida por um cronômetro nem por um contador de golpes: é **calculada** a partir
da vida. `findIndex` devolve a posição da primeira fase cujo limite ainda está abaixo da vida
atual.

Isso amarra o ritmo da luta à habilidade de quem joga: quem acerta mais vê as fases chegarem
mais cedo. E a troca de fase é um **evento**: as balas somem (um respiro), o aviso aparece, a
lista de ataques recomeça.

### Ataques em ciclo

```js
const ataque = ataques[chefe.proximoAtaque % ataques.length];
chefe.proximoAtaque += 1;
chefe.tempoAteAtacar += ataque.espera;
```

O `%` faz o índice voltar ao zero no fim da lista — o truque da rolagem do céu, de novo. E cada
ataque diz quanto esperar **depois** dele: três mirados com 0,35 s entre eles são uma rajada;
com 1,2 s no último, uma pausa para respirar.

### Nenhum padrão novo

O chefe usa **os mesmos** `PADROES` dos inimigos comuns. A espiral da fúria é só o anel do
passo 6 disparado a cada 0,3 s: como o anel gira com o relógio de quem atira, os anéis seguidos
saem desencontrados e desenham uma espiral.

> **Comportamento rico raramente vem de peças novas. Vem de combinar peças simples com
> números diferentes.**

---

## 3. Telegrafar

```js
function chefeEstaAvisando() {
    return chefe.estado === "lutando" && chefe.tempoAteAtacar < TEMPO_DE_AVISO;
}
```

Nos últimos 0,4 s antes de cada ataque, o núcleo pisca. É o chefe **avisando**.

Sem o aviso, cada ataque é uma surpresa, e surpresa demais vira injustiça. Com o aviso, o
jogador atento sempre tem tempo de reagir — e sente que **leu** o chefe, em vez de ter tido
sorte. Todo chefe bem feito, em qualquer gênero, telegrafa: o boxeador que recua o braço, o
dragão que puxa o ar.

O aviso não é guardado: é **calculado** do relógio, sempre que o desenho pergunta. E piscar só
o núcleo é trocar uma letra do dicionário de cores:

```js
cores = { ...CORES_DO_CHEFE, r: "#ffffff", o: "#ffffff" };
```

---

## 4. A barra de vida é um `<progress>`

```html
<label for="vida-do-chefe">Nave-mãe</label>
<progress id="vida-do-chefe" max="1" value="1"></progress>
```

O elemento nativo para "quanto de um total". Um leitor de tela anuncia o valor, o `label`
diz de quem é a barra, e o script só faz `vidaDoChefe.value = vida / VIDA_DO_CHEFE`.

### `visibility`, não `hidden`

O atributo `hidden` tira o elemento do layout: quando o chefe aparecesse, o canvas inteiro
**pularia** 20 pixels para baixo — bem na hora mais tensa. `visibility: hidden` esconde, mas
continua ocupando o lugar.

### Estilizar o `<progress>`

```css
#vida-do-chefe::-webkit-progress-value { background: var(--cor-destaque); }
#vida-do-chefe::-moz-progress-bar      { background: var(--cor-destaque); }
```

Cada navegador desenha a barra do seu jeito, e cada um tem o seu seletor para a parte cheia. As
regras ficam **separadas**: um navegador que não entende um seletor descarta a regra inteira.

---

## Detalhes que valem notar

### O chefe não mora na lista

`chefe` é uma variável própria, não um item de `inimigos`. Ele é um só, tem regras que nenhum
outro tem, e misturá-lo à lista encheria `moverInimigos` de `if (é o chefe)`.

### Os tiros passam durante a entrada

Enquanto entra e enquanto explode, o chefe ignora os tiros. A entrada é uma **apresentação**:
ninguém deveria tirar 10% da vida dele antes de ele chegar.

---

## Experimente

1. Mude `TEMPO_DE_AVISO` para 0 e enfrente o chefe. Depois para 1. Qual parece mais justo?
2. Acrescente uma quarta fase, abaixo de 10%, com um ataque que você inventar.
3. Na fase de fúria, troque o `espera: 0.3` dos anéis por `0.1`. Ainda dá para passar?
4. Faça o chefe chamar reforços: ao trocar de fase, ele cria dois drones (`criarInimigo`).
5. Mostre a barra de vida com três marcas, nos pontos em que as fases mudam.
6. Escreva o chefe com booleanos em vez de `estado`. Quantas combinações você precisou proibir
   com `if`?

---

**Anterior:** `07-roteiro` · **Próximo:** `final` — menu, pausa, som, recorde, armas melhores,
modo foco, bomba e controles de toque.
