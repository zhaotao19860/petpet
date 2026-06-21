# petpet宠宠星球 Linux 部署

## 静态部署

```bash
npm install
npm run build
```

将 `dist/` 上传到 Linux 服务器，用 Nginx 或 Caddy 指向该目录。SPA 路由需要回退到 `index.html`。

## Docker 部署

```bash
docker build -t petpet ./web
docker run -d --name petpet -p 8080:80 petpet
```

访问：`http://服务器IP:8080/`

## Nginx 行为

- `/assets/` 使用长期缓存。
- 其他路径回退到 `index.html`。
- 容器暴露 80 端口，并带有 HTTP 健康检查。
