# Restore verification for the most recent Spa DB backup.
# Restores into a TEMPORARY database (spa_restore_test), validates row counts,
# then DROPS the temporary database. Never touches production data.
# Safe: uses a separate database created for the test and removed afterwards.

$ErrorActionPreference = 'Stop'

$ProjectDir = 'C:\Users\Lenovo\Downloads\premium-spa-&-home-wellness'
$PgBin      = 'C:\Program Files\PostgreSQL\18\bin'

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

function Set-DatabaseInUrl([string]$Url, [string]$DatabaseName) {
    $builder = [System.UriBuilder]::new($Url)
    $builder.Path = '/' + $DatabaseName
    return $builder.Uri.AbsoluteUri
}

$TestDb = 'spa_restore_test'
$AdminUrl = if ($DatabaseUrl) { Set-DatabaseInUrl $DatabaseUrl 'postgres' } else { $null }
$TestUrl = if ($DatabaseUrl) { Set-DatabaseInUrl $DatabaseUrl $TestDb } else { $null }

$BackupDir = Join-Path $ProjectDir 'backups'
$Latest    = Get-ChildItem $BackupDir -Filter 'spa-*.dump' | Sort-Object Name -Descending | Select-Object -First 1
if (-not $Latest) { Write-Error 'No backup found'; exit 1 }
Write-Output "Restoring from: $($Latest.Name)"

# fresh temp DB: PS 5.1 + $ErrorActionPreference='Stop' turns psql's stderr
# (NOTICE: database ... does not exist) into a terminating NativeCommandError even
# with 2>&1/2>$null; scope EAP to Continue so stderr is non-terminating, then rely
# on $LASTEXITCODE below.
$oldEap = $ErrorActionPreference
try {
    $ErrorActionPreference = 'Continue'
    $TerminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TestDb' AND pid <> pg_backend_pid();"
    if ($DatabaseUrl) {
        $createOutput = & "$PgBin\psql.exe" --dbname=$AdminUrl -v ON_ERROR_STOP=1 -c $TerminateSql -c "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" -c "CREATE DATABASE $TestDb;" 2>&1
    } else {
        $createOutput = & "$PgBin\psql.exe" -h $Host_ -p $Port_ -U $User_ -d postgres -v ON_ERROR_STOP=1 -c $TerminateSql -c "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" -c "CREATE DATABASE $TestDb;" 2>&1
    }
} finally {
    $ErrorActionPreference = $oldEap
}
if ($LASTEXITCODE -ne 0) {
    Write-Output ($createOutput | Out-String)
    Write-Error 'create temp db failed'
    exit 1
}

try {
    if ($DatabaseUrl) {
        & "$PgBin\psql.exe" --dbname=$TestUrl -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE;" | Out-Null
    } else {
        & "$PgBin\psql.exe" -h $Host_ -p $Port_ -U $User_ -d $TestDb -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS public CASCADE;" | Out-Null
    }
    if ($LASTEXITCODE -ne 0) { Write-Error 'prepare temp schema failed'; exit 1 }

    if ($DatabaseUrl) {
        & "$PgBin\pg_restore.exe" --dbname=$TestUrl --no-owner --no-privileges --exit-on-error $Latest.FullName
    } else {
        & "$PgBin\pg_restore.exe" -h $Host_ -p $Port_ -U $User_ -d $TestDb --no-owner --no-privileges --exit-on-error $Latest.FullName
    }
    if ($LASTEXITCODE -ne 0) { Write-Error "pg_restore failed (exit $LASTEXITCODE)"; exit 1 }

    $tables = @('bookings','customers','services','therapists','enquiries','contact_messages','admin_notifications','admin_users')
    $src = @{}
    $dst = @{}
    foreach ($t in $tables) {
        $qualified = "public.$t"
        if ($DatabaseUrl) {
            $r = & "$PgBin\psql.exe" --dbname=$DatabaseUrl -t -A -c "SELECT count(*) FROM $qualified;"
        } else {
            $r = & "$PgBin\psql.exe" -h $Host_ -p $Port_ -U $User_ -d $DbName_ -t -A -c "SELECT count(*) FROM $qualified;"
        }
        $src[$t] = $r.Trim()
        if ($DatabaseUrl) {
            $r = & "$PgBin\psql.exe" --dbname=$TestUrl -t -A -c "SELECT count(*) FROM $qualified;"
        } else {
            $r = & "$PgBin\psql.exe" -h $Host_ -p $Port_ -U $User_ -d $TestDb -t -A -c "SELECT count(*) FROM $qualified;"
        }
        $dst[$t] = $r.Trim()
    }
    $fail = 0
    foreach ($t in $tables) {
        $ok = ($src[$t] -eq $dst[$t])
        Write-Output ("{0,-20} source={1,-6} restored={2,-6} {3}" -f $t, $src[$t], $dst[$t], $(if ($ok) {'MATCH'} else {'MISMATCH'}))
        if (-not $ok) { $fail++ }
    }
    if ($fail -gt 0) { Write-Error 'Row-count mismatch after restore'; exit 1 }
    Write-Output 'RESTORE VERIFICATION PASSED'
}
finally {
    $oldEap = $ErrorActionPreference
    try {
        $ErrorActionPreference = 'Continue'
        $TerminateSql = "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$TestDb' AND pid <> pg_backend_pid();"
        if ($DatabaseUrl) {
            & "$PgBin\psql.exe" --dbname=$AdminUrl -c $TerminateSql -c "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" 2>&1 | Out-Null
        } else {
            & "$PgBin\psql.exe" -h $Host_ -p $Port_ -U $User_ -d postgres -c $TerminateSql -c "DROP DATABASE IF EXISTS $TestDb WITH (FORCE);" 2>&1 | Out-Null
        }
    } finally {
        $ErrorActionPreference = $oldEap
    }
    if (-not $DatabaseUrl) {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}
exit 0
