# petpet 当前本地 Docker 实例 + 低配 VPS + Caddy + frp 接入手册

本文档用于先把“当前这台电脑上已经启动的 petpet Docker 实例”接到公网域名 `https://pet.tom86.top`。这一版先不搬迁服务，也不切换到未来固定运行机器：本地现有的 `web-1 / server-1 / postgres-1` 继续运行，VPS 只负责 HTTPS 入口和 frp 隧道。

## 1. 当前目标

```text
浏览器
  |
  | https://pet.tom86.top
  v
搬瓦工 VPS 176.122.170.128
  Caddy :80/:443
  |
  | http://127.0.0.1:18080
  v
frps
  |
  | frpc 主动连出
  v
当前本地电脑
  frpc -> 127.0.0.1:80
  |
  v
本地 Docker Compose
  web-1      0.0.0.0:80 -> container:80
  server-1   container:3000
  postgres-1 container:5432
```

关键点：

- VPS 公网只开放 `80/tcp`、`443/tcp`、`7000/tcp`。
- VPS 上的 `127.0.0.1:18080` 由 `frps` 在本地监听，只给 Caddy 访问。
- 当前本地电脑不需要公网 IP，不需要路由器端口转发。
- 当前先接入已经运行的 Docker 实例，所以 frpc 的 `localPort` 使用 `80`，不是之前手册里的 `8080`。

## 2. 为什么这样接

你的 VPS 是 `1C / 500M 内存 / 10G 硬盘 / CentOS 7.3 / Linux 4.10`。这台机器适合跑 Caddy 和 frp，不适合直接跑完整 petpet 应用、PostgreSQL、前端构建和大量图片音效资源。

本阶段先做最小可用链路：

- 本地 Docker 不动，先用当前已启动实例。
- VPS 只做公网 HTTPS 和隧道中转。
- 跑通以后，再考虑把本地 Docker 端口改成只监听 `127.0.0.1`、开启安全 Cookie、配置开机自启等加固项。

## 3. 域名

在域名服务商添加或确认：

```text
pet.tom86.top  A  176.122.170.128
```

检查：

```bash
dig +short pet.tom86.top
```

应返回：

```text
176.122.170.128
```

## 4. 本地 Docker 实例检查

以下命令在当前本地电脑执行。

进入项目：

```bash
cd /Users/tom/Desktop/github/petpet
```

检查容器：

```bash
docker compose ps
```

应看到：

- `petpet-web-1`
- `petpet-server-1`
- `petpet-postgres-1`

检查本地入口：

```bash
curl http://127.0.0.1/api/health
```

应返回：

```json
{"ok":true}
```

如果你本地不是 `80` 端口，而是例如 `8080`，则用下面命令确认：

```bash
docker compose ps
curl http://127.0.0.1:8080/api/health
```

后文 `/usr/local/etc/frp/frpc.toml` 里的 `localPort` 要跟本地实际端口一致。你当前截图和本机验证显示是 `80`，所以本文默认写 `localPort = 80`。

## 5. VPS 安装 frps

以下命令在 VPS 上执行。

### 5.1 下载 frp

本文固定使用 `0.68.0`。以后升级时，VPS 和本地电脑两边的 `FRP_VERSION` 要保持一致。

```bash
FRP_VERSION=0.68.0
cd /tmp
curl -fL -o frp.tar.gz \
  "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_linux_amd64.tar.gz"
tar -xzf frp.tar.gz
sudo install -m 0755 "frp_${FRP_VERSION}_linux_amd64/frps" /usr/local/bin/frps
/usr/local/bin/frps --version
```

### 5.2 创建 frps 配置

生成 token：

```bash
openssl rand -hex 32
```

创建目录：

```bash
sudo mkdir -p /etc/frp /var/log/frp
```

写入 `/etc/frp/frps.toml`：

```bash
sudo tee /etc/frp/frps.toml >/dev/null <<'EOF'
bindAddr = "0.0.0.0"
bindPort = 7000
proxyBindAddr = "127.0.0.1"

auth.method = "token"
auth.token = "把这里换成 openssl rand -hex 32 生成的 token"

transport.tls.force = true
transport.maxPoolCount = 2

allowPorts = [
  { single = 18080 }
]

log.to = "/var/log/frp/frps.log"
log.level = "info"
log.maxDays = 7
EOF
```

关键点：

- `bindPort = 7000`：本地电脑的 `frpc` 连接 VPS 的这个端口。
- `proxyBindAddr = "127.0.0.1"`：业务端口 `18080` 只监听 VPS 本机，公网不能直接访问。
- `allowPorts` 只允许开 `18080`，防止误暴露其他端口。

### 5.3 配置 frps 常驻

```bash
sudo tee /etc/systemd/system/frps.service >/dev/null <<'EOF'
[Unit]
Description=frp server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/frps -c /etc/frp/frps.toml
Restart=on-failure
RestartSec=5s
LimitNOFILE=1048576

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now frps
sudo systemctl status frps -l
```

### 5.4 放行端口

如果 VPS 使用 firewalld：

```bash
sudo firewall-cmd --permanent --add-port=7000/tcp
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
sudo firewall-cmd --list-all
```

云厂商安全组也要放行：

- `80/tcp`
- `443/tcp`
- `7000/tcp`

如果你的本地出口 IP 比较固定，可以在安全组里把 `7000/tcp` 限制为只允许你的本地出口 IP 访问。第一版为了先跑通，可以先放行全部，再依赖 token 和 TLS。

检查监听：

```bash
sudo ss -lntp | grep -E ':7000|:18080'
```

此时 `7000` 应该已经监听。`18080` 要等本地 `frpc` 连上后才会出现。

## 6. 本地电脑安装 frpc

以下命令在当前本地电脑执行。

### 6.1 下载 frp

Apple Silicon：

```bash
FRP_VERSION=0.68.0
cd /tmp
curl -fL -o frp.tar.gz \
  "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_darwin_arm64.tar.gz"
tar -xzf frp.tar.gz
sudo install -m 0755 "frp_${FRP_VERSION}_darwin_arm64/frpc" /usr/local/bin/frpc
/usr/local/bin/frpc --version
```

Intel Mac：

```bash
FRP_VERSION=0.68.0
cd /tmp
curl -fL -o frp.tar.gz \
  "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/frp_${FRP_VERSION}_darwin_amd64.tar.gz"
tar -xzf frp.tar.gz
sudo install -m 0755 "frp_${FRP_VERSION}_darwin_amd64/frpc" /usr/local/bin/frpc
/usr/local/bin/frpc --version
```

查看当前架构：

```bash
uname -m
```

`arm64` 用 Apple Silicon 版本，`x86_64` 用 Intel 版本。

### 6.2 创建 frpc 配置

```bash
sudo mkdir -p /usr/local/etc/frp /usr/local/var/log
```

写入 `/usr/local/etc/frp/frpc.toml`：

```bash
sudo tee /usr/local/etc/frp/frpc.toml >/dev/null <<'EOF'
serverAddr = "176.122.170.128"
serverPort = 7000

auth.method = "token"
auth.token = "换成 VPS /etc/frp/frps.toml 里完全相同的 token"

transport.tls.enable = true
transport.poolCount = 1

[[proxies]]
name = "petpet-web"
type = "tcp"
localIP = "127.0.0.1"
localPort = 80
remotePort = 18080

healthCheck.type = "http"
healthCheck.path = "/api/health"
healthCheck.intervalSeconds = 10
healthCheck.timeoutSeconds = 3
healthCheck.maxFailed = 3
EOF
```

注意：

- `localPort = 80` 对应当前已经启动的本地 Docker `web-1`。
- 如果以后把本地 Docker 改成 `127.0.0.1:8080`，这里同步改成 `localPort = 8080`。

### 6.3 前台测试 frpc

先在本地确认 Docker 入口可用：

```bash
curl http://127.0.0.1/api/health
```

启动 frpc：

```bash
/usr/local/bin/frpc -c /usr/local/etc/frp/frpc.toml
```

看到 `start proxy success` 类似日志后，不要关这个窗口。另开一个终端，在 VPS 上执行：

```bash
curl http://127.0.0.1:18080/api/health
```

应返回：

```json
{"ok":true}
```

这一步成功，说明：

```text
VPS 127.0.0.1:18080 -> frp -> 本地 127.0.0.1:80 -> Docker web-1
```

测试完成后，可以先按 `Ctrl+C` 停掉前台 frpc，再配置常驻。

### 6.4 配置 frpc 常驻

写入 `/Library/LaunchDaemons/com.petpet.frpc.plist`：

```bash
sudo tee /Library/LaunchDaemons/com.petpet.frpc.plist >/dev/null <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.petpet.frpc</string>

  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/frpc</string>
    <string>-c</string>
    <string>/usr/local/etc/frp/frpc.toml</string>
  </array>

  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>

  <key>StandardOutPath</key>
  <string>/usr/local/var/log/frpc.log</string>
  <key>StandardErrorPath</key>
  <string>/usr/local/var/log/frpc.err.log</string>
</dict>
</plist>
EOF

sudo chown root:wheel /Library/LaunchDaemons/com.petpet.frpc.plist
sudo chmod 644 /Library/LaunchDaemons/com.petpet.frpc.plist
sudo launchctl bootstrap system /Library/LaunchDaemons/com.petpet.frpc.plist
sudo launchctl enable system/com.petpet.frpc
sudo launchctl kickstart -k system/com.petpet.frpc
```

检查：

```bash
sudo launchctl print system/com.petpet.frpc
tail -n 100 /usr/local/var/log/frpc.log
tail -n 100 /usr/local/var/log/frpc.err.log
```

如果之前已经加载过同名服务，修改配置后重启：

```bash
sudo launchctl kickstart -k system/com.petpet.frpc
```

## 7. VPS 配置 Caddy

你 VPS 上已经有 Caddy，并且已有 `joplin.tom86.top`。不要覆盖原配置，只追加 `pet.tom86.top`。

备份现有 Caddyfile：

```bash
sudo cp /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.bak.$(date +%F-%H%M%S)"
```

编辑：

```bash
sudo vi /etc/caddy/Caddyfile
```

保留原来的 `joplin.tom86.top`，新增：

```caddyfile
pet.tom86.top {
    encode gzip

    reverse_proxy 127.0.0.1:18080 {
        header_up Host {host}
        header_up X-Forwarded-Proto https
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

如果 Caddyfile 顶部还没有邮箱，可以保留或添加全局块：

```caddyfile
{
    email your-email@example.com
}
```

如果已经有全局块，不要重复添加第二个。

验证并重载：

```bash
sudo /usr/local/bin/caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy -l
```

Caddy 会自动为 `pet.tom86.top` 申请和续期 HTTPS 证书。

## 8. 全链路验证

### 8.1 本地电脑

```bash
cd /Users/tom/Desktop/github/petpet
docker compose ps
curl http://127.0.0.1/api/health
sudo launchctl print system/com.petpet.frpc
```

### 8.2 VPS

```bash
sudo systemctl status frps -l
sudo ss -lntp | grep -E ':7000|:18080|:80|:443'
curl http://127.0.0.1:18080/api/health
curl https://pet.tom86.top/api/health
sudo journalctl -u caddy -n 100 --no-pager
```

### 8.3 浏览器

访问：

```text
https://pet.tom86.top
```

能打开页面并看到接口正常，就说明公网链路已经接到当前本地 Docker 实例。

## 9. 第一版接入后的建议加固

第一版为了先接入当前实例，可以不改本地 Docker。跑通后建议做下面几件事。

### 9.1 本地 Docker 只监听本机

当前 `web-1` 映射是 `0.0.0.0:80->80/tcp`，局域网内其他设备也可能访问到。后续可以把 `.env` 改成：

```env
WEB_PORT=127.0.0.1:80
```

然后重建 web 容器：

```bash
cd /Users/tom/Desktop/github/petpet
docker compose up -d
docker compose ps
curl http://127.0.0.1/api/health
```

### 9.2 HTTPS Cookie 加固

当前先接入本地实例时，可以保持现状。公网长期使用时，建议 `.env` 使用：

```env
COOKIE_SECURE=true
CORS_ORIGIN=https://pet.tom86.top
```

然后重启服务：

```bash
cd /Users/tom/Desktop/github/petpet
docker compose up -d
```

如果改完后登录异常，先回看 `server-1` 环境变量和浏览器 Cookie。

### 9.3 本地电脑防睡眠

本地电脑睡眠后，公网访问会中断。可以在系统设置中关闭自动睡眠，或执行：

```bash
sudo pmset -a sleep 0 disksleep 0 displaysleep 30
```

临时保活：

```bash
caffeinate -dimsu
```

## 10. 日常运维

### 更新本地应用

```bash
cd /Users/tom/Desktop/github/petpet
docker compose up -d --build
docker compose ps
curl http://127.0.0.1/api/health
```

### 备份本地数据库

```bash
cd /Users/tom/Desktop/github/petpet
mkdir -p backups
source .env
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "backups/petpet-$(date +%F-%H%M%S).sql.gz"
```

### 查看 frp 状态

VPS：

```bash
sudo systemctl status frps -l
sudo tail -n 100 /var/log/frp/frps.log
```

本地电脑：

```bash
sudo launchctl print system/com.petpet.frpc
tail -n 100 /usr/local/var/log/frpc.log
tail -n 100 /usr/local/var/log/frpc.err.log
```

## 11. 常见问题

### 公网 502

在 VPS 检查：

```bash
curl http://127.0.0.1:18080/api/health
sudo systemctl status frps -l
sudo journalctl -u caddy -n 100 --no-pager
```

如果 `127.0.0.1:18080` 不通，问题通常在 frp 或本地 Docker。

### frpc 连不上 frps

本地电脑检查：

```bash
nc -vz 176.122.170.128 7000
tail -n 100 /usr/local/var/log/frpc.err.log
```

VPS 检查：

```bash
sudo firewall-cmd --list-all
sudo ss -lntp | grep :7000
sudo tail -n 100 /var/log/frp/frps.log
```

常见原因：

- VPS 安全组没放行 `7000/tcp`
- firewalld 没放行 `7000/tcp`
- `auth.token` 两边不一致
- 本地网络限制出站连接

### 本地能访问，公网不行

按顺序检查：

```bash
# 本地电脑
curl http://127.0.0.1/api/health

# VPS
curl http://127.0.0.1:18080/api/health
curl https://pet.tom86.top/api/health
```

在哪一步失败，就查那一层。

### frpc 连上但 18080 不通

重点确认 `/usr/local/etc/frp/frpc.toml`：

```toml
localIP = "127.0.0.1"
localPort = 80
remotePort = 18080
```

然后在本地电脑确认：

```bash
curl http://127.0.0.1/api/health
```

如果本地 Docker 改成了 `8080`，则 `localPort` 也要改成 `8080`。

### 本地电脑重启后服务没起来

检查 Docker Desktop 是否开机启动，`frpc` 是否常驻：

```bash
docker compose ps
sudo launchctl print system/com.petpet.frpc
```

如果 Docker Desktop 没开，打开 Docker Desktop 后执行：

```bash
cd /Users/tom/Desktop/github/petpet
docker compose up -d
```

## 12. 官方参考

- frp GitHub：`https://github.com/fatedier/frp`
- frp server 示例配置：`https://github.com/fatedier/frp/blob/dev/conf/frps_full_example.toml`
- frp client 示例配置：`https://github.com/fatedier/frp/blob/dev/conf/frpc_full_example.toml`
- Caddy reverse_proxy：`https://caddyserver.com/docs/caddyfile/directives/reverse_proxy`
- Caddy Automatic HTTPS：`https://caddyserver.com/docs/automatic-https`
