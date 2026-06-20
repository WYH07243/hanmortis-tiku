# hanmortis-tiku

题库练习网站，基于 Next.js、NextAuth、Prisma 和 Turso。

## 本地开发

```bash
npm install
npm run dev
```

## Cloudflare Workers 部署

这个项目已经改为可直接部署到 Cloudflare Workers，不依赖 Vercel。

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

参考 [`.dev.vars.example`](./.dev.vars.example) 配置以下变量：

- `DATABASE_URL`
- `DATABASE_AUTH_TOKEN`
- `AUTH_SECRET`
- `AUTH_URL`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`（可选）
- `OPENAI_BASE_URL`（可选）

Cloudflare 线上部署时，请把这些变量填到 Workers 的 `Variables and Secrets`。

### 3. 本地预览 Cloudflare 运行环境

```bash
npm run preview
```

### 4. 部署到 Cloudflare

```bash
npm run deploy
```

### 5. 绑定自定义域名

把 `tiku.hanmortis.top` 绑定到 `hanmortis-tiku` 这个 Worker 即可。

## 常用脚本

```bash
npm run dev
npm run preview
npm run deploy
npm run db:migrate
npm run db:cleanup
```
