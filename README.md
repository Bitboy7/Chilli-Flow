<p align="center">
  <img src="./src/assets/chilli-flow.svg" width="180" alt="Logotipo de Chilli Flow">
</p>

# Chilli Flow

Chilli Flow es un espacio de trabajo de escritorio para productores musicales. Reúne proyectos de distintos DAWs, versiones, mezclas, masters y referencias en una biblioteca local, sin mover ni modificar los archivos originales.

La idea es sencilla: pasar menos tiempo buscando archivos y reconstruyendo el contexto de una sesión, y más tiempo tomando decisiones y terminando música.

> **Estado:** beta de escritorio, versión 0.1.0. Windows es la plataforma verificada actualmente.

## ¿Qué problemas resuelve?

### Proyectos dispersos

Las sesiones suelen terminar repartidas entre discos, carpetas, respaldos y nombres poco consistentes. Chilli Flow indexa únicamente las ubicaciones que eliges y presenta todos los proyectos en una biblioteca que puedes buscar, filtrar y ordenar.

### Ideas que pierden contexto

Después de semanas o meses puede ser difícil recordar qué faltaba, cuál era la mezcla más reciente o qué referencia estabas usando. Cada proyecto conserva notas, etiquetas, BPM, tonalidad, estado, portada, archivos asociados y una siguiente acción.

### Versiones y respaldos confusos

Las copias, autosaves y versiones numeradas pueden saturar una biblioteca. Chilli Flow agrupa coincidencias confiables con el proyecto principal y pide confirmación cuando la relación es ambigua.

### Comparaciones que interrumpen el flujo

Cambiar entre exploradores de archivos y reproductores hace lenta la comparación. El reproductor permanece activo mientras navegas, permite organizar una cola y comparar dos audios con A/B.

### Proyectos que nunca se terminan

Finish Mode convierte el archivo de ideas incompletas en una lista de trabajo: define una próxima acción, fecha objetivo, prioridad, bloqueo y checklist de producción. Puedes mantener hasta tres proyectos en foco.

### Colaboraciones entre distintos DAWs

Chilli Flow no promete convertir formatos propietarios. En su lugar, prepara un paquete neutral con los archivos seleccionados, información del proyecto, comprobaciones SHA-256 y una estructura clara para colaborar.

## ¿Por qué usar Chilli Flow?

- **Trabaja con tus archivos actuales.** No necesitas reorganizar toda tu biblioteca antes de empezar.
- **Es local.** No exige cuenta ni subir tus sesiones a la nube.
- **Es no destructivo.** Los proyectos y audios originales permanecen en su ubicación.
- **Es independiente del DAW.** Puedes reunir sesiones de FL Studio, Ableton Live, REAPER, Cubase, Studio One, Pro Tools y otros formatos.
- **Mantiene el contexto.** Biblioteca, escucha, versiones, plan de finalización y handoff viven alrededor del mismo proyecto.
- **Te ayuda a decidir.** La información técnica aparece cuando resulta útil y no domina el flujo creativo.

## Funciones principales

- Biblioteca con búsqueda, filtros, favoritos, etiquetas y estados.
- Escaneos controlados por el usuario y limitados a carpetas autorizadas.
- Detección de proyectos movidos sin perder sus metadatos.
- Asociación y descubrimiento de stems, mezclas, masters y referencias.
- Reproductor persistente con cola y comparación A/B.
- Análisis de duración, formato, forma de onda, LUFS y pico real.
- Portadas y metadatos editables sin alterar el archivo del DAW.
- Organización de versiones, backups y autosaves.
- Finish Mode para priorizar y completar proyectos.
- Creación de workspaces y paquetes de colaboración neutrales.

## Formatos de proyecto reconocidos

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

Desde Configuración puedes añadir extensiones adicionales seguras.

## Instalar en Windows

Ejecuta el instalador generado:

```text
Chilli Flow_0.1.0_x64-setup.exe
```

Windows SmartScreen puede mostrar una advertencia mientras la aplicación no tenga firma digital. Comprueba que el archivo provenga de una fuente confiable antes de continuar.

## Ejecutar desde el código fuente

### Requisitos

- Node.js 22 o una versión LTS compatible.
- pnpm 11.
- Rust estable.
- Microsoft C++ Build Tools y WebView2 en Windows.

### Iniciar la aplicación

```powershell
pnpm install
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-flow-target"
pnpm tauri dev
```

La aplicación se abrirá como una ventana de escritorio. Para probar todas sus funciones debes usar `pnpm tauri dev`; `pnpm dev` inicia solamente la interfaz web.

Si el puerto 1420 ya está ocupado, cierra el proceso anterior y vuelve a ejecutar el comando.

## Crear el instalador de Windows

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-flow-target"
pnpm tauri build --bundles nsis
```

Al terminar encontrarás:

```text
%USERPROFILE%\.cargo\chilli-flow-target\release\chilli-flow.exe
%USERPROFILE%\.cargo\chilli-flow-target\release\bundle\nsis\Chilli Flow_0.1.0_x64-setup.exe
```

El primer archivo es el ejecutable directo. El segundo es el instalador recomendado para compartir.

## Verificar antes de distribuir

```powershell
pnpm check
pnpm exec vitest run src
cargo test --manifest-path src-tauri/Cargo.toml
```

## Privacidad y seguridad

- Solo se escanean las carpetas seleccionadas por el usuario.
- Los archivos originales no se copian, mueven ni eliminan durante la catalogación.
- La información de la biblioteca se guarda localmente.
- Los escaneos pueden cancelarse.
- Las operaciones sensibles validan las rutas antes de ejecutarse.
- Los paquetes de colaboración se completan de forma atómica para evitar archivos parciales.

## Limitaciones actuales

- No convierte sesiones entre DAWs.
- BPM y tonalidad todavía se capturan manualmente.
- El reproductor integrado admite WAV, MP3, FLAC y OGG.
- La asociación de versiones es conservadora y puede requerir confirmación.
- macOS y Linux aún necesitan validación específica.
