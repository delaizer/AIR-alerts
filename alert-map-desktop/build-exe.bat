@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo === Мапа Тривог: створення .exe ===
where node >nul 2>nul
if errorlevel 1 (
  echo Спочатку встановіть Node.js LTS: https://nodejs.org
  start https://nodejs.org
  pause
  exit /b 1
)
echo [1/2] Встановлення залежностей...
call npm install
if errorlevel 1 goto err
echo [2/2] Збірка .exe...
call npm run dist
if errorlevel 1 goto err
echo.
echo Готово! Файли у папці dist:
echo   MapaTryvog-...-x64.exe  - інсталятор
echo   MapaTryvog-...-x64.exe  - портативна версія (запуск без встановлення)
start "" "%~dp0dist"
pause
exit /b 0
:err
echo.
echo Помилка збірки. Якщо є слова "symbolic link" або "winCodeSign":
echo увімкніть "Режим розробника" у Параметрах Windows
echo або запустіть цей файл від імені адміністратора.
pause
exit /b 1
