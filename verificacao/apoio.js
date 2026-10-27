/*
  APOIO — o mínimo para testar um passo do curso sem biblioteca nenhuma.

  Carregue este arquivo ANTES do script do jogo: ele troca o relógio e o
  sorteio, e o jogo, ao carregar, já pega as versões falsas.

  A página de teste precisa de um <pre id="resultado"></pre>.
*/

let quantidadeDeAcertos = 0;
let quantidadeDeFalhas = 0;

let funcaoDoProximoQuadro = null;
let instanteFalsoEmMilissegundos = 0;


// ============================================================
// 1. RELÓGIO FALSO — o teste move o loop quadro a quadro
// ============================================================
window.requestAnimationFrame = function (funcao) {
    funcaoDoProximoQuadro = funcao;
    return 1;
};

performance.now = function () {
    return instanteFalsoEmMilissegundos;
};

/*
  Faz passar `milissegundos` de tempo falso e entrega UM quadro ao jogo.
  Devolve false se o jogo não pediu o próximo quadro (loop parado).
*/
function avancarQuadro(milissegundos) {
    if (funcaoDoProximoQuadro === null) {
        return false;
    }

    const funcao = funcaoDoProximoQuadro;
    funcaoDoProximoQuadro = null;
    instanteFalsoEmMilissegundos += milissegundos;
    funcao(instanteFalsoEmMilissegundos);
    return true;
}

function avancarQuadros(quantidade, milissegundos) {
    for (let i = 0; i < quantidade; i++) {
        avancarQuadro(milissegundos);
    }
}


// ============================================================
// 2. SORTEIO REPETÍVEL (mulberry32)
// ============================================================
let estadoDoSorteio = 1;

function semearSorteio(semente) {
    estadoDoSorteio = semente >>> 0;
}

function sortearDeNovo() {
    estadoDoSorteio = (estadoDoSorteio + 0x6D2B79F5) >>> 0;
    let mistura = estadoDoSorteio;
    mistura = Math.imul(mistura ^ (mistura >>> 15), mistura | 1);
    mistura ^= mistura + Math.imul(mistura ^ (mistura >>> 7), mistura | 61);
    return ((mistura ^ (mistura >>> 14)) >>> 0) / 4294967296;
}

Math.random = sortearDeNovo;
semearSorteio(12345);


// ============================================================
// 3. AFIRMAÇÕES E RESULTADO
// ============================================================
function escreverLinha(texto) {
    document.getElementById("resultado").textContent += texto + "\n";
}

function conferir(nome, condicao, detalhe) {
    if (condicao) {
        quantidadeDeAcertos++;
        escreverLinha("PASS  " + nome);
        return;
    }

    quantidadeDeFalhas++;
    escreverLinha("FALHA " + nome + (detalhe ? "  -> " + detalhe : ""));
}

function conferirIgual(nome, obtido, esperado) {
    conferir(
        nome,
        obtido === esperado,
        "esperado " + JSON.stringify(esperado) + ", obtido " + JSON.stringify(obtido)
    );
}

/* Roda um caso; uma exceção dentro dele vira uma falha, não derruba os outros. */
function testar(nome, funcaoDoCaso) {
    try {
        funcaoDoCaso();
    } catch (erro) {
        quantidadeDeFalhas++;
        escreverLinha("FALHA " + nome + "  -> exceção: " + erro);
    }
}

/* Última chamada da página. O executor procura exatamente esta linha. */
function finalizar() {
    escreverLinha("RESULTADO: " + quantidadeDeAcertos + " ok, " + quantidadeDeFalhas + " falhas");
}

window.addEventListener("error", function (evento) {
    quantidadeDeFalhas++;
    escreverLinha("FALHA erro não tratado  -> " + evento.message);
});
