import { marked } from 'marked'
import { useEffect, useState, useRef } from 'react'
import * as tauri from '@/lib/tauri'

interface NotePreviewProps {
  content: string
  deskPath: string
  onClick: () => void
  onShiftClick: (shiftKey: boolean) => void
  onDoubleClick: () => void
}

export function NotePreview({ content, deskPath, onClick, onShiftClick, onDoubleClick }: NotePreviewProps) {
  const [html, setHtml] = useState('')
  const loadedImagesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    const render = async () => {
      const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
      const imagePaths: { placeholder: string; path: string }[] = []
      
      let match
      let contentWithPlaceholders = content
      
      while ((match = imageRegex.exec(content)) !== null) {
        const [fullMatch, alt, href] = match
        if (href.startsWith('.attachments/')) {
          const placeholder = `__IMAGE_PLACEHOLDER_${imagePaths.length}__`
          imagePaths.push({ placeholder, path: href })
          contentWithPlaceholders = contentWithPlaceholders.replace(fullMatch, `![${alt}](${placeholder})`)
        }
      }
      
      const rendered = await marked(contentWithPlaceholders)
      let finalHtml = rendered
      
      for (const { placeholder, path } of imagePaths) {
        try {
          let dataUrl = loadedImagesRef.current.get(path)
          
          if (!dataUrl) {
            dataUrl = await tauri.readImageFile(deskPath, path)
            loadedImagesRef.current.set(path, dataUrl)
          }
          
          finalHtml = finalHtml.replace(placeholder, dataUrl)
        } catch (error) {
          console.error(`Failed to load image ${path}:`, error)
          finalHtml = finalHtml.replace(placeholder, path)
        }
      }
      
      setHtml(finalHtml)
    }
    
    render()
  }, [content, deskPath])

  const handleClick = (e: React.MouseEvent) => {
    if (e.detail === 2) {
      // Double click - trigger edit
      e.stopPropagation()
      onDoubleClick()
    } else if (e.shiftKey) {
      onShiftClick(true)
    } else {
      onClick()
    }
  }

  return (
    <div
      className="h-full w-full p-6 cursor-text note-preview overflow-hidden"
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
