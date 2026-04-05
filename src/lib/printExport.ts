import { marked } from 'marked'
import * as tauri from '@/lib/tauri'

export async function preparePrintHtml(content: string, deskPath: string): Promise<string> {
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
      const dataUrl = await tauri.readImageFile(deskPath, path)
      finalHtml = finalHtml.replace(placeholder, dataUrl)
    } catch (error) {
      console.error(`Failed to load image ${path}:`, error)
      finalHtml = finalHtml.replace(placeholder, path)
    }
  }
  
  return finalHtml
}
