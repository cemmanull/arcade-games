# Pong — Passo 8: O computador

**Mudou:** os três arquivos
**Rode:** abra o `index.html`. W/S ou setas jogam pela esquerda.

---

## O que você vê

Um adversário. Dá para jogar sozinho, alternar para dois jogadores, e recomeçar sem
recarregar a página.

---

## A lição principal

> **Não existe inteligência aqui. Existe uma limitação deliberada.**

Um oponente que simplesmente copiasse a altura da bola seria **imbatível** — e chatíssimo.
Duas linhas bastariam:

```js
raqueteDireita.y = bola.y - raqueteDireita.altura / 2;   // impossível de vencer
```

O que faz dele um bom adversário são três restrições que **escolhemos** dar a ele.

### Decisão 1 — velocidade menor que a sua

```js
const VELOCIDADE_DA_RAQUETE_DO_PC = 68;   // a sua é 95
```

Em ângulos fechados, ele não chega a tempo. **É isto que o torna vencível**, e é o botão de
dificuldade do jogo inteiro.

### Decisão 2 — volta ao centro quando a bola se afasta

```js
const alvo = bolaVemNaMinhaDirecao ? centroDaBola : tela.height / 2;
```

Além de mais realista, isso dá ao jogador a chance de jogar num canto — o que **cria
jogadas**. Um adversário que persegue sempre não deixa nada acontecer.

### Decisão 3 — zona morta

```js
if (Math.abs(distancia) < 2) return;
```

Sem isso, a raquete vibraria sem parar em volta do alvo, passando dele para um lado e para
o outro a cada quadro. É o mesmo tipo de oscilação que faz um termostato barato ligar e
desligar sem descanso.

> **Dificuldade em jogos raramente é esperteza: é a margem de erro que você concede à
> máquina.** Guarde isso — vale para o oponente de xadrez também, onde a "inteligência" é
> só quantos lances ele enxerga à frente.

---

## O retorno de uma função bem escrita

```js
moverRaquete(raqueteDireita, direcao * VELOCIDADE_DA_RAQUETE_DO_PC, tempo);
```

O computador chama **a mesma função** que o teclado usa. Ela foi escrita no passo 4 sem
saber que isso aconteceria, e não precisou de **nenhuma** alteração.

Isso não foi sorte nem visão de futuro: foi só uma decisão sobre o que a função precisava
saber. Ela recebe uma velocidade e um tempo — de onde vieram, não é problema dela.

---

## Reiniciar sem recarregar

```js
function novaPartida() {
    placarEsquerda = 0;
    placarDireita = 0;
    estado = "jogando";
    ...
}
```

Toda a preparação de uma partida vive numa função só. É isso que transforma **"um jogo que
roda"** em **"um jogo que se pode jogar de novo"** — e reiniciar deixa de ser um recurso
extra para virar consequência da organização.

---

## Botões sem `onclick`

O HTML declara `<button id="botao-modo">`. O que ele **faz** está no JavaScript:

```js
botaoModo.addEventListener("click", () => { ... });
```

Estrutura é estrutura, comportamento é comportamento.

---

## Experimente

1. Mude `VELOCIDADE_DA_RAQUETE_DO_PC` para 95 (igual à sua) e tente ganhar. Depois para 40.
2. Faça o oponente perfeito: `raqueteDireita.y = bola.y - altura/2`. Jogue duas partidas e
   entenda por que ninguém faria um jogo assim.
3. Remova a zona morta e observe a raquete tremer.
4. Faça o alvo do computador ter um **erro aleatório**: some
   `(Math.random() - 0.5) * 20` ao alvo. Ele passa a errar como gente.
5. **Três níveis de dificuldade:** um `<select>` que muda a velocidade dele e o tamanho do
   erro aleatório.
6. Faça o computador **prever** onde a bola vai chegar, em vez de perseguir a altura atual.
   Dica: calcule quanto tempo falta para ela chegar até a raquete e projete o `y` — depois
   trate os ricochetes nas paredes. Fica muito mais forte, e você vai precisar limitá-lo de
   novo.
7. Deixe os dois lados automáticos e assista. É um bom jeito de testar equilíbrio.

---

**Anterior:** `07-placar` · **Próximo:** `final` — pausa, som, menu e o guia completo com
todos os conceitos do módulo.
