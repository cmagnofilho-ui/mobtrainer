# Deployment Guide

## 1. Objetivo

Este guia define a melhor sequência para publicar o MobTrainer em ambiente de produção, mantendo segurança, estabilidade e simplicidade operacional.

## 2. Opções de deploy

### Opção A: Render (recomendada)

O Render é a melhor opção para lançamento rápido e simples, especialmente para uma API Node.js com SQLite em ambiente de provas ou MVP.

#### Passos

1. Crie uma conta no Render.
2. Conecte o repositório GitHub do projeto.
3. Selecione a opção "Web Service".
4. Configure a pasta raiz como `backend`.
5. Use o comando de build:

```bash
npm install
```

6. Use o comando de start:

```bash
npm start
```

7. Configure as variáveis de ambiente:

- PORT=3000
- MOBTRAINER_DB_PATH=./data/mobtrainer.sqlite
- DEFAULT_CURRENCY=USD
- USD_TO_BRL=5.6
- APP_NAME=MobTrainer
- APP_BASE_URL=https://seu-dominio.com

8. Publique o serviço.

### Opção B: Docker local ou servidor

Use esta opção quando você quiser um ambiente mais controlado e parecido com produção.

```bash
docker compose up --build
```

### Opção C: VPS / Ubuntu

Para VPS, o processo é simples:

```bash
cd /home/usuario/mobtrainer/backend
npm install
npm start
```

Em produção, configure um processo de execução com PM2 ou systemd para manter o serviço ativo.

## 3. Considerações importantes

- O SQLite funciona bem para MVP e versão inicial, mas para crescimento real a recomendação é migrar para PostgreSQL.
- A moeda base do produto deve continuar em USD.
- O valor em reais pode ser exibido como conversão local para o público brasileiro.
- O banco de dados deve estar em volume persistente ou em armazenamento externo.

## 4. Checklist de pós-deploy

- [ ] Healthcheck da API funcionando
- [ ] Login e cadastro ativos
- [ ] Dashboard carregando corretamente
- [ ] Checkout e assinatura ativos
- [ ] Admin acessando contas de recebimento
- [ ] HTTPS ativo
- [ ] Logs e monitoramento funcionando
- [ ] Backups configurados

## 5. Recomendação final

Para este projeto, a melhor rota prática é:

- usar Render para primeira publicação
- manter Docker para ambiente local e staging
- preparar a migração para PostgreSQL quando houver escala real

## 6. Observação

Este guia deve ser revisado antes de cada nova release para refletir a infraestrutura real e o estado do produto em produção.
