Aqui está um prompt completo para criar um jogo **Metroidvania + Roguelike com geração procedural pseudoaleatória e temática de combate alienígena**, ideal para usar em ferramentas de desenvolvimento de jogos com IA.

Prompt — XENOMORPH: Protocolo de Extinção

Crie um jogo 2D de ação, exploração e sobrevivência que combine os gêneros Metroidvania e Roguelike, com uma temática de guerra contra criaturas alienígenas em um planeta hostil. O jogo deve apresentar combate intenso, exploração não linear, progressão permanente, mapas pseudoaleatórios e uma atmosfera de ficção científica sombria.

## 1\. CONCEITO DO JOGO

O jogador controla um soldado de elite enviado a um planeta extraterrestre após uma colônia humana perder completamente o contato com a Terra.

A missão inicial é investigar o desaparecimento dos colonos, recuperar dados científicos e descobrir a origem de uma infestação alienígena.

Entretanto, o planeta está vivo, as instalações humanas foram tomadas por criaturas hostis e algo inteligente está coordenando a invasão.

Cada expedição revela novas áreas, inimigos, equipamentos e fragmentos da história. A morte não encerra a campanha: ela faz parte do ciclo de evolução do personagem.

**Nome provisório:** XENOMORPH: Protocolo de Extinção.

**Gênero:** Metroidvania, Roguelike, Action-Platformer e Sci-Fi Horror.

**Perspectiva:** 2D com câmera lateral.

**Estilo visual:** Pixel art detalhada, ficção científica industrial, ambientes biomecânicos, iluminação dinâmica e efeitos de partículas.

**Tom:** Sombrio, misterioso, hostil e brutal.

## 2\. SISTEMA DE MAPAS PSEUDOALEATÓRIOS

Desenvolva um sistema de geração procedural pseudoaleatória que crie mapas diferentes a cada nova expedição, mas preserve uma estrutura coerente e explorável.

O sistema deve combinar salas predefinidas, conexões dinâmicas, eventos aleatórios e elementos fixos importantes para a progressão.

### Requisitos do mapa

- Criar salas conectadas por corredores, elevadores, túneis e passagens secretas.
- Gerar diferentes combinações de salas a cada partida.
- Utilizar uma seed para reproduzir exatamente uma geração anterior.
- Garantir que todas as áreas obrigatórias sejam acessíveis.
- Posicionar inimigos, armadilhas, recursos, portas e recompensas de maneira pseudoaleatória.
- Distribuir salas de combate, exploração, descanso, comércio, eventos e chefes.
- Criar atalhos que conectem regiões previamente exploradas.
- Posicionar habilidades e equipamentos em locais que incentivem a exploração.
- Garantir que os objetivos principais nunca sejam gerados em posições inacessíveis.
- Evitar corredores sem saída desnecessários, salas desconectadas e combinações impossíveis de obstáculos.

### Estrutura metroidvania

O mapa deve ser dividido em biomas interconectados, como:

1. Complexo de Pesquisa Abandonado.
2. Floresta Alienígena Bioluminescente.
3. Minas Subterrâneas Infectadas.
4. Instalação Militar Destruída.
5. Oceano de Biomassa.
6. Colmeia dos Xenomorfos.
7. Núcleo Planetário.

Cada bioma possui identidade visual, inimigos, mecânicas ambientais, recursos e segredos próprios.

Algumas áreas devem exigir habilidades específicas para serem acessadas. Por exemplo, um salto duplo permite alcançar plataformas elevadas, enquanto um disparo energético especial destrói barreiras orgânicas.

Quando o jogador desbloquear uma nova habilidade, deverá poder retornar a regiões anteriores para encontrar passagens secretas, melhorias e áreas opcionais.

**Importante:** não transforme o mapa em uma sequência totalmente aleatória de salas independentes. A geração deve preservar uma estrutura de exploração interconectada típica de um Metroidvania.

## 3\. SISTEMA ROGUELIKE

A cada morte, o personagem retorna à base de operações, onde poderá reorganizar seus equipamentos e iniciar uma nova expedição.

O ciclo principal deve funcionar assim:

1. Preparar o personagem na base.
2. Escolher equipamentos e recursos iniciais.
3. Entrar no planeta.
4. Explorar salas e descobrir rotas.
5. Combater criaturas alienígenas.
6. Encontrar armas, modificações e habilidades temporárias.
7. Enfrentar minibosses e chefes.
8. Coletar amostras biológicas e dados tecnológicos.
9. Extrair recursos ou continuar explorando.
10. Morrer ou concluir a expedição.
11. Utilizar os recursos permanentes para evoluir.
12. Iniciar uma nova tentativa com novas possibilidades.

A morte deve provocar a perda de parte dos recursos temporários, mas não apagar completamente o progresso do jogador.

Permita que recursos específicos sejam utilizados para desbloquear armas, aprimoramentos permanentes, melhorias da base e novas opções de equipamentos.

As habilidades essenciais para a exploração devem ser persistentes, enquanto armas experimentais, modificações especiais e vantagens de combate podem variar entre as expedições.

Implemente um sistema de progressão que mantenha a sensação de descoberta e recompensa, mesmo após várias mortes.

## 4\. COMBATE CONTRA ALIENÍGENAS

O combate deve ser rápido, responsivo, estratégico e baseado em movimentação.

O jogador precisa combinar ataques, esquivas, saltos, habilidades especiais e posicionamento para sobreviver.

### Movimentação

Implemente:

- Corrida horizontal.
- Salto variável.
- Salto duplo desbloqueável.
- Esquiva rápida.
- Agarrar-se a superfícies específicas.
- Deslizamento por espaços estreitos.
- Escalada em paredes com habilidade apropriada.
- Disparo em diferentes direções.
- Movimentação aérea e combate durante o salto.

A movimentação deve ser precisa, com aceleração, desaceleração e controle aéreo ajustáveis.

### Arsenal

Crie diferentes categorias de armas:

- Rifle de plasma: arma equilibrada para combates de média distância.
- Espingarda magnética: alto dano a curta distância.
- Metralhadora experimental: disparos rápidos com consumo elevado de munição.
- Canhão de partículas: tiros carregados que atravessam inimigos.
- Lança-chamas criogênico: congela ou desacelera determinadas criaturas.
- Lâmina energética: combate corpo a corpo e ataques rápidos.
- Lançador de micromísseis: ataques explosivos e dano em área.
- Arma biológica alienígena: utiliza energia extraída das próprias criaturas.

Cada arma deve apresentar características próprias, incluindo dano, alcance, cadência, recarga, consumo de recursos e possibilidades de aprimoramento.

Permita equipar duas armas principais e alternar entre elas durante o combate.

Implemente combinações entre armas, habilidades e modificações para criar diferentes estilos de jogo.

### Tipos de inimigos

Crie inimigos com comportamentos distintos:

- Rastejadores: atacam em grupos e tentam cercar o jogador.
- Saltadores: perseguem o personagem e atacam em arcos.
- Cuspidoras ácidas: mantêm distância e controlam áreas do cenário.
- Tanques biológicos: possuem armadura resistente e ataques pesados.
- Parasitas: tentam agarrar o jogador e prejudicar sua movimentação.
- Caçadores camuflados: ficam invisíveis ou se escondem antes de atacar.
- Drones contaminados: utilizam tecnologia humana corrompida.
- Predadores alfa: perseguem o jogador por várias salas.
- Guardiões da colmeia: protegem áreas estratégicas.
- Chefes evolutivos: modificam seus padrões de ataque conforme a batalha avança.

Cada inimigo deve ter inteligência artificial baseada em estados, como patrulha, investigação, perseguição, ataque, defesa, recuo e morte.

Os inimigos devem reagir ao ambiente, ao posicionamento do jogador e às próprias características das armas utilizadas.

## 5\. SISTEMA DE EVOLUÇÃO ALIENÍGENA

Implemente um sistema em que determinadas criaturas evoluem durante a expedição.

Quanto mais tempo o jogador permanecer em uma região, mais perigoso o ecossistema poderá se tornar.

Exemplos:

- Inimigos comuns podem receber mutações defensivas.
- Criaturas podem desenvolver resistência a armas utilizadas repetidamente.
- Predadores podem começar a perseguir o jogador entre salas conectadas.
- Ninhos podem gerar reforços até serem destruídos.
- Eventos ambientais podem aumentar a agressividade das criaturas.
- Chefes podem adquirir variações de ataques em expedições futuras.

A evolução deve seguir regras definidas e controladas, evitando que o jogo aumente a dificuldade de maneira injusta ou imprevisível.

Utilize um sistema de dificuldade adaptativa baseado no progresso da expedição, nos recursos disponíveis e nos eventos desencadeados pelo jogador.

## 6\. HABILIDADES METROIDVANIA

As habilidades de exploração devem desbloquear novas possibilidades de movimentação e combate.

Implemente habilidades como:

**Impulso Cinético:** permite atravessar obstáculos específicos e executar uma investida horizontal.

**Salto de Fase:** permite atravessar barreiras energéticas durante um intervalo curto.

**Gancho Magnético:** possibilita alcançar plataformas elevadas e atravessar abismos.

**Salto Duplo:** amplia o alcance vertical da movimentação.

**Pulso Sísmico:** destrói superfícies frágeis e revela passagens ocultas.

**Escudo de Plasma:** absorve uma quantidade limitada de dano.

**Visão Espectral:** revela inimigos camuflados, objetos ocultos e vestígios biológicos.

**Sobrecarga Neural:** desacelera temporariamente determinados inimigos e mecanismos.

Cada habilidade deve ter aplicações tanto na exploração quanto no combate.

A aquisição de uma habilidade precisa abrir novas rotas no mapa e permitir revisitar áreas anteriores para descobrir segredos.

## 7\. GERAÇÃO DE ARMAS E SINERGIAS

Implemente um sistema de modificações pseudoaleatórias para armas e equipamentos.

Cada arma pode receber atributos e efeitos adicionais.

Exemplos:

- Disparos que ricocheteiam nas paredes.
- Projéteis que explodem após um intervalo.
- Munição que atravessa múltiplos inimigos.
- Acertos críticos que restauram energia.
- Dano adicional contra criaturas blindadas.
- Disparos que liberam pequenos drones.
- Projéteis que congelam inimigos.
- Eliminações que geram ondas de choque.
- Esquivas que aumentam temporariamente o dano.
- Combinações que transformam dano recebido em energia de habilidade.

As modificações devem criar combinações interessantes sem tornar todas as armas igualmente eficazes em qualquer situação.

Utilize raridades distintas, com efeitos e probabilidades de obtenção bem definidos.

Permita que o jogador construa diferentes configurações, como combatente agressivo, especialista em ataques críticos, estrategista defensivo ou usuário de tecnologia alienígena.

## 8\. CHEFES E EVENTOS ESPECIAIS

Cada bioma deve possuir pelo menos um chefe principal e, opcionalmente, minibosses e encontros secretos.

Os chefes devem possuir múltiplas fases, padrões de ataque reconhecíveis, pontos fracos e mudanças de comportamento.

Exemplos:

- O Devorador: criatura gigantesca que atravessa paredes e tenta engolir o jogador.
- A Matriarca: entidade que produz hordas de criaturas menores.
- O Sentinela Corrompido: máquina militar controlada por organismos alienígenas.
- O Caçador Primordial: predador inteligente que utiliza emboscadas.
- O Coração da Colmeia: organismo central que controla partes do ecossistema planetário.

Inclua eventos aleatórios, como:

- Resgatar sobreviventes de uma instalação infestada.
- Encontrar um laboratório com experimentos proibidos.
- Defender uma área contra ondas de criaturas.
- Investigar um sinal de socorro que pode ser uma armadilha.
- Encontrar um comerciante clandestino.
- Descobrir uma sala secreta com equipamento experimental.
- Enfrentar um predador que persegue o jogador por várias salas.
- Escolher entre salvar recursos humanos ou destruir uma fonte de contaminação.

As escolhas devem produzir consequências mecânicas ou narrativas.

## 9\. BASE DE OPERAÇÕES E PROGRESSÃO PERMANENTE

A base funciona como ponto de retorno entre expedições.

Nela, o jogador poderá:

- Melhorar atributos permanentes.
- Desbloquear novas armas.
- Fabricar equipamentos.
- Pesquisar amostras alienígenas.
- Liberar habilidades de exploração.
- Comprar consumíveis.
- Consultar mapas e registros.
- Desbloquear novos biomas.
- Modificar a configuração inicial do personagem.
- Investigar a história da invasão.

A base deve evoluir visualmente conforme o jogador recupera recursos e resgata sobreviventes.

Cada melhoria deve ter custos claros e benefícios compreensíveis.

## 10\. DIREÇÃO ARTÍSTICA E ATMOSFERA

Utilize pixel art de alta qualidade com silhuetas bem definidas, animações fluidas e cenários ricos em detalhes.

A direção artística deve combinar:

- Instalações industriais abandonadas.
- Tecnologia militar futurista.
- Organismos alienígenas biomecânicos.
- Florestas extraterrestres luminosas.
- Tubulações cobertas por matéria orgânica.
- Máquinas humanas parcialmente assimiladas.
- Efeitos de iluminação e sombras.
- Partículas, fumaça, fluidos alienígenas e explosões.
- Interfaces holográficas e indicadores de combate.

A paleta de cores deve variar conforme o bioma, utilizando tons frios nas instalações humanas, verdes e azuis na vegetação alienígena e vermelhos e laranjas nas áreas de maior perigo.

A música e os efeitos sonoros devem reforçar a tensão, a exploração e a intensidade dos combates.

Utilize sons distintos para identificar inimigos próximos, ataques perigosos, portas secretas e eventos especiais.

## 11\. INTERFACE E EXPERIÊNCIA DO JOGADOR

Crie uma interface intuitiva com:

- Barra de vida.
- Energia das habilidades.
- Munição das armas equipadas.
- Indicador de recarga.
- Mapa explorado.
- Objetivos atuais.
- Inventário.
- Equipamentos ativos.
- Recursos coletados.
- Indicadores visuais de dano.
- Registro de inimigos descobertos.
- Tela de progressão permanente.

O mapa deve registrar as salas exploradas e destacar portas bloqueadas, mas não revelar automaticamente todas as áreas desconhecidas.

Inclua opções de acessibilidade para remapear controles, ajustar vibração, modificar a intensidade dos efeitos visuais e personalizar indicadores de combate.

## 12\. ARQUITETURA TÉCNICA

Organize o projeto em sistemas independentes e reutilizáveis.

Separe os módulos de:

- Controle do personagem.
- Física e movimentação.
- Combate e armas.
- Inteligência artificial.
- Geração procedural.
- Sistema de seeds.
- Conexões e validação dos mapas.
- Inventário e equipamentos.
- Progressão permanente.
- Habilidades.
- Eventos aleatórios.
- Chefes.
- Interface.
- Áudio.
- Salvamento e carregamento.
- Balanceamento de dificuldade.

Utilize configurações externas para definir atributos de armas, inimigos, salas, itens e habilidades.

Evite duplicar código para cada tipo de inimigo ou arma. Prefira componentes reutilizáveis e sistemas orientados a dados.

Implemente salvamento persistente para desbloqueios, melhorias da base, registros de exploração e progresso narrativo.

A seed de cada expedição deve permitir reproduzir o mesmo mapa, incluindo a distribuição dos elementos gerados, desde que as mesmas regras e versões dos dados sejam utilizadas.

Adicione ferramentas de depuração para visualizar conexões entre salas, pontos de surgimento, rotas obrigatórias e áreas inacessíveis.

## 13\. REGRAS IMPORTANTES DE GERAÇÃO PROCEDURAL

O sistema pseudoaleatório deve ser determinístico e validado.

Utilize uma seed principal para cada expedição e fluxos aleatórios independentes para a geração do mapa, os inimigos, os itens e os eventos. Dessa maneira, pequenas mudanças em um sistema não devem modificar desnecessariamente todos os demais resultados.

Antes de iniciar uma expedição, valide:

- Se o jogador consegue alcançar a saída de cada área obrigatória.
- Se as habilidades necessárias podem ser obtidas antes de serem exigidas.
- Se não existem portas obrigatórias permanentemente bloqueadas.
- Se os pontos de surgimento são seguros.
- Se os chefes podem ser alcançados.
- Se existe uma rota de progressão válida.
- Se os itens essenciais não foram gerados em locais inacessíveis.

Caso uma geração falhe na validação, descarte-a e gere outra utilizando uma seed alternativa.

As salas devem ser selecionadas de um conjunto de módulos projetados manualmente, conectados por regras de compatibilidade.

O resultado deve apresentar variedade sem perder coerência espacial, equilíbrio ou identidade artística.

## 14\. OBJETIVO FINAL DO PROJETO

Desenvolva um jogo funcional, expansível e divertido, com foco na qualidade da movimentação, no combate responsivo, na exploração não linear e na variedade entre expedições.

Priorize a criação de um protótipo jogável que contenha:

1. Um personagem controlável.
2. Um sistema de combate funcional.
3. Pelo menos três tipos de inimigos.
4. Um conjunto inicial de armas.
5. Um mapa pseudoaleatório com salas conectadas.
6. Uma habilidade de exploração desbloqueável.
7. Um miniboss.
8. Um sistema de morte e reinício.
9. Progressão permanente.
10. Salvamento da campanha.
11. Uma interface funcional.
12. Uma seed reproduzível para cada mapa.

Depois que o protótipo estiver estável, expanda gradualmente o número de biomas, inimigos, habilidades, armas, eventos e chefes.

Não produza apenas uma apresentação visual ou uma demonstração sem mecânicas reais. Priorize sistemas implementados, controles responsivos, regras consistentes e uma estrutura de código que permita continuar desenvolvendo o jogo.

O resultado final deve transmitir a sensação de explorar um mundo alienígena hostil, descobrir tecnologias desconhecidas, enfrentar criaturas em constante evolução e construir gradualmente um arsenal capaz de derrotar a ameaça que tomou o planeta.

## Recomendações para melhorar o resultado

Para transformar esse conceito em um projeto realmente jogável, recomendo três decisões adicionais:

- **Combate inspirado em Metroid e Dead Cells:** movimentação precisa, esquivas rápidas, armas variadas e chefes com padrões de ataque que recompensam o aprendizado.
- **Geração procedural híbrida:** salas construídas manualmente, conectadas por um algoritmo pseudoaleatório. Isso costuma oferecer resultados mais consistentes do que gerar cada sala e plataforma completamente ao acaso.
- **Progressão híbrida:** habilidades fundamentais de exploração permanecem desbloqueadas, enquanto armas experimentais e modificações variam entre expedições.

### Uma decisão importante

O projeto pode seguir três direções:

1. **Metroidvania tradicional com elementos roguelike:** mapa interconectado persistente, novas habilidades e áreas que se abrem progressivamente.
2. **Roguelike com exploração metroidvania:** mapas que mudam a cada expedição, com habilidades permanentes que liberam novas rotas e possibilidades.
3. **Híbrido completo:** um planeta dividido em grandes regiões persistentes, mas com salas, encontros, recursos e eventos que mudam a cada expedição.

**Minha recomendação é a terceira opção.** Ela permite combinar exploração significativa, geração pseudoaleatória, progressão permanente e alta rejogabilidade sem perder a identidade de um Metroidvania.
