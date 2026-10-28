# Dique — Passo 6: As fichas

**Mudou:** `regras.js` (a `TABUA_DE_MARES`, as máquinas `TRANSICOES` e `transicaoValida`, `aguaDaFicha`, `volumeDoPasso`, `fontesDaFicha`, `receberBlocos`, `blocosNoMundo`, `acumularPerdidas`, `resultadoDoDia`; a nascente `N` no mapa; `buscaEmLargura` aceita fontes com nível próprio), `script.js` (o dia e a maré viram máquinas de estados com um relógio: `irPara`, `esperou`, `atualizar`; a chuva; o estoque que passa de uma maré para a seguinte), `index.html` (a faixa da tábua e o botão Maré/Seguir) e `style.css` (a tábua)
**Rode:** abra o `index.html`, leia a tábua, aperte **M** para a primeira maré, aperte **M** de novo quando ela passar (a próxima ficha chega), e termine as três marés.

---

## O que você vê

Sobre os botões há uma linha de **fichas**: `Tábua: [n2 2×5 +1] n2 3×5 +1 n2 2×5 +0 ☂`. Cada ficha é uma maré: **n**ível da água, **passos × casas por passo**, **blocos** que chegam antes dela e ☂ se chove; os **[colchetes]** marcam a maré de agora. O painel diz onde você está: **"Maré 1/3 · Blocos 1 · Erguer"**.

Cada maré tem quatro momentos que o jogo mostra e anuncia:

1. **Ler**: a ficha chega, com os blocos dela somados ao que sobrou da maré anterior (1,5 s, e qualquer jogada pula a espera).
2. **Moldar**: erguer e cavar, como no passo 5. **M** libera a água.
3. **A maré**: a **enchente** dá os passos da ficha (meio segundo cada, e cada passo enche várias casas); a **preamar** para no alto; a **vazante** devolve a água ao mar. As casas alagadas ganham **✗** e **continuam perdidas** nas marés seguintes.
4. **Contar**: **M** ("Seguir") chama a próxima ficha. Depois da última, o painel diz **"Dia vencido"** (salvar duas das três casas) ou **"Dia perdido"**. **N** recomeça tudo.

Na terceira maré **chove**: caem traços na tela, a nascente `N` no meio do vale vira uma fonte de água, e cada passo enche **duas casas a mais**.

---

## 1. A tábua é dados, não código

*Reusa `tetris/08-velocidade` (a curva de dificuldade é uma tabela) e `shoot-em-up/07-roteiro` (a fase é dados).*

Quem decide o que a maré faz não é um `if`, é uma lista:

```js
const TABUA_DE_MARES = [
    { nivel: 2, passos: 2, volume: 5, chuva: false, blocos: 1 },
    { nivel: 2, passos: 3, volume: 5, chuva: false, blocos: 1 },
    { nivel: 2, passos: 2, volume: 5, chuva: true, blocos: 0 },
];
```

Uma ficha tem cinco campos: o `nivel` que a água alcança, quantos `passos` ela dá, quantas casas ela enche por passo (`volume`), se há `chuva`, e quantos `blocos` você ganha antes. O código só **lê** a ficha de agora (`fichaDeAgora()`); mudar o dia é mexer na lista. É o mesmo ganho do Tetris (mexer na tabela de velocidades sem tocar no laço) e do Shoot 'em up (a fase como lista de eventos). O volume total da maré é `passos × volumeDoPasso(ficha)`, e é a mesma conta do passo 5:

```js
function aguaDaFicha(terreno, ficha, passos) {
    return encherComVolume(terreno, ficha.nivel, fontesDaFicha(ficha), passos * volumeDoPasso(ficha));
}
```

`aguaDaFicha(terreno, ficha, k)` responde: **onde está a água depois de `k` passos?** A previsão do H e o filme da maré usam a mesma função, só mudando o `k`. A página de teste a usa para conferir a maré **passo a passo** (nível, passos, volume e blocos de cada ficha).

---

## 2. Duas máquinas de estados, escritas como tabela

*Reusa `pacman/06-modos` (os modos dos fantasmas são uma tabela de estados e horários).*

O Pac-Man tinha um estado por vez (espalhar, perseguir, assustado) e uma tabela para trocar. O Dique tem **duas máquinas**, e a regra de quem pode ir para onde também é uma tabela:

```js
const TRANSICOES = {
    dia: { ler: ["moldar"], moldar: ["mare"], mare: ["contar"], contar: ["ler", "fim"], fim: [] },
    mare: { baixa: ["enchente"], enchente: ["preamar"], preamar: ["vazante"], vazante: ["baixa"] },
};
```

- **O dia:** `ler → moldar → mare → contar → (ler | fim)`. De `contar`, vai-se para a próxima ficha (`ler`) ou, se acabaram, para `fim`.
- **A maré:** `baixa → enchente → preamar → vazante → baixa`. A água sobe, para, desce e volta ao começo. Ela corre **dentro** do dia, entre `moldar` e `contar`.

Toda mudança de fase passa por **um único lugar**, que consulta a tabela:

```js
function irPara(maquina, destino) {
    const de = maquina === "dia" ? fase : faseDaMare;
    if (!transicaoValida(maquina, de, destino)) return false;       // fora da tabela: nada acontece
    if (maquina === "dia") fase = destino; else faseDaMare = destino;
    relogioDaFase = 0;
    return true;
}
```

Por isso nenhuma tecla consegue pôr o jogo num estado impossível: apertar **M** durante a enchente pergunta a `irPara`, e `irPara` diz não. A página de teste tenta **todas** as transições e confere que só as da tabela acontecem. (O `reiniciar` é a única jogada que ignora a tabela, de propósito: voltar ao começo vale de qualquer fase.)

---

## 3. O relógio anda a maré

As fases com tempo não usam `setTimeout`: o **laço** soma o tempo de cada quadro em `relogioDaFase`, e cada fase pergunta se já esperou o bastante.

```js
function esperou(duracao) {
    if (relogioDaFase < (movimentoReduzido ? 0 : duracao)) return false;
    relogioDaFase = 0;
    return true;
}

function atualizar(tempo) {
    relogioDaFase += tempo;
    if (fase === "ler" && esperou(TEMPO_DE_LEITURA)) irPara("dia", "moldar");
    else if (faseDaMare === "enchente" && esperou(PASSO_DA_MARE)) moverAgua(1);
    else if (faseDaMare === "preamar" && esperou(PAUSA_NA_PREAMAR)) contarAMare();
    else if (faseDaMare === "vazante" && esperou(PASSO_DA_MARE / 2)) moverAgua(-1);
}
```

Como o tempo vem do laço, uma página de teste dirige a maré **quadro a quadro**, com o relógio falso que o curso já usa: avança 50 ms, olha o estado, avança de novo. Com **movimento reduzido** a espera vira zero e cada quadro dá um passo: não há filme, só o resultado.

`moverAgua(sentido)` dá um passo (`passoDaMare += sentido`) e decide a fase pelo número: chegou a `passos`, é a preamar; voltou a 0, é a baixa-mar. A água que se vê é `previsao.ordem` até o passo de agora (`mostrarAgua`), com o mar na frente.

---

## 4. A chuva: fontes com nível próprio

Com `chuva: true`, duas coisas mudam, as duas listadas no GDD: o `volume` por passo **sobe** (`BONUS_DA_CHUVA`, +2 casas por passo) e as **nascentes** viram fontes extras. A água de uma nascente só cobre o que é mais baixo que `NIVEL_DA_NASCENTE` (1), não o nível da maré:

```js
function fontesDaFicha(ficha) {
    return CASAS_DO_MAR.concat(ficha.chuva ? NASCENTES.map(function (casa) { return { x: casa.x, y: casa.y, nivel: NIVEL_DA_NASCENTE }; }) : []);
}
```

Para a busca em largura aceitar isso, cada onda **carrega o nível** da fonte de onde saiu (`fonte.nivel || nivel`): a vizinha só alaga se for mais baixa que o nível **da onda**, não o da maré. O resto da função é o do passo 5. A nascente do mapa fica na cova do meio do vale. É um **mar pequeno**: a casa dela alaga de graça (como o mar, não gasta volume), e a água que sai dela segue a regra do passo 5. Cave uma casa ao lado e a nova cova, a mais baixa da fronteira, é a **primeira** que o volume enche.

---

## 5. O estoque passa de uma maré para a seguinte

*Reusa `xadrez/05-xeque` (o estado é imutável: cada mudança devolve um estado novo).*

O estado do passo 5 já era `{ alturas, blocos }`. Receber os blocos da ficha é mais uma transformação que devolve outro:

```js
function receberBlocos(estado, ficha) {
    return { alturas: estado.alturas, blocos: estado.blocos + ficha.blocos };
}
```

O que sobrou de uma maré vale na seguinte, porque o estado **continua**: só a lista de `historico` zera a cada ficha (desfazer volta até o começo **desta** maré; a água que passou não se desfaz). A página de teste confere que a terra se **conserva**:

```js
function blocosNoMundo(estado) {    // o que está empilhado no mapa mais o estoque
    ...
}
```

Erguer troca um bloco do estoque por um degrau do mapa; cavar faz o contrário; **só uma ficha** aumenta o total. Esse número, jogada após jogada, é a prova de que o jogo não cria nem perde terra.

---

## 6. A casa perdida fica perdida

*Reusa a lei do passo 5: a água só avança.*

`perdidas` é uma matriz de booleanos que **só ganha** `true`s: no fim da preamar, `acumularPerdidas(perdidas, agua.alagado)` junta as casas alagadas de agora com as das marés anteriores. A vazante devolve o **mar**, mas não devolve casas; é por isso que o ✗ continua no mapa com a água já baixa. `resultadoDoDia(contagem)` compara as salvas com `META_DO_DIA` (2). A contagem final usa a `perdidas` acumulada, não o `agua.alagado` de um instante.

---

## 7. O que a tábua ensina a pensar

Jogue sem jogar: aperte **M** três vezes sem mexer. A maré 1 (10 casas) não alcança nenhuma casa; a 2 (15 casas) alcança duas; a 3 (14 com chuva) alcança as mesmas. Agora **leia a tábua antes**: você recebe um bloco por maré, e fechar **os dois portões** (`(8, 4)` e `(4, 8)`) custa dois. Se você fechar um só na primeira maré, a água, sem o outro portão para gastar o volume, entra **toda** pelo aberto, e **perde mais casas** que sem jogar nada. A resposta é guardar o bloco: a tábua mostra que a maré 2 traz outro, e **os dois portões se fecham juntos**, antes da água que importa. O estoque que passa de uma maré para a outra é a ferramenta; a tábua, o aviso.

---

## 8. O que o passo 6 ainda não sabe

- **Um dia só.** A tábua e o mapa são os deste passo; vários dias, com dificuldade por eixo e um **robô** que prova que cada um tem solução e acha o `par`, são do passo 7.
- **Estrelas e recorde.** O dia só passa ou não passa (`META_DO_DIA`); as estrelas, o `par` e o `localStorage` são do passo 7 e do `final`.
- **A vazante é só visual** (a água volta por passos). Pausa, som e menu são do `final`.

---

## Experimente

1. Aperte **M** três vezes sem jogar e olhe o painel depois de cada maré. Qual ficha perde as casas, e quantas?
2. Na `TABUA_DE_MARES`, troque o `blocos` da primeira ficha para `2`. Que jogada nova a primeira maré permite? A maré 2 ainda tem a armadilha dos portões?
3. Acrescente uma **quarta ficha** `{ nivel: 3, passos: 2, volume: 5, chuva: false, blocos: 1 }`. O dia dura mais uma maré sem você mexer em nenhuma função? Que terraços alagam com o nível 3?
4. Tire `"preamar"` da lista de `enchente` em `TRANSICOES.mare` (deixe `enchente: ["vazante"]`). O jogo quebra, ou o `irPara` recusa? O que o painel mostra?
5. Mude `BONUS_DA_CHUVA` para `0` e jogue a terceira maré. A nascente ainda importa? E com `chuva: true` mas sem nascente no mapa (troque o `N` por `.`)?
6. Com a ficha 3, cave `(3, 4)`, ao lado da nascente `(4, 4)`, e olhe o H. Onde está o número **1**? Por quê? Volte com **Z** e cave `(3, 3)`: o que o jogo diz?
7. Aperte **Z** logo depois de liberar a maré 2, e depois logo antes. Em que momento ele deixa de valer, e por quê? Desfaça uma jogada da maré 1 depois de seguir para a 2: o que acontece com o `historico`?
8. **Quebre de propósito:** em `contarAMare`, troque `acumularPerdidas(perdidas, agua.alagado)` por `perdidas = criarMatriz(false)` antes dela. O que muda no ✗ da maré 1 depois que a maré 2 passa?

---

**Anterior:** [`05-enchente`](../05-enchente/) · **Próximo:** `07-dias` — o dia deixa de ser um só: vários dias como **dados**, dificuldade por eixo, e um **robô** que prova, por busca, que cada dia tem solução e acha o `par`.
