// Storage utility to handle localStorage quota issues

export class StorageManager {
  private static getStorageSize(): number {
    let total = 0
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return total
  }

  private static getStorageSizeMB(): number {
    return this.getStorageSize() / (1024 * 1024)
  }

  static safeSetItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value)
      return true
    } catch (error) {
      console.warn(`localStorage quota exceeded. Current size: ${this.getStorageSizeMB().toFixed(2)}MB`)
      
      // Try to free up space by removing old items
      this.cleanup()
      
      // Try again
      try {
        localStorage.setItem(key, value)
        return true
      } catch (secondError) {
        console.error("Could not store item even after cleanup")
        return false
      }
    }
  }

  static cleanup(): void {
    try {
      // Remove old visualization files first (they're usually largest)
      const keysToRemove: string[] = []
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('viz_')) {
          keysToRemove.push(key)
        }
      }
      
      // Remove oldest visualization files first
      keysToRemove.sort().slice(0, Math.max(1, keysToRemove.length - 5)).forEach(key => {
        localStorage.removeItem(key)
      })
      
      console.log(`Cleaned up ${keysToRemove.length} old visualization files`)
    } catch (error) {
      console.error("Error during storage cleanup:", error)
    }
  }

  static getStorageInfo(): { sizeMB: number; itemCount: number } {
    return {
      sizeMB: this.getStorageSizeMB(),
      itemCount: localStorage.length
    }
  }
}
