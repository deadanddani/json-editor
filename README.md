# JSON Editor

Editor JSON online, sin anuncios ni límites, como web estática.

Construido sobre [`vanilla-jsoneditor`](https://github.com/josdejong/svelte-jsoneditor) (ISC), el motor open source de Jos de Jong.

## Funciones

- Dos paneles con vistas **árbol**, **texto** y **tabla**
- Formatear, compactar, reparar, ordenar, filtrar y transformar (JSON Query, JMESPath, JSONPath, Lodash, JavaScript)
- Copiar de un panel a otro y **comparar** (resalta las diferencias en la vista árbol)
- Abrir, arrastrar y soltar o guardar archivos `.json`; copiar al portapapeles
- Modo claro/oscuro; el contenido se guarda solo en tu navegador (localStorage)

## Desarrollo

```bash
npm install
npm run dev     # servidor local
npm run build   # genera dist/
```

## Despliegue

- **GitHub Pages:** automático en cada push a `main` (`.github/workflows/deploy.yml`).
- **Vercel:** importar el repo; Vercel detecta Vite (`npm run build`, salida `dist`).
