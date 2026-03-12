@echo off
TITLE TGS UNIFIED SHUTDOWN
SETLOCAL EnableDelayedExpansion

:: ============================================================================
::   CONFIGURATION: Define the ports used by your applications
:: ============================================================================
SET "ALL_PORTS=4567 4568 4570 4571 4573 4574"

echo ============================================================================
echo   TGS AUTOMATED SHUTDOWN
echo   Terminating Backend Workers on Ports: %ALL_PORTS%
echo ============================================================================

for %%P in (%ALL_PORTS%) do (
    echo [CHECK] Searching for process on Port %%P...
    for /f "tokens=5" %%A in ('netstat -aon ^| findstr :%%P ^| findstr LISTENING') do (
        echo      --^> Found PID %%A. Terminating...
        taskkill /F /PID %%A >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo      [SUCCESS] Worker on Port %%P stopped.
        ) else (
            echo      [ERROR] Could not stop process %%A on Port %%P.
        )
    )
)

echo.
echo ============================================================================
echo   SHUTDOWN COMPLETE
echo   All backend instances have been terminated.
echo ============================================================================
pause
