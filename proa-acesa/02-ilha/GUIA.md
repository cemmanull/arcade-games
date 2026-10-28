# Proa Acesa — Passo 2: A ilha

**Mudou:** `script.js` (cena nova; a ponte e o laço continuam iguais). Os outros arquivos mudam
só o título. A tecla **H** ignora repetição de tecla e combinações com Ctrl/Alt/Meta (Ctrl+H é
atalho do navegador).
**Rode:** abra o `index.html` (precisa de internet, como no passo 1), e depois aperte **H**.

---

## O que você vê

Noite. Um mar escuro, uma ilha com um farol **apagado** ao fundo e, perto de você, uma barca de
casco marrom com uma lanterna acesa na proa. Dela sai um cone de luz fraco. A barca vira devagar
para a esquerda e para a direita, e o feixe **vai junto**: ele varre o mar, passa pela ilha e
ilumina o chão por onde passa.

Com **H** aparecem os eixos (vermelho = x, verde = y, azul = z) da barca e da lanterna. Repare que
eles giram com o casco.

---

## 1. Malha = geometria + material

```js
function criarMalha(geometria, cor) {
    const material = new THREE.MeshStandardMaterial({ color: cor, flatShading: true });
    return new THREE.Mesh(geometria, material);
}
```

No passo 1 usamos uma caixa com um material automático. Agora cada peça tem sua forma e sua cor.
Tudo no jogo é feito de **primitivas**: `BoxGeometry` (casco, cabine), `CylinderGeometry` (ilha,
torre, lente), `ConeGeometry` (telhado, feixe) e `PlaneGeometry` (mar). Nenhum modelo, nenhuma
imagem.

`MeshStandardMaterial` reage à luz. `flatShading: true` pinta cada face de uma cor só, deixando
o visual facetado, e é barato de calcular.

Isto é o "estado × desenho" do `xadrez/01-tabuleiro`, agora em 3D: o **estado** é `fase` (um
número que cresce com o tempo). A cada quadro, `atualizar` **deriva** dela o giro
(`barca.rotation.y = 0.7 · sen(fase)`) e as malhas só mostram esse giro. Por isso, se você mexer em
`barca.rotation.y` pelo console, o quadro seguinte desfaz: quem manda é a `fase`.

---

## 2. Luz

```js
cena.add(new THREE.HemisphereLight(0x6f8fb0, COR_DO_FUNDO, 2.4));
```

Sem luz, o `MeshStandardMaterial` fica **preto**. Duas luzes aqui:

- **`HemisphereLight`:** a claridade fraca do céu, azulada em cima e escura embaixo. É o que deixa
  o farol e a barca apenas visíveis.
- **`SpotLight`:** a lanterna de verdade. Um spot tem posição, direção (para o seu `target`),
  `angle` (a abertura do cone) e `distance` (até onde chega). É ele que clareia o mar.

Há ainda o material **emissivo** da lente (`emissive`): ele brilha sozinho, mas **não ilumina os
vizinhos**. Quem ilumina é o spot. É por isso que o farol apagado é só um material comum.

---

## 3. O grafo de cena

```text
cena
├── mar
├── ilha (com o farol)
└── barca
    ├── casco, cabine
    └── lanterna
        ├── poste, lente
        └── feixe  →  cone + SpotLight + alvo
```

`barca.add(lanterna)` pendura a lanterna na barca. A partir daí, **a posição e o giro da
lanterna são relativos ao pai**:

```js
lanterna.position.set(0, 1, -1.4);   // 1 m acima e 1,4 m à frente do centro da barca
feixe.position.z = -0.2;             // 20 cm à frente da lanterna
```

Esses números **nunca mudam** depois. O único que o laço altera é este:

```js
barca.rotation.y = AMPLITUDE_DO_GIRO * Math.sin(fase);
```

E, mesmo assim, a lanterna e o feixe acompanham. Cada objeto guarda só o seu lugar **em relação
ao pai**, e o three.js multiplica as transformações da raiz até a folha em cada quadro. Girar o
pai gira a família toda; é a mesma ideia de uma lista dentro de outra, só que cada item carrega
uma posição.

Por que isso importa para o jogo: mais tarde a lanterna vai girar um pouco **além** da proa
(para mirar o feixe), e o feixe vai herdar a proa mais esse giro, sem conta nossa.

A frente é **−z**, por convenção da câmera do three.js. Por isso a lanterna fica em `z = -1.4`
(mais sobre isso na seção 4: `getWorldDirection` devolve o **+z**, o oposto).

---

## 4. Local × mundo, na prática

O `position` de um filho é local. Para saber onde ele está **de verdade** no mundo, pergunte:

```js
const lugar = new THREE.Vector3();
lanterna.getWorldPosition(lugar);
```

Faça a conta com a barca em `(3, 0, 2)` girada `θ = 0,7` rad. Girar em y leva o ponto
`(0, 1, -1.4)` para:

```text
x = 3 + (-1.4 · sen 0,7) = 3 - 0,90 = 2,10
y = 1
z = 2 + (-1.4 · cos 0,7) = 2 - 1,07 = 0,93
```

`getWorldPosition` devolve exatamente `(2,10; 1; 0,93)`. No console, digite **tudo numa linha só**:

```js
barca.position.set(3, 0, 2); barca.rotation.y = 0.7; lanterna.getWorldPosition(new THREE.Vector3())
```

Numa linha só, nenhum quadro acontece entre o ajuste e a leitura. Se você ajustar numa linha e ler
em outra, o laço já terá sobrescrito `rotation.y` com o valor da `fase` e o resultado muda.

A mesma pergunta serve para o feixe. Para a **direção**, `getWorldDirection` tem uma pegadinha: ela
devolve o eixo **+z** do objeto no mundo, e o feixe aponta para o **−z**. Então a direção em que a
luz sai é a resposta **negada**:

```js
const atras = feixe.getWorldDirection(new THREE.Vector3());   // +z do feixe, no mundo
const frente = atras.clone().negate();                        // −z: para onde a luz vai
```

Com a barca sem giro, `frente` é `(0, 0, -1)`; girada `θ`, é `(-sen θ, 0, -cos θ)`.

Essa distinção (local × mundo) vai voltar no passo 4, com guinada e arfagem, e explica por que
uma bola presa no cinto de um personagem anda com ele.

---

## 5. O feixe é desenho; a luz é o SpotLight

O cone translúcido (`MeshBasicMaterial`, `transparent`, `opacity: 0.18`, `depthWrite: false`) é só
**um efeito visual** para você enxergar o feixe no ar. Quem clareia o mar é o `SpotLight`, que
tem a mesma abertura (`Math.atan(raio / alcance)`) e aponta para um `alvo` pendurado no próprio
feixe, para o alvo viajar junto.

Detalhe de geometria: o `ConeGeometry` nasce com a ponta para cima. Antes de usar, deslocamos e
viramos a geometria **uma vez** (`translate`, `rotateX`), para a ponta ficar na lanterna e a boca
aberta para a frente. É mais simples do que girar o objeto toda vez.

---

## Experimente

1. Mude `AMPLITUDE_DO_GIRO` para `Math.PI`: a barca balança até ficar de costas para o farol. O
   feixe continua saindo da proa em todo ângulo.
2. Mude `lanterna.position` para `(0, 1, 1.4)`: a lanterna passa para a popa, e o feixe continua
   apontando para a frente. Por quê? (O cone aponta para o −z do próprio feixe; a posição da
   lanterna só muda de onde ele sai.)
3. Troque `ALCANCE_DO_FEIXE` por 25: o cone fica **mais comprido e mais fino**. O raio na ponta
   continua 3 m, então o meio-ângulo `atan(RAIO / ALCANCE)` cai de 14° para 6,8°. O `SpotLight`
   usa a mesma conta (abertura menor) e o seu `distance` (`ALCANCE × 1.5`) sobe de 18 para 37,5 m:
   a luz alcança mais longe, mas num leque mais estreito. É a troca "estreito alcança longe, largo
   cobre mais" do jogo (GDD §4.2).
4. Troque a intensidade do `SpotLight` de 120 para 600 e depois para 5.
5. Em `atualizar`, acrescente `lanterna.rotation.y = 0.5 * Math.sin(fase * 3)`. O feixe passa a
   varrer **além** da proa; as posições do mundo mudam, as locais não.
6. Aperte **H** e veja se os eixos da lanterna giram sozinhos quando só a barca gira.
7. Pendure um objeto novo na lanterna, por exemplo `lanterna.add(criarMalha(new THREE.BoxGeometry(0.2, 0.2, 0.2), 0xff8a4d))`.
   Ele vai junto com a barca sem mais nenhuma linha?
8. Faça o farol "acender": dê `emissive` à `salaDaLampada`. Ela brilha, mas ilumina a ilha? (Não.
   O que faltaria?)

---

**Anterior:** [`01-cena`](../01-cena/) · **Próximo:** [`03-mar`](../03-mar/) — o mar para de ser um piso liso e ganha ondas e névoa.
