# Dique — Passo 2: As alturas

**Mudou:** `regras.js` (altura `z` na matriz, `montarListaDeDesenho`, camada de objetos, `verificarMapa`), `script.js` (blocos de topo e laterais, água translúcida, laço com `dt`, giro) e `index.html` com os botões ⟲ ⟳ Ver; `style.css` quase igual
**Rode:** abra o `index.html`, gire com **Q** e **R**, e aperte **H**.

---

## O que você vê

A mesma ilha do passo 1, mas agora **em relevo**: cada casa é um bloco com um topo e duas laterais mais
escuras (a da esquerda um pouco menos escura que a da direita), e o pico central tem quatro degraus. O mar e as
valas rasas (altura 0) estão cobertos por uma água **translúcida** com borda branca que balança de leve.
As letras `C` marcam as casas; uma delas está **escondida atrás** do pico, e girando a vista ela aparece.

**Q** e **R** giram a ilha em 90°; os botões ⟲ ⟳ fazem o mesmo no celular. Com **H** surgem as alturas
em número, os eixos e, embaixo, a lista de pintura: "esta casa foi pintada em 51º de 100".
O quadradinho branco mostra **onde a inversa do passo 1 acha que o dedo está**. Ponha o mouse em cima de um
bloco alto e veja o quadrado cair no chão, longe do topo: o passo 3 conserta isso.

---

## 1. A altura entra na matriz como um deslocamento

Uma casa de altura `z` fica `z` degraus mais alta na tela. A matriz do passo 1 continua cuidando do chão; a
altura só **sobe o ponto**:

```js
// (sx, sy) = origem + MATRIZ · (u, v)  −  (0, z · ALTURA_DO_DEGRAU)
function projetar(u, v, z) {
    return { x: ORIGEM.x + MATRIZ[0][0] * u + MATRIZ[0][1] * v, y: ORIGEM.y + MATRIZ[1][0] * u + MATRIZ[1][1] * v - (z || 0) * ALTURA_DO_DEGRAU };
}
```

Um degrau (`ALTURA_DO_DEGRAU`) são 12 px. A inversa ganha o `z` também, para responder "que ponto do
plano de altura `z` está sob este pixel?" (`telaParaMundo(sx, sy, z)`: soma o deslocamento de volta antes de
inverter). Mas **qual** altura usar para um dedo, ninguém sabe: era o problema que ficou do passo 1.

O `ORIGEM.y` agora reserva `4 × ALTURA_DO_DEGRAU` px no alto: é o espaço do bloco mais alto. Sem essa reserva
o pico sairia do canvas.

---

## 2. Um bloco é uma caixa de três polígonos

*Reusa `shoot-em-up/04-inimigos` (uma lista de objetos, percorrida e desenhada um a um).*

Do alto de um bloco só se veem **três faces**: o topo (um losango) e as duas laterais voltadas para você.
`cantosDoBloco(x, y, z)` devolve os quatro cantos do losango na altura `z`, sempre na ordem
*cima, direita, baixo, esquerda*, em qualquer giro. Chamada duas vezes, uma para o topo e outra para a base,
ela dá tudo o que `desenharCaixa` precisa:

```js
const topo = cantosDoBloco(x, y, ate), base = cantosDoBloco(x, y, de);
tracar([topo[3], topo[2], base[2], base[3]], estilo.esquerda);   // lateral esquerda
tracar([topo[2], topo[1], base[1], base[2]], estilo.direita);    // lateral direita
tracar(topo, estilo.topo);                                       // topo, por último
```

As laterais são o topo multiplicado por 0,7 e 0,5 (`escurecer`, calculado uma vez em
`ESTILO_DA_ALTURA`). Sem sombra de verdade, a diferença de brilho é o que faz o olho ler o volume. Um bloco
de altura 0 não tem lateral: os dois polígonos ficam sem área.

---

## 3. A ordem do pintor

*Reusa `reflexo/06-objetos` (z-buffer e ordem por distância), agora no outro sentido.*

Um bloco alto pode tapar o que está atrás, e quem decide é a **ordem de desenho**: o que se pinta depois
cobre o que já estava. A regra do **algoritmo do pintor** é a mesma de quem pinta uma paisagem: primeiro o
céu e as montanhas, por último o que está mais perto.

Na ilha, "mais perto" tem uma conta exata. Depois do giro, a casa `(x', y')` está mais à frente quanto
**maior** for `x' + y'` (é a mesma soma que dá o `sy` da tela). A lista é ordenada por ela e, no empate,
pela altura:

```js
function montarListaDeDesenho() {
    const lista = [];
    alturas.forEach(function (linha, y) {
        linha.forEach(function (altura, x) {
            const centro = girarPonto(x + 0.5, y + 0.5, rotacao);
            lista.push({ x: x, y: y, altura: altura, proximidade: centro.x + centro.y });
        });
    });
    return lista.sort(function (a, b) { return a.proximidade - b.proximidade || a.altura - b.altura; });
}
```

O `desenharCasas` só percorre `listaDeDesenho` do começo ao fim. Girar a vista refaz a lista (`girarVista`):
outro giro, outra ordem.

### Contra o z-buffer do Reflexo

| | z-buffer (`reflexo/06-objetos`) | algoritmo do pintor (aqui) |
|---|---|---|
| Quem decide o que aparece | cada **coluna** de pixels guarda a distância da parede | a **ordem** em que as peças são pintadas |
| Memória extra | um número por coluna da tela | nenhuma, só a lista ordenada |
| O que cobre o quê | um sprite só é pintado onde é mais perto que a parede | tudo é pintado, o de trás é coberto depois |
| Desperdício | quase nenhum | pinta pixels que serão cobertos (o "overdraw") |
| Limite | precisão da distância guardada | **peças que cruzam várias casas** não têm lugar certo na lista |

No Reflexo o jogo sabia, por coluna, a distância de cada parede, e o z-buffer deixava um sprite ser
pintado só onde ele ganhava. Aqui as peças são caixas **de uma casa só**, e uma soma e uma comparação bastam:
sem buffer. O limite é real: se uma peça atravessasse duas casas (uma ponte), ela cairia no meio da lista e
cobriria o que não devia. O Dique não tem peças assim (decisão do GDD), e é por isso que o pintor basta.

**A prova está numa página de teste:** para todo par de blocos cujas silhuetas se sobrepõem na tela, o
desenhado depois tem de estar mais perto (`x'+y'` maior ou, no empate, mais alto), nos quatro giros.
O controle negativo (a lista invertida) tem de falhar, senão o teste não provaria nada.

---

## 4. A água é uma camada na mesma ordem

A superfície da água é uma **caixa fina**, da altura do terreno até `NIVEL_DA_AGUA`, pintada logo **depois do
bloco** da mesma casa, e só nas casas mais baixas que o nível:

```js
desenharCaixa(casa.x, casa.y, 0, casa.altura, mar ? ESTILO_DO_MAR : ESTILO_DA_ALTURA[casa.altura]);
if (casa.altura < NIVEL_DA_AGUA) desenharCaixa(casa.x, casa.y, casa.altura, NIVEL_DA_AGUA, estiloDaAgua(casa));
```

Como ela segue a ordem do pintor, um bloco **à frente** cobre a água de trás, e a água à frente **deixa
ver** o bloco de trás, porque é translúcida (`rgba` com alfa 0,55). Por isso as valas rasas da ilha parecem
poças: o terreno está lá embaixo, visível através do azul.

Duas pistas que não dependem de cor: a **borda branca** de cada caixa de água (a forma) e a onda, que mexe
no alfa de cada casa com um seno. A onda é o primeiro uso do `dt`:

```js
function atualizar(tempo) {
    if (!movimentoReduzido) faseDaOnda += tempo * 2;
}
```

O laço calcula `tempo` em segundos, nunca negativo e com teto de 0,05 (uma aba esquecida não vira um salto
gigante), e chama `atualizar(tempo)` e depois `desenhar()`: atualizar e desenhar separados, como em todo o curso.
Com `prefers-reduced-motion` ligado a onda não anda. Aqui o nível da água é uma constante;
quem sobe e desce a maré é o passo 5.

---

## 5. O que o passo 2 ainda não sabe

- **Clicar num bloco alto** erra: a inversa trata todo pixel como chão (`z = 0`). O quadradinho branco do **H** é a
  prova. Passo 3.
- **Os sprites** são letras `C` por enquanto; as casas de verdade (arte em texto) vêm com a enchente.
- **A casa escondida** atrás do pico mostra por que o jogo vai precisar girar a vista como jogada, não só como enfeite.

---

## Experimente

1. Em `montarListaDeDesenho`, troque `a.proximidade - b.proximidade` por `b.proximidade - a.proximidade`
   (da frente para trás). O que aparece? Quem cobre quem?
2. Tire só o desempate `|| a.altura - b.altura`. Algo muda na tela? Por quê? (Dica: dois blocos de mesma soma
   se **tocam**, mas sobrepõem área?)
3. Ponha `NIVEL_DA_AGUA = 2`. Quais casas ficam debaixo d'água? E com `5`? O pico fica debaixo d'água?
4. Troque `0.7` e `0.5` em `estiloDoBloco` por `0.9` e `0.9`. O volume ainda se lê? O que o olho usa
   para saber que são duas faces diferentes?
5. Em `ALTURAS_EM_TEXTO`, ponha um `4` na casa da frente da ilha, perto da borda de baixo. O que ele cobre?
   Gire a vista e descreva o que o mesmo bloco cobre agora.
6. Em `desenharCasas`, pinte a água **antes** do bloco. O que acontece com a vala? Com o mar?
7. Passe o mouse sobre o pico com **H** ligado. A que distância, em pixels, o quadrado branco fica do topo?
   Essa distância depende do quê, na fórmula de `projetar`?
8. **Quebre de propósito:** em `girarVista`, apague a linha `listaDeDesenho = montarListaDeDesenho();`. Gire a vista
   e olhe os blocos altos. O que está errado, e o que o **H** diz sobre a ordem?

---

**Anterior:** [`01-grade`](../01-grade/) · **Próximo:** `03-picking` — o dedo acerta o topo e a lateral de um bloco, não o chão atrás dele.
