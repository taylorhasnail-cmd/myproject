# 待办事项应用数据持久化指南

本指南将详细介绍如何为待办事项应用实现不同的数据持久化方案。当前应用使用浏览器的localStorage进行数据存储，但这种方式有一定的局限性（如数据仅存储在用户本地浏览器中，无法跨设备同步）。

## 当前实现分析

目前，应用通过以下函数实现数据持久化：

```javascript
// 保存待办事项到本地存储
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 从本地存储加载待办事项
function loadTodos() {
    const savedTodos = localStorage.getItem('todos');
    if (savedTodos) {
        try {
            todos = JSON.parse(savedTodos);
        } catch (e) {
            console.error('Failed to parse saved todos:', e);
            todos = [];
        }
    }
}
```

这种实现的局限性：

1. 数据仅保存在当前用户的浏览器中
2. 无法在不同设备间同步数据
3. 清除浏览器数据会导致待办事项丢失
4. 存储容量有限（通常为5-10MB）

## 方案一：使用Node.js后端+MongoDB

### 前提条件

- 已部署Node.js环境
- 已安装MongoDB数据库

### 步骤1：创建Node.js后端服务器

创建一个名为`backend.js`的文件：

```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 连接MongoDB数据库
mongoose.connect('mongodb://localhost:27017/todo-app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// 定义待办事项模型
const TodoSchema = new mongoose.Schema({
    text: String,
    completed: Boolean,
    createdAt: { type: Date, default: Date.now }
});

const Todo = mongoose.model('Todo', TodoSchema);

// API路由

// 获取所有待办事项
app.get('/api/todos', async (req, res) => {
    try {
        const todos = await Todo.find();
        res.json(todos);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 添加新的待办事项
app.post('/api/todos', async (req, res) => {
    const todo = new Todo({
        text: req.body.text,
        completed: req.body.completed || false
    });

    try {
        const newTodo = await todo.save();
        res.status(201).json(newTodo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 更新待办事项
app.put('/api/todos/:id', async (req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (todo == null) {
            return res.status(404).json({ message: '找不到待办事项' });
        }

        if (req.body.text != null) {
            todo.text = req.body.text;
        }
        if (req.body.completed != null) {
            todo.completed = req.body.completed;
        }

        const updatedTodo = await todo.save();
        res.json(updatedTodo);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// 删除待办事项
app.delete('/api/todos/:id', async (req, res) => {
    try {
        const todo = await Todo.findByIdAndDelete(req.params.id);
        if (todo == null) {
            return res.status(404).json({ message: '找不到待办事项' });
        }
        res.json({ message: '已删除待办事项' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 清除已完成的待办事项
app.delete('/api/todos/clear-completed', async (req, res) => {
    try {
        await Todo.deleteMany({ completed: true });
        res.json({ message: '已清除所有已完成的待办事项' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`后端服务器已启动，访问 http://localhost:${PORT}`);
});
```

### 步骤2：安装必要的依赖

```bash
npm init -y
npm install express mongoose cors
```

### 步骤3：修改前端代码以使用后端API

创建一个新的文件`app-with-server.js`，修改数据存取相关函数：

```javascript
// 替换原有的saveTodos和loadTodos函数

// 从服务器加载待办事项
async function loadTodos() {
    try {
        const response = await fetch('http://localhost:3001/api/todos');
        todos = await response.json();
        renderTodos();
        updateTaskCount();
    } catch (error) {
        console.error('Failed to load todos from server:', error);
        // 降级到本地存储
        const savedTodos = localStorage.getItem('todos');
        todos = savedTodos ? JSON.parse(savedTodos) : [];
    }
}

// 保存待办事项到服务器
async function saveTodos() {
    try {
        // 这里不再需要保存所有todos，而是在每个操作后单独调用API
        // 保留localStorage备份
        localStorage.setItem('todos', JSON.stringify(todos));
    } catch (error) {
        console.error('Failed to save todos to localStorage:', error);
    }
}

// 修改添加待办事项函数
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text !== '') {
        try {
            const response = await fetch('http://localhost:3001/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, completed: false })
            });
            const newTodo = await response.json();
            todos.push(newTodo);
            saveTodos(); // 保存到localStorage备份
            renderTodos();
            updateTaskCount();
            todoInput.value = '';
        } catch (error) {
            console.error('Failed to add todo to server:', error);
            // 降级处理
            const newTodo = {
                id: Date.now(),
                text: text,
                completed: false
            };
            todos.push(newTodo);
            saveTodos();
            renderTodos();
            updateTaskCount();
            todoInput.value = '';
        }
    }
}

// 类似地修改toggleTodo、deleteTodo和clearCompletedTodos函数
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompletedState = !todo.completed;
        
        try {
            await fetch(`http://localhost:3001/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: newCompletedState })
            });
            todo.completed = newCompletedState;
            saveTodos();
            renderTodos();
            updateTaskCount();
        } catch (error) {
            console.error('Failed to toggle todo on server:', error);
            // 降级处理
            todo.completed = newCompletedState;
            saveTodos();
            renderTodos();
            updateTaskCount();
        }
    }
}

// 其他函数（deleteTodo、clearCompletedTodos）也需要类似修改
```

### 步骤4：启动后端服务器

```bash
node backend.js
```

## 方案二：使用Firebase云数据库

Firebase提供了简单易用的云数据库解决方案，适合快速开发。

### 步骤1：创建Firebase项目

1. 访问[Firebase控制台](https://console.firebase.google.com/)
2. 创建一个新项目
3. 在"项目设置"中获取配置信息

### 步骤2：在前端代码中集成Firebase

修改`index.html`，添加Firebase SDK：

```html
<!-- 在</head>标签前添加 -->
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js"></script>
```

### 步骤3：修改app.js文件以使用Firebase

```javascript
// 在文件顶部添加Firebase配置
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    databaseURL: "YOUR_DATABASE_URL",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// 初始化Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const todosRef = database.ref('todos');

// 修改loadTodos函数以从Firebase加载数据
function loadTodos() {
    todosRef.on('value', (snapshot) => {
        const data = snapshot.val();
        todos = data ? Object.values(data) : [];
        renderTodos();
        updateTaskCount();
    }, (error) => {
        console.error('Failed to load todos from Firebase:', error);
        // 降级到本地存储
        const savedTodos = localStorage.getItem('todos');
        todos = savedTodos ? JSON.parse(savedTodos) : [];
        renderTodos();
        updateTaskCount();
    });
}

// 修改addTodo函数
function addTodo() {
    const text = todoInput.value.trim();
    
    if (text !== '') {
        const newTodo = {
            text: text,
            completed: false,
            createdAt: Date.now()
        };
        
        // 添加到Firebase
        const newTodoRef = todosRef.push();
        newTodoRef.set(newTodo)
            .then(() => {
                todoInput.value = '';
            })
            .catch((error) => {
                console.error('Failed to add todo to Firebase:', error);
                // 降级处理
                newTodo.id = Date.now();
                todos.push(newTodo);
                saveTodos();
                renderTodos();
                updateTaskCount();
                todoInput.value = '';
            });
    }
}

// 类似地修改toggleTodo、deleteTodo和clearCompletedTodos函数
```

## 方案三：使用本地文件存储（简单方案）

如果您不想设置数据库，可以使用Node.js的文件系统模块来存储待办事项数据。

### 修改server.js文件

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');

// 设置端口号
const PORT = 8000;
const DATA_FILE = path.join(__dirname, 'data.json');

// 读取数据文件
function readData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // 如果文件不存在或无法读取，返回空数组
        return [];
    }
}

// 写入数据文件
function writeData(data) {
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
            const todos = readData();
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
                    const todos = readData();
                    todo.id = Date.now();
                    todo.completed = todo.completed || false;
                    todo.createdAt = Date.now();
                    todos.push(todo);
                    writeData(todos);
                    res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify(todo));
                } catch (error) {
                    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
                    res.end('无效的JSON数据');
                }
            });
            return;
        }
        
        // 处理其他API请求（更新、删除等）
        // ...
    }
    
    // 原有的静态文件服务逻辑
    let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
    // ...
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`服务器已启动，访问 http://localhost:${PORT}`);
    console.log(`服务器支持UTF-8编码，中文显示正常`);
});
```

## 数据同步与冲突处理

在实现服务器端数据持久化后，需要考虑数据同步和冲突处理问题：

1. **乐观锁**：为每个待办事项添加版本号或时间戳，在更新时验证
2. **离线支持**：使用Service Worker和IndexedDB缓存数据，在网络恢复后同步
3. **冲突解决策略**：制定规则处理数据冲突（如"最后修改优先"或"手动解决"）

## 安全性考虑

1. 如果实现用户系统，确保对API请求进行身份验证和授权
2. 对用户输入进行验证和清洗，防止XSS和SQL注入攻击
3. 考虑添加HTTPS加密保护数据传输
4. 定期备份数据库

## 如何选择合适的方案

- **方案一（Node.js+MongoDB）**：适合需要完全控制数据和服务器的场景
- **方案二（Firebase）**：适合快速开发，不想管理服务器的场景
- **方案三（本地文件存储）**：适合简单应用或个人使用的场景

根据您的具体需求和技术栈选择合适的方案实施数据持久化。