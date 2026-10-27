// Modo fumaça: abre cada index.html do curso e lista os erros de console de cada página.

import { comNavegadorDepuravel, comPaginaCarregada } from "./depuracao.mjs";
import { encontrarNavegador } from "./navegador.mjs";

const PAGINAS_EM_PARALELO = 4;

/*
  Erros conhecidos e propositais. Uma página só entra aqui se o erro é parte do curso;
  qualquer outro erro nela continua reprovando a execução.
  `pagina` é o caminho a partir da raiz do repositório; `padrao` precisa casar com a linha
  de erro inteira (o executor impõe ^…$ a todas as entradas), então descreva a linha toda,
  com o arquivo ou recurso.
*/
const ERROS_ESPERADOS = [
    {
        pagina: "tutorial/01-html/index.html",
        padrao: /network: Failed to load resource: net::ERR_FILE_NOT_FOUND \(file:\/\/\/.*\/(nao-existe|tambem-nao-existe)\.png\)/,
        motivo: "a lição mostra o texto alternativo (alt) de uma imagem que não existe, de propósito",
    },
    {
        pagina: "dealer-out/final/index.html",
        padrao: /javascript: Access to manifest at '[^']*\/manifest\.webmanifest' .*|network: Failed to load resource: net::ERR_FAILED \(file:\/\/\/.*\/manifest\.webmanifest\)/,
        motivo: "o manifesto do PWA é bloqueado por CORS em file://; o jogo abre, mas só instala servido por https (ver dealer-out/final/GUIA.md)",
    },
];

/* `paginas` é uma lista de { caminho, nome }. Devolve 0 se nenhuma página tem erro inesperado, senão 1. */
export async function rodarFumaca(paginas) {
    const navegador = encontrarNavegador();
    const errosPorPagina = new Map();
    let erroGeral = null;

    try {
        await comNavegadorDepuravel(navegador, (conexao) => examinarEmParalelo(conexao, paginas, errosPorPagina));
    } catch (erro) {
        erroGeral = erro;
    }

    if (erroGeral) console.error(`Fumaça interrompida: ${erroGeral.message}`);
    const paginasComErroInesperado = relatar(paginas, errosPorPagina);
    return paginasComErroInesperado === 0 && !erroGeral ? 0 : 1;
}

async function examinarEmParalelo(conexao, paginas, errosPorPagina) {
    const fila = [...paginas];

    async function trabalhador() {
        while (fila.length > 0) {
            const pagina = fila.shift();
            try {
                errosPorPagina.set(pagina.nome, await comPaginaCarregada(conexao, pagina.caminho, null, ({ erros }) => erros));
            } catch (erro) {
                errosPorPagina.set(pagina.nome, [`falha do executor: ${erro.message}`]);
            }
        }
    }

    await Promise.all(Array.from({ length: PAGINAS_EM_PARALELO }, trabalhador));
}

function classificarErros(nomeDaPagina, erros) {
    const regras = ERROS_ESPERADOS
        .filter((regra) => regra.pagina === nomeDaPagina)
        .map((regra) => ({ ...regra, linhaInteira: new RegExp(`^(?:${regra.padrao.source})$`) }));
    const esperados = [];
    const inesperados = [];

    for (const erro of erros) {
        const regra = regras.find((candidata) => candidata.linhaInteira.test(erro));
        regra ? esperados.push({ erro, motivo: regra.motivo }) : inesperados.push(erro);
    }
    return { esperados, inesperados };
}

/* Imprime o relatório e devolve quantas páginas têm erro inesperado. */
function relatar(paginas, errosPorPagina) {
    let comErroInesperado = 0;
    let soComErrosEsperados = 0;

    for (const { nome } of paginas) {
        const { esperados, inesperados } = classificarErros(nome, errosPorPagina.get(nome) ?? ["sem resultado"]);

        if (inesperados.length > 0) {
            comErroInesperado++;
            console.log(`ERRO  ${nome}`);
            inesperados.forEach((erro) => console.log(`        ${erro}`));
        } else if (esperados.length > 0) {
            soComErrosEsperados++;
            console.log(`ESPERADO  ${nome}`);
        } else {
            console.log(`ok    ${nome}`);
        }
        esperados.forEach(({ erro, motivo }) => console.log(`        esperado: ${erro}\n          porque ${motivo}`));
    }

    const ok = paginas.length - comErroInesperado - soComErrosEsperados;
    console.log(`\n${paginas.length} páginas, ${ok} ok, ${soComErrosEsperados} só com erros esperados, ${comErroInesperado} com erro.`);
    return comErroInesperado;
}
