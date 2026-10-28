# Shoot 'em up — Passo 5: A colisão

**Mudou:** `script.js`, `index.html` e `style.css` (o placar)
**Rode:** abra o `index.html`. Atire. Depois aperte **H**.

---

## O que você vê

Os tiros acertam. Cada inimigo pisca branco ao levar dano e explode em faíscas ao morrer. O
blindado laranja aguenta seis tiros. Bater num inimigo deixa a nave vermelha por um instante
e conta uma "batida" — por enquanto, sem castigo.

Com **H**, aparecem círculos verdes: as áreas de colisão de verdade.

---

## 1. Círculos em vez de retângulos

```js
function colidem(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const somaDosRaios = a.raio + b.raio;
    return dx * dx + dy * dy < somaDosRaios * somaDosRaios;
}
```

Dois círculos se tocam quando a **distância entre os centros** é menor que a **soma dos
raios**. A distância é Pitágoras: √(dx² + dy²).

E a raiz não é necessária. Se dois números positivos obedecem `a < b`, então `a² < b²`:
comparar os **quadrados** dá a mesma resposta. Num teste que roda centenas de vezes por
quadro, tirar a raiz é o truque padrão.

| | AABB (Pong) | Círculos (aqui) |
|---|---|---|
| Guarda | canto, largura, altura | centro, raio |
| Teste | 4 comparações | 1 soma de quadrados |
| Bom para | caixas, paredes, plataformas | naves, balas, explosões |
| Gira? | não serve se o objeto girar | igual em qualquer rotação |

O passo 1 escolheu guardar o **centro**. É aqui que essa escolha paga.

---

## 2. Muitos contra muitos

```js
tiros.forEach(tiro => {
    for (const inimigo of inimigos) {
        ...
    }
});
```

Dois laços, um dentro do outro: cada tiro contra cada inimigo. Com 7 tiros e 10 inimigos,
70 testes por quadro — nada para um computador.

> Com milhares de objetos, dois laços aninhados começam a pesar: 1000 × 1000 é um milhão de
> testes. Aí entram técnicas como dividir a tela em uma grade e só testar
> vizinhos. Para um jogo deste tamanho, seria complicar sem motivo: **correto primeiro, rápido
> depois — e só depois de medir.**

---

## 3. Marcar e varrer

```js
tiro.morto = true;            // marcar, durante a conferência
...
tiros = tiros.filter(tiro => !tiro.morto);   // varrer, depois de tudo
```

Ninguém sai da lista no meio da conferência. Quem morre ganha uma **marca**; depois que todos
os pares foram testados, um `filter` varre os marcados de uma vez.

Duas razões:

1. **Remover enquanto se percorre pula itens** — a lição do `splice`, que já apareceu no
   Tetris (passo 6).
2. **Um tiro acerta um inimigo só.** O tiro marcado é pulado no resto do laço. Sem isso, um
   tiro que passasse por dois inimigos sobrepostos mataria os dois de uma vez.

```js
if (tiro.morto) {
    return;   // este tiro já acertou alguém neste quadro
}
```

> **Primeiro decida tudo, depois mude tudo.** É assim que dezenas de colisões no mesmo quadro
> não atrapalham umas às outras.

---

## 4. A caixa de colisão não é o desenho

```js
const RAIO_DA_NAVE = 2;   // a nave desenhada tem 9 pixels de largura
```

A caixa de colisão pode ser **menor** que o desenho, para perdoar. Em jogos de nave isso vai
ao extremo: só o **miolo** da nave pode ser atingido.

Agora não faz muita diferença. No próximo passo a tela se enche de balas, e é esse miolo que
permite passar **raspando** entre elas — o momento em que o jogador se sente habilidoso, em vez
de morrer por encostar a ponta da asa num pixel e se sentir roubado.

### Mostrar o invisível

```js
pincel.arc(circulo.x, circulo.y, circulo.raio, 0, Math.PI * 2);
```

A tecla H desenha os círculos. Quando a colisão parecer errada — *"mas eu nem encostei!"* —, a
primeira coisa a fazer é **desenhá-la**. Toda ferramenta de jogo tem um modo assim: custa dez
linhas e economiza horas.

---

## 5. Faíscas: um sistema de partículas

```js
particulas.push({ x, y, vx: Math.cos(angulo) * rapidez, vy: Math.sin(angulo) * rapidez,
                  vida: 0.25 + Math.random() * 0.35, cor });
```

Quando algo morre, `explodir` cria uma dúzia de pontinhos de uma vez. Cada **partícula** é um
objeto minúsculo numa lista como a dos tiros: nasce com uma direção sorteada (um ângulo
transformado em vetor por `cos` e `sin`, a conta do saque do Pong) e uma rapidez própria,
anda somando `v * tempo`, e carrega um **temporizador de vida** que desce a cada quadro.
`atualizarParticulas` desconta o tempo e filtra as que chegaram a zero.

Partícula não colide nem tem regra: é só feedback. Mas dez pontinhos de meio segundo dizem
"isso explodiu" melhor que qualquer texto, e custam quase nada.

---

## 6. O mesmo desenho, outra tinta

```js
function desenharSprite(sprite, cores, x, y, corUnica = null) { ... }
pincel.fillStyle = corUnica || cor;
```

O inimigo que pisca branco e a nave vermelha usam **o mesmo sprite**, com todos os pixels de
uma cor. Um parâmetro a mais, com valor **padrão** (`= null`): todas as chamadas antigas
continuam funcionando sem mudar nada.

O piscar dura só 0,06 s. Quase nada — e é o que diz "acertou" sem precisar de som nem de
número. No blindado, que aguenta seis tiros, sem ele você acharia que os tiros estão passando
direto.

---

## Experimente

1. Aumente `RAIO_DA_NAVE` para 5 (quase o desenho todo) e voe entre os inimigos com H ligado.
   Depois diminua para 1.
2. Tire o `if (tiro.morto) return`. Faça dois inimigos se sobreporem (dica: gere dois no mesmo
   `origemX`) e atire. Quantos morrem com um tiro?
3. Troque a varredura por remover na hora, com `splice`, dentro do laço. Atire numa fila de
   inimigos e veja se algum tiro "atravessa" sem acertar.
4. Faça as faíscas caírem com gravidade: some algo ao `vy` de cada partícula a cada quadro.
5. Faça o blindado ficar mais escuro conforme perde vida (dica: a fração `vida / vidaMaxima`).
6. Escreva a colisão com `Math.hypot` (com a raiz) e compare. O resultado muda? O que muda?

---

**Anterior:** [`04-inimigos`](../04-inimigos/) · **Próximo:** [`06-contra-ataque`](../06-contra-ataque/) — eles atiram de volta.
