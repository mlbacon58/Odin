Write-Host "Starting Odin Offline Stack..."

$ollamaPath = "C:\Users\Mike\AppData\Local\Programs\Ollama\ollama.exe"

$ollamaRunning = netstat -ano | findstr 11434

if (-not $ollamaRunning) {
  Start-Process -FilePath $ollamaPath -ArgumentList "serve"
  Start-Sleep -Seconds 3
}

Write-Host "Checking local models..."
& $ollamaPath list

Write-Host "Starting Odin frontend..."
Set-Location "F:\odin\odin_s_domain\frontend"
npm run dev