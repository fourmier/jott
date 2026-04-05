import { useState, useRef, useCallback } from 'react'
import type { Note as NoteType } from '@/types'
import { BASE_NOTE_WIDTH, BASE_NOTE_HEIGHT } from '@/types'
import { NoteEditor } from './NoteEditor'
import { NotePreview } from './NotePreview'
import { X, GripVertical, Maximize2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DragStart {
  x: number
  y: number
  noteX: number
  noteY: number
}

interface ResizeStart {
  x: number
  y: number
  startScale: number
}

interface NoteProps {
  note: NoteType
  deskPath: string
  isEditing: boolean
  isSelected: boolean
  onSelect: (addToSelection: boolean) => void
  onEdit: () => void
  onEditEnd: () => void
  onPositionChange: (x: number, y: number) => void
  onScaleChange: (scale: number) => void
  onDelete: () => void
  onContentChange: (content: string) => void
  zoom: number
}

export function Note({
  note,
  deskPath,
  isEditing,
  isSelected,
  onSelect,
  onEdit,
  onEditEnd,
  onPositionChange,
  onScaleChange,
  onDelete,
  onContentChange,
  zoom,
}: NoteProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showControls, setShowControls] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const dragStartRef = useRef<DragStart>({ x: 0, y: 0, noteX: 0, noteY: 0 })
  const resizeStartRef = useRef<ResizeStart>({ x: 0, y: 0, startScale: 1 })

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isEditing) return
    
    e.preventDefault()
    e.stopPropagation()
    
    onSelect(e.shiftKey)
    setIsDragging(true)
    
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      noteX: note.meta.position.x,
      noteY: note.meta.position.y,
    }
    
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [isEditing, onSelect, note.meta.position])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging && !isResizing) return

    if (isDragging) {
      const dx = (e.clientX - dragStartRef.current.x) / zoom
      const dy = (e.clientY - dragStartRef.current.y) / zoom
      
      onPositionChange(
        dragStartRef.current.noteX + dx,
        dragStartRef.current.noteY + dy
      )
    }

    if (isResizing) {
      const dx = e.clientX - resizeStartRef.current.x
      const newWidth = BASE_NOTE_WIDTH * resizeStartRef.current.startScale + dx / zoom
      const newScale = Math.max(0.5, Math.min(2, newWidth / BASE_NOTE_WIDTH))
      onScaleChange(newScale)
    }
  }, [isDragging, isResizing, zoom, onPositionChange, onScaleChange])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false)
    setIsResizing(false)
    ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
  }, [])

  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    setIsResizing(true)
    resizeStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startScale: note.meta.scale,
    }
    
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [note.meta.scale])

  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setShowDeleteDialog(true)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    setShowDeleteDialog(false)
    onDelete()
  }, [onDelete])

  const width = BASE_NOTE_WIDTH * note.meta.scale
  const minHeight = BASE_NOTE_HEIGHT * note.meta.scale

  return (
    <>
      <div
        className="absolute select-none"
        style={{
          left: note.meta.position.x,
          top: note.meta.position.y,
          width,
          minHeight,
          zIndex: note.meta.zIndex,
        }}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <div
          className={`
            relative w-full bg-white rounded-lg shadow-lg
            border border-gray-200 overflow-hidden
            transition-all duration-150 flex flex-col
            ${isDragging ? 'shadow-xl cursor-grabbing' : ''}
            ${isEditing ? 'ring-2 ring-blue-500' : ''}
            ${isSelected && !isEditing ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          `}
        >
          <div
            className="flex-shrink-0 h-8 bg-gray-50 border-b border-gray-200
              flex items-center px-2 gap-2 cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onClick={() => {
              if (isEditing) {
                onEditEnd()
              }
            }}
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 truncate flex-1">
              {note.filename.replace('.md', '')}
            </span>
            {showControls && !isEditing && (
              <button
                onClick={handleDeleteClick}
                className="p-1 hover:bg-red-100 rounded transition-colors"
                title="Delete note"
              >
                <X className="h-3 w-3 text-gray-500 hover:text-red-500" />
              </button>
            )}
          </div>

          <div 
            className="flex-1 min-h-0"
            onPointerDown={(e) => {
              if (isEditing) {
                e.stopPropagation()
              }
            }}
            onMouseDown={(e) => {
              if (isEditing) {
                e.stopPropagation()
              }
            }}
          >
            {isEditing ? (
              <NoteEditor
                content={note.content}
                deskPath={deskPath}
                onChange={onContentChange}
                onBlur={onEditEnd}
              />
            ) : (
              <NotePreview 
                content={note.content} 
                deskPath={deskPath} 
                onClick={() => onSelect(false)}
                onShiftClick={(shiftKey) => onSelect(shiftKey)}
                onDoubleClick={onEdit}
              />
            )}
          </div>

          {showControls && !isEditing && (
            <div
              className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize
                flex items-center justify-center text-gray-400 hover:text-gray-600"
              onPointerDown={handleResizeStart}
              title="Resize note"
            >
              <Maximize2 className="h-3 w-3 rotate-90" />
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{note.filename.replace('.md', '')}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
