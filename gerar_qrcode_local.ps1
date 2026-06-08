$ErrorActionPreference = "Stop"

$Projeto = "C:\Users\joao-\bpm-monitor-frontend"

if (-not (Test-Path $Projeto)) {
    throw "A pasta do projeto não foi encontrada: $Projeto"
}

Set-Location $Projeto

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

if (-not $IP) {
    throw "Não foi possível localizar um endereço IPv4 da rede local."
}

$URL = "http://${IP}:5173"
$QRCode = Join-Path $Projeto "qrcode-monitor-bpm.png"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$Projeto'; npm run dev -- --host 0.0.0.0"
)

Start-Sleep -Seconds 3

npx --yes qrcode -o $QRCode $URL

Write-Host ""
Write-Host "Site local: $URL"
Write-Host "QR Code: $QRCode"
Write-Host ""
Write-Host "O computador e o celular precisam estar na mesma rede Wi-Fi."
