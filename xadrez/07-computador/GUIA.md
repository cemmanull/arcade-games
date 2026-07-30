# Xadrez — Passo 7: O computador que pensa

**Mudou:** tudo — o arquivo único virou **três**.
**Rode:** abra o `index.html`. Você joga de brancas contra o computador.

---

## O que você vê

Um adversário. E um jogo que **trava por alguns segundos** no nível difícil.

Isso é de propósito. Sinta a lentidão: é ela que o passo 8 vai resolver.

---

## 1. O arquivo ficou grande demais

O `script.js` do passo 6 tinha quase mil linhas. Agora são três arquivos, e a divisão não é
por tamanho — é por **responsabilidade**:

```
regras.js       o que é permitido no xadrez        (não conhece a tela)
computador.js   como escolher um bom lance          (só conhece as regras)
interface.js    o que se vê e o que se clica        (conhece os dois)
```

As setas de dependência apontam **em uma direção só**. `regras.js` não sabe que existe uma
tela; `computador.js` não sabe que existe um clique.

O retorno é concreto, não teórico:

- o computador usa **exatamente** as mesmas regras do jogador — impossível ele trapacear
  por engano;
- as regras podem ser **testadas sem navegador**, com um script;
- dá para trocar a interface inteira sem tocar em uma linha de regra.

> A pergunta que guia a divisão: **"o que este arquivo precisa saber?"** Se `regras.js`
> precisasse conhecer um botão, algo estaria errado.

E repare que a separação não custou retrabalho: o estado do jogo e o estado da interface já
estavam separados desde o passo 3. **Escrever com a divisão em mente é o que torna a
divisão barata quando ela chega.**

### Por que scripts clássicos, e não módulos

```html
<script src="regras.js" defer></script>
<script src="computador.js" defer></script>
<script src="interface.js" defer></script>
```

A ordem importa — `interface.js` usa funções dos outros dois. Com `defer`, os scripts
executam na ordem em que aparecem, depois que o HTML terminar.

Não usamos `import`/`export` porque módulos ES **exigem um servidor**: abrindo o arquivo
direto do disco, o navegador os bloqueia por segurança. Scripts clássicos funcionam com um
duplo clique.

---

## 2. Como uma máquina joga xadrez

Duas ideias, e nenhuma delas é inteligência.

### Avaliar

Um número que resume a posição, em **centésimos de peão**:

```js
peao: 100, cavalo: 320, bispo: 330, torre: 500, dama: 900
```

Por enquanto só material. O computador vai jogar como alguém que sabe as regras e não sabe
estratégia: ele não faz ideia de que um cavalo no centro vale mais que um no canto.

### Minimax (escrito como negamax)

```js
const nota = -buscar(posicaoSeguinte, profundidade - 1);
```

*A minha melhor nota é o negativo da melhor nota do adversário.*

É a mesma ideia de uma balança: o que pesa a favor de um lado pesa contra o outro,
exatamente na mesma medida. Essa única troca de sinal substitui um código para as brancas e
outro para as pretas.

Para isso funcionar, `avaliar` precisa devolver o valor **sempre do ponto de vista de quem
tem a vez**. Uma convenção pequena que apaga metade do código.

### Preferir o mate mais curto

```js
return -PONTUACAO_DE_MATE + profundidade;
```

Sem o `+ profundidade`, todos os mates valem igual — e o computador fica empurrando o rei
pelo tabuleiro sem concluir, porque dar mate agora e dar mate em cinco lances pontuam o
mesmo. Com ele, mates rápidos valem mais (e, quando está perdendo, ele adia o mate o máximo
possível).

---

## 3. O custo, que é o assunto do passo

Esta busca examina **todas** as linhas possíveis:

| Profundidade | Posições examinadas (aprox.) |
|---|---|
| 1 | 20 |
| 2 | 400 |
| 3 | 8.900 |
| 4 | 197.000 |
| 5 | 4.900.000 |

Cada lance a mais multiplica o trabalho por ~20. É por isso que o nível "difícil" para na
profundidade 3, e mesmo assim você sente.

> **Sinta o problema antes de aplicar a solução.** Uma otimização que você não sentiu falta
> é uma otimização que você não entende — e que você vai aplicar nos lugares errados pelo
> resto da carreira.

---

## 4. Não travar a página

```js
setTimeout(() => { /* pensar */ }, 50);
```

JavaScript roda em **uma única linha de execução**. Enquanto o computador calcula, a página
inteira congela: nada é redesenhado, nenhum clique responde.

Adiar o cálculo com `setTimeout` devolve o controle ao navegador por um instante — ele
desenha o "pensando…", e só então a conta começa. Sem esse detalhe, a mensagem **nunca
apareceria**: seria escrita e substituída antes de qualquer redesenho.

(A solução completa chama-se **Web Worker**: um segundo fio de execução de verdade. Aqui o
`setTimeout` basta e cabe em uma linha.)

---

## 5. Dificuldade é limitação, não esperteza

```js
const NIVEIS = {
    facil:   { profundidade: 1, margemDeAcaso: 120 },
    medio:   { profundidade: 2, margemDeAcaso: 40 },
    dificil: { profundidade: 3, margemDeAcaso: 0 }
};
```

Dois botões de dificuldade: **quantos lances ele enxerga** e **quanto ele topa jogar algo
que não é o ótimo**.

A margem de acaso também serve para o computador não jogar exatamente a mesma partida toda
vez — o que tornaria o jogo decorável em três tardes.

É o mesmo princípio do oponente do Pong: **a máquina fica boa por padrão; o trabalho é
deixá-la vencível de um jeito interessante.**

---

## Experimente

1. Jogue no nível difícil e cronometre um lance. Depois some 1 à profundidade em `NIVEIS` e
   cronometre de novo. Você acabou de medir a explosão combinatória.
2. Deixe a `margemDeAcaso` do difícil em 200 e veja o computador jogar mal de propósito.
3. Zere o valor da dama em `VALOR_DA_PECA` e observe o computador entregá-la de graça — a
   avaliação é literalmente tudo o que ele sabe sobre o jogo.
4. Tire o `+ profundidade` do mate, monte uma posição com mate em 2 e veja o computador
   enrolar.
5. No console: `avaliar(estado)` na posição inicial (deve ser 0 — material igual) e depois
   de uma captura.
6. Conte quantas posições a busca visita: crie um contador global, incremente-o em `buscar`
   e imprima no fim. Compare com a tabela lá de cima.

---

**Anterior:** `06-especiais` · **Próximo:** `08-alfa-beta` — a mesma resposta, 90% mais
rápido.
