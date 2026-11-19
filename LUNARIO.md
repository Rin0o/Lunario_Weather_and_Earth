# Lunário — Requisitos, Arquitetura e Decisões

| | |
|---|---|
| **Estado** | Rascunho v0.3 |
| **Data** | 2026-11-19 |
| **Autor** | Pedro Rino |
| **Dataset** | [Almanaque — Dataset do calendário agrícola v0.1](https://claude.ai/artifact/7RuaDnqyVTbFcgYRbBajXj) |

---

## 1. Visão

O Lunário é uma aplicação inspirada no almanaque *Borda d'Água* que junta num só sítio a informação prática do calendário rural português:

- fases da lua, nascer e pôr do sol;
- meteorologia local e estado do mar, com as marés;
- o que semear, transplantar, plantar e colher, por zona;
- santos do dia, festas móveis, feriados e ditados populares.

Destina-se a um **grupo pequeno de pessoas próximas** e não terá distribuição pública.

## 2. Âmbito

### 2.1 Dentro do âmbito
- Aplicação web instalável (PWA), com foco em Android.
- Funcionamento offline.
- Calendário agrícola por zona agroclimática.
- Registo pessoal da horta ("a minha horta").
- Lembretes regionais e pessoais, e alertas de geada.
- Ecrã Mar: marés, ondulação, vento, temperatura da água e avisos, para o porto mais próximo.

### 2.2 Fora do âmbito
| Item | Motivo |
|---|---|
| Feiras e mercados | Dados dinâmicos e dispersos, que obrigariam a backend e a curadoria contínua. Retirado. |
| App nativa iOS | Não é necessária para o público-alvo. |
| Publicação na Google Play | Não é necessária. Evita custos e burocracia. |
| Contas de utilizador | Desnecessárias para um grupo pequeno na v1. Em reavaliação (ver §8, Futuro). |
| Madeira e Açores | A v1 cobre só o continente. |

## 3. Requisitos funcionais

| ID | Requisito | Fase |
|---|---|---|
| RF-01 | Ecrã **Hoje**: fase da lua, nascer e pôr do sol, tempo, santo do dia, ditado e "esta quinzena podes semear…" | 1 |
| RF-02 | Fases da lua e nascer/pôr do sol calculados localmente, sem rede | 1 |
| RF-03 | Previsão meteorológica do IPMA para o local do utilizador, pedida diretamente pelo browser (ver D-17) | 1 |
| RF-04 | Determinação da zona agroclimática por GPS (local IPMA mais próximo → distrito → zona) ou por escolha manual | 1 |
| RF-05 | Calendário agrícola por cultura, zona e ação (sementeira em viveiro, sementeira direta, transplante, plantação, colheita) | 1 |
| RF-06 | Ficha de cada cultura: família, compasso, ciclo, notas e ilustração | 1 |
| RF-07 | Feriados nacionais, incluindo os móveis, calculados localmente | 1 |
| RF-08 | Santos do dia e ditados populares | 1 |
| RF-09 | Modo **Lua** opcional, com as regras lunares tradicionais e separado das janelas agronómicas | 2 |
| RF-10 | **A minha horta**: adicionar à horta o que se semeia, transplanta ou planta (cultura, ação, data); na app, "Adicionar à horta" e ver as datas previstas de transplante e de colheita, calculadas a partir da data e do ciclo da cultura (ver D-19) | 2 |
| RF-11 | Exportar e importar a horta em JSON (cópia de segurança) | 2 |
| RF-12 | Subscrição de um calendário `.ics` por zona com os lembretes quinzenais | 2 |
| RF-13 | Botão "Adicionar ao calendário" num registo da horta, que cria os eventos **transplante** (para sementeira em viveiro) e **início da colheita**, com alerta **5 dias antes às 13:00** por omissão, configurável (ver D-20) | 2 |
| RF-14 | Alertas de geada **para o local de cada utilizador**, por Web Push, a partir da previsão do Open-Meteo (temperatura do ar a 2 m e da superfície) (ver D-15, D-33) | 3 |
| RF-15 | Pedir armazenamento persistente (`navigator.storage.persist()`) e lembrar periodicamente a cópia de segurança da horta | 2 |
| RF-16 | Ao abrir a app, avisar se há risco de geada nos próximos dias para as culturas sensíveis que o utilizador tem na horta | 3 |
| RF-17 | Notificações push (opcionais) de risco de geada para as culturas que o utilizador tem na horta (ver D-21) | 3 |
| RF-18 | Ecrã **Mar**, entre o Céu e a Horta: **marés** do dia (preia-mar e baixa-mar, curva, vivas ou mortas) calculadas no dispositivo; **ondulação**, mar total, ondulação de fundo e **temperatura da água**; **vento** na costa; **próximos dias**; **avisos de agitação marítima** do IPMA. Para o **porto mais próximo** do local do utilizador, ou o escolhido nas Definições (ver D-34, D-35) | 4 |
| RF-19 | No ecrã **Céu**, as **estações**: a estação atual (desde quando e quanto já passou), o **próximo solstício ou equinócio** (data, hora, dias que faltam e duração do dia nesse dia, comparada com hoje) e os **quatro do ano**. Calculado no dispositivo com o `astronomy-engine` (D-22) | 4 |
| RF-20 | **Biblioteca**: o último separador (antes Culturas) junta as listas de consulta, com um seletor no topo. Tem as **Culturas** e os **Ditados**: todos os ditados por mês, a começar no mês atual (aberto) e a dar a volta ao ano, com o ditado de hoje marcado, com **pesquisa** (sem acentos, "S." lido como "São") e **filtro por tema** (D-36). Os **Santos**: todos por mês e dia, com pesquisa, filtro (de Portugal, populares, festas móveis) e o ditado do dia por baixo. Os **Feriados**: os nacionais do ano, com os móveis marcados, os passados esbatidos e o próximo assinalado, com setas para outros anos. As **Luas**: as fases da Lua do ano, com as luas azuis e os eclipses da Lua. O cartão Almanaque do Hoje liga aos ditados | 4 |
| RF-21 | Alertas de **agitação marítima** com a app fechada, por Web Push: os avisos do IPMA para o **distrito do porto** (o mais próximo ou o escolhido nas Definições), **laranja e vermelho** por omissão e **amarelo** se o utilizador quiser, **uma vez por aviso**, vistos às **8h, 12h, 16h e 20h** e nunca de noite. Liga-se no ecrã Alertas, ao lado da geada, e não envia a localização (ver D-37) | 5 |

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Custo zero** de infraestrutura (planos gratuitos da Cloudflare e do GitHub). |
| RNF-02 | **Offline-first**: todas as funcionalidades, exceto a meteorologia e os alertas, funcionam sem rede. |
| RNF-03 | Sem dados pessoais em servidores. A horta fica no dispositivo. Exceção opcional (RF-14, RF-17, RF-21): o servidor guarda só a subscrição push e a língua, mais, com os alertas de geada, o **local arredondado a ~1 km** e a lista de culturas sensíveis e, com os do mar, o **distrito do porto**; sem nome nem conta. Desligar um tipo de alerta apaga os seus dados; desligar todos apaga tudo. As notificações passam por uma fila da Cloudflare (subscrição e texto, apagados ao enviar, no máximo 24 h). Os registos do Worker só têm contagens. |
| RNF-04 | Uma só fonte de verdade para o catálogo (`/data`), da qual se gera tudo o resto. |
| RNF-05 | A agricultura lunar é apresentada como tradição e nunca como recomendação agronómica. |
| RNF-06 | Nenhum texto nem marca do *Borda d'Água* é reproduzido. Os factos agronómicos são compilados e redigidos de raiz. |
| RNF-07 | Todos os assets de terceiros ficam registados em `CREDITS.md` com a origem e a licença. |
| RNF-08 | Interface e catálogo **bilingues** (pt-PT por omissão, inglês). Nenhum texto visível fica fixo no código. |
| RNF-09 | Repositório **público**. Nenhum segredo no código: tokens só nos *secrets* do GitHub e da Cloudflare. |
| RNF-10 | Qualidade: GitHub Flow, Conventional Commits, testes com cobertura mínima de 80 % e CI obrigatória antes de cada merge (ver D-18). |

## 5. Arquitetura

### 5.1 Visão geral

Arquitetura **quase sem backend**: uma PWA estática e ficheiros gerados no build. O único
servidor é um Worker agendado com uma D1 mínima e uma fila, só para quem liga os alertas
de geada ou do mar (D-33, D-37); a horta nunca sai do dispositivo.

```
                ┌──────────────────────────────┐
                │  Repositório público (GitHub)│
                │  /data  →  build  →  /dist   │
                └──────┬────────────────┬──────┘
                       │ deploy (CI)    │ deploy (CI)
                       ▼                ▼
        ┌──────────────────────┐   ┌───────────────────────────┐
        │ Cloudflare Pages     │   │ Cloudflare Worker + D1    │
        │ PWA + catalog.json   │   │ cron 18:00: geada (Open-  │
        │ + zona-XX.ics        │   │ Meteo); 8/12/16/20h: mar  │
        └──────┬───────────────┘   │ (avisos IPMA) → fila      │
               │                   └─────────────┬─────────────┘
               │                                 ▼
     ┌─────────┴─────────┐          ┌───────────────────────────┐
     ▼                   ▼          │ Serviço de push (Web Push)│
┌──────────┐    ┌──────────────┐    │ → notificação no telemóvel│
│ PWA      │    │ Google       │    └───────────────────────────┘
│ telemóvel│    │ Calendar     │
│ IndexedDB│    │ (subscrição) │
└────┬─────┘    └──────────────┘
     │ previsão (pedido direto, CORS)
     ▼
┌────────────────────────┐
│ API IPMA · Open-Meteo  │
└────────────────────────┘
```

Quem liga os alertas, a PWA regista no Worker a subscrição push e a língua, mais o local
arredondado e as culturas sensíveis (geada) ou o distrito do porto (mar); ao desligar, o
registo é apagado (RNF-03).

### 5.2 Componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| PWA | React, TypeScript, Vite, `vite-plugin-pwa` (Workbox) | Interface, cálculos locais, cache offline |
| Astronomia | `astronomy-engine` (MIT) | Fases da lua, nascer/pôr do sol e da lua, estações, calculados no dispositivo (D-22) |
| Marés | Constantes harmónicas em `app/src/sea/tideConstants.json` (`npm run tides`) | Preia-mar e baixa-mar de cada porto, calculadas no dispositivo (D-34) |
| Armazenamento local | IndexedDB e `localStorage` | Horta do utilizador e preferências (local, porto, língua, modo Lua) |
| Catálogo | JSON gerado de `/data` | Culturas, janelas, zonas, regras lunares, santos, festas móveis, ditados |
| Calendários | `.ics` por zona, gerados no build | Lembretes quinzenais por subscrição |
| Alojamento | Cloudflare Pages | Entrega estática, HTTPS, cabeçalhos de segurança, pré-visualização por PR |
| Alertas | Cloudflare Worker (Cron Triggers) + D1 + Queues | Guardar as subscrições, ver a geada no local de cada uma (Open-Meteo) e os avisos de agitação marítima (IPMA), e enviar as notificações por uma fila (D-33, D-37) |
| Canal de alertas | Web Push (RFC 8291 e VAPID), `public/push-sw.js` | Notificação no telemóvel, mesmo com a app fechada |
| Meteorologia e mar | API pública do IPMA | Previsão diária, previsão do mar e avisos de agitação marítima |
| Geada e mar | API do Open-Meteo | Temperatura do ar a 2 m e da superfície; ondas, ondulação, água e vento, por coordenada |
| CI/CD | GitHub Actions | Verificação, deploy (Pages e Worker), versões e changelog |

### 5.3 Notificações

| Tipo | Mecanismo | Observações |
|---|---|---|
| Regional (quinzenal) | Subscrição de `zona-XX.ics` no calendário do telemóvel | O Google Calendar só atualiza subscrições de tempos a tempos, o que é aceitável para conteúdo quinzenal. |
| Pessoal (transplante e colheita) | Evento `.ics` gerado pela PWA com `VALARM` (5 dias antes, 13:00, configurável) | Fica no calendário do utilizador, sem servidor. Testado em Samsung (Android) e iPhone (Q-09). |
| Geada na minha horta (ao abrir) | A PWA consulta o Open-Meteo e cruza com as culturas sensíveis da horta (D-32) | Sem servidor; só funciona quando a app é aberta. |
| Geada no meu local (push) | Cloudflare Worker (cron às 18:00 UTC) → fila → Web Push | Opcional, liga-se no ecrã **Alertas** (sino no topo). O Worker guarda a subscrição, o local arredondado a ~1 km, as culturas sensíveis e a língua (D-33). Os Cron Triggers são gratuitos e não são desativados por inatividade. Testado no Firefox (PC e Android), com a app fechada; falta o iPhone. |
| Agitação marítima (push) | Cloudflare Worker (8h, 12h, 16h e 20h de Portugal) → fila → Web Push | Opcional, no mesmo ecrã **Alertas**. Avisos do IPMA para o distrito do porto, laranja e vermelho por omissão, uma vez por aviso (D-37). O envio pela fila ainda não foi visto num telemóvel real. |

## 6. Modelo de dados (catálogo)

```
Texto         { pt: string, en: string }          -- texto bilingue (ver D-13)

Zona          (id, nome: Texto, distritos[], clima, risco_geada)
Cultura       (id, nome: Texto, nome_cientifico, familia, parte_comestivel,
               classe_climatica, ciclo_dias_min, ciclo_dias_max,
               dias_ate_transplante_min?, dias_ate_transplante_max?,   -- só culturas SV
               sensivel_geada, compasso, notas: Texto)
Janela        (cultura_id, zona_id, acao, inicio_quinzena, fim_quinzena, origem,
               observacoes: Texto?)
RegraDerivacao(zona_id, classe_climatica, epoca, acao, ajuste_inicio, ajuste_fim,
               racional: Texto)
RegraLunar    (parte_comestivel, acao, fase_favoravel, justificacao: Texto)
Santo         (dia, mes, nome: Texto, origem)     -- origem: geral, portugal, popular
FestaMovel    (id, nome: Texto, dias_pascoa, origem)  -- data contada da Páscoa (D-38)
Ditado        (mes?, dia?, festa?, texto_pt, sentido_en, temas[])
                                                  -- o ditado fica em português;
                                                     em inglês mostra-se o sentido
```

- **Idiomas**: todo o texto do catálogo é guardado em `pt` e `en`. Os identificadores e
  enumerados (`familia`, `parte_comestivel`, `acao`, `clima`) são códigos traduzidos na UI.
  O build falha se faltar alguma tradução.

- **Quinzenas** são codificadas de 1 a 24 (Jan Q1 = 1 … Dez Q2 = 24). Uma janela pode atravessar a passagem de ano quando `fim < inicio`.
- **Ações**: `SV` sementeira em viveiro, `SD` sementeira direta, `TR` transplante, `PL` plantação, `CO` colheita.
- **Zonas (v1)**: Litoral Norte, Litoral Centro (base), Interior, Sul.
- **Janelas**: só o Litoral Centro é introduzido à mão. As restantes zonas derivam dele pelas `RegraDerivacao`.
- **Colheita** (D-19): não se guardam janelas `CO`. A colheita calcula-se a partir da janela de
  sementeira ou plantação mais `ciclo_dias_min`/`ciclo_dias_max`, no calendário regional e
  em cada plantio. O transplante de uma sementeira em viveiro usa `dias_ate_transplante_*`.

### Dados locais (dispositivo)
```
Plantio       (id, cultura_id, acao, data, estado, notas, updated_at)
Preferencias  (zona_id, concelho_id, modo_lua,
               lembrete_dias_antes = 5, lembrete_hora = "13:00", push_geada = false)
```

## 7. Estrutura do repositório

```
/app        PWA (React + Vite)
/art        gravuras (culturas, vinhetas) e fundos originais, com as fontes em SOURCES.md
/data       catálogo-fonte (CSV): culturas, janelas, zonas, regras, santos, festas móveis, ditados
/scripts    build: catalog.json, derivação de zonas, zona-XX.ics, constantes das marés
/public     ícones, _headers (Cloudflare Pages), push-sw.js
/worker     Cloudflare Worker: subscrições, D1, crons e fila dos alertas de geada e do mar (D-33, D-37)
/.github    workflows: ci, deploy, release; Dependabot; modelos de issue e PR
CREDITS.md  registo de assets, fontes de dados e licenças
```

## 8. Faseamento

| Fase | Entregável | Backend |
|---|---|---|
| **1** | PWA offline: ecrã Hoje, lua/sol, tempo IPMA, calendário agrícola, fichas de cultura, feriados, santos | Nenhum |
| **2** | A minha horta, modo Lua, calendários `.ics` regionais e pessoais, cópia de segurança (RF-15) | Nenhum |
| **3** | Aviso de geada ao abrir (RF-16) e alertas Web Push para o local de cada utilizador, com as culturas da horta (RF-14, RF-17, D-33) | Worker agendado + D1 mínima (subscrições push) |
| Futuro | Cópia da horta por código, se for preciso | Cloudflare Worker + D1 (ver D-16) |
| **4** | Estações no ecrã Céu (RF-19). Ecrã **Mar** (RF-18): marés calculadas no dispositivo, ondulação, vento, temperatura da água e avisos, para o porto mais próximo (D-34, D-35). **Biblioteca** com culturas, ditados, santos, feriados e luas (RF-20), e as festas móveis (D-38) | Nenhum |
| **5** | **Alertas de agitação marítima** por Web Push (RF-21, D-37), e o envio de todos os alertas (geada também) por uma fila, em lotes pequenos | Worker agendado + D1 + Queue (plano gratuito) |
| Futuro (ideia) | **Contas de utilizador** para guardar a horta e as definições e passá-las entre dispositivos. A avaliar: forma de entrar (e-mail com link, Google), privacidade/RGPD e relação com a cópia por código | Worker + D1 + autenticação |
| Futuro (ideia) | **Mais listas na Biblioteca** (RF-20): santos, feriados e fases da Lua do ano (com luas azuis e eclipses da Lua) feitos (2026-11-18); falta rever que outras listas merecem uma secção própria. Cada uma é mais uma entrada no seletor | Nenhum |
| Futuro (ideia) | **Feriados municipais**: o feriado do concelho de cada pessoa na prateleira Feriados (etiqueta "Municipal") e no cartão de feriados do Hoje, e uma lista de todos os concelhos com pesquisa. Dados: os 308 concelhos (278 no continente) com o seu feriado, fixo ou móvel (Ascensão, Segunda-feira de Páscoa…, contado a partir da Páscoa como em D-38); fonte provável a lista da Wikipedia (CC BY-SA, como `santos.csv`). Concelho: o da sede mais próxima pelo GPS, mudável nas Definições como o porto, sem nada no servidor | Nenhum |
| Futuro (ideia) | **Versão desktop/web larga**: a mesma app e o mesmo endereço, com outro layout a partir de uma largura mínima: o livro aberto em duas páginas lado a lado, com a lombada ao meio (a gravura de papel larga `page-1024` já existe). **Ordem proposta (2026-11-19):** 1) Biblioteca, com a lista à esquerda e a ficha à direita; 2) Horta, com os plantios à esquerda e o detalhe ou o formulário à direita; 3) Hoje, com par a definir (Céu ou Mar). As rotas no hash ficam iguais (D-26): `#/cultura/alface` abre só a ficha no telemóvel e a lista + a ficha no ecrã largo. **Quem já tem a app** recebe a versão nova pela atualização automática do service worker, sem reinstalar e com os dados intactos (sem mudar a base de dados). Abaixo do ponto de quebra nada muda. Não mexer no `name`, no `short_name` nem nos ícones do manifesto (no Android reemitem a app instalada), nem acrescentar `orientation`. **No computador:** instala-se pelo Chrome ou pelo Edge (janela própria) ou pelo Safari ("Adicionar à Dock"); o Firefox só a abre num separador. O GPS é estimado pelo Wi-Fi ou pelo IP (a lista manual resolve). A horta não passa do telemóvel sozinha (é preciso a cópia em JSON, D-28). Sem folha de partilha (a cópia é descarregada) e sem gestos (fica a barra de separadores, e talvez as setas do teclado). Juntar *hover* e foco visível. **A decidir:** quem usaria no computador e para quê; o ponto de quebra (proposta: ~64rem/1024 px, para nenhum telemóvel deitado, com 800–930 px, o apanhar; os tablets deitados ficam com o layout largo); a navegação (barra em baixo ou separadores laterais, como marcadores); que pares de páginas, além da Biblioteca e da Horta | Nenhum |
| Futuro (ideia) | **Flores e árvores**: alargar o catálogo para lá das hortícolas. **Flores** (anuais e vivazes de jardim e de vaso): janelas de sementeira e plantação por zona, meses de floração e sensibilidade à geada. **Árvores** (de fruto, e talvez ornamentais e florestais comuns): plantação em raiz nua no repouso do inverno, poda, enxertia e colheita, com a tradição lunar própria (podar e enxertar no minguante). Na Horta, um plantio de árvore não tem ciclo: dura anos e tem tarefas que se repetem todos os anos, como os perenes (morango, D-25). Fontes e licenças a registar no `CREDITS.md`. **A decidir:** quais espécies entram primeiro; se ficam na prateleira Culturas da Biblioteca ou em prateleiras próprias; que novos campos e ações (`florir`, `podar`, `enxertar`) entram no modelo de dados (§6) | Nenhum |

## 9. Registo de decisões

| ID | Decisão | Alternativas consideradas | Motivo |
|---|---|---|---|
| D-01 | **PWA** em vez de app nativa | React Native/Expo; Capacitor | Sem iOS nem Play Store. Uma só base de código, sem custos, e sem fricção de sideload (a verificação de programadores Android chega a nível global em 2027). Capacitor fica como saída se for preciso um APK. |
| D-02 | **Sem backend** na v1 | API .NET + BD | Grupo pequeno. Os lembretes resolvem-se com `.ics` e os alertas com um job agendado. |
| D-03 | **Sem contas** | Firebase Auth; Supabase Auth | Grupo pequeno e sem sincronização entre dispositivos. |
| D-04 | Catálogo **estático e versionado** no repositório | BD com backoffice | Os dados mudam pouco (cerca de uma vez por ano). Uma só fonte de verdade. |
| D-05 | **Calendário `.ics`** para lembretes | Web Push; notificações locais | A PWA não agenda notificações locais de forma fiável. O calendário é nativo, gratuito e universal. |
| D-06 | Alertas de geada via **GitHub Actions + ntfy/Telegram** | Web Push com backend | Custo zero e sem servidor. A latência de minutos é aceitável. **Substituída por D-15.** |
| D-07 | Calendário agrícola organizado por **quinzenas** e **zonas agroclimáticas** | Por mês; por concelho | Granularidade suficiente e manutenção viável. |
| D-08 | **Litoral Centro como base**; restantes zonas derivadas por regras | Introdução manual para as 4 zonas | Reduz 436 janelas para 93 introduzidas à mão, com regras auditáveis. |
| D-09 | Backend futuro em **.NET + Neon + Firebase Auth** em Azure Container Apps | Cloudflare Workers + D1; Supabase | Mantém a stack habitual dentro dos planos gratuitos. Só se o âmbito crescer. **Substituída por D-16.** |
| D-10 | Modo **Lua opcional** e separado | Integrado nas recomendações | Tradição sem suporte científico consistente. Não deve ser confundida com as janelas agronómicas. |
| D-11 | **Feiras e mercados** retirados | Backend com curadoria | Custo de manutenção desproporcionado. |
| D-12 | Nome **Lunário** | Lua e Leira, Alfobre, Folhinha, Quinzena | Referência ao *Lunário Perpétuo*. Tem tradição, é curto e não pertence a ninguém. |
| D-13 | **Catálogo bilingue** (pt/en) desde o início | Só pt-PT; traduzir mais tarde | Mais barato introduzir as duas línguas agora do que rever as 93 janelas e as fichas depois. Os ditados não se traduzem: mostra-se o sentido. |
| D-14 | Alojamento em **Cloudflare Pages**, com **repositório público** | GitHub Pages; Vercel; Netlify | Gratuito, largura de banda ilimitada, pré-visualização por PR, cabeçalhos próprios e Workers na mesma plataforma. O repositório é público por opção. |
| D-15 | Geada a partir do **Open-Meteo**, num **Cloudflare Worker** agendado | Avisos do IPMA; previsão do IPMA; cron no GitHub Actions | O IPMA não emite avisos de geada (só "Tempo Frio"), e a previsão diária cobre só 35 locais. O Open-Meteo dá a temperatura do ar e da superfície por coordenada, grátis para uso não comercial. Os Cron Triggers não são desativados por inatividade. |
| D-16 | Cópia da horta **sem backend** (armazenamento persistente + lembretes de exportação). Se for preciso, backend futuro em **Cloudflare Worker + D1** com um código de horta, sem contas | .NET + Neon + Firebase Auth; Supabase; Firebase | Tudo na mesma plataforma gratuita e sem contas. O Supabase pausa ao fim de 7 dias sem uso; a stack .NET tem mais peças. |
| D-17 | **IPMA pedido diretamente pelo browser** | Proxy num Worker | CORS verificado em 2026-11-15: previsão, locais e avisos respondem com `Access-Control-Allow-Origin: *`. |
| D-18 | **GitHub Flow**, Conventional Commits, **rebase merge** e SemVer com **release-please** | Git Flow; squash merge; versões à mão | Simples para um só mantenedor. O rebase mantém em `main` o histórico passo a passo; a CI valida todas as mensagens de commit do PR. O changelog e as versões são gerados a partir do histórico. |
| D-19 | Colheita **calculada** (sementeira/plantação + ciclo), sem janelas `CO` guardadas | Guardar janelas de colheita por zona | As colheitas derivadas no Interior saíam incoerentes com as sementeiras (ex.: pepino). O cálculo é coerente por construção e dá datas próprias a cada plantio. Resolve Q-01. |
| D-20 | Lembretes da horta: **transplante e início da colheita**, alerta **5 dias antes às 13:00**, configurável | Só colheita; início e fim da colheita | Cobre os momentos em que é preciso agir. A hora e a antecedência ficam nas preferências. |
| D-21 | Geada nos meus plantios: **aviso ao abrir a app** e **Web Push opcional** através do Worker | Só alertas por zona; só ao abrir | O aviso ao abrir não precisa de servidor. O push chega mesmo com a app fechada, à custa de guardar no Worker (D1) a subscrição, a zona e as culturas sensíveis, sem conta nem nome (RNF-03). **Precisada por D-33:** o local de cada utilizador em vez da zona. |
| D-22 | Astronomia com **`astronomy-engine`** | `suncalc`; algoritmos escritos de raiz | Precisão de segundos, licença MIT, sem dependências. Verificado contra o USNO (fases, nascer/pôr do sol e da lua, ±1,5 min). Os dias usam a hora de Portugal continental (`Europe/Lisbon`); até haver RF-04, as horas são para Coimbra. |
| D-23 | Localização: **botão GPS + lista manual** dos 24 locais IPMA do continente, guardada no dispositivo | Só lista; GPS automático ao abrir | Não pede permissões sem o utilizador querer. O GPS usa as coordenadas exatas para o sol e a lua e o local IPMA mais próximo para a previsão e o distrito. Por agora guardado em `localStorage`; passa para IndexedDB com a horta (RF-10). **Risco aceite:** as coordenadas exatas do GPS ficam guardadas sem cifra no dispositivo (alerta do CodeQL dispensado): nunca saem do telemóvel (RNF-03), a CSP bloqueia scripts de terceiros e cifrar não ajudaria, porque a chave ficaria na mesma origem. |
| D-24 | Previsão: **hoje + 4 dias** do IPMA, com a **última previsão guardada** e marcada "sem rede" quando não há ligação | Só hoje; nada sem rede | Mostra tudo o que a previsão diária do IPMA dá e funciona no campo. Atualiza ao mudar de local e no máximo de hora a hora. |
| D-25 | Catálogo em **CSV em `/data`**, validado e expandido no build para `catalog.json` | Continuar a editar na folha de cálculo; JSON | Edita-se em qualquer folha de cálculo e revê-se nos PR. O build valida tudo (inglês incluído), deriva as zonas (D-08), calcula as colheitas (D-19) e falha com a lista de erros. A folha v0.1 fica como arquivo; as suas janelas derivadas servem de teste. Culturas perenes (morango) guardam a colheita, porque não têm ciclo. Formato em `data/README.md`. |
| D-26 | Navegação por **rotas no hash** (`#/culturas`, `#/cultura/alface`), sem biblioteca de rotas | React Router; rotas por caminho | Sem dependências nem configuração no servidor, funciona offline pelo service worker e o botão "voltar" do telemóvel funciona. Chega para o número de ecrãs previsto. |
| D-27 | Horta em **IndexedDB** através do **`idb`** (base `lunario`, versão 1, `plantings`); pedido de armazenamento persistente no primeiro registo (RF-15) | IndexedDB direto; `localStorage`; Dexie | `idb` tem ~1 KB e só torna a API usável com promessas. Migrações explícitas por versão. A colheita prevista é a data + o ciclo (D-19); o transplante previsto espera pelo campo `dias_ate_transplante` (D-20). |
| D-38 | Festas móveis (Q-11): **8 festas contadas a partir da Páscoa** em `festas-moveis.csv` (Entrudo, Cinzas, Ramos, Sexta-feira Santa, Páscoa, Ascensão/Dia da Espiga à quinta-feira, Pentecostes, Corpo de Deus), mostradas com os santos do dia na sua data de cada ano, marcadas "Festa móvel". Os seus ditados ficam em `ditados.csv` com a coluna `festa` (sem mês nem dia): 10 ditados do **Wikiquote**, que aparecem no dia da festa como os de um santo e, na Biblioteca, no mês em que a festa cai nesse ano | Datas fixas aproximadas; deixar as festas de fora; ditados escritos de memória | As datas mudam todos os anos, por isso são calculadas (o mesmo cálculo da Páscoa dos feriados). Só entram ditados com fonte; Sexta-feira Santa, Pentecostes e Corpo de Deus ficam sem ditado próprio porque o Wikiquote não os tem. |
| D-37 | Alertas de agitação marítima (RF-21): o **mesmo Worker e a mesma subscrição** dos da geada, cada tipo ligado à parte. O Worker lê `warnings_www.json` do IPMA (**um só pedido** por verificação, seja qual for o número de subscritores) às **8h, 12h, 16h e 20h** de Portugal (cron nas duas horas UTC possíveis, fica a que é a hora local certa) e **nunca de noite**, nem para o vermelho. Avisa **laranja e vermelho** por omissão, amarelo só se pedido. **Uma vez por aviso**: guarda os avisos já vistos (área, nível, início, fim, sem nada dos subscritores) e um aviso não é novo se um já visto, da mesma área e de nível igual ou maior, se sobrepõe ou toca; um prolongamento ou um amarelo a seguir ao laranja não voltam a avisar, uma subida a vermelho avisa. Cada subscritor recebe só o aviso mais grave. Com só os alertas do mar, o servidor não tem a localização (só o distrito). **Envio por Cloudflare Queues**, também para a geada: no plano gratuito cada invocação tem 10 ms de CPU e 50 pedidos externos, e um push custa ~1,3 ms de CPU (medido), pelo que mais de ~7 alertas na mesma noite já passavam do limite; cada mensagem da fila leva 5 pushes e é enviada por uma invocação própria, sem novas tentativas (para ninguém receber o aviso duas vezes) | Ler os avisos a cada hora, também de noite; notificar o amarelo por omissão; chamar o próprio Worker por *service binding* para dividir os envios; plano pago (5 $/mês) | O amarelo é muito frequente no inverno e cansaria. Os limites de uma chamada ao próprio Worker não estão documentados; as Queues estão no plano gratuito (10 000 operações por dia, 3 por mensagem) e cada invocação tem limites próprios. Com 2000 subscritores (o máximo) são ~400 mensagens por envio, longe do limite. |
| D-36 | Biblioteca (RF-20): o separador **Culturas passa a Biblioteca**, com as secções num seletor no topo (`#/culturas`, `#/ditados`; `#/biblioteca` abre as culturas). Os ditados têm **um ou dois temas** na coluna `temas` de `data/ditados.csv`: tempo, Lua e Sol (`ceu`), horta e lavoura, cereais e pão (`searas`), vinha e vinho, animais, santos e festas | Um sexto separador; a biblioteca só a partir do cartão do Hoje ou das Definições; um tema por ditado; temas tirados de palavras-chave | A barra já tem cinco separadores e não cabe outro no telemóvel; juntar as listas de consulta num só sítio deixa espaço para santos e feriados. Com dois temas, "Em fevereiro chuva, em agosto uva" aparece tanto no tempo como na vinha. Os temas foram atribuídos à mão em 2026-11-18. |
| D-35 | **Portos** comuns a toda a app (`app/src/coast/ports.ts`): **16 pontos costeiros** de Viana do Castelo a Vila Real de Santo António, cada um com o ponto IPMA de mar e a área de aviso do seu distrito. O porto é o **mais próximo** do local do utilizador, **mesmo no interior**; pode escolher-se outro nas **Definições** (só a escolha fica guardada no dispositivo, e "automático" é a ausência dela). O ecrã mostra a distância ao porto | Só os 7 pontos do IPMA; esconder o Mar longe da costa; escolha obrigatória | Os 7 pontos do IPMA são poucos para as marés, que mudam ao longo da costa (a preia-mar em Viana é ~40 min mais tarde do que em Faro). Mostrar sempre o mais próximo é simples e serve quem vai à praia mais perto. |
| D-34 | Ecrã Mar (RF-18): **marés por constantes harmónicas** (21 componentes, correções nodais), calculadas no dispositivo e sem rede, com as constantes de cada porto em `app/src/sea/tideConstants.json`, geradas por `npm run tides` e guardadas no repositório. **Cascais e Lagos** usam o seu marégrafo (IOC/VLIZ, 2025). Os **outros portos** usam o nível do mar do **Open-Meteo**, corrigido pelos marégrafos de Vigo, Cascais, Lagos e Huelva (amplitude e fase por componente, interpoladas ao longo da costa). Alturas acima da **maré astronómica mais baixa** em 19 anos, como zero hidrográfico aproximado (1,8–1,95 m abaixo do nível médio). **Vivas e mortas** pela fase da Lua, com 1,5 dias de atraso, e a amplitude do dia ao lado. Previsão do mar do **IPMA** (3 dias, 7 pontos costeiros) e do **Open-Meteo** (ondas, ondulação de fundo, água e vento hora a hora, 7 dias), mais os **avisos de agitação marítima** do IPMA, pedidos pelo browser, guardados para quando não há rede e atualizados no máximo de hora a hora, como em D-24 | Open-Meteo `sea_level_height_msl` direto; tabelas do Instituto Hidrográfico; API paga de marés; só IPMA | Validado em 2026-11-18: o Open-Meteo dá a forma certa da maré mas chega **~30 min adiantado**, com um desvio quase igual em toda a costa (fase semidiurna +15–17°, amplitude ±2%). As constantes do marégrafo de Cascais, testadas fora do ano ajustado (out./nov. 2026), acertam as horas a **3–6 min** e as alturas a **4–6 cm**. Prevendo Cascais e Lagos só com os outros marégrafos, a M2 acerta a ~1 min e ~1 cm. As tabelas do IH não têm dados abertos, e no norte não há marégrafos portugueses com dados abertos. Os dados IOC são só para **uso não comercial**, como o Open-Meteo. O zero calculado fica ~10–20 cm abaixo do das tabelas do IH, o que se aceitou. Não serve para navegação, e a app di-lo. |
| D-33 | Alertas de geada com a app fechada (RF-14, RF-17): **só Web Push**, para o **local de cada utilizador** arredondado a **0,01° (~1 km)**, em vez de pontos por zona. Um **Cloudflare Worker** guarda as subscrições numa **D1** e, todos os dias às **18:00 UTC**, pede ao Open-Meteo a previsão de cada local distinto (vários num pedido) e avisa quem tem risco **na noite seguinte (18:00–10:00)**, com os limiares de D-32 e as culturas sensíveis da horta. Cifra RFC 8291 (`aes128gcm`) e VAPID RFC 8292, aceites por todos os serviços de push, incluindo a Apple. Subscrições rejeitadas pelo serviço de push (404/410) são apagadas. Na app, liga-se no ecrã **Alertas** (sino no topo, para receber outros alertas no futuro), com o texto do que é enviado; volta a enviar só quando mudam o local, as culturas, a língua ou a subscrição. No iPhone só funciona com a app adicionada ao ecrã principal (iOS 16.4 ou mais recente) | Pontos fixos por zona (3 por zona); ntfy; Telegram; cifra antiga `aesgcm` | O alerta coincide com o cartão da app. Desaparece o problema do Algarve na zona Sul (Q-02) e não há pontos para manter. Para a família são poucas dezenas de pedidos por dia, longe do limite gratuito. Em troca, o Worker guarda um local aproximado (RNF-03). |
| D-32 | Aviso de geada ao abrir (RF-16): a app pede ao **Open-Meteo** a temperatura **horária do ar a 2 m e da superfície** para o local do utilizador (coordenadas **arredondadas a 0,01°**, ~1 km), para **hoje e os 4 dias seguintes**, e usa o **mínimo de cada dia**. Limiares de Q-07: **superfície ≤ 0 °C → geada**, **ar ≤ 3 °C → geada possível**. O cartão só aparece se houver risco, fica no topo do ecrã Hoje e nomeia as culturas **sensíveis à geada** (`sensivel_geada` em `culturas.csv`) com plantios ativos. Previsão guardada para usar sem rede, renovada no máximo de hora a hora | Aviso só por zona (Worker); previsão diária do IPMA (`tMin`); mostrar o cartão sempre | Não precisa de servidor (D-21). A temperatura da superfície apanha a geada de radiação que a do ar não mostra. Arredondar as coordenadas chega para a previsão e envia menos detalhe a terceiros (RNF-03). Mostra-se como risco e não como certeza. |
| D-31 | Santos e ditados (RF-08): santos do **Calendário Romano Geral** + calendário próprio de **Portugal** + **devoções populares** ligadas ao campo (Santo Amaro, Santo Isidro Lavrador, Santa Bárbara, Santa Marinha, São Mamede…); **sem santo** nos dias que estas fontes não cobrem (154). Ditados escolhidos do **Wikiquote**, agrícolas e do tempo: os de um santo aparecem no seu dia, os restantes rodam pelo mês e mudam de ano para ano. `santos.csv` e `ditados.csv` em **CC BY-SA 4.0**, com crédito no cartão | Preencher os dias vazios com o Wikidata; só fontes em domínio público (Rolland 1780, Delicado 1651) | O Wikidata falhou santos essenciais (Santo António, São Martinho) e trouxe nomes estranhos. As fontes antigas exigem transcrever e atualizar a ortografia. A partilha nos mesmos termos aplica-se só a esses dois ficheiros. |
| D-30 | Calendários regionais: **um `.ics` por zona e por língua** (`/calendarios/zona-lc.ics`, `zona-lc.en.ics`…), gerados no build a partir do catálogo, com **um evento de dia inteiro no 1.º dia de cada quinzena** do ano corrente e do seguinte, sem alarme; subscrição pelo **link `cid` do Google Calendar**, por `webcal:` ou copiando o endereço | Eventos de 15 dias; alarme no feed; um só feed bilingue | Mesmo conteúdo do cartão "Esta quinzena", sem servidor (RNF-01). Um evento curto não ocupa o calendário a quinzena inteira. O Google ignora alarmes de calendários subscritos. O link `cid` foi o que funcionou nos testes Q-09 (B2); cada deploy renova as datas e os `UID` estáveis atualizam os eventos. |
| D-29 | Modo Lua: **desligado por omissão**, interruptor no cartão da Lua, guardado no dispositivo; períodos tradicionais de **fase principal a fase principal** (lua nova, quarto crescente, lua cheia, quarto minguante) | Ligado por omissão; períodos pelo ângulo de fase | Segue a convenção dos almanaques. Mostra-se sempre com a nota de tradição sem suporte científico (RNF-05) e nunca mistura com as janelas agronómicas (D-10). |
| D-28 | Cópia da horta em **ficheiro JSON** (`lunario-backup` v1), partilhado pela folha de partilha do telemóvel ou descarregado; importação **junta** (por id, ganha a versão mais recente); **lembrete mensal** só se houve alterações | Substituir ao importar; lembrete a cada N alterações; só descarregar | Funciona sem servidor (D-16) e vai direto para o Drive, WhatsApp ou email. Juntar nunca perde dados e importar duas vezes o mesmo ficheiro não muda nada. Registos danificados são ignorados e contados. A base de dados passa à versão 2 (`meta`: última cópia, adiamento do lembrete). |

## 10. Assets e identidade visual

| Tipo | Fonte | Licença |
|---|---|---|
| Dados meteorológicos e do mar | IPMA (previsão, mar, avisos); Open-Meteo (geada, mar, vento); marégrafos IOC/VLIZ (marés) | Atribuição obrigatória; Open-Meteo CC BY 4.0 e IOC/VLIZ só para uso não comercial |
| Ilustrações botânicas | Biodiversity Heritage Library, Rawpixel (Public Domain), Wikimedia Commons | Domínio público / CC0 |
| Ícones de tempo e lua | Meteocons (Bas Milius) ou Weather Icons (Erik Flowers) | MIT / SIL OFL |
| Ícones de interface | Lucide ou Phosphor | ISC / MIT |
| Ícones de hortícolas | Fluent Emoji (Microsoft) | MIT |
| Tipografia (títulos) | IM Fell English, Libre Baskerville ou Old Standard TT | SIL OFL |
| Tipografia (texto) | Inter ou Source Sans 3 | SIL OFL |
| Texturas | Papel envelhecido, Rawpixel | CC0 |

Regras: evitar CC BY-SA em assets centrais e não usar nada marcado "free for personal use".

### 10.1 Ideias visuais para rever

Propostas durante o refresh visual (2026-11-17). **Todas feitas (2026-11-18)**; ficam aqui
como registo do que se pediu:

| Ideia | Notas |
|---|---|
| Vinheta no ecrã **Céu** | Gravura antiga da Lua ou de um céu estrelado, em domínio público, no mesmo papel rasgado das fichas de cultura, ao lado do título. |
| **Estados vazios** ilustrados | Por exemplo, a horta sem registos: uma gravura grande e esbatida (regador, enxada) com o texto "Ainda não há nada na horta". |
| Página **Sobre** nas Definições | Créditos visíveis na app: gravuras (Vilmorin-Andrieux, Britton & Brown), IPMA, Open-Meteo, Wikipedia/Wikiquote, ícones e tipografia, a partir de `CREDITS.md`. |
| **Gestos** para mudar de separador, como as páginas de um livro | Arrastar para o lado passa de Hoje → Céu → Horta → Culturas e para trás. Só nos quatro separadores principais: as páginas secundárias (Definições, Alertas, ficha de cultura) não reagem ao gesto. A considerar: não chocar com o gesto "voltar" do Android e do iOS junto às margens do ecrã nem com zonas que deslizam na horizontal; animação de virar a página, desligada com `prefers-reduced-motion`; a barra de separadores continua a ser a forma principal (acessibilidade). |
| **Títulos** maiores e com mais peso | Os títulos dos ecrãs (Hoje, Céu, A minha horta, Culturas…) e os nomes das culturas na ficha devem ser maiores e mais fortes. |
| **Calendário** da ficha de cultura mais legível | As iniciais dos meses (J F M A…) são pouco explícitas: usar abreviaturas (jan, fev, mar…) ou outra forma clara. A quinzena atual deve destacar-se mais. |
| Trocar a gravura da **ervilha** e dos **coentros** | A ervilha só mostra duas vagens e fica fina em miniatura; os coentros vêm de outra obra. Procurar gravuras com a planta inteira e do mesmo traço (Biodiversity Heritage Library no Flickr, confirmando a licença de cada uma). |
| **Receber no calendário** no ecrã Hoje com ar de opção | Hoje é só uma linha de texto e nem se percebe que é clicável. Deve parecer uma ação (ícone de calendário, sublinhado ou botão discreto), sem ganhar demasiado destaque no ecrã. |
| **Adicionar à horta** numa janela | Em vez de o formulário se expandir no sítio, abrir numa janela por cima (pop-up ou folha que sobe do fundo do ecrã). |

## 11. Questões em aberto

| # | Questão | Notas |
|---|---|---|
| ~~Q-01~~ | ~~Guardar janelas de colheita ou calculá-las?~~ | **Resolvida por D-19** (calcular). |
| Q-02 | Dividir a zona **Sul** em Alentejo e Algarve? | Os invernos são muito diferentes. Só afeta o calendário de sementeiras: os alertas de geada usam o local de cada pessoa (D-33). |
| Q-03 | Validar o calendário base contra fontes oficiais (DRAP, AGROBIO) | O dataset v0.1 foi compilado a partir de conhecimento geral de horticultura. |
| Q-04 | Janelas de culturas marginais no Interior (melão, melancia, beringela) | São de uma quinzena. Por agora marcadas "só com estufa/túnel ou variedade precoce" em `data/avisos-zona.csv` (também a batata-doce). Falta decidir se se ajustam à mão. |
| ~~Q-05~~ | ~~Canal de alertas: **ntfy** ou **Telegram**?~~ | **Resolvida por D-33:** só Web Push, sem nada para instalar além da app. |
| Q-06 | Mapeamento concelho → zona | A app já guarda o local IPMA mais próximo (24 pontos no continente) e o seu distrito (D-23). A tabela distrito → zona está em `data/zonas.csv` e o cartão "Esta quinzena" já a usa. Refinar os casos de fronteira (por exemplo, Aveiro interior). |
| ~~Q-07~~ | ~~Limiares e pontos da geada~~ | **Resolvida:** limiares de D-32 (superfície ≤ 0 °C → geada; ar a 2 m ≤ 3 °C → geada possível), a validar este inverno. Os pontos por zona deixaram de ser precisos: cada alerta usa o local do utilizador (D-33). A lista `sensivel_geada` foi revista e confirmada em 2026-11-16. |
| Q-08 | Notificações da horta: o que fazer quando um registo da horta muda depois de exportado para o calendário? | Eventos, antecedência e geada resolvidos por D-20 e D-21. Falta decidir entre aviso manual ("atualiza o calendário") e um **calendário pessoal por subscrição** servido pelo Worker. |
| ~~Q-09~~ | ~~Os `.ics` funcionam nos telemóveis do grupo?~~ | **Resolvida (2026-11-19):** a subscrição dos calendários regionais (RF-12) e os eventos da horta (RF-13) funcionam sem problemas em telemóveis Samsung (Android) e em iPhones. A página de teste temporária `/teste-calendario/` foi retirada. |
| ~~Q-10~~ | ~~Regras de derivação que geram janelas incoerentes~~ | **Resolvida (2026-11-16):** janelas escritas à mão em `data/janelas-zona.csv`, que substituem as derivadas dessa cultura, zona e ação. Interior: couve-tronchuda viveiro jun Q1→ago Q1 e transplante jul Q2→set Q2; brócolo viveiro mai Q2→jul Q2 e transplante jul Q1→set Q1. Sul: cebola com um só viveiro, out Q1→jan Q2. O build já não dá avisos. |
| ~~Q-12~~ | ~~Validar `dias_ate_transplante`~~ | **Resolvida (2026-11-16):** os valores das 18 culturas com viveiro foram revistos e confirmados. |
| ~~Q-11~~ | ~~Santos do dia e ditados (RF-08)~~ | **Resolvida (2026-11-18):** feito com D-31 (236 santos em 212 dias e 153 ditados, revistos em 2026-11-16; os 154 dias sem santo ficam sem santo) e, para as festas móveis, com D-38. |

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados agronómicos incorretos | Médio | Validar Q-03; marcar a origem de cada janela (manual/derivada). |
| Alterações na API do IPMA | Médio | Isolar o acesso num módulo; cache da última previsão. |
| Open-Meteo mudar os termos ou os limites | Baixo | Isolar o acesso num módulo; recurso ao `tMin` do IPMA. |
| Previsão falhar a geada em vales e baixas | Médio | Limiares conservadores; apresentar como "risco de geada" e não como certeza. |
| Google Calendar (Android) não importar `.ics` | Baixo | Testado em Samsung e iPhone e funciona (Q-09). Se um telemóvel falhar: link "adicionar evento" do Google Calendar ou lembretes por Web Push. |
| Perda dos dados da horta no telemóvel | Médio | Armazenamento persistente, lembretes de exportação (RF-15) e, se for preciso, cópia por código (D-16). |
| Limites dos planos gratuitos mudarem | Baixo | Arquitetura estática quase sem dependências. |
