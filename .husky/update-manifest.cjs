#!/usr/bin/env node

/**
 * 更新 Firefox 扩展的 updates.json 文件
 * 保留历史版本记录，添加新版本
 */

const fs = require('fs');
const path = require('path');

const ADDON_ID = '{3f8b9a12-a64d-48d8-bb5c-8d9f4e9322b2}';
const MAX_VERSIONS = 10; // 保留最近的版本数量

/**
 * 比较版本号
 */
function compareVersions(a, b) {
  const parseVersion = (v) => {
    const cleaned = v.replace(/^v/, '');
    return cleaned.split('.').map(num => parseInt(num, 10));
  };

  const aParts = parseVersion(a);
  const bParts = parseVersion(b);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aNum = aParts[i] || 0;
    const bNum = bParts[i] || 0;
    if (aNum > bNum) return -1;
    if (aNum < bNum) return 1;
  }
  return 0;
}

/**
 * 更新 updates.json
 */
function updateManifest(options) {
  const { version, repository, outputPath } = options;

  console.log(`准备更新 updates.json:`);
  console.log(`  版本: ${version}`);
  console.log(`  仓库: ${repository}`);
  console.log(`  输出路径: ${outputPath}`);

  // 获取现有的 updates.json
  const updateDataPath = path.join(__dirname, '../updates.json');
  const existingData =  require(updateDataPath);

  // 构建新的更新条目
  const newUpdate = {
    version: version,
    update_link: `https://github.com/${repository}/releases/download/wxt-${version}/lims-${version}.firefox.xpi`
  };

  // 获取现有的更新列表
  let updates = [];
  if (existingData?.addons?.[ADDON_ID]?.updates) {
    updates = existingData.addons[ADDON_ID].updates;
    console.log(`找到 ${updates.length} 个现有版本`);
  }

  // 检查是否已存在该版本
  const existingIndex = updates.findIndex(u => u.version === version);
  if (existingIndex !== -1) {
    console.log(`版本 ${version} 已存在，将更新其信息`);
    updates[existingIndex] = newUpdate;
  } else {
    console.log(`添加新版本 ${version}`);
    updates.push(newUpdate);
  }

  // 按版本号排序（最新的在前）
  updates.sort((a, b) => compareVersions(a.version, b.version));

  // 只保留最近的 N 个版本
  if (updates.length > MAX_VERSIONS) {
    console.log(`保留最近的 ${MAX_VERSIONS} 个版本`);
    updates = updates.slice(0, MAX_VERSIONS);
  }

  // 构建最终的 JSON 对象
  const manifestData = {
    addons: {
      [ADDON_ID]: {
        updates: updates
      }
    }
  };

  // 确保输出目录存在
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(outputPath, JSON.stringify(manifestData, null, 2), 'utf8');
  console.log(`\n✅ updates.json 已更新，包含 ${updates.length} 个版本:`);
  updates.forEach((u, i) => {
    console.log(`  ${i + 1}. ${u.version}`);
  });
}

// 主函数
(async () => {
  const version = process.env.VERSION || process.argv[2];
  const repository = process.env.GITHUB_REPOSITORY || process.argv[3];
  const outputPath = process.env.OUTPUT_PATH || process.argv[4] || 'updates.json';
  const githubPagesUrl = process.env.GITHUB_PAGES_URL || process.argv[5];

  if (!version || !repository) {
    console.error('错误: 缺少必要参数');
    console.error('用法: node update-manifest.js <version> <repository> [outputPath] [githubPagesUrl]');
    console.error('或设置环境变量: VERSION, GITHUB_REPOSITORY, OUTPUT_PATH, GITHUB_PAGES_URL');
    process.exit(1);
  }

  try {
    updateManifest({ version, repository, outputPath, githubPagesUrl });
  } catch (error) {
    console.error('更新失败:', error);
    process.exit(1);
  }
})();