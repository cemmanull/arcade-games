# Pong — Passo 1: A tela

**Rode:** abra o `index.html`.

---

## O que você vê

Uma quadra deitada, duas raquetes nas laterais, uma bola no centro, uma linha tracejada no
meio. Tudo parado.

---

## A decisão deste passo

```js
const raqueteEsquerda = { x, y, largura, altura };
const bola            = { x, y, largura, altura };
```

**Todos os objetos têm a mesma forma.**

Parece detalhe. É a decisão que sustenta o jogo inteiro: mais adiante, uma única função de
colisão e uma única função de desenho vão servir para qualquer um deles, sem tradução no
meio.

Você já vê o primeiro retorno:

```js
function desenharRetangulo(objeto) {
    pincel.fillRect(objeto.x, objeto.y, objeto.largura, objeto.altura);
}
```

Esta função não sabe se está desenhando uma bola ou uma raquete. E é por isso que ela
nunca vai precisar ser reescrita.

> **Funções que não sabem qual objeto estão manipulando são as que sobrevivem.**

---

## O que sumiu em relação à cobrinha

Nenhuma grade. Nenhuma `coluna`, nenhuma `linha`.

Na cobrinha, tudo vivia em casas de um tabuleiro: posições eram inteiros de 0 a 19, e
andar era somar 1. Aqui os objetos ocupam posições em **pixels** — e, a partir do próximo
passo, posições com casas decimais.

Essa diferença vai mudar o movimento, o loop e a colisão. É o assunto de todo este módulo.

---

## Detalhes que valem notar

### Posições calculadas, não digitadas

```js
y: (tela.height - ALTURA_DA_RAQUETE) / 2
```

Mude a resolução no HTML e tudo continua centralizado sozinho. **Um número escrito duas
vezes é um número que um dia vai divergir.**

### `x` e `y` são o canto, não o centro

`fillRect` posiciona pelo canto superior esquerdo. Confundir com o centro desloca tudo pela
metade do tamanho — erro clássico, e que volta a aparecer quando você desenhar um círculo
com `arc`, que usa o centro.

### A proporção da tela

160 por 96 é 5 por 3, uma tela deitada. A cobrinha era quadrada porque o tabuleiro era
quadrado; aqui a quadra é larga, porque o jogo acontece de um lado ao outro.

### A ampliação inteira

Canvas de 160px exibido com 640px: exatamente 4×. Com `image-rendering: pixelated`, cada
pixel desenhado vira um bloco 4×4 de bordas duras. Se a escala não for um número inteiro,
o navegador precisa inventar meios pixels — e borra tudo.

---

## Experimente

1. Mude `ALTURA_DA_RAQUETE` para 40 e depois para 8. Você acabou de encontrar um botão de
   dificuldade.
2. Mude `MARGEM_DA_RAQUETE` para 0 e para 40.
3. Troque `--pixel` para `5px` e `--largura-da-tela` para `800px`. Depois tente `3.5px` /
   `560px` e olhe de perto as bordas: eis o borrão da escala quebrada.
4. Desenhe a bola como um círculo em vez de quadrado:
   `pincel.beginPath(); pincel.arc(x, y, raio, 0, Math.PI * 2); pincel.fill();`
   Atenção: `arc` usa o **centro**. Você vai precisar somar metade do tamanho.
5. Faça a linha central pontilhada mais fina, mudando o passo do laço.

---

**Próximo:** `02-loop` — a bola ganha vida, e o tempo entra na conta.
