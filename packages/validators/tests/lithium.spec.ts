import { describe, expect, it } from 'vitest'
import { checkPekBtyType, checkSekBtyType } from '../src';
import { readFileSync } from "fs";



// 验证
describe('锂离子电池验证方法测试', () => {

  describe('验证', () => {
    for (let i = 0; i < 189; i++) {
      it(`验证空运数据${i}`, () => {
        const path = `./tests/data/pek/data${i}.json`
        const data = JSON.parse(readFileSync(path, 'utf8'));
        const projectYear = data["according"].slice(-4)
        const result = checkPekBtyType(data, projectYear)
        console.log(result, data["projectNo"], path, projectYear)
        expect(result.length).toBe(0)
      })
    }

  })

  describe('验证海运数据', () => {
    for (let i = 0; i < 184; i++) {
      it(`验证海运数据${i}`, () => {
        const path = `./tests/data/sek/data${i}.json`
        const data = JSON.parse(readFileSync(path, 'utf8'));
        const projectYear = data["according"].slice(-4)
        const result = checkSekBtyType(data, projectYear)
        console.log(result, data["projectNo"], path)
        expect(result.length).toBe(0)
      })
    }
  })
})