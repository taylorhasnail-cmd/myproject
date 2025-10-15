import http.server
import socketserver
import json
import os
import hashlib
import time
import random
from urllib.parse import parse_qs, urlparse

PORT = 8000

# 获取当前脚本所在目录
script_dir = os.path.dirname(os.path.abspath(__file__))

# 更改工作目录到脚本所在目录
os.chdir(script_dir)

# 数据文件路径
DATA_FILE = os.path.join(script_dir, 'todos-data.json')
USERS_FILE = os.path.join(script_dir, 'users-data.json')

# 简单的密码哈希函数
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# 生成简单的会话令牌
def generate_token():
    return hashlib.sha256((str(random.random()) + str(time.time())).encode()).hexdigest()

# 读取待办事项数据
def read_todos_data():
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# 写入待办事项数据
def write_todos_data(data):
    # 确保目录存在
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 读取用户数据
def read_users_data():
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

# 写入用户数据
def write_users_data(data):
    # 确保目录存在
    os.makedirs(os.path.dirname(USERS_FILE), exist_ok=True)
    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

# 验证用户凭据
def authenticate_user(username, password):
    users = read_users_data()
    user = users.get(username)
    if user and user.get('password') == hash_password(password):
        return user
    return None

# 获取用户会话信息
def get_session(token):
    users = read_users_data()
    for username, user in users.items():
        if user.get('token') == token:
            return user
    return None

# 自定义HTTP请求处理器
class TodoHandler(http.server.BaseHTTPRequestHandler):
    # 设置响应头
    def _set_headers(self, status_code=200, content_type='application/json'):
        self.send_response(status_code)
        self.send_header('Content-Type', f'{content_type}; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    # 处理OPTIONS请求
    def do_OPTIONS(self):
        self._set_headers(200)
        self.wfile.write(b'')

    # 读取请求体
    def _read_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        return self.rfile.read(content_length).decode('utf-8')

    # 获取认证令牌
    def _get_token(self):
        auth_header = self.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            return auth_header[7:]
        return None

    # 验证用户会话
    def _verify_auth(self):
        token = self._get_token()
        if not token:
            self._set_headers(401)
            self.wfile.write(json.dumps({'error': '未提供认证令牌'}, ensure_ascii=False).encode('utf-8'))
            return None
        
        user = get_session(token)
        if not user:
            self._set_headers(401)
            self.wfile.write(json.dumps({'error': '未授权'}, ensure_ascii=False).encode('utf-8'))
            return None
        
        return user

    # 处理GET请求
    def do_GET(self):
        # 处理认证验证请求
        if self.path == '/api/auth/verify':
            user = get_session(self._get_token())
            if user:
                self._set_headers(200)
                self.wfile.write(json.dumps({'username': user['username']}, ensure_ascii=False).encode('utf-8'))
            else:
                self._set_headers(401)
                self.wfile.write(json.dumps({'error': '未授权'}, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理待办事项请求
        if self.path.startswith('/api/todos'):
            # 验证用户
            user = self._verify_auth()
            if not user:
                return
            
            todos_data = read_todos_data()
            username = user['username']
            todos = todos_data.get(username, [])
            self._set_headers(200)
            self.wfile.write(json.dumps(todos, ensure_ascii=False).encode('utf-8'))
        else:
            # 处理静态文件请求
            self.serve_static_file()

    # 处理POST请求
    def do_POST(self):
        # 处理注册请求
        if self.path == '/api/auth/register':
            try:
                body = self._read_body()
                
                if not body or body.strip() == '':
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': '请求体为空'}, ensure_ascii=False).encode('utf-8'))
                    return
                
                user_data = json.loads(body)
                
                if not user_data.get('username') or not user_data.get('password'):
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': '用户名和密码不能为空'}, ensure_ascii=False).encode('utf-8'))
                    return
                
                users = read_users_data()
                if user_data['username'] in users:
                    self._set_headers(400)
                    self.wfile.write(json.dumps({'error': '用户名已存在'}, ensure_ascii=False).encode('utf-8'))
                    return
                
                # 创建新用户
                new_user = {
                    'username': user_data['username'],
                    'password': hash_password(user_data['password']),
                    'token': None,
                    'createdAt': int(time.time() * 1000)
                }
                
                users[user_data['username']] = new_user
                write_users_data(users)
                
                # 为新用户创建空的待办事项列表
                todos_data = read_todos_data()
                todos_data[user_data['username']] = []
                write_todos_data(todos_data)
                
                self._set_headers(201)
                self.wfile.write(json.dumps({'message': '注册成功'}, ensure_ascii=False).encode('utf-8'))
            except json.JSONDecodeError as e:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': '无效的JSON格式', 'details': str(e)}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                self._set_headers(500)
                self.wfile.write(json.dumps({'error': '服务器错误', 'details': str(e)}, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理登录请求
        if self.path == '/api/auth/login':
            try:
                body = self._read_body()
                login_data = json.loads(body)
                
                user = authenticate_user(login_data.get('username'), login_data.get('password'))
                if user:
                    # 生成新的会话令牌
                    token = generate_token()
                    users = read_users_data()
                    users[user['username']]['token'] = token
                    write_users_data(users)
                    
                    self._set_headers(200)
                    self.wfile.write(json.dumps({'token': token, 'username': user['username']}, ensure_ascii=False).encode('utf-8'))
                else:
                    self._set_headers(401)
                    self.wfile.write(json.dumps({'error': '用户名或密码错误'}, ensure_ascii=False).encode('utf-8'))
            except json.JSONDecodeError:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': '无效的JSON数据'}, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理登出请求
        if self.path == '/api/auth/logout':
            try:
                token = self._get_token()
                if token:
                    user = get_session(token)
                    if user:
                        users = read_users_data()
                        users[user['username']]['token'] = None
                        write_users_data(users)
                
                self._set_headers(200)
                self.wfile.write(json.dumps({'message': '登出成功'}, ensure_ascii=False).encode('utf-8'))
            except Exception:
                self._set_headers(200)
                self.wfile.write(json.dumps({'message': '登出成功'}, ensure_ascii=False).encode('utf-8'))
            return
        
        # 处理添加待办事项请求
        if self.path.startswith('/api/todos'):
            # 验证用户
            user = self._verify_auth()
            if not user:
                return
            
            try:
                body = self._read_body()
                todo_data = json.loads(body)
                
                todos_data = read_todos_data()
                username = user['username']
                
                if username not in todos_data:
                    todos_data[username] = []
                
                # 添加新的待办事项
                new_todo = {
                    'id': int(time.time() * 1000),
                    'text': todo_data.get('text', ''),
                    'completed': todo_data.get('completed', False),
                    'createdAt': int(time.time() * 1000),
                    'updatedAt': int(time.time() * 1000)
                }
                
                todos_data[username].append(new_todo)
                write_todos_data(todos_data)
                
                self._set_headers(201)
                self.wfile.write(json.dumps(new_todo, ensure_ascii=False).encode('utf-8'))
            except json.JSONDecodeError:
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': '无效的JSON数据'}, ensure_ascii=False).encode('utf-8'))
        else:
            self.serve_static_file()

    # 处理PUT请求
    def do_PUT(self):
        if self.path.startswith('/api/todos/'):
            # 验证用户
            user = self._verify_auth()
            if not user:
                return
            
            todo_id = int(self.path.split('/')[-1])
            try:
                body = self._read_body()
                update_data = json.loads(body)
                
                todos_data = read_todos_data()
                username = user['username']
                todos = todos_data.get(username, [])
                
                todo_found = False
                for todo in todos:
                    if todo['id'] == todo_id:
                        if 'text' in update_data:
                            todo['text'] = update_data['text']
                        if 'completed' in update_data:
                            todo['completed'] = update_data['completed']
                        todo['updatedAt'] = int(time.time() * 1000)
                        todo_found = True
                        break
                
                if todo_found:
                    todos_data[username] = todos
                    write_todos_data(todos_data)
                    
                    self._set_headers(200)
                    self.wfile.write(json.dumps(todo, ensure_ascii=False).encode('utf-8'))
                else:
                    self._set_headers(404)
                    self.wfile.write(json.dumps({'error': '找不到待办事项'}, ensure_ascii=False).encode('utf-8'))
            except (json.JSONDecodeError, ValueError):
                self._set_headers(400)
                self.wfile.write(json.dumps({'error': '无效的请求数据'}, ensure_ascii=False).encode('utf-8'))
        else:
            self.serve_static_file()

    # 处理DELETE请求
    def do_DELETE(self):
        # 验证用户
        user = self._verify_auth()
        if not user:
            return
        
        if self.path.startswith('/api/todos/'):
            todo_id = int(self.path.split('/')[-1])
            todos_data = read_todos_data()
            username = user['username']
            todos = todos_data.get(username, [])
            
            filtered_todos = [todo for todo in todos if todo['id'] != todo_id]
            
            if len(filtered_todos) != len(todos):
                todos_data[username] = filtered_todos
                write_todos_data(todos_data)
                
                self._set_headers(200)
                self.wfile.write(json.dumps({'message': '已删除待办事项'}, ensure_ascii=False).encode('utf-8'))
            else:
                self._set_headers(404)
                self.wfile.write(json.dumps({'error': '找不到待办事项'}, ensure_ascii=False).encode('utf-8'))
        elif self.path == '/api/todos/clear-completed':
            todos_data = read_todos_data()
            username = user['username']
            todos = todos_data.get(username, [])
            
            active_todos = [todo for todo in todos if not todo['completed']]
            todos_data[username] = active_todos
            write_todos_data(todos_data)
            
            self._set_headers(200)
            self.wfile.write(json.dumps({'message': '已清除所有已完成的待办事项'}, ensure_ascii=False).encode('utf-8'))
        else:
            self.serve_static_file()

    # 提供静态文件
    def serve_static_file(self):
        # 获取文件路径
        if self.path == '/':
            file_path = os.path.join(script_dir, 'index.html')
        else:
            file_path = os.path.join(script_dir, self.path.lstrip('/'))
        
        # 确保文件在当前目录下
        if not os.path.abspath(file_path).startswith(script_dir):
            self._set_headers(403)
            self.wfile.write(b'Forbidden')
            return
        
        # 尝试读取并发送文件
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
                
                # 设置内容类型
                if file_path.endswith('.html'):
                    content_type = 'text/html'
                elif file_path.endswith('.css'):
                    content_type = 'text/css'
                elif file_path.endswith('.js'):
                    content_type = 'application/javascript'
                else:
                    content_type = 'application/octet-stream'
                
                self._set_headers(200, content_type)
                self.wfile.write(content)
        except FileNotFoundError:
            self._set_headers(404)
            self.wfile.write(b'文件不存在')
        except Exception as e:
            print(f"服务器错误: {e}")
            self._set_headers(500)
            self.wfile.write(b'服务器错误')

# 创建并启动服务器
def run_server():
    # 确保数据文件目录存在
    os.makedirs(script_dir, exist_ok=True)
    
    # 配置服务器，避免地址重用问题
    socketserver.TCPServer.allow_reuse_address = True
    
    with socketserver.TCPServer("", PORT) as httpd:
        print(f"Python服务器已启动，访问 http://localhost:{PORT}")
        print(f"服务器支持UTF-8编码，中文显示正常")
        print(f"支持用户认证功能：注册、登录、登出")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n服务已停止")
            httpd.server_close()

if __name__ == "__main__":
    run_server()