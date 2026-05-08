# Frontend

Aplicacao React + Vite do chat.

## Desenvolvimento

```bash
npm run dev
```

O frontend sobe por padrao em `http://localhost:3000`.

## URL da API/socket

O cliente resolve a URL base do backend com a seguinte regra:

- usa `VITE_API_URL` quando a variavel estiver definida
- caso contrario, reutiliza o hostname atual do navegador e aponta para a porta `3001`

Exemplos:

- `http://localhost:3000` -> `http://localhost:3001`
- `http://192.168.1.20:3000` -> `http://192.168.1.20:3001`

Exemplo de override:

```bash
VITE_API_URL=http://192.168.1.20:3001 npm run dev
```

Para acessar o frontend por IP ou a partir de outros dispositivos da rede, a API precisa estar acessivel nesse mesmo IP na porta `3001`.

## Build e testes

```bash
npm run build
npm test
```
