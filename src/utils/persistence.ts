// Persistence utility for draft data (localStorage/sessionStorage)

interface DraftData {
  id: string
  type: 'quiz' | 'form' | 'qa_question'
  data: any
  timestamp: number
  expiresAt: number
}

const DRAFT_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 hours

class PersistenceManager {
  private getStorageKey(type: string, id?: string): string {
    return `squiz_draft_${type}${id ? `_${id}` : ''}`
  }

  // Save draft data
  saveDraft(type: 'quiz' | 'form' | 'qa_question', data: any, id?: string): string {
    const draftId = id || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const storageKey = this.getStorageKey(type, draftId)
    
    const draftData: DraftData = {
      id: draftId,
      type,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + DRAFT_EXPIRY_TIME
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(draftData))
      console.log(`Draft saved: ${storageKey}`)
      return draftId
    } catch (error) {
      console.error('Failed to save draft:', error)
      // Fallback to sessionStorage if localStorage fails
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(draftData))
        return draftId
      } catch (sessionError) {
        console.error('Failed to save draft to sessionStorage:', sessionError)
        return draftId
      }
    }
  }

  // Load draft data
  loadDraft(type: 'quiz' | 'form' | 'qa_question', id: string): any | null {
    const storageKey = this.getStorageKey(type, id)
    
    try {
      // Try localStorage first
      let draftJson = localStorage.getItem(storageKey)
      
      // Fallback to sessionStorage
      if (!draftJson) {
        draftJson = sessionStorage.getItem(storageKey)
      }
      
      if (!draftJson) {
        return null
      }

      const draftData: DraftData = JSON.parse(draftJson)
      
      // Check if draft has expired
      if (Date.now() > draftData.expiresAt) {
        this.deleteDraft(type, id)
        return null
      }

      console.log(`Draft loaded: ${storageKey}`)
      return draftData.data
    } catch (error) {
      console.error('Failed to load draft:', error)
      return null
    }
  }

  // Delete specific draft
  deleteDraft(type: 'quiz' | 'form' | 'qa_question', id: string): void {
    const storageKey = this.getStorageKey(type, id)
    
    try {
      localStorage.removeItem(storageKey)
      sessionStorage.removeItem(storageKey)
      console.log(`Draft deleted: ${storageKey}`)
    } catch (error) {
      console.error('Failed to delete draft:', error)
    }
  }

  // Get all drafts for a specific type
  getAllDrafts(type: 'quiz' | 'form' | 'qa_question'): DraftData[] {
    const drafts: DraftData[] = []
    const prefix = `squiz_draft_${type}_`
    
    try {
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(prefix)) {
          const draftJson = localStorage.getItem(key)
          if (draftJson) {
            try {
              const draftData: DraftData = JSON.parse(draftJson)
              if (Date.now() <= draftData.expiresAt) {
                drafts.push(draftData)
              } else {
                // Clean up expired draft
                localStorage.removeItem(key)
              }
            } catch (parseError) {
              console.error('Failed to parse draft:', parseError)
              localStorage.removeItem(key) // Remove corrupted data
            }
          }
        }
      }
      
      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith(prefix)) {
          const draftJson = sessionStorage.getItem(key)
          if (draftJson) {
            try {
              const draftData: DraftData = JSON.parse(draftJson)
              if (Date.now() <= draftData.expiresAt) {
                // Avoid duplicates (prefer localStorage over sessionStorage)
                const existingDraft = drafts.find(d => d.id === draftData.id)
                if (!existingDraft) {
                  drafts.push(draftData)
                }
              } else {
                // Clean up expired draft
                sessionStorage.removeItem(key)
              }
            } catch (parseError) {
              console.error('Failed to parse draft:', parseError)
              sessionStorage.removeItem(key) // Remove corrupted data
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to get all drafts:', error)
    }
    
    return drafts.sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
  }

  // Clean up all expired drafts
  cleanupExpiredDrafts(): void {
    const currentTime = Date.now()
    const keysToDelete: { storage: 'local' | 'session', key: string }[] = []
    
    try {
      // Check localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('squiz_draft_')) {
          const draftJson = localStorage.getItem(key)
          if (draftJson) {
            try {
              const draftData: DraftData = JSON.parse(draftJson)
              if (currentTime > draftData.expiresAt) {
                keysToDelete.push({ storage: 'local', key })
              }
            } catch (parseError) {
              keysToDelete.push({ storage: 'local', key }) // Remove corrupted data
            }
          }
        }
      }
      
      // Check sessionStorage
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key && key.startsWith('squiz_draft_')) {
          const draftJson = sessionStorage.getItem(key)
          if (draftJson) {
            try {
              const draftData: DraftData = JSON.parse(draftJson)
              if (currentTime > draftData.expiresAt) {
                keysToDelete.push({ storage: 'session', key })
              }
            } catch (parseError) {
              keysToDelete.push({ storage: 'session', key }) // Remove corrupted data
            }
          }
        }
      }
      
      // Delete expired/corrupted drafts
      keysToDelete.forEach(({ storage, key }) => {
        if (storage === 'local') {
          localStorage.removeItem(key)
        } else {
          sessionStorage.removeItem(key)
        }
      })
      
      console.log(`Cleaned up ${keysToDelete.length} expired/corrupted drafts`)
    } catch (error) {
      console.error('Failed to cleanup expired drafts:', error)
    }
  }

  // Check if draft exists
  hasDraft(type: 'quiz' | 'form' | 'qa_question', id: string): boolean {
    const storageKey = this.getStorageKey(type, id)
    return localStorage.getItem(storageKey) !== null || sessionStorage.getItem(storageKey) !== null
  }

  // Auto-save functionality with debounce
  private autoSaveTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  autoSaveDraft(
    type: 'quiz' | 'form' | 'qa_question', 
    data: any, 
    id: string, 
    delay: number = 2000
  ): void {
    const timeoutKey = `${type}_${id}`
    
    // Clear existing timeout
    const existingTimeout = this.autoSaveTimeouts.get(timeoutKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      this.saveDraft(type, data, id)
      this.autoSaveTimeouts.delete(timeoutKey)
    }, delay)
    
    this.autoSaveTimeouts.set(timeoutKey, timeout)
  }
}

// Create singleton instance
const persistenceManager = new PersistenceManager()

// Clean up expired drafts on initialization
persistenceManager.cleanupExpiredDrafts()

// Clean up expired drafts periodically (every 30 minutes)
setInterval(() => {
  persistenceManager.cleanupExpiredDrafts()
}, 30 * 60 * 1000)

export default persistenceManager

// Convenience hooks for React components
export const useDraftPersistence = () => {
  return {
    saveDraft: persistenceManager.saveDraft.bind(persistenceManager),
    loadDraft: persistenceManager.loadDraft.bind(persistenceManager),
    deleteDraft: persistenceManager.deleteDraft.bind(persistenceManager),
    getAllDrafts: persistenceManager.getAllDrafts.bind(persistenceManager),
    hasDraft: persistenceManager.hasDraft.bind(persistenceManager),
    autoSaveDraft: persistenceManager.autoSaveDraft.bind(persistenceManager)
  }
}