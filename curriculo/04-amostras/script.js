/*
  CURRÍCULO — PASSO 4: AMOSTRAS

  Cada cartão ganha um selo (abre sem internet?), um trecho de código e, se jogarAqui for true, um botão
  que cria o <iframe> só ao clicar. Esc fecha o jogo e devolve o foco ao botão.
*/

const CAMPOS_DE_TEXTO = ["id", "nome", "resumo", "pasta", "alt"];

const listaDeProjetos = document.getElementById("lista-projetos");
const caixaDeAvisos = document.getElementById("avisos");

let jogoAberto = null;   // { botao, quadro, projeto } do jogo que está aberto no cartão, se houver

desenharProjetos();
document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") fecharJogo(true);
});

function desenharProjetos() {
    const problemas = conferirProjetos(projetos);

    listaDeProjetos.replaceChildren();
    caixaDeAvisos.replaceChildren();

    if (problemas.length > 0) {
        mostrarProblemas(problemas);
        return;
    }

    listaDeProjetos.append(...projetos.map((projeto) => criarCartao(projeto)));
}

// ---------- Conferir os dados: devolve a lista de problemas (vazia = tudo certo) ----------

function conferirProjetos(listaParaConferir) {
    if (!Array.isArray(listaParaConferir)) {
        return ["projetos precisa ser uma lista: const projetos = [ … ]"];
    }

    const problemas = [];
    const nomesVistos = new Set();
    const idsVistos = new Set();

    listaParaConferir.forEach((projeto, posicao) => {
        const dados = projeto || {};
        const rotulo = `Projeto ${posicao + 1}`;

        problemas.push(...conferirCampos(dados, rotulo));

        if (nomesVistos.has(dados.nome)) problemas.push(`${rotulo}: o nome "${dados.nome}" está repetido`);
        if (idsVistos.has(dados.id)) problemas.push(`${rotulo}: o id "${dados.id}" está repetido`);
        nomesVistos.add(dados.nome);
        idsVistos.add(dados.id);
    });

    return problemas;
}

function conferirCampos(dados, rotulo) {
    const problemas = [];

    for (const campo of CAMPOS_DE_TEXTO.filter((campo) => !textoPreenchido(dados[campo]))) {
        problemas.push(`${rotulo}: falta "${campo}"`);
    }

    const tecnicasValidas = Array.isArray(dados.tecnicas) && dados.tecnicas.length > 0 && dados.tecnicas.every(textoPreenchido);
    if (!tecnicasValidas) problemas.push(`${rotulo}: "tecnicas" precisa ser uma lista de textos, com pelo menos um`);

    if (dados.trecho && !(textoPreenchido(dados.arquivo) && textoPreenchido(dados.oQueMostra))) {
        problemas.push(`${rotulo}: com "trecho", faltam "arquivo" ou "oQueMostra"`);
    }

    const corValida = /^#[0-9a-f]{6}$/i.test(dados.cor);
    if (!dados.imagem && !corValida) problemas.push(`${rotulo}: sem "imagem", "cor" precisa ser como #1f6f43`);

    return problemas;
}

function textoPreenchido(valor) {
    return typeof valor === "string" && valor.trim() !== "";
}

function mostrarProblemas(problemas) {
    console.error("projetos.js tem problemas:", problemas);

    const lista = criarElemento("ul", "");
    lista.append(...problemas.map((problema) => criarElemento("li", problema)));

    caixaDeAvisos.append(criarElemento("p", "Os dados de projetos.js precisam de ajuste:"), lista);
}

// ---------- Criar o cartão: sempre textContent, nunca innerHTML (o texto nunca vira marcação) ----------

function criarCartao(projeto) {
    const cartao = document.createElement("article");
    cartao.className = "cartao";
    cartao.id = `projeto-${projeto.id}`;

    cartao.append(
        criarMiniatura(projeto),
        criarElemento("h3", projeto.nome),
        criarElemento("p", projeto.resumo),
        criarTecnicas(projeto.tecnicas),
        criarElemento("p", projeto.internet ? "⚠ Precisa de internet" : "✓ Abre sem internet", "selo"),
        criarAcoes(projeto)
    );

    if (projeto.trecho) cartao.append(criarTrecho(projeto));
    cartao.append(criarCredito());
    return cartao;
}

function criarElemento(nomeDaTag, texto, classe) {
    const elemento = document.createElement(nomeDaTag);
    elemento.textContent = texto;
    if (classe) elemento.className = classe;
    return elemento;
}

function criarTecnicas(tecnicas) {
    const lista = criarElemento("ul", "", "tecnicas");
    lista.append(...tecnicas.map((tecnica) => criarElemento("li", tecnica)));
    return lista;
}

function criarLinkDoJogo(projeto) {
    const link = criarElemento("a", `Abrir ${projeto.nome}`);
    link.href = projeto.pasta;
    return link;
}

function criarAcoes(projeto) {
    const acoes = criarElemento("div", "", "acoes");
    acoes.append(criarLinkDoJogo(projeto));

    if (projeto.jogarAqui) acoes.append(criarBotaoJogarAqui(projeto));
    return acoes;
}

// ---------- A amostra de código: <pre><code>, com o arquivo de onde veio e o que ele mostra ----------

function criarTrecho(projeto) {
    const detalhes = document.createElement("details");
    const bloco = criarElemento("pre", "");

    // tabindex 0: sem isso o teclado não consegue rolar um código mais largo que o cartão
    bloco.tabIndex = 0;
    bloco.setAttribute("role", "region");
    bloco.setAttribute("aria-label", `Código de ${projeto.arquivo}`);
    bloco.append(criarElemento("code", projeto.trecho));

    detalhes.append(
        criarElemento("summary", "Ver um trecho do código"),
        criarElemento("p", `${projeto.oQueMostra} Arquivo: ${projeto.arquivo}.`),
        bloco
    );
    return detalhes;
}

function criarCredito() {
    const credito = criarElemento("p", "Feito seguindo o curso ", "credito");
    const link = criarElemento("a", "Do zero ao jogo");
    link.href = "../../README.md";

    credito.append(link, ".");
    return credito;
}

// ---------- "Jogar aqui": o <iframe> só existe enquanto o leitor pede ----------

function criarBotaoJogarAqui(projeto) {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.addEventListener("click", () => alternarJogo(projeto, botao));
    rotularBotao(botao, projeto, false);
    return botao;
}

function rotularBotao(botao, projeto, aberto) {
    const texto = aberto ? "Fechar" : "Jogar aqui";
    botao.textContent = texto;
    botao.setAttribute("aria-label", `${texto}: ${projeto.nome}`);
    botao.setAttribute("aria-expanded", String(aberto));
}

function alternarJogo(projeto, botao) {
    const eraEste = jogoAberto !== null && jogoAberto.botao === botao;

    fecharJogo(false);
    if (!eraEste) abrirJogo(projeto, botao);
}

function abrirJogo(projeto, botao) {
    const quadro = document.createElement("iframe");
    quadro.src = projeto.pasta;
    quadro.title = `Jogo: ${projeto.nome}`;
    quadro.loading = "lazy";

    botao.closest(".cartao").append(quadro);
    rotularBotao(botao, projeto, true);
    jogoAberto = { botao, quadro, projeto };
}

function fecharJogo(devolverOFoco) {
    if (jogoAberto === null) return;

    const { botao, quadro, projeto } = jogoAberto;
    quadro.remove();
    rotularBotao(botao, projeto, false);
    jogoAberto = null;
    if (devolverOFoco) botao.focus();
}

function criarMiniatura(projeto) {
    const imagem = document.createElement("img");
    imagem.className = "miniatura";
    imagem.alt = projeto.alt;
    imagem.loading = "lazy";
    imagem.src = projeto.imagem || criarBlocoColorido(projeto);
    return imagem;
}

// Sem arquivo de imagem: um SVG (que é texto) com a cor do projeto e a inicial do nome, embutido no próprio src.
// A letra diz qual projeto é; a cor sozinha não diria.
function criarBlocoColorido(projeto) {
    const inicial = /^\p{L}/u.test(projeto.nome) ? projeto.nome[0].toUpperCase() : "#";
    const desenho = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 90">` +
        `<rect width="160" height="90" fill="${projeto.cor}"/>` +
        `<text x="80" y="62" text-anchor="middle" font-size="48" font-family="sans-serif" fill="#fff">${inicial}</text></svg>`;

    return "data:image/svg+xml," + encodeURIComponent(desenho);
}
