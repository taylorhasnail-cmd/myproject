# Ubuntu公网服务器部署指南

本指南将详细介绍如何将待办事项应用部署到Ubuntu公网服务器上。

## 前提条件

- 一台运行Ubuntu系统的公网服务器（Ubuntu 20.04或更高版本）
- 服务器具有公网IP地址
- 具有服务器的SSH访问权限（root或sudo权限）
- 可选：已注册的域名（用于配置域名访问）

## 步骤1：准备服务器环境

### 连接到服务器

使用SSH连接到您的Ubuntu服务器：

```bash
ssh username@your_server_ip
```

### 更新系统软件包

```bash
sudo apt update && sudo apt upgrade -y
```

### 安装Node.js和npm

```bash
# 安装Node.js 18（长期支持版本）
sudo apt install curl -y
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 验证安装
node -v
npm -v
```

### 安装Git

```bash
sudo apt install git -y
```

## 步骤2：部署项目

### 创建项目目录

```bash
sudo mkdir -p /var/www/todo-app
cd /var/www/todo-app
sudo chown -R $USER:$USER /var/www/todo-app
```

### 部署项目文件

有两种方法可以将项目文件部署到服务器上：

#### 方法1：使用Git克隆（推荐）

如果您的项目在GitHub或其他Git仓库上：

```bash
git clone https://your-repo-url.git .
```

#### 方法2：直接拷贝文件

是的，您可以直接将项目文件拷贝到Ubuntu服务器目录中。以下是几种常用的方法：

##### 使用SCP命令（推荐）

在本地计算机的终端中执行以下命令，将项目文件上传到服务器：

```bash
# 在本地终端执行
scp -r /path/to/your/project username@your_server_ip:/var/www/todo-app
```

将`/path/to/your/project`替换为您本地项目的实际路径，`username`替换为您的服务器用户名，`your_server_ip`替换为您的服务器IP地址。

##### 使用FTP/SFTP客户端

您也可以使用图形化FTP/SFTP客户端（如FileZilla）连接到服务器，然后将项目文件拖拽到`/var/www/todo-app`目录中。

##### 注意事项
- 确保所有项目文件（包括index.html、styles.css、app.js、manifest.json、service-worker.js以及icons文件夹）都已成功复制到服务器
- 复制完成后，检查文件和文件夹的权限，确保Web服务器有权访问它们
  ```bash
  sudo chmod -R 755 /var/www/todo-app
  ```

### 安装项目依赖

```bash
npm install
```

## 步骤3：配置和启动应用

### 安装PM2进程管理器（推荐）

PM2可以帮助您管理Node.js应用，确保应用在服务器重启后自动启动，并且在崩溃时自动重启：

```bash
npm install -g pm2
```

### 启动应用

使用PM2启动您的应用：

```bash
# 开发模式启动（使用live-server）
npm run dev

# 生产模式启动（使用server.js）
npm start

# 或者使用PM2启动（推荐用于生产环境）
pm2 start server.js --name todo-app

# 如果需要使用http-server（备选方案）
npm install -g http-server
cd /var/www/todo-app
http-server -p 8000
```

### 配置PM2开机自启

```bash
pm startup
```

按照提示执行生成的命令，将PM2设置为开机自启。

## 步骤4：配置防火墙

确保服务器的防火墙允许HTTP和HTTPS流量：

```bash
# 检查UFW防火墙状态
sudo ufw status

# 如果防火墙未启用，启用它
sudo ufw enable

# 允许HTTP（80端口）和HTTPS（443端口）流量
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许Node.js应用使用的端口（默认为8000）
sudo ufw allow 8000/tcp
```

## 步骤5：配置域名（可选）

如果您有域名，可以将其指向您的服务器IP地址，并配置Nginx作为反向代理。

### 安装Nginx

```bash
sudo apt install nginx -y
```

### 配置Nginx反向代理

创建Nginx配置文件：

```bash
sudo nano /etc/nginx/sites-available/todo-app
```

添加以下内容（替换your_domain.com为您的域名）：

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

保存并退出编辑器，然后启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/todo-app /etc/nginx/sites-enabled/

# 测试Nginx配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

## 步骤6：配置HTTPS（可选）

使用Certbot为您的域名配置免费的SSL证书：

```bash
# 安装Certbot
sudo apt install certbot python3-certbot-nginx -y

# 运行Certbot并按照提示操作
sudo certbot --nginx -d your_domain.com
```

## 步骤7：验证部署

打开浏览器，访问您的服务器IP地址或域名：

- 如果使用IP地址：`http://your_server_ip:8000`
- 如果配置了域名：`http://your_domain.com` 或 `https://your_domain.com`（如果配置了HTTPS）

## 管理应用

使用PM2管理您的应用：

```bash
# 列出所有PM2管理的应用
pm2 list

# 查看应用日志
pm2 logs todo-app

# 重启应用
pm2 restart todo-app

# 停止应用
pm2 stop todo-app
```

## 常见问题排查

1. **应用无法访问**
   - 检查防火墙设置是否正确
   - 确认Node.js应用是否正在运行（使用`pm2 list`）
   - 检查服务器的网络连接

2. **页面加载缓慢**
   - 考虑使用CDN加速静态资源
   - 优化前端代码和资源

3. **PWA功能不工作**
   - 确保您的服务器支持HTTPS（PWA需要HTTPS）
   - 检查manifest.json和service-worker.js文件的路径是否正确

## 更新应用

当您需要更新应用时：

1. 拉取最新代码（如果使用Git）：`git pull`
2. 安装新的依赖（如果有）：`npm install`
3. 重启应用：`npm restart todo-app`

---

部署完成后，您的待办事项应用将可以通过公网访问，并且支持PWA功能，用户可以将其添加到主屏幕并离线使用。