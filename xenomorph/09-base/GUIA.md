# Xenomorph — Passo 9: A base

**Mudou:** os três arquivos do jogo (o gerador é o mesmo do passo 8)
**Rode:** abra o `index.html`. Desça, colete amostras, morra — e volte à base.

---

## O que você vê

O jogo agora abre na **base de operações**: um hangar com a nave, e por cima dele o painel das
**amostras guardadas**, a semente da próxima descida, as **melhorias permanentes**, os
**registros** da campanha e o **bestiário** das criaturas já vistas.

Lá embaixo, cada criatura morta solta **amostras** — bolinhas verdes que o soldado puxa como um ímã.
O painel conta quantas ele carrega. E a expedição pode terminar de três jeitos:

| Final | Amostras guardadas |
|---|---|
| **morrer** | metade |
| **extrair** — segurar ↑ ao lado da nave, no pouso | todas |
| **cumprir a missão** — apanhar os dados da Matriarca | todas, mais 10 |

De volta à base, as amostras compram melhorias, e cada nível acende uma luz no hangar. O
**Impulso Cinético**, uma vez conquistado, fica para sempre: nas próximas descidas, no lugar da
cápsula aparece uma reserva de amostras. E cada missão cumprida ensina um ataque novo à Matriarca.

Feche a página e abra de novo: tudo continua lá.

---

## 1. Duas memórias, dois tempos de vida

```js
let campanha = carregarCampanha();   // o que sobrevive à morte
let expedicao = { amostras: 0 };      // o que morre com o soldado
```

O GDD descreve o ciclo em doze passos (seção 3) e uma regra: *"A morte deve provocar a perda de
parte dos recursos temporários, mas não apagar completamente o progresso do jogador."* No código,
isso são **duas memórias**:

| | Expedição | Campanha |
|---|---|---|
| o planeta, a vida, a munição | ✔ | |
| as amostras carregadas | ✔ | |
| as amostras guardadas, as melhorias | | ✔ |
| o Impulso conquistado, os registros, o bestiário | | ✔ |
| quando some | ao fim de cada descida | nunca (só se o jogador apagar) |

Os três finais passam por **um lugar só**, `encerrarExpedicao(fracaoGuardada, registro)`: quanto
das amostras carregadas vai para a campanha, que registro sobe, e salvar. Mudar a regra da morte é
mudar um número (`FRACAO_GUARDADA_NA_MORTE`).

### Melhorias viram números

```js
soldado.multiplicadorDeDano = 1 + nivel("calibre") * MELHORIAS.calibre.porNivel;
```

No começo de cada descida, `aplicarMelhorias` transforma a campanha em números do soldado. O resto
do jogo **não sabe que melhorias existem**: o disparo multiplica o dano, o pente multiplica a
munição, a esquiva multiplica a recarga. Uma melhoria nova é uma linha na tabela e uma linha aqui.

E a tabela tem o que o GDD pede (seção 9): *"Cada melhoria deve ter custos claros e benefícios
compreensíveis"* — um nome, o efeito por extenso, o custo de cada nível. A base é **montada da
tabela**: o HTML só guarda o lugar da lista.

---

## 2. A economia é uma regra com números

Três decisões pequenas, cada uma fechando uma brecha:

- **Filhotes não deixam amostras.** Um ninho solta rastejadores para sempre; se cada um valesse
  uma amostra, o jogo ensinaria a ficar parado na frente de um ninho. *Uma regra de recompensa é
  também uma regra de comportamento.*
- **A extração exige segurar ↑ por um segundo.** ↑ também é mirar para cima; ninguém deveria
  encerrar a expedição sem querer.
- **O Impulso conquistado vira uma reserva de amostras** nas descidas seguintes, em vez de
  sumir: a sala onde ele ficava continua valendo a visita.

### As habilidades são permanentes, salvas na hora

```js
impulso: () => {
    soldado.impulso = true;
    campanha.habilidades.impulso = true;
    salvarCampanha();
    ...
}
```

O GDD separa: *"as habilidades essenciais para a exploração devem ser persistentes, enquanto armas
experimentais, modificações especiais e vantagens de combate podem variar"*. O Impulso é salvo no
momento em que é apanhado — nem uma morte um segundo depois o tira.

### O chefe aprende

```js
const ATAQUES_APRENDIDOS = [
    { fase: 0, ataque: "investida" },
    { fase: 1, ataque: "chuva" },
    { fase: 2, ataque: "ovos" }
];
```

Cada missão cumprida acrescenta um ataque a uma fase da Matriarca: *"chefes podem adquirir
variações de ataques em expedições futuras"* (GDD, seção 5). A tabela de fases do passo 8 não
mudou — `ataquesDaFase` soma a ela o que a campanha já ensinou.

---

## 3. Salvar é fácil; ler é que exige cuidado

```js
localStorage.setItem(CHAVE_DA_CAMPANHA, JSON.stringify(campanha));
```

Uma linha para gravar. Para ler, desconfiança — a lição do recorde do Tetris, agora para um objeto
inteiro:

```js
const limpa = campanhaNova();
if (lida.versao !== VERSAO_DA_CAMPANHA) return limpa;
limpa.amostras = inteiro(lida.amostras);
limpa.melhorias[nome] = inteiro(lida.melhorias?.[nome], MELHORIAS[nome].custos.length);
...
```

O que vem do disco pode ser de outra **versão** do jogo, pode ter sido **editado à mão**, pode ser
**lixo**. Então nada é usado como veio: parte-se de uma campanha nova e copia-se, campo a campo, só
o que passa na conferência. O teste gravou de propósito `amostras: -5`, `blindagem: 99`,
`impulso: "sim"`, `mortes: 3.7` e uma criatura inventada no bestiário. Resultado: 0 amostras,
blindagem no máximo (3), sem Impulso, 3 mortes, e o bestiário só com o que existe.

### O número da versão

```js
const VERSAO_DA_CAMPANHA = 1;
```

Se um dia o formato mudar — uma moeda nova, uma melhoria renomeada —, a versão sobe, e uma
campanha antiga é **reconhecida** como antiga em vez de ser lida errado. O exercício 5 pede a
próxima etapa: converter a versão antiga em vez de descartá-la.

### `?.`, o encadeamento opcional

```js
lida.melhorias?.[nome]
```

Se `lida.melhorias` não existir, a expressão inteira dá `undefined` em vez de um erro — e
`inteiro(undefined)` dá zero. Sem `?.`, uma campanha sem o campo `melhorias` derrubaria o jogo.

---

## 4. A base é um estado — e uma sala

```js
estado = "base";
estadoDaSala = { blocos: construirBlocos({ modulo: POUSO.modulo, portas: {}, membranas: [] }) };
```

A máquina de estados ganhou `base`, ao lado de `jogando` e `fim`. E o hangar desenhado no fundo é o
**módulo do pouso**, sem portas, desenhado pelas mesmas funções de sempre — o gerador e o desenho
não sabem que estão servindo a uma tela de menu.

Ele **evolui à vista** (GDD, seção 9: *"A base deve evoluir visualmente"*): uma luz por nível de
melhoria, o Impulso exposto numa plataforma, um núcleo de dados por missão cumprida.

### Apagar pede dois cliques

O primeiro só arma o botão, por 3 segundos. Nada de `confirm()`, que trava a página inteira — e
nada de apagar uma campanha inteira com um clique distraído.

---

## Verificado

- Matando as criaturas de uma sala, saíram exatamente as amostras das fichas (5), e o ímã trouxe
  todas; morrer com 5 guardou 2.
- Segurar ↑ ao lado da nave extraiu em 60 quadros (1 s), guardando as 7 carregadas.
- Uma melhoria comprada, o Impulso apanhado, a página **recarregada**: amostras, nível, habilidade,
  mortes e bestiário estavam lá; na descida seguinte, o soldado começou com o Impulso e 120 de
  vida, e a sala da cápsula tinha uma reserva no lugar.
- Com todas as melhorias de teste, o pente do rifle foi de 24 para 36 e o da espingarda de 6 para 9.
- Com duas missões cumpridas, a primeira fase da Matriarca ganhou a investida e a segunda, a chuva.
- `{lixo` no armazenamento abriu uma campanha nova, sem erro.

---

## Experimente

1. Mude `FRACAO_GUARDADA_NA_MORTE` para 0 e depois para 1. O que acontece com a vontade de
   extrair?
2. Crie a melhoria **Ímã**: aumenta o `RAIO_DO_IMA`. Quantas linhas você escreveu fora da tabela?
3. Faça os filhotes valerem amostras e fique parado na frente de um ninho por um minuto. A regra
   valia a pena?
4. Mostre na base o **tempo** da expedição mais rápida que cumpriu a missão (um registro novo; o
   que precisa ser medido, e onde?).
5. Mude o formato salvo (por exemplo, `melhorias` vira uma lista) e suba a versão para 2. Escreva
   `migrarDaVersao1`, que converte uma campanha antiga em vez de descartá-la.
6. Desbloqueie a **espingarda** só depois da primeira missão cumprida: antes disso, o soldado desce
   com dois rifles. Onde fica essa regra?

---

**Anterior:** `08-matriarca` · **Próximo:** `final` — o jogo dividido em sistemas, com som, pausa,
armas novas, modificações, eventos, acessibilidade e toque.
