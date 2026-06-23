@echo off
cd /d "%~dp0"
echo 🌿 熔炉 · 知识炼金 已启动
echo.
echo 在手机上打开：http://手机IP:8080
echo 按 Ctrl+C 停止
echo.
python -m http.server 8080
pause
