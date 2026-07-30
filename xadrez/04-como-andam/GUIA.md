# Xadrez — Passo 4: Como as peças andam

**Mudou:** `script.js`
**Rode:** abra o `index.html`. Clique numa peça para ver seus movimentos.

---

## O que você vê

Cada peça respeita o próprio movimento. Bolinhas marcam os destinos livres, anéis marcam
capturas.

**Ainda falta:** nada impede que você deixe o próprio rei em xeque. Um bispo cravado sai
tranquilamente da frente do rei. Isso é o passo 5.

---

## A descoberta: seis peças, três padrões

| Padrão | Peças | Como funciona |
|---|---|---|
| **Deslizantes** | bispo, torre, dama | andam numa direção até esbarrar em alguém |
| **Saltadores** | cavalo, rei | um passo único em cada direção |
| **O peão** | peão | um caso à parte, com quatro regras próprias |

E as combinações caem de graça:

```js
const PASSOS_DO_REI = [...RETAS, ...DIAGONAIS];
case "dama": return deslizando(origem, peca, [...RETAS, ...DIAGONAIS]);
```

Leia o que essas linhas **dizem**: o rei anda como torre e bispo, um passo de cada vez; a
dama é a mesma coisa sem o limite de um passo.

> Perceber que dama = torre + bispo, e que rei = cavalo com outras direções, economiza
> metade do código. **Procurar regularidade antes de sair escrevendo é o que separa 80
> linhas de 300.**

---

## Direções como pares

```js
const RETAS = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const SALTOS_DO_CAVALO = [[-2, -1], [-2, 1], [-1, -2], ...];
```

Cada direção é `[variação de linha, variação de coluna]`.

Seria tentador somar direto ao índice (`indice - 17` para um salto de cavalo). **Não faça
isso:** é o bug clássico do cavalo que sai pela borda direita e reaparece na esquerda,
porque o array é plano e não conhece as bordas.

Trabalhando em linha/coluna, a verificação de limites fica explícita e em um lugar só:

```js
if (!dentroDoTabuleiro(linha, coluna)) continue;
```

---

## Deslizar vs saltar

**Deslizantes** têm um `while` e um `break`:

```js
while (dentroDoTabuleiro(linha, coluna)) {
    if (ocupante === null) { destinos.push(destino); }
    else {
        if (ocupante.cor !== peca.cor) destinos.push(destino);  // captura
        break;                                                  // e para
    }
    linha += passoLinha;
    coluna += passoColuna;
}
```

O `break` trata as duas formas de parar: peça inimiga (pode capturar, e para) e peça aliada
(nem isso). **Uma peça bloqueia tudo o que vem atrás dela.**

**Saltadores** não têm `while` nem `break` — o cavalo pula por cima de tudo, e o rei anda
uma casa só.

---

## O peão: a peça mais complicada do xadrez

E por um motivo curioso: **ele é o único que anda de um jeito e captura de outro.**

| Regra | Detalhe |
|---|---|
| Anda uma casa à frente | só se estiver **livre** |
| Duas casas na estreia | só da fileira inicial, e com o caminho livre |
| Captura na diagonal | só se houver **inimigo** lá |
| En passant | passo 6 |

Repare no `!== null` da captura: o peão **não** pode ir na diagonal para uma casa vazia. É
a única peça em que "andar" e "capturar" são conjuntos diferentes de casas.

E é a única que não pode voltar — por isso precisa saber para que lado é "frente", o que
depende da cor:

```js
const avanco = peca.cor === BRANCAS ? -1 : 1;   // brancas sobem: linha diminui
```

---

## Funções que só calculam

```js
function gerarMovimentos(origem) { ... return destinos; }
```

Não move nada, não desenha nada, não altera nada. Só recebe e devolve.

Fácil de ler, fácil de testar, **impossível de estragar algo por acidente**. E é exatamente
por isso que o computador vai poder chamá-la milhares de vezes por jogada, no passo 7, sem
risco nenhum de bagunçar a partida em andamento.

> Quando puder escolher entre uma função que **calcula** e uma que **faz**, escolha a que
> calcula.

---

## Experimente

No console:

1. `gerarMovimentos(57)` — os saltos do cavalo de b1. Devem ser dois.
2. `gerarMovimentos(56)` — a torre de a1, presa: lista vazia.
3. `gerarMovimentos(48).map(nomeDaCasa)` — o peão de a2 e suas duas opções.

No código:

4. Faça o cavalo andar como uma dama, trocando o `case` dele. Depois desfaça.
5. Dê ao rei o movimento de deslizante (`deslizando` em vez de `comSaltos`) e veja o que um
   `while` a mais faz.
6. Adicione uma peça inventada: a **imperatriz**, que anda como torre **e** como cavalo.
   Você vai precisar de uma linha só. *(Dica: junte os dois resultados com `concat` ou
   reticências.)*
7. Faça o peão poder avançar duas casas **sempre**, e sinta como uma regra pequena muda o
   jogo inteiro.
8. Encontre um bispo cravado na frente do rei e mova-o. O jogo permite — e é por isso que
   existe o passo 5.

---

**Anterior:** `03-selecionar` · **Próximo:** `05-xeque` — a regra que amarra todas as outras.
