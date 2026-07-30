# Xadrez — Passo 8: Poda alfa-beta

**Mudou:** `computador.js`
**Rode:** abra o `index.html`. O nível difícil agora enxerga **4** lances — e responde mais
rápido do que a versão anterior enxergando 3.

---

## O que você vê

O mesmo jogo, um adversário bem mais forte, e sem a travada.

**Nenhuma regra mudou.** Só o jeito de procurar.

---

## 1. Poda alfa-beta

```
alfa = a melhor nota que EU já garanti até aqui
beta = a melhor nota que o ADVERSÁRIO já garantiu
```

```js
if (alfa >= beta) break;   // corte
```

A ideia, em português: **se uma linha já é boa demais para mim, o adversário nunca vai
deixar eu chegar nela** — porque ele já tem uma alternativa melhor um nível acima. Então
não há por que continuar analisando o que vem depois.

Uma analogia: você está escolhendo entre dois restaurantes e já sabe que o primeiro custa
R$ 50. Ao ver que o segundo cobra R$ 80 só pela entrada, você para de ler o cardápio. Não
precisa saber quanto custa a sobremesa para saber que não vai lá.

> A poda corta mais de **90%** do trabalho **sem mudar o resultado**. A resposta é
> exatamente a mesma que a busca completa daria — só que sem visitar o que não podia
> importar.

---

## 2. Ordenar os movimentos é metade do ganho

```js
function notaDeOrdenacao(movimento) {
    if (movimento.capturada) {
        return 10 * VALOR_DA_PECA[movimento.capturada.tipo]
             - VALOR_DA_PECA[movimento.peca.tipo];
    }
}
```

A poda corta tanto **mais** quanto **melhor for a ordem** em que os lances são examinados.
Se o melhor lance é visto primeiro, todos os outros são descartados rapidamente; se é visto
por último, quase nada é podado.

A heurística clássica se chama **MVV-LVA**: *vítima mais valiosa, agressor menos valioso*.
Capturar uma dama com um peão é a primeira coisa que vale a pena examinar.

> Ordenar não muda o resultado — muda o tempo, por um fator grande. **É o melhor retorno
> por linha de código do programa inteiro.**

---

## 3. Tabelas de posição

Material sozinho não basta: um cavalo no centro vale mais que um cavalo no canto, sendo a
mesma peça. Cada tipo ganha uma tabela de 64 números.

Repare no que essas tabelas **ensinam sem nenhuma regra escrita**:

- peões ganham valor conforme avançam;
- cavalos odeiam as bordas (de um canto, um cavalo alcança só duas casas);
- o rei se esconde atrás dos peões no meio-jogo…
- …e vai para o centro no final, onde vira peça de ataque.

Duas tabelas para o rei, escolhidas por uma regra simples de "estamos no final?".

> Muito do que parece "conhecimento de xadrez" é, na prática, uma tabela de números
> ajustada por tentativa e erro. Isso não é trapaça: é como quase toda heurística
> funciona.

---

## 4. Busca de capturas — o efeito horizonte

Imagine que a busca termina **exatamente** depois de o computador capturar uma dama com o
peão. Ele conta a dama a mais e comemora — sem enxergar que, no lance seguinte, o peão é
comido de volta.

Isso se chama **efeito horizonte**: o desastre está logo além do que ele consegue ver.

A solução: ao chegar ao fim da profundidade, **não pare numa posição barulhenta**. Continue
analisando **só as capturas**, até a poeira baixar.

```js
function buscarCapturas(estado, alfa, beta) {
    const notaEmRepouso = avaliar(estado);   // ninguém é obrigado a capturar
    ...
}
```

Sem isto, um programa de xadrez **entrega peças de graça o tempo todo**, e o motivo é
dificílimo de descobrir: a busca está certa, a avaliação está certa, e o resultado é
péssimo.

É a diferença entre um adversário ridículo e um adversário decente.

---

## 5. Um bug real, e a lição que ele carrega

Este programa teve um bug durante a construção, e ele é instrutivo demais para ficar de
fora.

**Sintoma:** a busca estava correta (testada), a avaliação estava correta (testada), e
mesmo assim o computador jogava lances absurdos — não via um mate em um lance nem capturava
uma dama de graça.

**Causa:** no nível raiz, a janela alfa-beta estava sendo estreitada a cada lance
examinado, como se faz nos níveis de baixo. O problema é que, **quando a poda corta uma
linha, o valor devolvido não é a nota real — é um limite** ("é pelo menos isto"). Limites
servem para decidir se vale a pena continuar, **não para comparar lances entre si**.

Resultado: todos os lances ruins voltavam com exatamente o mesmo número — o limite — e
empatavam com o melhor.

**Correção:** na raiz, cada lance é buscado com a janela completa. Custa um pouco de
velocidade no primeiro nível; a poda continua trabalhando normalmente dentro de cada linha.

> A lição não é sobre xadrez. É que **um sistema pode ter todas as peças corretas e ainda
> assim estar errado**, se o significado do que passa entre elas não for o que quem chamou
> supõe. Testes de cada peça isolada não pegam isso; só um teste do comportamento final
> pega.

---

## 6. Como este programa foi testado

Um gerador de movimentos de xadrez tem dezenas de casos especiais. "Parece funcionar" não
serve — o erro aparece na posição número 400 mil.

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

## Experimente

1. Compare os tempos com o passo 7, na mesma profundidade. Um contador de nós em `buscar`
   mostra a diferença de forma ainda mais clara.
2. Comente a linha `if (alfa >= beta) break;` e cronometre. É a poda inteira, desligada.
3. Faça `ordenarMovimentos` devolver a lista **ao contrário** (`.reverse()`). O resultado é
   o mesmo; o tempo, muito pior. Ordem importa.
4. Zere a `TABELA_DO_CAVALO` e jogue. Os cavalos passam a ir para as bordas — a tabela era
   a única coisa que os ensinava a não fazer isso.
5. Desligue `buscarCapturas` (retorne `avaliar(estado)` direto) e jogue algumas trocas. O
   computador começa a entregar peças.
6. Aumente o difícil para profundidade 5 e cronometre. Depois implemente a **tabela de
   transposição** do exercício 11 do guia final e cronometre de novo.

---

**Anterior:** `07-computador` · **Próximo:** `final` — a interface completa e o guia com
todos os conceitos do módulo.
