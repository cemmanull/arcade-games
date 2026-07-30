# Pong — passo final

**Anterior:** `08-computador`
**Rode:** abra o `index.html`.
**Controles:** esquerda W/S (ou setas, no modo 1 jogador) · direita ↑/↓ · P pausa.

Este é o fim da trilha e também o material de referência: o código está comentado linha a
linha, e este guia reúne todos os conceitos do módulo. No fim há 13 exercícios.

## O que mudou do passo 8 para aqui

Nenhuma física. Só o acabamento:

| | Passo 8 | Final |
|---|---|---|
| Estados | `jogando`, `fim` | `menu`, `jogando`, `pausado`, `fim` |
| Pausa | — | tecla P, com mensagem |
| Som | — | bipes gerados por síntese |
| Menu | começa direto | tela inicial, botão de som |

A máquina de estados do passo 7 absorveu dois estados novos sem que nada mais precisasse
mudar. Esse é o retorno de tê-la escrito como uma variável só, em vez de três booleanos.

---

## Por que este jogo vem depois da cobrinha

Parece mais simples — duas barras e uma bola. Não é. A cobrinha vive numa **grade**: tudo
anda de casa em casa, as posições são números inteiros e colidir é comparar igualdade.

Aqui nada disso vale. A bola está em `x = 73.42`, se move em qualquer ângulo e o tempo
não é picotado em passos. Isso muda **o loop, o movimento, a entrada e a colisão** — as
quatro peças de um jogo.

| | Cobrinha | Pong |
|---|---|---|
| Posição | `{coluna: 5, linha: 3}` inteiros | `x: 73.42, y: 51.08` decimais |
| Direção | `"cima"`, `"baixo"`… | `velocidadeX`, `velocidadeY` |
| Tempo | `setInterval` de 150ms | `requestAnimationFrame` + delta time |
| Entrada | última tecla apertada | quais teclas estão **presas agora** |
| Colisão | `a.coluna === b.coluna` | sobreposição de áreas (AABB) |

O que você aprender aqui serve para plataforma, corrida, tiro — praticamente todo jogo
que não seja de turnos.

---

## 1. Velocidade é um par de números

```js
const bola = { x, y, largura, altura, velocidadeX, velocidadeY };
bola.x += bola.velocidadeX * tempo;
bola.y += bola.velocidadeY * tempo;
```

Esse par carrega **direção e rapidez ao mesmo tempo**. É o conceito de **vetor**.

Compare com o `switch (direcao)` da cobrinha e note o que ele nunca conseguiria fazer:
representar um movimento a 37 graus. Com quatro casos você tem quatro direções; com dois
números, infinitas.

Duas operações valem ouro:

```js
Math.hypot(vx, vy)          // a rapidez, independente da direção (Pitágoras)
Math.cos(a) * v, Math.sin(a) * v   // reconstruir o vetor a partir de um ângulo
```

---

## 2. Todos os objetos com a mesma forma

Bola e raquetes têm exatamente os mesmos campos: `x`, `y`, `largura`, `altura`.

Isso não é capricho. É o que permite escrever **uma** função de colisão e **uma** função
de desenho que servem para qualquer par de objetos, sem tradução no meio:

```js
function seSobrepoe(a, b) { ... }
function desenharRetangulo(objeto) { ... }
function moverRaquete(raquete, velocidade, tempo) { ... }
```

> Funções que não sabem **qual** objeto estão manipulando são as que você não reescreve
> nunca mais.

---

## 3. O loop: `requestAnimationFrame` e delta time

```js
function quadroAQuadro(instanteAtual) {
    const segundos = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;
    const tempo = Math.min(segundos, 0.05);

    if (estado === "jogando") atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);   // agenda o próximo
}
```

Uma função **que se agenda de novo**. Vantagens sobre `setInterval`:

- sincroniza com a taxa de atualização da tela;
- pausa sozinha quando a aba sai de foco, poupando bateria;
- entrega um carimbo de tempo preciso.

### Delta time — por que existe

Telas rodam a 60Hz, 120Hz, 144Hz. Se cada quadro movesse a bola uma quantidade fixa, **o
jogo ficaria mais rápido em máquinas melhores**. Multiplicar pelo tempo realmente
decorrido faz a velocidade valer o mesmo em qualquer lugar.

É por isso que todas as constantes deste jogo estão em **pixels por segundo**, nunca "por
quadro". Sem isso, o jogo funciona perfeitamente na sua máquina e fica injogável na de
outra pessoa — um bug difícil de descobrir, porque você nunca o vê.

### O teto no delta

```js
const tempo = Math.min(segundos, 0.05);
```

Se a aba ficar 10 segundos em segundo plano, o primeiro quadro de volta traria um delta
gigante — e a bola **saltaria** de um lado ao outro, atravessando raquetes e paredes sem
nunca se sobrepor a elas.

> Prefira o jogo engasgar a ele teleportar. Essa única linha evita a classe inteira de
> bugs de "atravessou a parede".

---

## 4. Entrada: quais teclas estão presas AGORA

```js
const teclasPressionadas = {};
document.addEventListener("keydown", e => teclasPressionadas[e.key.toLowerCase()] = true);
document.addEventListener("keyup",   e => teclasPressionadas[e.key.toLowerCase()] = false);
```

Um objeto que funciona como um painel de interruptores.

Na cobrinha bastava saber **qual foi a última tecla**. Aqui é preciso saber quais estão
**presas neste instante** — porque a raquete se move enquanto a tecla está segurada, e
porque dois jogadores apertam teclas ao mesmo tempo.

> **É este exercício que destrava jogos de dois jogadores no mesmo teclado.** Com o
> modelo antigo, é impossível.

Detalhe que economiza uma hora de depuração: `toLowerCase()`. Com Shift pressionado,
`evento.key` devolve `"W"` em vez de `"w"` — e a raquete pararia sem motivo aparente.

---

## 5. Clamp

```js
raquete.y = Math.max(0, Math.min(raquete.y, tela.height - raquete.altura));
```

Prender um valor entre um mínimo e um máximo. Leia até ficar óbvio — esta linha aparece
em todo jogo que existe. Sem ela, a raquete sai pela borda e nunca mais volta.

---

## 6. Colisão AABB

**AABB = Axis-Aligned Bounding Box**, caixa alinhada aos eixos: retângulos que não giram.

```js
function seSobrepoe(a, b) {
    return a.x < b.x + b.largura &&
           a.x + a.largura > b.x &&
           a.y < b.y + b.altura &&
           a.y + a.altura > b.y;
}
```

A ideia inteira em uma frase: **dois retângulos se sobrepõem quando se sobrepõem nos dois
eixos ao mesmo tempo.**

Desenhe dois retângulos no papel e teste cada uma das quatro comparações. Quando isto
ficar óbvio, você tem no bolso a colisão mais usada em jogos 2D.

### O bug número um: corrigir a posição também

```js
bola.y = 0;                              // 1. tira de dentro da parede
bola.velocidadeY = -bola.velocidadeY;    // 2. inverte o movimento
```

Inverter a velocidade **não basta**. Se a bola já entrou 2 pixels na parede, no quadro
seguinte ela ainda está sobreposta — e inverte de novo. E de novo. O resultado é um objeto
tremendo, preso na parede.

> **Ao colidir, conserte a posição E a velocidade, sempre juntas.**

### Só testar a raquete relevante

```js
const raquete = bola.velocidadeX < 0 ? raqueteEsquerda : raqueteDireita;
```

Além de evitar trabalho, isso previne um bug real: uma bola que acabou de sair da raquete
ainda está sobreposta a ela por uma fração de pixel, e seria "rebatida" uma segunda vez —
ficando grudada.

---

## 7. O ponto de impacto decide o ângulo

Esta é a única regra que separa um Pong monótono de um Pong com intenção.

```js
const deslocamento = (centroDaBola - centroDaRaquete) / (raquete.altura / 2);  // -1 .. 1
const angulo = deslocamento * ANGULO_MAXIMO_DE_SAIDA;

bola.velocidadeX = Math.cos(angulo) * rapidez * sentido;
bola.velocidadeY = Math.sin(angulo) * rapidez;
```

Bater no centro devolve a bola quase reta; bater na ponta manda-a bem inclinada. De
repente o jogador tem **controle**, e existe jogada.

Quatro passos que se repetem em qualquer física de rebatida: medir onde bateu → normalizar
para −1..1 → transformar em ângulo → recompor o vetor com seno e cosseno.

### Acelerar com teto

```js
Math.min(rapidezAtual * 1.05, VELOCIDADE_MAXIMA_DA_BOLA)
```

Sem o teto, em poucas jogadas a bola andaria **mais que a própria largura por quadro** — e
atravessaria a raquete sem nunca se sobrepor a ela.

> Colisão por sobreposição só funciona enquanto os objetos não pulam por cima uns dos
> outros. Quando velocidades altas são inevitáveis, a solução se chama *colisão contínua*:
> testa-se o caminho percorrido, não a posição final.

---

## 8. Máquina de estados

```js
let estado = "menu";   // "menu" | "jogando" | "pausado" | "fim"
```

Uma variável de texto substitui vários booleanos soltos (`jogando`, `pausado`, `acabou`).

Com booleanos separados é possível cair em combinações impossíveis — "pausado E acabado" —
e ninguém sabe o que a tela deveria mostrar. Com um estado só, isso simplesmente não
existe: ele é sempre exatamente um.

Todo jogo tem essa variável em algum lugar.

---

## 9. O oponente automático

```js
const alvo = bolaVemNaMinhaDirecao ? centroDaBola : tela.height / 2;
if (Math.abs(distancia) < 2) return;                  // zona morta
moverRaquete(raqueteDireita, direcao * VELOCIDADE_DA_RAQUETE_DO_PC, tempo);
```

Não há inteligência aqui — há uma **limitação deliberada**. Três decisões:

1. **Velocidade menor que a do humano** (68 contra 95). É *isto* que o torna vencível: em
   ângulos fechados, ele não chega a tempo. Um oponente que copiasse a altura da bola seria
   imbatível e chatíssimo.
2. **Volta ao centro quando a bola se afasta.** Mais realista, e dá ao jogador a chance de
   jogar num canto — o que cria jogadas.
3. **Zona morta de 2 pixels.** Sem ela, a raquete vibraria sem parar em volta do alvo,
   passando dele para um lado e para o outro a cada quadro.

> **Dificuldade em jogos raramente é esperteza: é a margem de erro que você concede à
> máquina.** Para deixar mais difícil, aumente a velocidade dele. Para deixar mais fácil,
> some um erro aleatório ao alvo.

---

## 10. Som sem arquivo nenhum

```js
const oscilador = contextoDeAudio.createOscillator();
oscilador.type = "square";              // o timbre dos videogames antigos
oscilador.frequency.value = 680;
oscilador.start();
oscilador.stop(contextoDeAudio.currentTime + 0.05);
```

Som gerado por síntese: nenhum arquivo, nenhuma dependência. Um oscilador é literalmente
um gerador de onda.

⚠️ Navegadores **proíbem tocar som antes de o usuário interagir com a página** — por isso
o `AudioContext` só é criado no primeiro clique. Se o seu som não funciona e não há erro
nenhum no console, quase sempre é isso.

---

## Exercícios

### Ajustar

1. Mude `VELOCIDADE_DA_RAQUETE_DO_PC` para 95 (igual à sua) e tente ganhar. Depois para
   40. Você acabou de encontrar o botão de dificuldade.
2. Mude `ANGULO_MAXIMO_DE_SAIDA` para `Math.PI / 6` e para `Math.PI / 2.2`. Sinta como o
   jogo muda de caráter.
3. Remova o teto de velocidade e jogue um ponto longo. A bola acaba atravessando a
   raquete — o bug do "andou mais que o próprio tamanho", ao vivo.

### Construir

4. **Três níveis de dificuldade**: um botão que alterna a velocidade do computador e um
   erro aleatório somado ao alvo dele.
5. **Efeito de rastro**: em vez de apagar o fundo com cor sólida, pinte um retângulo
   semitransparente por cima. A bola deixa um borrão.
6. **Placar por partidas**: melhor de 3, com um contador de vitórias.
7. **Controle por mouse**: a raquete segue o ponteiro. Dica: `getBoundingClientRect()` e a
   conversão de escala — o canvas é exibido 4× maior do que a resolução interna.
8. **Toque na tela**, para funcionar no celular: eventos `touchstart`/`touchmove`, posição
   em `evento.touches[0]`.
9. **Sacar com o espaço** em vez do temporizador automático.
10. **Efeito (spin)**: se a raquete estava se movendo no instante da rebatida, some parte
    da velocidade dela ao `velocidadeY` da bola. Guarde a posição anterior da raquete para
    saber a velocidade dela.

### Difícil

11. **Um obstáculo no meio da tela** em que a bola também quica. O problema interessante:
    descobrir se ela bateu no **lado** ou no **topo**. Dica: compare o quanto ela penetrou
    em cada eixo e reflita no eixo de menor penetração.
12. **Colisão contínua**: em vez de testar a posição final, teste o segmento entre a
    posição anterior e a nova. Resolve o atravessamento de vez, e é como jogos comerciais
    fazem.
13. **Modo dois contra dois**, com quatro raquetes e quatro conjuntos de teclas.

---

## O que você levou daqui

Movimento contínuo, vetores de velocidade, `requestAnimationFrame`, delta time, clamp,
AABB, reflexão, correção de posição, máquina de estados, entrada simultânea, oponente
controlado por código e síntese de áudio.

Essa lista cobre a base de praticamente qualquer jogo de ação em 2D.

---

**Antes:** [`../jogo-da-cobrinha`](../../jogo-da-cobrinha/) ·
**Depois:** [`../xadrez`](../../xadrez/) — onde o desafio deixa de ser física e passa a ser
regras complexas e um computador que pensa à frente.
