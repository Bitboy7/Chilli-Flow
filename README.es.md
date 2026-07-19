# Chilli Beat

[English version](README.md)

Chilli Beat es una biblioteca de escritorio multiplataforma para localizar y
organizar proyectos de producción musical sin mover los archivos originales.

El proyecto incluye actualmente **las seis fases planificadas del MVP**.

## Funciones actuales

- Aplicación Tauri 2 con React, TypeScript estricto y Vite.
- Interfaz oscura y responsive construida con Tailwind CSS e iconos Lucide.
- Navegación con React Router y stores pequeños de Zustand.
- SQLite administrado por Rust, con migraciones transaccionales, claves
  foráneas, modo WAL e índices para rutas de proyectos.
- Selección explícita de carpetas supervisadas mediante el diálogo nativo.
- Activar, desactivar y eliminar carpetas sin borrar proyectos indexados ni
  archivos físicos.
- Escaneo manual de una carpeta o de todas las carpetas activas.
- Recorrido recursivo en segundo plano con eventos de progreso y cancelación.
- Inserción y actualización transaccional de los proyectos detectados.
- Los proyectos faltantes se marcan solo después de un escaneo completo, nunca
  después de cancelar.
- Extensiones integradas y extensiones personalizadas por el usuario.
- Errores amigables, confirmaciones y notificaciones toast.
- Biblioteca visual paginada con vistas de tarjetas y tabla.
- Búsqueda con debounce sobre nombres visuales y nombres originales.
- Filtros SQLite por DAW, extensión, estado, género, etiquetas y favoritos.
- Ordenamiento seguro por nombre, modificación, creación, BPM o importación.
- Vistas de biblioteca para Favoritos, Recientes, DAWs y Estados.
- Rutas de detalle y editor respaldadas por SQLite, con edición de BPM,
  tonalidad, género, estado, calificación, notas y etiquetas.
- Acciones de favoritos desde la biblioteca y el detalle.
- Selección explícita de portada, carga diferida y caché en memoria.
- Apertura segura del proyecto, su carpeta y ubicación en el explorador.
- El renombrado físico está aislado tras una confirmación y conserva la
  extensión; editar el nombre visual nunca renombra el archivo original.
- Vista de archivos asociados para stems, mixes, masters, previews,
  referencias, artwork, MIDI, presets, samples y otros.
- Selección explícita múltiple, clasificación, apertura y eliminación de la
  asociación sin modificar los originales físicos.
- Selector y reproductor WAV, MP3, FLAC y OGG con reproducción, pausa,
  progreso, duración y volumen.
- Carpetas editables para stems, mixes, masters y referencias, con apertura
  directa y sin mover archivos automáticamente.
- Historial paginado con métricas de creados, actualizados, movidos, faltantes
  y entradas ilegibles.
- Reconciliación conservadora de proyectos movidos que conserva los metadatos
  cuando existe una pareja antigua/nueva única.
- Rutas secundarias con carga diferida, miniaturas 640×400 generadas por Rust y
  caché de miniaturas acotada y sensible al viewport.

## Formatos compatibles

| Extensión | DAW |
| --- | --- |
| .flp | FL Studio |
| .als | Ableton Live |
| .rpp | REAPER |
| .cpr | Cubase |
| .song | Studio One |
| .ptx | Pro Tools |
| .logicx | Logic Pro |
| .band | GarageBand |
| .reason | Reason |

Desde Configuración se pueden crear, desactivar y eliminar extensiones
alfanuméricas adicionales. Las definiciones integradas permanecen centralizadas
en Rust.

## Tecnologías

- Tauri 2
- React 19
- TypeScript
- Vite 7
- Rust
- SQLite mediante rusqlite con SQLite embebido
- Tailwind CSS 4
- Zustand 5
- React Router 7
- Lucide React

No se utiliza Electron.

## Requisitos

- Node.js 22 o una versión LTS compatible.
- pnpm 11.
- Rust estable.
- Prerrequisitos de Tauri 2 específicos de cada plataforma:
  https://v2.tauri.app/start/prerequisites/

En Windows se requieren Microsoft C++ Build Tools y WebView2.

## Instalación y ejecución

    pnpm install
    pnpm tauri dev

Ejecutar pnpm dev inicia únicamente la interfaz web. Los diálogos nativos,
comandos Rust y SQLite requieren pnpm tauri dev.

Si Windows Application Control bloquea build-scripts generados dentro de
Documents, utiliza una carpeta permitida para el target de Cargo:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    pnpm tauri dev

## Funcionamiento del escaneo

1. El usuario selecciona explícitamente una carpeta concreta.
2. Rust canonicaliza la ruta y comprueba que exista y sea un directorio.
3. Se rechazan raíces completas de disco.
4. El escáner recorre de forma recursiva sin seguir enlaces simbólicos.
5. Las extensiones conocidas y personalizadas activas se comparan sin distinguir
   mayúsculas.
6. Los paquetes de Logic Pro y GarageBand se indexan sin recorrer su contenido.
7. Los resultados se guardan dentro de transacciones SQLite.
8. Los nombres visuales editables se preservan durante futuros escaneos.
9. Antes de insertar otra fila, un escaneo completo reconcilia de forma
   conservadora una pareja única de rutas antigua/nueva con igual nombre,
   extensión y tamaño.
10. Las rutas indexadas restantes que desaparecieron se marcan como faltantes.
11. Cancelar o encontrar entradas ilegibles conserva los descubrimientos
    accesibles pero omite la reconciliación de movimientos y archivos faltantes.

Ningún escaneo comienza automáticamente.

## Base de datos

La base se crea en el directorio de datos que Tauri resuelve para la plataforma
actual. Su nombre es chilli-beat.sqlite3.

El esquema contiene:

- projects
- project_statuses
- watched_folders
- tags
- project_tags
- project_files
- project_folders
- scan_history
- custom_extensions
- settings
- schema_migrations

La migración v2 agrega índices para filtros y ordenamiento. La v3 incorpora
métricas de reconciliación al historial. La v4 agrega rutas categorizadas de
carpetas de producción. Las consultas de proyectos e historial son paginadas;
los filtros usan parámetros enlazados, órdenes permitidos y un máximo de 100
registros por página.

Los registros que quedan en estado en curso por una interrupción se recuperan
como fallidos al siguiente arranque, con fecha de finalización y mensaje de
diagnóstico.

Los archivos de audio y portadas nunca se guardan como blobs de SQLite. En la
Fase 4 se guarda la ruta de portada y sus bytes se leen bajo demanda.

## Seguridad

- El frontend no tiene permiso de shell.
- No dispone de permiso ilimitado para el sistema de archivos.
- La única capability de plugin agregada en Fase 2 es dialog:allow-open.
- Rust valida cada ruta de carpeta recibida desde el frontend.
- El escáner no sigue enlaces simbólicos.
- Se rechazan raíces completas de disco.
- Los archivos del usuario nunca se mueven ni eliminan. Un proyecto solo puede
  renombrarse desde la acción dedicada del editor y tras confirmación explícita.
- Abrir, mostrar y renombrar resuelve la ruta desde el ID guardado en SQLite y
  comprueba que pertenezca a una carpeta supervisada.
- La portada se selecciona desde un diálogo nativo controlado por Rust, con
  formatos raster permitidos y límite de 12 MB.
- El protocolo asset inicia sin alcance. Rust autoriza una ruta de audio
  guardada únicamente después de validar proyecto, archivo, existencia y formato.
- La CSP bloquea fuentes, objetos y frames no declarados.

## Arquitectura

    Interfaz React
      → servicio Tauri tipado
      → comando expuesto
      → servicio de dominio
      → repositorio
      → SQLite

Los escaneos largos se ejecutan fuera del hilo de interfaz y envían progreso
mediante eventos Tauri. SQLite se bloquea únicamente durante operaciones
transaccionales breves, no mientras se recorre el sistema de archivos. Los
proyectos se consultan página por página; el frontend no carga la colección
completa en memoria.

Directorios principales:

    src/
      components/
      hooks/
      pages/
      services/
      stores/
      types/
      utils/

    src-tauri/src/
      commands/
      database/
      errors/
      models/
      platform/
      repositories/
      scanner/
      services/
      state/

## Verificación

    pnpm check
    pnpm test
    pnpm build
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --bundles nsis

Verificado en Windows el 19 de julio de 2026:

- Comprobación estricta de TypeScript: correcta.
- Vitest: 14 pruebas correctas en 4 archivos.
- Rust: 28 pruebas correctas.
- Build release optimizado de Tauri: correcto.
- Creación del instalador NSIS de Windows: correcta.
- Prueba de arranque release: el proceso inició y permaneció estable.
- La base real migró al esquema v4 conservando 249 proyectos indexados.
- Chunk JavaScript inicial final: 283.54 KB (89.46 KB gzip); las pantallas
  secundarias se generan como chunks diferidos.

Artefacto final de Windows:

    C:\Users\dev-y\.cargo\chilli-beat-target\release\bundle\nsis\Chilli Beat_0.1.0_x64-setup.exe

    Tamaño: 3,295,660 bytes
    SHA-256: BED2A2CFF3ED7BD37B50FA6CF0333DE2143531633ED5DD7F6E8277FE85A17EE5

El instalador se construyó pero no se instaló automáticamente. La ventana y la
salida real de audio no se inspeccionaron manualmente. `cargo fmt --check` no
pudo ejecutarse porque este toolchain no tiene instalado rustfmt.

Si lo requiere Windows Application Control:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --bundles nsis

## Limitaciones conocidas

- El escaneo automático y los watchers están desactivados intencionalmente;
  cada escaneo continúa siendo una acción explícita.
- La detección de movimientos es conservadora: nombre, extensión y tamaño deben
  identificar una única ruta antigua y una única ruta nueva.
- Los codecs dependen del webview del sistema; no se probó manualmente la salida
  física de audio en esta ejecución.
- Se verificaron el release y NSIS en Windows. macOS y Linux deben compilarse y
  probarse en sus sistemas respectivos.
- Los estados personalizados son una ampliación futura; los ocho estados del
  MVP ya están disponibles.

## Documentación por fase

- [Arquitectura de Fase 3](docs/architecture-phase-3.md)
- [Arquitectura de Fase 4](docs/architecture-phase-4.md)
- [Arquitectura de Fase 5](docs/architecture-phase-5.md)
- [Arquitectura y evidencia de release de Fase 6](docs/architecture-phase-6.md)
