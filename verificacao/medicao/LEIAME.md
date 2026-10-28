# Medição no celular

Páginas que medem **quantos milissegundos cada quadro do jogo custa no SEU celular**. O computador de
desenvolvimento não consegue imitar um celular (já tentamos), então só um aparelho de verdade responde. Você
abre a página no celular, aperta um botão, espera meio minuto e cola o resultado de volta na conversa.

| Página | Mede | Passo a passo |
|--------|------|---------------|
| [`proa-acesa-08.html`](proa-acesa-08.html) | Proa Acesa, passo 8: noite 1 (leve) e noite 5 com chuva (a mais pesada) | abaixo |
| [`reflexo-08.html`](reflexo-08.html) | Reflexo (2.5D), passo 8: (1) um robô andando pelas salas e pelo corredor da porta, feixe aceso, sem sombras (leve); (2) parado na vista mais longa, feixe aceso e 2 sombras sempre vivas (a mais pesada). **Segure o celular em pé**: é a resolução que se joga (195×150; deitado é 320×200) | igual, abaixo |

Cada página nova entra como mais uma linha desta tabela (a do Dique virá assim) e segue o mesmo passo a passo. Medindo várias
na mesma sessão, deixe o servidor ligado e só troque o endereço no celular.

## Por que não basta abrir o arquivo no celular

No computador, o curso abre por duplo clique (`file://`). Esse endereço só existe **dentro** do computador: o
celular não enxerga os arquivos dele. Por isso o computador precisa **servir** a pasta pela rede da sua casa,
e o celular a abre por um endereço do tipo `http://192.168.x.x:8000/...`.

## Passo a passo

**Antes:** celular e computador no **mesmo Wi-Fi**. Para o Proa Acesa o celular também precisa de **internet**
(a página baixa o three.js); o Reflexo roda sem ela. Para o Reflexo, **segure o celular em pé** (retrato) e
não gire a tela durante a medição.

1. No computador, abra um terminal **na pasta do repositório** (a que tem `README.md` e `verificacao`).
   No Windows: abra a pasta no Explorador, clique na barra de endereço, digite `cmd` e aperte Enter.
2. Digite e aperte Enter (precisa do Python 3, que já está instalado neste computador):

   ```
   python -m http.server 8000 --bind 0.0.0.0
   ```

   O terminal fica "parado" mostrando `Serving HTTP on 0.0.0.0 port 8000`. É assim mesmo: deixe aberto.
3. Se o Windows perguntar sobre o **Firewall** ("Permitir que o Python acesse redes"), marque só
   **Redes particulares** (a sua casa) e desmarque **Redes públicas**. Depois clique em **Permitir acesso**.
4. Descubra o endereço do computador: abra **outro** terminal, digite `ipconfig` e procure o adaptador do
   **Wi-Fi** ("Adaptador de Rede sem Fio Wi-Fi"). Anote o **Endereço IPv4**, algo como `192.168.0.15`.
   Não use o de adaptadores de VPN, "Ethernet virtual" ou WSL: o certo é o do Wi-Fi.
5. No celular, abra o navegador (Chrome ou Safari) e digite, trocando `<IP>` pelo número que você anotou e
   `<pagina>` pelo nome da tabela acima (`proa-acesa-08.html` ou `reflexo-08.html`):

   ```
   http://<IP>:8000/verificacao/medicao/<pagina>
   ```

   Exemplos: `http://192.168.0.15:8000/verificacao/medicao/proa-acesa-08.html` e
   `http://192.168.0.15:8000/verificacao/medicao/reflexo-08.html`. Deve aparecer um painel escuro com o botão
   **Medir**. No Proa Acesa, se aparecer "Precisa de internet para baixar o three.js", o celular está sem
   internet (o Reflexo não usa internet). A página do Proa Acesa começa com "Reduzir clarões" ligado; se quiser ver os clarões inteiros, aperte o botão para desligar.
6. Aperte **Medir** e **espere sem mexer**, com a tela acesa e a página aberta (cerca de meio minuto por página; mostra
   "Cenário 1 de 2", "Cenário 2 de 2"). Se a tela apagar ou você trocar de aplicativo, aperte **Medir de novo**.
7. Quando aparecer o texto do resultado, aperte **Copiar resultado** e cole na conversa. Se o celular não
   deixar copiar sozinho, a página avisa: toque no texto, escolha "Selecionar tudo" e "Copiar".
8. Para repetir (vale rodar 2 ou 3 vezes), aperte **Medir de novo**.

## Ao terminar: desligue o servidor

No terminal do passo 2, aperte **Ctrl+C**. Confira que o celular não abre mais a página.

## Cuidado

Enquanto o servidor roda, **qualquer aparelho no mesmo Wi-Fi pode ler a pasta do repositório**. Faça isso
**só em Wi-Fi de casa, de confiança** (nunca em Wi-Fi de café, escola, hotel ou trabalho) e desligue ao
terminar. Nada é escrito nem instalado no computador.

## O que o resultado diz

Cada cenário traz três números por medida, `mediana / p95 / máximo` em milissegundos: o quadro típico, o
quadro "ruim" (1 em 20 é pior que isso) e o pior. Para 60 quadros por segundo, o quadro inteiro precisa caber
em cerca de 16,7 ms. "JS do jogo" é a lógica; "desenho (CPU)" é o tempo que o processador gasta mandando
desenhar (a placa de vídeo termina depois, por isso o **fps** e o intervalo entre quadros são o número que
manda). No Reflexo o jogo não separa lógica de desenho: sai uma linha só, "tempo do jogo (atualizar + desenhar, CPU)",
que inclui o envio da imagem ao canvas, e o texto traz o que o robô viu (receptores acesos, sombras vivas, toques). O modo de teste do desenvolvedor (`?quadros=60&aquecimento=10&auto=1` no fim do endereço) mede
poucos quadros e começa sozinho.

**O que se mediu antes:** [GDD do Proa Acesa, §9](../../proa-acesa/proa-acesa_gdd.md) · **Passos medidos:** [Proa Acesa, passo 8](../../proa-acesa/08-depuracao/GUIA.md) · [Reflexo, passo 8](../../reflexo/08-sombras/GUIA.md) · **Verificação:** [README](../README.md)
