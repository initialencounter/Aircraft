import fs from "fs"
import path from "path"

const data = []

const dataPath = path.resolve(__dirname, "data/pek")
let count = 100
data.forEach((d) => {
  if (d.editStatus === 3) {
    fs.writeFileSync(dataPath + `/data${count}.json`, JSON.stringify(d, null, 2))
    count++
  }
});

// (async () => {
//   async function sleep(ms) {
//     return new Promise((resolve) => setTimeout(resolve, ms))
//   }
//   let dataList = []
//   for (let i = 0; i < 99; i++) {
//     try {
//       const element = document.querySelector(`#datagrid-row-r24-2-${i} > td:nth-child(1) > div > a`)
//       if (element) {
//         const url = element.href
//         if (url) {
//           const params = Object.fromEntries(new URL(url).searchParams)
//           const newURL = `https://${window.location.host}/rest/pek/inspect/battery/${params.projectId}`
//           console.log(newURL)
//           const res = await fetch(newURL, {
//             method: 'GET',
//             headers: {
//               'Content-Type': 'application/json',
//             },
//             credentials: 'include', // 包含 cookies
//           })
//           if (res.ok) {
//             const data = await res.json()
//             if (data["editStatus"] === 3) {
//               dataList.push(data)
//             }

//           }
//         }
//       }
//     } catch (e) {
//       console.log(i, e)
//     }
//     await sleep(500)
//   }
//   console.log(dataList)
// })()