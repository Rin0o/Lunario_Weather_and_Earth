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
| Contas de utilizador | Desnecessárias para um grupo pequeno na v1. Em reavaliação (ver §8, Futuro). |
| Marés | Exigem uma fonte paga ou harmónicas por porto. Em reavaliação como parte de um ecrã Mar (ver §8, Futuro). |
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

## 4. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | **Custo zero** de infraestrutura (planos gratuitos da Cloudflare e do GitHub). |
| RNF-02 | **Offline-first**: todas as funcionalidades, exceto a meteorologia e os alertas, funcionam sem rede. |
| RNF-03 | Sem dados pessoais em servidores. A horta fica no dispositivo. Exceção opcional (RF-14, RF-17): o servidor guarda só a subscrição push, o **local arredondado a ~1 km**, a lista de culturas sensíveis e a língua, sem nome nem conta, e apaga tudo quando o utilizador desativa os avisos. Os registos do Worker só têm contagens. |
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
servidor é um Worker agendado com uma D1 mínima, só para quem liga os alertas de geada
(D-33); a horta nunca sai do dispositivo.

```
                ┌──────────────────────────────┐
                │  Repositório público (GitHub)│
                │  /data  →  build  →  /dist   │
                └──────┬────────────────┬──────┘
                       │ deploy (CI)    │ deploy (CI)
                       ▼                ▼
        ┌──────────────────────┐   ┌───────────────────────────┐
        │ Cloudflare Pages     │   │ Cloudflare Worker + D1    │
        │ PWA + catalog.json   │   │ cron 18:00: Open-Meteo →  │
        │ + zona-XX.ics        │   │ geada em cada local?      │
        └──────┬───────────────┘   └─────────────┬─────────────┘
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

Quem liga os alertas, a PWA regista no Worker a subscrição push, o local arredondado, as
culturas sensíveis e a língua; ao desligar, o registo é apagado.

### 5.2 Componentes

| Componente | Tecnologia | Responsabilidade |
|---|---|---|
| PWA | React, TypeScript, Vite, `vite-plugin-pwa` (Workbox) | Interface, cálculos locais, cache offline |
| Astronomia | `astronomy-engine` (MIT) | Fases da lua, nascer/pôr do sol e da lua, calculados no dispositivo (D-22) |
| Armazenamento local | IndexedDB | Horta do utilizador e preferências (zona) |
| Catálogo | JSON gerado de `/data` | Culturas, janelas, zonas, regras lunares, santos, ditados |
| Calendários | `.ics` por zona, gerados no build | Lembretes quinzenais por subscrição |
| Alojamento | Cloudflare Pages | Entrega estática, HTTPS, cabeçalhos de segurança, pré-visualização por PR |
| Alertas de geada | Cloudflare Worker (Cron Trigger) + D1 | Guardar as subscrições, ler a previsão do Open-Meteo para o local de cada uma e notificar geada (D-33) |
| Canal de alertas | Web Push (RFC 8291 e VAPID), `public/push-sw.js` | Notificação no telemóvel, mesmo com a app fechada |
| Meteorologia | API pública do IPMA | Previsão diária mostrada na app |
| Geada | API do Open-Meteo | Temperatura do ar a 2 m e da superfície, por coordenada |
| CI/CD | GitHub Actions | Verificação, deploy (Pages e Worker), versões e changelog |

### 5.3 Notificações

| Tipo | Mecanismo | Observações |
|---|---|---|
| Regional (quinzenal) | Subscrição de `zona-XX.ics` no calendário do telemóvel | O Google Calendar só atualiza subscrições de tempos a tempos, o que é aceitável para conteúdo quinzenal. |
| Pessoal (transplante e colheita) | Evento `.ics` gerado pela PWA com `VALARM` (5 dias antes, 13:00, configurável) | Fica no calendário do utilizador, sem servidor. **A validar no Google Calendar para Android (Q-09).** |
| Geada na minha horta (ao abrir) | A PWA consulta o Open-Meteo e cruza com as culturas sensíveis da horta (D-32) | Sem servidor; só funciona quando a app é aberta. |
| Geada no meu local (push) | Cloudflare Worker (cron às 18:00 UTC) → Web Push | Opcional, liga-se no ecrã **Alertas** (sino no topo). O Worker guarda a subscrição, o local arredondado a ~1 km, as culturas sensíveis e a língua (D-33). Os Cron Triggers são gratuitos e não são desativados por inatividade. Testado no Firefox (PC e Android), com a app fechada; falta o iPhone. |

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
/worker     Cloudflare Worker: subscrições, D1 e cron dos alertas de geada (D-33)
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
| Futuro (ideia) | Ecrã **Mar**: marés, vento, ondulação (altura, período, direção), temperatura da água. A avaliar: fontes (IPMA, Open-Meteo Marine, harmónicas por porto) e escolha do porto mais próximo | A definir |
| Futuro (ideia) | **Contas de utilizador** para guardar a horta e as definições e passá-las entre dispositivos. A avaliar: forma de entrar (e-mail com link, Google), privacidade/RGPD e relação com a cópia por código | Worker + D1 + autenticação |

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
| D-33 | Alertas de geada com a app fechada (RF-14, RF-17): **só Web Push**, para o **local de cada utilizador** arredondado a **0,01° (~1 km)**, em vez de pontos por zona. Um **Cloudflare Worker** guarda as subscrições numa **D1** e, todos os dias às **18:00 UTC**, pede ao Open-Meteo a previsão de cada local distinto (vários num pedido) e avisa quem tem risco **na noite seguinte (18:00–10:00)**, com os limiares de D-32 e as culturas sensíveis da horta. Cifra RFC 8291 (`aes128gcm`) e VAPID RFC 8292, aceites por todos os serviços de push, incluindo a Apple. Subscrições rejeitadas pelo serviço de push (404/410) são apagadas. Na app, liga-se no ecrã **Alertas** (sino no topo, para receber outros alertas no futuro), com o texto do que é enviado; volta a enviar só quando mudam o local, as culturas, a língua ou a subscrição. No iPhone só funciona com a app adicionada ao ecrã principal (iOS 16.4 ou mais recente) | Pontos fixos por zona (3 por zona); ntfy; Telegram; cifra antiga `aesgcm` | O alerta coincide com o cartão da app. Desaparece o problema do Algarve na zona Sul (Q-02) e não há pontos para manter. Para a família são poucas dezenas de pedidos por dia, longe do limite gratuito. Em troca, o Worker guarda um local aproximado (RNF-03). |
| D-32 | Aviso de geada ao abrir (RF-16): a app pede ao **Open-Meteo** a temperatura **horária do ar a 2 m e da superfície** para o local do utilizador (coordenadas **arredondadas a 0,01°**, ~1 km), para **hoje e os 4 dias seguintes**, e usa o **mínimo de cada dia**. Limiares de Q-07: **superfície ≤ 0 °C → geada**, **ar ≤ 3 °C → geada possível**. O cartão só aparece se houver risco, fica no topo do ecrã Hoje e nomeia as culturas **sensíveis à geada** (`sensivel_geada` em `culturas.csv`) com plantios ativos. Previsão guardada para usar sem rede, renovada no máximo de hora a hora | Aviso só por zona (Worker); previsão diária do IPMA (`tMin`); mostrar o cartão sempre | Não precisa de servidor (D-21). A temperatura da superfície apanha a geada de radiação que a do ar não mostra. Arredondar as coordenadas chega para a previsão e envia menos detalhe a terceiros (RNF-03). Mostra-se como risco e não como certeza. |
| D-31 | Santos e ditados (RF-08): santos do **Calendário Romano Geral** + calendário próprio de **Portugal** + **devoções populares** ligadas ao campo (Santo Amaro, Santo Isidro Lavrador, Santa Bárbara, Santa Marinha, São Mamede…); **sem santo** nos dias que estas fontes não cobrem (154). Ditados escolhidos do **Wikiquote**, agrícolas e do tempo: os de um santo aparecem no seu dia, os restantes rodam pelo mês e mudam de ano para ano. `santos.csv` e `ditados.csv` em **CC BY-SA 4.0**, com crédito no cartão | Preencher os dias vazios com o Wikidata; só fontes em domínio público (Rolland 1780, Delicado 1651) | O Wikidata falhou santos essenciais (Santo António, São Martinho) e trouxe nomes estranhos. As fontes antigas exigem transcrever e atualizar a ortografia. A partilha nos mesmos termos aplica-se só a esses dois ficheiros. |
| D-30 | Calendários regionais: **um `.ics` por zona e por língua** (`/calendarios/zona-lc.ics`, `zona-lc.en.ics`…), gerados no build a partir do catálogo, com **um evento de dia inteiro no 1.º dia de cada quinzena** do ano corrente e do seguinte, sem alarme; subscrição pelo **link `cid` do Google Calendar**, por `webcal:` ou copiando o endereço | Eventos de 15 dias; alarme no feed; um só feed bilingue | Mesmo conteúdo do cartão "Esta quinzena", sem servidor (RNF-01). Um evento curto não ocupa o calendário a quinzena inteira. O Google ignora alarmes de calendários subscritos. O link `cid` foi o que funcionou nos testes Q-09 (B2); cada deploy renova as datas e os `UID` estáveis atualizam os eventos. |
| D-29 | Modo Lua: **desligado por omissão**, interruptor no cartão da Lua, guardado no dispositivo; períodos tradicionais de **fase principal a fase principal** (lua nova, quarto crescente, lua cheia, quarto minguante) | Ligado por omissão; períodos pelo ângulo de fase | Segue a convenção dos almanaques. Mostra-se sempre com a nota de tradição sem suporte científico (RNF-05) e nunca mistura com as janelas agronómicas (D-10). |
| D-28 | Cópia da horta em **ficheiro JSON** (`lunario-backup` v1), partilhado pela folha de partilha do telemóvel ou descarregado; importação **junta** (por id, ganha a versão mais recente); **lembrete mensal** só se houve alterações | Substituir ao importar; lembrete a cada N alterações; só descarregar | Funciona sem servidor (D-16) e vai direto para o Drive, WhatsApp ou email. Juntar nunca perde dados e importar duas vezes o mesmo ficheiro não muda nada. Registos danificados são ignorados e contados. A base de dados passa à versão 2 (`meta`: última cópia, adiamento do lembrete). |

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

### 10.1 Ideias visuais para rever

Propostas durante o refresh visual (2026-11-17), ainda por decidir:

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
| Q-09 | Os `.ics` funcionam nos telemóveis do grupo? | A maioria usa Google Calendar em Android, que pode não abrir ficheiros `.ics` nem permitir subscrever na app. Testar antes da fase 2 e rever RF-12/RF-13 conforme o resultado. Página de teste: `/teste-calendario/` (temporária). |
| ~~Q-10~~ | ~~Regras de derivação que geram janelas incoerentes~~ | **Resolvida (2026-11-16):** janelas escritas à mão em `data/janelas-zona.csv`, que substituem as derivadas dessa cultura, zona e ação. Interior: couve-tronchuda viveiro jun Q1→ago Q1 e transplante jul Q2→set Q2; brócolo viveiro mai Q2→jul Q2 e transplante jul Q1→set Q1. Sul: cebola com um só viveiro, out Q1→jan Q2. O build já não dá avisos. |
| ~~Q-12~~ | ~~Validar `dias_ate_transplante`~~ | **Resolvida (2026-11-16):** os valores das 18 culturas com viveiro foram revistos e confirmados. |
| Q-11 | Santos do dia e ditados (RF-08) | Feito com D-31: 236 santos em 212 dias e 153 ditados. Santos populares e ditados revistos e confirmados em 2026-11-16. Os 154 dias sem santo **ficam sem santo** (decidido em 2026-11-16): não se preenchem com o Martirológio Romano. Falta só decidir se entram festas móveis (Páscoa, Ascensão, Corpo de Deus) com os seus ditados. |

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
