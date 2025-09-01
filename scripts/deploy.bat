@echo off
REM Cloudflare Static Deployer - Deployment Script for Windows
REM Usage: scripts\deploy.bat [environment]
REM Environments: development, staging, production

setlocal enabledelayedexpansion

set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=production

echo 🚀 Starting deployment for environment: %ENVIRONMENT%

REM Validate environment
if "%ENVIRONMENT%"=="development" goto :valid_env
if "%ENVIRONMENT%"=="staging" goto :valid_env
if "%ENVIRONMENT%"=="production" goto :valid_env

echo ❌ Invalid environment: %ENVIRONMENT%
echo Valid environments: development, staging, production
exit /b 1

:valid_env
echo ✅ Valid environment: %ENVIRONMENT%

REM Check if required files exist
if not "%ENVIRONMENT%"=="development" (
  if not exist ".env.%ENVIRONMENT%.example" (
    echo ❌ Environment file .env.%ENVIRONMENT%.example not found
    exit /b 1
  )
  
  if not exist ".env.%ENVIRONMENT%" (
    echo ⚠️  Environment file .env.%ENVIRONMENT% not found
    echo Please copy .env.%ENVIRONMENT%.example to .env.%ENVIRONMENT% and configure it
    exit /b 1
  )
)

REM Install dependencies
echo 📦 Installing dependencies...
call npm ci
if errorlevel 1 exit /b 1

REM Run linting
echo 🔍 Running linting...
call npm run lint
if errorlevel 1 exit /b 1

REM Run tests
echo 🧪 Running tests...
call npm run test
if errorlevel 1 exit /b 1

REM Build the application
echo 🏗️  Building application...
call npm run build
if errorlevel 1 exit /b 1

REM Create deployment package
echo 📦 Creating deployment package...
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "timestamp=%YYYY%%MM%%DD%-%HH%%Min%%Sec%"

set DEPLOY_DIR=deploy-%ENVIRONMENT%-%timestamp%
mkdir "%DEPLOY_DIR%"

REM Copy built files
xcopy /E /I backend\dist "%DEPLOY_DIR%\dist"
xcopy /E /I frontend\dist "%DEPLOY_DIR%\public"
copy backend\package.json "%DEPLOY_DIR%\"
copy package.json "%DEPLOY_DIR%\package-root.json"

REM Copy environment files
if exist ".env.%ENVIRONMENT%" copy ".env.%ENVIRONMENT%" "%DEPLOY_DIR%\.env"

REM Copy deployment files
copy Dockerfile "%DEPLOY_DIR%\"
copy docker-compose.yml "%DEPLOY_DIR%\"
copy nginx.conf "%DEPLOY_DIR%\"
copy .dockerignore "%DEPLOY_DIR%\"

echo ✅ Deployment package created: %DEPLOY_DIR%
echo.
echo 📋 Next steps:
echo 1. Review the deployment package in %DEPLOY_DIR%
echo 2. Configure environment variables in %DEPLOY_DIR%\.env
echo 3. Deploy using Docker or manual deployment
echo.
echo 🎉 Deployment preparation complete!

endlocal