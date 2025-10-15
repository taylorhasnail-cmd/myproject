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
        console.log(`读取待办事项数据，文件路径: ${DATA_FILE}`);
        
        // 确保目录存在
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            console.log(`创建目录: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 如果文件不存在，创建空文件
        if (!fs.existsSync(DATA_FILE)) {
            console.log(`文件不存在，创建空文件: ${DATA_FILE}`);
            fs.writeFileSync(DATA_FILE, '{}');
            return {};
        }
        
        // 读取文件内容
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        console.log(`成功读取文件，内容长度: ${data.length}`);
        
        // 尝试解析JSON
        const parsedData = JSON.parse(data);
        console.log(`成功解析JSON，包含 ${Object.keys(parsedData).length} 个用户的待办事项`);
        return parsedData;
    } catch (error) {
        console.error('读取待办事项数据失败:', error);
        // 如果解析失败，返回空对象
        return {};
    }
}

// 写入待办事项数据文件
function writeTodosData(data) {
    try {
        console.log(`写入待办事项数据，包含 ${Object.keys(data).length} 个用户的待办事项`);
        
        // 确保目录存在
        const dir = path.dirname(DATA_FILE);
        if (!fs.existsSync(dir)) {
            console.log(`创建目录: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }
        
        // 格式化JSON数据，便于调试
        const jsonData = JSON.stringify(data, null, 2);
        console.log(`准备写入数据，长度: ${jsonData.length}`);
        
        // 写入文件
        fs.writeFileSync(DATA_FILE, jsonData, 'utf8');
        console.log(`待办事项数据写入成功，文件路径: ${DATA_FILE}`);
        
        // 验证写入是否成功
        try {
            const writtenData = fs.readFileSync(DATA_FILE, 'utf8');
            const parsedData = JSON.parse(writtenData);
            console.log(`验证写入成功，读取到 ${Object.keys(parsedData).length} 个用户的待办事项`);
        } catch (verifyError) {
            console.error('验证写入失败:', verifyError);
        }
    } catch (error) {
        console.error('写入待办事项数据失败:', error);
        // 记录详细的错误信息，包括堆栈
        console.error('错误堆栈:', error.stack);
        // 不抛出错误，避免应用崩溃
    }
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
            console.log(`找到用户会话: ${username}`);
            return users[username];
        }
    }
    console.log(`未找到对应的用户会话，token: ${token}`);
    return null;
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    console.log('========================================');
    console.log(`[${new Date().toISOString()}] 接收到请求`);
    console.log('请求方法:', req.method);
    console.log('请求URL:', req.url);
    console.log('请求头信息:', JSON.stringify(req.headers, null, 2));
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
            console.log('================================');
            console.log('接收到GET /api/todos请求');
            console.log('请求方法:', req.method);
            console.log('请求URL:', req.url);
            console.log('请求头信息:', JSON.stringify(req.headers, null, 2));
            
            try {
                // 打印用户会话信息
                console.log('用户会话信息:', JSON.stringify(user, null, 2));
                
                // 尝试多种键格式，确保能找到数据
                const possibleKeys = [
                    String(user.id),
                    user.username,
                    '1', // 硬编码检查键'1'
                    user.id && user.id.toString(),
                    user.username && user.username.toString()
                ].filter(Boolean);
                
                console.log('尝试的用户键列表:', possibleKeys);
                
                // 读取待办事项数据
                console.log('准备读取待办事项数据');
                const todosData = readTodosData();
                console.log('待办事项数据键列表:', Object.keys(todosData));
                console.log('待办事项数据完整内容:', JSON.stringify(todosData, null, 2));
                
                // 尝试所有可能的键
                let userTodos = [];
                let foundKey = null;
                
                for (const key of possibleKeys) {
                    if (todosData.hasOwnProperty(key)) {
                        userTodos = todosData[key];
                        foundKey = key;
                        console.log(`找到用户数据，键: ${key}, 待办事项数量: ${userTodos.length}`);
                        break;
                    }
                }
                
                if (!foundKey) {
                    console.warn(`未找到用户数据，为用户创建空数组，键: ${possibleKeys.join(', ')}`);
                    // 为用户创建空的待办事项数组
                    userTodos = [];
                    // 确保用户的待办事项数组存在于数据中
                    const primaryKey = String(user.id || user.username);
                    if (!todosData[primaryKey]) {
                        todosData[primaryKey] = [];
                        writeTodosData(todosData);
                    }
                }
                
                // 返回用户待办事项
                console.log(`准备返回用户待办事项，使用键: ${foundKey || '未知'}`);
                console.log(`返回的待办事项数量: ${userTodos.length}`);
                console.log(`待办事项数据示例: ${JSON.stringify(userTodos.slice(0, 2))}`);
                
                // 添加安全头信息
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.setHeader('Cache-Control', 'no-store');
                res.setHeader('Pragma', 'no-cache');
                
                res.writeHead(200);
                const responseData = JSON.stringify(userTodos);
                console.log(`返回数据长度: ${responseData.length}`);
                res.end(responseData);
                
                console.log('GET /api/todos请求处理完成');
                console.log('================================');
            } catch (error) {
                console.error('获取待办事项失败:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
            }
            return;
        }
        
        // 添加新的待办事项
        if (req.url === '/api/todos' && req.method === 'POST') {
            // 使用用户ID作为键，而非用户名
            const userId = user.id || user.username; // 兼容处理
            console.log(`收到添加待办事项请求，用户ID: ${userId}(${user.username})`);
            
            let body = '';
            req.on('data', (chunk) => {
                body += chunk;
            });
            
            req.on('end', () => {
                try {
                    console.log('开始处理添加待办事项请求');
                    console.log('请求体原始数据:', body);
                    
                    // 验证请求体是否为空
                    if (!body || body.trim() === '') {
                        throw new Error('请求体为空');
                    }
                    
                    const todoData = JSON.parse(body);
                    console.log('解析的待办事项数据:', todoData);
                    
                    // 验证请求数据
                    if (!todoData.text || typeof todoData.text !== 'string' || todoData.text.trim() === '') {
                        console.warn('无效的待办事项文本');
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '待办事项文本不能为空' }));
                        return;
                    }
                    
                    // 创建新待办事项
                    const newTodo = {
                        id: Date.now(),
                        text: todoData.text.trim(),
                        completed: todoData.completed || false,
                        createdAt: Date.now(),
                        updatedAt: Date.now()
                    };
                    
                    // 读取现有待办事项
                    console.log('准备读取待办事项数据');
                    const todosData = readTodosData();
                    console.log('待办事项数据读取成功');
                    
                    // 确保用户的待办事项数组存在
                    if (!todosData[userId]) {
                        todosData[userId] = [];
                        console.log(`为用户 ${userId}(${user.username}) 创建新的待办事项数组`);
                    }
                    
                    // 添加新待办事项
                    todosData[userId].push(newTodo);
                    
                    // 保存更新后的数据
                    console.log('准备保存待办事项数据');
                    writeTodosData(todosData);
                    console.log(`成功添加待办事项，用户ID: ${userId}(${user.username})，ID: ${newTodo.id}`);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(newTodo));
                    
                } catch (error) {
                    console.error('处理待办事项请求时出错:', error);
                    console.error('错误堆栈:', error.stack);
                    
                    if (error instanceof SyntaxError) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '无效的JSON格式', details: error.message }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
                    }
                }
            });
            return;
        }
        
        // 更新待办事项
        const updateMatch = req.url.match(/^\/api\/todos\/(\d+)$/);
        if (updateMatch && req.method === 'PUT') {
            // 使用用户ID作为键，确保数据隔离
            const userId = String(user.id || user.username); // 规范化为字符串
            
            const todoId = parseInt(updateMatch[1]);
            console.log(`收到更新待办事项请求，用户ID: ${userId}(${user.username})，ID: ${todoId}`);
            
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            
            req.on('end', () => {
                try {
                    const todoData = JSON.parse(body);
                    // 确保用户的待办事项数组存在
                    if (!todosData[userId]) {
                        todosData[userId] = [];
                    }
                    console.log('解析更新数据成功:', todoData);
                    
                    // 读取待办事项数据
                    const todosData = readTodosData();
                    
                    // 检查用户待办事项数组是否存在
                    if (!todosData[userId]) {
                        console.log(`用户 ${userId}(${user.username}) 没有待办事项数据`);
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '用户没有待办事项' }));
                        return;
                    }
                    
                    // 查找待办事项
                    const todoIndex = todosData[userId].findIndex(todo => todo.id === todoId);
                    if (todoIndex === -1) {
                        console.log(`待办事项 ${todoId} 不存在`);
                        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '待办事项不存在' }));
                        return;
                    }
                    
                    // 更新待办事项
                    todosData[userId][todoIndex] = {
                        ...todosData[userId][todoIndex],
                        text: todoData.text !== undefined ? todoData.text.trim() : todosData[userId][todoIndex].text,
                        completed: todoData.completed !== undefined ? todoData.completed : todosData[userId][todoIndex].completed,
                        updatedAt: Date.now()
                    };
                    
                    // 保存更新后的数据
                    writeTodosData(todosData);
                    
                    console.log(`待办事项更新成功，用户ID: ${userId}(${user.username})，ID: ${todoId}`);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(todosData[userId][todoIndex]));
                    
                } catch (error) {
                    console.error('更新待办事项时出错:', error);
                    
                    if (error instanceof SyntaxError) {
                        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '无效的JSON格式', details: error.message }));
                    } else {
                        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
                    }
                }
            });
            return;
        }
        
        // 删除待办事项
        if (req.url.startsWith('/api/todos/') && req.method === 'DELETE') {
            const deleteMatch = req.url.match(/\/api\/todos\/(\d+)/);
            const todoId = deleteMatch ? parseInt(deleteMatch[1]) : null;
            
            // 使用用户ID作为键，确保数据隔离
            const userId = String(user.id || user.username); // 规范化为字符串
            console.log(`收到删除待办事项请求，用户ID: ${userId}(${user.username})，ID: ${todoId}`);
            
            try {
                console.log('准备读取待办事项数据');
                const todosData = readTodosData();
                // 确保用户的待办事项数组存在
                if (!todosData[userId]) {
                    todosData[userId] = [];
                }
                
                // 检查用户待办事项数组是否存在
                if (!todosData[userId]) {
                    console.log(`用户 ${userId}(${user.username}) 没有待办事项数据`);
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '用户没有待办事项' }));
                    return;
                }
                
                // 过滤出要保留的待办事项
                const updatedTodos = todosData[userId].filter(todo => todo.id !== todoId);
                
                // 如果过滤后数量没有变化，说明待办事项不存在
                if (updatedTodos.length === todosData[userId].length) {
                    console.log(`待办事项 ${todoId} 不存在`);
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ error: '待办事项不存在' }));
                    return;
                }
                
                // 更新待办事项数组
                todosData[userId] = updatedTodos;
                
                // 保存更新后的数据
                writeTodosData(todosData);
                
                console.log(`待办事项删除成功，用户ID: ${userId}(${user.username})，ID: ${todoId}`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: '待办事项删除成功' }));
                
            } catch (error) {
                console.error('删除待办事项时出错:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
            }
            return;
        }
        
        // 清除已完成的待办事项
        if (req.url === '/api/todos/clear-completed' && req.method === 'DELETE') {
            // 使用用户ID作为键，确保数据隔离
            const userId = String(user.id || user.username); // 规范化为字符串
            console.log(`收到清除已完成待办事项请求，用户ID: ${userId}(${user.username})`);
            
            try {
                const todosData = readTodosData();
                // 确保用户的待办事项数组存在
                if (!todosData[userId]) {
                    todosData[userId] = [];
                }
                
                // 检查用户待办事项数组是否存在
                if (!todosData[userId]) {
                    console.log(`用户 ${userId}(${user.username}) 没有待办事项数据，创建空数组`);
                    todosData[userId] = [];
                    writeTodosData(todosData);
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ message: '已清除已完成的待办事项', clearedCount: 0 }));
                    return;
                }
                
                // 记录清除前的数量
                const beforeCount = todosData[userId].length;
                
                // 过滤出未完成的待办事项
                const updatedTodos = todosData[userId].filter(todo => !todo.completed);
                
                // 计算清除的数量
                const clearedCount = beforeCount - updatedTodos.length;
                
                // 更新待办事项数组
                todosData[userId] = updatedTodos;
                
                // 保存更新后的数据
                writeTodosData(todosData);
                
                console.log(`已清除已完成的待办事项，用户ID: ${userId}(${user.username})，清除数量: ${clearedCount}`);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: '已清除已完成的待办事项', clearedCount }));
                
            } catch (error) {
                console.error('清除已完成待办事项时出错:', error);
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ error: '服务器错误', details: error.message }));
            }
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