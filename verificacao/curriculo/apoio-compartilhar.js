/*
  APOIO DO COMPARTILHAMENTO: os casos do <head> que o passo 6 e o final repartem (idioma, título, descrição, Open Graph, ícone, theme-color).

  Carregue DEPOIS de apoio-curriculo.js. `executarCasosDeCompartilhamento(passo, espelhoDoIndex)` roda os casos e devolve o iframe aberto
  (quem chama o fecha), para a página somar os casos dela.
*/
const PREFIXO_DO_ICONE = "data:image/svg+xml,";
const CAMPOS_DO_CARTAO = ["og:type", "og:locale", "og:title", "og:description", "og:url", "og:image", "og:image:alt"];

function carregarImagem(endereco) {
    return new Promise(function (resolver) {
        const imagem = new Image();
        imagem.onload = function () { resolver(imagem.naturalWidth > 0); };
        imagem.onerror = function () { resolver(false); };
        imagem.src = endereco;
    });
}

function hexParaCor(hex) {
    return { r: parseInt(hex.slice(1, 3), 16), g: parseInt(hex.slice(3, 5), 16), b: parseInt(hex.slice(5, 7), 16), a: 1 };
}

async function executarCasosDeCompartilhamento(passo, espelhoDoIndex) {
    const pagina = new DOMParser().parseFromString(espelhoDoIndex, "text/html");

    function metasPorNome(nome) {
        return Array.from(pagina.head.querySelectorAll('meta[name="' + nome + '"]'));
    }

    function metasPorPropriedade(propriedade) {
        return Array.from(pagina.head.querySelectorAll('meta[property="' + propriedade + '"]'));
    }

    function conteudoUnico(lista) {
        return lista.length === 1 ? lista[0].getAttribute("content") : null;
    }

    testar("idioma, codificação e viewport", function () {
        conferirIgual("<html lang> é pt-BR", pagina.documentElement.getAttribute("lang"), "pt-BR");
        const charset = pagina.head.querySelector("meta[charset]");
        conferir("meta charset é UTF-8", charset !== null && /^utf-8$/i.test(charset.getAttribute("charset")));
        conferirIgual("e é o primeiro filho do head (o navegador tem de achá-lo nos primeiros 1024 bytes)", pagina.head.firstElementChild, charset);
        const viewport = metasPorNome("viewport");
        conferir("meta viewport pede width=device-width", viewport.length === 1 && /width=device-width/.test(viewport[0].content));
    });

    testar("título e descrição", function () {
        const titulos = pagina.head.querySelectorAll("title");
        conferirIgual("um <title>", titulos.length, 1);
        const titulo = titulos[0].textContent.trim();
        conferir("o título tem texto e cabe na aba e na busca (" + titulo.length + " letras, de 1 a 70)", titulo.length >= 1 && titulo.length <= 70);
        const descricoes = metasPorNome("description");
        conferirIgual("uma meta description", descricoes.length, 1);
        const descricao = conteudoUnico(descricoes) || "";
        conferir("a descrição tem texto (" + descricao.length + " letras)", descricao.trim().length >= 20);
        conferir("e tem no máximo 160 letras (" + descricao.length + ")", descricao.length <= 160);
        conferirIgual("o og:title repete o título da aba", conteudoUnico(metasPorPropriedade("og:title")), titulo);
    });

    testar("Open Graph: og:title, og:description, og:image, og:url, og:type e og:locale, cada um uma vez e preenchido", function () {
        CAMPOS_DO_CARTAO.forEach(function (campo) {
            const metas = metasPorPropriedade(campo);
            conferirIgual(campo + ": exatamente uma meta (com property=, não name=)", metas.length, 1);
            conferir(campo + ": com conteúdo", metas.length === 1 && metas[0].getAttribute("content").trim() !== "");
        });
        conferirIgual("og:type é website", conteudoUnico(metasPorPropriedade("og:type")), "website");
        conferirIgual("og:locale é pt_BR (com sublinhado, como o Open Graph pede)", conteudoUnico(metasPorPropriedade("og:locale")), "pt_BR");
        const descricaoDoCartao = conteudoUnico(metasPorPropriedade("og:description")) || "";
        conferir("og:description cabe num cartão (" + descricaoDoCartao.length + " letras, até 200)", descricaoDoCartao.length > 0 && descricaoDoCartao.length <= 200);
    });

    testar("og:image e og:url são marcadores avisados como tais, e absolutos (https://) para quando forem trocados", function () {
        ["og:image", "og:url"].forEach(function (campo) {
            const endereco = conteudoUnico(metasPorPropriedade(campo)) || "";
            conferir(campo + " começa com https:// (relativo ou file:// não funciona para a rede social): " + endereco, /^https:\/\//.test(endereco));
            conferir(campo + " é claramente um marcador (contém SEU-USUARIO, nada que pareça uma conta real)", endereco.indexOf("SEU-USUARIO") >= 0);
        });
        conferir("e o HTML avisa em comentário, antes das tags, que são MARCADORES a trocar", /<!--[^>]*MARCADORES[^>]*-->\s*<meta property="og:url"/.test(espelhoDoIndex), "comentário MARCADORES ao lado do og:url");
        const textoDaImagem = conteudoUnico(metasPorPropriedade("og:image:alt")) || "";
        conferir("og:image:alt descreve a imagem do cartão (" + textoDaImagem.length + " letras)", textoDaImagem.trim().length >= 10);
    });

    testar("tudo que o cartão diz é dado fictício, sem recurso de fora e sem dado pessoal", function () {
        const todasAsMetas = Array.from(pagina.head.querySelectorAll("meta[content]")).map(function (meta) { return meta.getAttribute("content"); }).join("\n");
        conferir("nenhum e-mail real: só @exemplo.invalid", (todasAsMetas.match(/[\w.+-]+@[\w.-]+/g) || []).every(function (email) { return /@exemplo\.invalid$/.test(email); }));
        conferir("nenhum telefone nem CPF nas metas", !/\d{3}\.\d{3}\.\d{3}-\d{2}|\(?\d{2}\)?\s?9?\d{4}-?\d{4}/.test(todasAsMetas));
        const remotos = Array.from(pagina.querySelectorAll("script[src], link[href], img[src], iframe[src]")).filter(function (elemento) {
            const endereco = elemento.getAttribute("src") || elemento.getAttribute("href");
            return /^(https?:)?\/\//i.test(endereco);
        });
        conferirIgual("nenhum script, folha, imagem ou iframe vem de fora (o curso abre sem internet)", remotos.map(function (e) { return e.outerHTML.slice(0, 60); }).join(" | "), "");
    });

    await testarAssincrono("ícone: um SVG embutido (data:), válido, que o navegador consegue desenhar", async function () {
        const icones = Array.from(pagina.head.querySelectorAll("link")).filter(function (link) { return /(^|\s)icon(\s|$)/i.test(link.getAttribute("rel") || ""); });
        conferirIgual("um <link rel=\"icon\">", icones.length, 1);
        const endereco = icones[0].getAttribute("href");
        conferir("o href começa com " + PREFIXO_DO_ICONE + " (nenhum arquivo, nenhum 404 de favicon.ico)", endereco.indexOf(PREFIXO_DO_ICONE) === 0);
        const svg = decodeURIComponent(endereco.slice(PREFIXO_DO_ICONE.length));
        const documentoSvg = new DOMParser().parseFromString(svg, "image/svg+xml");
        conferir("o SVG é XML válido, com <svg> na raiz", documentoSvg.querySelector("parsererror") === null && documentoSvg.documentElement.localName === "svg");
        conferir("e declara o espaço de nomes (sem ele o navegador não desenha)", documentoSvg.documentElement.namespaceURI === "http://www.w3.org/2000/svg");
        conferirIgual("e o navegador o desenha como imagem", await carregarImagem(endereco), true);
    });

    testar("theme-color: cores #rrggbb, uma por tema quando há media", function () {
        const cores = metasPorNome("theme-color");
        conferir("existe pelo menos uma meta theme-color (" + cores.length + ")", cores.length >= 1);
        cores.forEach(function (meta) {
            conferir("theme-color " + meta.getAttribute("content") + " é #rrggbb", /^#[0-9a-f]{6}$/i.test(meta.getAttribute("content")));
            const media = meta.getAttribute("media");
            conferir("e a media é vazia ou prefers-color-scheme (" + media + ")", media === null || /^\(prefers-color-scheme: (light|dark)\)$/.test(media));
        });
    });

    const quadro = await abrirPasso(passo, espelhoDoIndex);
    const janela = quadro.contentWindow, documento = janela.document;

    testar("a cor da barra do navegador é o fundo da página, nos dois temas (lido do CSS de verdade)", function () {
        const cores = metasPorNome("theme-color");
        cores.forEach(function (meta) {
            const tema = /dark/.test(meta.getAttribute("media") || "") ? "escuro" : "claro";
            documento.documentElement.dataset.tema = tema;
            const fundo = corDaVariavel(documento, janela, "fundo", "backgroundColor");
            const esperada = hexParaCor(meta.getAttribute("content"));
            conferir("tema " + tema + ": theme-color " + meta.getAttribute("content") + " = fundo da página rgb(" + [fundo.r, fundo.g, fundo.b].join(",") + ")", fundo.r === esperada.r && fundo.g === esperada.g && fundo.b === esperada.b);
        });
        documento.documentElement.removeAttribute("data-tema");
        conferir("os dois temas têm theme-color próprio", cores.some(function (meta) { return /dark/.test(meta.getAttribute("media") || ""); }) && cores.some(function (meta) { return /light/.test(meta.getAttribute("media") || ""); }));
    });

    testar("o script atualiza o theme-color: ele acompanha o tema que a pessoa escolhe, não só o do sistema", function () {
        const temaDoAluno = lerArmazenado();
        const cores = function () { return Array.from(documento.querySelectorAll('meta[name="theme-color"]')).map(function (meta) { return meta.content; }); };
        const fundo = function () { return janela.getComputedStyle(documento.body).backgroundColor; };
        try {
            const botao = documento.getElementById("botao-tema");
            documento.documentElement.dataset.tema = "claro";
            const fundoClaro = fundo();
            botao.click();
            const fundoEscuro = fundo();
            conferir("o clique escureceu a página (" + fundoClaro + " → " + fundoEscuro + ")", luminanciaRelativa(lerCor(fundoEscuro)) < 0.05 && luminanciaRelativa(lerCor(fundoClaro)) > 0.5);
            conferirIgual("depois de escolher escuro, toda theme-color vale o fundo escuro", cores().filter(function (cor) { return cor !== fundoEscuro; }).join(" "), "");
            botao.click();
            conferirIgual("depois de voltar ao claro, toda theme-color vale o fundo claro", cores().filter(function (cor) { return cor !== fundoClaro; }).join(" "), "");
            conferir("e são " + cores().length + " metas theme-color, como no HTML", cores().length === metasPorNome("theme-color").length);
        } finally {
            gravarArmazenado(temaDoAluno);
        }
    });

    testar("o corpo e os scripts do passo 6 continuam funcionando com o <head> novo", function () {
        conferirIgual("a carga não deu erro nem escreveu no console.error", janela.__erros.concat(janela.__consoleErros).join(" | "), "");
        conferirCartoesIguaisAosDados(janela);
        conferirImagensComAlt(documento);
        conferirIgual("o título da aba do iframe é o do espelho", documento.title, pagina.title);
        conferirIgual("um só h1", documento.querySelectorAll("h1").length, 1);
        conferirIgual("nenhum iframe na carga", documento.querySelectorAll("iframe").length, 0);
    });

    return quadro;
}
