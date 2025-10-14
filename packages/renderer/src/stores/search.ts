import { defineStore } from 'pinia'
import type { DataModel } from '../types'

let today = new Date().toISOString().split('T')[0];
let lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
  .toISOString()
  .split('T')[0];

export const useSearchStore = defineStore('search', {
  state: () => ({
    homeQuery: {
      systemId: 'all',
      category: 'battery',
      reportType: '0',
      appraiserName: '',
      itemName: '',
      principal: '',
      startDate: lastMonth,
      endDate: today,
      projectNo: 'PEKGZ2025',
      page: 1,
      rows: 10,
    } as Record<string, string | number>,
    homeResults: [] as DataModel[],
    searchResults: {
      home: [] as DataModel[],
      itemCName: [] as DataModel[],
      tNotes: [] as DataModel[],
      mNotes: [] as DataModel[],
      principal: [] as DataModel[]
    } as Record<string, DataModel[]>,
    lastQuery: {
      itemCName: '',
      tNotes: '',
      mNotes: '',
      principal: ''
    } as Record<string, string>
  }),
  actions: {
    setSearchResults(type: string, results: DataModel[]) {
      this.searchResults[type] = results
    },
    setLastQuery(type: string, text: string) {
      this.lastQuery[type] = text
    },
    setHomeResults(results: DataModel[]) {
      this.homeResults = results
    },
    setHomeQuery(query: Record<string, string | number>) {
      this.homeQuery = query
    },
    clearResults() {
      this.searchResults = {} as Record<string, DataModel[]>
    }
  }
})