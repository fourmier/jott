import { useEffect, useState, useRef } from 'react'
import { Printer, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Note } from '@/types'
import { preparePrintHtml } from '@/lib/printExport'

interface PrintPreviewDialogProps {
  note: Note | null
  deskPath: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrintPreviewDialog({
  note,
  deskPath,
  open,
  onOpenChange,
}: PrintPreviewDialogProps) {
  const [html, setHtml] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !note || !deskPath) {
      setHtml('')
      return
    }

    const loadContent = async () => {
      setIsLoading(true)
      try {
        const content = await preparePrintHtml(note.content, deskPath)
        setHtml(content)
      } catch (error) {
        console.error('Failed to prepare print content:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadContent()
  }, [open, note, deskPath])

  useEffect(() => {
    if (!open) return

    const handleAfterPrint = () => {
      onOpenChange(false)
    }

    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [open, onOpenChange])

  const handlePrint = () => {
    window.print()
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  const noteTitle = note?.filename.replace('.md', '') ?? ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="print-preview-dialog max-w-4xl h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="print-header px-6 py-4 border-b shrink-0">
          <DialogTitle className="text-xl">{noteTitle}</DialogTitle>
          <DialogDescription>
            Preview how your note will look when printed to PDF
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="print-content-wrapper flex-1">
          <div className="print-content p-8">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-500">
                Loading preview...
              </div>
            ) : (
              <div
                ref={contentRef}
                className="note-preview"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="print-footer px-6 py-4 border-t shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handlePrint} disabled={isLoading || !html}>
            <Printer className="h-4 w-4 mr-2" />
            Print to PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
