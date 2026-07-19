# Chilli Beat

Biblioteca de escritorio local para localizar y organizar proyectos musicales.
Esta entrega contiene únicamente la **Fase 1**: arquitectura base, interfaz,
Tauri y persistencia SQLite inicial.

## Estado de la Fase 1

Incluido:

- Tauri 2 con React 19, TypeScript estricto y Vite 7.
- Tailwind CSS 4, React Router 7, Zustand 5 y Lucide React.
- Layout oscuro responsive para ventana de escritorio.
- Rutas base de biblioteca, favoritos, recientes, DAWs, estados, carpetas,
  historial y configuración.
- SQLite administrado por Rust con claves foráneas, WAL, timeout y migraciones
  transaccionales.
- Esquema inicial con proyectos, estados, carpetas, etiquetas, archivos
  relacionados, historial, extensiones personalizadas y configuración.
- Un comando Tauri mínimo para comprobar el backend y mostrar conteos reales.
- Capabilities sin acceso general a archivos ni permisos de shell.
- Pruebas Rust para migración, estados iniciales y prevención de rutas
  duplicadas.

No incluido todavía: selección de carpetas, escaneo, búsqueda funcional,
tarjetas con proyectos, edición ni operaciones sobre archivos. Los controles
correspondientes se muestran deshabilitados y con la fase prevista.

## Requisitos

- Node.js 22 o una versión LTS compatible.
- pnpm 11.
- Rust estable.
- Dependencias de sistema de Tauri 2 para la plataforma:
  [prerrequisitos oficiales](https://v2.tauri.app/start/prerequisites/).

En Windows se requiere Microsoft C++ Build Tools y WebView2. La aplicación no
usa Electron.

## Instalación y ejecución

```powershell
pnpm install
pnpm tauri dev
```

`pnpm dev` sirve únicamente la interfaz web. En ese modo se mostrará un aviso
honesto porque no existe proceso Rust ni acceso a SQLite.

La base se crea al arrancar la aplicación Tauri en el directorio de datos
resuelto por la API de Tauri para cada sistema operativo, con el nombre
`chilli-beat.sqlite3`. No se construyen rutas de plataforma manualmente.

## Verificación

```powershell
pnpm check
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
cargo check --manifest-path src-tauri/Cargo.toml
```

Si Windows Application Control bloquea build-scripts generados dentro de
`Documents`, usa una caché de compilación permitida:

```powershell
$env:CARGO_TARGET_DIR="$env:USERPROFILE\.cargo\chilli-beat-target"
cargo test --manifest-path src-tauri/Cargo.toml
pnpm tauri build --debug --no-bundle
```

Para una verificación visual completa:

1. Ejecuta `pnpm tauri dev`.
2. Confirma que abre una ventana titulada **Chilli Beat**.
3. Comprueba que la Biblioteca indica “Esquema SQLite v1”.
4. Navega por todas las opciones de la barra lateral.
5. Contrae la barra y cambia entre las vistas de tarjetas y tabla.

## Arquitectura

```text
src/
├── components/
│   ├── layout/
│   └── ui/
├── hooks/
├── pages/
├── services/
├── stores/
├── styles/
└── types/

src-tauri/src/
├── commands/
├── database/
│   └── migrations/
├── errors/
├── models/
├── platform/
├── repositories/
├── scanner/
├── services/
├── state/
├── lib.rs
└── main.rs
```

El flujo nativo es:

```text
React → comando Tauri → servicio → repositorio → SQLite
```

Las consultas SQL no se exponen al frontend. `lib.rs` solo ensambla el estado,
la inicialización y los comandos permitidos.

## Migraciones

Las migraciones viven en
`src-tauri/src/database/migrations/` y se ejecutan por versión dentro de una
transacción. Para una nueva modificación del esquema, agrega un archivo SQL y
regístralo en `migrations.rs`; no edites una migración que ya haya sido
publicada.

## Seguridad actual

- El frontend solo puede invocar `get_app_status`.
- No existe permiso de shell.
- No existe permiso global del sistema de archivos.
- No se ha habilitado el plugin opener.
- La CSP bloquea objetos, marcos y orígenes no declarados.
- Ningún archivo del usuario se mueve, abre, renombra o escanea en esta fase.

En la Fase 2, los selectores y rutas autorizadas se incorporarán con capabilities
específicas y validación nativa.

## Verificación de esta entrega

Ejecutado en Windows el 19 de julio de 2026:

- `pnpm check`: correcto.
- `pnpm build`: correcto; 1,816 módulos transformados.
- `cargo test`: 2 pruebas correctas, 0 fallos.
- `pnpm tauri build --debug --no-bundle`: correcto.
- Arranque breve del ejecutable: correcto; creó
  `chilli-beat.sqlite3` en el directorio de datos de Tauri.

Limitaciones conocidas de la verificación:

- No se realizó una inspección visual manual de la ventana.
- `rustfmt` no está instalado en el toolchain local, por lo que
  `cargo fmt` no pudo ejecutarse.
- El linker de Windows imprimió un aviso informativo al crear la biblioteca de
  importación; no produjo errores ni pruebas fallidas.
