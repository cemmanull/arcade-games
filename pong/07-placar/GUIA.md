# Pong — Passo 7: O placar

**Mudou:** os três arquivos
**Rode:** abra o `index.html`. Primeiro a 5 pontos vence.

---

## O que você vê

Um jogo com começo, meio e fim: placar, pausa antes de cada saque, e um vencedor.

---

## 1. Texto é HTML, gráfico é canvas

O placar e a mensagem de fim **não são desenhados**. São elementos da página, alterados
por JavaScript:

```js
pontosEsquerda.textContent = placarEsquerda;
camadaMensagem.hidden = false;
```

Por quê? Porque texto de verdade pode ser selecionado, traduzido, ampliado e **lido em voz
alta por um leitor de tela**. O que é pintado no canvas é só uma imagem muda.

> **Se é texto, use HTML. Se é gráfico, use canvas.** Vale para placares, menus, botões e
> praticamente tudo que não seja o jogo em si.

E repare: a camada de fim de jogo **já existia** no HTML, escondida pelo atributo `hidden`.
Terminar a partida é só removê-lo. Mostrar algo que já existe é mais simples do que criar
elementos por código.

---

## 2. Estado real e estado visível

```js
let placarEsquerda = 0;                       // a verdade
pontosEsquerda.textContent = placarEsquerda;  // o espelho
```

O placar mora nas variáveis. Os elementos da página apenas mostram.

Nunca leia o número de volta da tela para fazer contas. No instante em que você trata o DOM
como fonte de verdade, o programa passa a depender de *como as coisas estão escritas* — e
quebra quando alguém trocar `3` por `Pontos: 3`.

---

## 3. Máquina de estados

```js
let estado = "jogando";   // "jogando" | "fim"
```

Uma variável de texto substitui vários booleanos soltos (`jogando`, `acabou`, `pausado`).

Com booleanos separados é possível cair em combinações impossíveis — "acabou **e**
jogando" — e ninguém sabe o que a tela deveria mostrar. O bug aparece uma vez a cada cem
partidas e é impossível de reproduzir.

Com um estado só, isso não existe: ele é sempre exatamente um valor.

> Todo jogo tem essa variável em algum lugar. No passo final ela ganha `"menu"` e
> `"pausado"`, sem que nada mais precise mudar.

Note o efeito no loop:

```js
if (estado === "jogando") atualizar(tempo);
desenhar();   // desenha sempre
```

Quando a partida acaba, paramos de atualizar mas continuamos desenhando — assim a cena
final permanece na tela, sob a mensagem.

---

## 4. Guard clause na pausa do saque

```js
if (tempoDePausaDoSaque > 0) {
    tempoDePausaDoSaque -= tempo;
    return;
}
```

Durante a pausa, as raquetes se movem mas a bola espera — o jogador tem um instante para se
posicionar. Detalhe pequeno, e sem ele o saque parece injusto.

O `return` trata o caso especial e sai, em vez de embrulhar todo o resto da função num
`if`. O caminho normal fica reto.

---

## 5. Um truque de intermitência

```js
Math.floor(tempoDePausaDoSaque * 8) % 2 === 0
```

Alterna entre verdadeiro e falso oito vezes por segundo, fazendo a bola piscar durante a
pausa — **sem nenhum cronômetro extra**.

O mesmo truque serve para qualquer coisa que precise piscar: um texto de "insira ficha",
um personagem invulnerável depois de levar dano, um cursor de texto.

---

## Experimente

1. Mude `PONTOS_PARA_VENCER` para 1 e jogue uma partida relâmpago.
2. Mude `PAUSA_ANTES_DO_SAQUE` para 3 segundos e depois para 0.
3. Faça o saque ir sempre para quem **ganhou** o ponto, em vez de quem perdeu, e sinta a
   diferença de ritmo.
4. Adicione um terceiro estado, `"pausado"`, ligado à tecla P. Você vai precisar mexer em
   duas linhas — é o retorno da máquina de estados.
5. Mostre a mensagem "Ponto!" por meio segundo depois de cada ponto.
6. Faça a bola piscar mais devagar (troque o 8) e depois pisque a **raquete** de quem
   perdeu o ponto.
7. Guarde o recorde de partidas ganhas no `localStorage` e mostre embaixo do placar.

---

**Anterior:** `06-angulo` · **Próximo:** `08-computador` — um adversário que não dorme.
