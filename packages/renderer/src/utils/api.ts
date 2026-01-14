import { getServerPort } from './utils'


class APIManager {
  serverPort: number | null
  constructor(serverPort: number | null) {
    this.serverPort = serverPort
  }
  async post(endpoint: string, data: any): Promise<any> {
    try {
      if (!this.serverPort) {
        this.serverPort = await getServerPort()
      }
      const url = `http://127.0.0.1:${this.serverPort}${endpoint}`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }
  async get(endpoint: string): Promise<any> {
    try {
      if (!this.serverPort) {
        this.serverPort = await getServerPort()
      }
      const url = `http://127.0.0.1:${this.serverPort}${endpoint}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('API request error:', error)
      throw error
    }
  }
}

export const apiManager = new APIManager(null)
