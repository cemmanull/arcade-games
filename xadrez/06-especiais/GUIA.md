# Xadrez — Passo 6: As regras especiais

**Mudou:** `script.js`
**Rode:** abra o `index.html`. **Z** desfaz um lance.

---

## O que você vê

O xadrez completo. Roque, en passant, promoção, empate por 50 lances e por material
insuficiente. E um "desfazer" que funciona perfeitamente com todas essas regras.

---

## Três regras, três suposições quebradas

Cada uma delas derruba algo que o código vinha assumindo:

| Regra | O que ela quebra |
|---|---|
| **Roque** | um lance move **duas** peças |
| **En passant** | a peça capturada **não está** na casa de destino |
| **Promoção** | um mesmo destino gera **quatro** lances diferentes |

Por isso um movimento deixa de ser um número (o destino) e passa a ser um **objeto** que
descreve o lance inteiro:

```js
{ origem, destino, peca, capturada, promocao, ehRoque, ehEnPassant }
```

> Quando três casos especiais não cabem na sua representação, o problema não são os casos:
> é a representação. Trocá-la é quase sempre mais barato do que remendar.

---

## Uma posição é mais do que as peças

```js
{
    casas,                     // onde estão as peças
    vezDe,                     // de quem é a vez
    direitosDeRoque,           // quem ainda pode rocar
    alvoEnPassant,             // vale por um único lance
    meiosLancesSemProgresso    // para a regra dos 50 lances
}
```

As quatro últimas são **história, não geometria**: não dá para olhar um tabuleiro e
descobri-las. Você não tem como saber, vendo as peças, se aquele rei já se mexeu.

Guardar só as peças e perceber isso tarde é um dos erros mais comuns de quem programa
xadrez — e a correção obriga a mexer em tudo.

---

## As armadilhas, uma a uma

### En passant: a peça não está onde você a captura

```js
const linhaDoCapturado = linhaDe(movimento.origem);
const colunaDoCapturado = colunaDe(movimento.destino);
casas[indiceDe(linhaDoCapturado, colunaDoCapturado)] = null;
```

O peão capturado está **ao lado** do destino, não nele. Limpar só a casa de destino deixa
um peão fantasma no tabuleiro.

E o alvo dura **um único lance**: se você não capturar agora, perdeu a chance.

### Roque: cinco condições

1. o direito ainda existe (nem rei nem **aquela** torre se moveram);
2. as casas entre rei e torre estão vazias;
3. o rei não está em xeque agora;
4. o rei não **passa** por casa atacada;
5. o rei não **termina** em casa atacada — esta o filtro de legalidade resolve sozinho.

A número 4 é a mais esquecida.

### O direito de roque se perde de três jeitos

```js
for (const casa of [origem, destino]) {
    if (casa === 63) direitos.brancasRei = false;   // h1
    ...
}
```

Rei moveu, torre moveu — e **torre capturada na casa original**. Este terceiro é o que
quase todo mundo esquece: se a sua torre de h1 é capturada, você não pode mais rocar
daquele lado, e o lance nem foi seu.

Repare no truque: verificar `origem` **e** `destino` cobre os dois casos com o mesmo laço.
Basta a casa estar envolvida no lance.

### Promoção: quatro lances, não um

```js
for (const tipo of ["dama", "torre", "bispo", "cavalo"]) {
    movimentos.push(criarMovimento(estado, origem, destino, { promocao: tipo }));
}
```

Promover a cavalo parece inútil — e é o único jeito de dar xeque em certas posições, o que
decide partidas. Gerar as quatro opções é o que torna o gerador **correto**.

---

## O dividendo: desfazer em uma linha

```js
function desfazer() {
    estado = historico.pop();
}
```

É isso. Não existe "desfazer o roque", nem "devolver a peça capturada", nem "restaurar o
direito de rocar".

Isso é consequência direta de uma decisão tomada lá atrás: **`aplicarMovimento` devolve um
estado novo e nunca altera o antigo.**

A alternativa comum — modificar o tabuleiro e ter uma função `desfazer` que reverte cada
mudança — é onde nascem os piores bugs de um programa de xadrez. Basta esquecer de
restaurar um campo para tudo o que vem depois ficar corrompido, silenciosamente, de um
jeito que só aparece dez lances adiante.

> **Estado imutável custa cópias e economiza depuração.** Numa aplicação pequena, é quase
> sempre um bom negócio — e no passo 7 essa mesma decisão vai permitir ao computador
> explorar milhares de posições sem risco nenhum.

---

## Empates que não são afogamento

- **50 lances** sem captura nem movimento de peão (contamos 100 meios-lances);
- **material insuficiente**: rei contra rei, rei e bispo, rei e cavalo — não existe mate
  possível, e a partida acaba na hora.

Falta a **repetição tripla**, que exige guardar um resumo de cada posição já ocorrida. É um
exercício do guia final.

---

## Experimente

No console:

1. **En passant:**
   `estado = carregarFEN("4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1"); desenhar()`
   Capture com o peão de e5 para d6 e veja o peão de d5 sumir.
2. **Promoção:** `estado = carregarFEN("4k3/P7/8/8/8/8/8/4K3 w - - 0 1"); desenhar()`
3. **Roque:** `estado = carregarFEN("r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1"); desenhar()`
   Mova o rei duas casas, para os dois lados.
4. `gerarMovimentosLegais(estado).length` na posição inicial → 20.
5. Aperte **Z** várias vezes depois de uma sequência com roque e captura.

No código:

6. Tire a linha que remove o peão no en passant e capture. Peão fantasma.
7. Comente a condição 4 do roque (a casa por onde o rei passa) e monte uma posição em que
   o rei atravessa um ataque. O jogo aceita um lance ilegal.
8. Gere só a promoção a dama e procure uma posição em que promover a cavalo dá mate.
9. Implemente a **repetição tripla**: guarde um resumo de cada posição num array e declare
   empate na terceira ocorrência.

---

**Anterior:** `05-xeque` · **Próximo:** `07-computador` — o arquivo fica grande demais, e
um adversário aparece.
