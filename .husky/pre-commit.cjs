#!/usr/bin/env node

/**
 * Pre-commit hook for Windows/PowerShell compatibility
 * 纯 Node.js 实现，无需 shell 命令
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查是否修改了 wxt.config.ts
function hasWxtConfigChanged() {
  try {
    const output = execSync('git diff --cached --name-only', { encoding: 'utf8' });
    return output.includes('packages/wxt/wxt.config.ts');
  } catch (e) {
    log('❌ 无法检查 git diff', 'red');
    return false;
  }
}

// 从 wxt.config.ts 提取版本号
function extractVersion() {
  const configPath = path.join(process.cwd(), 'packages/wxt/wxt.config.ts');
  
  if (!fs.existsSync(configPath)) {
    log('❌ 找不到 packages/wxt/wxt.config.ts', 'red');
    return null;
  }
  
  try {
    const content = fs.readFileSync(configPath, 'utf8');
    const versionMatch = content.match(/version\s*:\s*['"]([^'"]+)['"]/);
    
    if (!versionMatch) {
      log('❌ 无法从 wxt.config.ts 提取版本号', 'red');
      return null;
    }
    
    let version = versionMatch[1];
    
    // 添加 v 前缀（如果没有）
    if (!version.startsWith('v')) {
      version = 'v' + version;
    }
    
    return version;
  } catch (e) {
    log(`❌ 读取 wxt.config.ts 失败: ${e.message}`, 'red');
    return null;
  }
}

// 获取 GitHub 仓库名
function getRepository() {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    
    // 匹配 https://github.com/owner/repo.git 或 git@github.com:owner/repo.git
    const match = remoteUrl.match(/[:/]([^/]+\/[^/]+?)(\.git)?$/);
    
    if (match) {
      return match[1];
    }
    
    log('❌ 无法从 remote URL 提取仓库信息', 'red');
    return null;
  } catch (e) {
    log('❌ 无法获取 git remote URL', 'red');
    return null;
  }
}

// 主函数
function main() {
  // 检查是否修改了 wxt.config.ts
  if (!hasWxtConfigChanged()) {
    // 没有修改，直接退出
    process.exit(0);
  }
  
  log('🔍 检测到 wxt.config.ts 变更，更新 updates.json...', 'blue');
  log('');
  
  // 提取版本号
  const version = extractVersion();
  if (!version) {
    process.exit(1);
  }
  
  log(`  版本号: ${version}`, 'green');
  
  // 获取仓库名
  const repository = getRepository();
  if (!repository) {
    process.exit(1);
  }
  
  log(`  仓库: ${repository}`, 'green');
  log('');
  
  // 运行更新脚本
  try {
    const scriptPath = path.join(__dirname, 'update-manifest.cjs');
    
    if (!fs.existsSync(scriptPath)) {
      log('❌ 找不到更新脚本: ' + scriptPath, 'red');
      process.exit(1);
    }
    
    // 设置环境变量并运行脚本
    const env = {
      ...process.env,
      VERSION: version,
      GITHUB_REPOSITORY: repository,
      OUTPUT_PATH: 'updates.json',
    };
    
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      env: env,
    });
    
    // 将更新后的 updates.json 添加到暂存区
    execSync('git add updates.json', { stdio: 'inherit' });
    
    log('');
    log('✅ updates.json 已更新并添加到提交', 'green');
    
  } catch (e) {
    log('', 'reset');
    log('❌ 更新 updates.json 失败', 'red');
    log(`错误: ${e.message}`, 'red');
    process.exit(1);
  }
}

// 运行
main();