# 面试实时答题助手（Interview Copilot）

基于 **Deepgram**（实时语音转写）+ **Gemini**（答案生成）的桌面应用：自动识别面试过程的双向对话，按一个热键即可基于你上传的资料 + 大模型知识，生成 **500 字以内** 的第一人称回答。整个应用就是一个界面。

## 功能

- 🎙️ **双声道识别**：麦克风 = 面试者，系统声音（Loopback）= 面试官，分别实时转写并标注。
- 📚 **资料知识库（RAG）**：上传简历 / JD / 笔记（txt / md / pdf / docx），整篇注入上下文，回答时优先参考。
- ⌨️ **一键作答**：按 `Ctrl+A`（可在设置中修改）自动抓取最近的面试官问题 → Gemini 流式生成答案。
- ✍️ **第一人称、≤500 字**：像在面试现场口头作答，简洁专业，字数可调。
- 🖥️ **单界面**：左侧实时转写，右侧问题 / 答案 / 资料。

## 技术要点

- **Deepgram**：浏览器原生 WebSocket（子协议 `['token', apiKey]` 鉴权，`nova-2` / `nova-3`），无需 SDK。
- **Gemini**：REST `streamGenerateContent`（SSE 流式），模型 ID 可在设置中自由填写（默认 `gemini-2.5-flash`）。
- **音频**：`AudioWorklet` 把麦克风 / 系统声音转成 16kHz 16-bit PCM 推流。
- **Electron**：主进程负责窗口、全局热键、设置持久化、资料解析与 Gemini 调用；渲染进程负责采集、转写与 UI。

## 安装与运行

```bash
npm install        # 安装依赖（含 Electron）
npm start          # 启动应用
```

> 若 `npm install` 在下载 Electron 二进制时报缓存目录权限错误（`EACCES … Library/Caches/electron`），用可写缓存目录重试：
> ```bash
> npm install --ignore-scripts
> electron_config_cache="$PWD/.electron-cache" node node_modules/electron/install.js
> ```

## 首次使用

1. 启动后会自动弹出「设置」，填入：
   - **Deepgram API Key** —— https://console.deepgram.com/
   - **Gemini API Key** —— https://aistudio.google.com/apikey
   - 可选：生成模型 ID、转写语言、回答语言、字数上限、触发热键。
2. 点击 **上传文件** 或 **粘贴文本**，把简历 / 岗位 JD / 知识点加入知识库。
3. 点击 **▶ 开始监听**，授权麦克风与屏幕录制权限。
4. 面试官提问后，按 **`Ctrl+A`**（或点「✨ 生成回答」），右侧即流式给出答案。

## macOS 权限

- **麦克风**：首次开始监听时系统会请求授权。
- **系统声音（面试官）**：通过屏幕录制接口的 Loopback 采集（macOS 13+）。需在
  `系统设置 → 隐私与安全性 → 屏幕录制` 中勾选本应用，然后重新「开始监听」。
- **备选**：若不想用 Loopback，可安装虚拟声卡（如 [BlackHole](https://github.com/ExistentialAudio/BlackHole)），
  把会议软件输出路由到它，再在「面试官音源」下拉里选择该输入设备。

## 项目结构

```
src/
  main/
    main.js        Electron 主进程：窗口 / 全局热键 / IPC / 生成调度
    preload.js     contextBridge 暴露安全 API
    settings.js    设置读写（userData/settings.json）
    store.js       资料知识库（拼接进上下文）
    documents.js   文档解析（txt/md/pdf/docx）
    gemini.js      Gemini REST 流式生成
  renderer/
    index.html     单界面布局
    styles.css     深色主题
    app.js         采集 / 转写路由 / 问题捕捉 / 生成 / 设置 / 资料
    deepgram.js    Deepgram 实时转写客户端
    pcm-worklet.js Float32 → 16-bit PCM AudioWorklet
```

## 说明

- API Key 保存在本机 `app.getPath('userData')/settings.json`，不上传任何服务器。
- `Ctrl+A` 注册为全局热键，应用运行时会拦截系统的全选快捷键；如有冲突可在设置中改成
  `Control+Shift+A`、`Command+Enter` 等。
- 本工具用于面试**练习 / 辅助**，请遵守目标公司及当地的相关规定。
