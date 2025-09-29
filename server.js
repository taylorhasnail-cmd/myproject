const http = require('http');
const fs = require('fs');
const path = require('path');

// 设置端口号
const PORT = 8000;

// 获取当前脚本所在目录
const scriptDir = __dirname;

// 数据文件路径
const DATA_FILE = path.join(scriptDir, 'todos-data.json');

// 读取数据文件
function readTodosData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或无法读取，返回空数组
        return [];
    }
}

// 写入数据文件
function writeTodosData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    // 处理API请求
    if (req.url.startsWith('/api/todos')) {
        // 允许跨域
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // 获取所有待办事项
        if (req.url === '/api/todos' && req.method === 'GET') {
            const todos = readTodosData();
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify(todos));
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
                    const todos = readTodosData();
                    todo.id = Date.now();
                    todo.completed = todo.completed || false;
                    todo.createdAt = Date.now();
                    todos.push(todo);
                    writeTodosData(todos);
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(todo));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('无效的JSON数据');
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
                    const todos = readTodosData();
                    const todoIndex = todos.findIndex(t => t.id === todoId);
                    
                    if (todoIndex !== -1) {
                        if (updateData.text !== undefined) {
                            todos[todoIndex].text = updateData.text;
                        }
                        if (updateData.completed !== undefined) {
                            todos[todoIndex].completed = updateData.completed;
                        }
                        todos[todoIndex].updatedAt = Date.now();
                        writeTodosData(todos);
                        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                        res.end(JSON.stringify(todos[todoIndex]));
                    } else {
                        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                        res.end('找不到待办事项');
                    }
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('无效的JSON数据');
                }
            });
            return;
        }
        
        // 删除待办事项
        const deleteMatch = req.url.match(/^\/api\/todos\/(\d+)$/);
        if (deleteMatch && req.method === 'DELETE') {
            const todoId = parseInt(deleteMatch[1]);
            const todos = readTodosData();
            const filteredTodos = todos.filter(t => t.id !== todoId);
            
            if (filteredTodos.length !== todos.length) {
                writeTodosData(filteredTodos);
                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ message: '已删除待办事项' }));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end('找不到待办事项');
            }
            return;
        }
        
        // 清除已完成的待办事项
        if (req.url === '/api/todos/clear-completed' && req.method === 'DELETE') {
            const todos = readTodosData();
            const activeTodos = todos.filter(t => !t.completed);
            writeTodosData(activeTodos);
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