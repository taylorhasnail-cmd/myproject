import http.server
import socketserver
import os

# 设置端口号
PORT = 8000

# 获取当前脚本所在目录
script_dir = os.path.dirname(os.path.abspath(__file__))

# 更改工作目录到脚本所在目录
os.chdir(script_dir)

# 创建请求处理器
Handler = http.server.SimpleHTTPRequestHandler

# 设置服务器
with socketserver.TCPServer("", PORT) as httpd:
    print(f"服务已启动，访问 http://localhost:{PORT} 查看待办事项应用")
    try:
        # 启动服务器
        httpd.serve_forever()
    except KeyboardInterrupt:
        # 处理Ctrl+C中断
        print("\n服务已停止")
        httpd.server_close()