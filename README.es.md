# Chilli Beat

[English version](README.md)

Chilli Beat es un espacio de trabajo de escritorio, local-first, para productores musicales que organizan sesiones de distintos DAWs, comparan mezclas y referencias, recuperan el contexto de sus proyectos y convierten ideas incompletas en canciones terminadas.

Indexa proyectos existentes sin reubicarlos, mantiene los backups vinculados a su sesión principal, descubre audio nuevo exportado dentro del proyecto y crea paquetes neutrales de colaboración sin afirmar que los formatos propietarios pueden convertirse perfectamente.

> **Estado:** beta de escritorio activa (`0.1.0`). Windows es el flujo verificado actualmente. La arquitectura Tauri también permite apuntar a macOS y Linux, pero esas versiones todavía requieren validación específica.

## Principios del producto

- **Local-first:** los metadatos permanecen en una base SQLite local; no se requiere cuenta ni servicio en la nube.
- **No destructivo:** Chilli Beat guarda rutas y metadatos derivados. No reorganiza, mueve ni elimina los proyectos y audios originales.
- **Neutral respecto al DAW:** los archivos `.flp`, `.als`, `.rpp` y otras sesiones nativas conservan su formato y se abren con su DAW original.
- **Enfocado en producción:** organización, escucha, comparación, planificación de cierre, versiones y handoff conviven en un mismo workspace.

## Funciones actuales

### Biblioteca de proyectos multi-DAW

- Indexa recursivamente solo las carpetas elegidas por el usuario; rechaza raíces completas de disco y no sigue enlaces simbólicos.
- Ejecuta escaneos cancelables fuera del hilo de interfaz y conserva un historial con proyectos creados, actualizados, movidos, faltantes y entradas ilegibles.
- Permite buscar, filtrar, ordenar, marcar favoritos y paginar bibliotecas grandes.
- Filtra por DAW, extensión, estado, género, etiquetas y favoritos.
- Reconcilia un proyecto movido cuando existe una coincidencia única, sin perder sus metadatos locales.
- Permite registrar extensiones de proyecto alfanuméricas adicionales desde Configuración.

### Metadatos y artwork

- Guarda nombre visual, BPM, tonalidad, género, estado, calificación, etiquetas, notas y favorito sin editar el archivo nativo del DAW.
- Ofrece 50 géneros precargados y permite introducir uno personalizado.
- Asigna portadas locales PNG, JPEG, WebP o GIF; solo se almacena la ruta y una miniatura limitada.
- Genera artwork minimalista determinista cuando el proyecto no tiene portada.
- Mantiene la edición del nombre visual separada del renombrado físico validado.
- Configura carpetas del proyecto para stems, mezclas, masters y referencias.

> El BPM y la tonalidad son actualmente metadatos administrados por el usuario. La detección automática de tempo y tonalidad todavía no está implementada.

### Workspaces administrados

Al crear un proyecto se elige nombre, carpeta principal, DAW y una plantilla real opcional. Chilli Beat detecta instalaciones comunes de DAWs y prepara una estructura neutral:

```text
Nombre del proyecto/
├── Project Files/
├── Audio/
│   ├── Stems/
│   ├── Mixes/
│   └── Masters/
├── MIDI/
├── References/
├── Artwork/
├── Handoffs/
└── Project Info.json
```

Chilli Beat nunca fabrica una sesión propietaria. Con una plantilla compatible, copia el proyecto real dentro de `Project Files`; sin plantilla, el workspace espera el primer guardado desde el DAW seleccionado y vincula esa sesión durante el siguiente escaneo de biblioteca.

Los proyectos existentes también pueden previsualizar y aplicar una propuesta de carpetas adaptada al DAW. Solo se crean los directorios faltantes; los archivos existentes nunca se mueven.

### Descubrimiento automático de audio

La pestaña **Audio y archivos** sincroniza las carpetas reconocidas cuando se abre, cuando la aplicación recupera el foco al volver desde el DAW y cuando el usuario pulsa **Actualizar**.

En proyectos de FL Studio reconoce:

| Carpeta | Clasificación inicial |
| --- | --- |
| `Renders/Mixes` | Mezcla |
| `Renders/Stems` | Stem |
| `Renders/Masters` | Master |
| `Renders` | Mezcla/render |
| `Audio` | Audio del proyecto |
| `Samples` | Audio/sample del proyecto |
| `References` | Referencia |
| `Backup` / `Backups` | Excluida del descubrimiento de audio |

Los workspaces creados por Chilli Beat también reconocen `Audio/Stems`, `Audio/Mixes`, `Audio/Masters` y `References`. Las carpetas de producción configuradas explícitamente tienen prioridad sobre las convenciones inferidas.

- Descubre WAV, MP3, FLAC, OGG, M4A, AAC, AIFF y AIF sin copiarlos.
- Agrupa los resultados por carpeta de origen y distingue archivos descubiertos de asociaciones manuales.
- Evita duplicados mediante la ruta canónica.
- Conserva las reclasificaciones realizadas por el usuario durante futuras sincronizaciones.
- Permite ocultar permanentemente un archivo descubierto sin eliminarlo del disco.
- Marca como faltantes los archivos asociados cuya ruta original ya no existe.
- Limita el recorrido a carpetas reconocidas, seis niveles y 2,000 archivos por sincronización.

### Reproductor persistente y comparación

- Mantiene la reproducción al navegar por la biblioteca y todas las pestañas del proyecto.
- Persiste en SQLite la cola, pista actual, posición, volumen, repetición y reproducción aleatoria.
- Permite añadir, eliminar y reordenar elementos de la cola.
- Asocia manualmente stems, mezclas, masters, previews, referencias, MIDI, presets, samples, artwork y otros archivos cuando sea necesario.
- Asigna dos pistas a decks A/B y alterna entre fuentes sincronizadas.
- Aplica compensación opcional de nivel basada en LUFS cuando ambos análisis están disponibles.
- Reproduce WAV, MP3, FLAC y OGG directamente desde su ruta original, sin conversión.

M4A, AAC, AIFF y AIF pueden descubrirse y organizarse, pero el reproductor y analizador integrados actualmente están limitados a WAV, MP3, FLAC y OGG.

### Análisis de audio

El análisis de un archivo compatible obtiene:

- Duración, sample rate, bit depth y número de canales.
- LUFS integrado, rango de sonoridad y true peak.
- Una forma de onda de amplitud normalizada, amplia y con marcadores de tiempo.
- Observaciones técnicas basadas en reglas para nivel, margen de pico y dinámica.
- Resultados en caché que se invalidan si cambia el tamaño o la fecha de modificación del archivo.
- Animación clara de carga, estado de error recuperable y acción para reintentar.

La gráfica representa amplitud a lo largo del tiempo; no es un espectro FFT de frecuencias.

### Finish Mode

Finish Mode convierte una colección de ideas incompletas en una cola de producción accionable:

- Resumen de proyectos en progreso, sin abrir durante 90 días, sin preview, en mezcla y casi terminados.
- Checklist para estructura, grabación, edición, mezcla, masterización, artwork y distribución.
- Próxima acción, fecha objetivo, prioridad baja/media/alta, bloqueo actual y estado de foco.
- Máximo de tres proyectos foco para mantener una carga activa intencional.
- Plan de cierre por proyecto conectado con la biblioteca principal.

### Versiones y backups

- Detecta backups y copias explícitas como `backup`, `autosave`, `copy`, `autosaved at` y `overwritten at` de FL Studio.
- Oculta autosaves huérfanos de la biblioteca principal y los vincula cuando aparece una sesión primaria compatible.
- Agrupa automáticamente coincidencias de alta confianza dentro del proyecto principal.
- Presenta versiones numeradas ambiguas, como `v2`, para revisión en lugar de adivinar.
- Permite abrir, mostrar, confirmar, separar o promover una versión relacionada.
- Mantiene backups fuera de Biblioteca y Finish Mode como proyectos independientes.

### Universal Handoff Package

Chilli Beat no promete conversión entre DAWs. Genera un paquete neutral y versionado para colaboradores:

```text
Proyecto — Handoff v1/
├── Audio/
│   ├── Stems/
│   │   ├── Wet/
│   │   ├── Dry/
│   │   └── Neutral/
│   ├── Mixes/
│   └── Masters/
├── MIDI/
├── References/
├── Preview/
├── Artwork/
├── Project Files/
├── Project Info.json
├── Checksums.sha256
└── README.pdf
```

El handoff puede incluir el proyecto nativo, archivos asociados seleccionados, variantes wet/dry/neutral, BPM, tonalidad, compás, punto de inicio común, versión del DAW, lista de plugins, notas para el colaborador, metadatos técnicos de audio, versión incremental y verificación SHA-256. Las fuentes se copian a un directorio temporal y nunca se mueven ni reescriben.

### Personalización y accesibilidad

- Permite elegir entre cinco temas de acento persistentes: Chilli, Crimson, Lime, Ocean y Violet.
- Utiliza estados de foco por teclado, etiquetas accesibles, controles multimedia nativos y alternativas para movimiento reducido.
- Integra los colores del artwork en el encabezado ambiental animado del proyecto sin ocultar el contenido.

## Formatos de proyecto compatibles

| Extensión | DAW |
| --- | --- |
| `.flp` | FL Studio |
| `.als` | Ableton Live |
| `.rpp` | REAPER |
| `.cpr` | Cubase |
| `.song` | Studio One |
| `.ptx` | Pro Tools |
| `.logicx` | Logic Pro |
| `.band` | GarageBand |
| `.reason` | Reason |

Desde Configuración pueden añadirse extensiones seguras sin reemplazar el catálogo integrado.

## Datos locales y seguridad

- Metadatos, historial de escaneos, Finish Mode, reproducción, análisis, historial de handoffs y estado de archivos descubiertos se almacenan en SQLite con esquema v10.
- Artwork y audio permanecen en el disco; los medios no se guardan como blobs en la base de datos.
- Los escaneos de biblioteca solo comienzan cuando se solicitan y pueden cancelarse.
- La sincronización de audio lee únicamente carpetas reconocidas o configuradas explícitamente para el proyecto.
- Las acciones para abrir y mostrar archivos resuelven identificadores almacenados y validan rutas confiables.
- El renombrado físico está aislado en un comando dedicado y validado.
- Un handoff solo se finaliza después de escribir correctamente todos los archivos temporales.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Aplicación de escritorio | Tauri 2 |
| Interfaz | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Estado y navegación | Zustand 5, React Router 7 |
| Núcleo nativo | Rust |
| Base de datos | SQLite mediante `rusqlite` embebido |
| Decodificación y análisis de audio | Symphonia y EBU R128 |
| Descubrimiento de archivos | `walkdir` con validación de rutas canónicas |
| Procesamiento de artwork | `image` |
| Verificación de handoffs | SHA-256 |
| Iconos | Lucide React |

No se utiliza Electron.

## Requisitos

- Node.js 22 o una versión LTS compatible.
- pnpm 11.
- Rust estable.
- [Prerrequisitos de Tauri 2](https://v2.tauri.app/start/prerequisites/) para cada plataforma.

En Windows también se requieren Microsoft C++ Build Tools y WebView2.

## Desarrollo

```powershell
pnpm install
pnpm tauri dev
```

`pnpm dev` inicia únicamente la interfaz Vite. Los diálogos nativos, comandos Rust, SQLite, validación del sistema de archivos, autorización de audio y generación de handoffs requieren `pnpm tauri dev`.

Si Windows Application Control bloquea la salida de Cargo dentro de `Documents`:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
pnpm tauri dev
```

Si el puerto `1420` ya está ocupado, detén el proceso Vite anterior antes de iniciar otra sesión Tauri.

## Verificación

```powershell
pnpm check
pnpm build
pnpm exec vitest run src
cargo test --manifest-path src-tauri/Cargo.toml --no-default-features
pnpm tauri build --bundles nsis
```

El código actual supera **17 pruebas frontend** y **52 pruebas Rust**. Los comandos de build e instalador deben repetirse en la máquina objetivo antes de publicar.

## Arquitectura

```text
Página o componente React
  → servicio frontend tipado
  → comando Tauri permitido
  → servicio de dominio Rust
  → repositorio
  → SQLite u operación validada del sistema de archivos
```

Los escaneos prolongados de biblioteca se ejecutan fuera del hilo de interfaz. El recorrido del sistema de archivos ocurre antes de las transacciones breves y las consultas de biblioteca están paginadas.

```text
src/                 Interfaz React, stores, componentes y servicios tipados
src-tauri/src/       Núcleo Rust, escáner, servicios, repositorios y SQLite
website/             Sitio de presentación del producto
docs/                Notas históricas de arquitectura e hitos
```

## Limitaciones conocidas

- Las estructuras internas de proyectos nativos no se convierten entre DAWs.
- Un handoff no puede conservar todos los routings, automatizaciones, plugins, instrumentos virtuales, presets, sidechains, marcadores, mapas de tempo o ediciones específicas del DAW.
- El BPM y la tonalidad todavía no se detectan automáticamente desde audio.
- La indexación de biblioteca requiere una acción del usuario. El descubrimiento de audio se actualiza al abrir la pestaña, recuperar el foco o pulsar Actualizar; no existe un watcher permanente.
- La agrupación de backups es conservadora y las coincidencias ambiguas requieren confirmación.
- El comportamiento de codecs puede depender del webview del sistema operativo.
- Windows es el objetivo verificado activamente; macOS y Linux necesitan pruebas específicas.

## Documentación adicional

Las notas históricas de diseño y arquitectura permanecen en [docs](docs/). Describen hitos anteriores; este README y [README.md](README.md) son la fuente de verdad del producto actual.