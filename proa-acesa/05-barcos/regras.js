/*
  PASSO 5: AS REGRAS (regras.js)

  O mundo do jogo em NÚMEROS, no plano XZ: onde estão a barca, os barcos de pesca, os recifes e o
  porto. Aqui não existe THREE: este arquivo roda sem three.js, sem tela e sem WebGL (a página de
  teste o carrega sozinho). O script.js só LÊ estes números e os desenha.

  Ordem dos scripts: regras.js primeiro, script.js depois (o script usa o que este declara).
  Convenção: a frente de qualquer coisa com `proa` é (−sen proa, −cos proa); proa positiva = esquerda.
*/

// ---- FICHAS ----
const METADE_DO_MUNDO = 80;                  // o mundo é um quadrado de 160 m
const VELOCIDADE_DA_BARCA = 5;               // metros por segundo
const VELOCIDADE_DA_BARCA_DEVAGAR = 2.5;
const GIRO_MAXIMO_DA_BARCA = 1.4;            // radianos por segundo
const ACELERACAO_DO_GIRO = 4;                // radianos por segundo, a cada segundo
const RAIO_DO_BARCO = 1.2;                   // metros: vale para a barca e para os barcos de pesca
const SEGUNDOS_ENCALHADA = 2;
const QUANTIDADE_DE_BARCOS = 4;
const DISTANCIA_DO_COMBOIO = 7;              // onde cada barco quer parar, atrás do da frente
const ZONA_DE_FREADA = 8;                    // a partir de quantos metros além disso ele começa a frear
const VELOCIDADE_DO_BARCO = VELOCIDADE_DA_BARCA * 0.95;   // um pouco mais lento que a barca
const ACELERACAO_DO_BARCO = 4;               // metros por segundo, a cada segundo
const GIRO_MAXIMO_DO_BARCO = 1.1;            // MENOR que o da barca: é isso que balança a cauda
const DISTANCIA_PARA_SE_PERDER = 35;         // atrás do da frente por mais que isso, some na névoa
const SEGUNDOS_AFUNDANDO = 2.5;

// ---- O MUNDO (dados puros; o script.js desenha) ----
const porto = { x: 6, z: -26, raio: 9 };
const recifes = [
    { x: 9, z: -4, raio: 2 }, { x: 1, z: 2, raio: 2.5 }, { x: 17, z: -10, raio: 3 }, { x: -6, z: -22, raio: 2.5 },
    { x: 16, z: -16, raio: 2 }, { x: 22, z: 2, raio: 2.5 }, { x: -12, z: 4, raio: 3 }, { x: 20, z: -28, raio: 3 },
    { x: -6, z: -34, raio: 2.5 }, { x: -14, z: -10, raio: 2.5 }
];
const barcaNoMundo = { x: 8, z: 14, proa: 0, giro: 0, segundosEncalhada: 0 };
let barcosDePesca = [];      // a fila, do mais perto da barca ao último: uma LISTA VIVA (entra e sai barco)
let barcosAfundando = [];    // já fora da fila, só terminando de afundar
let barcosRemovidos = [];    // saíram do mundo neste quadro: o script.js apaga as malhas e esvazia a lista
let proximoIdDeBarco = 0;
let salvos = 0;
let naufragios = 0;

// ---- MATEMÁTICA DO PLANO (sem THREE.MathUtils: este arquivo não pode depender dele) ----
function limitar(valor, minimo, maximo) {
    return Math.min(Math.max(valor, minimo), maximo);
}

/* Aceleração com teto: o valor só muda `passo` por quadro e chega ao alvo sem saltos. */
function aproximar(valor, alvo, passo) {
    return valor + limitar(alvo - valor, -passo, passo);
}

function normalizarAngulo(angulo) {
    return Math.atan2(Math.sin(angulo), Math.cos(angulo));   // entre −π e π
}

function distanciaEntre(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function andar(coisa, velocidade, tempo) {
    coisa.x -= Math.sin(coisa.proa) * velocidade * tempo;
    coisa.z -= Math.cos(coisa.proa) * velocidade * tempo;
}

// ---- O QUADRO DO MUNDO ----
function atualizarMundo(tempo, leme, devagar) {
    conduzirBarca(tempo, leme, devagar);
    barcosDePesca.forEach(function (barco) {
        conduzirBarco(barco, alvoDoBarco(barco), tempo);
    });
    julgarBarcosDaFila();
    atualizarBarcosAfundando(tempo);
    if (barcosDePesca.length === 0 && barcosAfundando.length === 0) {
        criarComboio();   // a fila acabou: chega um comboio novo, atrás da barca
    }
}

function conduzirBarca(tempo, leme, devagar) {
    barcaNoMundo.giro = aproximar(barcaNoMundo.giro, leme * GIRO_MAXIMO_DA_BARCA, ACELERACAO_DO_GIRO * tempo);
    barcaNoMundo.proa = normalizarAngulo(barcaNoMundo.proa + barcaNoMundo.giro * tempo);
    const velocidade = devagar ? VELOCIDADE_DA_BARCA_DEVAGAR : VELOCIDADE_DA_BARCA;
    andar(barcaNoMundo, barcaNoMundo.segundosEncalhada > 0 ? 0 : velocidade, tempo);
    barcaNoMundo.segundosEncalhada = Math.max(0, barcaNoMundo.segundosEncalhada - tempo);
    barcaNoMundo.x = limitar(barcaNoMundo.x, -METADE_DO_MUNDO, METADE_DO_MUNDO);
    barcaNoMundo.z = limitar(barcaNoMundo.z, -METADE_DO_MUNDO, METADE_DO_MUNDO);

    const recife = recifeTocadoPor(barcaNoMundo);
    if (recife !== null) {
        const afastamento = Math.atan2(barcaNoMundo.z - recife.z, barcaNoMundo.x - recife.x);
        const distanciaSegura = (recife.raio + RAIO_DO_BARCO) * 1.01;   // 1% de folga: no ponto exato, o arredondamento re-encalharia
        barcaNoMundo.x = recife.x + Math.cos(afastamento) * distanciaSegura;   // sai de dentro da pedra
        barcaNoMundo.z = recife.z + Math.sin(afastamento) * distanciaSegura;
        barcaNoMundo.segundosEncalhada = SEGUNDOS_ENCALHADA;
    }
}

// ---- O COMBOIO: buscar e chegar ----
/*
  Cada barco olha para o da frente e faz duas coisas:
    BUSCAR  — vira (no máximo GIRO_MAXIMO_DO_BARCO) para a posição dele;
    CHEGAR  — a velocidade desejada cai a zero ao chegar a DISTANCIA_DO_COMBOIO, em vez de bater nele.
  A velocidade real corre atrás da desejada com aceleração limitada, como a barca corre atrás do leme.
*/
function conduzirBarco(barco, alvo, tempo) {
    const rumoAteOAlvo = Math.atan2(-(alvo.x - barco.x), -(alvo.z - barco.z));   // a frente é (−sen, −cos)
    const erroDeRumo = normalizarAngulo(rumoAteOAlvo - barco.proa);
    const passoDeGiro = GIRO_MAXIMO_DO_BARCO * tempo;
    barco.proa = normalizarAngulo(barco.proa + limitar(erroDeRumo, -passoDeGiro, passoDeGiro));

    const folga = (distanciaEntre(barco, alvo) - DISTANCIA_DO_COMBOIO) / ZONA_DE_FREADA;   // 0 ao chegar, 1 longe
    barco.velocidade = aproximar(barco.velocidade, VELOCIDADE_DO_BARCO * limitar(folga, 0, 1), ACELERACAO_DO_BARCO * tempo);
    andar(barco, barco.velocidade, tempo);
}

/* O alvo é uma FUNÇÃO de quem está na lista (como os alvos dos fantasmas do Pac-Man): tirou um barco
   da fila e o de trás passa a seguir o da frente dele, sem mais nenhum código. */
function alvoDoBarco(barco) {
    const indice = barcosDePesca.indexOf(barco);
    return indice <= 0 ? barcaNoMundo : barcosDePesca[indice - 1];
}

function criarComboio() {
    for (let i = 1; i <= QUANTIDADE_DE_BARCOS; i++) {
        barcosDePesca.push({
            id: proximoIdDeBarco++,
            x: barcaNoMundo.x + Math.sin(barcaNoMundo.proa) * DISTANCIA_DO_COMBOIO * i,   // atrás da barca
            z: barcaNoMundo.z + Math.cos(barcaNoMundo.proa) * DISTANCIA_DO_COMBOIO * i,
            proa: barcaNoMundo.proa,
            velocidade: 0,
            segundosAfundando: 0,
            afundamento: 0   // 0 = boiando … 1 = no fundo
        });
    }
}

// ---- A LISTA VIVA: salvos, naufragados e perdidos saem da fila ----
/* Percorre de trás para a frente: tirar o item `i` não muda o índice dos que ainda faltam ver. */
function julgarBarcosDaFila() {
    for (let i = barcosDePesca.length - 1; i >= 0; i--) {
        const barco = barcosDePesca[i];
        if (distanciaEntre(barco, porto) < porto.raio) {
            salvos++;
            removerBarco(barcosDePesca, i);
        } else if (recifeTocadoPor(barco) !== null) {
            naufragios++;
            barco.segundosAfundando = SEGUNDOS_AFUNDANDO;
            barcosAfundando.push(barcosDePesca.splice(i, 1)[0]);
        } else if (distanciaEntre(barco, alvoDoBarco(barco)) > DISTANCIA_PARA_SE_PERDER) {
            naufragios++;
            removerBarco(barcosDePesca, i);
        }
    }
}

function atualizarBarcosAfundando(tempo) {
    for (let i = barcosAfundando.length - 1; i >= 0; i--) {
        const barco = barcosAfundando[i];
        barco.segundosAfundando -= tempo;
        barco.afundamento = limitar(1 - barco.segundosAfundando / SEGUNDOS_AFUNDANDO, 0, 1);
        if (barco.segundosAfundando <= 0) {
            removerBarco(barcosAfundando, i);
        }
    }
}

function removerBarco(lista, indice) {
    barcosRemovidos.push(lista.splice(indice, 1)[0]);
}

function recifeTocadoPor(coisa) {
    for (let i = 0; i < recifes.length; i++) {
        if (distanciaEntre(coisa, recifes[i]) < recifes[i].raio + RAIO_DO_BARCO) {
            return recifes[i];
        }
    }
    return null;
}

criarComboio();
