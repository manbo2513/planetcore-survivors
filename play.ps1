param([switch]$Serve)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$url = "http://127.0.0.1:4173/"
$port = 4173
$logPath = Join-Path $root "launcher-error.txt"

function Test-GameServer {
  try {
    $response = Invoke-WebRequest -UseBasicParsing $url -TimeoutSec 1
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Start-EmbeddedServer {
  $mime = @{
    ".html" = "text/html; charset=utf-8"
    ".css" = "text/css; charset=utf-8"
    ".js" = "text/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg" = "image/svg+xml"
    ".png" = "image/png"
    ".ico" = "image/x-icon"
    ".wav" = "audio/wav"
  }
  $listener = [System.Net.Sockets.TcpListener]::new(
    [System.Net.IPAddress]::Loopback,
    $port
  )
  $listener.Start()
  $rootPrefix = $root.TrimEnd("\") + "\"

  while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $null
    try {
      $client.ReceiveTimeout = 5000
      $stream = $client.GetStream()
      $reader = [System.IO.StreamReader]::new(
        $stream,
        [System.Text.Encoding]::ASCII,
        $false,
        1024,
        $true
      )
      $requestLine = $reader.ReadLine()
      if ([string]::IsNullOrWhiteSpace($requestLine)) {
        continue
      }
      do {
        $headerLine = $reader.ReadLine()
      } while ($null -ne $headerLine -and $headerLine -ne "")

      $parts = $requestLine.Split(" ")
      $method = $parts[0]
      $target = $parts[1]
      $status = "200 OK"
      $contentType = "application/octet-stream"
      [byte[]]$body = @()

      if ($method -ne "GET" -and $method -ne "HEAD") {
        $status = "405 Method Not Allowed"
        $body = [System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
        $contentType = "text/plain; charset=utf-8"
      } else {
        try {
          $uri = [System.Uri]::new("http://127.0.0.1" + $target)
          $relative = [System.Uri]::UnescapeDataString($uri.AbsolutePath).TrimStart("/")
          if ([string]::IsNullOrWhiteSpace($relative)) {
            $relative = "index.html"
          }
          $filePath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))
          if (-not $filePath.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            $status = "403 Forbidden"
            $body = [System.Text.Encoding]::UTF8.GetBytes("Forbidden")
            $contentType = "text/plain; charset=utf-8"
          } elseif (-not [System.IO.File]::Exists($filePath)) {
            $status = "404 Not Found"
            $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
            $contentType = "text/plain; charset=utf-8"
          } else {
            $body = [System.IO.File]::ReadAllBytes($filePath)
            $extension = [System.IO.Path]::GetExtension($filePath).ToLowerInvariant()
            if ($mime.ContainsKey($extension)) {
              $contentType = $mime[$extension]
            }
          }
        } catch {
          $status = "400 Bad Request"
          $body = [System.Text.Encoding]::UTF8.GetBytes("Bad Request")
          $contentType = "text/plain; charset=utf-8"
        }
      }

      $headers = (
        "HTTP/1.1 $status`r`n" +
        "Content-Type: $contentType`r`n" +
        "Content-Length: $($body.Length)`r`n" +
        "Cache-Control: no-store`r`n" +
        "Connection: close`r`n`r`n"
      )
      $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
      $stream.Write($headerBytes, 0, $headerBytes.Length)
      if ($method -ne "HEAD" -and $body.Length -gt 0) {
        $stream.Write($body, 0, $body.Length)
      }
      $stream.Flush()
    } catch {
      try {
        $failure = [System.Text.Encoding]::UTF8.GetBytes("Internal Server Error")
        $headers = (
          "HTTP/1.1 500 Internal Server Error`r`n" +
          "Content-Type: text/plain; charset=utf-8`r`n" +
          "Content-Length: $($failure.Length)`r`n" +
          "Connection: close`r`n`r`n"
        )
        $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
        $stream.Write($headerBytes, 0, $headerBytes.Length)
        $stream.Write($failure, 0, $failure.Length)
        $stream.Flush()
      } catch {
        # Ignore a connection that has already closed.
      }
    } finally {
      if ($stream) {
        $stream.Dispose()
      }
      $client.Close()
    }
  }
}

if ($Serve) {
  try {
    Start-EmbeddedServer
  } catch {
    Set-Content -LiteralPath $logPath -Value ($_ | Out-String) -Encoding UTF8
    exit 1
  }
}

if (Test-GameServer) {
  Start-Process $url
  exit 0
}

Remove-Item -LiteralPath $logPath -Force -ErrorAction SilentlyContinue
$powershellPath = (Get-Process -Id $PID).Path
$arguments = (
  "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`" -Serve"
)
Start-Process -FilePath $powershellPath -ArgumentList $arguments -WindowStyle Hidden

for ($attempt = 0; $attempt -lt 40; $attempt += 1) {
  Start-Sleep -Milliseconds 250
  if (Test-GameServer) {
    Start-Process $url
    exit 0
  }
  if (Test-Path -LiteralPath $logPath) {
    break
  }
}

if (-not (Test-Path -LiteralPath $logPath)) {
  Set-Content -LiteralPath $logPath -Value "Local server did not start within 10 seconds." -Encoding UTF8
}
exit 1
