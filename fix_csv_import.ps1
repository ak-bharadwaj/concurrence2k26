# ============================================================
# CSV Cleaner for Supabase Import
# Run this script, then import the _clean.csv files to the new project
# ============================================================

# --- TEAMS CSV ---
# Change this path to wherever you saved the teams CSV
$teamsCsv = "$HOME\Downloads\teams_rows.csv"
if (Test-Path $teamsCsv) {
    $teams = Import-Csv $teamsCsv
    $cleanTeams = $teams | Select-Object id, name, unique_code, leader_id, payment_mode, max_members, status, created_at
    $cleanTeams | Export-Csv "$HOME\Downloads\teams_clean.csv" -NoTypeInformation
    Write-Host "✅ Teams CSV cleaned: $HOME\Downloads\teams_clean.csv" -ForegroundColor Green
} else {
    Write-Host "❌ teams CSV not found at: $teamsCsv — update the path" -ForegroundColor Red
}

# --- USERS CSV ---
$usersCsv = "$HOME\Downloads\users_rows.csv"
if (Test-Path $usersCsv) {
    $users = Import-Csv $usersCsv
    $cleanUsers = $users | Select-Object id, name, reg_no, email, phone, college, branch, year, tshirt_size, role, status, team_id, transaction_id, screenshot_url, is_present, attended_at, created_at
    $cleanUsers | Export-Csv "$HOME\Downloads\users_clean.csv" -NoTypeInformation
    Write-Host "✅ Users CSV cleaned: $HOME\Downloads\users_clean.csv" -ForegroundColor Green
} else {
    Write-Host "❌ users CSV not found at: $usersCsv — update the path" -ForegroundColor Red
}

# --- QR CODES CSV ---
$qrCsv = "$HOME\Downloads\qr_codes_rows.csv"
if (Test-Path $qrCsv) {
    $qr = Import-Csv $qrCsv
    $cleanQr = $qr | Select-Object id, qr_image_url, upi_id, upi_name, category, amount, today_usage, daily_limit, active, created_at
    $cleanQr | Export-Csv "$HOME\Downloads\qr_codes_clean.csv" -NoTypeInformation
    Write-Host "✅ QR Codes CSV cleaned: $HOME\Downloads\qr_codes_clean.csv" -ForegroundColor Green
} else {
    Write-Host "❌ qr_codes CSV not found at: $qrCsv — update the path" -ForegroundColor Red
}

# --- GROUP LINKS CSV ---
$groupsCsv = "$HOME\Downloads\group_links_rows.csv"
if (Test-Path $groupsCsv) {
    $groups = Import-Csv $groupsCsv
    $cleanGroups = $groups | Select-Object id, college_name, whatsapp_link, created_at
    $cleanGroups | Export-Csv "$HOME\Downloads\group_links_clean.csv" -NoTypeInformation
    Write-Host "✅ Group Links CSV cleaned: $HOME\Downloads\group_links_clean.csv" -ForegroundColor Green
} else {
    Write-Host "❌ group_links CSV not found at: $groupsCsv — update the path" -ForegroundColor Red
}

Write-Host ""
Write-Host "Done! Import the *_clean.csv files into new Supabase in this order:" -ForegroundColor Cyan
Write-Host "  1. teams_clean.csv" -ForegroundColor Yellow
Write-Host "  2. qr_codes_clean.csv" -ForegroundColor Yellow
Write-Host "  3. users_clean.csv" -ForegroundColor Yellow
Write-Host "  4. group_links_clean.csv" -ForegroundColor Yellow
