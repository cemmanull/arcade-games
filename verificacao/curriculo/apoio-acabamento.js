/*
  APOIO DO ACABAMENTO: os casos que o passo 5, o passo 6 (só a impressão) e o final repartem.

  Carregue DEPOIS de apoio-curriculo.js. Só declara constantes e funções. `rodarAcabamento(passo, espelhoDoIndex, espelhoDoCss, extras)`
  abre o passo num iframe e roda: contraste dos dois temas, foco, localStorage (corrompido, bloqueado, cheio), botão de tema,
  persistência, projetos.js ausente ou quebrado, tecla H (e H digitado num campo), tecla sem `key`, inicial fora do BMP, regressão do passo 4,
  rolagem horizontal, impressão e movimento reduzido. `extras` (opcional) é uma função assíncrona que roda depois, com o armazenamento limpo.
*/

const TEMAS = ["claro", "escuro"];

// ------------------------------------------------------------
// Contraste: os pares da paleta e o texto que aparece na tela, nos dois temas
// ------------------------------------------------------------
const PARES_DE_TEXTO = [["texto", "fundo"], ["texto", "superficie"], ["texto-suave", "fundo"], ["texto-suave", "superficie"], ["destaque", "fundo"], ["destaque", "superficie"], ["foco", "fundo"]];
const PARES_DE_TRACO = [["foco", "fundo"], ["foco", "superficie"], ["borda", "fundo"], ["borda", "superficie"]];

function conferirContrasteDoTema(janela, tema) {
    const documento = janela.document;
    // Os botões levam 0,15 s para trocar de cor: sem desligar a transição, o teste mediria o meio dela.
    const semTransicao = documento.createElement("style");
    semTransicao.textContent = "*, *::before, *::after { transition: none !important; }";
    documento.head.appendChild(semTransicao);
    documento.documentElement.dataset.tema = tema;
    documento.querySelectorAll("details").forEach(function (detalhes) { detalhes.open = true; });

    PARES_DE_TEXTO.forEach(function (par) {
        const razao = razaoDeContraste(corDaVariavel(documento, janela, par[0], "color"), corDaVariavel(documento, janela, par[1], "backgroundColor"));
        conferir(tema + ": texto --" + par[0] + " sobre --" + par[1] + " = " + razao.toFixed(2) + " ≥ 4,5", razao >= 4.5);
    });
    PARES_DE_TRACO.forEach(function (par) {
        const razao = razaoDeContraste(corDaVariavel(documento, janela, par[0], "color"), corDaVariavel(documento, janela, par[1], "backgroundColor"));
        conferir(tema + ": contorno/borda --" + par[0] + " sobre --" + par[1] + " = " + razao.toFixed(2) + " ≥ 3", razao >= 3);
    });

    const visiveis = contrastesDoTextoVisivel(documento, janela);
    const fracos = visiveis.filter(function (item) { return item.razao < 4.5; });
    conferir(tema + ": os " + visiveis.length + " textos que aparecem na tela têm contraste ≥ 4,5", visiveis.length > 40 && fracos.length === 0,
        fracos.slice(0, 3).map(function (item) { return item.nome + " " + item.razao.toFixed(2); }).join("; "));
    documento.documentElement.removeAttribute("data-tema");
    semTransicao.remove();
}

// ------------------------------------------------------------
// Os iframes de emulação: impressão e movimento reduzido (o Chrome sem janela não os liga)
// ------------------------------------------------------------
function comCssEmulado(texto, espelhoDoCss) {
    const css = espelhoDoCss.replace("@media print", "@media all").replace("@media (prefers-reduced-motion: reduce)", "@media all");
    return texto.replace('<link rel="stylesheet" href="style.css">', function () { return "<style>" + css + "</style>"; });
}

function regrasDeMidia(folha, trecho) {
    return Array.from(folha.cssRules).filter(function (regra) { return regra.constructor.name === "CSSMediaRule" && regra.conditionText.indexOf(trecho) >= 0; });
}

/* Na folha impressa o endereço do curso sai uma vez só (rodapé): o crédito repetido em cada cartão não o escreve de novo. */
async function conferirEnderecoDoCursoImpressoUmaVez(passo, espelhoDoIndex, espelhoDoCss) {
    const impressao = await abrirPasso(passo, espelhoDoIndex, { largura: 794, altura: 1123, transformar: function (texto) { return comCssEmulado(texto, espelhoDoCss); } });
    try {
        const impJanela = impressao.contentWindow, impDocumento = impJanela.document;
        const enderecoEscrito = function (link) { return impJanela.getComputedStyle(link, "::after").content; };
        const semEndereco = function (link) { return ["none", "normal", '""'].indexOf(enderecoEscrito(link)) >= 0; };

        const rodape = impDocumento.querySelector("footer a[href^='http']");
        conferir("o rodapé tem o link do curso e escreve o endereço dele no papel: " + (rodape ? enderecoEscrito(rodape) : "(sem link)"), rodape !== null && enderecoEscrito(rodape).indexOf(rodape.getAttribute("href")) >= 0);
        const creditos = Array.from(impDocumento.querySelectorAll(".credito a"));
        conferir(creditos.length + " créditos nos cartões, nenhum escreve o endereço", creditos.length >= 4 && creditos.every(semEndereco), creditos.map(enderecoEscrito).join(" | "));
        const comOCurso = Array.from(impDocumento.querySelectorAll('a[href^="http"]')).filter(function (link) { return rodape !== null && link.getAttribute("href") === rodape.getAttribute("href") && !semEndereco(link); });
        conferirIgual("o endereço do curso sai " + comOCurso.length + " vez(es) no papel: uma só", comOCurso.length, 1);
    } finally {
        impressao.remove();
    }
}

async function rodarAcabamento(passo, espelhoDoIndex, espelhoDoCss, casosExtras) {
    const temaDoAluno = lerArmazenado();
    gravarArmazenado(null);
    try {
        await executarOsCasosDeAcabamento(passo, espelhoDoIndex, espelhoDoCss);
        if (casosExtras) {
            gravarArmazenado(null);
            await casosExtras();
        }
    } finally {
        gravarArmazenado(temaDoAluno);
    }
    finalizar();
}

async function executarOsCasosDeAcabamento(passo, espelhoDoIndex, espelhoDoCss) {
    const quadro = await abrirPasso(passo, espelhoDoIndex);
    const janela = quadro.contentWindow, documento = janela.document;
    const projetos = janela.eval("projetos");

    testar("preparação: o passo 5 de verdade rodou no iframe", function () {
        conferirIgual("a carga não deu erro nem escreveu no console.error", janela.__erros.concat(janela.__consoleErros).join(" | "), "");
        conferirIgual("o tema só muda por escolha: sem data-tema na carga", documento.documentElement.hasAttribute("data-tema"), false);
        conferirIgual("o aria-pressed do botão de tema começa igual ao tema em uso (true só no escuro)", documento.getElementById("botao-tema").getAttribute("aria-pressed"), String(janela.temaEmUso() === "escuro"));
        conferirCartoesIguaisAosDados(janela);
        conferirImagensComAlt(documento);
    });

    testar("contraste calculado (luminância WCAG) de cada par da paleta e de cada texto na tela, nos dois temas", function () {
        TEMAS.forEach(function (tema) { conferirContrasteDoTema(janela, tema); });
        projetos.forEach(function (projeto) {
            const razao = razaoDeContraste({ r: 255, g: 255, b: 255, a: 1 }, lerCor("rgb(" + [1, 3, 5].map(function (i) { return parseInt(projeto.cor.slice(i, i + 2), 16); }).join(",") + ")"));
            conferir(projeto.id + ": a inicial branca sobre a cor do bloco " + projeto.cor + " = " + razao.toFixed(2) + " ≥ 4,5", razao >= 4.5);
        });
        conferirIgual("a conferência enxerga um par ruim: cinza claro sobre branco < 4,5", razaoDeContraste(lerCor("rgb(170,170,170)"), lerCor("rgb(255,255,255)")) < 4.5, true);
        conferirIgual("e preto sobre branco dá 21", Math.round(razaoDeContraste(lerCor("rgb(0,0,0)"), lerCor("rgb(255,255,255)"))), 21);
        const claro = corDaVariavel(documento, janela, "fundo", "backgroundColor");
        documento.documentElement.dataset.tema = "escuro";
        const escuro = corDaVariavel(documento, janela, "fundo", "backgroundColor");
        documento.documentElement.removeAttribute("data-tema");
        conferir("os dois temas têm fundos diferentes (o teste mede os dois de verdade)", luminanciaRelativa(claro) > 0.5 && luminanciaRelativa(escuro) < 0.05);
    });

    testar("o foco do teclado tem contorno de pelo menos 3 px e contraste de pelo menos 3:1 nos dois temas", function () {
        const link = documento.querySelector("nav a");
        TEMAS.forEach(function (tema) {
            documento.documentElement.dataset.tema = tema;
            link.focus();
            const estilo = janela.getComputedStyle(link);
            conferir(tema + ": o link focado tem contorno sólido de " + estilo.outlineWidth + " (" + estilo.outlineStyle + ")", estilo.outlineStyle === "solid" && parseFloat(estilo.outlineWidth) >= 3);
            const fundoDoContorno = fundoEfetivo(link.parentElement, janela);
            conferir(tema + ": e o contorno contrasta ≥ 3 com o fundo (" + razaoDeContraste(lerCor(estilo.outlineColor), fundoDoContorno).toFixed(2) + ")", razaoDeContraste(lerCor(estilo.outlineColor), fundoDoContorno) >= 3);
            link.blur();
        });
        documento.documentElement.removeAttribute("data-tema");
    });

    testar("localStorage corrompido não quebra o tema: só 'claro' e 'escuro' valem", function () {
        gravarArmazenado(null);
        conferirIgual("sem nada guardado", janela.lerTemaSalvo(), null);
        ["roxo", "{", "{\"tema\":\"escuro\"}", "\"escuro\"", "ESCURO", "", "null", "undefined", "escuro ", "claro\n", "<b>claro</b>"].forEach(function (lixo) {
            gravarArmazenado(lixo);
            let lido = "(lançou)";
            try { lido = janela.lerTemaSalvo(); } catch (erro) { /* fica "(lançou)" */ }
            conferirIgual("guardado " + JSON.stringify(lixo) + " → null", lido, null);
        });
        gravarArmazenado("claro");
        conferirIgual("'claro' guardado é lido", janela.lerTemaSalvo(), "claro");
        gravarArmazenado("escuro");
        conferirIgual("'escuro' guardado é lido", janela.lerTemaSalvo(), "escuro");
        gravarArmazenado("roxo");
        conferir("com lixo guardado, temaEmUso ainda devolve claro ou escuro", ["claro", "escuro"].indexOf(janela.temaEmUso()) >= 0);

        const original = janela.Storage.prototype.getItem;
        janela.Storage.prototype.getItem = function () { throw new Error("armazenamento bloqueado"); };
        let lido = "(lançou)";
        try { lido = janela.lerTemaSalvo(); } catch (erro) { /* fica "(lançou)" */ }
        janela.Storage.prototype.getItem = original;
        conferirIgual("getItem que lança (armazenamento bloqueado) → null, sem lançar", lido, null);
        gravarArmazenado(null);
    });

    testar("o botão de tema troca o tema, atualiza aria-pressed e grava a escolha; sem armazenamento, o tema muda do mesmo jeito", function () {
        const botao = documento.getElementById("botao-tema");
        gravarArmazenado(null);
        documento.documentElement.dataset.tema = "claro";
        botao.click();
        conferirIgual("claro → escuro: data-tema", documento.documentElement.dataset.tema, "escuro");
        conferirIgual("a escolha ficou guardada", lerArmazenado(), "escuro");
        conferirIgual("aria-pressed vira true", botao.getAttribute("aria-pressed"), "true");
        conferirIgual("temaEmUso diz escuro", janela.temaEmUso(), "escuro");
        conferirIgual("o fundo da página escureceu de verdade", luminanciaRelativa(lerCor(janela.getComputedStyle(documento.body).backgroundColor)) < 0.05, true);
        botao.click();
        conferirIgual("escuro → claro: data-tema", documento.documentElement.dataset.tema, "claro");
        conferirIgual("e a escolha guardada acompanha", lerArmazenado(), "claro");
        conferirIgual("aria-pressed volta a false", botao.getAttribute("aria-pressed"), "false");

        const gravarOriginal = janela.Storage.prototype.setItem;
        janela.Storage.prototype.setItem = function () { throw new Error("cota cheia"); };
        const avisosAntes = janela.__avisosDeConsole.length;
        let lancou = null;
        try { botao.click(); } catch (erro) { lancou = erro; }
        janela.Storage.prototype.setItem = gravarOriginal;
        conferirIgual("setItem que lança: o clique não lança", String(lancou), "null");
        conferirIgual("e o tema mudou mesmo assim", documento.documentElement.dataset.tema, "escuro");
        conferir("e o aviso 'vale só nesta visita' vai para o console", janela.__avisosDeConsole.length === avisosAntes + 1);
        conferirIgual("nenhum erro não tratado", janela.__erros.join(" | "), "");
        gravarArmazenado("escuro");                  // o próximo caso abre a página de novo e deve vê-lo
    });

    await testarAssincrono("a escolha persiste: uma página nova lê 'escuro' e já abre escura, com o botão marcado", async function () {
        const outra = await abrirPasso(passo, espelhoDoIndex);
        try {
            const outraJanela = outra.contentWindow, outroDocumento = outraJanela.document;
            conferirIgual("data-tema", outroDocumento.documentElement.dataset.tema, "escuro");
            conferirIgual("aria-pressed do botão", outroDocumento.getElementById("botao-tema").getAttribute("aria-pressed"), "true");
            conferirIgual("color-scheme calculado", outraJanela.getComputedStyle(outroDocumento.documentElement).colorScheme, "dark");
            conferirIgual("sem erros", outraJanela.__erros.join(" | "), "");
        } finally {
            outra.remove();
        }
    });

    await testarAssincrono("a página abre normal com lixo guardado ('roxo') e com getItem que lança", async function () {
        const comLixo = await abrirPasso(passo, espelhoDoIndex, { antes: "localStorage.setItem('" + CHAVE_DO_TEMA + "', 'roxo');" });
        try {
            const outraJanela = comLixo.contentWindow;
            conferirIgual("lixo: nenhum data-tema", outraJanela.document.documentElement.hasAttribute("data-tema"), false);
            conferirIgual("lixo: os cartões foram desenhados", outraJanela.document.querySelectorAll("#lista-projetos > article").length, 4);
            conferirIgual("lixo: sem erros", outraJanela.__erros.concat(outraJanela.__consoleErros).join(" | "), "");
        } finally {
            comLixo.remove();
        }

        const bloqueado = await abrirPasso(passo, espelhoDoIndex, { antes: "Storage.prototype.getItem = function () { throw new Error('bloqueado'); };" });
        try {
            const outraJanela = bloqueado.contentWindow, outroDocumento = outraJanela.document;
            conferirIgual("getItem que lança: nenhum erro não tratado na carga", outraJanela.__erros.join(" | "), "");
            conferirIgual("getItem que lança: os cartões foram desenhados", outroDocumento.querySelectorAll("#lista-projetos > article").length, 4);
            conferirIgual("getItem que lança: nenhum data-tema", outroDocumento.documentElement.hasAttribute("data-tema"), false);
            outroDocumento.getElementById("botao-tema").click();
            conferir("getItem que lança: o botão ainda troca o tema", outroDocumento.documentElement.hasAttribute("data-tema"));
            conferirIgual("getItem que lança: e segue sem erros", outraJanela.__erros.join(" | "), "");
        } finally {
            bloqueado.remove();
        }
    });

    await testarAssincrono("se projetos.js não carregar, o tema e a tecla H seguem funcionando e #avisos explica", async function () {
        const semDados = await abrirPasso(passo, espelhoDoIndex, {
            antes: "localStorage.setItem('" + CHAVE_DO_TEMA + "', 'escuro');",
            transformar: function (texto) { return texto.replace('<script src="projetos.js" defer>', '<script src="projetos-que-nao-existe.js" defer>'); }
        });
        try {
            const outraJanela = semDados.contentWindow, outroDocumento = outraJanela.document;
            conferirIgual("nenhum erro não tratado", outraJanela.__erros.join(" | "), "");
            conferir("#avisos cita projetos", outroDocumento.getElementById("avisos").textContent.indexOf("projetos") >= 0);
            conferirIgual("o tema guardado foi aplicado antes de qualquer outra coisa", outroDocumento.documentElement.dataset.tema, "escuro");
            outroDocumento.getElementById("botao-tema").click();
            conferirIgual("o botão de tema funciona sem os dados", outroDocumento.documentElement.dataset.tema, "claro");
            apertarTecla(outraJanela, outroDocumento, "h");
            conferirIgual("a tecla H funciona sem os dados", outroDocumento.body.classList.contains("ver-estrutura"), true);
            conferirIgual("e segue sem erros", outraJanela.__erros.join(" | "), "");
        } finally {
            semDados.remove();
        }
    });

    await testarAssincrono("projetos.js com erro de execução (nome: Tetris sem aspas) ou de sintaxe: #avisos explica e o tema e a tecla H seguem funcionando", async function () {
        await conferirProjetosJsQuebrado(passo, espelhoDoIndex, { tema: true, teclado: true });
    });

    testar("a tecla H liga e desliga a estrutura (marcos e títulos), com Ctrl/Alt/Meta ela não age", function () {
        const botao = documento.getElementById("botao-ver"), aviso = documento.getElementById("aviso-estrutura");
        const ligada = function () { return documento.body.classList.contains("ver-estrutura"); };
        const totalDeMarcos = documento.querySelectorAll("header, nav, main, section, footer").length;

        conferirIgual("começa desligada", ligada(), false);
        apertarTecla(janela, documento, "h");
        conferirIgual("H liga", ligada(), true);
        conferirIgual("o botão 'Ver estrutura' fica aria-pressed true", botao.getAttribute("aria-pressed"), "true");
        conferirIgual("todo marco ganha o nome escrito (" + totalDeMarcos + ")", documento.querySelectorAll("[data-marco]").length, totalDeMarcos);
        conferir("e o nome diz a tag e o id (main #principal)", documento.querySelector("main").dataset.marco === "main #principal", documento.querySelector("main").dataset.marco);
        conferirIgual("todo título ganha o nível escrito", Array.from(documento.querySelectorAll("h1, h2, h3")).every(function (titulo) { return titulo.dataset.nivel === titulo.localName; }), true);
        conferir("o aviso (role=status) resume os marcos e a ordem dos títulos", /^\d+ marcos\. Títulos, na ordem: h1 Alex Exemplo · h2 /.test(aviso.textContent), aviso.textContent.slice(0, 80));
        conferirIgual("o aviso é uma região role=status", aviso.getAttribute("role"), "status");
        const contorno = janela.getComputedStyle(documento.querySelector("main"));
        conferir("o marco ganha contorno tracejado de 3 px (forma, não só cor): " + contorno.outlineStyle + " " + contorno.outlineWidth, contorno.outlineStyle === "dashed" && parseFloat(contorno.outlineWidth) >= 3);

        apertarTecla(janela, documento, "h");
        conferirIgual("H de novo desliga", ligada(), false);
        conferirIgual("o aviso esvazia", aviso.textContent, "");
        conferirIgual("aria-pressed volta a false", botao.getAttribute("aria-pressed"), "false");

        apertarTecla(janela, documento, "H");
        conferirIgual("H maiúsculo também liga", ligada(), true);
        apertarTecla(janela, documento, "H");

        [{ ctrlKey: true }, { altKey: true }, { metaKey: true }].forEach(function (extras) {
            apertarTecla(janela, documento, "h", extras);
            conferirIgual("H com " + Object.keys(extras)[0] + " não liga", ligada(), false);
        });
        apertarTecla(janela, documento, "j");
        conferirIgual("outra tecla (J) não liga", ligada(), false);
        apertarTecla(janela, documento, "h", { repeat: true });
        conferirIgual("H segurado (repetição automática do teclado) não liga e desliga sem parar", ligada(), false);
        apertarTecla(janela, documento, "h");
        apertarTecla(janela, documento, "h", { repeat: true });
        apertarTecla(janela, documento, "h", { repeat: true });
        conferirIgual("um H e duas repetições: continua ligada", ligada(), true);
        apertarTecla(janela, documento, "h");

        botao.click();
        conferirIgual("o botão 'Ver estrutura (H)' liga também", ligada(), true);
        botao.click();
        conferirIgual("e desliga", ligada(), false);
        conferirIgual("nenhum erro não tratado", janela.__erros.join(" | "), "");
    });

    testar("digitar H dentro de um campo de texto NÃO liga a estrutura", function () {
        conferirHNaoLigaEmCampos(janela);
    });

    testar("um keydown sem texto em `key` (preenchimento automático) não lança erro", function () {
        conferirTeclaSemKey(janela);
    });

    testar("a inicial do bloco colorido é a primeira letra inteira, mesmo fora do plano básico do Unicode", function () {
        conferirInicialDoBlocoColorido(janela);
    });

    testar("regressão do passo 4 dentro do passo 5: dados, trechos e 'Jogar aqui' (iframe só ao clicar; Fechar e Esc devolvem o foco)", function () {
        conferirValidadorDeProjetos(janela, true);
        conferirTrechosEsperados(janela);
        conferirDestinosDosDados(janela, passo, true);
        conferirTextoNaoViraMarcacao(janela);
        conferirDadosInvalidosViramAviso(janela);
        conferirJogoSobDemanda(janela);
    });

    await testarAssincrono("sem rolagem horizontal em 360, 390 e 1280, nos dois temas, com a estrutura ligada e com os trechos abertos", async function () {
        const larguras = [360, 390, 1280];
        for (const tema of TEMAS) {
            documento.documentElement.dataset.tema = tema;
            for (const estado of ["normal", "estrutura", "trechos"]) {
                if (estado === "estrutura") apertarTecla(janela, documento, "h");
                if (estado === "trechos") documento.querySelectorAll("details").forEach(function (detalhes) { detalhes.open = true; });
                await conferirSemRolagemHorizontalEm(quadro, larguras, "passo 5, tema " + tema + ", " + estado);
            }
            apertarTecla(janela, documento, "h");
            documento.querySelectorAll("details").forEach(function (detalhes) { detalhes.open = false; });
        }
        documento.documentElement.removeAttribute("data-tema");

        await mudarTamanho(quadro, 390);
        conferirIgual("390: a grade tem 1 coluna", colunasDaGrade(documento, "#lista-projetos"), 1);
        await mudarTamanho(quadro, 1280);
        conferir("1280: a grade tem 2 ou mais colunas", colunasDaGrade(documento, "#lista-projetos") >= 2);
        await mudarTamanho(quadro, 390);
        conferirIgual("390: alvos com menos de 48 px (o botão de tema incluído)", alvosPequenos(documento).join(" | "), "");
        conferir("o botão de tema está entre os alvos conferidos", alvosDeToque(documento).indexOf(documento.getElementById("botao-tema")) >= 0);
    });

    // ------------------------------------------------------------
    // Impressão e movimento reduzido: o CSS espelhado, com as duas condições trocadas por "all"
    // ------------------------------------------------------------
    testar("as regras: existe um @media print e um @media (prefers-reduced-motion: reduce) no CSS do passo", function () {
        const folha = new CSSStyleSheet();
        folha.replaceSync(espelhoDoCss);
        const impressao = regrasDeMidia(folha, "print");
        conferirIgual("um bloco @media print", impressao.length, 1);
        const dentro = Array.from(impressao[0].cssRules);
        const escondeNav = dentro.some(function (regra) { return regra.selectorText.split(",").map(function (parte) { return parte.trim(); }).indexOf("nav") >= 0 && regra.style.display === "none"; });
        conferir("o @media print esconde o nav (display: none)", escondeNav);
        const mostraUrl = dentro.some(function (regra) { return /::after/.test(regra.selectorText) && /attr\(href\)/.test(regra.style.content); });
        conferir("e escreve o endereço do link (::after com attr(href))", mostraUrl);
        const paginas = Array.from(folha.cssRules).filter(function (regra) { return regra.constructor.name === "CSSPageRule"; });
        conferir("uma regra @page pede papel A4", paginas.length === 1 && /A4/i.test(paginas[0].cssText), paginas.map(function (regra) { return regra.cssText; }).join(" "));

        const reduzido = regrasDeMidia(folha, "prefers-reduced-motion");
        conferirIgual("um bloco @media (prefers-reduced-motion: reduce)", reduzido.length, 1);
        conferirIgual("a condição é reduce", reduzido[0].conditionText, "(prefers-reduced-motion: reduce)");
        const zera = Array.from(reduzido[0].cssRules).some(function (regra) { return regra.selectorText === "*" && regra.style.getPropertyValue("transition") === "none" && regra.style.getPropertyPriority("transition") === "important"; });
        conferir("que zera toda transição (* { transition: none !important })", zera);
    });

    await testarAssincrono("impressão: sem menu e botões, fundo branco e texto preto mesmo no tema escuro, endereço ao lado de cada link, cartões inteiros", async function () {
        conferir("o CSS espelhado tem '@media print' e a troca vai pegar", espelhoDoCss.indexOf("@media print") >= 0);
        const impressao = await abrirPasso(passo, espelhoDoIndex, { largura: 794, altura: 1123, transformar: function (texto) { return comCssEmulado(texto, espelhoDoCss); } });
        try {
            const impJanela = impressao.contentWindow, impDocumento = impJanela.document;
            impDocumento.documentElement.dataset.tema = "escuro";
            const estilo = function (seletor, pseudo) { return impJanela.getComputedStyle(impDocumento.querySelector(seletor), pseudo || null); };

            conferirIgual("o nav some", estilo("nav").display, "none");
            conferirIgual("o botão de tema some", estilo("#botao-tema").display, "none");
            conferirIgual("o botão 'Ver estrutura' some", estilo("#botao-ver").display, "none");
            conferirIgual("o link 'Pular' some", estilo(".pular").display, "none");
            conferirIgual("os trechos de código (details) somem", estilo("details").display, "none");
            conferirIgual("a página fica clara mesmo com data-tema escuro", estilo("html").colorScheme, "light");
            conferirIgual("o fundo da página é branco", estilo("body").backgroundColor, "rgb(255, 255, 255)");
            conferirIgual("o texto é preto", estilo("body").color, "rgb(0, 0, 0)");
            conferirIgual("os links também são pretos", estilo("#contato a").color, "rgb(0, 0, 0)");
            conferirIgual("o corpo não tem largura máxima (usa a folha toda)", estilo("body").maxWidth, "none");
            conferirIgual("os projetos não são grade (bloco, um embaixo do outro)", estilo(".projetos").display, "block");

            const enderecoEscrito = function (link) { return impJanela.getComputedStyle(link, "::after").content; };
            // O crédito repetido em cada cartão não escreve o endereço (ele sai uma vez só, no rodapé): fica fora desta lista.
            const externos = Array.from(impDocumento.querySelectorAll('a[href^="http"]')).filter(function (link) { return link.closest(".credito") === null; });
            conferir(externos.length + " links externos (http), todos com o endereço escrito ao lado", externos.length >= 2 && externos.every(function (link) { return enderecoEscrito(link).indexOf(link.getAttribute("href")) >= 0; }), externos.map(enderecoEscrito).join(" | "));
            conferir("o endereço do curso sai uma vez só (rodapé), não repetido nos cartões", impDocumento.querySelector("footer a[href^='http']") !== null && enderecoEscrito(impDocumento.querySelector("footer a[href^='http']")).indexOf("https://") >= 0 && Array.from(impDocumento.querySelectorAll(".credito a")).every(function (link) { return ["none", "normal", '""'].indexOf(enderecoEscrito(link)) >= 0; }));
            conferir("o link do perfil mostra https://exemplo.invalid/alex: " + enderecoEscrito(impDocumento.querySelector('a[href^="https://exemplo"]')), enderecoEscrito(impDocumento.querySelector('a[href^="https://exemplo"]')).indexOf("https://exemplo.invalid/alex") >= 0);
            const semEndereco = Array.from(impDocumento.querySelectorAll('a[href^="#"], a[href^="mailto:"], .acoes a')).filter(function (link) { return ["none", "normal", '""'].indexOf(enderecoEscrito(link)) < 0; });
            conferir("âncoras (#…), e-mail (já aparece como texto) e caminhos relativos dos jogos não ganham endereço no papel", semEndereco.length === 0, semEndereco.map(function (link) { return link.getAttribute("href") + " → " + enderecoEscrito(link); }).join(" | "));
            conferirIgual("o aviso da estrutura (role=status) não sai no papel", estilo("#aviso-estrutura").display, "none");

            apertarTecla(impJanela, impDocumento, "h");
            conferirIgual("com a estrutura ligada (tecla H) o contorno tracejado dos marcos some no papel", estilo("main").outlineStyle, "none");
            conferirIgual("e a etiqueta do marco (::before) também", ["none", "normal", '""'].indexOf(impJanela.getComputedStyle(impDocumento.querySelector("main"), "::before").content) >= 0, true);
            conferirIgual("e o nível ao lado do título (::after) também", ["none", "normal", '""'].indexOf(impJanela.getComputedStyle(impDocumento.querySelector("h2"), "::after").content) >= 0, true);

            const cartoes = Array.from(impDocumento.querySelectorAll(".cartao"));
            conferir(cartoes.length + " cartões, todos com break-inside: avoid (não partem entre páginas)", cartoes.length === 4 && cartoes.every(function (cartao) { return impJanela.getComputedStyle(cartao).breakInside === "avoid"; }));
            conferir("as miniaturas ficam pequenas (≤ 12rem = 192 px)", cartoes.every(function (cartao) { return cartao.querySelector("img").getBoundingClientRect().width <= 192.5; }));
            conferirIgual("impressão: sem rolagem horizontal em A4 (794 px)", impDocumento.documentElement.scrollWidth <= impDocumento.documentElement.clientWidth, true);
        } finally {
            impressao.remove();
        }
    });

    await testarAssincrono("movimento reduzido: toda transição e animação zeradas; sem o pedido, só o botão tem transição de 0,15 s", async function () {
        const reduzido = await abrirPasso(passo, espelhoDoIndex, { transformar: function (texto) { return comCssEmulado(texto, espelhoDoCss).replace(/<script src="[^"]*" defer><\/script>/g, ""); } });
        try {
            const redJanela = reduzido.contentWindow, redDocumento = reduzido.contentDocument;
            const todos = Array.from(redDocumento.body.querySelectorAll("*"));
            const comTransicao = todos.filter(function (elemento) { return redJanela.getComputedStyle(elemento).transitionProperty !== "none" || parseFloat(redJanela.getComputedStyle(elemento).transitionDuration) > 0; });
            const comAnimacao = todos.filter(function (elemento) { return redJanela.getComputedStyle(elemento).animationName !== "none"; });
            conferir("reduzido: " + todos.length + " elementos, nenhum com transição (" + comTransicao.map(function (e) { return e.localName; }).join(",") + ")", todos.length > 20 && comTransicao.length === 0);
            conferirIgual("reduzido: nenhum com animação", comAnimacao.length, 0);
            conferirIgual("reduzido: o botão de tema tem transition-duration 0s", redJanela.getComputedStyle(redDocumento.getElementById("botao-tema")).transitionDuration, "0s");
        } finally {
            reduzido.remove();
        }

        const botao = documento.getElementById("botao-tema");
        const pedeMenos = janela.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (pedeMenos) return;                       // o Chrome do teste já pede menos movimento: o controle não vale
        conferirIgual("controle, sem o pedido: o botão anima a cor em 0,15 s", janela.getComputedStyle(botao).transitionDuration, "0.15s");
        const animados = Array.from(documento.body.querySelectorAll("*")).filter(function (elemento) { return parseFloat(janela.getComputedStyle(elemento).transitionDuration) > 0; });
        conferir("e só botões animam (" + animados.map(function (e) { return e.localName; }).join(",") + ")", animados.length > 0 && animados.every(function (e) { return e.localName === "button"; }));
        conferirIgual("controle: nada tem animação de keyframes", Array.from(documento.body.querySelectorAll("*")).filter(function (e) { return janela.getComputedStyle(e).animationName !== "none"; }).length, 0);
    });

    testar("no fim: sem erros, sem jogo aberto, dados como no começo", function () {
        conferirIgual("nenhum erro não tratado", janela.__erros.join(" | "), "");
        conferirIgual("nenhum iframe aberto no passo", documento.querySelectorAll("iframe").length, 0);
        conferirIgual("nenhum jogarAqui ligado", projetos.filter(function (projeto) { return projeto.jogarAqui; }).length, 0);
    });

    quadro.remove();
}
