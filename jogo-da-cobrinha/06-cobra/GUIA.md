# Passo 6 — A cobra

**Mudou:** `script.js`
**Rode:** abra o `index.html`. Setas para dirigir, **barra de espaço para crescer**.

---

## O que você vê

Uma cobra de cinco segmentos deslizando. Cada toque na barra de espaço a deixa um
quadradinho mais longa.

(A barra de espaço é um **andaime temporário**, só para você ver o crescimento
funcionando. No passo 7 quem faz crescer é a maçã, e essas linhas somem.)

---

## A ideia central: a cobra nunca anda

```
       ┌───┬───┬───┬───┬───┐
antes  │ C │ ■ │ ■ │ ■ │ ■ │
       └───┴───┴───┴───┴───┘

           ↓ nasce uma cabeça na frente (unshift)
           ↓ some a cauda no fim         (pop)

       ┌───┬───┬───┬───┬───┐
depois │ C │ ■ │ ■ │ ■ │ ■ │   ← a mesma cobra, uma casa adiante
       └───┴───┴───┴───┴───┘
```

Nenhum segmento se moveu. Nenhum foi recalculado. Uma entrou, outra saiu.

Pense numa fila de pessoas: se alguém entra na frente e alguém sai no fim, ninguém
precisa dar um passo — mas, de longe, a fila andou.

E o crescimento é ainda mais bonito:

```js
cobra.unshift(cabeca);
if (deveCrescer) { deveCrescer = false; } else { cobra.pop(); }
```

**Não existe código de crescimento.** Crescer é simplesmente *não remover a cauda*. A
funcionalidade é a ausência de uma linha.

> Quando um problema parece exigir código complicado, quase sempre existe uma
> representação dos dados que o dissolve. Procure a representação antes de escrever o
> algoritmo.

---

## Conceitos deste passo

### Array

```js
let cobra = [ { coluna: 5, linha: 5 }, { coluna: 4, linha: 5 } ];
```

Uma lista ordenada. `cobra[0]` é o primeiro item, `cobra.length` diz quantos são,
`cobra[cobra.length - 1]` é o último.

Aqui a **ordem carrega informação**: a peça 0 é a cabeça, a última é a ponta da cauda.
Isso não é um detalhe de implementação — é metade da lógica do jogo.

### Os quatro métodos de ponta

| Método | Onde age | O que faz |
|---|---|---|
| `unshift(item)` | início | insere |
| `shift()` | início | remove e devolve |
| `push(item)` | fim | insere |
| `pop()` | fim | remove e devolve |

Usamos `unshift` + `pop`: entra na frente, sai atrás. (Com `push` + `shift` a cobra
funcionaria igual, com a cabeça no fim da lista. Escolhemos cabeça em `[0]` porque é a
peça mais consultada, e `cobra[0]` se lê melhor.)

### `forEach`

```js
cobra.forEach(parte => { ... });
```

*"Para cada item da lista, faça isto."* `parte` é o nome que damos a cada item enquanto
ele passa.

A alternativa é um `for` com contador. O `forEach` diz a mesma coisa com menos peças
móveis: não há contador para inicializar errado, nem condição de parada para escrever ao
contrário — as duas fontes clássicas do erro de "um a mais, um a menos".

### Cópia de objeto — a armadilha

```js
const cabeca = cobra[0];         // ERRADO
const cabeca = { ...cobra[0] };  // certo
```

Objetos **não são copiados** quando você os atribui. Os dois nomes passam a apontar para
o mesmo objeto na memória. Alterar `cabeca` alteraria também a peça que já está dentro
da lista — e a cobra se deformaria de um jeito difícil de rastrear, porque o erro
acontece longe de onde aparece.

As três reticências (`...`, chamadas *spread*) copiam os valores para um objeto **novo**.

> **Para alterar um objeto sem afetar o original, copie primeiro.** É a causa de uma
> parcela enorme dos bugs difíceis de JavaScript.

### Função que devolve valor

```js
function calcularProximaCabeca() {
    ...
    return cabeca;
}
```

Duas famílias de função, e vale saber em qual você está:

- as que **calculam e devolvem** algo, sem mexer em nada (`calcularProximaCabeca`);
- as que **fazem** algo, alterando o estado ou a tela (`darUmPasso`, `desenhar`).

As da primeira família são muito mais fáceis de entender e testar, porque não têm como
estragar nada por acidente. Quando puder escolher, escolha a primeira.

### `!==` e a proibição do meia-volta

Com corpo atrás da cabeça, virar 180° faria a cabeça entrar no próprio pescoço. Daí a
condição: só aceita a virada se ela não for o oposto exato da direção atual.

Sobre o operador: use sempre `===` e `!==` (três caracteres). Os de dois (`==`, `!=`)
convertem os tipos sozinhos e produzem surpresas como `"5" == 5` sendo verdadeiro, ou
`0 == ""` também. Não há motivo para usá-los.

---

## Experimente

1. Cresça bastante e passe por cima do próprio corpo. Nada acontece — o jogo ainda não
   sabe que isso é proibido. Passo 8.
2. Troque `cobra.unshift(cabeca)` por `cobra.push(cabeca)`. A cobra "anda" ao contrário,
   deixando a cauda para trás: a ordem da lista era mesmo informação.
3. Comente o `cobra.pop()`. Ela cresce para sempre e vira uma cobra-minhoca infinita.
4. Troque `{ ...cobra[0] }` por `cobra[0]` e dirija um pouco. O resultado é bizarro — e é
   exatamente a armadilha da cópia, ao vivo. Depois desfaça.
5. Comece com 15 segmentos, mudando o array inicial. Digitar 15 objetos à mão é chato;
   pense em como você geraria essa lista com um laço.
6. Pinte a cabeça de outra cor. Dica: `forEach` também entrega o índice —
   `cobra.forEach((parte, indice) => ...)` — e o índice 0 é a cabeça.

---

**Anterior:** `05-teclado` · **Próximo:** `07-maca` — algo para comer.
