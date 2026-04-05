import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RefreshCw, FolderOpen, Download, Command, FileDown, Trash2, Archive } from 'lucide-react'

interface HeaderProps {
  deskName: string | null
  hasSelectedNote: boolean
  selectedCount: number
  deletedCount: number
  onRefresh: () => void
  onOpenDesk: () => void
  onExport: () => void
  onExportPdf: () => void
  onDeleteSelected: () => void
  onOpenBin: () => void
  isLoading: boolean
}

export function Header({
  deskName,
  hasSelectedNote,
  selectedCount,
  deletedCount,
  onRefresh,
  onOpenDesk,
  onExport,
  onExportPdf,
  onDeleteSelected,
  onOpenBin,
  isLoading,
}: HeaderProps) {
  return (
    <header className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-lg">Jott</h1>
        {deskName && (
          <>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600">{deskName}</span>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || !deskName}
          title="Refresh Desk"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenDesk}
          disabled={isLoading}
          title="Open Desk"
        >
          <FolderOpen className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExport}
          disabled={isLoading || !deskName}
          title="Export Desk as ZIP"
        >
          <Download className="h-4 w-4" />
        </Button>

        {hasSelectedNote && (
          <>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportPdf}
              disabled={isLoading}
              title="Export as PDF"
            >
              <FileDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDeleteSelected}
              disabled={isLoading}
              title={`Move ${selectedCount} ${selectedCount === 1 ? 'note' : 'notes'} to bin`}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}

        <Separator orientation="vertical" className="h-6 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenBin}
          disabled={isLoading || !deskName}
          title={`Bin${deletedCount > 0 ? ` (${deletedCount} items)` : ''}`}
          className="relative"
        >
          <Archive className="h-4 w-4" />
          {deletedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {deletedCount}
            </span>
          )}
        </Button>

        <div className="flex items-center gap-1 text-xs text-gray-500 ml-2">
          <Command className="h-3 w-3" />
          <span>K</span>
        </div>
      </div>
    </header>
  )
}
