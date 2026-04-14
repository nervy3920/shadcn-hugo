# shortlink-server

独立短链接后端，支持：

- 5 位短链（大小写字母 + 数字）
- 访问密码
- 阅后即焚
- 直接访问 `/{code}`

## 1. 初始化数据库

```bash
mysql -u root -p < sql/schema.sql
```

也可以不手动导入：服务启动时会自动创建数据库（若不存在）并创建 `short_links` 表。

## 2. 配置环境变量

```bash
cp .env.example .env
```

按需修改：

- `DB_*`：MySQL 连接信息
- `SHORTLINK_BASE_URL`：生成短链时显示的公网地址（如 `https://s.example.com`）
- `PAN_SEARCH_API_URL`：网盘搜索上游 API 地址（后端会自动附加 `kw` 参数）
- `PAN_SEARCH_API_TOKEN`：网盘搜索 API 令牌（可选，Bearer）
- `PAN_SEARCH_TIMEOUT_MS`：网盘搜索超时毫秒（默认 12000）

说明：
- `FRONTEND_BASE_URL`、`CORS_ORIGIN` 现在都不是必填，后端会自动根据请求来源识别前端地址并允许跨域。
- 为兼容任意静态托管平台，默认短链输出为 `/#xxxxx`（不依赖服务器重写）。

## 3. 启动

```bash
npm install
npm run dev
```

默认启动地址：`http://localhost:3001`

## API

- `POST /api/short-links` 创建短链
- `GET /api/short-links/:code` 查询状态
- `POST /api/short-links/:code/open` 验证密码并获取原始链接
- `GET /:code` 直接访问短链
- `GET /api/pan-search?kw=关键词` 网盘资源搜索（已封装标准响应字段）
