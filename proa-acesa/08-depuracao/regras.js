/*
  PASSO 8: AS REGRAS (regras.js)

  As mesmas regras do passo 7 (noites em `fichas`, relâmpago, calor, dois focos): a depuração é desenho, e mora no script.js.
  Sem THREE: roda sem three.js, sem tela e sem WebGL. Ordem dos scripts: regras.js primeiro. A frente de uma `proa` é (−sen proa, −cos proa).
*/

// ---- FICHAS: os números do jogo ----
const GRAU = Math.PI / 180;
const METADE_DO_MUNDO = 80, RAIO_DO_BARCO = 1.2;   // o mundo é um quadrado de 160 m; o raio vale para a barca e para os barcos de pesca
const VELOCIDADE_DA_BARCA = 5, VELOCIDADE_DA_BARCA_DEVAGAR = 2.5;   // metros por segundo
const GIRO_MAXIMO_DA_BARCA = 1.4, ACELERACAO_DO_GIRO = 4;           // radianos por segundo; e por segundo, a cada segundo
const SEGUNDOS_ENCALHADA = 2;
const DISTANCIA_DO_COMBOIO = 7, ZONA_DE_FREADA = 8;   // onde cada barco quer parar, atrás do da frente; e a partir de quantos metros além ele freia
const VELOCIDADE_DO_BARCO = VELOCIDADE_DA_BARCA * 0.95;   // um pouco mais lento que a barca
const ACELERACAO_DO_BARCO = 4;               // metros por segundo, a cada segundo
const GIRO_MAXIMO_DO_BARCO = 1.1;            // MENOR que o da barca: é isso que balança a cauda
const DISTANCIA_PARA_SE_PERDER = 35, SEGUNDOS_PARA_SE_PERDER = 5;   // a névoa engole quem fica 5 s além de 35 m do da frente
const SEGUNDOS_AFUNDANDO = 2.5, FOLGA_DO_NASCIMENTO = 1;   // a folga: metros livres em volta de um barco que nasce
const SEGUNDOS_DE_BRASA = 3;                 // quanto tempo um recife visto continua na lembrança
const SEGUNDOS_APAGADA = 4, CALOR_DEPOIS_DE_APAGAR = 0.4, RESFRIAR_ENCALHADA = 0.02;   // GDD §4.5
const SEGUNDOS_DA_AURORA = 15, SEGUNDOS_DO_RESULTADO = 4, NAUFRAGIOS_PARA_PERDER = 3;
const DURACAO_DO_RELAMPAGO = 0.25;           // segundos de clarão seco
const SUBIDA_SUAVE = 0.6, BRILHO_SUAVE_MAXIMO = 0.25;   // "reduzir clarões": sobe em 0,6 s, no máximo 25%, e desce igual (GDD §7)
const INTERVALO_MINIMO_ENTRE_CLAROES = 1 / 3;   // WCAG 2.3.1: nunca mais de 3 clarões por segundo, seja qual for a ficha
const PASSO_DA_BUSCA = 4, FOLGA_DO_CAMINHO = 6;  // grade da busca em largura (GDD §4.9) e metros livres de recife para o comboio passar

/* Uma ficha por noite (GDD §4.8); `chuva` é o número de gotas (o teto é GOTAS, no script.js). Mudar a curva é mudar um número, como na tabela do tetris/08-velocidade. */
const fichas = [
    { nome: "Calmaria", duracao: 120, barcos: 2, recifes: 8, colunas: 0, nevoa: 0.15, deriva: 0, relampagosPorMinuto: 0, chuva: 400, meta: 2 },
    { nome: "Garoa", duracao: 150, barcos: 3, recifes: 12, colunas: 2, nevoa: 0.3, deriva: 0.3, relampagosPorMinuto: 2, chuva: 800, meta: 2 },
    { nome: "Ventania", duracao: 150, barcos: 4, recifes: 16, colunas: 3, nevoa: 0.45, deriva: 0.6, relampagosPorMinuto: 4, chuva: 1200, meta: 3 },
    { nome: "Cerração", duracao: 180, barcos: 4, recifes: 20, colunas: 4, nevoa: 0.6, deriva: 0.9, relampagosPorMinuto: 6, chuva: 1600, meta: 3 },
    { nome: "Tormenta", duracao: 180, barcos: 5, recifes: 24, colunas: 5, nevoa: 0.75, deriva: 1.2, relampagosPorMinuto: 8, chuva: 2000, meta: 4 }
];
const FOCOS = {   // GDD §4.2 e §4.5: o estreito alcança longe e esquenta; o largo cobre mais, alcança menos e esfria
    estreito: { meioAngulo: 7 * GRAU, alcanceBase: 46, calorPorSegundo: 0.12 },
    largo: { meioAngulo: 16 * GRAU, alcanceBase: 24, calorPorSegundo: -0.06 }
};

// ---- O MUNDO (dados puros; o script.js desenha) ----
const PARTIDA = { x: 14, z: 42, proa: 0 };
const porto = { x: 6, z: -26, raio: 9 };
const ilha = { x: -5, z: -12, raio: 5.5 };   // a ilha do farol: bate como um recife e a torre TAPA a luz
/* Todos os recifes, em duas listas fixas (sem sorteio): a noite N usa os primeiros `recifes − colunas` baixos e as primeiras `colunas`
   altas. `haCaminhoAtePorto` confere, noite a noite, que há caminho da PARTIDA ao porto. */
const RECIFES_BAIXOS = [
    { x: 20, z: 6.5, raio: 2.5 }, { x: -16.5, z: 13, raio: 2 }, { x: 6.5, z: 2.5, raio: 2 }, { x: -3, z: 5.5, raio: 2 },
    { x: -1, z: -44, raio: 2.5 }, { x: -8.5, z: -26, raio: 2.5 }, { x: 35.5, z: 3.5, raio: 2 }, { x: -28.5, z: 12.5, raio: 3 },
    { x: -29, z: -17, raio: 2 }, { x: 38.5, z: 13, raio: 2.5 }, { x: 31.5, z: -35.5, raio: 2 }, { x: 11.5, z: 15.5, raio: 2.5 },
    { x: 28.5, z: -11, raio: 3 }, { x: 41.5, z: -37.5, raio: 2 }, { x: -18, z: 6, raio: 2 }, { x: 2.5, z: 27.5, raio: 2 },
    { x: -19, z: 22, raio: 2 }, { x: -11.5, z: 0.5, raio: 2.5 }, { x: 28.5, z: 32.5, raio: 2 }
];
const COLUNAS = [   // 5 m de altura: além de bater, TAPAM a luz
    { x: -16, z: 32.5, raio: 1.4 }, { x: 28.5, z: 25.5, raio: 1.4 }, { x: 8.5, z: -5, raio: 1.4 }, { x: 32, z: -45, raio: 1.4 }, { x: -3.5, z: 30.5, raio: 1.4 }
];
const recifes = [];          // os recifes DESTA noite, copiados das listas acima por `comecarNoite`
const barcaNoMundo = { x: PARTIDA.x, z: PARTIDA.z, proa: 0, giro: 0, segundosEncalhada: 0 };
let barcosDePesca = [];      // a fila, do mais perto da barca ao último: uma LISTA VIVA (entra e sai barco)
let barcosAfundando = [];    // já fora da fila, só terminando de afundar
let barcosRemovidos = [];    // saíram do mundo neste quadro: o script.js apaga as malhas e esvazia a lista
let proximoIdDeBarco = 0, salvos = 0, naufragios = 0;
const lanternaDaBarca = { foco: "largo", calor: 0, segundosApagada: 0, meioAngulo: FOCOS.largo.meioAngulo, alcance: FOCOS.largo.alcanceBase };
const noite = {   // o relógio e o placar da noite; `geracao` sobe a cada noite montada, para o script.js refazer o desenho
    indice: 0, ficha: fichas[0], geracao: 0, segundos: 0, aurora: 0, nevoa: 0, salvos: 0, resultado: "", proxima: 0, segundosParaProxima: 0,
    relampagos: [], proximoRelampago: 0, segundosDoRelampago: -1, horaDoUltimoRelampago: -Infinity
};
let reduzirClaroes = false;  // GDD §7: o script.js a liga se o sistema pedir menos movimento

// ---- MATEMÁTICA DO PLANO (sem THREE.MathUtils: este arquivo não pode depender dele) ----
function limitar(valor, minimo, maximo) { return Math.min(Math.max(valor, minimo), maximo); }

/* Aceleração com teto: o valor só muda `passo` por quadro e chega ao alvo sem saltos. */
function aproximar(valor, alvo, passo) { return valor + limitar(alvo - valor, -passo, passo); }

function normalizarAngulo(angulo) { return Math.atan2(Math.sin(angulo), Math.cos(angulo)); }   // entre −π e π

function distanciaEntre(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

function andar(coisa, velocidade, tempo) { coisa.x -= Math.sin(coisa.proa) * velocidade * tempo; coisa.z -= Math.cos(coisa.proa) * velocidade * tempo; }

// ---- A NOITE: montar, andar o relógio, encerrar ----
function comecarNoite(indice) {
    if (indice === 0) {
        salvos = naufragios = 0;   // partida nova (a primeira noite, ou depois de perder ou de vencer a quinta)
    }
    const ficha = fichas[indice];
    Object.assign(noite, { indice: indice, ficha: ficha, segundos: 0, aurora: 0, nevoa: ficha.nevoa, salvos: 0, resultado: "", proximoRelampago: 0, segundosDoRelampago: -1, horaDoUltimoRelampago: -Infinity });
    noite.geracao++;
    noite.relampagos = roteiroDeRelampagos(ficha);
    while (barcosDePesca.length > 0) { removerBarco(barcosDePesca, 0); }       // as malhas saem pela lista dos removidos
    while (barcosAfundando.length > 0) { removerBarco(barcosAfundando, 0); }
    recifes.length = 0;   // brasa: segundos de lembrança que restam; iluminado: a lanterna o vê neste quadro?
    RECIFES_BAIXOS.slice(0, ficha.recifes - ficha.colunas).forEach(function (recife) { recifes.push(Object.assign({ alta: false, brasa: 0, iluminado: false }, recife)); });
    COLUNAS.slice(0, ficha.colunas).forEach(function (recife) { recifes.push(Object.assign({ alta: true, brasa: 0, iluminado: false }, recife)); });
    Object.assign(barcaNoMundo, PARTIDA, { giro: 0, segundosEncalhada: 0 });
    Object.assign(lanternaDaBarca, { calor: 0, segundosApagada: 0 });
    criarComboio();
}

/* Eco do roteiro do shoot-em-up/07: eventos com HORA MARCADA numa lista ordenada, e um índice (`proximoRelampago`) que só avança. */
function roteiroDeRelampagos(ficha) {
    const horas = [];
    const intervalo = ficha.relampagosPorMinuto > 0 ? 60 / ficha.relampagosPorMinuto : Infinity;
    for (let hora = intervalo / 2; hora <= ficha.duracao - SEGUNDOS_DA_AURORA; hora += intervalo) { horas.push(hora); }
    return horas;
}

function atualizarNoite(tempo) {
    noite.segundos += tempo;
    noite.aurora = limitar((noite.segundos - (noite.ficha.duracao - SEGUNDOS_DA_AURORA)) / SEGUNDOS_DA_AURORA, 0, 1);   // 0 → 1 nos últimos 15 s
    noite.nevoa = noite.ficha.nevoa * (1 - noite.aurora);   // ao amanhecer a névoa some e o alcance cresce
    if (noite.segundosDoRelampago >= 0) {   // um clarão em andamento: conta o tempo e, passada a duração, acaba (−1)
        noite.segundosDoRelampago = noite.segundosDoRelampago + tempo < duracaoDoRelampago() ? noite.segundosDoRelampago + tempo : -1;
    }
    /* A trava é da REGRA, não da ficha: um clarão só começa com o anterior terminado (a rampa reduzida de 1,2 s nunca recomeça no meio) e
       a pelo menos 1/3 s do começo dele. Um evento atrasado por isso espera a vez. */
    const livre = noite.segundosDoRelampago < 0 && noite.segundos - noite.horaDoUltimoRelampago >= INTERVALO_MINIMO_ENTRE_CLAROES;
    if (livre && noite.proximoRelampago < noite.relampagos.length && noite.segundos >= noite.relampagos[noite.proximoRelampago]) {
        noite.segundosDoRelampago = 0;
        noite.horaDoUltimoRelampago = noite.segundos;
        noite.proximoRelampago++;
    }
    const fimDaFila = barcosDePesca.length === 0 && barcosAfundando.length === 0;
    if (naufragios >= NAUFRAGIOS_PARA_PERDER) {
        encerrarNoite("naufragios", 0);
    } else if (fimDaFila || noite.segundos >= noite.ficha.duracao) {
        const venceu = noite.salvos >= noite.ficha.meta;
        encerrarNoite(venceu ? "vitoria" : "sem-meta", venceu ? (noite.indice + 1) % fichas.length : noite.indice);
    }
}

function encerrarNoite(resultado, proxima) {
    noite.resultado = resultado;
    noite.segundosDoRelampago = -1;   // o mundo congela: um clarão em andamento não pode ficar preso na tela
    noite.proxima = proxima;
    noite.segundosParaProxima = SEGUNDOS_DO_RESULTADO;
}

// ---- O RELÂMPAGO ----
function duracaoDoRelampago() { return reduzirClaroes ? 2 * SUBIDA_SUAVE : DURACAO_DO_RELAMPAGO; }

/* Quanto o céu clareia agora (0 a 1). Normal: um clarão seco de 0,25 s. Reduzido: sem salto, sobe e desce em rampa suave. */
function brilhoDoRelampago() {
    const segundos = noite.segundosDoRelampago;
    if (segundos < 0) {
        return 0;
    }
    if (!reduzirClaroes) {
        return segundos < DURACAO_DO_RELAMPAGO ? 1 : 0;
    }
    const rampa = Math.max(0, 1 - Math.abs(segundos / SUBIDA_SUAVE - 1));   // 0 → 1 → 0 em 1,2 s
    return BRILHO_SUAVE_MAXIMO * rampa * rampa * (3 - 2 * rampa);
}

// ---- A LANTERNA: foco, calor e alcance ----
function alternarFoco() { lanternaDaBarca.foco = lanternaDaBarca.foco === "estreito" ? "largo" : "estreito"; }

/* Estreito esquenta, largo esfria; encalhada, o estreito esquenta o dobro e tudo esfria um pouco. Calor 1 = sobrecarga: apagada
   por 4 s e volta com 0,4. O alcance é a base do foco encurtada pela névoa (GDD §4.2). */
function atualizarLanterna(tempo) {
    const lanterna = lanternaDaBarca;
    const foco = FOCOS[lanterna.foco];
    if (lanterna.segundosApagada > 0) {
        lanterna.segundosApagada = Math.max(0, lanterna.segundosApagada - tempo);
        lanterna.calor = lanterna.segundosApagada === 0 ? CALOR_DEPOIS_DE_APAGAR : lanterna.calor;
    } else {
        const encalhada = barcaNoMundo.segundosEncalhada > 0;
        const dobro = encalhada && lanterna.foco === "estreito" ? 2 : 1;
        lanterna.calor = limitar(lanterna.calor + (foco.calorPorSegundo * dobro - (encalhada ? RESFRIAR_ENCALHADA : 0)) * tempo, 0, 1);
        lanterna.segundosApagada = lanterna.calor >= 1 ? SEGUNDOS_APAGADA : 0;
    }
    lanterna.meioAngulo = foco.meioAngulo;
    lanterna.alcance = foco.alcanceBase * (1 - 0.5 * noite.nevoa);
}

// ---- O QUADRO DO MUNDO ----
function atualizarMundo(tempo, leme, devagar) {
    if (noite.resultado !== "") {   // o resultado fica na tela e o mundo congela até a próxima noite
        noite.segundosParaProxima -= tempo;
        if (noite.segundosParaProxima <= 0) {
            comecarNoite(noite.proxima);
        }
        return;
    }
    conduzirBarca(tempo, leme, devagar);
    for (let i = 0; i < barcosDePesca.length; i++) {
        conduzirBarco(barcosDePesca[i], alvoDoBarco(barcosDePesca[i]), tempo);
    }
    julgarBarcosDaFila(tempo);
    atualizarBarcosAfundando(tempo);
    atualizarNoite(tempo);
    atualizarLanterna(tempo);   // depois da noite: o alcance usa a névoa DESTE quadro
}

function derivar(coisa, tempo) {   // o vento empurra de lado (+x), na velocidade da ficha da noite
    coisa.x += noite.ficha.deriva * tempo;
}

function conduzirBarca(tempo, leme, devagar) {
    barcaNoMundo.giro = aproximar(barcaNoMundo.giro, leme * GIRO_MAXIMO_DA_BARCA, ACELERACAO_DO_GIRO * tempo);
    barcaNoMundo.proa = normalizarAngulo(barcaNoMundo.proa + barcaNoMundo.giro * tempo);
    const velocidade = devagar ? VELOCIDADE_DA_BARCA_DEVAGAR : VELOCIDADE_DA_BARCA;
    if (barcaNoMundo.segundosEncalhada > 0) {
        barcaNoMundo.segundosEncalhada = Math.max(0, barcaNoMundo.segundosEncalhada - tempo);   // encalhada: nem anda nem deriva
    } else {
        andar(barcaNoMundo, velocidade, tempo);
        derivar(barcaNoMundo, tempo);
    }
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

// ---- A LUZ: dentro do cone? ----
/* O feixe é um LEQUE no plano XZ (GDD §4.1), com o meio-ângulo e o alcance do foco de agora; basta UM ponto do disco do recife
   dentro dele. Centro no ângulo (o produto escalar do passo 6): o ponto mais perto está a (distância − raio). Senão, só se encostar numa borda. */
function recifeNoCone(origem, direcao, recife) {
    const dx = recife.x - origem.x;
    const dz = recife.z - origem.z;
    const distancia = Math.hypot(dx, dz);
    if (distancia <= recife.raio) {
        return true;   // a lanterna está em cima do recife
    }
    const produtoEscalar = (dx * -Math.sin(direcao) + dz * -Math.cos(direcao)) / distancia;   // feixe = (−sen, −cos)
    if (produtoEscalar > Math.cos(lanternaDaBarca.meioAngulo)) {
        return distancia - recife.raio <= lanternaDaBarca.alcance;
    }
    return encostaNaBorda(dx, dz, recife.raio, direcao + lanternaDaBarca.meioAngulo) || encostaNaBorda(dx, dz, recife.raio, direcao - lanternaDaBarca.meioAngulo);
}

/* A borda é o segmento do bico até `alcance` m em `rumo`; o disco a encosta se o ponto dele mais perto do centro está a `raio` ou menos. */
function encostaNaBorda(dx, dz, raio, rumo) {
    const frenteX = -Math.sin(rumo);
    const frenteZ = -Math.cos(rumo);
    const ate = limitar(dx * frenteX + dz * frenteZ, 0, lanternaDaBarca.alcance);
    return Math.hypot(dx - frenteX * ate, dz - frenteZ * ate) <= raio;
}

/* Visto: brasa cheia; não visto: esfria. Lanterna apagada não vê nada. O RELÂMPAGO põe brasa cheia em TODOS os recifes, sem iluminá-los. */
function atualizarBrasas(tempo, origem, direcao, estaTapado) {
    const acesa = lanternaDaBarca.segundosApagada === 0;
    const relampago = noite.segundosDoRelampago >= 0;
    for (let i = 0; i < recifes.length; i++) {
        const recife = recifes[i];
        recife.iluminado = acesa && recifeNoCone(origem, direcao, recife) && !estaTapado(origem, recife);
        recife.brasa = recife.iluminado || relampago ? SEGUNDOS_DE_BRASA : Math.max(0, recife.brasa - tempo);
    }
}

// ---- O COMBOIO: buscar e chegar ----
/* Cada barco olha para o da frente: BUSCAR (vira, no máximo GIRO_MAXIMO_DO_BARCO, para ele) e CHEGAR (a velocidade desejada cai a zero a 7 m). */
function conduzirBarco(barco, alvo, tempo) {
    const rumoAteOAlvo = Math.atan2(-(alvo.x - barco.x), -(alvo.z - barco.z));   // a frente é (−sen, −cos)
    const erroDeRumo = normalizarAngulo(rumoAteOAlvo - barco.proa);
    const passoDeGiro = GIRO_MAXIMO_DO_BARCO * tempo;
    barco.proa = normalizarAngulo(barco.proa + limitar(erroDeRumo, -passoDeGiro, passoDeGiro));

    const folga = (distanciaEntre(barco, alvo) - DISTANCIA_DO_COMBOIO) / ZONA_DE_FREADA;   // 0 ao chegar, 1 longe
    barco.velocidade = aproximar(barco.velocidade, VELOCIDADE_DO_BARCO * limitar(folga, 0, 1), ACELERACAO_DO_BARCO * tempo);
    andar(barco, barco.velocidade, tempo);
    derivar(barco, tempo);
}

/* O alvo é uma FUNÇÃO de quem está na lista (como os dos fantasmas do Pac-Man): tirou um barco e o de trás segue o da frente dele. */
function alvoDoBarco(barco) {
    const indice = barcosDePesca.indexOf(barco);
    return indice <= 0 ? barcaNoMundo : barcosDePesca[indice - 1];
}

/* O comboio nasce em fila atrás da barca, onde dá para viver (no mundo, fora do porto, longe de recifes e ilha). Sem sorteio: gira a
   fila 30° por tentativa e, a cada volta inteira (12), recua mais 7 m: 0, 7, 14 e 21 m. Cercada (48 tentativas), nasce na PARTIDA. */
function criarComboio() {
    let origem = barcaNoMundo, rumo = origem.proa, recuo = 0;
    for (let tentativa = 1; !filaLivre(origem, rumo, recuo); tentativa++) {
        if (tentativa === 48) {
            origem = PARTIDA; rumo = PARTIDA.proa; recuo = 0;   // a PARTIDA é livre em todas as noites (haCaminhoAtePorto parte dela)
            break;
        }
        rumo += Math.PI / 6;
        recuo = DISTANCIA_DO_COMBOIO * Math.floor(tentativa / 12);
    }
    for (let i = 1; i <= noite.ficha.barcos; i++) {
        const lugar = lugarNaFila(origem, rumo, recuo + DISTANCIA_DO_COMBOIO * i);
        barcosDePesca.push({ id: proximoIdDeBarco++, x: lugar.x, z: lugar.z, proa: normalizarAngulo(rumo), velocidade: 0, segundosAfundando: 0, afundamento: 0 });   // afundamento: 0 boiando … 1 no fundo
    }
}

function lugarNaFila(origem, rumo, metrosAtrasDaOrigem) {
    return { x: origem.x + Math.sin(rumo) * metrosAtrasDaOrigem, z: origem.z + Math.cos(rumo) * metrosAtrasDaOrigem };
}

function filaLivre(origem, rumo, recuo) {
    for (let i = 1; i <= noite.ficha.barcos; i++) {
        const lugar = lugarNaFila(origem, rumo, recuo + DISTANCIA_DO_COMBOIO * i);
        const foraDoMundo = Math.abs(lugar.x) > METADE_DO_MUNDO - FOLGA_DO_NASCIMENTO || Math.abs(lugar.z) > METADE_DO_MUNDO - FOLGA_DO_NASCIMENTO;
        if (foraDoMundo || distanciaEntre(lugar, porto) < porto.raio + FOLGA_DO_NASCIMENTO || recifeTocadoPor(lugar, FOLGA_DO_NASCIMENTO) !== null) {
            return false;
        }
    }
    return true;
}

/* Busca em largura numa grade de 4 m (a do pacman/06-modos): há caminho da PARTIDA ao porto por onde cabe o comboio, a `FOLGA_DO_CAMINHO` de
   qualquer recife? Confere a noite montada agora; as cinco: fichas.every(function (f, i) { comecarNoite(i); return haCaminhoAtePorto(); }). */
function haCaminhoAtePorto() {
    const lado = 2 * METADE_DO_MUNDO / PASSO_DA_BUSCA;
    const centroDa = function (coluna, linha) { return { x: -METADE_DO_MUNDO + (coluna + 0.5) * PASSO_DA_BUSCA, z: -METADE_DO_MUNDO + (linha + 0.5) * PASSO_DA_BUSCA }; };
    const largada = [Math.floor((PARTIDA.x + METADE_DO_MUNDO) / PASSO_DA_BUSCA), Math.floor((PARTIDA.z + METADE_DO_MUNDO) / PASSO_DA_BUSCA)];
    const fila = [largada], vistas = new Set([largada[1] * lado + largada[0]]);
    for (let i = 0; i < fila.length; i++) {
        if (distanciaEntre(centroDa(fila[i][0], fila[i][1]), porto) < porto.raio) {
            return true;
        }
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (passo) {
            const coluna = fila[i][0] + passo[0], linha = fila[i][1] + passo[1];
            const dentro = coluna >= 0 && linha >= 0 && coluna < lado && linha < lado;
            if (dentro && !vistas.has(linha * lado + coluna) && recifeTocadoPor(centroDa(coluna, linha), FOLGA_DO_CAMINHO) === null) {
                vistas.add(linha * lado + coluna);
                fila.push([coluna, linha]);
            }
        });
    }
    return false;
}

// ---- A LISTA VIVA: salvos, naufragados e perdidos saem da fila ----
/* De trás para a frente: tirar o item `i` não muda o índice dos que faltam ver. Cada barco conta os seus segundos longe do da frente. */
function julgarBarcosDaFila(tempo) {
    for (let i = barcosDePesca.length - 1; i >= 0; i--) {
        const barco = barcosDePesca[i];
        barco.segundosPerdido = distanciaEntre(barco, alvoDoBarco(barco)) > DISTANCIA_PARA_SE_PERDER ? (barco.segundosPerdido || 0) + tempo : 0;
        if (distanciaEntre(barco, porto) < porto.raio) {
            salvos++;
            noite.salvos++;
            removerBarco(barcosDePesca, i);
        } else if (recifeTocadoPor(barco) !== null) {
            naufragios++;
            barco.segundosAfundando = SEGUNDOS_AFUNDANDO;
            barcosAfundando.push(barcosDePesca.splice(i, 1)[0]);
        } else if (barco.segundosPerdido > SEGUNDOS_PARA_SE_PERDER) {
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

function removerBarco(lista, indice) { barcosRemovidos.push(lista.splice(indice, 1)[0]); }

function recifeTocadoPor(coisa, folga = 0) {   // recife ou ilha: quem bate nela; `folga` alarga o círculo
    for (let i = 0; i < recifes.length; i++) {
        if (distanciaEntre(coisa, recifes[i]) < recifes[i].raio + RAIO_DO_BARCO + folga) {
            return recifes[i];
        }
    }
    return distanciaEntre(coisa, ilha) < ilha.raio + RAIO_DO_BARCO + folga ? ilha : null;
}

comecarNoite(0);
