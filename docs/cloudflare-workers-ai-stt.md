# Cloudflare Workers AI 语音识别接入

本文档用于把宠宠星宝的小话筒语音输入接到 Cloudflare Workers AI Whisper。

## 1. 当前程序配置

后端语音识别供应商使用：

```env
STT_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=你的 Cloudflare Account ID
CLOUDFLARE_API_TOKEN=你的 Cloudflare API Token
CLOUDFLARE_STT_MODEL=@cf/openai/whisper
```

聊天和讲故事仍然使用原来的 `AI_PROVIDER`、`ONEAPI_TOKEN`、`AI_FAST_MODEL`、`AI_SMART_MODEL` 配置，不会被这个语音识别配置影响。

## 2. 注册和登录 Cloudflare

1. 打开 `https://dash.cloudflare.com`。
2. 如果还没有账号，点击注册，按页面提示填写邮箱和密码。
3. 登录后，如果页面要求邮箱验证，先到邮箱里完成验证。
4. 登录成功后，会进入 Cloudflare 控制台首页。

## 3. 获取 Account ID

1. 进入 `https://dash.cloudflare.com`。
2. 在首页选择你的账号。
3. 进入任意账号概览页后，看右侧栏的 `API` 区域。
4. 找到 `Account ID`，复制这一串 ID。
5. 把它填入项目 `.env`：

```env
CLOUDFLARE_ACCOUNT_ID=这里换成你的 Account ID
```

如果右侧没有看到，可以进入左侧 `Workers & Pages`，再进入 `AI` 或 `Workers AI` 页面，账号级页面通常也会显示当前账号信息。Cloudflare 官方文档对应页面是：`https://developers.cloudflare.com/fundamentals/setup/find-account-and-zone-ids/`。

## 4. 开通 Workers AI

1. 在 Cloudflare 控制台左侧找到 `Workers & Pages`。
2. 进入 `AI` 或 `Workers AI`。
3. 如果页面提示启用 Workers AI，按提示启用。
4. 免费计划有每日免费额度，短语音测试通常够用。

Cloudflare 官方价格文档写明：Workers AI 免费计划每天有 `10,000 Neurons` 免费额度，Whisper 约按音频分钟计费。官方价格页：`https://developers.cloudflare.com/workers-ai/platform/pricing/`。

## 5. 创建 API Token

1. 打开 `https://dash.cloudflare.com/profile/api-tokens`。
2. 点击 `Create Token`。
3. 选择 `Create Custom Token`。
4. Token 名称可以填：`petpet-workers-ai-stt`。
5. 在 `Permissions` 里添加账号级权限：
   - `Account`
   - `Workers AI`
   - `Edit`
6. 在 `Account Resources` 里选择：
   - `Include`
   - 选择你的 Cloudflare 账号
7. 继续下一步，确认创建。
8. Cloudflare 只会展示一次 Token，立刻复制保存。
9. 把 Token 填入项目 `.env`：

```env
CLOUDFLARE_API_TOKEN=这里换成你的 API Token
```

如果界面里的权限名字显示成 `Workers AI Write`，选择 `Write` 也可以。Cloudflare 权限文档中账号级权限包含 `Workers AI Read/Edit` 或 `Workers AI Read/Write`。

## 6. 验证 Token 是否可用

在本机验证 Token 是否有效：

```bash
curl "https://api.cloudflare.com/client/v4/user/tokens/verify" \
  --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

看到 `success: true` 说明 Token 本身可用。

再验证 Whisper 接口：

```bash
curl "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/ai/run/@cf/openai/whisper" \
  -X POST \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  --data-binary "@你的测试音频.mp3"
```

成功时会返回识别出来的文字。Cloudflare 官方 Whisper 文档：`https://developers.cloudflare.com/workers-ai/models/whisper/`。

## 7. 配置 petpet

在项目根目录的 `.env` 里写入：

```env
STT_PROVIDER=cloudflare
CLOUDFLARE_ACCOUNT_ID=你的 Cloudflare Account ID
CLOUDFLARE_API_TOKEN=你的 Cloudflare API Token
CLOUDFLARE_BASE_URL=https://api.cloudflare.com/client/v4
CLOUDFLARE_STT_MODEL=@cf/openai/whisper
AI_STT_TIMEOUT_MS=12000
```

然后重启本地服务：

```bash
docker compose up -d --build
```

重启后，宠宠星宝的小话筒会把录音上传到后端，由后端调用 Cloudflare Whisper 识别。

## 8. 常见问题

- 如果提示 `CLOUDFLARE_ACCOUNT_ID_MISSING`：`.env` 没有填 `CLOUDFLARE_ACCOUNT_ID`。
- 如果提示 `CLOUDFLARE_API_TOKEN_MISSING`：`.env` 没有填 `CLOUDFLARE_API_TOKEN`。
- 如果提示 `CLOUDFLARE_STT_HTTP_401`：Token 错误、过期，或没有 Workers AI 权限。
- 如果提示 `CLOUDFLARE_STT_HTTP_403`：账号没有开通 Workers AI，或 Token 没有选中正确账号。
- 如果识别慢：先用 3 到 8 秒短语音测试，避免录音太长。
