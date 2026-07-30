/*
  ============================================================
  XADREZ — PASSO 7: O COMPUTADOR QUE PENSA
  ============================================================

  Como uma máquina joga xadrez? Não por intuição. Por força bruta
  organizada, e o método cabe em duas ideias:

  1. AVALIAR uma posição com um número.
     "+300" quer dizer "quem tem a vez está um cavalo à frente".

  2. OLHAR À FRENTE, alternando os lados.
     Eu jogo o meu melhor lance, você joga o seu melhor, e assim por
     diante até certa profundidade. Isso é o MINIMAX.

  Neste passo a busca é a mais simples possível: ela examina TODAS as
  linhas, sem exceção. Funciona — e é lenta de um jeito que você vai
  sentir na pele. Isso é de propósito: o passo 8 mostra como cortar mais
  de 90% do trabalho sem mudar uma vírgula do resultado.

  > Vale entender o problema antes de aplicar a solução. Uma otimização
  > que você não sentiu falta é uma otimização que você não entende.
*/


// ============================================================
// 1. QUANTO VALE CADA PEÇA
// ============================================================
/*
  Em centésimos de peão ("centipeões"), a unidade tradicional do xadrez
  por computador. Trabalhar com inteiros evita erros de arredondamento.

  Os números são os clássicos, achados por décadas de prática: o bispo
  vale um tiquinho mais que o cavalo, e três peças menores valem mais que
  uma dama.
*/
const VALOR_DA_PECA = {
    peao: 100,
    cavalo: 320,
    bispo: 330,
    torre: 500,
    dama: 900,
    rei: 20000
};

const PONTUACAO_DE_MATE = 100000;


// ============================================================
// 2. AVALIAR UMA POSIÇÃO
// ============================================================
/*
  Devolve um número POSITIVO quando quem tem a vez está melhor.

  Essa convenção — sempre do ponto de vista de quem joga — é o que
  permite escrever a busca UMA VEZ, em vez de um código para as brancas e
  outro para as pretas. Chama-se negamax, e toda a mágica está numa troca
  de sinal, mais abaixo.

  Por enquanto só contamos material. O computador vai jogar como alguém
  que sabe as regras e não sabe estratégia: ele não faz ideia de que um
  cavalo no centro vale mais que um no canto. O passo 8 conserta isso.
*/
function avaliar(estado) {
    let pontuacao = 0;

    for (const peca of estado.casas) {
        if (peca === null) {
            continue;
        }

        const valor = VALOR_DA_PECA[peca.tipo];
        pontuacao += peca.cor === estado.vezDe ? valor : -valor;
    }

    return pontuacao;
}


// ============================================================
// 3. A BUSCA — minimax puro
// ============================================================
/*
  NEGAMAX. Em vez de escrever "maximizar para as brancas, minimizar para
  as pretas", escrevemos uma função só e invertemos o sinal a cada nível:

      a minha melhor nota = -(a melhor nota do adversário)

  É a mesma ideia de uma balança: o que pesa a favor de um lado pesa
  contra o outro, exatamente na mesma medida.

  O CUSTO: esta função examina TODAS as linhas possíveis. Na posição
  inicial são cerca de 20 lances; a cada nível, multiplique por 20 de
  novo. Profundidade 4 já passa de 190 mil posições — e você vai esperar
  por elas.
*/
function buscar(estado, profundidade) {
    const movimentos = gerarMovimentosLegais(estado);

    /*
      Sem movimentos: ou é mate, ou é afogamento (que vale 0, empate).

      O "+ profundidade" no mate faz o computador preferir MATAR EM MENOS
      LANCES — e, quando está perdendo, adiar o mate o máximo possível.
      Sem esse ajuste ele acha que todos os mates valem igual e fica
      empurrando o rei pelo tabuleiro sem concluir.
    */
    if (movimentos.length === 0) {
        return estaEmXeque(estado, estado.vezDe)
            ? -PONTUACAO_DE_MATE + profundidade
            : 0;
    }

    if (profundidade === 0) {
        return avaliar(estado);
    }

    let melhorNota = -Infinity;

    for (const movimento of movimentos) {
        const posicaoSeguinte = aplicarMovimento(estado, movimento);

        // Sinal invertido: o que é bom para o adversário é ruim para mim.
        const nota = -buscar(posicaoSeguinte, profundidade - 1);

        if (nota > melhorNota) {
            melhorNota = nota;
        }
    }

    return melhorNota;
}


// ============================================================
// 4. ESCOLHER O LANCE
// ============================================================
/*
  A camada de cima da busca: percorre os lances e guarda o melhor. É
  separada de `buscar` porque aqui precisamos do MOVIMENTO, não só da
  nota.

  `margemDeAcaso` permite escolher entre lances quase equivalentes, para
  o computador não jogar exatamente a mesma partida toda vez. No nível
  fácil a margem é grande — e é isso que o torna humanamente imperfeito,
  em vez de só lento.
*/
function escolherMovimentoDoComputador(estado, profundidade, margemDeAcaso = 0) {
    const movimentos = gerarMovimentosLegais(estado);

    if (movimentos.length === 0) {
        return null;
    }

    const avaliados = movimentos.map(movimento => ({
        movimento,
        nota: -buscar(aplicarMovimento(estado, movimento), profundidade - 1)
    }));

    const melhorNota = Math.max(...avaliados.map(item => item.nota));
    const aceitaveis = avaliados.filter(item => item.nota >= melhorNota - margemDeAcaso);

    return aceitaveis[Math.floor(Math.random() * aceitaveis.length)].movimento;
}


/*
  Níveis de dificuldade.

  Repare que "difícil" para aqui na profundidade 3. Com esta busca sem
  poda, a profundidade 4 leva vários segundos por lance — tempo demais
  para uma página travada. É exatamente essa limitação que o passo 8
  remove.
*/
const NIVEIS = {
    facil: { profundidade: 1, margemDeAcaso: 120 },
    medio: { profundidade: 2, margemDeAcaso: 40 },
    dificil: { profundidade: 3, margemDeAcaso: 0 }
};


if (typeof module !== "undefined") {
    module.exports = { avaliar, buscar, escolherMovimentoDoComputador, NIVEIS, VALOR_DA_PECA };
}
