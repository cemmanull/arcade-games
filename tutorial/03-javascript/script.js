/*
  LIÇÃO 3 — JAVASCRIPT (a linguagem)

  Abra o Console (F12) e acompanhe. Cada seção imprime o que explica.

  Comentários em JavaScript: duas barras comentam até o fim da linha;
  barra-asterisco abre um bloco, que vai até o asterisco-barra — como este.
  (Blocos não podem ser aninhados: o primeiro fechamento encerra tudo.)

  Nesta lição o JavaScript não toca na página — isso é a lição 4.
  Aqui interessa a linguagem em si: valores, decisões, repetição e funções.
*/


// ============================================================
// 1. VARIÁVEIS — guardar um valor com um nome
// ============================================================
console.log("=== 1. VARIÁVEIS ===");

/*
  Duas palavras para declarar:

      const -> não pode ser reatribuída
      let   -> pode

  Existe uma terceira, `var`, de antes de 2015. Ela tem regras de escopo
  confusas e foi substituída. Você vai encontrá-la em código antigo;
  não escreva mais.

  REGRA: use const por padrão. Troque para let só quando o valor precisar
  mudar de verdade. Assim quem lê o código sabe de relance o que fica parado —
  e o que fica parado é onde não pode haver bug.
*/
const nome = "Maria";
let idade = 30;

idade = 31;              // ok: let permite
// nome = "João";        // erro: Assignment to constant variable

console.log(nome, idade);

/*
  NOMES revelam intenção. Nomes bons são a documentação mais barata que existe:

      ruim:  let d = 86400000;
      bom:   const MILISSEGUNDOS_POR_DIA = 86400000;

  Evite abreviar (cfg, tmp, val, x2). Você economiza três letras hoje e
  paga com minutos de decifração toda vez que reler.
*/


// ============================================================
// 2. TIPOS DE VALOR
// ============================================================
console.log("=== 2. TIPOS ===");

const texto = "uma string";      // texto, entre aspas simples, duplas ou crases
const numero = 42;               // não existe int/float separados: tudo é number
const decimal = 3.14;
const verdadeiro = true;         // boolean: só true ou false
const nada = null;               // "vazio de propósito"
let indefinido;                  // declarado mas nunca preenchido: undefined

console.log(typeof texto, typeof numero, typeof verdadeiro);
console.log("null:", nada, "| undefined:", indefinido);

/*
  null vs undefined — a distinção importa na hora de depurar:

      undefined -> ninguém pôs valor aqui (esquecimento ou ainda não chegou)
      null      -> alguém pôs "vazio" de propósito

  Quando um erro seu falar em undefined, a pergunta é sempre a mesma:
  quem deveria ter preenchido isso, e rodou antes?
*/

// STRINGS
const primeiro = "Ana";
const ultimo = "Silva";

console.log(primeiro + " " + ultimo);          // concatenação: funciona
console.log(`${primeiro} ${ultimo}`);          // template string: melhor

/*
  As crases (`) criam um TEMPLATE STRING, onde ${...} insere qualquer valor
  no meio do texto. Ela também aceita quebras de linha de verdade.
  Prefira sempre — some com a poluição de aspas e sinais de +.
*/
console.log(`${primeiro} tem ${idade} anos e ${primeiro.length} letras no nome.`);
console.log(primeiro.toUpperCase(), ultimo.toLowerCase());
console.log("  espaços  ".trim());
console.log("a,b,c".split(","));               // vira uma lista
console.log("banana".includes("nan"));         // true


// ============================================================
// 3. OPERADORES
// ============================================================
console.log("=== 3. OPERADORES ===");

console.log(7 + 2, 7 - 2, 7 * 2, 7 / 2);
console.log(7 % 2);      // RESTO da divisão: 1
console.log(2 ** 10);    // potência: 1024

/*
  O % (resto) é muito mais útil do que parece:
      par ou ímpar     -> numero % 2 === 0
      dar a volta      -> (indice + 1) % tamanho   (volta a 0 no fim)
      a cada 5 vezes   -> contador % 5 === 0
*/
console.log("8 é par?", 8 % 2 === 0);

let contador = 0;
contador += 5;   // atalho para contador = contador + 5
contador++;      // atalho para contador = contador + 1
console.log(contador);

/*
  COMPARAÇÃO — use sempre === e !== (três caracteres).

  Os de dois (== e !=) convertem os tipos por conta própria e produzem
  surpresas: "5" == 5 é true, 0 == "" é true, null == undefined é true.
  Não há motivo para usá-los.
*/
console.log(5 === 5, "5" === 5, "5" == 5);
console.log(5 > 3, 5 <= 3, 5 !== 3);

// LÓGICOS: && (e), || (ou), ! (não)
console.log(true && false, true || false, !true);

/*
  VALORES "FALSY" — os que contam como false num if:
      false, 0, "" (string vazia), null, undefined, NaN
  TODO o resto é "truthy", inclusive "0", [] e {}.

  Isso permite escrever `if (nome)` em vez de `if (nome !== "")`, mas
  também esconde uma armadilha: `if (quantidade)` é falso quando a
  quantidade é zero, o que raramente é o que você queria dizer.
*/
console.log(Boolean(0), Boolean(""), Boolean([]), Boolean("0"));


// ============================================================
// 4. CONDICIONAIS — decidir
// ============================================================
console.log("=== 4. CONDICIONAIS ===");

const nota = 7.5;

if (nota >= 9) {
    console.log("Excelente");
} else if (nota >= 6) {
    console.log("Aprovado");
} else {
    console.log("Reprovado");
}

// Operador ternário: um if curto que DEVOLVE um valor
const situacao = nota >= 6 ? "aprovado" : "reprovado";
console.log(`Situação: ${situacao}`);

/*
  Ternário é ótimo para escolher entre dois valores.
  Se você sentir vontade de encadear vários, use if — ninguém consegue ler
  três ternários aninhados, nem quem os escreveu.
*/

// switch: quando há muitos casos para a MESMA variável
const dia = 3;

switch (dia) {
    case 1: console.log("Domingo"); break;
    case 2: console.log("Segunda"); break;
    case 3: console.log("Terça"); break;
    default: console.log("Outro dia");
}
/*
  Cuidado com o `break`: sem ele, a execução ESCORREGA para o caso seguinte
  e executa também. É um erro difícil de enxergar, porque o código parece
  certo. Se um switch seu fizer duas coisas, procure o break que falta.
*/


// ============================================================
// 5. ARRAYS — listas ordenadas
// ============================================================
console.log("=== 5. ARRAYS ===");

const numeros = [10, 20, 30, 40, 50];

console.log(numeros[0]);                    // 10 — a contagem começa em ZERO
console.log(numeros[numeros.length - 1]);   // 50 — o último
console.log(numeros.length);                // 5

/*
  A contagem começar em zero é a fonte do erro mais comum da programação:
  o "off-by-one". Numa lista de 5 itens, os índices válidos vão de 0 a 4.
  Sempre que houver um limite, pergunte: o último valor entra ou não entra?
*/

// Adicionar e remover
const fila = ["a", "b", "c"];
fila.push("d");       // adiciona no FIM
fila.pop();           // remove do FIM
fila.unshift("z");    // adiciona no INÍCIO
fila.shift();         // remove do INÍCIO
console.log(fila);

/*
  MÉTODOS QUE PERCORREM — a parte mais útil da linguagem.
  Repare que nenhum deles precisa de contador nem de condição de parada:
  é aí que moram os erros de um `for` escrito à mão.
*/
console.log(numeros.map(n => n * 2));            // transforma cada um
console.log(numeros.filter(n => n > 25));        // fica só com quem passa
console.log(numeros.find(n => n > 25));          // o PRIMEIRO que passa
console.log(numeros.some(n => n > 45));          // existe algum? true/false
console.log(numeros.every(n => n > 5));          // todos passam? true/false
console.log(numeros.reduce((soma, n) => soma + n, 0));  // acumula num só valor
console.log(numeros.includes(30));               // contém?
console.log(numeros.indexOf(30));                // em que posição?
console.log(numeros.slice(1, 3));                // pedaço: do 1 até antes do 3
console.log([...numeros].reverse());             // de trás para frente

/*
  Aquele `n => n * 2` é uma ARROW FUNCTION: uma função curta, sem nome.
  Leia como "dado um n, devolva n * 2".

      n => n * 2
      é o mesmo que
      function (n) { return n * 2; }

  Quando o corpo é uma expressão só, o `return` é implícito.
*/

// ATENÇÃO: reverse() e sort() alteram o array original.
// Por isso o [...numeros] acima: as reticências fazem uma cópia antes.
const copia = [...numeros];
copia.sort((a, b) => b - a);   // decrescente
console.log("original intacto:", numeros);
console.log("cópia ordenada:", copia);


// ============================================================
// 6. OBJETOS — valores com nome
// ============================================================
console.log("=== 6. OBJETOS ===");

const pessoa = {
    nome: "Ana",
    idade: 28,
    cidade: "Recife",
    falar: function () {              // um objeto pode conter funções
        return `Oi, sou ${this.nome}`;
    }
};

console.log(pessoa.nome);       // notação de ponto: o jeito normal
console.log(pessoa["idade"]);   // notação de colchete: quando a chave é variável
console.log(pessoa.falar());

pessoa.profissao = "engenheira";  // criar uma propriedade nova
delete pessoa.cidade;             // remover
console.log(pessoa);

console.log(Object.keys(pessoa));     // lista das chaves
console.log(Object.values(pessoa));   // lista dos valores

/*
  ARRAY DE OBJETOS — a estrutura mais comum de todas.
  É o formato de qualquer lista de coisas do mundo real: produtos, usuários,
  mensagens, peças de um jogo. Praticamente todo dado que chega de um
  servidor vem assim.
*/
const time = [
    { nome: "Ana", pontos: 30 },
    { nome: "Beto", pontos: 12 },
    { nome: "Cadu", pontos: 45 }
];

console.log(time.filter(jogador => jogador.pontos > 20));
console.log(time.map(jogador => jogador.nome));
console.log(time.reduce((total, jogador) => total + jogador.pontos, 0));

/*
  ARMADILHA IMPORTANTE — objetos são compartilhados por REFERÊNCIA.

  Atribuir um objeto não o copia: os dois nomes passam a apontar para o
  MESMO objeto na memória. Mudar por um lado muda pelo outro.
*/
const original = { valor: 1 };
const apelido = original;      // NÃO é uma cópia
apelido.valor = 999;
console.log("original virou:", original.valor);   // 999

const copiaDeVerdade = { ...original };   // as reticências copiam
copiaDeVerdade.valor = 1;
console.log("agora sim:", original.valor, copiaDeVerdade.valor);  // 999 1

/*
  Essa é a causa de uma parcela enorme dos bugs difíceis de JavaScript:
  o erro acontece em um lugar e aparece em outro. Regra:
  PARA ALTERAR UM OBJETO SEM AFETAR O ORIGINAL, COPIE PRIMEIRO.
*/


// ============================================================
// 7. LAÇOS — repetir
// ============================================================
console.log("=== 7. LAÇOS ===");

// for clássico: quando você precisa do índice
for (let i = 0; i < 3; i++) {
    console.log(`for: ${i}`);
}

// for...of: quando você quer os VALORES (mais legível)
for (const numero of [1, 2, 3]) {
    console.log(`for...of: ${numero}`);
}

// while: quando não se sabe quantas voltas serão
let restante = 3;
while (restante > 0) {
    console.log(`while: ${restante}`);
    restante--;
}

/*
  CUIDADO: se a condição do while nunca ficar falsa, a página TRAVA — o
  navegador congela e você precisa fechar a aba. Antes de rodar um while,
  confira o que faz a condição mudar.
*/


// ============================================================
// 8. FUNÇÕES
// ============================================================
console.log("=== 8. FUNÇÕES ===");

/*
  Uma função é um bloco de código com nome, guardado para ser executado
  quando alguém chamar. Declarar NÃO executa.
*/
function dobrar(numero) {
    return numero * 2;
}

console.log(dobrar(21));

// Parâmetro com valor padrão
function saudacao(quem = "mundo") {
    return `Olá, ${quem}!`;
}

console.log(saudacao());
console.log(saudacao("Ana"));

/*
  DUAS FAMÍLIAS DE FUNÇÃO, e vale saber em qual você está:

    1. as que CALCULAM e devolvem um valor, sem mexer em nada por fora
    2. as que FAZEM algo: alteram uma variável de fora, escrevem na tela

  As da primeira família são muito mais fáceis de entender e testar, porque
  não têm como estragar nada por acidente: mesma entrada, mesma saída,
  sempre. Quando puder escolher, escolha a primeira.
*/

// 1) calcula e devolve — previsível
function somar(a, b) {
    return a + b;
}

// 2) altera algo de fora — mais difícil de prever
let total = 0;
function somarAoTotal(valor) {
    total += valor;
}

console.log(somar(2, 3), somar(2, 3));   // sempre 5
somarAoTotal(5);
somarAoTotal(5);
console.log("total virou:", total);      // depende de quantas vezes chamou

/*
  ESCOPO — onde uma variável existe.
  Uma variável declarada com let/const dentro de { } só existe ali dentro.
*/
function exemploDeEscopo() {
    const interna = "só existo aqui dentro";
    return interna;
}
console.log(exemploDeEscopo());
// console.log(interna);   // erro: interna is not defined

/*
  UMA FUNÇÃO DEVE FAZER UMA COISA SÓ, e o nome deve dizer qual.
  Se você precisa ler o corpo para saber o que ela faz, o nome está ruim.
  Se o nome tem um "e" no meio (salvarEEnviar), provavelmente são duas
  funções disfarçadas de uma.
*/


// ============================================================
// 9. ERROS — como lê-los
// ============================================================
console.log("=== 9. ERROS ===");

/*
  Descomente uma linha por vez, recarregue e leia a mensagem no console:

      // naoExiste();
      // const x = null;  x.propriedade;
      // JSON.parse("isto não é json");

  Um erro traz o TIPO, a MENSAGEM, o ARQUIVO e a LINHA. Leia nessa ordem.
  A linha indicada é onde o erro APARECEU — a causa costuma estar um pouco
  antes, em quem preparou aquele valor.

  Um erro no console não é um castigo: é a única coisa no computador
  tentando te ajudar.
*/

console.log("Fim. Agora digite `pessoa` ou `dobrar(21)` aqui no console.");
