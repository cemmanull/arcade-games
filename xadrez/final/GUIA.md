# Xadrez — passo final

**Anterior:** `08-alfa-beta`
**Rode:** abra o `index.html`.
**Jogue:** clique numa peça para ver os lances legais, clique no destino. Roque: mova o
rei duas casas.

Este é o fim da trilha e também o material de referência: o código está comentado linha a
linha, e este guia reúne todos os conceitos do módulo. No fim há 15 exercícios.

## O que mudou do passo 8 para aqui

Nenhuma regra, nenhuma linha do computador. Só a interface:

| | Passo 8 | Final |
|---|---|---|
| Desfazer | tecla Z | botão, desfazendo o par de lances |
| Histórico | — | lista de lances em notação |
| Capturadas | — | deduzidas da posição |
| Promoção | sempre dama | escolha do jogador |
| Lado | sempre brancas | brancas ou pretas, com o tabuleiro virado |

Repare no que **não** foi preciso tocar: `regras.js` e `computador.js` seguem idênticos aos
do passo 8. Foi para isso que as três camadas existem.

---

## O que é diferente aqui

Cobrinha e Pong são jogos de **reflexo**: pouca regra, muito movimento. O xadrez inverte
tudo. Não há física, não há loop de 60 quadros por segundo, nada se move sozinho.

O desafio passa a ser outro, e é o desafio da maior parte do software profissional:

1. **regras complexas, cheias de exceções** — roque, en passant, promoção, cravada;
2. **um adversário que decide** — como fazer um computador escolher um bom lance;
3. **um programa grande demais para um arquivo só** — como dividi-lo.

---

## 1. A arquitetura: três arquivos, três responsabilidades

```
regras.js       o que é permitido no xadrez        (não conhece a tela)
computador.js   como escolher um bom lance          (só conhece as regras)
interface.js    o que se vê e o que se clica        (conhece os dois)
```

As setas de dependência apontam **em uma direção só**. `regras.js` não sabe que existe uma
tela; `computador.js` não sabe que existe um clique.

O retorno disso é concreto, não teórico:

- o computador usa **exatamente** as mesmas regras do jogador — impossível ele trapacear
  por engano;
- as regras podem ser **testadas sem navegador**, com um script (foi o que fizemos);
- dá para trocar a interface inteira — para um tabuleiro de texto, por exemplo — sem
  tocar em uma linha de regra.

> A pergunta que guia a divisão: **"o que este arquivo precisa saber?"** Se `regras.js`
> precisasse conhecer um botão, algo estaria errado.

### Por que scripts clássicos, e não módulos

Os três arquivos são carregados com `<script defer>`, na ordem. Não usamos
`import`/`export` porque módulos ES **exigem um servidor**: abrindo o arquivo direto do
disco, o navegador os bloqueia por segurança. Com scripts clássicos, um duplo clique
funciona.

---

## 2. Este jogo não usa canvas — e isso é uma decisão

O tabuleiro são **64 `<button>` numa grade de CSS**:

```css
#tabuleiro {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    aspect-ratio: 1;
}
```

Três linhas resolvem o layout que, antes do Grid, exigia floats e cálculos de porcentagem.

Três razões para não usar canvas aqui:

1. **um tabuleiro É uma grade** — a ferramenta corresponde ao problema;
2. **cada casa é clicável e focável de graça**, porque é um botão de verdade — inclusive
   por teclado, sem escrever uma linha;
3. **um leitor de tela anuncia "e4, cavalo branco"**. No canvas, tudo é uma imagem muda.

> **Canvas é para pintura que muda muitas vezes por segundo.** Interface feita de peças
> discretas e clicáveis é HTML. Escolher a ferramenta pelo problema vale mais do que usar
> sempre a mais poderosa.

As peças são **caracteres Unicode** (♔♕♖♗♘♙) — não imagens. Acompanham o tamanho da fonte
e nunca ficam borradas.

---

## 3. Representar uma posição

```js
indice = linha * 8 + coluna     // 0 = a8, 63 = h1
```

Um array simples de 64 posições, não uma matriz 8×8. É mais rápido de copiar — e o
computador vai copiar este tabuleiro dezenas de milhares de vezes por jogada.

### Uma posição é mais do que as peças

```js
{
    casas,                     // as 64 casas
    vezDe,                     // de quem é a vez
    direitosDeRoque,           // quem ainda pode rocar
    alvoEnPassant,             // vale por um único lance
    meiosLancesSemProgresso    // para a regra dos 50 lances
}
```

Um erro clássico de quem programa xadrez é guardar só o tabuleiro e descobrir tarde demais
que faltam essas quatro informações. **Elas não estão nas peças** — são história.

---

## 4. Gerar movimentos: duas etapas

```js
gerarMovimentosLegais = gerarMovimentosPseudoLegais().filter(m => {
    const depois = aplicarMovimento(estado, m);
    return !estaEmXeque(depois, estado.vezDe);
});
```

1. **Pseudo-legais**: respeitam como a peça anda, ignorando o próprio rei.
2. **Legais**: dos pseudo-legais, sobram os que não deixam o próprio rei atacado —
   testado simplesmente **executando** o movimento e olhando o resultado.

Por que não gerar direto os legais? Porque as regras de **cravada** (a peça que não pode
sair porque o rei ficaria exposto) são cheias de exceções — inclusive uma captura en
passant que expõe o rei na horizontal, sem que nenhuma das duas peças estivesse cravada.

Executar e olhar é mais lento e é **sempre correto**.

> Numa primeira implementação, correto vale mais do que rápido. Otimize depois de medir, e
> só se precisar.

### As armadilhas do xadrez

Cada uma delas é um bug esperando quem não souber que existe:

| Regra | O que se esquece |
|---|---|
| **En passant** | a peça capturada **não está** na casa de destino, e sim ao lado |
| **Roque** | o rei não pode estar em xeque, nem **passar** por casa atacada |
| **Direitos de roque** | perdem-se também quando a torre é **capturada** na casa original |
| **Promoção** | são **quatro** lances diferentes para o mesmo destino, não um |
| **Cravada** | resolvida de graça pelo filtro de legalidade |

Promover a cavalo parece inútil — e é o único jeito de dar xeque em certas posições.

---

## 5. Estado imutável: por que nunca desfazemos

`aplicarMovimento` devolve um estado **novo**. Nunca altera o antigo.

A alternativa comum é modificar o tabuleiro e ter uma função `desfazer`. Não fizemos isso
porque **desfazer é onde nascem os piores bugs de um programa de xadrez**: basta esquecer
de restaurar um direito de roque para a busca inteira ficar corrompida, de um jeito que só
aparece dez lances depois.

O retorno aparece de graça na interface:

```js
function desfazer() {
    estado = historicoDeEstados.pop();   // é isso
}
```

Não existe "desfazer o roque" nem "devolver a peça capturada". Copiar 64 posições é barato;
um bug de estado corrompido custa uma tarde.

---

## 6. Como o computador pensa

Três ideias, e nenhuma delas é inteligência.

### Avaliar

Um número que resume a posição, em centésimos de peão:

```js
peao: 100, cavalo: 320, bispo: 330, torre: 500, dama: 900
```

Material não basta — um cavalo no centro vale mais que um cavalo no canto. Por isso cada
peça tem uma **tabela de posição** de 64 números. Repare no que essas tabelas ensinam sem
nenhuma regra escrita: peões ganham valor conforme avançam, cavalos odeiam bordas, e o rei
se esconde no meio-jogo mas vai ao centro no final.

### Minimax

Eu jogo o meu melhor lance, você joga o seu melhor, e assim por diante. Escrito como
**negamax**: uma função só, com o sinal invertido a cada nível.

```js
const nota = -buscar(posicaoSeguinte, profundidade - 1, -beta, -alfa);
```

*A minha melhor nota é o negativo da melhor nota do adversário.* Essa única troca de sinal
substitui um código para as brancas e outro para as pretas.

### Poda alfa-beta

```
alfa = a melhor nota que EU já garanti
beta = a melhor nota que o ADVERSÁRIO já garantiu
```

Se uma linha devolve algo `>= beta`, ela é boa demais: o adversário jamais permitiria
chegar ali, porque já tem alternativa melhor um nível acima. Podemos parar de analisar na
hora.

Isso costuma cortar **mais de 90%** do trabalho sem mudar o resultado — é o que separa
"vê 2 lances" de "vê 4 lances" no mesmo tempo.

### Ordenar os movimentos

A poda corta tanto mais quanto **melhor for a ordem** em que os lances são examinados. Se
o melhor for visto primeiro, todo o resto é descartado depressa.

A heurística clássica é **MVV-LVA**: *vítima mais valiosa, agressor menos valioso*.
Capturar uma dama com um peão é a primeira coisa que vale a pena olhar.

Ordenar não muda o resultado — muda o tempo, e por um fator grande. É o melhor retorno por
linha de código do programa inteiro.

### Busca de capturas (quiescence)

Imagine que a busca termina exatamente depois de o computador capturar uma dama com o
peão. Ele conta a dama a mais e comemora — sem ver que, no lance seguinte, o peão é comido
de volta. Isso se chama **efeito horizonte**.

A solução: ao chegar ao fim da profundidade, não pare numa posição "barulhenta". Continue
analisando **só as capturas**, até a poeira baixar.

Sem isto, um programa de xadrez entrega peças de graça o tempo todo, e o motivo é
dificílimo de descobrir.

---

## 7. Um bug que vale a pena conhecer

Este programa teve um bug real durante a construção, e ele é instrutivo demais para ficar
de fora.

**Sintoma:** a busca estava correta (testada), a avaliação estava correta (testada), e
mesmo assim o computador jogava lances absurdos — não via um mate em um lance nem
capturava uma dama de graça.

**Causa:** no nível raiz, a janela alfa-beta estava sendo estreitada a cada lance
examinado, como se faz nos níveis de baixo. O problema é que, **quando a poda corta uma
linha, o valor devolvido não é a nota real — é um limite** ("é pelo menos isto"). Limites
servem para decidir se vale a pena continuar, **não para comparar lances entre si**.

Resultado: todos os lances ruins voltavam com exatamente o mesmo número — o limite — e
empatavam com o melhor.

**Correção:** na raiz, cada lance é buscado com a janela completa. Custa um pouco de
velocidade no primeiro nível; a poda continua trabalhando normalmente dentro de cada linha.

> A lição não é sobre xadrez. É que **um sistema pode ter todas as peças corretas e ainda
> assim estar errado**, se a interface entre elas carregar um significado diferente do que
> quem chamou supõe. Testes de unidade em cada peça não pegam isso; só um teste do
> comportamento final pega.

---

## 8. Como este programa foi testado

Um gerador de movimentos de xadrez tem dezenas de casos especiais. Testar "parece
funcionar" não serve — o erro aparece na posição número 400 mil.

A comunidade de xadrez usa o **perft**: conta quantas posições distintas existem até certa
profundidade, a partir de uma posição conhecida. Os números corretos estão publicados há
décadas; qualquer divergência é bug.

| Posição | Profundidade | Esperado |
|---|---|---|
| inicial | 4 | 197.281 |
| Kiwipete (roques, en passant, cravadas) | 3 | 97.862 |
| finais com en passant que dá xeque | 4 | 43.238 |
| promoções | 3 | 9.467 |

Este gerador bate todos.

> **Quando existe um padrão de teste na sua área, use-o.** Ele foi feito exatamente para
> pegar os erros que você ainda não sabe que pode cometer.

---

## 9. Não travar a página

```js
setTimeout(() => { /* pensar */ }, 50);
```

JavaScript roda em **uma única linha de execução**. Enquanto o computador calcula, a página
inteira congela: nada é redesenhado, nenhum clique responde.

Adiar o cálculo com `setTimeout` devolve o controle ao navegador por um instante — ele
desenha o "pensando…", e só então a conta começa. Sem esse detalhe, a mensagem nunca
apareceria: seria escrita e substituída antes de qualquer redesenho.

(A solução completa chama-se **Web Worker**: um segundo fio de execução de verdade. Aqui
o `setTimeout` basta e cabe em uma linha.)

---

## 10. Acessibilidade

```js
casa.setAttribute("aria-label", "e4, cavalo branco");
```

Sem isso, um leitor de tela anunciaria "botão" 64 vezes. Com isso, uma pessoa cega
consegue jogar xadrez nesta página — navegando por Tab e ouvindo cada casa.

É uma linha de código. Sempre que um elemento tem significado que não está no seu texto,
ele precisa de um nome acessível.

---

## Exercícios

### Entender

1. Abra o console e digite `avaliar(estado)`. Faça um lance ruim e veja o número mudar.
2. `gerarMovimentosLegais(estado).length` na posição inicial dá 20. Confirme no tabuleiro.
3. Mude a profundidade do nível difícil para 5 em `NIVEIS` e cronometre. Estime a
   multiplicação por lance a mais.
4. Zere a `TABELA_DO_CAVALO` (todos os valores 0) e jogue. Os cavalos passam a ir para as
   bordas — a tabela era a única coisa que os ensinava a não fazer isso.

### Melhorar o jogo

5. **Destacar o último lance do computador** com uma cor diferente da do seu.
6. **Relógio**: 5 minutos para cada lado, contagem regressiva, derrota por tempo.
7. **Repetição tripla**: guarde um resumo de cada posição num array e declare empate
   quando a mesma aparecer três vezes.
8. **Notação curta** (`Cf3` em vez de `Cg1-f3`), com a desambiguação correta quando dois
   cavalos podem ir à mesma casa.
9. **Arrastar e soltar** as peças, mantendo o clique funcionando.
10. **Exportar a partida em PGN** e copiar para a área de transferência.

### Melhorar o computador

11. **Tabela de transposição**: guarde num `Map` as posições já avaliadas. A mesma posição
    é alcançada por caminhos diferentes o tempo todo, e recalcular é desperdício puro.
12. **Aprofundamento iterativo**: busque profundidade 1, depois 2, depois 3… usando o
    melhor lance de cada rodada para ordenar a seguinte. Fica mais rápido do que ir direto
    à profundidade final — parece contraintuitivo e é verdade.
13. **Web Worker**: mova a busca para um segundo fio de execução e deixe a interface fluida
    mesmo em profundidade 6.
14. **Avaliação melhor**: bônus para o par de bispos, penalidade para peões dobrados, bônus
    para torre em coluna aberta.
15. **Livro de aberturas**: uma tabela de lances conhecidos para os primeiros movimentos,
    para o computador não gastar tempo pensando no que já é sabido.

---

## O que você levou daqui

Divisão de um programa em camadas com dependências em uma direção só, estado imutável,
geração de movimentos com regras cheias de exceção, busca adversarial com minimax e poda
alfa-beta, avaliação heurística, CSS Grid, acessibilidade com ARIA, e a diferença entre
testar peças isoladas e testar o comportamento final.

---

**Antes:** [`../pong`](../../pong/) · **Índice:** [`../README.md`](../../README.md)
