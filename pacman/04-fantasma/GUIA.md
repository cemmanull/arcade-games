# Pac-Man — Passo 4: O fantasma

**Mudou:** os três arquivos (o placar conta as capturas)
**Rode:** abra o `index.html`. Fuja. Depois aperte **H** e veja o que ele está pensando.

---

## O que você vê

Um fantasma vermelho sai de cima da casa e vem atrás de você. Ele olha para onde vai. Quando
te alcança, os dois voltam ao começo e o placar conta uma captura. Com H, aparece uma linha do
fantasma até um quadradinho: o **alvo** dele.

Repare: ele persegue bem, mas às vezes escolhe o caminho errado e dá uma volta enorme.

---

## A regra do cruzamento

O jeito "certo" de perseguir seria calcular o caminho mais curto até o Pac-Man, contornando as
paredes. O jogo original não faz isso. Cada fantasma segue uma regra de uma frase:

> **Em cada cruzamento, vá para a casa vizinha que fica mais perto do alvo, em linha reta.
> Nunca dê meia-volta.**

```js
for (const direcao of ORDEM_DAS_DIRECOES) {
    if (saoOpostas(direcao, f.direcao) || !proximaCasaLivre(f, direcao)) continue;

    const dx = coluna + direcao.dx - alvo.coluna;
    const dy = linha + direcao.dy - alvo.linha;
    const distancia = dx * dx + dy * dy;

    if (distancia < menorDistancia) { menorDistancia = distancia; melhor = direcao; }
}
```

Três detalhes que fazem a regra funcionar:

| Detalhe | Sem ele |
|---|---|
| **em linha reta** (ignorando paredes) | — é a parte "burra", e é de propósito (abaixo) |
| **nunca dar meia-volta** | o fantasma treme para a frente e para trás num corredor, indeciso |
| **desempate fixo** (cima, esquerda, baixo, direita) | o mesmo cruzamento daria escolhas diferentes, e ninguém aprenderia o jeito dele |

E a distância é Pitágoras **sem a raiz**: para saber qual é a menor, os quadrados bastam.

### O erro é o que faz o jogo

"Em linha reta" ignora as paredes. Às vezes a casa mais perto em linha reta leva para longe de
verdade — e o fantasma entra num corredor que dá a volta no labirinto inteiro. Ele **erra**.

E é exatamente isso que deixa o jogador escapar. Um fantasma com o caminho perfeito seria
imbatível e chato. É a lição do adversário do Pong:

> **Dificuldade em jogos raramente é esperteza: é a margem de erro que você concede à
> máquina.**

Bom jogador de Pac-Man aprende onde cada fantasma erra — e usa isso.

---

## Andar separado de decidir

```js
function andar(entidade, distancia, decidir) {
    while (distancia > 0) {
        if (estaNoCentro(entidade)) {
            decidir(entidade);
            ...
        }
        ...
    }
}

andar(pacMan, VELOCIDADE_DO_PAC_MAN * tempo, decidirPacMan);
andar(fantasma, VELOCIDADE_DO_FANTASMA * tempo, decidirFantasma);
```

O movimento do passo 2 foi separado em duas partes: **como andar** (em pedaços, sem pular
centros) e **como escolher** (o que fazer num centro). `andar` não sabe quem está andando: ela
recebe a decisão como uma **função**.

O Pac-Man decide pela intenção do jogador; o fantasma, pela regra do cruzamento. O resto é
idêntico — e por isso o fantasma também desliza suave, também usa o túnel, também nunca entra
numa parede, sem uma linha a mais.

> **Passar uma função como argumento** é o que permite escrever o "como" uma vez e o "o quê"
> quantas vezes houver personagens.

---

## Colisão por igualdade, de volta

```js
const mesmaColuna = casaDe(pacMan.x) === casaDe(fantasma.x);
const mesmaLinha = casaDe(pacMan.y) === casaDe(fantasma.y);
```

Na cobrinha, colidir era comparar casas. No Pong, sobreposição de retângulos. Aqui, mesmo com
posições em pixels, a pergunta volta a ser de **grade**: os dois estão na mesma casa? É a regra
do jogo original, e é mais justa do que parece — encostar a pontinha não conta.

---

## Os olhos dizem para onde ele vai

```js
const ox = esquerda + olho + f.direcao.dx;
pincel.fillRect(ox + 1 + f.direcao.dx, oy + 2 + f.direcao.dy, 2, 2);   // pupila
```

Os olhos andam 1 pixel e as pupilas 2 na direção do movimento. O jogador lê a intenção do
fantasma **antes** de ele virar. É o "telegrafar" dos jogos de ação, em dois pixels.

---

## Mostrar o que a máquina pensa

A tecla H desenha o alvo e uma linha até ele. Inteligência artificial que ninguém vê é
impossível de entender e de consertar. **Desenhe o que ela está pensando.** No próximo passo,
com quatro fantasmas de alvos diferentes, essa tecla vai ser a melhor aula do módulo.

---

## Experimente

1. Deixe o fantasma dar meia-volta (tire o `saoOpostas(...)` da condição). Fuja dele num
   corredor longo.
2. Troque o `<` por `<=` no desempate. O comportamento muda? Onde?
3. Faça o fantasma mais rápido que você (`VELOCIDADE_DO_FANTASMA = 65`). Ainda dá para fugir?
   Agora 40.
4. Com H ligado, encontre um lugar do labirinto onde o fantasma escolhe o caminho errado.
5. Mude o alvo para um canto fixo (`{ coluna: 26, linha: 1 }`). O que ele faz quando chega lá?
6. Troque a distância em linha reta pela **distância de Manhattan** (`Math.abs(dx) +
   Math.abs(dy)`). Ele persegue melhor ou pior?

---

**Anterior:** `03-pastilhas` · **Próximo:** `05-personalidades` — quatro fantasmas, quatro
alvos.
