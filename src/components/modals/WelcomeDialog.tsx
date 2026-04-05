import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FolderOpen, Plus } from 'lucide-react'

interface WelcomeDialogProps {
  open: boolean
  onOpenDesk: () => void
  onCreateDesk: () => void
  isLoading: boolean
}

export function WelcomeDialog({ open, onOpenDesk, onCreateDesk, isLoading }: WelcomeDialogProps) {
  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Jott</DialogTitle>
          <DialogDescription>
            Your infinite canvas for notes. Open an existing desk or create a new one to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={onOpenDesk}
            disabled={isLoading}
          >
            <FolderOpen className="h-5 w-5" />
            <span>Open Existing Desk</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
            onClick={onCreateDesk}
            disabled={isLoading}
          >
            <Plus className="h-5 w-5" />
            <span>Create New Desk</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center pt-4">
          A desk is a folder containing your markdown notes and canvas layout.
        </p>
      </DialogContent>
    </Dialog>
  )
}
