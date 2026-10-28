# Shoot 'em up — Passo 1: O céu

**Rode:** abra o `index.html`.

---

## O que você vê

Uma nave parada embaixo, e o céu descendo por ela, sem parar. As estrelas apagadas descem
devagar; as claras, depressa. Parece que a nave voa para cima — e ela nem se mexe.

---

## 1. O objeto é o centro

```js
const nave = { x: 60, y: 140 };   // o CENTRO da nave
```

No Pong, `x` e `y` eram o **canto superior esquerdo**, porque é assim que
o `fillRect` pensa. Neste jogo, quase tudo gira em torno do **centro**:

- um inimigo mira **no centro** da nave;
- um anel de balas sai **do centro** de quem atira;
- uma explosão se espalha **a partir do centro**;
- a colisão (passo 5) vai ser por círculos, que são definidos pelo centro.

Guardar o canto obrigaria a somar metade do tamanho em cada uma dessas contas. Guardando o
centro, a conversão acontece num lugar só — no desenho:

```js
const inicioX = Math.round(x - sprite[0].length / 2);
```

> **Escolha a representação pelo que o programa mais faz com ela.** O Pong desenhava
> retângulos e colidia retângulos: canto. Este jogo mira e espalha: centro.

---

## 2. A rolagem que não se guarda

```js
const y = (estrela.yInicial + camada.velocidade * tempoTotal) % tela.height;
```

Nenhuma estrela anda no estado. Cada uma guarda só onde estava **no instante zero**, e a
posição de agora é **calculada** a partir do relógio.

`velocidade * tempoTotal` é quanto ela já desceu desde o começo — logo passa de mil pixels.
O `%` (resto da divisão) dobra esse número de volta para dentro da tela:

| Desceu | `% 160` | Na tela |
|---|---|---|
| 150 | 150 | quase no fundo |
| 170 | 10 | de volta em cima |
| 1290 | 10 | idem, oito voltas depois |

A estrela que sai por baixo reaparece em cima, para sempre, sem nenhum `if`.

E há um bônus: o céu é uma **função do tempo**. Pausar o relógio pausa o céu. Dado o mesmo
`tempoTotal`, o desenho é sempre o mesmo. É a regra *se pode ser calculado, não guarde*
levada ao extremo.

---

## 3. Paralaxe: profundidade com três números

```js
const CAMADAS_DO_CEU = [
    { quantidade: 40, velocidade: 6,  cor: "#1d2840" },
    { quantidade: 22, velocidade: 16, cor: "#45587a" },
    { quantidade: 10, velocidade: 40, cor: "#a8c4e0" }
];
```

O que está longe parece andar devagar — olhe pela janela de um ônibus: as montanhas quase
não se mexem, os postes passam voando. Estrelas lentas, apagadas e numerosas parecem
distantes; rápidas, claras e poucas parecem perto.

Nada de 3D: três camadas de pontos, cada uma com a sua velocidade. O olho faz o resto.

---

## Detalhes que valem notar

### Cada estrela aponta para a sua camada

```js
estrelas.push({ x, yInicial, camada: camada });
```

A estrela não copia a velocidade e a cor: guarda **a camada inteira** (uma referência). Mude
a cor de uma camada nos dados e todas as estrelas dela mudam juntas.

### O relógio do jogo

```js
tempoTotal += tempo;
```

Por que não usar direto o `instanteAtual` que o `requestAnimationFrame` entrega? Porque esse
relógio **não para**. Com a pausa (no final), o céu precisa congelar — e só congela o que
depende de um relógio que o jogo controla. **Um jogo, um relógio**: tudo o que depende do
tempo é contado dentro do loop, com o mesmo `tempo`. Um `setInterval` ou `setTimeout` teria
o relógio próprio, que não sabe de pausa nem de aba em segundo plano — e dois relógios no
mesmo programa acabam discordando. O céu é o primeiro a obedecer a esse relógio; os
temporizadores dos próximos passos (recarga, invencibilidade) também.

### A nave é texto

```js
const SPRITE_DA_NAVE = [ "....#....", "...#c#...", ... ];
const CORES_DA_NAVE = { "#": "#e8ecff", c: "#00f0ff", f: "#ff9f1c" };
```

Cada caractere é um pixel; o `.` é transparente; um dicionário traduz letra em cor.
`desenharSprite` percorre as linhas, procura a cor de cada letra e pinta um `fillRect` de 1×1.
Nada de arquivo de imagem: o desenho se edita no próprio código, uma letra de cada vez, e
a largura e a altura da nave saem de graça (`sprite[0].length`, `sprite.length`). Os
inimigos dos próximos passos usam o mesmo truque.

### Uma tela em pé cabe na altura

```css
width: min(var(--largura-da-tela), 92vw, calc((100vh - 140px) * 3 / 4));
```

Este canvas (120×160) é em pé, e limitar só pela largura da janela não basta: num notebook
ele passaria da altura. O `min` escolhe o menor
de três limites, e o terceiro converte a **altura** disponível em largura pela proporção 3:4.

---

## Experimente

1. Acrescente uma quarta camada, bem rápida (velocidade 90), com só três estrelas.
2. Deixe as três camadas com a mesma velocidade. A profundidade some — por quê?
3. Troque o `%` por um `if (y > tela.height) ...`. O que você precisaria guardar para isso
   funcionar? (Dica: o `if` precisa **mudar** alguma coisa.)
4. Faça o céu andar para o lado, como num jogo de nave horizontal: as estrelas mudam de `x`,
   não de `y`.
5. Mude a nave para que `x` e `y` sejam o canto, como no Pong. Onde mais você precisou
   mexer? Desfaça.
6. Desenhe a nave piscando o fogo do motor: alterne a cor de `f` entre dois tons usando
   `Math.floor(tempoTotal * 10) % 2`.

---

**Próximo:** [`02-nave`](../02-nave/) — a nave obedece, nas oito direções.
