@echo off
REM Runs keep_data_fresh.py using the project's virtual environment.
REM This is the file Windows Task Scheduler should point to.

cd /d "%~dp0"
call venv\Scripts\activate.bat
python keep_data_fresh.py >> refresh_log.txt 2>&1
