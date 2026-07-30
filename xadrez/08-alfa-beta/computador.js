/*
  ============================================================
  XADREZ — O COMPUTADOR QUE PENSA
  ============================================================

  Como uma máquina "pensa" no xadrez? Não por intuição. Por força bruta
  organizada, apoiada em três ideias:

  1. AVALIAR uma posição com um número.
     "Brancas estão +2.3" = brancas têm vantagem de pouco mais de dois peões.

  2. OLHAR À FRENTE, alternando os lados.
     Eu jogo o meu melhor lance, você joga o seu melhor, e assim por diante
     até certa profundidade. Isso é o MINIMAX: eu maximizo, você minimiza.

  3. PODAR o que não precisa ser olhado.
     Se uma linha já é comprovadamente pior do que outra que eu já tenho,
     não há por que continuar analisando. Isso é a PODA ALFA-BETA, e ela
     costuma cortar mais de 90% do trabalho sem mudar o resultado.

  A profundidade é o botão de dificuldade: olhar 2 lances à frente é um
  iniciante distraído; 4 lances já é um adversário incômodo.
*/


// ============================================================
// 1. QUANTO VALE CADA PEÇA
// ============================================================
/*
  Em centésimos de peão ("centipeões"), a unidade tradicional.
  Trabalhar com inteiros evita os erros de arredondamento de decimais.

  Estes números são os clássicos, encontrados por décadas de prática:
  o bispo vale um tiquinho mais que o cavalo, e três peças menores
  valem mais que uma dama.
*/
const VALOR_DA_PECA = {
    peao: 100,
    cavalo: 320,
    bispo: 330,
    torre: 500,
    dama: 900,
    rei: 20000
};

/*
  TABELAS DE POSIÇÃO (piece-square tables).

  Material sozinho não basta: um cavalo no centro vale mais que um cavalo
  no canto, mesmo sendo a mesma peça. Cada tabela dá um bônus ou uma
  penalidade por casa.

  São 64 números escritos como o tabuleiro é visto — a primeira linha é a
  oitava fileira. Estão do ponto de vista das BRANCAS; para as pretas
  espelhamos com `indice ^ 56`, que inverte a linha e mantém a coluna.

  Repare no que cada tabela ensina, sem nenhuma regra escrita:
    - peões ganham valor conforme avançam;
    - cavalos odeiam as bordas;
    - o rei se esconde no canto durante o meio-jogo...
    - ...e vai para o centro no final, onde vira peça de ataque.
*/
const TABELA_DO_PEAO = [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0
];

const TABELA_DO_CAVALO = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

const TABELA_DO_BISPO = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
];

const TABELA_DA_TORRE = [
     0,  0,  0,  0,  0,  0,  0,  0,
     5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
     0,  0,  0,  5,  5,  0,  0,  0
];

const TABELA_DA_DAMA = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
     -5,  0,  5,  5,  5,  5,  0, -5,
      0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
];

// Meio-jogo: o rei se esconde atrás dos peões, longe do centro.
const TABELA_DO_REI_MEIO_JOGO = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
     20, 20,  0,  0,  0,  0, 20, 20,
     20, 30, 10,  0,  0, 10, 30, 20
];

// Final: sem damas no tabuleiro, o rei vira peça ativa e vai ao centro.
const TABELA_DO_REI_FINAL = [
    -50,-40,-30,-20,-20,-30,-40,-50,
    -30,-20,-10,  0,  0,-10,-20,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 30, 40, 40, 30,-10,-30,
    -30,-10, 20, 30, 30, 20,-10,-30,
    -30,-30,  0,  0,  0,  0,-30,-30,
    -50,-30,-30,-30,-30,-30,-30,-50
];

const TABELAS = {
    peao: TABELA_DO_PEAO,
    cavalo: TABELA_DO_CAVALO,
    bispo: TABELA_DO_BISPO,
    torre: TABELA_DA_TORRE,
    dama: TABELA_DA_DAMA
};

const PONTUACAO_DE_MATE = 100000;


// ============================================================
// 2. AVALIAR UMA POSIÇÃO
// ============================================================
/*
  Devolve um número POSITIVO quando quem tem a vez está melhor.

  Essa convenção — sempre do ponto de vista de quem joga — é o que
  permite escrever a busca uma vez só, em vez de um código para as
  brancas e outro para as pretas. Chama-se negamax, e a mágica está
  numa única troca de sinal, mais adiante.
*/
function avaliar(estado) {
    let pontuacao = 0;
    const ehFinalDePartida = estaNoFinal(estado);

    for (let indice = 0; indice < 64; indice++) {
        const peca = estado.casas[indice];

        if (peca === null) {
            continue;
        }

        // Para as pretas, espelhamos a casa: ^ 56 inverte a linha.
        const casaNaTabela = peca.cor === BRANCAS ? indice : indice ^ 56;

        const tabelaDoRei = ehFinalDePartida
            ? TABELA_DO_REI_FINAL
            : TABELA_DO_REI_MEIO_JOGO;

        const bonusDePosicao = peca.tipo === "rei"
            ? tabelaDoRei[casaNaTabela]
            : TABELAS[peca.tipo][casaNaTabela];

        const valorTotal = VALOR_DA_PECA[peca.tipo] + bonusDePosicao;

        pontuacao += peca.cor === estado.vezDe ? valorTotal : -valorTotal;
    }

    return pontuacao;
}

/*
  Uma definição simples de "final": nenhuma dama no tabuleiro, ou muito
  pouco material restante. Serve para decidir onde o rei deve ficar.
*/
function estaNoFinal(estado) {
    let damas = 0;
    let pecasPesadas = 0;

    for (const peca of estado.casas) {
        if (peca === null) continue;
        if (peca.tipo === "dama") damas += 1;
        if (peca.tipo === "torre" || peca.tipo === "dama") pecasPesadas += 1;
    }

    return damas === 0 || pecasPesadas <= 2;
}


// ============================================================
// 3. ORDENAR OS MOVIMENTOS
// ============================================================
/*
  A poda alfa-beta corta tanto MAIS quanto MELHOR for a ordem em que os
  movimentos são examinados: se o melhor lance é visto primeiro, todos os
  outros são descartados rapidamente.

  Ordenar não muda o resultado da busca — muda quanto tempo ela leva, e a
  diferença é enorme (várias vezes mais rápido). É o melhor retorno por
  linha de código de todo o programa.

  A heurística clássica se chama MVV-LVA: "vítima mais valiosa, agressor
  menos valioso". Capturar uma dama com um peão é a primeira coisa que
  vale a pena examinar.
*/
function ordenarMovimentos(movimentos) {
    return movimentos
        .map(movimento => ({ movimento, nota: notaDeOrdenacao(movimento) }))
        .sort((a, b) => b.nota - a.nota)
        .map(item => item.movimento);
}

function notaDeOrdenacao(movimento) {
    let nota = 0;

    if (movimento.capturada) {
        nota += 10 * VALOR_DA_PECA[movimento.capturada.tipo]
              - VALOR_DA_PECA[movimento.peca.tipo];
    }

    if (movimento.promocao) {
        nota += VALOR_DA_PECA[movimento.promocao];
    }

    return nota;
}


// ============================================================
// 4. A BUSCA — minimax com poda alfa-beta
// ============================================================
/*
  NEGAMAX. Em vez de escrever "maximizar para as brancas, minimizar para
  as pretas", escrevemos uma função só e invertemos o sinal a cada nível:

      minha melhor nota = -(a melhor nota do adversário)

  ALFA e BETA são a janela do que ainda interessa:

      alfa = a melhor nota que EU já garanti até aqui
      beta = a melhor nota que o ADVERSÁRIO já garantiu

  Quando uma linha devolve algo >= beta, ela é boa demais: o adversário
  jamais a permitiria, porque ele já tem uma alternativa melhor um nível
  acima. Podemos parar de analisar imediatamente — isso é o "corte beta",
  e é dele que vem a economia.
*/
function buscar(estado, profundidade, alfa, beta) {
    if (profundidade === 0) {
        return buscarCapturas(estado, alfa, beta);
    }

    const movimentos = ordenarMovimentos(gerarMovimentosLegais(estado));

    /*
      Sem movimentos: ou é mate, ou é afogamento.

      O "+ profundidade" no mate faz o computador preferir MATAR EM MENOS
      LANCES — e, quando está perdendo, adiar o mate o máximo possível.
      Sem esse ajuste ele acha que todos os mates valem igual e fica
      empurrando o rei sem concluir.
    */
    if (movimentos.length === 0) {
        return estaEmXeque(estado, estado.vezDe)
            ? -PONTUACAO_DE_MATE + profundidade
            : 0;
    }

    let melhorNota = -Infinity;

    for (const movimento of movimentos) {
        const posicaoSeguinte = aplicarMovimento(estado, movimento);

        // Sinal invertido: o bom para o adversário é ruim para mim.
        const nota = -buscar(posicaoSeguinte, profundidade - 1, -beta, -alfa);

        if (nota > melhorNota) {
            melhorNota = nota;
        }

        if (melhorNota > alfa) {
            alfa = melhorNota;
        }

        if (alfa >= beta) {
            break;   // corte beta: o adversário nunca deixaria chegar aqui
        }
    }

    return melhorNota;
}

/*
  BUSCA DE CAPTURAS (quiescence search) — o remédio para o "efeito
  horizonte".

  Imagine que a busca acaba exatamente depois de o computador capturar
  uma dama com o peão. Ele conta a dama a mais e comemora — sem enxergar
  que, no lance seguinte, o peão é comido de volta.

  A solução: ao chegar ao fim da profundidade, não pare em uma posição
  "barulhenta". Continue analisando SÓ as capturas, até a poeira baixar.

  Sem isto, um programa de xadrez entrega peças de graça o tempo todo, e
  o motivo é difícil de descobrir. É a diferença entre um adversário
  ridículo e um adversário decente.
*/
function buscarCapturas(estado, alfa, beta) {
    /*
      "Nota de repouso": o valor de simplesmente não capturar mais nada.
      Serve de piso — ninguém é obrigado a continuar trocando peças.
    */
    const notaEmRepouso = avaliar(estado);

    if (notaEmRepouso >= beta) {
        return notaEmRepouso;
    }

    if (notaEmRepouso > alfa) {
        alfa = notaEmRepouso;
    }

    const capturas = ordenarMovimentos(
        gerarMovimentosLegais(estado).filter(movimento => movimento.capturada)
    );

    let melhorNota = notaEmRepouso;

    for (const captura of capturas) {
        const nota = -buscarCapturas(aplicarMovimento(estado, captura), -beta, -alfa);

        if (nota > melhorNota) {
            melhorNota = nota;
        }

        if (nota > alfa) {
            alfa = nota;
        }

        if (alfa >= beta) {
            break;
        }
    }

    /*
      Devolvemos a melhor nota encontrada, e não o limite `beta`.
      Chama-se "fail-soft": carrega mais informação do que o mínimo
      necessário, e mantém esta função consistente com `buscar`.
    */
    return melhorNota;
}


// ============================================================
// 5. ESCOLHER O LANCE
// ============================================================
/*
  A camada de cima da busca: percorre os lances possíveis e guarda o
  melhor. É separada de `buscar` porque aqui precisamos do MOVIMENTO,
  não só da nota.

  `margemDeAcaso` permite escolher entre lances quase equivalentes, para
  que o computador não jogue exatamente a mesma partida toda vez. No
  nível fácil a margem é grande — e é isso que o torna humanamente
  imperfeito, em vez de só lento.
*/
function escolherMovimentoDoComputador(estado, profundidade, margemDeAcaso = 0) {
    const movimentos = ordenarMovimentos(gerarMovimentosLegais(estado));

    if (movimentos.length === 0) {
        return null;
    }

    /*
      ATENÇÃO — a raiz usa a JANELA COMPLETA (-Infinito, +Infinito) para
      cada lance, e isso é de propósito.

      Seria tentador estreitar a janela aqui também, aproveitando o melhor
      valor já encontrado — é o que se faz nos níveis de baixo. Mas há uma
      armadilha sutil: quando a poda corta uma linha, o valor devolvido não
      é a nota real, e sim um LIMITE ("é pelo menos isto"). Limites servem
      para decidir se vale a pena continuar, e não para comparar lances
      entre si.

      Estreitando a janela, todos os lances ruins voltariam com exatamente
      o mesmo número — o limite — e empatariam com o melhor. O computador
      então escolheria qualquer um, jogando lances absurdos e deixando
      peças de graça. É um bug clássico de quem implementa alfa-beta pela
      primeira vez, e o mais traiçoeiro deles: a busca está certa, a
      avaliação está certa, e mesmo assim a escolha sai errada.

      Aqui precisamos de notas comparáveis entre si — inclusive para a
      margem de acaso funcionar. Pagamos um pouco de velocidade no primeiro
      nível; a poda continua trabalhando normalmente dentro de cada linha.
    */
    const avaliados = movimentos.map(movimento => ({
        movimento,
        nota: -buscar(
            aplicarMovimento(estado, movimento),
            profundidade - 1,
            -Infinity,
            Infinity
        )
    }));

    const melhorNota = Math.max(...avaliados.map(item => item.nota));
    const aceitaveis = avaliados.filter(item => item.nota >= melhorNota - margemDeAcaso);

    const escolhido = aceitaveis[Math.floor(Math.random() * aceitaveis.length)];
    return escolhido.movimento;
}


/*
  Níveis de dificuldade. Profundidade é o quanto ele enxerga à frente;
  a margem de acaso é o quanto ele topa jogar algo que não é o ótimo.
*/
const NIVEIS = {
    facil: { profundidade: 2, margemDeAcaso: 90 },
    medio: { profundidade: 3, margemDeAcaso: 30 },
    dificil: { profundidade: 4, margemDeAcaso: 0 }
};


if (typeof module !== "undefined") {
    module.exports = {
        avaliar, escolherMovimentoDoComputador, buscar, ordenarMovimentos,
        NIVEIS, VALOR_DA_PECA
    };
}
