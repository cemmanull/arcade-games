# Xenomorph — Passo 5: As criaturas

**Mudou:** os três arquivos (a barra de vida e a camada de mensagem)
**Rode:** abra o `index.html`, sobreviva — e depois aperte **H**.

---

## O que você vê

Os casulos se abriram. Três **rastejadores** roxos patrulham o chão e, ao ver o soldado, correm
atrás dele — e acabam um de cada lado. Um **saltador** laranja espera numa plataforma: chegue perto
e ele **agacha**, e meio segundo depois salta num arco que cai exatamente onde você estava. Duas
**cuspidoras** verdes ficam nos cantos altos: o saco de ácido delas **pulsa** cada vez mais rápido,
e então cospem uma gota em parábola. A gota que erra vira uma **poça** que queima por 3 segundos.

O soldado tem vida. Cada ferida o joga para longe, e ele pisca enquanto está invulnerável. A
**esquiva** finalmente serve para alguma coisa: nada fere durante ela. Vida zero: *Abatido*, e
Enter recomeça.

Com **H**: o nome do estado sobre cada criatura e uma linha até o soldado — verde se ela o
enxerga, vermelha se uma parede tapa.

---

## 1. Uma máquina de estados em cada criatura

```js
const COMPORTAMENTOS = {
    rastejador: { patrulha: rastejadorPatrulha, perseguicao: rastejadorPersegue, investigacao: rastejadorInvestiga },
    saltador:   { espreita: ..., preparo: ..., bote: ..., recuperacao: ... },
    cuspidora:  { vigia: ..., mira: ..., recuo: ... }
};

COMPORTAMENTOS[criatura.especie][criatura.estado](criatura, ficha, tempo);
```

O GDD pede *"inteligência artificial baseada em estados, como patrulha, investigação, perseguição,
ataque, defesa, recuo e morte"* (seção 4). A máquina do chefe do Shoot 'em up, agora em **todas**
as criaturas e com **um só motor**: uma tabela de tabelas, espécie → estado → função. O motor não
sabe que espécies existem.

| Espécie | Estados | Muda quando… |
|---|---|---|
| rastejador | patrulha → perseguição → investigação → patrulha | vê o soldado; perde-o de vista por 1,5 s; chega onde o viu |
| saltador | espreita → preparo → bote → recuperação → espreita | vê o soldado; 0,45 s; pousa; 0,7 s |
| cuspidora | vigia → mira → vigia; vigia → recuo → vigia | vê o soldado; 0,6 s; ele chega perto; 0,6 s |

E trocar de estado é **sempre** por `mudarEstado`, que zera o relógio do estado. Assim, "o preparo
dura 0,45 s" se escreve sem saber em que segundo da partida ele começou.

---

## 2. Números numa tabela, comportamento em funções

```js
saltador: { vida: 7, danoDeContato: 16, visao: 104, tempoDePreparo: 0.45, tempoDeVoo: 0.6, ... }
```

A ficha é **dado puro**: números e desenhos. O que a criatura **faz** com eles mora nas funções.
Para deixar o saltador mais agressivo, mexe-se na ficha, sem ler uma linha de comportamento. Para
inventar uma espécie que salta como o saltador mas com outros números, escreve-se uma ficha nova e
aponta-se para as mesmas funções.

É a divisão do GDD na seção 12: *"configurações externas para definir atributos"* de um lado,
*"sistemas orientados a dados"* do outro.

---

## 3. O mesmo corpo para todos

```js
cair(criatura, tempo, FISICA.gravidade);
moverComColisao(criatura, tempo);
```

As criaturas caem, batem em paredes e pisam em plataformas pela **mesma** função do soldado. A
única novidade na física foi um campo, `bateuNaParede`, descoberto pela colisão como o `noChao` —
o rastejador o usa para dar meia-volta e para dar um pulinho quando um degrau atrapalha a caçada.

`cair` agora recebe o corpo e as gravidades. O soldado cai mais pesado do que sobe (passo 3); as
criaturas usam uma só — e o motivo está na próxima seção.

---

## 4. Três ideias de inteligência, nenhuma complicada

### Enxergar

```js
return distanciaAteOSoldado(criatura) <= ficha.visao && caminhoLivre(centro(criatura), centro(soldado));
```

Perto o bastante **e** nada sólido no caminho, conferido em pontos a cada 4 pixels — os pedaços de
meio bloco dos tiros, de novo. A grade das plataformas não tapa a vista: ela não é `solido`. É por
isso que dá para se esconder atrás de uma parede, mas não sob uma plataforma.

### Cercar, com o truque do Pac-Man

```js
const alvoX = criatura.ultimaPosicaoVista.x + criatura.lado * 5;
```

O alvo do rastejador **não é o soldado**: é um ponto ao lado dele — à esquerda para uns, à direita
para outros. Um grupo que vem todo pela esquerda se divide sozinho: metade passa por baixo do
soldado para chegar ao seu lado direito. Ninguém combinou nada. É o comportamento **emergente** dos
fantasmas do Pac-Man: regras simples, alvos diferentes, e o jogador se sente cercado.

### O bote é uma parábola calculada

```
x(T) = x + vx·T                →  vx = dx / T
y(T) = y + vy·T + g·T²/2       →  vy = dy / T − g·T / 2
```

Quer-se cair onde o soldado está, daqui a T = 0,6 s. A física do ensino médio, resolvida ao
contrário, dá a velocidade inicial. O teste deste passo mediu: o saltador pousou **exatamente** no
ponto mirado (75,0 px). Com duas gravidades, como as do soldado, a conta não fecharia — é por isso
que as criaturas usam uma só.

A cuspidora usa **a mesma conta**, com a gravidade do ácido e mirando nos pés.

Duas consequências que viram jogo:

- o alvo é onde o soldado **estava**: quem se mexe durante o voo não é acertado;
- o arco não desvia de nada: no teste, um saltador mirando por baixo de uma plataforma de grade
  **pousou nela**. Não era um bug. Era física.

---

## 5. Telegrafar, em todas

O agachar do saltador e o saco pulsante da cuspidora são o **aviso** do chefe do Shoot 'em up, em
criaturas comuns. Nenhum ataque à distância sai sem aviso; o pulso da cuspidora até acelera
conforme o cuspe se aproxima:

```js
const pulso = Math.floor(criatura.tempoNoEstado * (6 + criatura.tempoNoEstado * 20)) % 2;
```

Quem presta atenção sempre tem tempo de esquivar. Quem não presta, aprende.

---

## 6. Ferir num lugar só

```js
function ferirSoldado(dano, deOndeVeioX) {
    if (soldado.invulneravel > 0 || soldado.esquiva > 0 || estado !== "jogando") return;
    ...
}
```

Encostar numa criatura, levar um cuspe, pisar numa poça: tudo passa por aqui. E é aqui que mora a
regra *"durante a esquiva e logo depois de uma ferida, nada fere"*. Se cada perigo tirasse vida por
conta própria, cada um precisaria lembrar dessa regra — e um deles esqueceria.

O empurrão joga o soldado para **longe de quem o feriu**: quem apanha sente o golpe e ganha
distância para reagir.

### As criaturas reagem à arma

```js
alvo.vx = Math.sign(tiro.vx) * tiro.empurrao;
alvo.atordoada = 0.12;
```

Cada ficha de arma ganhou um `empurrao`: a espingarda empurra três vezes mais que o rifle. A
criatura atordoada desliza sem decidir nada por um instante. E levar um tiro **acorda**: um
rastejador que patrulhava passa a perseguir. O GDD pede que os inimigos reajam *"ao posicionamento
do jogador e às próprias características das armas utilizadas"*.

---

## Detalhes que valem notar

### A poça é a "área controlada"

A gota que acerta um piso vindo de cima vira poça **em cima** dele. A poça não se move nem pensa:
é um retângulo com prazo de validade. Mas ela muda onde o jogador pode ficar — o *"controlam áreas
do cenário"* do GDD, com quatro campos.

### Recomeçar sem lixo

`recomecar` recria tudo pelas fábricas (`criarSoldado`, `criarCriaturas`) e esvazia todas as listas.
O soldado deixou de ser um `const` justamente para isso.

### O quadro sai do estado

O saltador agachado, a cuspidora acesa, as pernas do rastejador: nada disso é guardado. O desenho
**pergunta** o estado e o relógio, e escolhe o quadro.

---

## Experimente

1. Dê ao rastejador `paciencia: 10`. Esconda-se atrás de uma parede. O que muda?
2. Troque o `lado * 5` por `0`. Os rastejadores ainda cercam?
3. Aumente o `tempoDePreparo` do saltador para 1 s, depois diminua para 0,1 s. Qual é justo?
4. Faça o saltador **corrigir** o bote no ar (recalcule `vx` a cada quadro). Fica mais difícil ou
   mais burro?
5. Crie uma quarta espécie, o **tanque biológico** do GDD: uma ficha nova (muita vida, lento, grande)
   que reaproveita as funções do rastejador. Quantas linhas de código novas?
6. Faça a cuspidora ficar **imune** a tiros enquanto mira (o saco fechado). O jogador entende sem
   ninguém explicar?
7. Esconda-se sob uma plataforma de grade e veja, com H, as linhas verdes. Depois faça a grade
   tapar a visão. Como fica a sala?

---

**Anterior:** [`04-armas`](../04-armas/) · **Próximo:** [`06-semente`](../06-semente/) — uma sala vira um mapa inteiro, diferente a
cada expedição, mas igual a cada semente.
