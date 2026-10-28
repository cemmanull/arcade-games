# Dique — Passo 5: A enchente

**Mudou:** `regras.js` (a mecânica: `estadoInicial`, `moldar`, `motivoDaRecusa`, `buscaEmLargura`, `encherComVolume`, `contarCasas`, `definirAgua`; `alturaVisivel(x, y)` passa a olhar a água de agora; o mapa vira uma ilha com dois portões e um vale), `script.js` (ferramentas Erguer e Cavar, desfazer, liberar a maré como um filme curto, casas ✓ e ✗, o H mostra a ordem da água), `index.html` (o painel, as ferramentas e os botões Desfazer, Maré e Refazer) e `style.css` (o painel de 16 px e a ferramenta escolhida)
**Rode:** abra o `index.html`, toque num bloco, toque de novo para **Erguer**, aperte **M** e assista; **Z** desfaz, **N** recomeça, **H** mostra por onde a água vai.

---

## O que você vê

Uma ilha com um **vale** no meio, cercado de terraços. O mar entra por dois **portões** de altura 1, um ao sul e um a leste, e o vale guarda três casas. O painel diz **"Blocos 1 · Casas 3 · Erguer"**: o estoque tem **um bloco**, e é com ele que se joga.

- **Erguer** (tecla **1**) sobe o bloco marcado um degrau e **gasta** um bloco do estoque. **Cavar** (tecla **2**) desce um degrau e **devolve** um. Terra não se cria, só se muda de lugar.
- Dois toques, como no passo 3: o primeiro marca, o segundo aplica. **Z** desfaz a última jogada.
- **M** (ou o botão **Maré**) libera a água. Ela entra pelo mar e **enche uma casa a cada 0,18 s**: primeiro a mais baixa, e para quando o volume acaba. As casas alagadas ganham **✗**; no fim, as que sobraram ganham **✓**, e o painel conta: **"Salvas 0/3 · alagadas 3"**.
- A maré **não se desfaz**. **N** recomeça o dia, com o terreno e o estoque de antes.

Sem jogar nada, a água de 17 unidades alaga o vale inteiro e as três casas. Com um pouco de raciocínio, nenhuma se perde: **cave** o pico `(2, 2)` para ganhar um bloco, e **erga** os dois portões `(8, 4)` e `(4, 8)`. Há outros caminhos; o H ajuda a achar.

---

## 1. O estado nunca muda: cada jogada devolve outro

*Reusa `xadrez/05-xeque` (estado imutável, primeira aparição).*

No passo 4, `alturas` era uma matriz que os testes mexiam no lugar. Agora o jogo é um **estado**, e um estado só tem duas coisas: o terreno e o estoque.

```js
function estadoInicial() { return { alturas: ALTURAS_INICIAIS, blocos: BLOCOS_INICIAIS }; }

function moldar(estado, ferramenta, x, y) {
    if (motivoDaRecusa(estado, ferramenta, x, y)) return null;
    const passo = FERRAMENTAS[ferramenta];                     // erguer: +1, cavar: −1
    const novoTerreno = estado.alturas.map(function (linha, linhaY) {
        return linhaY !== y ? linha : linha.map(function (altura, colunaX) { return colunaX === x ? altura + passo : altura; });
    });
    return { alturas: novoTerreno, blocos: estado.blocos - passo };
}
```

`moldar` **não mexe** em `estado`: devolve um estado novo, ou `null` se a jogada não vale. As linhas do mapa que não mudaram são **compartilhadas** entre o estado velho e o novo (ninguém as altera, então ninguém percebe). O ganho é o **desfazer de graça**: o jogo guarda os estados de antes numa lista, e desfazer é voltar ao último.

```js
historico.push(estadoAtual);
trocarEstado(novoEstado);        // ... e desfazer: trocarEstado(historico.pop());
```

`trocarEstado` é o único lugar que religa tudo ao estado: a variável `alturas`, a lista do pintor, a água de maré baixa e a previsão da maré (seção 4). **Reiniciar o dia** é `trocarEstado(estadoInicial())`: a cópia original nunca foi tocada.

`motivoDaRecusa` devolve o porquê de uma jogada não valer, em texto, e `""` quando vale. O jogo o lê para o `#aviso` ("Não dá: o mar não se molda"). As recusas: mar, **casa e cais**, altura máxima (4), estoque vazio, fundo (0). *Um desvio do documento de design:* ele só proíbe cavar sob a casa, mas erguer o bloco da casa a salvaria por um bloco, sem pensar; aqui a casa fica como está.

---

## 2. A água é uma busca em largura com filtro de altura

*Reusa `pacman/06-modos` (a busca em largura e a fila).*

A regra do GDD cabe numa frase: **um bloco alaga se é vizinho (4 direções) de um bloco já alagado e é mais baixo que o nível da maré.** É a enchente do Pac-Man (a água chegando em ondas), com um filtro a mais: a altura.

```js
function buscaEmLargura(terreno, nivel, fontes) {
    const distancia = criarMatriz(-1), fila = [];
    fontes.forEach(function (fonte) {
        if (terreno[fonte.y][fonte.x] >= nivel) return;
        distancia[fonte.y][fonte.x] = 0;
        fila.push({ x: fonte.x, y: fonte.y, distancia: 0 });
    });
    for (let proxima = 0; proxima < fila.length; proxima++) {      // a fila cresce enquanto é lida
        const atual = fila[proxima];
        vizinhasDe(atual.x, atual.y).forEach(function (vizinha) {
            if (distancia[vizinha.y][vizinha.x] !== -1 || terreno[vizinha.y][vizinha.x] >= nivel) return;
            distancia[vizinha.y][vizinha.x] = atual.distancia + 1;
            fila.push({ x: vizinha.x, y: vizinha.y, distancia: atual.distancia + 1 });
        });
    }
    return { distancia: distancia, ordem: fila };
}
```

As **fontes** são as casas de mar (`CASAS_DO_MAR`, as `~` do mapa; ninguém as molda). Em vez de `shift()`, a fila é lida por um **índice** que anda: quem entra primeiro sai primeiro, e a lista inteira, no fim, é a **ordem** em que a água chega. Como no Pac-Man, quando uma casa é molhada pela primeira vez o número dela já é o menor possível. A função é **pura**: recebe o terreno, o nível e as fontes, e não mexe em nada fora dela. A página de teste a confere contra uma enchente escrita de outro jeito (repetir "molhe quem encosta numa casa molhada e é mais baixa" na grade inteira, até nada mudar) e exige o **mesmo conjunto de casas**.

---

## 3. A matriz de distâncias

*Reusa `pacman/04-fantasma` (um campo de distância calculado uma vez).*

`distancia` é uma matriz do tamanho do mapa: **0** no mar, **1** nas casas coladas nele, **2** nas seguintes, e **−1** onde a água não chega (alta demais, ou fechada por um muro). É o mesmo campo que o fantasma do Pac-Man lia para achar o caminho; aqui ele diz **quanto falta** para a água chegar. Dois usos:

- **O alcance:** quem tem `distancia ≥ 0` alaga se o volume for infinito. É o que o H desenha **tracejado** quando o volume não basta.
- **O desempate** do volume (seção 4): entre duas casas igualmente baixas, a água vai primeiro à mais perto do mar.

---

## 4. O volume: a água acaba, e escolhe a mais baixa

A maré tem `VOLUME_DA_MARE` (17): cada unidade enche **uma casa** (o mar é de graça). Sem limite, a ordem não importa, só o conjunto. Com limite, importa **onde** a água gasta as unidades. A regra do GDD: a fronteira é consumida **da mais baixa para a mais alta**.

```js
function proximaDaFronteira(terreno, distancia, alagado) {      // a casa seca, colada na água e ao alcance
    return todasAsCasas().filter(function (casa) { ... }).map(function (casa) {
        return { x: casa.x, y: casa.y, altura: terreno[casa.y][casa.x], distancia: distancia[casa.y][casa.x] };
    }).sort(function (a, b) {                   // a mais baixa; empate: a mais perto do mar; depois a de menor índice
        return a.altura - b.altura || a.distancia - b.distancia || (a.y * TAMANHO + a.x) - (b.y * TAMANHO + b.x);
    })[0];
}
```

`encherComVolume` chama isso uma vez por unidade de volume, e para antes se a fronteira acabar. A chave `altura → distância → índice` não deixa **nenhum empate** em aberto: a mesma entrada dá sempre a mesma água, e a página de teste confere a ordem contra uma conta própria.

Daí o que o GDD chama de **a tensão do jogo**: a **vala** atrai a água. Uma casa mais baixa entra na frente das outras na fila, e gasta uma unidade do volume. Com `VOLUME_DA_MARE = 14`, cave `(2, 1)` (a casa da beira, altura 2): ela vira altura 1, a água a enche **antes de todas**, e uma das casas do vale, que seria a 14ª a molhar, escapa. Terra tirada de um lugar vira proteção em outro.

*Duas leis que a página de teste confere:* com volume, a água enche **de baixo para cima**; e uma casa alagada **nunca seca** (a lista só cresce, nunca encolhe).

---

## 5. A maré é um filme feito de uma lista

Calcular a maré e mostrá-la são coisas separadas. A cada mudança de estado, `trocarEstado` já calcula `previsao = encherComVolume(...)`: a lista inteira, na ordem. **Liberar a maré** só começa a **revelar** essa lista:

```js
mostradas = previsao.ordem.filter(function (casa) { return casa.distancia === 0; }).length;   // o mar primeiro
...
function atualizar(tempo) {
    ...
    relogioDaMare += tempo;
    const passos = Math.floor(relogioDaMare / PASSO_DA_MARE);      // 0,18 s por casa
    relogioDaMare -= passos * PASSO_DA_MARE;
    mostradas = Math.min(previsao.ordem.length, mostradas + passos);
    mostrarAguaDaMare();                                            // definirAgua(NIVEL_DA_MARE, as primeiras `mostradas`)
    if (mostradas === previsao.ordem.length) encerrarMare();
}
```

O dia tem agora três momentos: **moldar → mare → contar**. É uma `fase` de texto e três `if`; o passo 6 transforma isso em uma **máquina de estados** de verdade, com a tábua de marés como dados. Com **movimento reduzido** não há filme: a maré termina de uma vez e só o resultado aparece.

Antes da maré, a água é a **maré baixa**: `buscaEmLargura(alturas, 1, CASAS_DO_MAR)`, ou seja, o mar e o que é mais baixo que 1 e está ligado a ele. Ao liberar, a água sobe para o nível 2.

---

## 6. A água que se vê é a que se marca

No passo 4, "o que se vê" era `max(altura, 1)`, igual em toda parte. Agora cada casa tem a sua superfície:

```js
function alturaVisivel(x, y) {
    return agua.alagado[y][x] ? Math.max(alturas[y][x], agua.nivel) : alturas[y][x];
}
```

`agua` é `{ nivel, alagado }`: o nível da superfície e uma matriz de booleanos, que `definirAgua` refaz. O desenho, o cursor, o picking (o raio do passo 3) e a ordem do pintor continuam os mesmos; só que perguntam a altura **a cada casa**. Duas consequências:

- A casa **alagada** é pintada como o **leito** do passo 4 (o fundo na altura da água, sem contorno), com a água por cima. A **borda branca** só aparece onde a água termina: vizinha **seca**.
- Uma **cova seca** (altura 0, sem água) tem o topo no chão e **laterais sem área** (quatro pontos numa reta). `facesDaCasa` as omite: a força bruta usa polígonos fechados, e um polígono achatado "continha" todo pixel da reta em que está.

---

## 7. Casas: salva ou alagada, sem depender de cor

`contarCasas(alagado)` devolve `{ total, perdidas, salvas }`: **a casa cujo bloco alagou está perdida**. No mapa, a casa ganha o **✗** no instante em que a água a cobre, e o **✓** só quando a maré termina (se ganhasse antes, uma casa ainda ameaçada pareceria a salvo). O painel repete em **texto**: "Salvas 2/3 · alagadas 1". O `#aviso` anuncia o fim da maré para o leitor de tela.

---

## 8. O H mostra a água que vem

Com **H**, cada casa que a previsão alaga troca o número da altura pelo da **ordem** (1, 2, 3…, a ordem em que a água chega), e as casas que a água **alcançaria sem limite**, mas que o volume não cobre, ganham o contorno **tracejado**. A leitura diz o nível, o volume, quantas casas enchem e o alcance. O raio e a conferência com a força bruta, do passo 3, continuam lá. Aperte **H** antes de cada jogada para ver **o que ela muda**: é a "previsão" do jogo, sem o resultado das casas.

---

## 9. O que o passo 5 ainda não sabe

- **Uma maré só**, com nível e volume fixos (constantes do `regras.js`). A **tábua de marés**, as fichas, a chuva e o estoque que **passa de uma maré para a próxima** são do passo 6.
- **Um dia só**: o mapa é este. Vários dias, e um robô que prova que cada um tem solução, são do passo 7.
- Pointer Events em iOS Safari e o custo do desenho no celular continuam sem medida; isso é o passo 8.

---

## Experimente

1. Aperte **M** sem jogar. Quantas casas se perdem? Mude `VOLUME_DA_MARE` para `16`, `14` e `10` e repita, olhando o H: **qual** casa escapa primeiro, e por quê?
2. Com `VOLUME_DA_MARE = 14`, cave `(2, 1)` e olhe o H. O número **1** vai para onde? Quantas casas se salvam agora?
3. Ache **outra** solução para o volume 17, sem erguer os dois portões: erga `(6, 4)` e `(4, 6)`, dois pontos estreitos do caminho da água (lembre: o estoque tem um bloco, e é preciso cavar para ganhar o outro). Qual é o **menor** número de jogadas que salva as três casas?
4. Troque `NIVEL_DA_MARE` para `3`. Que terraços passam a alagar? O que o portão de altura 2 muda?
5. Em `buscaEmLargura`, troque `>= nivel` por `> nivel` (nos dois lugares). O que muda no H? Uma casa de altura igual ao nível alaga?
6. Em `proximaDaFronteira`, tire o `a.altura -` da chave (deixe só a distância). A água ainda "prefere a vala"? Qual das duas regras é a busca em largura pura?
7. Em `moldar`, mexa direto na matriz do estado velho (`estado.alturas[y][x] += passo; return estado;`). O **Z** continua certo? Por quê?
8. Tire a recusa de **casa e cais** em `motivoDaRecusa`. Quantas jogadas salvam as três casas agora?
9. **Quebre de propósito:** em `encherComVolume`, troque `volumeRestante--` por nada. Quantas casas alagam, e o que a lei "baixo para alto" diz sobre o resultado?

---

**Anterior:** [`04-camera`](../04-camera/) · **Próximo:** [`06-fichas`](../06-fichas/) — a maré deixa de ser uma constante: uma **tábua** de fichas dá o nível, o volume e os blocos de cada maré, e o dia vira uma máquina de estados.
