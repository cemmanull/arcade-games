/*
  PROJETOS.JS — os dados do seu currículo. Um objeto por projeto; o script.js desenha um cartão por objeto.
  É um .js comum, não um .json: com duplo clique (file://) o navegador bloqueia fetch, mas não um script.

    id, nome   identificam o projeto (#projeto-<id> é a âncora); nenhum dos dois pode repetir
    resumo     o que o projeto é, em uma ou duas frases      tecnicas  o que você usou (etiquetas de texto)
    pasta      endereço do jogo, relativo a esta página, terminando em index.html
    imagem     caminho da miniatura; "" desenha um bloco colorido      cor  cor escura desse bloco
    alt        o que o projeto é, para quem não vê a miniatura (não escreva "captura de tela")
    internet   true se o jogo precisa de internet      jogarAqui  true liga o botão "Jogar aqui" (iframe)
    arquivo, oQueMostra, trecho   um trecho de código copiado do jogo (8 a 15 linhas, nenhuma crase dentro)
*/
const projetos = [
    {
        id: "cobrinha",
        nome: "Jogo da Cobrinha",
        resumo: "A cobra clássica em canvas: anda numa grade, cresce ao comer e acaba quando bate.",
        tecnicas: ["canvas", "laço de jogo", "colisão em grade"],
        pasta: "../../jogo-da-cobrinha/final/index.html",
        imagem: "",
        alt: "Jogo da Cobrinha: uma cobra anda numa grade e cresce ao comer maçãs.",
        cor: "#1f6f43",
        internet: false, jogarAqui: false,
        arquivo: "jogo-da-cobrinha/final/script.js",
        oQueMostra: "Andar é somar 1 à coluna ou à linha: o switch escolhe qual, pela direção, e devolve a nova cabeça.",
        trecho: `    switch (direcao) {
        case "cima":     cabeca.linha -= 1;  break;
        case "baixo":    cabeca.linha += 1;  break;
        case "esquerda": cabeca.coluna -= 1; break;
        case "direita":  cabeca.coluna += 1; break;
    }

    return cabeca;
}`
    },
    {
        id: "tetris",
        nome: "Tetris",
        resumo: "Peças que giram e travam num poço, linhas que somem, níveis, som e botões de toque.",
        tecnicas: ["matrizes", "rotação", "localStorage", "som"],
        pasta: "../../tetris/final/index.html",
        imagem: "",
        alt: "Tetris: peças coloridas caem num poço e formam linhas que somem.",
        cor: "#5b3fa0",
        internet: false, jogarAqui: false,
        arquivo: "tetris/final/script.js",
        oQueMostra: "Girar uma peça é girar a matriz: cada célula nova vem de outra posição da antiga.",
        trecho: `function girarMatriz(forma, sentido) {
    const n = forma.length;

    return forma.map((linhaDaForma, y) =>
        linhaDaForma.map((_, x) =>
            sentido > 0
                ? forma[n - 1 - x][y]
                : forma[x][n - 1 - y]
        )
    );
}`
    },
    {
        id: "xadrez",
        nome: "Xadrez",
        resumo: "Tabuleiro feito de elementos HTML, com todas as regras e um computador que joga contra você.",
        tecnicas: ["DOM", "regras", "busca alfa-beta"],
        pasta: "../../xadrez/final/index.html",
        imagem: "",
        alt: "Xadrez: um tabuleiro de 64 casas, com as regras e um computador como adversário.",
        cor: "#7a4a12",
        internet: false, jogarAqui: false,
        arquivo: "xadrez/final/regras.js",
        oQueMostra: "Como saber se um peão ataca uma casa: olhar de onde ele viria, na diagonal, atrás do avanço.",
        trecho: `    // Peões: atacam na diagonal, e só para a frente deles.
    const avancoDoAtacante = corAtacante === BRANCAS ? -1 : 1;
    for (const passoColuna of [-1, 1]) {
        const linhaPeao = linha - avancoDoAtacante;   // de onde ele viria
        const colunaPeao = coluna + passoColuna;

        if (dentroDoTabuleiro(linhaPeao, colunaPeao)) {
            const peca = estado.casas[indiceDe(linhaPeao, colunaPeao)];
            if (peca !== null && peca.cor === corAtacante && peca.tipo === "peao") {
                return true;
            }
        }
    }`
    },
    {
        id: "xenomorph",
        nome: "Xenomorph",
        resumo: "Jogo de plataforma com criaturas, armas e campanha salva no navegador, tudo descrito em fichas.",
        tecnicas: ["canvas", "dados em fichas", "física", "som"],
        pasta: "../../xenomorph/final/index.html",
        imagem: "",
        alt: "Xenomorph: um soldado atira em criaturas num cenário de plataformas.",
        cor: "#2b3a55",
        internet: false, jogarAqui: false,
        arquivo: "xenomorph/final/dados/criaturas.js",
        oQueMostra: "Uma criatura é uma ficha de números; o que ela faz com eles está em outro arquivo.",
        trecho: `    rastejador: {
        largura: 8,
        altura: 5,
        vida: 4,
        danoDeContato: 10,
        velocidade: 26,
        velocidadeDePerseguicao: 58,
        impulsoDoPulinho: 190,     // para subir um degrau correndo atrás de alguém
        visao: 96,
        paciencia: 1.5,            // quanto tempo sem ver o soldado até desistir de perseguir
        amostras: 1,               // quantas deixa ao morrer (scripts/combate.js)
        estadoInicial: "patrulha",`
    }
];
