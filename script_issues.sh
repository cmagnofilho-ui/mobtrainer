#!/usr/bin/env bash
set -e

REPO="cmagnofilho-ui/mobtrainer"

# Lista de issues em formato objetivo
issues=(
  "#1 Módulo de onboarding e consentimento LGPD|Implementar consentimento explícito, registro de aceite, e fluxos iniciais de cadastro com LGPD."
  "#2 Autenticação e cadastro|Criar rota de cadastro, login e validação de credenciais com foco em segurança."
  "#3 Perfil e dados demográficos|Coletar etnia, preferências e dados relevantes em conformidade com LGPD."
  "#4 Planejamento de treino|Construir dashboard de treino e recomendação de rotina semanal."
  "#5 Nutrição e alimentação|Implementar plano nutricional personalizado e gestão de metas."
  "#6 IA assistente|Integrar prompts e definir regras de segurança, contexto e privacidade."
  "#7 Mobile app|Finalizar estrutura inicial do app mobile com telas principais e navegação."
  "#8 Infra e qualidade|Adicionar testes, validações de CI e observabilidade do sistema."
)

for item in "${issues[@]}"; do
  title="${item%%|*}"
  body="${item#*|}"
  gh issue create --repo "$REPO" --title "$title" --body "$body" >/dev/null
  echo "Created: $title"
done
