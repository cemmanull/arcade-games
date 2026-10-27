# Proa Acesa — Passo 5: Os barcos

**Mudou:** o código se **divide em dois arquivos**. `regras.js` (novo) guarda o mundo no plano XZ e
**não usa `THREE`**: barca, comboio, recifes e porto. `script.js` fica com a cena, a entrada e o laço.
`index.html` carrega `regras.js` **antes** do `script.js`; ganha um placar e o botão **Devagar**. O
painel do passo 4 sai (a tecla **H** mostra só os eixos) e a câmera sobe.
**Rode:** abra o `index.html`. **A/D** ou **←/→** viram, **S** (segure) anda devagar, **Q/E** e **↑/↓**
mirram, como no passo 4. Leve os barcos de pesca ao anel dourado, ao pé do farol.

---

## O que você vê

Quatro barcos de pesca seguem a barca em fila, a 7 m um do outro. Cada um tem uma luz e uma flâmula
de **forma própria** (triângulo, quadrado, esfera): dá para distingui-los sem usar a cor. Os recifes
estão à vista, o porto é o anel dourado. Barco que toca um recife **afunda** (2,5 s) e sai da fila;
barco que entra no porto está **salvo**; a barca que bate **encalha** 2 s. O placar diz quantos. Acabou
a fila? Chega um comboio novo. A barca é 5% mais rápida que os barcos: segure **S** de vez em quando
ou o primeiro fica para trás.

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

A ordem dos scripts importa: o `script.js` usa `atualizarMundo`, `limitar` e `recifes`, que o
`regras.js` declara. Como o `regras.js` não toca em `THREE`, uma página de teste pode carregá-lo
**sozinho**, sem three.js, sem tela e sem WebGL, e rodar milhares de quadros em segundos. É o que
esta separação compra.

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
  ele alcança. Mais de 35 m atrás do da frente, o barco **se perde na névoa**: conta como naufrágio.

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
lista **cresce e encolhe** como as gotas do `dealer-out/03-chuva`:

```js
for (let i = barcosDePesca.length - 1; i >= 0; i--) {   // de trás para a frente
    ...
    barcosDePesca.splice(i, 1);
}
```

Percorrer **de trás para a frente** faz tirar o item `i` não mudar o índice dos que faltam ver.
Quem toca um recife vai para `barcosAfundando` (ainda desenhado, afundando 2,5 s), depois some. Quem
sai do mundo entra em `barcosRemovidos`: o `script.js` esvazia essa fila e tira a malha da cena, pois
`regras.js` não pode tocar na cena. As geometrias e os materiais dos barcos são **compartilhados**
(`partes`), então tirar uma malha não vaza nada. Sem limite? A fila tem no máximo 4; um robô de
200.000 quadros com leme e **S** aleatórios não passou de 4 barcos na fila nem de 4 afundando.

---

## 5. Recifes e porto são dados

```js
{ x: 9, z: -4, raio: 2 }   // um recife: um círculo no plano
```

Barca, barcos, recifes e porto são **círculos** `{x, z, raio}` (GDD §4.1). Tocar é uma distância
menor que a soma dos raios (`recifeTocadoPor`). Os três desfechos:

| Quem | O que acontece |
|---|---|
| barco toca recife | afunda 2,5 s, sai da fila, `naufragios++` |
| barco entra no porto (raio 9 m) | sai da fila, `salvos++` |
| **barca** toca recife | **encalha**: 2 s parada; é empurrada para fora da pedra (com 1% de folga: no ponto exato o arredondamento a faria encalhar de novo) |

A barca é presa a ±80 m (o mundo é de 160 × 160 m).

---

## 6. Entrada por ação: o conserto do exercício 8 do passo 4

No passo 4, `acoes.esquerda = true/false`: segure **A**, aperte **←**, solte só a seta e a ação
desligava, mesmo com **A** ainda apertada. **Este é o conserto do exercício 8 do passo 4**: cada ação
guarda **quais entradas** a seguram.

```js
acoes = { esquerda: ["tecla:a", "tecla:arrowleft", "dedo:1"] }
function seguradaAgora(acao) { return (acoes[acao] || []).length > 0; }
```

Soltar uma entrada tira só a dela da lista. A ação vale enquanto sobrar alguma: duas teclas, dois
dedos no mesmo botão (`pointerId`), uma tecla e um botão. `blur` esvazia tudo.

---

## 7. A câmera tem de ver o comboio

Os barcos vêm **atrás** da barca. A câmera do passo 4 (5 m acima, 8 m atrás) os deixava embaixo dela,
fora da tela. Agora ela está em `(0, 10, 14)` e olha para a água quase embaixo da proa. Com isso o
**primeiro** barco aparece; os de trás ficam fora da tela, e o placar e o **aria-live** dizem o que
acontece com eles. O custo é uma barca menor na tela, e a névoa a deixa um pouco mais fraca.

---

## Experimente

1. Mude `GIRO_MAXIMO_DO_BARCO` para 1,4 (igual ao da barca) e depois para 0,5. Em qual a cauda
   balança menos? Em qual os barcos batem nos recifes?
2. Mude `DISTANCIA_DO_COMBOIO` para 3 e para 15. O que a `ZONA_DE_FREADA` faz quando é 1?
3. Ponha `VELOCIDADE_DO_BARCO` igual a `VELOCIDADE_DA_BARCA`. O primeiro barco ainda se perde?
4. Em `julgarBarcosDaFila`, troque o laço para ir de frente para trás (`i++`). O que quebra?
5. Troque o alvo de cada barco por **dois** barcos à frente (`barcosDePesca[indice - 2]`). A cauda
   balança mais ou menos?
6. Segure **A**, aperte **←** e solte só a seta (o exercício 8 do passo 4): a barca continua virando
   agora? Troque `acoes` de volta para `true`/`false` e veja o bug voltar.
7. Dê aos barcos uma terceira flâmula (um cilindro): mexa só em `partes.bandeiras`.
8. Faça o comboio nascer **à frente** da barca. O alvo de cada um continua fazendo sentido?

---

**Anterior:** [`04-feixe`](../04-feixe/) · **Próximo:** [`06-iluminar`](../06-iluminar/) — os recifes só aparecem quando a lanterna os ilumina.
