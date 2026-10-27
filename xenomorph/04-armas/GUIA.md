# Xenomorph — Passo 4: As armas

**Mudou:** os três arquivos (o painel das armas)
**Rode:** abra o `index.html`, atire com **X** e troque de arma com **Q**.

---

## O que você vê

Um painel acima da tela: as duas armas equipadas, a ativa acesa, com a munição de cada uma. O
soldado agora tem a arma separada do corpo, e ela aponta para onde você mira: segure ↑ e ela
aponta para cima; ↑ + → na diagonal; no ar, ↓ aponta para baixo.

O **rifle de plasma** cospe tiros finos e rápidos, longe. A **espingarda magnética** solta um
leque de seis, que some depois de poucos blocos — e dá um coice no soldado. Os tiros soltam
faíscas nas paredes, mas atravessam as plataformas de grade. Os **casulos** verdes piscam a cada
acerto e estouram.

Esvaziou o pente? A recarga começa sozinha, com uma barra no painel. **R** recarrega antes.

---

## 1. Mirar é um vetor

```js
const comprimento = Math.hypot(horizontal, vertical);
return { x: horizontal / comprimento, y: vertical / comprimento };
```

As setas dão −1, 0 ou 1 em cada eixo; juntas, uma das oito direções. Nenhuma delas tem código
próprio: o tiro sai com `velocidade = mira × rapidez`, e o desenho da arma é a mesma linha de 5
pixels, apontada para onde a mira mandar.

A diagonal é **normalizada** — a lição do Shoot 'em up, agora para mirar. Sem isso, um tiro na
diagonal sairia 41% mais rápido (√2 ≈ 1,41) e iria mais longe que o reto.

Duas regras de uso:

| Situação | Mira |
|---|---|
| nenhuma seta | para onde o soldado olha |
| ↓ no chão | ignorado — é o começo de "descer da plataforma" |

---

## 2. A arma é uma ficha de dados

```js
rifle:      { dano: 2, intervalo: 0.14, rapidez: 300, alcance: 200, pente: 24, tempoDeRecarga: 1.1, projeteis: 1, abertura: 0,   recuo: 0  },
espingarda: { dano: 2, intervalo: 0.6,  rapidez: 260, alcance: 72,  pente: 6,  tempoDeRecarga: 1.5, projeteis: 6, abertura: 0.5, recuo: 70 },
```

O GDD pede que cada arma tenha *"dano, alcance, cadência, recarga, consumo de recursos"* próprios
(seção 4). Aqui eles são **uma linha** cada, e o código que atira é **um só**: `disparar(ficha,
mira)` não sabe se está atirando com um rifle ou uma espingarda.

Compare as duas linhas: a diferença entre as armas **é** esta tabela. A espingarda dá 12 de dano
por disparo (6 × 2) a cada 0,6 s — mais que o rifle (2 a cada 0,14 s ≈ 14 por segundo… quase
igual!). A diferença está no **alcance**: 72 px contra 200. Uma arma para encostar, outra para
manter distância.

### O rifle é um leque de um

```js
const posicaoNoLeque = ficha.projeteis === 1 ? 0 : i / (ficha.projeteis - 1) - 0.5;
const angulo = anguloDaMira + posicaoNoLeque * ficha.abertura + erro;
```

O leque do Shoot 'em up: os projéteis espalhados por igual dentro da `abertura`, centrados na mira.
Com um projétil só, a posição no leque é zero — o rifle não é um caso especial.

O `desvio` sorteia um erro pequeno em cada projétil. Sem ele, os seis tiros da espingarda formariam
um leque perfeito demais, sempre igual.

---

## 3. Estado da arma ≠ ficha da arma

```js
const equipamento = {
    armas: [{ tipo: "rifle", municao: 24, recarregando: 0 }, { tipo: "espingarda", municao: 6, recarregando: 0 }],
    ativa: 0
};
```

A ficha diz que o pente **tem** 24 tiros. Quantos **sobram agora** é outra coisa, e muda a cada
disparo. Se a munição morasse na ficha, duas armas iguais equipadas dividiriam o mesmo pente.

| | Onde mora | Muda? |
|---|---|---|
| tamanho do pente, cadência, dano | `ARMAS` (a ficha) | nunca, durante o jogo |
| munição, recarga em andamento | `equipamento.armas` | a cada disparo |

É a separação entre *o que a coisa é* e *o estado em que ela está* — a mesma do Dealer? Out!
(o catálogo e os objetos que caem) e do Tetris (as peças e a peça que cai).

### A recarga é da arma

```js
arma.recarregando = ficha.tempoDeRecarga;
```

Um temporizador como os do passo 3, mas guardado **na arma**, não no soldado. E trocar de arma
no meio dela a **cancela**. É uma decisão de projeto: assim, trocar tem custo, e não vira um jeito
de recarregar de graça. Experimente a outra regra no exercício 4.

---

## 4. Tiros também andam em pedaços

```js
while (restante > 0 && !tiro.acertou) {
    const pedaco = Math.min(restante, PASSO_MAXIMO);
    ...
}
```

A 300 px/s, um quadro lento anda 15 pixels. A lição do passo 2 vale para tudo o que é rápido: no
máximo meio bloco por pedaço, e depois de cada um a pergunta — *entrei numa parede? acertei um
casulo?*

O tiro é um **ponto**, não uma caixa: pequeno demais para precisar de tamanho. E a plataforma de
grade não o segura — ela segura pés (`plataforma`), não tiros (`solido`). A tabela de blocos do
passo 1 respondendo de novo.

Quem acerta é **marcado** (`acertou`), e a lista só é filtrada no fim. Nunca se mexe na lista que se
está percorrendo.

---

## 5. O painel é HTML

```html
<li id="arma-0" aria-current="true">Rifle de plasma 24/24</li>
```

Texto que muda pouco, com fonte nítida em qualquer escala, lido por leitor de tela: HTML. A arma
ativa é marcada com `aria-current` — o atributo que diz *"você está aqui"* — e o CSS usa o mesmo
atributo para acendê-la. Um dado só, servindo à tela e à acessibilidade.

O painel é refeito quando algo **muda** (disparo, troca, recarga terminada), não a cada quadro. A
barra de recarga é a exceção: ela anda sozinha enquanto recarrega.

---

## Detalhes que valem notar

### O coice

```js
soldado.vx -= mira.x * ficha.recuo;
```

Só na horizontal, e a física do passo 2 faz o resto: a aceleração devolve o soldado à velocidade
que o jogador quer. A espingarda **pesa** sem nenhuma regra nova.

### Marcadores para tudo

`criarSala` agora junta todos os marcadores numa lista. O soldado busca o `@`; os casulos filtram
os `o`. No próximo passo, as criaturas vão chegar pelo mesmo caminho.

### O clarão

Por 0,05 s depois de um disparo, a ponta da arma acende em branco. Um temporizador, dois pixels, e
cada tiro passa a ter **peso visual**.

---

## Experimente

1. Crie uma terceira arma na tabela: a **metralhadora experimental** do GDD (cadência altíssima,
   pente grande, recarga longa, `desvio` alto). Equipe-a no lugar do rifle.
2. Dê à espingarda `recuo: 300`. Agora atire para trás no ar: dá para usar o coice para atravessar
   um vão?
3. Faça o tiro para baixo, no ar, empurrar o soldado para **cima** (`soldado.vy`). Quantas linhas?
4. Mude a regra: trocar de arma **não** cancela a recarga, que continua em segundo plano. O jogo
   fica melhor?
5. Tire a normalização da mira e atire na diagonal com o rifle contra uma parede distante. Os
   tiros diagonais chegam mais longe?
6. Faça os tiros do rifle **ricochetearem** uma vez nas paredes (o GDD sugere isso na seção 7).
   Dica: no pedaço em que entrou no bloco, descubra se a parede é vertical ou horizontal e inverta
   `vx` ou `vy`.

---

**Anterior:** [`03-salto`](../03-salto/) · **Próximo:** [`05-criaturas`](../05-criaturas/) — os casulos se abrem.
