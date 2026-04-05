import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import { Store } from '@tauri-apps/plugin-store'
import type { DeskData, NoteMeta } from '@/types'

const STORE_PATH = 'settings.json'
const LAST_DESK_PATH_KEY = 'lastDeskPath'

let storeInstance: Store | null = null

async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_PATH)
  }
  return storeInstance
}

export async function getLastDeskPath(): Promise<string | null> {
  const store = await getStore()
  const path = await store.get<string>(LAST_DESK_PATH_KEY)
  return path ?? null
}

export async function setLastDeskPath(path: string): Promise<void> {
  const store = await getStore()
  await store.set(LAST_DESK_PATH_KEY, path)
  await store.save()
}

export async function clearLastDeskPath(): Promise<void> {
  const store = await getStore()
  await store.delete(LAST_DESK_PATH_KEY)
  await store.save()
}

export interface Position {
  x: number
  y: number
}

export interface NoteTemplate {
  name: string
  content: string
}

export interface SearchResult {
  filename: string
  lineNumber: number
  snippet: string
  matchStart: number
  matchLength: number
}

export interface OpenDeskResult {
  name: string
  notes: Array<{
    filename: string
    content: string
    meta: NoteMeta
  }>
  desk_data: DeskData
}

export async function openDeskDialog(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Open Desk',
  })
  return selected as string | null
}

export async function createDeskDialog(): Promise<string | null> {
  const selected = await save({
    title: 'Create New Desk',
    defaultPath: 'My Desk',
  })
  return selected as string | null
}

export async function openDesk(path: string): Promise<OpenDeskResult> {
  return invoke<OpenDeskResult>('open_desk', { path })
}

export async function createDesk(path: string): Promise<string> {
  return invoke<string>('create_desk', { path })
}

export async function saveDeskJson(path: string, deskData: DeskData): Promise<void> {
  return invoke('save_desk_json', { path, deskData })
}

export async function readNote(path: string, filename: string): Promise<string> {
  return invoke<string>('read_note', { path, filename })
}

export async function writeNote(path: string, filename: string, content: string): Promise<void> {
  return invoke('write_note', { path, filename, content })
}

export async function createNote(path: string, title: string, templateContent?: string): Promise<string> {
  return invoke<string>('create_note', { path, title, templateContent })
}

export async function renameNote(path: string, oldName: string, newName: string): Promise<string> {
  return invoke<string>('rename_note', { path, oldName, newName })
}

export async function deleteNoteFile(path: string, filename: string): Promise<void> {
  return invoke('delete_note_file', { path, filename })
}

export async function exportDeskZip(deskPath: string): Promise<void> {
  const destPath = await save({
    title: 'Export Desk as ZIP',
    defaultPath: 'desk-export.zip',
    filters: [{ name: 'ZIP', extensions: ['zip'] }],
  })
  
  if (destPath) {
    return invoke('export_desk_zip', { deskPath, destPath })
  }
}

export async function exportNoteDialog(filename: string): Promise<string | null> {
  const destPath = await save({
    title: 'Export Note',
    defaultPath: filename,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
    ],
  })
  return destPath as string | null
}

export async function searchNotes(path: string, query: string): Promise<SearchResult[]> {
  return invoke<SearchResult[]>('search_notes', { path, query })
}

export async function saveImage(
  deskPath: string,
  imageBase64: string,
  extension: string
): Promise<string> {
  return invoke<string>('save_image', { deskPath, imageData: imageBase64, extension })
}

export async function copyImageToDesk(
  deskPath: string,
  sourcePath: string
): Promise<string> {
  return invoke<string>('copy_image_to_desk', { deskPath, sourcePath })
}

export async function readImageFile(
  deskPath: string,
  relativePath: string
): Promise<string> {
  return invoke<string>('read_image_file', { deskPath, relativePath })
}

export async function getTemplates(deskPath: string): Promise<NoteTemplate[]> {
  return invoke<NoteTemplate[]>('get_templates', { deskPath })
}
