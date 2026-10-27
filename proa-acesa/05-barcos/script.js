/*
  PASSO 5: OS BARCOS (script.js)

  O mundo mora em regras.js (números no plano XZ, sem THREE). Este arquivo cria a cena, COPIA os
  números do mundo para as malhas, lê a entrada e roda o laço. `barcaNoMundo` é o que a barca É;
  `barca` (Group) é como ela APARECE. Ordem dos scripts: regras.js, depois este.
*/

// ---- CONSTANTES ----
const COR_DO_FUNDO = 0x07111c;
const COR_DO_MAR = 0x14344f;          // mar à noite
const COR_DO_CEU_DE_TARDE = 0xf3c98b;
const COR_DO_MAR_DE_TARDE = 0x3d7ea6;
const COR_DA_LUZ = 0xfff1c8;
const COR_DO_RECIFE = 0xe8e3d4;
const CAMPO_DE_VISAO = 60;            // graus, na vertical
const CAMPO_DE_VISAO_EM_PE = 80;      // celular em pé: mais aberto
const TETO_DO_DELTA = 0.05;           // segundos, igual ao Pong
const ALCANCE_DO_FEIXE = 12;          // metros
const RAIO_DO_FEIXE = 3;              // metros, na ponta
const TAMANHO_DO_MAR = 90;            // metros
const DIVISOES_DO_MAR = 64;           // 64 × 64 quadradinhos = 4.225 vértices
const PASSO_DA_GRADE = TAMANHO_DO_MAR / DIVISOES_DO_MAR;   // um quadradinho do mar, em metros
const AMPLITUDE_DA_ONDA = 0.5;        // metros de altura
const DURACAO_DO_ENTARDECER = 40;     // segundos da tarde à noite
const NEVOA_DE_TARDE = 0.012;
const NEVOA_DE_NOITE = 0.03;
const LUZ_DO_CEU_DE_TARDE = 4;        // intensidade da HemisphereLight
const LUZ_DO_CEU_DE_NOITE = 3.4;
const GRAU = Math.PI / 180;           // radianos em um grau
const LIMITE_DA_GUINADA = 75 * GRAU;
const ARFAGEM_MINIMA = -20 * GRAU;
const ARFAGEM_MAXIMA = 60 * GRAU;
const REPOUSO_DA_ARFAGEM = -0.12;
const VELOCIDADE_MAXIMA_DA_MIRA = 2.5;
const ACELERACAO_DA_MIRA = 8;
const GANHO_DA_MIRA = 5;
const TAXA_DO_ALVO_DA_MIRA = 2;       // rad/s: Q/E GIRAM o alvo da lanterna
const DURACAO_DO_COMANDO_DO_PONTEIRO = 2;   // segundos que mexer ou arrastar assume a mira
const SUAVIDADE_DA_CAMERA = 5;        // 1/s
const TECLAS = {                      // tecla → ação
    a: "esquerda", arrowleft: "esquerda", d: "direita", arrowright: "direita", s: "devagar",
    q: "miraEsquerda", e: "miraDireita", arrowup: "miraCima", arrowdown: "miraBaixo"
};

const palco = document.getElementById("palco");
const aviso = document.getElementById("aviso");
const placar = document.getElementById("placar");

// ---- ESTADO — globais de propósito. O mundo (barcas, recifes, listas) está em regras.js ----
let cena = null, camera = null, renderizador = null;
let mar = null, luzDoCeu = null, cone = null;
let barca = null, lanterna = null, feixe = null;
let partes = null;                    // geometrias e materiais dos barcos de pesca, COMPARTILHADOS por todos
let eixos = [];
let guinada = { angulo: 0, velocidade: 0, minimo: -LIMITE_DA_GUINADA, maximo: LIMITE_DA_GUINADA };
let arfagem = { angulo: REPOUSO_DA_ARFAGEM, velocidade: 0, minimo: ARFAGEM_MINIMA, maximo: ARFAGEM_MAXIMA };
let intencao = { leme: 0, devagar: false, guinadaAlvo: 0, arfagemAlvo: REPOUSO_DA_ARFAGEM };   // o que o jogador QUER
let acoes = {};                       // ação → ENTRADAS que a seguram: { esquerda: ["tecla:a", "dedo:1"] }
let miraDoPonteiro = null;            // { guinada, arfagem, restante } enquanto o ponteiro manda na mira
let rascunho = null;                  // objetos do three.js reaproveitados a cada quadro
let noiteAplicada = -1;
let lerp = null;                      // vem de THREE.MathUtils, em iniciar()
let tempoTotal = 0;
let instanteDoQuadroAnterior = 0;

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
    palco.appendChild(renderizador.domElement);
    montarCena();
    ajustarTamanho();
    window.addEventListener("resize", ajustarTamanho);
    window.addEventListener("keydown", aoApertarTecla);
    window.addEventListener("keyup", aoSoltarTecla);
    window.addEventListener("blur", function () { acoes = {}; miraDoPonteiro = null; });   // aba perdeu o foco: solta tudo
    ligarBotao(document.getElementById("botao-esquerda"), "esquerda");
    ligarBotao(document.getElementById("botao-direita"), "direita");
    ligarBotao(document.getElementById("botao-devagar"), "devagar");
    palco.addEventListener("pointerdown", aoMirarComPonteiro);
    palco.addEventListener("pointermove", aoMirarComPonteiro);
    palco.addEventListener("pointercancel", soltarMira);
    palco.addEventListener("pointerleave", soltarMira);
    palco.addEventListener("contextmenu", impedirMenuDeContexto);

    instanteDoQuadroAnterior = performance.now();
    requestAnimationFrame(quadroAQuadro);
}

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
}

// ---- ENTRADA: várias fontes, uma intenção ----
/*
  Cada ação lembra QUAIS entradas a seguram ("tecla:a", "dedo:1"...). Soltar uma só tira a dela: a ação
  continua enquanto sobrar alguma. É o conserto do exercício 8 do passo 4 (A + ← e soltar só a seta).
*/
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
        eixos.forEach(function (eixo) { eixo.visible = !eixo.visible; });
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

/* O ponteiro vira ÂNGULOS: esquerda/direita da tela = guinada; a metade de cima levanta o feixe.
   Mexer ou arrastar assume a mira por 2 s; depois a lanterna volta a seguir a proa. */
function aoMirarComPonteiro(evento) {
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
    cena.background = new THREE.Color(COR_DO_CEU_DE_TARDE);
    cena.fog = new THREE.FogExp2(COR_DO_CEU_DE_TARDE, NEVOA_DE_TARDE);   // a cor da névoa tem de ser a do fundo
    camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
    rascunho = { cor: new THREE.Color(), ponto: new THREE.Vector3(), alvo: new THREE.Vector3() };
    partes = {
        casco: new THREE.BoxGeometry(1.2, 0.4, 2.4), mastro: new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6),
        luz: new THREE.SphereGeometry(0.15, 8, 6),
        bandeiras: [new THREE.ConeGeometry(0.25, 0.5, 3), new THREE.BoxGeometry(0.4, 0.4, 0.05), new THREE.SphereGeometry(0.2, 8, 6)],
        madeira: new THREE.MeshStandardMaterial({ color: 0x8a5a3c, flatShading: true }),
        brilho: new THREE.MeshBasicMaterial({ color: 0xffd27a, fog: false })   // sem névoa: a luz do barco nunca some
    };

    luzDoCeu = new THREE.HemisphereLight(0x6f8fb0, COR_DO_FUNDO, LUZ_DO_CEU_DE_TARDE);
    cena.add(luzDoCeu, criarMar(), criarIlhaComFarol(), criarBarca(), criarRecifes(), criarPorto());
    copiarMundoParaAsMalhas();
    seguirComACamera(1);   // fração 1 = sem suavização: a câmera já nasce no lugar
}

function criarMalha(geometria, cor) {
    return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cor, flatShading: true }));
}

function criarMar() {
    const geometria = new THREE.PlaneGeometry(TAMANHO_DO_MAR, TAMANHO_DO_MAR, DIVISOES_DO_MAR, DIVISOES_DO_MAR);
    geometria.rotateX(-Math.PI / 2);   // deitamos a GEOMETRIA: y vira a altura de cada vértice
    mar = criarMalha(geometria, COR_DO_MAR_DE_TARDE);
    return mar;
}

function criarIlhaComFarol() {
    const ilha = new THREE.Group();
    ilha.position.set(-5, 0, -12);
    const chao = criarMalha(new THREE.CylinderGeometry(4, 5.5, 1.2, 12), 0x2b3a2f);
    const torre = criarMalha(new THREE.CylinderGeometry(0.9, 1.4, 9, 10), 0x4a5563);
    const salaDaLampada = criarMalha(new THREE.CylinderGeometry(1.1, 1.1, 1, 10), 0x1c232b);
    const telhado = criarMalha(new THREE.ConeGeometry(1.4, 1.3, 10), 0x6b3a2e);
    chao.position.y = 0.2;
    torre.position.y = 5.3;
    salaDaLampada.position.y = 10.3;   // apagada: sem emissivo
    telhado.position.y = 11.45;
    ilha.add(chao, torre, salaDaLampada, telhado);
    return ilha;
}

function criarBarca() {
    barca = new THREE.Group();
    const casco = criarMalha(new THREE.BoxGeometry(1.6, 0.5, 3.2), 0x8a5a3c);
    const cabine = criarMalha(new THREE.BoxGeometry(0.9, 0.6, 1), 0xc9b79c);
    casco.position.y = 0.25;
    cabine.position.set(0, 0.8, 0.6);
    barca.add(casco, cabine, criarLanterna());
    eixos.push(criarEixos(barca));
    return barca;
}

function criarLanterna() {
    lanterna = new THREE.Group();
    lanterna.position.set(0, 1, -1.4);   // na proa: o -Z é a frente
    const poste = criarMalha(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 6), 0x4a5563);
    const lente = criarMalha(new THREE.CylinderGeometry(0.18, 0.18, 0.3, 8), COR_DA_LUZ);
    lente.material.emissive.set(COR_DA_LUZ);   // emissivo: brilha sem precisar de luz
    poste.position.y = -0.35;
    lanterna.add(poste, lente, criarFeixe());
    eixos.push(criarEixos(lanterna));
    return lanterna;
}

function criarFeixe() {
    feixe = new THREE.Group();
    feixe.position.z = -0.2;   // um palmo à frente da lente
    const geometriaDoCone = new THREE.ConeGeometry(RAIO_DO_FEIXE, ALCANCE_DO_FEIXE, 24, 1, true);
    geometriaDoCone.translate(0, -ALCANCE_DO_FEIXE / 2, 0);   // ponta na lanterna, boca à frente
    geometriaDoCone.rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: COR_DA_LUZ, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false });
    cone = new THREE.Mesh(geometriaDoCone, material);
    const abertura = Math.atan(RAIO_DO_FEIXE / ALCANCE_DO_FEIXE);
    const luz = new THREE.SpotLight(COR_DA_LUZ, 120, ALCANCE_DO_FEIXE * 1.5, abertura, 0.4);
    const alvo = new THREE.Object3D();
    alvo.position.z = -ALCANCE_DO_FEIXE;
    luz.target = alvo;
    feixe.add(cone, luz, alvo);
    return feixe;
}

/* Depuração (tecla H): os eixos do objeto. Vermelho = x, verde = y, azul = z. */
function criarEixos(pai) {
    const eixo = new THREE.AxesHelper(1.5);
    eixo.visible = false;
    pai.add(eixo);
    return eixo;
}

/* Um recife é um DADO em `recifes`; aqui nasce uma pedra para cada um (a pedra não decide nada). */
function criarRecifes() {
    const grupo = new THREE.Group();
    recifes.forEach(function (recife) {
        const pedra = criarMalha(new THREE.DodecahedronGeometry(recife.raio, 0), COR_DO_RECIFE);
        pedra.position.set(recife.x, recife.raio * 0.2, recife.z);
        grupo.add(pedra);
    });
    return grupo;
}

function criarPorto() {
    const material = new THREE.MeshBasicMaterial({ color: COR_DO_CEU_DE_TARDE, fog: false });   // o porto é um farol: a névoa não o apaga
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
    casco.position.y = 0.2;
    mastro.position.y = 1;
    luz.position.y = 1.85;
    bandeira.position.set(0.3, 1.5, 0);
    grupo.add(casco, mastro, luz, bandeira);
    return grupo;
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
    atualizar(tempo);
    desenhar();
    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    tempoTotal += tempo;
    lerIntencao(tempo);
    atualizarMundo(tempo, intencao.leme, intencao.devagar);   // regras.js: tudo o que o jogo DECIDE
    guinada.angulo -= barcaNoMundo.giro * tempo;   // a lanterna não gira junto com a proa: fica no rumo e a mira a puxa de volta
    seguirAlvo(guinada, intencao.guinadaAlvo, tempo);
    seguirAlvo(arfagem, intencao.arfagemAlvo, tempo);
    copiarMundoParaAsMalhas();
    lanterna.rotation.y = guinada.angulo;
    feixe.rotation.x = arfagem.angulo;
    seguirComACamera(1 - Math.exp(-SUAVIDADE_DA_CAMERA * tempo));   // independe da taxa de quadros
    ondularMar();
    aplicarCeu(Math.min(tempoTotal / DURACAO_DO_ENTARDECER, 1));
    mostrarPlacar();
}

/* Estado → desenho: as malhas só COPIAM x, z e proa do mundo (a altura da onda é só desenho). */
function copiarMundoParaAsMalhas() {
    barca.position.set(barcaNoMundo.x, alturaDoMar(barcaNoMundo.x, barcaNoMundo.z, tempoTotal), barcaNoMundo.z);
    barca.rotation.y = barcaNoMundo.proa;
    barca.updateMatrixWorld();   // a câmera vai perguntar onde a barca está no mundo
    mar.position.set(naGrade(barcaNoMundo.x), 0, naGrade(barcaNoMundo.z));   // o mar anda junto, quadradinho a quadradinho
    barcosDePesca.forEach(desenharBarco);
    barcosAfundando.forEach(desenharBarco);
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

function mostrarPlacar() {
    const texto = "Salvos " + salvos + " · Naufrágios " + naufragios + " · Na fila " + barcosDePesca.length;
    if (placar.textContent !== texto) {   // só escreve quando muda: o leitor de tela (aria-live) não repete
        placar.textContent = texto;
    }
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

/* O ponto (0, 10, 14) é LOCAL à barca (atrás e acima). `localToWorld` o leva ao mundo, já com a proa.
   Mais alta e mais atrás que no passo 4 (0, 5, 8): o comboio vem ATRÁS da barca e ficaria fora da tela. */
function seguirComACamera(fracao) {
    camera.position.lerp(barca.localToWorld(rascunho.ponto.set(0, 10, 14)), fracao);
    camera.lookAt(barca.localToWorld(rascunho.alvo.set(0, 0, -1)));   // olha para a água, quase embaixo da proa: o comboio entra na tela
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

function aplicarCeu(noite) {   // 0 = fim de tarde, 1 = noite fechada
    if (noite === noiteAplicada) {
        return;   // com a noite fechada nada mais muda
    }
    noiteAplicada = noite;
    cena.background.set(COR_DO_CEU_DE_TARDE).lerp(rascunho.cor.set(COR_DO_FUNDO), noite);
    cena.fog.color.copy(cena.background);
    cena.fog.density = lerp(NEVOA_DE_TARDE, NEVOA_DE_NOITE, noite);
    mar.material.color.set(COR_DO_MAR_DE_TARDE).lerp(rascunho.cor.set(COR_DO_MAR), noite);
    luzDoCeu.intensity = lerp(LUZ_DO_CEU_DE_TARDE, LUZ_DO_CEU_DE_NOITE, noite);
    cone.material.opacity = lerp(0.04, 0.18, noite);   // de dia o feixe quase não aparece
}

function desenhar() {
    renderizador.render(cena, camera);
}

iniciar();
