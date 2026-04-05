# jott

Infinite canvas note taking app built with Tauri, React, and TypeScript.

## Features

- **Infinite canvas** — Pan and zoom freely to organize notes spatially
- **Markdown support** — Write notes in Markdown with live preview
- **Desk-based organization** — Group notes into desks (folders) that can be opened, created, and exported
- **Command palette** — Quick actions via `⌘K` / `Ctrl+K`
- **Print & export** — Export individual notes as PDF or entire desks as ZIP
- **Bin** — Soft-delete notes and restore them later

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Rust](https://www.rust-lang.org/) (required for Tauri)

### Install dependencies

```bash
npm install
```

### Run in development

```bash
npm run tauri:dev
```

### Build for production

```bash
npm run tauri:build
```

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open command palette (create note) |
| `Escape` | Stop editing / deselect notes |
