# Project Agent Notes

## Encoding

- This repository contains Thai text. Treat UTF-8 as the default encoding for all text files.
- When using PowerShell commands that read or write text file contents, always specify `-Encoding utf8`.
- Do not rely on PowerShell's default encoding when working with repository files.
- If you need to create, rewrite, append, or export text in PowerShell, include `-Encoding utf8` explicitly every time.

## PowerShell Examples

- Read file: `Get-Content -Encoding utf8 <path>`
- Write file: `Set-Content -Encoding utf8 <path> <value>`
- Append file: `Add-Content -Encoding utf8 <path> <value>`
- Export file: `Out-File -Encoding utf8 <path>`

## Goal

- Prevent corrupted Thai characters and encoding drift during agent edits, inspection, and automation.
