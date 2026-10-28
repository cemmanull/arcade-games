/*
  APOIO DO PROA ACESA: as verificações que os passos 5 a 8 repartem (nascimento do comboio, trava de clarões e o
  modo travado por clarão, enquadramento da câmera, Espaço depois do clique, subida do buffer da chuva).

  Carregue DEPOIS de ../apoio.js e ANTES dos scripts do jogo. Só declara funções `verif...`: os nomes do jogo (barcaNoMundo,
  recifes, noite, camera...) são lidos quando a função é CHAMADA, nunca ao carregar. Cada função usa `conferir` do apoio.js.
  Os números do GDD (7 m, 12 giros, 73 candidatos, 0,4 s, 0,97...) estão escritos aqui de propósito: não são lidos do jogo.
*/


// ============================================================
// 1. O COMBOIO NASCE NO 1º CANDIDATO APROVADO: 48 GIROS × RECUOS, O ANEL A 10 E 20 m, A PARTIDA; SEM LUGAR VIVO, NÃO NASCE NADA
// ============================================================
const VERIF_QUANTOS_CANDIDATOS = 73;   // 48 giros × recuos, 24 do anel e a PARTIDA por último
const VERIF_INDICE_DA_PARTIDA = 72;

function verifQuantosBarcosNascem() {
    return typeof QUANTIDADE_DE_BARCOS === "number" ? QUANTIDADE_DE_BARCOS : noite.ficha.barcos;
}

function verifEsvaziarFilas() {
    while (barcosDePesca.length > 0) { removerBarco(barcosDePesca, 0); }
    while (barcosAfundando.length > 0) { removerBarco(barcosAfundando, 0); }
}

/* Põe a barca na pose e deixa o jogo montar o comboio. Os removidos ficam para o próximo quadro do jogo apagar as malhas. */
function verifNascerEm(pose) {
    verifEsvaziarFilas();
    Object.assign(barcaNoMundo, { x: pose.x, z: pose.z, proa: pose.proa, giro: 0 });
    criarComboio();
    return barcosDePesca.slice();
}

/*
  Os 73 candidatos, na ordem do GDD, escritos aqui sem ler o jogo: os giros de 30° da fila atrás da barca (a cada 12, recua mais 7 m: 0, 7, 14, 21),
  depois o anel (12 rumos de 30° a 10 m e 12 a 20 m da barca, a fila de través, 90° a mais) e por último a PARTIDA. Cada um traz os lugares dos `quantos` barcos.
*/
function verifCandidatosDaPose(pose, quantos) {
    const giro = Math.PI / 6;
    const candidatos = [];
    for (let k = 0; k < 48; k++) {
        candidatos.push({ origem: { x: pose.x, z: pose.z }, rumo: pose.proa + k * giro, recuo: 7 * Math.floor(k / 12) });
    }
    for (let k = 0; k < 24; k++) {
        const raio = 10 * (1 + Math.floor(k / 12));
        candidatos.push({ origem: { x: pose.x + Math.sin(k * giro) * raio, z: pose.z + Math.cos(k * giro) * raio }, rumo: k * giro + Math.PI / 2, recuo: 0 });
    }
    candidatos.push({ origem: { x: PARTIDA.x, z: PARTIDA.z }, rumo: PARTIDA.proa, recuo: 0 });
    candidatos.forEach(function (candidato) {
        candidato.lugares = [];
        for (let i = 1; i <= quantos; i++) {
            candidato.lugares.push({ x: candidato.origem.x + Math.sin(candidato.rumo) * (candidato.recuo + 7 * i), z: candidato.origem.z + Math.cos(candidato.rumo) * (candidato.recuo + 7 * i) });
        }
    });
    return candidatos;
}

/* Válido: dentro de ±79 m, a 1 m do porto e a 1 m de folga (além dos 1,2 m do barco) de cada pedra e da ilha. */
function verifLugaresValidos(lugares, obstaculos) {
    return lugares.every(function (lugar) {
        return Math.abs(lugar.x) <= 79 && Math.abs(lugar.z) <= 79 && Math.hypot(lugar.x - porto.x, lugar.z - porto.z) >= porto.raio + 1 &&
            obstaculos.every(function (obstaculo) { return Math.hypot(lugar.x - obstaculo.x, lugar.z - obstaculo.z) >= obstaculo.raio + 1.2 + 1; });
    });
}

/* Aprovado: lugares válidos E o 1º barco a menos de 35 m da barca (senão a névoa o engoliria no ato). */
function verifCandidatoAprovado(candidato, pose, obstaculos) {
    return verifLugaresValidos(candidato.lugares, obstaculos) && Math.hypot(candidato.lugares[0].x - pose.x, candidato.lugares[0].z - pose.z) < 35;
}

/* O ORÁCULO: o 1º candidato aprovado (índice 0 a 72); sem nenhum, índice −1 e nenhum lugar: não nasce nada. */
function verifOndeOComboioDeveNascer(pose, quantos, obstaculos) {
    const candidatos = verifCandidatosDaPose(pose, quantos);
    for (let indice = 0; indice < candidatos.length; indice++) {
        if (verifCandidatoAprovado(candidatos[indice], pose, obstaculos)) {
            return { candidato: indice, rumo: candidatos[indice].rumo, lugares: candidatos[indice].lugares };
        }
    }
    return { candidato: -1, rumo: 0, lugares: [] };
}

/* "" se o comboio nasceu onde o oráculo manda (posição e proa de cada barco); senão o primeiro defeito. */
function verifDiferencaDoComboio(nascidos, esperado) {
    if (nascidos.length !== esperado.lugares.length) {
        return "nasceram " + nascidos.length + " barcos, esperado " + esperado.lugares.length;
    }
    for (let i = 0; i < nascidos.length; i++) {
        const lugar = esperado.lugares[i];
        if (Math.hypot(nascidos[i].x - lugar.x, nascidos[i].z - lugar.z) > 1e-6) {
            return "o barco " + (i + 1) + " nasceu em (" + nascidos[i].x.toFixed(2) + ", " + nascidos[i].z.toFixed(2) + "), esperado (" + lugar.x.toFixed(2) + ", " + lugar.z.toFixed(2) + ")";
        }
        if (Math.abs(Math.atan2(Math.sin(nascidos[i].proa - esperado.rumo), Math.cos(nascidos[i].proa - esperado.rumo))) > 1e-6) {
            return "o barco " + (i + 1) + " nasceu de proa " + nascidos[i].proa.toFixed(3) + ", esperado " + esperado.rumo.toFixed(3);
        }
    }
    return "";
}

/* Uma pedra no lugar do 1º barco de cada um dos `ate` primeiros candidatos: com raio 0,1 bloqueia o dele e só os que passam a menos de 2,3 m daquele ponto. */
function verifPedraEmTodosOsCandidatos(pose, quantos, ate, raio) {
    const candidatos = verifCandidatosDaPose(pose, quantos);
    recifes.length = 0;
    for (let indice = 0; indice < ate; indice++) {
        const lugar = candidatos[indice].lugares[0];
        recifes.push({ x: lugar.x, z: lugar.z, raio: raio, alta: false, brasa: 0, iluminado: false });
    }
}

/* A pose, numa grade, de onde mais candidatos são aprovados só pelo mundo, porto e ilha (sem pedras). `aceita` filtra as poses. */
function verifPoseComMaisCandidatosAprovados(quantos, aceita) {
    let melhor = null, melhorContagem = -1;
    for (let x = -60; x <= 60; x += 5) {
        for (let z = -60; z <= 70; z += 5) {
            const pose = { x: x, z: z, proa: 0.3 };
            const candidatos = verifCandidatosDaPose(pose, quantos);
            if (!aceita(candidatos[VERIF_INDICE_DA_PARTIDA], pose)) { continue; }
            const aprovados = candidatos.filter(function (candidato) { return verifCandidatoAprovado(candidato, pose, [ilha]); }).length;
            if (aprovados > melhorContagem) {
                melhor = pose;
                melhorContagem = aprovados;
            }
        }
    }
    return melhor;
}

function verifRestaurarRecifes(guardados) {
    recifes.length = 0;
    guardados.forEach(function (recife) { recifes.push(recife); });
}

/* A lista que o jogo monta (`candidatosDoComboio`) contra a escrita aqui: mesma ordem, mesma origem, rumo e recuo. */
function verifListaDeCandidatosDoJogo(poses) {
    if (typeof candidatosDoComboio !== "function") { return ["o jogo não tem candidatosDoComboio()"]; }
    const defeitos = [];
    poses.forEach(function (pose) {
        Object.assign(barcaNoMundo, { x: pose.x, z: pose.z, proa: pose.proa });
        const doJogo = candidatosDoComboio();
        const esperados = verifCandidatosDaPose(pose, 1);
        if (doJogo.length !== VERIF_QUANTOS_CANDIDATOS) { defeitos.push("a lista tem " + doJogo.length + " candidatos, esperado " + VERIF_QUANTOS_CANDIDATOS); return; }
        for (let indice = 0; indice < doJogo.length; indice++) {
            const jogo = doJogo[indice], esperado = esperados[indice];
            const diferencaDeRumo = Math.abs(Math.atan2(Math.sin(jogo.rumo - esperado.rumo), Math.cos(jogo.rumo - esperado.rumo)));
            if (Math.hypot(jogo.origem.x - esperado.origem.x, jogo.origem.z - esperado.origem.z) > 1e-6 || diferencaDeRumo > 1e-6 || Math.abs(jogo.recuo - esperado.recuo) > 1e-9) {
                defeitos.push("pose (" + pose.x + ", " + pose.z + "), candidato " + indice + ": origem (" + jogo.origem.x.toFixed(2) + ", " + jogo.origem.z.toFixed(2) + "), rumo " + jogo.rumo.toFixed(3) + ", recuo " + jogo.recuo +
                    "; esperado (" + esperado.origem.x.toFixed(2) + ", " + esperado.origem.z.toFixed(2) + "), " + esperado.rumo.toFixed(3) + ", " + esperado.recuo);
                break;
            }
        }
    });
    return defeitos;
}

/*
  Sorteia as pedras (em `recifes`) e a pose de um mundo: 0 a 29 esparsos; 30 a 44 quase fechados; 45 a 59 com a barca perto da PARTIDA e um cerco de
  pedras em volta dela que deixa livre a fila da PARTIDA (é o que faz a PARTIDA ser o último recurso aprovado).
*/
function verifSortearMundo(sorteio) {
    recifes.length = 0;
    const perto = sorteio >= 45;
    const pose = perto ? { x: PARTIDA.x + Math.random() * 40 - 20, z: PARTIDA.z + Math.random() * 40 - 20, proa: Math.random() * 2 * Math.PI - Math.PI } :
        { x: Math.random() * 156 - 78, z: Math.random() * 156 - 78, proa: Math.random() * 2 * Math.PI - Math.PI };
    const pedras = sorteio < 30 ? Math.floor(Math.random() * 60) : perto ? 90 + Math.floor(Math.random() * 60) : 70 + Math.floor(Math.random() * 120);
    for (let i = 0; i < pedras; i++) {
        const pedra = perto ? { x: pose.x + Math.random() * 80 - 40, z: pose.z + Math.random() * 80 - 40, raio: 2 + Math.random() * 3.5 } :
            { x: Math.random() * 156 - 78, z: Math.random() * 156 - 78, raio: 1.5 + Math.random() * (sorteio < 30 ? 2.5 : 4) };
        const noCaminhoDaPartida = Math.abs(pedra.x - PARTIDA.x) < pedra.raio + 3.5 && pedra.z > PARTIDA.z + 4 - pedra.raio && pedra.z < PARTIDA.z + 7 * 4 + 4 + pedra.raio;
        if (!(perto && noCaminhoDaPartida)) { recifes.push(Object.assign(pedra, { alta: false, brasa: 0, iluminado: false })); }
    }
    return pose;
}

/*
  Roda os grupos de afirmações do nascimento do comboio. `passarUmQuadro` (só 05 e 06, onde o jogo recria o comboio dentro do quadro) é opcional.
  No fim o mundo fica sem fila: a página recomeça o que precisar.
*/
function verifNascimentoDoComboio(passarUmQuadro) {
    const noitesDoJogo = typeof fichas === "undefined" ? 1 : fichas.length;
    const partida = { x: PARTIDA.x, z: PARTIDA.z, proa: PARTIDA.proa };
    const defeitosDaPartida = [];

    for (let indice = 0; indice < noitesDoJogo; indice++) {
        if (typeof comecarNoite === "function") { comecarNoite(indice); }
        const quantos = verifQuantosBarcosNascem();
        if (filaLivre(PARTIDA, PARTIDA.proa, 0) !== true) { defeitosDaPartida.push("noite " + (indice + 1) + ": filaLivre(PARTIDA) não é true"); }
        const esperado = verifOndeOComboioDeveNascer(partida, quantos, recifes.concat([ilha]));
        const diferenca = verifDiferencaDoComboio(verifNascerEm(partida), esperado);
        if (esperado.candidato !== 0) { defeitosDaPartida.push("noite " + (indice + 1) + ": a PARTIDA não é livre no 1º candidato (oráculo " + esperado.candidato + ")"); }
        if (diferenca !== "") { defeitosDaPartida.push("noite " + (indice + 1) + ": " + diferenca); }
    }
    conferir("a PARTIDA é livre em todas as " + noitesDoJogo + " noite(s): filaLivre(PARTIDA) é true e o comboio nasce nela, logo no 1º candidato",
        defeitosDaPartida.length === 0, defeitosDaPartida.join("; "));

    if (typeof comecarNoite === "function") { comecarNoite(0); }
    const guardados = recifes.splice(0);
    const quantos = verifQuantosBarcosNascem();
    const pose = verifPoseComMaisCandidatosAprovados(quantos, function (partidaDaPose, poseDaGrade) { return verifCandidatoAprovado(partidaDaPose, poseDaGrade, [ilha]); });
    const poseLonge = verifPoseComMaisCandidatosAprovados(quantos, function (partidaDaPose, poseDaGrade) {
        return Math.hypot(partidaDaPose.lugares[0].x - poseDaGrade.x, partidaDaPose.lugares[0].z - poseDaGrade.z) >= 45;
    });
    try {
        const poses = [pose, partida, { x: -40, z: 30, proa: 2 }, { x: 55, z: -50, proa: -1.3 }, { x: 0, z: 0, proa: 0 }];
        const defeitosDaLista = verifListaDeCandidatosDoJogo(poses);
        conferir("candidatosDoComboio(): 73 candidatos na ordem do GDD (48 giros × recuos 0, 7, 14 e 21 m; 24 do anel a 10 e 20 m, fila de través; a PARTIDA por último) em " + poses.length + " poses",
            defeitosDaLista.length === 0, defeitosDaLista.slice(0, 2).join("; "));

        const defeitosDaOrdem = [];
        const alcancados = { giros: 0, anel: 0, partida: 0 };
        for (let alvo = 0; alvo < VERIF_QUANTOS_CANDIDATOS; alvo++) {
            verifPedraEmTodosOsCandidatos(pose, quantos, alvo, 0.1);
            const esperado = verifOndeOComboioDeveNascer(pose, quantos, recifes.concat([ilha]));
            const diferenca = verifDiferencaDoComboio(verifNascerEm(pose), esperado);
            if (esperado.candidato === alvo) { alcancados[alvo < 48 ? "giros" : alvo < VERIF_INDICE_DA_PARTIDA ? "anel" : "partida"]++; }
            if (diferenca !== "") { defeitosDaOrdem.push("candidato " + alvo + ": " + diferenca); }
        }
        conferir("a ordem dos 73 candidatos: bloqueados os N primeiros, o comboio nasce no N+1º (giros, depois anel, depois PARTIDA; pose " + pose.x + ", " + pose.z + "); alcançados " +
            alcancados.giros + " dos giros, " + alcancados.anel + " do anel, " + alcancados.partida + " da PARTIDA",
            defeitosDaOrdem.length === 0 && alcancados.giros >= 40 && alcancados.anel >= 10 && alcancados.partida === 1, defeitosDaOrdem.slice(0, 3).join("; "));

        // cercada em tudo menos na PARTIDA, que está a menos de 35 m: ela é o último recurso
        verifPedraEmTodosOsCandidatos(pose, quantos, VERIF_INDICE_DA_PARTIDA, 3);
        const esperadoCercado = verifOndeOComboioDeveNascer(pose, quantos, recifes.concat([ilha]));
        const nascidosCercado = verifNascerEm(pose);
        conferir("cercado por pedras nos 72 primeiros candidatos (giros e anel) com a PARTIDA a menos de 35 m: o comboio inteiro nasce na PARTIDA, de proa da PARTIDA",
            esperadoCercado.candidato === VERIF_INDICE_DA_PARTIDA && verifDiferencaDoComboio(nascidosCercado, esperadoCercado) === "" && nascidosCercado.length === quantos &&
            nascidosCercado.every(function (barco, i) { return Math.abs(barco.x - (PARTIDA.x + Math.sin(PARTIDA.proa) * 7 * (i + 1))) < 1e-6 && Math.abs(barco.z - (PARTIDA.z + Math.cos(PARTIDA.proa) * 7 * (i + 1))) < 1e-6; }),
            "nasceram em " + nascidosCercado.map(function (barco) { return "(" + barco.x.toFixed(1) + ", " + barco.z.toFixed(1) + ")"; }).join(" "));

        // cercada e longe da PARTIDA: nenhum comboio perdido; abre espaço e ele chega
        const primeiroDaPartida = verifCandidatosDaPose(poseLonge, quantos)[VERIF_INDICE_DA_PARTIDA].lugares[0];
        const distanciaDoPrimeiro = Math.hypot(primeiroDaPartida.x - poseLonge.x, primeiroDaPartida.z - poseLonge.z);
        verifPedraEmTodosOsCandidatos(poseLonge, quantos, VERIF_INDICE_DA_PARTIDA, 3);
        const esperadoLonge = verifOndeOComboioDeveNascer(poseLonge, quantos, recifes.concat([ilha]));
        const nascidosLonge = verifNascerEm(poseLonge);
        conferir("cercado e longe da PARTIDA (o 1º barco dela a " + distanciaDoPrimeiro.toFixed(0) + " m da barca, em " + poseLonge.x + ", " + poseLonge.z + "): não nasce NADA, nunca um comboio que a névoa engoliria",
            distanciaDoPrimeiro >= 35 && filaLivre(PARTIDA, PARTIDA.proa, 0) === true && esperadoLonge.candidato === -1 && nascidosLonge.length === 0, "nasceram " + nascidosLonge.length + " barcos");
        if (typeof passarUmQuadro === "function") {
            passarUmQuadro();
            conferir("e o quadro seguinte, ainda cercado, também não cria comboio nenhum", barcosDePesca.length === 0);
        }
        recifes.length = 0;
        const nascidosComEspaco = typeof passarUmQuadro === "function" ? (passarUmQuadro(), barcosDePesca.slice()) : verifNascerEm(poseLonge);
        const esperadoComEspaco = verifOndeOComboioDeveNascer(poseLonge, quantos, [ilha]);
        conferir("abrindo espaço (as pedras somem) o comboio nasce no 1º candidato aprovado" + (typeof passarUmQuadro === "function" ? ", no próximo quadro do jogo" : ""),
            nascidosComEspaco.length === quantos && verifDiferencaDoComboio(nascidosComEspaco, esperadoComEspaco) === "", "nasceram " + nascidosComEspaco.length + " barcos");

        semearSorteio(20261027);
        const defeitosAleatorios = [];
        let mundos = 0, naPartida = 0, semLugar = 0, noAnel = 0;
        for (let indice = 0; indice < noitesDoJogo; indice++) {
            if (typeof comecarNoite === "function") { comecarNoite(indice); }
            for (let sorteio = 0; sorteio < 60; sorteio++) {
                const poseSorteada = verifSortearMundo(sorteio);
                const esperado = verifOndeOComboioDeveNascer(poseSorteada, verifQuantosBarcosNascem(), recifes.concat([ilha]));
                const diferenca = verifDiferencaDoComboio(verifNascerEm(poseSorteada), esperado);
                mundos++;
                naPartida += esperado.candidato === VERIF_INDICE_DA_PARTIDA ? 1 : 0;
                noAnel += esperado.candidato >= 48 && esperado.candidato < VERIF_INDICE_DA_PARTIDA ? 1 : 0;
                semLugar += esperado.candidato === -1 ? 1 : 0;
                if (diferenca !== "") { defeitosAleatorios.push("noite " + (indice + 1) + ", mundo " + sorteio + ": " + diferenca); }
            }
        }
        conferir("o oráculo independente concorda com o jogo em " + mundos + " mundos sorteados (pedras, pose e rumo; " + noAnel + " no anel, " + naPartida + " na PARTIDA, " + semLugar + " sem lugar e sem comboio)",
            defeitosAleatorios.length === 0, defeitosAleatorios.slice(0, 3).join("; "));
    } finally {
        verifRestaurarRecifes(guardados);
    }
}


// ============================================================
// 2. A ILHA VEM DOS DADOS (05 e 06)
// ============================================================
function verifIlhaVemDosDados() {
    const original = { x: ilha.x, z: ilha.z };
    const oclusoresAntes = typeof oclusores === "undefined" ? 0 : oclusores.length;   // o passo 6 acrescenta chão e torre a cada criação
    const defeitos = [];
    try {
        [{ x: 50, z: 50 }, { x: -50, z: 45 }, { x: 40, z: -55 }].forEach(function (destino) {
            ilha.x = destino.x;
            ilha.z = destino.z;
            const desenhada = criarIlhaComFarol();
            if (desenhada.position.x !== destino.x || desenhada.position.z !== destino.z) {
                defeitos.push("a ilha desenhada ficou em (" + desenhada.position.x + ", " + desenhada.position.z + "), não em (" + destino.x + ", " + destino.z + ")");
            }
            if (recifeTocadoPor({ x: desenhada.position.x + 6.5, z: desenhada.position.z }) !== ilha) { defeitos.push("o colisor não está sob a ilha desenhada em (" + destino.x + ", " + destino.z + ")"); }
            if (recifeTocadoPor({ x: desenhada.position.x + 6.9, z: desenhada.position.z }) !== null) { defeitos.push("o colisor passa do raio 5,5 + 1,2 m em (" + destino.x + ", " + destino.z + ")"); }
            if (recifeTocadoPor({ x: original.x, z: original.z }) === ilha) { defeitos.push("o colisor ficou no lugar antigo (" + original.x + ", " + original.z + ")"); }
        });
    } finally {
        ilha.x = original.x;
        ilha.z = original.z;
        if (typeof oclusores !== "undefined") { oclusores.length = oclusoresAntes; }
    }
    conferir("a ilha vem dos dados: mover `ilha` em regras.js move a ilha DESENHADA e o colisor juntos (3 posições)", defeitos.length === 0, defeitos.join("; "));
}


// ============================================================
// 3. TRAVA DE CLARÕES (WCAG 2.3.1): 3 por segundo no máximo; reduzido, um por rampa de 1,2 s
// ============================================================
/*
  Uma noite longa (600 s) com a ficha a `relampagosPorMinuto`, andada só pelas regras com `passo` segundos por quadro. Em cada quadro:
  um clarão novo só começa com o anterior terminado, a ≥ intervalo do começo do anterior e nunca antes da hora marcada; um clarão
  em andamento nunca recomeça. Devolve os instantes (noite.segundos) em que cada clarão começou.
*/
function verifSimularClaroes(relampagosPorMinuto, reduzido, passo) {
    const reduzidoAntes = reduzirClaroes;
    const duracao = reduzido ? 1.2 : 0.25;
    const intervaloMinimo = reduzido ? 1.2 : 0.4;
    const brilhoMaximo = reduzido ? 0.25 : 1;
    const violacoes = {};
    const inicios = [];
    function registrar(categoria, detalhe) {
        if (!(categoria in violacoes)) { violacoes[categoria] = detalhe; }
    }
    fichas.push(Object.assign({}, fichas[0], { nome: "Teste de clarões", duracao: 600, relampagosPorMinuto: relampagosPorMinuto, barcos: 2, meta: 99 }));
    reduzirClaroes = reduzido;
    let horas = [];
    try {
        comecarNoite(fichas.length - 1);
        barcaNoMundo.segundosEncalhada = 1e9;
        horas = noite.relampagos.slice();
        while (noite.segundos < 589 && noite.resultado === "") {
            const andamentoAntes = noite.segundosDoRelampago;
            const contadorAntes = noite.proximoRelampago;
            atualizarMundo(passo, 0, false);
            const novos = noite.proximoRelampago - contadorAntes;
            if (novos > 1) { registrar("no máximo um clarão novo por quadro", novos + " no quadro de " + noite.segundos.toFixed(3) + " s"); }
            if (novos >= 1) {
                const anteriorTerminou = andamentoAntes < 0 || andamentoAntes + passo >= duracao;
                if (!anteriorTerminou) { registrar("um clarão novo só começa com o anterior terminado", "começou em " + noite.segundos.toFixed(3) + " s com o anterior em " + andamentoAntes.toFixed(3) + " s de " + duracao); }
                if (inicios.length > 0 && noite.segundos - inicios[inicios.length - 1] < intervaloMinimo - 1e-9) {
                    registrar("um clarão novo só começa a ≥ " + intervaloMinimo.toFixed(3) + " s do começo do anterior", "intervalo " + (noite.segundos - inicios[inicios.length - 1]).toFixed(4) + " s em " + noite.segundos.toFixed(3) + " s");
                }
                if (noite.segundos < horas[inicios.length] - 1e-9) { registrar("nunca antes da hora marcada", "clarão " + inicios.length + " em " + noite.segundos.toFixed(3) + " s, marcado para " + horas[inicios.length]); }
                if (noite.segundosDoRelampago !== 0) { registrar("o clarão novo nasce em 0 s", "segundosDoRelampago " + noite.segundosDoRelampago); }
                inicios.push(noite.segundos);
            } else if (andamentoAntes >= 0 && noite.segundosDoRelampago >= 0 && Math.abs(noite.segundosDoRelampago - (andamentoAntes + passo)) > 1e-9) {
                registrar("um clarão em andamento nunca recomeça (uma rampa por clarão)", "foi de " + andamentoAntes.toFixed(3) + " para " + noite.segundosDoRelampago.toFixed(3) + " s em " + noite.segundos.toFixed(3) + " s");
            }
            const brilho = brilhoDoRelampago();
            if (!(brilho >= 0 && brilho <= brilhoMaximo + 1e-9)) { registrar("o brilho fica entre 0 e " + brilhoMaximo, "brilho " + brilho); }
        }
    } finally {
        fichas.pop();
        reduzirClaroes = reduzidoAntes;
    }
    return { inicios: inicios, horas: horas, violacoes: violacoes, passo: passo };
}

/* O maior número de inícios numa janela de 1 s que começa num início: semiaberta [t, t+1) ou fechada [t, t+1]. */
function verifMaximoDeIniciosPorSegundo(inicios, fechada) {
    let maximo = 0;
    for (let i = 0; i < inicios.length; i++) {
        let contagem = 0;
        for (let k = i; k < inicios.length && (fechada ? inicios[k] <= inicios[i] + 1 + 1e-9 : inicios[k] < inicios[i] + 1 - 1e-9); k++) {
            contagem++;
        }
        maximo = Math.max(maximo, contagem);
    }
    return maximo;
}

function verifTravaDeClaroes() {
    const passos = [1 / 60, 0.05, 1 / 12];
    let maiorJanelaFechadaNormal = 0;
    [false, true].forEach(function (reduzido) {
        [8, 60, 200, 100000].forEach(function (taxa) {
            const rotulo = (reduzido ? "reduzido" : "normal") + ", " + taxa + " clarões/min";
            const corridas = passos.map(function (passo) { return verifSimularClaroes(taxa, reduzido, passo); });
            const intervaloMinimo = reduzido ? 1.2 : 0.4;
            const defeitos = [];
            corridas.forEach(function (corrida) {
                Object.keys(corrida.violacoes).forEach(function (categoria) { defeitos.push("passo " + corrida.passo.toFixed(4) + ": " + categoria + " (" + corrida.violacoes[categoria] + ")"); });
            });
            conferir(rotulo + ": clarão novo só com o anterior terminado, a ≥ " + intervaloMinimo.toFixed(2) + " s do começo do anterior, nunca antes da hora e rampa nunca recomeçada (3 durações de quadro)",
                defeitos.length === 0, defeitos.slice(0, 2).join("; "));

            const maximoSemiaberto = Math.max.apply(null, corridas.map(function (corrida) { return verifMaximoDeIniciosPorSegundo(corrida.inicios, false); }));
            const maximoFechado = Math.max.apply(null, corridas.map(function (corrida) { return verifMaximoDeIniciosPorSegundo(corrida.inicios, true); }));
            if (!reduzido) { maiorJanelaFechadaNormal = Math.max(maiorJanelaFechadaNormal, maximoFechado); }
            const limite = reduzido ? 1 : 3;
            conferir(rotulo + ": no máximo " + limite + " início(s) em QUALQUER janela FECHADA de 1 s, deslizante (observado " + maximoFechado + "; semiaberta: " + maximoSemiaberto + ")",
                maximoFechado <= limite && maximoSemiaberto <= maximoFechado, "janela fechada " + maximoFechado + ", semiaberta " + maximoSemiaberto);

            const demandaPorSegundo = taxa / 60;
            const saturada = demandaPorSegundo > 1 / intervaloMinimo;
            if (saturada) {
                const piores = corridas.map(function (corrida) { return corrida.inicios.length / Math.floor(585 / intervaloMinimo); });
                conferir(rotulo + ": a trava limita mas o céu continua piscando (início em ≥ 70% da cadência máxima: " + piores.map(function (p) { return (100 * p).toFixed(0) + "%"; }).join(", ") + ")",
                    piores.every(function (parte) { return parte >= 0.7; }));
            } else {
                const atrasos = corridas.map(function (corrida) {
                    return corrida.inicios.length === corrida.horas.length ? Math.max.apply(null, corrida.inicios.map(function (inicio, i) { return inicio - corrida.horas[i]; })) : Infinity;
                });
                conferir(rotulo + ": abaixo do limite nenhum clarão se perde nem atrasa mais que um quadro (" + corridas[0].inicios.length + " de " + corridas[0].horas.length + ")",
                    corridas.every(function (corrida, i) { return atrasos[i] <= corrida.passo + 1e-9; }));
            }
        });
    });
    conferirIgual("nos modos normais saturados a trava aperta até o limite sem passar: o maior número de clarões numa janela FECHADA de 1 s", maiorJanelaFechadaNormal, 3);
}

/*
  O MODO VALE PARA O CLARÃO INTEIRO: `noite.relampagoReduzido` guarda a opção no começo de cada clarão. Com a opção trocada de várias maneiras (a cada
  quadro, a cada 3, sempre contra o clarão em andamento, sorteada) numa noite a 100.000 clarões/min, em quadros de 1/60 s, confere por quadro:
  o modo gravado é o da opção NO QUADRO em que o clarão começou e não muda até o fim; o clarão reduzido nunca passa de 25% nem salta mais que ~0,011
  por quadro; o normal só vale 0 ou 1; um salto de 0 a 1 só acontece no 1º quadro de um clarão normal; e cada clarão dura o que o seu modo manda.
*/
function verifModoTravadoPorClarao() {
    const passo = 1 / 60;
    const reduzidoAntes = reduzirClaroes;
    const estrategias = [
        ["alterna a cada quadro", function (quadro) { return quadro % 2 === 0; }],
        ["alterna a cada 3 quadros", function (quadro) { return Math.floor(quadro / 3) % 2 === 0; }],
        ["sempre contra o clarão em andamento", function () { return !noite.relampagoReduzido; }],
        ["sorteada a cada quadro", function () { return Math.random() < 0.5; }]
    ];
    fichas.push(Object.assign({}, fichas[0], { nome: "Teste do modo por clarão", duracao: 600, relampagosPorMinuto: 100000, barcos: 2, meta: 99 }));
    const placar = { normais: 0, reduzidos: 0, saltosDeZeroAUm: 0 };
    const defeitos = [];
    function registrar(estrategia, texto) {
        if (defeitos.length < 3) { defeitos.push(estrategia + ": " + texto); }
    }
    try {
        semearSorteio(20261028);
        estrategias.forEach(function (estrategia) {
            comecarNoite(fichas.length - 1);
            barcaNoMundo.segundosEncalhada = 1e9;
            let quadro = 0, modoDoClarao = null, quadrosDoClarao = 0;
            while (noite.segundos < 60 && noite.resultado === "") {
                reduzirClaroes = estrategia[1](quadro++);
                const opcaoNesteQuadro = reduzirClaroes;
                const contadorAntes = noite.proximoRelampago, brilhoAntes = brilhoDoRelampago(), andamentoAntes = noite.segundosDoRelampago;
                atualizarMundo(passo, 0, false);
                const brilho = brilhoDoRelampago();
                const comecou = noite.proximoRelampago > contadorAntes;
                const nome = estrategia[0];
                if (andamentoAntes >= 0 && modoDoClarao !== null) {   // havia um clarão no ar no começo do quadro: continua ou acaba
                    const duracao = modoDoClarao ? 1.2 : 0.25;
                    if (!comecou && noite.segundosDoRelampago >= 0) {
                        quadrosDoClarao++;
                        if (noite.relampagoReduzido !== modoDoClarao) { registrar(nome, "o modo do clarão mudou no meio dele, em " + noite.segundos.toFixed(3) + " s"); }
                        if (Math.abs(brilho - brilhoAntes) > (modoDoClarao ? 0.011 : 1) + 1e-9) { registrar(nome, "salto de " + brilhoAntes.toFixed(4) + " a " + brilho.toFixed(4) + " no meio do clarão " + (modoDoClarao ? "reduzido" : "normal")); }
                        if (modoDoClarao && brilho > 0.25 + 1e-9) { registrar(nome, "clarão reduzido a " + brilho.toFixed(3) + " (mais de 25%)"); }
                        if (!modoDoClarao && brilho !== 0 && brilho !== 1) { registrar(nome, "clarão normal com brilho " + brilho); }
                    } else {
                        if (andamentoAntes + passo < duracao - 1e-9) { registrar(nome, "um clarão " + (modoDoClarao ? "reduzido" : "normal") + " acabou aos " + (andamentoAntes + passo).toFixed(3) + " s, antes de " + duracao + " s"); }
                        if (Math.abs(quadrosDoClarao + 1 - duracao / passo) > 2) { registrar(nome, "um clarão " + (modoDoClarao ? "reduzido" : "normal") + " durou " + (quadrosDoClarao + 1) + " quadros, esperado cerca de " + Math.round(duracao / passo)); }
                        if (modoDoClarao && brilhoAntes > 0.011) { registrar(nome, "um clarão reduzido caiu de " + brilhoAntes.toFixed(3) + " a 0 de uma vez"); }
                        modoDoClarao = null;
                    }
                }
                if (comecou) {
                    modoDoClarao = noite.relampagoReduzido;
                    quadrosDoClarao = 1;
                    placar[modoDoClarao ? "reduzidos" : "normais"]++;
                    if (modoDoClarao !== opcaoNesteQuadro) { registrar(nome, "o clarão que começou com a opção " + opcaoNesteQuadro + " gravou " + modoDoClarao + " em " + noite.segundos.toFixed(3) + " s"); }
                    if (brilho - brilhoAntes > 0.5) {
                        placar.saltosDeZeroAUm++;
                        if (modoDoClarao) { registrar(nome, "um clarão REDUZIDO saltou de " + brilhoAntes.toFixed(3) + " a " + brilho.toFixed(3) + " ao começar"); }
                    }
                }
            }
        });
    } finally {
        fichas.pop();
        reduzirClaroes = reduzidoAntes;
    }
    conferir("o modo vale para o clarão inteiro: com a opção trocada a cada quadro, a cada 3, contra o clarão em andamento e sorteada, `relampagoReduzido` é a opção do quadro em que o clarão começou e não muda; reduzido nunca passa de 25% nem salta mais de ~0,011 por quadro; normal só vale 0 ou 1; cada clarão dura o que o seu modo manda",
        defeitos.length === 0, defeitos.join("; "));
    conferir("e o teste exercita os dois modos: " + placar.normais + " clarões normais, " + placar.reduzidos + " reduzidos, " + placar.saltosDeZeroAUm + " saltos de 0 a 1 (todos no 1º quadro de um clarão normal)",
        placar.normais > 50 && placar.reduzidos > 100 && placar.saltosDeZeroAUm <= placar.normais);
}


// ============================================================
// 4. A CÂMERA: o ponto esperado e o enquadramento ao longo do tempo
// ============================================================
/* O ponto da câmera pela fórmula do GDD: âncora no meio entre 14 m à frente e o 3º barco; escala ≥ 1 até ×3 conforme o que não cabe. */
function verifPontoEsperadoDaCamera() {
    const proa = barcaNoMundo.proa;
    const frente = { x: barcaNoMundo.x - Math.sin(proa) * 14, z: barcaNoMundo.z - Math.cos(proa) * 14 };
    const primeirosTres = barcosDePesca.slice(0, 3);
    const terceiro = primeirosTres.length > 0 ? primeirosTres[primeirosTres.length - 1] : barcaNoMundo;
    const meio = { x: (frente.x + terceiro.x) / 2, z: (frente.z + terceiro.z) / 2 };
    let escala = 1;
    primeirosTres.concat([barcaNoMundo, frente]).forEach(function (ponto) {
        const dx = ponto.x - meio.x, dz = ponto.z - meio.z;
        const atras = dx * Math.sin(proa) + dz * Math.cos(proa);
        const lado = Math.abs(dx * Math.cos(proa) - dz * Math.sin(proa));
        escala = Math.max(escala, atras / 15, lado / (20 * camera.aspect) + Math.max(atras, 0) / 37);
    });
    escala = Math.min(escala, 3);
    return { meio: meio, escala: escala, ponto: new THREE.Vector3(meio.x + Math.sin(proa) * 22 * escala, 18 * escala, meio.z + Math.cos(proa) * 22 * escala) };
}

/* seguirComACamera(1) põe a câmera exatamente no ponto da fórmula, olhando para o meio, em várias proas, proporções e filas (inclusive esticadas). */
function verifCameraNoPontoDaFormula() {
    const frotaAntes = barcosDePesca.splice(0);
    const poseAntes = { x: barcaNoMundo.x, z: barcaNoMundo.z, proa: barcaNoMundo.proa };
    const proporcaoAntes = camera.aspect;
    const defeitos = [];
    let esticadas = 0, limitadas = 0, centradas = 0, cenarios = 0, alturaLarga = 0, alturaEmPe = 0;
    try {
        semearSorteio(1027);
        [[1280 / 800, "larga"], [390 / 750, "em pé"], [2, "do palco"]].forEach(function (proporcao) {
            camera.aspect = proporcao[0];
            camera.updateProjectionMatrix();
            for (let sorteio = 0; sorteio < 60; sorteio++) {
                barcaNoMundo.x = Math.random() * 100 - 50;
                barcaNoMundo.z = Math.random() * 100 - 50;
                barcaNoMundo.proa = Math.random() * 2 * Math.PI - Math.PI;
                barcosDePesca.length = 0;
                const afastamento = sorteio < 20 ? 7 : sorteio < 40 ? 15 + Math.random() * 10 : 30 + Math.random() * 40;   // fila compacta, esticada, muito esticada
                for (let i = 1; i <= 5; i++) {
                    const curva = (Math.random() - 0.5) * 0.5 * i;
                    barcosDePesca.push({ x: barcaNoMundo.x + Math.sin(barcaNoMundo.proa + curva) * afastamento * i, z: barcaNoMundo.z + Math.cos(barcaNoMundo.proa + curva) * afastamento * i });
                }
                const esperado = verifPontoEsperadoDaCamera();
                seguirComACamera(1);
                camera.updateMatrixWorld(true);
                const alvo = new THREE.Vector3(esperado.meio.x, 0, esperado.meio.z).project(camera);
                cenarios++;
                esticadas += esperado.escala > 1.05 ? 1 : 0;
                limitadas += esperado.escala === 3 ? 1 : 0;
                centradas += Math.abs(alvo.x) < 1e-3 && Math.abs(alvo.y) < 1e-3 ? 1 : 0;
                if (camera.position.distanceTo(esperado.ponto) > 1e-6) {
                    defeitos.push("tela " + proporcao[1] + ", cenário " + sorteio + ": câmera a " + camera.position.distanceTo(esperado.ponto).toFixed(3) + " m do ponto da fórmula (escala " + esperado.escala.toFixed(2) + ")");
                }
                if (Math.abs(alvo.x) > 1e-3 || Math.abs(alvo.y) > 1e-3) { defeitos.push("tela " + proporcao[1] + ", cenário " + sorteio + ": o meio não está no centro da tela [" + alvo.x.toFixed(3) + ", " + alvo.y.toFixed(3) + "]"); }
            }
        });
        // a mesma fila esticada (3 barcos em diagonal, 10 m para trás e 10 m de lado a cada um) em duas telas: a estreita sobe mais
        barcaNoMundo.x = 0;
        barcaNoMundo.z = 30;
        barcaNoMundo.proa = 0;
        barcosDePesca.length = 0;
        for (let i = 1; i <= 3; i++) { barcosDePesca.push({ x: 10 * i, z: 30 + 10 * i }); }
        [1280 / 800, 390 / 750].forEach(function (aspecto, indice) {
            camera.aspect = aspecto;
            camera.updateProjectionMatrix();
            seguirComACamera(1);
            if (indice === 0) { alturaLarga = camera.position.y; } else { alturaEmPe = camera.position.y; }
        });
    } finally {
        barcosDePesca.length = 0;
        frotaAntes.forEach(function (barco) { barcosDePesca.push(barco); });
        Object.assign(barcaNoMundo, poseAntes);
        camera.aspect = proporcaoAntes;
        camera.updateProjectionMatrix();
    }
    conferir("a câmera fica no ponto da fórmula (âncora no meio entre 14 m à frente e o 3º barco, escala ×1 a ×3) e olha para o meio, em " + cenarios + " cenários de 3 proporções",
        defeitos.length === 0, defeitos.slice(0, 3).join("; "));
    conferir("os cenários exercitam o que importa: " + esticadas + " com a escala acima de 1, " + limitadas + " no teto ×3, " + centradas + " com o meio no centro da tela",
        esticadas > 40 && limitadas > 10 && centradas === cenarios);
    conferir("a mesma fila esticada pede mais altura na tela em pé (390×750) que na larga (1280×800): câmera a " + alturaEmPe.toFixed(1) + " m contra " + alturaLarga.toFixed(1) + " m",
        alturaEmPe > alturaLarga + 0.5 && alturaLarga >= 18 - 1e-9);
}

/*
  Pilota a barca, semeado, em retas e curvas de volta (U) e de 90°, dentro de uma caixa livre de pedras, ilha e porto, e a cada quadro
  projeta na câmera: a barca, o ponto a 14 m à frente e os 3 primeiros barcos. Devolve as contagens
  de quadros em que cada ponto saiu do quadro (|NDC| > 0,97 ou atrás da câmera).
*/
function verifPilotarMedindoOEnquadramento(passar, quadros, milissegundosPorQuadro) {
    const limite = 0.97;
    const projetado = new THREE.Vector3();
    const medidas = { quadros: 0, algum: 0, barca: 0, frente: 0, primeiro: 0, segundo: 0, terceiro: 0, piorNDC: 0, maiorDistanciaDoTerceiro: 0, retas: 0, voltas: 0, curvas: 0 };
    let teclaApertada = null, quadrosDoTrecho = 0;

    function mudarTecla(nova) {
        if (teclaApertada !== null) { window.dispatchEvent(new KeyboardEvent("keyup", { key: teclaApertada })); }
        teclaApertada = nova;
        if (teclaApertada !== null) { window.dispatchEvent(new KeyboardEvent("keydown", { key: teclaApertada })); }
    }

    /* Quantos metros, na proa de agora, até a caixa livre acabar (x entre −60 e 60, z entre 10 e 68). */
    function metrosAteASaida() {
        const proa = barcaNoMundo.proa;
        let metros = 0;
        while (metros < 150) {
            const x = barcaNoMundo.x - Math.sin(proa) * metros, z = barcaNoMundo.z - Math.cos(proa) * metros;
            if (Math.abs(x) > 60 || z < 10 || z > 68) { break; }
            metros += 4;
        }
        return metros;
    }

    function novoTrecho() {
        const lado = Math.random() < 0.5 ? "a" : "d";
        const sorteio = Math.random();
        const segundosDeReta = 2 + Math.random() * 18;   // as retas longas esticam a fila (o 1º barco é 5% mais lento)
        const segundosAteASaida = (metrosAteASaida() - 8) / 5;
        const giroMaximo = 1.4;   // rad/s: segurar a curva θ / 1,4 s gira θ (a rampa de subida e a de descida se compensam)
        if (segundosAteASaida < 2 || sorteio < 0.2) {
            mudarTecla(lado);
            quadrosDoTrecho = Math.round(Math.PI / giroMaximo * 1000 / milissegundosPorQuadro);
            medidas.voltas++;
        } else if (sorteio < 0.35) {
            mudarTecla(lado);
            quadrosDoTrecho = Math.round(Math.PI / 2 / giroMaximo * 1000 / milissegundosPorQuadro);
            medidas.curvas++;
        } else {
            mudarTecla(null);
            quadrosDoTrecho = Math.round(Math.min(segundosDeReta, segundosAteASaida) * 1000 / milissegundosPorQuadro);
            medidas.retas++;
        }
    }

    function medirQuadro() {
        camera.updateMatrixWorld(true);
        const proa = barcaNoMundo.proa;
        const pontos = [["barca", barcaNoMundo], ["frente", { x: barcaNoMundo.x - Math.sin(proa) * 14, z: barcaNoMundo.z - Math.cos(proa) * 14 }]];
        barcosDePesca.slice(0, 3).forEach(function (barco, i) { pontos.push([["primeiro", "segundo", "terceiro"][i], barco]); });
        let saiuAlgum = false;
        pontos.forEach(function (item) {
            projetado.set(item[1].x, 0, item[1].z).project(camera);
            medidas.piorNDC = Math.max(medidas.piorNDC, Math.abs(projetado.x), Math.abs(projetado.y));
            if (!(Math.abs(projetado.x) <= limite && Math.abs(projetado.y) <= limite && projetado.z > -1 && projetado.z < 1)) {
                medidas[item[0]]++;
                saiuAlgum = true;
            }
        });
        medidas.algum += saiuAlgum ? 1 : 0;
        if (barcosDePesca.length >= 3) {
            medidas.maiorDistanciaDoTerceiro = Math.max(medidas.maiorDistanciaDoTerceiro, Math.hypot(barcosDePesca[2].x - barcaNoMundo.x, barcosDePesca[2].z - barcaNoMundo.z));
        }
    }

    try {
        for (let quadro = 0; quadro < quadros; quadro++) {
            if (quadrosDoTrecho <= 0) { novoTrecho(); }
            passar(milissegundosPorQuadro);
            quadrosDoTrecho--;
            medidas.quadros++;
            medirQuadro();
        }
    } finally {
        mudarTecla(null);
    }
    return medidas;
}

function verifTextoDasMedidas(medidas) {
    return medidas.quadros + " quadros (" + medidas.retas + " retas, " + medidas.voltas + " voltas em U, " + medidas.curvas + " curvas de 90°); fora do quadro: barca " + medidas.barca +
        ", 14 m à frente " + medidas.frente + ", 1º barco " + medidas.primeiro + ", 2º " + medidas.segundo + ", 3º " + medidas.terceiro + ", algum " + medidas.algum +
        "; pior |NDC| " + medidas.piorNDC.toFixed(3) + "; 3º barco chegou a " + medidas.maiorDistanciaDoTerceiro.toFixed(0) + " m da barca";
}


// ============================================================
// 5. ESPAÇO DEPOIS DO CLIQUE (07 e 08): só o MOUSE (pointerdown de mouse + click com detail ≥ 1, num botão) tira o foco do botão
// ============================================================
/* Só o click, sem ponteiro antes: teclado (Enter, Espaço) e leitor de tela mandam detail 0; alguns leitores mandam detail ≥ 1. */
function verifClicarSemPonteiro(alvo, detalhe) {
    alvo.dispatchEvent(new MouseEvent("click", { detail: detalhe, bubbles: true }));
}

/* Um aperto de verdade: pointerdown, pointerup e o click que o navegador manda depois (detail 1). `tipo` é "mouse", "touch" ou "pen". */
function verifApertarComPonteiro(alvo, tipo, detalhe = 1) {
    const opcoes = { pointerType: tipo, pointerId: tipo === "mouse" ? 1 : 7, isPrimary: true, button: 0, bubbles: true };
    alvo.dispatchEvent(new PointerEvent("pointerdown", opcoes));
    alvo.dispatchEvent(new PointerEvent("pointerup", opcoes));
    verifClicarSemPonteiro(alvo, detalhe);
}

/* Um Espaço no elemento com o foco, como o navegador entrega (sobe até a janela). */
function verifApertarEspacoNoFoco() {
    const alvo = document.activeElement || document.body;
    const evento = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    alvo.dispatchEvent(evento);
    return evento;
}

function verifEspacoDepoisDoClique() {
    const focoInicial = lanternaDaBarca.foco;
    const outroFoco = focoInicial === "largo" ? "estreito" : "largo";
    const reducaoInicial = reduzirClaroes;
    const botaoEsquerda = document.getElementById("botao-esquerda");

    // mouse (pointerdown de mouse + click com detail 1): o botão larga o foco e o Espaço seguinte é da lanterna
    botaoFoco.focus();
    const tinhaFoco = document.activeElement === botaoFoco;
    verifApertarComPonteiro(botaoFoco, "mouse");
    conferir("clique do mouse (pointerdown de mouse + click) no botão Foco: troca o foco da lanterna e o botão LARGA o foco do teclado",
        tinhaFoco && lanternaDaBarca.foco === outroFoco && document.activeElement !== botaoFoco, "ativo: " + (document.activeElement && document.activeElement.id));
    const espacoDoMouse = verifApertarEspacoNoFoco();
    conferir("o Espaço depois do clique do mouse troca o foco da lanterna (e o navegador não rola a página)", lanternaDaBarca.foco === focoInicial && espacoDoMouse.defaultPrevented === true);

    botaoClarao.focus();
    verifApertarComPonteiro(botaoClarao, "mouse");
    const espacoDepoisDoClarao = verifApertarEspacoNoFoco();
    conferir("clique do mouse em \"Reduzir clarões\": liga a opção, larga o foco e o Espaço seguinte troca o foco da lanterna",
        reduzirClaroes === !reducaoInicial && document.activeElement !== botaoClarao && lanternaDaBarca.foco === outroFoco && espacoDepoisDoClarao.defaultPrevented === true);
    botaoClarao.focus();
    verifApertarComPonteiro(botaoClarao, "mouse");
    verifApertarEspacoNoFoco();
    conferir("e o segundo clique do mouse desliga a opção; o segundo Espaço devolve o foco da lanterna", reduzirClaroes === reducaoInicial && lanternaDaBarca.foco === focoInicial);

    botaoEsquerda.focus();
    verifApertarComPonteiro(botaoEsquerda, "mouse");
    conferir("clique do mouse em ◀ (pointerdown de mouse + click detail 1) larga o foco", document.activeElement !== botaoEsquerda);

    // dedo e caneta (pointerdown de touch/pen + click com detail 1): o foco FICA no botão e a ativação conta uma vez
    ["touch", "pen"].forEach(function (tipo) {
        botaoFoco.focus();
        verifApertarComPonteiro(botaoFoco, tipo);
        const espacoDoBotao = verifApertarEspacoNoFoco();
        conferir("toque (" + tipo + ") no botão Foco: troca o foco da lanterna UMA vez, o botão MANTÉM o foco e o Espaço seguinte é dele (a janela não troca nem cancela)",
            lanternaDaBarca.foco === outroFoco && document.activeElement === botaoFoco && espacoDoBotao.defaultPrevented === false, "ativo: " + (document.activeElement && document.activeElement.id) + ", foco " + lanternaDaBarca.foco);
        verifClicarSemPonteiro(botaoFoco, 0);
        conferir("e o click de teclado seguinte (detail 0) devolve o foco da lanterna e o botão continua com o foco", lanternaDaBarca.foco === focoInicial && document.activeElement === botaoFoco);

        botaoClarao.focus();
        verifApertarComPonteiro(botaoClarao, tipo);
        conferir("toque (" + tipo + ") em \"Reduzir clarões\": liga a opção e o botão mantém o foco", reduzirClaroes === !reducaoInicial && document.activeElement === botaoClarao);
        verifClicarSemPonteiro(botaoClarao, 0);
        conferirIgual("e o click de teclado seguinte desliga a opção (" + tipo + ")", reduzirClaroes, reducaoInicial);

        botaoEsquerda.focus();
        verifApertarComPonteiro(botaoEsquerda, tipo);
        conferir("toque (" + tipo + ") em ◀: o botão mantém o foco", document.activeElement === botaoEsquerda);
        window.dispatchEvent(new Event("blur"));   // solta o giro que o pointerdown segurou, se o pointerup não o soltou
    });

    // teclado e leitor de tela (detail 0): o botão fica com o foco e o Espaço é dele
    botaoFoco.focus();
    const espacoNoBotao = new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true });
    botaoFoco.dispatchEvent(espacoNoBotao);
    conferir("Tab até o botão Foco + Espaço: a janela NÃO troca o foco da lanterna (o Espaço é do botão) e não cancela o Espaço dele",
        lanternaDaBarca.foco === focoInicial && espacoNoBotao.defaultPrevented === false && document.activeElement === botaoFoco);
    verifClicarSemPonteiro(botaoFoco, 0);   // o que o navegador faz ao soltar Espaço ou ao apertar Enter: um click com detail 0
    conferir("a ativação do botão (click com detail 0, de Espaço ou Enter) troca o foco UMA vez e o botão MANTÉM o foco",
        lanternaDaBarca.foco === outroFoco && document.activeElement === botaoFoco && botaoFoco.textContent === "Foco: " + outroFoco);
    verifApertarEspacoNoFoco();
    verifClicarSemPonteiro(botaoFoco, 0);
    conferir("de novo: Espaço no botão não mexe na lanterna e a segunda ativação devolve o foco", lanternaDaBarca.foco === focoInicial && document.activeElement === botaoFoco);

    botaoClarao.focus();
    verifClicarSemPonteiro(botaoClarao, 0);
    conferir("Tab + Enter no \"Reduzir clarões\" (click com detail 0): liga e o botão mantém o foco", reduzirClaroes === !reducaoInicial && document.activeElement === botaoClarao);
    verifClicarSemPonteiro(botaoClarao, 0);
    botaoEsquerda.focus();
    verifClicarSemPonteiro(botaoEsquerda, 0);
    conferir("click com detail 0 em ◀ (leitor de tela) não tira o foco do botão", document.activeElement === botaoEsquerda);
    window.dispatchEvent(new Event("blur"));   // solta o toque curto do leitor de tela (o jogo o soltaria em 250 ms, depois do teste)
    botaoEsquerda.blur();

    // as condições, uma a uma: sem pointerdown de mouse, sem detail ≥ 1 ou fora de um botão, o foco fica
    botaoFoco.focus();
    verifClicarSemPonteiro(botaoFoco, 1);
    conferir("click com detail 1 SEM pointerdown antes (leitor de tela que manda detail ≥ 1: TalkBack, VoiceOver) mantém o foco", document.activeElement === botaoFoco);
    verifClicarSemPonteiro(botaoFoco, 0);

    botaoFoco.focus();
    botaoFoco.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse", pointerId: 1, button: 0, bubbles: true }));
    verifClicarSemPonteiro(botaoFoco, 0);
    conferir("pointerdown de mouse seguido de click com detail 0 (ativação por teclado) mantém o foco", document.activeElement === botaoFoco);
    verifClicarSemPonteiro(botaoFoco, 0);

    botaoFoco.focus();
    verifApertarComPonteiro(botaoFoco, "mouse");
    botaoFoco.focus();
    verifClicarSemPonteiro(botaoFoco, 1);
    conferir("o mouse vale para UM click: um segundo click com detail 1 sem novo pointerdown de mouse mantém o foco", document.activeElement === botaoFoco);
    verifClicarSemPonteiro(botaoFoco, 0);
    verifClicarSemPonteiro(botaoFoco, 0);

    botaoFoco.focus();
    botaoFoco.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "mouse", pointerId: 1, button: 0, bubbles: true }));
    botaoFoco.dispatchEvent(new PointerEvent("pointerdown", { pointerType: "touch", pointerId: 7, bubbles: true }));
    verifClicarSemPonteiro(botaoFoco, 1);
    conferir("vale o ÚLTIMO ponteiro a apertar: mouse e depois dedo mantém o foco", document.activeElement === botaoFoco);
    verifClicarSemPonteiro(botaoFoco, 0);

    const fora = document.createElement("div");
    document.body.appendChild(fora);
    botaoFoco.focus();
    let excecao = "";
    try { verifApertarComPonteiro(fora, "mouse"); } catch (erro) { excecao = String(erro); }
    conferir("clique do mouse fora de um botão não dá erro e não tira o foco do botão que o tinha", excecao === "" && document.activeElement === botaoFoco, excecao);
    fora.remove();

    const dentro = document.createElement("span");
    botaoEsquerda.appendChild(dentro);
    botaoEsquerda.focus();
    verifApertarComPonteiro(dentro, "mouse");
    conferir("clique do mouse num filho do botão ◀ (o clique sobe até o botão) também larga o foco do botão", document.activeElement !== botaoEsquerda);
    dentro.remove();
    window.dispatchEvent(new Event("blur"));
    conferirIgual("(controle) a lanterna está no foco de partida e o Espaço no corpo da página a troca", [lanternaDaBarca.foco === focoInicial, verifApertarEspacoNoFoco().defaultPrevented].join(","), "true,true");
    verifApertarEspacoNoFoco();   // devolve o foco da lanterna ao de partida
}


// ============================================================
// 6. CHUVA: a ficha manda na contagem; o buffer só sobe no modo instanciado
// ============================================================
const VERIF_GOTAS_DA_FICHA = [400, 800, 1200, 1600, 2000];

function verifPosicoesDasGotas(quantas) {
    const matrizes = chuva.instanciada.instanceMatrix.array;
    const posicoes = [];
    for (let i = 0; i < quantas; i++) {
        posicoes.push({ x: matrizes[i * 16 + 12], y: matrizes[i * 16 + 13], z: matrizes[i * 16 + 14] });
    }
    return posicoes;
}

/* A chuva da noite `indice` (400 a 2.000 gotas): contagem, caixa de ±25 m, alturas, queda, caixa que segue a barca e malhas avulsas. */
function verifChuvaDaNoite(passar, irParaNoite, indice) {
    const esperado = VERIF_GOTAS_DA_FICHA[indice];
    const rotulo = "noite " + (indice + 1) + " (" + esperado + " gotas)";
    irParaNoite(indice);
    while (chuva.modo !== "instanciada") { window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" })); }
    conferir(rotulo + ": InstancedMesh com count " + esperado + " (a ficha) e 6.000 números de estado (2.000 gotas, o teto)",
        chuva.instanciada instanceof THREE.InstancedMesh && chuva.instanciada.count === esperado && chuva.gotas.length === 6000 && chuva.instanciada.instanceMatrix.count === 2000);
    passar(50);
    const antes = verifPosicoesDasGotas(esperado);
    const caixaX = barcaNoMundo.x, caixaZ = barcaNoMundo.z;
    conferir(rotulo + ": as gotas estão na caixa de chuva em volta da barca (±25 m, altura 0 a 16 m)", antes.every(function (gota) {
        return Math.abs(gota.x - caixaX) <= 25 + 1e-4 && Math.abs(gota.z - caixaZ) <= 25 + 1e-4 && gota.y >= 0 && gota.y <= 16 + 1e-4;
    }));
    conferir(rotulo + ": espalhadas de verdade (mais de 75% com alturas diferentes)", new Set(antes.map(function (gota) { return gota.y.toFixed(3); })).size > 0.75 * esperado);
    passar(50);
    const depois = verifPosicoesDasGotas(esperado);
    conferir(rotulo + ": em 50 ms cada gota cai 0,9 m (ou volta ao topo)", depois.every(function (gota, i) {
        return Math.abs(((antes[i].y - gota.y + 16) % 16) - 18 * 0.05) < 1e-3;
    }));
    barcaNoMundo.x += 30;
    barcaNoMundo.z -= 10;
    passar(50);
    conferir(rotulo + ": a barca anda 30 m e a caixa vai junto: todas as gotas dentro da nova caixa",
        verifPosicoesDasGotas(esperado).every(function (gota) { return Math.abs(gota.x - barcaNoMundo.x) <= 25 + 1e-4 && Math.abs(gota.z - barcaNoMundo.z) <= 25 + 1e-4; }));

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    conferirIgual(rotulo + ": a tecla C leva ao modo avulsa", chuva.modo, "avulsa");
    conferir(rotulo + ": só as " + esperado + " primeiras malhas avulsas aparecem (e a instanciada some, com o count da ficha)",
        chuva.avulsas.children.length === 2000 && chuva.avulsas.children.filter(function (gota) { return gota.visible; }).length === esperado &&
        chuva.avulsas.children.slice(0, esperado).every(function (gota) { return gota.visible; }) && chuva.avulsas.visible === true &&
        chuva.instanciada.visible === false && chuva.instanciada.count === esperado);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    conferirIgual(rotulo + ": C, C de novo e volta à instanciada", chuva.modo, "instanciada");
}

/* instanceMatrix.needsUpdate só no modo instanciado: o `version` do atributo sobe 1 por quadro nele e NADA nos outros dois. */
function verifSubidaDoBufferDaChuva(passar) {
    while (chuva.modo !== "instanciada") { window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" })); }
    const atributo = chuva.instanciada.instanceMatrix;
    function versoesEmTresQuadros() {
        const antes = atributo.version;
        passar(50);
        passar(50);
        passar(50);
        return atributo.version - antes;
    }
    const instanciada = versoesEmTresQuadros();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    const posicaoAvulsaAntes = chuva.avulsas.children[0].position.y;
    const avulsa = versoesEmTresQuadros();
    const avulsaSeMexeu = chuva.avulsas.children[0].position.y !== posicaoAvulsaAntes;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    const gotaAntes = chuva.gotas[1];
    const nenhuma = versoesEmTresQuadros();
    const nenhumaParada = chuva.gotas[1] === gotaAntes;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" }));
    conferirIgual("modo instanciada: o buffer das instâncias sobe a cada quadro (3 quadros, 3 subidas)", instanciada, 3);
    conferir("modo avulsa: o buffer das instâncias NÃO sobe (escondida, a malha instanciada nem usa) e as malhas avulsas continuam caindo", avulsa === 0 && avulsaSeMexeu, "subidas " + avulsa + ", avulsa se mexeu " + avulsaSeMexeu);
    conferir("modo nenhuma: o buffer não sobe e a chuva fica parada", nenhuma === 0 && nenhumaParada, "subidas " + nenhuma);
    conferirIgual("e a tecla C voltou ao modo instanciada", chuva.modo, "instanciada");
}


// ============================================================
// 7. O MAR E A NÉVOA (05 e 06): 130 m de mar e névoa 0,03 de tarde e de noite (a câmera afastada até ×3 mostraria a borda)
// ============================================================
function verifMarENevoaDoEntardecer(passar) {
    const densidades = [cena.fog.density];
    const quadros = Math.ceil((DURACAO_DO_ENTARDECER + 2) * 1000 / 50);
    let corDaNevoaSegueOFundo = cena.fog.color.equals(cena.background);
    for (let quadro = 0; quadro < quadros; quadro++) {
        passar(50);
        densidades.push(cena.fog.density);
        corDaNevoaSegueOFundo = corDaNevoaSegueOFundo && cena.fog.color.equals(cena.background);
    }
    conferir("o mar tem 130 m (a câmera se afasta até ×3 e a borda não pode aparecer): TAMANHO_DO_MAR " + TAMANHO_DO_MAR + ", malha " + mar.geometry.parameters.width + " × " + mar.geometry.parameters.height,
        TAMANHO_DO_MAR === 130 && mar.geometry.parameters.width === 130 && mar.geometry.parameters.height === 130);
    conferir("a névoa é 0,03 desde o começo da tarde e em todo o entardecer até a noite fechada (" + densidades.length + " quadros; menor " + Math.min.apply(null, densidades) + ", maior " + Math.max.apply(null, densidades) + ")",
        densidades.every(function (densidade) { return Math.abs(densidade - 0.03) < 1e-12; }));
    conferir("e a cor da névoa continua a do fundo em todos os quadros", corDaNevoaSegueOFundo);
}
