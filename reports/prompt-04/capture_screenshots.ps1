$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$outDir = "E:\watech-bi\reports\prompt-04"

$shots = @(
  @{ name = "01_imported_real_businesses.png"; url = "http://localhost:3000/?module=discovery&project=proj-canton-hvac-real" },
  @{ name = "02_mode_b_selection.png"; url = "http://localhost:3000/?module=lead_pipeline&project=proj-canton-hvac-real" },
  @{ name = "03_stage_results.png"; url = "http://localhost:3000/?module=lead_pipeline&project=proj-canton-hvac-real&view=results" },
  @{ name = "04_audit_and_scores.png"; url = "http://localhost:3000/?module=website_audit&project=proj-canton-hvac-real" },
  @{ name = "05_crm_and_followup_records.png"; url = "http://localhost:3000/?module=lead_crm&project=proj-canton-hvac-real" }
)

foreach ($s in $shots) {
  $file = Join-Path $outDir $s.name
  Write-Host "Capturing $($s.name) from $($s.url)..."
  Start-Process $edge -ArgumentList "--headless=new", "--window-size=1440,900", "--virtual-time-budget=6000", "--screenshot=$file", $s.url -Wait
  if (Test-Path $file) {
    $size = (Get-Item $file).Length
    Write-Host "  Successfully saved $file ($size bytes)"
  } else {
    Write-Host "  Failed to save $file"
  }
}
