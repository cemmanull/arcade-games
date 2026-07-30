# Passo 4 — Movimento

**Mudou:** `script.js`
**Rode:** abra o `index.html`.

---

## O que você vê

O quadrado anda para a direita, sozinho... e some pela borda. Depois disso, tela vazia.

**Está certo.** Ele continua andando — na coluna 40, 90, 300, muito além do tabuleiro.
O jogo não sabe que existem paredes; ninguém contou. Isso é o passo 8.

Aproveite para olhar de perto: neste momento o seu jogo tem um **bug** que você entende
por completo. Essa é a situação mais confortável que existe em programação, e vale mais
do que código que funciona por motivo desconhecido.

---

## Conceitos deste passo

### O game loop

Todo jogo, do Pong ao Zelda, é este ciclo repetido muitas vezes por segundo:

```
atualizar o estado  →  desenhar  →  repetir
```

No código:

```js
function darUmPasso() {
    cabeca.coluna += 1;   // atualizar
    desenhar();           // desenhar
}
setInterval(darUmPasso, 150);   // repetir
```

Sete vezes por segundo, para sempre. Todo o resto do projeto vai ser detalhe **dentro**
de um desses dois momentos.

### Estado: `let` vs `const`

```js
let cabeca = { coluna: 5, linha: 5 };
```

Agora a diferença é real. `const` não deixaria a posição mudar — e o JavaScript avisaria
com um erro, o que é bom: ele está protegendo o que você declarou como fixo.

Regra prática: **use `const` por padrão, e troque para `let` só quando o compilador
reclamar.** Assim quem lê o código sabe, de relance, o que fica parado — e o que fica
parado é onde não pode haver bug.

O conjunto de variáveis `let` de um jogo é a sua **memória**: a qualquer instante, elas
descrevem por completo a situação da partida. Quando algo se comporta de forma estranha,
é sempre aqui que se olha primeiro.

### Funções

```js
function desenhar() { ... }   // declara: guarda o bloco com um nome
desenhar();                   // chama: agora sim executa
```

Declarar **não** executa. Uma função é uma receita guardada; ela só acontece quando
alguém a chama.

Duas coisas que uma boa função tem:

- **faz uma coisa só** — `darUmPasso` atualiza, `desenhar` pinta;
- **o nome diz qual** — se você precisa ler o corpo para saber o que ela faz, o nome
  está ruim.

### Apagar e repintar

Não existe "mover" no canvas. Não existem objetos: existe tinta.

Para o quadrado parecer andar, pintamos o fundo **por cima de tudo** e redesenhamos a
cena inteira um pouco adiante. É um flipbook, quadro a quadro.

Parece desperdício repintar 160 mil pixels sete vezes por segundo. Não é — e, o mais
importante, é a forma **mais simples**. Tentar apagar só o pedaço que mudou é uma
otimização, e otimização sem necessidade medida só rende bug.

> **Meça antes de otimizar.** Enquanto está rápido o bastante, o código mais simples é o
> código certo.

### Função sem parênteses

```js
setInterval(darUmPasso, 150);     // certo
setInterval(darUmPasso(), 150);   // errado
```

| Escrita | Significa |
|---|---|
| `darUmPasso` | a função **em si**, entregue para alguém chamar depois |
| `darUmPasso()` | execute **agora** e me devolva o resultado |

Com os parênteses, você executa a função uma vez, entrega o resultado (`undefined`) ao
`setInterval`, e nada mais acontece nunca. É um erro tão comum que vale decorar a frase:
**passar uma função é passar o nome, sem parênteses.**

### Por que o `desenhar()` no final

`setInterval` espera o intervalo **antes** da primeira execução. Sem essa chamada extra,
a tela ficaria vazia por 150 milissegundos. É pouco — mas em telas de carregamento mais
lentas esse "pisca" aparece, e a correção custa uma linha.

---

## Experimente

1. Troque `MILISSEGUNDOS_POR_PASSO` para `1000` e depois para `30`. Você acabou de
   descobrir onde mora a dificuldade do jogo.
2. Troque `cabeca.coluna += 1` por `cabeca.linha += 1`. Ele desce. Some as duas e ele vai
   na diagonal.
3. Apague o `desenhar()` de dentro de `darUmPasso`. O quadrado congela — mas o estado
   continua mudando por baixo. Abra o console (F12) e escreva `cabeca` para ver o número
   crescendo com a tela parada. **Estado e imagem são coisas separadas**, e essa é a
   lição inteira do passo.
4. Apague as duas linhas do fundo dentro de `desenhar`. Sem apagar o quadro anterior, o
   quadrado deixa um rastro sólido. Aliás: é assim que se desenha um rastro de propósito.
5. Troque `setInterval` por `setTimeout` (mesma sintaxe). Ele anda **uma vez** e para —
   é essa a diferença entre os dois.

---

**Anterior:** `03-desenho` · **Próximo:** `05-teclado` — quem manda passa a ser você.
