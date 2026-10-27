/*
  ============================================================
  XENOMORPH — AS OPÇÕES (acessibilidade)
  ============================================================

  O GDD pede (seção 11) "opções de acessibilidade para remapear
  controles, ajustar vibração, modificar a intensidade dos efeitos
  visuais e personalizar indicadores de combate". Cada uma é um campo
  deste objeto, e um controle na base.

  As opções NÃO moram na campanha: são preferências de quem joga, não
  progresso. Apagar a campanha não deveria desfazer o remapeamento de
  quem só consegue jogar com outras teclas. Por isso, outra chave no
  localStorage, com a mesma desconfiança na leitura.
*/
const CHAVE_DAS_OPCOES = "xenomorph-opcoes";

// As teclas padrão, copiadas de dados/controles.js antes de qualquer remapeamento.
const CONTROLES_PADRAO = JSON.parse(JSON.stringify(CONTROLES));

function opcoesPadrao() {
    return {
        som: true,
        efeitosReduzidos: matchMedia("(prefers-reduced-motion: reduce)").matches,
        vibracao: true,
        numerosDeDano: true,
        teclas: {}   // só as ações remapeadas; as outras usam o padrão
    };
}

function carregarOpcoes() {
    const limpa = opcoesPadrao();

    try {
        const lida = JSON.parse(localStorage.getItem(CHAVE_DAS_OPCOES));
        if (lida === null || typeof lida !== "object") {
            return limpa;
        }
        for (const nome of ["som", "efeitosReduzidos", "vibracao", "numerosDeDano"]) {
            if (typeof lida[nome] === "boolean") {
                limpa[nome] = lida[nome];
            }
        }
        for (const [acao, teclas] of Object.entries(lida.teclas ?? {})) {
            const valida = acao in CONTROLES && Array.isArray(teclas) && teclas.length > 0
                && teclas.every(tecla => typeof tecla === "string" && tecla.length > 0);
            if (valida) {
                limpa.teclas[acao] = teclas;
            }
        }
    } catch (erro) {
        // Sem armazenamento ou lixo: ficam as opções padrão.
    }
    return limpa;
}

function salvarOpcoes() {
    try {
        localStorage.setItem(CHAVE_DAS_OPCOES, JSON.stringify(opcoes));
    } catch (erro) {
        // As opções valem até fechar a página.
    }
}

/*
  REMAPEAR é trocar as teclas de uma ação na tabela CONTROLES — a tabela
  que o passo 2 criou exatamente para isto. O jogo inteiro pergunta
  acao("pular"); ninguém mais sabe que tecla é.

  Uma tecla nova sai de qualquer outra ação que a usava: duas ações na
  mesma tecla seriam um bug que o jogador não saberia explicar.
*/
function aplicarTeclas() {
    for (const acao of Object.keys(CONTROLES)) {
        CONTROLES[acao] = [...(opcoes.teclas[acao] ?? CONTROLES_PADRAO[acao])];
    }
    atualizarTeclasDoJogo();
}

function remapear(acao, tecla) {
    for (const outra of Object.keys(CONTROLES)) {
        if (outra !== acao && CONTROLES[outra].includes(tecla)) {
            opcoes.teclas[outra] = CONTROLES[outra].filter(atual => atual !== tecla);
            if (opcoes.teclas[outra].length === 0) {
                delete opcoes.teclas[outra];   // sem tecla nenhuma, a ação volta ao padrão
            }
        }
    }
    opcoes.teclas[acao] = [tecla];
    aplicarTeclas();
    salvarOpcoes();
}

function restaurarTeclas() {
    opcoes.teclas = {};
    aplicarTeclas();
    salvarOpcoes();
}

/*
  A VIBRAÇÃO, onde houver (celulares). navigator.vibrate não existe em
  todo navegador: perguntar antes de chamar.
*/
function vibrar(milissegundos) {
    if (opcoes.vibracao && typeof navigator.vibrate === "function") {
        navigator.vibrate(milissegundos);
    }
}

// Como uma tecla aparece para quem lê: " " vira "Espaço", "arrowleft" vira "←".
const NOMES_DAS_TECLAS = {
    " ": "Espaço", arrowleft: "←", arrowright: "→", arrowup: "↑", arrowdown: "↓",
    shift: "Shift", escape: "Esc", enter: "Enter", control: "Ctrl", alt: "Alt", tab: "Tab"
};

function nomeDaTecla(tecla) {
    return NOMES_DAS_TECLAS[tecla] ?? tecla.toUpperCase();
}
