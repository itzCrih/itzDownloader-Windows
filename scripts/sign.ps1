param(
  [string]$ReleaseDir = "release",
  [string]$CertPath = "certs\itzcrih-codesign.pfx",
  [string]$Password = "itzCrih2026Secure!"
)

if (!(Test-Path $CertPath)) {
  Write-Warning "Certificate not found at $CertPath"
  exit 0
}

if (!(Test-Path $ReleaseDir)) {
  Write-Warning "Release directory not found at $ReleaseDir"
  exit 0
}

$secPass = ConvertTo-SecureString $Password -AsPlainText -Force
$resolvedCert = (Resolve-Path $CertPath).Path
$cert = [System.Security.Cryptography.X509Certificates.X509Certificate2]::new($resolvedCert, $secPass)

Write-Host "Code signing certificate loaded: $($cert.Subject)" -ForegroundColor Cyan

$exeFiles = Get-ChildItem -Path $ReleaseDir -Filter "*.exe" | Where-Object { $_.Name -notmatch "uninstaller" }

foreach ($file in $exeFiles) {
  Write-Host "Authenticode signing: $($file.Name)..." -ForegroundColor Yellow
  try {
    $sig = Set-AuthenticodeSignature -FilePath $file.FullName -Certificate $cert -TimestampServer "http://timestamp.digicert.com"
    if ($sig.Status -eq "Valid") {
      Write-Host "✓ Successfully signed $($file.Name) [Status: $($sig.Status)]" -ForegroundColor Green
    } else {
      Write-Host "! Signed $($file.Name) with status: $($sig.Status) ($($sig.StatusMessage))" -ForegroundColor Yellow
    }
  } catch {
    Write-Warning "Failed to sign $($file.Name): $($_.Exception.Message)"
  }
}
