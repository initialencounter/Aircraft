
export default defineContentScript({
  runAt: 'document_end',
  matches: ['https://*/inspect/batterytest/project/main*'],
  allFrames: true,
  async main() {
    entrypoint()
  },
})

async function entrypoint() {
  const projectId = new URLSearchParams(window.location.search).get("projectId")
  if (!projectId) return

  function insertOpenSummaryButton() {
    for (let i = 0; i <= 2; i++) {
      const tableRow = document.querySelector(`#datagrid-row-r1-2-${i}`) as HTMLTableRowElement
      if (!tableRow) return
      const oprateField = tableRow.children[4] as HTMLTableCellElement
      if (!oprateField) return
      const existingCell = oprateField.children[0] as HTMLElement
      if (!existingCell) return
      if (existingCell.dataset.summaryInserted) continue // 已经插入过按钮了
      const summaryId = existingCell.children?.[0]?.getAttribute("onclick")?.match(/preview\('(\w+)'\)/)?.[1]
      if (!summaryId) return
      const separator = document.createTextNode(" | ")
      const openSummaryAnchor = document.createElement("a")
      openSummaryAnchor.href = "javascript:void(0)"
      openSummaryAnchor.addEventListener("click", () => {
        window.open(`/inspect/batterytest?id=${summaryId}&projectId=${projectId}&from=query`)
      })
      openSummaryAnchor.innerText = "打开概要"
      existingCell.appendChild(separator)
      existingCell.appendChild(openSummaryAnchor)
      existingCell.dataset.summaryInserted = "true"
    }
  }

  setInterval(() => {
    insertOpenSummaryButton()
  }, 200)

}

