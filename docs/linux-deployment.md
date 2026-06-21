# petpet CentOS 7.3 + Caddy 低配服务器部署手册

本文档用于把 `petpet` 部署到 CentOS 7.3 服务器，并通过 `https://pet.tom86.top` 访问。

你的服务器配置为：1 核 CPU、约 `503MB` 内存、`131MB` swap、根分区约 `9.4GB`，可用约 `6.5GB`。这台机器可以尝试运行 petpet 的小规模个人版，但不适合在服务器上直接构建前端和 Docker 镜像。

推荐方案：

- 在本机 Mac 上构建前端和后端镜像
- 服务器只解压静态文件、加载后端镜像、运行 PostgreSQL + Node API
- Caddy 直接托管前端静态文件，并把 `/api/*` 反向代理到 `127.0.0.1:3000`
- 不运行额外的前端 nginx 容器，节省内存

## 1. 部署信息

- 服务器 IP：`176.122.170.128`
- petpet 域名：`pet.tom86.top`
- 已有 Joplin 域名：`joplin.tom86.top`
- 操作系统：CentOS 7.3，Linux 内核 `4.10`
- 推荐部署目录：`/opt/petpet`
- 前端静态目录：`/opt/petpet/web-dist`
- 后端本机入口：`http://127.0.0.1:3000`
- 公网入口：`https://pet.tom86.top`
- HTTPS：由现有 Caddy 自动签发和续期

运行结构：

- `postgres`：PostgreSQL 数据库，数据保存在 Docker volume
- `server`：Node/Fastify API，容器内部端口 `3000`，只映射到 `127.0.0.1:3000`
- `Caddy`：托管 `web-dist`，并反代 `/api/*` 到后端

## 2. 资源评估

这台机器的主要风险是内存和磁盘，不是 CPU。

- 内存：`503MB`，可用约 `329MB`
- swap：`131MB`，偏小
- 磁盘：根分区 `9.4GB`，可用约 `6.5GB`
- 项目前端静态资源约 `1.3GB`，主要是动物图片

结论：

- 不建议在服务器执行 `docker compose up -d --build`
- 不建议把完整源码、`node_modules`、`web/dist` 和 Docker build cache 都长期放在服务器
- 建议增加 swap 到 `1GB`
- 建议定期清理 Docker 镜像和构建缓存
- 建议只用于少量用户访问；如果要多人长期使用，建议升级到至少 `1GB` 内存、`20GB` 磁盘

## 3. DNS、端口和 Caddy 检查

### 3.1 DNS

在域名服务商处添加 A 记录：

```text
pet.tom86.top  A  176.122.170.128
```

等待 DNS 生效后执行：

```bash
dig +short pet.tom86.top
```

应返回：

```text
176.122.170.128
```

### 3.2 端口

云厂商安全组和服务器防火墙需要放行：

- `22/tcp`：SSH
- `80/tcp`：Caddy HTTP 和证书签发/续期
- `443/tcp`：Caddy HTTPS

不要对公网开放 PostgreSQL 端口。

### 3.3 Caddy 当前状态

```bash
/usr/local/bin/caddy version
sudo systemctl status caddy -l
sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile
sudo ss -lntp | grep -E ':80|:443'
```

`80/443` 应由 Caddy 监听。

## 4. CentOS 7.3 和 Docker 检查

```bash
cat /etc/centos-release
uname -r
df -h
free -h
df -Th /var/lib/docker 2>/dev/null || df -Th /
xfs_info / 2>/dev/null | grep ftype || true
```

如果看到 XFS `ftype=0`，不建议继续用 Docker `overlay2`。建议换 ext4 数据盘，或重新格式化 XFS 为 `ftype=1` 后再部署。

## 5. 增加 swap

当前 swap 只有 `131MB`，建议增加一个 `1GB` swap 文件：

```bash
sudo fallocate -l 1G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=1024
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

如果磁盘非常紧张，至少加 `512MB`：

```bash
sudo fallocate -l 512M /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=512
```

## 6. yum 源和基础工具

如果服务器已经按 Joplin/Caddy 部署文档切到了阿里云 CentOS Vault 源，可以跳过源配置。

如果 `yum install` 报 mirrorlist 或 404 错误，可切到阿里云 Vault 源：

```bash
BACKUP_DIR=/etc/yum.repos.d/backup-$(date +%F-%H%M%S)
sudo mkdir -p "$BACKUP_DIR"
sudo mv /etc/yum.repos.d/CentOS-*.repo "$BACKUP_DIR"/ 2>/dev/null || true

sudo tee /etc/yum.repos.d/CentOS-Vault-7.9.2009.repo >/dev/null <<'EOF'
[base]
name=CentOS-7.9.2009 - Base - Aliyun Vault
baseurl=http://mirrors.aliyun.com/centos-vault/7.9.2009/os/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7

[updates]
name=CentOS-7.9.2009 - Updates - Aliyun Vault
baseurl=http://mirrors.aliyun.com/centos-vault/7.9.2009/updates/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7

[extras]
name=CentOS-7.9.2009 - Extras - Aliyun Vault
baseurl=http://mirrors.aliyun.com/centos-vault/7.9.2009/extras/$basearch/
enabled=1
gpgcheck=1
gpgkey=file:///etc/pki/rpm-gpg/RPM-GPG-KEY-CentOS-7
EOF

sudo yum clean all
sudo rm -rf /var/cache/yum
sudo yum makecache
```

安装基础工具：

```bash
sudo yum install -y curl tar gzip ca-certificates git openssl yum-utils device-mapper-persistent-data lvm2 bind-utils cronie
sudo update-ca-trust force-enable
sudo update-ca-trust extract
sudo yum update -y ca-certificates nss nss-softokn nss-util curl openssl
sudo systemctl enable --now crond
```

## 7. 安装 Docker 和 Compose

如果服务器已经有 Docker，可先检查：

```bash
docker --version
docker compose version
docker info | grep -E 'Storage Driver|Backing Filesystem|Supports d_type'
```

如果未安装，执行：

```bash
sudo yum remove -y docker docker-client docker-client-latest docker-common docker-latest docker-latest-logrotate docker-logrotate docker-engine || true
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum makecache fast
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

配置 Docker 使用 `overlay2`，并限制日志大小：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "20m",
    "max-file": "2"
  }
}
EOF
```

启动 Docker：

```bash
sudo systemctl enable --now docker
sudo docker run hello-world
docker compose version
```

如果 `docker compose version` 不存在，可安装 Compose standalone 插件：

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
COMPOSE_VERSION=v2.27.0
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

## 8. 本机 Mac 构建 release 包

在本机项目目录执行：

```bash
cd /Users/tom/Desktop/github/petpet
rm -rf release
mkdir -p release
```

构建前端：

```bash
cd web
npm run build
cd ..
tar -C web/dist -czf release/petpet-web-dist.tar.gz .
```

构建后端镜像并导出：

```bash
docker buildx build --platform linux/amd64 -t petpet-server:prod --load ./server
docker save petpet-server:prod | gzip > release/petpet-server-image.tar.gz
```

服务器 CPU 架构是 `x86_64`，所以后端镜像必须构建为 `linux/amd64`。如果本机 Mac 是 Apple Silicon，这一步尤其重要。

复制轻量 compose 文件和环境模板：

```bash
cp docker-compose.server-lite.yml release/docker-compose.yml
cp .env.example release/env.example
```

查看 release 大小：

```bash
du -sh release/*
```

## 9. 上传 release 到服务器

```bash
ssh root@176.122.170.128 'mkdir -p /opt/petpet'
rsync -av release/ root@176.122.170.128:/opt/petpet/
```

服务器上检查：

```bash
cd /opt/petpet
ls -lh
df -h
free -h
```

## 10. 服务器解压前端并加载后端镜像

```bash
cd /opt/petpet
mkdir -p web-dist
tar -xzf petpet-web-dist.tar.gz -C web-dist
docker load -i petpet-server-image.tar.gz
docker image ls | grep petpet-server
```

清理压缩包可释放磁盘。确认镜像加载成功、前端已解压后再执行：

```bash
rm -f petpet-web-dist.tar.gz petpet-server-image.tar.gz
df -h
```

## 11. 配置生产环境变量

```bash
cd /opt/petpet
cp env.example .env
```

生成密钥：

```bash
openssl rand -hex 24
openssl rand -base64 48
```

编辑 `.env`：

```bash
vi .env
```

推荐内容如下：

```env
POSTGRES_USER=petpet
POSTGRES_PASSWORD=这里换成openssl-rand-hex-24生成的数据库密码
POSTGRES_DB=petpet
DATABASE_URL=postgresql://petpet:这里换成同一个数据库密码@postgres:5432/petpet
SESSION_SECRET=这里换成openssl-rand-base64-48生成的长随机字符串
COOKIE_SECURE=true
CORS_ORIGIN=https://pet.tom86.top
WEB_PORT=127.0.0.1:8080
```

说明：

- `POSTGRES_PASSWORD` 和 `DATABASE_URL` 里的密码必须一致。
- 数据库密码建议只用 `openssl rand -hex 24` 这种十六进制字符串，避免 URL 特殊字符转义问题。
- `WEB_PORT` 在低配 compose 中不会使用，保留只是为了和原配置兼容。

## 12. 启动后端和数据库

```bash
cd /opt/petpet
docker compose up -d
docker compose ps
```

检查 API：

```bash
curl http://127.0.0.1:3000/api/health
```

应返回：

```json
{"ok":true}
```

如果启动失败，先看日志：

```bash
docker compose logs --tail=100 postgres server
free -h
df -h
```

## 13. 配置 Caddy

先备份现有 Caddyfile，避免影响 `joplin.tom86.top`：

```bash
sudo cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%F-%H%M%S)"
```

编辑：

```bash
sudo vi /etc/caddy/Caddyfile
```

在保留现有 `joplin.tom86.top` 配置的基础上，新增 `pet.tom86.top` 站点块。示例完整结构如下：

```caddyfile
{
    email your-email@example.com
}

joplin.tom86.top {
    encode gzip

    reverse_proxy 127.0.0.1:8002

    log {
        output file /var/log/caddy/joplin-access.log {
            roll_size 10mb
            roll_keep 5
            roll_keep_for 720h
        }
    }
}

pet.tom86.top {
    encode gzip zstd
    root * /opt/petpet/web-dist

    handle /api/* {
        reverse_proxy 127.0.0.1:3000
    }

    handle {
        try_files {path} /index.html
        file_server
    }

    log {
        output file /var/log/caddy/petpet-access.log {
            roll_size 10mb
            roll_keep 3
            roll_keep_for 168h
        }
    }
}
```

把 `your-email@example.com` 换成你的邮箱。如果全局块里已经有邮箱，只需要追加 `pet.tom86.top` 这一段。

确保 Caddy 用户能读前端文件：

```bash
sudo chown -R root:root /opt/petpet/web-dist
sudo find /opt/petpet/web-dist -type d -exec chmod 755 {} \;
sudo find /opt/petpet/web-dist -type f -exec chmod 644 {} \;
```

验证并重载：

```bash
sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy -l
```

## 14. 访问验证

Caddy 会为公网域名自动申请 HTTPS 证书，并在到期前自动续期。通常不需要安装 Certbot，也不需要写 cron。

```bash
dig +short pet.tom86.top
curl -I https://pet.tom86.top
curl https://pet.tom86.top/api/health
sudo journalctl -u caddy -n 100 --no-pager
```

如果 `curl https://pet.tom86.top/api/health` 返回 `{"ok":true}`，说明 Caddy 到后端的代理正常。

## 15. 防火墙

如果使用 firewalld：

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

只应对外开放 `22`、`80`、`443`。

## 16. 日常运维

### 查看状态

```bash
cd /opt/petpet
docker compose ps
docker compose logs -f --tail=100
free -h
df -h
sudo systemctl status caddy -l
curl https://pet.tom86.top/api/health
```

### 更新版本

在本机重新构建 release 后上传：

```bash
cd /Users/tom/Desktop/github/petpet
rm -rf release
mkdir -p release
cd web && npm run build && cd ..
tar -C web/dist -czf release/petpet-web-dist.tar.gz .
docker buildx build --platform linux/amd64 -t petpet-server:prod --load ./server
docker save petpet-server:prod | gzip > release/petpet-server-image.tar.gz
cp docker-compose.server-lite.yml release/docker-compose.yml
cp .env.example release/env.example
rsync -av release/ root@176.122.170.128:/opt/petpet/
```

服务器上备份数据库并更新：

```bash
cd /opt/petpet
mkdir -p backups
source .env
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/petpet-$(date +%F-%H%M%S).sql"

rm -rf web-dist
mkdir -p web-dist
tar -xzf petpet-web-dist.tar.gz -C web-dist
docker compose down
docker load -i petpet-server-image.tar.gz
docker compose up -d
rm -f petpet-web-dist.tar.gz petpet-server-image.tar.gz
docker image prune -f
docker builder prune -f
sudo systemctl reload caddy
curl https://pet.tom86.top/api/health
df -h
```

### 数据库备份

```bash
cd /opt/petpet
mkdir -p backups
source .env
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/petpet-$(date +%F-%H%M%S).sql.gz"
```

定期清理旧备份：

```bash
find /opt/petpet/backups -type f -name '*.sql.gz' -mtime +14 -delete
```

### 数据库恢复

```bash
cd /opt/petpet
source .env
gzip -dc backups/petpet-YYYY-MM-DD-HHMMSS.sql.gz | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

### 磁盘清理

```bash
docker system df
docker image prune -f
docker builder prune -f
journalctl --disk-usage
sudo journalctl --vacuum-time=7d
df -h
```

## 17. 常见问题

### 内存不够或容器被杀

检查：

```bash
free -h
dmesg | grep -i -E 'killed process|out of memory|oom' | tail -n 20
docker compose logs --tail=100
```

处理：

- 确认已按第 5 节增加 swap
- 确认使用 `docker-compose.server-lite.yml`，不要运行前端 nginx 容器
- 减少并发访问
- 仍不稳定时升级到至少 `1GB` 内存

### 磁盘不够

检查：

```bash
df -h
du -sh /opt/petpet/* 2>/dev/null
docker system df
```

处理：

```bash
rm -f /opt/petpet/*.tar.gz
docker image prune -f
docker builder prune -f
sudo journalctl --vacuum-time=7d
```

### Caddy reload 后 Joplin 不能访问

先恢复备份：

```bash
sudo cp /etc/caddy/Caddyfile.bak.具体时间 /etc/caddy/Caddyfile
sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

再检查 Caddyfile 是否少了 `{}` 或站点块是否写重了。

### `https://pet.tom86.top` 打不开

检查：

```bash
dig +short pet.tom86.top
curl http://127.0.0.1:3000/api/health
sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile
sudo systemctl status caddy -l
sudo journalctl -u caddy -n 100 --no-pager
```

常见原因：

- DNS 没指向 `176.122.170.128`
- 云安全组或 firewalld 没开放 `80/443`
- Docker 后端没有启动
- Caddyfile 修改后没有 reload
- Caddy 用户无权读取 `/opt/petpet/web-dist`

### 502 Bad Gateway

检查 API 本机入口：

```bash
curl http://127.0.0.1:3000/api/health
cd /opt/petpet
docker compose ps
docker compose logs --tail=100 server
```

### 登录后立即退出或登录异常

检查 `.env`：

```env
COOKIE_SECURE=true
CORS_ORIGIN=https://pet.tom86.top
```

并确认访问的是 HTTPS：

```text
https://pet.tom86.top
```

## 18. 官方参考

- Caddy file_server：`https://caddyserver.com/docs/caddyfile/directives/file_server`
- Caddy reverse_proxy：`https://caddyserver.com/docs/caddyfile/directives/reverse_proxy`
- Caddy Automatic HTTPS：`https://caddyserver.com/docs/automatic-https`
- Docker Engine on CentOS：`https://docs.docker.com/engine/install/centos/`
- Docker `overlay2` 存储驱动要求：`https://docs.docker.com/engine/storage/drivers/overlayfs-driver/`
