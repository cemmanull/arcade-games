# Passo 9 — Interface

**Mudou:** os três arquivos
**Rode:** abra o `index.html` e clique em *Iniciar Jogo*.

---

## O que você vê

Um jogo completo: placar, cronômetro de 60 segundos, tela de fim de jogo e botão para
recomeçar quantas vezes quiser.

O console não é mais necessário. O jogo passou a conversar com quem joga.

---

## A ideia central: texto é HTML, gráfico é canvas

Todos os elementos novos — placar, tempo, "Game Over", pontuação final — são **HTML**.
Nenhum foi desenhado no canvas, embora todos apareçam por cima ou ao redor dele.

Por quê? Porque texto de verdade pode ser:

- selecionado e copiado;
- traduzido pelo navegador;
- ampliado por quem enxerga pouco;
- **lido em voz alta por um leitor de tela.**

O que é pintado no canvas é só uma imagem. Ninguém além dos olhos consegue lê-la — e há
muita gente navegando sem usar os olhos.

> **Se é texto, use HTML. Se é gráfico, use canvas.** Vale para pontuação, menus,
> botões, mensagens de erro e praticamente tudo que não seja o jogo em si.

Repare também que o `#fim-de-jogo` **já existia** no HTML desde o início, escondido pelo
atributo `hidden`. Terminar o jogo é só remover esse atributo. Mostrar algo que já existe
é mais simples do que criar elementos por código — menos passos, menos como errar.

---

## Conceitos deste passo

### `textContent`

```js
textoDePontos.textContent = `Pontos: ${pontos}`;
```

Troca o texto de dentro do elemento. As crases criam um **template string**, onde
`${...}` insere um valor no meio do texto.

Existe também `innerHTML`, que interpreta tags. **Evite.** Se o conteúdo vier de um
usuário, `innerHTML` é uma porta de entrada para código malicioso na sua página. Use
`textContent` até ter um motivo específico para não usar.

### O estado visível e o estado real

A pontuação mora na variável `pontos`. O `<p>` é só o **espelho** dela.

Nunca leia o número de volta da tela para fazer contas. O DOM é a saída, não a memória do
programa — no momento em que você começa a tratar a tela como fonte de verdade, o
programa passa a depender de como as coisas estão escritas.

### Preparação em uma função

No passo 8, os valores iniciais estavam espalhados pelas declarações e a partida começava
sozinha ao carregar. Agora tudo que prepara uma partida está dentro de `iniciarJogo()`.

Essa mudança é o que transforma **"um jogo que roda"** em **"um jogo que se pode jogar de
novo"**. Reiniciar não é um recurso extra: é a consequência de ter juntado a preparação
em um lugar.

### O bug do loop duplicado

```js
pararCronometros();   // ANTES de criar os novos
cronometroDoJogo = setInterval(darUmPasso, MILISSEGUNDOS_POR_PASSO);
```

Sem essa linha, clicar em "Reiniciar" deixaria **dois** loops rodando: a cobra andaria em
dobro. Clique de novo e são três.

É um clássico de qualquer botão de reiniciar, e é traiçoeiro porque a primeira partida
funciona perfeitamente — o bug só aparece na segunda. Sempre que criar um recurso dentro
de uma função que pode ser chamada mais de uma vez, pergunte: **e se chamarem duas
vezes?**

### Dois cronômetros

```js
cronometroDoJogo    = setInterval(darUmPasso, 150);
cronometroDoRelogio = setInterval(contarUmSegundo, 1000);
```

Dois ritmos independentes, dois cronômetros. Daria para usar um só, contando quantos
passos se passaram — mas seriam duas responsabilidades na mesma função, e a conta
quebraria assim que a velocidade do jogo mudasse.

> **Duas tarefas com ritmos próprios: dois cronômetros.**

### `position: relative` + `absolute`

Um filho `absolute` se posiciona em relação ao ancestral mais próximo que **não** seja
`static` (o padrão). Marcar o pai como `relative` é dizer: *é a partir daqui que meus
filhos absolutos medem as distâncias*.

```css
#tela        { position: relative; }        /* o ponto de referência */
#fim-de-jogo { position: absolute; inset: 0; }  /* cola nos 4 lados do pai */
```

Sem o `relative` no pai, a camada se posicionaria em relação à página inteira e apareceria
em qualquer lugar, menos sobre o canvas. É a explicação para 90% dos "meu elemento
absoluto foi parar no canto errado".

### A pegadinha do `hidden`

```css
#fim-de-jogo         { display: flex; }
#fim-de-jogo[hidden] { display: none; }   /* sem esta linha, não esconde */
```

O atributo `hidden` funciona porque o navegador aplica `display: none` a ele. Mas a nossa
regra diz `display: flex`, e ela é **mais específica** — então vence a cascata, e o
elemento aparece mesmo "escondido".

Sempre que definir `display` em um elemento que usa `hidden`, escreva também a regra do
`[hidden]`. Vale memorizar: é um dos bugs de CSS mais confusos para quem está começando,
porque o HTML *parece* certo.

### Guarda no teclado

```js
if (!jogoRodando) return;
```

Fora da partida, as setas não devem fazer nada. Sem essa linha você poderia "dirigir" uma
cobra que ainda não existe, e o erro apareceria como um `undefined` incompreensível —
longe da causa.

---

## O jogo está completo

Neste ponto você escreveu, do zero:

- uma página estruturada e estilizada;
- um game loop;
- entrada de teclado;
- uma estrutura de dados que resolve o movimento com duas operações de lista;
- sorteio com rejeição;
- detecção de colisão;
- ciclo de vida de partida (iniciar, perder, reiniciar);
- interface acessível separada do gráfico.

O passo `final` não adiciona nenhuma regra nova. Ele troca **só o visual** — e o
interessante é justamente o que ele *não* vai precisar tocar.

---

## Experimente

1. Mostre um recorde, guardado com `localStorage.setItem` / `getItem`. Cuidado: o
   `localStorage` só guarda texto, então na volta é preciso `Number(...)`.
2. Faça a tecla `P` pausar. Você já tem tudo: `pararCronometros()`, `setInterval` e um
   elemento com `hidden`.
3. Acelere o jogo a cada 5 maçãs: `clearInterval` no cronômetro do jogo e criar outro com
   intervalo menor. Guarde a velocidade atual numa variável de estado.
4. Mostre "3, 2, 1, JÁ" antes de começar, usando a camada sobreposta e `setTimeout`
   (que executa **uma vez**, ao contrário do `setInterval`).
5. Remova a linha `#fim-de-jogo[hidden]` do CSS e clique em Iniciar. A camada de fim de
   jogo aparece por cima do jogo desde o começo — a pegadinha, ao vivo.
6. Some 10 segundos ao tempo a cada maçã comida e veja como isso muda a sensação do jogo.

---

**Anterior:** `08-colisao` · **Próximo:** `final` — o mesmo jogo, com cara de videogame
antigo. E um guia com 37 exercícios.
