@echo off
chcp 65001 >nul
title SnailShop CSV Exporter

echo ============================================================
echo   SnailShop CSV Exporter - UTF-8 BOM
echo   ไฟล์ CSV จะถูกบันทึกไว้ในโฟลเดอร์ exports\
echo ============================================================
echo.

cd /d "%~dp0"

node scripts\export-csv.js %*

echo.
echo ============================================================
echo   เสร็จสิ้น! ไฟล์อยู่ที่โฟลเดอร์  exports\
echo   กด Enter เพื่อปิดหน้าต่างนี้
echo ============================================================
pause >nul
