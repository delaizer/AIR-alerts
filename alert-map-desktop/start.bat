@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo Перший запуск: встановлення залежностей...
  call npm install || (pause & exit /b 1)
)
call npm start
