# Passo 5 — Teclado

**Mudou:** `script.js`
**Rode:** abra o `index.html` e use as setas.

---

## O que você vê

O quadrado obedece. Continua fugindo pelas bordas — isso é o passo 8 — mas agora a
direção é sua.

---

## A ideia central: a tecla não move nada

Olhe bem para o desenho da solução:

```
teclado  →  troca a variável `direcao`      (a qualquer instante)
loop     →  anda naquela direção            (a cada 150ms, no seu ritmo)
```

A função do teclado **não** mexe na posição. Ela só troca uma palavra guardada numa
variável. Quem anda é o loop.

Por que não mover direto na tecla? Porque aí martelar a seta faria o quadrado disparar, e
segurar a tecla faria ele voar. O jogo perderia o compasso.

> **O jogo tem o próprio ritmo; a entrada do jogador só o influencia.** Essa separação
> entre *ler a intenção* e *aplicar a intenção* aparece em praticamente todo jogo.

---

## Conceitos deste passo

### Programação orientada a eventos

Seu código não roda do início ao fim e acaba. Ele **registra interesse** em algo e fica
esperando:

```js
document.addEventListener("keydown", responderAoTeclado);
```

Lê-se: *documento, quando uma tecla for pressionada, chame esta função*.

Depois dessa linha, o arquivo termina — mas o programa não. Ele fica vivo, esperando. Os
dois motores do seu jogo agora são o `setInterval` (tempo) e o `addEventListener`
(teclado), e nenhum dos dois está "dentro" do fluxo principal.

### O objeto de evento

O navegador chama a sua função e **entrega um objeto** com os detalhes do que aconteceu:

```js
function responderAoTeclado(evento) {
    evento.key   // "ArrowUp", "a", " ", "Enter"...
}
```

Não decore nomes de tecla. Ponha `console.log(evento.key)` na função, abra o F12 e
martele o teclado — os nomes aparecem.

Cuidado com uma pegadinha: `evento.key` respeita o Shift. A tecla A pressionada com
Shift devolve `"A"`, sem Shift devolve `"a"`. Se você quiser aceitar as duas,
`evento.key.toLowerCase()`.

### `preventDefault()`

Toda tecla e todo clique já **fazem** alguma coisa no navegador antes de o seu código
opinar: as setas rolam a página, o espaço rola uma tela inteira, `Ctrl+S` abre "salvar
como". `evento.preventDefault()` cancela essa reação.

Repare **onde** ele está: na última linha, depois do `switch`. Só as quatro setas chegam
até lá, porque todo o resto sai no `default: return`.

Isso é de propósito. Cancelar o padrão de todas as teclas quebraria F5, Ctrl+C e a
navegação por Tab — e você teria escrito um site que prende o usuário. **Cancele o
comportamento do navegador só onde você realmente vai substituí-lo.**

### `switch` e o `break` que falta

```js
switch (direcao) {
    case "cima":  cabeca.linha -= 1;  break;
    case "baixo": cabeca.linha += 1;  break;
}
```

Sem o `break`, a execução **escorrega** para o caso seguinte e executa também. Se um
`switch` seu fizer duas coisas ao mesmo tempo, é isso.

### Texto em vez de número

`direcao` guarda `"cima"`, não `0`. Um número seria mais "eficiente" — e ninguém, nem
você daqui a um mês, saberia o que `direcao === 2` significa sem ir procurar.

> **Prefira o valor que se explica sozinho.** O computador não liga; o leitor liga. E o
> leitor é quase sempre você mesmo, mais tarde, sem contexto.

### Um limite que você vai sentir

Este método guarda **qual foi a última tecla apertada**. Ele não sabe responder *"a seta
para cima está pressionada agora?"*, nem lidar com duas teclas ao mesmo tempo.

Para a cobrinha isso basta, e é por isso que fizemos assim. Mas guarde a limitação: um
jogo com dois jogadores no mesmo teclado, ou com um objeto que se move enquanto a tecla
está segurada, precisa de outra abordagem — um objeto que registra `keydown` e `keyup` e
responde "esta tecla está presa neste instante?".

Quando esse dia chegar, você vai lembrar que o problema não é o seu código: é o modelo.

---

## Experimente

1. Ponha `console.log(evento.key)` na primeira linha de `responderAoTeclado`, abra o F12 →
   Console e aperte várias teclas. Você acabou de descobrir como se investiga qualquer
   evento.
2. Segure a seta para baixo. Repare que o quadrado **não** acelera: o loop tem o próprio
   ritmo. Agora imagine que a tecla movesse direto e entenda por que não fizemos assim.
3. Ande para a direita e aperte a seta esquerda. Ele vira 180° na hora. Numa cobra de
   verdade isso é morte instantânea, e o passo 6 vai precisar tratar disso.
4. Apague um `break` do `switch` do teclado e veja o resultado esquisito.
5. Comente o `evento.preventDefault()`, deixe a janela pequena o suficiente para ter
   barra de rolagem, e use as setas: a página rola junto com o jogo.
6. Adicione W, A, S, D como alternativa às setas.

---

**Anterior:** `04-movimento` · **Próximo:** `06-cobra` — de um quadrado para uma cobra.
