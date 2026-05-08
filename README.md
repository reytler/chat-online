# 💬 Instant Chat com IA

Um sistema de chat instantâneo em tempo real com suporte a múltiplas salas, autenticação de usuários, e interação com inteligência artificial.

---

## 📌 Sobre o Projeto

Este é um projeto de um **chat instantâneo** construído com **Node.js (backend)** e **React (frontend)**, usando **Socket.io** para comunicação em tempo real.

### 🎯 Objetivos principais

- Permitir a troca de mensagens entre usuários em tempo real.
- Organizar o chat em **salas temáticas**.
- Integrar com uma **API de Inteligência Artificial**, possibilitando a participação da IA nas conversas.
- Automatizar o deploy com **GitHub Actions** e hospedar em ambiente cloud.

---

## ⚙️ Tecnologias Utilizadas

### Backend
- Node.js
- Express
- Socket.io
- TypeScript

### Frontend
- React
- Vite
- TypeScript
- Tailwind

### DevOps
- GitHub Actions
- Docker
- Plataforma cloud: À definir (Vercel, Render, Railway ou outra)

---

## ✅ Funcionalidades Implementadas

- [x] Configuração do servidor com Socket.io
- [x] Frontend com React e integração com WebSocket
- [x] Login e logout de usuários
- [x] Listagem de usuários conectados em tempo real
- [x] Identificação do usuário via socket

---

## 🚧 Funcionalidades em Desenvolvimento

- [x] Envio e recebimento de mensagens entre usuários
- [x] Exibição de mensagens em tempo real no frontend
- [ ] Histórico de mensagens por sessão (em memória ou banco)
- [ ] Criação e navegação entre salas temáticas
- [ ] Participação da IA nas conversas via integração com API (Ex: OpenAI, Gemini etc.)

---

## 🛠️ Futuras Implementações

- [ ] Autenticação com token (JWT ou OAuth)
- [ ] Armazenamento persistente com banco de dados (Ex: MongoDB ou PostgreSQL)
- [ ] Interface responsiva para dispositivos móveis
- [ ] Painel de administração das salas
- [ ] Sistema de moderação
- [ ] Deploy automatizado com GitHub Actions
- [ ] Hospedagem do frontend e backend na nuvem

## Observabilidade

Frontend (`front/`):
- `VITE_OBSERVABILITY_ADAPTERS=sentry,console` para registrar o adapter do Sentry junto com o console em desenvolvimento.
- `VITE_SENTRY_ENABLED=true` habilita o envio ao Sentry.
- `VITE_SENTRY_DSN=<dsn>` define o DSN.
- `VITE_SENTRY_ENVIRONMENT=<environment>` sobrescreve o ambiente; por padrão usa `import.meta.env.MODE`.
- `VITE_SENTRY_RELEASE=<release>` define a release publicada.

API (`api/`):
- `OBSERVABILITY_ADAPTERS=sentry,console` para registrar o adapter do Sentry junto com o console em desenvolvimento.
- `SENTRY_ENABLED=true` habilita o envio ao Sentry.
- `SENTRY_DSN=<dsn>` define o DSN.
- `SENTRY_ENVIRONMENT=<environment>` sobrescreve o ambiente; por padrão usa `NODE_ENV`.
- `SENTRY_RELEASE=<release>` define a release publicada.

Notas:
- A integracao envia apenas erros/excecoes ao Sentry.
- Os componentes e regras de negocio continuam falando apenas com a abstracao de observabilidade existente.
- Contextos como `socketId`, `route`, `roomId` e `userName` podem ser enviados quando presentes no evento capturado.

## 📄 Licença

Este projeto é de uso exclusivo do autor. Todos os direitos reservados. Para mais detalhes, veja o arquivo [LICENSE](./LICENSE).
