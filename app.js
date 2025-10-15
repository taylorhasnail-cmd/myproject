// DOM 元素引用
// 认证相关元素
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const userInfo = document.getElementById('user-info');
const usernameElement = document.getElementById('username');
const logoutButton = document.getElementById('logout-button');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginButton = document.getElementById('login-button');
const loginError = document.getElementById('login-error');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');
const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
const registerButton = document.getElementById('register-button');
const registerError = document.getElementById('register-error');

// 待办事项相关元素
const todoApp = document.getElementById('todo-app');
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const todoList = document.getElementById('todo-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.getElementById('clear-completed');
const taskCountElement = document.getElementById('task-count');

// 全局状态
let todos = [];
let currentFilter = 'active';
let currentUser = null;
let authToken = null;

// 添加认证相关事件监听器
function addAuthEventListeners() {
    // 切换到注册表单
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('register');
    });
    
    // 切换到登录表单
    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('login');
    });
    
    // 登录按钮点击事件
    loginButton.addEventListener('click', login);
    
    // 注册按钮点击事件
    registerButton.addEventListener('click', register);
    
    // 登出按钮点击事件
    logoutButton.addEventListener('click', logout);
    
    // 输入框回车事件
    loginUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loginPasswordInput.focus();
    });
    
    loginPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    registerUsernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerPasswordInput.focus();
    });
    
    registerPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') registerConfirmPasswordInput.focus();
    });
    
    registerConfirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') register();
    });
}

// 切换表单显示
function switchForm(formType) {
    // 清除错误信息
    loginError.textContent = '';
    registerError.textContent = '';
    
    if (formType === 'login') {
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
}

// 检查认证状态
async function checkAuthStatus() {
    const savedToken = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    
    if (savedToken && savedUsername) {
        try {
            // 验证令牌是否有效
            const response = await fetch('/api/auth/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${savedToken}`
                }
            });
            
            if (response.ok) {
                authToken = savedToken;
                currentUser = savedUsername;
                showTodoApp();
                return true;
            }
        } catch (error) {
            console.error('验证会话失败:', error);
        }
    }
    
    // 未登录状态
    showAuthForms();
    return false;
}

// 显示认证表单
function showAuthForms() {
    authContainer.style.display = 'block';
    todoApp.style.display = 'none';
    userInfo.style.display = 'none';
}

// 显示待办事项应用
function showTodoApp() {
    authContainer.style.display = 'none';
    todoApp.style.display = 'block';
    userInfo.style.display = 'block';
    usernameElement.textContent = currentUser;
    
    // 加载用户的待办事项
    loadTodos();
}

// 用户登录
async function login() {
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value.trim();
    
    if (!username || !password) {
        loginError.textContent = '请输入用户名和密码';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 保存认证信息
            authToken = data.token;
            currentUser = data.username;
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('username', currentUser);
            
            // 清空表单
            loginUsernameInput.value = '';
            loginPasswordInput.value = '';
            loginError.textContent = '';
            
            // 显示待办事项应用
            showTodoApp();
        } else {
            loginError.textContent = data.error || '登录失败';
        }
    } catch (error) {
        console.error('登录失败:', error);
        loginError.textContent = '服务器错误，请稍后重试';
    }
}

// 用户注册
async function register() {
    const username = registerUsernameInput.value.trim();
    const password = registerPasswordInput.value.trim();
    const confirmPassword = registerConfirmPasswordInput.value.trim();
    
    // 验证输入
    if (!username || !password || !confirmPassword) {
        registerError.textContent = '请填写所有字段';
        return;
    }
    
    if (password !== confirmPassword) {
        registerError.textContent = '两次输入的密码不一致';
        return;
    }
    
    if (password.length < 6) {
        registerError.textContent = '密码长度至少为6位';
        return;
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 注册成功后切换到登录表单
            registerError.textContent = '';
            registerUsernameInput.value = '';
            registerPasswordInput.value = '';
            registerConfirmPasswordInput.value = '';
            
            switchForm('login');
            loginUsernameInput.value = username;
            loginPasswordInput.focus();
        } else {
            registerError.textContent = data.error || '注册失败';
        }
    } catch (error) {
        console.error('注册失败:', error);
        registerError.textContent = '服务器错误，请稍后重试';
    }
}

// 用户登出
async function logout() {
    try {
        await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    } catch (error) {
        console.error('登出失败:', error);
    } finally {
        // 清除本地认证信息
        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        
        // 清空待办事项
        todos = [];
        renderTodos();
        
        // 显示认证表单
        showAuthForms();
    }
}

// 添加事件监听器
function addEventListeners() {
    // 添加按钮点击事件
    addButton.addEventListener('click', addTodo);
    
    // 输入框回车事件
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTodo();
        }
    });
    
    // 过滤按钮点击事件
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            setFilter(button.dataset.filter);
        });
    });
    
    // 清除已完成按钮点击事件
    clearCompletedButton.addEventListener('click', clearCompletedTodos);
}

// 添加待办事项
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text !== '') {
        try {
            // 尝试添加到服务器
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ text, completed: false })
            });
            
            if (response.status === 401) {
                // 认证失效，需要重新登录
                logout();
                return;
            }
            
            const newTodo = await response.json();
            todos.push(newTodo);
            
            // 保存到本地存储备份（带用户名前缀）
            saveTodosLocally();
            renderTodos();
            updateTaskCount();
            todoInput.value = '';
        } catch (error) {
            console.error('添加待办事项失败:', error);
            // 降级处理：只保存到本地
            const newTodo = {
                id: Date.now(),
                text: text,
                completed: false
            };
            todos.push(newTodo);
            saveTodosLocally();
            renderTodos();
            updateTaskCount();
            todoInput.value = '';
        }
    }
}

// 切换待办事项完成状态
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        const newCompletedState = !todo.completed;
        
        try {
            // 尝试更新服务器
            const response = await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ completed: newCompletedState })
            });
            
            if (response.status === 401) {
                // 认证失效，需要重新登录
                logout();
                return;
            }
            
            // 更新本地数据
            todo.completed = newCompletedState;
            saveTodosLocally();
            renderTodos();
            updateTaskCount();
        } catch (error) {
            console.error('更新待办事项状态失败:', error);
            // 降级处理：只更新本地
            todo.completed = newCompletedState;
            saveTodosLocally();
            renderTodos();
            updateTaskCount();
        }
    }
}

// 删除待办事项
async function deleteTodo(id) {
    try {
        // 尝试从服务器删除
        const response = await fetch(`/api/todos/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            // 认证失效，需要重新登录
            logout();
            return;
        }
        
        // 更新本地数据
        todos = todos.filter(todo => todo.id !== id);
        saveTodosLocally();
        renderTodos();
        updateTaskCount();
    } catch (error) {
        console.error('删除待办事项失败:', error);
        // 降级处理：只更新本地
        todos = todos.filter(todo => todo.id !== id);
        saveTodosLocally();
        renderTodos();
        updateTaskCount();
    }
}

// 设置过滤器
function setFilter(filter) {
    currentFilter = filter;
    
    // 更新过滤按钮样式
    filterButtons.forEach(button => {
        if (button.dataset.filter === filter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    renderTodos();
}

// 清除已完成的待办事项
async function clearCompletedTodos() {
    try {
        // 尝试在服务器上清除
        const response = await fetch('/api/todos/clear-completed', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            // 认证失效，需要重新登录
            logout();
            return;
        }
        
        // 更新本地数据
        todos = todos.filter(todo => !todo.completed);
        saveTodosLocally();
        renderTodos();
        updateTaskCount();
    } catch (error) {
        console.error('清除已完成待办事项失败:', error);
        // 降级处理：只更新本地
        todos = todos.filter(todo => !todo.completed);
        saveTodosLocally();
        renderTodos();
        updateTaskCount();
    }
}

// 渲染待办事项列表
function renderTodos() {
    todoList.innerHTML = '';
    
    // 根据当前过滤器筛选待办事项
    let filteredTodos = todos;
    
    if (currentFilter === 'active') {
        filteredTodos = todos.filter(todo => !todo.completed);
    } else if (currentFilter === 'completed') {
        filteredTodos = todos.filter(todo => todo.completed);
    }
    
    // 渲染筛选后的待办事项
    if (filteredTodos.length === 0) {
        showEmptyState();
    } else {
        filteredTodos.forEach(todo => {
            const todoItem = createTodoElement(todo);
            todoList.appendChild(todoItem);
        });
    }
}

// 创建待办事项元素
function createTodoElement(todo) {
    const li = document.createElement('li');
    li.className = 'todo-item';
    li.setAttribute('data-id', todo.id);
    
    li.innerHTML = `
        <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
        <span class="todo-text ${todo.completed ? 'completed' : ''}">${escapeHTML(todo.text)}</span>
        <button class="delete-btn">×</button>
    `;
    
    // 添加事件监听器
    const checkbox = li.querySelector('.todo-checkbox');
    checkbox.addEventListener('change', () => toggleTodo(todo.id));
    
    const deleteBtn = li.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteTodo(todo.id));
    
    // 双击编辑待办事项
    const todoText = li.querySelector('.todo-text');
    todoText.addEventListener('dblclick', () => enableEditMode(todo.id, todoText));
    
    return li;
}

// 启用编辑模式
async function enableEditMode(id, element) {
    const currentTodo = todos.find(todo => todo.id === id);
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTodo.text;
    input.className = 'edit-input';
    input.style.width = `${element.offsetWidth}px`;
    
    // 替换文本元素为输入框
    element.parentNode.insertBefore(input, element);
    element.style.display = 'none';
    input.focus();
    
    // 处理编辑完成
    async function finishEditing() {
        const newText = input.value.trim();
        if (newText !== '') {
            try {
                // 尝试更新服务器
                const response = await fetch(`/api/todos/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ text: newText })
                });
                
                if (response.status === 401) {
                    // 认证失效，需要重新登录
                    logout();
                    return;
                }
                
                // 更新本地数据
                todos = todos.map(todo => {
                    if (todo.id === id) {
                        return { ...todo, text: newText };
                    }
                    return todo;
                });
                
                saveTodosLocally();
                renderTodos();
            } catch (error) {
                console.error('更新待办事项失败:', error);
                // 降级处理：只更新本地
                todos = todos.map(todo => {
                    if (todo.id === id) {
                        return { ...todo, text: newText };
                    }
                    return todo;
                });
                saveTodosLocally();
                renderTodos();
            }
        } else {
            // 如果文本为空，则删除该待办事项
            deleteTodo(id);
        }
    }
    
    // 回车完成编辑
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            finishEditing();
        }
    });
    
    // 失去焦点完成编辑
    input.addEventListener('blur', finishEditing);
}

// 显示空状态
function showEmptyState() {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    
    let message = '';
    
    if (currentFilter === 'all') {
        message = '还没有待办事项，添加一个吧！';
    } else if (currentFilter === 'active') {
        message = '恭喜你！没有未完成的待办事项。';
    } else if (currentFilter === 'completed') {
        message = '还没有已完成的待办事项。';
    }
    
    emptyState.innerHTML = `<p>${message}</p>`;
    todoList.appendChild(emptyState);
}

// 更新任务计数
function updateTaskCount() {
    const activeCount = todos.filter(todo => !todo.completed).length;
    const plural = activeCount === 1 ? '项' : '项';
    taskCountElement.textContent = `${activeCount} ${plural}待办`;
}

// 注意：saveTodos函数已被重构到各个操作函数中，保留此函数以确保向后兼容
function saveTodos() {
    saveTodosLocally();
}

// 从服务器加载待办事项
async function loadTodos() {
    if (!authToken || !currentUser) return;
    
    try {
        const response = await fetch('/api/todos', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.status === 401) {
            // 认证失效，需要重新登录
            logout();
            return;
        }
        
        const serverTodos = await response.json();
        
        // 如果服务器有数据，使用服务器数据
        if (Array.isArray(serverTodos)) {
            todos = serverTodos;
            // 同时保存到本地存储作为备份
            saveTodosLocally();
        } else {
            // 如果服务器没有数据，尝试从本地存储加载用户特定的数据
            loadTodosLocally();
        }
    } catch (error) {
        console.error('加载待办事项失败:', error);
        // 降级到本地存储
        loadTodosLocally();
    }
    
    // 渲染待办事项并更新计数
    renderTodos();
    updateTaskCount();
}

// 本地保存待办事项（带用户标识）
function saveTodosLocally() {
    if (currentUser) {
        const key = `todos_${currentUser}`;
        localStorage.setItem(key, JSON.stringify(todos));
    }
}

// 本地加载待办事项（带用户标识）
function loadTodosLocally() {
    if (currentUser) {
        const key = `todos_${currentUser}`;
        const savedTodos = localStorage.getItem(key);
        if (savedTodos) {
            try {
                todos = JSON.parse(savedTodos);
            } catch (e) {
                console.error('解析保存的待办事项失败:', e);
                todos = [];
            }
        } else {
            todos = [];
        }
    } else {
        todos = [];
    }
}

// 将本地待办事项同步到服务器
async function syncLocalTodosToServer() {
    if (!authToken || !currentUser) return;
    
    try {
        // 先清空服务器上当前用户的数据
        const existingTodos = await fetch('/api/todos', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        }).then(res => res.json());
        
        for (const todo of existingTodos) {
            await fetch(`/api/todos/${todo.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
        }
        
        // 然后上传本地数据
        for (const todo of todos) {
            await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ text: todo.text, completed: todo.completed })
            });
        }
    } catch (error) {
        console.error('同步本地待办事项到服务器失败:', error);
    }
}

// HTML转义，防止XSS攻击
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 初始化应用
async function initApp() {
    // 添加认证事件监听器
    addAuthEventListeners();
    // 添加待办事项事件监听器
    addEventListeners();
    // 检查认证状态
    await checkAuthStatus();
}

// 在DOM内容加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 初始化应用
    initApp();
    
    // 注册Service Worker，实现PWA功能
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then((registration) => {
                    console.log('Service Worker 注册成功:', registration.scope);
                })
                .catch((error) => {
                    console.log('Service Worker 注册失败:', error);
                });
        });
    }
});