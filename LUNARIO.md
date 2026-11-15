# Lunário — Requisitos, Arquitetura e Decisões

| | |
|---|---|
| **Estado** | Rascunho v0.2 |
| **Data** | 2026-11-15 |
| **Autor** | Pedro Rino |
| **Dataset** | [Almanaque — Dataset do calendário agrícola v0.1](https://claude.ai/artifact/7RuaDnqyVTbFcgYRbBajXj) |

---

## 1. Visão

O Lunário é uma aplicação inspirada no almanaque *Borda d'Água* que junta num só sítio a informação prática do calendário rural português:

- fases da lua, nascer e pôr do sol;
- meteorologia local;
- o que semear, transplantar, plantar e colher, por zona;
- santos do dia, feriados e ditados populares.

Destina-se a um **grupo pequeno de pessoas próximas** e não terá distribuição pública.

## 2. Âmbito

### 2.1 Dentro do âmbito
- Aplicação web instalável (PWA), com foco em Android.
- Funcionamento offline.
- Calendário agrícola por zona agroclimática.
- Registo pessoal da horta ("a minha horta").
- Lembretes regionais e pessoais, e alertas de geada.

### 2.2 Fora do âmbito
| Item | Motivo |
|---|---|
| Feiras e mercados | Dados dinâmicos e dispersos, que obrigariam a backend e a curadoria contínua. Retirado. |
| App nativa iOS | Não é necessária para o público-alvo. |
| Publicação na Google Play | Não é necessária. Evita custos e burocracia. |
| Contas de utilizador | Desnecessárias para um grupo pequeno. |
| Marés | Exigem uma fonte paga ou harmónicas por porto. Fica para avaliar mais tarde. |
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
| RF-10 | **A minha horta**: registar plantios (cultura, ação, data) e ver as datas previstas de transplante e de colheita, calculadas a partir da data e do ciclo da cultura (ver D-19) | 2 |
| RF-11 | Exportar e importar a horta em JSON (cópia de segurança) | 2 |
| RF-12 | Subscrição de um calendário `.ics` por zona com os lembretes quinzenais | 2 |
| RF-13 | Botão "Adicionar ao calendário" num plantio, que cria os eventos **transplante** (para sementeira em viveiro) e **início da colheita**, com alerta **5 dias antes às 13:00** por omissão, configurável (ver D-20) | 2 |
| RF-14 | Alertas de geada por zona, a partir da previsão do Open-Meteo (temperatura do ar a 2 m e da superfície) (ver D-15) | 3 |
| RF-15 | Pedir armazenamento persistente (`navigator.storage.persist()`) e lembrar periodicamente a cópia de segurança da horta | 2 |
| RF-16 | Ao abrir a app, avisar se há risco de geada nos próximos dias para os plantios sensíveis do utilizador | 3 |
| RF-17 | Notificações push (opcionais) de risco de geada para as culturas que o utilizador tem na horta (ver D-21) | 3 |

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Custo zero** de infraestrutura (planos gratuitos da Cloudflare e do GitHub). |
| RNF-02 | **Offline-first**: todas as funcionalidades, exceto a meteorologia e os alertas, funcionam sem rede. |
| RNF-03 | Sem dados pessoais em servidores. A horta fica no dispositivo. Exceção opcional (RF-17): o servidor guarda só a subscrição push, a zona e a lista de culturas sensíveis, sem nome nem conta, e apaga tudo quando o utilizador desativa as notificações. |
| RNF-04 | Uma só fonte de verdade para o catálogo (`/data`), da qual se gera tudo o resto. |
| RNF-05 | A agricultura lunar é apresentada como tradição e nunca como recomendação agronómica. |
| RNF-06 | Nenhum texto nem marca do *Borda d'Água* é reproduzido. Os factos agronómicos são compilados e redigidos de raiz. |
| RNF-07 | Todos os assets de terceiros ficam registados em `CREDITS.md` com a origem e a licença. |
| RNF-08 | Interface e catálogo **bilingues** (pt-PT por omissão, inglês). Nenhum texto visível fica fixo no código. |
| RNF-09 | Repositório **público**. Nenhum segredo no código: tokens só nos *secrets* do GitHub e da Cloudflare. |
| RNF-10 | Qualidade: GitHub Flow, Conventional Commits, testes com cobertura mínima de 80 % e CI obrigatória antes de cada merge (ver D-18). |

## 5. Arquitetura

### 5.1 Visão geral

Arquitetura **sem backend com dados**: uma PWA estática, ficheiros gerados no build e um
Worker agendado sem base de dados.

```
                ┌──────────────────────────────┐
                │  Repositório público (GitHub)│
                │  /data  →  build  →  /dist   │
                └──────┬────────────────┬──────┘
                       │ deploy (CI)    │ deploy (CI)
                       ▼                ▼
        ┌──────────────────────┐   ┌───────────────────────┐
        │ Cloudflare Pages     │   │ Cloudflare Worker     │
        │ PWA + catalog.json   │   │ cron: Open-Meteo →    │
        │ + zona-XX.ics        │   │ geada por zona?       │
        └──────┬───────────────┘   └──────────┬────────────┘
               │                              ▼
     ┌─────────┴─────────┐          ┌────────────────────┐
     ▼                   ▼          │ ntfy / Telegram    │
┌──────────┐    ┌──────────────┐    │ (push ao grupo)    │
│ PWA      │    │ Google       │    └────────────────────┘
│ telemóvel│    │ Calendar     │
│ IndexedDB│    │ (subscrição) │
└────┬─────┘    └──────────────┘
     │ previsão (pedido direto, CORS)
     ▼
┌────────────────────────┐
│ API IPMA · Open-Meteo  │
└────────────────────────┘
```

### 5.2 Componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| PWA | React, TypeScript, Vite, `vite-plugin-pwa` (Workbox) | Interface, cálculos locais, cache offline |
| Armazenamento local | IndexedDB | Horta do utilizador e preferências (zona) |
| Catálogo | JSON gerado de `/data` | Culturas, janelas, zonas, regras lunares, santos, ditados |
| Calendários | `.ics` por zona, gerados no build | Lembretes quinzenais por subscrição |
| Alojamento | Cloudflare Pages | Entrega estática, HTTPS, cabeçalhos de segurança, pré-visualização por PR |
| Job de avisos | Cloudflare Worker (Cron Trigger) | Ler a previsão do Open-Meteo para os pontos de cada zona e notificar geada |
| Canal de alertas | ntfy ou bot de Telegram | Push para o grupo |
| Meteorologia | API pública do IPMA | Previsão diária mostrada na app |
| Geada | API do Open-Meteo | Temperatura do ar a 2 m e da superfície, por coordenada |
| CI/CD | GitHub Actions | Verificação, deploy (Pages e Worker), versões e changelog |

### 5.3 Notificações

| Tipo | Mecanismo | Observações |
|---|---|---|
| Regional (quinzenal) | Subscrição de `zona-XX.ics` no calendário do telemóvel | O Google Calendar só atualiza subscrições de tempos a tempos, o que é aceitável para conteúdo quinzenal. |
| Pessoal (transplante e colheita) | Evento `.ics` gerado pela PWA com `VALARM` (5 dias antes, 13:00, configurável) | Fica no calendário do utilizador, sem servidor. **A validar no Google Calendar para Android (Q-09).** |
| Alerta de geada (zona) | Cloudflare Worker (cron) → ntfy/Telegram | Os Cron Triggers são gratuitos e, ao contrário dos agendamentos do GitHub Actions, não são desativados por inatividade. |
| Geada nos meus plantios (ao abrir) | A PWA consulta o Open-Meteo e cruza com os plantios sensíveis | Sem servidor; só funciona quando a app é aberta. |
| Geada nos meus plantios (push) | Cloudflare Worker (cron) → Web Push | Opcional. O Worker guarda a subscrição, a zona e as culturas sensíveis (D-21). |

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
Santo         (dia, mes, nome: Texto)
Ditado        (mes?, texto_pt, sentido_en)        -- o ditado fica em português;
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
/data       catálogo-fonte (CSV/JSON): culturas, janelas, zonas, regras, santos, ditados
/scripts    build: catalog.json, derivação de zonas, zona-XX.ics
/public     ícones, ilustrações, fontes, _headers (Cloudflare Pages)
/worker     Cloudflare Worker: alertas de geada e Web Push (fase 3)
/.github    workflows: ci, deploy, release; Dependabot; modelos de issue e PR
CREDITS.md  registo de assets, fontes de dados e licenças
```

## 8. Faseamento

| Fase | Entregável | Backend |
|---|---|---|
| **1** | PWA offline: ecrã Hoje, lua/sol, tempo IPMA, calendário agrícola, fichas de cultura, feriados, santos | Nenhum |
| **2** | A minha horta, modo Lua, calendários `.ics` regionais e pessoais, cópia de segurança (RF-15) | Nenhum |
| **3** | Alertas de geada por zona (ntfy/Telegram), aviso ao abrir (RF-16) e push para os meus plantios (RF-17) | Worker agendado + D1 mínima (subscrições push) |
| Futuro | Cópia da horta por código, se for preciso | Cloudflare Worker + D1 (ver D-16) |

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
| D-21 | Geada nos meus plantios: **aviso ao abrir a app** e **Web Push opcional** através do Worker | Só alertas por zona; só ao abrir | O aviso ao abrir não precisa de servidor. O push chega mesmo com a app fechada, à custa de guardar no Worker (D1) a subscrição, a zona e as culturas sensíveis, sem conta nem nome (RNF-03). |

## 10. Assets e identidade visual

| Tipo | Fonte | Licença |
|---|---|---|
| Dados meteorológicos | IPMA (previsão); Open-Meteo (geada) | Atribuição obrigatória; Open-Meteo CC BY 4.0, uso não comercial |
| Ilustrações botânicas | Biodiversity Heritage Library, Rawpixel (Public Domain), Wikimedia Commons | Domínio público / CC0 |
| Ícones de tempo e lua | Meteocons (Bas Milius) ou Weather Icons (Erik Flowers) | MIT / SIL OFL |
| Ícones de interface | Lucide ou Phosphor | ISC / MIT |
| Ícones de hortícolas | Fluent Emoji (Microsoft) | MIT |
| Tipografia (títulos) | IM Fell English, Libre Baskerville ou Old Standard TT | SIL OFL |
| Tipografia (texto) | Inter ou Source Sans 3 | SIL OFL |
| Texturas | Papel envelhecido, Rawpixel | CC0 |

Regras: evitar CC BY-SA em assets centrais e não usar nada marcado "free for personal use".

## 11. Questões em aberto

| # | Questão | Notas |
|---|---|---|
| ~~Q-01~~ | ~~Guardar janelas de colheita ou calculá-las?~~ | **Resolvida por D-19** (calcular). |
| Q-02 | Dividir a zona **Sul** em Alentejo e Algarve? | Os invernos são muito diferentes. |
| Q-03 | Validar o calendário base contra fontes oficiais (DRAP, AGROBIO) | O dataset v0.1 foi compilado a partir de conhecimento geral de horticultura. |
| Q-04 | Janelas de culturas marginais no Interior (melão, melancia, beringela) | São de uma quinzena. Introduzir à mão ou marcar "só com proteção". |
| Q-05 | Canal de alertas: **ntfy** ou **Telegram**? | Depende do que o grupo prefere instalar. |
| Q-06 | Mapeamento concelho → zona | A v1 usa o local IPMA mais próximo (35 pontos, com coordenadas) e o seu distrito. Refinar os casos de fronteira (por exemplo, Aveiro interior). |
| Q-07 | Limiares e pontos da geada | Proposta: superfície ≤ 0 °C → geada; ar a 2 m ≤ 3 °C → geada possível. Escolher 2 a 3 pontos representativos por zona, incluindo zonas baixas. |
| Q-08 | Notificações da horta: o que fazer quando um plantio muda depois de exportado para o calendário? | Eventos, antecedência e geada resolvidos por D-20 e D-21. Falta decidir entre aviso manual ("atualiza o calendário") e um **calendário pessoal por subscrição** servido pelo Worker. |
| Q-09 | Os `.ics` funcionam nos telemóveis do grupo? | A maioria usa Google Calendar em Android, que pode não abrir ficheiros `.ics` nem permitir subscrever na app. Testar antes da fase 2 e rever RF-12/RF-13 conforme o resultado. |

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados agronómicos incorretos | Médio | Validar Q-03; marcar a origem de cada janela (manual/derivada). |
| Alterações na API do IPMA | Médio | Isolar o acesso num módulo; cache da última previsão. |
| Open-Meteo mudar os termos ou os limites | Baixo | Isolar o acesso num módulo; recurso ao `tMin` do IPMA. |
| Previsão falhar a geada em vales e baixas | Médio | Limiares conservadores; apresentar como "risco de geada" e não como certeza. |
| Google Calendar (Android) não importar `.ics` | Alto | Testar cedo (Q-09); alternativa: link "adicionar evento" do Google Calendar ou lembretes por Web Push. |
| Perda dos dados da horta no telemóvel | Médio | Armazenamento persistente, lembretes de exportação (RF-15) e, se for preciso, cópia por código (D-16). |
| Limites dos planos gratuitos mudarem | Baixo | Arquitetura estática quase sem dependências. |
