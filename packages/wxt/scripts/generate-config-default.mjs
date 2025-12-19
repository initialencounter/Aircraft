/**
 * 这个脚本从 Schema.ts 自动生成 config-default.ts
 * 运行: node scripts/generate-config-default.js
 */

import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

import { Config } from "../entrypoints/options/src/components/Schema"

// 生成默认配置
const defaultConfig = new Config()

// 生成文件内容
const fileContent = `import { Config } from "../entrypoints/options/src/components/Schema"

// 这个文件由 scripts/generate-config-default.ts 自动生成
// 请勿手动编辑！运行 \`npm run gen:config\` 来更新此文件
export const defaultConfig: Config = ${JSON.stringify(defaultConfig, null, 2)}

// 导出配置键列表
export const configKeys = Object.keys(defaultConfig) as Array<keyof Config>
`

// 写入文件
const outputPath = join(__dirname, '../share/config-default.ts')
writeFileSync(outputPath, fileContent, 'utf-8')

console.log('✅ config-default.ts 已生成')
