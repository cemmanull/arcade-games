# Reflexo — Passo 1: A planta

**Mudou:** os três arquivos (é o primeiro passo)
**Rode:** abra o `index.html` e depois aperte **H**.

---

## O que você vê

A planta de uma sala de observatório, vista de cima: paredes de tijolo (vermelho apagado) e de
pedra (cinza-azulado), o chão escuro, e letras amarelas e ciano marcando o que ainda não faz
nada: `E` (emissor de luz), `R` (receptor), `D` (porta), `/` e `\` (espelhos), `S` (fenda das
sombras) e `X` (a saída). No canto de cima, à esquerda, o zelador: um círculo ciano com uma
**seta** apontando para onde ele olha. Nada se mexe.

Com **H** aparece a grade das casas e, abaixo do desenho, os números do zelador: a casa onde
ele está, a posição, o ângulo e o vetor direção. É o hábito do curso, "mostrar o invisível".

Este passo é de propósito parado. Os próximos passos vão desenhar esta mesma sala em primeira
pessoa, com um raio de luz por coluna da tela. Antes disso o jogo precisa responder a duas
perguntas: **onde as coisas estão** e **para onde o jogador olha**.

---

## 1. O mapa é um texto

*Reusa `pacman/01-labirinto` (mapa em texto, grade).*

```js
const MAPA_EM_TEXTO = [
    "################",
    "#J...#....%%..R#",
    ...
];
```

Igual ao labirinto do Pac-Man: cada caractere é uma casa, e `split("")` transforma cada linha
numa lista para formar a matriz `mapa[linha][coluna]` (primeiro a linha, como sempre).

Duas diferenças:

- **O `J` é só um aviso.** Ele marca onde o jogador começa; depois de lido, a casa vira chão
  (`.`). Senão o jogo teria um "jogador" parado no mapa para sempre.
- **As bordas são sempre parede.** Quem anda ou lança raios nunca precisa perguntar "esta casa
  existe?": a pergunta some, porque o mundo é fechado. Mas dado escrito à mão erra, e erro de
  mapa não explode, só desenha torto. Por isso `verificarMapa()` confere, uma vez, se há
  **exatamente um `J`**, se todas as linhas têm o mesmo tamanho e se as bordas estão fechadas.

> A barra invertida é o caractere de escape das strings. Para pôr o espelho `\` no mapa,
> escreve-se `"\\"`. A string tem 16 caracteres; o código-fonte, 17. Por isso a conferência usa
> `.length` do valor, não o que você enxerga no editor.

---

## 2. Posição em casas, não em pixels

```js
const jogador = { x: 0, y: 0, angulo: Math.PI / 4, dx: 0, dy: 0 };
// depois de colocarJogadorNoInicio(): x = 1.5, y = 1.5
```

No Pac-Man, `x` e `y` eram pixels. Aqui são **casas**, com decimais: `1.5` é o **meio** da casa
1. Por quê? Porque o mundo não pode depender do tamanho do desenho. Daqui a três passos a mesma
posição será desenhada em primeira pessoa, sem nenhum "pixel de planta" por perto. O mapa e o
jogador vivem na mesma unidade, e só o desenho sabe que uma casa tem 24 pixels:

```js
pincel.scale(TAMANHO_DA_CASA, TAMANHO_DA_CASA);   // 1 unidade de desenho = 1 casa
```

Depois dessa linha, `fillRect(x, y, 1, 1)` pinta exatamente uma casa. A casa de uma posição
continua sendo **deduzida**, como no Pac-Man: `Math.floor(jogador.x)`.

---

## 3. O ângulo e o vetor direção

*Reusa `shoot-em-up` (seno e cosseno, a partir do `05-colisao`) e o ângulo de saída da bola do
`pong/06-angulo`.*

```js
function atualizarDirecao() {
    jogador.dx = Math.cos(jogador.angulo);
    jogador.dy = Math.sin(jogador.angulo);
}
```

O jogador guarda **um número**: `angulo`, em **radianos**. Para o jogo andar ou lançar um raio
ele precisa de uma **seta**, e a seta é o par `(dx, dy)` = `(cos, sin)` do ângulo, exatamente a
conta que dava a velocidade do tiro no Shoot'em up.

| `angulo` | graus | `(dx, dy)` | para onde olha |
|---|---|---|---|
| `0` | 0° | `(1, 0)` | direita |
| `Math.PI / 2` | 90° | `(0, 1)` | **baixo** (o eixo y desce) |
| `Math.PI` | 180° | `(-1, 0)` | esquerda |
| `Math.PI / 4` | 45° | `(0.71, 0.71)` | diagonal, para baixo e à direita |

Duas regras que o resto do curso vai usar:

1. **A seta sempre tem tamanho 1.** `cos² + sin² = 1`. Por isso, multiplicar a seta por uma
   velocidade (3 casas por segundo) dá exatamente aquela velocidade, para qualquer ângulo. Com
   **H** ligado, olhe a linha `dir (0.71, 0.71)`: some os quadrados, dá 1.
2. **A seta não é guardada: é calculada.** Só o `angulo` é "a verdade". Se `dx` e `dy`
   fossem gravados à mão, um dia alguém mudaria o ângulo e esqueceria a seta, e o zelador
   olharia para um lado e andaria para outro.

No desenho, a seta é uma linha da posição até `posição + direção × 1,5`.

---

## 4. O loop que ainda não tem o que fazer

```js
function quadroAQuadro() {
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}
```

O loop só redesenha, mas já é o loop de verdade, com `requestAnimationFrame`. Assim o **H**
funciona a qualquer momento (ele só liga uma variável, `depuracaoLigada`, e o próximo quadro
mostra a diferença) e o passo 2 só precisa acrescentar uma linha: `atualizar(tempo)`.

---

## Experimente

1. Mude `angulo` para `0`, `Math.PI / 2` e `Math.PI`. Antes de abrir a página, preveja para onde
   a seta vai. Acertou nas três?
2. Ponha `angulo: 90`. A seta aponta para onde? (Dica: `cos(90)` em radianos não é zero. Ângulos
   do JavaScript são radianos, não graus.) Escreva a conta que converte graus em radianos.
3. Em `colocarJogadorNoInicio`, tire os dois `+ 0.5`. O círculo e a seta andaram para onde? O
   que isso diz sobre o que `1.5` significa?
4. Aperte **H** e compare a linha `casa (1, 1)  pos (1.50, 1.50)` com a letra `J` do mapa.
5. Desenhe uma sala sua: troque o mapa por outro de 16 colunas. Depois apague uma `#` da borda e
   veja o que o console diz.
6. **Quebre de propósito:** acrescente um segundo `J` ao mapa. O que o console avisa? E o que
   acontece com a posição do jogador? (Dica: leia `colocarJogadorNoInicio`.)
7. **Quebre de propósito:** apague a linha `pincel.scale(...)`. Por que tudo vira um pontinho
   no canto de cima? O que 1 unidade vale agora?

---

**Anterior:** [`reflexo_gdd.md`](../reflexo_gdd.md) · **Próximo:** [`02-andar`](../02-andar/) — o zelador sai do lugar, e a parede passa a existir de verdade.
