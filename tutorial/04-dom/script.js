/*
  LIÇÃO 4 — DOM

  DOM = Document Object Model.

  Quando a página carrega, o navegador NÃO guarda o seu HTML como texto.
  Ele monta uma ÁRVORE DE OBJETOS VIVOS e a entrega ao JavaScript numa
  variável pronta chamada `document`.

  Alterar esses objetos muda a página na hora, na sua frente.

  Três verbos resolvem quase tudo:

      1. ENCONTRAR um elemento
      2. ALTERAR (texto, estilo, classe, atributo) ou CRIAR
      3. REAGIR a eventos
*/


// ============================================================
// 1. ENCONTRAR
// ============================================================
/*
      document.getElementById("x")       -> UM elemento com id="x"
      document.querySelector(".classe")  -> o PRIMEIRO que casa com o seletor
      document.querySelectorAll("li")    -> TODOS que casam (uma lista)

  querySelector aceita qualquer seletor de CSS — o mesmo que você já
  aprendeu na lição 2. Por isso costuma ser o único de que se precisa.

  Buscamos UMA VEZ e guardamos em constantes. Buscar de novo dentro de uma
  função chamada com frequência é procurar a mesma coisa na árvore inteira,
  repetidamente, à toa.
*/
const contador = document.getElementById("contador");
const botaoSomar = document.getElementById("botao-somar");
const botaoZerar = document.getElementById("botao-zerar");

const alvoEstilo = document.getElementById("alvo-estilo");
const botaoClasse = document.getElementById("botao-classe");
const botaoCor = document.getElementById("botao-cor");

const segredo = document.getElementById("segredo");
const botaoSegredo = document.getElementById("botao-segredo");

const formulario = document.getElementById("formulario");
const campoItem = document.getElementById("campo-item");
const lista = document.getElementById("lista");
const contagemItens = document.getElementById("contagem-itens");

const campoEspelho = document.getElementById("campo-espelho");
const espelho = document.getElementById("espelho");
const controleTamanho = document.getElementById("controle-tamanho");
const valorTamanho = document.getElementById("valor-tamanho");
const areaMouse = document.getElementById("area-mouse");
const ultimaTecla = document.getElementById("ultima-tecla");


// ============================================================
// 2. LER E ESCREVER TEXTO
// ============================================================
/*
  PRINCÍPIO CENTRAL DESTA LIÇÃO:

      o estado REAL mora numa variável do JavaScript
      o DOM é só o ESPELHO dele

  A contagem vive em `valorDoContador`. O <strong> na página apenas mostra.
  Nunca leia o número de volta da tela para fazer contas: no momento em que
  você trata a tela como fonte de verdade, o programa passa a depender de
  como as coisas estão escritas — e quebra quando alguém escrever "Pontos: 3"
  em vez de "3".
*/
let valorDoContador = 0;

function mostrarContador() {
    // textContent troca o texto de dentro do elemento.
    contador.textContent = valorDoContador;
}

botaoSomar.addEventListener("click", () => {
    valorDoContador += 1;    // 1) muda o estado
    mostrarContador();       // 2) atualiza o espelho
});

botaoZerar.addEventListener("click", () => {
    valorDoContador = 0;
    mostrarContador();
});

/*
  textContent x innerHTML

      textContent -> trata tudo como TEXTO puro
      innerHTML   -> INTERPRETA tags HTML

  Use textContent. Se o conteúdo vier de um usuário, innerHTML transforma a
  sua página numa porta de entrada para código de outra pessoa (isso tem
  nome: XSS). Só use innerHTML quando você mesmo escreveu o HTML e tem
  certeza de que não há nada de fora ali dentro.
*/


// ============================================================
// 3. MUDAR O ESTILO
// ============================================================
/*
  DUAS FORMAS, e uma delas é quase sempre melhor:

      elemento.classList.add("destaque")   -> liga uma classe do CSS
      elemento.style.color = "red"         -> escreve estilo direto no elemento

  Prefira classList. O CSS continua no arquivo de CSS, onde é fácil de achar
  e de mudar; o JavaScript só decide QUANDO aplicar. Escrever estilo pelo
  `style` espalha aparência pelo código e cria uma regra tão específica que
  o CSS não consegue mais sobrescrever.

  Use `style` só para valores que são calculados de verdade — uma posição,
  uma cor sorteada, uma largura que depende de um número.
*/
botaoClasse.addEventListener("click", () => {
    /*
      classList.toggle liga se estiver desligado e desliga se estiver ligado.
      Existem também: add, remove e contains.
    */
    alvoEstilo.classList.toggle("destaque");
});

botaoCor.addEventListener("click", () => {
    // Aqui o style se justifica: a cor é calculada, não existe no CSS.
    const matiz = Math.floor(Math.random() * 360);
    alvoEstilo.style.color = `hsl(${matiz}, 70%, 45%)`;
    /*
      hsl(matiz, saturação, luminosidade) é bem mais fácil de manipular por
      código do que hexadecimal: para variar a cor, basta girar um número
      de 0 a 360.
    */
});


// ============================================================
// 4. MOSTRAR E ESCONDER
// ============================================================
/*
  A forma mais simples é o atributo `hidden`, que já existe no HTML.
  Mostrar algo que já está na página é mais simples do que criar do zero.

  Cuidado com uma pegadinha: `hidden` funciona porque o navegador aplica
  display:none. Se o seu CSS definir um display para esse elemento (flex,
  grid...), a sua regra é mais específica e VENCE — o elemento aparece
  mesmo "escondido". A solução é escrever também:

      #meu-elemento[hidden] { display: none; }
*/
botaoSegredo.addEventListener("click", () => {
    segredo.hidden = !segredo.hidden;   // inverte: true vira false e vice-versa
});


// ============================================================
// 5. CRIAR E REMOVER ELEMENTOS
// ============================================================
/*
  Criar um elemento tem três passos, e esquecer o terceiro é clássico:

      1. document.createElement("li")   -> cria (ainda solto, invisível)
      2. definir texto, classes, etc.
      3. algumPai.appendChild(...)      -> ENCAIXA na árvore

  Enquanto não for encaixado, o elemento existe na memória mas não aparece
  em lugar nenhum.
*/
const itens = [];   // o estado real: uma lista de textos

function adicionarItem(texto) {
    itens.push(texto);
    desenharLista();
}

function removerItem(indice) {
    itens.splice(indice, 1);   // remove 1 item a partir daquela posição
    desenharLista();
}

/*
  REDESENHAR TUDO A PARTIR DO ESTADO.

  Esta função apaga a lista inteira e a reconstrói do zero, toda vez.
  Parece desperdício — e é a abordagem certa aqui:

      - a tela NUNCA fica dessincronizada dos dados;
      - não existe "atualizar só o item 3", que é onde nascem os bugs.

  É a mesma ideia do canvas nos jogos: apagar e repintar. E é, em essência,
  o que bibliotecas como React fazem por baixo — com otimizações para não
  refazer o que não mudou.
*/
function desenharLista() {
    lista.textContent = "";   // esvazia (some com todos os filhos)

    itens.forEach((texto, indice) => {
        const item = document.createElement("li");
        item.textContent = texto;

        const botaoRemover = document.createElement("button");
        botaoRemover.textContent = "remover";
        botaoRemover.type = "button";
        botaoRemover.className = "botao-pequeno";

        /*
          Cada botão criado ganha o próprio ouvinte, que "lembra" do seu
          indice. Isso funciona porque a função de dentro tem acesso às
          variáveis do lugar onde foi criada — o que se chama CLOSURE.
        */
        botaoRemover.addEventListener("click", () => removerItem(indice));

        item.appendChild(botaoRemover);   // o botão vira filho do <li>
        lista.appendChild(item);          // o <li> vira filho da <ul>
    });

    contagemItens.textContent = itens.length === 0
        ? "Nenhum item ainda."
        : `${itens.length} item(ns).`;
}


// ============================================================
// 6. FORMULÁRIOS
// ============================================================
/*
  O evento "submit" dispara quando o formulário é enviado — pelo botão OU
  pela tecla Enter dentro de um campo. Ouvir o submit (em vez do clique do
  botão) faz as duas formas funcionarem de graça.

  preventDefault() é OBRIGATÓRIO aqui: o comportamento padrão de um
  formulário é recarregar a página. Sem essa linha, tudo o que o seu
  JavaScript fez desaparece num piscar.
*/
formulario.addEventListener("submit", evento => {
    evento.preventDefault();

    const texto = campoItem.value.trim();   // .value lê o que está no campo

    // Guarda: não adiciona vazio.
    if (texto === "") {
        return;
    }

    adicionarItem(texto);
    campoItem.value = "";    // limpa o campo
    campoItem.focus();       // devolve o cursor: quem digita não quer usar o mouse
});


// ============================================================
// 7. OUTROS EVENTOS
// ============================================================
/*
  Os eventos mais usados:

      click     clique
      input     a cada caractere digitado / arrastar do range
      change    quando o campo perde o foco com valor alterado
      submit    envio de formulário
      keydown   tecla pressionada
      mousemove movimento do mouse
      load      a página terminou de carregar

  "input" dispara a cada tecla; "change" só no fim. Para respostas ao vivo,
  use input.
*/
campoEspelho.addEventListener("input", () => {
    espelho.textContent = campoEspelho.value || "(nada)";
    /*
      O || devolve o segundo valor quando o primeiro é "falsy" — e string
      vazia é falsy. É um jeito curto de dizer "isto, ou aquilo se estiver
      vazio". Cuidado com números: 0 também é falsy.
    */
});

controleTamanho.addEventListener("input", () => {
    /*
      ATENÇÃO: .value é SEMPRE uma string, mesmo em type="number" ou "range".
      Sem converter, "16" + 1 daria "161" em vez de 17.
      Number(...) converte.
    */
    const tamanho = Number(controleTamanho.value);
    espelho.style.fontSize = `${tamanho}px`;
    valorTamanho.textContent = `${tamanho}px`;
});

areaMouse.addEventListener("mousemove", evento => {
    /*
      O objeto de evento traz as coordenadas do ponteiro.
      clientX/clientY são relativos à JANELA; para saber a posição dentro
      do elemento, descontamos onde o elemento começa.
    */
    const area = areaMouse.getBoundingClientRect();
    const x = Math.round(evento.clientX - area.left);
    const y = Math.round(evento.clientY - area.top);
    areaMouse.textContent = `x: ${x}  y: ${y}`;
});

areaMouse.addEventListener("mouseleave", () => {
    areaMouse.textContent = "Mova o mouse aqui dentro";
});

document.addEventListener("keydown", evento => {
    ultimaTecla.textContent = evento.key;
});


// ============================================================
// INICIALIZAÇÃO
// ============================================================
/*
  Desenhar o estado inicial. Como o estado começa vazio, isto só escreve
  "Nenhum item ainda" — mas manter uma única função responsável por
  desenhar, chamada também no início, evita ter dois códigos diferentes
  para "a primeira vez" e "as outras vezes".
*/
mostrarContador();
desenharLista();

console.log("A árvore da página:", document.body);
console.log("Todos os botões:", document.querySelectorAll("button"));
console.log("Experimente: document.querySelector('h1').textContent = 'Mudei!'");
