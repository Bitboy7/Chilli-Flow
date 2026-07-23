# Organización de proyectos existentes

## Objetivo

La acción **Preparar estructura** proporciona una raíz individual para stems, mezclas, masters y referencias sin asumir que todos los usuarios quieren modificar la ubicación del archivo de su DAW.

Para un archivo suelto como `Beats/in my mind.flp`, Chilli Flow propone `Beats/in my mind/` como raíz. Si el archivo ya está dentro de una carpeta dedicada, reutiliza esa carpeta y evita crear `in my mind/in my mind/`.

## Métodos disponibles

### Copiar y organizar — recomendado

- Copia el archivo del DAW dentro de la raíz individual.
- Convierte la copia organizada en el proyecto principal de Chilli Flow.
- Conserva el original como una versión `copy` confirmada, visible en **Versiones** y fuera de la lista principal de la Biblioteca.
- Advierte que ambas copias pueden divergir si se editan por separado.

### Mover y organizar

- Mueve el archivo a la raíz individual mediante una operación de renombrado en el mismo volumen.
- Conserva el identificador, metadatos, notas y relaciones del proyecto.
- Advierte que un DAW puede necesitar localizar de nuevo recursos guardados mediante rutas relativas.

### Solo crear estructura

- Mantiene el archivo del DAW en su ruta actual.
- Crea una raíz individual para los recursos y configura sus rutas en Chilli Flow.
- Las rutas configuradas sustituyen a las carpetas inferidas de la misma categoría para evitar mezclar renders compartidos de la carpeta padre.

## Vista previa y confirmación

Cada cambio de método genera un plan nuevo y un token de un solo uso. La interfaz muestra:

- ruta de origen;
- ruta de destino, cuando corresponde;
- raíz existente o por crear;
- carpetas que ya existen y carpetas nuevas;
- riesgo específico del método;
- botón cuyo texto describe la acción física.

Al confirmar, el backend vuelve a calcular el plan. Si cambió el proyecto, el destino o las rutas, rechaza el token y exige una vista previa nueva.

## Garantías de seguridad

- La raíz propuesta debe permanecer dentro de la carpeta padre supervisada.
- El archivo de destino debe estar directamente dentro de la raíz propuesta.
- Nunca se sobrescribe un archivo de proyecto existente.
- Una carpeta propuesta que ya contiene otro formato de proyecto conocido se rechaza.
- Las rutas de stems, mezclas, masters y referencias se guardan en una sola transacción SQLite.
- Si falla la base de datos después de copiar, se elimina únicamente la copia creada por la operación.
- Si falla la base de datos después de mover, se intenta devolver el archivo a su ruta original.
- Las carpetas nuevas se retiran durante el rollback solo cuando fueron creadas por la operación; los directorios preexistentes y su contenido no se eliminan.

## Detección de una raíz dedicada

Una carpeta se considera dedicada cuando se cumple alguna de estas condiciones:

- el proyecto pertenece a un workspace administrado;
- el nombre de la carpeta coincide con el nombre físico del proyecto, ignorando espacios y signos;
- ya contiene una estructura reconocible como `Renders`, `Exports`, `Bounced Files`, `Audio`, `References` o `Project Info.json`.

En cualquier otro caso se propone una subcarpeta con el nombre físico del proyecto. La ruta exacta siempre aparece en la vista previa para resolver casos ambiguos antes de modificar el disco.

## Alcance y limitaciones

- Chilli Flow no interpreta ni reescribe el contenido propietario de `.flp`, `.als`, `.ptx` u otros formatos.
- Verificar que el proyecto abre y encuentra sus recursos sigue siendo responsabilidad del DAW.
- La detección de colisiones cubre las extensiones de proyecto integradas. Las extensiones personalizadas continúan protegidas por la comprobación de destino, pero no se usan todavía para identificar una carpeta ocupada.
- La operación organiza el archivo principal; las versiones y backups relacionados no se trasladan automáticamente.

## Ejemplo para FL Studio

```text
Antes
Beats/
└── in my mind.flp

Después de “Copiar y organizar”
Beats/
├── in my mind.flp                 # original conservado en Versiones
└── in my mind/
    ├── in my mind.flp             # proyecto principal
    ├── Renders/
    │   ├── Stems/
    │   ├── Mixes/
    │   └── Masters/
    └── References/
```
