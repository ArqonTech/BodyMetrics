# DPVC + Altura Prevista Specification

## Problem Statement

O app calcula hoje um "PVC" (Pico de Velocidade de Crescimento) com fórmula incompleta e sem distinção de sexo (`src/utils/metrics.ts:131-140`). O indicador correto de maturação usada é o DPVC (Desvio do Pico de Velocidade de Crescimento), com fórmulas distintas para Homem/Mulher, do qual também se deriva a Altura Prevista (estimativa de estatura adulta). PVC deve ser removido de todo o app e substituído por DPVC + Altura Prevista, nesta ordem, em todo lugar onde PVC aparecia hoje.

## Goals

- [ ] Remover PVC (campo, cálculo, exibição) de todos os pontos do app
- [ ] Calcular DPVC com fórmula por sexo (Homem/Mulher), usando valor completo (sem arredondar) internamente
- [ ] Calcular Altura Prevista a partir do DPVC, arredondada a 1 casa decimal
- [ ] Exibir DPVC (2 casas decimais) imediatamente seguido de Altura Prevista, na mesma posição/ordem onde PVC aparecia, em todos os locais (dashboard, relatório completo, relatório de grupo, opções de relatório)

## Out of Scope

| Feature | Reason |
| --- | --- |
| GroupSimplifiedReport (relatório simplificado de grupo) | Não exibe PVC hoje; não faz parte do escopo de substituição |
| Migração de dados históricos / persistência de PVC salvo | PVC é sempre derivado (calculado em runtime a partir de outros dados), não hipersistido — nada para migrar |
| Alterar fórmulas de outras métricas (massa muscular, % gordura, etc.) | Fora do escopo desta feature |
| Registro de novos campos de entrada do atleta | Altura, Altura Sentado, Idade, Peso, Sexo já existem como inputs; feature é só cálculo/exibição derivados |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| DPVC negativo | Exibir valor negativo normalmente (ex.: `-1,23`); só mostra `-` quando faltam dados de entrada (altura, altura sentado, idade ou peso ausentes/zerados) | DPVC negativo é maturação precoce, dado válido — regra genérica atual de "valor <= 0 → N/A" não se aplica a DPVC | y |
| Sexo do atleta ausente | Default para fórmula Homem (mesmo comportamento hoje de `fatorSexo`, que trata qualquer valor != 'Feminino', incluindo undefined, como masculino) | Mantém consistência com padrão já usado no cálculo de massa muscular | y |
| Altura Prevista: trend/comparação | Sem trend — mostra só valor + unidade `cm`, sem seta de tendência vs. avaliação anterior | Altura Prevista é estimativa de estatura adulta, varia pouco entre avaliações; trend não agrega valor | y |
| DPVC: trend/comparação | Mantém trend (seta + delta vs. avaliação anterior), igual ao PVC hoje | Requisito do usuário: DPVC ocupa a posição do PVC "na ordem de visualização" — herda o comportamento visual que PVC tinha | y |
| Unidade de exibição do DPVC | Sem unidade (é um desvio-padrão adimensional), como já ocorre em outros índices (ex. Rel. Músculo/Osso) | PVC usava "anos" por engano (era outra convenção); DPVC é um z-score, não tem unidade de tempo | y |
| Arredondamento de Altura Prevista | 1 casa decimal, calculado sobre o DPVC de precisão completa (não arredondado) | Requisito explícito do usuário | y |
| Campo `sittingHeight` ausente/zerado | DPVC e Altura Prevista mostram `-` (mesma regra de dado insuficiente que PVC já tinha) | Fórmula depende de Altura Sentado; sem esse dado não há cálculo possível | y |

**Open questions:** none — todas resolvidas acima.

---

## User Stories

### P1: Ver DPVC e Altura Prevista no dashboard do atleta ⭐ MVP

**User Story**: Como preparador físico, quero ver o DPVC e a Altura Prevista do atleta no dashboard, no lugar onde antes via o PVC, para avaliar a maturação biológica corretamente.

**Why P1**: É o ponto de exibição principal e mais usado no dia a dia.

**Acceptance Criteria**:

1. WHEN o dashboard do atleta renderiza métricas de composição THEN o sistema SHALL calcular DPVC usando a fórmula de Homem ou Mulher conforme `athlete.gender` (Mulher apenas se `gender === 'Feminino'`, senão Homem)
2. WHEN altura, altura sentado, idade e peso estão todos disponíveis (> 0) THEN o sistema SHALL exibir o card de DPVC com valor arredondado a 2 casas decimais, calculado a partir do valor de DPVC sem arredondamento intermediário
3. WHEN o card de DPVC é exibido THEN o sistema SHALL exibir logo em seguida (mesma posição de grid, ordem imediatamente após) um card de Altura Prevista com valor arredondado a 1 casa decimal e unidade `cm`
4. WHEN altura, altura sentado, idade ou peso está ausente ou <= 0 THEN o sistema SHALL exibir `-` tanto para DPVC quanto para Altura Prevista
5. WHEN DPVC calculado é negativo (ex.: -1.23) THEN o sistema SHALL exibir o valor negativo normalmente (ex.: `-1,23`), não `-`
6. WHEN há avaliação de comparação selecionada THEN o card de DPVC SHALL exibir trend (seta + delta) comparando com o DPVC da avaliação de comparação, igual ao comportamento anterior do PVC
7. WHEN há avaliação de comparação selecionada THEN o card de Altura Prevista SHALL NOT exibir trend/seta de comparação
8. WHEN o card de PVC existia anteriormente no dashboard THEN o sistema SHALL NOT exibir mais nenhum card de PVC

**Independent Test**: Abrir dashboard de um atleta com todos os dados de entrada preenchidos (altura, altura sentado, idade, peso, sexo); conferir que aparecem os cards DPVC e Altura Prevista nessa ordem, sem card de PVC.

---

### P1: Ver DPVC e Altura Prevista no relatório individual (ReportPaper/ReportModal)

**User Story**: Como preparador físico, quero que o relatório em PDF/impressão do atleta mostre DPVC e Altura Prevista no lugar do PVC, para manter consistência entre dashboard e relatório.

**Why P1**: Relatório é o artefato compartilhado com terceiros (atleta, clube); precisa refletir a mesma métrica correta.

**Acceptance Criteria**:

1. WHEN a seção "Composição Corporal" do relatório é montada THEN o sistema SHALL substituir a entrada `pvc` por duas entradas na mesma posição da lista: `dpvc` seguida de `alturaPrevista`
2. WHEN a opção de composição corporal é selecionada no `ReportOptionsSidebar` THEN a opção deve ser rotulada para refletir DPVC e Altura Prevista (não mais "PVC")
3. WHEN o relatório de grupo (`GroupReportModal`) e o relatório individual (`ReportModal`) calculam médias de grupo THEN ambos SHALL calcular a média de `dpvc` e a média de `alturaPrevista` no lugar da média de `pvc`
4. WHEN DPVC é exibido no relatório THEN o sistema SHALL aplicar as mesmas regras de negativo/N/A da AC do dashboard (não usar a checagem genérica `valor <= 0 → N/A` para o campo DPVC)

**Independent Test**: Gerar relatório individual e relatório de grupo com a opção de composição corporal marcada; conferir DPVC e Altura Prevista aparecem juntos, na posição do antigo PVC, com valores corretos.

---

## Edge Cases

- WHEN `Altura - Altura Sentado` resulta em valor negativo ou zero (dado inconsistente) THEN o sistema SHALL ainda calcular DPVC normalmente com a fórmula (sem guarda especial além da checagem de presença dos 4 inputs) — comportamento consistente com as demais fórmulas existentes em `metrics.ts`, que não validam consistência interna dos inputs
- WHEN DPVC calculado é exatamente `-1`, `0`, `1` ou `2` (limites das faixas de arredondamento de Altura Prevista) THEN o sistema SHALL usar a faixa correspondente à condição `< limite` (estrita), ou seja, DPVC exatamente igual ao limite cai na faixa seguinte (ex.: DPVC = -1 usa divisor 0.94, não 0.91)
- WHEN o atleta não tem `gender` definido THEN o sistema SHALL usar a fórmula de Homem (ver Assumption)
- WHEN valor de grupo (`GroupReportModal`/`ReportModal`) tem atletas sem dados suficientes para DPVC THEN a média SHALL ignorar/tratar como os demais campos já tratam hoje (reutilizar função `average()` existente, sem lógica nova)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DPVC-01 | P1: Dashboard | Design | Pending |
| DPVC-02 | P1: Dashboard | Design | Pending |
| DPVC-03 | P1: Dashboard | Design | Pending |
| DPVC-04 | P1: Dashboard | Design | Pending |
| DPVC-05 | P1: Dashboard | Design | Pending |
| DPVC-06 | P1: Dashboard | Design | Pending |
| DPVC-07 | P1: Dashboard | Design | Pending |
| DPVC-08 | P1: Dashboard | Design | Pending |
| DPVC-09 | P1: Relatório | Design | Pending |
| DPVC-10 | P1: Relatório | Design | Pending |
| DPVC-11 | P1: Relatório | Design | Pending |
| DPVC-12 | P1: Relatório | Design | Pending |

**Coverage:** 12 total, 12 mapped to tasks (pending Execute), 0 unmapped

---

## Success Criteria

- [ ] Nenhuma ocorrência de PVC (label, campo, cálculo) permanece em `src/` fora de comentários históricos
- [ ] DPVC e Altura Prevista aparecem, nesta ordem, em dashboard, relatório individual e relatório de grupo, exatamente onde PVC aparecia
- [ ] Fórmulas batem com as fórmulas fornecidas pelo usuário (Homem e Mulher) e com a tabela de arredondamento de Altura Prevista
