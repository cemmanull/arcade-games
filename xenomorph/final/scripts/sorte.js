/*
  ============================================================
  XENOMORPH — SORTE COM SEMENTE
  ============================================================

  O gerador pseudoaleatório (mulberry32), o hash que transforma a semente
  em número, os fluxos independentes por sistema e os sorteios de sempre
  (escolher, escolher com pesos). Nenhum Math.random decide o planeta.
*/


// ============================================================
// SORTE COM SEMENTE
// ============================================================
/*
  Math.random() não serve para gerar o mundo: ele não aceita semente, e
  cada chamada dá um número que ninguém consegue repetir. Aqui entra um
  GERADOR PSEUDOALEATÓRIO: uma conta que, a partir de um número inicial
  (a semente), produz uma sequência que PARECE aleatória — mas que é
  sempre a mesma para a mesma semente.

  O texto vira número com um HASH (FNV-1a): mistura os códigos das letras
  de um jeito que textos parecidos ("XENO1" e "XENO2") dão números muito
  diferentes.

  Math.imul multiplica como um processador de 32 bits; ">>> 0" mantém o
  resultado como inteiro sem sinal. As constantes são as do algoritmo — não
  há nada a entender nelas além de "foram escolhidas porque misturam bem".
*/
function hashDeTexto(texto) {
    let hash = 2166136261;

    for (const caractere of texto) {
        hash ^= caractere.codePointAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

/*
  O mulberry32: uma função que guarda um número e, a cada chamada, o
  embaralha e devolve um decimal entre 0 e 1 — como Math.random(), mas
  repetível. O estado mora numa CLAUSURA: a função devolvida lembra do
  `estado` mesmo depois de criarSorteador ter terminado.
*/
function criarSorteador(numero) {
    let estado = numero >>> 0;

    return function sortear() {
        estado = (estado + 0x6D2B79F5) >>> 0;
        let t = estado;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/*
  FLUXOS INDEPENDENTES (GDD, seção 13).

  Se o mapa, as criaturas e os itens tirassem números do MESMO sorteador,
  acrescentar um item a uma sala consumiria um número a mais — e todas as
  criaturas sorteadas depois mudariam. Mexer num sistema bagunçaria os
  outros.

  Por isso cada sistema tem o seu fluxo, nascido da semente junto com o
  NOME do sistema: "XENO:mapa", "XENO:criaturas", "XENO:itens". Mudar a
  chance dos itens não move nenhuma criatura nem nenhuma sala.
*/
function criarFluxo(semente, nomeDoSistema) {
    return criarSorteador(hashDeTexto(`${semente}:${nomeDoSistema}`));
}

// As três perguntas que todo sorteio faz, sempre por cima de um sorteador.
function escolher(sortear, lista) {
    return lista[Math.floor(sortear() * lista.length)];
}

function escolherPonderado(sortear, pesos) {
    const total = Object.values(pesos).reduce((soma, peso) => soma + peso, 0);
    let sorteado = sortear() * total;

    for (const [opcao, peso] of Object.entries(pesos)) {
        sorteado -= peso;
        if (sorteado < 0) {
            return opcao;
        }
    }
    return Object.keys(pesos)[0];
}

/*
  Uma semente nova, para quem não digitou nenhuma. É o ÚNICO lugar do
  gerador onde Math.random aparece: ele escolhe a semente, e a partir dela
  tudo é repetível. Letras e números sem os que se confundem (0 e O, 1 e I).
*/
function sortearSemente() {
    const simbolos = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let semente = "";

    for (let i = 0; i < 6; i++) {
        semente += simbolos[Math.floor(Math.random() * simbolos.length)];
    }
    return semente;
}
