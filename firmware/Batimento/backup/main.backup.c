#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "freertos/queue.h"

#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_log.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "esp_timer.h"
#include "esp_err.h"
#include "nvs_flash.h"
#include "esp_crt_bundle.h"

#include "driver/adc.h"
#include "driver/gpio.h"

#define SUPABASE_URL "https://rpwldtudjsvsthegkjjz.supabase.co"
#define SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd2xkdHVkanN2c3RoZWdramp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTI0MzAsImV4cCI6MjA5Mjk4ODQzMH0.WxRwRLlxSOTWlrg98WyyfXiOQhil8xG8j3MefZw4YZo"

#define CODIGO_DISPOSITIVO "ESP32_PRINCIPAL"

#define ADC_CHANNEL ADC1_CHANNEL_6
#define ADC_WIDTH ADC_WIDTH_BIT_12
#define ADC_ATTEN ADC_ATTEN_DB_11

#define LO_PLUS_GPIO GPIO_NUM_19
#define LO_MINUS_GPIO GPIO_NUM_18

#define INTERVALO_LEITURA_MS 5
#define TEMPO_CALIBRACAO_MS 3000

#define LIMIAR_MINIMO_ECG 45
#define PICO_MAXIMO_ECG 1500
#define PERIODO_REFRATARIO_MS 400

#define RR_MINIMO_MS 400
#define RR_MAXIMO_MS 1500
#define BPM_MINIMO_VALIDO 40
#define BPM_MAXIMO_VALIDO 150

#define TAMANHO_FILTRO_RR 7
#define RR_MINIMO_PARA_EXIBIR 3

#define INTERVALO_ENVIO_TEMPO_REAL_MS 3000
#define INTERVALO_ENVIO_HISTORICO_MS 15000
#define INTERVALO_LOG_ADC_MS 1000

#define WIFI_CONNECTED_BIT BIT0
#define WIFI_TIMEOUT_MS 15000

typedef struct {
    const char *ssid;
    const char *senha;
} wifi_credencial_t;

typedef struct {
    int bpm;
    bool salvar_historico;
} envio_bpm_t;

typedef struct {
    int rr[TAMANHO_FILTRO_RR];
    int quantidade;
    int indice;
    int64_t ultimo_pico_ms;
    int bpm_filtrado;
} filtro_bpm_t;

static wifi_credencial_t redes_wifi[] = {
    {"UnivapWifi", "universidade"},
    {"Djenane2ghz", "djenanesantos"}
};

static const int total_redes_wifi =
    sizeof(redes_wifi) / sizeof(redes_wifi[0]);

static const char *TAG = "BPM_MONITOR";

static EventGroupHandle_t wifi_event_group;
static QueueHandle_t fila_envio_bpm;

static char ssid_atual[33] = {0};
static bool rede_fixada = false;
static bool ignorar_desconexao = false;

static char http_resposta[1024];
static int http_resposta_len = 0;

static esp_err_t http_event_handler(esp_http_client_event_t *evt)
{
    if (
        evt->event_id == HTTP_EVENT_ON_DATA &&
        evt->data != NULL &&
        evt->data_len > 0
    ) {
        int espaco =
            (int)sizeof(http_resposta) - http_resposta_len - 1;

        int copiar =
            evt->data_len < espaco ? evt->data_len : espaco;

        if (copiar > 0) {
            memcpy(
                http_resposta + http_resposta_len,
                evt->data,
                copiar
            );

            http_resposta_len += copiar;
            http_resposta[http_resposta_len] = '\0';
        }
    }

    return ESP_OK;
}

static void wifi_event_handler(
    void *arg,
    esp_event_base_t event_base,
    int32_t event_id,
    void *event_data
)
{
    if (
        event_base == WIFI_EVENT &&
        event_id == WIFI_EVENT_STA_DISCONNECTED
    ) {
        xEventGroupClearBits(
            wifi_event_group,
            WIFI_CONNECTED_BIT
        );

        if (ignorar_desconexao) {
            return;
        }

        ESP_LOGE(TAG, "Wi-Fi desconectado.");

        if (rede_fixada) {
            ESP_LOGI(
                TAG,
                "Reconectando na mesma rede: %s",
                ssid_atual
            );

            esp_wifi_connect();
        }
    }

    if (
        event_base == IP_EVENT &&
        event_id == IP_EVENT_STA_GOT_IP
    ) {
        xEventGroupSetBits(
            wifi_event_group,
            WIFI_CONNECTED_BIT
        );

        ESP_LOGI(
            TAG,
            "Wi-Fi conectado em: %s",
            ssid_atual
        );
    }
}

static bool wifi_esta_conectado(void)
{
    EventBits_t bits =
        xEventGroupGetBits(wifi_event_group);

    return (bits & WIFI_CONNECTED_BIT) != 0;
}

static bool tentar_conectar_wifi(
    const char *ssid,
    const char *senha
)
{
    wifi_config_t wifi_config = {0};

    memset(ssid_atual, 0, sizeof(ssid_atual));

    strncpy(
        ssid_atual,
        ssid,
        sizeof(ssid_atual) - 1
    );

    strncpy(
        (char *)wifi_config.sta.ssid,
        ssid,
        sizeof(wifi_config.sta.ssid) - 1
    );

    strncpy(
        (char *)wifi_config.sta.password,
        senha,
        sizeof(wifi_config.sta.password) - 1
    );

    wifi_config.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
    wifi_config.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
    wifi_config.sta.threshold.rssi = -127;
    wifi_config.sta.pmf_cfg.capable = true;
    wifi_config.sta.pmf_cfg.required = false;

    if (strlen(senha) == 0) {
        wifi_config.sta.threshold.authmode = WIFI_AUTH_OPEN;
    } else {
        wifi_config.sta.threshold.authmode =
            WIFI_AUTH_WPA2_PSK;
    }

    rede_fixada = false;
    ignorar_desconexao = true;

    xEventGroupClearBits(
        wifi_event_group,
        WIFI_CONNECTED_BIT
    );

    esp_wifi_disconnect();
    vTaskDelay(pdMS_TO_TICKS(500));

    ignorar_desconexao = false;

    ESP_LOGI(
        TAG,
        "Tentando conectar em: %s",
        ssid_atual
    );

    esp_err_t ret =
        esp_wifi_set_config(WIFI_IF_STA, &wifi_config);

    if (ret != ESP_OK) {
        ESP_LOGE(
            TAG,
            "Erro ao configurar Wi-Fi %s: %s",
            ssid_atual,
            esp_err_to_name(ret)
        );

        return false;
    }

    ret = esp_wifi_connect();

    if (ret != ESP_OK) {
        ESP_LOGE(
            TAG,
            "Erro ao iniciar conexão em %s: %s",
            ssid_atual,
            esp_err_to_name(ret)
        );

        return false;
    }

    EventBits_t bits = xEventGroupWaitBits(
        wifi_event_group,
        WIFI_CONNECTED_BIT,
        pdFALSE,
        pdFALSE,
        pdMS_TO_TICKS(WIFI_TIMEOUT_MS)
    );

    if (bits & WIFI_CONNECTED_BIT) {
        rede_fixada = true;

        ESP_LOGI(
            TAG,
            "Rede fixada: %s",
            ssid_atual
        );

        return true;
    }

    ESP_LOGE(
        TAG,
        "Não conectou em: %s",
        ssid_atual
    );

    ignorar_desconexao = true;

    esp_wifi_disconnect();
    vTaskDelay(pdMS_TO_TICKS(500));

    ignorar_desconexao = false;

    return false;
}

static void conectar_primeira_rede_disponivel(void)
{
    bool conectado = false;

    while (!conectado) {
        for (int i = 0; i < total_redes_wifi; i++) {
            if (
                tentar_conectar_wifi(
                    redes_wifi[i].ssid,
                    redes_wifi[i].senha
                )
            ) {
                conectado = true;
                break;
            }
        }

        if (!conectado) {
            ESP_LOGE(
                TAG,
                "Nenhuma rede conectou. Tentando novamente em 5 segundos."
            );

            vTaskDelay(pdMS_TO_TICKS(5000));
        }
    }
}

static void iniciar_wifi(void)
{
    esp_err_t ret = nvs_flash_init();

    if (
        ret == ESP_ERR_NVS_NO_FREE_PAGES ||
        ret == ESP_ERR_NVS_NEW_VERSION_FOUND
    ) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    } else {
        ESP_ERROR_CHECK(ret);
    }

    wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());

    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();

    ESP_ERROR_CHECK(esp_wifi_init(&cfg));
    ESP_ERROR_CHECK(
        esp_wifi_set_storage(WIFI_STORAGE_RAM)
    );

    ESP_ERROR_CHECK(
        esp_event_handler_instance_register(
            WIFI_EVENT,
            ESP_EVENT_ANY_ID,
            &wifi_event_handler,
            NULL,
            NULL
        )
    );

    ESP_ERROR_CHECK(
        esp_event_handler_instance_register(
            IP_EVENT,
            IP_EVENT_STA_GOT_IP,
            &wifi_event_handler,
            NULL,
            NULL
        )
    );

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_ps(WIFI_PS_NONE));
    ESP_ERROR_CHECK(esp_wifi_start());

    vTaskDelay(pdMS_TO_TICKS(1000));

    conectar_primeira_rede_disponivel();

    ESP_LOGI(
        TAG,
        "Wi-Fi pronto. Iniciando leitura de BPM."
    );
}

static void iniciar_adc(void)
{
    adc1_config_width(ADC_WIDTH);

    adc1_config_channel_atten(
        ADC_CHANNEL,
        ADC_ATTEN
    );
}

static void iniciar_lead_off(void)
{
    gpio_config_t configuracao = {0};

    configuracao.pin_bit_mask =
        (1ULL << LO_PLUS_GPIO) |
        (1ULL << LO_MINUS_GPIO);

    configuracao.mode = GPIO_MODE_INPUT;
    configuracao.pull_up_en = GPIO_PULLUP_DISABLE;
    configuracao.pull_down_en = GPIO_PULLDOWN_ENABLE;
    configuracao.intr_type = GPIO_INTR_DISABLE;

    ESP_ERROR_CHECK(gpio_config(&configuracao));
}

static bool eletrodos_conectados(void)
{
    return
        gpio_get_level(LO_PLUS_GPIO) == 0 &&
        gpio_get_level(LO_MINUS_GPIO) == 0;
}

static int mediana_inteiros(
    const int *valores,
    int quantidade
)
{
    int copia[TAMANHO_FILTRO_RR];

    for (int i = 0; i < quantidade; i++) {
        copia[i] = valores[i];
    }

    for (int i = 0; i < quantidade - 1; i++) {
        for (int j = i + 1; j < quantidade; j++) {
            if (copia[j] < copia[i]) {
                int temporario = copia[i];
                copia[i] = copia[j];
                copia[j] = temporario;
            }
        }
    }

    return copia[quantidade / 2];
}

static void reiniciar_filtro_bpm(
    filtro_bpm_t *filtro
)
{
    memset(filtro, 0, sizeof(*filtro));
}

static bool processar_pico_bpm(
    filtro_bpm_t *filtro,
    int64_t pico_ms,
    int *bpm_saida
)
{
    if (filtro->ultimo_pico_ms == 0) {
        filtro->ultimo_pico_ms = pico_ms;
        return false;
    }

    int rr =
        (int)(pico_ms - filtro->ultimo_pico_ms);

    if (rr < RR_MINIMO_MS) {
        return false;
    }

    if (rr > RR_MAXIMO_MS) {
        filtro->ultimo_pico_ms = pico_ms;
        filtro->quantidade = 0;
        filtro->indice = 0;
        filtro->bpm_filtrado = 0;

        return false;
    }

    if (filtro->quantidade >= 3) {
        int rr_mediano_atual = mediana_inteiros(
            filtro->rr,
            filtro->quantidade
        );

        int limite_inferior =
            (rr_mediano_atual * 65) / 100;

        int limite_superior =
            (rr_mediano_atual * 165) / 100;

        if (rr < limite_inferior) {
            return false;
        }

        if (rr > limite_superior) {
            filtro->ultimo_pico_ms = pico_ms;
            return false;
        }
    }

    filtro->ultimo_pico_ms = pico_ms;

    filtro->rr[filtro->indice] = rr;

    filtro->indice =
        (filtro->indice + 1) % TAMANHO_FILTRO_RR;

    if (filtro->quantidade < TAMANHO_FILTRO_RR) {
        filtro->quantidade++;
    }

    if (
        filtro->quantidade <
        RR_MINIMO_PARA_EXIBIR
    ) {
        return false;
    }

    int rr_mediano = mediana_inteiros(
        filtro->rr,
        filtro->quantidade
    );

    if (rr_mediano <= 0) {
        return false;
    }

    int bpm_calculado = 60000 / rr_mediano;

    if (
        bpm_calculado < BPM_MINIMO_VALIDO ||
        bpm_calculado > BPM_MAXIMO_VALIDO
    ) {
        return false;
    }

    if (filtro->bpm_filtrado == 0) {
        filtro->bpm_filtrado = bpm_calculado;
    } else {
        filtro->bpm_filtrado =
            (
                filtro->bpm_filtrado * 4 +
                bpm_calculado
            ) / 5;
    }

    *bpm_saida = filtro->bpm_filtrado;

    return true;
}

static bool registrar_bpm_supabase(
    int bpm,
    bool salvar_historico
)
{
    if (!wifi_esta_conectado()) {
        ESP_LOGE(
            TAG,
            "Wi-Fi desconectado. Envio ignorado."
        );

        return false;
    }

    http_resposta_len = 0;
    http_resposta[0] = '\0';

    char url[256];
    char json[256];
    char auth_header[512];

    snprintf(
        url,
        sizeof(url),
        "%s/rest/v1/rpc/registrar_bpm_dispositivo",
        SUPABASE_URL
    );

    snprintf(
        json,
        sizeof(json),
        "{\"p_codigo_dispositivo\":\"%s\","
        "\"p_valor_bpm\":%d,"
        "\"p_salvar_historico\":%s}",
        CODIGO_DISPOSITIVO,
        bpm,
        salvar_historico ? "true" : "false"
    );

    snprintf(
        auth_header,
        sizeof(auth_header),
        "Bearer %s",
        SUPABASE_ANON_KEY
    );

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .event_handler = http_event_handler,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .timeout_ms = 10000,
        .buffer_size = 1024,
        .buffer_size_tx = 1024,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .auth_type = HTTP_AUTH_TYPE_NONE,
        .keep_alive_enable = false
    };

    esp_http_client_handle_t client =
        esp_http_client_init(&config);

    if (client == NULL) {
        ESP_LOGE(
            TAG,
            "Falha ao iniciar cliente HTTP."
        );

        return false;
    }

    esp_http_client_set_header(
        client,
        "apikey",
        SUPABASE_ANON_KEY
    );

    esp_http_client_set_header(
        client,
        "Authorization",
        auth_header
    );

    esp_http_client_set_header(
        client,
        "Content-Type",
        "application/json"
    );

    esp_http_client_set_header(
        client,
        "Prefer",
        "return=minimal"
    );

    esp_http_client_set_post_field(
        client,
        json,
        strlen(json)
    );

    ESP_LOGI(
        TAG,
        "Enviando BPM: %s",
        json
    );

    esp_err_t err =
        esp_http_client_perform(client);

    int status =
        esp_http_client_get_status_code(client);

    if (err != ESP_OK) {
        ESP_LOGE(
            TAG,
            "Erro no POST: %s",
            esp_err_to_name(err)
        );

        if (http_resposta_len > 0) {
            ESP_LOGE(
                TAG,
                "Resposta: %s",
                http_resposta
            );
        }

        esp_http_client_cleanup(client);
        return false;
    }

    if (status < 200 || status >= 300) {
        ESP_LOGE(
            TAG,
            "HTTP status: %d",
            status
        );

        if (http_resposta_len > 0) {
            ESP_LOGE(
                TAG,
                "Resposta: %s",
                http_resposta
            );
        }

        esp_http_client_cleanup(client);
        return false;
    }

    ESP_LOGI(
        TAG,
        "BPM enviado. Status: %d",
        status
    );

    esp_http_client_cleanup(client);
    return true;
}

static void envio_task(void *pvParameters)
{
    envio_bpm_t envio;

    while (true) {
        if (
            xQueueReceive(
                fila_envio_bpm,
                &envio,
                portMAX_DELAY
            ) == pdTRUE
        ) {
            registrar_bpm_supabase(
                envio.bpm,
                envio.salvar_historico
            );
        }
    }
}

static void bpm_task(void *pvParameters)
{
    filtro_bpm_t filtro_bpm = {0};

    bool filtro_iniciado = false;
    bool calibrado = false;

    int filtro_rapido = 0;
    int linha_base = 0;

    int nivel_sinal = 220;
    int nivel_ruido = 25;

    int amostra_anterior_2 = 0;
    int amostra_anterior_1 = 0;

    int bpm_atual = 0;

    int64_t inicio_ms =
        esp_timer_get_time() / 1000;

    int64_t ultimo_pico_detectado_ms = 0;
    int64_t ultimo_envio_tempo_real_ms = 0;
    int64_t ultimo_envio_historico_ms = 0;
    int64_t ultimo_log_adc_ms = 0;

    ESP_LOGI(
        TAG,
        "Leitura de BPM iniciada."
    );

    while (true) {
        int leitura_adc =
            adc1_get_raw(ADC_CHANNEL);

        int64_t agora_ms =
            esp_timer_get_time() / 1000;

        bool saturado =
            leitura_adc <= 50 ||
            leitura_adc >= 4045;

        if (
            !eletrodos_conectados() ||
            saturado
        ) {
            filtro_iniciado = false;
            calibrado = false;
            bpm_atual = 0;

            reiniciar_filtro_bpm(&filtro_bpm);

            vTaskDelay(
                pdMS_TO_TICKS(
                    INTERVALO_LEITURA_MS
                )
            );

            continue;
        }

        if (!filtro_iniciado) {
            filtro_rapido = leitura_adc;
            linha_base = leitura_adc;

            amostra_anterior_2 = 0;
            amostra_anterior_1 = 0;

            nivel_sinal = 220;
            nivel_ruido = 25;

            inicio_ms = agora_ms;
            filtro_iniciado = true;
        } else {
            filtro_rapido =
                (
                    filtro_rapido * 3 +
                    leitura_adc
                ) / 4;

            linha_base =
                (
                    linha_base * 255 +
                    filtro_rapido
                ) / 256;
        }

        int ecg =
            filtro_rapido - linha_base;

        int amplitude =
            ecg >= 0 ? ecg : -ecg;

        if (!calibrado) {
            nivel_ruido =
                (
                    nivel_ruido * 31 +
                    amplitude
                ) / 32;

            if (
                agora_ms - inicio_ms >=
                TEMPO_CALIBRACAO_MS
            ) {
                calibrado = true;

                if (nivel_sinal < nivel_ruido + 100) {
                    nivel_sinal =
                        nivel_ruido + 100;
                }

                ESP_LOGI(
                    TAG,
                    "Calibração concluída."
                );
            }

            amostra_anterior_2 =
                amostra_anterior_1;

            amostra_anterior_1 =
                amplitude;

            vTaskDelay(
                pdMS_TO_TICKS(
                    INTERVALO_LEITURA_MS
                )
            );

            continue;
        }

        int diferenca_niveis =
            nivel_sinal - nivel_ruido;

        if (diferenca_niveis < 0) {
            diferenca_niveis = 0;
        }

        int limiar_dinamico =
            nivel_ruido +
            (diferenca_niveis * 38) / 100;

        if (limiar_dinamico < LIMIAR_MINIMO_ECG) {
            limiar_dinamico = LIMIAR_MINIMO_ECG;
        }

        bool maximo_local =
            amostra_anterior_1 >
                amostra_anterior_2 &&
            amostra_anterior_1 >= amplitude;

        if (maximo_local) {
            int pico =
                amostra_anterior_1;

            int64_t pico_ms =
                agora_ms - INTERVALO_LEITURA_MS;

            bool fora_refratario =
                pico_ms -
                ultimo_pico_detectado_ms >=
                PERIODO_REFRATARIO_MS;

            if (
                pico >= limiar_dinamico &&
                pico <= PICO_MAXIMO_ECG &&
                fora_refratario
            ) {
                nivel_sinal =
                    (
                        nivel_sinal * 7 +
                        pico
                    ) / 8;

                ultimo_pico_detectado_ms =
                    pico_ms;

                int novo_bpm = 0;

                if (
                    processar_pico_bpm(
                        &filtro_bpm,
                        pico_ms,
                        &novo_bpm
                    )
                ) {
                    bpm_atual = novo_bpm;

                    ESP_LOGI(
                        TAG,
                        "BATIMENTO | ADC: %d | ECG: %d | Pico: %d | Limiar: %d | BPM: %d",
                        leitura_adc,
                        ecg,
                        pico,
                        limiar_dinamico,
                        bpm_atual
                    );

                    if (
                        agora_ms -
                        ultimo_envio_tempo_real_ms >=
                        INTERVALO_ENVIO_TEMPO_REAL_MS
                    ) {
                        envio_bpm_t envio = {
                            .bpm = bpm_atual,
                            .salvar_historico = false
                        };

                        if (
                            agora_ms -
                            ultimo_envio_historico_ms >=
                            INTERVALO_ENVIO_HISTORICO_MS
                        ) {
                            envio.salvar_historico = true;
                        }

                        if (
                            xQueueOverwrite(
                                fila_envio_bpm,
                                &envio
                            ) == pdTRUE
                        ) {
                            ultimo_envio_tempo_real_ms =
                                agora_ms;

                            if (envio.salvar_historico) {
                                ultimo_envio_historico_ms =
                                    agora_ms;
                            }
                        }
                    }
                }
            } else {
                nivel_ruido =
                    (
                        nivel_ruido * 15 +
                        pico
                    ) / 16;
            }
        }

        if (nivel_sinal > nivel_ruido + 80) {
            nivel_sinal =
                (
                    nivel_sinal * 999
                ) / 1000;
        }

        amostra_anterior_2 =
            amostra_anterior_1;

        amostra_anterior_1 =
            amplitude;

        if (
            agora_ms - ultimo_log_adc_ms >=
            INTERVALO_LOG_ADC_MS
        ) {
            ESP_LOGI(
                TAG,
                "ADC: %d | ECG: %d | Amplitude: %d | Limiar: %d | BPM: %d",
                leitura_adc,
                ecg,
                amplitude,
                limiar_dinamico,
                bpm_atual
            );

            ultimo_log_adc_ms = agora_ms;
        }

        if (
            filtro_bpm.ultimo_pico_ms > 0 &&
            agora_ms -
            filtro_bpm.ultimo_pico_ms >
            4000
        ) {
            reiniciar_filtro_bpm(&filtro_bpm);
            bpm_atual = 0;
        }

        vTaskDelay(
            pdMS_TO_TICKS(
                INTERVALO_LEITURA_MS
            )
        );
    }
}

void app_main(void)
{
    iniciar_wifi();
    iniciar_adc();
    iniciar_lead_off();

    fila_envio_bpm =
        xQueueCreate(
            1,
            sizeof(envio_bpm_t)
        );

    if (fila_envio_bpm == NULL) {
        ESP_LOGE(
            TAG,
            "Erro ao criar fila de envio."
        );

        return;
    }

    BaseType_t task_bpm_criada =
        xTaskCreate(
            bpm_task,
            "bpm_task",
            8192,
            NULL,
            5,
            NULL
        );

    if (task_bpm_criada != pdPASS) {
        ESP_LOGE(
            TAG,
            "Erro ao criar task de BPM."
        );

        return;
    }

    BaseType_t task_envio_criada =
        xTaskCreate(
            envio_task,
            "envio_task",
            24576,
            NULL,
            4,
            NULL
        );

    if (task_envio_criada != pdPASS) {
        ESP_LOGE(
            TAG,
            "Erro ao criar task de envio."
        );

        return;
    }

    ESP_LOGI(
        TAG,
        "Tasks iniciadas com sucesso."
    );
}
