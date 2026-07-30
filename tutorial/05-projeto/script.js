/*
  LIÇÃO 5 — PROJETO: LISTA DE TAREFAS

  Este arquivo é o resumo prático das quatro lições anteriores, e mostra a
  arquitetura que quase todo programa de interface tem:

      ESTADO      -> os dados, em variáveis JavaScript
      AÇÕES       -> funções que MUDAM o estado
      RENDERIZAR  -> uma função que desenha a tela A PARTIR do estado
      EVENTOS     -> ligam o que o usuário faz às ações

  O fluxo é sempre o mesmo, e sempre em uma direção só:

      usuário -> evento -> ação -> muda o estado -> renderiza -> tela

  Nunca o contrário. A tela nunca é consultada para saber o que é verdade.
  Essa regra é o que impede a interface de "se perder" — e é a mesma ideia
  por trás de React, Vue e companhia.
*/


// ============================================================
// ELEMENTOS DA PÁGINA
// ============================================================
const formulario = document.getElementById("formulario-nova-tarefa");
const campoTarefa = document.getElementById("campo-tarefa");
const listaTarefas = document.getElementById("lista-tarefas");
const mensagemVazia = document.getElementById("mensagem-vazia");
const contagem = document.getElementById("contagem");
const botaoLimparConcluidas = document.getElementById("limpar-concluidas");
const botoesDeFiltro = document.querySelectorAll(".filtro");


// ============================================================
// ESTADO
// ============================================================
/*
  Uma tarefa é um objeto:

      { id: 1712..., texto: "Comprar pão", concluida: false }

  O id serve para identificar a tarefa sem depender da posição dela na
  lista — posições mudam quando algo é removido. Date.now() devolve os
  milissegundos desde 1970, o que dá um número diferente a cada chamada.
*/
let tarefas = carregarDoNavegador();
let filtroAtual = "todas";   // "todas" | "pendentes" | "concluidas"


// ============================================================
// PERSISTÊNCIA — guardar entre visitas
// ============================================================
/*
  localStorage guarda dados no navegador, presos ao endereço do site.
  Eles sobrevivem ao fechamento da aba e do computador.

  Duas regras:
    1. só guarda TEXTO. Objetos e listas precisam virar texto com
       JSON.stringify e voltar com JSON.parse;
    2. o espaço é pequeno (alguns megabytes) e o dado é do navegador —
       some se o usuário limpar os dados do site. Não é banco de dados.
*/
const CHAVE_DE_ARMAZENAMENTO = "tarefas";

function carregarDoNavegador() {
    const textoSalvo = localStorage.getItem(CHAVE_DE_ARMAZENAMENTO);

    if (!textoSalvo) {
        return [];   // primeira visita
    }

    /*
      try/catch: tente executar; se der erro, caia no catch em vez de
      quebrar a página inteira.

      Aqui ele protege contra um dado corrompido no localStorage — coisa
      rara, mas que deixaria o aplicativo inutilizável para sempre, sem
      que o usuário entendesse por quê. Um try/catch em toda leitura de
      dado externo é barato e evita esse tipo de armadilha.
    */
    try {
        return JSON.parse(textoSalvo);
    } catch (erro) {
        console.warn("Dado salvo inválido, começando do zero.", erro);
        return [];
    }
}

function salvarNoNavegador() {
    localStorage.setItem(CHAVE_DE_ARMAZENAMENTO, JSON.stringify(tarefas));
}


// ============================================================
// AÇÕES — as únicas funções que mudam o estado
// ============================================================
/*
  Repare no padrão: toda ação faz três coisas, na mesma ordem.
      1. altera `tarefas`
      2. salva
      3. renderiza

  Concentrar isso em poucas funções pequenas é o que evita a situação
  clássica em que a tela mostra uma coisa e os dados dizem outra.
*/
function adicionarTarefa(texto) {
    tarefas.push({
        id: Date.now(),
        texto: texto,
        concluida: false
    });

    salvarNoNavegador();
    renderizar();
}

function alternarConclusao(id) {
    /*
      find devolve o PRÓPRIO objeto da lista (não uma cópia), então alterar
      a propriedade altera a tarefa dentro do array. Aqui isso é o que
      queremos — mas é exatamente a "armadilha da referência" da lição 3,
      agora trabalhando a nosso favor.
    */
    const tarefa = tarefas.find(item => item.id === id);
    tarefa.concluida = !tarefa.concluida;

    salvarNoNavegador();
    renderizar();
}

function removerTarefa(id) {
    /*
      filter cria uma lista NOVA sem o item removido, em vez de mexer na
      lista antiga. Preferir criar a alterar deixa o código mais previsível.
    */
    tarefas = tarefas.filter(item => item.id !== id);

    salvarNoNavegador();
    renderizar();
}

function limparConcluidas() {
    tarefas = tarefas.filter(item => !item.concluida);

    salvarNoNavegador();
    renderizar();
}

function trocarFiltro(novoFiltro) {
    filtroAtual = novoFiltro;
    renderizar();   // filtro não altera os dados, então não precisa salvar
}


// ============================================================
// RENDERIZAR — desenhar a tela a partir do estado
// ============================================================
/*
  Uma única função responsável por TUDO o que aparece.

  Ela apaga a lista e a reconstrói inteira, toda vez. Parece desperdício;
  é o que garante que a tela nunca fique fora de sincronia com os dados —
  e some com a necessidade de "atualizar só o item 3", que é onde nascem
  os bugs de interface.
*/
function renderizar() {
    const visiveis = filtrarTarefas();

    listaTarefas.textContent = "";   // esvazia
    visiveis.forEach(tarefa => listaTarefas.appendChild(criarElementoDaTarefa(tarefa)));

    mensagemVazia.hidden = tarefas.length > 0;
    atualizarContagem();
    atualizarBotoesDeFiltro();
}

/*
  Uma função que só CALCULA e devolve — não mexe em nada.
  Fácil de ler, fácil de testar, impossível de estragar algo por acidente.
*/
function filtrarTarefas() {
    if (filtroAtual === "pendentes") {
        return tarefas.filter(tarefa => !tarefa.concluida);
    }

    if (filtroAtual === "concluidas") {
        return tarefas.filter(tarefa => tarefa.concluida);
    }

    return tarefas;
}

/*
  Monta o <li> de UMA tarefa e o devolve, sem encaixar na página.
  Quem encaixa é o renderizar(). Separar "montar" de "colocar" mantém
  cada função com uma responsabilidade só.
*/
function criarElementoDaTarefa(tarefa) {
    const item = document.createElement("li");
    item.className = tarefa.concluida ? "tarefa concluida" : "tarefa";

    const caixaDeMarcar = document.createElement("input");
    caixaDeMarcar.type = "checkbox";
    caixaDeMarcar.checked = tarefa.concluida;
    caixaDeMarcar.id = `tarefa-${tarefa.id}`;
    caixaDeMarcar.addEventListener("change", () => alternarConclusao(tarefa.id));

    /*
      O <label> ligado ao id do checkbox faz a área clicável incluir o
      texto inteiro — muito mais fácil de acertar, principalmente no
      celular — e faz o leitor de tela anunciar a tarefa junto com o
      estado "marcado / não marcado".
    */
    const rotulo = document.createElement("label");
    rotulo.setAttribute("for", caixaDeMarcar.id);
    rotulo.textContent = tarefa.texto;

    const botaoRemover = document.createElement("button");
    botaoRemover.type = "button";
    botaoRemover.className = "botao-remover";
    botaoRemover.textContent = "×";
    botaoRemover.setAttribute("aria-label", `Remover: ${tarefa.texto}`);
    /*
      O texto "×" não significa nada para quem ouve a página.
      aria-label dá ao botão um nome acessível de verdade.
    */
    botaoRemover.addEventListener("click", () => removerTarefa(tarefa.id));

    item.append(caixaDeMarcar, rotulo, botaoRemover);
    return item;
}

function atualizarContagem() {
    const pendentes = tarefas.filter(tarefa => !tarefa.concluida).length;

    /*
      Plural correto. É um detalhe pequeno que separa "funciona" de
      "foi feito por alguém que se importa".
    */
    contagem.textContent = pendentes === 1
        ? "1 tarefa pendente"
        : `${pendentes} tarefas pendentes`;

    botaoLimparConcluidas.hidden = !tarefas.some(tarefa => tarefa.concluida);
}

function atualizarBotoesDeFiltro() {
    botoesDeFiltro.forEach(botao => {
        const estaAtivo = botao.dataset.filtro === filtroAtual;

        botao.classList.toggle("ativo", estaAtivo);
        /*
          toggle com um segundo argumento: liga se for true, desliga se
          for false. Evita um if/else de quatro linhas.
        */
        botao.setAttribute("aria-pressed", estaAtivo);
    });
}


// ============================================================
// EVENTOS
// ============================================================
formulario.addEventListener("submit", evento => {
    /*
      Sem preventDefault a página recarrega e todo o trabalho some.
      Ouvir "submit" (em vez do clique do botão) faz o Enter funcionar
      de graça.
    */
    evento.preventDefault();

    const texto = campoTarefa.value.trim();

    if (texto === "") {
        return;   // guarda: não adiciona vazio
    }

    adicionarTarefa(texto);

    campoTarefa.value = "";
    campoTarefa.focus();   // quem está digitando não quer pegar o mouse
});

botoesDeFiltro.forEach(botao => {
    // dataset.filtro lê o atributo data-filtro escrito no HTML.
    botao.addEventListener("click", () => trocarFiltro(botao.dataset.filtro));
});

botaoLimparConcluidas.addEventListener("click", limparConcluidas);


// ============================================================
// INICIALIZAÇÃO
// ============================================================
/*
  Uma única chamada. Como toda a tela é desenhada a partir do estado,
  não existe código separado para "a primeira vez": o começo é só mais
  uma renderização.
*/
renderizar();
