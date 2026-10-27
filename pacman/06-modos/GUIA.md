# Pac-Man — Passo 6: Os modos

**Mudou:** `script.js` e o placar (que mostra o modo)
**Rode:** abra o `index.html`. Nos primeiros 7 segundos, repare para onde os fantasmas vão.
Depois coma um energizante.

---

## O que você vê

No começo, cada fantasma vai para um canto — **dispersar**. Aos 7 segundos, os quatro dão
meia-volta juntos e começam a **perseguir**. O placar mostra o modo.

Coma um energizante: os fantasmas ficam azuis, dão meia-volta e fogem em pânico, devagar.
Encoste num: o jogo para meio segundo, aparece **200**, e sobram só os olhos, que voltam correndo
para casa pelo caminho mais curto e saem de novo, inteiros. O segundo vale 400, o terceiro 800,
o quarto 1600. Perto do fim do susto, eles piscam.

---

## 1. Humor é só outro alvo

| Modo | Alvo | Regra de cruzamento |
|---|---|---|
| dispersar | o canto de cada um | a mesma |
| perseguir | a personalidade (passo 5) | a mesma |
| assustado | nenhum | sorteio entre as saídas |
| olhos | a porta, pelo mapa de distâncias | a vizinha de número menor |

```js
const alvo = modoAtual() === "dispersar" ? f.canto : f.alvo(f);
```

Dispersar não precisou de código de movimento novo: é **trocar o alvo**. O mesmo `decidirFantasma`
leva cada um ao seu canto — e, como o canto fica fora do labirinto, eles ficam rodando em volta
dele, num circuito.

---

## 2. A tabela de horários

```js
const HORARIOS = [
    { modo: "dispersar", duracao: 7 },
    { modo: "perseguir", duracao: 20 },
    ...
    { modo: "perseguir", duracao: Infinity }
];
```

O ritmo do jogo — tensão, alívio, tensão — é uma lista. Os períodos de dispersar encurtam: o jogo
vai apertando. E o último dura `Infinity`, um número de verdade em JavaScript, maior que qualquer
outro: a comparação `tempo >= Infinity` nunca é verdadeira.

> Quando o comportamento de um sistema muda com o tempo, escreva **o cronograma** como dados. É
> o mesmo princípio do roteiro de fases de um jogo de nave e das legendas de um vídeo.

### O susto é um parêntese

```js
if (tempoDeSusto > 0) return;   // o relógio do horário não anda
```

Durante o susto, o relógio do horário **para**. Sem isso, comer um energizante "gastaria" o tempo
de dispersar — e o jogador seria punido por usar o energizante.

---

## 3. Meia-volta avisa

```js
function darMeiaVolta() {
    fantasmas.filter(f => f.estado === "andando").forEach(f => {
        f.direcao = { dx: -f.direcao.dx, dy: -f.direcao.dy };
    });
}
```

A regra do cruzamento proíbe a meia-volta — exceto aqui. Toda troca de modo (e todo energizante)
faz os quatro virarem juntos. Não é para eles: é para **você**. Os quatro virando ao mesmo tempo
são o sinal de que algo mudou.

Sempre dá para virar: o caminho de volta é por onde ele acabou de passar.

---

## 4. Assustado é um campo, não um estado

```js
f.estado      // "em casa" | "saindo" | "andando" | "olhos" | "entrando"
f.assustado   // true ou false, à parte
```

Um fantasma azul pode estar em casa, saindo ou andando. Se `assustado` fosse mais um estado, seria
preciso inventar `"andando-assustado"`, `"saindo-assustado"`… e duplicar o código de cada um.

> Uma máquina de estados responde **"o que ele está fazendo?"**. Coisas que podem ser verdade
> **ao mesmo tempo** que qualquer estado são campos separados.

### Os pontos dobram

```js
const valor = PONTOS_DO_PRIMEIRO_FANTASMA * 2 ** fantasmasComidosNoSusto;
```

`2 ** n` é "2 elevado a n": 1, 2, 4, 8. O contador zera a cada energizante. Comer os quatro com um
energizante só vale 3000 — a recompensa por arriscar perseguir.

---

## 5. O caminho mais curto: a busca em largura

A regra do cruzamento erra de propósito. Os olhos **não podem errar**: um fantasma comido que se
perde no labirinto seria um bug, não um charme.

A solução é calcular, **uma vez**, a distância de cada casa até a porta:

```js
const fila = [{ coluna: 13, linha: 11 }, { coluna: 14, linha: 11 }];   // distância 0

while (fila.length > 0) {
    const atual = fila.shift();
    for (const direcao of ORDEM_DAS_DIRECOES) {
        // vizinha livre e ainda sem número? recebe o número de `atual` + 1, e entra na fila
    }
}
```

Pense numa **enchente** começando na porta. A água chega primeiro às vizinhas (1), depois às
vizinhas delas (2), em ondas. A **fila** garante as ondas: quem entra primeiro é processado
primeiro. Por isso, quando uma casa é molhada pela primeira vez, o número dela já é a menor
distância possível — nenhum caminho mais longo chega antes.

Depois disso, achar o caminho mais curto de qualquer lugar é trivial: **vá para a vizinha de
número menor**. Repetindo, você chega a zero.

```
 5 4 3 2 1 [porta] 1 2 3
 6 # # # 2 # # # # # 4
 7 8 9 # 3 4 5 6 7 # 5
```

Calculado uma vez, no carregamento, serve para sempre — o labirinto não muda de forma.

> A busca em largura está em todo lugar: o GPS que acha a rota, a ferramenta de "balde de tinta"
> dos editores de imagem, a sugestão de amigos de uma rede social ("amigos de amigos" é a onda
> 2).

---

## Detalhes que valem notar

### Uma pausa como recompensa

Comer um fantasma congela o jogo por meio segundo com o número na tela. O jogo **para para você
ver o que fez**.

### Números feitos de pixels

`fillText` desenharia o "200" com uma fonte de verdade, que, ampliada 2 vezes, sairia borrada. Os
algarismos são sprites de 3×5, feitos de texto, como o resto do jogo.

### O pisca do fim

Nos últimos 2 segundos de susto, os fantasmas alternam entre azul e branco. Quem vê o pisca desiste
de perseguir a tempo. Sem o aviso, o fim do susto seria uma armadilha.

---

## Experimente

1. Ponha `{ modo: "dispersar", duracao: Infinity }` como primeira linha da tabela. Os fantasmas
   nunca te perseguem — e o jogo fica chato depressa. Por quê?
2. Deixe o relógio do horário andar durante o susto. Coma um energizante perto do fim de um
   período de dispersar.
3. Tire o `darMeiaVolta()` de `assustarFantasmas`. Coma um energizante com um fantasma colado atrás
   de você.
4. Faça os olhos usarem a regra do cruzamento (alvo: a porta) em vez do mapa de distâncias. Eles
   chegam? Quanto demoram?
5. Desenhe o mapa de distâncias: escreva o número de cada casa (com `desenharNumero`) quando H
   estiver ligado.
6. Mude `DURACAO_DO_SUSTO` para 1 e para 20.

---

**Anterior:** `05-personalidades` · **Próximo:** `07-vidas` — agora ser pego custa caro.
