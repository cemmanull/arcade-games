/*
  PASSO 2: A ILHA

  A cena do passo 1 ganha um mundo: mar, ilha, farol apagado e a barca do
  faroleiro. A ideia nova é o GRAFO DE CENA — objetos que se penduram uns
  nos outros:

      cena
      ├── mar, ilha (com o farol)
      └── barca
          └── lanterna          (na proa)
              └── feixe         (cone de luz + SpotLight)

  Cada filho tem posição e giro RELATIVOS ao pai: girar a barca gira tudo
  que está pendurado nela.
*/

// ---- CONSTANTES ----
const COR_DO_FUNDO = 0x07111c;
const COR_DO_MAR = 0x14344f;
const COR_DA_LUZ = 0xfff1c8;
const CAMPO_DE_VISAO = 60;            // graus, na vertical
const CAMPO_DE_VISAO_EM_PE = 80;      // celular em pé: mais aberto, para a ilha caber na largura estreita
const TETO_DO_DELTA = 0.05;           // segundos, igual ao Pong
const ALCANCE_DO_FEIXE = 12;          // metros
const RAIO_DO_FEIXE = 3;              // metros, na ponta
const AMPLITUDE_DO_GIRO = 0.7;        // radianos para cada lado
const VELOCIDADE_DO_GIRO = 0.7;       // radianos de fase por segundo

const palco = document.getElementById("palco");
const aviso = document.getElementById("aviso");
// ---- ESTADO — globais de propósito, para poder inspecionar e testar ----
let cena = null;
let camera = null;
let renderizador = null;
let barca = null;
let lanterna = null;
let feixe = null;
let eixos = [];
let fase = 0;
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

    palco.appendChild(renderizador.domElement);
    montarCena();
    ajustarTamanho();
    window.addEventListener("resize", ajustarTamanho);
    window.addEventListener("keydown", aoApertarTecla);

    instanteDoQuadroAnterior = performance.now();
    requestAnimationFrame(quadroAQuadro);
}

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
}

function aoApertarTecla(evento) {
    const combinada = evento.ctrlKey || evento.metaKey || evento.altKey;   // Ctrl+H é do navegador
    if (evento.repeat || combinada || String(evento.key).toLowerCase() !== "h") {
        return;
    }
    eixos.forEach(function (eixo) { eixo.visible = !eixo.visible; });
}

// ---- A CENA ----
function montarCena() {
    cena = new THREE.Scene();
    cena.background = new THREE.Color(COR_DO_FUNDO);

    camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
    camera.position.set(0, 6, 10);
    camera.lookAt(0, 3, -7);

    /* Sem luz, o material "standard" fica preto. A hemisfera é o céu fraco; o SpotLight mora no feixe. */
    cena.add(new THREE.HemisphereLight(0x6f8fb0, COR_DO_FUNDO, 2.4));

    cena.add(criarMar());
    cena.add(criarIlhaComFarol());
    cena.add(criarBarca());
}

/* Malha = geometria (forma) + material (aparência). `flatShading`: cada face de uma cor só, facetado e barato. */
function criarMalha(geometria, cor) {
    return new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: cor, flatShading: true }));
}

function criarMar() {
    const mar = criarMalha(new THREE.PlaneGeometry(90, 90), COR_DO_MAR);
    mar.rotation.x = -Math.PI / 2;   // o plano nasce de pé; deitamos
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
    const material = new THREE.MeshBasicMaterial({
        color: COR_DA_LUZ, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false
    });

    /* O SpotLight aponta para o `alvo`, que também é filho do feixe: o alvo viaja junto. */
    const abertura = Math.atan(RAIO_DO_FEIXE / ALCANCE_DO_FEIXE);
    const luz = new THREE.SpotLight(COR_DA_LUZ, 120, ALCANCE_DO_FEIXE * 1.5, abertura, 0.4);
    const alvo = new THREE.Object3D();
    alvo.position.z = -ALCANCE_DO_FEIXE;
    luz.target = alvo;

    feixe.add(new THREE.Mesh(geometriaDoCone, material), luz, alvo);
    return feixe;
}

/* Depuração (tecla H): os eixos do objeto. Vermelho = x, verde = y, azul = z. */
function criarEixos(pai) {
    const eixo = new THREE.AxesHelper(1.5);
    eixo.visible = false;
    pai.add(eixo);
    return eixo;
}

// ---- REDIMENSIONAR ----
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

// ---- O LOOP ----
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;
    const tempo = Math.max(0, Math.min(segundosDesdeOUltimoQuadro, TETO_DO_DELTA));   // nunca negativo nem enorme

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    fase += VELOCIDADE_DO_GIRO * tempo;
    barca.rotation.y = AMPLITUDE_DO_GIRO * Math.sin(fase);   // só a barca gira; lanterna e feixe vão atrás
}

function desenhar() {
    renderizador.render(cena, camera);
}

iniciar();
