import {
  createJSONEditor,
  jsonQueryLanguage,
  jmespathQueryLanguage,
  jsonpathQueryLanguage,
  lodashQueryLanguage,
  javascriptQueryLanguage
} from 'vanilla-jsoneditor'
import 'vanilla-jsoneditor/themes/jse-theme-dark.css'
import './style.css'

const STORAGE_PREFIX = 'json-editor:'
const queryLanguages = [
  jsonQueryLanguage,
  jmespathQueryLanguage,
  jsonpathQueryLanguage,
  lodashQueryLanguage,
  javascriptQueryLanguage
]

const sampleJSON = {
  array: [1, 2, 3],
  boolean: true,
  color: '#82b92c',
  null: null,
  number: 123,
  object: { a: 'b', c: 'd' },
  string: 'Hello World',
  timestamp: Date.now()
}

// ---------- storage (best effort: may be unavailable in private mode) ----------

function load(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    return undefined
  }
}

function store(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore quota / privacy errors
  }
}

// ---------- helpers ----------

function toast(message) {
  const el = document.getElementById('toast')
  el.textContent = message
  el.classList.add('visible')
  clearTimeout(toast.timer)
  toast.timer = setTimeout(() => el.classList.remove('visible'), 2200)
}

function contentToText(content) {
  return content.text !== undefined ? content.text : JSON.stringify(content.json, null, 2)
}

function contentToJSON(content) {
  return content.json !== undefined ? content.json : JSON.parse(content.text)
}

const pathKey = (path) => JSON.stringify(path)

// ---------- compare ----------

let compareEnabled = false
let diffs = { left: new Set(), right: new Set() }

function collectDiffs(a, b, path, out) {
  if (a === b) return

  const bothArrays = Array.isArray(a) && Array.isArray(b)
  const bothObjects =
    a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)

  if (bothArrays) {
    const length = Math.max(a.length, b.length)
    for (let i = 0; i < length; i++) {
      if (i >= a.length) out.right.add(pathKey([...path, String(i)]))
      else if (i >= b.length) out.left.add(pathKey([...path, String(i)]))
      else collectDiffs(a[i], b[i], [...path, String(i)], out)
    }
  } else if (bothObjects) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(key in b)) out.left.add(pathKey([...path, key]))
      else if (!(key in a)) out.right.add(pathKey([...path, key]))
      else collectDiffs(a[key], b[key], [...path, key], out)
    }
  } else {
    out.left.add(pathKey(path))
    out.right.add(pathKey(path))
  }
}

function updateCompare() {
  diffs = { left: new Set(), right: new Set() }
  if (compareEnabled) {
    try {
      collectDiffs(contentToJSON(editors.left.get()), contentToJSON(editors.right.get()), [], diffs)
    } catch {
      toast('No se puede comparar: alguno de los paneles no contiene JSON válido')
    }
  }
  // a new function instance forces the editors to re-render the class names
  for (const side of ['left', 'right']) {
    editors[side].updateProps({
      onClassName: (path) => (diffs[side].has(pathKey(path)) ? 'diff-node' : undefined)
    })
  }
}

// ---------- editors ----------

const editors = {}

function createEditor(side, defaultContent) {
  return createJSONEditor({
    target: document.getElementById(`editor-${side}`),
    props: {
      content: load(`content-${side}`) ?? defaultContent,
      mode: load(`mode-${side}`) ?? 'tree',
      queryLanguages,
      queryLanguageId: load('query-language') ?? jsonQueryLanguage.id,
      onChangeQueryLanguage: (id) => {
        store('query-language', id)
        for (const editor of Object.values(editors)) editor.updateProps({ queryLanguageId: id })
      },
      onChange: (content) => {
        store(`content-${side}`, content)
        if (compareEnabled) updateCompare()
      },
      onChangeMode: (mode) => {
        store(`mode-${side}`, mode)
        editors[side].updateProps({ mode })
      }
    }
  })
}

editors.left = createEditor('left', { json: sampleJSON })
editors.right = createEditor('right', { text: '' })

// ---------- panel toolbars ----------

async function openFile(side, file) {
  const text = await file.text()
  editors[side].set({ text })
  store(`content-${side}`, { text })
  toast(`Abierto ${file.name}`)
  if (compareEnabled) updateCompare()
}

function saveFile(side) {
  const blob = new Blob([contentToText(editors[side].get())], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: 'document.json' })
  a.click()
  URL.revokeObjectURL(url)
}

for (const panel of document.querySelectorAll('.panel')) {
  const side = panel.dataset.side
  const fileInput = panel.querySelector('input[type=file]')

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) openFile(side, fileInput.files[0])
    fileInput.value = ''
  })

  panel.querySelector('.panel-toolbar').addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action
    if (action === 'new') {
      editors[side].set({ text: '' })
      store(`content-${side}`, { text: '' })
    } else if (action === 'open') {
      fileInput.click()
    } else if (action === 'save') {
      saveFile(side)
    } else if (action === 'copy') {
      try {
        await navigator.clipboard.writeText(contentToText(editors[side].get()))
        toast('Copiado al portapapeles')
      } catch {
        toast('No se pudo copiar al portapapeles')
      }
    }
  })

  // drag & drop a file onto a panel
  panel.addEventListener('dragover', (event) => {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault()
      panel.classList.add('dropping')
    }
  })
  panel.addEventListener('dragleave', () => panel.classList.remove('dropping'))
  panel.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files[0]
    panel.classList.remove('dropping')
    if (file) {
      event.preventDefault()
      openFile(side, file)
    }
  })
}

// ---------- middle actions ----------

function copyBetween(from, to) {
  const content = editors[from].get()
  editors[to].set(content)
  store(`content-${to}`, content)
  if (compareEnabled) updateCompare()
}

document.getElementById('copy-to-right').addEventListener('click', () => copyBetween('left', 'right'))
document.getElementById('copy-to-left').addEventListener('click', () => copyBetween('right', 'left'))

const compareButton = document.getElementById('compare')
compareButton.addEventListener('click', () => {
  compareEnabled = !compareEnabled
  compareButton.setAttribute('aria-pressed', String(compareEnabled))
  updateCompare()
  if (compareEnabled) {
    const count = diffs.left.size + diffs.right.size
    toast(count === 0 ? 'Los dos documentos son iguales' : 'Diferencias resaltadas (modo árbol)')
  }
})

// ---------- theme ----------

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  for (const el of document.querySelectorAll('.editor')) {
    el.classList.toggle('jse-theme-dark', theme === 'dark')
  }
}

applyTheme(load('theme') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))

document.getElementById('theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
  store('theme', next)
})
