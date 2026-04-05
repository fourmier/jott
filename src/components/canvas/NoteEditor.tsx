import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorState, type Extension } from '@codemirror/state'
import * as tauri from '@/lib/tauri'
import { resizeImage } from '@/lib/imageUtils'

interface NoteEditorProps {
  content: string
  deskPath: string
  onChange: (content: string) => void
  onBlur: () => void
}

export function NoteEditor({ content, deskPath, onChange, onBlur }: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!editorRef.current || viewRef.current) return

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: content,
      extensions: [basicSetup, markdown(), updateListener as Extension],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    view.dom.addEventListener('blur', onBlur)
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onBlur()
      }
    }
    view.dom.addEventListener('keydown', handleKeyDown)

    return () => {
      view.dom.removeEventListener('blur', onBlur)
      view.dom.removeEventListener('keydown', handleKeyDown)
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    if (viewRef.current) {
      const currentContent = viewRef.current.state.doc.toString()
      if (currentContent !== content) {
        viewRef.current.dispatch({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
        })
      }
    }
  }, [content])

  const insertImageMarkdown = async (relativePath: string) => {
    if (!viewRef.current) return
    
    const view = viewRef.current
    const doc = view.state.doc
    const selection = view.state.selection.main
    const pos = selection.empty 
      ? (doc.lineAt(doc.length).from === doc.length ? doc.length : doc.length) 
      : selection.to
    
    const markdown = `\n![](${relativePath})\n`
    
    view.dispatch({
      changes: { from: pos, to: pos, insert: markdown },
      selection: { anchor: pos + markdown.length },
    })
    
    view.focus()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!deskPath) return
    
    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    for (const file of imageFiles) {
      try {
        const { base64, extension } = await resizeImage(file, 500)
        const relativePath = await tauri.saveImage(deskPath, base64, extension)
        await insertImageMarkdown(relativePath)
      } catch (error) {
        console.error('Failed to save dropped image:', error)
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    if (!deskPath) return
    
    const items = e.clipboardData.items
    
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const file = item.getAsFile()
        if (file) {
          try {
            const { base64, extension } = await resizeImage(file, 500)
            const relativePath = await tauri.saveImage(deskPath, base64, extension)
            await insertImageMarkdown(relativePath)
          } catch (error) {
            console.error('Failed to save pasted image:', error)
          }
        }
      }
    }
  }

  return (
    <div
      ref={editorRef}
      className="h-full w-full [&_.cm-editor]:h-full [&_.cm-editor]:w-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onPaste={handlePaste}
    />
  )
}
