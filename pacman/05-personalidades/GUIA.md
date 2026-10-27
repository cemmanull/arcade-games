# Pac-Man — Passo 5: As personalidades

**Mudou:** `script.js` e a linha de ajuda
**Rode:** abra o `index.html`, jogue um pouco e aperte **H**.

---

## O que você vê

O vermelho sai na hora. A rosa sai depois de 1 segundo, o ciano depois de 5, o laranja depois de
9 — até lá, eles quicam dentro da casa. Com H, cada um mostra o seu alvo, e os alvos são
**diferentes**: a linha da rosa aponta para a sua frente, a do ciano às vezes para o outro lado do
labirinto, a do laranja, quando ele chega perto, para o canto de baixo.

E juntos eles parecem caçar em grupo.

---

## A mesma regra, alvos diferentes

A regra do cruzamento do passo 4 não mudou **uma linha**. O que cada fantasma tem de seu é só a
função que calcula o alvo:

| Fantasma | Alvo | Efeito |
|---|---|---|
| vermelho | a casa do Pac-Man | persegue por trás |
| rosa | 4 casas à frente do Pac-Man | corta pela frente |
| ciano | o dobro da seta que vai do vermelho até 2 casas à frente do Pac-Man | fecha o cerco com o vermelho |
| laranja | o Pac-Man se estiver a mais de 8 casas; senão, o seu canto | ronda sem se decidir |

### O ciano, com calma

```js
const ponto = aFrenteDoPacMan(2);
return {
    coluna: ponto.coluna * 2 - casaDe(vermelho.x),
    linha: ponto.linha * 2 - casaDe(vermelho.y)
};
```

Pegue a seta que sai do vermelho e vai até o ponto 2 casas à frente do Pac-Man. Agora estique-a
até o dobro do comprimento. A ponta é o alvo do ciano. Se o vermelho vem por trás, o ciano mira
**do outro lado** — e o Pac-Man fica no meio. `ponto * 2 - vermelho` é essa conta: `ponto +
(ponto - vermelho)`.

---

## Comportamento é um campo, como a cor

```js
const FANTASMAS = [
    { nome: "vermelho", cor: "#ff3b3b", ..., alvo: () => casaDoPacMan() },
    { nome: "rosa",     cor: "#ffb8de", ..., alvo: () => aFrenteDoPacMan(4) },
    ...
];

const alvo = f.alvo(f);
```

Cada fantasma traz no seu objeto a **função** que o diferencia. `decidirFantasma` não tem
`if (nome === "rosa")` nenhum: pergunta `f.alvo(f)` e segue a regra. Um quinto fantasma é um
item a mais na lista.

---

## Comportamento emergente

Nenhum fantasma sabe que os outros existem (o ciano só lê a **posição** do vermelho). Nenhum
planeja um cerco. E, olhando de fora, eles cercam: um vem por trás, outro corta pela frente,
outro fecha a saída.

> Regras simples e individuais que, juntas, **parecem** um plano: isso se chama comportamento
> emergente. Bandos de pássaros, cardumes e engarrafamentos funcionam assim — e os bons
> inimigos de jogos também.

---

## A casa dos fantasmas tem regras próprias

```js
switch (f.estado) {
    case "em casa":  quicarNaCasa(...); break;
    case "saindo":   irAte(f, X_DA_PORTA, Y_DA_SAIDA, ...); break;
    case "andando":  andar(f, ..., decidirFantasma); break;
}
```

Dentro da casa não há cruzamentos, nem regra de meia-volta, e a porta é uma parede para o
Pac-Man. Em vez de complicar a regra do labirinto com exceções ("a não ser que esteja na casa,
e se for a porta…"), a casa ganha um **movimento roteirizado**: alinhar com a porta, subir. Só
no estado `andando` o fantasma obedece às regras do labirinto.

> Quando um lugar tem regras muito diferentes, dê a ele um código separado em vez de enfiar
> exceções no código geral.

E esperando, eles **quicam**. Parados, pareceriam desligados; quicando, parecem impacientes.

---

## Detalhes que valem notar

### Os objetos nascem das fichas

```js
const fantasmas = FANTASMAS.map(ficha => ({ ...ficha, x: 0, y: 0, estado: "em casa" }));
```

`FANTASMAS` são as fichas — dados que não mudam. `fantasmas` (minúsculo) são os vivos, com
posição e estado. O espalhamento copia a ficha e acrescenta o que muda.

### Alvos fora do labirinto

Os cantos ficam em linhas como −3 e 32, fora do mapa. O alvo não precisa ser alcançável: só
precisa **puxar** numa direção.

### Uma curiosidade do original

No jogo de 1980, quando o Pac-Man olhava para cima, o alvo da rosa ia 4 casas para cima **e 4
para a esquerda** — um erro de programação que virou parte do jogo. Aqui ele não existe; o
exercício 5 o recria.

---

## Experimente

1. Dê a todos o alvo do vermelho. Eles viram uma fila indiana — por quê?
2. Mude o "4" da rosa para 8 e para 1.
3. Mude o raio de coragem do laranja de 8 para 3. Ele fica mais perigoso?
4. Crie um quinto fantasma, verde, cujo alvo é o energizante mais próximo do Pac-Man.
5. Recrie o erro original: quando `pacMan.direcao` for `CIMA`, some também 4 colunas para a
   esquerda no alvo da rosa.
6. Com H ligado, siga o ciano por um minuto e tente prever para onde ele vai.

---

**Anterior:** `04-fantasma` · **Próximo:** `06-modos` — descansar, perseguir, fugir.
