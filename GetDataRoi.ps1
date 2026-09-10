# --- Configuration ---
$EncodedUser = "%78%6C400%76"
# Use unique markers [USER] and [ID] for subsequent replacement
$BaseUrl = "https://github.com/[USER]/scrape-json/blob/data/roi/[ID].json?raw=true"

# --- Helper Function for URL Decoding ---
function Unescape-Url ([string]$url) {
    return [Uri]::UnescapeDataString($url)
}

# --- Main Logic ---
# 1. Decode the username
$DecodedUser = Unescape-Url $EncodedUser

# --- File Check Logic (Performed BEFORE User Input) ---
# We use a wildcard pattern to find files that include a timestamp
$filePattern = "ROI_*_*.csv"
$existingFiles = Get-ChildItem -Path . -Filter $filePattern | Where-Object {
    # Check if the file was created/modified less than 10 minutes ago
    (New-TimeSpan -Start $_.LastWriteTime -End (Get-Date)).TotalMinutes -lt 10
}

if ($existingFiles) {
    # Get the most recent file from the filtered list
    $latestFile = $existingFiles | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    # Pink background warning
    Write-Host "`n[WARNING] A file was created less than 10 minutes ago!" -ForegroundColor Black -BackgroundColor Magenta
    Write-Host "[WARNING] Proceed anyway? (y/n): " -NoNewline -ForegroundColor White
    $confirm = Read-Host
    if ($confirm -ne 'y') {
        Write-Host "Operation cancelled." -ForegroundColor Yellow
        exit
    }
}

# --- User Input ---
$inputId = Read-Host "Enter the public initiative index (e.g., 126073)"
if ([string]::IsNullOrWhiteSpace($inputId)) { exit }

# 2. Prepare the final URL using string replacement
$url = $BaseUrl -replace "\[USER\]", $DecodedUser -replace "\[ID\]", $inputId
Write-Host "Decoded User: $DecodedUser" -ForegroundColor Gray
Write-Host "Fetching data from: $url" -ForegroundColor Cyan

try {
    # --- Enhanced Headers (Google Chrome User-Agent) ---
    $headers = @{
        "Accept" = "application/json"
        "Accept-Language" = "en-US,en;q=0.9"
    }
    $userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
    $response = Invoke-WebRequest -Uri $url -UserAgent $userAgent -Headers $headers -UseBasicParsing -ErrorAction Stop
    $jsonData = $response.Content | ConvertFrom-Json
    $results = @()

    if ($jsonData -is [array]) {
        foreach ($entry in $jsonData) {
            $results += [PSCustomObject]@{
                DateStamp    = $entry.dateStamp
                VotesAgainst = $entry.consCount
                VotesFor     = $entry.prosCount
            }
        }
    } else {
        $results += [PSCustomObject]@{
            DateStamp    = $jsonData.dateStamp
            VotesAgainst = $jsonData.consCount
            VotesFor     = $jsonData.prosCount
        }
    }

    if ($results.Count -gt 0) {
        $results | Format-Table -AutoSize
        
        # --- CSV Generation with Dynamic Separator ---
        $systemSeparator = [System.Globalization.CultureInfo]::CurrentCulture.TextInfo.ListSeparator
        
        # Add Timestamp to filename: ROI_126073_20231027_1430.csv
        $timestamp = Get-Date -Format "yyyyMMdd_HHmm"
        $newFileName = "ROI_$($inputId)_$($timestamp).csv"
        
        $headerLine = "sep=$systemSeparator"
        $csvContent = $results | ConvertTo-Csv -Delimiter $systemSeparator -NoTypeInformation
        $finalOutput = $headerLine + "`r`n" + ($csvContent -join "`r`n")
        
        $finalOutput | Out-File -FilePath $newFileName -Encoding UTF8
        Write-Host "`nSuccess! Data saved to $newFileName" -ForegroundColor Green
        Write-Host "Used separator: '$systemSeparator'" -ForegroundColor Gray
    } else {
        Write-Host "No data found in JSON." -ForegroundColor Yellow
    }
} catch {
    if ($_.Exception.Message -like "*404*") {
        Write-Host "Error: Request returned 404 (Not Found)." -ForegroundColor Red
    } elseif ($_.Exception.Message -like "*429*") {
        Write-Host "Error: 429 Too Many Requests. GitHub is rate-limiting you. Wait a few minutes." -ForegroundColor Red
    } else {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nPress any key to exit..."
$null = [Console]::ReadKey()
