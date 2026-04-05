export interface Position {
  x: number
  y: number
}

export interface NoteMeta {
  position: Position
  scale: number
  zIndex: number
  deleted: boolean
}

export interface CanvasState {
  zoom: number
  pan: Position
}

export interface DeskData {
  version: number
  notes: Record<string, NoteMeta>
  canvas: CanvasState
}

export interface Note {
  filename: string
  content: string
  meta: NoteMeta
}

export interface Desk {
  path: string
  name: string
  notes: Map<string, Note>
  canvas: CanvasState
}

export const A4_RATIO = Math.SQRT2
export const BASE_NOTE_WIDTH = 500
export const BASE_NOTE_HEIGHT = BASE_NOTE_WIDTH * A4_RATIO

export const DEFAULT_NOTE_META: NoteMeta = {
  position: { x: 0, y: 0 },
  scale: 1,
  zIndex: 1,
  deleted: false,
}

export const DEFAULT_CANVAS_STATE: CanvasState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
}

export const DESK_JSON_VERSION = 1
