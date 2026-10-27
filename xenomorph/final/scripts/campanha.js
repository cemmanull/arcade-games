/*
  ============================================================
  XENOMORPH — A CAMPANHA
  ============================================================

  O que sobrevive à morte: salvar e ler com desconfiança, aplicar as
  melhorias, os três finais de uma expedição e a extração.
*/


// ============================================================
// A CAMPANHA
// ============================================================
/*
  O CICLO ROGUELIKE (GDD, seção 3): preparar na base → descer → explorar
  e lutar → coletar amostras → extrair, cumprir a missão ou morrer → usar
  as amostras para evoluir → descer de novo.

  Duas memórias, de tamanhos diferentes:

  - a EXPEDIÇÃO: o planeta, a vida, a munição, as amostras carregadas.
    Some ao fim de cada descida.
  - a CAMPANHA: as amostras guardadas, as melhorias, as habilidades
    permanentes, os registros. Sobrevive à morte — e ao fechar a página,
    salva no navegador.

  "A morte deve provocar a perda de parte dos recursos temporários, mas
  não apagar completamente o progresso do jogador": morrer guarda METADE
  das amostras carregadas; extrair ou cumprir a missão guarda TODAS.
*/
function campanhaNova() {
    return {
        versao: VERSAO_DA_CAMPANHA,
        amostras: 0,
        melhorias: Object.fromEntries(Object.keys(MELHORIAS).map(nome => [nome, 0])),
        habilidades: { impulso: false },
        registrosLidos: 0,
        armas: { desbloqueadas: [...ARMAS_INICIAIS], levadas: [...ARMAS_INICIAIS] },
        estatisticas: { expedicoes: 0, mortes: 0, extracoes: 0, vitorias: 0, amostrasGuardadas: 0 },
        bestiario: []
    };
}

/*
  LER COM DESCONFIANÇA — a lição do recorde do Tetris, agora para um
  objeto inteiro. O que vem do localStorage pode ser de outra versão do
  jogo, pode ter sido editado à mão, pode ser lixo. Então nada é usado
  como veio: parte-se de uma campanha nova e copia-se, campo a campo, só o
  que passa na conferência. Um campo estragado vira zero; o resto se salva.
*/
function carregarCampanha() {
    try {
        const texto = localStorage.getItem(CHAVE_DA_CAMPANHA);
        return texto === null ? campanhaNova() : sanearCampanha(JSON.parse(texto));
    } catch (erro) {
        return campanhaNova();
    }
}

function sanearCampanha(lida) {
    const limpa = campanhaNova();

    if (lida === null || typeof lida !== "object" || lida.versao !== VERSAO_DA_CAMPANHA) {
        return limpa;
    }

    const inteiro = (valor, maximo = Infinity) =>
        Number.isFinite(valor) && valor >= 0 ? Math.min(Math.floor(valor), maximo) : 0;

    limpa.amostras = inteiro(lida.amostras);
    for (const nome of Object.keys(MELHORIAS)) {
        limpa.melhorias[nome] = inteiro(lida.melhorias?.[nome], MELHORIAS[nome].custos.length);
    }
    limpa.habilidades.impulso = lida.habilidades?.impulso === true;
    limpa.registrosLidos = inteiro(lida.registrosLidos, REGISTROS_DA_COLONIA.length);

    // As armas: só nomes que existem na tabela; as iniciais sempre liberadas; levar só o que está liberado.
    const existe = tipo => tipo in ARMAS;
    const desbloqueadas = (Array.isArray(lida.armas?.desbloqueadas) ? lida.armas.desbloqueadas : []).filter(existe);
    limpa.armas.desbloqueadas = [...new Set([...ARMAS_INICIAIS, ...desbloqueadas])];
    const levadas = (Array.isArray(lida.armas?.levadas) ? lida.armas.levadas : [])
        .filter(tipo => limpa.armas.desbloqueadas.includes(tipo));
    if (levadas.length === ARMAS_LEVADAS && new Set(levadas).size === ARMAS_LEVADAS) {
        limpa.armas.levadas = levadas;
    }
    for (const nome of Object.keys(limpa.estatisticas)) {
        limpa.estatisticas[nome] = inteiro(lida.estatisticas?.[nome]);
    }
    if (Array.isArray(lida.bestiario)) {
        limpa.bestiario = lida.bestiario.filter(especie => especie in BESTIARIO);
    }
    return limpa;
}

function salvarCampanha() {
    try {
        localStorage.setItem(CHAVE_DA_CAMPANHA, JSON.stringify(campanha));
    } catch (erro) {
        // Sem armazenamento (navegação privada, disco cheio): a campanha vale até fechar a página.
    }
}

/*
  AS MELHORIAS VIRAM NÚMEROS no começo de cada expedição. O resto do jogo
  não sabe que melhorias existem: ele só usa os multiplicadores do
  soldado. Uma melhoria nova é uma linha na tabela e uma linha aqui.
*/
function aplicarMelhorias() {
    const nivel = nome => campanha.melhorias[nome];

    soldado.vidaMaxima = VIDA_DO_SOLDADO + nivel("blindagem") * MELHORIAS.blindagem.porNivel;
    soldado.vida = soldado.vidaMaxima;
    soldado.multiplicadorDeDano = 1 + nivel("calibre") * MELHORIAS.calibre.porNivel;
    soldado.multiplicadorDoPente = 1 + nivel("carregador") * MELHORIAS.carregador.porNivel;
    soldado.multiplicadorDaEsquiva = 1 - nivel("reflexos") * MELHORIAS.reflexos.porNivel;
    soldado.impulso = campanha.habilidades.impulso;
}

function tamanhoDoPente(tipo) {
    return Math.round(ARMAS[tipo].pente * soldado.multiplicadorDoPente);
}

function registrarNoBestiario(especie) {
    if (!campanha.bestiario.includes(especie)) {
        campanha.bestiario.push(especie);
    }
}

/*
  OS TRÊS FINAIS de uma expedição passam todos por aqui: quanto das
  amostras carregadas vai para a campanha, que registro sobe, e salvar.
*/
function encerrarExpedicao(fracaoGuardada, registro) {
    const guardadas = Math.floor(expedicao.amostras * fracaoGuardada);

    campanha.amostras += guardadas;
    campanha.estatisticas.amostrasGuardadas += guardadas;
    campanha.estatisticas.expedicoes += 1;
    campanha.estatisticas[registro] += 1;
    salvarCampanha();

    estado = "fim";
    return guardadas;
}

function terminarPartida() {
    const guardadas = encerrarExpedicao(FRACAO_GUARDADA_NA_MORTE, "mortes");
    tocarSom(SONS.morte);
    soltarFaiscas(centro(soldado).x, centro(soldado).y, "#c9d3e6", 20);
    mostrarMensagem("Abatido", `A nave recuperou ${guardadas} de ${expedicao.amostras} amostras. O resto ficou no planeta.`);
}

function extrair() {
    const guardadas = encerrarExpedicao(1, "extracoes");
    tocarSom(SONS.extracao);
    mostrarMensagem("Extração", `De volta à órbita com todas as ${guardadas} amostras.`);
    camadaMensagem.classList.add("vitoria");
}

function concluirExpedicao() {
    expedicao.amostras += BONUS_DOS_DADOS;
    const guardadas = encerrarExpedicao(1, "vitorias");
    tocarSom(SONS.extracao);
    mostrarMensagem("Dados recuperados", `A colônia deixou registros — e algo os guardava. ${guardadas} amostras guardadas.`);
    camadaMensagem.classList.add("vitoria");
}

/*
  A EXTRAÇÃO: no pouso, perto da nave, segurar ↑ por um segundo. Segurar,
  e não apertar: ↑ também é mirar para cima, e ninguém deveria encerrar a
  expedição sem querer. É a escolha do GDD (seção 3): "extrair recursos ou
  continuar explorando".
*/
function atualizarExtracao(tempo) {
    const naZona = ehPouso(salaAtual) && soldado.noChao
        && soldado.x > ZONA_DE_EXTRACAO.de && soldado.x < ZONA_DE_EXTRACAO.ate;

    if (naZona && !estavaNaZonaDeExtracao) {
        mostrarAviso("Segure ↑ para extrair: guardar todas as amostras e voltar à base");
    }
    estavaNaZonaDeExtracao = naZona;

    tempoSegurandoExtracao = naZona && acao("cima") ? tempoSegurandoExtracao + tempo : 0;

    if (tempoSegurandoExtracao >= TEMPO_PARA_EXTRAIR) {
        tempoSegurandoExtracao = 0;
        extrair();
    }
}
