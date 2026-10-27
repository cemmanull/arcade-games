# Xenomorph — Passo 6: A semente

**Mudou:** os três arquivos, e um novo: `gerador.js`
**Rode:** abra o `index.html`, explore, e depois digite `XENO` no campo da semente.

---

## O que você vê

Uma sala virou um planeta. O soldado pousa ao lado da nave; saindo pela porta da direita, chega a
outra sala; descendo pela grade no piso, a outra; subindo pelo teto de um poço, a outra. São 17 ou
mais salas, em duas regiões: o **Complexo de Pesquisa** (metal frio) e a **Floresta
Bioluminescente** (rocha com musgo que brilha, esporos piscando no escuro).

Abaixo da tela, o **minimapa** desenha só as salas já visitadas, com um risco em cada porta. Ao
lado, a **semente**. Clique em *Sortear* e o planeta inteiro muda. Digite `XENO` e aperte Enter:
o planeta de quem digitar `XENO` — em qualquer computador, em qualquer dia — é **este**.

Com H, o canto da tela diz em que sala você está, que módulo ela usa e a quantas portas fica do
pouso.

---

## 1. Aleatório, mas repetível

```js
function criarSorteador(numero) {
    let estado = numero >>> 0;
    return function sortear() {
        estado = (estado + 0x6D2B79F5) >>> 0;
        ...
        return (...) / 4294967296;   // um decimal entre 0 e 1, como Math.random()
    };
}
```

`Math.random()` não serve para gerar o mundo: não aceita semente, e ninguém consegue repetir o
que ele deu. Um **gerador pseudoaleatório** é uma conta que, a partir de um número inicial,
produz uma sequência que *parece* aleatória — mas é sempre a mesma para o mesmo número. O
mulberry32 cabe em cinco linhas; as constantes estranhas foram escolhidas porque misturam bem os
bits, e não há mais nada a entender nelas.

O texto da semente vira número por um **hash** (`hashDeTexto`): sementes parecidas — `XENO1` e
`XENO2` — dão números muito diferentes, e mundos muito diferentes.

E o estado do gerador mora numa **clausura**: a função `sortear` devolvida lembra do seu `estado`
depois que `criarSorteador` terminou. Cada sorteador é independente dos outros.

> O GDD pede, na seção 13: *"Utilize uma seed principal para cada expedição"*, e que ela permita
> *"reproduzir o mesmo mapa, incluindo a distribuição dos elementos gerados"*. O teste deste passo
> gerou o mesmo mundo duas vezes e comparou, sala por sala: idênticos.

### O único `Math.random()`

```js
function sortearSemente() { ... Math.random() ... }
```

Ele escolhe **a semente**, quando ninguém digitou uma. A partir dela, nada mais é sorteado de
verdade.

---

## 2. Fluxos independentes

```js
criarEsqueleto(mundo, criarFluxo(semente, "mapa"));
escolherModulos(mundo, criarFluxo(semente, "salas"));
povoar(mundo, criarFluxo(semente, "criaturas"), criarFluxo(semente, "itens"));
```

Se o mapa, as criaturas e os itens tirassem números do **mesmo** sorteador, aumentar a chance de
itens consumiria um número a mais aqui e ali — e todas as criaturas sorteadas depois mudariam. Uma
mudança pequena num sistema bagunçaria os outros.

Cada sistema tem o seu fluxo, nascido da semente **e do nome do sistema** (`"XENO:itens"`). O
teste deste passo provou: mudar `chanceDeItem` mudou os itens e **não** moveu nenhuma sala nem
nenhuma criatura. É exatamente o que o GDD pede: *"pequenas mudanças em um sistema não devem
modificar desnecessariamente todos os demais resultados"*.

---

## 3. O gerador é um arquivo à parte

```html
<script src="gerador.js" defer></script>
<script src="script.js" defer></script>
```

O `gerador.js` não sabe que existe tela, teclado ou soldado. Recebe uma semente, devolve um
mundo — uma **função pura**, como as regras do xadrez. Por isso mora num arquivo próprio, que dá
para testar sozinho (o teste gerou 2.000 mundos sem abrir o jogo). A ordem dos `<script>`
importa: o jogo usa o que o gerador declarou.

A divisão segue o GDD (seção 12): *"Geração procedural"*, *"Sistema de seeds"* e *"Conexões"*
de um lado; o resto do jogo do outro.

---

## 4. Três camadas de geração

### O esqueleto: uma mancha que cresce

```js
const { sala, direcao } = escolher(sortear, fronteiraDaRegiao(mundo, nomeDaRegiao));
const nova = abrirSala(mundo, sala.coluna + passo.dc, sala.linha + passo.dl, nomeDaRegiao);
ligar(sala, nova, direcao);
```

Começa no pouso. A cada passo, sorteia uma célula vazia **vizinha** de uma sala existente, abre-a
e a liga a essa sala. Como toda sala nova nasce ligada a uma antiga, o mapa é sempre **conexo** —
não por sorte, mas pela forma do algoritmo. O GDD avisa: *"não transforme o mapa em uma sequência
totalmente aleatória de salas independentes"*.

As duas **regiões** são fixas (o complexo à esquerda, a floresta à direita) e as salas dentro delas
mudam: a terceira direção que o GDD recomenda. O complexo cresce até tocar a sua última coluna;
então abre-se uma passagem para a floresta, que cresce dali.

Por fim, os **atalhos**: vizinhas da mesma região que ainda não se ligam ganham, às vezes, uma
porta. O mapa deixa de ser uma árvore — passam a existir voltas.

### Os módulos: salas feitas à mão, escolhidas por compatibilidade

```js
const servem = sorteaveis.filter(nome => usadas.every(direcao => MODULOS[nome].aberturas.includes(direcao)));
```

As salas **não** são inventadas pelo computador: são **módulos** desenhados à mão, como a sala dos
passos anteriores. Cada um diz que aberturas aceita (`"OLNS"`, `"OL"`…), e só serve a uma sala que
use apenas essas. Gerar cada plataforma ao acaso daria salas impossíveis; o GDD pede *"módulos
projetados manualmente, conectados por regras de compatibilidade"*.

As aberturas ficam **sempre nos mesmos lugares** — portas laterais nas linhas 13 a 15, teto e piso
nas colunas 14 a 17 —, e todas nascem fechadas. `construirBlocos` escava só as que a sala usa. É
por isso que as salas se encaixam.

### A população: o gerador anota, o jogo cria

```js
sala.criaturas.push({ especie: escolherPonderado(sorteioDasCriaturas, regiao.criaturas), coluna, linha });
```

Cada `*` do módulo é um lugar onde **pode** nascer uma criatura. A chance cresce com a distância até
o pouso (mais fundo, mais perigo), a espécie sai dos pesos da região (o complexo tem mais
rastejadores; a floresta, mais saltadores), e nenhuma criatura nasce a menos de 5 blocos de uma
porta usada — quem entra precisa de um instante para ver a sala.

O gerador só anota **onde e o quê**. Quem transforma a anotação numa criatura de verdade é o jogo.

---

## 5. O plano e o que mudou

```js
salasVisitadas.set(nome, {
    blocos: construirBlocos(sala),
    criaturas: sala.criaturas.map(...criarCriatura...),
    itens: sala.itens.map(criarItem)
});
```

O mundo gerado é um **plano** que não muda durante a expedição. O que muda — criaturas mortas,
cápsulas apanhadas — mora ao lado, em `salasVisitadas`, criado na primeira visita a cada sala. É a
separação do passo 4 (a ficha da arma e a munição que sobra), para um planeta inteiro.

E o minimapa ganha de graça: uma sala visitada é uma sala que tem estado.

---

## 6. Salas que se encaixam

```js
if (meio.x >= tela.width) direcao = "L";
...
entrarNaSala(destino);
soldado.x -= passo.dc * tela.width;
```

Quando o **centro** do soldado sai da tela, ele entra na vizinha, do lado oposto: saiu com x = 257,
chega com x = 1. A física nem percebe.

Duas peças tornam isso possível:

- **Fora da sala vale a borda mais próxima.** Antes, fora era sempre parede, e ninguém passaria por
  uma porta. Agora a coluna −1 repete a coluna 0: onde a borda é parede, fora é parede; onde é
  porta, fora é ar.
- **Subir ganha um empurrão.** Quem sai pelo teto chega pelo piso da sala de cima, e precisa de
  impulso para passar pela grade e pisar nela. Um truque honesto: sem ele, todo poço seria uma
  armadilha.

A grade no piso é a **plataforma de mão única do passo 3**: desce-se com ↓ + pular, sobe-se
pulando por baixo. Ela foi inventada para isto.

---

## Verificado

- O mesmo mundo, duas vezes, para a mesma semente; mundos diferentes para sementes diferentes.
- 2.000 sementes: nenhuma sala desconectada, nenhuma porta sem a porta de volta, nenhum módulo com
  uma porta que ele não aceita; em média, 1,1 atalho por mundo.
- **Os módulos, com a física de verdade.** Um robô que conhece só a física do soldado entrou em
  cada módulo por cada abertura e tentou, de cada posição alcançada, todas as combinações de
  corrida, pulo, direção e descida pela grade. De **toda** entrada ele alcançou **todas** as
  saídas. Na primeira versão, três módulos (galeria, câmara e torre) tinham degraus de 5 blocos, e
  foram redesenhados antes de entrar no jogo.
- As 36 portas de um mundo inteiro, atravessadas uma a uma: o soldado chega à sala certa, em pé.

---

## Experimente

1. Desenhe um módulo novo, com as aberturas que quiser. Recarregue: o console aponta alguma porta
   tapada?
2. Ponha `chanceDeAtalho: 1`. Como fica o mapa? E com 0?
3. Faça as criaturas e os itens usarem o **mesmo** fluxo. Gere `XENO`, anote as criaturas da segunda
   sala, mude `chanceDeItem` e gere de novo. Elas mudaram?
4. Troque `criarSorteador` por `Math.random` dentro de `criarFluxo`. A semente ainda serve para
   alguma coisa?
5. Crie uma terceira região, as **Minas Infectadas**, nas linhas de baixo da grade, com paleta
   própria. O que precisou mudar no gerador e o que precisou mudar no jogo?
6. Mostre no minimapa as salas **vizinhas** das visitadas, em cinza, sem detalhes. Fica mais fácil
   ou perde a graça de explorar?

---

**Anterior:** [`05-criaturas`](../05-criaturas/) · **Próximo:** [`07-impulso`](../07-impulso/) — uma habilidade que abre caminhos, e um
gerador que confere o próprio trabalho.
