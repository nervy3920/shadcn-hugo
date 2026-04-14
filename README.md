# shadcn-hugo（含工具中心与后端服务）

这是一个基于 Hugo + Tailwind CSS 的博客项目，主题为 `shadcn-hugo`，并扩展了工具中心与独立后端服务。

## 项目结构

- `content/`：站点内容（文章、工具页内容等）
- `themes/shadcn-hugo/`：主题与模板
- `server/`：后端服务目录（短链接、AI 思维导图、网盘资源搜索）
- `hugo.toml`：站点主配置（包含 `backendURL`、giscus 配置等）

## 新增能力说明

模板侧新增了“工具中心”及相关页面，后端服务支持：

- 短链接生成
- AI 思维导图
- 网盘资源搜索

## 前端快速开始

```bash
npm install
hugo server -D
```

访问：`http://localhost:1313`

## 后端快速开始

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

默认后端端口：`3090`

## 配置前后端联通

在 `hugo.toml` 中将后端地址改成你自己的服务地址：

```toml
[params]
  backendURL = "https://your-backend.example.com"
```

如果你本地运行后端，也可以改为：`http://127.0.0.1:3090`

## giscus 评论接入

本项目已在 `hugo.toml` 保留 giscus 配置项，你可以按自己的仓库填写：

```toml
[params.giscus]
  enable = true
  repo = "yourname/yourrepo"
  repoId = "你的_repoId"
  category = "General"
  categoryId = "你的_categoryId"
  mapping = "pathname"
  strict = "0"
  reactionsEnabled = "1"
  emitMetadata = "0"
  inputPosition = "top"
  theme = "light"
  lang = "zh-CN"
  loading = "lazy"
```

说明：`repoId`、`categoryId` 等请在 giscus 官方配置页面生成后再填入。

## 后端 `.env` 配置说明

后端配置统一写在 `server/.env`（可从 `server/.env.example` 复制）。

关键配置如下：

- `PORT`：后端服务端口（默认 `3090`）
- `DB_*`：MySQL 连接信息
- `PAN_SEARCH_API_URL`：盘搜接口地址
- `PAN_SEARCH_API_TOKEN`：盘搜接口令牌（如接口需要）
- `AI_API_BASE_URL`：AI 接口中转站或官方地址（支持自定义中转站）
- `AI_API_KEY`：AI 接口密钥
- `AI_MODEL`：模型名称

### 盘搜 API

盘搜推荐接入：`https://github.com/fish2018/pansou`

你需要将可用的盘搜 API 地址填入 `PAN_SEARCH_API_URL`。

### AI 思维导图

AI 思维导图使用 OpenAI 兼容接口：

- 必填 `AI_API_KEY`
- `AI_API_BASE_URL` 支持配置为你自己的 AI 中转站地址
- 若只填域名，后端会自动补全到 `/v1/chat/completions`

## 构建生产版本

```bash
hugo --gc --minify
```

产物目录：`public/`
