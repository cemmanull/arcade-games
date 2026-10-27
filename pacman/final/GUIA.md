# Pac-Man — passo final

**Anterior:** `08-niveis`
**Rode:** abra o `index.html`.
**Controles:** setas ou WASD escolhem a direção · P ou Esc pausa · H mostra os alvos dos
fantasmas. No celular: deslize o dedo sobre o labirinto.

Este é o fim da trilha — e do curso. O código está comentado, e este guia reúne os conceitos do
módulo. No fim há 15 exercícios.

## O que mudou do passo 8 para aqui

Nenhuma regra de movimento, de fantasma ou de fase. O acabamento:

| | Passo 8 | Final |
|---|---|---|
| Estados do jogo | pronto, jogando, morrendo, fase completa, fim | + `menu`, `pausado` |
| Pausa | — | P, Esc, botão no celular, e sozinha ao trocar de janela |
| Pontos | somados em cada lugar | passam todos por `ganharPontos` — onde mora a vida extra |
| Som | — | o "waka" alternado, a sirene contínua, arpejos, a morte |
| Toque | — | deslizar o dedo guarda a intenção |
| Recorde | — | `localStorage` |

---

## Por que este módulo vem por último

Ele junta quase tudo o que o curso ensinou:

| Do… | Veio |
|---|---|
| Tetris | a matriz como estado; o mapa feito de texto |
| Pong | o deslizar com delta time; vetores de direção |
| Cobrinha | a colisão por igualdade de casa; a última tecla apertada |
| Dealer? Out! e Tetris | tabelas no lugar de código; temporizadores |
| todos | a máquina de estados |

E acrescenta o que faltava: **inteligência**. Não a do xadrez, que pensa lances à frente — a de
jogo de ação, feita de regras simples que, juntas, parecem um plano.

---

## 1. O labirinto é um texto que se desenha sozinho

```js
const MAPA_EM_TEXTO = ["############################", "#............##............#", ...];
const mapa = MAPA_EM_TEXTO.map(linha => linha.split(""));
```

Cada caractere é uma casa. As paredes perguntam aos vizinhos onde traçar linhas — nada do desenho
está no texto, tudo é deduzido. E os dados são **conferidos** antes de usar: uma linha com uma casa
a menos vira uma mensagem clara no console, e não um bug três passos depois.

---

## 2. Andar em pixels, decidir nos centros

```js
while (distancia > 0) {
    if (estaNoCentro(entidade)) decidir(entidade);
    const passo = Math.min(distancia, distanciaAteOProximoCentro(entidade));
    ...
}
```

A distância do quadro é gasta em pedaços, e nenhum pedaço pula um centro de casa. É lá — e só lá —
que alguém decide para onde ir. A **intenção** do jogador fica guardada até o cruzamento em que
der para obedecer.

Decimais não são exatos: `EPSILON` para comparar, e **encaixar** a posição no centro para o erro
não se acumular. E o túnel é o resto de uma divisão que precisa funcionar com números negativos.

**Andar** foi separado de **decidir**: a mesma `andar` serve ao Pac-Man e aos fantasmas, cada um
com a sua função de decisão.

---

## 3. Uma regra, quatro personalidades, quatro humores

> Em cada cruzamento, vá para a vizinha mais perto do **alvo**, em linha reta. Nunca dê meia-volta.

Tudo o mais é **qual alvo**:

| Situação | Alvo |
|---|---|
| perseguir, vermelho | a casa do Pac-Man |
| perseguir, rosa | 4 casas à frente dele |
| perseguir, ciano | o dobro da seta que vem do vermelho |
| perseguir, laranja | o Pac-Man de longe; o seu canto de perto |
| dispersar | o canto de cada um |
| assustado | nenhum: sorteio |
| olhos | a porta, pelo mapa de distâncias |

"Em linha reta" faz os fantasmas **errarem** às vezes — e é esse erro que deixa o jogador escapar.
Juntos, eles parecem cercar o Pac-Man sem que nenhum saiba que os outros existem: comportamento
**emergente**.

A tecla H desenha os alvos. Inteligência que ninguém vê é impossível de entender.

---

## 4. Busca em largura: o caminho mais curto, calculado uma vez

```js
while (fila.length > 0) {
    const atual = fila.shift();
    // cada vizinha livre e ainda sem número recebe o número de `atual` + 1
}
```

Uma enchente a partir da porta, em ondas: a fila garante que quem está mais perto é processado
primeiro. No fim, cada casa sabe a sua distância até a porta, e os olhos só precisam ir sempre para
a vizinha de número menor. Calculado no carregamento, serve para sempre.

---

## 5. Estados em dois níveis

```js
estado        // o jogo:      menu, pronto, jogando, pausado, morrendo, fase completa, fim
f.estado      // o fantasma:  em casa, saindo, andando, olhos, entrando
f.assustado   // à parte: pode ser verdade em vários estados
```

Os estados que só esperam têm a sua duração numa tabela, e um relógio só conta. A **pausa lembra de
onde veio** (`estadoAntesDaPausa`): pausar no meio do "Pronto!" volta para o "Pronto!".

E três tamanhos de recomeço — `novaVida`, `novaFase`, `novaPartida` —, cada um chamando o menor.

---

## 6. O jogo inteiro em tabelas

| Tabela | Decide |
|---|---|
| `MAPA_EM_TEXTO` | o labirinto |
| `PONTOS_POR_CASA` | quanto vale cada coisa comida |
| `FANTASMAS` | cor, casa, espera, canto e alvo de cada fantasma |
| `HORARIOS` | o ritmo de dispersar e perseguir |
| `NIVEIS` | velocidades (em frações de um máximo), susto e fruta de cada fase |
| `FRUTAS` | desenho e valor de cada fruta |
| `ALGARISMOS` | a fonte de 3×5 pixels |

Quem quiser mudar o **jogo** — mais difícil, outro labirinto, fantasmas diferentes — mexe em dados.
Quem quiser mudar **como o jogo funciona** mexe no código. As duas coisas raramente se misturam.

---

## 7. Um lugar para cada coisa que acontece sempre junto

```js
function ganharPontos(valor) {
    pontos += valor;
    if (!ganhouVidaExtra && pontos >= PONTOS_PARA_VIDA_EXTRA) { ... }
    atualizarPlacar();
}
```

Pastilha, energizante, fantasma, fruta: todos os pontos passam por aqui. Se cada um somasse por
conta própria, cada um precisaria lembrar da vida extra e do placar. É o mesmo princípio de
`mudarEstado` (que zera o relógio) e de `andar` (que nunca pula um centro): **o que precisa
acontecer sempre, acontece num lugar só**.

---

## 8. Som que dura

Os sons curtos nascem e morrem: um oscilador por som, com envelope. A **sirene** é diferente: um
oscilador criado uma vez e nunca parado; a cada quadro, o jogo diz a frequência e o volume que ele
deve ter (zero na pausa).

```js
sirene.oscilador.frequency.setTargetAtTime(frequencia, agora, 0.02);
```

`setTargetAtTime` faz a frequência **escorregar** até o novo valor, em vez de saltar — mudar 60 vezes
por segundo aos saltos soaria como chiado. E o "waka" são só duas notas que se alternam, uma por
pastilha.

---

## 9. Deslizar guarda a intenção

```js
if (Math.abs(dx) > Math.abs(dy)) {
    pacMan.desejada = dx > 0 ? DIRECOES.DIREITA : DIRECOES.ESQUERDA;
}
inicioDoDeslize = { x: evento.clientX, y: evento.clientY };   // renova o ponto de partida
```

O eixo em que o dedo andou mais decide a direção, e o ponto de partida é renovado: num único gesto
em "L", o Pac-Man recebe duas intenções. E, como no teclado, deslizar não vira nada — só guarda o
desejo para o próximo cruzamento.

---

## Exercícios

### Ajustar

1. Desenhe o seu próprio labirinto. Rode a verificação; confira se não há becos sem saída (um
   fantasma num beco precisa dar meia-volta — o código trata isso?).
2. Troque a ordem de desempate dos fantasmas para direita, baixo, esquerda, cima. Algum fantasma
   começa a errar em lugares novos?
3. Deixe a tabela `NIVEIS` com 20 fases, terminando com o fantasma mais rápido que o Pac-Man e
   susto zero. Até onde você chega?
4. Desligue a meia-volta na troca de modo. O jogo fica mais difícil ou mais fácil de ler?

### Construir

5. **Corte de curva:** deixe o Pac-Man virar até 3 pixels antes do centro, como no original —
   vantagem para quem aperta cedo.
6. **Comer devagar:** o Pac-Man perde um quadro de movimento a cada pastilha. Os fantasmas ficam
   mais perigosos nos corredores cheios?
7. **Placar dos cinco melhores** com iniciais, salvo como JSON.
8. **Intervalos:** entre a fase 2 e a 3, uma cena curta com o Pac-Man sendo perseguido pela tela
   (reaproveite `desenharFantasma` e `desenharPacMan`).
9. **Mapa de distâncias visível:** com H, escreva a distância de cada casa (com `desenharNumero`).
10. **Um segundo labirinto** para as fases pares. O que precisa ser recalculado ao trocar?
11. **"Elroy":** quando restarem poucas pastilhas, o vermelho fica mais rápido e passa a perseguir
    mesmo no modo dispersar. Uma coluna nova na tabela de níveis.

### Difícil

12. **Fantasma com caminho perfeito:** troque a regra do cruzamento do vermelho por uma busca em
    largura até o Pac-Man, refeita a cada cruzamento. Ele fica imbatível? Chato?
13. **Pac-Man robô:** um jogador automático que vai sempre para a pastilha mais próxima (busca em
    largura a partir dele) e foge quando um fantasma está a menos de 4 casas.
14. **Editor de labirintos:** uma página onde se clica nas casas para trocar parede por corredor,
    e um botão que gera o `MAPA_EM_TEXTO` para copiar.
15. **Dois jogadores:** um segundo Pac-Man, com WASD, disputando as mesmas pastilhas. O que muda nos
    alvos dos fantasmas?

---

## O que você levou daqui

Mapas como texto, desenho deduzido dos vizinhos, conferência de dados, a grade e o movimento
contínuo juntos, decimais com tolerância, intenção guardada, andar separado de decidir, funções como
argumento, inteligência por alvos, comportamento emergente, busca em largura, campos que não são
estados, recomeços aninhados, tabelas de horário e de níveis, um lugar só para o que acontece
sempre, som contínuo e entrada por deslize.

E, do curso inteiro: **separe o que a coisa é de como ela aparece; escreva os dados como dados;
teste antes de mover; e mostre o invisível quando não entender o que o programa está fazendo.**

---

**Antes:** [`../../tetris`](../../tetris/) ·
**Índice:** [`../README.md`](../README.md)
