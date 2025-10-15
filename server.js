const http = require('http');
const fs = require('fs');
const path = require('path');

// 设置端口号
const PORT = 8000;

// 获取当前脚本所在目录
const scriptDir = __dirname;

// 数据文件路径
const DATA_FILE = path.join(scriptDir, 'todos-data.json');
const USERS_FILE = path.join(scriptDir, 'users-data.json');

// 简单的密码哈希函数（实际应用中应使用更安全的哈希算法）
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// 生成简单的会话令牌
function generateToken() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 读取待办事项数据文件
function readTodosData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或无法读取，返回空对象
        return {};
    }
}

// 写入待办事项数据文件
function writeTodosData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 读取用户数据文件
function readUsersData() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或无法读取，返回空对象
        return {};
    }
}

// 写入用户数据文件
function writeUsersData(data) {
    try {
        console.log(`尝试写入用户数据到: ${USERS_FILE}`);
        // 确保目录存在
        const dir = path.dirname(USERS_FILE);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log('用户数据写入成功');
    } catch (error) {
        console.error('写入用户数据失败:', error);
        throw error;
    }
}

// 验证用户凭据
function authenticateUser(username, password) {
    const users = readUsersData();
    const user = users[username];
    if (user && user.password === hashPassword(password)) {
        return user;
    }
    return null;
}

// 获取用户会话信息
function getSession(token) {
    const users = readUsersData();
    for (const username in users) {
        if (users[username].token === token) {
            return users[username];
        }
    }
    return null;
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 处理API请求
    if (req.url.startsWith('/api/auth')) {
        // 允许跨域
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // 注册新用户
            if (req.url === '/api/auth/register' && req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => {
                    body += chunk;
                });
                req.on('end', () => {
                    try {
                        console.log('开始处理注册请求');
                        console.log('请求体原始数据:', body);
                        
                        // 验证请求体是否为空
                        if (!body || body.trim() === '') {
                            throw new Error('请求体为空');
                        }
                        
                        const userData = JSON.parse(body);
                        console.log('解析的用户数据:', userData);
                        
                        // 验证必要字段
                        if (!userData.username || !userData.password) {
                            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ error: '用户名和密码不能为空' }));
                            return;
                        }
                        
                        // 读取用户数据
                        console.log('准备读取用户数据');
                        const users = readUsersData();
                        console.log('用户数据读取成功，现有用户数量:', Object.keys(users).length);
                        
                        if (users[userData.username]) {
                            res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                            res.end(JSON.stringify({ error: '用户名已存在' }));
                            return;
                        }
                        
                        const newUser = {
                            username: userData.username,
                            password: hashPassword(userData.password),
                            token: null,
                            createdAt: Date.now()
                        };
                        
                        users[userData.username] = newUser;
                        console.log('准备保存用户数据');
                        writeUsersData(users);
                        console.log('用户数据保存成功');
                        
                        // 为新用户创建空的待办事项列表
                        console.log('准备为新用户创建待办事项列表');
                        const todosData = readTodosData();
                        todosData[userData.username] = [];
                        writeTodosData(todosData);
                        console.log('待办事项列表创建成功');
                        
                        res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ message: '注册成功' }));
                    } catch (error) {
                        console.error('注册时发生错误:', error);
                        console.error('错误堆栈:', error.stack);
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
                    }
                });
                return;
            }
        
        // 用户登录
        if (req.url === '/api/auth/login' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                try {
                    const loginData = JSON.parse(body);
                    const user = authenticateUser(loginData.username, loginData.password);
                    
                    if (user) {
                        // 生成新的会话令牌
                        const token = generateToken();
                        const users = readUsersData();
                        users[user.username].token = token;
                        writeUsersData(users);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ token, username: user.username }));
                    } else {
                        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '用户名或密码错误' }));
                    }
                } catch (error) {
                    console.error('注册时发生错误:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
                }
            });
            return;
        }
        
        // 用户登出
        if (req.url === '/api/auth/logout' && req.method === 'POST') {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                const user = getSession(token);
                if (user) {
                    const users = readUsersData();
                    users[user.username].token = null;
                    writeUsersData(users);
                }
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ message: '登出成功' }));
            return;
        }
        
        // 验证会话
        if (req.url === '/api/auth/verify' && req.method === 'GET') {
            const token = req.headers.authorization?.replace('Bearer ', '');
            if (token) {
                const user = getSession(token);
                if (user) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ username: user.username }));
                    return;
                }
            }
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '未授权' }));
            return;
        }
    } else if (req.url.startsWith('/api/todos')) {
        // 允许跨域
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // 验证用户会话
        const token = req.headers.authorization?.replace('Bearer ', '');
        const user = getSession(token);
        if (!user) {
            res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ error: '未授权' }));
            return;
        }
        
        // 获取当前用户的所有待办事项
        if (req.url === '/api/todos' && req.method === 'GET') {
            const todosData = readTodosData();
            const userTodos = todosData[user.username] || [];
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(userTodos));
            return;
        }
        
        // 添加待办事项
        if (req.url === '/api/todos' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                try {
                    const todo = JSON.parse(body);
                    const todosData = readTodosData();
                    if (!todosData[user.username]) {
                        todosData[user.username] = [];
                    }
                    todo.id = Date.now();
                    todo.completed = todo.completed || false;
                    todo.createdAt = Date.now();
                    todo.updatedAt = Date.now();
                    todosData[user.username].push(todo);
                    writeTodosData(todosData);
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(todo));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '无效的JSON数据' }));
                }
            });
            return;
        }
        
        // 更新待办事项
        const updateMatch = req.url.match(/^\/api\/todos\/(\d+)$/);
        if (updateMatch && req.method === 'PUT') {
            const todoId = parseInt(updateMatch[1]);
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            req.on('end', () => {
                try {
                    const updateData = JSON.parse(body);
                    const todosData = readTodosData();
                    const userTodos = todosData[user.username] || [];
                    const todoIndex = userTodos.findIndex(t => t.id === todoId);
                    
                    if (todoIndex !== -1) {
                        if (updateData.text !== undefined) {
                            userTodos[todoIndex].text = updateData.text;
                        }
                        if (updateData.completed !== undefined) {
                            userTodos[todoIndex].completed = updateData.completed;
                        }
                        userTodos[todoIndex].updatedAt = Date.now();
                        todosData[user.username] = userTodos;
                        writeTodosData(todosData);
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(userTodos[todoIndex]));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '找不到待办事项' }));
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '无效的JSON数据' }));
                }
            });
            return;
        }
        
        // 删除待办事项
        const deleteMatch = req.url.match(/^\/api\/todos\/(\d+)$/);
        if (deleteMatch && req.method === 'DELETE') {
            const todoId = parseInt(deleteMatch[1]);
            const todosData = readTodosData();
            const userTodos = todosData[user.username] || [];
            const filteredTodos = userTodos.filter(t => t.id !== todoId);
            
            if (filteredTodos.length !== userTodos.length) {
                todosData[user.username] = filteredTodos;
                writeTodosData(todosData);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: '已删除待办事项' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '找不到待办事项' }));
            }
            return;
        }
        
        // 清除已完成的待办事项
        if (req.url === '/api/todos/clear-completed' && req.method === 'DELETE') {
            const todosData = readTodosData();
            const userTodos = todosData[user.username] || [];
            const activeTodos = userTodos.filter(t => !t.completed);
            todosData[user.username] = activeTodos;
            writeTodosData(todosData);
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ message: '已清除所有已完成的待办事项' }));
            return;
        }
    }
    // 确定请求的文件路径
    let filePath = path.join(scriptDir, req.url === '/' ? 'index.html' : req.url);
    
    // 获取文件扩展名
    const extname = String(path.extname(filePath)).toLowerCase();
    
    // 设置内容类型映射，添加charset=utf-8
    const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8'
    };
    
    // 确定内容类型
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // 读取并发送文件 - 指定utf8编码
    fs.readFile(filePath, 'utf8', (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在，返回404错误
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('文件不存在');
            } else {
                // 服务器错误
                res.writeHead(500);
                res.end('服务器错误');
            }
        } else {
            // 成功读取文件
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Content-Length': Buffer.byteLength(content, 'utf8')
            });
            res.end(content);
        }
    });
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`服务器已启动，访问 http://localhost:${PORT}`);
    console.log(`服务器支持UTF-8编码，中文显示正常`);
});