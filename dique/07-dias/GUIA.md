# Dique — Passo 7: Os dias

**Mudou:** `regras.js` (os dez dias como dados em `DIAS`; `carregarDia` e `problemasDoMapa` no lugar do mapa fixo; o **robô** `certificarDia` com `candidatasDoDia`, `terrenosAte` e `haPlano`; `vizinhasDe` passa a ler uma tabela feita uma vez), `script.js` (`iniciarDia`, o contador de `jogadas`, o dia vencido que abre o seguinte), `index.html` (o número do dia no título e a linha da meta e do `par`) e `style.css` (as duas linhas novas)
**Rode:** abra o `index.html`, leia a dica do dia no aviso, feche a brecha do dia 1 (**1** Erguer, setas até a brecha, **Enter**, **M**) e aperte **M** de novo ("Próximo") quando o dia for vencido.

---

## O que você vê

O título diz **"Dique dia 1/10"**. Sob o painel há uma linha nova, **"Meta: 3 casas · jogadas 0 (par 1)"**: quantas casas salvar, quantas jogadas (erguer ou cavar) você já fez e quantas o **par** do dia pede. A **dica** do dia aparece no aviso quando ele começa. Ao fim, o aviso resume: *"Dia vencido: 3 de 3 casas salvas, meta 3, jogadas 1 (par 1). M abre o próximo dia. N recomeça"*; o botão **Maré** vira **Próximo**. Depois do dia 10, **M** volta ao dia 1. O dia perdido só se recomeça com **N**: não há vidas.

O jogo em si é o do passo 6. O que mudou é **de onde vêm o mapa, a tábua e a meta**.

---

## 1. Um dia é um dado

*Reusa `tetris/08-velocidade` (a dificuldade é uma tabela) e `shoot-em-up/07-roteiro` (a fase é dados).*

No passo 6 o mapa e a tábua eram constantes soltas. Agora um dia é **um objeto**, e o jogo é uma lista deles:

```js
{   // 1 · Tape a brecha (erguer)
    mapa: [
        ["~~222222~~", ".........."],        // [alturas, objetos] de uma linha do mapa
        ["~~211112~~", "...C......"],
        ...
    ],
    tabua: [{ nivel: 2, passos: 2, volume: 8, chuva: false, blocos: 1 }],
    meta: 3, par: 1, dica: "A água entra pela brecha. Um bloco a fecha.",
},
```

Cada linha do mapa traz as duas camadas lado a lado, porque assim se vê a casa em cima da altura dela. `P` é o **cais**: pedra firme, que não se molda. Os dias 6, 8 e 10 usam `P` como muralha, e já veremos por quê (seção 5). Escrever um dia novo é escrever dados; nenhuma função muda.

---

## 2. Um dia de cada vez nas variáveis

*Reusa `xadrez/05-xeque`: nada é alterado no lugar, o que muda é trocado por outra coisa.*

As regras do passo 6 liam `ALTURAS_EM_TEXTO`, `TABUA_DE_MARES`, `META_DO_DIA` e outras constantes. Agora esses nomes são variáveis (`alturasEmTexto`, `tabuaDeMares`, `metaDoDia`…), e **uma função as preenche**:

```js
function carregarDia(dia) {
    const problemas = problemasDoMapa(dia);
    if (problemas.length > 0) { console.error(...); return false; }     // dia ruim: nada muda
    alturasEmTexto = dia.mapa.map(function (linha) { return linha[0]; });
    ...
    tabuaDeMares = dia.tabua;
    metaDoDia = dia.meta;
    return true;
}
```

`problemasDoMapa` devolve **a lista do que impede o dia de valer**, em texto: o mapa não é 10×10, símbolo fora da legenda, a borda não é mar, objeto no mar, **nascente em dia sem chuva**, meta maior que o número de casas. Lista vazia, dia bom. O jogo só chama `carregarDia`; o robô (seção 4) usa a mesma lista como o critério **(d)**. Ilhas de lados diferentes ficam para depois: todas têm 10×10, e o resto do código (matriz, câmera, picking) continua sem saber que existem dias.

---

## 3. Dificuldade, um eixo de cada vez

| Dia | Eixo | O que há de novo | Par |
|---|---|---|---|
| 1 | altura | uma brecha: **erguer** a fecha | 1 |
| 2 | altura | duas brechas e mais casas | 2 |
| 3 | altura | **sem blocos**: terra não se cria, cave de onde não faz falta | 2 |
| 4 | altura | uma torre alta **esconde** parte da ilha; gire a vista (**Q**, **R**), embora não seja obrigatório | 3 |
| 5 | marés | duas fichas, um bloco em cada; a primeira é fraca | 2 |
| 6 | marés | a brecha pede 3 blocos, e eles chegam em duas fichas | 3 |
| 7 | sizígia | nível 3: terraços de 2 já não protegem | 3 |
| 8 | sizígia | a 2ª maré sobe de 2 para 3: o que bastou na 1ª não basta | 4 |
| 9 | chuva | a nascente alaga as covas; um bloco as separa da casa | 3 |
| 10 | tudo | duas marés, sizígia, chuva e uma torre que **esconde a brecha**: para tocá-la, gire a vista | 5 |

O `par` é a **menor quantidade de jogadas** (erguer ou cavar, em qualquer maré) que vence o dia. Quem o diz não é o autor do dia: é o robô.

---

## 4. O robô: tentar todas as combinações

*Reusa `xenomorph/06-semente`: o jogo só aceita uma semente depois que um robô a resolveu.*

Um dia mal escrito é um defeito que só aparece quando alguém joga. O robô de `regras.js` joga **todos os jeitos** antes: `certificarDia(dia)` devolve um relatório, e **a partir dele** se sabe se o dia pode entrar. Ele **não roda no jogo**: roda numa página de teste, uma vez para cada dia. O algoritmo é o do GDD:

1. **O que ele pode fazer.** Em cada ficha, erguer ou cavar blocos. A **ordem não importa**, só o saldo de cada casa: erguer a casa A e cavar a B é o mesmo terreno que cavar B e erguer A (e a ordem útil sempre existe: cava-se primeiro). Então ele não anda pelas sequências, anda pelos **terrenos**, cada um uma vez (`terrenosAte`).
2. **Poda: uma aposta.** Só se mexe em casa **moldável** (nem mar, nem casa, cais ou nascente) a até 2 passos de uma casa **alagável** (o mar e tudo o que a busca em largura do nível mais alto do dia alcança, a mesma do passo 5) ou de uma casa com casa. As outras ficam **fora da busca**. Isso não é um teorema: cavar qualquer casa moldável rende um bloco, e uma vala longe de tudo poderia render o bloco que falta ou absorver volume. Por isso o `par` que o robô acha é o menor **dentro das candidatas**. A aposta foi conferida nos dez dias: com `ALCANCE_DAS_CANDIDATAS` em 1, 2 e 9 (a ilha inteira), cada dia dá o mesmo `par` e a mesma contagem de estados, ou seja, a poda de 2 não corta nada hoje. Quem escreve um dia novo confere o seu do mesmo jeito: com o alcance em 9, o `par` muda?
3. **Aprofundamento iterativo.** Procura um plano com 0 jogadas; se não há, com 1; depois 2… O primeiro tamanho que dá certo **é** o `par`, e é o menor porque os menores foram testados antes.
4. **Ficha a ficha.** Para cada terreno que cabe no orçamento, simula a maré inteira (`aguaDaFicha`, a mesma função do jogo) e **guarda só os que ainda salvam a meta**. A ficha seguinte parte deles, com a sobra de blocos no estado e as casas perdidas acumuladas.
5. **Memória.** O mesmo terreno com o mesmo estoque e as mesmas casas perdidas se repete por caminhos diferentes (erguer A na maré 1 e B na 2, ou o contrário). `haPlano` guarda a chave de cada um (`assinatura`) e não repete o que já falhou com gasto menor ou igual.
6. **Teto.** Cada terreno simulado conta como um **estado**. Passou de `TETO_DE_ESTADOS` (2 milhões), o robô desiste, o relatório diz `estourou: true` e o dia **não é certificado**: "não sei" nunca vale como "tem solução".

O relatório tem os quatro critérios do GDD:

| | Critério | Campo |
|---|---|---|
| (a) | existe solução (até `LIMITE_DE_JOGADAS`) | `temSolucao` |
| (b) | o `par` do dado é o menor que o robô achou | `parConfere` |
| (c) | **não é trivial**: com 0 jogadas a meta não é batida (e a busca de 0 jogadas **terminou**: se o teto estoura antes, é "não sei", e `naoTrivial` fica `false`) | `naoTrivial` |
| (d) | mapa válido: fechado, casas fora do mar, `N` só com chuva, meta possível | `mapaValido` |

`certificado` é o "e" dos quatro. O robô carrega o dia com `carregarDia`, que sobrescreve dez variáveis (o dia, as camadas do mapa, as casas do mar, das casas e das nascentes, a tábua, a meta e o terreno de agora, `alturas`). Ele **guarda as dez antes e as devolve no fim**, mesmo que a busca dê erro, mesmo que ele seja chamado **no meio de uma partida** (os exercícios 4, 6 e 8 mandam fazer isso no console) e mesmo que nenhum dia estivesse carregado. O jogo volta **exatamente** como estava: o mesmo dia, o mesmo terreno editado, o mesmo estoque, a mesma água, o mesmo picking.

---

## 5. O que o robô descobriu sobre os meus dias

Escrever os dias e **rodar o robô** foi um só trabalho, e ele mudou três deles:

- **A vala atrai a água, e isso quebra a conta.** A água enche **da casa mais baixa para a mais alta**, uma por unidade de volume. Num primeiro rascunho do dia 6 (uma brecha larga, volume curto), o robô achou um plano de **1 jogada**: cavar uma casa da muralha, que passa a dividir a água em dois lados, e o volume acaba antes de chegar às casas. É uma solução legítima, mas não era a que o dia ensina. Duas saídas: pôr **volume maior que tudo o que a água alcança** (nenhuma vala absorve mais nada) e **cais** (`P`) nas casas que não devem ser cavadas. Por isso 6, 8 e 10 têm muralha de `P`.
- **A torre do dia 4 não obriga a girar a vista.** O robô achou um plano de 3 jogadas (cavar um canto, fechar a água por outro lado) que não depende de enxergar atrás da torre. A dica a menciona, mas olhar **não é obrigatório**: a torre é um convite, não uma regra.
- **A torre do dia 10 obriga.** Para saber o que um dia **exige**, o robô lista **todos** os planos do tamanho do `par` (no dia 10, 55 planos de 5 jogadas) e procura as **casas-chave**: as que **todos** tocam. São três, (2, 5), (4, 4) e (4, 7). A (2, 5) é a brecha da muralha oeste, e a torre de 4 em (3, 6) fica na frente dela e a cobre inteira: na vista inicial **nenhum pixel** do mapa a acerta, e depois de **Q** ou **R** ela volta a ser tocável. Para ela ser mesmo obrigatória, o dia ganhou um cais (`P`) logo atrás, em (3, 5): antes, dava para barrar a água por dentro e a brecha deixava de ser a única porta (o `par` continuou 5). Girar é obrigatório só para o **dedo**: o cursor de setas chega à (2, 5) escondida (tracejado). A (4, 4), no centro, nunca se acerta com o dedo, em nenhum giro, porque as quinas de 3 a cobrem: ali só as setas servem.
- **Tamanho de ilha é tempo de robô.** O robô experimenta `(2K)^par / par!` terrenos, grosso modo, com K casas moldáveis. Uma ilha 8×6 sem cais e `par` 4 passou de dois minutos; com muralha de cais, K cai para 11 e o mesmo dia leva um segundo. O maior é o dia 5, com 10.916 estados.
- **Medir antes de otimizar.** No começo, simular uma maré de 30 unidades de volume custava cerca de 1,3 ms, e o robô gastava minutos. O gargalo era `vizinhasDe`, que montava quatro casas novas a cada pergunta. Uma tabela feita uma vez (`VIZINHAS_DO_MAPA`) levou a conta a cerca de 0,5 ms. Trocar `proximaDaFronteira` por uma única passada **não** ajudou (0,030 ms contra 0,033 ms por chamada) e foi desfeito.

Estados que o robô simulou em cada dia (o tempo varia com a máquina, de décimos de segundo a poucos segundos):

| Dia | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| Estados | 34 | 1.911 | 62 | 3.383 | 10.916 | 8.022 | 5.170 | 7.437 | 3.355 | 6.234 |

---

## 6. A prova de que o robô não é frouxo

Um robô que diz "tudo certo" para qualquer dia seria pior que não ter robô. A página de teste dá a ele **dias com defeito de propósito**, e `certificado` precisa sair `false` com o motivo certo: o `par` errado (`parConfere: false`), um dia que já se ganha sem jogar (`naoTrivial: false`), a meta maior que as casas, uma borda sem mar, uma casa dentro do mar, uma nascente sem chuva, um dia sem solução (sem blocos e sem de onde cavar) e um teto pequeno demais (`estourou: true`, e `naoTrivial` continua `false`: "não sei" nunca vale como resposta). O `certificarDia(dia, teto)` aceita um teto menor só para essa prova.

---

## 7. O que o passo 7 ainda não sabe

- **Estrelas e recorde.** O jogo conta as `jogadas` e mostra o `par`, mas ainda não dá estrelas nem guarda recorde em `localStorage`: são do `final`.
- **Escolher o dia.** Os dias vêm em ordem: vence um, abre o seguinte. O menu é do `final`.
- **O celular.** Os botões já têm 48 px, mas ninguém mediu no aparelho, e o leitor de tela e o movimento reduzido ainda não têm opção própria: são do passo 8.

---

## Experimente

1. Jogue o dia 1 sem erguer nada: **M** e olhe a contagem. Depois **N**, ache a brecha, feche-a e libere a maré. O aviso diz "jogadas 1 (par 1)"?
2. No dia 3 o estoque começa **vazio**. Cave um canto, erga a brecha e use **Z** para desfazer as duas: o contador de jogadas volta a zero?
3. Dia 6: use os dois blocos da primeira ficha na brecha, siga com **M** e use o terceiro na segunda. Depois **N**, e faça tudo na segunda ficha. Dá o mesmo resultado? Por quê?
4. Em `regras.js`, mude o `par` do dia 1 para `2` e rode o robô (`certificarDia(DIAS[0])` no console). Qual campo do relatório muda? E se `par` for `0`?
5. Mude o `nivel` do dia 1 para `1`. Ele ainda precisa de um bloco? O que o robô diz do critério (c)?
6. Escreva o **seu** dia 11: um mapa 10×10, uma ficha, uma meta. Antes de dar o `par`, rode o robô: ele acha um? Escreva o `par` que ele achou.
7. Ponha uma nascente `N` no dia 1 (sem chuva) e chame `carregarDia(DIAS[0])`. O que aparece no console? O robô aceitaria o dia?
8. Mude `ALCANCE_DAS_CANDIDATAS` para `9` (a ilha inteira) e rode o robô sobre os dez dias: o `par` de algum muda? E o número de estados? Depois ponha `0`: o `par` muda? Quanto cai a contagem? O que isso diz da poda de 2?
9. No dia 10, sem girar a vista, tente tocar a brecha oeste, em (2, 5): o que o toque marca? Aperte **Q**, toque de novo e depois **H**. Por que o cursor de setas a alcança mesmo escondida?
10. **Quebre de propósito:** em `haPlano`, comente a linha que consulta a `memoria`. O `par` muda? E o número de estados do dia 5?

---

**Anterior:** [`06-fichas`](../06-fichas/) · **Próximo:** [`08-celular`](../08-celular/) — o jogo cabe na mão: toque em dois passos, alvos de 48 px, movimento reduzido por opção, leitor de tela, e uma **página de medição** para o seu celular.
