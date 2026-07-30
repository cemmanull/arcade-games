# Pong — Passo 3: As paredes

**Mudou:** `script.js`
**Rode:** abra o `index.html`.

---

## O que você vê

A bola quica no topo e no fundo, e volta ao centro quando escapa pelas laterais. O jogo já
tem ritmo — falta só alguém para rebatê-la.

---

## 1. Ricochete é um sinal trocado

```js
bola.velocidadeY = -bola.velocidadeY;
```

Quem descia passa a subir, com a mesma rapidez. **A física inteira do ricochete cabe
nisso.**

É um bom momento para apreciar o que a escolha do passo 2 comprou: com `direcao = "baixo"`,
inverter significaria escrever um mapeamento de opostos. Com um número, é um sinal de menos.

---

## 2. O erro número um de quem começa com colisão

```js
bola.y = 0;                            // 1. tira de dentro da parede
bola.velocidadeY = -bola.velocidadeY;  // 2. inverte o movimento
```

**Inverter a velocidade não basta.**

Quando percebemos a colisão, a bola **já entrou** um pouco na parede: ela andou 1,2 pixel
de uma vez, não parou exatamente na borda. Se apenas invertermos a velocidade, no quadro
seguinte ela ainda está dentro da parede, a condição é verdadeira de novo, e ela inverte
outra vez. E outra.

O resultado é uma bola tremendo, presa na parede, mudando de direção a cada quadro.

> **Ao colidir, conserte a posição E a velocidade, sempre juntas.**

Faça o exercício 1 lá embaixo para ver isso acontecendo — vale mais do que a explicação.

---

## 3. O limite que desconta o tamanho

```js
const limiteInferior = tela.height - bola.altura;
```

`y` é o canto **superior** da bola. Sem descontar a altura, metade dela sairia da tela
antes de quicar.

É o primo do off-by-one: chame de "off-by-tamanho". Sempre que comparar uma posição com uma
borda, pergunte-se **de que ponto do objeto** aquela posição está falando.

---

## 4. Ângulo → par de velocidades

```js
bola.velocidadeX = Math.cos(angulo) * VELOCIDADE_DA_BOLA * direcao;
bola.velocidadeY = Math.sin(angulo) * VELOCIDADE_DA_BOLA;
```

Cosseno dá a parte horizontal, seno dá a vertical. É assim que se transforma "quero ir
nessa direção, nessa velocidade" em dois números.

Vale se acostumar agora, num caso simples: esta mesma conta vai decidir o ricochete na
raquete, no passo 6, onde ela deixa de ser detalhe e vira a regra mais importante do jogo.

O ângulo é sorteado entre −25° e +25° para que nem todo saque saia igual. Sem essa
variação, o jogo vira decoreba.

---

## Experimente

1. **Cometa o bug de propósito:** comente as duas linhas `bola.y = 0;` e
   `bola.y = limiteInferior;`, deixando só as inversões. Aumente `VELOCIDADE_DA_BOLA` para
   400 para exagerar. A bola treme e fica grudada na borda. Agora descomente.
2. Tire o `- bola.altura` do `limiteInferior` e observe a bola afundar meio corpo antes de
   quicar.
3. Faça a bola quicar também nas laterais (mesma lógica, no eixo X). Ela nunca mais sai —
   e você tem um protetor de tela.
4. Aumente a velocidade a cada ricochete: `bola.velocidadeY *= 1.1`. Depois de umas dez
   batidas, algo estranho acontece. Descubra o quê. *(Dica: quanto ela anda por quadro?)*
5. Adicione gravidade — `bola.velocidadeY += 200 * tempo` em `atualizar` — e veja a bola
   quicar cada vez mais baixo... ou não. Por que ela não perde energia?
6. Faça o saque sair sempre em 45°, sem sorteio, e sinta o jogo ficar previsível.

---

**Anterior:** `02-loop` · **Próximo:** `04-raquetes` — você entra no jogo.
