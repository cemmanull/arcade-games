# Passo final — Jogo da Cobrinha

**Anterior:** `09-interface`
**Rode:** abra o `index.html`. Só isso — sem instalar nada.

Este é o fim da trilha e também o material de referência: o código está comentado linha a
linha, e este guia dá o mapa completo — **por que** as coisas são como são, e o que
estudar em cada arquivo. No fim há 37 exercícios.

---

## O que mudou do passo 9 para aqui

Nenhuma regra do jogo. **Nenhuma.**

O que mudou foi só o visual, e a lista é curta:

| | Passo 9 | Final |
|---|---|---|
| Resolução do canvas | 400×400 | **160×160** |
| Tamanho na tela | 400px | **480px** (ampliação de 3×) |
| Pixels por célula | 20 | **8** |
| Cobra | quadrado liso | contorno escuro + miolo claro + olhos |
| Maçã | quadrado | sprite de 8×8 desenhado com caracteres |
| Fundo | liso | pontinho marcando cada célula |

Agora compare os dois `script.js` lado a lado e procure o que **não** mudou:
`darUmPasso`, `calcularProximaCabeca`, `colidiu`, `sortearMaca`, `contarUmSegundo`,
`terminarJogo`, `responderAoTeclado` — idênticas, palavra por palavra.

Foi possível trocar a resolução do jogo inteiro, a arte e a escala sem encostar em uma
única regra. Isso não foi sorte: foi a decisão tomada lá no passo 3, quando a posição
passou a ser guardada em **células** em vez de pixels.

> **Separe o que a coisa É do jeito como ela APARECE.** O retorno vem meses depois, na
> forma de mudanças que não quebram nada.

---

## A ideia central: três linguagens, três papéis

| Arquivo | Linguagem | Responsabilidade | Pergunta que responde |
|---|---|---|---|
| `index.html` | HTML | Estrutura | **O que** existe na página? |
| `style.css` | CSS | Aparência | **Como** isso se parece? |
| `script.js` | JavaScript | Comportamento | O que **acontece**? |

Essa separação é o primeiro princípio de arquitetura da web. Quando ela se mistura
(estilo dentro do HTML, comportamento dentro de uma tag), o projeto fica difícil de
mudar: você não sabe mais onde procurar. Por isso o botão do jogo tem só
`id="iniciar"` no HTML — a cor está no CSS, e a ação está no JS.

---

## 1. HTML — a árvore

O navegador lê o HTML e monta uma **árvore de elementos**. Tags dentro de tags viram
pais e filhos:

```
html
└── body
    ├── h1
    ├── div#jogo-container
    │   ├── div#placar
    │   │   ├── p#pontos
    │   │   └── p#tempo
    │   └── div#tela
    │       ├── canvas#jogo          <- o jogo é pintado aqui
    │       └── div#fim-de-jogo      <- camada de texto por cima
    └── button#iniciar
```

Conceitos para levar:

- **Tag** — `<p>conteúdo</p>`. Abre, contém, fecha.
- **Atributo** — informação extra dentro da tag: `id`, `class`, `src`, `hidden`.
- **`id`** — nome único na página. É a etiqueta pela qual CSS e JS encontram o elemento.
- **Semântica** — escolha a tag pelo *significado*, não pela aparência. `<h1>` porque é
  o título principal, não porque a letra é grande. Isso importa para o Google e para
  leitores de tela.
- **`defer`** — no `<script>`, manda esperar o HTML carregar. Sem ele, o JS procuraria
  elementos que ainda não nasceram e receberia `null`.

---

## 2. CSS — seletor + declaração

```css
seletor {
    propriedade: valor;
}
```

Conceitos para levar:

- **Seletores** — `body` (tag), `#placar` (id), `.item` (classe), `#placar p`
  (descendente), `button:hover` (estado), `#fim-de-jogo[hidden]` (atributo).
- **Cascata** — se duas regras brigam pelo mesmo elemento, vence a mais específica
  (`#id` > `.classe` > `tag`); em empate, vence a que está mais abaixo no arquivo.
- **Herança** — propriedades de texto (`color`, `font-family`) descem do pai para os
  filhos. Definir a fonte no `body` vale para a página inteira.
- **Box model** — toda caixa tem 4 camadas: conteúdo → `padding` → `border` → `margin`.
  Metade dos problemas de espaçamento é confundir padding (dentro) com margin (fora).
- **Flexbox** — `display: flex` no *pai* comanda o alinhamento dos *filhos*.
  `flex-direction` escolhe o eixo; `justify-content` alinha nele; `align-items` alinha
  no eixo perpendicular.
- **`relative` + `absolute`** — para empilhar camadas. O filho `absolute` se posiciona
  em relação ao ancestral `relative` mais próximo. É assim que o aviso de fim de jogo
  fica exatamente sobre o canvas.
- **Variáveis** — `--pixel` no `:root`, lida com `var(--pixel)`. O tamanho do pixel
  existe em um lugar só, então mudar a escala do jogo inteiro é mudar uma linha.

**Pegadinha que vale memorizar:** o atributo `hidden` funciona porque o navegador aplica
`display: none`. Se você definir `display: flex` naquele elemento, sua regra é mais
específica e **vence** — o elemento aparece mesmo "escondido". Por isso existe
`#fim-de-jogo[hidden] { display: none; }` no CSS.

---

## 3. JavaScript — a lógica

Conceitos, na ordem em que aparecem no arquivo:

- **`const` vs `let`** — use `const` por padrão. `let` só quando o valor precisa mudar
  mesmo. Quem lê o código descobre na hora o que fica parado.
- **Objeto** — `{ coluna: 5, linha: 5 }`. Um conjunto de valores com nome.
- **Array** — `[peça, peça, peça]`. Uma lista ordenada. `array[0]` é o primeiro item.
- **Função** — um bloco de código com nome, que você chama quando quiser.
  Uma função deve fazer **uma coisa** e o nome deve dizer qual (`sortearMaca`,
  `colidiu`, `desenhar`).
- **Guard clause** — trate o caso ruim primeiro e saia com `return`. Deixa o caminho
  normal reto, sem `if` gigante embrulhando a função.
- **Cópia vs referência** — `{ ...cobra[0] }` copia. Sem as reticências, você estaria
  apontando para o mesmo objeto e o alteraria sem querer.
- **Métodos de array** — `push`/`pop` (fim), `unshift`/`shift` (início),
  `forEach` (percorrer), `some` (existe algum que...?), `slice` (pedaço),
  `split` (texto → lista).
- **Dicionário** — objeto usado como tabela de consulta: `CORES_DA_MACA["#"]` devolve a
  cor. Substitui uma escada de `if`.
- **Template string** — crases e `${valor}`: `` `Pontos: ${pontos}` ``.

---

## 4. DOM — o JavaScript mexendo no HTML

DOM = *Document Object Model*. É a árvore do HTML transformada em **objetos vivos**
que o JS pode ler e alterar. Alterou o objeto, a tela muda na hora.

```js
const textoDePontos = document.getElementById("pontos"); // achar
textoDePontos.textContent = "Pontos: 10";                // alterar
camadaDeFimDeJogo.hidden = false;                        // mostrar
```

Princípios:

- **Busque uma vez, guarde numa constante.** Buscar dentro do loop é procurar a mesma
  coisa centenas de vezes por minuto.
- **`textContent` para texto.** (Existe `innerHTML`, que interpreta tags — evite: se o
  conteúdo vier do usuário, vira brecha de segurança.)
- **Mostrar/esconder costuma ser mais simples que criar/destruir.** A tela de fim de
  jogo já existe no HTML desde o início; o JS só tira o `hidden`.
- **O DOM é o estado *visível*; suas variáveis são o estado *real*.** A pontuação mora
  em `pontos`; o `<p>` é só o espelho dela. Nunca leia o número de volta da tela.

---

## 5. Canvas — pintura, não elementos

O `<canvas>` é a exceção à regra do DOM. Nele não existem elementos filhos: existe
**tinta**. Nada se move sozinho; para animar, você **apaga tudo e repinta**.

```js
const pincel = tela.getContext("2d"); // as ferramentas de desenho

pincel.fillStyle = "#00f0ff";         // escolhe a cor (não desenha nada)
pincel.fillRect(2, 4, 1, 1);          // aí sim pinta
```

Princípios:

- **O pincel tem memória de estado.** `fillStyle` continua valendo até você trocá-lo.
  A ordem das linhas importa.
- **Quem pinta depois fica por cima.** Por isso: fundo → cobra → maçã.
- **Y cresce para baixo.** A origem `(0,0)` é o canto superior *esquerdo*, ao contrário
  do gráfico da escola. "Para cima" é `linha - 1`.
- **Canvas é invisível para leitores de tela.** Por isso o placar e o "Game Over" são
  HTML de verdade, e não texto desenhado.

### Resolução ≠ tamanho na tela — o segredo do pixelado

Esta é a distinção mais importante do canvas:

| | Onde se define | O que significa |
|---|---|---|
| **Resolução** | `width`/`height` na tag HTML | quantos pixels de desenho existem (160) |
| **Tamanho exibido** | `width`/`height` no CSS | quanto espaço ele ocupa na página (480px) |

Este jogo desenha em **160×160** e é exibido com **480px**: ampliação de exatamente 3×.
Ao ampliar, o navegador normalmente inventa os pixels que faltam misturando os vizinhos
— ótimo para fotos, desastroso para pixel art. `image-rendering: pixelated` manda
repetir o pixel original tal e qual, com as bordas duras.

Duas regras que vêm daí:

1. **A escala tem que ser um número inteiro** (2×, 3×, 4×). Com 2,5× um pixel viraria
   dois pixels e meio, e como meio pixel não existe, o navegador borra para disfarçar.
2. **Desenhe pequeno.** Pixel art é feita de poucos pixels grandes, não de muitos
   pixels pequenos. Um sprite de 8×8 tem 64 pontos — cabe na cabeça.

### Sprites: arte como texto

A maçã está escrita no `script.js` como 8 linhas de 8 caracteres. Você **vê** o desenho
no próprio código:

```js
const SPRITE_MACA = [
    "....t...",
    "..tt.t..",
    ".######.",
    ...
];
```

Um dicionário liga cada caractere a uma cor; `desenharSprite` percorre linha por linha,
caractere por caractere, e pinta um quadradinho de 1×1 para cada um. Caractere sem cor
(`.`) é transparente. Para redesenhar a maçã, você **desenha** — não recalcula
coordenada nenhuma.

---

## 6. Duas unidades de medida (e por que isso importa)

A lógica do jogo pensa em **células** (`coluna: 5, linha: 5` — inteiros de 0 a 19).
O desenho pensa em **pixels**. A conversão acontece em um lugar só, na hora de pintar:

```js
const x = parte.coluna * PIXELS_POR_CELULA;
```

Andar vira `coluna += 1`, em vez de `x += 20`. Sortear a maçã vira um `Math.floor`
simples, sem multiplicação. Bater na parede é `coluna >= COLUNAS`.

O princípio é geral e vale para qualquer programa: **separe o que a coisa É do jeito
como ela APARECE.** Aqui o resultado prático é que dá para trocar todo o visual — outra
escala, outro tamanho de célula, outra arte — sem encostar em uma regra do jogo sequer.

---

## 7. Eventos — a página reage

O JS de uma página não roda do início ao fim e acaba. Ele **espera** e reage.

```js
botaoIniciar.addEventListener("click", iniciarJogo);
```

- Passe o **nome** da função, sem `()`. Com parênteses você a executaria agora e
  entregaria o resultado; sem, você entrega a função para o navegador chamar depois.
- O navegador passa um **objeto de evento** com os detalhes (`evento.key` diz a tecla).
- `evento.preventDefault()` cancela a reação padrão do navegador (as setas rolarem a
  página).
- `setInterval(função, ms)` repete uma função. Ele devolve um id — guarde-o, ou você
  não conseguirá parar o loop com `clearInterval`.

---

## 8. O game loop

Todo jogo, do Pong ao Zelda, é este ciclo repetido muitas vezes por segundo:

```
ler entrada → atualizar estado → desenhar
```

Neste projeto:

| Etapa | Onde acontece |
|---|---|
| ler entrada | `responderAoTeclado` guarda a `direcao` |
| atualizar estado | `darUmPasso` move, testa colisão, conta pontos |
| desenhar | `desenhar` repinta a cena inteira |

`setInterval(darUmPasso, 150)` é o motor que gira essa roda.

**O truque da cobrinha:** ela nunca "anda". A cada passo ela ganha uma peça na frente
(`unshift`) e perde a de trás (`pop`). Comeu a maçã? Só não remove a de trás — e o
corpo cresce em um. Duas linhas resolvem o que parecia movimento complexo.

---

## Exercícios

Sete níveis, em ordem. Cada um só usa o que o anterior já ensinou — faça na sequência,
mesmo que algum pareça fácil demais. Do nível 4 em diante você vai substituindo peças da
cobrinha por versões mais gerais, do tipo que serve para **qualquer** jogo.

Quando um exercício pedir para "trocar" algo, **não apague o original**: comente-o ou
guarde uma cópia do arquivo. Comparar as duas versões é metade do aprendizado.

---

### Nível 1 — Aparência (CSS e pixel art)

1. **Tema** — troque as cores para verde fosforescente mudando só as 4 variáveis do
   `:root`. Nenhuma outra linha do CSS pode ser tocada. Se precisar tocar, é porque
   alguma cor estava escrita fora do lugar.
2. **Escala** — mude `--pixel` para `4px` e `--lado-da-tela` para `640px`. Depois tente
   `2.5px` / `400px` e repare no borrão: é a regra da escala inteira em ação.
3. **Pixel art** — redesenhe o `SPRITE_MACA`. Faça uma cereja, uma estrela, um rato.
4. **Mais sprites** — crie um `SPRITE_BONUS` diferente e faça aparecer uma fruta especial
   a cada 5 maçãs comidas, valendo 50 pontos.
5. **Cauda** — use o `indice` em `desenharCobra` para encolher os últimos segmentos em
   1 pixel de cada lado. A cobra ganha uma ponta afinada.

---

### Nível 2 — Regras e estado

6. **Túnel** — faça a cobra atravessar as paredes e sair do outro lado em vez de morrer.
   Dica: o operador `%` (resto da divisão) resolve isso em uma linha por eixo — mas
   cuidado com números negativos.
7. **Velocidade progressiva** — acelere a cada 5 maçãs. Dica: `clearInterval` e criar um
   novo `setInterval` mais rápido. Guarde a velocidade atual em uma variável de estado.
8. **Obstáculos** — sorteie 5 paredes fixas no início da partida e faça a cobra morrer ao
   encostar. Reaproveite a estrutura de `colidiu` — ela já sabe percorrer uma lista de
   posições procurando uma igual.
9. **Resolução** — mude o canvas para `width="320" height="320"` no HTML e ajuste
   `--lado-da-tela`. Repare que `COLUNAS` se ajusta sozinho: o tabuleiro dobra de tamanho
   sem tocar em nenhuma linha de lógica. Se algo quebrou, é porque havia um número
   duplicado escondido.

---

### Nível 3 — DOM e interface

10. **Recorde** — guarde a maior pontuação com `localStorage.setItem` /
    `localStorage.getItem` e mostre no placar. Atenção: o `localStorage` só guarda texto,
    então na volta é preciso `Number(...)`.
11. **Pausa** — a tecla `P` congela o jogo e mostra um aviso. Dica: você já tem tudo —
    `pararCronometros()`, `setInterval` e um elemento escondido com `hidden`.
12. **Contagem regressiva** — antes de a partida começar, mostre "3, 2, 1, JÁ" na camada
    sobreposta. Dica: `setTimeout(função, ms)` executa **uma vez**, ao contrário do
    `setInterval`.

---

### Nível 4 — Entrada do jogador de verdade

> A cobrinha usa a entrada mais simples que existe: uma tecla apertada muda uma variável
> e pronto. Isso não serve para um objeto que precisa se mover **enquanto** a tecla está
> pressionada — para isso é preciso saber quais teclas estão **presas agora**, não qual
> foi a última apertada.

13. **Teclas alternativas** — aceite também W, A, S, D. Dica: `evento.key` devolve a letra
    minúscula ou maiúscula conforme o Shift; `toLowerCase()` normaliza.
14. **Mapa de teclas pressionadas** — crie um objeto `const teclasPressionadas = {}` e dois
    ouvintes:

    ```js
    document.addEventListener("keydown", e => teclasPressionadas[e.key] = true);
    document.addEventListener("keyup",   e => teclasPressionadas[e.key] = false);
    ```

    Agora `teclasPressionadas["ArrowUp"]` responde "essa tecla está presa neste instante?".
    Troque o controle da cobra para consultar esse objeto dentro de `darUmPasso`, em vez
    de reagir ao evento. O comportamento fica quase igual — o que muda é **quem pergunta**:
    antes o teclado avisava, agora o jogo consulta.
15. **Duas mãos ao mesmo tempo** — prove que o mapa funciona: faça a cobra ficar rosa
    enquanto `Shift` estiver pressionado, sem parar de responder às setas. Com o método
    antigo isso é impossível; com o mapa, sai de graça. **Este é o exercício que destrava
    jogos de dois jogadores no mesmo teclado.**
16. **Mouse** — mova a cobra na direção do clique. Dica: o evento de clique dá coordenadas
    da *janela*; para converter em coordenadas do *canvas* é preciso descontar a posição e
    a escala do elemento:

    ```js
    const area = tela.getBoundingClientRect();
    const x = (evento.clientX - area.left) * (tela.width / area.width);
    ```

    Entender essa conta é obrigatório para qualquer jogo controlado por mouse ou toque.

---

### Nível 5 — Movimento contínuo

> Até aqui tudo anda de célula em célula: posições são inteiros e o tempo é picotado em
> passos de 150ms. A maioria dos jogos não é assim — as coisas ocupam posições
> **fracionárias** e se movem um pouquinho a cada quadro, 60 vezes por segundo.

17. **A partícula** — em um arquivo novo (copie o projeto), esqueça a cobra e faça um
    único quadrado atravessar a tela. Guarde-o assim:

    ```js
    let quadrado = { x: 10, y: 10, largura: 6, altura: 6, velocidadeX: 0.5, velocidadeY: 0.3 };
    ```

    A cada passo: `quadrado.x += quadrado.velocidadeX`. Note que `x` agora pode valer
    10.5 — e `fillRect` aceita decimais numa boa.
18. **Velocidade é um par de números** — mude os dois valores de velocidade e observe a
    direção e a inclinação mudarem juntas. Essa dupla `(velocidadeX, velocidadeY)` é o
    conceito de **vetor**: ela carrega direção e rapidez ao mesmo tempo, sem `switch`
    nenhum. Compare com o `switch (direcao)` da cobrinha e conclua qual dos dois consegue
    representar um movimento na diagonal.
19. **`requestAnimationFrame`** — troque o `setInterval` do desenho por:

    ```js
    function quadroAQuadro() {
        atualizar();
        desenhar();
        requestAnimationFrame(quadroAQuadro);  // "me chame de novo no próximo quadro"
    }
    requestAnimationFrame(quadroAQuadro);
    ```

    Uma função que se agenda de novo. O navegador a chama ~60 vezes por segundo,
    sincronizada com a tela — mais suave que `setInterval` e ela pausa sozinha quando a
    aba sai de foco.
20. **Tempo entre quadros (delta time)** — `requestAnimationFrame` entrega um carimbo de
    tempo à sua função. Guarde o do quadro anterior e calcule a diferença:

    ```js
    function quadroAQuadro(agora) {
        const segundosDesdeOUltimoQuadro = (agora - instanteAnterior) / 1000;
        instanteAnterior = agora;
        ...
    }
    ```

    Multiplique a velocidade por esse valor: `x += velocidadeX * segundos`. Agora a
    velocidade está em **pixels por segundo**, e o jogo anda igual em um computador rápido
    e em um lento. Sem isso, o jogo fica mais rápido em telas de 144Hz — um bug clássico,
    difícil de descobrir depois.
21. **Limitar dentro da tela (clamp)** — faça o quadrado parar nas bordas em vez de sumir:
    `x = Math.max(0, Math.min(x, tela.width - largura))`. Leia essa linha até ela ficar
    óbvia; ela aparece em todo jogo que existe.
22. **Uma barra controlável** — junte o nível 4 com este: um retângulo alto e fino que sobe
    e desce **enquanto** a seta estiver pressionada, e que não sai da tela. Velocidade em
    pixels por segundo, com clamp nas duas pontas.

---

### Nível 6 — Colisão de verdade

> Na cobrinha, colidir é comparar duas células iguais: `a.coluna === b.coluna`. Isso só
> funciona porque tudo está alinhado numa grade. Com posições fracionárias, dois objetos
> quase nunca ficam exatamente no mesmo ponto — colidir vira uma questão de **áreas que se
> sobrepõem**.

23. **Retângulo contra retângulo (AABB)** — implemente e teste esta função:

    ```js
    function seSobrepoe(a, b) {
        return a.x < b.x + b.largura &&
               a.x + a.largura > b.x &&
               a.y < b.y + b.altura &&
               a.y + a.altura > b.y;
    }
    ```

    Antes de usá-la, entenda por que ela funciona: **dois retângulos se sobrepõem quando
    se sobrepõem nos dois eixos ao mesmo tempo.** Desenhe dois retângulos no papel e teste
    as quatro comparações. Esta é a colisão mais usada em jogos 2D.
24. **Quicar nas bordas** — quando o quadrado toca uma borda vertical, inverta o sinal:
    `velocidadeX = -velocidadeX`. Nas horizontais, `velocidadeY`. Um sinal trocado é uma
    reflexão — a física inteira do ricochete cabe nisso.
25. **Empurrar para fora** — só inverter a velocidade não basta: se o objeto entrou 3 pixels
    na parede, ele pode ficar tremendo preso lá dentro. Corrija também a **posição**,
    devolvendo-o para a borda (`x = tela.width - largura`) no mesmo passo em que inverte a
    velocidade. Este é o bug número um de quem começa com colisão.
26. **Quicar em um obstáculo** — coloque um retângulo parado no meio da tela e faça o
    objeto móvel quicar nele com `seSobrepoe`. Descubra sozinho o problema difícil: como
    saber se ele bateu no **lado** ou no **topo**? Dica: compare o quanto ele penetrou em
    cada eixo e reflita no eixo de menor penetração.
27. **Ângulo variável** — faça o ponto de impacto influenciar a saída: bater perto da ponta
    do obstáculo deve mandar o objeto mais inclinado do que bater no centro. Calcule a
    distância entre o centro do objeto e o centro do obstáculo, normalize entre -1 e 1, e
    use como `velocidadeY`. É essa única linha que separa um ricochete monótono de um jogo
    com intenção.
28. **Círculo** — desenhe o objeto como bola em vez de quadrado:
    `pincel.beginPath(); pincel.arc(x, y, raio, 0, Math.PI * 2); pincel.fill();`
    Atenção à mudança de referencial: `arc` usa o **centro**, enquanto `fillRect` usa o
    canto superior esquerdo. Confundir os dois desloca tudo pela metade do tamanho —
    outro erro clássico.
29. **Acelerar a cada toque** — multiplique a velocidade por 1.05 a cada ricochete e imponha
    um teto com `Math.min`. Sem o teto, em pouco tempo o objeto anda mais que a própria
    largura por quadro e **atravessa** as paredes sem nunca se sobrepor a elas. Descubra
    esse bug na prática: ele ensina mais do que qualquer explicação.

---

### Nível 7 — Arquitetura de um jogo

30. **Máquina de estados** — troque o `jogoRodando` (que só sabe dizer sim ou não) por:

    ```js
    let estado = "menu";  // "menu" | "jogando" | "pausado" | "fim"
    ```

    Faça o loop e o teclado consultarem `estado` para decidir o que fazer, e a interface
    mostrar a camada certa para cada um. Um único `if` gigante vira quatro casos claros.
    Todo jogo tem essa variável em algum lugar.
31. **Objetos independentes** — refatore para que cada coisa móvel seja um objeto com os
    mesmos campos (`x`, `y`, `largura`, `altura`, `velocidadeX`, `velocidadeY`) e escreva
    uma função `mover(objeto, segundos)` que sirva para qualquer um deles. Uma função que
    não sabe **qual** objeto está movendo é uma função que você não vai reescrever nunca
    mais.
32. **Dois jogadores** — dois objetos controláveis no mesmo teclado, cada um com seu par de
    teclas, movendo-se **simultaneamente**. Só funciona se você fez o exercício 14. Guarde
    as teclas de cada jogador em um objeto de configuração em vez de espalhar `if` pelo
    código.
33. **Placar de dois lados** — dois contadores independentes, e a rodada reinicia no centro
    quando alguém marca. Sorteie o lado inicial com `Math.random() < 0.5 ? -1 : 1` para
    ninguém sair sempre em vantagem.
34. **Vitória** — o primeiro a chegar a 5 pontos vence; mostre quem ganhou na camada
    sobreposta e volte ao estado de menu.
35. **Oponente automático** — um dos controladores passa a ser guiado por código: mova-o na
    direção do objeto móvel, **mas com um limite de velocidade menor** que o do jogador
    humano. Esse limite é o que torna o oponente vencível — dificuldade não é inteligência,
    é a margem de erro que você concede a ela. Experimente também fazê-lo reagir só quando
    o objeto vem em sua direção.
36. **Som** — um bipe a cada toque, com a API de áudio do próprio navegador:

    ```js
    const audio = new AudioContext();
    function bipar(frequencia) {
        const oscilador = audio.createOscillator();
        oscilador.frequency.value = frequencia;
        oscilador.connect(audio.destination);
        oscilador.start();
        oscilador.stop(audio.currentTime + 0.05);
    }
    ```

    Navegadores só liberam som **depois** do primeiro clique do usuário — se ficar mudo, é
    provavelmente isso, não um erro no seu código.
37. **Toque na tela** — aceite `touchstart` / `touchmove` para funcionar no celular.
    A conversão de coordenadas é a mesma do exercício 16, mas a posição vem de
    `evento.touches[0]`.

---

### Projeto final

Junte tudo em um jogo novo, do zero, sem copiar e colar a cobrinha:

- dois controladores independentes, um em cada lado da tela, movendo-se ao mesmo tempo;
- um objeto que se move continuamente, quica nas bordas de cima e de baixo e é rebatido
  pelos controladores, saindo em ângulos diferentes conforme o ponto de impacto;
- ponto para o lado oposto quando o objeto escapa por uma das laterais;
- placar dos dois lados, primeiro a 5 vence;
- estados de menu, jogo, pausa e fim;
- o segundo controlador pode ser guiado por código, com velocidade limitada;
- movimento em pixels por segundo, com `requestAnimationFrame` e delta time;
- visual pixelado: canvas em baixa resolução ampliado por um número inteiro.

Se você fez os 37 exercícios, não há uma linha aí que você ainda não tenha escrito.
O trabalho agora é só de montagem — que é, quase sempre, o que programar realmente é.
