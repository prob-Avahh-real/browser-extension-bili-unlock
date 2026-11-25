# biliUnlock

浏览器插件：B 站专用视频增强 这是一个针对 B 站播放器的增强型浏览器扩展，目标是让你在 B 站视频页上更方便地使用常见播放控制能力： - 倍速控制：0.75x / 1x / 1.25x / 1.5x / 2x / 2.5x - 清晰度控制：4K / 1080p / 720p / 480p / 360p / 自动 - 进度控制：快退 30 秒 / 快进 30 秒

## 用途与 Target 判定

B 站播放增强浏览器扩展

- 移动端：不适用
- 智能硬件：不适用

## 目标平台

本目录**不是**需双 Target 交付的消费级 App（见用途）。按实际形态维护即可。

## 技术栈信号

- 检测到：browser-extension

## 命令

```bash
# Chrome → 扩展程序 → 加载已解压的扩展程序 → 选本目录
npm test   # 若有
```

## 助手约束

- Loop：先定可验证 Done 与停止条件；每切片过验证环；失败回灌；详见 docs/LOOP_ENGINEERING.md
- Harness：遵循根 AGENTS「Harness Engineering」；Guide=本文件，Sensor=测试/CI；同类失误二次须沉淀规则或测试（棘轮）。详见 docs/HARNESS_ENGINEERING.md
- 遵循仓库根 `AGENTS.md`：通用性/扩展性、分阶段里程碑、默认双 Target（**仅当用途适合**）
- 可选 Target 未做时可搁置；不要为不适用形态硬加 APK/穿戴
- 改动保持聚焦；公共逻辑抽到 shared/`tools/`，禁止静默失败
