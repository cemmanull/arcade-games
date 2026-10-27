/*
  ============================================================
  XENOMORPH — A BASE
  ============================================================

  A base de operações: um estado do jogo e uma sala. Melhorias, arsenal,
  registros, bestiário, registros da colônia e opções — tudo montado das
  tabelas de dados/.
*/


// ============================================================
// A BASE
// ============================================================
/*
  A BASE é um ESTADO do jogo, como "jogando" e "fim" — e é também uma
  sala: o hangar é o módulo do pouso, sem portas, desenhado pelas mesmas
  funções. Por cima dele, o painel HTML com as melhorias, os registros, o
  bestiário e a semente da próxima descida.

  A base EVOLUI À VISTA (GDD, seção 9): cada nível de melhoria acende uma
  luz na parede; o Impulso, quando conquistado, fica exposto numa
  plataforma; cada missão cumprida deixa um núcleo de dados na prateleira.
*/
function abrirBase() {
    estado = "base";
    camadaMensagem.hidden = true;
    barraDoChefe.classList.remove("visivel");
    campoAviso.hidden = true;

    salaAtual = null;
    matriarca = null;
    criaturas = [];
    itens = [];
    tiros = [];
    acido = [];
    pocas = [];
    particulas = [];
    estadoDaSala = { blocos: construirBlocos({ modulo: POUSO.modulo, portas: {}, membranas: [] }) };
    paleta = PALETAS.complexo;

    montarBase();
    telaDaBase.hidden = false;
    document.body.classList.add("na-base");   // o CSS esconde o painel da expedição
    campoSemente.value = sortearSemente();
    botaoDescer.focus();
}

/*
  O painel da base é MONTADO DA TABELA: cada melhoria vira um item com
  nome, efeito, nível e um botão de compra. Uma melhoria nova na tabela
  aparece aqui sozinha.
*/
function montarBase() {
    campoSaldo.textContent = campanha.amostras;
    montarArsenal();
    montarRegistrosDaColonia();
    montarOpcoes();

    listaDeMelhorias.replaceChildren(...Object.entries(MELHORIAS).map(([nome, melhoria]) => {
        const nivel = campanha.melhorias[nome];
        const custo = melhoria.custos[nivel];
        const item = document.createElement("li");
        const texto = document.createElement("span");
        const marcas = document.createElement("span");
        const botao = document.createElement("button");

        texto.textContent = `${melhoria.nome} — ${melhoria.descricao}`;
        marcas.className = "nivel";
        marcas.textContent = "■".repeat(nivel) + "□".repeat(melhoria.custos.length - nivel);
        marcas.setAttribute("aria-label", `nível ${nivel} de ${melhoria.custos.length}`);
        botao.type = "button";
        botao.textContent = custo === undefined ? "Máximo" : `Comprar (${custo})`;
        botao.disabled = custo === undefined || campanha.amostras < custo;
        botao.addEventListener("click", () => comprarMelhoria(nome));

        item.append(texto, marcas, botao);
        return item;
    }));

    const registros = campanha.estatisticas;
    listaDeRegistros.textContent = [
        contar(registros.expedicoes, "expedição", "expedições"),
        contar(registros.vitorias, "missão cumprida", "missões cumpridas"),
        contar(registros.extracoes, "extração", "extrações"),
        contar(registros.mortes, "morte", "mortes"),
        contar(registros.amostrasGuardadas, "amostra guardada", "amostras guardadas"),
        ...(campanha.habilidades.impulso ? ["Impulso Cinético conquistado"] : [])
    ].join(" · ");

    listaDoBestiario.replaceChildren(...campanha.bestiario.map(especie => {
        const item = document.createElement("li");
        item.textContent = BESTIARIO[especie];
        return item;
    }));
    if (campanha.bestiario.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Nenhuma criatura registrada ainda.";
        listaDoBestiario.append(item);
    }
}

function contar(quantidade, singular, plural) {
    return `${quantidade} ${quantidade === 1 ? singular : plural}`;
}

function comprarMelhoria(nome) {
    const custo = MELHORIAS[nome].custos[campanha.melhorias[nome]];

    if (custo === undefined || campanha.amostras < custo) {
        return;
    }

    campanha.amostras -= custo;
    campanha.melhorias[nome] += 1;
    salvarCampanha();
    montarBase();
}

/*
  APAGAR A CAMPANHA pede dois cliques: o primeiro só arma o botão, por 3
  segundos. Nada de confirm(), que trava a página inteira — e nada de
  apagar meses de progresso com um clique distraído.
*/
let apagarArmadoAte = 0;

function apagarCampanha() {
    if (performance.now() > apagarArmadoAte) {
        apagarArmadoAte = performance.now() + 3000;
        botaoApagar.textContent = "Clique de novo para apagar tudo";
        return;
    }

    campanha = campanhaNova();
    salvarCampanha();
    apagarArmadoAte = 0;
    botaoApagar.textContent = "Apagar campanha";
    montarBase();
}

function desenharBase() {
    desenharFundo();
    desenharBlocos();

    // Uma luz por nível de melhoria comprado, numa fileira na parede do fundo.
    let indice = 0;
    for (const [nome, melhoria] of Object.entries(MELHORIAS)) {
        for (let nivel = 0; nivel < melhoria.custos.length; nivel++) {
            const acesa = nivel < campanha.melhorias[nome];
            const x = 20 + indice * 14;
            pincel.fillStyle = acesa ? "#ffcc33" : "#1d2638";
            pincel.fillRect(x, 20, 6, 3);
            if (acesa) {
                pincel.fillStyle = "rgba(255, 204, 51, 0.15)";
                pincel.fillRect(x - 2, 23, 10, 6);
            }
            indice += 1;
        }
    }

    if (campanha.habilidades.impulso) {
        desenharSprite(ITENS.impulso.sprite, ITENS.impulso.cores, 8 * TAMANHO_DO_BLOCO, 7 * TAMANHO_DO_BLOCO - 7);
    }
    for (let i = 0; i < Math.min(campanha.estatisticas.vitorias, 8); i++) {
        desenharSprite(ITENS.dados.sprite, ITENS.dados.cores, 4 * TAMANHO_DO_BLOCO + i * 7, 10 * TAMANHO_DO_BLOCO - 7);
    }
}


// ---------- O arsenal ----------
/*
  O ARSENAL (GDD, seção 9: "desbloquear novas armas" e "modificar a
  configuração inicial do personagem"): cada arma da tabela, liberada ou
  não, e as DUAS que o soldado vai levar. Liberar custa amostras; escolher
  é de graça. Escolher uma terceira solta a mais antiga das duas.
*/
function montarArsenal() {
    listaDoArsenal.replaceChildren(...Object.entries(ARMAS).map(([tipo, ficha]) => {
        const item = document.createElement("li");
        const texto = document.createElement("span");
        const botao = document.createElement("button");
        const liberada = campanha.armas.desbloqueadas.includes(tipo);
        const levada = campanha.armas.levadas.includes(tipo);

        texto.textContent = `${ficha.nome} — dano ${ficha.dano}${ficha.projeteis > 1 ? ` × ${ficha.projeteis}` : ""}, `
            + `pente ${ficha.pente}, alcance ${ficha.alcance}${ficha.perfura > 0 ? `, atravessa ${ficha.perfura}` : ""}`;
        botao.type = "button";

        if (!liberada) {
            botao.textContent = `Liberar (${ficha.desbloqueio})`;
            botao.disabled = campanha.amostras < ficha.desbloqueio;
            botao.addEventListener("click", () => liberarArma(tipo));
        } else {
            botao.textContent = levada ? "Levando" : "Levar";
            botao.setAttribute("aria-pressed", String(levada));
            botao.addEventListener("click", () => levarArma(tipo));
        }

        item.append(texto, botao);
        return item;
    }));
}

function liberarArma(tipo) {
    const custo = ARMAS[tipo].desbloqueio;

    if (campanha.armas.desbloqueadas.includes(tipo) || campanha.amostras < custo) {
        return;
    }
    campanha.amostras -= custo;
    campanha.armas.desbloqueadas.push(tipo);
    salvarCampanha();
    montarBase();
}

function levarArma(tipo) {
    const levadas = campanha.armas.levadas;

    if (levadas.includes(tipo)) {
        return;   // já vai: para trocar, escolha outra (o mínimo é ARMAS_LEVADAS)
    }
    campanha.armas.levadas = [...levadas, tipo].slice(-ARMAS_LEVADAS);   // a mais antiga sai
    salvarCampanha();
    montarBase();
}

// ---------- Os registros da colônia ----------
function montarRegistrosDaColonia() {
    const lidos = REGISTROS_DA_COLONIA.slice(0, campanha.registrosLidos);

    listaDeRegistrosDaColonia.replaceChildren(...lidos.map(texto => {
        const item = document.createElement("li");
        item.textContent = texto;
        return item;
    }));
    if (lidos.length === 0) {
        const item = document.createElement("li");
        item.textContent = "Nenhum registro recuperado. Procure terminais no planeta.";
        listaDeRegistrosDaColonia.append(item);
    }
}

// ---------- As opções ----------
/*
  AS OPÇÕES são montadas das tabelas, como o resto da base: uma caixa por
  preferência, e um botão por ação de CONTROLES. Clicar num botão de ação
  deixa o jogo esperando a próxima tecla (entrada.js); Esc desiste.
*/
const PREFERENCIAS = {
    som: "Som",
    efeitosReduzidos: "Efeitos reduzidos (sem tremor de tela)",
    vibracao: "Vibração (em celulares)",
    numerosDeDano: "Números de dano"
};

const NOMES_DAS_ACOES = {
    esquerda: "Esquerda", direita: "Direita", cima: "Cima / usar", baixo: "Baixo",
    pular: "Pular", esquivar: "Esquivar", atirar: "Atirar", trocar: "Trocar de arma", recarregar: "Recarregar"
};

function montarOpcoes() {
    listaDePreferencias.replaceChildren(...Object.entries(PREFERENCIAS).map(([nome, rotulo]) => {
        const item = document.createElement("li");
        const etiqueta = document.createElement("label");
        const caixa = document.createElement("input");

        caixa.type = "checkbox";
        caixa.checked = opcoes[nome];
        caixa.addEventListener("change", () => {
            opcoes[nome] = caixa.checked;
            salvarOpcoes();
        });
        etiqueta.append(caixa, ` ${rotulo}`);
        item.append(etiqueta);
        return item;
    }));

    listaDeTeclas.replaceChildren(...Object.entries(NOMES_DAS_ACOES).map(([nomeDaAcao, rotulo]) => {
        const item = document.createElement("li");
        const botao = document.createElement("button");
        const esperando = acaoEsperandoTecla === nomeDaAcao;

        botao.type = "button";
        botao.textContent = esperando ? `${rotulo}: aperte uma tecla…` : `${rotulo}: ${CONTROLES[nomeDaAcao].map(nomeDaTecla).join(" ")}`;
        botao.addEventListener("click", () => {
            acaoEsperandoTecla = nomeDaAcao;
            montarOpcoes();
        });
        item.append(botao);
        return item;
    }));
}
