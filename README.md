# 云笔记 (Cloud Note)

简介

云笔记是一个基于 Markdown 的轻量级在线笔记平台。前端使用 Vue 3 + Vite 构建，后端使用一个简单的 Express 服务提供文件读取、保存、上传图片、分享链接、验证码和登录验证功能。笔记以 `.md` 文件形式存放于仓库的 `file/` 目录。

主要特性

- 基于 Markdown 的在线笔记编辑与查看
- 支持图片上传（保存到 `image/`）并在笔记中显示
- 登录（基于本地文件配置）与验证码校验（SVG 验证码）
- 笔记列表分页（前端懒加载 20 条）
- 分享链接（可设置过期时间：1 天 / 7 天 / 30 天 / 永久）
- 分享页带目录（TOC）和代码块复制按钮
- 简单文件上传（导入 .md 文件）

先决条件

- Node.js（建议 >= 16）
- npm（或 pnpm / yarn）

快速开始（开发）

1. 克隆仓库并安装依赖：

   npm install

2. 启动后端 API 服务（开发时用于处理文件、图片等）：

   npm run start

   说明：后端默认监听 3001 端口。它同时会在 `dist` 目录下提供静态文件（用于生产构建）。

3. 在另一个终端启动前端开发服务器：

   npm run dev

   说明：Vite 开发服务器默认打开 8001 端口，并通过 proxy 将 /api 和 /image 转发到 http://localhost:3001，方便本地开发。

构建与预览（生产）

1. 构建前端：

   npm run build

   生成的静态文件会放到 `dist/`。

2. 启动后端（用于托管静态文件与 API）：

   npm run start

   访问 http://localhost:3001/ 即可看到应用（server.js 将 dist/ 作为静态目录）。

可用脚本（来自 package.json）

- npm run dev: 启动 Vite 开发服务器（前端）
- npm run build: 构建前端产物到 `dist/`
- npm run preview: Vite preview
- npm run type-check: 使用 vue-tsc 检查类型
- npm run start: 使用 Node 启动 `server.js`（后端 API + 静态服务）
- npm run api: 执行 `node api-server.cjs`（仓库中未找到该文件，可能是备用或遗留脚本）

注意：`api` 脚本引用的 `api-server.cjs` 在当前仓库中未找到（不存在），通常不需要使用它，建议使用 `npm run start` 来运行后端。

项目文件与存储位置说明

- file/: 存放所有笔记的 Markdown 文件（.md）。
- image/: 保存通过前端上传的图片文件（由后端的 multer 处理，最大 10MB，支持 png/jpg/jpeg/gif/webp）。
- log/: 存放运行时相关的日志/配置文件，例如 `shares.json`（分享链接数据）和 `login`（登录账号配置）。
- dist/: 前端构建产物（build 后生成）。

登录配置（本地文件）

后端将登录校验信息存放在 `log/login` 文件中，文件内容应为一行：

[user]:[password]

例如：

[alice]:[s3cr3t]

后端会从该文件读取用户名和密码做简单校验（注意：这是非常基础且不安全的实现，仅适合内网或个人私有部署）。

后端 API 概览

常用接口（大部分由 `server.js` 提供）：

- GET /api/captcha
  - 返回一个 SVG 验证码图片，同时通过响应头 `X-Captcha-Id` 返回验证码 ID（有效期 5 分钟）。

- POST /api/login
  - 请求 body: { username, password, captchaId, captchaCode }
  - 使用 log/login 文件进行账号密码校验。

- GET /api/files?page=1&pageSize=20
  - 获取笔记列表（分页），返回 { data: [...], total, page, pageSize, hasMore }

- GET /api/file/:filename
  - 返回指定 Markdown 文件的内容（JSON: { content }）。

- GET /file/:filename
  - 返回 Markdown 文件原始文本（用于直接访问文件内容）。

- POST /api/save
  - 请求 body: { path: '/file/xxx.md', content }
  - 保存并覆盖指定文件内容。

- POST /api/delete
  - 请求 body: { path: '/file/xxx.md' }
  - 删除文件并尝试删除笔记中引用的图片文件。

- POST /api/create
  - 请求 body: { title }
  - 新建一个空的 .md 文件，返回新笔记元数据。

- POST /api/rename
  - 请求 body: { path: '/file/old.md', newTitle }
  - 重命名笔记（如果目标存在则在名字后加时间戳）。

- POST /api/upload
  - 接收 multipart 表单上传的 .md 文件（以原始请求体解析 boundary），创建到 `file/`。返回笔记元数据。

- POST /api/upload-image
  - 使用 multer 处理单文件上传，表单字段名: file，返回 { success: true, imageUrl }（imageUrl 为 /image/xxx）。
  - 限制：最大 10MB，允许扩展名：.png .jpg .jpeg .gif .webp

- POST /api/share
  - 请求 body: { path: '/file/xxx.md', expireDays }（expireDays 可为空，表示永久）
  - 生成一个 shareId，保存到 `log/shares.json`，返回 shareUrl（例如 http://host/share/:shareId）。

- GET /api/share/:shareId
  - 根据 shareId 返回被分享文件的内容（检查过期时间并在过期时删除对应记录）。

- GET /image/:filename
  - 返回 image/ 下的图片二进制数据。

- GET /log/:filename
  - 读取 log 目录下的任意文件（用于调试/查看 shares.json、login 等）。

部署建议与安全说明

- 当前后端实现使用文件系统保存用户、分享与笔记数据，适合用于个人或小规模内部部署；不建议直接在公网环境中明文使用。
- 强烈建议在生产环境前置反向代理（Nginx/Caddy）并开启 HTTPS。
- 如需多人/长期使用，请迁移到数据库（如 SQLite、MySQL、Postgres）并采用更安全的认证方案（比如基于 JWT 的登录或 OAuth）。
- 图片与文件上传请根据需要做额外的访问控制与清理策略。

调试与常见问题

- 如果访问 `/api` 返回 404，请确认后端是否已启动（npm run start）并监听 3001 端口。
- 如果图片无法显示，检查 `image/` 目录是否存在及图片文件权限；前端开发时 /image 会被代理到后端（vite.config.ts 中配置）。
- 若想修改登录账号，请编辑 `log/login` 文件，格式如上。
- package.json 中的 `api` 脚本引用 `api-server.cjs`，但该文件在仓库中未找到；优先使用 `npm run start`。
