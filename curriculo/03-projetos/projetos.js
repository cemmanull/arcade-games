/*
  PROJETOS.JS — os dados do seu currículo.

  Para trocar de projeto, edite um objeto desta lista; o script.js desenha um cartão por objeto.
  É um arquivo .js comum (e não um .json) porque o navegador não deixa uma página aberta com duplo clique
  ler outros arquivos com fetch. Um script comum, carregado antes do script.js, não tem esse problema.

    id        nome curto, sem espaços nem acentos; vira a âncora #projeto-<id> (e não pode repetir)
    nome      o título do cartão (não pode repetir)
    resumo    o que o projeto é, em uma ou duas frases
    tecnicas  o que você usou: aparecem como etiquetas de texto
    pasta     o endereço do jogo, relativo a esta página, terminando em index.html
    imagem    caminho da miniatura; vazio ("") desenha um bloco colorido com a inicial do nome
    alt       o que o projeto é, para quem não vê a miniatura (não escreva "captura de tela")
    cor       cor do bloco (só quando imagem está vazia); escura, para o texto branco ficar legível
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
        cor: "#1f6f43"
    },
    {
        id: "tetris",
        nome: "Tetris",
        resumo: "Peças que giram e travam num poço, linhas que somem, níveis, som e botões de toque.",
        tecnicas: ["matrizes", "rotação", "localStorage", "som"],
        pasta: "../../tetris/final/index.html",
        imagem: "",
        alt: "Tetris: peças coloridas caem num poço e formam linhas que somem.",
        cor: "#5b3fa0"
    },
    {
        id: "xadrez",
        nome: "Xadrez",
        resumo: "Tabuleiro feito de elementos HTML, com todas as regras e um computador que joga contra você.",
        tecnicas: ["DOM", "regras", "busca alfa-beta"],
        pasta: "../../xadrez/final/index.html",
        imagem: "",
        alt: "Xadrez: um tabuleiro de 64 casas, com as regras e um computador como adversário.",
        cor: "#7a4a12"
    },
    {
        id: "xenomorph",
        nome: "Xenomorph",
        resumo: "Jogo de plataforma com criaturas, armas e campanha salva no navegador, tudo descrito em fichas.",
        tecnicas: ["canvas", "dados em fichas", "física", "som"],
        pasta: "../../xenomorph/final/index.html",
        imagem: "",
        alt: "Xenomorph: um soldado atira em criaturas num cenário de plataformas.",
        cor: "#2b3a55"
    }
];
