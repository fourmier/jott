import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Trash2, RotateCcw } from 'lucide-react'
import type { Desk } from '@/types'

interface BinDialogProps {
  desk: Desk | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestore: (filename: string) => void
  onPermanentDelete: (filename: string) => void
}

export function BinDialog({ desk, open, onOpenChange, onRestore, onPermanentDelete }: BinDialogProps) {
  const deletedNotes = desk 
    ? Array.from(desk.notes.values()).filter(n => n.meta.deleted)
    : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Bin
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {deletedNotes.length === 0 ? (
            <p className="text-center text-gray-500 py-8">
              The bin is empty.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {deletedNotes.map(note => (
                <div
                  key={note.filename}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <span className="text-sm truncate flex-1 mr-2">
                    {note.filename.replace('.md', '')}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRestore(note.filename)}
                      title="Restore note"
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onPermanentDelete(note.filename)}
                      title="Delete permanently"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {deletedNotes.length > 0 && (
          <p className="text-xs text-gray-500 text-center">
            Restored notes will reappear on the canvas. Permanently deleted notes cannot be recovered.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
