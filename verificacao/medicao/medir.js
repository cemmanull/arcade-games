/*
  MEDIR.JS — a parte comum das páginas de medição para abrir no CELULAR.

  Uma página de medição (proa-acesa-08.html, e no futuro reflexo-08.html) entrega a este arquivo uma lista de cenários e uma função
  que lê o aparelho; aqui ficam o relógio de verdade (requestAnimationFrame, sem apoio.js), as estatísticas, o painel e o botão
  "Copiar resultado". Script clássico: carregue DEPOIS dos scripts do jogo e chame `montarPainelDeMedicao(...)` no evento `load`.

  Um cenário é { nome, preparar(), aoQuadro(instante), lerAmostra() }:
    preparar()        põe o jogo na situação a medir (roda uma vez, antes do aquecimento);
    aoQuadro(t)       opcional: o "dedo" do robô, roda a cada quadro, depois do quadro do jogo;
    lerAmostra()      devolve { atualizacao, desenho, quadro, chamadas, triangulos } (ms do último quadro do jogo; as duas últimas são opcionais).
*/

const LIMITE_DE_PAUSA_EM_MILISSEGUNDOS = 500;   // um intervalo maior é aba escondida ou tela apagada: não entra nas estatísticas
const LIMITE_DE_QUADRO_LENTO_EM_MILISSEGUNDOS = 20;   // abaixo de 50 fps
const QUADROS_PADRAO = 600, AQUECIMENTO_PADRAO = 60;

// ---- ESTATÍSTICA (pura: testável sem navegador) ----
/* Mediana, p95 (posição ⌈0,95·n⌉ da lista ordenada) e máximo. Lista vazia: tudo 0. */
function calcularEstatisticas(valores) {
    if (valores.length === 0) {
        return { quantidade: 0, mediana: 0, p95: 0, maximo: 0 };
    }
    const ordenados = valores.slice().sort(function (a, b) { return a - b; });
    const meio = Math.floor(ordenados.length / 2);
    const mediana = ordenados.length % 2 === 1 ? ordenados[meio] : (ordenados[meio - 1] + ordenados[meio]) / 2;
    const posicaoDoP95 = Math.ceil(0.95 * ordenados.length) - 1;
    return { quantidade: ordenados.length, mediana: mediana, p95: ordenados[posicaoDoP95], maximo: ordenados[ordenados.length - 1] };
}

function porcentagemAcima(valores, limite) {
    if (valores.length === 0) {
        return 0;
    }
    return valores.filter(function (valor) { return valor > limite; }).length / valores.length * 100;
}

// ---- MEDIR UM CENÁRIO ----
/* Roda o cenário com o relógio real: `aquecimento` quadros descartados (shaders, recifes, JIT), depois `quadros` medidos. */
function medirCenario(cenario, opcoes) {
    return new Promise(function (resolver) {
        const amostras = { intervalo: [], atualizacao: [], desenho: [], quadro: [] };
        let chamadas = 0, triangulos = 0, pausas = 0;
        let instanteAnterior = null, quadrosVistos = 0, quadrosMedidos = 0;

        function aoQuadro(instante) {
            cenario.aoQuadro && cenario.aoQuadro(instante);
            const intervalo = instanteAnterior === null ? null : instante - instanteAnterior;
            instanteAnterior = instante;
            if (intervalo !== null) {
                quadrosVistos++;
            }
            if (quadrosVistos > opcoes.aquecimento) {
                quadrosMedidos++;
                if (intervalo > LIMITE_DE_PAUSA_EM_MILISSEGUNDOS) {
                    pausas++;
                } else {
                    const amostra = cenario.lerAmostra();
                    amostras.intervalo.push(intervalo);
                    amostras.atualizacao.push(amostra.atualizacao);
                    amostras.desenho.push(amostra.desenho);
                    amostras.quadro.push(amostra.quadro);
                    chamadas = amostra.chamadas || 0;
                    triangulos = amostra.triangulos || 0;
                }
            }
            opcoes.aoProgredir && opcoes.aoProgredir(Math.min(quadrosVistos, opcoes.aquecimento + opcoes.quadros), opcoes.aquecimento + opcoes.quadros);
            if (quadrosMedidos < opcoes.quadros) {
                requestAnimationFrame(aoQuadro);
                return;
            }
            resolver(resumirCenario(cenario.nome, amostras, chamadas, triangulos, pausas));
        }

        cenario.preparar();
        requestAnimationFrame(aoQuadro);
    });
}

function resumirCenario(nome, amostras, chamadas, triangulos, pausas) {
    const intervalo = calcularEstatisticas(amostras.intervalo);
    return {
        nome: nome,
        quadros: intervalo.quantidade,
        pausas: pausas,
        intervalo: intervalo,
        fps: intervalo.mediana > 0 ? 1000 / intervalo.mediana : 0,
        atualizacao: calcularEstatisticas(amostras.atualizacao),
        desenho: calcularEstatisticas(amostras.desenho),
        quadro: calcularEstatisticas(amostras.quadro),
        quadrosLentos: porcentagemAcima(amostras.intervalo, LIMITE_DE_QUADRO_LENTO_EM_MILISSEGUNDOS),
        chamadas: chamadas,
        triangulos: triangulos
    };
}

// ---- O APARELHO ----
/* `extras` é o que só o jogo sabe: { pixelRatioDoJogo, tamanhoDoCanvas, placaDeVideo, ... }. Campos ausentes saem como "?". */
function coletarInformacoesDoAparelho(extras) {
    return Object.assign({
        agente: navigator.userAgent,
        janela: window.innerWidth + "x" + window.innerHeight,
        tela: window.screen.width + "x" + window.screen.height,
        pixelRatioDoAparelho: window.devicePixelRatio,
        nucleos: navigator.hardwareConcurrency || "?",
        memoriaEmGB: navigator.deviceMemory || "?"
    }, extras);
}

// ---- O TEXTO PARA COLAR NO CHAT ----
function formatarMilissegundos(valor) { return valor.toFixed(1); }

function formatarTrio(estatisticas) {
    return [estatisticas.mediana, estatisticas.p95, estatisticas.maximo].map(formatarMilissegundos).join(" / ");
}

/* Um bloco compacto, em texto puro. Convenção de cada trio: mediana / p95 / máximo, em ms. */
function montarTextoDoResultado(titulo, aparelho, resultados, parametros) {
    const linhas = [
        "MEDICAO " + titulo,
        "Aparelho: " + aparelho.agente,
        "Tela: janela " + aparelho.janela + " · tela " + aparelho.tela + " · pixelRatio do aparelho " + aparelho.pixelRatioDoAparelho + " · do jogo " + aparelho.pixelRatioDoJogo,
        "Canvas: " + aparelho.tamanhoDoCanvas + " · GPU: " + aparelho.placaDeVideo + " · núcleos " + aparelho.nucleos + " · RAM(GB) " + aparelho.memoriaEmGB + " · three r" + (aparelho.versaoDoThree || "?"),
        "Quadros medidos por cenário: " + parametros.quadros + " (aquecimento " + parametros.aquecimento + ") · cada trio = mediana / p95 / máx em ms"
    ];
    resultados.forEach(function (resultado) {
        linhas.push("");
        linhas.push("[" + resultado.nome + "]");
        linhas.push("  fps " + resultado.fps.toFixed(0) + " (intervalo " + formatarTrio(resultado.intervalo) + ") · quadros acima de " + LIMITE_DE_QUADRO_LENTO_EM_MILISSEGUNDOS + " ms: " + resultado.quadrosLentos.toFixed(0) + "%");
        linhas.push("  JS do jogo " + formatarTrio(resultado.atualizacao) + " · desenho (CPU) " + formatarTrio(resultado.desenho) + " · total CPU " + formatarTrio(resultado.quadro));
        linhas.push("  draw calls " + resultado.chamadas + " · triângulos " + resultado.triangulos + (resultado.pausas > 0 ? " · pausas ignoradas " + resultado.pausas : "") + (resultado.observacao ? " · " + resultado.observacao : ""));
    });
    return linhas.join("\n");
}

// ---- COPIAR ----
/* Promessa de true/false. `navigator.clipboard` só existe em https ou localhost; no celular, em http://192.168..., vale o plano B. */
function copiarTexto(texto) {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(texto).then(function () { return true; }, function () { return copiarSelecionandoUmCampo(texto); });
    }
    return Promise.resolve(copiarSelecionandoUmCampo(texto));
}

function copiarSelecionandoUmCampo(texto) {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("aria-hidden", "true");
    campo.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px";   // 16 px: o iOS não dá zoom
    document.body.appendChild(campo);
    campo.focus();
    campo.select();
    campo.setSelectionRange(0, texto.length);
    let copiou = false;
    try {
        copiou = document.execCommand("copy");
    } catch (erro) {
        copiou = false;
    }
    document.body.removeChild(campo);
    return copiou;
}

// ---- O PAINEL ----
const ESTILO_DO_PAINEL = [
    "#painel-de-medicao{position:fixed;inset:0;z-index:100;display:flex;flex-direction:column;gap:12px;padding:16px;overflow:auto;box-sizing:border-box;",
    "background:rgba(7,17,28,.96);color:#fff;font:18px/1.4 system-ui,sans-serif}",
    "#painel-de-medicao h2{margin:0;font-size:24px}",
    "#painel-de-medicao p{margin:0}",
    "#painel-de-medicao [hidden]{display:none}",
    "#painel-de-medicao button{width:auto;height:auto;min-height:56px;padding:0 20px;pointer-events:auto;border:2px solid #fff;border-radius:12px;background:#fff;color:#07111c;font:bold 20px system-ui,sans-serif}",
    "#painel-de-medicao button[disabled]{opacity:.4}",
    "#painel-de-medicao .secundario{background:transparent;color:#fff}",
    "#painel-de-medicao textarea{flex:1;min-height:260px;width:100%;box-sizing:border-box;padding:8px;border:2px solid #7fa7c9;border-radius:8px;",
    "background:#0b1a28;color:#e8f1f8;font:14px/1.4 ui-monospace,Consolas,monospace}",
    "#painel-de-medicao .linha{display:flex;gap:12px;flex-wrap:wrap}",
    "#painel-de-medicao .linha button{flex:1 1 150px}",
    "#painel-de-medicao .erro{padding:12px;border:2px solid #ff8a4d;border-radius:8px}"
].join("");

function criarElemento(tag, texto, atributos) {
    const elemento = document.createElement(tag);
    elemento.textContent = texto || "";
    Object.keys(atributos || {}).forEach(function (nome) { elemento.setAttribute(nome, atributos[nome]); });
    return elemento;
}

function lerNumeroDoEndereco(nome, padrao, minimo, maximo) {
    const valor = Number(new URLSearchParams(window.location.search).get(nome));
    return Number.isInteger(valor) && valor >= minimo && valor <= maximo ? valor : padrao;
}

/*
  Monta o painel por cima da página e liga os botões. `configuracao`:
    titulo               "Proa Acesa — passo 8"
    cenarios             lista de cenários (ver o topo do arquivo)
    verificarRequisitos  () → texto do problema, ou "" se está tudo pronto (three.js baixou? WebGL ligou?)
    lerAparelho          () → extras para coletarInformacoesDoAparelho
  Na barra de endereço: ?quadros=N&aquecimento=N mudam a medição; ?auto=1 começa sozinho (para testar sem dedo).
*/
function montarPainelDeMedicao(configuracao) {
    const parametros = {
        quadros: lerNumeroDoEndereco("quadros", QUADROS_PADRAO, 5, 20000),
        aquecimento: lerNumeroDoEndereco("aquecimento", AQUECIMENTO_PADRAO, 0, 2000)
    };
    document.head.appendChild(criarElemento("style", ESTILO_DO_PAINEL));
    const painel = criarElemento("section", "", { id: "painel-de-medicao", "aria-label": "Medição de desempenho" });
    const titulo = criarElemento("h2", "Medição: " + configuracao.titulo);
    const instrucao = criarElemento("p", "Aperte Medir e espere cerca de meio minuto, sem mexer no celular. Deixe a tela acesa e esta aba aberta.");
    const estado = criarElemento("p", "", { "aria-live": "polite" });
    const problema = criarElemento("p", "", { class: "erro", role: "alert" });
    const campoDoResultado = criarElemento("textarea", "", { id: "resultado", readonly: "readonly", "aria-label": "Resultado da medição", hidden: "hidden" });
    const botaoMedir = criarElemento("button", "Medir", { type: "button", id: "botao-medir" });
    const botaoCopiar = criarElemento("button", "Copiar resultado", { type: "button", id: "botao-copiar", hidden: "hidden" });
    const botaoDeNovo = criarElemento("button", "Medir de novo", { type: "button", id: "botao-de-novo", class: "secundario", hidden: "hidden" });
    const linhaDosBotoes = criarElemento("div", "", { class: "linha" });
    linhaDosBotoes.append(botaoMedir, botaoCopiar, botaoDeNovo);
    painel.append(titulo, instrucao, problema, linhaDosBotoes, estado, campoDoResultado);
    document.body.appendChild(painel);

    let medindo = false;

    function mostrarProblema(texto) {
        problema.textContent = texto;
        problema.hidden = texto === "";
        botaoMedir.disabled = texto !== "";
    }

    async function medirTudo() {
        if (medindo) {
            return;
        }
        const impedimento = configuracao.verificarRequisitos();
        mostrarProblema(impedimento);
        if (impedimento !== "") {
            return;
        }
        medindo = true;
        [botaoMedir, botaoCopiar, botaoDeNovo, campoDoResultado].forEach(function (elemento) { elemento.hidden = true; });
        const resultados = [];
        for (let i = 0; i < configuracao.cenarios.length; i++) {
            const cenario = configuracao.cenarios[i];
            const prefixo = "Cenário " + (i + 1) + " de " + configuracao.cenarios.length + ": " + cenario.nome;
            estado.textContent = prefixo + " — preparando…";
            resultados.push(await medirCenario(cenario, {
                quadros: parametros.quadros,
                aquecimento: parametros.aquecimento,
                aoProgredir: function (feitos, total) { estado.textContent = prefixo + " — quadro " + feitos + " de " + total; }
            }));
            if (cenario.aoTerminar) {
                resultados[i].observacao = cenario.aoTerminar();
            }
        }
        const texto = montarTextoDoResultado(configuracao.titulo, coletarInformacoesDoAparelho(configuracao.lerAparelho()), resultados, parametros);
        campoDoResultado.value = texto;
        campoDoResultado.hidden = false;
        [botaoCopiar, botaoDeNovo].forEach(function (elemento) { elemento.hidden = false; });
        estado.textContent = "Pronto. Aperte “Copiar resultado” e cole na conversa.";
        medindo = false;
        window.resultadoDaMedicao = { texto: texto, resultados: resultados };   // para quem automatiza (teste sem dedo)
    }

    botaoMedir.addEventListener("click", medirTudo);
    botaoDeNovo.addEventListener("click", medirTudo);
    botaoCopiar.addEventListener("click", function () {
        copiarTexto(campoDoResultado.value).then(function (copiou) {
            estado.textContent = copiou ? "Copiado! Cole na conversa." : "Não consegui copiar sozinho: toque no texto abaixo, escolha “Selecionar tudo” e “Copiar”.";
            if (!copiou) {
                campoDoResultado.focus();
                campoDoResultado.select();
            }
        });
    });

    mostrarProblema(configuracao.verificarRequisitos());
    if (new URLSearchParams(window.location.search).get("auto") === "1") {
        medirTudo();
    }
}
