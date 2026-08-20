# Contexto: Grupos/Times

Este arquivo define o contexto e as regras de negócio para a entidade "Grupo" (Time) na plataforma BodyMetrics.

## Estrutura de Dados
- `id` (string): Identificador único do grupo.
- `name` (string): Nome do grupo/time (único por usuário).
- `members` (AthleteGroupMember[]): Atletas pertencentes ao grupo (`id`, `fullName`).
- `createdAt` / `updatedAt` (datetime).

## Regras de Negócio
- **Um atleta pertence a no máximo um grupo por vez.** Ele existe avulso (sem grupo) ou dentro de exatamente um grupo — nunca os dois.
- **Adicionar/mover é a mesma operação.** Não existe endpoint separado de "migrar": chamar `POST /api/athlete-groups/{id}/members/{athleteId}` move o atleta para o grupo `{id}`, tirando-o de onde estiver (avulso ou outro grupo).
- **Remover do grupo** (`DELETE /api/athlete-groups/{id}/members/{athleteId}`) devolve o atleta ao estado avulso.
- **Criação de atleta** (`POST /api/athletes`) nunca associa grupo — o atleta sempre nasce avulso; a associação é um passo separado no frontend (chamada extra após criar).
- **Listagem de atletas** (`GET /api/athletes`) retorna por padrão só atletas avulsos, a menos que `groupId` ou `includeGrouped=true` sejam informados.
- **Importação de planilha** (`POST /api/athletes/import`) lê coluna opcional "Time": se presente, cria o grupo (se não existir, por nome normalizado) e já importa o atleta direto para dentro dele; se ausente, atleta é importado avulso (ou mantém grupo já existente em reimportações).
- Sem status/enum no grupo — ele existe ou foi excluído.

## Frontend
- `GroupContext` carrega todos os grupos (sem paginação) já com `members` embutidos — suficiente para descobrir a que grupo um atleta pertence sem chamada extra.
- Tela de listagem (`/groups`) + detalhe (`/groups/:groupId`) para gerenciar grupo, membros e migração.
- Formulário de atleta (criar/editar) e o dashboard do atleta também permitem atribuir/mover/remover grupo, reaproveitando o mesmo `addAthleteToGroup`/`removeAthleteFromGroup`.
- Exportação de relatório em grupo possui flag para exibir/ocultar média do grupo nos cards.
- Quando habilitada, a média é calculada por campo calculável somando os valores válidos dos atletas do grupo e dividindo pela quantidade de atletas com valor válido naquele campo.
- No relatório individual, a flag de média só aparece quando o atleta pertence a um grupo; a média exibida é a do grupo atual do atleta.
- A tela de detalhe do grupo permite filtros múltiplos por esporte, categoria e setor; a exportação em grupo deve respeitar exatamente os atletas visíveis após aplicar esses filtros.
- Na tela de relatório resumido do grupo, a coluna de Atletas (junto com a ação de remoção) é fixada na rolagem horizontal (sticky), mantendo os nomes dos atletas visíveis ao navegar pelas métricas.
