import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react'
import { TransformWrapper, TransformComponent, useTransformEffect } from 'react-zoom-pan-pinch'
import type { Desk, CanvasState } from '@/types'
import { BASE_NOTE_WIDTH, BASE_NOTE_HEIGHT } from '@/types'
import { Note } from './Note'
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CanvasProps {
    desk: Desk
    editingNote: string | null
    selectedNotes: Set<string>
    onNoteSelect: (filename: string, addToSelection: boolean) => void
    onNoteEdit: (filename: string) => void
    onNoteEditEnd: () => void
    onNotePositionChange: (filename: string, x: number, y: number) => void
    onNoteScaleChange: (filename: string, scale: number) => void
    onNoteDelete: (filename: string) => void
    onNoteContentChange: (filename: string, content: string) => void
    onCanvasChange: (canvas: Partial<CanvasState>) => void
    onDeselectNote: () => void
}

export interface CanvasRef {
    focusNote: (filename: string) => void
}

function TransformListener({ onCanvasChange }: { onCanvasChange: (canvas: Partial<CanvasState>) => void }) {
    useTransformEffect(({ state }) => {
        onCanvasChange({
            zoom: state.scale,
            pan: { x: state.positionX, y: state.positionY },
        })
    })
    return null
}

export const Canvas = forwardRef<CanvasRef, CanvasProps>(function Canvas({
    desk,
    editingNote,
    selectedNotes,
    onNoteSelect,
    onNoteEdit,
    onNoteEditEnd,
    onNotePositionChange,
    onNoteScaleChange,
    onNoteDelete,
    onNoteContentChange,
    onCanvasChange,
    onDeselectNote,
}, ref) {
    const transformRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    const notes = Array.from(desk.notes.values()).filter(n => !n.meta.deleted)

    const focusNote = useCallback((filename: string) => {
        const note = desk.notes.get(filename)
        if (!note || !containerRef.current || !transformRef.current) return

        const noteWidth = BASE_NOTE_WIDTH * note.meta.scale
        const noteHeight = BASE_NOTE_HEIGHT * note.meta.scale
        const viewportWidth = containerRef.current.offsetWidth
        const viewportHeight = containerRef.current.offsetHeight

        const padding = 50
        const scaleX = (viewportWidth - padding * 2) / noteWidth
        const scaleY = (viewportHeight - padding * 2) / noteHeight
        const newZoom = Math.min(scaleX, scaleY, 1.5)

        const noteCenterX = note.meta.position.x + noteWidth / 2
        const noteCenterY = note.meta.position.y + noteHeight / 2

        const newPanX = viewportWidth / 2 - noteCenterX * newZoom
        const newPanY = viewportHeight / 2 - noteCenterY * newZoom

        transformRef.current.setTransform(newPanX, newPanY, newZoom)
    }, [desk])

    useImperativeHandle(ref, () => ({
        focusNote,
    }), [focusNote])

    const handleZoomIn = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.zoomIn()
        }
    }, [])

    const handleZoomOut = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.zoomOut()
        }
    }, [])

    const handleResetView = useCallback(() => {
        if (transformRef.current) {
            transformRef.current.resetTransform()
        }
    }, [])

    const handleBackgroundClick = useCallback(() => {
        if (editingNote) {
            onNoteEditEnd()
        }
        onDeselectNote()
    }, [editingNote, onNoteEditEnd, onDeselectNote])

    return (
        <div ref={containerRef} className="relative w-full h-full bg-gray-100">
            <TransformWrapper
                ref={transformRef}
                initialScale={desk.canvas.zoom}
                initialPositionX={desk.canvas.pan.x}
                initialPositionY={desk.canvas.pan.y}
                minScale={0.25}
                maxScale={2}
                centerOnInit={false}
                limitToBounds={false}
                wheel={{ step: 0.1 }}
                doubleClick={{ disabled: true }}
            >
                <TransformListener onCanvasChange={onCanvasChange} />

                <TransformComponent
                    wrapperStyle={{ width: '100%', height: '100%' }}
                    contentStyle={{
                        width: '100%',
                        height: '100%',
                        position: 'relative',
                    }}
                >
                    <div
                        className="absolute inset-0 cursor-grab active:cursor-grabbing"
                        onClick={handleBackgroundClick}
                    />

                    <div className="absolute" style={{ width: 5000, height: 5000, left: 0, top: 0 }}>
                        {notes.map((note) => (
                            <Note
                                key={note.filename}
                                note={note}
                                deskPath={desk.path}
                                isEditing={editingNote === note.filename}
                                isSelected={selectedNotes.has(note.filename)}
                                onSelect={(addToSelection) => onNoteSelect(note.filename, addToSelection)}
                                onEdit={() => onNoteEdit(note.filename)}
                                onEditEnd={onNoteEditEnd}
                                onPositionChange={(x, y) => onNotePositionChange(note.filename, x, y)}
                                onScaleChange={(scale) => onNoteScaleChange(note.filename, scale)}
                                onDelete={() => onNoteDelete(note.filename)}
                                onContentChange={(content) => onNoteContentChange(note.filename, content)}
                                zoom={desk.canvas.zoom}
                            />
                        ))}
                    </div>
                </TransformComponent>

                <div className="absolute bottom-4 right-4 flex gap-2">
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleZoomIn}
                        title="Zoom In"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="secondary"
                        size="icon"
                        onClick={handleResetView}
                        title="Reset View"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>

                <div className="absolute bottom-4 left-4 text-xs text-gray-500">
                    {Math.round(desk.canvas.zoom * 100)}%
                </div>
            </TransformWrapper>
        </div>
    )
})
