#include <stdio.h>
#include <string.h>
#include <stdbool.h>
#include <stdlib.h>
#include <stdint.h>

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
#include "esp_crt_bundle.h"
#include "nvs_flash.h"

#include "driver/adc.h"
#include "driver/gpio.h"

#define APP_SUPABASE_URL "https://rpwldtudjsvsthegkjjz.supabase.co"
#define APP_SUPABASE_ANON_KEY "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd2xkdHVkanN2c3RoZWdramp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MTI0MzAsImV4cCI6MjA5Mjk4ODQzMH0.WxRwRLlxSOTWlrg98WyyfXiOQhil8xG8j3MefZw4YZo"
#define APP_DEVICE_CODE "ESP32_PRINCIPAL"

#define APP_ADC_CHANNEL ADC1_CHANNEL_6
#define APP_ADC_WIDTH ADC_WIDTH_BIT_12
#define APP_ADC_ATTEN ADC_ATTEN_DB_11

#define APP_LO_PLUS_GPIO GPIO_NUM_19
#define APP_LO_MINUS_GPIO GPIO_NUM_18
#define APP_USE_LEAD_OFF 1

#define APP_WIFI_CONNECTED_BIT BIT0
#define APP_WIFI_TIMEOUT_MS 15000

#define APP_SAMPLE_MS 5
#define APP_LOG_MS 1000
#define APP_SEND_MS 1000
#define APP_HISTORY_MS 15000

#define APP_ADC_MIN 50
#define APP_ADC_MAX 4045
#define APP_FILTER_SIZE 5
#define APP_RR_FILTER_SIZE 7

#define APP_THRESHOLD_MIN 45
#define APP_THRESHOLD_MAX 650
#define APP_THRESHOLD_GAIN 3
#define APP_THRESHOLD_OFFSET 35

#define APP_REFRACTORY_MS 300
#define APP_RR_MIN_MS 375
#define APP_RR_MAX_MS 1500
#define APP_SIGNAL_TIMEOUT_MS 6000

#define APP_BPM_MIN 40
#define APP_BPM_MAX 160

#define APP_HTTP_TIMEOUT_MS 30000
#define APP_HTTP_RETRIES 3

typedef struct {
    const char *ssid;
    const char *password;
} app_wifi_credentials_t;

typedef struct {
    int bpm;
    bool save_history;
} app_bpm_message_t;

static const app_wifi_credentials_t APP_WIFI_NETWORKS[] = {
    {"Joao", "joao1234"},
    {"UnivapWifi", "universidade"},
    {"Djenane2ghz", "djenanesantos"}
};

static const int APP_WIFI_NETWORK_COUNT =
    sizeof(APP_WIFI_NETWORKS) /
    sizeof(APP_WIFI_NETWORKS[0]);

static const char *APP_TAG = "BPM_MONITOR";

static EventGroupHandle_t app_wifi_event_group;
static QueueHandle_t app_bpm_queue;

static char app_current_ssid[33] = {0};
static bool app_wifi_locked = false;
static bool app_ignore_disconnect = false;

static int app_limit(int value, int minimum, int maximum)
{
    if (value < minimum) {
        return minimum;
    }

    if (value > maximum) {
        return maximum;
    }

    return value;
}

static int app_compare_int(const void *a, const void *b)
{
    int value_a = *(const int *)a;
    int value_b = *(const int *)b;

    return value_a - value_b;
}

static int app_median(const int *values, int count)
{
    int temp[APP_FILTER_SIZE];

    if (count <= 0) {
        return 0;
    }

    if (count > APP_FILTER_SIZE) {
        count = APP_FILTER_SIZE;
    }

    for (int i = 0; i < count; i++) {
        temp[i] = values[i];
    }

    qsort(temp, count, sizeof(int), app_compare_int);

    return temp[count / 2];
}

static int app_median_rr(const int *values, int count)
{
    int temp[APP_RR_FILTER_SIZE];

    if (count <= 0) {
        return 0;
    }

    if (count > APP_RR_FILTER_SIZE) {
        count = APP_RR_FILTER_SIZE;
    }

    for (int i = 0; i < count; i++) {
        temp[i] = values[i];
    }

    qsort(temp, count, sizeof(int), app_compare_int);

    return temp[count / 2];
}

static void app_wifi_event_handler(
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
            app_wifi_event_group,
            APP_WIFI_CONNECTED_BIT
        );

        if (!app_ignore_disconnect && app_wifi_locked) {
            esp_wifi_connect();
        }
    }

    if (
        event_base == IP_EVENT &&
        event_id == IP_EVENT_STA_GOT_IP
    ) {
        xEventGroupSetBits(
            app_wifi_event_group,
            APP_WIFI_CONNECTED_BIT
        );

        ESP_LOGI(
            APP_TAG,
            "Wi-Fi conectado em %s",
            app_current_ssid
        );
    }
}

static bool app_try_wifi(
    const char *ssid,
    const char *password
)
{
    wifi_config_t config = {0};

    strncpy(
        app_current_ssid,
        ssid,
        sizeof(app_current_ssid) - 1
    );

    strncpy(
        (char *)config.sta.ssid,
        ssid,
        sizeof(config.sta.ssid) - 1
    );

    strncpy(
        (char *)config.sta.password,
        password,
        sizeof(config.sta.password) - 1
    );

    config.sta.scan_method = WIFI_ALL_CHANNEL_SCAN;
    config.sta.sort_method = WIFI_CONNECT_AP_BY_SIGNAL;
    config.sta.threshold.rssi = -127;
    config.sta.pmf_cfg.capable = true;
    config.sta.pmf_cfg.required = false;

    app_wifi_locked = false;
    app_ignore_disconnect = true;

    xEventGroupClearBits(
        app_wifi_event_group,
        APP_WIFI_CONNECTED_BIT
    );

    esp_wifi_disconnect();
    vTaskDelay(pdMS_TO_TICKS(300));

    app_ignore_disconnect = false;

    ESP_ERROR_CHECK(
        esp_wifi_set_config(
            WIFI_IF_STA,
            &config
        )
    );

    if (esp_wifi_connect() != ESP_OK) {
        return false;
    }

    EventBits_t bits =
        xEventGroupWaitBits(
            app_wifi_event_group,
            APP_WIFI_CONNECTED_BIT,
            pdFALSE,
            pdFALSE,
            pdMS_TO_TICKS(APP_WIFI_TIMEOUT_MS)
        );

    if (
        bits &
        APP_WIFI_CONNECTED_BIT
    ) {
        app_wifi_locked = true;
        return true;
    }

    app_ignore_disconnect = true;
    esp_wifi_disconnect();
    vTaskDelay(pdMS_TO_TICKS(300));
    app_ignore_disconnect = false;

    return false;
}

static void app_init_wifi(void)
{
    esp_err_t result = nvs_flash_init();

    if (
        result == ESP_ERR_NVS_NO_FREE_PAGES ||
        result == ESP_ERR_NVS_NEW_VERSION_FOUND
    ) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ESP_ERROR_CHECK(nvs_flash_init());
    } else {
        ESP_ERROR_CHECK(result);
    }

    app_wifi_event_group =
        xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(
        esp_event_loop_create_default()
    );

    esp_netif_create_default_wifi_sta();

    wifi_init_config_t config =
        WIFI_INIT_CONFIG_DEFAULT();

    ESP_ERROR_CHECK(
        esp_wifi_init(&config)
    );

    ESP_ERROR_CHECK(
        esp_event_handler_register(
            WIFI_EVENT,
            ESP_EVENT_ANY_ID,
            app_wifi_event_handler,
            NULL
        )
    );

    ESP_ERROR_CHECK(
        esp_event_handler_register(
            IP_EVENT,
            IP_EVENT_STA_GOT_IP,
            app_wifi_event_handler,
            NULL
        )
    );

    ESP_ERROR_CHECK(
        esp_wifi_set_mode(WIFI_MODE_STA)
    );

    ESP_ERROR_CHECK(
        esp_wifi_set_ps(WIFI_PS_NONE)
    );

    ESP_ERROR_CHECK(
        esp_wifi_start()
    );

    while (true) {
        for (
            int i = 0;
            i < APP_WIFI_NETWORK_COUNT;
            i++
        ) {
            ESP_LOGI(
                APP_TAG,
                "Tentando conectar em %s",
                APP_WIFI_NETWORKS[i].ssid
            );

            if (
                app_try_wifi(
                    APP_WIFI_NETWORKS[i].ssid,
                    APP_WIFI_NETWORKS[i].password
                )
            ) {
                return;
            }
        }

        ESP_LOGW(
            APP_TAG,
            "Nenhuma rede disponível."
        );

        vTaskDelay(pdMS_TO_TICKS(5000));
    }
}

static bool app_wifi_connected(void)
{
    EventBits_t bits =
        xEventGroupGetBits(
            app_wifi_event_group
        );

    return
        (
            bits &
            APP_WIFI_CONNECTED_BIT
        ) != 0;
}

static bool app_wait_wifi(void)
{
    if (app_wifi_connected()) {
        return true;
    }

    esp_wifi_connect();

    EventBits_t bits =
        xEventGroupWaitBits(
            app_wifi_event_group,
            APP_WIFI_CONNECTED_BIT,
            pdFALSE,
            pdFALSE,
            pdMS_TO_TICKS(APP_WIFI_TIMEOUT_MS)
        );

    return
        (
            bits &
            APP_WIFI_CONNECTED_BIT
        ) != 0;
}

static void app_init_sensor(void)
{
    adc1_config_width(APP_ADC_WIDTH);

    adc1_config_channel_atten(
        APP_ADC_CHANNEL,
        APP_ADC_ATTEN
    );

    gpio_config_t config = {0};

    config.pin_bit_mask =
        (1ULL << APP_LO_PLUS_GPIO) |
        (1ULL << APP_LO_MINUS_GPIO);

    config.mode = GPIO_MODE_INPUT;
    config.pull_down_en = GPIO_PULLDOWN_ENABLE;
    config.intr_type = GPIO_INTR_DISABLE;

    ESP_ERROR_CHECK(
        gpio_config(&config)
    );
}

static bool app_signal_connected(void)
{
    if (!APP_USE_LEAD_OFF) {
        return true;
    }

    return
        gpio_get_level(
            APP_LO_PLUS_GPIO
        ) == 0 &&
        gpio_get_level(
            APP_LO_MINUS_GPIO
        ) == 0;
}

static bool app_send_http(
    int bpm,
    bool save_history
)
{
    if (!app_wait_wifi()) {
        return false;
    }

    char url[256];
    char body[256];
    char authorization[512];

    snprintf(
        url,
        sizeof(url),
        "%s/rest/v1/rpc/registrar_bpm_dispositivo",
        APP_SUPABASE_URL
    );

    snprintf(
        body,
        sizeof(body),
        "{\"p_codigo_dispositivo\":\"%s\","
        "\"p_valor_bpm\":%d,"
        "\"p_salvar_historico\":%s}",
        APP_DEVICE_CODE,
        bpm,
        save_history
            ? "true"
            : "false"
    );

    snprintf(
        authorization,
        sizeof(authorization),
        "Bearer %s",
        APP_SUPABASE_ANON_KEY
    );

    esp_http_client_config_t config = {
        .url = url,
        .method = HTTP_METHOD_POST,
        .crt_bundle_attach = esp_crt_bundle_attach,
        .timeout_ms = APP_HTTP_TIMEOUT_MS,
        .transport_type = HTTP_TRANSPORT_OVER_SSL,
        .keep_alive_enable = false
    };

    esp_http_client_handle_t client =
        esp_http_client_init(&config);

    if (client == NULL) {
        return false;
    }

    esp_http_client_set_header(
        client,
        "apikey",
        APP_SUPABASE_ANON_KEY
    );

    esp_http_client_set_header(
        client,
        "Authorization",
        authorization
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
        body,
        strlen(body)
    );

    esp_err_t result =
        esp_http_client_perform(client);

    int status =
        esp_http_client_get_status_code(
            client
        );

    esp_http_client_cleanup(client);

    if (
        result != ESP_OK ||
        status < 200 ||
        status >= 300
    ) {
        ESP_LOGW(
            APP_TAG,
            "Falha no envio HTTP."
        );

        return false;
    }

    ESP_LOGI(
        APP_TAG,
        "BPM enviado | Valor: %d | Histórico: %s",
        bpm,
        save_history
            ? "sim"
            : "não"
    );

    return true;
}

static void app_http_task(void *parameter)
{
    app_bpm_message_t message;

    while (true) {
        if (
            xQueueReceive(
                app_bpm_queue,
                &message,
                portMAX_DELAY
            ) != pdTRUE
        ) {
            continue;
        }

        for (
            int attempt = 0;
            attempt < APP_HTTP_RETRIES;
            attempt++
        ) {
            if (
                app_send_http(
                    message.bpm,
                    message.save_history
                )
            ) {
                break;
            }

            vTaskDelay(
                pdMS_TO_TICKS(
                    1500 *
                    (attempt + 1)
                )
            );
        }
    }
}

static void app_queue_value(
    int bpm,
    bool save_history,
    const char *source
)
{
    app_bpm_message_t message = {
        .bpm = bpm,
        .save_history = save_history
    };

    xQueueOverwrite(
        app_bpm_queue,
        &message
    );

    ESP_LOGI(
        APP_TAG,
        "%s | BPM: %d",
        source,
        bpm
    );
}

static void app_reset_detection(
    int *samples,
    int *sample_count,
    int *sample_index,
    int *baseline,
    int *noise,
    int *threshold,
    bool *started,
    bool *above_threshold,
    int *current_bpm,
    int *rr_values,
    int *rr_count,
    int *rr_index,
    int64_t *last_peak_ms,
    int64_t *last_real_ms
)
{
    for (int i = 0; i < APP_FILTER_SIZE; i++) {
        samples[i] = 0;
    }

    for (int i = 0; i < APP_RR_FILTER_SIZE; i++) {
        rr_values[i] = 0;
    }

    *sample_count = 0;
    *sample_index = 0;
    *baseline = 0;
    *noise = 20;
    *threshold = APP_THRESHOLD_MIN;
    *started = false;
    *above_threshold = false;
    *current_bpm = 0;
    *rr_count = 0;
    *rr_index = 0;
    *last_peak_ms = 0;
    *last_real_ms = 0;
}

static void app_sensor_task(void *parameter)
{
    int samples[APP_FILTER_SIZE] = {0};
    int rr_values[APP_RR_FILTER_SIZE] = {0};

    int sample_count = 0;
    int sample_index = 0;

    int rr_count = 0;
    int rr_index = 0;

    int baseline = 0;
    int noise = 20;
    int threshold = APP_THRESHOLD_MIN;

    bool started = false;
    bool above_threshold = false;

    int current_bpm = 0;

    int64_t last_peak_ms = 0;
    int64_t last_real_ms = 0;
    int64_t last_send_ms = 0;
    int64_t last_history_ms = 0;
    int64_t last_log_ms = 0;

    while (true) {
        int64_t now_ms =
            esp_timer_get_time() /
            1000;

        int raw =
            adc1_get_raw(
                APP_ADC_CHANNEL
            );

        bool signal_valid =
            raw > APP_ADC_MIN &&
            raw < APP_ADC_MAX &&
            app_signal_connected();

        int filtered = 0;
        int ecg = 0;
        int amplitude = 0;

        if (signal_valid) {
            samples[sample_index] = raw;

            sample_index =
                (
                    sample_index + 1
                ) % APP_FILTER_SIZE;

            if (
                sample_count <
                APP_FILTER_SIZE
            ) {
                sample_count++;
            }

            filtered =
                app_median(
                    samples,
                    sample_count
                );

            if (!started) {
                baseline = filtered;
                started = true;
            }

            int baseline_speed =
                above_threshold
                    ? 256
                    : 64;

            baseline +=
                (
                    filtered -
                    baseline
                ) / baseline_speed;

            ecg =
                filtered -
                baseline;

            amplitude =
                abs(ecg);

            threshold =
                noise * APP_THRESHOLD_GAIN +
                APP_THRESHOLD_OFFSET;

            threshold =
                app_limit(
                    threshold,
                    APP_THRESHOLD_MIN,
                    APP_THRESHOLD_MAX
                );

            if (
                amplitude < threshold &&
                !above_threshold
            ) {
                noise =
                    (
                        noise * 31 +
                        amplitude
                    ) / 32;
            }

            if (
                !above_threshold &&
                ecg >= threshold &&
                now_ms - last_peak_ms >=
                APP_REFRACTORY_MS
            ) {
                above_threshold = true;

                if (last_peak_ms > 0) {
                    int rr =
                        now_ms -
                        last_peak_ms;

                    if (
                        rr >= APP_RR_MIN_MS &&
                        rr <= APP_RR_MAX_MS
                    ) {
                        int measured_bpm =
                            60000 / rr;

                        if (
                            measured_bpm >= APP_BPM_MIN &&
                            measured_bpm <= APP_BPM_MAX
                        ) {
                            rr_values[rr_index] = rr;

                            rr_index =
                                (
                                    rr_index + 1
                                ) % APP_RR_FILTER_SIZE;

                            if (
                                rr_count <
                                APP_RR_FILTER_SIZE
                            ) {
                                rr_count++;
                            }

                            int median_rr =
                                app_median_rr(
                                    rr_values,
                                    rr_count
                                );

                            int median_bpm =
                                60000 /
                                median_rr;

                            if (current_bpm == 0) {
                                current_bpm =
                                    median_bpm;
                            } else {
                                current_bpm =
                                    (
                                        current_bpm * 3 +
                                        median_bpm
                                    ) / 4;
                            }

                            current_bpm =
                                app_limit(
                                    current_bpm,
                                    APP_BPM_MIN,
                                    APP_BPM_MAX
                                );

                            last_real_ms =
                                now_ms;

                            ESP_LOGI(
                                APP_TAG,
                                "Batimento detectado | RR: %d ms | BPM: %d",
                                rr,
                                current_bpm
                            );
                        }
                    } else if (
                        rr > APP_RR_MAX_MS
                    ) {
                        rr_count = 0;
                        rr_index = 0;
                        current_bpm = 0;
                    }
                }

                last_peak_ms =
                    now_ms;
            }

            if (
                above_threshold &&
                ecg < threshold / 2
            ) {
                above_threshold = false;
            }

            if (
                last_real_ms > 0 &&
                now_ms - last_real_ms >
                APP_SIGNAL_TIMEOUT_MS
            ) {
                current_bpm = 0;
                rr_count = 0;
                rr_index = 0;
                last_peak_ms = 0;
                last_real_ms = 0;
            }
        } else {
            app_reset_detection(
                samples,
                &sample_count,
                &sample_index,
                &baseline,
                &noise,
                &threshold,
                &started,
                &above_threshold,
                &current_bpm,
                rr_values,
                &rr_count,
                &rr_index,
                &last_peak_ms,
                &last_real_ms
            );
        }

        if (
            now_ms - last_send_ms >=
            APP_SEND_MS
        ) {
            bool save_history =
                current_bpm > 0 &&
                now_ms -
                last_history_ms >=
                APP_HISTORY_MS;

            app_queue_value(
                current_bpm,
                save_history,
                current_bpm > 0
                    ? "BPM real"
                    : "Sem BPM válido"
            );

            last_send_ms =
                now_ms;

            if (save_history) {
                last_history_ms =
                    now_ms;
            }
        }

        if (
            now_ms - last_log_ms >=
            APP_LOG_MS
        ) {
            ESP_LOGI(
                APP_TAG,
                "ADC: %d | Filtrado: %d | ECG: %d | Ruído: %d | Limiar: %d | BPM: %d | Sinal: %s",
                raw,
                filtered,
                ecg,
                noise,
                threshold,
                current_bpm,
                signal_valid
                    ? "ok"
                    : "desconectado"
            );

            last_log_ms =
                now_ms;
        }

        vTaskDelay(
            pdMS_TO_TICKS(
                APP_SAMPLE_MS
            )
        );
    }
}

void app_main(void)
{
    app_init_wifi();
    app_init_sensor();

    app_bpm_queue =
        xQueueCreate(
            1,
            sizeof(app_bpm_message_t)
        );

    if (app_bpm_queue == NULL) {
        ESP_LOGE(
            APP_TAG,
            "Falha ao criar fila."
        );

        return;
    }

    if (
        xTaskCreate(
            app_sensor_task,
            "app_sensor_task",
            8192,
            NULL,
            5,
            NULL
        ) != pdPASS
    ) {
        ESP_LOGE(
            APP_TAG,
            "Falha ao criar tarefa do sensor."
        );

        return;
    }

    if (
        xTaskCreate(
            app_http_task,
            "app_http_task",
            16384,
            NULL,
            4,
            NULL
        ) != pdPASS
    ) {
        ESP_LOGE(
            APP_TAG,
            "Falha ao criar tarefa HTTP."
        );

        return;
    }

    ESP_LOGI(
        APP_TAG,
        "Sistema iniciado."
    );
}