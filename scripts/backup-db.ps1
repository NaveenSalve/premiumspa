# Automated PostgreSQL backup for the Spa app (pg_dump, custom format).
# - Reads connection settings from .env (secrets never logged).
# - Writes to <project>\backups\spa-<timestamp>.dump
# - Verifies the archive is valid with pg_restore --list.
# - Retention: keeps the newest $KeepCount dumps.
# Safe: read-only on the source database; never writes to production tables.

$ErrorActionPreference = 'Stop'

$ProjectDir = 'C:\Users\Lenovo\Downloads\premium-spa-&-home-wellness'
$BackupDir = Join-Path $ProjectDir 'backups'
$PgBin     = 'C:\Program Files\PostgreSQL\18\bin'
$KeepCount = 14

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

# ---- read .env (values only, never echoed) ----
$envVars = @{}
foreach ($line in Get-Content (Join-Path $ProjectDir '.env')) {
    if ($line -match '^([A-Za-z_]+)="?([^"]*)"?$') {
        $envVars[$matches[1]] = $matches[2].TrimEnd('"')
    }
}
$DatabaseUrl = if ($envVars['DATABASE_URL']) { $envVars['DATABASE_URL'] } elseif ($envVars['POSTGRES_URL']) { $envVars['POSTGRES_URL'] } else { $null }

function Convert-ToLibpqUrl([string]$Url) {
    $builder = [System.UriBuilder]::new($Url)
    $kept = @()
    foreach ($part in $builder.Query.TrimStart('?').Split('&', [System.StringSplitOptions]::RemoveEmptyEntries)) {
        $name = ($part.Split('=', 2)[0]).ToLowerInvariant()
        if ($name -in @('pgbouncer', 'connection_limit', 'pool_timeout')) { continue }
        $kept += $part
    }
    $builder.Query = ($kept -join '&')
    return $builder.Uri.AbsoluteUri
}

if ($DatabaseUrl) {
    $DatabaseUrl = Convert-ToLibpqUrl $DatabaseUrl
}

$Host_   = if ($envVars['SQL_HOST'])    { $envVars['SQL_HOST'] }    else { '127.0.0.1' }
$Port_   = if ($envVars['SQL_PORT'])    { $envVars['SQL_PORT'] }    else { '5432' }
$DbName_ = if ($envVars['SQL_DB_NAME']) { $envVars['SQL_DB_NAME'] } else { 'spa' }
$User_   = if ($envVars['SQL_USER'])    { $envVars['SQL_USER'] }    else { 'postgres' }

if (-not $DatabaseUrl) {
    $env:PGPASSWORD = if ($envVars['SQL_PASSWORD']) { $envVars['SQL_PASSWORD'] } else { '' }
}

$stamp  = Get-Date -Format 'yyyyMMdd-HHmmss'
$out    = Join-Path $BackupDir ("spa-$stamp.dump")
$outTxt = Join-Path $BackupDir ("spa-$stamp.dump.txt")   # archive listing (inspection aid)

if ($DatabaseUrl) {
    & "$PgBin\pg_dump.exe" --dbname=$DatabaseUrl --schema=public -Fc --no-owner --no-privileges -f $out
} else {
    & "$PgBin\pg_dump.exe" -h $Host_ -p $Port_ -U $User_ -d $DbName_ --schema=public -Fc --no-owner --no-privileges -f $out
}
if ($LASTEXITCODE -ne 0) { Write-Error "pg_dump failed (exit $LASTEXITCODE)"; exit 1 }
if (-not (Test-Path $out) -or (Get-Item $out).Length -lt 1024) { Write-Error 'Dump file missing or too small'; exit 1 }

# ---- integrity check: list the archive ----
& "$PgBin\pg_restore.exe" --list $out > $outTxt
if ($LASTEXITCODE -ne 0) { Write-Error 'pg_restore --list failed (invalid archive)'; exit 1 }

$sizeKB = [math]::Round((Get-Item $out).Length / 1KB, 1)
Write-Output "BACKUP OK: $out ($sizeKB KB)"

# ---- retention: keep newest $KeepCount dumps ----
Get-ChildItem $BackupDir -Filter 'spa-*.dump' | Sort-Object Name -Descending | Select-Object -Skip $KeepCount | ForEach-Object {
    Remove-Item $_.FullName -Force
    Remove-Item (Join-Path $BackupDir ($_.BaseName + '.dump.txt')) -Force -ErrorAction SilentlyContinue
}
if (-not $DatabaseUrl) {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
Write-Output 'RETENTION OK'
exit 0
