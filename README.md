# Monitor BPM

Aplicação acadêmica para acompanhamento de batimentos cardíacos usando **ESP32**, sensor **AD8232**, **Supabase** e um frontend responsivo desenvolvido com **React + Vite**.

> Este projeto é um protótipo acadêmico. As leituras não substituem equipamentos médicos, diagnóstico ou acompanhamento profissional.

## Acesso

- **Repositório:** [Jonhmartines/bpm-monitor-frontend](https://github.com/Jonhmartines/bpm-monitor-frontend)

## Visão geral

O sistema recebe o sinal analógico do AD8232, calcula uma estimativa de BPM no ESP32 e envia os resultados ao Supabase por HTTPS. O frontend consulta esses dados e apresenta o acompanhamento do usuário autenticado.

Fluxo principal:

```text
Eletrodos
   ↓
AD8232
   ↓
ESP32
   ↓ HTTPS
Supabase
   ↓
Frontend React
   ↓
Usuário
```

## Funcionalidades

### Frontend

- Cadastro de usuário com nome, idade, sexo, e-mail e senha;
- Login com Supabase Auth;
- Sessão persistente;
- Dashboard com BPM atual;
- Média calculada com todas as leituras do dia;
- Quantidade de registros do dia;
- Gráfico de variação diária;
- Lista das últimas leituras;
- Histórico organizado por data;
- Média, mínimo e máximo por período;
- Perfil com os dados reais do usuário;
- Tema claro e escuro;
- Visualização desktop e mobile;
- Atualização automática dos dados;
- Reinício diário do Dashboard: ao abrir o sistema, são mostradas apenas as leituras do dia atual.

### ESP32

- Leitura do AD8232 pelo ADC do GPIO34;
- Verificação de eletrodos por LO+ e LO-;
- Suporte a mais de uma rede Wi-Fi;
- Permanência na primeira rede disponível;
- Reconexão automática quando a rede cai;
- Calibração inicial do sinal;
- Filtro mediano do ADC;
- Remoção da linha de base;
- Limiar dinâmico;
- Rejeição de pulsos secundários e intervalos inválidos;
- Cálculo do BPM pela mediana dos intervalos RR;
- Envio HTTP executado em tarefa separada da leitura do sensor;
- Atualização do BPM em tempo real;
- Gravação periódica no histórico.

## Tecnologias

### Hardware

- ESP32;
- Sensor AD8232;
- Eletrodos;
- Cabo USB;
- Rede Wi-Fi.

### Firmware

- C;
- ESP-IDF;
- PlatformIO;
- FreeRTOS;
- ADC1;
- GPIO;
- HTTPS;
- JSON.

### Backend

- Supabase Auth;
- PostgreSQL;
- Supabase REST API;
- Row Level Security;
- Funções PostgreSQL;
- Triggers;
- Views.

### Frontend

- React;
- Vite;
- Tailwind CSS;
- Supabase JS;
- Lucide React;

## Ligações do AD8232

| AD8232 | ESP32 |
|---|---|
| `3.3V` | `3V3` |
| `GND` | `GND` |
| `OUT` | `GPIO34` |
| `LO+` | `GPIO19` |
| `LO-` | `GPIO18` |

No firmware:

```c
#define APP_ADC_CHANNEL ADC1_CHANNEL_6
#define APP_LO_PLUS_GPIO GPIO_NUM_19
#define APP_LO_MINUS_GPIO GPIO_NUM_18
```

No ESP32, `ADC1_CHANNEL_6` corresponde ao `GPIO34`.

## Organização dos dados no Supabase

O projeto utiliza os seguintes recursos principais:

### `perfis`

Armazena os dados do usuário autenticado.

Campos principais:

```text
id
nome
idade
sexo
criado_em
```

### `dispositivos`

Relaciona o código do ESP32 ao perfil que deve receber as leituras.

O firmware utiliza:

```text
ESP32_PRINCIPAL
```

### `bpm_tempo_real`

Mantém o valor mais recente de cada perfil.

Campos principais:

```text
perfil_id
dispositivo_id
valor_bpm
recebido_em
atualizado_em
```

### `historico_bpm`

Armazena as leituras ao longo do tempo.

Campos principais:

```text
id
perfil_id
dispositivo_id
valor_bpm
registrado_em
```

### `vw_bpm_historico_minuto`

Agrupa as leituras por minuto e fornece:

```text
bpm_medio
bpm_minimo
bpm_maximo
quantidade_leituras
```

### `registrar_bpm_dispositivo`

Função RPC chamada pelo ESP32.

O firmware envia:

```json
{
  "p_codigo_dispositivo": "ESP32_PRINCIPAL",
  "p_valor_bpm": 80,
  "p_salvar_historico": true
}
```

A função localiza o perfil vinculado ao dispositivo, atualiza `bpm_tempo_real` e, quando solicitado, grava em `historico_bpm`.

## Configuração completa do Supabase

Esta seção apresenta a criação do backend do zero. Ela substitui qualquer estrutura anterior do banco.

> O primeiro bloco do script remove tabelas, funções, gatilhos e views existentes. Use-o apenas em um projeto novo ou quando desejar reconstruir completamente o banco.

### 1. Criar o projeto

1. Acesse o Supabase e crie um projeto;
2. Aguarde a preparação do banco PostgreSQL;
3. Abra **Project Settings → API**;
4. Copie:
   - `Project URL`;
   - chave `anon/public`;
5. Não utilize a chave `service_role` no frontend.

### 2. Abrir o SQL Editor

No painel do projeto:

```text
SQL Editor → New query
```

Cole e execute o script completo abaixo.

```sql
-- =========================================================
-- MONITOR BPM - CONFIGURAÇÃO COMPLETA DO SUPABASE
-- Execute no SQL Editor de um projeto novo.
-- O bloco de limpeza apaga as estruturas antigas.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. LIMPEZA OPCIONAL
-- =========================================================

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user();
drop function if exists public.registrar_bpm_dispositivo(text, integer, boolean);
drop function if exists public.vincular_dispositivo_ao_usuario(text);

drop view if exists public.vw_bpm_historico_minuto;

drop table if exists public.historico_bpm cascade;
drop table if exists public.bpm_tempo_real cascade;
drop table if exists public.dispositivos cascade;
drop table if exists public.perfis cascade;

-- =========================================================
-- 2. PERFIS
-- =========================================================

create table public.perfis (
    id uuid primary key references auth.users(id) on delete cascade,
    nome text not null,
    idade integer not null check (idade between 0 and 130),
    sexo text not null check (sexo in ('masculino', 'feminino', 'outro')),
    criado_em timestamptz not null default now()
);

alter table public.perfis enable row level security;

create policy "usuario_le_proprio_perfil"
on public.perfis
for select
to authenticated
using (id = auth.uid());

create policy "usuario_atualiza_proprio_perfil"
on public.perfis
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- =========================================================
-- 3. CRIAÇÃO AUTOMÁTICA DO PERFIL APÓS O CADASTRO
-- =========================================================

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
    v_idade_texto text;
begin
    v_nome := coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        split_part(new.email, '@', 1),
        'Usuário'
    );

    v_idade_texto := new.raw_user_meta_data ->> 'idade';

    if v_idade_texto ~ '^[0-9]{1,3}$' then
        v_idade := v_idade_texto::integer;
    else
        v_idade := 0;
    end if;

    if v_idade < 0 or v_idade > 130 then
        v_idade := 0;
    end if;

    v_sexo := lower(
        coalesce(
            nullif(trim(new.raw_user_meta_data ->> 'sexo'), ''),
            'outro'
        )
    );

    if v_sexo not in ('masculino', 'feminino', 'outro') then
        v_sexo := 'outro';
    end if;

    insert into public.perfis (
        id,
        nome,
        idade,
        sexo
    )
    values (
        new.id,
        v_nome,
        v_idade,
        v_sexo
    )
    on conflict (id) do update
    set
        nome = excluded.nome,
        idade = excluded.idade,
        sexo = excluded.sexo;

    return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- =========================================================
-- 4. DISPOSITIVOS
-- =========================================================

create table public.dispositivos (
    id uuid primary key default gen_random_uuid(),
    codigo text not null unique,
    perfil_id uuid references public.perfis(id) on delete set null,
    ativo boolean not null default true,
    criado_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

alter table public.dispositivos enable row level security;

create policy "usuario_le_proprio_dispositivo"
on public.dispositivos
for select
to authenticated
using (perfil_id = auth.uid());

-- =========================================================
-- 5. BPM EM TEMPO REAL
-- =========================================================

create table public.bpm_tempo_real (
    perfil_id uuid primary key references public.perfis(id) on delete cascade,
    dispositivo_id uuid references public.dispositivos(id) on delete set null,
    valor_bpm integer not null check (valor_bpm between 0 and 220),
    recebido_em timestamptz not null default now(),
    atualizado_em timestamptz not null default now()
);

alter table public.bpm_tempo_real enable row level security;

create policy "usuario_le_proprio_bpm_tempo_real"
on public.bpm_tempo_real
for select
to authenticated
using (perfil_id = auth.uid());

-- =========================================================
-- 6. HISTÓRICO
-- =========================================================

create table public.historico_bpm (
    id bigint generated by default as identity primary key,
    perfil_id uuid not null references public.perfis(id) on delete cascade,
    dispositivo_id uuid references public.dispositivos(id) on delete set null,
    valor_bpm integer not null check (valor_bpm between 0 and 220),
    registrado_em timestamptz not null default now()
);

create index historico_bpm_perfil_data_idx
on public.historico_bpm (
    perfil_id,
    registrado_em desc
);

alter table public.historico_bpm enable row level security;

create policy "usuario_le_proprio_historico"
on public.historico_bpm
for select
to authenticated
using (perfil_id = auth.uid());

-- =========================================================
-- 7. VINCULAR O DISPOSITIVO AO USUÁRIO LOGADO
-- =========================================================

create or replace function public.vincular_dispositivo_ao_usuario(
    p_codigo_dispositivo text
)
returns public.dispositivos
language plpgsql
security definer
set search_path = public
as $$
declare
    v_usuario uuid;
    v_dispositivo public.dispositivos;
begin
    v_usuario := auth.uid();

    if v_usuario is null then
        raise exception 'Usuário não autenticado';
    end if;

    if not exists (
        select 1
        from public.perfis
        where id = v_usuario
    ) then
        raise exception 'Perfil do usuário não encontrado';
    end if;

    insert into public.dispositivos (
        codigo,
        perfil_id,
        ativo,
        atualizado_em
    )
    values (
        p_codigo_dispositivo,
        v_usuario,
        true,
        now()
    )
    on conflict (codigo) do update
    set
        perfil_id = excluded.perfil_id,
        ativo = true,
        atualizado_em = now()
    returning * into v_dispositivo;

    return v_dispositivo;
end;
$$;

grant execute
on function public.vincular_dispositivo_ao_usuario(text)
to authenticated;

-- =========================================================
-- 8. FUNÇÃO RPC CHAMADA PELO ESP32
-- =========================================================

create or replace function public.registrar_bpm_dispositivo(
    p_codigo_dispositivo text,
    p_valor_bpm integer,
    p_salvar_historico boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_dispositivo_id uuid;
    v_perfil_id uuid;
begin
    if p_codigo_dispositivo is null
       or trim(p_codigo_dispositivo) = '' then
        raise exception 'Código do dispositivo inválido';
    end if;

    if p_valor_bpm < 0 or p_valor_bpm > 220 then
        raise exception 'BPM fora da faixa permitida';
    end if;

    select
        id,
        perfil_id
    into
        v_dispositivo_id,
        v_perfil_id
    from public.dispositivos
    where codigo = p_codigo_dispositivo
      and ativo = true
    limit 1;

    if v_dispositivo_id is null then
        raise exception 'Dispositivo não cadastrado';
    end if;

    if v_perfil_id is null then
        raise exception 'Dispositivo sem usuário vinculado';
    end if;

    insert into public.bpm_tempo_real (
        perfil_id,
        dispositivo_id,
        valor_bpm,
        recebido_em,
        atualizado_em
    )
    values (
        v_perfil_id,
        v_dispositivo_id,
        p_valor_bpm,
        now(),
        now()
    )
    on conflict (perfil_id) do update
    set
        dispositivo_id = excluded.dispositivo_id,
        valor_bpm = excluded.valor_bpm,
        recebido_em = excluded.recebido_em,
        atualizado_em = excluded.atualizado_em;

    if p_salvar_historico and p_valor_bpm > 0 then
        insert into public.historico_bpm (
            perfil_id,
            dispositivo_id,
            valor_bpm,
            registrado_em
        )
        values (
            v_perfil_id,
            v_dispositivo_id,
            p_valor_bpm,
            now()
        );
    end if;
end;
$$;

grant execute
on function public.registrar_bpm_dispositivo(text, integer, boolean)
to anon, authenticated;

-- =========================================================
-- 9. VIEW DO HISTÓRICO AGRUPADO POR MINUTO
-- =========================================================

create or replace view public.vw_bpm_historico_minuto
with (security_invoker = true)
as
select
    perfil_id,
    date_trunc('minute', registrado_em) as minuto,
    round(avg(valor_bpm)::numeric, 2) as bpm_medio,
    min(valor_bpm) as bpm_minimo,
    max(valor_bpm) as bpm_maximo,
    count(*) as quantidade_leituras
from public.historico_bpm
where valor_bpm > 0
group by
    perfil_id,
    date_trunc('minute', registrado_em);

grant select
on public.vw_bpm_historico_minuto
to authenticated;

-- =========================================================
-- 10. PERMISSÕES
-- =========================================================

grant usage on schema public to anon, authenticated;

grant select, update
on public.perfis
to authenticated;

grant select
on public.dispositivos,
   public.bpm_tempo_real,
   public.historico_bpm
to authenticated;

-- =========================================================
-- 11. DISPOSITIVO INICIAL
-- =========================================================

insert into public.dispositivos (
    codigo,
    ativo
)
values (
    'ESP32_PRINCIPAL',
    true
)
on conflict (codigo) do nothing;

```

O mesmo script também está disponível separadamente:

```text
supabase_setup.sql
```

### 3. Configurar o cadastro no frontend

O cadastro deve enviar os metadados esperados pelo gatilho:

```javascript
const { data, error } = await supabase.auth.signUp({
  email,
  password: senha,
  options: {
    data: {
      nome,
      full_name: nome,
      idade: Number(idade),
      sexo: sexo.toLowerCase(),
    },
  },
});
```

Os valores aceitos em `sexo` são:

```text
masculino
feminino
outro
```

O gatilho `on_auth_user_created` cria automaticamente o registro correspondente em `public.perfis`.

### 4. Vincular o ESP32 ao usuário que entrou no site

Após o login e a recuperação da sessão, execute:

```javascript
const { error } = await supabase.rpc(
  "vincular_dispositivo_ao_usuario",
  {
    p_codigo_dispositivo: "ESP32_PRINCIPAL",
  }
);

if (error) {
  console.error("Erro ao vincular dispositivo:", error);
}
```

Esse procedimento atualiza `public.dispositivos.perfil_id`. Assim, quando outra pessoa entra no site, o dispositivo passa a enviar as novas leituras para o perfil que está autenticado.

### 5. Envio realizado pelo ESP32

O firmware chama:

```text
POST /rest/v1/rpc/registrar_bpm_dispositivo
```

Corpo enviado:

```json
{
  "p_codigo_dispositivo": "ESP32_PRINCIPAL",
  "p_valor_bpm": 80,
  "p_salvar_historico": true
}
```

Cabeçalhos:

```text
apikey: CHAVE_ANON_PUBLICA
Authorization: Bearer CHAVE_ANON_PUBLICA
Content-Type: application/json
Prefer: return=minimal
```

A função `registrar_bpm_dispositivo`:

1. localiza `ESP32_PRINCIPAL`;
2. identifica o perfil vinculado;
3. atualiza `bpm_tempo_real`;
4. grava em `historico_bpm` quando `p_salvar_historico` for `true`;
5. não adiciona `0 BPM` ao histórico.

### 6. Consultas utilizadas pelo frontend

BPM atual:

```javascript
const { data, error } = await supabase
  .from("bpm_tempo_real")
  .select("perfil_id, valor_bpm, recebido_em, atualizado_em")
  .eq("perfil_id", sessao.user.id)
  .maybeSingle();
```

Histórico do dia:

```javascript
const inicioHoje = new Date();
inicioHoje.setHours(0, 0, 0, 0);

const fimHoje = new Date(inicioHoje);
fimHoje.setDate(fimHoje.getDate() + 1);

const { data, error } = await supabase
  .from("historico_bpm")
  .select("id, perfil_id, valor_bpm, registrado_em")
  .eq("perfil_id", sessao.user.id)
  .gte("registrado_em", inicioHoje.toISOString())
  .lt("registrado_em", fimHoje.toISOString())
  .order("registrado_em", { ascending: false });
```

Histórico agrupado por minuto:

```javascript
const { data, error } = await supabase
  .from("vw_bpm_historico_minuto")
  .select(
    "perfil_id, minuto, bpm_medio, bpm_minimo, bpm_maximo, quantidade_leituras"
  )
  .eq("perfil_id", sessao.user.id)
  .order("minuto", { ascending: false });
```

Perfil autenticado:

```javascript
const { data, error } = await supabase
  .from("perfis")
  .select("id, nome, idade, sexo, criado_em")
  .eq("id", sessao.user.id)
  .single();
```

### 7. Testar o vínculo do dispositivo

Depois de entrar no site, execute no SQL Editor:

```sql
select
    codigo,
    perfil_id,
    ativo,
    atualizado_em
from public.dispositivos
where codigo = 'ESP32_PRINCIPAL';
```

O campo `perfil_id` deve conter o UUID do usuário autenticado.

### 8. Testar as leituras

Tempo real:

```sql
select *
from public.bpm_tempo_real
order by atualizado_em desc;
```

Histórico:

```sql
select *
from public.historico_bpm
order by registrado_em desc
limit 100;
```

Agrupamento por minuto:

```sql
select *
from public.vw_bpm_historico_minuto
order by minuto desc
limit 100;
```

### 9. Erros comuns

`Dispositivo não cadastrado`:

```sql
insert into public.dispositivos (codigo, ativo)
values ('ESP32_PRINCIPAL', true)
on conflict (codigo) do nothing;
```

`Dispositivo sem usuário vinculado`:

- entre no site;
- aguarde a chamada de `vincular_dispositivo_ao_usuario`;
- confirme o `perfil_id` na tabela `dispositivos`.

`Database error saving new user`:

- recrie `handle_new_user`;
- recrie o gatilho `on_auth_user_created`;
- confirme que `sexo` está em minúsculo;
- confirme que `idade` está entre 0 e 130.

Erro de RLS ao consultar:

- confirme que o usuário está autenticado;
- confirme que `perfil_id` é igual a `auth.uid()`;
- recrie as políticas descritas no script.

## Acesso local pelo computador e pelo celular

O projeto pode ser executado localmente com o servidor de desenvolvimento do Vite.

### Acesso no próprio computador

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
npm install
npm run dev -- --host 0.0.0.0
```

No computador, acesse:

```text
http://localhost:5173
```

### Acesso pelo celular

`localhost` funciona somente no próprio computador. No celular, é necessário usar o endereço IPv4 do computador.

Descubra o IPv4 no PowerShell:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
Where-Object {
    $_.IPAddress -notlike "127.*" -and
    $_.IPAddress -notlike "169.254*"
} |
Select-Object InterfaceAlias, IPAddress
```

Escolha o endereço da rede Wi-Fi ou Ethernet. Exemplo:

```text
192.168.1.25
```

Com o servidor iniciado por:

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
npm run dev -- --host 0.0.0.0
```

abra no celular:

```text
http://192.168.1.25:5173
```

O computador e o celular precisam estar conectados à mesma rede local.

### Criar o QR Code do endereço local

Na pasta do projeto, execute:

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"

$IP = (
    Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254*" -and
        $_.InterfaceAlias -notmatch "vEthernet|Loopback"
    } |
    Sort-Object InterfaceMetric |
    Select-Object -First 1 -ExpandProperty IPAddress
)

$URL = "http://${IP}:5173"

npx --yes qrcode -o ".\qrcode-monitor-bpm.png" $URL

Write-Host "Endereço local: $URL"
Write-Host "QR Code criado em: qrcode-monitor-bpm.png"
```

O arquivo será criado em:

```text
C:\Users\joao-\bpm-monitor-frontend\qrcode-monitor-bpm.png
```

Escaneie a imagem pelo celular enquanto o servidor estiver em execução.

### Script automático

O repositório pode incluir o arquivo:

```text
gerar_qrcode_local.ps1
```

Execute:

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
powershell -ExecutionPolicy Bypass -File ".\gerar_qrcode_local.ps1"
```

O script identifica o IPv4, inicia o site em uma nova janela e cria o QR Code automaticamente.

### Liberação no Firewall do Windows

Se o celular não abrir o endereço, permita o Node.js no Firewall do Windows para redes privadas.

Também é possível liberar a porta 5173 pelo PowerShell aberto como administrador:

```powershell
New-NetFirewallRule `
  -DisplayName "Monitor BPM Vite 5173" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 5173 `
  -Action Allow `
  -Profile Private
```

Para remover essa regra:

```powershell
Remove-NetFirewallRule -DisplayName "Monitor BPM Vite 5173"
```

## Configuração do frontend

### 1. Clonar o repositório

```powershell
git clone https://github.com/Jonhmartines/bpm-monitor-frontend.git
cd "bpm-monitor-frontend"
```

No computador usado no desenvolvimento:

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
```

### 2. Instalar as dependências

```powershell
npm install
```

### 3. Criar o arquivo de ambiente

```powershell
Copy-Item ".env.example" ".env.local"
```

Conteúdo de `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Nunca coloque a chave `service_role` no frontend.

### 4. Executar em desenvolvimento

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
npm run dev -- --host
```

Acesso local:

```text
http://localhost:5173
```

### 5. Executar o build local sem o servidor do Vite

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
npm run build
cd dist
python -m http.server 8080
```

Acesso:

```text
http://localhost:8080
```

## Configuração do firmware

O projeto PlatformIO utilizado no ESP32 está em:

```text
C:\Users\joao-\OneDrive\Documentos\PlatformIO\Projects\Batimento
```

Estrutura principal:

```text
Batimento/
├── platformio.ini
└── src/
    └── main.c
```

Exemplo de `platformio.ini`:

```ini
[env:esp32dev]
platform = espressif32@6.7.0
board = esp32dev
framework = espidf
monitor_speed = 115200
upload_port = COM3
monitor_port = COM3
```

Para compilar, gravar e abrir o monitor:

```powershell
cd "C:\Users\joao-\OneDrive\Documentos\PlatformIO\Projects\Batimento"

& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target clean
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" run --target upload --upload-port COM3
& "$env:USERPROFILE\.platformio\penv\Scripts\platformio.exe" device monitor --port COM3 --baud 115200
```

## Funcionamento da leitura

1. O ESP32 conecta-se a uma das redes configuradas;
2. O AD8232 fornece o sinal analógico ao GPIO34;
3. O firmware calibra o sinal;
4. O ADC é suavizado;
5. O algoritmo identifica pulsos válidos;
6. Intervalos muito curtos, longos ou inconsistentes são rejeitados;
7. O BPM é calculado usando intervalos RR;
8. A leitura é colocada em uma fila;
9. Uma tarefa separada realiza o envio HTTPS;
10. O Supabase atualiza o registro em tempo real;
11. Leituras periódicas são adicionadas ao histórico;
12. O frontend consulta e apresenta os dados do usuário logado.

## Funcionamento do Dashboard

O Dashboard consulta somente registros pertencentes ao dia atual, considerando o horário local do navegador.

Ao iniciar um novo dia:

- o gráfico começa sem as leituras do dia anterior;
- a média diária é recalculada;
- o total de registros volta a considerar somente o novo dia;
- as leituras anteriores permanecem disponíveis na página de Histórico.

A média do dia utiliza todas as leituras encontradas no período atual. O gráfico pode limitar a quantidade visualizada para manter a interface leve.

## Segurança

- Não envie `.env.local` ao GitHub;
- Não use a chave `service_role` no frontend;
- Use somente a chave `anon/public` no navegador;
- Mantenha o Row Level Security ativo;
- Não publique senhas reais de Wi-Fi no repositório;
- Não publique chaves privadas;
- O ESP32 usa a identificação do dispositivo para associar as leituras ao perfil correto;
- Para uma versão de produção, recomenda-se uma API intermediária e autenticação específica por dispositivo.

## Build de produção

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"
Remove-Item -Recurse -Force ".\dist" -ErrorAction SilentlyContinue
npm install
npm run build
```

O resultado será criado em:

```text
dist/
```

## Atualização do GitHub

```powershell
cd "C:\Users\joao-\bpm-monitor-frontend"

git status
git add .
git commit -m "Publica nova versão do Monitor BPM"
git push origin main
```

## Estado atual

- Autenticação funcionando;
- Cadastro funcionando;
- Perfil criado automaticamente;
- Dashboard exibindo somente os dados do dia;
- Média diária calculada;
- Histórico por data;
- Interface web e mobile;
- Tema claro e escuro;
- ESP32 conectado ao Wi-Fi;
- Leitura do AD8232 funcionando;
- Envio ao Supabase por HTTPS;
- Troca do perfil por vínculo do dispositivo;
- Execução local preparada para computador e celular na mesma rede Wi-Fi.

## Aviso

O sistema foi desenvolvido para estudo, demonstração e prototipagem. Os valores apresentados podem sofrer interferência de movimento, contato dos eletrodos, ruído elétrico e limitações do algoritmo.

Não utilize o projeto para diagnóstico ou tomada de decisão médica.
