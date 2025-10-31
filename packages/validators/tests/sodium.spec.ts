import { describe, expect, it } from 'vitest'
import { checkPekSodiumBtyType } from '../src';
import { readFileSync, writeFileSync } from "fs";
// 验证
describe('钠离子电池验证方法测试', () => {

  describe('验证', () => {
    it('验证空运数据', () => {
      for (let i = 0; i < 86; i++) {
        const data = JSON.parse(readFileSync(`./tests/data/sodium/pek/data${i}.json`, 'utf8'));
        const result = checkPekSodiumBtyType(data)
        if (result.length === 0) continue;
        if (result.length === 1 && result[0].result.includes('技术备注为空')) continue;
        if ([77, 80, 84].includes(i)  && result[1].result === '应勾选附加操作信息') continue;
        if ([19].includes(i) && result[1]?.result === '容量*电压 与 瓦时数 误差大于5%') continue;
        if ([1,5,11].includes(i) && result[0].result.includes('描述中不应该出现单块')) continue;
        if ([10, 42].includes(i) && result[0].result === '运输专有名称错误，应为Sodium ion batteries') continue;
        if ([52, 68, 85].includes(i) && result[0].result === '976 应勾选: 荷电状态≤30%' && result[1].result === '运输专有名称错误，应为Sodium ion batteries') continue;
        console.log(data)
        console.log(result)
        console.log(i)
        expect(result.length).toBe(0)
      }
    })
  })

  // describe('process', () => {
  //   it('验证空运数据', () => {
  //     const data = JSON.parse(readFileSync(`./tests/data/sodium/peksodium.json`, 'utf8'));
  //     let i = 0;
  //     data.forEach((item: any) => {
  //       writeFileSync(`./tests/data/sodium/pek/data${i}.json`, JSON.stringify(item, null, 2), 'utf8')
  //       i++
  //     })
  //   })
  // })
})