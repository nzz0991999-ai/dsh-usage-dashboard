#!/bin/bash
# 开发/自用:把本地仓库的 dsh-usage-dashboard 重装进 web profile
# 用法: ./dev-install.sh   然后重启 dsh web 并硬刷新(Cmd/Ctrl+Shift+R)
# 说明: pnpm 以 file: 目录方式安装的是打包副本(非符号链接),
#       因此改完仓库代码后需要重跑本脚本, 让 profile 拿到最新构建。
set -euo pipefail
REPO="$(cd "$(dirname "$0")" && pwd)"
dsh plugin --profile web remove deepseek-harness-usage-dashboard || true
dsh plugin --profile web add "file:$REPO"
echo "✓ 已把本地插件重装进 web profile(版本: $(node -e \"console.log(require('$REPO/package.json').version)\"))"
echo "下一步: 停止当前 dsh web, 在原工作目录重新运行 dsh web, 再硬刷新页面。"
