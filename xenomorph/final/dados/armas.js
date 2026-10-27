/*
  ============================================================
  XENOMORPH — DADOS: AS ARMAS E AS MODIFICAÇÕES
  ============================================================

  Mude um número, salve, recarregue: nenhuma linha dos sistemas precisa
  mudar. Unidades: dano em pontos de vida, tempos em segundos, rapidez em
  px/s, alcance em pixels, ângulos em radianos.

  - intervalo:  tempo mínimo entre dois disparos (a cadência);
  - projeteis:  quantos saem por disparo;
  - abertura:   o ângulo total do leque entre o primeiro e o último;
  - desvio:     um erro sorteado em cada projétil (0 = perfeito);
  - recuo:      quanto o disparo empurra o soldado para trás;
  - empurrao:   quanto cada projétil empurra a criatura que acerta;
  - perfura:    por quantas criaturas o projétil passa antes de parar;
  - desbloqueio: quantas amostras custa liberar a arma na base (0 = já vem liberada).

  O GDD pede (seção 4) que "cada arma deve apresentar características
  próprias, incluindo dano, alcance, cadência, recarga, consumo de recursos".
  Compare as linhas: a diferença entre as armas É esta tabela.
*/
const ARMAS = {
    // Equilibrada, de média distância.
    rifle: {
        nome: "Rifle de plasma",
        dano: 2,
        intervalo: 0.14,
        rapidez: 300,
        alcance: 200,
        pente: 24,
        tempoDeRecarga: 1.1,
        projeteis: 1,
        abertura: 0,
        desvio: 0.04,
        recuo: 0,
        empurrao: 15,
        perfura: 0,
        desbloqueio: 0,
        cor: "#3cf2ff"
    },
    // Alto dano de perto: seis projéteis que somem cedo.
    espingarda: {
        nome: "Espingarda magnética",
        dano: 2,
        intervalo: 0.6,
        rapidez: 260,
        alcance: 72,
        pente: 6,
        tempoDeRecarga: 1.5,
        projeteis: 6,
        abertura: 0.5,
        desvio: 0.05,
        recuo: 70,
        empurrao: 45,
        perfura: 0,
        desbloqueio: 0,
        cor: "#ffcc33"
    },
    // "Disparos rápidos com consumo elevado de munição": pente enorme, recarga longa, pouca precisão.
    metralhadora: {
        nome: "Metralhadora experimental",
        dano: 1,
        intervalo: 0.06,
        rapidez: 320,
        alcance: 150,
        pente: 60,
        tempoDeRecarga: 2.4,
        projeteis: 1,
        abertura: 0,
        desvio: 0.16,
        recuo: 8,
        empurrao: 6,
        perfura: 0,
        desbloqueio: 30,
        cor: "#ff9f1c"
    },
    // "Tiros que atravessam inimigos": lento, pesado, perfurante.
    canhao: {
        nome: "Canhão de partículas",
        dano: 9,
        intervalo: 0.9,
        rapidez: 220,
        alcance: 240,
        pente: 4,
        tempoDeRecarga: 1.8,
        projeteis: 1,
        abertura: 0,
        desvio: 0,
        recuo: 40,
        empurrao: 60,
        perfura: 3,
        desbloqueio: 45,
        cor: "#c46bff"
    }
};

const ARMAS_INICIAIS = ["rifle", "espingarda"];
const ARMAS_LEVADAS = 2;   // quantas armas o soldado leva para baixo (GDD: "duas armas principais")

const DURACAO_DO_CLARAO = 0.05;   // o lampejo no cano, em segundos

/*
  AS MODIFICAÇÕES (GDD, seção 7): achadas nas salas, encaixadas na arma
  ATIVA no momento em que são apanhadas, e perdidas ao fim da expedição —
  "armas experimentais e modificações especiais podem variar entre as
  expedições".

  Cada uma é uma FUNÇÃO que recebe a ficha da arma e devolve outra: a
  arma modificada não tem código próprio, tem números diferentes (ou um
  efeito a mais, que o projétil carrega e o combate interpreta).

  As RARIDADES têm pesos de sorteio bem definidos, como o GDD pede: de 100
  módulos, cerca de 60 comuns, 30 raros e 10 épicos.
*/
const RARIDADES = {
    comum: { peso: 60, cor: "#c9d3e6" },
    raro: { peso: 30, cor: "#3cf2ff" },
    epico: { peso: 10, cor: "#ff5ad6" }
};

const MODIFICACOES = {
    canoLongo: {
        nome: "Cano longo",
        raridade: "comum",
        descricao: "+50% de alcance",
        aplicar: ficha => ({ ...ficha, alcance: ficha.alcance * 1.5 })
    },
    gatilhoLeve: {
        nome: "Gatilho leve",
        raridade: "comum",
        descricao: "atira 25% mais rápido",
        aplicar: ficha => ({ ...ficha, intervalo: ficha.intervalo * 0.75 })
    },
    perfurante: {
        nome: "Munição perfurante",
        raridade: "raro",
        descricao: "cada projétil atravessa mais uma criatura",
        aplicar: ficha => ({ ...ficha, perfura: ficha.perfura + 1 })
    },
    ricochete: {
        nome: "Ricochete",
        raridade: "raro",
        descricao: "os projéteis quicam uma vez nas paredes",
        aplicar: ficha => ({ ...ficha, ricochetes: 1 })
    },
    criogenico: {
        nome: "Núcleo criogênico",
        raridade: "raro",
        descricao: "o acerto deixa a criatura lenta",
        aplicar: ficha => ({ ...ficha, congela: 1.5, cor: "#9ffcff" })
    },
    vampirico: {
        nome: "Sifão de biomassa",
        raridade: "epico",
        descricao: "cada criatura abatida devolve 4 de vida",
        aplicar: ficha => ({ ...ficha, curaPorAbate: 4 })
    },
    fragmentacao: {
        nome: "Carga de fragmentação",
        raridade: "epico",
        descricao: "a criatura abatida explode e fere as vizinhas",
        aplicar: ficha => ({ ...ficha, explosaoAoAbater: { raio: 22, dano: 4 } })
    }
};
