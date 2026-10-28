# Currículo — Passo 7: Publicar (opcional)

**Mudou:** nada no código. Este passo **não tem pasta de código**: só este guia. Você vai usar o navegador e a pasta do passo 6 (ou do `final`).
**Rode:** não há o que abrir. O resultado é um **endereço** que você manda para quem quiser.

---

## Leia antes: o que este passo é

> **Este é o único passo do curso que exige uma conta e conexão com a internet.** Todo o resto abriu com duplo
> clique, sem instalar nada, e continua assim. **Você pode pular este passo**: o currículo termina no `final`
> funcionando no seu computador e virando PDF com **Ctrl+P**, como no [passo 5](../05-acabamento/).
>
> **Publicar não é obrigatório, e ninguém deve ser obrigado a fazê-lo.**

Se for adiante, leia as duas caixas seguintes primeiro.

> **Privacidade.** Uma página pública é lida por qualquer pessoa e pode ser copiada para sempre. Antes de enviar
> qualquer arquivo, releia cada texto **e cada arquivo**.
>
> **Não publique:** endereço de casa, telefone pessoal, CPF, RG ou outro documento, data de nascimento completa,
> fotos de menores de idade, nome da escola com turma e horário, dados bancários.
> **Prefira:** cidade e estado, um **e-mail dedicado ou alias**, e um link para um perfil profissional.
> Abra o `index.html` e o `projetos.js` e procure por números, endereços e nomes que não deviam estar ali.

> **Menor de idade?** Converse com quem é responsável por você **antes** de criar uma conta ou publicar. Muitos serviços
> têm idade mínima, e a decisão de colocar o seu nome na internet também é de quem cuida de você. Se a resposta for "ainda
> não", tudo bem: o currículo no seu computador já vale como portfólio para mostrar em mãos.

---

## O que você vai fazer

```
pasta no computador  →  repositório no GitHub  →  GitHub Pages  →  https://usuario.github.io/repositorio/
```

O **GitHub** guarda pastas de arquivos (repositórios). O **GitHub Pages** transforma um repositório **público** num site, de graça,
sem você instalar nada nem entender de servidores. Como o seu currículo é só HTML, CSS e JavaScript, ele funciona como está.

---

## 1. Prepare a pasta

Crie uma pasta nova no computador, por exemplo `meu-curriculo`, e copie para dentro **só os arquivos do currículo** (`index.html`, `style.css`,
`script.js`, `projetos.js`). Não copie o `GUIA.md`.

**Os links dos jogos vão quebrar.** Eles apontam para `../../tetris/final/index.html`, e `../..` só existe na pasta do curso. Na internet
essa pasta não existe. Você tem duas escolhas, por projeto:

| Escolha | O que fazer | Custo |
|---|---|---|
| **Levar o jogo junto** | copie a pasta `final/` do jogo para `meu-curriculo/jogos/tetris/` e mude `pasta` para `"jogos/tetris/index.html"` | o jogo roda na internet; a pasta fica maior (veja abaixo) |
| **Tirar o link** | apague o projeto de `projetos.js` | o cartão some |

Se ligou o **Jogar aqui** (`jogarAqui: true`), levar o jogo junto é obrigatório: sem a pasta o quadro mostra uma página de erro.
Quanto pesa? Os quatro `final/` do modelo somam mais ou menos **570 KB** (o Xenomorph sozinho, uns 330 KB, em quase 30 arquivos), uma
fração de uma foto de celular. Copie **só a pasta `final/`**, sem os passos anteriores.

Use sempre **caminhos relativos** (`jogos/tetris/index.html`, sem barra no começo). O endereço do seu site terá o **nome do
repositório no meio** (`…github.io/meu-curriculo/`), e um caminho que começa com `/` procuraria na raiz do `github.io` e não
acharia nada.

---

## 2. Crie a conta e o repositório

1. Crie uma conta em **github.com**. Escolha um nome de usuário **que você aceite ver no endereço do currículo**: ele
   vai aparecer nele. Use o **e-mail dedicado** do passo 5, não o pessoal.
2. Clique em **New** (novo repositório). Dê um nome sem espaços nem acentos (`meu-curriculo`) e marque **Public**.
   O Pages gratuito exige repositório público: **tudo que está nele é visível para todos.**
3. Na página do repositório, escolha **uploading an existing file** (ou **Add file > Upload files**) e **arraste os arquivos e as pastas**
   da sua pasta `meu-curriculo`. O `index.html` precisa ficar **na raiz**, e não dentro de outra pasta.
4. Role até o fim e clique em **Commit changes**.

O envio pelo site tem um limite de arquivos por vez (em torno de 100: confira na tela). Se passar, envie uma pasta de cada vez.

---

## 3. Ligue o GitHub Pages

1. No repositório, vá em **Settings > Pages**.
2. Em **Build and deployment**, escolha **Source: Deploy from a branch**.
3. Em **Branch**, escolha `main` e `/ (root)` e clique em **Save**.
4. Espere um ou dois minutos e recarregue a página de configurações: aparece o endereço
   **`https://SEU-USUARIO.github.io/meu-curriculo/`**.

Abra o endereço. Se aparecer a **página 404**, espere mais um pouco e confira se o `index.html` está na raiz. Se a página
abrir sem estilo, o `style.css` ficou numa pasta errada, ou o nome está com maiúsculas diferentes (`Style.css` não é `style.css` na internet).

---

## 4. Troque os marcadores

Agora você tem o endereço real. Abra o `index.html` (no site do GitHub, clique no arquivo e no lápis, ou envie de novo o arquivo editado) e
troque, no `<head>`:

```html
<meta property="og:url" content="https://SEU-USUARIO.github.io/meu-curriculo/">
<meta property="og:image" content="https://SEU-USUARIO.github.io/meu-curriculo/cartao.png">
```

Envie também o `cartao.png` (o cartão do [passo 6](../06-compartilhar/)). Cole o endereço numa conversa **só com você** e veja o cartão
aparecer. As redes guardam o cartão por um tempo: se você trocar a imagem e ele não mudar, é isso.

---

## 5. Confira no celular

- Abra o endereço **no celular**, com a rede do celular (não o Wi-Fi de casa): é assim que o recrutador vai ver.
- Em 390 px: o menu quebra de linha, os cartões ficam numa coluna, os botões são fáceis de tocar?
- Clique em **todos** os links, um a um. Algum jogo dá "404"? Algum depende da internet e não avisa?
- Teste o tema escuro e a tecla **H** (no celular, o botão).
- Tire o botão **Ver estrutura** (exercício do passo 5) se não quiser que ele apareça.

---

## Alternativas, em uma linha cada

- **Netlify Drop:** arraste a pasta numa página do site e ele devolve um endereço, sem repositório.
- **Cloudflare Pages:** parecido com o GitHub Pages; serve se você já tiver conta lá.

Nenhum deles é necessário para o curso. O resto desta página usa só o GitHub Pages.

---

## Para desfazer

Para **tirar a página do ar**: em **Settings > Pages**, desligue a publicação, ou apague o repositório (**Settings** > rolar até a **Danger Zone**). Mas lembre: quem copiou ou
salvou antes continua com a cópia, e algumas ferramentas guardam cópias de páginas públicas. Por isso a conferência de privacidade vem
**antes** de publicar.

---

## Experimente

1. **Quanto pesa?** Some o tamanho de todos os arquivos da pasta publicada. Quantos KB são seus e quantos são dos jogos?
2. **Só o que quero mostrar.** Publique com três projetos em vez de quatro. O que muda em `projetos.js` e no `index.html` (as habilidades que apontavam para o quarto)?
3. **O cartão.** Cole o endereço numa conversa com você mesmo. O que o cartão mostra? Falta algo no `og:description`?
4. **Teste cego.** Peça a alguém que abra o endereço no celular e diga, em 30 segundos, quem você é e o que faz. Ele acertou?
5. **Atualizar.** Mude uma frase do "Sobre mim" e publique de novo. Quanto tempo levou para aparecer?

---

**Anterior:** [`06-compartilhar`](../06-compartilhar/) · **Próximo:** [`final`](../final/) — o modelo completo, com a lista "troque estes dados", o checklist de privacidade e os exercícios.
