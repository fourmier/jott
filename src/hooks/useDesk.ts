import { useState, useCallback, useEffect, useRef } from 'react'
import type { Desk, Note, NoteMeta, DeskData, CanvasState } from '@/types'
import { DEFAULT_CANVAS_STATE, DESK_JSON_VERSION } from '@/types'
import * as tauri from '@/lib/tauri'

export function useDesk() {
  const [desk, setDesk] = useState<Desk | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const saveTimeoutRef = useRef<number | null>(null)

  const saveDeskData = useCallback(async (deskToSave: Desk) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = window.setTimeout(async () => {
      const deskData: DeskData = {
        version: DESK_JSON_VERSION,
        notes: Object.fromEntries(
          Array.from(deskToSave.notes.entries()).map(([filename, note]) => [
            filename,
            note.meta,
          ])
        ),
        canvas: deskToSave.canvas,
      }
      
      try {
        await tauri.saveDeskJson(deskToSave.path, deskData)
      } catch (err) {
        console.error('Failed to save desk data:', err)
      }
    }, 500)
  }, [])

  const setDeskState = useCallback((updater: (prev: Desk | null) => Desk | null) => {
    setDesk(updater)
  }, [])

  const openDeskAtPath = useCallback(async (path: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const result = await tauri.openDesk(path)
      
      const notesMap = new Map<string, Note>()
      for (const noteFile of result.notes) {
        notesMap.set(noteFile.filename, {
          filename: noteFile.filename,
          content: noteFile.content,
          meta: noteFile.meta,
        })
      }
      
      setDesk({
        path,
        name: result.name,
        notes: notesMap,
        canvas: result.desk_data.canvas || DEFAULT_CANVAS_STATE,
      })
      
      await tauri.setLastDeskPath(path)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open desk')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const openDesk = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const path = await tauri.openDeskDialog()
      if (!path) {
        setIsLoading(false)
        return false
      }
      
      const result = await tauri.openDesk(path)
      
      const notesMap = new Map<string, Note>()
      for (const noteFile of result.notes) {
        notesMap.set(noteFile.filename, {
          filename: noteFile.filename,
          content: noteFile.content,
          meta: noteFile.meta,
        })
      }
      
      setDesk({
        path,
        name: result.name,
        notes: notesMap,
        canvas: result.desk_data.canvas || DEFAULT_CANVAS_STATE,
      })
      
      await tauri.setLastDeskPath(path)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open desk')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createDesk = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const path = await tauri.createDeskDialog()
      if (!path) {
        setIsLoading(false)
        return false
      }
      
      const name = await tauri.createDesk(path)
      
      setDesk({
        path,
        name,
        notes: new Map(),
        canvas: DEFAULT_CANVAS_STATE,
      })
      
      await tauri.setLastDeskPath(path)
      
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create desk')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const closeDesk = useCallback(() => {
    setDesk(null)
    setError(null)
  }, [])

  const refreshDesk = useCallback(async () => {
    if (!desk) return
    
    setIsLoading(true)
    try {
      const result = await tauri.openDesk(desk.path)
      
      const notesMap = new Map<string, Note>()
      for (const noteFile of result.notes) {
        notesMap.set(noteFile.filename, {
          filename: noteFile.filename,
          content: noteFile.content,
          meta: noteFile.meta,
        })
      }
      
      setDesk(prev => prev ? {
        ...prev,
        notes: notesMap,
        canvas: result.desk_data.canvas || DEFAULT_CANVAS_STATE,
      } : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh desk')
    } finally {
      setIsLoading(false)
    }
  }, [desk])

  const updateCanvas = useCallback((canvas: Partial<CanvasState>) => {
    setDesk(prev => {
      if (!prev) return null
      const updated = {
        ...prev,
        canvas: { ...prev.canvas, ...canvas },
      }
      saveDeskData(updated)
      return updated
    })
  }, [saveDeskData])

  const updateNoteMeta = useCallback((filename: string, meta: Partial<NoteMeta>) => {
    setDesk(prev => {
      if (!prev) return null
      const note = prev.notes.get(filename)
      if (!note) return prev
      
      const updatedNote = {
        ...note,
        meta: { ...note.meta, ...meta },
      }
      
      const updated = {
        ...prev,
        notes: new Map(prev.notes).set(filename, updatedNote),
      }
      
      saveDeskData(updated)
      return updated
    })
  }, [saveDeskData])

  const updateNoteContentInDesk = useCallback((filename: string, content: string) => {
    setDesk(prev => {
      if (!prev) return null
      const note = prev.notes.get(filename)
      if (!note) return prev
      
      const updatedNote = {
        ...note,
        content,
      }
      
      return {
        ...prev,
        notes: new Map(prev.notes).set(filename, updatedNote),
      }
    })
  }, [])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    desk,
    isLoading,
    error,
    openDesk,
    openDeskAtPath,
    createDesk,
    closeDesk,
    refreshDesk,
    updateCanvas,
    updateNoteMeta,
    updateNoteContentInDesk,
    saveDeskData,
    setDeskState,
  }
}

export function useNotes(desk: Desk | null, updateNoteMeta: (filename: string, meta: Partial<NoteMeta>) => void) {
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const saveTimeoutsRef = useRef<Map<string, number>>(new Map())

  const createNote = useCallback(async (title: string, templateContent?: string): Promise<string | null> => {
    if (!desk) return null
    
    try {
      const filename = await tauri.createNote(desk.path, title, templateContent)
      return filename
    } catch (err) {
      console.error('Failed to create note:', err)
      return null
    }
  }, [desk])

  const updateNoteContent = useCallback((filename: string, content: string) => {
    const timeoutId = saveTimeoutsRef.current.get(filename)
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    
    const newTimeoutId = window.setTimeout(async () => {
      if (desk) {
        try {
          await tauri.writeNote(desk.path, filename, content)
        } catch (err) {
          console.error('Failed to save note:', err)
        }
      }
    }, 500)
    
    saveTimeoutsRef.current.set(filename, newTimeoutId)
  }, [desk])

  const deleteNote = useCallback(async (filename: string) => {
    if (!desk) return false
    
    try {
      updateNoteMeta(filename, { deleted: true })
      return true
    } catch (err) {
      console.error('Failed to delete note:', err)
      return false
    }
  }, [desk, updateNoteMeta])

  const renameNote = useCallback(async (oldFilename: string, newTitle: string): Promise<string | null> => {
    if (!desk) return null
    
    try {
      const newFilename = await tauri.renameNote(desk.path, oldFilename, newTitle)
      return newFilename
    } catch (err) {
      console.error('Failed to rename note:', err)
      return null
    }
  }, [desk])

  const bringToFront = useCallback((filename: string) => {
    if (!desk) return
    
    const maxZ = Math.max(...Array.from(desk.notes.values()).map(n => n.meta.zIndex))
    updateNoteMeta(filename, { zIndex: maxZ + 1 })
  }, [desk, updateNoteMeta])

  const startEditing = useCallback((filename: string) => {
    setEditingNote(filename)
  }, [])

  const stopEditing = useCallback(() => {
    setEditingNote(null)
  }, [])

  useEffect(() => {
    return () => {
      saveTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  return {
    editingNote,
    createNote,
    updateNoteContent,
    deleteNote,
    renameNote,
    bringToFront,
    startEditing,
    stopEditing,
  }
}
