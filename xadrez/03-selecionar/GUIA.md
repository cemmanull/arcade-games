# Xadrez — Passo 3: Selecionar e mover

**Mudou:** `script.js` e `style.css`
**Rode:** abra o `index.html`. Clique numa peça, depois numa casa.

---

## O que você vê

As peças se movem. **Sem regra nenhuma**: um peão anda para trás, um bispo vai para onde
quiser, um rei come o outro.

Está certo — as regras chegam no passo 4.

---

## Por que a interação vem antes das regras

Antes de ensinar o computador a *validar* um lance, precisamos de um jeito de *fazer* um
lance. A interação tem problemas próprios — seleção, destaque, ordem de operações — e eles
ficam muito mais fáceis de resolver isolados.

> Quando um problema tem duas partes independentes, resolva uma de cada vez. Juntar dois
> problemas não resolvidos é o jeito mais rápido de não resolver nenhum.

---

## Duas camadas de estado

```js
// estado do JOGO — onde as peças estão
let casas = [...];
let vezDe = BRANCAS;

// estado da INTERFACE — o que o usuário está fazendo
let casaSelecionada = null;
let ultimoLance = null;
```

`casaSelecionada` **não é uma informação sobre xadrez.** Uma posição de xadrez não tem
"casa selecionada" — isso é sobre o usuário, não sobre o jogo.

Manter as duas camadas separadas, mesmo dentro do mesmo arquivo, é o que vai permitir
dividi-las em **arquivos diferentes** lá no passo 7, sem retrabalho nenhum.

---

## O padrão "clicar duas vezes"

```js
function aoClicarNaCasa(indice) {
    if (casaSelecionada !== null) { ... ; return; }   // 1. é o destino
    if (peca !== null)            { ... ; return; }   // 2. seleciona
    casaSelecionada = null;                            // 3. limpa
}
```

Um clique escolhe a peça, o outro escolhe o destino. É o mesmo desenho de quase toda
interface de seleção: arquivos, células de planilha, itens de lista.

**A ordem dos casos importa**, e cada um sai com seu próprio `return`. Escrever os casos em
ordem de prioridade evita um `if/else` aninhado que ninguém consegue ler depois.

---

## A ordem que evita um bug

```js
casas[destino] = casas[origem];   // primeiro escreve
casas[origem] = null;             // depois apaga
```

Parece indiferente. Não é: **se origem e destino fossem a mesma casa**, apagar primeiro
faria a peça sumir.

> Sempre que uma operação envolve duas posições, teste mentalmente o caso em que elas são
> iguais. Copiar um array sobre ele mesmo, trocar dois valores, mover um arquivo para o
> lugar onde já está — a mesma armadilha aparece em todo lugar.

---

## `classList.toggle` com segundo argumento

```js
casa.classList.toggle("selecionada", indice === casaSelecionada);
```

Liga a classe se for `true`, desliga se for `false`. Substitui um `if/else` de quatro
linhas.

E repare na divisão: **o CSS decide como o destaque aparece; o JavaScript decide quando.**
Se um dia você quiser outro visual de seleção, muda-se um arquivo e nada mais.

---

## Um truque de CSS

```css
.casa.ultimo-lance {
    box-shadow: inset 0 0 0 100vmax rgba(247, 210, 106, 0.45);
}
```

Uma sombra interna gigantesca preenche a casa inteira com uma cor translúcida, deixando a
cor original aparecer por baixo. É o jeito de **tingir** um elemento sem trocar o
`background` — que já está ocupado dizendo se a casa é clara ou escura.

---

## Experimente

1. Mova o rei branco para cima do rei preto. O jogo permite — e é exatamente por isso que
   o passo 4 existe.
2. Inverta as duas linhas de `moverPeca` e depois clique duas vezes na **mesma** casa.
   A peça desaparece. Esse é o bug, ao vivo.
3. Faça a seleção só funcionar para as peças de quem tem a vez (uma linha em
   `aoClicarNaCasa`). É a primeira regra do jogo.
4. Guarde as peças capturadas num array e mostre-as embaixo do tabuleiro.
5. Faça um botão "desfazer". Você vai descobrir que precisa guardar mais coisas do que
   imaginava — segure essa sensação, o passo 6 resolve isso de um jeito elegante.
6. Destaque em vermelho a casa de destino quando ela tiver uma peça (uma captura).

---

**Anterior:** `02-pecas` · **Próximo:** `04-como-andam` — as peças aprendem a andar.
