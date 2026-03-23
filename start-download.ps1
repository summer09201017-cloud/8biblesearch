# 在獨立隱藏視窗背景執行 download_bible.js，進度寫入 download.log
$here = $PSScriptRoot
$log = Join-Path $here 'download.log'
$err = Join-Path $here 'download_err.log'
"======== $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') 開始 =========" | Out-File $log -Encoding utf8
$cmd = @"
Set-Location -LiteralPath '$here'
node download_bible.js *>&1 | Tee-Object -FilePath '$log' -Append
"@
Start-Process powershell.exe -ArgumentList @(
  '-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', $cmd
) -WorkingDirectory $here
Write-Host '已啟動背景下載。請用記事本或 IDE 開啟 download.log 查看進度。'
