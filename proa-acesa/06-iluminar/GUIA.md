# Proa Acesa — Passo 6: Iluminar

**Mudou:** `regras.js` ganha a **luz** (o teste do cone e a brasa de cada recife, matemática pura).
`script.js` ganha o que precisa do three.js: o `Raycaster` do que tapa a luz e o desenho dos recifes
(escondidos, vistos ou lembrados). A partida passa a **começar na noite**, o cone desenhado passa a ter o
tamanho e a direção do cone da regra (16°, 24 m, na horizontal). A ilha passa a **tapar a luz** e é desenhada
a partir dos dados da regra; o comboio nasce em lugar válido e a câmera enquadra a cauda (ambos já vêm do passo 5).
**Rode:** abra o `index.html`; os controles são os do passo 5. **H** mostra os eixos e, em **todos** os recifes
(até os esquecidos), o disco onde o barco bate.

---

## O que você vê

Noite fechada e quase nada na tela: a barca, o cone de luz, o anel do porto, as luzes dos barcos. Os recifes
**só aparecem onde a lanterna passa**: pedra clara e sólida, com um anel de espuma. Quando a
luz sai de cima, o recife não some: vira um **contorno cinza**, sem espuma, que se apaga em 3 segundos
(a lembrança). Três **colunas** de 5 m (os cilindros altos) e a **torre do farol** têm uma regra extra:
um recife escondido atrás delas **não é iluminado**, por mais que o cone o cubra. Gire a lanterna com
**Q/E** e varra o mar. A câmera mostra a barca, o mar à frente e pelo menos três barcos da fila.

---

## 1. Dentro do cone? O produto escalar, e depois a geometria honesta

O feixe sai de `origem` para uma `direcao` (um ângulo no mundo, `proa + guinada`). A regra vive no plano XZ
(GDD §4.1): um **leque** de 16° de meio-ângulo e 24 m. O recife é um **disco**, e basta que **um ponto dele**
esteja no leque. São dois casos:

```js
const produtoEscalar = (dx * -Math.sin(direcao) + dz * -Math.cos(direcao)) / distancia;
if (produtoEscalar > Math.cos(MEIO_ANGULO_DA_LANTERNA)) {
    return distancia - recife.raio <= ALCANCE_DA_LANTERNA;
}
return encostaNaBorda(dx, dz, recife.raio, direcao + MEIO_ANGULO_DA_LANTERNA) || encostaNaBorda(..., direcao - MEIO_ANGULO_DA_LANTERNA);
```

**1) O centro do recife está dentro do ângulo.** `(dx, dz)` é o vetor da origem ao recife; dividido pela
`distancia`, é a **direção** dele. O **produto escalar** dessa direção com a do feixe `(−sen, −cos)` é o
**cosseno do ângulo entre as duas**: 1 = de frente, 0 = de lado (90°), −1 = atrás. O cosseno **cai** quando o
ângulo cresce, então "dentro do ângulo" é "cosseno **maior** que o cosseno do meio-ângulo". Sem `acos`. Aí o
ponto do disco mais perto da lanterna está **na frente dele**, a `distancia − raio`: basta caber nos 24 m.

**2) O centro está fora do ângulo.** O disco só entra se **encostar numa das duas bordas** do leque. A borda é
um segmento do bico até 24 m; `encostaNaBorda` projeta o centro do recife nele (preso ao segmento com
`limitar`) e compara a distância com o raio. Antes, o alcance (`distância − raio > 24`) e a margem do ângulo
(`asin(raio ÷ distância)`) eram testados **separados**, e um recife podia ser "visto" sem que nenhum ponto
dele estivesse dentro do leque de 24 m. Se a lanterna está em cima dele (`distancia <= raio`), vale como
iluminado.

| Onde está o recife | dentro (meio-ângulo 16°, cos = 0,961)? |
|---|---|
| de frente (0°), 10 m, raio 0,5 | sim |
| a 10°, 10 m | sim (cosseno 0,985) |
| a 20°, 10 m, raio 0,01 | não (a borda passa a 0,7 m do centro) |
| a 20°, 10 m, raio 3 | sim: o disco encosta na borda |
| de lado (90°) ou atrás (180°) | não |
| centro a **24,4 m** de frente, raio 0,5 | sim: o ponto mais perto está a 23,9 m |
| centro a **24,6 m** de frente, raio 0,5 | não: o ponto mais perto está a 24,1 m |
| raio 3, a 20° e 27 m | não: o único trecho do disco no leque passaria dos 24 m (a regra antiga dizia sim) |

**Sobre a arfagem.** A regra ignora a arfagem (GDD §4.1), então o cone desenhado fica na horizontal:
`cone.rotation.x = -arfagem.angulo` desfaz a inclinação que o `feixe` (o pai) lhe daria. Só o `SpotLight` (a mancha
no mar) se inclina. Antes o cone apontava para o céu a 60° com os recifes ainda "iluminados": desenho e regra discordavam.

---

## 2. O `Raycaster`: algo alto tapa a luz

Estar dentro do cone não basta. É a **linha de vista** do `xenomorph/05-criaturas` (`enxerga`: perto o
bastante **e** nada sólido no caminho): o cone é o "perto o bastante" (agora com direção) e o raio é o
`caminhoLivre`. O `script.js` lança um raio do bico da lanterna ao recife:

```js
rascunho.alvo.set(recife.x, 0.5, recife.z).sub(origem);        // do bico ao recife
raycaster.far = rascunho.alvo.length();                        // o raio só vale até o recife
raycaster.set(origem, rascunho.alvo.normalize());
acertos.length = 0;
raycaster.intersectObjects(oclusores, false, acertos);
```

`intersectObjects` devolve o que o raio atravessa, do mais perto ao mais longe, **só** nas malhas da lista
`oclusores`: as pedras altas **e o chão e a torre da ilha** (recifes baixos não tapam nada). Um acerto que
não seja o próprio recife = **tapado**. Dois cuidados de desempenho: o terceiro argumento é a **mesma
lista** `acertos`, esvaziada a cada raio (sem lista nova por raio), e `false` impede que o raio desça pelos
filhos das pedras (o disco da tecla **H** não pode tapar nada). Os laços do quadro são `for` simples, sem
`forEach` e sem função nova por quadro.

É o eco do DDA do `reflexo/`: lá o raio andava **célula por célula** numa grade até bater numa parede; aqui
o three.js devolve o primeiro acerto de uma vez, em malhas de qualquer forma. Duas armadilhas: o
`Raycaster` usa a **matriz de mundo** das malhas, que só se atualiza no desenho, então `montarCena` chama
`cena.updateMatrixWorld(true)` (senão o primeiro raio erra); e ele **não** ignora malhas invisíveis
(`visible = false`), por isso as colunas esquecidas ainda tapam a luz.

**A ilha é dado e é obstáculo.** `ilha = { x: -5, z: -12, raio: 5.5 }` está em `regras.js`: barca e barcos
**batem** nela como num recife (`recifeTocadoPor` confere os recifes e depois a ilha), e o `script.js` põe o farol
em `ilha.x`, `ilha.z`. Antes, ela só era desenhada e todos passavam por dentro. A torre também entra em `oclusores`: um recife atrás do farol fica no
escuro.

---

## 3. A regra pede, o script responde

`regras.js` não pode usar `THREE`, mas precisa saber se há algo alto no caminho. A solução é **receber a
pergunta como função**:

```js
recife.iluminado = recifeNoCone(origem, direcao, recife) && !estaTapado(origem, recife);
```

O `&&` só chama `estaTapado` (o raio, mais caro) para quem **já passou no cone**, que é barato e filtra quase tudo.
Para testar `regras.js`, basta passar uma `estaTapado` falsa.

---

## 4. A brasa: o que foi visto vira lembrança

```js
recife.brasa = recife.iluminado ? SEGUNDOS_DE_BRASA : Math.max(0, recife.brasa - tempo);
```

Visto neste quadro: `brasa = 3` s. Não visto: `brasa` só esfria, e não passa de 0. É o temporizador
do `shoot-em-up/03-tiros` (`tempoDoClarao = Math.max(0, tempoDoClarao - tempo)`: um número que desce até
zero). O desenho depende dos dois números, `iluminado` e `brasa`:

| Estado | Condição | Pedra | Espuma | Opacidade |
|---|---|---|---|---|
| visto | `iluminado` | sólida, `#e8e3d4` | sim | 1 |
| lembrado | `brasa > 0`, sem luz | só o **contorno** (`wireframe`), `#7f8a94` | não | `brasa ÷ 3` |
| esquecido | `brasa = 0` | escondida | não | |

**A cor nunca é a única pista** (GDD §7): visto × lembrado muda a **forma** (sólida × contorno), o anel de
espuma e o brilho. O material é `MeshBasicMaterial`: ele ignora as luzes, e o recife se lê no escuro sem
depender do `SpotLight`. A tecla **H** mostra "o invisível": a pedra esquecida tem opacidade 0, então o que
aparece é o **disco laranja** de cada recife (`criarDisco`, filho da pedra), com o raio onde o barco bate
(raio do recife + 1,2 m).

---

## 5. Começar no escuro

`tempoTotal` nasce em `DURACAO_DO_ENTARDECER`: a noite já fechou, sem os 40 s do entardecer do passo 3. O cone
desenhado vem das mesmas constantes da regra: **o que você vê e o que a regra decide concordam**.

---

## 6. A câmera do passo 5, medida com a névoa e a lanterna

A câmera é a do passo 5 (`seguirComACamera`: a barca, 14 m à frente e os 3 primeiros barcos, a `(0, 18, 22)` do
meio entre a frente e o 3º barco, afastando-se até ×3 quando a fila se estica). O que muda aqui é só o que ela
mostra: a barca, a luz e os recifes lembrados. Repeti a projeção (120 s, retas de 10 s e retornos em U, 1280×800 e
390×750): a barca, o ponto à frente e os barcos 1 e 2 ficaram dentro da tela em **100%** dos quadros, e o 3º saiu
em 8 de 7.200 quadros (tela larga) e 17 (em pé), com ele a 59 m e a câmera ainda subindo. O mar passa de 90 para
130 m: com a câmera afastada, a borda de 90 m apareceria no fundo da tela; a névoa esconde a de 130 m, e a névoa de tarde sobe
de 0,012 para 0,03 (a da noite) para a borda não aparecer nem no entardecer. O quarto barco
só aparece se a fila encolher.

---

## 7. Onde o comboio nasce, e a névoa que leva tempo

O comboio nasce só onde `filaLivre` diz que dá para viver (dentro do mundo, fora do porto, longe de recifes e
ilha); se a fila de trás da barca não serve, **gira 30°** e tenta de novo, e a cada volta inteira (12 giros) sem
achar **recua mais 7 m** (0, 7, 14, 21: a barca pode estar no meio do porto). Cercada por 48 tentativas, `criarComboio` tenta o **anel**
(a 10 e a 20 m da barca, a fila de través) e só por último a `PARTIDA`; todas passam por `filaLivre`, que também exige o 1º
barco a menos de 35 m da barca. Sem lugar vivo, não nasce nada naquele quadro (tenta no seguinte): nunca um comboio já perdido.
Sem sorteio: o mesmo mundo dá o mesmo comboio. E um barco só
se perde na névoa depois de **5 s seguidos** a mais de 35 m do da frente; senão, perdido o primeiro, o de trás
mediria até a barca e a fila sumiria em 4 quadros. As duas regras já vêm do passo 5.

---

## Testes

[`verificacao/proa-acesa/06-iluminar.html`](../../verificacao/proa-acesa/06-iluminar.html) confere a tabela-verdade
do cone, os raios, a brasa e a cena por milhares de quadros; roda com `node verificacao/rodar.mjs proa-acesa`.

---

## Experimente

1. Mude `SEGUNDOS_DE_BRASA` para 10 e depois para 0,5. Em qual a lembrança ajuda mais? Em qual o
   jogo fica difícil demais?
2. Mude `MEIO_ANGULO_DA_LANTERNA` para 5° (`5 * Math.PI / 180`). O cone desenhado acompanha?
3. Troque as duas chamadas de `encostaNaBorda` por `false`. Um recife grande que só encosta no feixe ainda
   é visto? Volte e tire o `Math.cos(...)` do primeiro `if`: o que muda?
4. Em `atualizarBrasas`, troque o `&&` para chamar `estaTapado` **antes** do cone. Conte com um
   `console.log` quantas vezes o raio roda por quadro, antes e depois.
5. Ponha **todas** as pedras em `oclusores`. O que acontece com um recife atrás de outro baixo? E por que o
   teste `!== recife.malha` passa a ser indispensável?
6. Tire `cena.updateMatrixWorld(true)` de `montarCena`. O que o primeiro quadro mostra?
7. Faça a regra honrar a **arfagem**: o feixe só toca o mar a `altura ÷ tan(−arfagem)` metros. Em que
   linha da regra isso entra? E o cone desenhado, volta a acompanhar a arfagem?

---

**Anterior:** [`05-barcos`](../05-barcos/) · **Próximo:** [`07-tempestade`](../07-tempestade/) — a noite vira dados: névoa, relâmpago, chuva e o calor da lanterna.
