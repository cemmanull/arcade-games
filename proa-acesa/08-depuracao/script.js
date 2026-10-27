/*
  PASSO 8: A DEPURAÇÃO (script.js)

  O jogo do passo 7, com H mostrando o INVISÍVEL: o leque da regra, os discos de colisão (recifes e ilha), o alvo de cada barco, e as
  medidas (draw calls, tempo, memória da GPU). Com H a câmera é do OrbitControls. Ao recomeçar a noite, os recifes velhos têm
  dispose(): a memória fica estável. C troca o jeito de desenhar a chuva; R recomeça a noite.
*/

// ---- CONSTANTES ----
const COR_DO_FUNDO = 0x07111c, COR_DO_MAR = 0x14344f;           // noite
const COR_DA_MANHA = 0xf3c98b, COR_DO_MAR_DE_MANHA = 0x3d7ea6;  // amanhecer
const COR_DO_CLARAO = 0xcfe3ff, COR_DA_LUZ = 0xfff1c8;
const COR_DO_RECIFE = 0xe8e3d4, COR_DO_RECIFE_LEMBRADO = 0x7f8a94;   // recife VISTO × só na lembrança
const COR_DO_PERIGO = 0xff8a4d;       // o disco de colisão que a tecla H mostra
const CAMPO_DE_VISAO = 75, CAMPO_DE_VISAO_EM_PE = 80;   // graus, na vertical; o celular em pé é mais aberto
const ALTURA_DA_CAMERA = 18, RECUO_DA_CAMERA = 22;      // câmera 3/4: cabe a barca, o mar à frente e a cauda do comboio
const PARTE_DO_COMBOIO_NA_MIRA = 0.63; // o olhar vai da barca (0) até o meio da fila (1)
const TETO_DO_DELTA = 0.05;           // segundos, igual ao Pong
const TAMANHO_DO_MAR = 130, DIVISOES_DO_MAR = 64, AMPLITUDE_DA_ONDA = 0.5;   // metros; 64 × 64 quadradinhos = 4.225 vértices; 130 m para a borda sumir na névoa
const PASSO_DA_GRADE = TAMANHO_DO_MAR / DIVISOES_DO_MAR;   // um quadradinho do mar, em metros
const DENSIDADE_DA_NEVOA = 0.02;      // FogExp2 = 0,02 + 0,02 × a névoa da noite (0,15 a 0,75): o mesmo número que encurta o alcance; o piso esconde a borda do mar
const LUZ_DO_CEU = 3.4, LUZ_DO_CLARAO = 6, LUZ_DO_FEIXE = 120;   // intensidades
const GOTAS = 2000, ALTURA_DA_CHUVA = 16, LADO_DA_CHUVA = 50, VELOCIDADE_DA_CHUVA = 18;   // metros e m/s; a caixa de chuva segue a barca
const MODOS_DA_CHUVA = ["instanciada", "avulsa", "nenhuma"];
const LIMITE_DA_GUINADA = 75 * GRAU;
const ARFAGEM_MINIMA = -20 * GRAU, ARFAGEM_MAXIMA = 60 * GRAU;
const REPOUSO_DA_ARFAGEM = -0.12;
const VELOCIDADE_MAXIMA_DA_MIRA = 2.5, ACELERACAO_DA_MIRA = 8, GANHO_DA_MIRA = 5;
const TAXA_DO_ALVO_DA_MIRA = 2, DURACAO_DO_COMANDO_DO_PONTEIRO = 2;   // rad/s: Q/E GIRAM o alvo; segundos que o ponteiro assume a mira
const SUAVIDADE_DA_CAMERA = 5;        // 1/s
const TECLAS = {                      // tecla → ação
    a: "esquerda", arrowleft: "esquerda", d: "direita", arrowright: "direita", s: "devagar", q: "miraEsquerda", e: "miraDireita",
    arrowup: "miraCima", arrowdown: "miraBaixo"
};

const palco = document.getElementById("palco"), aviso = document.getElementById("aviso");
const placar = document.getElementById("placar"), relogio = document.getElementById("relogio"), calor = document.getElementById("calor");
const medidor = document.getElementById("medidor"), mensagem = document.getElementById("mensagem"), painel = document.getElementById("depuracao");
const botaoFoco = document.getElementById("botao-foco"), botaoClarao = document.getElementById("botao-clarao");

// ---- ESTADO — globais de propósito. O mundo (barcas, recifes, noite, lanterna) está em regras.js ----
let cena = null, camera = null, renderizador = null;
let mar = null, luzDoCeu = null, cone = null, luzDoFeixe = null;
let controles = null, desenhosDeDepuracao = null, leques = {}, linhasDosAlvos = null;   // a depuração (tecla H)
let barca = null, lanterna = null, feixe = null;
let partes = null;                    // geometrias e materiais dos barcos de pesca, COMPARTILHADOS por todos
let chuva = null;                     // { grupo, gotas, instanciada, avulsas, modo }
let grupoDeRecifes = null, noiteDesenhada = -1;   // o desenho dos recifes de qual noite? (regras.js: noite.geracao)
let guinada = { angulo: 0, velocidade: 0, minimo: -LIMITE_DA_GUINADA, maximo: LIMITE_DA_GUINADA };
let arfagem = { angulo: REPOUSO_DA_ARFAGEM, velocidade: 0, minimo: ARFAGEM_MINIMA, maximo: ARFAGEM_MAXIMA };
let intencao = { leme: 0, devagar: false, guinadaAlvo: 0, arfagemAlvo: REPOUSO_DA_ARFAGEM };   // o que o jogador QUER
let acoes = {};                       // ação → ENTRADAS que a seguram: { esquerda: ["tecla:a", "dedo:1"] }
let miraDoPonteiro = null;            // { guinada, arfagem, restante } enquanto o ponteiro manda na mira
let rascunho = null;                  // objetos do three.js reaproveitados a cada quadro
let raycaster = null, acertos = [];   // o raio que pergunta "tem algo alto no caminho?" e a lista (reaproveitada) do que ele acertou
let colunas = [], oclusores = [], oclusoresDaIlha = [];   // as pedras ALTAS; elas + o chão e a torre da ilha (tudo o que tapa a luz); só a ilha
let depurando = false;                // H: mostra o invisível e as medidas
let lerp = null;                      // vem de THREE.MathUtils, em iniciar()
let tempoTotal = 0, instanteDoQuadroAnterior = 0;
let ultimoTempoDeAtualizacao = 0, ultimoTempoDeDesenho = 0, ultimoTempoDeQuadro = 0;   // ms de JS por quadro (a página de medição lê)

// ---- LIGAR ----
function iniciar() {
    if (typeof THREE === "undefined") {
        mostrarAviso("Não consegui baixar o three.js. Confira sua internet e recarregue a página.");
        return;
    }
    try {
        renderizador = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2 });
    } catch (erro) {
        mostrarAviso("Seu navegador não conseguiu ligar o WebGL, que o jogo precisa para desenhar em 3D.");
        return;
    }
    lerp = THREE.MathUtils.lerp;
    reduzirClaroes = window.matchMedia("(prefers-reduced-motion: reduce)").matches;   // GDD §7: o sistema pede menos movimento
    palco.appendChild(renderizador.domElement);
    montarCena();
    ajustarTamanho();
    mostrarOpcoes();
    window.addEventListener("resize", ajustarTamanho);
    window.addEventListener("keydown", aoApertarTecla);
    window.addEventListener("keyup", aoSoltarTecla);
    window.addEventListener("blur", function () { acoes = {}; miraDoPonteiro = null; });   // aba perdeu o foco: solta tudo
    ["esquerda", "direita", "devagar"].forEach(function (acao) { ligarBotao(document.getElementById("botao-" + acao), acao); });
    botaoFoco.addEventListener("click", trocarFoco);   // `click` serve ao dedo, ao mouse, ao Enter e ao Espaço
    botaoClarao.addEventListener("click", function () { reduzirClaroes = !reduzirClaroes; mostrarOpcoes(); });
    ["pointerdown", "pointermove"].forEach(function (nome) { palco.addEventListener(nome, aoMirarComPonteiro); });
    ["pointercancel", "pointerleave"].forEach(function (nome) { palco.addEventListener(nome, soltarMira); });
    palco.addEventListener("contextmenu", impedirMenuDeContexto);
    instanteDoQuadroAnterior = performance.now();
    requestAnimationFrame(quadroAQuadro);
}

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
}

/* Os dois botões de opção dizem o seu estado por `aria-pressed` e por texto, nunca só por cor. */
function mostrarOpcoes() {
    botaoFoco.setAttribute("aria-pressed", String(lanternaDaBarca.foco === "estreito"));
    botaoClarao.setAttribute("aria-pressed", String(reduzirClaroes));
    botaoClarao.textContent = reduzirClaroes ? "Clarões ✓" : "Clarões";
}

function trocarFoco() {
    alternarFoco();
    mostrarOpcoes();
}

// ---- ENTRADA: várias fontes, uma intenção ----
/* Cada ação lembra QUAIS entradas a seguram ("tecla:a", "dedo:1"...): soltar uma só tira a dela. */
function soltar(acao, entrada) {
    acoes[acao] = (acoes[acao] || []).filter(function (outra) { return outra !== entrada; });
}

function segurar(acao, entrada) {
    soltar(acao, entrada);   // tira antes, para a mesma entrada não entrar duas vezes
    acoes[acao].push(entrada);
}

function seguradaAgora(acao) {
    return (acoes[acao] || []).length > 0;
}

function aoApertarTecla(evento) {
    const combinada = evento.ctrlKey || evento.metaKey || evento.altKey;   // Ctrl+H é do navegador
    if (evento.repeat || combinada) {
        return;
    }
    const tecla = String(evento.key).toLowerCase();
    if (tecla === "h") {
        depurando = !depurando;
        painel.hidden = !depurando;
        desenhosDeDepuracao.visible = controles.enabled = depurando;   // com H a câmera é do OrbitControls
        controles.target.copy(barca.position);
    } else if (tecla === " " && !(evento.target && evento.target.tagName === "BUTTON")) {   // num botão, o Espaço é do botão
        trocarFoco();
        evento.preventDefault();
    } else if (tecla === "r") {
        comecarNoite(noite.indice);   // recomeça a noite (depuração: o passo 8 mede o que isso custa)
    } else if (tecla === "c") {
        chuva.modo = MODOS_DA_CHUVA[(MODOS_DA_CHUVA.indexOf(chuva.modo) + 1) % MODOS_DA_CHUVA.length];
        aplicarModoDaChuva();
    } else if (typeof TECLAS[tecla] === "string") {
        segurar(TECLAS[tecla], "tecla:" + tecla);
    }
}

function aoSoltarTecla(evento) {
    const tecla = String(evento.key).toLowerCase();
    if (typeof TECLAS[tecla] === "string") {
        soltar(TECLAS[tecla], "tecla:" + tecla);
    }
}

function ligarBotao(botao, acao) {
    const dedo = function (evento) { return "dedo:" + evento.pointerId; };
    const aoConfirmar = function (funcao) {   // Enter e Espaço: o botão é focável (Tab), então o teclado o SEGURA como o dedo
        return function (evento) {
            if (evento.key === "Enter" || evento.key === " ") {
                funcao();
                evento.preventDefault();      // sem isso o navegador ainda dispararia um `click`
            }
        };
    };

    botao.addEventListener("pointerdown", function (evento) { segurar(acao, dedo(evento)); });
    ["pointerup", "pointercancel", "pointerleave"].forEach(function (nome) {
        botao.addEventListener(nome, function (evento) { soltar(acao, dedo(evento)); });
    });
    botao.addEventListener("keydown", aoConfirmar(function () { segurar(acao, "botao-teclado"); }));
    botao.addEventListener("keyup", aoConfirmar(function () { soltar(acao, "botao-teclado"); }));
    botao.addEventListener("blur", function () { soltar(acao, "botao-teclado"); });
    botao.addEventListener("click", function (evento) {   // leitor de tela e voz mandam só `click`, com detail 0 (mouse e dedo: ≥ 1)
        if (evento.detail === 0) {
            segurar(acao, "leitor-de-tela");
            setTimeout(function () { soltar(acao, "leitor-de-tela"); }, 250);   // um toque curto
        }
    });
    botao.addEventListener("contextmenu", impedirMenuDeContexto);
}

function impedirMenuDeContexto(evento) { evento.preventDefault(); }

/* O ponteiro vira ÂNGULOS (esquerda/direita = guinada; a metade de cima levanta o feixe) e assume a mira por 2 s. Clique do mouse: troca o foco. */
function aoMirarComPonteiro(evento) {
    if (depurando) {
        return;   // com H o arrastar do mouse e do dedo é do OrbitControls
    }
    if (evento.type === "pointerdown" && evento.pointerType === "mouse" && evento.button === 0) {
        trocarFoco();
    }
    const retangulo = palco.getBoundingClientRect();
    const horizontal = (evento.clientX - retangulo.left) / retangulo.width * 2 - 1;   // −1 esquerda … 1 direita
    const vertical = (evento.clientY - retangulo.top) / retangulo.height * 2 - 1;     // −1 topo … 1 base
    if (evento.pointerType === "touch" && vertical > 0) {
        return;   // no toque só a metade de cima mira; embaixo ficam os botões
    }
    miraDoPonteiro = {
        guinada: limitar(-horizontal, -1, 1) * LIMITE_DA_GUINADA,
        arfagem: lerp(REPOUSO_DA_ARFAGEM, ARFAGEM_MAXIMA, limitar(-vertical, 0, 1)),
        restante: DURACAO_DO_COMANDO_DO_PONTEIRO
    };
}

function soltarMira(evento) {
    if (evento.type === "pointercancel" || evento.pointerType === "mouse") {
        miraDoPonteiro = null;   // o dedo que levanta NÃO solta: os 2 s de comando correm até o fim
    }
}

/* Junta as fontes na intenção: leme (+1 = esquerda), devagar e os dois ângulos que a lanterna quer. */
function lerIntencao(tempo) {
    intencao.leme = sentido("esquerda", "direita");
    intencao.devagar = seguradaAgora("devagar");
    const giro = sentido("miraEsquerda", "miraDireita");
    const subida = sentido("miraCima", "miraBaixo");
    if (giro !== 0 || subida !== 0) {
        miraDoPonteiro = null;   // tecla segurada vence o ponteiro: teclado e ponteiro são a MESMA intenção
    }
    if (miraDoPonteiro !== null) {
        intencao.guinadaAlvo = miraDoPonteiro.guinada;
        intencao.arfagemAlvo = miraDoPonteiro.arfagem;
        miraDoPonteiro.restante -= tempo;
        miraDoPonteiro = miraDoPonteiro.restante > 0 ? miraDoPonteiro : null;
        return;
    }
    /* Q/E e ↑/↓ GIRAM o alvo; soltos, o alvo volta ao repouso (olhar para a frente) na mesma taxa. */
    const destinoDaArfagem = subida > 0 ? ARFAGEM_MAXIMA : subida < 0 ? ARFAGEM_MINIMA : REPOUSO_DA_ARFAGEM;
    intencao.guinadaAlvo = aproximar(intencao.guinadaAlvo, giro * LIMITE_DA_GUINADA, TAXA_DO_ALVO_DA_MIRA * tempo);
    intencao.arfagemAlvo = aproximar(intencao.arfagemAlvo, destinoDaArfagem, TAXA_DO_ALVO_DA_MIRA * tempo);
}

function sentido(acaoPositiva, acaoNegativa) {
    return (seguradaAgora(acaoPositiva) ? 1 : 0) - (seguradaAgora(acaoNegativa) ? 1 : 0);
}

// ---- A CENA ----
function montarCena() {
    cena = new THREE.Scene();
    cena.background = new THREE.Color(COR_DO_FUNDO);
    cena.fog = new THREE.FogExp2(COR_DO_FUNDO, 0.01);   // a cor da névoa tem de ser a do fundo; `aplicarCeu` a acerta a cada quadro
    camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
    rascunho = { cor: new THREE.Color(), ponto: new THREE.Vector3(), alvo: new THREE.Vector3(), mira: new THREE.Vector3(), matriz: new THREE.Matrix4() };
    raycaster = new THREE.Raycaster();
    partes = {
        casco: new THREE.BoxGeometry(1.2, 0.4, 2.4), mastro: new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), luz: new THREE.SphereGeometry(0.15, 8, 6),
        bandeiras: [new THREE.ConeGeometry(0.25, 0.5, 3), new THREE.BoxGeometry(0.4, 0.4, 0.05), new THREE.SphereGeometry(0.2, 8, 6)],
        madeira: new THREE.MeshStandardMaterial({ color: 0x8a5a3c, flatShading: true }),
        brilho: new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })   // sem névoa: a luz do barco nunca some
    };

    luzDoCeu = new THREE.HemisphereLight(0x6f8fb0, COR_DO_FUNDO, LUZ_DO_CEU);
    cena.add(luzDoCeu, criarMar(), criarIlhaComFarol(), criarBarca(), criarPorto(), criarChuva(), criarDepuracao());
    controles = new OrbitControls(camera, renderizador.domElement);   // do addon, pela ponte do index.html
    controles.enabled = false;
    controles.enablePan = false;
    controles.minDistance = 8;
    controles.maxDistance = 70;
    construirRecifes();
    copiarMundoParaAsMalhas();
    seguirComACamera(1);   // fração 1 = sem suavização: a câmera já nasce no lugar
}

function criarMalha(geometria, cor) {
    return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cor, flatShading: true }));
}

function criarMar() {
    const geometria = new THREE.PlaneGeometry(TAMANHO_DO_MAR, TAMANHO_DO_MAR, DIVISOES_DO_MAR, DIVISOES_DO_MAR);
    geometria.rotateX(-Math.PI / 2);   // deitamos a GEOMETRIA: y vira a altura de cada vértice
    return (mar = criarMalha(geometria, COR_DO_MAR));
}

function criarIlhaComFarol() {
    const ilhaComFarol = new THREE.Group();
    ilhaComFarol.position.set(ilha.x, 0, ilha.z);
    const chao = criarMalha(new THREE.CylinderGeometry(4, 5.5, 1.2, 12), 0x2b3a2f);
    const torre = criarMalha(new THREE.CylinderGeometry(0.9, 1.4, 9, 10), 0x4a5563);
    const salaDaLampada = criarMalha(new THREE.CylinderGeometry(1.1, 1.1, 1, 10), 0x1c232b);
    const telhado = criarMalha(new THREE.ConeGeometry(1.4, 1.3, 10), 0x6b3a2e);
    chao.position.y = 0.2; torre.position.y = 5.3; salaDaLampada.position.y = 10.3; telhado.position.y = 11.45;   // a lâmpada apagada não é emissiva
    ilhaComFarol.add(chao, torre, salaDaLampada, telhado);
    oclusoresDaIlha = [chao, torre];   // a ilha também tapa a luz
    return ilhaComFarol;
}

function criarBarca() {
    barca = new THREE.Group();
    const casco = criarMalha(new THREE.BoxGeometry(1.6, 0.5, 3.2), 0x8a5a3c);
    const cabine = criarMalha(new THREE.BoxGeometry(0.9, 0.6, 1), 0xc9b79c);
    casco.position.y = 0.25; cabine.position.set(0, 0.8, 0.6);
    barca.add(casco, cabine, criarLanterna());
    return barca;
}

function criarLanterna() {
    lanterna = new THREE.Group();
    lanterna.position.set(0, 1, -1.4);   // na proa: o -Z é a frente
    const poste = criarMalha(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), 0x4a5563), lente = criarMalha(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), COR_DA_LUZ);
    lente.material.emissive.set(COR_DA_LUZ);   // emissivo: brilha sem precisar de luz
    poste.position.y = -0.35;
    lanterna.add(poste, lente, criarFeixe());
    return lanterna;
}

/* O cone nasce com 1 m de comprimento e 1 m de raio: `ajustarFeixe` o ESTICA (scale) para o foco e o alcance de cada quadro. */
function criarFeixe() {
    feixe = new THREE.Group();
    feixe.position.z = -0.2;   // um palmo à frente da lente
    const geometriaDoCone = new THREE.ConeGeometry(1, 1, 24, 1, true);
    geometriaDoCone.translate(0, -0.5, 0);   // ponta na lanterna, boca à frente
    geometriaDoCone.rotateX(Math.PI / 2);
    cone = new THREE.Mesh(geometriaDoCone, new THREE.MeshBasicMaterial({ color: COR_DA_LUZ, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    luzDoFeixe = new THREE.SpotLight(COR_DA_LUZ, LUZ_DO_FEIXE, 36, FOCOS.largo.meioAngulo, 0.4);
    const alvo = new THREE.Object3D();
    alvo.position.z = -24;   // só dá a DIREÇÃO do SpotLight
    luzDoFeixe.target = alvo;
    feixe.add(cone, luzDoFeixe, alvo);
    return feixe;
}

/* Os recifes da noite: pedra + anel de espuma (só quando a lanterna o enxerga) + o disco da tecla H. Cada noite refaz o grupo,
   e o velho é DESCARTADO: sem isso (passo 7) as geometrias e os materiais dele ficavam na GPU, noite após noite. */
function construirRecifes() {
    descartar(grupoDeRecifes);
    grupoDeRecifes = new THREE.Group();
    colunas = [];
    oclusores = oclusoresDaIlha.slice();
    recifes.forEach(function (recife) {
        const forma = recife.alta ? new THREE.CylinderGeometry(recife.raio, recife.raio * 1.2, 5, 8) : new THREE.DodecahedronGeometry(recife.raio, 0);
        const pedra = new THREE.Mesh(forma, new THREE.MeshBasicMaterial({ transparent: true }));   // sem luz: lê-se no escuro
        const espuma = new THREE.Mesh(new THREE.RingGeometry(recife.raio * 1.1, recife.raio * 1.5, 16), new THREE.MeshBasicMaterial({ color: COR_DO_RECIFE }));
        pedra.position.y = recife.alta ? 2.5 : recife.raio * 0.2;
        espuma.rotation.x = -Math.PI / 2;
        espuma.position.y = 0.2;
        recife.malha = new THREE.Group();
        recife.malha.position.set(recife.x, 0, recife.z);
        recife.malha.add(pedra, espuma);
        pedra.add(criarDisco(recife, pedra));
        grupoDeRecifes.add(recife.malha);
        if (recife.alta) {
            colunas.push(pedra);
            oclusores.push(pedra);
        }
    });
    cena.add(grupoDeRecifes);
    cena.updateMatrixWorld(true);   // o Raycaster usa as matrizes de mundo, que ninguém atualizou ainda
    noiteDesenhada = noite.geracao;
}

/* Tira o grupo da cena e devolve à GPU o que só ele usava. Só vale para o que NÃO é compartilhado (as partes dos barcos ficam). */
function descartar(grupo) {
    if (grupo === null) {
        return;
    }
    cena.remove(grupo);
    grupo.traverse(function (objeto) {
        if (objeto.geometry) { objeto.geometry.dispose(); }
        if (objeto.material) { objeto.material.dispose(); }
    });
}

/* Depuração (H): o disco onde o barco bate (raio do recife + raio do barco), visível mesmo quando o recife foi esquecido. */
function criarDisco(recife, pedra) {
    const disco = new THREE.Mesh(new THREE.RingGeometry(recife.raio + RAIO_DO_BARCO - 0.15, recife.raio + RAIO_DO_BARCO, 24), new THREE.MeshBasicMaterial({ color: COR_DO_PERIGO, fog: false }));
    disco.rotation.x = -Math.PI / 2;
    disco.position.y = 0.3 - pedra.position.y;   // a pedra é o pai: o disco volta à altura do mar
    disco.visible = false;
    return disco;
}

/* O invisível, desenhado uma vez e mostrado com H: o leque da regra (um por foco), o círculo da ilha e a linha de cada barco até o alvo. */
function criarDepuracao() {
    desenhosDeDepuracao = new THREE.Group();
    desenhosDeDepuracao.visible = false;
    const material = new THREE.MeshBasicMaterial({ color: COR_DO_PERIGO, transparent: true, opacity: 0.25, side: THREE.DoubleSide, depthWrite: false, fog: false });
    ["estreito", "largo"].forEach(function (nome) {
        const meioAngulo = FOCOS[nome].meioAngulo;
        const geometria = new THREE.CircleGeometry(1, 16, Math.PI / 2 - meioAngulo, 2 * meioAngulo);   // o meio do setor aponta para +y...
        geometria.rotateX(-Math.PI / 2);   // ...e deitado no mar, +y vira −z: a frente
        leques[nome] = new THREE.Mesh(geometria, material);
        desenhosDeDepuracao.add(leques[nome]);
    });
    const colisaoDaIlha = new THREE.Mesh(new THREE.RingGeometry(ilha.raio + RAIO_DO_BARCO - 0.15, ilha.raio + RAIO_DO_BARCO, 48), material);
    colisaoDaIlha.rotation.x = -Math.PI / 2;
    colisaoDaIlha.position.set(ilha.x, 0.35, ilha.z);
    linhasDosAlvos = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(new Float32Array(8 * 6), 3)), new THREE.LineBasicMaterial({ color: COR_DA_LUZ, fog: false }));
    linhasDosAlvos.frustumCulled = false;   // as linhas andam longe da origem: a esfera de corte da geometria vazia não vale
    desenhosDeDepuracao.add(colisaoDaIlha, linhasDosAlvos);
    return desenhosDeDepuracao;
}

function criarPorto() {
    const material = new THREE.MeshBasicMaterial({ color: COR_DA_MANHA, fog: false });   // o porto é um farol: a névoa não o apaga
    const anel = new THREE.Mesh(new THREE.RingGeometry(porto.raio - 0.5, porto.raio, 48), material);
    anel.rotation.x = -Math.PI / 2;   // o anel nasce de pé; deita sobre o mar
    anel.position.set(porto.x, 0.3, porto.z);
    return anel;
}

/* Um barco de pesca: casco, mastro, luz própria e uma flâmula cuja FORMA muda de barco para barco. */
function criarBarcoDePesca(barco) {
    const grupo = new THREE.Group();
    const casco = new THREE.Mesh(partes.casco, partes.madeira);
    const mastro = new THREE.Mesh(partes.mastro, partes.madeira);
    const luz = new THREE.Mesh(partes.luz, partes.brilho);
    const bandeira = new THREE.Mesh(partes.bandeiras[barco.id % partes.bandeiras.length], partes.brilho);
    casco.position.y = 0.2; mastro.position.y = 1; luz.position.y = 1.85;
    bandeira.position.set(0.3, 1.5, 0);
    grupo.add(casco, mastro, luz, bandeira);
    return grupo;
}

// ---- A CHUVA ----
/* 2.000 gotas IGUAIS: uma geometria, um material. Num InstancedMesh viram UMA chamada de desenho; como 2.000 malhas avulsas (tecla C),
   2.000 (GDD §9: 35 contra 2.034 draw calls). Cada gota são 3 números em [0, 1), a posição numa caixa de chuva que segue a barca. A
   lista é RECICLADA (a gota que cai volta ao topo), como no dealer-out/03-chuva. */
function criarChuva() {
    const gotas = new Float32Array(GOTAS * 3);
    for (let i = 0; i < gotas.length; i++) {
        gotas[i] = Math.random();
    }
    const geometria = new THREE.BoxGeometry(0.04, 0.7, 0.04);
    const material = new THREE.MeshBasicMaterial({ color: 0x9fb8cc, transparent: true, opacity: 0.5 });
    const instanciada = new THREE.InstancedMesh(geometria, material, GOTAS);
    instanciada.frustumCulled = false;   // a esfera de corte é a de UMA gota, na origem: as instâncias estão longe dela
    chuva = { grupo: new THREE.Group(), gotas: gotas, instanciada: instanciada, avulsas: null, modo: "instanciada", geometria: geometria, material: material };
    chuva.grupo.add(instanciada);
    return chuva.grupo;
}

function aplicarModoDaChuva() {
    if (chuva.modo === "avulsa" && chuva.avulsas === null) {   // as 2.000 malhas só nascem quando alguém quer ver o custo delas
        chuva.avulsas = new THREE.Group();
        for (let i = 0; i < GOTAS; i++) {
            chuva.avulsas.add(new THREE.Mesh(chuva.geometria, chuva.material));
            chuva.avulsas.children[i].frustumCulled = false;   // como no spike do GDD: sem corte, as 2.000 contam
        }
        chuva.grupo.add(chuva.avulsas);
    }
    chuva.instanciada.visible = chuva.modo === "instanciada";
    if (chuva.avulsas !== null) {
        chuva.avulsas.visible = chuva.modo === "avulsa";
    }
}

function moverChuva(tempo) {
    if (chuva.modo === "nenhuma") {
        return;
    }
    const gotas = chuva.gotas;
    const parteDoTopo = VELOCIDADE_DA_CHUVA * tempo / ALTURA_DA_CHUVA;
    for (let i = 0; i < GOTAS; i++) {
        const k = i * 3;
        gotas[k + 1] = (gotas[k + 1] - parteDoTopo + 1) % 1;   // cai; passou do chão, volta ao topo
        const x = barcaNoMundo.x + (fracao(gotas[k] - barcaNoMundo.x / LADO_DA_CHUVA) - 0.5) * LADO_DA_CHUVA;   // a caixa segue a barca;
        const z = barcaNoMundo.z + (fracao(gotas[k + 2] - barcaNoMundo.z / LADO_DA_CHUVA) - 0.5) * LADO_DA_CHUVA;   // a gota fica parada no mundo
        if (chuva.modo === "instanciada") {
            chuva.instanciada.setMatrixAt(i, rascunho.matriz.makeTranslation(x, gotas[k + 1] * ALTURA_DA_CHUVA, z));
        } else {
            chuva.avulsas.children[i].position.set(x, gotas[k + 1] * ALTURA_DA_CHUVA, z);
        }
    }
    chuva.instanciada.instanceMatrix.needsUpdate = true;
}

function fracao(valor) {
    return valor - Math.floor(valor);
}

function ajustarTamanho() {
    const largura = palco.clientWidth;
    const altura = palco.clientHeight;
    if (largura === 0 || altura === 0) {
        return;   // palco sem tamanho: dividir por 0 daria proporção infinita
    }
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.fov = camera.aspect < 1 ? CAMPO_DE_VISAO_EM_PE : CAMPO_DE_VISAO;
    camera.updateProjectionMatrix();
}

function quadroAQuadro(instanteAtual) {
    const tempo = Math.max(0, Math.min((instanteAtual - instanteDoQuadroAnterior) / 1000, TETO_DO_DELTA));   // nunca negativo nem enorme
    instanteDoQuadroAnterior = instanteAtual;
    const inicio = performance.now();
    atualizar(tempo);
    const meio = performance.now();
    renderizador.render(cena, camera);
    ultimoTempoDeAtualizacao = meio - inicio;
    ultimoTempoDeDesenho = performance.now() - meio;   // só o tempo de MANDAR o desenho (CPU); a GPU termina depois
    ultimoTempoDeQuadro = ultimoTempoDeAtualizacao + ultimoTempoDeDesenho;
    if (depurando) {
        mostrarDepuracao();
    }
    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    tempoTotal += tempo;
    lerIntencao(tempo);
    atualizarMundo(tempo, intencao.leme, intencao.devagar);   // regras.js: tudo o que o jogo DECIDE
    const noiteNova = noiteDesenhada !== noite.geracao;
    if (noiteNova) {
        construirRecifes();
    }
    guinada.angulo -= barcaNoMundo.giro * tempo;   // a lanterna não gira junto com a proa: fica no rumo e a mira a puxa de volta
    seguirAlvo(guinada, intencao.guinadaAlvo, tempo);
    seguirAlvo(arfagem, intencao.arfagemAlvo, tempo);
    copiarMundoParaAsMalhas();
    lanterna.rotation.y = guinada.angulo;
    feixe.rotation.x = arfagem.angulo;
    cone.rotation.x = -arfagem.angulo;   // o cone desenhado é o leque da regra, que ignora a arfagem (GDD §4.1): fica na horizontal
    ajustarFeixe();
    lanterna.getWorldPosition(rascunho.ponto);   // a lente, no mundo (atualiza as matrizes da barca até aqui)
    atualizarBrasas(tempo, rascunho.ponto, barcaNoMundo.proa + guinada.angulo, estaTapado);   // regras.js decide
    if (depurando) {
        atualizarDepuracao();
    }
    for (let i = 0; i < recifes.length; i++) { mostrarRecife(recifes[i]); }
    if (depurando) {
        orbitarEmVoltaDaBarca();
    } else {
        seguirComACamera(noiteNova ? 1 : 1 - Math.exp(-SUAVIDADE_DA_CAMERA * tempo));   // independe da taxa de quadros
    }
    ondularMar();
    moverChuva(tempo);
    aplicarCeu();
    mostrarPlacar();
}

/* O feixe desenhado É o leque da regra: o foco e o alcance de agora, e apagado quando a lanterna esfria. */
function ajustarFeixe() {
    const acesa = lanternaDaBarca.segundosApagada === 0;
    const raio = lanternaDaBarca.alcance * Math.tan(lanternaDaBarca.meioAngulo);
    cone.scale.set(raio, raio, lanternaDaBarca.alcance);
    cone.visible = acesa;
    luzDoFeixe.intensity = acesa ? LUZ_DO_FEIXE : 0;
    luzDoFeixe.angle = lanternaDaBarca.meioAngulo;
    luzDoFeixe.distance = lanternaDaBarca.alcance * 1.5;
}

/* O leque ocupa o lugar e o tamanho que a REGRA usa (a lente no mundo, a direção, o alcance de agora); cada barco liga ao seu alvo. */
function atualizarDepuracao() {
    leques.estreito.visible = leques.largo.visible = false;
    const leque = leques[lanternaDaBarca.foco];
    leque.visible = lanternaDaBarca.segundosApagada === 0;
    leque.position.set(rascunho.ponto.x, 0.35, rascunho.ponto.z);
    leque.rotation.y = barcaNoMundo.proa + guinada.angulo;
    leque.scale.set(lanternaDaBarca.alcance, 1, lanternaDaBarca.alcance);
    const posicoes = linhasDosAlvos.geometry.attributes.position;
    for (let i = 0; i < barcosDePesca.length; i++) {
        const alvo = alvoDoBarco(barcosDePesca[i]);
        posicoes.setXYZ(2 * i, barcosDePesca[i].x, 0.8, barcosDePesca[i].z);
        posicoes.setXYZ(2 * i + 1, alvo.x, 0.8, alvo.z);
    }
    linhasDosAlvos.geometry.setDrawRange(0, 2 * barcosDePesca.length);
    posicoes.needsUpdate = true;
}

/* Com H o OrbitControls manda na câmera (arrastar gira, a roda aproxima). O alvo dele acompanha a barca, e a câmera vai junto. */
function orbitarEmVoltaDaBarca() {
    rascunho.alvo.copy(barca.position).sub(controles.target);
    camera.position.add(rascunho.alvo);
    controles.target.copy(barca.position);
    controles.update();
}

/* O RAIO contra o que é alto: do bico da lanterna até o recife. Se algo (que não seja o próprio recife) o corta, a luz não chega. */
function estaTapado(origem, recife) {
    rascunho.alvo.set(recife.x, 0.5, recife.z).sub(origem);   // do bico ao recife
    raycaster.far = rascunho.alvo.length();                   // o raio só vale até o recife
    raycaster.set(origem, rascunho.alvo.normalize());
    acertos.length = 0;                                       // a MESMA lista, esvaziada: sem lista nova a cada raio
    raycaster.intersectObjects(oclusores, false, acertos);    // false: só estas malhas, sem descer pelos filhos (o disco da tecla H)
    for (let i = 0; i < acertos.length; i++) {
        if (acertos[i].object.parent !== recife.malha) {
            return true;
        }
    }
    return false;
}

/* Visto: cheio, claro, com espuma. Lembrado: só o contorno, cinza, apagando com a brasa. Esquecido: some. */
function mostrarRecife(recife) {
    const pedra = recife.malha.children[0];
    recife.malha.visible = recife.brasa > 0 || depurando;
    pedra.children[0].visible = depurando;   // o disco: com H, o recife esquecido aparece por ele
    recife.malha.children[1].visible = recife.iluminado;
    pedra.material.wireframe = !recife.iluminado;
    pedra.material.color.set(recife.iluminado ? COR_DO_RECIFE : COR_DO_RECIFE_LEMBRADO);
    pedra.material.opacity = recife.iluminado ? 1 : recife.brasa / SEGUNDOS_DE_BRASA;
}

/* Estado → desenho: as malhas só COPIAM x, z e proa do mundo (a altura da onda é só desenho). */
function copiarMundoParaAsMalhas() {
    barca.position.set(barcaNoMundo.x, alturaDoMar(barcaNoMundo.x, barcaNoMundo.z, tempoTotal), barcaNoMundo.z);
    barca.rotation.y = barcaNoMundo.proa;
    barca.updateMatrixWorld();   // a câmera vai perguntar onde a barca está no mundo
    mar.position.set(naGrade(barcaNoMundo.x), 0, naGrade(barcaNoMundo.z));   // o mar anda junto, quadradinho a quadradinho
    for (let i = 0; i < barcosDePesca.length; i++) { desenharBarco(barcosDePesca[i]); }
    for (let i = 0; i < barcosAfundando.length; i++) { desenharBarco(barcosAfundando[i]); }
    while (barcosRemovidos.length > 0) {
        cena.remove(barcosRemovidos.pop().malha);   // quem saiu das listas sai da cena (as partes compartilhadas ficam)
    }
}

function desenharBarco(barco) {
    if (barco.malha === undefined) {
        barco.malha = criarBarcoDePesca(barco);   // a malha nasce na primeira vez que o barco é desenhado
        cena.add(barco.malha);
    }
    barco.malha.position.set(barco.x, alturaDoMar(barco.x, barco.z, tempoTotal) - barco.afundamento * 2, barco.z);
    barco.malha.rotation.set(0, barco.proa, barco.afundamento * 0.6);
}

// ---- O HUD: só escreve o que mudou (o leitor de tela repete tudo o que muda numa região aria-live) ----
function mostrarPlacar() {
    const restante = Math.max(0, Math.ceil(noite.ficha.duracao - noite.segundos));
    escrever(placar, "Salvos " + noite.salvos + "/" + noite.ficha.meta + " · Naufrágios " + naufragios + "/" + NAUFRAGIOS_PARA_PERDER + " · Na fila " + barcosDePesca.length);
    escrever(relogio, "Noite " + (noite.indice + 1) + " · " + Math.floor(restante / 60) + ":" + String(restante % 60).padStart(2, "0"));
    escrever(calor, "☼ " + (lanternaDaBarca.foco === "estreito" ? "Estreito" : "Largo") + " " + Math.round(lanternaDaBarca.calor * 100) + " %");
    medidor.value = lanternaDaBarca.calor;
    escrever(mensagem, textoDaMensagem());
}

function escrever(elemento, texto) {
    if (elemento.textContent !== texto) {
        elemento.textContent = texto;
    }
}

function textoDaMensagem() {
    const meta = noite.ficha.meta;
    const placarDaNoite = noite.salvos + " de " + meta;
    if (noite.resultado === "vitoria") {
        return "Amanheceu: " + placarDaNoite + " salvos. " + (noite.proxima === 0 ? "Você venceu as cinco noites!" : "Próxima: noite " + (noite.proxima + 1) + ".");
    } else if (noite.resultado === "sem-meta") {
        return "Amanheceu sem a meta (" + placarDaNoite + "). A noite recomeça.";
    } else if (noite.resultado === "naufragios") {
        return "Três naufrágios. O jogo recomeça na noite 1.";
    } else if (lanternaDaBarca.segundosApagada > 0) {
        return "LANTERNA ESFRIANDO " + Math.ceil(lanternaDaBarca.segundosApagada) + " s";
    }
    return noite.segundos < 4 ? "Noite " + (noite.indice + 1) + ": " + noite.ficha.nome + ". Leve " + meta + " barcos ao porto." : "";
}

function mostrarDepuracao() {
    const info = renderizador.info;
    escrever(painel, "Draw calls " + info.render.calls + " · triângulos " + info.render.triangles + "\nJS " + ultimoTempoDeAtualizacao.toFixed(1) + " ms · desenho " +
        ultimoTempoDeDesenho.toFixed(1) + " ms\nMemória: " + info.memory.geometries + " geometrias · " + info.memory.textures + " texturas\nChuva: " + chuva.modo + " (C troca)");
}

/* Múltiplo do passo da grade mais próximo: os vértices do mar ficam sempre nos mesmos pontos do mundo. */
function naGrade(metros) {
    return Math.round(metros / PASSO_DA_GRADE) * PASSO_DA_GRADE;
}

/* Quanto mais longe do `alvo` (radianos), mais rápido o eixo quer ir, até o teto; a aceleração limita a mudança. */
function seguirAlvo(eixo, alvo, tempo) {
    const velocidadeDesejada = limitar((alvo - eixo.angulo) * GANHO_DA_MIRA, -VELOCIDADE_MAXIMA_DA_MIRA, VELOCIDADE_MAXIMA_DA_MIRA);
    eixo.velocidade = aproximar(eixo.velocidade, velocidadeDesejada, ACELERACAO_DA_MIRA * tempo);
    eixo.angulo = limitar(eixo.angulo + eixo.velocidade * tempo, eixo.minimo, eixo.maximo);
}

/* O ponto (0, 18, 22) é LOCAL à barca (atrás e acima); `localToWorld` o leva ao mundo, já com a proa. O olhar vai para um ponto
   entre a barca e o meio da fila (e é suavizado como a câmera): a barca, o mar à frente e ao menos 3 barcos cabem na tela. */
function seguirComACamera(fracaoDoCaminho) {
    camera.position.lerp(barca.localToWorld(rascunho.ponto.set(0, ALTURA_DA_CAMERA, RECUO_DA_CAMERA)), fracaoDoCaminho);
    rascunho.mira.lerp(pontoDeMira(rascunho.alvo), fracaoDoCaminho);
    camera.lookAt(rascunho.mira);
}

function pontoDeMira(destino) {
    let somaX = 0, somaZ = 0;
    for (let i = 0; i < barcosDePesca.length; i++) {
        somaX += barcosDePesca[i].x;
        somaZ += barcosDePesca[i].z;
    }
    const meioX = barcosDePesca.length > 0 ? somaX / barcosDePesca.length : barcaNoMundo.x;   // sem fila, olha para a barca
    const meioZ = barcosDePesca.length > 0 ? somaZ / barcosDePesca.length : barcaNoMundo.z;
    return destino.set(lerp(barcaNoMundo.x, meioX, PARTE_DO_COMBOIO_NA_MIRA), 0, lerp(barcaNoMundo.z, meioZ, PARTE_DO_COMBOIO_NA_MIRA));
}

/* ONDAS. sen(x · frequência + tempo · velocidade): o `x` muda a fase de vértice em vértice (vira onda) e o `tempo` a faz andar. */
function alturaDoMar(x, z, tempo) {
    const ondaEmX = Math.sin(x * 0.6 + tempo * 1.3);
    const ondaEmZ = Math.sin(z * 0.5 + tempo * 0.9);
    return AMPLITUDE_DA_ONDA * (ondaEmX + ondaEmZ) / 2;
}

function ondularMar() {
    const posicoes = mar.geometry.attributes.position;
    for (let i = 0; i < posicoes.count; i++) {
        posicoes.setY(i, alturaDoMar(posicoes.getX(i) + mar.position.x, posicoes.getZ(i) + mar.position.z, tempoTotal));
    }
    posicoes.needsUpdate = true;   // avisa a GPU que o buffer mudou
}

/* O céu de cada quadro: noite escura → manhã (a aurora dos últimos 15 s) → e por cima o clarão do relâmpago. A névoa é da ficha. */
function aplicarCeu() {
    const clarao = brilhoDoRelampago();   // regras.js: já vem suave se "reduzir clarões" estiver ligado
    cena.background.set(COR_DO_FUNDO).lerp(rascunho.cor.set(COR_DA_MANHA), noite.aurora).lerp(rascunho.cor.set(COR_DO_CLARAO), clarao);
    cena.fog.color.copy(cena.background);
    cena.fog.density = DENSIDADE_DA_NEVOA * (1 + noite.nevoa);
    mar.material.color.set(COR_DO_MAR).lerp(rascunho.cor.set(COR_DO_MAR_DE_MANHA), noite.aurora);
    luzDoCeu.intensity = LUZ_DO_CEU + LUZ_DO_CLARAO * clarao;
}

iniciar();
