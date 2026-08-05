# Contexto: Avaliação (Assessment)

## Domínio
Representa um conjunto de medições antropométricas realizadas em um atleta em uma data específica.

## Atributos Principais
- **id**: Identificador único (UUID).
- **athleteId**: ID do atleta a quem a avaliação pertence.
- **date**: Data em que a avaliação foi realizada.
- **Medidas Básicas**: Peso (kg), Altura (cm) e Altura Sentado (cm).
- **Dobras Cutâneas (mm)**: Tríceps D, Tríceps E, Subescapular, Tórax, Subaxilar, Supra-ilíaca, Abdominal, Coxa D, Coxa E, Panturrilha D, Panturrilha E.
- **Circunferências (cm)**: Ombro, Peitoral, Braço D, Braço E, Cintura, Quadril, Medial D, Medial E, Panturrilha D, Panturrilha E, Diâmetro Punho, Diâmetro Joelho.

## Fórmulas Utilizadas (Dashboard)
Ao comparar avaliações ou visualizar os dados atuais, as seguintes fórmulas são empregadas:
- **Ossos (kg)**: `3.02 * (400 * (Circuferencia D. Punho / 100 ) * (Circuferencia D. Joelho / 100 ) * ((Altura / 100)^2))^0.712`
- **Gordura (kg)**: `(Peso * Percentual de Gordura) / 100`
- **Massa Livre de Gordura (MLG em kg)**: `Peso - Gordura - Ossos`
- **Massa Muscular (kg)**: `(Altura / 100) * ((0.00744 * (Relação M/O Braço^2)) + (0.00088 * (Circunferência Braço Corrigida^2)) + (0.00441 * (Tornozelo^2))) + (2.4 * Sexo) - (0.048 * Idade) + Raça + 7.8` onde Relação M/O Braço é `Circunferência Braço Corrigida / Diâmetro Punho`, Sexo é 1 para masculino e 0 para feminino, Raça é 0 para branco, 1.1 para negro e -2 para asiático, e Tornozelo é o valor registrado de circunferência/diâmetro do tornozelo. Esse valor só deve ser calculado quando existir ao menos um insumo válido da própria fórmula.
- **Somatório de Dobras**: Soma de todas as dobras registradas na avaliação.
- **Percentual de Gordura (%)**: O usuário deve poder escolher entre as fórmulas de Pollock ou Faulkner.
- **Relação Massa Muscular-Ossos**: `MLG / Ossos` (índice adimensional).
- **Relação Massa Muscular-Gordura**: `Massa Muscular / Gordura` (índice adimensional).
- **DPVC (Desvio do Pico de Velocidade de Crescimento)**: fórmula por sexo, requer `sittingHeight`, altura, idade e peso preenchidos na avaliação (sem esses dados, exibe `-`). Sexo ausente usa a fórmula de Homem.
  - Homem: `-9.236 + (0.0002708 * ((Altura - AlturaSentado) * AlturaSentado)) - (0.001663 * (Idade * (Altura - AlturaSentado))) + (0.007216 * (Idade * AlturaSentado)) + (0.02292 * ((Peso / Altura) * 100))`
  - Mulher: `-9.376 + (0.0001882 * ((Altura - AlturaSentado) * AlturaSentado)) + (0.0022 * (Idade * (Altura - AlturaSentado))) + (0.005841 * (Idade * AlturaSentado)) - (0.002658 * (Idade * Peso)) + (0.07693 * ((Peso / Altura) * 100))`
  - Exibido com 2 casas decimais (valor completo usado no cálculo); negativo é válido (maturação precoce) e é exibido normalmente.
- **Altura Prevista**: derivada do DPVC de precisão completa, arredondada a 1 casa decimal: `IF(DPVC < -1, Altura/0.91, IF(DPVC < 0, Altura/0.94, IF(DPVC < 1, Altura/0.975, IF(DPVC < 2, Altura/0.99, Altura))))`. Exibida sem trend/comparação.

## Comportamento no Preenchimento de Nova Avaliação
- **Comparação em Tempo Real**: Durante o input dos campos no formulário de Nova Avaliação ou Edição, o sistema exibe abaixo de cada campo o valor registrado na avaliação anterior imediatamente anterior.
- **Cálculo via Banco em Alt. Sentado**: O recurso "Calcular via banco" fica no campo Altura Sentado e utiliza a fórmula `Altura Sentado = Altura - Banco`.
- **Sem obrigatoriedade por campo**: Nenhum campo individual da tela de avaliação é obrigatório no frontend, mas o envio exige pelo menos um campo de medida preenchido.

## Preferências de Visualização no Dashboard
- A fórmula de percentual de gordura selecionada no dashboard (Pollock/Faulkner) deve persistir após refresh da página, mantendo a última escolha do usuário.
