# MobTrainer

Aplicativo de treino, nutrição e acompanhamento de desempenho com estrutura comercial pronta para mercado global.

## Visão geral

O MobTrainer combina:

- autenticação e perfil de usuário
- criação de treinos e planos nutricionais
- dashboard de progresso
- gestão de contas para recebimento
- planos de assinatura com cobrança em USD como base
- conversão local em reais para usuários brasileiros
- documentação de compliance e políticas legais

## Arquitetura

- Backend: Node.js + Express
- Banco: SQLite
- Mobile: Expo / React Native
- Conteinerização: Docker e Docker Compose

## Requisitos

- Node.js 20+
- npm
- Docker (opcional)

## Início rápido

### Backend

```bash
cd backend
npm install
npm start
```

A API estará disponível em:

- http://localhost:3000
- http://localhost:3000/health

### Testes

```bash
cd backend
npm test
```

### Docker

```bash
docker compose up --build
```

## Estrutura de preços

A precificação do produto é baseada em USD para manter consistência com o mercado internacional. Para o público brasileiro, o valor equivalente em reais pode ser exibido como conversão local, mas a base comercial e de faturamento continua em USD.

Planos iniciais:

- Starter: USD 29,00/mês
- Pro: USD 59,00/mês

## Documentação legal

- [docs/CONSENT_LGPD.md](docs/CONSENT_LGPD.md)
- [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md)
- [docs/TERMS_OF_SERVICE.md](docs/TERMS_OF_SERVICE.md)
- [docs/REFUND_POLICY.md](docs/REFUND_POLICY.md)

## Segurança e ambiente

Copie o exemplo de variáveis:

```bash
cd backend
cp .env.example .env
```

Variáveis disponíveis:

- PORT
- MOBTRAINER_DB_PATH
- DEFAULT_CURRENCY
- USD_TO_BRL
- APP_NAME
- APP_BASE_URL
- TOKEN_SECRET

## Observação

Este projeto está em evolução para um nível de produto comercial e internacional com foco em robustez, clareza jurídica e experiência premium.
