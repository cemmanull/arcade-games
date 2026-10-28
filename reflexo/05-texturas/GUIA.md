# Reflexo — Passo 5: Texturas

**Mudou:** `script.js` (a seção 2 é nova: a paleta e as cinco texturas 16×16 em texto, mais as constantes
da névoa; a 5 prepara as texturas; `desenharVisao` agora **escreve pixels** num `ImageData`, e a coluna
de cada parede amostra a textura; `atualizarRaios` guarda também `u`, a posição do impacto ao longo da
face; a seção 7, "medir antes de escolher", é nova; a leitura do H mostra os tempos; some o passo fixo do
passo 3; a busca do raio não aloca objetos), `index.html` (a ajuda e os botões **Planta** e **Medir**) e `style.css` (a leitura ganha uma sexta linha; os botões). `lancarRaio`, a colisão
e a entrada são **os mesmos** do passo 4.
**Rode:** abra o `index.html`. Ande e gire como antes. **H** troca a imagem pela planta e mostra quanto
cada técnica de desenho demorou; **M** mede de novo. Na tela do celular, os botões **Planta (H)** e **Medir (M)**
fazem o mesmo.

---

## O que você vê

As paredes de **tijolo** e de **pedra** deixam de ser cor lisa: têm fileiras, argamassa, brilho. O que
está longe **some na escuridão** (a névoa) e as faces viradas para o lado `y` ficam um pouco mais
escuras, como no passo 4. Teto e piso são um degradê. Porta, emissor e receptor também têm a sua
textura; é só andar até eles.

Com **H**, a planta traz **seis linhas**: as três de sempre e as três novas, os milissegundos por
quadro de duas técnicas de desenho (A e B) e o tempo do quadro de agora.

> Ainda não há objetos nem espelhos: cada um é um passo. Este é o passo em que **o jogo escolhe um jeito
> de desenhar** e prova a escolha com um relógio.

---

## 1. Textura como texto

*Reusa os sprites em texto do curso (`shoot-em-up/01-ceu`: cada letra é uma cor).*

Uma textura é uma grade 16×16 de cores. Em vez de um arquivo de imagem (o curso promete abrir com
duplo clique, e arquivos de imagem só entram no `final`), cada textura é **16 linhas de 16 letras**, e
cada letra é uma cor da paleta:

```js
const PALETA_DAS_TEXTURAS = { a: "#964632", b: "#b05a40", c: "#4a3c3c", ... };
const TEXTURAS_EM_TEXTO = {
    "#": [ "aaabaaacaaababbc", "aaaaaaacaaaaaaac", "dddddddcadaadddc", "cccccccccccccccc", ... ],
    "%": [ ... ], D: [ ... ], E: [ ... ], R: [ ... ]
};
```

A **chave** é o símbolo do mapa: a casa `#` usa a textura `#`. Olhe de longe o tijolo: `c` é a argamassa
(a linha inteira de `c` separa as fileiras, e as juntas verticais se deslocam pela metade a cada
fileira), `b` são pontos de brilho e `d`, de sombra. Desenhar com letras é lento, mas dá para
**ler e corrigir** a arte no próprio código.

Dado errado não dá erro, dá uma parede torta, então `verificarTexturas` confere no começo: 16 linhas,
16 letras cada, todas na paleta. Se falhar, o jogo diz qual textura e não começa.

---

## 2. Qual coluna da textura? O ponto exato do impacto

A parede de 1 casa de largura tem 16 colunas de textura. O raio sabe **onde** bateu: o `lancarRaio` já
devolve `x` e `y` do impacto. Numa face vertical (`"x"`) a posição ao longo da face é o `y`; numa
horizontal (`"y"`), o `x`. Só a parte fracionária interessa (o resto é "qual casa"):

```js
const ponto = resultado.lado === "x" ? resultado.y : resultado.x;
const u = ponto - Math.floor(ponto);                // 0 a 1 ao longo da face (espelhado em duas faces, abaixo)
const colunaDaTextura = Math.floor(u * 16);        // 0 a 15
```

Esse número, `u` (no código, `fracao`, antes do espelhamento), vai para o resultado de cada raio. Dois raios vizinhos batem em pontos vizinhos, então
`u` **cresce de forma contínua** ao longo da parede: não há saltos nem repetição.

**O espelhamento.** Quem olha para uma parede de frente espera ver o tijolo na ordem em que ele foi
desenhado: a coluna 0 à esquerda. Mas "à direita de quem olha" é o sentido de `y` crescente numa face
oeste e de `y` decrescente numa face leste (e o mesmo com `x` nas faces `y`). Se o `u` ignorasse isso, a
textura sairia espelhada em duas das quatro faces: o texto de uma placa sairia ao contrário. A função
`posicaoNaFace` inverte (`1 - fração`) exatamente nesses dois casos, olhando o **sinal da direção do raio**
(`direcaoX < 0` para a face `x`, `direcaoY > 0` para a face `y`). Exercício 2 mostra o defeito.

---

## 3. Amostrar a coluna: uma linha de textura por pixel

A parede na imagem tem `altura` pixels (a conta do passo 4); a coluna da textura tem 16. Cada pixel da
imagem avança `16 / altura` linhas de textura: parede grande, o passo é pequeno e cada texel vira vários
pixels; parede longe, o passo passa de 1 e alguns texels são pulados.

```js
const passo = TAMANHO_DA_TEXTURA / umRaio.altura;
const linhaDaTextura = Math.floor((linha + 0.5 - topoReal) * passo);
pixels[linha * larguraDaVisao + coluna] = textura[linhaDaTextura * 16 + deslocamento];
```

Dois cuidados que a conta de pixel exige:

- **O centro do pixel.** O pixel `linha` cobre de `linha` a `linha + 1`; o ponto que manda é o centro
  (`+ 0.5`). A parede ocupa os pixels cujo centro cai dentro dela (`Math.ceil(topoReal - 0.5)` até
  `Math.ceil(fimReal - 0.5)`). Arredondar pelo topo faria a textura subir e descer meio pixel ao andar.
- **Parede maior que a imagem.** Colado na parede, `altura` passa de `alturaDaVisao` e `topoReal` é
  negativo. `topo` vira `0`, mas a linha de textura continua sendo contada **a partir do topo real**:
  senão a parede "grudaria" no começo da textura em vez de mostrar o miolo dela.

---

## 4. Névoa: 32 níveis, sombreados uma vez

*GDD, seção 6.*

A névoa mistura cada cor da parede com a cor do **horizonte** (`COR_DA_NEVOA` é a mesma `COR_DO_HORIZONTE`, o
azul-noite): em `nível 0`, a cor pura; em `nível 31`, só a névoa. Ser a *mesma* cor importa: uma parede
totalmente enevoada some no horizonte, em vez de virar uma silhueta mais escura que o fundo. Fazer essa mistura **por pixel, por quadro** custaria três
multiplicações a mais em 64 mil pixels. Em vez disso, na carga, cada textura é copiada 32 vezes, uma
por nível, já misturada:

```js
texturasSombreadas["#"][nivel]   // um Uint32Array de 256 pixels
```

São 5 texturas × 32 níveis × 256 pixels × 4 bytes ≈ 160 KB, e no quadro a névoa vira **escolher um
índice**: `nivelDeNevoa` olha a distância perpendicular (a mesma do passo 4, por isso a névoa não curva
a parede) e soma `ESCURO_DO_LADO_Y` níveis nas faces `y`. A "luz barata" do passo 4, a película preta
nas faces `y`, agora é só uns níveis a mais de névoa: **o mesmo mecanismo, sem desenho extra**.

`DISTANCIA_DA_NEVOA = 10` casas é onde o nível chega a 31. No mapa, quase tudo está a menos que isso;
tente 4 ou 30 (exercício 1). A cor mistura em linha reta entre a cor da textura e a da névoa, então
**nunca clareia** com a distância.

---

## 5. O buffer de pixels

*GDD, seção 8.1.*

O passo 4 pintava `fillRect` de 1 pixel de largura, uma chamada por coluna (e mais uma para a película).
Aqui o navegador entrega um `ImageData`: um vetor de bytes `[R, G, B, A, R, G, B, A, ...]`. Por cima dele
vai um `Uint32Array` que enxerga **4 bytes como 1 número**; escrever um pixel é uma atribuição:

```js
imagem = pincelVisao.createImageData(larguraDaVisao, alturaDaVisao);
pixels = new Uint32Array(imagem.data.buffer);
pixels[linha * larguraDaVisao + coluna] = textura[...];
```

Um quadro é: copiar o `fundo` (teto e piso já prontos, em `pixels.set(fundo)`), escrever as paredes e
mandar tudo com **um** `putImageData`. Os números das texturas têm o formato `0xAABBGGRR` (o
processador guarda o byte menos significativo primeiro, e todo navegador de hoje roda assim): por isso
`empacotar` põe o vermelho embaixo e o alfa em cima. A resolução baixa (320×200 ou 195×150, do passo 4)
é o que mantém essa conta pequena.

---

## 6. Medir antes de escolher

*GDD, seção 8.2. O resto do curso repete a regra: nenhuma troca de técnica sem um antes e um depois.*

Há dois jeitos de pôr uma parede com textura na tela:

- **A.** Para cada coluna, `drawImage` de **uma fatia** de 1 pixel da textura, esticada para a altura da
  parede, e um `fillRect` translúcido por cima para a névoa. O navegador faz o trabalho; o código é curto.
- **B.** O buffer da seção 5: o código escreve cada pixel.

O código do passo tem os dois. `desenharVisaoPorFatias` (A) existe **só para medir**; o jogo usa
`desenharVisao` (B): ela já tinha sido escolhida pelo spike do GDD (seção 8.2), e esta medição a confirma.
`medirAsTecnicas` roda 5 quadros de aquecimento e 40 medidos de cada técnica e divide pelo número de quadros.

**O que entra na conta, exatamente: só o desenho de um quadro.** Para A, são o envio do fundo (um
`putImageData` do quadro todo), as fatias `drawImage` e os retângulos de névoa; para B, escrever os pixels e
um `putImageData`. Os raios (`atualizarRaios`) ficam **fora**: a pose não muda durante a medição, e eles são
iguais nas duas técnicas. O envio do fundo de A é o mesmo tipo de trabalho que B faz no fim, então a diferença
medida é: 320 fatias e 320 retângulos de A contra a escrita pixel a pixel de B.

```js
atualizarRaios();                                  // fora da conta
// ... depois dos 5 quadros de aquecimento: inicio = performance.now()
desenharComATecnica(); pincelVisao.getImageData(0, 0, 1, 1);   // 45 vezes
return (performance.now() - inicio) / QUADROS_MEDIDOS;
```

O `getImageData` de 1 pixel força o canvas a **terminar** o que enfileirou (sem ele, o relógio mediria só o
"pedir" desenho, não o "fazer"), e o canvas é criado com `willReadFrequently`, que o põe **em software** (a
CPU desenha). O resultado fica em `medicao` (`{ a, b, largura, altura }`) e aparece no H. A linha "agora" do H é
outra coisa: o quadro inteiro do jogo (`atualizar` + `desenhar`), sempre com a técnica B.

**O que medi, nesta máquina** (Intel Core i5-3320M 2,6 GHz, Chrome headless, 6 rodadas de `medirAsTecnicas` por
linha, sem estrangulamento de CPU):

| Resolução e pose | A: fatias `drawImage` | B: `ImageData` por pixel | A ÷ B |
|---|---|---|---|
| 320×200, meio do corredor | 9,3 a 11,1 ms | 0,67 a 0,78 ms | 13 a 15× |
| 320×200, nariz na parede | 9,5 a 12,2 ms | 0,73 a 0,98 ms | 11 a 14× |
| 195×150 (janela 390×750) | 5,5 a 5,7 ms | 0,33 a 0,36 ms | 16 a 17× |

O orçamento de um quadro a 60 por segundo é **16,7 ms**. B sobra de longe; só o desenho de A, numa máquina
de 2012, gasta de um terço a três quartos do orçamento, antes de o jogo ter feito qualquer outra coisa.
A razão cai dentro da faixa que o GDD registrou no spike (A dez a trinta vezes mais cara), mas o número
exato depende do que entra na conta e da máquina. **B fica.**

**Ressalvas honestas:**
- Medi **CPU com canvas em software** (`willReadFrequently`). Com a GPU desenhando de verdade, o custo de A
  é diferente e **não foi medido**: o GDD (seção 8.2) já avisa que, sem a descarga forçada, A só "enfileira"
  e o relógio não vê o custo. A escolha de B se apoia na tabela do spike inteira, não neste número só.
- É um desktop com Chrome sem tela de verdade, não um celular; o GDD (seção 12) registra que celular **não foi
  medido**. Rode **M** (ou o botão **Medir**) na sua máquina e compare: o número que importa é o seu.

---

## 7. O H e o M

A leitura do H deixa de ter o passo fixo (a lição do passo 3 já foi dada) e mostra:

```text
A drawImage por coluna: 5.60 ms
B ImageData por pixel: 0.34 ms (16.5×)
195×150; agora: 0.55 ms de 16.7
```

A terceira linha é a **média móvel do quadro de verdade** (`msAoVivo`), que muda quando a pose muda. **M**
(ou o botão **Medir**, que também liga a planta para você ver o resultado) repete a medição com a pose e o tamanho de agora: ande até colar o nariz na parede e meça (exercício 5).

---

## Experimente

1. Mude `DISTANCIA_DA_NEVOA` para 4 e depois para 30. O que some e o que continua visível? Mude
   `NIVEIS_DE_NEVOA` para 4: o que aparece na parede, e por que 32 níveis escondem isso?
2. **Quebre de propósito:** em `posicaoNaFace`, troque `espelhar` por `false`. Em quais faces a textura
   sai espelhada? Procure um detalhe assimétrico na textura (o brilho `b` do tijolo) para ver.
3. Desenhe uma textura nova, "musgo", e use-a para a pedra `%`: troque as linhas em `TEXTURAS_EM_TEXTO`.
   Erre uma letra de propósito e leia a mensagem de `verificarTexturas`.
4. Mude `ESCURO_DO_LADO_Y` para `0` e depois para `12`. Ainda dá para distinguir as quinas?
5. Fique de **nariz na parede** e aperte **M**. A e B pioram ou melhoram em relação ao meio do corredor?
   Por quê? (Dica: quantos pixels cada técnica escreve em cada caso?)
6. Em `ajustarVisao`, dobre a resolução para 640×400 (`visao.style.width` cai para metade) e meça de
   novo: o tempo de A e de B cresce em que proporção?
7. **Chão e teto texturizados.** O degradê é barato; o GDD mediu +0,2 a +0,9 ms para texturizar. Para a
   linha `y` abaixo do horizonte, a profundidade do chão é `k / (2 × (y - alturaDaVisao / 2))` (uma parede
   de 1 casa a essa profundidade mede `k / d` pixels, e o chão fica metade disso abaixo do horizonte).
   Com a profundidade e a direção de cada coluna, ache a posição no mapa e escolha o texel. Meça antes e
   depois.
8. Guarde cada textura por **colunas** em vez de linhas (`textura[coluna * 16 + linha]`), já que o laço
   interno anda sempre dentro de uma coluna. Muda a medição? Para quê serve o cache do processador?

---

**Anterior:** [`04-paredes`](../04-paredes/) · **Próximo:** [`06-objetos`](../06-objetos/) — figuras em pé no mundo (sombras e cristais), escondidas pela parede quando estão atrás dela.
