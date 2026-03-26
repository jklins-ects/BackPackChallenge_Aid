$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

python -m PyInstaller `
    --noconfirm `
    --clean `
    --windowed `
    --name BackPackChallengeStation `
    --add-data "config;config" `
    --add-data "assets;assets" `
    main.py
