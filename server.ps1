$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8000/")

$ipAddress = "10.31.99.5"
$bindExternal = $true
try {
    $listener.Prefixes.Add("http://$($ipAddress):8000/")
} catch {
    $bindExternal = $false
}

try {
    $listener.Start()
    if ($bindExternal) {
        Write-Host "PowerShell Web Server running at http://localhost:8000/ and http://$($ipAddress):8000/"
    } else {
        Write-Host "PowerShell Web Server running at http://localhost:8000/ (Localhost only. Run as Administrator to enable phone access)."
    }
} catch {
    # If starting fails (access denied on the external IP prefix),
    # we clear prefixes, re-add ONLY localhost, and start again.
    Write-Host "Warning: Could not bind to external network IP due to Windows permissions. Retrying on localhost only..."
    $listener.Close()
    
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:8000/")
    $listener.Start()
    Write-Host "PowerShell Web Server running at http://localhost:8000/ (Localhost only. Run as Administrator to enable phone access)."
}

# Set clean shutdown handler
$currentAction = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response

        # Add CORS headers to avoid cross-origin resource sharing errors
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        
        $path = $request.Url.LocalPath
        if ($path -eq "/" -or $path -eq "") { 
            $path = "/index.html" 
        }
        
        # Ensure path uses correct separator
        $relPath = $path.TrimStart('/')
        $filePath = [System.IO.Path]::Combine((Get-Location).Path, $relPath)

        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Set correct Content-Type headers
            if ($filePath.EndsWith(".html")) {
                $response.ContentType = "text/html; charset=utf-8"
            } elseif ($filePath.EndsWith(".css")) {
                $response.ContentType = "text/css; charset=utf-8"
            } elseif ($filePath.EndsWith(".js") -or $filePath.EndsWith(".mjs")) {
                $response.ContentType = "application/javascript; charset=utf-8"
            } elseif ($filePath.EndsWith(".json") -or $filePath.EndsWith(".gltf")) {
                $response.ContentType = "application/json; charset=utf-8"
            } elseif ($filePath.EndsWith(".task")) {
                $response.ContentType = "application/octet-stream"
            } elseif ($filePath.EndsWith(".wasm")) {
                $response.ContentType = "application/wasm"
            }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            Write-Host "404 Not Found: $path ($filePath)"
            $response.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
            $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $response.Close()
    }
} catch {
    Write-Host "Server encountered an error: $_"
} finally {
    if ($listener -ne $null) {
        $listener.Stop()
        $listener.Close()
        Write-Host "Server stopped."
    }
    $ErrorActionPreference = $currentAction
}
