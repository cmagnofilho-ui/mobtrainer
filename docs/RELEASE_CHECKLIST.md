# Release Checklist

## 1. Objetivo

Este checklist reúne os passos essenciais para preparar o MobTrainer para publicação real em ambiente de produção.

## 2. Infraestrutura

- [ ] Confirmar domínio ou subdomínio para a API
- [ ] Definir ambiente de produção: Render, VPS, Railway, Azure ou outra plataforma
- [ ] Confirmar acesso ao banco de dados de produção
- [ ] Definir estratégia de backups e restauração
- [ ] Habilitar HTTPS com certificado válido

## 3. Configuração de ambiente

- [ ] Definir `PORT` em produção
- [ ] Definir `MOBTRAINER_DB_PATH` para o caminho correto do banco
- [ ] Definir `DEFAULT_CURRENCY=USD`
- [ ] Definir `USD_TO_BRL=5.6` ou valor atualizado conforme mercado
- [ ] Definir `APP_NAME=MobTrainer`
- [ ] Definir `APP_BASE_URL` para o domínio final da API

## 4. Segurança

- [ ] Remover ou proteger arquivos sensíveis do repositório
- [ ] Não versionar segredos em .env
- [ ] Usar variáveis de ambiente no provedor de hospedagem
- [ ] Revisar CORS para produção
- [ ] Validar rate limiting e autenticação de usuários
- [ ] Revisar logs e monitoramento

## 5. Monetização e cobrança

- [ ] Confirmar a moeda base: USD
- [ ] Validar conversão local em BRL
- [ ] Confirmar planos e preços finais
- [ ] Validar fluxo de checkout e ativação da assinatura
- [ ] Revisar política de reembolso e termos de uso

## 6. Compliance e legal

- [ ] Confirmar consentimento LGPD
- [ ] Revisar política de privacidade
- [ ] Revisar termos de uso
- [ ] Revisar política de reembolso
- [ ] Definir canal de suporte e contato legal

## 7. QA e validação

- [ ] Rodar testes automatizados em produção-like environment
- [ ] Validar cadastro e login
- [ ] Validar dashboard e perfil
- [ ] Validar pagamento e ativação de assinatura
- [ ] Validar fluxo do admin
- [ ] Validar responsividade e consumo real de API

## 8. Deploy

- [ ] Fazer build de produção
- [ ] Executar deploy em ambiente de staging primeiro
- [ ] Validar healthcheck da API
- [ ] Validar logs e evento de startup
- [ ] Executar smoke test em produção

## 9. Pós-release

- [ ] Monitorar erros e falhas de login
- [ ] Revisar métricas de assinatura e ativação
- [ ] Coletar feedback real do usuário
- [ ] Planejar atualizações e correções de produto

## 10. Observação

Este documento deve ser revisado antes de cada lançamento para garantir que o produto siga os padrões de qualidade, segurança e compliance exigidos pelo mercado.
