// DOM 元素引用
const todoInput = document.getElementById('todo-input');
const addButton = document.getElementById('add-button');
const todoList = document.getElementById('todo-list');
const filterButtons = document.querySelectorAll('.filter-btn');
const clearCompletedButton = document.getElementById('clear-completed');
const taskCountElement = document.getElementById('task-count');

// 全局状态
let todos = [];
let currentFilter = 'active';

// 初始化应用
async function initApp() {
    // 从服务器加载待办事项
    await loadTodos();
    // 渲染待办事项列表
    renderTodos();
    // 更新任务计数
    updateTaskCount();
    // 添加事件监听器
    addEventListeners();
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
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, completed: false })
            });
            const newTodo = await response.json();
            todos.push(newTodo);
            
            // 保存到本地存储备份
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos();
            updateTaskCount();
            todoInput.value = '';
        } catch (error) {
            console.error('Failed to add todo to server:', error);
            // 降级处理：只保存到本地
            const newTodo = {
                id: Date.now(),
                text: text,
                completed: false
            };
            todos.push(newTodo);
            localStorage.setItem('todos', JSON.stringify(todos));
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
            await fetch(`/api/todos/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ completed: newCompletedState })
            });
            
            // 更新本地数据
            todo.completed = newCompletedState;
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos();
            updateTaskCount();
        } catch (error) {
            console.error('Failed to toggle todo on server:', error);
            // 降级处理：只更新本地
            todo.completed = newCompletedState;
            localStorage.setItem('todos', JSON.stringify(todos));
            renderTodos();
            updateTaskCount();
        }
    }
}

// 删除待办事项
async function deleteTodo(id) {
    try {
        // 尝试从服务器删除
        await fetch(`/api/todos/${id}`, {
            method: 'DELETE'
        });
        
        // 更新本地数据
        todos = todos.filter(todo => todo.id !== id);
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos();
        updateTaskCount();
    } catch (error) {
        console.error('Failed to delete todo from server:', error);
        // 降级处理：只更新本地
        todos = todos.filter(todo => todo.id !== id);
        localStorage.setItem('todos', JSON.stringify(todos));
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
        await fetch('/api/todos/clear-completed', {
            method: 'DELETE'
        });
        
        // 更新本地数据
        todos = todos.filter(todo => !todo.completed);
        localStorage.setItem('todos', JSON.stringify(todos));
        renderTodos();
        updateTaskCount();
    } catch (error) {
        console.error('Failed to clear completed todos on server:', error);
        // 降级处理：只更新本地
        todos = todos.filter(todo => !todo.completed);
        localStorage.setItem('todos', JSON.stringify(todos));
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
function enableEditMode(id, element) {
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
    function finishEditing() {
        const newText = input.value.trim();
        if (newText !== '') {
            todos = todos.map(todo => {
                if (todo.id === id) {
                    return { ...todo, text: newText };
                }
                return todo;
            });
            
            saveTodos();
            renderTodos();
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
    localStorage.setItem('todos', JSON.stringify(todos));
}

// 从服务器加载待办事项
async function loadTodos() {
    try {
        const response = await fetch('/api/todos');
        const serverTodos = await response.json();
        
        // 如果服务器有数据，使用服务器数据
        if (serverTodos && serverTodos.length > 0) {
            todos = serverTodos;
            // 同时保存到本地存储作为备份
            localStorage.setItem('todos', JSON.stringify(todos));
        } else {
            // 如果服务器没有数据，尝试从本地存储加载
            const savedTodos = localStorage.getItem('todos');
            if (savedTodos) {
                try {
                    todos = JSON.parse(savedTodos);
                    // 如果本地有数据，同步到服务器
                    if (todos.length > 0) {
                        await syncLocalTodosToServer();
                    }
                } catch (e) {
                    console.error('Failed to parse saved todos:', e);
                    todos = [];
                }
            }
        }
    } catch (error) {
        console.error('Failed to load todos from server:', error);
        // 降级到本地存储
        const savedTodos = localStorage.getItem('todos');
        todos = savedTodos ? JSON.parse(savedTodos) : [];
    }
}

// 将本地待办事项同步到服务器
async function syncLocalTodosToServer() {
    try {
        // 先清空服务器上的数据
        const existingTodos = await fetch('/api/todos').then(res => res.json());
        for (const todo of existingTodos) {
            await fetch(`/api/todos/${todo.id}`, { method: 'DELETE' });
        }
        
        // 然后上传本地数据
        for (const todo of todos) {
            await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: todo.text, completed: todo.completed })
            });
        }
    } catch (error) {
        console.error('Failed to sync local todos to server:', error);
    }
}

// HTML转义，防止XSS攻击
function escapeHTML(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 在DOM内容加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 初始化应用
    await initApp();
    
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