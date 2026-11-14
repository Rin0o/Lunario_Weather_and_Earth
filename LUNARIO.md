# Lunário — Requisitos, Arquitetura e Decisões

| | |
|---|---|
| **Estado** | Rascunho v0.1 |
| **Data** | 2026-11-14 |
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
| RF-03 | Previsão meteorológica do IPMA para o local do utilizador | 1 |
| RF-04 | Determinação da zona agroclimática por GPS (concelho → zona) ou por escolha manual | 1 |
| RF-05 | Calendário agrícola por cultura, zona e ação (sementeira em viveiro, sementeira direta, transplante, plantação, colheita) | 1 |
| RF-06 | Ficha de cada cultura: família, compasso, ciclo, notas e ilustração | 1 |
| RF-07 | Feriados nacionais, incluindo os móveis, calculados localmente | 1 |
| RF-08 | Santos do dia e ditados populares | 1 |
| RF-09 | Modo **Lua** opcional, com as regras lunares tradicionais e separado das janelas agronómicas | 2 |
| RF-10 | **A minha horta**: registar plantios (cultura, ação, data) e ver a previsão de colheita | 2 |
| RF-11 | Exportar e importar a horta em JSON (cópia de segurança) | 2 |
| RF-12 | Subscrição de um calendário `.ics` por zona com os lembretes quinzenais | 2 |
| RF-13 | Botão "Adicionar ao calendário" num plantio, que gera um `.ics` com alerta de colheita | 2 |
| RF-14 | Alertas de geada por zona, a partir dos avisos do IPMA | 3 |

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Custo zero** de infraestrutura. |
| RNF-02 | **Offline-first**: todas as funcionalidades, exceto a meteorologia e os alertas, funcionam sem rede. |
| RNF-03 | Sem dados pessoais em servidores. A horta fica só no dispositivo. |
| RNF-04 | Uma só fonte de verdade para o catálogo (`/data`), da qual se gera tudo o resto. |
| RNF-05 | A agricultura lunar é apresentada como tradição e nunca como recomendação agronómica. |
| RNF-06 | Nenhum texto nem marca do *Borda d'Água* é reproduzido. Os factos agronómicos são compilados e redigidos de raiz. |
| RNF-07 | Todos os assets de terceiros ficam registados em `CREDITS.md` com a origem e a licença. |

## 5. Arquitetura

### 5.1 Visão geral

Arquitetura **sem backend**: uma PWA estática, ficheiros gerados no build e um job agendado.

```
                ┌─────────────────────────────┐
                │  Repositório (GitHub)        │
                │  /data  →  build  →  /dist   │
                └──────┬───────────────┬───────┘
                       │ deploy        │ cron horário
                       ▼               ▼
        ┌──────────────────────┐   ┌──────────────────────┐
        │ Cloudflare Pages     │   │ GitHub Action         │
        │ PWA + catalog.json   │   │ avisos IPMA → geada?  │
        │ + zona-XX.ics        │   └──────────┬───────────┘
        └──────┬───────────────┘              │
               │                              ▼
     ┌─────────┴─────────┐          ┌────────────────────┐
     ▼                   ▼          │ ntfy / Telegram    │
┌──────────┐    ┌──────────────┐    │ (push ao grupo)    │
│ PWA      │    │ Google       │    └────────────────────┘
│ telemóvel│    │ Calendar     │
│ IndexedDB│    │ (subscrição) │
└────┬─────┘    └──────────────┘
     │ previsão
     ▼
┌──────────┐
│ API IPMA │
└──────────┘
```

### 5.2 Componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| PWA | React, TypeScript, Vite, `vite-plugin-pwa` (Workbox) | Interface, cálculos locais, cache offline |
| Armazenamento local | IndexedDB | Horta do utilizador e preferências (zona) |
| Catálogo | JSON gerado de `/data` | Culturas, janelas, zonas, regras lunares, santos, ditados |
| Calendários | `.ics` por zona, gerados no build | Lembretes quinzenais por subscrição |
| Alojamento | Cloudflare Pages (ou GitHub Pages) | Entrega estática e HTTPS |
| Job de avisos | GitHub Actions (cron horário) | Ler os avisos do IPMA e notificar geada |
| Canal de alertas | ntfy ou bot de Telegram | Push para o grupo |
| Meteorologia | API pública do IPMA | Previsão diária e avisos |

### 5.3 Notificações

| Tipo | Mecanismo | Observações |
|---|---|---|
| Regional (quinzenal) | Subscrição de `zona-XX.ics` no calendário do telemóvel | O Google Calendar só atualiza subscrições de tempos a tempos, o que é aceitável para conteúdo quinzenal. |
| Pessoal (colheita) | Evento `.ics` gerado pela PWA com `VALARM` | Fica no calendário do utilizador, sem servidor. |
| Alerta de geada | GitHub Action → ntfy/Telegram | Os agendamentos podem atrasar alguns minutos. Num repositório público, são desativados ao fim de 60 dias sem atividade. |

## 6. Modelo de dados (catálogo)

```
Zona          (id, nome, distritos[], clima, risco_geada)
Cultura       (id, nome, nome_cientifico, familia, parte_comestivel,
               classe_climatica, ciclo_dias_min, ciclo_dias_max, compasso, notas)
Janela        (cultura_id, zona_id, acao, inicio_quinzena, fim_quinzena, origem, observacoes)
RegraDerivacao(zona_id, classe_climatica, epoca, acao, ajuste_inicio, ajuste_fim, racional)
RegraLunar    (parte_comestivel, acao, fase_favoravel, justificacao)
Santo         (dia, mes, nome)
Ditado        (mes?, texto)
```

- **Quinzenas** são codificadas de 1 a 24 (Jan Q1 = 1 … Dez Q2 = 24). Uma janela pode atravessar a passagem de ano quando `fim < inicio`.
- **Ações**: `SV` sementeira em viveiro, `SD` sementeira direta, `TR` transplante, `PL` plantação, `CO` colheita.
- **Zonas (v1)**: Litoral Norte, Litoral Centro (base), Interior, Sul.
- **Janelas**: só o Litoral Centro é introduzido à mão. As restantes zonas derivam dele pelas `RegraDerivacao`.

### Dados locais (dispositivo)
```
Plantio       (id, cultura_id, acao, data, estado, notas, updated_at)
Preferencias  (zona_id, concelho_id, modo_lua)
```

## 7. Estrutura do repositório

```
/app        PWA (React + Vite)
/data       catálogo-fonte (CSV/JSON): culturas, janelas, zonas, regras, santos, ditados
/scripts    build: catalog.json, derivação de zonas, zona-XX.ics
/public     ícones, ilustrações, fontes
/.github    workflows: deploy, avisos-ipma (cron)
CREDITS.md  registo de assets e licenças
```

## 8. Faseamento

| Fase | Entregável | Backend |
|---|---|---|
| **1** | PWA offline: ecrã Hoje, lua/sol, tempo IPMA, calendário agrícola, fichas de cultura, feriados, santos | Nenhum |
| **2** | A minha horta, modo Lua, calendários `.ics` regionais e pessoais | Nenhum |
| **3** | Alertas de geada (GitHub Action + ntfy/Telegram) | Nenhum (job agendado) |
| Futuro | Sincronização entre dispositivos e Web Push na PWA, se o grupo crescer | .NET + Neon + Firebase Auth (ver D-09) |

## 9. Registo de decisões

| ID | Decisão | Alternativas consideradas | Motivo |
|---|---|---|---|
| D-01 | **PWA** em vez de app nativa | React Native/Expo; Capacitor | Sem iOS nem Play Store. Uma só base de código, sem custos, e sem fricção de sideload (a verificação de programadores Android chega a nível global em 2027). Capacitor fica como saída se for preciso um APK. |
| D-02 | **Sem backend** na v1 | API .NET + BD | Grupo pequeno. Os lembretes resolvem-se com `.ics` e os alertas com um job agendado. |
| D-03 | **Sem contas** | Firebase Auth; Supabase Auth | Grupo pequeno e sem sincronização entre dispositivos. |
| D-04 | Catálogo **estático e versionado** no repositório | BD com backoffice | Os dados mudam pouco (cerca de uma vez por ano). Uma só fonte de verdade. |
| D-05 | **Calendário `.ics`** para lembretes | Web Push; notificações locais | A PWA não agenda notificações locais de forma fiável. O calendário é nativo, gratuito e universal. |
| D-06 | Alertas de geada via **GitHub Actions + ntfy/Telegram** | Web Push com backend | Custo zero e sem servidor. A latência de minutos é aceitável. |
| D-07 | Calendário agrícola organizado por **quinzenas** e **zonas agroclimáticas** | Por mês; por concelho | Granularidade suficiente e manutenção viável. |
| D-08 | **Litoral Centro como base**; restantes zonas derivadas por regras | Introdução manual para as 4 zonas | Reduz 436 janelas para 93 introduzidas à mão, com regras auditáveis. |
| D-09 | Backend futuro em **.NET + Neon + Firebase Auth** em Azure Container Apps | Cloudflare Workers + D1; Supabase | Mantém a stack habitual dentro dos planos gratuitos. Só se o âmbito crescer. |
| D-10 | Modo **Lua opcional** e separado | Integrado nas recomendações | Tradição sem suporte científico consistente. Não deve ser confundida com as janelas agronómicas. |
| D-11 | **Feiras e mercados** retirados | Backend com curadoria | Custo de manutenção desproporcionado. |
| D-12 | Nome **Lunário** | Lua e Leira, Alfobre, Folhinha, Quinzena | Referência ao *Lunário Perpétuo*. Tem tradição, é curto e não pertence a ninguém. |

## 10. Assets e identidade visual

| Tipo | Fonte | Licença |
|---|---|---|
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
| Q-01 | Guardar janelas de **colheita** ou calculá-las a partir de `sementeira + ciclo`? | As colheitas derivadas no Interior saem incoerentes com as sementeiras (por exemplo, o pepino). A recomendação é calcular. |
| Q-02 | Dividir a zona **Sul** em Alentejo e Algarve? | Os invernos são muito diferentes. |
| Q-03 | Validar o calendário base contra fontes oficiais (DRAP, AGROBIO) | O dataset v0.1 foi compilado a partir de conhecimento geral de horticultura. |
| Q-04 | Janelas de culturas marginais no Interior (melão, melancia, beringela) | São de uma quinzena. Introduzir à mão ou marcar "só com proteção". |
| Q-05 | Canal de alertas: **ntfy** ou **Telegram**? | Depende do que o grupo prefere instalar. |
| Q-06 | Mapeamento concelho → zona | A v1 usa o distrito. Refinar os casos de fronteira (por exemplo, Aveiro interior). |

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Dados agronómicos incorretos | Médio | Validar Q-03; marcar a origem de cada janela (manual/derivada). |
| Alterações na API do IPMA | Médio | Isolar o acesso num módulo; cache da última previsão. |
| GitHub Actions desativado por inatividade | Baixo | Repositório privado ou commits periódicos. |
| Limites dos planos gratuitos mudarem | Baixo | Arquitetura estática quase sem dependências. |
