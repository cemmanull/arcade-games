/*
  PASSO 4: O FEIXE

  A barca navega e a lanterna MIRA. O grafo de cena ganha dois pivôs:
      barca (PROA, o leme) └── lanterna (GUINADA, esquerda/direita) └── feixe (ARFAGEM, cima/baixo)
  Cada giro é LOCAL; a direção do feixe NO MUNDO é a soma dos três. Teclado, botões e ponteiro
  viram uma INTENÇÃO só; a barca e a lanterna correm atrás dela com aceleração e velocidade máxima.
*/

// ---- CONSTANTES ----
const COR_DO_FUNDO = 0x07111c;
const COR_DO_MAR = 0x14344f;          // mar à noite
const COR_DO_CEU_DE_TARDE = 0xf3c98b;
const COR_DO_MAR_DE_TARDE = 0x3d7ea6;
const COR_DA_LUZ = 0xfff1c8;
const CAMPO_DE_VISAO = 60;            // graus, na vertical
const CAMPO_DE_VISAO_EM_PE = 80;      // celular em pé: mais aberto, para a ilha caber na largura estreita
const TETO_DO_DELTA = 0.05;           // segundos, igual ao Pong
const ALCANCE_DO_FEIXE = 12;          // metros
const RAIO_DO_FEIXE = 3;              // metros, na ponta
const TAMANHO_DO_MAR = 90;            // metros
const DIVISOES_DO_MAR = 64;           // 64 × 64 quadradinhos = 4.225 vértices
const PASSO_DA_GRADE = TAMANHO_DO_MAR / DIVISOES_DO_MAR;   // um quadradinho do mar, em metros
const AMPLITUDE_DA_ONDA = 0.5;        // metros de altura
const DURACAO_DO_ENTARDECER = 40;     // segundos da tarde à noite
const NEVOA_DE_TARDE = 0.012;         // densidade: quanto maior, mais perto o mundo some
const NEVOA_DE_NOITE = 0.03;
const LUZ_DO_CEU_DE_TARDE = 4;        // intensidade da HemisphereLight
const LUZ_DO_CEU_DE_NOITE = 3.4;
const VELOCIDADE_DA_BARCA = 5;        // metros por segundo
const GIRO_MAXIMO_DA_BARCA = 1.4;     // radianos por segundo
const ACELERACAO_DO_GIRO = 4;         // radianos por segundo, a cada segundo
const GRAU = Math.PI / 180;           // radianos em um grau
const LIMITE_DA_GUINADA = 75 * GRAU;  // a lanterna nunca passa de ±75° da proa
const ARFAGEM_MINIMA = -20 * GRAU;    // a arfagem tem limites PRÓPRIOS: nada de luz para dentro d'água...
const ARFAGEM_MAXIMA = 60 * GRAU;     // ...nem virada por cima das costas
const REPOUSO_DA_ARFAGEM = -0.12;     // sem mira, o feixe desce um pouco e toca o mar
const VELOCIDADE_MAXIMA_DA_MIRA = 2.5;
const ACELERACAO_DA_MIRA = 8;
const GANHO_DA_MIRA = 5;              // velocidade desejada = erro × ganho: freia ao chegar
const TAXA_DO_ALVO_DA_MIRA = 2;       // rad/s: Q/E GIRAM o alvo da lanterna em vez de pô-lo de uma vez no limite
const DURACAO_DO_COMANDO_DO_PONTEIRO = 2;   // segundos que mexer ou arrastar assume a mira (GDD §3)
const SUAVIDADE_DA_CAMERA = 5;        // 1/s: quanto maior, mais rente a câmera segue
const TECLAS = {                      // tecla → ação; botões e teclas disparam as mesmas ações
    a: "esquerda", arrowleft: "esquerda", d: "direita", arrowright: "direita",
    q: "miraEsquerda", e: "miraDireita", arrowup: "miraCima", arrowdown: "miraBaixo"
};

const palco = document.getElementById("palco");
const aviso = document.getElementById("aviso");
const painel = document.getElementById("painel");

// ---- ESTADO — globais de propósito, para poder inspecionar e testar ----
let cena = null, camera = null, renderizador = null;
let mar = null, luzDoCeu = null, cone = null;
let barca = null, lanterna = null, feixe = null;
let eixos = [];
let proa = 0;                         // radianos; 0 = olhando para −z, positivo = para a esquerda
let giroDaBarca = 0;                  // radianos por segundo
let guinada = { angulo: 0, velocidade: 0, minimo: -LIMITE_DA_GUINADA, maximo: LIMITE_DA_GUINADA };   // lanterna, local à barca
let arfagem = { angulo: REPOUSO_DA_ARFAGEM, velocidade: 0, minimo: ARFAGEM_MINIMA, maximo: ARFAGEM_MAXIMA };   // feixe, local à lanterna
let intencao = { leme: 0, guinadaAlvo: 0, arfagemAlvo: REPOUSO_DA_ARFAGEM };   // o que o jogador QUER
let acoes = {};                       // ações seguradas agora: { esquerda: true, ... }
let miraDoPonteiro = null;            // { guinada, arfagem, restante } enquanto o ponteiro manda na mira
let rascunho = null;                  // objetos do three.js reaproveitados a cada quadro (nada de `new` no laço)
let noiteAplicada = -1;               // o último `noite` pintado; -1 = nenhum ainda
let clamp = null, lerp = null;        // vêm de THREE.MathUtils, em iniciar()
let tempoTotal = 0;                   // segundos desde que o jogo abriu: o relógio das ondas e do céu
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

    ({ clamp, lerp } = THREE.MathUtils);   // o three.js já traz os dois: não reescrevemos
    palco.appendChild(renderizador.domElement);
    montarCena();
    ajustarTamanho();
    window.addEventListener("resize", ajustarTamanho);
    window.addEventListener("keydown", aoApertarTecla);
    window.addEventListener("keyup", aoSoltarTecla);
    window.addEventListener("blur", function () { acoes = {}; miraDoPonteiro = null; });   // aba perdeu o foco: solta tudo
    ligarBotao(document.getElementById("botao-esquerda"), "esquerda");
    ligarBotao(document.getElementById("botao-direita"), "direita");
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

// ---- ENTRADA: três fontes, uma intenção ----
function aoApertarTecla(evento) {
    const combinada = evento.ctrlKey || evento.metaKey || evento.altKey;   // Ctrl+H é do navegador
    if (evento.repeat || combinada) {
        return;
    }
    const tecla = String(evento.key).toLowerCase();
    if (tecla === "h") {
        eixos.forEach(function (eixo) { eixo.visible = !eixo.visible; });
        painel.hidden = !painel.hidden;
    } else if (typeof TECLAS[tecla] === "string") {
        acoes[TECLAS[tecla]] = true;
    }
}

function aoSoltarTecla(evento) {
    const acao = TECLAS[String(evento.key).toLowerCase()];
    if (typeof acao === "string") {
        acoes[acao] = false;
    }
}

function ligarBotao(botao, acao) {
    const segurar = function () { acoes[acao] = true; };
    const soltar = function () { acoes[acao] = false; };
    const aoConfirmar = function (funcao) {   // Enter e Espaço: o botão é focável (Tab), então o teclado o SEGURA como o dedo
        return function (evento) {
            if (evento.key === "Enter" || evento.key === " ") {
                funcao();
                evento.preventDefault();      // sem isso o navegador ainda dispararia um `click`
            }
        };
    };

    botao.addEventListener("pointerdown", segurar);
    ["pointerup", "pointercancel", "pointerleave", "blur"].forEach(function (nome) { botao.addEventListener(nome, soltar); });
    botao.addEventListener("keydown", aoConfirmar(segurar));
    botao.addEventListener("keyup", aoConfirmar(soltar));
    botao.addEventListener("click", function (evento) {   // leitor de tela e voz mandam só `click`, com detail 0 (mouse e dedo: ≥ 1)
        if (evento.detail === 0) {
            segurar();
            setTimeout(soltar, 250);   // um toque curto, em milissegundos
        }
    });
    botao.addEventListener("contextmenu", impedirMenuDeContexto);   // segurar o dedo não abre menu nem cancela o giro
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
        guinada: clamp(-horizontal, -1, 1) * LIMITE_DA_GUINADA,
        arfagem: lerp(REPOUSO_DA_ARFAGEM, ARFAGEM_MAXIMA, clamp(-vertical, 0, 1)),
        restante: DURACAO_DO_COMANDO_DO_PONTEIRO
    };
}

function soltarMira(evento) {
    if (evento.type === "pointercancel" || evento.pointerType === "mouse") {
        miraDoPonteiro = null;   // o dedo que levanta NÃO solta: os 2 s de comando correm até o fim
    }
}

/* Junta as fontes na intenção: leme (−1..1, +1 = esquerda) e os dois ângulos que a lanterna quer. */
function lerIntencao(tempo) {
    intencao.leme = sentido("esquerda", "direita");
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
    return (acoes[acaoPositiva] ? 1 : 0) - (acoes[acaoNegativa] ? 1 : 0);
}

// ---- A CENA ----
function montarCena() {
    cena = new THREE.Scene();
    cena.background = new THREE.Color(COR_DO_CEU_DE_TARDE);
    cena.fog = new THREE.FogExp2(COR_DO_CEU_DE_TARDE, NEVOA_DE_TARDE);   // a cor da névoa tem de ser a do fundo
    camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
    rascunho = { cor: new THREE.Color(), ponto: new THREE.Vector3(), alvo: new THREE.Vector3() };

    /* Sem luz, o material "standard" fica preto. A hemisfera é o céu fraco; o SpotLight mora no feixe. */
    luzDoCeu = new THREE.HemisphereLight(0x6f8fb0, COR_DO_FUNDO, LUZ_DO_CEU_DE_TARDE);
    cena.add(luzDoCeu, criarMar(), criarIlhaComFarol(), criarBarca());
    barca.position.set(8, 0, 14);   // 8 m ao lado da ilha (em x = −5): sem leme, a barca passa por ela
    barca.updateMatrixWorld();
    seguirComACamera(1);   // fração 1 = sem suavização: a câmera já nasce no lugar
}

/* Malha = geometria (forma) + material (aparência). `flatShading`: cada face de uma cor só, facetado e barato. */
function criarMalha(geometria, cor) {
    return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cor, flatShading: true }));
}

function criarMar() {
    const geometria = new THREE.PlaneGeometry(TAMANHO_DO_MAR, TAMANHO_DO_MAR, DIVISOES_DO_MAR, DIVISOES_DO_MAR);
    geometria.rotateX(-Math.PI / 2);   // o plano nasce de pé; deitamos a GEOMETRIA, e y vira a altura de cada vértice
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

    /* O cone nasce com a ponta para cima; viramos a geometria para a ponta ficar na lanterna e a boca à frente. */
    const geometriaDoCone = new THREE.ConeGeometry(RAIO_DO_FEIXE, ALCANCE_DO_FEIXE, 24, 1, true);
    geometriaDoCone.translate(0, -ALCANCE_DO_FEIXE / 2, 0);
    geometriaDoCone.rotateX(Math.PI / 2);
    const material = new THREE.MeshBasicMaterial({ color: COR_DA_LUZ, transparent: true, opacity: 0.04, side: THREE.DoubleSide, depthWrite: false });
    cone = new THREE.Mesh(geometriaDoCone, material);

    /* O SpotLight aponta para o `alvo`, que também é filho do feixe: o alvo viaja junto. */
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
    conduzirBarca(tempo);
    seguirAlvo(guinada, intencao.guinadaAlvo, tempo);
    seguirAlvo(arfagem, intencao.arfagemAlvo, tempo);
    lanterna.rotation.y = guinada.angulo;   // estado → desenho: a lanterna só mostra o número
    feixe.rotation.x = arfagem.angulo;
    seguirComACamera(1 - Math.exp(-SUAVIDADE_DA_CAMERA * tempo));   // independe da taxa de quadros
    ondularMar();
    aplicarCeu(Math.min(tempoTotal / DURACAO_DO_ENTARDECER, 1));
    mostrarPainel();
}

function conduzirBarca(tempo) {
    giroDaBarca = aproximar(giroDaBarca, intencao.leme * GIRO_MAXIMO_DA_BARCA, ACELERACAO_DO_GIRO * tempo);
    proa += giroDaBarca * tempo;
    guinada.angulo -= giroDaBarca * tempo;   // a lanterna NÃO vira junto: fica no rumo e a mira a puxa de volta (o atraso)
    proa = Math.atan2(Math.sin(proa), Math.cos(proa));   // mantém entre −π e π
    barca.position.x -= Math.sin(proa) * VELOCIDADE_DA_BARCA * tempo;   // a frente é (−sen, −cos)
    barca.position.z -= Math.cos(proa) * VELOCIDADE_DA_BARCA * tempo;
    barca.position.y = alturaDoMar(barca.position.x, barca.position.z, tempoTotal);   // boia na onda
    barca.rotation.y = proa;
    mar.position.set(naGrade(barca.position.x), 0, naGrade(barca.position.z));   // o mar anda junto, quadradinho a quadradinho
    barca.updateMatrixWorld();   // a câmera vai perguntar onde a barca está no mundo
}

/* Múltiplo do passo da grade mais próximo: os vértices do mar ficam sempre nos mesmos pontos do mundo. */
function naGrade(metros) {
    return Math.round(metros / PASSO_DA_GRADE) * PASSO_DA_GRADE;
}

/* Aceleração angular com teto: o valor só muda `passo` por quadro e chega ao alvo sem saltos. */
function aproximar(valor, alvo, passo) {
    return valor + clamp(alvo - valor, -passo, passo);
}

/* Quanto mais longe do `alvo` (radianos), mais rápido o eixo quer ir, até o teto; a aceleração limita a mudança. */
function seguirAlvo(eixo, alvo, tempo) {
    const velocidadeDesejada = clamp((alvo - eixo.angulo) * GANHO_DA_MIRA, -VELOCIDADE_MAXIMA_DA_MIRA, VELOCIDADE_MAXIMA_DA_MIRA);
    eixo.velocidade = aproximar(eixo.velocidade, velocidadeDesejada, ACELERACAO_DA_MIRA * tempo);
    eixo.angulo = clamp(eixo.angulo + eixo.velocidade * tempo, eixo.minimo, eixo.maximo);
}

/* A CÂMERA. O ponto (0, 5, 8) é LOCAL à barca (atrás e acima). `localToWorld` o leva ao mundo, já com a proa. */
function seguirComACamera(fracao) {
    camera.position.lerp(barca.localToWorld(rascunho.ponto.set(0, 5, 8)), fracao);
    camera.lookAt(barca.localToWorld(rascunho.alvo.set(0, 1, -6)));   // olha 6 m à frente da proa
}

/* PAINEL (tecla H): local × mundo. */
function mostrarPainel() {
    if (painel.hidden) {
        return;
    }
    const frente = feixe.getWorldDirection(rascunho.ponto).negate();   // devolve o +z do feixe; a luz sai pelo −z
    const noMundo = Math.atan2(-frente.x, -frente.z);
    painel.textContent = "proa " + graus(proa) + "° + guinada " + graus(guinada.angulo) + "° = mundo " + graus(noMundo) + "°";
}

function graus(radianos) {
    return Math.round(radianos / GRAU);
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
    posicoes.needsUpdate = true;   // avisa a GPU que o buffer mudou. Normais? O flatShading as calcula por face na GPU
}

function aplicarCeu(noite) {   // 0 = fim de tarde, 1 = noite fechada
    if (noite === noiteAplicada) {
        return;   // com a noite fechada nada mais muda: não refaz a conta a cada quadro
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
