# Data Gap — Project Presentation

## TL;DR
O projeto evidencia uma lacuna de dados públicos ("data gap") na disponibilidade e atualidade de registros de aprovações de desenvolvimento, e demonstra como essa lacuna afeta a avaliação de risco de inundações e planejamento de resposta. Fornecemos uma ferramenta interativa que combina fontes recentes (inundações, infraestrutura) com o histórico estático de aprovações para estimar exposição e impacto.

## Problema que estamos resolvendo
- Existe um conjunto relevante de decisões e riscos urbanos (novas aprovações de desenvolvimento) que não é disponibilizado como feed atualizado.
- O dataset de "Development approvals" disponível é estático (2012–2016) e não foi atualizado, criando um gap temporal que reduz a confiança nas análises territoriais.
- Sem dados atualizados, gestores públicos têm dificuldade em priorizar intervenções, planejar contingência e comunicar exposição a riscos (ex.: inundações).

## Quem é afetado
- Gestores e planejadores municipais que precisam priorizar recursos e infraestrutura.
- Serviços de emergência e operadores que planejam contingência (por exemplo, prioridade de restabelecimento de energia).
- Comunidade local e stakeholders (residentes, empresas) expostos a riscos sem transparência adequada.

## Como estamos resolvendo (visão geral)
- Agregamos três camadas complementares:
  1. Flood risk (modelo 2024) — fonte viva, ArcGIS
  2. Electrical switchboards — infraestrutura operacional (ArcGIS)
  3. Historical development approvals (2012–2016) — Supabase (estático)
- Construímos uma interface interativa (mapa + painéis) que:
  - Simula eventos de perda de energia por severidade/hora.
  - Estima impacto econômico por hora (pessoas afetadas × custo por domicílio), agora mostrando valores em A$ completos (ex.: A$2,300).
  - Lista instalações comunitárias afetadas e prioriza ações.
  - Expõe proveniência e limitações dos dados no painel "Data sources".

## Componentes chave do produto
- Mapa interativo com círculos indicativos por switchboard (S/M/L).
- Painel `Grid status` com: online/offline, área afetada (km²), pessoas afetadas e impacto econômico (por hora).
- Modal de "Impact estimate" com tabela/visualização por suburb e curva de dano ao longo do tempo.
- Sidebar → "Data sources" que documenta quais camadas são vivas e quais são estáticas (removemos a exibição do item de Development approvals conforme solicitado).
- Inspector de API para reproduzir chamadas e demonstrar proveniência dos dados.

## Dados e suposições
- População: ABS Census 2021 QuickStats (por suburb).
- Custo por domicílio: AER Value of Customer Reliability (usado para estimativa econômica).
- Aprovações de desenvolvimento: extração 2012–2016 (supabase) — estático; explicitar que esse layer não é atualizado.
- Assunções: população distribuída uniformemente entre switchboards do mesmo suburb; footprints são indicativos (são círculos), áreas podem sobrepor.

## Benefícios e impacto esperado
- Dá a gestores uma visão acionável e visual da exposição em eventos de perda de energia relacionada a inundações.
- Torna explícitas limitações dos dados, permitindo decisões informadas e pedidos de atualização de datasets.
- Facilita priorização de resposta (quais subúrbios e instalações priorizar).

## Recomendação de slides (5–7 slides)
1. Título + contexto (o que é a "data gap")
2. Problema e quem é afetado (impacto nos gestores e comunidade)
3. Abordagem (camadas de dados e interface)
4. Demonstração rápida (capturas: mapa, Grid status, Impact modal)
5. Resultados esperados / Benefícios
6. Limitações e próximos passos (atualizar Dev approvals, validar custos)
7. Chamado à ação (o que pedimos ao público: apoio para acesso a dados, integração, validação)

## Próximos passos sugeridos
- Preparar 3 capturas de tela: mapa, `Grid status` impact modal, `Data sources` (mostrando a remoção do Development approvals item).
- Preparar um slide com nota técnica sobre suposições e fórmulas (como é calculado o impacto econômico).
- Planejar demonstração ao vivo: iniciar `npm run dev` e navegar até o modal "Impact estimate".

---

Se quiser, adapto o texto para um `README` formato mais curto, ou crio slides em Markdown (reveal.js) prontos para apresentação. Diga qual formato prefere.