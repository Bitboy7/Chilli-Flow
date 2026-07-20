# Chilli Beat

[English version](README.md)

Chilli Beat es un espacio de trabajo de escritorio, local-first, para productores musicales que necesitan organizar proyectos de distintos DAWs, comparar audio rápidamente, recuperar contexto y terminar más música.

Indexa sesiones existentes sin reubicarlas, mantiene backups y versiones relacionadas dentro del proyecto correcto y genera paquetes portables para colaboración sin prometer conversiones perfectas entre formatos propietarios.

> Estado actual: beta de escritorio en desarrollo activo. El flujo verificado actualmente es Windows; la arquitectura también permite compilar para macOS y Linux.

## Por qué existe Chilli Beat

Una carpeta llena de archivos `.flp`, `.als`, `.rpp` y rebotes de audio indica dónde están las cosas. No explica cuál versión importa, qué está bloqueando una canción, qué mezcla suena más fuerte o qué necesita un colaborador.

Chilli Beat añade ese contexto de producción manteniendo al sistema de archivos y al DAW como fuente de verdad.

## Funciones principales

### Una biblioteca para distintos DAWs

- Indexación recursiva de carpetas elegidas sin escanear discos completos.
- Búsqueda, filtros, ordenamiento, favoritos y paginación para bibliotecas grandes.
- BPM, tonalidad, género, estado, calificación, etiquetas, notas, artwork e historial de modificación.
- Extensiones de proyecto integradas y personalizables.
- Reconciliación conservadora de proyectos movidos sin perder metadatos locales.

### Backups y versiones

- Detección de backups y copias explícitas como `backup`, `autosave`, `copy` y los archivos `overwritten at` de FL Studio.
- Agrupación automática de coincidencias de alta confianza dentro del proyecto principal.
- Revisión manual para versiones ambiguas numeradas, como `v2`.
- Acciones para abrir, mostrar, separar, confirmar o promover una versión sin modificar el archivo del DAW.

### Workspaces administrados

Al crear un proyecto se elige nombre, ubicación, DAW y una plantilla real opcional. Chilli Beat detecta instalaciones comunes de DAWs y prepara una estructura neutral:

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

Chilli Beat nunca fabrica un archivo propietario. Si se selecciona una plantilla, copia el archivo real dentro de `Project Files`; sin plantilla, el workspace espera el primer guardado del DAW y lo vincula durante el siguiente escaneo.

### Flujo de audio persistente

- La reproducción continúa al navegar entre la biblioteca y las vistas del proyecto.
- Cola básica de reproducción persistente.
- Asociación de stems, mezclas, masters, previews, referencias, MIDI, presets, samples y artwork.
- Comparación A/B de dos pistas con compensación de nivel.
- Análisis de duración, sample rate, bit depth, canales, LUFS integrado, rango de sonoridad, true peak y forma de onda resumida.
- Preview de WAV, MP3, FLAC y OGG sin convertir los originales.

### Finish Mode

Finish Mode transforma una colección de ideas abandonadas en una cola accionable:

- Resumen de proyectos activos, estancados, sin preview, en mezcla y casi terminados.
- Checklist para estructura, grabación, edición, mezcla, master, artwork y distribución.
- Próxima acción, fecha objetivo, prioridad, bloqueo actual y hasta tres proyectos foco.
- Espacio de cierre dentro de cada proyecto, conectado con la biblioteca.

### Universal Handoff Package

Chilli Beat no promete una conversión imposible entre DAWs. En su lugar genera un paquete neutral, verificable y versionado:

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

La exportación puede incluir el proyecto original, archivos asociados, variantes con efectos/sin efectos/sin clasificar, BPM, tonalidad, compás, punto de inicio común, versión del DAW, plugins, notas para el colaborador, metadatos técnicos de audio, versión incremental y verificación SHA-256. Los archivos fuente se copian; nunca se mueven ni reescriben.

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

Desde Configuración pueden administrarse extensiones alfanuméricas adicionales.

## Local-first y no destructivo

- Los metadatos se guardan localmente en SQLite.
- No se requiere cuenta ni servicio en la nube.
- El escaneo comienza únicamente cuando el usuario lo solicita.
- El escáner no sigue enlaces simbólicos y rechaza raíces completas de disco.
- Los proyectos y audios existentes no se mueven ni eliminan.
- Editar el nombre visual nunca renombra el proyecto físico.
- El renombrado físico está aislado detrás de una acción dedicada y validada.
- Abrir y mostrar archivos resuelve rutas confiables desde SQLite y verifica que pertenezcan a una carpeta supervisada.
- Artwork y audio permanecen en el disco; SQLite almacena rutas y metadatos derivados, no blobs multimedia.
- Los Handoffs se preparan en un directorio temporal y solo se finalizan después de escribir correctamente sus archivos.

## Tecnologías

| Capa | Tecnología |
| --- | --- |
| Aplicación de escritorio | Tauri 2 |
| Interfaz | React 19, TypeScript, Vite 7, Tailwind CSS 4 |
| Estado y navegación | Zustand 5, React Router 7 |
| Núcleo nativo | Rust |
| Base de datos | SQLite mediante `rusqlite` embebido |
| Análisis de audio | Symphonia y EBU R128 |
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

`pnpm dev` inicia únicamente la interfaz Vite. Los diálogos nativos, comandos Rust, SQLite, validación del sistema de archivos y autorización de audio requieren `pnpm tauri dev`.

Si Windows Application Control bloquea archivos de Cargo dentro de `Documents`:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
pnpm tauri dev
```

Si el puerto `1420` ya está ocupado, detén el proceso Vite anterior antes de iniciar otra sesión de desarrollo Tauri.

## Verificación

```powershell
pnpm check
pnpm build
pnpm exec vitest run src
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build --bundles nsis
```

El código actual está verificado con 16 pruebas frontend y 45 pruebas Rust. Antes de publicar una versión deben repetirse el build y las pruebas en la máquina objetivo.

## Arquitectura

```text
Página o componente React
  → servicio frontend tipado
  → comando Tauri permitido
  → servicio de dominio Rust
  → repositorio
  → SQLite u operación validada del sistema de archivos
```

Los escaneos y el análisis de audio se ejecutan fuera del hilo de interfaz. El recorrido de archivos ocurre antes de las transacciones breves y las consultas de biblioteca son paginadas.

```text
src/                 Interfaz React y servicios tipados
src-tauri/src/       Núcleo Rust, escáner, repositorios y SQLite
website/             Sitio de presentación del producto
docs/                Notas históricas de arquitectura
```

## Limitaciones conocidas

- Los proyectos se abren con su DAW nativo; Chilli Beat no convierte estructuras propietarias.
- Un Handoff no puede garantizar routing, automatización, plugins, instrumentos virtuales, presets, sidechain, mapas de tempo ni ediciones específicas del DAW.
- Los escaneos son explícitos; no existen watchers en tiempo real.
- La agrupación de backups es conservadora y las coincidencias ambiguas requieren revisión.
- El soporte efectivo de codecs puede depender del webview del sistema operativo.
- Windows es el objetivo verificado activamente. Las versiones para macOS y Linux requieren pruebas específicas.

## Documentación adicional

Las notas históricas permanecen en [docs](docs/). Describen hitos anteriores de implementación; este README es la fuente de verdad para el producto actual.
