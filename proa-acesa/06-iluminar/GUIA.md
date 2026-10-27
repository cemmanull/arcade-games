# Proa Acesa — Passo 6: Iluminar

**Mudou:** `regras.js` ganha a **luz** (o teste do cone e a brasa de cada recife, matemática pura).
`script.js` ganha o que precisa do three.js: o `Raycaster` das colunas e o desenho dos recifes
(escondidos, vistos ou lembrados). A partida passa a **começar na noite**, e o cone desenhado passa a
ter o tamanho do cone da regra (16°, 24 m).
**Rode:** abra o `index.html`; os controles são os do passo 5. **H** mostra os eixos e **todos** os
recifes, inclusive os que a lanterna não vê.

---

## O que você vê

Noite fechada e quase nada na tela: a barca, o cone de luz, o anel do porto, as luzes dos barcos. Os
recifes **só aparecem onde a lanterna passa**: pedra clara e sólida, com um anel de espuma. Quando a
luz sai de cima, o recife não some: vira um **contorno cinza**, sem espuma, que se apaga em 3 segundos
(a lembrança). Três **colunas** de 5 m (os cilindros altos) têm uma regra extra: um recife escondido
atrás de uma coluna **não é iluminado**, por mais que o cone o cubra. Gire a lanterna com **Q/E** e
varra o mar.

---

## 1. Dentro do cone? O produto escalar

O feixe sai de `origem` para uma `direcao` (um ângulo no mundo, `proa + guinada`). Para cada recife:

```js
const produtoEscalar = (dx * -Math.sin(direcao) + dz * -Math.cos(direcao)) / distancia;
return produtoEscalar > Math.cos(MEIO_ANGULO_DA_LANTERNA + margemDoRaio);
```

`(dx, dz)` é o vetor da origem ao recife; dividido pela `distancia`, é a **direção** dele. O **produto
escalar** dessa direção com a do feixe `(−sen, −cos)` é o **cosseno do ângulo entre as duas**: 1
= de frente, 0 = de lado (90°), −1 = atrás. O cosseno **cai** quando o ângulo cresce, então "dentro
do cone" é "cosseno **maior** que o cosseno do meio-ângulo". Sem `acos` nem ângulos na conta.

| Onde está o recife (alvo pequeno, 10 m) | cosseno | dentro (meio-ângulo 16°, cos = 0,961)? |
|---|---|---|
| de frente (0°) | 1,000 | sim |
| a 10° | 0,985 | sim |
| a 20° | 0,940 | não |
| de lado (90°) | 0 | não |
| atrás (180°) | −1 | não |
| a **24,1 m** de frente | 1,000 | não: passou do alcance de 24 m |

A borda é estrita (`>`): exatamente em 16° o recife **não** entra. E o recife não é um ponto: a
`margemDoRaio` (`asin(raio ÷ distância)`) alarga o cone pelo tamanho dele, para bastar a **borda** do
recife entrar. Se a lanterna está em cima dele (`distancia <= raio`), vale como iluminado.

A regra vê só o plano XZ (GDD §4.1): a **arfagem** não entra na conta, só o desenho do feixe a mostra.

---

## 2. O `Raycaster`: uma coluna tapa a luz

Estar dentro do cone não basta. É a **linha de vista** do `xenomorph/05-criaturas` (`enxerga`: perto
o bastante **e** nada sólido no caminho): o cone é o "perto o bastante" (agora com direção) e o raio
é o `caminhoLivre`. O `script.js` lança um raio do bico da lanterna ao recife:

```js
rascunho.alvo.set(recife.x, 0.5, recife.z).sub(origem);        // do bico ao recife
raycaster.far = rascunho.alvo.length();                        // o raio só vale até o recife
raycaster.set(origem, rascunho.alvo.normalize());
return raycaster.intersectObjects(colunas).some(function (acerto) { return acerto.object.parent !== recife.malha; });
```

`intersectObjects` devolve o que o raio atravessa, do mais perto ao mais longe, **só** nas malhas
da lista `colunas` (as pedras altas): recifes baixos não tapam nada. Um acerto que não seja o
próprio recife (uma coluna também é recife, e o raio a toca) = **tapado**.

É o eco do DDA do `reflexo/`: lá o raio andava **célula por célula** numa grade até bater numa
parede; aqui o three.js devolve o primeiro acerto de uma vez, em malhas de qualquer forma.
Duas armadilhas: o `Raycaster` usa a **matriz de mundo** das malhas, que só se atualiza no desenho,
então `montarCena` chama `cena.updateMatrixWorld(true)` (senão o primeiro raio erra); e ele **não**
ignora malhas invisíveis (`visible = false`), por isso as colunas esquecidas ainda tapam a luz.

---

## 3. A regra pede, o script responde

`regras.js` não pode usar `THREE`, mas precisa saber se há uma coluna no caminho. A solução é
**receber a pergunta como função**:

```js
function atualizarBrasas(tempo, origem, direcao, estaTapado) {
    recife.iluminado = recifeNoCone(origem, direcao, recife) && !estaTapado(origem, recife);
```

O `&&` só chama `estaTapado` (o raio, mais caro) para quem **já passou no cone**, que é barato e
filtra quase tudo. Para testar `regras.js`, basta passar uma `estaTapado` falsa que devolve `true`
ou `false`.

---

## 4. A brasa: o que foi visto vira lembrança

```js
recife.brasa = recife.iluminado ? SEGUNDOS_DE_BRASA : Math.max(0, recife.brasa - tempo);
```

Visto neste quadro: `brasa = 3` s. Não visto: `brasa` só esfria, e não passa de 0. É o temporizador
do `dealer-out/06-atordoamento` (`atordoado = Math.max(0, atordoado - tempo)`: um número que desce até zero). O desenho depende
dos dois números, `iluminado` e `brasa`:

| Estado | Condição | Pedra | Espuma | Opacidade |
|---|---|---|---|---|
| visto | `iluminado` | sólida, `#e8e3d4` | sim | 1 |
| lembrado | `brasa > 0`, sem luz | só o **contorno** (`wireframe`), `#7f8a94` | não | `brasa ÷ 3` |
| esquecido | `brasa = 0` | escondida | não | |

**A cor nunca é a única pista** (GDD §7): visto × lembrado muda a **forma** (sólida × contorno), o
anel de espuma e o brilho. O material é `MeshBasicMaterial`: ele ignora as luzes, e o recife se lê
no escuro sem depender do `SpotLight`. A tecla **H** acende todos, para ver o que a lanterna não vê.

---

## 5. Começar no escuro

`tempoTotal` nasce em `DURACAO_DO_ENTARDECER`: a noite já fechou, sem os 40 s do entardecer do passo 3.
O cone desenhado vem das mesmas constantes da regra (`ALCANCE_DA_LANTERNA`, `MEIO_ANGULO_DA_LANTERNA`):
**o que você vê e o que a regra decide concordam**.

---

## Experimente

1. Mude `SEGUNDOS_DE_BRASA` para 10 e depois para 0,5. Em qual a lembrança ajuda mais? Em qual o
   jogo fica difícil demais?
2. Mude `MEIO_ANGULO_DA_LANTERNA` para 5° (`5 * Math.PI / 180`). O cone desenhado acompanha?
3. Tire a `margemDoRaio` do teste do cone. Um recife grande que só encosta no feixe ainda é visto?
4. Em `atualizarBrasas`, troque o `&&` para chamar `estaTapado` **antes** do cone. Conte com um
   `console.log` quantas vezes o raio roda por quadro, antes e depois.
5. Ponha **todas** as pedras em `colunas` (tire o `if (recife.alta)`). O que acontece com um recife
   atrás de outro baixo? E por que o teste `!== recife.malha` passa a ser indispensável?
6. Tire `cena.updateMatrixWorld(true)` de `montarCena`. O que o primeiro quadro mostra?
7. Faça a espuma só aparecer a menos de 10 m da lanterna. Use `distanciaEntre`.
8. Acrescente o alcance pela **arfagem**: o feixe só toca o mar a `altura ÷ tan(−arfagem)` metros.
   Em que linha da regra isso entra?

---

**Anterior:** [`05-barcos`](../05-barcos/) · **Próximo:** `07-tempestade` — a noite vira dados: névoa, relâmpago, chuva e o calor da lanterna.
