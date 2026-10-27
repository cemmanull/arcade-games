# Pac-Man — Passo 7: As vidas

**Mudou:** os três arquivos (placar com vidas e fase, aviso "Pronto!", mensagem de fim)
**Rode:** abra o `index.html` e jogue até perder.

---

## O que você vê

"Pronto!" por dois segundos, com tudo parado. Então o jogo corre. Quando um fantasma te pega, os
fantasmas somem e o Pac-Man **se desfaz** — a boca abre até ele virar nada. Volta o "Pronto!", com
as pastilhas que você já comeu ainda comidas. Na terceira vez, **Fim de jogo** e um botão. Limpe o
labirinto e ele pisca, e a fase 2 começa.

---

## 1. A máquina de estados do jogo

```js
switch (estado) {
    case "pronto":        if (acabouAEspera) mudarEstado("jogando"); break;
    case "jogando":       atualizarJogo(tempo); break;
    case "morrendo":      if (acabouAEspera) depoisDeMorrer(); break;
    case "fase completa": if (acabouAEspera) proximaFase(); break;
}
```

O Pac-Man agora tem **duas** máquinas de estados, em níveis diferentes:

| | Estados | Responde |
|---|---|---|
| do jogo | pronto, jogando, morrendo, fase completa, fim | "o que a partida está fazendo?" |
| de cada fantasma | em casa, saindo, andando, olhos, entrando | "o que este fantasma está fazendo?" |

A de cima manda na de baixo: os fantasmas só se movem quando o jogo está em `"jogando"`.

### Esperar é um dado

```js
const DURACAO_DOS_ESTADOS = {
    "pronto": 2,
    "morrendo": 1.8,
    "fase completa": 2
};
```

Três estados só **esperam** e passam adiante. Em vez de um cronômetro para cada um, uma tabela diz
quanto cada um dura, e um relógio só — `tempoNoEstado` — conta. E ele é zerado num lugar só:

```js
function mudarEstado(novoEstado) {
    estado = novoEstado;
    tempoNoEstado = 0;
}
```

Nenhum estado novo pode esquecer de zerar o relógio, porque ninguém troca de estado sem passar por
aqui.

---

## 2. Três recomeços

O que volta ao começo quando você perde uma vida? As posições, sim. As pastilhas comidas, **não**
— senão perder seria um alívio. Todo jogo responde essa pergunta, e aqui a resposta tem três
tamanhos:

| Recomeço | Zera | Mantém |
|---|---|---|
| `novaVida` | posições, modos, susto | pastilhas, pontos, vidas, fase |
| `novaFase` | + o labirinto inteiro | pontos, vidas, fase |
| `novaPartida` | + pontos, vidas, fase | nada |

E cada um **chama o menor**:

```js
function novaFase()    { mapa = criarMapa(); ...; novaVida(); }
function novaPartida() { pontos = 0; vidas = 3; fase = 1; novaFase(); }
```

Nada é escrito duas vezes. Se um dia a nova vida precisar zerar mais alguma coisa, a fase e a
partida ganham isso de graça.

> Quando recomeços têm tamanhos diferentes, escreva-os **um dentro do outro**: o maior faz o seu
> pedaço e chama o menor.

---

## 3. A morte é uma animação de estado

```js
const progresso = Math.min(tempoNoEstado / 1.2, 1);
const abertura = 0.05 + progresso * Math.PI;
```

Durante `"morrendo"`, a boca do Pac-Man abre de quase nada até π — meia volta para cada lado, ou
seja, o círculo inteiro. A fatia de pizza que falta cresce até ser a pizza toda.

Ela é **calculada** do relógio do estado: nada é guardado, nada precisa ser zerado. É a mesma
técnica da entrada do chefe num jogo de nave, e do pisca-pisca do Tetris.

E o desenho também depende do estado: morrendo, os fantasmas **somem**. O olho do jogador vai
direto para o Pac-Man, que é o que importa naquele segundo.

---

## Detalhes que valem notar

### "Pronto!" é HTML

O aviso fica por cima do canvas, em HTML, com `role="status"` — um leitor de tela anuncia. Posição:
logo abaixo da casa dos fantasmas, como no jogo original.

### O fim congela, mas desenha

No estado `"fim"`, nada se move, mas o loop continua desenhando: o labirinto da partida que acabou
fica visível atrás da mensagem.

### Os fantasmas param no "Pronto!"

Inclusive os relógios deles: `tempoDesdeOInicio` só anda em `"jogando"`. Os dois segundos de
"Pronto!" não contam para soltar ninguém da casa.

---

## Experimente

1. Mude `"pronto": 2` para 0. O que se perde?
2. Faça perder uma vida **também** devolver as pastilhas (chame `novaFase` em vez de `novaVida` em
   `depoisDeMorrer`). Por que isso estraga o jogo?
3. Dê uma vida extra aos 10.000 pontos — uma vez só. Onde guardar que ela já foi dada?
4. Faça a morte girar o Pac-Man enquanto ele se desfaz.
5. Acrescente um estado `"pausado"` com a tecla P. Ele precisa de uma entrada na tabela de durações?
6. Mostre as vidas como pequenos Pac-Men em vez de um número (dica: um canvas pequeno no placar,
   ou caracteres "●" no HTML).

---

**Anterior:** `06-modos` · **Próximo:** `08-niveis` — cada fase um pouco mais difícil, e frutas.
