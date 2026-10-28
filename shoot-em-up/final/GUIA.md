# Shoot 'em up — passo final

**Anterior:** [`08-chefe`](../08-chefe/)
**Rode:** abra o `index.html`.
**Controles:** setas ou WASD voam · Espaço (segure) atira · Shift (segure) foco · X bomba ·
P ou Esc pausa · H mostra as colisões. No celular: arraste o dedo em qualquer lugar da tela.

Este é o fim da trilha e também o material de referência: o código está comentado, e este
guia reúne os conceitos do módulo. No fim há 15 exercícios.

## O que mudou do passo 8 para aqui

Nenhuma regra de colisão, de trajeto ou de mira. O acabamento, e quatro mecânicas de jogador:

| | Passo 8 | Final |
|---|---|---|
| Estados do jogo | `jogando`, `fim`, `vitoria` | `menu`, `jogando`, `pausado`, `fim` |
| Depois do chefe | vitória, acabou | **volta 2**: o roteiro recomeça, 25% mais difícil |
| Arma | um tiro | quatro níveis, numa tabela; cápsulas sobem, morrer desce |
| Foco | — | Shift: nave lenta e o miolo aparece |
| Bomba | — | X: apaga as balas, fere todos; três por partida, +1 por volta |
| Toque | — | arrasto relativo, tiro automático |
| Som | — | bipes com envelope: explosões que caem de tom |
| Recorde | — | `localStorage` |

---

## Por que este módulo vem depois do Tetris

O Tetris deu o chão: acumuladores de tempo, dados em tabelas, a máquina de estados, o
`localStorage`. Mas o mundo dele era uma **matriz**, e a peça que para deixa de ser objeto.
Este módulo vive de objetos que **nascem e morrem em listas**, e gasta os passos no que é novo:

| | Tetris | Shoot 'em up |
|---|---|---|
| O mundo | **uma matriz** e uma peça | **listas** de objetos que nascem e morrem |
| Posição | `{coluna, linha}`, casa a casa | **centro** em pixels, contínua |
| Colisão | "cabe?", perguntar antes de mover | **círculos**, muitos contra muitos |
| Movimento | a peça cai um passo por intervalo | **trajetos como funções do tempo** |
| Perigo | a pilha que sobe | **mira em você** (`atan2`, leques, anéis) |
| De onde vêm os objetos | saco de sete | **roteiro** escrito à mão, com cursor |
| Estados | do jogo | do jogo **e** de um personagem (o chefe) |

---|---|---|
| Posição | canto | **centro** |
| Colisão | AABB, um contra muitos | **círculos**, muitos contra muitos |
| Movimento dos objetos | cair em linha reta | **trajetos como funções do tempo** |
| Perigo | cai do céu | **mira em você** (`atan2`, leques, anéis) |
| De onde vêm os objetos | gerador com sorteio | **roteiro** escrito à mão, com cursor |
| Estados | do jogo | do jogo **e** de um personagem (o chefe) |

---

## 1. O centro, não o canto

```js
const nave = { x: 60, y: 140 };   // o centro
```

Quase tudo aqui mira, espalha e explode a partir do centro. Guardar o canto obrigaria a somar
meia largura em cada conta; guardando o centro, a conversão acontece num lugar só — o desenho.

> **Escolha a representação pelo que o programa mais faz com ela.**

---

## 2. A rolagem que não se guarda

```js
const y = (estrela.yInicial + camada.velocidade * tempoTotal) % tela.height;
```

Nenhuma estrela anda no estado: a posição é calculada do relógio, e o `%` dobra o número de
volta para a tela. O céu é uma **função do tempo** — pausar o relógio pausa o céu.

---

## 3. Normalizar

```js
const comprimento = Math.hypot(intencaoX, intencaoY);
if (comprimento > 0) { intencaoX /= comprimento; intencaoY /= comprimento; }
```

Sem isso, a diagonal é 41% mais rápida (√2). Um vetor normalizado responde **para onde**;
quanto, decide quem multiplica — a velocidade normal ou a do foco.

---

## 4. A cadência que não acumula crédito

```js
recarga -= tempo;
if (!atirando) { recarga = Math.max(recarga, 0); return; }
while (recarga <= 0) { dispararArma(); recarga += INTERVALO_ENTRE_TIROS; }
```

O acumulador de tempo do Tetris (passo 3), com uma trava: parado, a recarga não desce abaixo
de zero. Sem ela, três segundos sem atirar viram 24 tiros num quadro. Os outros relógios do
jogo (clarão, golpe, invencibilidade, aviso) são números que descem a cada quadro, nunca
`setTimeout`: um jogo, um relógio.

---

## 5. Dois jeitos de mover

```js
tiro.x += tiro.vx * tempo;                                     // somar passinhos
const posicao = INIMIGOS[tipo].trajeto(inimigo, inimigo.t);    // função do tempo
```

| Somar passinhos | Função do tempo |
|---|---|
| tiros, balas, partículas, cápsulas | inimigos, chefe |
| reagem, são disparados e esquecidos | seguem uma coreografia |
| erros se acumulam | sempre a conta exata; dá para perguntar sobre o futuro |

Os trajetos usam retas, senos (balanço) e curvas de suavização (`1 - (1 - t)²` freia, `t²`
acelera). Cada tipo traz a sua função no catálogo.

---

## 6. Colisão de círculos, muitos contra muitos

```js
return dx * dx + dy * dy < somaDosRaios * somaDosRaios;   // sem raiz
```

Dois laços aninhados testam cada tiro contra cada inimigo. **Marcar e varrer**: quem morre
ganha `morto = true` durante a conferência e sai da lista depois, de uma vez — nada é removido
da lista que está sendo percorrida, e um tiro acerta um inimigo só.

O raio da nave é **2**; o desenho tem 9 pixels. Só o miolo pode ser atingido — é o que torna
possível passar raspando. A tecla H desenha os círculos: **mostre o invisível** quando a
colisão parecer errada.

---

## 7. Mirar e espalhar

```js
Math.atan2(nave.y - origem.y, nave.x - origem.x)      // o ângulo até a nave (y primeiro!)
vx = Math.cos(angulo) * v;  vy = Math.sin(angulo) * v  // de volta à velocidade
```

Com o ângulo na mão, **girar é somar**:

- **leque:** `centro + (i - (n - 1) / 2) * abertura` — a contagem centralizada no zero;
- **anel:** `giro + i * (2π / n)` — o círculo em partes iguais, girando com o tempo.

Os padrões são funções numa tabela (`PADROES`), e cada tipo de inimigo diz qual usa e com que
números.

---

## 8. A fase é um roteiro

```js
{ tempo: 4, tipo: "drone", x: 20, quantidade: 5, espaco: 0.35, passoX: 20 }
```

O roteiro é escrito para pessoas — com atalhos de formação, em qualquer ordem. `expandirRoteiro`
o converte, **uma vez**, em eventos simples e ordenados. Um **cursor** aponta para o próximo
evento: uma comparação por quadro, seja o roteiro de 20 ou de 2.000 linhas.

E a volta 2 é só o cursor voltando a zero — com o relógio da fase em **−3**, para três
segundos de descanso sem uma linha nova no roteiro.

---

## 9. Estados em dois níveis

```js
let estado = "menu";        // o jogo: "menu" | "jogando" | "pausado" | "fim"
chefe.estado = "entrando";  // o chefe: "entrando" | "lutando" | "explodindo"
```

A mesma ideia em duas escalas. O chefe muda de comportamento pelo próprio estado, e de
**fase** por uma conta sobre a vida (`findIndex` na tabela `FASES_DO_CHEFE`). Antes de cada
ataque, o núcleo pisca: **telegrafar** é o que transforma surpresa em leitura.

---

## 10. Justiça, de novo

| Mecanismo | Sem ele |
|---|---|
| raio da nave menor que o desenho | morrer encostando a asa |
| ninguém atira à queima-roupa | balas que nascem em cima de você |
| as balas somem quando você é atingido | morrer duas vezes pelo mesmo erro |
| invencibilidade piscando | o inimigo que te acertou acerta de novo |
| balas desenhadas por cima de tudo | perigo escondido atrás de uma explosão |
| o chefe telegrafa | ataques que ninguém poderia prever |
| foco mostra o miolo | adivinhar onde exatamente você pode ser atingido |
| ao morrer, a arma cai **um** nível | um erro apagar dez minutos de progresso |

---

## 11. A bomba é uma decisão

```js
bombas -= 1;
apagarBalas();
inimigos.forEach(inimigo => ferirInimigo(inimigo, DANO_DA_BOMBA));
ferirChefe(DANO_DA_BOMBA);
```

Ilimitada, a bomba acabaria com o jogo. Limitada a três, ela vira uma **pergunta** que o
jogador se faz a toda hora: usar agora, para escapar, ou guardar para o chefe? Um recurso
escasso cria decisões; um abundante, não.

E o clarão branco da bomba **não acontece** quando o sistema pede menos movimento
(`prefers-reduced-motion`): uma linha, e o jogo deixa de ser um problema para quem tem
fotossensibilidade.

---

## 12. Toque: arrasto relativo

```js
nave.x += (ponto.x - toque.x) * SENSIBILIDADE_DO_TOQUE;
```

Levar o personagem **até** o dedo seria o jeito simples. Numa nave, o dedo esconderia
justamente o miolo. Aqui o dedo pode estar em qualquer lugar, e a nave anda **o quanto** o dedo andou, como
num touchpad. Enquanto o dedo está na tela, a nave atira sozinha — ninguém tem um segundo dedo
livre para o gatilho.

`setPointerCapture` mantém o arrasto mesmo se o dedo sair do canvas, e `touch-action: none`
impede a página de rolar. O canvas é mostrado em outra escala (3×, ou menos no celular), então
`pontoNoCanvas` converte o toque de pixels da janela para pixels do jogo:
`(clientX - retangulo.left) * tela.width / retangulo.width`. Os eventos de ponteiro cobrem
mouse e dedo pelo mesmo código. Teclado e toque são duas portas para o mesmo jogo, como os
comandos do Tetris (§9).

---

## 13. Som com envelope, parâmetros com nome

```js
tocarSom({ frequencia: 220, frequenciaFinal: 40, duracao: 0.25, tipo: "sawtooth" });
```

`exponentialRampToValueAtTime` faz o tom e o volume **caírem** ao longo do som — é isso que
transforma um bipe em explosão. Exponencial porque o ouvido percebe proporções: de 400 a 200 Hz
soa como o mesmo degrau que de 200 a 100.

E os parâmetros vêm num **objeto**, com nomes e valores padrão. Com seis parâmetros por posição,
ninguém lembraria qual é o quinto.

---

## Exercícios

### Ajustar

1. Mude `RAIO_DA_NAVE` para 4 e jogue a volta 1 inteira. Depois para 1.
2. Mude `DIFICULDADE_POR_VOLTA` para 0,5. Até que volta você chega?
3. Troque a ordem das camadas no `desenhar` para que as partículas fiquem por cima das balas.
   Jogue perto de um blindado. Por que a ordem original é melhor?
4. Escreva uma segunda fase no `ROTEIRO`, só com mergulhadores, e jogue-a.

### Construir

5. **Raspão (graze):** some pontos quando uma bala passa perto da nave (dentro de um raio de 8)
   sem acertar. Conte cada bala uma vez só — onde guardar essa marca?
6. **Texto flutuante:** "+500" sobe e some onde um blindado explodiu.
7. **Inimigo que persegue:** um tipo que, em vez de trajeto fixo, vira um pouco na direção da
   nave a cada quadro (some passinhos, com a direção vinda de `atan2`).
8. **Escudo:** uma cápsula azul que absorve uma bala e some.
9. **Tremor de tela:** ao perder uma vida, desloque o desenho inteiro por alguns pixels
   sorteados durante 0,3 s (e respeite `movimentoReduzido`).
10. **Placar dos cinco melhores**, com iniciais, salvo no `localStorage` como JSON.
11. **Mira à frente:** o vermelho mira onde a nave **estará** quando a bala chegar. Você vai
    precisar da velocidade da nave e do tempo de voo da bala.

### Difícil

12. **Um segundo chefe**, com outra tabela de fases e um padrão novo: uma "parede" de balas com
    um único vão, que se move de um lado para o outro.
13. **Reserva de objetos (pool):** em vez de criar e jogar fora milhares de balas, guarde as
    usadas numa lista de reserva e reaproveite-as. Meça (F12 → Performance) se faz diferença.
14. **Grade espacial:** divida a tela em quadrados de 16 pixels e teste cada bala só contra o
    que está no mesmo quadrado ou nos vizinhos. Crie um padrão com 2.000 balas e compare.
15. **Replay:** grave as teclas apertadas a cada quadro e reproduza a partida inteira. Só
    funciona se o jogo for **determinístico** — o que, aqui, não é? (Dica: procure
    `Math.random` e o delta time.)

---

## O que você levou daqui

Listas de objetos que nascem e morrem, catálogo de tipos, temporizadores, partículas, o centro
como representação, sprites como texto, rolagem calculada, normalização de vetores, cadência, movimento
paramétrico e curvas de suavização, colisão de círculos, marcar e varrer, `atan2` e padrões de
balas, a fase como roteiro com cursor, máquina de estados dentro de uma entidade, telegrafia,
recursos escassos como decisão, arrasto relativo, envelope de som e parâmetros nomeados.

Quase tudo vale fora dos jogos de nave: trajetos paramétricos são animação de interface;
roteiros com cursor são legendas de vídeo e animações com linha do tempo; e "marcar e varrer"
(*mark and sweep*) é o nome do jeito como o próprio JavaScript recolhe a memória que ninguém
usa mais.

---

**Anterior:** [`08-chefe`](../08-chefe/) · **Módulo:** [`README.md`](../README.md)

**Pré-requisito:** [`../../tetris`](../../tetris/) · **Antes:** [`../../tetris`](../../tetris/) · **Depois:** [`../../pacman`](../../pacman/) · **Índice:** [`../../README.md`](../../README.md)
