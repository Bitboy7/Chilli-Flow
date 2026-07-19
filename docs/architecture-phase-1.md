# Arquitectura de la Fase 1

## Decisiones

1. **SQLite pertenece al backend.** Rust controla conexión, migraciones y
   consultas; React recibe DTOs serializables.
2. **Persistencia local portable.** La ruta se obtiene con
   `app.path().app_data_dir()`, nunca con literales propios de Windows.
3. **Migraciones simples y explícitas.** Un registro interno de versiones y
   transacciones SQLite evita depender de un ORM antes de necesitarlo.
4. **Permisos por incremento.** La Fase 1 conserva solo `core:default`; cada
   operación futura pedirá el permiso mínimo que realmente utilice.
5. **UI preparada, no simulada.** Las rutas futuras explican su fase. Solo el
   estado SQLite se consulta de verdad.
6. **Estado global pequeño.** Zustand conserva únicamente preferencias de
   interfaz; los futuros resultados paginados no se cargarán completos en él.

## Riesgos

- Tauri necesita dependencias nativas diferentes por sistema operativo.
- La vista web de Vite no puede validar comandos nativos ni SQLite.
- El CSP deberá ampliarse cuidadosamente al introducir portadas y audio local.
- Una sola conexión protegida por mutex es adecuada para la inicialización; la
  estrategia se reevaluará con escaneos concurrentes y escritura por lotes.

## Criterios de finalización

- TypeScript estricto y build de Vite correctos.
- Compilación y pruebas Rust correctas.
- Creación automática de SQLite y aplicación de la migración v1.
- Navegación y layout funcionales en una ventana Tauri.
- Dependencias obligatorias integradas.
- Capabilities y CSP sin acceso general al equipo.
- Instrucciones de instalación, ejecución y verificación reproducibles.
