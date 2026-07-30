# Xadrez — Passo 5: Xeque, mate e afogamento

**Mudou:** `script.js` e `style.css`
**Rode:** abra o `index.html`.

---

## O que você vê

As peças cravadas não saem mais do lugar. O rei em xeque fica em destaque vermelho. A
partida termina em xeque-mate ou afogamento.

**Ainda falta:** roque, en passant e promoção. Isso é o passo 6.

---

## A ideia: gerar em duas etapas

```js
gerarMovimentosLegais = gerarMovimentosPseudoLegais().filter(destino => {
    const depois = aplicarEmCopia(tabuleiro, origem, destino);
    return !estaEmXeque(depois, peca.cor);
});
```

1. **Pseudo-legais** — respeitam como a peça anda, ignorando o rei.
2. **Legais** — dos pseudo-legais, ficam os que não deixam o próprio rei atacado.

E como testamos isso? **Executando** o movimento numa cópia e olhando o resultado.

### Por que não gerar direto os legais

Porque as regras de **cravada** — a peça que não pode sair porque o rei ficaria exposto —
são cheias de exceções. Uma peça pode estar cravada por uma torre, por um bispo, na
diagonal, na horizontal; e existe até um caso em que uma captura *en passant* expõe o rei
na horizontal **sem que nenhuma das duas peças estivesse cravada**.

Executar e olhar é mais lento e é **sempre correto**.

> **Numa primeira implementação, correto vale mais do que rápido.** Otimize depois de
> medir, e só se precisar.

### Uma linha, quatro regras

Aquele `filter` faz desaparecer, de uma vez:

- a cravada;
- a obrigação de responder ao xeque;
- a proibição de mover o rei para uma casa atacada;
- a proibição de deixar o rei em xeque por descuido.

**Nenhuma delas está escrita em lugar nenhum.** Todas são consequência da mesma regra
geral.

> É o tipo de solução que vale procurar: uma regra geral que faz várias regras específicas
> desaparecerem. Quando você se pegar escrevendo o quinto caso especial, pare e procure a
> regra que os engloba.

---

## A refatoração que tornou isso possível

```js
// antes
function gerarMovimentos(origem)          { ... casas[origem] ... }

// agora
function gerarMovimentosPseudoLegais(tabuleiro, origem) { ... }
```

A geração passou a **receber o tabuleiro como parâmetro**, em vez de ler a variável global.

Sem isso não daria para perguntar *"e se eu jogasse isto?"* — a função só sabia responder
sobre a posição atual. Depender de uma variável global amarra a função a um único contexto.

> **Uma função que recebe tudo de que precisa pode ser usada em qualquer lugar.** Uma que
> lê variáveis globais só serve onde aquelas variáveis existem — e é impossível de testar.

Este é o mesmo movimento que, no passo 7, vai permitir ao computador explorar milhares de
posições hipotéticas.

---

## `casaAtacada` — olhar em volta, não perguntar a todos

Poderíamos gerar **todos** os movimentos do adversário e ver se algum chega à casa.
Funciona, e é lento.

O caminho inverso é mais rápido e mais fácil de entender: **saímos da casa em cada direção
e perguntamos "quem eu encontro por aqui poderia me atacar de lá?"**.

É a mesma ideia de descobrir quem está te olhando: em vez de perguntar a todo mundo da sala
para onde está olhando, você olha em volta.

### Duas armadilhas

**O sinal do peão.** Um peão ataca na diagonal *para a frente dele*. Como queremos saber de
onde ele viria, **subtraímos** o avanço:

```js
const linhaPeao = linha - avancoDoAtacante;
```

Errar esse sinal produz um bug curioso: o rei consegue andar para casas atacadas por peões
— e só por peões.

**O `break` dos deslizantes.** A primeira peça encontrada numa direção é a única que
importa: ela bloqueia tudo o que vem atrás. Esquecer o `break` faz uma torre "atacar"
através de outra peça.

---

## Estado imutável, primeira aparição

```js
function aplicarEmCopia(tabuleiro, origem, destino) {
    const copia = tabuleiro.slice();
    ...
    return copia;   // um tabuleiro NOVO; o original fica intacto
}
```

`slice()` copia o array. As peças em si não precisam ser copiadas porque **nunca mudam** —
foi para isso que as congelamos no passo 2.

Copiar 64 posições parece caro. Não é, e é o que permite perguntar "e se eu jogasse isto?"
sem risco nenhum de bagunçar a partida em andamento.

No passo 6 essa decisão paga um dividendo inesperado: **desfazer um lance vira uma linha**.

---

## Mate e afogamento: uma condição de diferença

```js
if (naoTemMovimentoLegal) {
    return estaEmXeque ? "xeque-mate" : "afogamento";
}
```

A pergunta decisiva é sempre a mesma: **o jogador da vez tem algum movimento legal?**

- não tem **e** está em xeque → xeque-mate;
- não tem **e não** está → afogamento, que é empate.

Repare que os dois diferem por uma única condição. É por isso que, no xadrez, dar mate com
pouca vantagem é difícil: é fácil demais tirar todas as jogadas do adversário sem que ele
esteja em xeque — e a partida que você estava ganhando vira empate.

---

## A interface não decide nada sobre xadrez

```js
const mensagens = {
    "em-andamento": `Vez das ${ladoDaVez}`,
    "xeque": `Xeque! Vez das ${ladoDaVez}`,
    "xeque-mate": `Xeque-mate — as ${ladoAdversario} vencem`,
    "afogamento": "Empate por afogamento"
};
```

`situacaoDaPartida` devolve um dos quatro estados; a interface só **traduz** isso para uma
frase.

Essa separação — quem decide vs quem mostra — é a mesma que vai virar dois arquivos no
passo 7.

---

## Experimente

No console:

1. `casas = carregarPosicao("6k1/5ppp/8/8/8/8/8/R5K1"); desenhar()` — e jogue a torre para
   a8. Mate em um lance.
2. `casas = carregarPosicao("7k/5Q2/6K1/8/8/8/8/8"); vezDe = "pretas"; desenhar()` —
   afogamento: as pretas não estão em xeque e não têm lance nenhum.
3. `estaEmXeque(casas, "brancas")` · `casaAtacada(casas, 28, "pretas")`
4. `todosOsMovimentosLegais(casas, "brancas").length` — na posição inicial, 20.

No código:

5. Comente o `filter` de `gerarMovimentosLegais` e mova uma peça cravada. É a regra
   inteira, desaparecendo.
6. Troque `linha - avancoDoAtacante` por `linha + avancoDoAtacante` e tente andar com o rei
   para uma casa atacada por peão. Bug ao vivo.
7. Tire o `break` de `encontraDeslizante` e observe reis que não conseguem se mover para
   casas perfeitamente seguras.
8. Some a regra dos 50 lances: um contador que zera a cada captura ou lance de peão.

---

**Anterior:** `04-como-andam` · **Próximo:** `06-especiais` — as três regras que todo mundo
esquece.
