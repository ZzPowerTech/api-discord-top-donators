# Script de Testes Automatizado para API Discord Top Donators
# Execute: .\test-script.ps1

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  API Discord Top Donators - Testes  " -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = "http://localhost:3000"
$allPassed = $true

# Função para fazer requisições
function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "Testando: $Name" -ForegroundColor Yellow
    Write-Host "  URL: $Method $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "  ✅ PASSOU - Status: $($response.StatusCode)" -ForegroundColor Green
            Write-Host "  Resposta:" -ForegroundColor Gray
            $jsonResponse = $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5
            Write-Host $jsonResponse -ForegroundColor Gray
            Write-Host ""
            return $true
        } else {
            Write-Host "  ❌ FALHOU - Status esperado: $ExpectedStatus, obtido: $($response.StatusCode)" -ForegroundColor Red
            Write-Host ""
            return $false
        }
    } catch {
        Write-Host "  ❌ ERRO: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

# Verificar se a aplicação está rodando
Write-Host "Verificando se a aplicação está rodando..." -ForegroundColor Cyan
try {
    $null = Invoke-WebRequest -Uri $baseUrl -Method GET -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Aplicação está rodando!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ ERRO: Aplicação não está rodando!" -ForegroundColor Red
    Write-Host "Execute: npm run start:dev" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Teste 1: Endpoint básico
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Teste 1: Endpoint Básico" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
$test1 = Test-Endpoint -Name "GET /" -Method "GET" -Url "$baseUrl"
$allPassed = $allPassed -and $test1

# Teste 2: Top customers com período específico
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Teste 2: Top Customers - Período Específico" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
$test2 = Test-Endpoint -Name "GET /central-cart-api/top-customers" -Method "GET" -Url "$baseUrl/central-cart-api/top-customers?from=2025-11-01&to=2025-11-18"
$allPassed = $allPassed -and $test2

# Teste 3: Top customers do mês anterior
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Teste 3: Top Customers - Mês Anterior" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
$test3 = Test-Endpoint -Name "GET /central-cart-api/top-customers/previous-month" -Method "GET" -Url "$baseUrl/central-cart-api/top-customers/previous-month"
$allPassed = $allPassed -and $test3

# Teste 4: Envio para Discord (COMENTADO - descomente para testar)
Write-Host "==================" -ForegroundColor Cyan
Write-Host "Teste 4: Envio para Discord (PULADO)" -ForegroundColor Cyan
Write-Host "==================" -ForegroundColor Cyan
Write-Host "⚠️  Este teste foi PULADO pois envia mensagem real para o Discord" -ForegroundColor Yellow
Write-Host "  Para testar manualmente, execute:" -ForegroundColor Gray
Write-Host "  POST $baseUrl/scheduler/send-top-donators" -ForegroundColor Gray
Write-Host ""

# Descomentar para testar Discord:
# $test4 = Test-Endpoint -Name "POST /scheduler/send-top-donators" -Method "POST" -Url "$baseUrl/scheduler/send-top-donators"
# $allPassed = $allPassed -and $test4

# Resumo
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "  RESUMO DOS TESTES" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "✅ TODOS OS TESTES PASSARAM!" -ForegroundColor Green
} else {
    Write-Host "❌ ALGUNS TESTES FALHARAM!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testes executados:" -ForegroundColor Cyan
Write-Host "  1. Endpoint Básico: $(if($test1){'✅'}else{'❌'})" -ForegroundColor $(if($test1){'Green'}else{'Red'})
Write-Host "  2. Top Customers Período: $(if($test2){'✅'}else{'❌'})" -ForegroundColor $(if($test2){'Green'}else{'Red'})
Write-Host "  3. Top Customers Mês Anterior: $(if($test3){'✅'}else{'❌'})" -ForegroundColor $(if($test3){'Green'}else{'Red'})
Write-Host "  4. Discord: ⚠️  PULADO (manual)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Para mais detalhes, consulte: TESTES.md" -ForegroundColor Gray
Write-Host ""
