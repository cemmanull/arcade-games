// Modo captura: abre uma página no Chrome headless, espera ela assentar e grava um PNG.

import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { comNavegadorDepuravel, comPaginaCarregada } from "./depuracao.mjs";
import { encontrarNavegador } from "./navegador.mjs";

/*
  `pedido` é { caminho, nomeDaPagina, largura, altura, escala, saida }; `saida` pode ser undefined.
  Imprime o caminho do PNG e os erros de console vistos na carga (informativos, não reprovam).
  Devolve 0 se gravou o PNG, 1 se a página não carregou ou a captura falhou.
*/
export async function capturarPagina(pedido) {
    const navegador = encontrarNavegador();
    const destino = pedido.saida ? resolve(pedido.saida) : caminhoPadraoDaCaptura(pedido);
    const metricas = { largura: pedido.largura, altura: pedido.altura, escala: pedido.escala };

    try {
        const { carregou, erros, png } = await comNavegadorDepuravel(
            navegador,
            (conexao) => comPaginaCarregada(conexao, pedido.caminho, metricas, async ({ sessionId, erros, carregou }) => ({
                carregou,
                erros,
                png: carregou ? await fotografar(conexao, sessionId) : null,
            }))
        );

        imprimirErros(erros);
        if (!carregou) {
            console.error("A página não carregou; nenhuma imagem foi gravada.");
            return 1;
        }

        mkdirSync(dirname(destino), { recursive: true });
        writeFileSync(destino, png);
        console.log(`${destino}  (${pedido.largura}x${pedido.altura}, escala ${pedido.escala}, ${png.length} bytes)`);
        return 0;
    } catch (erro) {
        console.error(`Captura falhou: ${erro.message}`);
        return 1;
    }
}

async function fotografar(conexao, sessionId) {
    const { data } = await conexao.enviar("Page.captureScreenshot", { format: "png" }, sessionId);
    return Buffer.from(data, "base64");
}

function caminhoPadraoDaCaptura({ nomeDaPagina, largura, altura, escala }) {
    const nomeSemExtensao = nomeDaPagina.replace(/\.html?$/i, "").replace(/[^\w.-]+/g, "-");
    const sufixoDaEscala = escala === 1 ? "" : `@${escala}x`;
    return join(tmpdir(), `captura-${nomeSemExtensao}-${largura}x${altura}${sufixoDaEscala}.png`);
}

function imprimirErros(erros) {
    if (erros.length === 0) {
        console.log("Console: nenhum erro durante a carga.");
        return;
    }
    console.log(`Console: ${erros.length} erro(s) durante a carga (informativo):`);
    erros.forEach((erro) => console.log(`        ${erro}`));
}
