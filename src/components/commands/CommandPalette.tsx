import { useEffect, useState, useCallback, useRef } from 'react'
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command'
import type { Desk, Note } from '@/types'
import type { SearchResult, NoteTemplate } from '@/lib/tauri'
import { searchNotes, getTemplates } from '@/lib/tauri'
import {
  FilePlus,
  FolderOpen,
  RefreshCw,
  Download,
  FileText,
  Search,
  FileDown,
  Trash2,
  LayoutTemplate,
} from 'lucide-react'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  desk: Desk | null
  selectedNote: Note | null
  onCreateNote: (title: string, templateContent?: string) => Promise<string | null>
  onOpenDesk: () => void
  onRefreshDesk: () => void
  onExportDesk: () => void
  onExportPdf: () => void
  onFocusNote: (filename: string) => void
  onOpenBin: () => void
}

export function CommandPalette({
  open,
  onOpenChange,
  desk,
  selectedNote,
  onCreateNote,
  onOpenDesk,
  onRefreshDesk,
  onExportDesk,
  onExportPdf,
  onFocusNote,
  onOpenBin,
}: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [templates, setTemplates] = useState<NoteTemplate[]>([])
  const searchTimeoutRef = useRef<number | null>(null)

  // Load templates when desk changes
  useEffect(() => {
    if (desk) {
      getTemplates(desk.path).then(setTemplates).catch(console.error)
    }
  }, [desk?.path])

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSearchResults([])
      setNewNoteTitle('')
    }
  }, [open])

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (!desk || searchQuery.length < 2) {
      setSearchResults([])
      return
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      setIsSearching(true)
      try {
        const results = await searchNotes(desk.path, searchQuery)
        setSearchResults(results)
      } catch (err) {
        console.error('Search failed:', err)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [desk, searchQuery])

  const handleCreateNote = useCallback(async (templateContent?: string) => {
    if (!desk || !newNoteTitle.trim()) return
    
    setIsCreating(true)
    const filename = await onCreateNote(newNoteTitle.trim(), templateContent)
    if (filename) {
      setNewNoteTitle('')
      onOpenChange(false)
    }
    setIsCreating(false)
  }, [desk, newNoteTitle, onCreateNote, onOpenChange])

  const handleSearchResultSelect = useCallback((result: SearchResult) => {
    onFocusNote(result.filename)
    onOpenChange(false)
  }, [onFocusNote, onOpenChange])

  const notes = desk ? Array.from(desk.notes.values()).filter(n => !n.meta.deleted) : []

  const filteredNotes = searchQuery.length > 0 
    ? notes.filter(n => n.filename.toLowerCase().includes(searchQuery.toLowerCase()))
    : notes

  const showSearchResults = searchQuery.length >= 2 && searchResults.length > 0
  const showNotes = !showSearchResults && filteredNotes.length > 0

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search notes or type a command..." 
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? 'Searching...' : 'No results found.'}
        </CommandEmpty>

        {showSearchResults && (
          <CommandGroup heading="Search Results">
            {searchResults.map((result, idx) => (
              <CommandItem
                key={`${result.filename}-${result.lineNumber}-${idx}`}
                value={`search-${result.filename}-${result.lineNumber}`}
                onSelect={() => handleSearchResultSelect(result)}
              >
                <Search className="h-4 w-4 shrink-0" />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-xs text-gray-500">
                    {result.filename}:{result.lineNumber}
                  </span>
                  <span className="truncate text-sm">
                    {result.snippet}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showSearchResults && <CommandSeparator />}

        {showNotes && (
          <CommandGroup heading="Notes">
            {filteredNotes.slice(0, 10).map((note) => (
              <CommandItem
                key={note.filename}
                value={`note-${note.filename}`}
                onSelect={() => {
                  onFocusNote(note.filename)
                  onOpenChange(false)
                }}
              >
                <FileText className="h-4 w-4" />
                <span>{note.filename.replace('.md', '')}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {showNotes && <CommandSeparator />}

        {!showSearchResults && (
          <CommandGroup heading="Actions">
            {desk && newNoteTitle.trim() && (
              <>
                <CommandItem
                  value="create-note"
                  onSelect={() => handleCreateNote()}
                  disabled={isCreating}
                >
                  <FilePlus className="h-4 w-4" />
                  <span>Create "{newNoteTitle.trim()}" (Blank)</span>
                </CommandItem>
                
                {templates.map((template) => (
                  <CommandItem
                    key={`template-${template.name}`}
                    value={`create-from-template-${template.name}`}
                    onSelect={() => handleCreateNote(template.content)}
                    disabled={isCreating}
                  >
                    <LayoutTemplate className="h-4 w-4" />
                    <span>Create "{newNoteTitle.trim()}" ({template.name})</span>
                  </CommandItem>
                ))}
              </>
            )}
            
            <CommandItem
              value="open-desk"
              onSelect={() => {
                onOpenDesk()
                onOpenChange(false)
              }}
            >
              <FolderOpen className="h-4 w-4" />
              <span>Open Desk...</span>
            </CommandItem>

            {desk && (
              <>
                <CommandItem
                  value="refresh-desk"
                  onSelect={() => {
                    onRefreshDesk()
                    onOpenChange(false)
                  }}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh Desk</span>
                </CommandItem>

                <CommandItem
                  value="export-desk"
                  onSelect={() => {
                    onExportDesk()
                    onOpenChange(false)
                  }}
                >
                  <Download className="h-4 w-4" />
                  <span>Export Desk as ZIP</span>
                </CommandItem>

                {selectedNote && (
                  <CommandItem
                    value="export-pdf"
                    onSelect={() => {
                      onExportPdf()
                      onOpenChange(false)
                    }}
                  >
                    <FileDown className="h-4 w-4" />
                    <span>Export "{selectedNote.filename.replace('.md', '')}" as PDF</span>
                  </CommandItem>
                )}

                <CommandItem
                  value="bin"
                  onSelect={() => {
                    onOpenBin()
                    onOpenChange(false)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Bin</span>
                </CommandItem>
              </>
            )}
          </CommandGroup>
        )}
      </CommandList>

      {desk && !showSearchResults && (
        <div className="border-t p-2">
          <input
            id="new-note-input"
            type="text"
            placeholder="New note title... (Press Enter to create blank note)"
            className="w-full px-2 py-1 text-sm border rounded"
            value={newNoteTitle}
            onChange={(e) => setNewNoteTitle(e.target.value)}
          />
        </div>
      )}
    </CommandDialog>
  )
}
