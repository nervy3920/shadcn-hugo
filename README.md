# Hugo + Tailwind CSS 项目使用教程

这是一个基于 Hugo 框架并集成 Tailwind CSS (使用 shadcn-hugo 主题) 的现代化博客/文档项目。

## 🚀 快速开始

### 1. 安装依赖
在开始之前，请确保您已安装 [Node.js](https://nodejs.org/) 和 [Hugo](https://gohugo.io/)。

下载本项目，把项目全部复制到hugo网站文件夹根目录下。

```bash
# 安装 npm 依赖（用于 Tailwind CSS 处理）
npm install
```

### 2. 本地开发
启动 Hugo 开发服务器，它会自动处理 CSS 并支持实时预览。

```bash
hugo server -D
```
访问地址：`http://localhost:1313`

### 3. 构建生产版本
生成静态文件到 `public/` 目录。

```bash
hugo --gc --minify
```

---

## 📂 目录结构说明

- `content/posts/`: 所有的文章 Markdown 文件都存放在这里。
- `themes/shadcn-hugo/`: 项目使用的主题文件。
- `tailwind.config.js`: Tailwind CSS 的配置文件，用于自定义颜色、字体等。
- `postcss.config.js`: PostCSS 配置文件，负责启动 Tailwind 编译。
- `public/`: 构建后生成的静态网站文件（可安全删除，重新构建会再次生成）。
- `resources/`: Hugo 的资源缓存目录（可安全删除）。

---

## 📝 写作指南

### 创建新文章
您可以使用 Hugo 命令创建新文章：

```bash
hugo new posts/my-new-post.md
```

### 文章开头配置 (Front Matter)
每篇文章顶部需要包含如下配置：

```markdown
---
title: "我的第一篇文章"
date: 2025-12-27
draft: false
tags: ["教程", "Hugo"]
---
```

---

## 🛠️ 常见问题

### 1. 修改了样式没有生效？
尝试清理缓存并重启服务器：
```bash
rm -rf resources/_gen
hugo server -D
```

### 2. 为什么有两个 tailwind.config.js？
- **根目录下的文件**：是项目的主配置文件，您的所有自定义修改（颜色、间距等）都应在此进行。
- **主题目录下的文件**：是主题自带的备份配置，建议保留以维持主题完整性，但通常不需要修改它。

### 3. 文件名建议
为了更好的兼容性，建议文章文件名使用小写字母和连字符，例如：`my-blog-post.md`。