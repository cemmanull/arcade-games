# Proa Acesa — Passo 3: O mar

**Mudou:** `script.js` (ondas, névoa e entardecer; o grafo de cena do passo 2 continua igual). Os
outros arquivos mudam só o título.
**Rode:** abra o `index.html` (precisa de internet, como nos passos anteriores) e espere uns 40
segundos.

---

## O que você vê

Fim de tarde: céu cor de mel, mar azul-claro com ondas que andam, o horizonte se dissolvendo numa
névoa da cor do céu. A barca **boia** na onda. Devagar o céu escurece, o mar fica azul-noite, a
névoa fecha e o cone da lanterna, quase invisível de dia, vai ficando nítido. Em 40 segundos é noite
fechada, e a noite fica.

---

## 1. Ondas: um seno por vértice

Um plano de 90 × 90 m com 64 × 64 quadradinhos tem 4.225 **vértices**. A cada quadro, cada um
ganha uma altura nova:

```js
function alturaDoMar(x, z, tempo) {
    const ondaEmX = Math.sin(x * 0.6 + tempo * 1.3);
    const ondaEmZ = Math.sin(z * 0.5 + tempo * 0.9);
    return AMPLITUDE_DA_ONDA * (ondaEmX + ondaEmZ) / 2;
}
```

É o mesmo `Math.sin` do balanço dos inimigos do `shoot-em-up/04-inimigos`
(`origemX + Math.sin(t * 2.5) * 22`), com uma diferença que vira onda: lá o seno depende só do
tempo e o objeto vai e volta; aqui ele depende também da **posição** (`x * 0.6`). Cada vértice está
numa fase diferente da mesma curva, e a curva anda quando o `tempo` cresce.

- **Amplitude** (`AMPLITUDE_DA_ONDA`): a altura máxima, em metros.
- **Frequência** (`0.6`, `0.5`): quantas cristas cabem no mar. Maior = ondas mais curtas.
- **Velocidade** (`1.3`, `0.9`): quão rápido a onda anda.

Somar duas ondas em direções diferentes (uma em `x`, outra em `z`) já tira o aspecto de "piso
balançando".

---

## 2. Mexer nos vértices

```js
const posicoes = mar.geometry.attributes.position;
for (let i = 0; i < posicoes.count; i++) {
    posicoes.setY(i, alturaDoMar(posicoes.getX(i), posicoes.getZ(i), tempoTotal));
}
posicoes.needsUpdate = true;
```

Os vértices moram num **buffer** que vai para a placa de vídeo. Alterar o buffer não basta:
`needsUpdate = true` avisa que é preciso reenviá-lo. Sem essa linha o mar fica parado e você
perde uma tarde procurando o erro.

O plano nasce "de pé", e no passo 2 deitamos a **malha** (`mar.rotation.x`). Agora deitamos a
**geometria** (`geometria.rotateX(-Math.PI / 2)`), uma vez só, na criação: assim `y` já é a altura
de cada vértice e o laço acima não precisa de nenhuma conta de rotação.

**E as normais?** A normal de um vértice diz para onde a superfície "olha", e a luz depende dela.
Com as ondas mexendo, as normais antigas ficariam erradas. O `flatShading: true` (do passo 2)
resolve de graça: o material calcula a normal de cada **face** na GPU, a partir das posições. Não
chamamos `computeVertexNormals()`. O GDD (§9) mediu o laço inteiro em menos de 1 ms de JS.

---

## 3. Névoa

```js
cena.fog = new THREE.FogExp2(COR_DO_CEU_DE_TARDE, NEVOA_DE_TARDE);
```

`FogExp2` mistura a cor de cada pixel com a cor da névoa, mais forte quanto mais longe ele está. A
densidade (`0.012` de tarde, `0.03` de noite) manda: quanto maior, mais perto o mundo some. A **cor
da névoa tem de ser a do fundo**, senão o horizonte vira uma faixa estranha entre o mar e o céu.

Repare que a borda do plano do mar, a 45 m, some na névoa: não se vê onde o mundo acaba. Mais
adiante (GDD §4.2) o **alcance** da lanterna usará esse mesmo número da névoa.

---

## 4. O entardecer: `lerp`

```js
function lerp(inicio, fim, t) {
    return inicio + (fim - inicio) * t;
}
```

É a função do `dealer-out/09-dificuldade`, que ali ia do "fácil" ao "difícil". `t = 0` devolve o
início, `t = 1` o fim, `t = 0,5` o meio do caminho. Aqui `t` é `tempoTotal / 40` (parado em 1
depois de 40 s) e o que vai de um extremo ao outro é:

| `t` | névoa (densidade) | luz do céu | opacidade do cone |
|---|---|---|---|
| 0 (tarde) | 0,012 | 4,0 | 0,04 |
| 0,5 | 0,021 | 3,7 | 0,11 |
| 1 (noite) | 0,030 | 3,4 | 0,18 |

Para **cores**, o three.js já traz o `lerp` por canal: `new THREE.Color(a).lerp(new THREE.Color(b), t)`
mistura vermelho, verde e azul, cada um por conta própria. Uma mesma cor misturada pinta o fundo
(`cena.background`) e a névoa (`cena.fog.color`), para as duas continuarem iguais. O mar vai do azul
da tarde (`0x3d7ea6`) ao azul-noite (`0x14344f`).

Por que o cone quase some de dia? Porque a luz de uma lanterna só aparece contra o escuro: é
`lerp(0.04, 0.18, t)`.

---

## 5. A barca boia

```js
barca.position.y = alturaDoMar(barca.position.x, barca.position.z, tempoTotal);
```

A mesma função que levanta os vértices diz a altura do mar **em qualquer ponto**. Basta perguntar
onde a barca está. O jogo não depende dessa altura: a regra mora no plano XZ (GDD §4.1) e a onda é
só desenho.

---

## Experimente

1. Troque `AMPLITUDE_DA_ONDA` por 2 e depois por 0. Com 0 sobra um mar liso, como no passo 2.
2. Mude os `0.6` e `0.5` para `0.2`: as ondas ficam longas e preguiçosas. E para `1.5`?
3. Apague a linha `posicoes.needsUpdate = true`. O que acontece com o mar?
4. Desligue o `flatShading` do mar (em `criarMalha`, só para ele): as ondas viram uma superfície
   lisa, mas as normais **não** foram recalculadas. O que você vê na luz?
5. Mude `DURACAO_DO_ENTARDECER` para 10 e depois para 120. Faça o dia voltar: use `%` em
   `tempoTotal / DURACAO_DO_ENTARDECER` e um seno para ir e vir (como as ondas).
6. Aumente `NEVOA_DE_NOITE` para 0,08. Até onde você enxerga a ilha? Agora faça o céu **não**
   acompanhar: troque a cor da névoa por vermelho e olhe o horizonte.
7. Faça o amanhecer: acrescente uma terceira cor ao `aplicarCeu` (`0xf3c98b`, de volta) e use dois
   `lerp` em sequência.
8. Em `alturaDoMar`, some uma terceira onda diagonal: `Math.sin((x + z) * 0.3 + tempo)`.

---

**Anterior:** [`02-ilha`](../02-ilha/) · **Próximo:** [`04-feixe`](../04-feixe/) — a barca navega, a lanterna mira e a câmera vai atrás.
