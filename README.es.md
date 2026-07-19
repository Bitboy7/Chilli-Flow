# Chilli Beat

[English version](README.md)

Chilli Beat es una biblioteca de escritorio multiplataforma para localizar y
organizar proyectos de producción musical sin mover los archivos originales.

El proyecto incluye actualmente las **Fases 1 y 2** del MVP.

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

La búsqueda, biblioteca visual paginada y tarjetas pertenecen a la Fase 3.

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
9. Un escaneo completo marca como faltantes las rutas indexadas que desaparecen.
10. Cancelar conserva los descubrimientos parciales pero omite la detección de
    archivos faltantes.

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
- scan_history
- custom_extensions
- settings
- schema_migrations

Los archivos de audio y portadas nunca se guardan como blobs de SQLite. En fases
posteriores solo se registrarán sus rutas.

## Seguridad

- El frontend no tiene permiso de shell.
- No dispone de permiso ilimitado para el sistema de archivos.
- La única capability de plugin agregada en Fase 2 es dialog:allow-open.
- Rust valida cada ruta de carpeta recibida desde el frontend.
- El escáner no sigue enlaces simbólicos.
- Se rechazan raíces completas de disco.
- Los archivos del usuario nunca se mueven, renombran o eliminan.
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
transaccionales breves, no mientras se recorre el sistema de archivos.

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
    pnpm tauri build --debug --no-bundle

Verificado en Windows el 19 de julio de 2026:

- Comprobación estricta de TypeScript: correcta.
- Vitest: 3 pruebas correctas.
- Rust: 10 pruebas correctas.
- Build Tauri de depuración sin empaquetado: correcto.
- Prueba de arranque oculto: el proceso inició y permaneció estable.

La ventana no se inspeccionó manualmente durante la verificación automatizada.

Si lo requiere Windows Application Control:

    $env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
    cargo test --manifest-path src-tauri/Cargo.toml
    pnpm tauri build --debug --no-bundle

## Limitaciones actuales

- La búsqueda, filtros, ordenamiento, paginación y tarjetas de la Fase 3 aún no
  están implementados.
- La edición de metadatos comienza en la Fase 4.
- Los archivos asociados y preview de audio comienzan en la Fase 5.
- La interfaz de historial y las heurísticas de archivos movidos permanecen para
  la Fase 6, aunque el historial ya se guarda.
- El escaneo automático y los watchers están desactivados intencionalmente.
