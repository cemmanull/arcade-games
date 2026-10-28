# Proa Acesa — Passo 5: Os barcos

**Mudou:** o código se **divide em dois arquivos**. `regras.js` (novo) guarda o mundo no plano XZ e **não usa
`THREE`**: barca, comboio, recifes e porto. `script.js` fica com a cena, a entrada e o laço. `index.html` carrega
`regras.js` **antes** do `script.js`; ganha um placar e o botão **Devagar**. O painel do passo 4 sai (**H** mostra só
os eixos) e a câmera **enquadra** a barca, o mar à frente e os 3 primeiros barcos. A ilha passa a **bater** como um
recife, o comboio nasce **só onde dá para viver** e a névoa leva 5 s para engolir um barco.
**Rode:** abra o `index.html`. **A/D** ou **←/→** viram, **S** (segure) anda devagar, **Q/E** e **↑/↓**
miram, como no passo 4. Leve os barcos de pesca ao anel dourado do porto, a uns 18 m do farol.

---

## O que você vê

Quatro barcos de pesca seguem a barca em fila, a 7 m um do outro. Cada um tem uma luz e uma flâmula
de **forma própria** (triângulo, quadrado, esfera): dá para distingui-los sem usar a cor. Os recifes
estão à vista, o porto é o anel dourado. Barco que toca um recife **afunda** (2,5 s) e sai da fila; barco que
entra no porto está **salvo**; a barca que bate **encalha** 2 s. Acabou a fila? Chega um comboio novo. A barca é
5% mais rápida que os barcos: segure **S** de vez em quando ou o primeiro fica para trás.

---

## 1. O que a coisa É × como APARECE

```text
regras.js   barcaNoMundo, barcosDePesca, recifes, porto     → só números {x, z, proa}
script.js   barca, malhas dos barcos, pedras, anel          → só desenho
```

No passo 4 a posição da barca morava no próprio `Group`. Agora existem **dois** objetos: o que a barca
**é** (`barcaNoMundo = { x, z, proa, giro, ... }`) e o que **aparece** (`barca`, a malha). A cada
quadro, `copiarMundoParaAsMalhas()` só **copia** `x`, `z` e `proa` para a malha (a altura da onda é
só desenho). É a ideia do `xadrez/01-tabuleiro`, agora em arquivos separados.

A ordem dos scripts importa: o `script.js` usa o que o `regras.js` declara. Como o `regras.js` não toca em
`THREE`, uma página de teste o carrega **sozinho**, sem three.js nem WebGL, e roda milhares de quadros em segundos.

---

## 2. A frente no plano e o `atan2`

A frente de qualquer coisa com `proa` é `(−sen proa, −cos proa)` (o −z do passo 4). Para virar
**na direção** de um alvo, a conta inversa:

```js
const rumoAteOAlvo = Math.atan2(-(alvo.x - barco.x), -(alvo.z - barco.z));
```

`Math.atan2` transforma uma diferença `(dx, dz)` num **ângulo**, como o `shoot-em-up/06-contra-ataque`
fazia para a nave inimiga mirar. O sinal de menos nos dois argumentos é a convenção da frente `−`.

---

## 3. Buscar e chegar

```js
barco.proa = normalizarAngulo(barco.proa + limitar(erroDeRumo, -passoDeGiro, passoDeGiro));
const folga = (distanciaEntre(barco, alvo) - DISTANCIA_DO_COMBOIO) / ZONA_DE_FREADA;
barco.velocidade = aproximar(barco.velocidade, VELOCIDADE_DO_BARCO * limitar(folga, 0, 1), ACELERACAO_DO_BARCO * tempo);
```

- **Buscar** (*seek*): virar para a posição do alvo. O giro é limitado a **1,1 rad/s**, menor que o
  da barca (1,4). É isso que faz a cauda **balançar**: numa curva seca o barco não acompanha o giro
  e vai direto ao da frente, **cortando** a curva, e demora a se alinhar de novo. (Medido numa
  simulação sem recifes: curva de 1,7 s a leme total depois de 8 s de reta, o último barco chegou
  a 22 m do caminho da barca.)
- **Chegar** (*arrive*): a velocidade desejada cai a zero ao chegar a 7 m do alvo, em vez de bater
  nele; a velocidade real corre atrás dela com aceleração limitada (`aproximar`, do passo 4).
- Velocidade máxima de 95% da barca: o primeiro barco perde 0,25 m/s para ela. Com **S** (2,5 m/s)
  ele alcança. Mais de 35 m atrás do da frente **por mais de 5 s seguidos**, o barco **se perde na névoa**: conta como
  naufrágio. Os 5 s existem por justiça: perdido o primeiro, o de trás passa a seguir a barca, ainda mais longe, e a
  fila sumiria em 4 quadros. Cada barco conta os seus segundos (`segundosPerdido`) e zera ao voltar: dá para esperar.

Os outros barcos reutilizam a mesma função: o alvo deles é o barco da frente, não a barca.

---

## 4. A fila é uma lista viva

```js
function alvoDoBarco(barco) {
    const indice = barcosDePesca.indexOf(barco);
    return indice <= 0 ? barcaNoMundo : barcosDePesca[indice - 1];
}
```

O alvo é uma **função** de quem está na lista, como os alvos dos fantasmas do
`pacman/05-personalidades` (cada um tem a sua função de alvo). A fila é o corpo da
`jogo-da-cobrinha/06-cobra`: cada elemento segue o da frente. Aqui, com inércia.

Tire um barco da lista e o de trás **passa a seguir o da frente dele**, sem uma linha a mais. E a
lista **cresce e encolhe** como a dos tiros do `shoot-em-up/03-tiros`:

```js
for (let i = barcosDePesca.length - 1; i >= 0; i--) {   // de trás para a frente
    ...
    barcosDePesca.splice(i, 1);
}
```

Percorrer **de trás para a frente** faz tirar o item `i` não mudar o índice dos que faltam ver.
Quem toca um recife vai para `barcosAfundando` (ainda desenhado, afundando 2,5 s), depois some. Quem
sai do mundo entra em `barcosRemovidos`: o `script.js` esvazia essa fila e tira a malha da cena, pois
`regras.js` não pode tocar na cena. Geometrias e materiais dos barcos são **compartilhados** (`partes`): tirar uma
malha não vaza nada. A fila tem no máximo 4 (o robô da página de teste confere).

### Onde o comboio nasce

Acabou a fila? Chega um comboio novo, em fila **atrás da barca**, mas só onde dá para viver
(`filaLivre`): dentro do mundo, fora do porto (senão os 4 barcos seriam "salvos" de graça) e longe de
recifes e ilha (senão naufragariam no primeiro quadro). Sem sorteio: se a fila de trás da barca não serve,
`criarComboio` a **gira 30°** e tenta de novo; a cada volta inteira (12 giros) sem achar, ela **recua mais 7 m**
(0, 7, 14 e 21 m: a barca pode estar dentro do porto). Cercada nas 48 tentativas, a busca **acaba num lugar
conferido**: depois dos giros e recuos, `criarComboio` tenta o **anel** (a 10 e a 20 m da barca, a fila de través) e só por último a
`PARTIDA`, e todas passam por `filaLivre`, que também exige o 1º barco a menos de 35 m da barca (senão a névoa o engoliria
no ato). Sem lugar vivo, **não nasce nada** naquele quadro: tenta no seguinte, com a barca em outro ponto, em vez de criar
um comboio perdido. Sem sorteio, o mesmo mundo dá o mesmo comboio.

---

## 5. Recifes e porto são dados

```js
{ x: 9, z: -4, raio: 2 }   // um recife: um círculo no plano
```

Barca, barcos, recifes, a ilha do farol (`ilha = { x: -5, z: -12, raio: 5.5 }`) e o porto são **círculos**
`{x, z, raio}` (GDD §4.1). Tocar é uma distância menor que a soma dos raios (`recifeTocadoPor`: recifes, depois a
ilha). Antes a ilha só era desenhada e todos passavam por dentro; agora o `script.js` põe o farol em `ilha.x` e
`ilha.z`, um número só para a regra e para o desenho. Os três desfechos:

| Quem | O que acontece |
|---|---|
| barco toca recife **ou a ilha** | afunda 2,5 s, sai da fila, `naufragios++` |
| barco entra no porto (raio 9 m) | sai da fila, `salvos++` |
| **barca** toca recife | **encalha**: 2 s parada; é empurrada para fora da pedra (com 1% de folga: no ponto exato o arredondamento a faria encalhar de novo) |

A barca é presa a ±80 m (o mundo é de 160 × 160 m).

---

## 6. Entrada por ação: o conserto do exercício 8 do passo 4

No passo 4, `acoes.esquerda = true/false`: segure **A**, aperte **←**, solte só a seta e a ação desligava, mesmo
com **A** apertada. **Este é o conserto do exercício 8 do passo 4**: cada ação guarda **quais entradas** a seguram.

```js
acoes = { esquerda: ["tecla:a", "tecla:arrowleft", "dedo:1"] }
function seguradaAgora(acao) { return (acoes[acao] || []).length > 0; }
```

Soltar uma entrada tira só a dela da lista. A ação vale enquanto sobrar alguma: duas teclas, dois
dedos no mesmo botão (`pointerId`), uma tecla e um botão. `blur` esvazia tudo.

---

## 7. A câmera mostra o que importa

A câmera do passo 4 (5 m acima, 8 m atrás) deixava os barcos, que vêm **atrás** da barca, embaixo dela. Agora a regra
é dita em metros (`seguirComACamera`): mostrar a **barca**, um ponto **14 m à frente** (um recife a tempo de
desviar) e os **3 primeiros barcos**. Ela olha para o meio entre a frente e o 3º barco e fica a `(0, 18, 22)` dele
(18 m acima, 22 m atrás, no sentido da proa), com 75° de campo na tela larga e 80° em pé.

Só que a fila **se estica**: o barco 1 é 5% mais lento e, numa reta, cada barco quer ficar a ~15 m do da frente (a
7 m a velocidade desejada cai a zero), então o 3º barco chega a 30 ou 45 m. `escalaParaCaber` pergunta, ponto a
ponto, quantas vezes a vista padrão precisa crescer para ele caber (atrás do meio o ponto fica perto da
câmera, onde a tela é estreita; num celular em pé cabe menos largura), e a câmera se afasta nessa proporção, até
×3. Os `ALCANCE_*` saíram de uma conta de projeção, não do olho.

**Medido** com uma página de projeção descartável: 120 s de retas de 10 s e retornos em U, e a cada quadro o
`camera.project` do jogo dizia onde caíam a barca, o ponto à frente e os 3 primeiros barcos, em 1280×800 e 390×750.
A barca, o ponto à frente e os barcos 1 e 2 ficaram na tela em **100%** dos quadros; o 3º saiu em 8 de 7.200 quadros
(tela larga) e 17 (em pé): ele estava a 59 m e a câmera ainda subia. Custo honesto: a barca fica pequena e, com a fila esticada, o mar
de 90 m deixava ver a borda (de tarde, com a névoa de 0,012, ela aparecia como uma faixa dura no alto do quadro). Por isso o mar
vai a 130 m e a névoa de tarde sobe de 0,012 (passo 3) para 0,03, a da noite: em captura de 1280×800 e 390×750 com a fila
esticada ao máximo (câmera ×3), nenhuma borda aparece.

---

## Testes

`verificacao/proa-acesa/05-barcos-regras.html` ([abrir](../../verificacao/proa-acesa/05-barcos-regras.html)) roda só o
`regras.js`; `05-barcos.html` ([abrir](../../verificacao/proa-acesa/05-barcos.html)) roda o jogo.
Ou `node verificacao/rodar.mjs proa-acesa`.

---

## Experimente

1. Mude `GIRO_MAXIMO_DO_BARCO` para 1,4 (igual ao da barca) e depois para 0,5. Em qual a cauda
   balança menos? Em qual os barcos batem nos recifes?
2. Mude `DISTANCIA_DO_COMBOIO` para 3 e para 15. O que a `ZONA_DE_FREADA` faz quando é 1?
3. Ponha `VELOCIDADE_DO_BARCO` igual a `VELOCIDADE_DA_BARCA`. O primeiro barco ainda se perde?
4. Em `julgarBarcosDaFila`, troque o laço para ir de frente para trás (`i++`). O que quebra?
5. Troque o alvo de cada barco por **dois** barcos à frente, deixando os dois primeiros na barca:
   `return indice < 2 ? barcaNoMundo : barcosDePesca[indice - 2];`. A cauda balança mais ou menos? (Com
   `indice - 2` puro, o barco 1 ganharia o alvo `undefined` e o jogo travaria: por quê?)
6. Segure **A**, aperte **←** e solte só a seta (o exercício 8 do passo 4): a barca continua virando
   agora? Troque `acoes` de volta para `true`/`false` e veja o bug voltar.
7. Dê aos barcos uma **quarta** flâmula (um cilindro): mexa só em `partes.bandeiras`.
8. Faça o comboio nascer **à frente** da barca. O alvo de cada um continua fazendo sentido?

---

**Anterior:** [`04-feixe`](../04-feixe/) · **Próximo:** [`06-iluminar`](../06-iluminar/) — os recifes só aparecem quando a lanterna os ilumina.
