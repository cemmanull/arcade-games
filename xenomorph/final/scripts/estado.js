/*
  ============================================================
  XENOMORPH — O ESTADO
  ============================================================

  As referências aos elementos da página e todas as variáveis que mudam
  durante o jogo. Nascem VAZIAS: quem as preenche são as fábricas, quando
  o jogo começa (principal.js) — nenhum código daqui chama função de um
  arquivo que ainda não carregou.
*/


// ============================================================
// DOM
// ============================================================
const tela = document.getElementById("jogo");
const pincel = tela.getContext("2d");

const painel = document.getElementById("painel");
const barraDeVida = document.getElementById("vida");
const itensDasArmas = [document.getElementById("arma-0"), document.getElementById("arma-1")];
const barraDeRecarga = document.getElementById("recarga");

const camadaMensagem = document.getElementById("camada-mensagem");
const mensagemTitulo = document.getElementById("mensagem-titulo");
const mensagemTexto = document.getElementById("mensagem-texto");

const minimapa = document.getElementById("minimapa");
const pincelDoMapa = minimapa.getContext("2d");
const campoSetor = document.getElementById("setor");
const campoObjetivo = document.getElementById("objetivo");
const campoEcossistema = document.getElementById("ecossistema");
const barraDoChefe = document.getElementById("barra-do-chefe");
const vidaDoChefe = document.getElementById("vida-do-chefe");
const campoAviso = document.getElementById("aviso");
const formularioDaSemente = document.getElementById("formulario-da-semente");
const campoAmostras = document.getElementById("amostras");
const campoSementeAtual = document.getElementById("semente-atual");
const telaDaBase = document.getElementById("base");
const campoSaldo = document.getElementById("saldo");
const listaDeMelhorias = document.getElementById("melhorias");
const listaDeRegistros = document.getElementById("registros");
const listaDoBestiario = document.getElementById("bestiario");
const botaoApagar = document.getElementById("botao-apagar");
const botaoDescer = document.getElementById("botao-descer");
const botaoVoltarABase = document.getElementById("botao-voltar");
const botaoContinuar = document.getElementById("botao-continuar");
const listaDoArsenal = document.getElementById("arsenal");
const listaDeRegistrosDaColonia = document.getElementById("registros-da-colonia");
const listaDePreferencias = document.getElementById("preferencias");
const listaDeTeclas = document.getElementById("teclas");
const botaoRestaurarTeclas = document.getElementById("botao-restaurar-teclas");
const campoSemente = document.getElementById("campo-semente");
const botaoSortear = document.getElementById("botao-sortear");


// ============================================================
// O ESTADO
// ============================================================
/*
  O gerador entrega um PLANO: cada sala com a sua região, as suas portas,
  o seu módulo e as anotações de onde nascem criaturas e itens. O plano
  não muda durante a expedição.

  O que muda — criaturas mortas, cápsulas apanhadas — mora AO LADO, em
  `salasVisitadas`: só existe para as salas onde o soldado já esteve,
  e é criado na primeira visita. É a separação do passo 4 (a ficha da
  arma e a munição que sobra), agora para um mundo inteiro. E serve de
  graça ao minimapa: uma sala visitada é uma sala que tem estado.
*/

let mundo = null;
let salaAtual = null;          // o plano da sala onde o soldado está
let estadoDaSala = null;       // o que mudou nela
let salasVisitadas = new Map();

let soldado = null;   // nasce em iniciarExpedicao

/*
  O EQUIPAMENTO: duas armas, cada uma com o que muda durante o jogo —
  quantos tiros sobram no pente e quanto falta da recarga. A ficha (o que
  NÃO muda) é consultada pelo `tipo`, em ARMAS.
*/
const equipamento = {
    armas: [],   // preenchidas em iniciarExpedicao: as que a campanha manda levar
    ativa: 0
};

function criarArmaEquipada(tipo) {
    return { tipo, municao: tamanhoDoPente(tipo), recarregando: 0 };
}

let tiros = [];
let particulas = [];
let criaturas = [];   // as da sala atual
let itens = [];
let matriarca = null; // só existe no covil
let ecossistema = null;

let campanha = null;                 // o que sobrevive à morte (campanha.js); lida em principal.js
let expedicao = { amostras: 0 };      // o que morre com o soldado
let tempoSegurandoExtracao = 0;
let opcoes = null;           // as preferências de quem joga (opcoes.js); lidas em principal.js
let tremor = 0;              // quanto a tela treme agora, em pixels (desenho.js)
let numerosDeDano = [];      // os números que sobem de quem levou um tiro
let eventoSobOsPes = null;   // o evento que o soldado está tocando (para a dica aparecer uma vez)
let estavaNaZonaDeExtracao = false;
let acido = [];   // os projéteis das cuspidoras, em voo
let pocas = [];   // o ácido que caiu e ainda queima

/*
  O JOGO TEM TRÊS ESTADOS: "base", "jogando" e "fim". A pausa chega no
  final.
*/
let estado = "base";
let tempoTotal = 0;   // o relógio do jogo: anima as pernas dos rastejadores

let esperaDoProximoTiro = 0;   // a cadência: o acumulador do Shoot 'em up
let tempoDoClarao = 0;

let rastro = [];

let paleta = PALETAS.complexo;   // as cores da região da sala atual

let instanteDoQuadroAnterior = 0;
let tempoDoAviso = 0;
let membranaJaResistiu = false;   // o aviso "a membrana resiste" aparece uma vez por expedição

/*
  A tecla H agora passeia por três visões: nada, as caixas da sala, o
  mapa do gerador. Um número que dá a volta com o resto da divisão.
*/
const VISOES_DE_DEPURACAO = ["nenhuma", "caixas", "mapa"];
let visaoDeDepuracao = 0;

const teclasPressionadas = {};
