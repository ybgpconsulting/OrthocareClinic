param(
  [Parameter(Mandatory = $true)]
  [string]$BackupDirectory
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$resolvedBackupDirectory = [System.IO.Path]::GetFullPath($BackupDirectory)

if (-not [System.IO.Path]::IsPathRooted($BackupDirectory)) {
  throw 'BackupDirectory must be an absolute path outside the repository.'
}
if ($resolvedBackupDirectory.StartsWith($repositoryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw 'Backups contain clinic and patient data and must be stored outside the repository.'
}

New-Item -ItemType Directory -Force -Path $resolvedBackupDirectory | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmssfff'
$backupPath = Join-Path $resolvedBackupDirectory "orthocareclinic-$timestamp.sql"
if (Test-Path -LiteralPath $backupPath) {
  throw "Refusing to overwrite an existing backup: $backupPath"
}

& npx wrangler d1 export orthocareclinic --remote --skip-confirmation --output $backupPath
if ($LASTEXITCODE -ne 0) {
  throw "D1 export failed with exit code $LASTEXITCODE."
}
if (-not (Test-Path -LiteralPath $backupPath) -or (Get-Item -LiteralPath $backupPath).Length -lt 100) {
  throw 'D1 export did not produce a plausible SQL backup.'
}

$hash = Get-FileHash -LiteralPath $backupPath -Algorithm SHA256
Set-Content -LiteralPath "$backupPath.sha256" -Value "$($hash.Hash)  $(Split-Path -Leaf $backupPath)" -Encoding ascii
Write-Output "Backup created outside the repository: $backupPath"
Write-Output "SHA-256: $($hash.Hash)"
