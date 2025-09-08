# Escolas Municipais - Sistema de Gestão

Sistema web para gerenciamento de dados escolares municipais com autenticação, histórico de alterações e funcionalidades avançadas.

## 🚀 Deploy na Vercel

### 1. Criar conta no Turso (Banco de Dados)
1. Acesse [turso.tech](https://turso.tech) e crie uma conta gratuita
2. Crie um novo database:
   ```bash
   turso db create escolas-municipais
   ```
3. Obtenha as credenciais:
   ```bash
   turso db show escolas-municipais
   turso db tokens create escolas-municipais
   ```

### 2. Deploy na Vercel
1. Instale Vercel CLI: `npm i -g vercel`
2. Faça login: `vercel login`
3. Configure variáveis de ambiente na Vercel:
   - `TURSO_DATABASE_URL`: URL do seu banco Turso
   - `TURSO_AUTH_TOKEN`: Token de autenticação do Turso
   - `JWT_SECRET`: Chave secreta para JWT (gere uma aleatória)
   - `ADMIN_PASSWORD`: Senha de acesso ao sistema
4. Deploy: `vercel --prod`

### 3. Configuração Local de Desenvolvimento
```bash
npm install
npm run dev
```

## 📊 Funcionalidades

### ✅ Implementadas
- **Autenticação**: Login com senha configurável
- **Gestão Dinâmica**: Ajustar número de linhas/colunas por município
- **Busca/Filtro**: Buscar dados em tempo real
- **Histórico**: Rastreamento completo de alterações
- **Exportar/Importar**: CSV para backup e migração
- **Validação**: Detecção automática de tipos (texto, número, data)
- **Interface Responsiva**: Funciona em desktop e mobile
- **Persistência**: Banco Turso (SQLite distribuído)

### 🔧 Configurações
- **Linhas**: 1-100 por município
- **Colunas**: 1-20 por município
- **Autenticação**: JWT com expiração de 24h
- **Backup**: Exportação automática em CSV

### 🎯 Uso
1. Acesse o sistema e faça login
2. Selecione um município clicando no botão
3. Configure o número de linhas/colunas necessárias
4. Preencha os dados (salvamento automático)
5. Use busca para filtrar dados
6. Acesse histórico para ver alterações
7. Exporte/importe dados via CSV

### 🔒 Segurança
- Autenticação obrigatória
- Tokens JWT seguros
- Senhas hasheadas
- CORS configurado
- Validação de entrada

### 🌐 Variáveis de Ambiente
```env
TURSO_DATABASE_URL=libsql://[nome-do-db]-[usuario].turso.io
TURSO_AUTH_TOKEN=seu-token-aqui
JWT_SECRET=sua-chave-secreta-jwt
ADMIN_PASSWORD=sua-senha-admin
PORT=3000
```

### 📱 Responsividade
- Desktop: Layout completo com painéis laterais
- Tablet: Interface adaptada
- Mobile: Layout otimizado para toque

## 🛠️ Tecnologias
- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **Backend**: Node.js, Express.js
- **Banco**: Turso (SQLite distribuído)
- **Auth**: JWT + bcrypt
- **Deploy**: Vercel Serverless Functions
- **Import/Export**: CSV, Excel (XLSX)

## 📈 Monitoramento
- Logs de alterações em `historico` table
- Timestamps automáticos
- Rastreamento por usuário (via JWT)
