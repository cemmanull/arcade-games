// Cliente mínimo do DevTools Protocol sobre o WebSocket do Node (sem biblioteca).
//
// Por que CDP e não --enable-logging=stderr: o CDP entrega cada erro com o texto, o tipo
// (exceção, console.error, recurso que falhou) e a página certa, sem misturar várias páginas.

const LIMITE_DE_UM_COMANDO_EM_MILISSEGUNDOS = 30000;

/*
  Conecta e devolve { enviar, escutarSessao, pararDeEscutarSessao, fechar }.
  `enviar(metodo, parametros, sessionId)` resolve com o resultado do comando e rejeita se o
  navegador responder erro, não responder em 30s ou fechar a conexão.
*/
export function abrirConexao(enderecoWebSocket) {
    return new Promise((resolver, rejeitar) => {
        const soquete = new WebSocket(enderecoWebSocket);
        const esperandoResposta = new Map();   // id do comando -> { resolver, rejeitar, alarme }
        const ouvintesPorSessao = new Map();   // sessionId -> função chamada a cada evento
        let proximoId = 1;

        function tirarDaEspera(id) {
            const pendente = esperandoResposta.get(id);
            if (pendente) {
                clearTimeout(pendente.alarme);
                esperandoResposta.delete(id);
            }
            return pendente;
        }

        function enviar(metodo, parametros = {}, sessionId) {
            if (soquete.readyState !== WebSocket.OPEN) {
                return Promise.reject(new Error("a conexão com o navegador está fechada"));
            }
            const id = proximoId++;
            return new Promise((resolverResposta, rejeitarResposta) => {
                const alarme = setTimeout(() => {
                    tirarDaEspera(id);
                    rejeitarResposta(new Error(`${metodo} não respondeu em ${LIMITE_DE_UM_COMANDO_EM_MILISSEGUNDOS / 1000}s`));
                }, LIMITE_DE_UM_COMANDO_EM_MILISSEGUNDOS);
                esperandoResposta.set(id, { resolver: resolverResposta, rejeitar: rejeitarResposta, alarme });
                soquete.send(JSON.stringify({ id, method: metodo, params: parametros, sessionId }));
            });
        }

        soquete.onerror = () => rejeitar(new Error("não conectou ao DevTools"));
        soquete.onclose = () => {
            for (const id of [...esperandoResposta.keys()]) {
                tirarDaEspera(id).rejeitar(new Error("a conexão com o navegador foi fechada"));
            }
        };
        soquete.onmessage = ({ data }) => {
            const mensagem = JSON.parse(data);
            const pendente = tirarDaEspera(mensagem.id);

            if (pendente) {
                mensagem.error ? pendente.rejeitar(new Error(mensagem.error.message)) : pendente.resolver(mensagem.result);
            } else if (mensagem.method) {
                ouvintesPorSessao.get(mensagem.sessionId)?.(mensagem);
            }
        };
        soquete.onopen = () => resolver({
            enviar,
            escutarSessao: (sessionId, ouvinte) => ouvintesPorSessao.set(sessionId, ouvinte),
            pararDeEscutarSessao: (sessionId) => ouvintesPorSessao.delete(sessionId),
            fechar: () => soquete.close(),
        });
    });
}
