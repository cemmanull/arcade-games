/*
  ============================================================
  XENOMORPH — DADOS: OS CONTROLES
  ============================================================

  Cada AÇÃO do jogo e as teclas que a fazem. O jogo pergunta
  acao("pular"), nunca "a barra de espaço está apertada?". O remapeamento
  da base (scripts/opcoes.js) troca as listas desta tabela.
*/


const CONTROLES = {
    esquerda: ["arrowleft", "a"],
    direita: ["arrowright", "d"],
    cima: ["arrowup", "w"],
    baixo: ["arrowdown", "s"],
    pular: [" ", "z", "k"],
    esquivar: ["shift", "c", "l"],
    atirar: ["x", "j"],
    trocar: ["q"],
    recarregar: ["r"]
};
