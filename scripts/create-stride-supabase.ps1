# Creates a NEW Supabase project on YOUR personal account for Stride.
# Does NOT touch Gatherly. Requires a personal access token (not Gatherly's).
#
# 1) Log into https://supabase.com with your PERSONAL account
# 2) Create a PAT: https://supabase.com/dashboard/account/tokens
# 3) In PowerShell:
#      $env:STRIDE_SUPABASE_ACCESS_TOKEN = "sbp_..."
#      .\scripts\create-stride-supabase.ps1
# 4) Copy printed project ref into .cursor/mcp.json (from mcp.json.example)
# 5) Reload Cursor MCP servers

param(
  [string]$ProjectName = "stride-clinic",
  [string]$Region = "ap-south-1",
  [string]$DbPassword = ""
)

$ErrorActionPreference = "Stop"
$token = $env:STRIDE_SUPABASE_ACCESS_TOKEN
if (-not $token) {
  Write-Error "Set STRIDE_SUPABASE_ACCESS_TOKEN to a PERSONAL Supabase access token first."
}

$headers = @{
  Authorization = "Bearer $token"
  "Content-Type" = "application/json"
}

Write-Host "Listing organizations on this token's account..."
$orgs = Invoke-RestMethod -Method GET -Uri "https://api.supabase.com/v1/organizations" -Headers $headers
if (-not $orgs -or $orgs.Count -eq 0) {
  Write-Error "No organizations found. Confirm this PAT is from your personal Supabase account."
}

Write-Host "Organizations:"
$orgs | ForEach-Object { Write-Host (" - {0} ({1})" -f $_.name, $_.id) }

$orgId = $orgs[0].id
if ($orgs.Count -gt 1) {
  Write-Host "Using first org: $orgId (edit script if you need another)."
}

if (-not $DbPassword) {
  $bytes = New-Object byte[] 24
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $DbPassword = ([Convert]::ToBase64String($bytes) -replace "[+/=]", "A") + "a1!"
}

$body = @{
  name            = $ProjectName
  organization_id = $orgId
  region          = $Region
  db_pass         = $DbPassword
} | ConvertTo-Json

Write-Host "Creating project '$ProjectName' in $Region ..."
$project = Invoke-RestMethod -Method POST -Uri "https://api.supabase.com/v1/projects" -Headers $headers -Body $body

Write-Host ""
Write-Host "Created Stride Supabase project."
Write-Host ("project_ref : {0}" -f $project.id)
Write-Host ("name        : {0}" -f $project.name)
Write-Host ("region      : {0}" -f $project.region)
Write-Host ""
Write-Host "Save the DB password somewhere safe (shown once here):"
Write-Host $DbPassword
Write-Host ""
Write-Host "Next:"
Write-Host "1. Copy .cursor/mcp.json.example -> .cursor/mcp.json"
Write-Host "2. Set project-ref to the project_ref above"
Write-Host "3. Set SUPABASE_ACCESS_TOKEN to your PERSONAL PAT"
Write-Host "4. Reload Cursor MCP (do not edit the global Gatherly 'supabase' MCP)"
Write-Host "5. Tell the agent the project_ref so it can wire DATABASE_URL / secrets"
