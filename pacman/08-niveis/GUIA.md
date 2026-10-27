# Pac-Man — Passo 8: Os níveis

**Mudou:** `script.js`
**Rode:** abra o `index.html`. Coma 70 pastilhas e olhe embaixo da casa dos fantasmas. Depois
passe de fase e sinta a diferença.

---

## O que você vê

Depois da 70ª pastilha, uma cereja aparece embaixo da casa — por 9 segundos e meio, piscando no
fim. Vale 100. Outra aparece depois da 170ª. Na fase 2 é um morango (300), e tudo anda mais
rápido; na 5, os fantasmas mal se assustam. E repare no túnel: o fantasma que entra atrás de você
fica para trás.

---

## 1. A ficha da fase

```js
const NIVEIS = [
    { pacMan: 0.80, fantasma: 0.75, assustado: 0.50, tunel: 0.40, susto: 6, fruta: "cereja" },
    { pacMan: 0.90, fantasma: 0.85, assustado: 0.55, tunel: 0.45, susto: 5, fruta: "morango" },
    ...
    { pacMan: 1.00, fantasma: 0.95, assustado: 0.60, tunel: 0.50, susto: 1, fruta: "uva" }
];

function nivelAtual() {
    return NIVEIS[Math.min(fase - 1, NIVEIS.length - 1)];
}
```

A curva de dificuldade do Tetris era uma coluna (o intervalo da queda). Aqui é uma **tabela
inteira**: seis números mudam juntos a cada fase. Leia uma **coluna** de cima para baixo e você vê
a curva daquela dificuldade; leia uma **linha** e você tem a fase inteira.

E o código que usa a tabela pergunta sempre a mesma coisa, `nivelAtual().fantasma`, sem saber em
que fase está.

### Frações de um máximo

```js
const VELOCIDADE_MAXIMA = 75;
andar(pacMan, VELOCIDADE_MAXIMA * nivelAtual().pacMan * tempo, ...);
```

As velocidades não estão em pixels por segundo: são **proporções**. "O fantasma anda a 75% do
máximo" se lê melhor do que "56,25 pixels por segundo" — e, para acelerar o jogo inteiro, basta
mudar um número.

> Quando vários valores são "mais ou menos o mesmo, em proporções diferentes", guarde **uma
> referência e as frações**. As relações entre eles ficam visíveis — e sobrevivem quando a
> referência muda.

### As válvulas de escape

Olhe as colunas `assustado` e `tunel`: estão sempre bem abaixo de `pacMan`, mesmo na última fase.
São os dois lugares onde o jogador consegue se afastar — e a tabela os **preserva**. Uma fase
difícil não pode tirar todas as saídas; senão deixa de ser difícil e passa a ser injusta.

---

## 2. O túnel é um esconderijo

```js
function estaNoTunel(f) {
    const coluna = ((casaDe(f.x) % COLUNAS) + COLUNAS) % COLUNAS;
    return casaDe(f.y) === 14 && (coluna <= 5 || coluna >= COLUNAS - 6);
}
```

No túnel, o fantasma anda a 40% do máximo; o Pac-Man, não. Entrar no túnel com um fantasma atrás é
uma jogada: ele fica para trás.

O túnel não está marcado no mapa: é uma **conta sobre a posição**. Às vezes uma regra do jogo é
mais simples como pergunta do que como dado.

---

## 3. A fruta

```js
const comidas = pastilhasNoInicio - pastilhasRestantes;

if (PASTILHAS_PARA_A_FRUTA.includes(comidas)) {
    fruta = { tipo: nivelAtual().fruta, tempoRestante: DURACAO_DA_FRUTA };
}
```

Um prêmio que aparece por pouco tempo, num lugar fixo — longe de onde o Pac-Man costuma estar
quando ela nasce. Buscá-la é uma **decisão**: vale o risco de atravessar o meio do labirinto?

Três ideias que já apareceram no curso, juntas:

| Ideia | Onde apareceu antes |
|---|---|
| um objeto que existe ou é `null` | a peça atual do Tetris |
| um temporizador que desce até sumir | o atordoamento do Dealer? Out! |
| piscar antes de acabar | o fim do susto, no passo 6 |

E `includes` pergunta "este número está na lista?": as duas aparições são dados, não dois `if`.

---

## Detalhes que valem notar

### A fruta entre duas casas

O lugar da fruta (x = 112) é a fronteira entre as colunas 13 e 14, como o ponto de partida do
Pac-Man. Por isso a colisão é por distância (`Math.abs(pacMan.x - LUGAR_DA_FRUTA.x) < 4`), e não
por igualdade de casa: qualquer uma das duas serve.

### Morrer leva a fruta embora

`novaVida` faz `fruta = null`. Como no original: perder uma vida também custa o prêmio que estava
na mesa.

### A cor do texto flutuante

Os números agora podem ter cor: ciano para fantasmas, rosa para frutas. Um campo opcional
(`texto.cor || "#3bf3ff"`), e as chamadas antigas continuam funcionando.

---

## Experimente

1. Comece na fase 5 (mude `fase = 1` em `novaPartida`). Quanto tempo você dura?
2. Ponha a velocidade do fantasma acima da do Pac-Man numa fase. Ainda dá para jogar? O que salva
   você?
3. Tire a lentidão do túnel (`tunel: 1`) e tente despistar um fantasma por lá.
4. Faça a fruta aparecer num lugar sorteado entre algumas casas livres.
5. Mostre no placar a fruta da fase, com o mesmo desenho, num canvas pequeno.
6. Acrescente uma coluna `horarios` à tabela de níveis, para que cada fase tenha a sua própria
   tabela de dispersar e perseguir.

---

**Anterior:** `07-vidas` · **Próximo:** `final` — menu, pausa, som, recorde e toque.
