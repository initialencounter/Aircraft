import { describe, expect, it } from 'vitest'
import { checkPekSodiumBtyType, checkSekSodiumBtyType } from '../src';
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

  describe('验证', () => {
    it('验证海运数据', () => {
      for (let i = 0; i < 28; i++) {
        const data = JSON.parse(readFileSync(`./tests/data/sodium/sek/data${i}.json`, 'utf8'));
        const result = checkSekSodiumBtyType(data)
        if (result.length === 0) continue;
        // if (result.length === 1 && result[0].result.includes('技术备注为空')) continue;
        if ([1,6].includes(i)  && result[0].result === '物品为电池时，描述中不应该出现单块电芯') continue;
        if ([5].includes(i) && result[0]?.result === '瓦时数与项目名称不匹配360 !== 240') continue;
        // if ([1,5,11].includes(i) && result[0].result.includes('描述中不应该出现单块')) continue;
        if ([11, 12, 13, 14, 22, 23, 24, 26].includes(i) && result[0].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        if ([17].includes(i) && result[0].result === '物品为电池时，描述中不应该出现单块电芯' && result[1].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        if ([25, 27].includes(i) && result[0].result === '物品为电芯时，描述中不应该出现单块电池' && result[1].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        console.log(data)
        console.log(result)
        console.log(i)
        expect(result.length).toBe(0)
      }
    })
  })

  describe('验证', () => {
    it('验证海运数据', () => {
      for (let i = 0; i < 18; i++) {
        const data = JSON.parse(readFileSync(`./tests/data/sodium/aek/data${i}.json`, 'utf8'));
        const result = checkSekSodiumBtyType(data)
        if (result.length === 0) continue;
        if ([17].includes(i) && result[0].result === '物品为电芯时，描述中不应该出现单块电池' && result[1].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        if ([9, 16].includes(i) && result[0].result === '鉴别项目8，9 错误，未勾选不适用' && result[1].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        if ([10].includes(i) && result[0].result === '电池净重误差大于5%' && result[1].result === '结论错误，运输专有名称错误，应为Sodium ion batteries') continue;
        console.log(data)
        console.log(result)
        console.log(i)
        expect(result.length).toBe(0)
      }
    })
  })

  // describe('process', () => {
  //   it('验证空运数据', () => {
  //     const data = JSON.parse(readFileSync(`./tests/data/sodium/aeksodium.json`, 'utf8'));
  //     let i = 0;
  //     data.forEach((item: any) => {
  //       writeFileSync(`./tests/data/sodium/aek/data${i}.json`, JSON.stringify(item, null, 2), 'utf8')
  //       i++
  //     })
  //   })
  // })
})