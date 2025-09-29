@echo off

:: 内网穿透启动脚本
:: 此脚本用于启动ngrok，将本地8000端口暴露到公网
:: 使用前请确保已安装Node.js并启动了server.js

:: 检查是否已安装ngrok
where ngrok >nul 2>nul
if %errorlevel% neq 0 (
    echo 未找到ngrok，请先安装ngrok
    echo 1. 访问 https://ngrok.com/download 下载适合您系统的版本
    echo 2. 将ngrok.exe解压到任意目录
    echo 3. 将该目录添加到系统环境变量PATH中
    pause
    exit /b 1
)

:: 提示用户确保server.js已启动
cls
echo ===============================
echo       待办事项应用 - 内网穿透工具
 echo ===============================
echo 请确保您已在另一个命令窗口中启动了Node.js服务器：
echo node server.js
echo.
echo 按任意键继续...
pause >nul

:: 启动ngrok，转发本地8000端口
echo 正在启动ngrok，将本地8000端口暴露到公网...
echo.ngrok http 8000

pause