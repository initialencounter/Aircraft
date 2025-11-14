import { checkSekBtyType } from "../src/lithium/sek";
import { readFileSync } from "fs";
const data = JSON.parse(readFileSync(`./validators/tests/data/sek/data0.json`, 'utf8'));
console.log('data', data);
const result = checkSekBtyType(data, '2025')
console.log(result)