# DataGap Gold Coast — Session Summary (2026-07-18)

Resumo desta conversa para dar contexto a uma nova sessão. Cobre tudo que foi
discutido, construído, testado e revertido hoje. O `PROJECT_OVERVIEW.md` e o
`README.md` continuam sendo a documentação "oficial" do projeto — este arquivo
é só o histórico de decisões desta sessão específica.

## Estado atual do app (o que está no ar agora)

**Map layers visíveis:**
- Flood risk (2024, ArcGIS, ao vivo)
- Electrical switchboards (todos os 4.119, ao vivo, sem filtro — voltou ao
  original após um rollback, ver abaixo). Toggle "Show only High/Very High risk"
  disponível.

**Ocultos via flags reversíveis** (não deletados, só escondidos — ver
`src/data/densityColors.js`):
- `SHOW_ZONING = false` — camada de zoneamento
- `SHOW_HISTORICAL = false` — camada de development approvals
- `SHOW_CROSS_ANALYSIS = false` — accordion "Cross-analysis by suburb"
- `SHOW_CITY_INDICATORS = false` — accordion "City indicators"

Para reativar qualquer um, é só virar a flag para `true` — os dados por trás
continuam sendo buscados normalmente (não foram desligados), porque o painel
"Data sources" ainda depende deles.

**Seção "Analysis" (nessa ordem):**
1. **Storm Watch** — cruza previsão de chuva (Open-Meteo, ao vivo) com flood
   risk histórico; mostra alerta quando um suburb tem chuva forte prevista
   (≥60% chance ou ≥10mm nas próximas 48h) E risco Alto/Muito Alto.
2. **Priority action list** — rankeia suburbs por `switchboards críticos × score
   de flood risk`. "Crítico" = switchboard trifásico + de propriedade do GCCC
   (a única combinação de campos que o dataset realmente sustenta).

**Data sources** (todas com botão "View call" mostrando URL/params/resposta real):
- Development approvals (Supabase, 2012-2016, congelado — tese central do app)
- Flood risk (ArcGIS, 2024, ao vivo)
- Electrical switchboards (ArcGIS, ao vivo)
- Rain forecast (Open-Meteo, **marcado como fonte externa** — não é uma das
  duas fontes oficiais que o resto do app usa)

## Coisas construídas e mantidas

- **[src/lib/arcgis.js](src/lib/arcgis.js)** — corrigido um bug real de
  paginação: `fetchAllFeatures` checava `features.length < 2000` pra decidir
  se parava, mas o serviço de Switchboard limita a 732/página — isso teria
  truncado silenciosamente 82% dos dados. Corrigido para usar
  `properties.exceededTransferLimit`.
- **[src/lib/weather.js](src/lib/weather.js)** — `fetchRainForecast()`, busca
  os 80 suburbs num único request batched pra Open-Meteo.
- **[src/hooks/useSwitchboards.js](src/hooks/useSwitchboards.js)**,
  **[useRainForecast.js](src/hooks/useRainForecast.js)**
- **[src/components/StormWatch.jsx](src/components/StormWatch.jsx)**,
  **[PriorityActions.jsx](src/components/PriorityActions.jsx)**

## Coisas exploradas e descartadas (não estão no código)

- **Flood Risk Overlay 2026** (`Image_Service/Flood_Risk_Overlay_2026`,
  ImageServer) — é um raster mais atualizado, mas os valores de pixel (1-5)
  não têm tradução oficial pra categoria (nem `rasterAttributeTable` nem
  `legend` têm nome, só número). Decisão: manter o dataset 2024 (FeatureServer,
  já vem com o nome da categoria pronto). Se algum dia a tradução oficial for
  publicada, vale revisitar.
- **Zonas de frequência de enchente** (`Insurance_Flood_Event_2026`, layers
  69/70/71/67/68 — Frequent 20%, Infrequent 5%, Infrequent 1%, Rare 0.2%,
  Extremely rare 0.05%) — dado real, polígonos verificados, join espacial
  funcionando (177/664 switchboards testados caíam dentro de alguma zona).
  Foi implementado e depois **revertido a pedido do usuário** junto com o item
  abaixo.
- **Área de cobertura por Voronoi ("range")** — para cada switchboard, uma
  célula de Voronoi (polígono da área mais próxima daquele switchboard do que
  de qualquer outro) usada como proxy geométrico de "quem depende dele". Não é
  a área elétrica real (isso não existe em nenhum dataset público — campos como
  `TRAFFIC_CONTROL`, `GENSET_CONNECTION`, `CURRENT_RATING` estão vazios em
  todos os 4.119 registros, verificado via API). Implementado com
  `d3-delaunay`, desenhado como polígonos reais no mapa. **Revertido** —
  usuário não gostou do resultado.
- **Filtro de switchboards "Large" + últimos 5 anos** (`SIZE_M='LARGE' AND
  GIS_STARTUP_DATE >= ...`) — campos reais e verificados (`SIZE_M` tem domínio
  Large/Medium/Small/TBA, 458 Large no total; `GIS_STARTUP_DATE` populado em
  4.115/4.119 registros). Foi implementado junto com o Voronoi e **revertido
  na mesma leva** — o pedido do usuário foi "voltar tudo, sem filtro nenhum".
- **Dependências instaladas e depois desinstaladas**: `d3-delaunay`,
  `@turf/boolean-point-in-polygon`, `@turf/helpers` (só serviam pro Voronoi/
  spatial join revertidos).
- **Dado de população/densidade** — não existe em nenhum dos dois portais
  oficiais (só um relatório estadual genérico, sem granularidade por região).
  Por isso "pessoas afetadas" nunca foi implementado — não há como sustentar
  esse número com dado real.

## Coisas discutidas mas não construídas (ideias em aberto)

- **Desafio #5 do hackathon (FirstWave, Disaster Resilience)** — exige usar
  NMIS ou Open-AudIT (ferramentas de rede open-source da FirstWave) + dados
  abertos. Foi discutido como possível segunda submissão (paralela ao DataGap),
  usando o padrão de flood risk × infraestrutura elétrica já construído aqui.
  Não avançou porque não há acesso a uma instância de NMIS/Open-AudIT pra
  integrar de verdade — só consigo construir a análise de dados, não a parte
  que usa a ferramenta da FirstWave propriamente.
- **Card de consulta por suburb pra comunidade** ("minha região corre risco, o
  que eu faço?") — ideia discutida, não implementada.
- **Sistema de alerta por email/SMS de verdade** — descartado por enquanto,
  porque exigiria reabrir a decisão de "sem caminho de escrita no app" (seria
  preciso guardar contatos) e infraestrutura de envio, que estão fora do
  escopo atual.

## Achados de dado importantes (para não re-investigar do zero)

- `development_applications`: congelado desde 2016/2017 na fonte original —
  é a tese central do projeto, não um bug.
- Switchboard `GIS_OWNER`: só `GCCC` ou vazio (não há outros valores).
- Switchboard `CLASS`: `THREE-PHASE` ou `SINGLE-PHASE`.
- Switchboard `SIZE_M`: domínio real `LARGE`/`MEDIUM`/`SMALL`/`TBA` — existe e
  está populado, mesmo não estando em uso no código agora.
- Switchboard `GIS_STARTUP_DATE`: campo real de data de instalação, populado
  quase por completo — existe e está disponível, mesmo não estando em uso
  agora.
- Nenhum dos dois portais oficiais (ArcGIS Gold Coast, data.qld.gov.au) tem:
  dado de energia/outage em tempo real, dado de chuva/previsão do tempo, dado
  de população/densidade por área.

## Referência rápida de arquivos

```
src/
  App.jsx                      # orquestra hooks + layersOn + footer
  data/densityColors.js        # cores + todas as flags SHOW_*
  lib/
    arcgis.js                  # fetchZoning, fetchFloodRiskBySuburb, fetchSwitchboards, normalizeSuburb, nearestSuburb
    weather.js                 # fetchRainForecast (Open-Meteo)
  hooks/
    useZoning.js, useHistorical.js, useFloodRisk.js, useSuburbs.js, useSuburbZoning.js
    useSwitchboards.js, useRainForecast.js
  components/
    MapView.jsx, Sidebar.jsx, CrossView.jsx
    StormWatch.jsx, PriorityActions.jsx      # novos hoje
    ApiInspector.jsx
```
