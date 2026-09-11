#!/usr/bin/env bash
#
# 发布助手: 把"改版本号 → 提交 → 推送 → 打 tag → 建 GitHub Release"固化成一条命令。
#
# 流程约定(CHANGELOG 先行): 发版前先把两份 CHANGELOG 里对应版本的小节写好并提交,
# 本脚本负责剩下的一切, 并把该小节作为 GitHub Release 的正文来源。
#
# 用法:
#   scripts/release.sh <version> [summary] [选项]
#
# 示例:
#   scripts/release.sh 1.3.0 "in-panel update badge"
#   scripts/release.sh 1.3.1 --yes            # 免交互(CI/脚本化调用)
#   scripts/release.sh 1.4.0 --dry-run        # 只校验与预览, 不改动任何东西
#   scripts/release.sh 1.4.0 --publish        # 发布成功后继续 npm publish
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

VERSION=""
SUMMARY=""
DRY_RUN=0
ASSUME_YES=0
DO_PUBLISH=0
SKIP_CHECKS=0
BRANCH="main"
PKG_NAME="$(node -p "require('./package.json').name")"

usage() {
  # 打印文件头的注释块(到第一个非注释行为止), 去掉行首的 "# "
  sed -n '2,/^[^#]/p' "${BASH_SOURCE[0]}" | sed '$d' | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

die() { printf '\n✗ %s\n' "$1" >&2; exit 1; }
step() { printf '\n▶ %s\n' "$1"; }
ok() { printf '  ✓ %s\n' "$1"; }

# ---------- 参数解析 ----------
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN=1 ;;
    --yes|-y) ASSUME_YES=1 ;;
    --publish) DO_PUBLISH=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --branch) BRANCH="${2:-}"; shift ;;
    -h|--help) usage 0 ;;
    -*) die "未知选项: $1 (用 --help 查看用法)" ;;
    *)
      if [ -z "$VERSION" ]; then VERSION="$1"
      elif [ -z "$SUMMARY" ]; then SUMMARY="$1"
      else die "多余的参数: $1"
      fi
      ;;
  esac
  shift
done

[ -n "$VERSION" ] || usage 1
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "版本号必须是 x.y.z 形式, 收到: $VERSION"

TAG="v$VERSION"
CURRENT="$(node -p "require('./package.json').version")"

printf '═══ 发布 %s %s ═══\n' "$PKG_NAME" "$TAG"
[ -n "$SUMMARY" ] && printf '  摘要: %s\n' "$SUMMARY"

# ---------- 1. 前提校验 ----------
step "前提校验"

command -v gh >/dev/null || die "未安装 gh CLI (GitHub Release 需要它): brew install gh"
command -v node >/dev/null || die "未安装 node"

[ "$(git rev-parse --abbrev-ref HEAD)" = "$BRANCH" ] || die "当前分支不是 $BRANCH, 请先切换"
ok "分支: $BRANCH"

[ -z "$(git status --porcelain)" ] || die "工作区不干净, 请先提交或 stash:
$(git status --short)"
ok "工作区干净"

git fetch --quiet origin "$BRANCH"
[ "$(git rev-parse HEAD)" = "$(git rev-parse "origin/$BRANCH")" ] || die "本地与 origin/$BRANCH 不一致, 请先 pull/push"
ok "与 origin/$BRANCH 同步"

gh auth status >/dev/null 2>&1 || die "gh 未登录, 请先 gh auth login"
ok "gh 已登录"

node -e '
  const [cur, next] = process.argv.slice(1);
  const p = (v) => v.split(".").map(Number);
  const [a, b] = [p(next), p(cur)];
  for (let i = 0; i < 3; i += 1) {
    if (a[i] > b[i]) process.exit(0);
    if (a[i] < b[i]) process.exit(1);
  }
  process.exit(1);
' "$CURRENT" "$VERSION" || die "新版本 $VERSION 必须大于当前版本 $CURRENT"
ok "版本递增: $CURRENT → $VERSION"

git rev-parse -q --verify "refs/tags/$TAG" >/dev/null && die "本地已存在 tag $TAG"
git ls-remote --exit-code --tags origin "refs/tags/$TAG" >/dev/null 2>&1 && die "远程已存在 tag $TAG"
ok "tag $TAG 未被占用"

for f in CHANGELOG.md CHANGELOG_EN.md; do
  grep -q "^## \[$VERSION\]" "$f" || die "$f 缺少小节 \"## [$VERSION] - <日期>\"; 请先写好并提交, 它同时是 Release 正文来源"
done
ok "两份 CHANGELOG 均已有 [$VERSION] 小节"

# ---------- 2. 合成 Release 正文 ----------
NOTES="$(mktemp -t release-notes.XXXXXX.md)"
trap 'rm -f "$NOTES"' EXIT

PREV_TAG="$(git describe --tags --abbrev=0 HEAD 2>/dev/null || echo '')"
COMPARE_FROM="${PREV_TAG:-}"
REPO_URL="$(git remote get-url origin | sed -E 's#^git@github.com:#https://github.com/#; s#\.git$##')"
# 远端不是 GitHub(例如本地路径/自建)时不生成无意义的链接
case "$REPO_URL" in *github.com*) ;; *) REPO_URL="" ;; esac

VERSION="$VERSION" NOTES="$NOTES" PREV_TAG="$COMPARE_FROM" REPO_URL="$REPO_URL" node <<'NODE'
const fs = require('fs')
const { VERSION: ver, NOTES: out, PREV_TAG: prev, REPO_URL: repo } = process.env

const section = (file) => {
  const s = fs.readFileSync(file, 'utf8')
  const i = s.indexOf(`## [${ver}]`)
  if (i < 0) return null
  const j = s.indexOf('\n## [', i)
  const body = s.slice(i, j < 0 ? s.length : j)
  return body.slice(body.indexOf('\n') + 1).trim()
}

const zh = section('CHANGELOG.md')
const en = section('CHANGELOG_EN.md') || ''
if (zh === null) { console.error(`CHANGELOG.md 缺少 [${ver}] 小节`); process.exit(3) }

const lines = ['## 更新重点', '', zh, '']
if (en !== '') {
  lines.push('---', '', '<details><summary>Highlights (English)</summary>', '', en, '', '</details>', '')
}
if (repo) {
  lines.push(`**完整变更记录 / Full changelog**: ${repo}/blob/main/CHANGELOG.md`)
  if (prev) lines.push(`**对比 / Compare**: ${repo}/compare/${prev}...v${ver}`)
}
fs.writeFileSync(out, lines.join('\n'))
NODE
ok "Release 正文已生成 ($(wc -c < "$NOTES" | tr -d ' ') 字符, 对比基线 ${PREV_TAG:-无})"

# ---------- 3. 本地校验 ----------
if [ "$SKIP_CHECKS" -eq 0 ]; then
  step "本地校验"
  [ -d node_modules ] || die "缺少 node_modules, 请先 npm install (或改用 --skip-checks)"
  npm test >/dev/null || die "npm test 失败: 请手动运行 npm test 查看详情"
  ok "宿主入口可导入"
  node --check client/client.js >/dev/null || die "客户端语法错误: node --check client/client.js"
  ok "客户端语法正常"
  npm run verify:package >/dev/null || die "verify:package 失败: 请手动运行查看详情"
  ok "包与客户端注册 ID 一致"
else
  step "本地校验 (已跳过 --skip-checks)"
fi

# ---------- 4. 预览 / 确认 ----------
step "即将执行"
cat <<PLAN
  1) package.json: $CURRENT → $VERSION
  2) git commit -m "release: $TAG${SUMMARY:+ $SUMMARY}"
  3) git push origin $BRANCH
  4) git tag -a $TAG 并推送
  5) gh release create $TAG (标题: $TAG${SUMMARY:+ $SUMMARY})
$( [ "$DO_PUBLISH" -eq 1 ] && printf '  6) npm publish --access public\n' )
PLAN

if [ "$DRY_RUN" -eq 1 ]; then
  printf '\n(dry-run) 未做任何改动。Release 正文预览:\n\n'
  sed 's/^/    /' "$NOTES"
  exit 0
fi

if [ "$ASSUME_YES" -eq 0 ]; then
  printf '\n确认执行? [y/N] '
  read -r reply
  case "$reply" in [yY]|[yY][eE][sS]) ;; *) die "已取消" ;; esac
fi

# ---------- 5. 改版本并提交 ----------
step "更新版本号并提交"
npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
ok "package.json = $VERSION"

git add package.json
git commit -q -m "release: $TAG${SUMMARY:+ $SUMMARY}"
ok "提交 $(git rev-parse --short HEAD)"

step "推送提交"
git push origin "$BRANCH"
ok "origin/$BRANCH 已更新"

# ---------- 6. 打 tag ----------
step "打 tag 并推送"
git tag -a "$TAG" -m "$TAG${SUMMARY:+ $SUMMARY}"
git push origin "$TAG"
ok "$TAG 已推送"

# ---------- 7. 创建 GitHub Release ----------
step "创建 GitHub Release"
gh release create "$TAG" --verify-tag \
  --title "$TAG${SUMMARY:+ $SUMMARY}" \
  --notes-file "$NOTES"
ok "Release 已发布"

# ---------- 8. 可选发布 npm ----------
if [ "$DO_PUBLISH" -eq 1 ]; then
  step "发布到 npm"
  echo "  提示: 若账号对写操作要求 2FA, 这里会要求 OTP, 请在交互式终端运行"
  npm publish --access public
  ok "已发布到 npm"
else
  printf '\n  下一步(手动): npm publish --access public\n'
fi

printf '\n✅ %s 发布完成\n' "$TAG"
