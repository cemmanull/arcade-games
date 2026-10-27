/*
  ============================================================
  XENOMORPH — O SOM
  ============================================================

  Síntese com envelope, como no Shoot 'em up: nenhum arquivo de áudio,
  só osciladores cujo volume e frequência MUDAM ao longo do som. Cada som
  é uma linha da tabela SONS — os números que o descrevem.

  O GDD pede (seção 10) "sons distintos para identificar inimigos
  próximos, ataques perigosos, portas secretas e eventos especiais":

  - inimigos próximos: um BATIMENTO que acelera quanto mais perto estiver
    a criatura mais próxima que está caçando o soldado;
  - ataques perigosos: um aviso agudo junto com cada telegrafar (o
    agachar do saltador, a mira da cuspidora, os avisos da Matriarca);
  - portas secretas: um zumbido grave ao entrar numa sala com membrana;
  - eventos: arpejos para itens, cura, terminais e extração.

  O navegador só deixa tocar som depois de um gesto do jogador (tecla ou
  clique): o contexto de áudio nasce no primeiro deles (prepararAudio).
*/
const SONS = {
    tiro: { frequencia: 880, frequenciaFinal: 420, duracao: 0.06, volume: 0.02 },
    espingarda: { frequencia: 240, frequenciaFinal: 60, duracao: 0.2, volume: 0.05, tipo: "sawtooth" },
    pulo: { frequencia: 300, frequenciaFinal: 620, duracao: 0.09, volume: 0.025, tipo: "triangle" },
    esquiva: { frequencia: 520, frequenciaFinal: 140, duracao: 0.12, volume: 0.025, tipo: "sawtooth" },
    acerto: { frequencia: 1200, frequenciaFinal: 900, duracao: 0.03, volume: 0.015 },
    abate: { frequencia: 320, frequenciaFinal: 70, duracao: 0.22, volume: 0.04 },
    ferida: { frequencia: 170, frequenciaFinal: 55, duracao: 0.28, volume: 0.06, tipo: "sawtooth" },
    aviso: { frequencia: 1400, frequenciaFinal: 1600, duracao: 0.08, volume: 0.02, tipo: "triangle" },
    rugido: { frequencia: 95, frequenciaFinal: 40, duracao: 1.1, volume: 0.08, tipo: "sawtooth" },
    membrana: { frequencia: 140, frequenciaFinal: 40, duracao: 0.4, volume: 0.06, tipo: "sawtooth" },
    segredo: { frequencia: 55, frequenciaFinal: 62, duracao: 0.9, volume: 0.05, tipo: "sine" },
    batida: { frequencia: 70, frequenciaFinal: 40, duracao: 0.09, volume: 0.07, tipo: "sine" },
    item: { notas: [660, 880], intervalo: 0.06 },
    modulo: { notas: [523, 659, 784, 1046], intervalo: 0.06 },
    cura: { notas: [392, 523, 659, 784], intervalo: 0.08 },
    terminal: { notas: [988, 988, 740], intervalo: 0.07 },
    extracao: { notas: [392, 494, 587, 784, 988], intervalo: 0.1 },
    morte: { notas: [392, 330, 262, 196], intervalo: 0.14 }
};

let contextoDeAudio = null;

function prepararAudio() {
    if (contextoDeAudio !== null) {
        return;
    }
    try {
        contextoDeAudio = new AudioContext();
    } catch (erro) {
        opcoes.som = false;   // sem áudio no navegador: o jogo segue mudo
    }
}

/*
  Um som da tabela: ou um tom com envelope, ou um ARPEJO (notas em
  sequência, cada uma um tom curto agendado no relógio do áudio).
*/
function tocarSom(som) {
    if (!opcoes.som || contextoDeAudio === null) {
        return;
    }

    if (som.notas) {
        som.notas.forEach((nota, i) => {
            tocarTom({ frequencia: nota, duracao: som.intervalo * 1.3, volume: 0.03, atraso: i * som.intervalo });
        });
        return;
    }
    tocarTom(som);
}

function tocarTom({ frequencia, frequenciaFinal = frequencia, duracao, volume = 0.03, tipo = "square", atraso = 0 }) {
    const inicio = contextoDeAudio.currentTime + atraso;
    const oscilador = contextoDeAudio.createOscillator();
    const ganho = contextoDeAudio.createGain();

    oscilador.type = tipo;
    oscilador.frequency.setValueAtTime(frequencia, inicio);
    oscilador.frequency.exponentialRampToValueAtTime(frequenciaFinal, inicio + duracao);
    ganho.gain.setValueAtTime(volume, inicio);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);

    oscilador.connect(ganho);
    ganho.connect(contextoDeAudio.destination);
    oscilador.start(inicio);
    oscilador.stop(inicio + duracao);
}

/*
  O BATIMENTO: a cada batida, olha-se a criatura mais próxima que está
  CAÇANDO (perseguindo, agachada para o bote ou mirando). Ninguém caçando
  a menos de 110 px: silêncio. Alguém colado no soldado: o coração
  dispara. Um relógio que desconta e dispara, como todos os outros.
*/
const ESTADOS_DE_CACA = ["perseguicao", "preparo", "mira", "pulsando"];
const BATIMENTO = { alcance: 110, intervaloLonge: 1.1, intervaloPerto: 0.35 };
let esperaDaProximaBatida = 0;

function atualizarBatimento(tempo) {
    esperaDaProximaBatida -= tempo;

    if (esperaDaProximaBatida > 0) {
        return;
    }

    const distancias = criaturas
        .filter(criatura => ESTADOS_DE_CACA.includes(criatura.estado))
        .map(distanciaAteOSoldado);
    const maisPerto = Math.min(...distancias, Infinity);

    if (maisPerto > BATIMENTO.alcance) {
        esperaDaProximaBatida = 0.2;   // ninguém por perto: confere de novo daqui a pouco
        return;
    }

    const proximidade = 1 - maisPerto / BATIMENTO.alcance;   // 0 longe, 1 colado
    esperaDaProximaBatida = BATIMENTO.intervaloLonge + (BATIMENTO.intervaloPerto - BATIMENTO.intervaloLonge) * proximidade;
    tocarSom(SONS.batida);
    tocarSom({ ...SONS.batida, frequencia: 60, atraso: 0.14 });   // o "tum-tum" — sempre por tocarSom, que respeita o som desligado
}
