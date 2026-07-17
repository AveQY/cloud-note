# 云笔记 (Cloud Note)

### 简介

云笔记是一个基于 Markdown 的轻量级在线笔记平台，极其简易的实现，仅适合内网、私人使用，公网部署建议都是公开文章内容，便于分享。

| <img width="2880" height="1351" alt="image" src="https://github.com/user-attachments/assets/49a14e16-b5e3-45dc-a50e-e34616073eab" /> | <img width="2880" height="1348" alt="image" src="https://github.com/user-attachments/assets/1d5b68a0-b4b6-4a0e-901b-133d4b21744f" />|
| ----------- | ----------- |
| <img width="2880" height="1342" alt="image" src="https://github.com/user-attachments/assets/2b75427a-bdae-404d-bb73-da2b9fc6b93d" /> | <img width="2880" height="1336" alt="image" src="https://github.com/user-attachments/assets/db11e226-b65a-4703-a334-700db1ff3d75" /> |

### 主要特性

- 基于 Markdown 的在线笔记编辑与查看
- 支持图片上传（保存到 `image/`）并在笔记中显示
- 登录（基于本地文件配置）与验证码校验（SVG 验证码）
- 笔记列表分页（前端懒加载 20 条）
- 分享链接（可设置过期时间：1 天 / 7 天 / 30 天 / 永久）
- 分享页带目录（TOC）和代码块复制按钮
- 简单文件上传（导入 .md 文件）
- Markdown 编辑器工具栏（加粗、斜体、下划线、代码块、引用、列表、链接等 13 项）
- 自动保存（编辑时实时保存）
- 左侧目录自动展示，支持长目录滚动
- 响应式布局，适配手机端
- 笔记导入导出（支持 zip 打包下载与上传恢复）

### 快速开始（开发）

1. 克隆仓库并安装依赖：

   ```bash
   git clone https://github.com/AveQY/cloud-note.git
   cd cloud-note
   npm install
   ```

2. 初始化登录配置：

   ```bash
   cp log/login.example log/login
   # 编辑 log/login 修改密码，格式为 [用户名]:[密码]
   ```

3. 启动后端 API 服务（开发时用于处理文件、图片等）：

   ```bash
   npm run start
   ```

   说明：后端默认监听 3001 端口。它同时会在 `dist` 目录下提供静态文件（用于生产构建）。

4. 在另一个终端启动前端开发服务器：

   ```bash
   npm run dev
   ```

   说明：Vite 开发服务器默认打开 8001 端口，并通过 proxy 将 /api 和 /image 转发到 http://localhost:3001，方便本地开发。

### 构建与预览（生产）

1. 构建前端：

   ```bash
   npm run build
   ```

   生成的静态文件会放到 `dist/`。

2. 启动后端（用于托管静态文件与 API）：

   ```bash
   npm run start
   ```

   访问 http://localhost:3001/ 即可看到应用（server.js 将 dist/ 作为静态目录）。

### 项目文件与存储位置说明

- `file/`: 存放所有笔记的 Markdown 文件（.md）。
- `image/`: 保存通过前端上传的图片文件。
- `log/`: 存放运行时相关的日志/配置文件，例如 `shares.json`（分享链接数据）和 `login`（登录账号配置）。
- `dist/`: 前端构建产物（build 后生成）。

### 登录配置

默认用户名：admin

密码：123456

后端会从 `log/login` 文件读取用户名和密码做简单校验，文件格式为 `[用户名]:[密码]`。

**（注意：仅适合内网或个人私有部署）**

### 部署建议与安全说明

- 当前后端实现使用文件系统保存用户、分享与笔记数据，适合用于个人或小规模内部部署；不建议直接在公网环境中明文使用。
- 强烈建议在生产环境前置反向代理（Nginx/Caddy）并开启 HTTPS。
- 如需多人/长期使用，请迁移到数据库（如 SQLite、MySQL、Postgres）并采用更安全的认证方案（比如基于 JWT 的登录或 OAuth）。
- 图片与文件上传请根据需要做额外的访问控制与清理策略。

### 调试与常见问题

- 如果访问 `/api` 返回 404，请确认后端是否已启动（npm run start）并监听 3001 端口。
- 如果图片无法显示，检查 `image/` 目录是否存在及图片文件权限；前端开发时 /image 会被代理到后端（vite.config.ts 中配置）。
- 若想修改登录账号，请编辑 `log/login` 文件，格式如上。
- 首次启动时若 `log/login` 不存在，服务端会自动创建默认账号 `admin:admin123`。