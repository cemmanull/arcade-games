/*
  PASSO 1: A CENA

  Três objetos fazem qualquer cena do three.js:

    1. CENA      — o mundo, uma árvore onde tudo se pendura
    2. CÂMERA    — de onde olhamos
    3. RENDERIZADOR — quem desenha a cena vista pela câmera num canvas

  E o laço de sempre (Pong, passo 2): requestAnimationFrame + delta time.
*/


// ---- CONSTANTES ----
const COR_DO_FUNDO = 0x07111c;
const CAMPO_DE_VISAO = 60;            // graus, na vertical
const VELOCIDADE_DE_GIRO = 0.9;       // radianos por segundo
const TETO_DO_DELTA = 0.05;           // segundos, igual ao Pong

const palco = document.getElementById("palco");
const aviso = document.getElementById("aviso");


// ---- ESTADO — globais de propósito, para poder inspecionar e testar ----
let cena = null;
let camera = null;
let renderizador = null;
let caixa = null;
let instanteDoQuadroAnterior = 0;


// ---- LIGAR ----
function iniciar() {
    /*
      Sem internet, a ponte do index.html falha e `THREE` nunca existe.
      Conferimos ANTES de usar: sem isso o jogo morreria com um erro mudo.
    */
    if (typeof THREE === "undefined") {
        mostrarAviso("Não consegui baixar o three.js. Confira sua internet e recarregue a página.");
        return;
    }

    /* Sem WebGL (navegador antigo, GPU desligada) o construtor lança uma exceção. */
    try {
        renderizador = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2 });
    } catch (erro) {
        mostrarAviso("Seu navegador não conseguiu ligar o WebGL, que o jogo precisa para desenhar em 3D.");
        return;
    }

    palco.appendChild(renderizador.domElement);   // o canvas nasce pronto, criado pelo three.js
    montarCena();
    ajustarTamanho();
    window.addEventListener("resize", ajustarTamanho);

    instanteDoQuadroAnterior = performance.now();
    requestAnimationFrame(quadroAQuadro);
}

function mostrarAviso(texto) {
    aviso.textContent = texto;
    aviso.hidden = false;
}


// ---- A CENA ----
function montarCena() {
    cena = new THREE.Scene();
    cena.background = new THREE.Color(COR_DO_FUNDO);

    camera = new THREE.PerspectiveCamera(CAMPO_DE_VISAO, 1, 0.1, 100);
    camera.position.set(0, 1.5, 5);   // x para a direita, y para cima, z para TRÁS de quem olha

    /*
      Uma malha = GEOMETRIA (a forma) + MATERIAL (a aparência).
      O material "normal" pinta cada face pela direção dela: dispensa luz.
      Luz e material de verdade entram no passo 2.
    */
    caixa = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 3), new THREE.MeshNormalMaterial());
    cena.add(caixa);
}


// ---- REDIMENSIONAR ----
function ajustarTamanho() {
    const largura = palco.clientWidth;
    const altura = palco.clientHeight;

    /* Tela de alta densidade tem mais pixels que o necessário: 2 já basta e poupa a GPU. */
    renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderizador.setSize(largura, altura, false);   // false: o CSS manda no tamanho na página

    /* Sem atualizar a proporção, a imagem sai esticada. */
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
}


// ---- O LOOP ----
function quadroAQuadro(instanteAtual) {
    const segundosDesdeOUltimoQuadro = (instanteAtual - instanteDoQuadroAnterior) / 1000;
    instanteDoQuadroAnterior = instanteAtual;
    const tempo = Math.min(segundosDesdeOUltimoQuadro, TETO_DO_DELTA);

    atualizar(tempo);
    desenhar();

    requestAnimationFrame(quadroAQuadro);
}

function atualizar(tempo) {
    caixa.rotation.y += VELOCIDADE_DE_GIRO * tempo;   // posição += velocidade × tempo, agora em ângulo
}

function desenhar() {
    renderizador.render(cena, camera);
}


iniciar();
