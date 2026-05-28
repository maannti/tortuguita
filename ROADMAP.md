# Tortuguita v2 — Roadmap de Mejoras

> Última actualización: 23 Mayo 2026
> Este archivo sirve como planificación entre sesiones de desarrollo.

---

## Estado General

| Fase | Progreso | Próximo paso |
|------|----------|--------------|
| **Alta Prioridad** | 8/8 completados ✅ | — |
| **Media Prioridad** | 2/6 completados | Dashboard widget saldo compartido |
| **Baja Prioridad** | 0/4 completados | — |

---

## ALTA PRIORIDAD — Quick Wins

### 1. Búsqueda Global
- **Estado:** `[x]` ✅ Completado (15 Mayo 2025)

Filtro server-side en Prisma, búsqueda en label/notas/categoría/billType. Componente `SearchInput` con debounce 300ms. URL params para persistencia.

---

### 2. Filtros en /bills
- **Estado:** `[x]` ✅ Completado (15 Mayo 2025)

ActionBar con búsqueda inline + FilterSheet con multi-select por categoría y tarjeta, agrupado por espacio.

---

### 3. Vista Wallet de Tarjetas (/tarjetas)
- **Estado:** `[x]` ✅ Completado (16 Mayo 2025)

Rediseño /cuotas → /tarjetas estilo Apple Wallet. Logos de bancos/redes reales, colores pastelizados, barra de progreso de cuotas, widget en dashboard.

---

### 4. Gastos Recurrentes
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)

Cron job diario → push notification de recordatorio → pantalla de confirmación rápida pre-llenada. Toggle en formulario de gasto. Vista `/bills/recurring`.

---

### 5. AI con Contexto de Gastos
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)

Tool `get_spending_trend` + system prompt proactivo con personalidad. Claude responde preguntas sobre gastos reales del usuario.

---

### 6. Arreglar Rediseño de Login
- **Estado:** `[x]` ✅ Completado (21 Mayo 2025)

Paleta pastel oficial, tipografía Fraunces, diseño mobile-first consistente con el resto de la app.

---

### 7. Adaptación Web / Desktop
- **Estado:** `[x]` ✅ Completado (22 Mayo 2026)

Sidebar nav en lg+, contenido centrado con `max-w-xl mx-auto`, bottom nav oculto en desktop. Header adaptivo con logo oculto en lg (lo muestra el sidebar). Avatares de miembros adaptativos: chips para 1-2, avatar-grid para 3+.

#### Archivos modificados
- `components/layout/side-nav.tsx` — *(NUEVO)* sidebar sticky con logo, nav items y user/settings
- `app/(dashboard)/layout.tsx` — flex layout: sidebar + main con header/content/bottom-nav
- `components/layout/bottom-nav.tsx` — `lg:hidden`
- `components/layout/simple-header.tsx` — logo `lg:hidden`, inner div `lg:max-w-xl lg:mx-auto`
- `app/globals.css` — overrides de padding-bottom en desktop

---

### 8. Registro de Pagos entre Miembros ("¿Ya me pagaste?")
- **Estado:** `[x]` ✅ Completado (22–23 Mayo 2026)

Vista `/bills/shared` con balance neto mensual por persona. Swipe bidireccional para saldar gastos individuales. Tickbox en header de cada grupo para saldar todo de una. Grupos siempre visibles aunque todo esté saldado (para ver historial y deshacer).

#### Features implementados
- Hero card con "Te deben" / "Debés" + barra de progreso
- Selector de espacio + navegación por mes
- Tiles de miembros: cuadrados con bordes redondeados, distribución uniforme en grid
- `SwipeableBillRow`: swipe izquierda o derecha → saldar. Botón circular visible en mobile y desktop
- `BillGroup` header: swipe para saldar todo, tickbox circular (verde ✓ cuando todo está saldado)
- Fix UTC: filtro de fecha usa `Date.UTC()` para no excluir bills almacenados a medianoche UTC
- Fix visibilidad: grupos con netAmount=0 (todo saldado) siguen apareciendo

#### Archivos creados/modificados
- `app/(dashboard)/bills/shared/page.tsx`
- `app/api/shared-balance/route.ts`
- `app/api/bills/[id]/settle/route.ts`
- `components/bills/shared-balance-view.tsx`

---

## MEDIA PRIORIDAD — Features Nuevos

### 20. Dashboard Widget — Saldo Compartido
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Alta
- **Esfuerzo estimado:** 1 sesión
- **Impacto:** Visibilidad del saldo pendiente desde el home

#### Descripción
Widget en el dashboard home que muestra el saldo neto pendiente con otros miembros del espacio compartido activo. Si te deben → verde; si debés → rosa. Tap → navega a `/bills/shared`.

#### Opción acordada (B)
Tarjeta compacta debajo del hero del dashboard con:
- Total "te deben" y "debés" del mes actual
- Avatares de las personas con deuda pendiente
- Link a `/bills/shared` para el detalle

---

### 21. Notificaciones — Revisión y Mejora
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1 sesión

#### Descripción
La infraestructura de notificaciones push está lista (FCM, service worker, cron). Falta revisar y ampliar los casos de uso:
- [ ] Notificación cuando termina el mes con saldo compartido pendiente
- [ ] Revisar notificaciones de cierre de TC (3/1/0 días) — ¿funcionan bien?
- [ ] Revisar notificaciones de gastos recurrentes — ¿llegan?
- [ ] Mejorar copy de las notificaciones

---

### 7b. Quick-Add — Simplificación del formulario
- **Estado:** `[x]` ✅ Completado (21 Mayo 2025)

Campos "Monto en USD" y "Detalle" colapsados por defecto, se revelan con links. El formulario actual es suficientemente bueno.

---

### 8. Compartir Gasto Individual
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1-2 días

Generar imagen compartible de un gasto (html2canvas o similar), botón "Compartir" en detalle, Web Share API para WhatsApp/Instagram.

---

### 9. Capacitor → App Stores
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1-2 semanas

Wrappear la PWA con Capacitor para publicar en App Store y Play Store.

---

### 10. Notificaciones Push
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)

FCM + service worker + bandeja de notificaciones en header. Notif: gasto compartido, resumen mensual, cierres de TC, gastos recurrentes.

---

### 11. Referral System
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja

Sistema de referidos para crecimiento orgánico.

---

### 12. Tier Pro (Monetización)
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Alta (para sustentabilidad)
- **Esfuerzo estimado:** 2 semanas

Plan pago con features premium. Integración Stripe / MercadoPago. Decisión pendiente sobre cuál primero.

---

### 22. Cafecito
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 15 minutos

Agregar link de cafecito.app en la página de Configuración (`/settings`), al final. Botón discreto tipo `☕ Invitame un cafecito`.

---

## BAJA PRIORIDAD — Nice to Have

### 13. Analytics Avanzados (Gráficos de Tendencia)
- **Estado:** `[ ]` Pendiente
- **Esfuerzo estimado:** 1 semana

Gráficos de tendencia, comparación mes a mes, proyecciones.

---

### 14. Exportación de Datos (CSV/Excel)
- **Estado:** `[ ]` Pendiente
- **Esfuerzo estimado:** 2-3 días

---

### 15. Integraciones Bancarias
- **Estado:** `[ ]` Pendiente
- **Esfuerzo estimado:** Variable

Conexión directa con bancos para importar transacciones automáticamente.

---

### 16. Widgets iOS/Android
- **Estado:** `[ ]` Pendiente
- **Esfuerzo estimado:** 1-2 semanas

Widgets para home screen con gasto del mes o próximos vencimientos.

---

### 17. Agente de Testeo Visual End-to-End
- **Estado:** `[ ]` Pendiente
- **Esfuerzo estimado:** 1-2 días

Sub-agente que recorra la app de arriba a abajo después de cada cambio grande de layout/UI y reporte regresiones visuales.

**Alcance:**
- Login automático con el usuario de test (santimarcos8@hotmail.com)
- Visita cada ruta protegida: `/dashboard`, `/bills`, `/tarjetas`, `/cards`, `/categories`, `/settings`, `/incomes`, `/income-types`, `/ai`
- Screenshot por ruta + lectura de `console.error` y errores de hidratación
- Reporta una tabla `Ruta | Status (✅/⚠️/❌) | Nota` y una sección de errores JS
- Usa las tools `mcp__Claude_in_Chrome__*` y `browser_batch` para minimizar round-trips

**Cómo lanzarlo:**
```
Decile a Claude: "corré el agente de testeo visual"
```
El prompt detallado quedó pendiente de armar en `.claude/agents/` o como slash command.

**Trigger sugerido:**
- Antes de cada `git push` que toque layouts o componentes compartidos
- Después de actualizar Tailwind o Next.js

---

## Backlog — Mejoras Menores

### UI/UX
- [ ] Dark mode: audit completo de colores hardcodeados (bg-white, text-[#...]) en vistas secundarias
- [ ] Agrupar gastos por día en /bills
- [ ] Skeleton screens consistentes
- [ ] Command palette global (Cmd+K)

### Tech Debt
- [ ] Migrar forwardRef restantes (shadcn)
- [ ] Unificar loading states
- [ ] Tests E2E con Playwright
- [ ] Documentar API con OpenAPI/Swagger

---

## Log de Sesiones

### Sesión: 23 Mayo 2026
- **Trabajo realizado:**
  - ✅ Fix bug: gastos compartidos no aparecían en `/bills/shared` por filtro de fecha con timezone local (UTC-3) — corregido a `Date.UTC()`
  - ✅ Fix bug: grupos de balance desaparecían al saldar todo (netAmount=0) — ahora siempre visibles si hay bills
  - ✅ Tiles de miembros: circular → cuadrado con bordes redondeados (`rounded-2xl`), grid uniforme con `gridTemplateColumns: repeat(N, 1fr)`
  - ✅ Botones de saldar: tickbox en header del grupo (saldar todo), círculo visible en mobile y desktop, swipe sigue funcionando
  - ✅ v2.1.1 pusheado a producción

### Sesión: 22 Mayo 2026
- **Trabajo realizado:**
  - ✅ **Ítem 7 — Adaptación Desktop:** sidebar nav lg+, contenido centrado, header adaptivo, bottom nav oculto
  - ✅ Avatares adaptativos en dashboard y shared-balance: chips (≤2), avatar-grid con iniciales (≥3)
  - ✅ Dark mode: `AiInsightWidget` completamente controlado por JS (`useTheme` + inline styles)
  - ✅ Fix `Decimal(10,2)` → `Decimal(14,2)` para montos grandes en ARS (ALTER TABLE directo en Neon)
  - ✅ Detección de duplicados mejorada: comprobante exacto + proximidad de fecha + `sourceDescription` oculto
  - ✅ **Ítem 8 — Shared Balance:** swipe bidireccional, saldar todo, swipe en header de grupo
  - ✅ v2.1.0 pusheado a producción

### Sesión: 22 Mayo 2026 (parte 1)
- **Trabajo realizado:**
  - ✅ Gastos compartidos: fix $0, fix settle por dirección, hero en tiempo real
  - ✅ Chips adaptativos en shared-balance
  - ✅ Test data: "Viaje Bariloche 2026" con 6 miembros + 10 gastos compartidos
  - ✅ Deploy v2.0.2

### Sesión: 17 Mayo 2025
- **Trabajo realizado:**
  - ✅ Fix build errors Vercel
  - ✅ Fix chatbot follow-ups
  - ✅ **Ítem 10: Notificaciones Push FCM** — infraestructura completa
  - ✅ Bandeja de notificaciones (bell header + dropdown, DB, cleanup)
  - ✅ **Ítem 4: Gastos Recurrentes** — cron → push → confirmación
  - ✅ **Ítem 5: AI con contexto** — tool get_spending_trend, personalidad
  - ✅ PWA install prompt (iOS + Android)
  - ✅ Loading skeletons

### Sesiones: 15–16 Mayo 2025
- ✅ Ítem 1: Búsqueda Global
- ✅ Ítem 2: Filtros en /bills
- ✅ Ítem 3: Vista Wallet /tarjetas (Apple Wallet style)
- ✅ Widget tarjetas en dashboard

---

## Notas Técnicas

### Convenciones de código
- Un archivo por commit cuando sea posible
- Nunca `git add .`, siempre archivos específicos
- UI text en español
- Montos con `Intl.NumberFormat("es-AR")`
- Fechas con `date-fns` locale español
- **No pushear a prod sin instrucción explícita del usuario**

### Archivos clave
- `CLAUDE.md` — referencia rápida del proyecto
- `ROADMAP.md` — este archivo
- `components/dashboard/home-dashboard.tsx` — diseño aprobado, **NO modificar sin permiso explícito**

### Stack
- Next.js 16 App Router · TypeScript · Tailwind · Prisma (PostgreSQL/Neon) · NextAuth v5 · Anthropic SDK

### APIs externas
- **Anthropic:** Claude 3.5 Sonnet para AI
- **Resend:** Emails transaccionales
- **Firebase:** Push notifications (FCM)
- **Vercel:** Hosting + Cron Jobs
- **Neon:** PostgreSQL serverless

### Decisiones tomadas
- Modelo de recurrencias → `RecurringBill` separado ✅
- Búsqueda → en /bills con URL params, Cmd+K para futuro
- Desktop → sidebar lg+ (Opción B) ✅
- Shared balance → balance neto mensual con drill-down ✅
- Monetización → Stripe vs MercadoPago pendiente de decidir
- App nativa → Capacitor al final, cuando haya validación de usuarios
- Ads (AdMob/AdSense) → **NO**, no es coherente con una app de finanzas personales

---

## Banco de Ideas

### Presupuestos por Categoría
En contexto de inflación argentina los límites se desactualizan rápido. La AI con `get_spending_trend` cubre el caso principal sin fricción. Rescatar si hay demanda explícita.

### Multi-moneda (USD/EUR)
Soporte nativo para múltiples monedas, conversión automática, reportes por moneda. Baja prioridad hasta que haya más usuarios.

### Modo Offline Mejorado
Agregar gastos offline y sincronizar al volver la conexión. Baja prioridad.
