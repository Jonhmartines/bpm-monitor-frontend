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

O objetivo do projeto é permitir o acompanhamento de BPM de um paciente a partir de leituras enviadas por um ESP32.

O sistema permite:

- Cadastro de usuários;
- Login com e-mail e senha;
- Vinculação das leituras ao paciente logado;
- Visualização do BPM em tempo real;
- Consulta de histórico diário;
- Interface responsiva para computador e celular;
- Integração com Supabase para autenticação, banco de dados e API;
- Publicação do frontend na Vercel.

Este projeto possui finalidade acadêmica e de prototipagem.

## Tecnologias utilizadas

### Hardware

- ESP32;
- Sensor AD8232;
- Eletrodos para captação do sinal cardíaco;
- Cabo USB;
- Rede Wi-Fi.

### Backend

- Supabase Auth;
- Supabase Database;
- PostgreSQL;
- Supabase REST API;
- Row Level Security;
- Triggers;
- Views.

### Frontend

- React;
- Vite;
- Tailwind CSS;
- Supabase JS;
- Vercel.

## Arquitetura geral do sistema

```text
Sensor AD8232
      |
      v
ESP32 lê o sinal analógico
      |
      v
Código processa o sinal
      |
      v
BPM é calculado ou estimado
      |
      v
ESP32 envia JSON via HTTPS
      |
      v
Supabase REST API recebe os dados
      |
      v
Banco PostgreSQL armazena as leituras
      |
      v
Frontend React consulta os dados
      |
      v
Usuário visualiza BPM, histórico e perfil
```

## Estrutura do projeto frontend

```text
bpm-monitor-frontend/
│
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx
│   │   ├── CardResumo.jsx
│   │   ├── GraficoBarras.jsx
│   │   ├── Header.jsx
│   │   └── InfoLinha.jsx
│   │
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

Configure as variáveis de ambiente:

```text
VITE_SUPABASE_URL=SUA_URL_DO_SUPABASE
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON_PUBLICA
```

Inicie o projeto:

```bash
npm run dev
```

Acesse no navegador:

```text
http://localhost:5173
```

## Variáveis de ambiente do frontend

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

A chave `service_role` não deve ser colocada no frontend, no GitHub ou na Vercel.

Apenas a chave `anon/public` deve ser usada no frontend.

## Configuração do Supabase

### 1. Criar tabela de perfis

A tabela `perfis` armazena os dados principais do usuário cadastrado.

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

Essa função é executada quando um novo usuário é criado no Supabase Auth.

Ela pega os dados enviados no cadastro e insere automaticamente na tabela `perfis`.

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

O trigger chama a função `handle_new_user()` após a criação de um usuário em `auth.users`.

```sql
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();
```

### 4. Criar tabela de BPM em tempo real

A tabela `bpm_tempo_real` guarda o valor mais recente de BPM de cada usuário.

O campo `perfil_id` é a chave principal para garantir que cada usuário tenha apenas um registro atual.

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

A tabela `historico_bpm` guarda várias leituras ao longo do tempo.

Ela é usada para montar o histórico diário do paciente.

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

A view `vw_bpm_historico_minuto` agrupa as leituras por minuto.

Ela calcula:

- BPM médio;
- BPM mínimo;
- BPM máximo;
- Quantidade de leituras no minuto.

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

### 7. Ativar Row Level Security

O RLS é usado para proteger os dados.

Com ele ativado, cada usuário só consegue visualizar os próprios dados.

```sql
alter table public.perfis enable row level security;
alter table public.bpm_tempo_real enable row level security;
alter table public.historico_bpm enable row level security;
```

### 8. Criar políticas para perfis

Permite que o usuário veja apenas o próprio perfil.

```sql
drop policy if exists "Usuário vê o próprio perfil" on public.perfis;

create policy "Usuário vê o próprio perfil"
on public.perfis
for select
to authenticated
using (auth.uid() = id);
```

Permite que o usuário atualize apenas o próprio perfil.

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

Permite que o usuário veja apenas o próprio BPM em tempo real.

```sql
drop policy if exists "Usuário vê o próprio BPM em tempo real" on public.bpm_tempo_real;

create policy "Usuário vê o próprio BPM em tempo real"
on public.bpm_tempo_real
for select
to authenticated
using (auth.uid() = perfil_id);
```

Permite que o usuário veja apenas o próprio histórico.

```sql
drop policy if exists "Usuário vê o próprio histórico" on public.historico_bpm;

create policy "Usuário vê o próprio histórico"
on public.historico_bpm
for select
to authenticated
using (auth.uid() = perfil_id);
```

### 10. Políticas para envio do ESP32 em protótipo acadêmico

Para o protótipo, o ESP32 pode enviar dados diretamente para o Supabase usando a anon key.

Permite inserir dados em `bpm_tempo_real`.

```sql
drop policy if exists "ESP32 insere BPM em tempo real" on public.bpm_tempo_real;

create policy "ESP32 insere BPM em tempo real"
on public.bpm_tempo_real
for insert
to anon
with check (true);
```

Permite atualizar dados em `bpm_tempo_real`.

```sql
drop policy if exists "ESP32 atualiza BPM em tempo real" on public.bpm_tempo_real;

create policy "ESP32 atualiza BPM em tempo real"
on public.bpm_tempo_real
for update
to anon
using (true)
with check (true);
```

Permite inserir leituras no histórico.

```sql
drop policy if exists "ESP32 insere histórico de BPM" on public.historico_bpm;

create policy "ESP32 insere histórico de BPM"
on public.historico_bpm
for insert
to anon
with check (true);
```

Em uma versão final de produção, o recomendado é não deixar o ESP32 escrever diretamente no banco. O ideal seria usar uma API intermediária, uma Edge Function ou outro backend próprio para validar os dados antes de gravar.

## Teste de envio para o Supabase via PowerShell

Antes de usar o ESP32, é possível testar o envio pelo PowerShell.

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

## Programação do ESP32

O ESP32 é responsável por ler o sensor AD8232, calcular ou estimar o BPM e enviar os dados para o Supabase.

### Fluxo do ESP32

```text
Inicia o programa
      |
      v
Conecta no Wi-Fi
      |
      v
Configura o ADC
      |
      v
Lê o sinal analógico do AD8232
      |
      v
Detecta batimentos
      |
      v
Calcula o BPM
      |
      v
Monta um JSON
      |
      v
Envia para bpm_tempo_real
      |
      v
Envia para historico_bpm
```

### Requisitos para compilar o código

- ESP-IDF instalado;
- ESP32 configurado;
- Sensor AD8232 conectado ao pino ADC escolhido;
- Rede Wi-Fi disponível;
- URL do Supabase;
- Chave anon/public do Supabase;
- UUID do perfil do usuário;
- UUID do dispositivo.

### Comandos básicos do ESP-IDF

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

## Código genérico demonstrativo do ESP32

O código abaixo é uma versão genérica e demonstrativa.

Ele mostra a lógica principal de:

- Conectar no Wi-Fi;
- Ler o sinal do AD8232 pelo ADC;
- Detectar batimentos de forma simples;
- Calcular BPM;
- Enviar BPM em tempo real para o Supabase;
- Registrar leituras no histórico.

Antes de usar, é necessário trocar os valores de Wi-Fi, URL do Supabase, anon key, perfil do usuário e dispositivo.

```c
#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_system.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "esp_timer.h"
#include "nvs_flash.h"
#include "esp_crt_bundle.h"

#include "driver/adc.h"

#define WIFI_SSID "NOME_DA_REDE_WIFI"
#define WIFI_PASS "SENHA_DA_REDE_WIFI"

#define SUPABASE_URL "https://seu-projeto.supabase.co"
#define SUPABASE_ANON_KEY "sua-chave-anon-publica"

#define PERFIL_ID "uuid-do-perfil"
#define DISPOSITIVO_ID "uuid-do-dispositivo"

#define ADC_CHANNEL ADC1_CHANNEL_6
#define ADC_WIDTH ADC_WIDTH_BIT_12
#define ADC_ATTEN ADC_ATTEN_DB_11

#define LIMIAR_BATIMENTO 2300
#define TEMPO_REFRATARIO_MS 350
#define INTERVALO_ENVIO_HISTORICO_MS 5000

static const char *TAG = "BPM_MONITOR";

static bool wifi_conectado = false;

static void wifi_event_handler(
    void *arg,
    esp_event_base_t event_base,
    int32_t event_id,
    void *event_data
) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    }

    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        wifi_conectado = false;
        esp_wifi_connect();
        ESP_LOGI(TAG, "Tentando reconectar ao Wi-Fi...");
    }

    if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        wifi_conectado = true;
        ESP_LOGI(TAG, "Wi-Fi conectado com sucesso.");
    }
}

static void iniciar_wifi(void) {
    nvs_flash_init();
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);

    esp_event_handler_instance_register(
        WIFI_EVENT,
        ESP_EVENT_ANY_ID,
        &wifi_event_handler,
        NULL,
        NULL
    );

    esp_event_handler_instance_register(
        IP_EVENT,
        IP_EVENT_STA_GOT_IP,
        &wifi_event_handler,
        NULL,
        NULL
    );

    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS
        }
    };

    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
}

static void configurar_adc(void) {
    adc1_config_width(ADC_WIDTH);
    adc1_config_channel_atten(ADC_CHANNEL, ADC_ATTEN);
}

static int ler_sensor_ad8232(void) {
    return adc1_get_raw(ADC_CHANNEL);
}

static esp_err_t enviar_json_supabase(const char *endpoint, const char *json, bool usar_upsert) {
    char url[300];

    if (usar_upsert) {
        snprintf(url, sizeof(url), "%s%s?on_conflict=perfil_id", SUPABASE_URL, endpoint);
    } else {
        snprintf(url, sizeof(url), "%s%s", SUPABASE_URL, endpoint);
    }

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .crt_bundle_attach = esp_crt_bundle_attach
    };

    esp_http_client_handle_t client = esp_http_client_init(&config);

    esp_http_client_set_header(client, "apikey", SUPABASE_ANON_KEY);
    esp_http_client_set_header(client, "Authorization", "Bearer " SUPABASE_ANON_KEY);
    esp_http_client_set_header(client, "Content-Type", "application/json");

    if (usar_upsert) {
        esp_http_client_set_header(client, "Prefer", "resolution=merge-duplicates");
    }

    esp_http_client_set_post_field(client, json, strlen(json));

    esp_err_t err = esp_http_client_perform(client);

    if (err == ESP_OK) {
        int status = esp_http_client_get_status_code(client);
        ESP_LOGI(TAG, "Resposta HTTP: %d", status);
    } else {
        ESP_LOGE(TAG, "Erro HTTP: %s", esp_err_to_name(err));
    }

    esp_http_client_cleanup(client);

    return err;
}

static void enviar_bpm_tempo_real(int bpm) {
    char json[400];

    snprintf(
        json,
        sizeof(json),
        "{"
        "\"perfil_id\":\"%s\","
        "\"dispositivo_id\":\"%s\","
        "\"valor_bpm\":%d"
        "}",
        PERFIL_ID,
        DISPOSITIVO_ID,
        bpm
    );

    enviar_json_supabase("/rest/v1/bpm_tempo_real", json, true);
}

static void enviar_bpm_historico(int bpm) {
    char json[400];

    snprintf(
        json,
        sizeof(json),
        "{"
        "\"perfil_id\":\"%s\","
        "\"dispositivo_id\":\"%s\","
        "\"valor_bpm\":%d"
        "}",
        PERFIL_ID,
        DISPOSITIVO_ID,
        bpm
    );

    enviar_json_supabase("/rest/v1/historico_bpm", json, false);
}

static int calcular_bpm_por_intervalo(int64_t intervalo_ms) {
    if (intervalo_ms <= 0) {
        return 0;
    }

    int bpm = (int)(60000 / intervalo_ms);

    if (bpm < 30 || bpm > 220) {
        return 0;
    }

    return bpm;
}

void app_main(void) {
    iniciar_wifi();
    configurar_adc();

    int64_t ultimo_batimento_ms = 0;
    int64_t ultimo_envio_historico_ms = 0;

    bool acima_do_limiar = false;
    int bpm_atual = 0;

    while (true) {
        int leitura_adc = ler_sensor_ad8232();
        int64_t agora_ms = esp_timer_get_time() / 1000;

        if (
            leitura_adc > LIMIAR_BATIMENTO &&
            !acima_do_limiar &&
            (agora_ms - ultimo_batimento_ms) > TEMPO_REFRATARIO_MS
        ) {
            if (ultimo_batimento_ms > 0) {
                int64_t intervalo = agora_ms - ultimo_batimento_ms;
                int bpm_calculado = calcular_bpm_por_intervalo(intervalo);

                if (bpm_calculado > 0) {
                    bpm_atual = bpm_calculado;
                    ESP_LOGI(TAG, "BPM: %d", bpm_atual);

                    if (wifi_conectado) {
                        enviar_bpm_tempo_real(bpm_atual);
                    }
                }
            }

            ultimo_batimento_ms = agora_ms;
            acima_do_limiar = true;
        }

        if (leitura_adc < LIMIAR_BATIMENTO - 200) {
            acima_do_limiar = false;
        }

        if (
            bpm_atual > 0 &&
            wifi_conectado &&
            (agora_ms - ultimo_envio_historico_ms) > INTERVALO_ENVIO_HISTORICO_MS
        ) {
            enviar_bpm_historico(bpm_atual);
            ultimo_envio_historico_ms = agora_ms;
        }

        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
```

## Explicação do código do ESP32

### Bibliotecas

O código usa bibliotecas do ESP-IDF para:

- Wi-Fi;
- Eventos do sistema;
- Requisições HTTP;
- Leitura ADC;
- Temporização;
- Logs;
- Certificados TLS.

### Configurações principais

No começo do código ficam os dados que precisam ser alterados para cada projeto:

```c
#define WIFI_SSID "NOME_DA_REDE_WIFI"
#define WIFI_PASS "SENHA_DA_REDE_WIFI"

#define SUPABASE_URL "https://seu-projeto.supabase.co"
#define SUPABASE_ANON_KEY "sua-chave-anon-publica"

#define PERFIL_ID "uuid-do-perfil"
#define DISPOSITIVO_ID "uuid-do-dispositivo"
```

Esses campos indicam:

- Nome da rede Wi-Fi;
- Senha da rede Wi-Fi;
- URL do Supabase;
- Chave pública anon;
- ID do perfil do paciente;
- ID do dispositivo.

### Configuração do ADC

O sensor AD8232 envia um sinal analógico.

O ESP32 lê esse sinal por meio do ADC.

```c
#define ADC_CHANNEL ADC1_CHANNEL_6
#define ADC_WIDTH ADC_WIDTH_BIT_12
#define ADC_ATTEN ADC_ATTEN_DB_11
```

O canal ADC precisa ser alterado de acordo com o pino usado no ESP32.

### Limiar de batimento

O valor abaixo define a partir de qual leitura o código considera que pode ter ocorrido um batimento.

```c
#define LIMIAR_BATIMENTO 2300
```

Esse valor pode precisar de ajuste dependendo do sensor, da ligação, dos eletrodos e do ruído do sinal.

### Tempo refratário

O tempo refratário evita que o mesmo batimento seja contado várias vezes.

```c
#define TEMPO_REFRATARIO_MS 350
```

Depois de detectar um batimento, o código espera um tempo mínimo antes de aceitar outro.

### Conexão Wi-Fi

A função `iniciar_wifi()` inicializa o Wi-Fi do ESP32.

Ela configura o ESP32 no modo estação, conecta na rede informada e acompanha o estado da conexão.

Quando o ESP32 recebe IP, a variável `wifi_conectado` fica verdadeira.

### Leitura do sensor

A função abaixo lê o valor bruto do ADC:

```c
static int ler_sensor_ad8232(void) {
    return adc1_get_raw(ADC_CHANNEL);
}
```

O valor lido pode variar de acordo com o sinal recebido pelo AD8232.

### Detecção de batimento

O código verifica se a leitura passou do limiar configurado.

```c
if (
    leitura_adc > LIMIAR_BATIMENTO &&
    !acima_do_limiar &&
    (agora_ms - ultimo_batimento_ms) > TEMPO_REFRATARIO_MS
)
```

Essa condição evita três problemas:

- Contar ruído como batimento;
- Contar o mesmo pico várias vezes;
- Detectar batimentos em intervalos muito curtos.

### Cálculo do BPM

O BPM é calculado a partir do intervalo entre dois batimentos.

```text
BPM = 60000 / intervalo_em_milissegundos
```

Exemplo:

```text
Intervalo entre batimentos = 1000 ms
BPM = 60000 / 1000
BPM = 60
```

### Envio para o Supabase

A função `enviar_json_supabase()` monta a requisição HTTP.

Ela envia:

- URL;
- Headers;
- JSON;
- Método POST.

Headers usados:

```text
apikey
Authorization
Content-Type
Prefer
```

O header `Prefer` é usado no envio para `bpm_tempo_real`, porque essa tabela usa `perfil_id` como chave primária e deve atualizar o registro existente.

### Envio para BPM em tempo real

A função `enviar_bpm_tempo_real()` envia o BPM atual para:

```text
/rest/v1/bpm_tempo_real?on_conflict=perfil_id
```

Ela faz um upsert, ou seja:

- Se ainda não existir registro para aquele `perfil_id`, cria um novo;
- Se já existir, atualiza o registro existente.

### Envio para histórico

A função `enviar_bpm_historico()` envia o BPM para:

```text
/rest/v1/historico_bpm
```

Nesse caso, o objetivo é criar várias leituras ao longo do tempo.

Por isso, o histórico não substitui o registro anterior.

### TLS e HTTPS

O Supabase usa HTTPS.

Por isso, o ESP32 precisa validar o certificado da conexão.

No código, isso é feito com:

```c
.crt_bundle_attach = esp_crt_bundle_attach
```

Esse recurso usa o bundle de certificados do ESP-IDF.

## Explicação do frontend

O frontend é feito em React com Vite.

Ele possui:

- Tela de login;
- Tela de cadastro;
- Dashboard;
- Histórico;
- Perfil;
- Layout responsivo.

### Login e cadastro

O login usa:

```js
supabase.auth.signInWithPassword()
```

O cadastro usa:

```js
supabase.auth.signUp()
```

No cadastro, são enviados os metadados:

```js
nome
full_name
idade
sexo
```

Esses dados são usados pela trigger do Supabase para criar automaticamente um registro em `perfis`.

### Controle de sessão

O `App.jsx` controla a sessão do usuário com:

```js
supabase.auth.getSession()
```

e também acompanha mudanças de login/logout com:

```js
supabase.auth.onAuthStateChange()
```

Quando existe uma sessão ativa, o sistema busca o perfil do usuário na tabela `perfis`.

### Dashboard

O Dashboard consulta a tabela:

```text
bpm_tempo_real
```

Ele busca o registro do usuário logado usando:

```text
perfil_id = sessao.user.id
```

O painel atualiza a consulta periodicamente para exibir o BPM mais recente.

### Histórico

A tela de histórico consulta os dados salvos no banco e organiza os registros por data.

Ela pode buscar dados em:

```text
vw_bpm_historico_minuto
historico_bpm
bpm_tempo_real
```

O objetivo é mostrar os valores de BPM registrados em cada dia.

### Perfil

A tela de perfil mostra os dados reais do usuário logado:

- Nome;
- E-mail;
- Idade;
- Sexo;
- Data de criação.

## Explicação do backend

O backend do projeto é baseado no Supabase.

Ele é responsável por:

- Autenticar usuários;
- Criar perfis automaticamente;
- Armazenar o BPM em tempo real;
- Armazenar o histórico de BPM;
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

Depois de cada alteração no projeto, basta enviar para o GitHub:

```bash
git add .
git commit -m "Atualiza frontend"
git push
```

O Vercel detecta o push e faz o deploy automaticamente.

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
- Usar uma API intermediária em uma versão final de produção;
- Ajustar o limiar do sensor conforme o sinal real do AD8232;
- Validar as leituras antes de usar em um cenário real.

## Status do projeto

- Frontend criado;
- Login funcionando;
- Cadastro funcionando;
- Integração com Supabase configurada;
- Dashboard consultando BPM real;
- Histórico organizado por datas;
- Perfil exibindo dados reais;
- Deploy publicado no Vercel;
- Repositório disponível no GitHub.

## Correção do fundo da versão web

A versão web da tela inicial foi ajustada para usar as imagens como fundo da página inteira.

Antes, a imagem podia parecer limitada a uma caixa lateral. Agora:

- a imagem web fica aplicada no fundo completo da tela;
- a área esquerda não possui mais uma caixa própria segurando a imagem;
- o texto principal aparece sobre o fundo;
- a caixa de login fica separada sobre o fundo;
- as miniaturas abaixo permitem alternar as imagens web;
- a versão mobile continua usando imagens verticais próprias.
