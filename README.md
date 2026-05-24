# Monitor BPM Frontend

Site responsivo em React com aparência de aplicativo mobile para o projeto de monitoramento de BPM.

## Como executar

```bash
npm install
npm run dev
```

Depois acesse o endereço exibido no terminal.

## Configuração futura do Supabase

Copie `.env.example` para `.env` e preencha:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

Esta versão inicial usa dados simulados para validar a interface. A conexão real com o Supabase será feita sem alterar o banco de dados.
