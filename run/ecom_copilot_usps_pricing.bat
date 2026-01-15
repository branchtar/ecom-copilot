@echo off
REM Ecom Copilot - USPS Pricing Sandbox launcher
cd /d "%~dp0\.."
powershell -ExecutionPolicy Bypass -File "ps1\ecom_copilot_run_usps_pricing.ps1"
