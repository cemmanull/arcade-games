# Tetris — Passo 4: Os controles

**Mudou:** `script.js` e `index.html` (a linha de ajuda)
**Rode:** abra o `index.html`. ← → movem, ↓ acelera, Espaço derruba.

---

## O que você vê

A peça obedece. Dá para encaixar, empilhar, derrubar de uma vez. As linhas completas ainda
não somem — isso é o passo 6 — e girar ainda não existe — passo 5.

---

## Nenhuma colisão nova

```js
case "arrowleft":  moverPeca(-1, 0); break;
case "arrowright": moverPeca(1, 0);  break;
```

Mover para o lado é chamar **a mesma** `moverPeca` do passo 3 com outro deslocamento. Ela
faz a mesma pergunta de sempre — *cabe?* — e a parede, os blocos e o chão já estão todos
dentro dessa resposta.

Compare com o Pong: lá, cada tipo de encontro tinha o seu código (parede de cima, parede de
baixo, raquete da esquerda, raquete da direita, gol). Aqui, um.

> **Quando todas as regras de "pode ou não pode" moram numa função só, cada movimento novo
> sai de graça.**

---

## Dois modelos de teclado no mesmo jogo

| Ação | Modelo | De onde vem |
|---|---|---|
| ← → | um **evento** por toque | a cobrinha |
| Espaço | um **evento** por toque | a cobrinha |
| ↓ | uma tecla **presa** | o Pong |

← e → são **ações**: cada toque move uma casa. Basta o `keydown`.

↓ é um **modo**: enquanto estiver presa, a gravidade fica mais forte. A tecla não move a
peça — ela só muda o intervalo que o loop usa:

```js
const intervalo = baixoPresa ? INTERVALO_DA_QUEDA_RAPIDA : INTERVALO_DE_QUEDA;
```

O acumulador do passo 3 faz o resto. Foi para isso que ele existia: **o intervalo pode
mudar no meio do caminho** sem que nada mais precise saber.

> Não existe "o jeito certo" de ler o teclado. Existe o jeito que combina com cada ação.

---

## A repetição do sistema

Segure ←. A peça anda uma casa, para por meio segundo, e então desliza.

Quem faz isso não é o jogo: é o **sistema operacional**, que começa a repetir o `keydown`
sozinho. É conveniente, e tem dois defeitos — o atraso inicial é longo demais para um jogo,
e ele muda de máquina para máquina (é uma configuração do usuário).

O passo 8 troca essa repetição por uma nossa, com tempos escolhidos para o jogo. Por
enquanto, ela serve.

### `evento.repeat`

```js
if (!evento.repeat) { ... }
```

Nas repetições automáticas, `evento.repeat` é `true`. Para ↓ e Espaço, só o **primeiro**
toque importa: segurar Espaço não deve derrubar dez peças seguidas.

---

## Detalhes que valem notar

### Zerar o acumulador ao apertar ↓

Sem isso, um acumulador que já tinha 0,9 s gastaria tudo de uma vez no intervalo rápido de
0,04 s: **22 linhas num único quadro**. A peça teleportaria para o fundo. É o mesmo tipo de
bug do "delta gigante" do Pong — tempo demais entregue de uma vez — com outra roupa.

### Um laço de corpo vazio

```js
while (moverPeca(0, 1)) {
    // nada: descer é a própria condição
}
```

Todo o trabalho está na condição. Leia em voz alta: *enquanto conseguir descer, desça.*

### `default: return`

Teclas que não são do jogo saem do `switch` antes do `preventDefault`. Assim F5, F12 e
Ctrl+L continuam funcionando — cancelar tudo seria sequestrar o teclado de quem está na
página.

---

## Experimente

1. Mude `INTERVALO_DA_QUEDA_RAPIDA` para `0.2` e para `0.005`. Qual parece mais justo?
2. Apague `acumuladorDeQueda = 0` no `case "arrowdown"`. Espere a peça quase descer
   sozinha e só então aperte ↓. Repita algumas vezes até ver o teleporte.
3. Tire o `if (!evento.repeat)` do Espaço e segure a tecla.
4. Faça a tecla ↑ subir a peça uma linha (só para testar). O que impede que ela atravesse
   os blocos de cima? Nenhuma linha nova — por quê?
5. Acrescente W, A, S e D como alternativas às setas. Dica: dois `case` seguidos, sem
   `break` entre eles, caem no mesmo código.
6. Mude a coluna de nascimento para que a peça nasça encostada na parede direita.

---

**Anterior:** `03-queda` · **Próximo:** `05-rotacao` — girar uma matriz.
