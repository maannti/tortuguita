# tortuguita — Sistema de Diseño

> Referencia para mantener continuidad visual entre deploys.
> Si vas a tocar cualquier componente, leé esto primero.

---

## Paleta y lenguaje visual

- **Color primario**: mauve/dusty rose — se usa para el FAB, íconos activos en nav, botón Guardar
- **Bordes y cards**: `rounded-2xl` para listas, `rounded-3xl` para cards hero/grandes
- **Fondo de cards**: `bg-card` con `border` sutil, sin sombras agresivas
- **Texto secundario**: `text-muted-foreground`, nunca gris duro
- **Texto de sección**: `text-sm font-semibold text-foreground` (no uppercase, no tracking wide)

---

## Componentes clave

### Dashboard (`home-dashboard.tsx`)

**Hero card** — flotante, gradiente suave sage→rose, texto oscuro encima:
```
background: linear-gradient(135deg, #c8d8c4 0%, #ddd0c8 50%, #dfc5c8 100%)
rounded-3xl, px-4 pt-4, dark text (no white)
```
Contiene: navegación de mes (< mes >) + total grande centrado + desglose por miembros.

**Tarjetas de crédito** — lista colapsable (`rounded-2xl border bg-card`):
- Fila resumen: círculo de color del grupo + nombre + "X cuotas activas" + monto + chevron
- Al tocar: se expande inline mostrando desglose por miembro y lista de cuotas
- NO usar headers de color sólido de fondo

**FAB** — `fixed bottom-[88px] right-4` para quedar sobre la nav bar (que mide `h-16` + `pb-safe`)

---

### Formularios (`quick-bill-form`, `card-form`, `category-form-v2`)

- Un solo botón **Guardar** en pill al final del scroll, sin sección de botones fija al fondo duplicada
- `pb-28` en el contenedor scrolleable para que el contenido no quede tapado por la nav
- Header sticky: `sticky top-0 z-10 bg-background/95 backdrop-blur-sm`

---

### Navegación inferior (`bottom-nav.tsx`)

Items: **Inicio** · **Gastos** · **Cuotas** · **Santi** (Config)
- `fixed bottom-0`, `h-16`, `pb-safe`
- Color activo: `text-primary`
- Color inactivo: `text-muted-foreground`

---

### Pantalla de AI (`ai/page.tsx`)

Layout mobile:
- Contenedor outer: `flex md:hidden flex-col h-full bg-background pb-16`
- Mensajes: `flex-1 overflow-y-auto min-h-0` (scrolleable, fuera del input)
- Input: `flex-shrink-0` al final del flex column (NO sticky)

Auto-import: cuando llega con `sessionStorage("pendingImport")`, ejecuta `autoSubmitImport()` directo sin intervención del usuario.

---

## Reglas de deploy

1. **Siempre** usar los scripts `deploy-*.sh` de `~/Desktop/logos/`
2. Cada script embeds el archivo como base64 → no depende de git diff en el sandbox
3. Después de un deploy, verificar en producción antes de cerrar la sesión
4. Si algo queda "feo", no pushear encima — hacer rollback con `git revert HEAD` y rediseñar

