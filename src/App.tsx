import { useState, useCallback, useEffect, useRef } from 'react'
import { useDesk, useNotes } from '@/hooks/useDesk'
import { WelcomeDialog } from '@/components/modals/WelcomeDialog'
import { PrintPreviewDialog } from '@/components/modals/PrintPreviewDialog'
import { BinDialog } from '@/components/modals/BinDialog'
import { Canvas, type CanvasRef } from '@/components/canvas/Canvas'
import { CommandPalette } from '@/components/commands/CommandPalette'
import { Header } from '@/components/layout/Header'
import type { CanvasState } from '@/types'
import * as tauri from '@/lib/tauri'

function App() {
  const {
    desk,
    isLoading,
    error,
    openDesk,
    openDeskAtPath,
    createDesk,
    refreshDesk,
    updateCanvas,
    updateNoteMeta,
    updateNoteContentInDesk,
    saveDeskData,
    setDeskState,
  } = useDesk()

  const {
    editingNote,
    createNote,
    updateNoteContent,
    bringToFront,
    startEditing,
    stopEditing,
  } = useNotes(desk, updateNoteMeta)

  const [showWelcome, setShowWelcome] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [showBinDialog, setShowBinDialog] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notesToDelete, setNotesToDelete] = useState<string[]>([])
  const canvasRef = useRef<CanvasRef>(null)

  useEffect(() => {
    const initLastDesk = async () => {
      try {
        const lastPath = await tauri.getLastDeskPath()
        if (lastPath) {
          const success = await openDeskAtPath(lastPath)
          if (!success) {
            setShowWelcome(true)
          }
        } else {
          setShowWelcome(true)
        }
      } catch (err) {
        setShowWelcome(true)
      } finally {
        setIsInitializing(false)
      }
    }
    
    initLastDesk()
  }, [openDeskAtPath])

  useEffect(() => {
    const onFocus = async () => {
      if (desk) {
        await refreshDesk()
      }
    }
    
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [desk, refreshDesk])

  // Keyboard shortcuts handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+N (or Ctrl+N) to open command palette for creating note
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        setShowCommandPalette(true)
        // Focus the new note input after the command palette opens
        setTimeout(() => {
          const input = document.getElementById('new-note-input')
          if (input) {
            input.focus()
          }
        }, 100)
        return
      }

      if (e.key === 'Escape') {
        // If editing, stop editing first
        if (editingNote) {
          stopEditing()
        }
        // Always deselect on escape
        if (selectedNotes.size > 0) {
          setSelectedNotes(new Set())
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [editingNote, stopEditing, selectedNotes.size])

  const handleOpenDesk = useCallback(async () => {
    const success = await openDesk()
    if (success) {
      setShowWelcome(false)
    }
  }, [openDesk])

  const handleCreateDesk = useCallback(async () => {
    const success = await createDesk()
    if (success) {
      setShowWelcome(false)
    }
  }, [createDesk])

  const handleCreateNote = useCallback(async (title: string, templateContent?: string) => {
    if (!desk) return null
    
    const filename = await createNote(title, templateContent)
    if (filename) {
      await refreshDesk()
    }
    return filename
  }, [desk, createNote, refreshDesk])

  const handleNotePositionChange = useCallback((filename: string, x: number, y: number) => {
    updateNoteMeta(filename, { position: { x, y } })
  }, [updateNoteMeta])

  const handleNoteScaleChange = useCallback((filename: string, scale: number) => {
    updateNoteMeta(filename, { scale })
  }, [updateNoteMeta])

  const handleNoteDelete = useCallback(async (filename: string) => {
    if (!desk) return
    
    // updateNoteMeta already saves the desk data, so we don't need to call saveDeskData separately
    updateNoteMeta(filename, { deleted: true })
    setSelectedNotes(new Set())
  }, [desk, updateNoteMeta])

  const handleDeleteSelectedNotes = useCallback(async () => {
    if (!desk || notesToDelete.length === 0) return

    // updateNoteMeta already saves the desk data for each note, so we don't need to call saveDeskData separately
    for (const filename of notesToDelete) {
      const note = desk.notes.get(filename)
      if (note) {
        updateNoteMeta(filename, { deleted: true })
      }
    }

    setSelectedNotes(new Set())
    setShowDeleteConfirm(false)
    setNotesToDelete([])
  }, [desk, notesToDelete, updateNoteMeta])

  const initiateDeleteSelected = useCallback(() => {
    if (selectedNotes.size === 0) return
    setNotesToDelete(Array.from(selectedNotes))
    setShowDeleteConfirm(true)
  }, [selectedNotes])

  const handleNoteContentChange = useCallback((filename: string, content: string) => {
    updateNoteContent(filename, content)
    updateNoteContentInDesk(filename, content)
  }, [updateNoteContent, updateNoteContentInDesk])

  const handleFocusNote = useCallback((filename: string) => {
    if (!desk) return
    
    bringToFront(filename)
    
    setTimeout(() => {
      if (canvasRef.current) {
        canvasRef.current.focusNote(filename)
      }
    }, 50)
  }, [desk, bringToFront])

  const handleExportDesk = useCallback(async () => {
    if (!desk) return
    
    try {
      await tauri.exportDeskZip(desk.path)
    } catch (err) {
      console.error('Failed to export desk:', err)
    }
  }, [desk])

  const handleExportPdf = useCallback(() => {
    if (selectedNotes.size !== 1 || !desk) return
    
    setShowPrintPreview(true)
  }, [selectedNotes, desk])

  const handleNoteSelect = useCallback((filename: string, addToSelection: boolean) => {
    if (addToSelection) {
      setSelectedNotes(prev => {
        const next = new Set(prev)
        if (next.has(filename)) {
          next.delete(filename)
        } else {
          next.add(filename)
        }
        return next
      })
    } else {
      setSelectedNotes(new Set([filename]))
    }
    bringToFront(filename)
  }, [bringToFront])

  const handleDeselectNote = useCallback(() => {
    setSelectedNotes(new Set())
  }, [])

  const handleNoteEdit = useCallback((filename: string) => {
    startEditing(filename)
    bringToFront(filename)
    setSelectedNotes(new Set())
  }, [startEditing, bringToFront])

  const handleCanvasChange = useCallback((canvas: Partial<CanvasState>) => {
    updateCanvas(canvas)
  }, [updateCanvas])

  const handleRefreshDesk = useCallback(async () => {
    await refreshDesk()
  }, [refreshDesk])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      <Header
        deskName={desk?.name ?? null}
        hasSelectedNote={selectedNotes.size > 0}
        selectedCount={selectedNotes.size}
        deletedCount={desk ? Array.from(desk.notes.values()).filter(n => n.meta.deleted).length : 0}
        onRefresh={handleRefreshDesk}
        onOpenDesk={handleOpenDesk}
        onExport={handleExportDesk}
        onExportPdf={handleExportPdf}
        onDeleteSelected={initiateDeleteSelected}
        onOpenBin={() => setShowBinDialog(true)}
        isLoading={isLoading}
      />

      {desk ? (
        <Canvas
          ref={canvasRef}
          desk={desk}
          editingNote={editingNote}
          selectedNotes={selectedNotes}
          onNoteSelect={handleNoteSelect}
          onNoteEdit={handleNoteEdit}
          onNoteEditEnd={stopEditing}
          onNotePositionChange={handleNotePositionChange}
          onNoteScaleChange={handleNoteScaleChange}
          onNoteDelete={handleNoteDelete}
          onNoteContentChange={handleNoteContentChange}
          onCanvasChange={handleCanvasChange}
          onDeselectNote={handleDeselectNote}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">No desk open</p>
        </div>
      )}

      <WelcomeDialog
        open={showWelcome && !desk && !isInitializing}
        onOpenDesk={handleOpenDesk}
        onCreateDesk={handleCreateDesk}
        isLoading={isLoading}
      />

      <CommandPalette
        open={showCommandPalette}
        onOpenChange={setShowCommandPalette}
        desk={desk}
        selectedNote={selectedNotes.size === 1 ? desk?.notes.get(Array.from(selectedNotes)[0]) ?? null : null}
        onCreateNote={handleCreateNote}
        onOpenDesk={handleOpenDesk}
        onRefreshDesk={handleRefreshDesk}
        onExportDesk={handleExportDesk}
        onExportPdf={handleExportPdf}
        onFocusNote={handleFocusNote}
        onOpenBin={() => setShowBinDialog(true)}
      />

      <PrintPreviewDialog
        note={selectedNotes.size === 1 ? desk?.notes.get(Array.from(selectedNotes)[0]) ?? null : null}
        deskPath={desk?.path ?? null}
        open={showPrintPreview}
        onOpenChange={setShowPrintPreview}
      />

      <BinDialog
        desk={desk}
        open={showBinDialog}
        onOpenChange={setShowBinDialog}
        onRestore={(filename: string) => {
          if (desk) {
            const note = desk.notes.get(filename)
            if (note) {
              updateNoteMeta(filename, { deleted: false })
            }
          }
        }}
        onPermanentDelete={async (filename: string) => {
          if (desk) {
            await tauri.deleteNoteFile(desk.path, filename)
            // Remove from state and save the desk data to persist the deletion
            setDeskState(prev => {
              if (!prev) return null
              const newNotes = new Map(prev.notes)
              newNotes.delete(filename)
              return { ...prev, notes: newNotes }
            })
            // Save the updated desk data without the deleted note
            const newNotes = new Map(desk.notes)
            newNotes.delete(filename)
            await saveDeskData({ ...desk, notes: newNotes })
          }
        }}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Delete {notesToDelete.length} {notesToDelete.length === 1 ? 'note' : 'notes'}?</h3>
            <p className="text-gray-600 mb-4">
              This action cannot be undone. The {notesToDelete.length === 1 ? 'note will be moved to bin' : 'notes will be moved to bin'}.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setNotesToDelete([])
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSelectedNotes}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 left-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}
    </div>
  )
}

export default App
