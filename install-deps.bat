@echo off
echo Instalando dependencias de Vigi...
echo.

echo 1/4 - Instalando dependencias principales...
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error instalando dependencias principales
    pause
    exit /b 1
)

echo.
echo 2/4 - Instalando dependencias del backend...
cd backend
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error instalando dependencias del backend
    cd ..
    pause
    exit /b 1
)

echo.
echo 3/4 - Instalando dependencias del frontend...
cd ../frontend
call npm install
if %ERRORLEVEL% neq 0 (
    echo Error instalando dependencias del frontend
    cd ..
    pause
    exit /b 1
)

echo.
echo 4/4 - Configurando entorno...
cd ..
if not exist "backend\.env" (
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env"
        echo Archivo .env creado
    )
)

echo.
echo Instalacion completada exitosamente!
echo.
echo Comandos disponibles:
echo   npm run dev          - Arrancar todo en puerto 3000
echo   npm run dev:simple   - Arrancar sin proxy
echo   npm run seed         - Poblar base de datos
echo.
echo Para comenzar ejecuta: npm run dev
echo.
pause