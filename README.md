# Monitor BPM - ESP32 + Supabase + React

Sistema web para acompanhamento de batimentos cardíacos em BPM, utilizando ESP32 com sensor AD8232, banco de dados Supabase e frontend em React com Vite.

## Link do projeto

Repositório:

```text
https://github.com/Jonhmartines/bpm-monitor-frontend
```

Site publicado:

```text
https://bpm-monitor-frontend-y6k8.vercel.app
```

## Objetivo do projeto

O objetivo do projeto é permitir o acompanhamento de BPM de um paciente a partir de leituras enviadas por um ESP32. O sistema possui:

- Cadastro e login de usuários;
- Vinculação dos dados ao paciente logado;
- Visualização do BPM em tempo real;
- Histórico diário de leituras;
- Interface responsiva para computador e celular;
- Integração com Supabase para autenticação, banco de dados e API.

Este projeto tem finalidade acadêmica e de prototipagem.

## Tecnologias utilizadas

### Hardware

- ESP32;
- Sensor AD8232;
- Eletrodos para captação do sinal cardíaco;
- Conexão Wi-Fi.

### Backend

- Supabase Auth;
- Supabase Database;
- Supabase REST API;
- PostgreSQL;
- Row Level Security.

### Frontend

- React;
- Vite;
- Tailwind CSS;
- Supabase JS;
- Vercel.

## Arquitetura do sistema

```text
Sensor AD8232
      |
      v
ESP32 lê o sinal analógico
      |
      v
Código calcula/estima o BPM
      |
      v
ESP32 envia JSON via HTTPS
      |
      v
Supabase REST API
      |
      v
Banco PostgreSQL
      |
      v
Frontend React consulta os dados
      |
      v
Usuário visualiza BPM e histórico
```

## Estrutura do projeto

```text
bpm-monitor-frontend/
│
├── src/
│   ├── components/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Historico.jsx
│   │   ├── Login.jsx
│   │   └── Perfil.jsx
│   │
│   ├── lib/
│   │   └── supabaseClient.js
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

## Como rodar o frontend localmente

Clone o repositório:

```bash
git clone https://github.com/Jonhmartines/bpm-monitor-frontend.git
```

Entre na pasta:

```bash
cd bpm-monitor-frontend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env.local`:

```bash
copy .env.example .env.local
```

Configure as variáveis:

```text
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Inicie o projeto:

```bash
npm run dev
```

Depois acesse no navegador:

```text
http://localhost:5173
```

## Variáveis de ambiente

O frontend usa duas variáveis principais:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Exemplo do arquivo `.env.example`:

```text
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

A chave `service_role` não deve ser colocada no frontend, no GitHub ou no Vercel.

## Configuração do Supabase

### 1. Criar tabela de perfis

Essa tabela guarda os dados básicos do usuário cadastrado.

```sql
create table if not exists public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  idade integer not null check (idade >= 0 and idade <= 130),
  sexo text not null check (sexo in ('masculino', 'feminino', 'outro')),
  criado_em timestamp with time zone not null default now()
);
```

### 2. Criar função para gerar perfil automaticamente

Quando um usuário se cadastra pelo Supabase Auth, essa função cria automaticamente um registro na tabela `perfis`.

```sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text;
  v_idade integer;
  v_sexo text;
begin
  v_nome := coalesce(
    new.raw_user_meta_data ->> 'nome',
    new.raw_user_meta_data ->> 'full_name',
    'Usuário'
  );

  v_idade := coalesce(
    nullif(new.raw_user_meta_data ->> 'idade', '')::integer,
    0
  );

  v_sexo := lower(coalesce(
    new.raw_user_meta_data ->> 'sexo',
    'outro'
  ));

  if v_sexo not in ('masculino', 'feminino', 'outro') then
    v_sexo := 'outro';
  end if;

  insert into public.perfis (id, nome, idade, sexo)
  values (new.id, v_nome, v_idade, v_sexo);

  return new;
end;
$$;
```

### 3. Criar trigger para cadastro automático

```sql
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
```

### 4. Criar tabela de BPM em tempo real

Essa tabela guarda o último BPM recebido de cada paciente.

```sql
create table if not exists public.bpm_tempo_real (
  perfil_id uuid primary key references public.perfis(id) on delete cascade,
  dispositivo_id uuid,
  valor_bpm integer not null check (valor_bpm >= 30 and valor_bpm <= 220),
  recebido_em timestamp with time zone not null default now(),
  atualizado_em timestamp with time zone not null default now()
);
```

### 5. Criar tabela de histórico de BPM

Essa tabela guarda as leituras para consulta posterior.

```sql
create table if not exists public.historico_bpm (
  id bigint generated by default as identity primary key,
  perfil_id uuid not null references public.perfis(id) on delete cascade,
  dispositivo_id uuid,
  valor_bpm integer not null check (valor_bpm >= 30 and valor_bpm <= 220),
  registrado_em timestamp with time zone not null default now()
);
```

### 6. Criar view de histórico por minuto

Essa view agrupa as leituras por minuto e calcula média, mínimo, máximo e quantidade de leituras.

```sql
create or replace view public.vw_bpm_historico_minuto as
select
  perfil_id,
  date_trunc('minute', registrado_em) as minuto,
  round(avg(valor_bpm), 2) as bpm_medio,
  min(valor_bpm) as bpm_minimo,
  max(valor_bpm) as bpm_maximo,
  count(*) as quantidade_leituras
from public.historico_bpm
group by
  perfil_id,
  date_trunc('minute', registrado_em)
order by minuto desc;
```

### 7. Ativar RLS

```sql
alter table public.perfis enable row level security;
alter table public.bpm_tempo_real enable row level security;
alter table public.historico_bpm enable row level security;
```

### 8. Criar políticas para perfis

```sql
drop policy if exists "Usuário vê o próprio perfil" on public.perfis;

create policy "Usuário vê o próprio perfil"
on public.perfis
for select
to authenticated
using (auth.uid() = id);
```

```sql
drop policy if exists "Usuário atualiza o próprio perfil" on public.perfis;

create policy "Usuário atualiza o próprio perfil"
on public.perfis
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
```

### 9. Criar políticas para leitura de BPM

```sql
drop policy if exists "Usuário vê o próprio BPM em tempo real" on public.bpm_tempo_real;

create policy "Usuário vê o próprio BPM em tempo real"
on public.bpm_tempo_real
for select
to authenticated
using (auth.uid() = perfil_id);
```

```sql
drop policy if exists "Usuário vê o próprio histórico" on public.historico_bpm;

create policy "Usuário vê o próprio histórico"
on public.historico_bpm
for select
to authenticated
using (auth.uid() = perfil_id);
```

### 10. Política de envio para protótipo com ESP32

Para testes acadêmicos, o ESP32 pode enviar dados diretamente para o Supabase REST API usando a anon key.

```sql
drop policy if exists "ESP32 insere BPM em tempo real" on public.bpm_tempo_real;

create policy "ESP32 insere BPM em tempo real"
on public.bpm_tempo_real
for insert
to anon
with check (true);
```

```sql
drop policy if exists "ESP32 atualiza BPM em tempo real" on public.bpm_tempo_real;

create policy "ESP32 atualiza BPM em tempo real"
on public.bpm_tempo_real
for update
to anon
using (true)
with check (true);
```

```sql
drop policy if exists "ESP32 insere histórico de BPM" on public.historico_bpm;

create policy "ESP32 insere histórico de BPM"
on public.historico_bpm
for insert
to anon
with check (true);
```

Em um sistema final de produção, o recomendado é não enviar diretamente do ESP32 para o banco, mas usar uma API intermediária, uma Edge Function ou outro backend próprio.

## Teste de envio para o Supabase via PowerShell

Defina as variáveis:

```powershell
$SUPABASE_URL="https://seu-projeto.supabase.co"
$SUPABASE_ANON_KEY="sua-chave-anon-publica"
$PERFIL_ID="uuid-do-perfil"
$DISPOSITIVO_ID="uuid-do-dispositivo"
```

Enviar ou atualizar BPM em tempo real:

```powershell
$headers = @{
  "apikey" = $SUPABASE_ANON_KEY
  "Authorization" = "Bearer $SUPABASE_ANON_KEY"
  "Content-Type" = "application/json"
  "Prefer" = "resolution=merge-duplicates"
}

$body = @{
  perfil_id = $PERFIL_ID
  dispositivo_id = $DISPOSITIVO_ID
  valor_bpm = 82
  recebido_em = (Get-Date).ToUniversalTime().ToString("o")
  atualizado_em = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$SUPABASE_URL/rest/v1/bpm_tempo_real?on_conflict=perfil_id" `
  -Headers $headers `
  -Body $body
```

Inserir leitura no histórico:

```powershell
$headers = @{
  "apikey" = $SUPABASE_ANON_KEY
  "Authorization" = "Bearer $SUPABASE_ANON_KEY"
  "Content-Type" = "application/json"
}

$body = @{
  perfil_id = $PERFIL_ID
  dispositivo_id = $DISPOSITIVO_ID
  valor_bpm = 82
  registrado_em = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json

Invoke-RestMethod `
  -Method Post `
  -Uri "$SUPABASE_URL/rest/v1/historico_bpm" `
  -Headers $headers `
  -Body $body
```

## Endpoints usados pelo ESP32

### BPM em tempo real

```text
POST /rest/v1/bpm_tempo_real?on_conflict=perfil_id
```

Headers:

```text
apikey: SUPABASE_ANON_KEY
Authorization: Bearer SUPABASE_ANON_KEY
Content-Type: application/json
Prefer: resolution=merge-duplicates
```

Body:

```json
{
  "perfil_id": "uuid-do-paciente",
  "dispositivo_id": "uuid-do-dispositivo",
  "valor_bpm": 82,
  "recebido_em": "2026-01-01T12:00:00.000Z",
  "atualizado_em": "2026-01-01T12:00:00.000Z"
}
```

### Histórico de BPM

```text
POST /rest/v1/historico_bpm
```

Headers:

```text
apikey: SUPABASE_ANON_KEY
Authorization: Bearer SUPABASE_ANON_KEY
Content-Type: application/json
```

Body:

```json
{
  "perfil_id": "uuid-do-paciente",
  "dispositivo_id": "uuid-do-dispositivo",
  "valor_bpm": 82,
  "registrado_em": "2026-01-01T12:00:00.000Z"
}
```

## Resumo do código do ESP32

O código do ESP32 é responsável por:

1. Conectar o ESP32 à rede Wi-Fi;
2. Ler o sinal analógico vindo do sensor AD8232;
3. Processar o sinal para detectar batimentos;
4. Calcular ou estimar o BPM;
5. Montar um JSON com os dados da leitura;
6. Enviar o JSON para o Supabase via HTTPS;
7. Atualizar a tabela de BPM em tempo real;
8. Registrar leituras na tabela de histórico.

Fluxo simplificado:

```text
Inicializa Wi-Fi
      |
      v
Configura ADC
      |
      v
Lê sinal do AD8232
      |
      v
Detecta pico/batimento
      |
      v
Calcula BPM
      |
      v
Monta JSON
      |
      v
Envia para Supabase
```

Principais partes do código do ESP32:

### Wi-Fi

A parte de Wi-Fi conecta o ESP32 à rede configurada. Após a conexão, o ESP32 recebe um IP local e pode acessar a internet.

### ADC

O ADC é usado para ler o sinal analógico do AD8232. O valor lido representa a variação elétrica captada pelo sensor.

### Cálculo de BPM

O cálculo do BPM é feito a partir da detecção de batimentos no sinal. O código pode usar técnicas como:

- Limite mínimo para detectar pico;
- Histerese para evitar leituras repetidas;
- Tempo refratário entre batimentos;
- Média móvel para reduzir ruído;
- Cálculo do intervalo entre batimentos.

### Envio HTTP

O ESP32 usa HTTPS para enviar os dados ao Supabase. O envio é feito com método `POST`, usando os headers exigidos pela REST API do Supabase.

### Certificado TLS

Para conexão HTTPS funcionar corretamente, o projeto pode usar o bundle de certificados do ESP-IDF:

```c
.crt_bundle_attach = esp_crt_bundle_attach
```

Isso evita erros de verificação TLS ao conectar no Supabase.

## Programação do ESP32

### Requisitos

- ESP-IDF instalado;
- ESP32 conectado ao computador;
- Sensor AD8232 ligado ao pino ADC configurado no código;
- Wi-Fi disponível;
- URL e anon key do Supabase.

### Comandos básicos ESP-IDF

Selecionar o alvo:

```bash
idf.py set-target esp32
```

Abrir configurações:

```bash
idf.py menuconfig
```

Compilar:

```bash
idf.py build
```

Gravar no ESP32:

```bash
idf.py -p COM3 flash
```

Abrir monitor serial:

```bash
idf.py -p COM3 monitor
```

Compilar, gravar e monitorar:

```bash
idf.py -p COM3 flash monitor
```

## Explicação do frontend

O frontend é feito em React com Vite. Ele possui telas de login, cadastro, dashboard, histórico e perfil.

### Login e cadastro

A tela de login usa o Supabase Auth.

No login, o usuário entra com e-mail e senha.

No cadastro, o usuário informa:

- Nome;
- Idade;
- Sexo;
- E-mail;
- Senha.

Esses dados são enviados ao Supabase Auth e também são usados para criar o perfil na tabela `perfis`.

### Dashboard

O Dashboard consulta a tabela:

```text
bpm_tempo_real
```

Ele busca o último BPM vinculado ao usuário logado por meio do campo:

```text
perfil_id
```

A tela atualiza os dados periodicamente para simular acompanhamento em tempo real.

### Histórico

A tela de histórico consulta os dados salvos no banco e organiza as leituras por data e horário.

Ela pode usar a view:

```text
vw_bpm_historico_minuto
```

ou a tabela:

```text
historico_bpm
```

O objetivo é mostrar registros anteriores do paciente, com valores de BPM agrupados por data.

### Perfil

A tela de perfil mostra dados reais do usuário logado, como:

- Nome;
- E-mail;
- Idade;
- Sexo;
- Data de criação da conta.

## Explicação do backend

O backend do projeto é baseado no Supabase.

Ele é responsável por:

- Autenticar usuários;
- Criar perfis automaticamente;
- Guardar o BPM em tempo real;
- Guardar o histórico de BPM;
- Proteger os dados com RLS;
- Fornecer uma API REST para o ESP32 e para o frontend.

Principais tabelas:

```text
perfis
bpm_tempo_real
historico_bpm
```

Principais recursos usados:

```text
Supabase Auth
PostgreSQL
REST API
Row Level Security
Triggers
Views
```

## Deploy no Vercel

O projeto foi publicado no Vercel.

Configuração usada:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Variáveis configuradas no Vercel:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Após cada alteração no projeto, basta enviar para o GitHub:

```bash
git add .
git commit -m "Atualiza frontend"
git push
```

O Vercel detecta o push e faz um novo deploy automaticamente.

## Comandos Git usados no projeto

Inicializar o repositório:

```bash
git init
```

Adicionar arquivos:

```bash
git add .
```

Criar commit:

```bash
git commit -m "Primeira versão do frontend BPM"
```

Renomear branch principal:

```bash
git branch -M main
```

Adicionar repositório remoto:

```bash
git remote add origin https://github.com/Jonhmartines/bpm-monitor-frontend.git
```

Enviar para o GitHub:

```bash
git push -u origin main
```

Atualizar o projeto depois de alterações:

```bash
git add .
git commit -m "Atualiza frontend"
git push
```

## Cuidados importantes

- Não enviar `.env.local` para o GitHub;
- Não colocar `service_role` no frontend;
- Não colocar chaves privadas no repositório;
- Usar apenas a anon key no frontend;
- Configurar as variáveis de ambiente no Vercel;
- Manter o Supabase com RLS ativo;
- Usar uma API intermediária em uma versão final de produção.

## Status do projeto

- Frontend criado;
- Login e cadastro funcionando;
- Integração com Supabase configurada;
- Dashboard consultando BPM real;
- Histórico organizado por datas;
- Perfil exibindo dados reais;
- Deploy publicado no Vercel;
- Repositório disponível no GitHub.
