# Reflexo — Passo 7: Espelhos

**Mudou:** `script.js` (a seção 8, "o feixe", é nova: `refletir`, `tracarLuz`, `seguirFeixe`; a seção 9, "sala
imutável, espelhos, portas", é nova; a seção 6 ganha os planos finos, `distanciaAoPlano`, o desenho do espelho e do
feixe e a planta com o caminho da luz; `lancarRaio` ganhou o parâmetro `comoFeixe`; o mapa vira `sala`, um objeto
**congelado**; `ehSolida` sabe de portas abertas; a leitura do H e o painel mostram a luz; **saem** a sombra do catálogo,
o raio do olhar e o leque da planta), `index.html` (os botões **Espelho**, **Planta** e **Reiniciar** e a área de
avisos) e `style.css` (a grade de botões tem cinco colunas).
**Rode:** abra o `index.html`. Ande até um espelho, **E** (ou Espaço) o gira. Faça a luz chegar ao receptor roxo da
parede: a porta abre. **R** reinicia a sala. **H** mostra o caminho do feixe.

---

## O que você vê

Na sala há um **emissor** (`E`, na parede de baixo à esquerda), três **espelhos** prateados em pé no chão, um
**receptor** (`R`, um anel roxo na parede) e uma **porta** (`D`) ao lado dele. O emissor lança um **feixe** ciano de
pulsos claros e escuros. Ele quica nos espelhos e, no começo, vai parar numa parede: a porta está fechada.

O espelho que está **à frente, a até 1,5 casa**, ganha moldura amarela e o painel diz "Espelho à frente". **E** ou
Espaço (ou o botão **Espelho**, no celular) o gira de `/` para `\` e de volta. A luz muda **na hora**. Quando o feixe
termina no receptor, o anel enche de luz, o painel diz "Receptores 1/1" e a porta se abre; gire de novo e ela fecha. Atrás
da porta, no canto de baixo, um cristal marca a saída. Com **H**, a planta mostra o caminho da luz, as casas
iluminadas, um anel em volta do receptor aceso e o `d` minúsculo da porta aberta.

> A solução está em dois espelhos, o das casas `(3, 5)` e `(3, 2)`. Ainda não há sombras: elas chegam no passo 8.

---

## 1. O feixe é o mesmo raio da tela

*Reusa `pong/03-paredes` (o ricochete) e o `lancarRaio` do passo 3. GDD, seção 4.3.*

O passo 3 criou um raio que anda casa a casa até uma casa sólida. O passo 4 lançou 320 deles para desenhar. O feixe é
o **mesmo** raio, com duas diferenças, ligadas pelo parâmetro `comoFeixe`:

- ele **sai da casa em que nasce**, mesmo sólida (o emissor é um bloco; sem isso o raio pararia antes de andar);
- ele **para também nas casas de espelho** e nas de porta. A tela atravessa espelhos, o feixe não.

```js
const trecho = lancarRaio(x, y, dx, dy, true, true);   // registrar os cruzamentos, e como feixe
```

O emissor sai do **centro** da casa, na direção de um eixo `(1, 0)`, `(0, 1)`…, e cada espelho fica no centro da sua casa.
Por isso o trecho sempre anda ao longo de uma linha do meio das casas, e a conta é **exata**: as distâncias são
`0,5`, `1,5`, `2,5`… sem tolerância de ponto flutuante. O trecho termina no **centro** do espelho (`fimX = coluna + 0.5`),
e dali sai o seguinte.

A luz é uma **lista de segmentos** `{ x0, y0, x1, y1, comprimento }`, mais os `quiques` (onde ela virou), os `fins` (onde
cada feixe parou) e as `casas` iluminadas. O que o desenho (seção 3 deste guia) e o H leem é só isso.

---

## 2. O ricochete: trocar as componentes

*Reusa `pong/03-paredes`. GDD, seção 4.3.*

No Pong, a bola que bate na parede de cima inverte o `vy`. Um espelho a 45° não inverte uma componente: **troca** as duas,
com sinal. Com o eixo `y` para baixo:

| Espelho | `(dx, dy)` vira | Um feixe que vai para o leste `(1, 0)` |
|---|---|---|
| `/` | `(−dy, −dx)` | sobe: `(0, −1)` |
| `\` | `(dy, dx)` | desce: `(0, 1)` |

```js
function refletir(simbolo, dx, dy) {
    return simbolo === "/" ? { dx: -dy + 0, dy: -dx + 0 } : { dx: dy, dy: dx };
}
```

O `+ 0` existe porque `-0` é um número em JavaScript (`-0 === 0`, mas `Object.is(-0, 0)` é falso). Desenhe `/` num papel
com o `y` para baixo e confira as quatro entradas de cada linha (exercício 2).

**O limite de 8 quiques.** `seguirFeixe` é um laço `for (let quique = 0; ; quique++)` que só termina com um `return`: quando o
trecho não termina em espelho, ou quando `quique === LIMITE_DE_QUIQUES` (então o feixe fica **preso** no espelho
seguinte). Com emissores nos eixos a reflexão é reversível e um feixe que nasce numa parede acaba saindo, mas o limite
protege de um mapa mal feito. O exercício 4 monta uma escada de dez espelhos.

---

## 3. Espelhos e feixe são planos finos

*GDD, seção 4.4. Reusa o z-buffer do passo 6.*

Na planta, um espelho é a diagonal da casa e um trecho de feixe é um segmento. Na imagem, cada coluna é um raio.
A **interseção raio × segmento** vem do produto vetorial `cruz(a, b) = ax·by − ay·bx`:

```text
P + t·r = S0 + u·e      (P o olho, r o raio, S0 e e o começo e o vetor do segmento)
t = cruz(a, e) / cruz(r, e)        u = cruz(a, r) / cruz(r, e)        a = S0 − P
```

`t` é a distância ao longo do raio (vezes o cosseno do desvio, a **perpendicular** do z-buffer) e `u`, de 0 a 1, a posição ao
longo do segmento. Vale se `t > 0` e `0 ≤ u ≤ 1`; `distanciaAoPlano` devolve `Infinity` se não vale. Duas coisas
usam o mesmo cálculo:

- **O espelho** é uma faixa alta (0,85 de parede) em pé no chão, prateada, com moldura escura nas pontas, em cima e
  embaixo. `registrarEspelhosNaTela` compara com o z-buffer e, onde o espelho está mais perto, **escreve a distância nele**:
  um sprite atrás de um espelho fica escondido, como atrás de uma parede.
- **O feixe** é uma faixa fina na altura dos olhos (`ESPESSURA_DO_FEIXE`, 0,1 de parede) que só aparece onde está mais perto
  que a parede e o espelho. **Não** escreve no z-buffer: é luz, e brilha, então não leva névoa.

O feixe tem **forma**, não só cor (GDD, seção 7): pulsos claros e escuros ao longo do comprimento
(`PULSOS_POR_CASA`), que andam com o tempo. Com `prefers-reduced-motion` a fase fica parada em `0`: os pulsos continuam lá,
sem se mover.

---

## 4. Receptores e portas

*Reusa `pacman/03-pastilhas` (comer muda o mapa). GDD, seção 4.5.*

Um receptor está **aceso** se algum segmento do feixe **termina nele** (`luz.acesos`). Na imagem ele troca de textura:
`R` é um anel com o centro oco; `Ra` é o mesmo anel com o centro cheio de luz. **Anel cheio = aceso, vazio = apagado**: a
forma, não só a cor. As portas são dados, como no Pac-Man são os pontos:

```js
const PORTAS = [{ coluna: 5, linha: 4, receptores: [{ coluna: 5, linha: 2 }] }];
```

`atualizarPortas` abre a porta se **todos** os seus receptores estão acesos. Duas decisões, escritas no código:

- **A porta sempre para o feixe**, aberta ou fechada. Assim a luz depende só da sala, e não das portas: não há o laço
  "luz → porta → luz".
- **A porta não esmaga.** Se a luz some com o corpo do zelador encostado na casa dela, ela fica aberta até a casa esvaziar
  (`corpoToca`). Teste no exercício 6.

`ehSolida` agora consulta `portasAbertas`: porta aberta não é parede, para o corpo e para os 320 raios da tela.

---

## 5. A sala imutável

*Reusa `xadrez/05-xeque` (o estado novo, em vez de mexer no velho). GDD, seção 4.6.*

No xeque, testar um lance cria um **tabuleiro novo** em vez de mexer no atual. Aqui, girar um espelho **não toca na sala**:

```js
function salaComEspelhoGirado(salaAtual, coluna, linha) { ... return congelar(linhasNovas); }
sala = salaComEspelhoGirado(sala, alvo.coluna, alvo.linha);
```

A sala é `Object.freeze({ celulas: Object.freeze([...]) })`: uma lista de textos, e textos não mudam. Escrever nela é
ignorado (exercício 5). `salaInicial` é a **cópia congelada** do começo, e `reiniciarSala()` só faz `sala = salaInicial`,
reposiciona o zelador e refaz a luz: **nada se desfaz à mão**. O que se calcula da sala (`luz`, `portasAbertas`) é refeito, nunca
remendado. Na hora de girar, `refazerLuz()` roda na mesma chamada, então o próximo quadro já desenha o feixe novo.

**O espelho à frente.** `acharEspelhoAlvo` lança, uma vez por quadro, o mesmo raio parando em espelho, na direção do
olhar. Se a casa que ele achou é um espelho a até `ALCANCE_DO_ESPELHO` (1,5 casa), é o `alvo`. Não é preciso mirar em
pixel nenhum (GDD, seção 3).

---

## 6. Teclado e toque, a mesma intenção

`acionarEspelho`, `alternarPlanta` e `reiniciarSala` são **intenções**, chamadas pela tecla (E ou Espaço, H, R) e pelo
botão (`data-comando`). Os botões têm texto e `aria-pressed` (Planta). Espaço num botão focado já o aperta, então o
teclado ignora o Espaço quando o foco está num botão. Os avisos ("Porta aberta", "Espelho girado", "Sala reiniciada")
vão para uma região `aria-live` que só o leitor de tela vê.

---

## Experimente

1. Gire só o espelho `(3, 5)` e olhe a planta (**H**): para onde o feixe vai agora? Qual é o fim dele? Depois só o `(3, 2)`.
2. Troque `/` por `\` em `refletir` (as duas linhas). O que acontece com o quebra-cabeça? Por que, ainda assim, a conta
   continua exata?
3. Acrescente um segundo receptor ao mapa e à lista da porta (`receptores`), num lugar que um terceiro espelho alcance. A
   porta só abre com os dois acesos?
4. Monte uma escada: emissor em `(1, 1)` para o leste e dez espelhos `\` em `(3, 1)`, `(3, 3)`, `(5, 3)`, `(5, 5)`, `(7, 5)`,
   `(7, 7)`, `(9, 7)`, `(9, 9)`, `(11, 9)`, `(11, 10)`. Leia `luz.quiques.length`: por que dá 8, e não 10?
5. No console, tente `sala.celulas[5] = "x"` e `sala.celulas.push("x")`. O que acontece, e por que o `reiniciarSala` depende disso?
6. Abra a porta, fique na casa dela e, no console, rode `sala = salaComEspelhoGirado(sala, 3, 2); refazerLuz();`. Por que a porta
   não fecha em cima de você? Dê um passo para fora. Depois troque `corpoToca` por `false` em `atualizarPortas` e repita.
7. Tire o `+ 0` de `refletir` e rode `refletir("/", 1, 0)`. O que o console mostra, e por que `Object.is` o distingue de `0`?
8. Mude `LIMITE_DE_QUIQUES` para `1` e olhe a luz inicial (dois quiques). Onde ela termina agora, e o que diz `luz.fins[0].preso`?

---

**Anterior:** [`06-objetos`](../06-objetos/) · **Próximo:** [`08-sombras`](../08-sombras/) — as sombras que perseguem, e o feixe que as desfaz.
