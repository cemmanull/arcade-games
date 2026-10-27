# Pac-Man — Passo 2: O movimento

**Mudou:** `script.js` e a linha de ajuda
**Rode:** abra o `index.html`. Use as setas — e experimente apertar **antes** de chegar a uma
curva.

---

## O que você vê

O Pac-Man anda sozinho, desliza suave pelos corredores, abre e fecha a boca enquanto anda e
para (de boca congelada) quando encosta numa parede. Aperte ↑ alguns passos antes de um
cruzamento: ele vira sozinho, na hora exata. Saia pelo túnel do meio: ele reaparece do outro
lado.

---

## A grade e o deslizar, juntos

| | Cobrinha | Pong | Pac-Man |
|---|---|---|---|
| Posição | casa (inteiro) | pixel (decimal) | pixel (decimal) |
| Movimento | salta de casa em casa | desliza livre | desliza **pelos corredores** |
| Virar | a qualquer momento | não existe "virar" | **só no centro de uma casa** |
| Paredes | o fim da grade | a borda da tela | casas `#` da matriz |

O Pac-Man guarda `x` e `y` em pixels, como a bola do Pong. A casa onde ele está é **deduzida**:

```js
function casaDe(pixel) {
    return Math.floor(pixel / TAMANHO_DA_CASA);
}
```

E a regra que junta os dois mundos cabe numa frase:

> **Ande em pixels; ao passar pelo centro de uma casa, decida.**

---

## 1. Andar em pedaços, nunca pulando um centro

```js
while (distancia > 0) {
    if (estaNoCentro(pacMan)) {
        // decidir: virar? parar?
    }

    const passo = Math.min(distancia, distanciaAteOProximoCentro(pacMan));
    pacMan.x += pacMan.direcao.dx * passo;
    pacMan.y += pacMan.direcao.dy * passo;
    distancia -= passo;
}
```

A distância do quadro é gasta em pedaços, e **nenhum pedaço passa por cima de um centro**. Ao
chegar a um centro, o Pac-Man decide; só então gasta o resto.

Por que não andar tudo de uma vez e conferir depois? Porque um quadro lento pode levar o
Pac-Man de 2 pixels antes do centro para 1 pixel depois dele. Ele nunca estaria **no** centro
— e a curva seria perdida, ou ele entraria meio pixel na parede. É o problema do "atravessou a
parede" do Pong, com outra roupa; e a solução é a mesma ideia da colisão contínua: não pule o
caminho, percorra-o.

---

## 2. A intenção fica guardada

```js
document.addEventListener("keydown", evento => {
    pacMan.desejada = TECLAS[evento.key.toLowerCase()];
});
```

A tecla não move nada: ela só troca a direção **desejada**. No próximo centro de casa:

```js
if (proximaCasaLivre(pacMan, pacMan.desejada)) {
    pacMan.direcao = pacMan.desejada;
}
pacMan.parado = !proximaCasaLivre(pacMan, pacMan.direcao);
```

1. Dá para ir para onde o jogador quer? Vira.
2. Dá para continuar para onde já ia? Continua. Senão, para.

Aperte ↑ cinco casas antes de um cruzamento: a intenção espera, e ele vira exatamente lá.
Exigir que o jogador aperte **no pixel certo** seria impossível a 7,5 casas por segundo. Guardar
a intenção é o que faz o controle parecer **esperto**.

### Meia-volta na hora

```js
if (saoOpostas(pacMan.desejada, pacMan.direcao)) {
    pacMan.direcao = pacMan.desejada;
}
```

A exceção: voltar pelo mesmo caminho pode acontecer em qualquer ponto, porque o caminho de volta
é o corredor por onde ele acabou de passar. Num jogo de fuga, a meia-volta instantânea é
questão de vida ou morte.

---

## 3. Decimais não são exatos

```js
const EPSILON = 1e-6;
const centrado = resto < EPSILON || resto > TAMANHO_DA_CASA - EPSILON;
```

Em JavaScript, `0.1 + 0.2` dá `0.30000000000000004`. Somando passos decimais quadro após quadro,
o Pac-Man chega a 99,99999999 em vez de 100. Comparar com `===` faria a decisão do centro
falhar uma vez em mil — o pior tipo de bug.

Duas defesas:

- **comparar com tolerância** (`EPSILON`, um número minúsculo);
- **encaixar**: ao chegar perto de um centro, a posição é arredondada para ele, e o erro não se
  acumula.

> **Nunca compare decimais com `===`.** Compare a distância entre eles com uma tolerância.

---

## 4. O túnel e o resto de números negativos

```js
const colunaDoTunel = ((coluna % COLUNAS) + COLUNAS) % COLUNAS;
```

Saindo pela esquerda, a coluna vira −1 — que deveria ser 27. Mas em JavaScript, `-1 % 28` dá
**−1**, não 27: o `%` mantém o sinal de quem é dividido. Somar 28 e tirar o resto de novo
conserta para qualquer número, positivo ou negativo.

E `encaixar` faz o mesmo com os pixels: `x < 0` ganha a largura do mapa, `x ≥ largura` perde.

---

## 5. A boca anda com ele

```js
const abertura = Math.abs(Math.sin(pacMan.distanciaAndada * 0.35)) * 0.28 * Math.PI + 0.02;
```

A abertura vem da **distância percorrida**, não do relógio. Andando, a boca mastiga; parado na
parede, congela. Se viesse do relógio, ele mastigaria o ar parado — um detalhe pequeno que
denuncia que algo está errado.

O ângulo da boca sai da direção: `Math.atan2(dy, dx)` transforma o vetor `(dx, dy)` num ângulo
(direita 0, baixo π/2, esquerda π, cima −π/2).

---

## Detalhes que valem notar

### `Object.freeze` nas direções

As direções são objetos **compartilhados**: o Pac-Man e (logo) os quatro fantasmas apontam para
os mesmos. Se algum código fizesse `pacMan.direcao.dx = 2`, mudaria a direção **de todo mundo**.
`Object.freeze` faz essa linha não ter efeito. Proteção barata contra um bug caro.

### O modelo de teclado da cobrinha

Só a última tecla importa — como na cobrinha, e diferente do Pong e do Tetris. O Pac-Man não
precisa de teclas presas: ele anda sozinho.

---

## Experimente

1. Troque `Math.min(distancia, distanciaAteOProximoCentro(pacMan))` por só `distancia` (sem
   pedaços). Ponha `VELOCIDADE_DO_PAC_MAN = 400` e tente fazer curvas.
2. Tire a guarda da intenção: em vez de `pacMan.desejada = ...`, faça a tecla mudar
   `pacMan.direcao` direto. Ainda dá para jogar?
3. Mude o `EPSILON` para 0 e deixe o Pac-Man andando por um minuto. Ele trava em algum lugar?
4. No console, calcule `-1 % 28` e `((-1 % 28) + 28) % 28`.
5. Faça a boca abrir e fechar pelo **relógio** em vez da distância e encoste numa parede.
6. Faça o Pac-Man virar um pouco **antes** do centro (os 3 ou 4 últimos pixels), como no jogo
   original — o "corte de curva" que dá vantagem a quem aperta cedo.

---

**Anterior:** [`01-labirinto`](../01-labirinto/) · **Próximo:** [`03-pastilhas`](../03-pastilhas/) — o labirinto vai sendo comido.
