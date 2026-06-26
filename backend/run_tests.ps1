$env:REACT_APP_BACKEND_URL="http://127.0.0.1:8000"
$serverProcess = Start-Process -NoNewWindow -PassThru -FilePath ".\venv\Scripts\python" -ArgumentList "-m uvicorn server:app --port 8000"

# Wait for server to start
Start-Sleep -Seconds 5

# Run tests
.\venv\Scripts\pytest

# Kill server
Stop-Process -Id $serverProcess.Id -Force
