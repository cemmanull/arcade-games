# Xenomorph — Passo 1: A sala

**Rode:** abra o `index.html`.

---

## O que você vê

Uma sala de um complexo de pesquisa abandonado, numa tela **deitada**. Paredes e plataformas de
metal com a borda de cima iluminada, dois canos ao fundo, e um soldado parado no chão, de visor
aceso. Nada se move.

É o primeiro pedido do [GDD](../xenomorph_gdd.md): *"2D com câmera lateral"*, num
*"complexo de pesquisa abandonado"*, com *"tons frios nas instalações humanas"* (seções 1, 2 e 10).

---

## 1. O mundo é um texto

```js
const SALA_EM_TEXTO = [
    "################################",
    "#..............|...............#",
    ...
    "#..@..|...............####.....#",
    "################################",
    "################################"
];
```

A ideia do labirinto do Pac-Man, agora de lado: cada caractere é um **bloco** de 8×8 pixels.
32 colunas por 18 linhas — exatamente uma tela de 256×144. Dá para **ler** a sala dentro do
código, e mudar uma plataforma é apagar quatro `#`.

Os dados são conferidos antes de usar: uma linha com 31 caracteres, ou um caractere que ninguém
sabe o que é, vira uma mensagem clara no console (F12), dizendo **qual** linha.

---

## 2. O que colide e o que aparece são perguntas diferentes

```js
const BLOCOS = {
    "#": { solido: true,  desenho: "metal" },
    "|": { solido: false, desenho: "cano" },
    ".": { solido: false, desenho: null }
};
```

O cano aparece na tela, mas ninguém pisa nele. Se a regra fosse *"tudo o que não é `.` é
parede"*, o soldado ficaria preso no primeiro cano. Por isso a tabela responde as duas perguntas
**separadas**:

| Pergunta | Quem faz | Campo |
|---|---|---|
| o soldado pode estar aqui? | as regras (a partir do passo 2) | `solido` |
| que cara isto tem? | o desenho | `desenho` |

Um bloco novo — vidro, grade, gosma alienígena — é uma linha nova nesta tabela. E daqui a dois
passos aparece um bloco que colide **de um lado só**: a tabela é o lugar dele.

> **Separe o que a coisa É de como ela APARECE** — a regra que atravessa o curso inteiro, agora
> dentro de uma única tabela.

---

## 3. As bordas se deduzem dos vizinhos

```js
const arEmCima = !ehSolido(coluna, linha - 1);
...
if (arEmCima) pincel.fillRect(x, y, lado, 1);   // a superfície pega luz
```

O texto só diz *metal*. Mas um bloco com ar em cima é a superfície de um piso — pega luz. Com ar
embaixo, é a parte de baixo de uma plataforma — fica na sombra. Cada bloco olha os quatro vizinhos
e decide sozinho onde pintar a borda, como as paredes do Pac-Man.

`ehSolido` diz que **fora da sala é sólido**. Assim, quem pergunta pelo vizinho da borda não
precisa testar se o índice existe — e as paredes da beirada desenham-se como paredes, sem borda
iluminada virada para o nada.

---

## 4. Marcadores: recados de quem desenhou a sala

```js
if (caractere === "@") {
    inicio = { coluna: c, linha: l };
    linha[c] = ".";
}
```

O `@` não é um bloco: é um **recado** — *"o soldado começa aqui"*. Ele é lido uma vez, guardado,
e no lugar dele fica ar. Quem desenha a sala decide onde as coisas começam sem tocar em código.
Mais adiante, outras letras vão marcar onde nascem as criaturas.

---

## 5. O soldado é uma caixa — e x, y voltam a ser o canto

```js
const soldado = {
    x: sala.inicio.coluna * TAMANHO_DO_BLOCO + 1,
    y: (sala.inicio.linha + 1) * TAMANHO_DO_BLOCO - ALTURA_DO_SOLDADO,
    largura: 6,
    altura: 12
};
```

No Shoot 'em up, `x` e `y` eram o **centro**, porque tudo mirava e explodia a partir dele. Aqui o
problema principal é outro: encostar em paredes, pisar no chão, bater a cabeça no teto. São
**caixas contra uma grade**, e uma caixa se descreve naturalmente pelo canto e pelo tamanho — como
no Pong.

> **Escolha a representação pelo que o programa mais faz com ela.** De novo.

Repare na conta do `y`: o soldado nasce com os **pés** na borda de baixo do bloco do `@`. Pela
borda de cima, ele ficaria com as pernas enterradas no piso.

### O desenho é maior que a caixa

O sprite tem 8 pixels de largura; a caixa, 6. O cotovelo e o cano da arma podem passar da caixa
sem que isso conte como encostar. É um perdão que o jogador nem percebe, e é por isso que o
desenho é feito em `soldado.x - 1`.

---

## Detalhes que valem notar

### Um dicionário de funções de desenho

```js
const DESENHOS_DE_BLOCO = { metal: desenharMetal, cano: desenharCano };
DESENHOS_DE_BLOCO[desenho](coluna, linha);
```

Nenhum `if (desenho === "metal") ... else if ...`. Um desenho novo é uma função nova e uma entrada
nesta tabela.

### A parede do fundo não está no texto

As placas de 16×16 do fundo são o papel de parede: iguais em qualquer sala. O texto guarda só o
que muda de uma sala para outra.

---

## Experimente

1. Redesenhe a sala: uma escada de plataformas da esquerda até a direita. Confira o console.
2. Apague um `.` de uma linha e recarregue. O que o console diz?
3. Crie um bloco novo, `"="`, que é sólido e desenhado com outra cor (um piso de grade). Você
   precisou mexer em quantos lugares?
4. Troque `ehSolido` para que fora da sala seja **ar**. O que muda no desenho das bordas?
5. Mova o `@` para cima de uma plataforma. O soldado aparece em pé sobre ela?
6. Desenhe o soldado olhando para a esquerda, escrevendo cada linha do sprite ao contrário. (No
   próximo passo isso vai ser feito sem escrever um sprite novo.)

---

**Próximo:** `02-gravidade` — o soldado anda, e o chão passa a segurá-lo.
