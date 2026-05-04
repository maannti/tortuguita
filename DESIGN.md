# tortuguita — Sistema de Diseño

> **Leer antes de tocar cualquier componente.** Este archivo documenta las decisiones
> de diseño que ya están aprobadas. No cambiar sin consenso.
>
> Dashboard de referencia: commit `838dcd7366acb66506b6426f158e3cbb5a5f144f` en `maannti/tortuguita`

---

## Principios generales

- UI en español (Argentina). Meses, labels, botones: todo en español.
- Paleta: **mauve/dusty rose** como primario. Cards con `border` sutil, sin sombras agresivas.
- Bordes: `rounded-2xl` para listas/cards, `rounded-3xl` para hero.
- Texto secundario: `text-muted-foreground`. Nunca gris duro hardcodeado.
- Sin uppercase agresivo. Sin headers de color sólido en secciones.

---

## Dashboard (`home-dashboard.tsx`) ← DISEÑO APROBADO

El diseño de referencia es el commit `838dcd7`. **No alterarlo.**

### Hero card
- Card flotante con gradiente suave (NO fondo sólido de color primario)
- El gradiente lo define el propio componente — respetar los colores que ya estaban
- Dentro: navegación del mes `< Mayo 2026 >`, total grande, desglose por miembros
- Los miembros van en sub-cards redondeadas DENTRO del hero (no grid plano)
- Texto oscuro sobre gradiente (no texto blanco)

### Grupos de tarjeta de crédito
- Se muestran con el icono compuesto (logo banco + logo red: Mastercard, Visa, etc.)
- Expanded por defecto — NO usar accordion/toggle
- Header: icono + nombre de tarjeta + monto alineado a la derecha
- Debajo: desglose por miembro y lista de cuotas

### FAB (botón +)
- `fixed bottom-[88px] right-4 z-30` — bien despejado sobre la nav bar
- Al tocarlo: abre un action sheet (NO navega directamente a /bills/new)
- Action sheet tiene dos opciones: "Nuevo gasto" y "Importar resumen"
- "Importar resumen" → file picker → guarda en sessionStorage → navega a /ai

---

## Formularios

- Un solo botón **Guardar** al final del scroll (pill), sin sección duplicada fija al fondo
- `pb-28` en el contenedor scrolleable (para que el scroll no quede tapado por la nav)
- Header del formulario: `sticky top-0 z-10 bg-background/95 backdrop-blur-sm`

---

## Navegación inferior (`bottom-nav.tsx`)

Items: **Inicio · Gastos · Cuotas · Santi** (Settings)  
- `fixed bottom-0`, `h-16`, `pb-safe`
- Color activo: `text-primary`

---

## AI Chat (`app/(dashboard)/ai/page.tsx`)

### Layout mobile
```
flex md:hidden flex-col h-full bg-background pb-16
  ├─ flex-1 overflow-y-auto min-h-0   ← mensajes, scrolleable
  └─ flex-shrink-0 bg-background      ← input, NUNCA sticky, siempre visible
```

### Auto-import
- Al cargar: chequea `sessionStorage("pendingImport")`
- Si hay archivo → llama `autoSubmitImport(file)` directo (sin que el usuario escriba nada)
- Mensaje por defecto: "Analizá este resumen de tarjeta y mostrá las transacciones encontradas antes de importar."

---

## API AI (`app/api/ai/chat/route.ts`)

- Acepta `file: { name, type, data (base64) }` en el body
- Loop de tool use: máximo 8 iteraciones (no dos llamadas fijas)
- `max_tokens: 8192` (necesario para listar todos los movimientos de un resumen)
- Anti-duplicados: instrucción en system prompt para buscar con `search_bills` antes de importar

---

## Reglas de deploy

1. **Nunca** tocar `home-dashboard.tsx` sin tener claro el commit de referencia (`838dcd7`)
2. Para restaurar el dashboard visual: `git show 838dcd7366acb66506b6426f158e3cbb5a5f144f:components/dashboard/home-dashboard.tsx > components/dashboard/home-dashboard.tsx`
3. Usar siempre los scripts `deploy-*.sh` de `~/Desktop/logos/`
4. Después de deployar, verificar en el teléfono antes de cerrar la sesión
5. Si algo queda mal visualmente: `git revert HEAD` y rediseñar

