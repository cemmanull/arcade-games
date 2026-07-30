# Pong — Passo 4: As raquetes

**Mudou:** `script.js`
**Rode:** abra o `index.html`. **W/S** move a raquete esquerda, **↑/↓** a direita.

---

## O que você vê

As duas raquetes obedecem — e a bola atravessa as duas como se fossem fantasmas.

Está certo: ninguém contou a ela que raquetes existem. Isso é o passo 5. Aproveite para
testar duas mãos ao mesmo tempo (W e ↑ juntos): as duas raquetes se movem
**simultaneamente**.

---

## A ideia central: quais teclas estão presas AGORA

```js
const teclasPressionadas = {};
document.addEventListener("keydown", e => teclasPressionadas[e.key.toLowerCase()] = true);
document.addEventListener("keyup",   e => teclasPressionadas[e.key.toLowerCase()] = false);
```

Um objeto que funciona como um **painel de interruptores**. A qualquer instante ele
responde: *esta tecla está pressionada agora?*

### Por que a cobrinha não precisava disso

| | Cobrinha | Pong |
|---|---|---|
| Pergunta | qual foi a **última** tecla? | quais estão **presas agora**? |
| Quem decide o movimento | o evento de teclado | o loop, no ritmo dele |
| Dois jogadores | impossível | de graça |
| Segurar a tecla | não faz diferença | move continuamente |

Na cobrinha, o evento **já decidia a jogada** (`direcao = "cima"`). Aqui ele só registra o
estado do teclado; quem move é o loop.

> **É este passo que destrava jogos de dois jogadores no mesmo teclado.** Com o modelo
> antigo é impossível: um evento de teclado por vez, e a última tecla apaga a anterior.

### `toLowerCase()` — uma hora economizada

Com Shift pressionado, `evento.key` devolve `"W"` em vez de `"w"`. Sem normalizar, a
raquete pararia de responder sem motivo aparente. É o tipo de bug que custa uma tarde e
some com uma chamada de função.

---

## Clamp

```js
raquete.y = Math.max(0, Math.min(raquete.y, tela.height - raquete.altura));
```

Prender um valor entre um mínimo e um máximo. Leia até ficar óbvio — **esta linha aparece
em todo jogo que existe.** Sem ela, a raquete sai pela borda e nunca mais volta.

Repare no desconto da altura, de novo: `y` é o canto de cima.

---

## Uma função que não sabe de quem é a raquete

```js
function moverRaquete(raquete, velocidade, tempo) { ... }
```

Ela não sabe se é a da esquerda ou a da direita, nem se o comando veio do teclado.

No passo 8, o computador vai usar **exatamente esta função** — e nenhuma linha aqui
precisará mudar. Escrever assim não custou nada a mais; é só uma questão de decidir o que a
função precisa saber.

---

## `preventDefault` no lugar certo

```js
if (["arrowup", "arrowdown"].includes(evento.key.toLowerCase())) {
    evento.preventDefault();
}
```

As setas rolam a página por padrão. Cancelamos **só para elas** — cancelar tudo quebraria
F5, Ctrl+C e a navegação por Tab, e você teria escrito uma página que prende o usuário.

---

## Experimente

1. Segure W e ↑ ao mesmo tempo. Agora imagine fazer isso com o teclado da cobrinha.
2. Segure Shift junto com W, depois comente o `toLowerCase()` e repita.
3. Mude `VELOCIDADE_DA_RAQUETE` para 300 e para 30.
4. Comente a linha do clamp e mande a raquete para cima até ela sumir.
5. Aceite também as setas na raquete esquerda, para poder jogar sozinho dos dois lados.
6. Faça a raquete **acelerar** enquanto a tecla está pressionada, em vez de ter velocidade
   fixa: guarde uma `velocidadeAtual` na raquete, some enquanto a tecla estiver presa e
   reduza quando soltar. O controle muda completamente de sensação.
7. Imprima o objeto no console — `console.log(teclasPressionadas)` — e observe os
   interruptores ligando e desligando.

---

**Anterior:** `03-paredes` · **Próximo:** `05-colisao` — a bola descobre as raquetes.
