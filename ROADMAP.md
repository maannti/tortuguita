# Tortuguita v2 — Roadmap de Mejoras

> Última actualización: 17 Mayo 2025
> Este archivo sirve como planificación entre sesiones de desarrollo.

---

## Estado General

| Fase | Progreso | Próximo paso |
|------|----------|--------------|
| **Alta Prioridad** | 5/6 completados | Arreglar rediseño de login |
| **Media Prioridad** | 0/6 completados | Presupuestos o Quick-Add |
| **Baja Prioridad** | 0/6 completados | — |

---

## ALTA PRIORIDAD — Quick Wins

> Mejoras con alto impacto y esfuerzo bajo-medio. Atacar primero.

### 1. Búsqueda Global
- **Estado:** `[x]` ✅ Completado (15 Mayo 2025)
- **Prioridad:** Alta
- **Esfuerzo real:** ~30 minutos
- **Impacto:** Desbloquea usuarios con muchos datos

#### Descripción
Agregar búsqueda por texto en gastos (label, notas, categoría). Debe ser accesible desde /bills y potencialmente desde el header global.

#### Archivos modificados/creados
- `app/(dashboard)/bills/page.tsx` — acepta `?search=` param, filtra en Prisma
- `components/bills/bills-view.tsx` — muestra SearchInput, empty state contextual
- `components/ui/search-input.tsx` — **(NUEVO)** componente reutilizable con debounce

#### Implementación final
1. [x] Filtro server-side en Prisma con `contains` + `mode: "insensitive"`
2. [x] Búsqueda en: label, notas, nombre de categoría, nombre de billType
3. [x] Componente `SearchInput` con debounce 300ms
4. [x] URL params (`?search=`) para persistencia y compartir
5. [x] Empty state diferenciado: "sin resultados" vs "sin gastos"
6. [ ] (Pendiente) Command palette global (Cmd+K) — para futuro

#### Criterios de éxito
- ✅ Búsqueda por label funciona
- ✅ Búsqueda por nombre de categoría funciona
- ✅ Mobile-friendly (no rompe layout)
- ⏳ Performance: pendiente validar con muchos datos

#### Notas de implementación
```
Patrón usado: URL params + Server Component (Next.js App Router pattern)
- No se usa API endpoint, se filtra directamente en page.tsx con Prisma
- El SearchInput actualiza la URL, lo que triggerea re-render del Server Component
- Debounce de 300ms para evitar requests excesivos
- Clear button (X) y soporte para Escape key
```

---

### 2. Filtros en /bills
- **Estado:** `[x]` ✅ Completado (15 Mayo 2025)
- **Prioridad:** Alta
- **Esfuerzo real:** ~1 hora
- **Impacto:** Reduce fricción diaria

#### Descripción
Permitir filtrar gastos por: categoría, tarjeta de crédito. Los filtros deben ser combinables (multi-select).

#### Archivos modificados
- `app/(dashboard)/bills/page.tsx` — query params `categoryIds`, `cardIds` (multi-select)
- `components/bills/bills-view.tsx` — ActionBar + FilterSheet integrados

#### Implementación final
1. [x] **ActionBar** debajo del hero con colores de gradiente
2. [x] Botón "Buscar" que se expande inline con búsqueda en tiempo real
3. [x] Botón "Filtros" que abre bottom sheet
4. [x] **FilterSheet** con multi-select agrupado por espacio (Personal/Casa)
5. [x] Categorías y Tarjetas separadas dentro de cada espacio
6. [x] URL params `?categoryIds=a,b&cardIds=c,d` para multi-select
7. [x] Botones Limpiar/Aplicar en el sheet

#### Criterios de éxito
- ✅ Puedo filtrar por múltiples categorías
- ✅ Puedo filtrar por múltiples TCs
- ✅ Puedo combinar filtros (categorías + TCs)
- ✅ Los filtros persisten en URL
- ✅ El total del hero se actualiza en vivo con búsqueda

#### Notas de implementación
```
Patrón: ActionBar + Bottom Sheet
- ActionBar usa mismos colores del hero (gradiente pastel)
- Búsqueda se expande inline en la ActionBar (no abre sheet)
- Búsqueda usa debounce 300ms + useTransition para updates no-blocking
- FilterSheet agrupa por organización (como el resumen-importer)
- Multi-select con checkmarks (Set<string> para tracking)
```

#### Pendiente evaluar
- [ ] **Secciones colapsables en FilterSheet**: Se discutió agregar flechitas para colapsar
      categorías por espacio. Decisión: NO implementar por ahora. El filtro debe mostrar
      todas las opciones de un vistazo. Evaluar después de unos días de uso si realmente
      hace falta.

---

### 3. Vista Wallet de Tarjetas (/tarjetas)
- **Estado:** `[x]` ✅ Completado (16 Mayo 2025)
- **Prioridad:** Alta
- **Esfuerzo real:** ~2 sesiones
- **Impacto:** Visibilidad de gastos y cuotas por tarjeta, reemplaza /cuotas

#### Descripción
Rediseño completo de /cuotas → nueva ruta /tarjetas con estilo Apple Wallet. Tarjetas visuales con logos de bancos y redes, gastos expandibles, barra de progreso de cuotas.

#### Implementación final
1. [x] Nueva ruta `/tarjetas` y `/tarjetas/new`
2. [x] Componente `TarjetasWalletView` con tarjetas estilo Apple Wallet
3. [x] Logos de bancos reales (PNG/SVG) en `/public/banks/`
4. [x] Logos de redes reales (PNG) en `/public/networks/`
5. [x] Campo `bank` agregado a `BillType` (schema + API + form)
6. [x] Colores de fondo por banco (`BANK_COLORS`) — pastelizados (45% blend con blanco)
7. [x] Blanqueo de logos con `brightness-0 invert` para Santander y Ciudad
8. [x] Badges de red en `CardIcon` usan imagen real (amex, cabal) en vez de letras
9. [x] Bottom nav actualizado de /cuotas → /tarjetas
10. [x] Rutas viejas `/cuotas` eliminadas
11. [x] Widget en dashboard: stack Apple Wallet top 3 tarjetas, idéntico visualmente a /tarjetas

#### Archivos creados
- `app/(dashboard)/tarjetas/page.tsx`
- `app/(dashboard)/tarjetas/new/page.tsx`
- `components/tarjetas/tarjetas-wallet-view.tsx`
- `public/banks/` — 15 logos de bancos
- `public/networks/` — 4 logos de redes

#### Archivos modificados
- `prisma/schema.prisma` — campo `bank` en `BillType`
- `lib/validations/bill-type.ts` — campo `bank` opcional
- `components/cards/card-form.tsx` — guarda `bank`
- `components/ui/card-network.tsx` — badges amex/cabal con imagen
- `components/layout/bottom-nav.tsx` — link a /tarjetas
- `components/cuotas/cuotas-view.tsx` — links internos a /tarjetas

---

### 4. Gastos Recurrentes
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)
- **Prioridad:** Alta (retomar después de notificaciones)
- **Esfuerzo estimado:** 1-2 días adicionales (base ya construida)
- **Impacto:** Elimina data entry repetitivo

#### Descripción
Marcar un gasto como recurrente para que el sistema te *recuerde* confirmarlo cada mes — no lo genera automáticamente. El cron dispara una notificación push: *"¿Te llegó el alquiler? El mes pasado fue $X"*. El usuario solo confirma o ajusta el monto y se crea el Bill.

**Por qué este enfoque y no auto-generación:** en Argentina los montos cambian frecuentemente. Auto-generar crearía gastos con monto desactualizado. La confirmación manual es obligatoria, pero el sistema la hace trivial.

#### Lo que ya está construido ✅
- `prisma/schema.prisma` — modelos `RecurringBill` + `RecurringBillAssignment` (ya en DB)
- `app/api/recurring-bills/route.ts` — GET (lista) + POST (crear)
- `app/api/recurring-bills/[id]/route.ts` — GET + PATCH + DELETE (con `?deleteGenerated=true`)
- `app/api/cron/create-recurring/route.ts` — cron job (actualmente auto-genera; cambiar a notificación)
- `vercel.json` — cron configurado `0 9 * * *`
- `lib/validations/recurring-bill.ts` — schema Zod
- `components/bills/recurring-bills-view.tsx` — vista /bills/recurring (lista activas/pausadas, context menu)
- `app/(dashboard)/bills/recurring/page.tsx` — página de lista

#### Lo que está oculto en UI (comentado, listo para descomentar)
- `components/bills/quick-bill-form.tsx` — toggle "Repetir mensualmente" con selector de día
- `components/bills/bills-view.tsx` — link "Gastos recurrentes →" debajo del ActionBar

#### Lo que falta para completar
1. [ ] **Ítem 10 primero:** setup notificaciones push (FCM + service worker)
2. [ ] Cambiar cron: en vez de crear Bill, enviar notificación push con quick-action
3. [ ] Pantalla de confirmación rápida (pre-llenada con último monto)
4. [ ] Descomentar UI en formulario y bills-view
5. [ ] Test end-to-end del flujo completo

#### Criterios de éxito
- Puedo marcar un gasto como recurrente
- Recibo notif el día configurado: *"¿Te llegó X? El mes pasado fue $Y"*
- Con un tap confirmo o ajusto el monto → se crea el Bill
- Puedo pausar/eliminar una recurrencia desde /bills/recurring

---

### 5. AI con Contexto de Gastos
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)
- **Prioridad:** Alta
- **Esfuerzo estimado:** 3-4 días
- **Impacto:** Diferenciador único

#### Descripción
El chat de AI actualmente no tiene acceso a los gastos del usuario. Debería poder responder preguntas como "¿cuánto gasté en comida este mes?" o "¿cuál es mi categoría más cara?".

#### Archivos a modificar/crear
- `lib/ai/tools.ts` — agregar tools para consultar gastos
- `lib/ai/tool-handlers.ts` — implementar handlers
- `app/api/ai/chat/route.ts` — asegurar que tools funcionan
- `components/ai/chat-message.tsx` — renderizar respuestas con datos

#### Plan de implementación
1. [ ] Definir tools disponibles para Claude:
   - `get_expenses_summary` — total por mes/categoría
   - `get_recent_expenses` — últimos N gastos
   - `get_category_breakdown` — gasto por categoría
   - `get_spending_trend` — comparación mes a mes
   - `search_expenses` — buscar por texto
2. [ ] Implementar handlers con queries Prisma
3. [ ] Asegurar que solo accede a datos del usuario actual
4. [ ] Testear prompts comunes:
   - "¿Cuánto gasté este mes?"
   - "¿En qué categoría gasto más?"
   - "Comparame este mes con el anterior"
5. [ ] Mejorar UI para mostrar datos estructurados (tablas, mini-charts)

#### Criterios de éxito
- Claude puede responder "¿cuánto gasté en X?"
- Las respuestas incluyen datos reales del usuario
- No hay acceso a datos de otros usuarios (security)
- Respuestas en <3 segundos

#### Notas de implementación
```
(agregar notas durante desarrollo)
```

---

### 6. Arreglar Rediseño de Login
- **Estado:** `[x]` ✅ Completado (21 Mayo 2025)
- **Prioridad:** Alta
- **Impacto:** UX crítica — primera impresión del usuario

#### Descripción
El flujo de login funciona bien, pero el diseño visual está desactualizado. Necesita alinearse con la estética del resto de la app (paleta pastel, tipografía, espaciado).

#### Problemas actuales
- Colores no coinciden con la paleta de la app (Sage, Peach, Pink, Dusty Rose, Mauve)
- Diseño genérico, no refleja la identidad visual de Tortuguita

#### Archivos a modificar
- `app/(auth)/login/page.tsx`
- `app/(auth)/signup/page.tsx` (probablemente mismo problema)
- Componentes relacionados en `app/(auth)/`

#### Plan de implementación
1. [ ] Aplicar paleta de colores oficial (gradiente hero, acentos)
2. [ ] Actualizar tipografía (Fraunces para títulos/montos)
3. [ ] Mejorar espaciado y layout (mobile-first)
4. [ ] Agregar elementos visuales de marca (logo, ilustraciones)
5. [ ] Testear en mobile y desktop

#### Criterios de éxito
- Login se siente parte de la misma app que el dashboard
- Usa la paleta pastel oficial
- Primera impresión positiva del usuario

---

## MEDIA PRIORIDAD — Features Nuevos

> Funcionalidades que agregan valor significativo pero requieren más esfuerzo.

### 6. ~~Presupuestos por Categoría~~ → movido a Banco de Ideas

---

### 20. Registro de Pagos entre Miembros ("¿Ya me pagaste?")
- **Estado:** `[ ]` Pendiente — a diseñar
- **Prioridad:** Alta
- **Esfuerzo estimado:** A definir tras exploración
- **Impacto:** Muy pedido para espacios compartidos

#### Descripción
Para gastos compartidos, poder registrar si la otra persona ya pagó su parte. La idea explorada: **balance mensual neto** entre miembros del hogar — al final del mes ves "Juan te debe $12.400" → botón "Saldar" que cierra el período.

#### Opciones a explorar
- **Opción A (granular):** cada gasto compartido tiene estado `pendiente/pagado` por miembro → más control, más fricción
- **Opción B (balance mensual):** vista de saldo neto entre miembros + "Saldar" al cierre de mes → más natural para convivencia diaria
- **Combinación:** balance como vista principal + drill-down a los gastos que componen la deuda

#### Preguntas pendientes
- [ ] ¿Siempre entre dos personas o puede ser n miembros?
- [ ] ¿Dónde vive en la UI? ¿Dashboard? ¿Sección propia?
- [ ] ¿El "Saldar" genera un registro contable o solo marca como cerrado?

---

### 21. Adaptación Web / Desktop
- **Estado:** `[ ]` Pendiente — a diseñar
- **Prioridad:** Alta
- **Esfuerzo estimado:** A definir
- **Impacto:** Experiencia decente para usuarios que abren desde la compu

#### Descripción
La UI está pensada para mobile (ancho ~390px). En desktop se estira y se ve raro. No hace falta un rediseño completo — alcanza con contener el layout y aprovechar el espacio de forma inteligente.

#### Opciones a explorar
- **Opción A (mínima):** centrar el contenido con `max-w-md mx-auto` — la app se ve como una "columna de celular" centrada en el browser. Simple, coherente, 0 rediseño.
- **Opción B (sidebar):** en pantallas grandes, el bottom nav se convierte en sidebar lateral izquierdo + contenido a la derecha. Más trabajo pero más "app de escritorio".
- **Opción C (híbrida):** columna centrada más ancha (`max-w-2xl`) con algunos componentes que aprovechan el ancho (ej: grillas de 3 columnas en el dashboard).

#### Preguntas pendientes
- [ ] ¿Cuánto tiempo pasan los usuarios en desktop vs mobile?
- [ ] ¿Alcanza con la opción A para que no se vea feo, o vale la pena ir por B?
> Ver sección **Banco de Ideas** al final del archivo.

---

### 7. Quick-Add — Simplificación del formulario
- **Estado:** `[x]` ✅ Completado (21 Mayo 2025)
- **Prioridad:** Media
- **Impacto:** Reduce fricción para agregar gastos

#### Lo que se hizo
- Campos "Monto en USD" y "Detalle" colapsados por defecto
- Se revelan con links `+ agregar monto en USD` / `+ agregar detalle`
- Si hay valor guardado en draft o en edición, se abren solos
- Conclusión: el formulario actual es suficientemente bueno; duplicarlo sería confuso

---

### 8. Compartir Gasto Individual
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1-2 días
- **Impacto:** Social proof, viralidad

#### Descripción
Generar imagen compartible de un gasto para redes sociales. Útil para mostrar compras grandes o splits con amigos.

#### Plan de implementación
1. [ ] Diseñar template de imagen con branding Tortuguita
2. [ ] Usar html2canvas o similar para generar imagen
3. [ ] Botón "Compartir" en detalle del gasto
4. [ ] Integrar Web Share API para compartir nativo

#### Criterios de éxito
- Puedo generar imagen de un gasto
- La imagen tiene buen diseño y branding
- Puedo compartir directamente a WhatsApp/Instagram

---

### 9. Capacitor → App Stores
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1-2 semanas

#### Descripción
Wrappear la PWA con Capacitor para publicar en App Store y Play Store. Ganar visibilidad y acceso a APIs nativas.

#### Plan de implementación
1. [ ] Instalar Capacitor: `npm install @capacitor/core @capacitor/cli`
2. [ ] Inicializar: `npx cap init`
3. [ ] Agregar plataformas: `npx cap add ios && npx cap add android`
4. [ ] Configurar splash screen y app icons
5. [ ] Resolver problemas de deep linking
6. [ ] Configurar push notifications (Firebase + APNs)
7. [ ] Build y test en dispositivos reales
8. [ ] Crear cuentas de developer ($99 Apple, $25 Google)
9. [ ] Preparar screenshots y descripciones para stores
10. [ ] Submit para review

#### Criterios de éxito
- App funciona en iOS y Android nativamente
- Push notifications funcionan
- Publicada en ambos stores

---

### 10. Notificaciones Push ⚡ ADELANTADO — desbloquea Gastos Recurrentes
- **Estado:** `[x]` ✅ Completado (17 Mayo 2025)
- **Prioridad:** Alta (adelantado para desbloquear ítem 4)
- **Esfuerzo estimado:** 1 semana

#### Descripción
Notificar vencimientos de TC, recordatorios de gastos recurrentes, alertas de presupuesto.

#### Plan de implementación
1. [ ] Setup Firebase Cloud Messaging (FCM)
2. [ ] Implementar service worker para web push
3. [ ] Configurar Capacitor Push Notifications para nativo
4. [ ] Crear preferencias de notificación en settings
5. [ ] Cron job para enviar notificaciones de vencimiento TC
6. [ ] **Notificación de recurrente:** "¿Te llegó X? El mes pasado fue $Y" con quick-action → desbloquea ítem 4

---

### 11. Referral System
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 3-4 días

#### Descripción
Sistema de referidos para crecimiento orgánico. "Invitá a un amigo y ambos reciben 1 mes Pro gratis."

#### Plan de implementación
1. [ ] Modelo: `Referral { referrerId, referredId, status, reward }`
2. [ ] Generar código de referido único por usuario
3. [ ] Landing page para referidos
4. [ ] Lógica de recompensas
5. [ ] UI para compartir código

---

### 12. Tier Pro (Monetización)
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Alta (para sustentabilidad)
- **Esfuerzo estimado:** 2 semanas

#### Descripción
Plan pago con features premium: AI ilimitado, más spaces, analytics avanzados.

#### Plan de implementación
1. [ ] Definir features Free vs Pro
2. [ ] Integrar Stripe / MercadoPago
3. [ ] Modelo: `Subscription { userId, plan, status, expiresAt }`
4. [ ] Paywall UI
5. [ ] Webhooks para gestión de pagos
6. [ ] Lógica de límites (ej: 50 AI queries/mes en Free)

---

## BAJA PRIORIDAD — Nice to Have

> Features deseables pero no críticos. Implementar cuando haya tiempo.

### 13. Analytics Avanzados (Gráficos de Tendencia)
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1 semana

#### Descripción
Gráficos de tendencia, comparación mes a mes, proyecciones.

---

### 14. Exportación de Datos (CSV/Excel)
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 2-3 días

#### Descripción
Exportar gastos a CSV/Excel. Feature para power users y compliance.

---

### 15. Integraciones Bancarias
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja (depende de APIs disponibles)
- **Esfuerzo estimado:** Variable

#### Descripción
Conexión directa con bancos para importar transacciones automáticamente.

---

### 16. Widgets iOS/Android
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 1-2 semanas
- **Impacto:** Engagement pasivo

#### Descripción
Widgets para home screen que muestren gasto del mes, presupuesto restante, o próximos vencimientos.

---

### 17. Multi-moneda (USD/EUR)
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 1 semana
- **Impacto:** Usuarios con gastos en dólares

#### Descripción
Soporte nativo para múltiples monedas, conversión automática, y reportes por moneda.

---

### 18. ~~Registro de Pagos entre Miembros~~ → movido a Alta Prioridad (ítem 20)

---

### 19. Modo Offline Mejorado
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 1 semana
- **Impacto:** Uso sin conexión

#### Descripción
Permitir agregar gastos offline y sincronizar cuando vuelva la conexión.

---

## Backlog — Mejoras Menores

### UI/UX
- [ ] Arreglar modo oscuro — hardcoded colors (bg-white, text-[#...], etc.) en toda la app; necesita audit completo con dark: variants de Tailwind o CSS vars por tema
- [ ] Agrupar gastos por día en /bills
- [ ] Skeleton screens consistentes
- [ ] Empty states personalizados por contexto
- [ ] Command palette global (Cmd+K)

### Tech Debt
- [ ] Migrar forwardRef restantes (shadcn)
- [ ] Unificar loading states
- [ ] Tests E2E con Playwright
- [ ] Documentar API con OpenAPI/Swagger

---

## Log de Sesiones

### Sesión: 22 Mayo 2025 (parte 2) — en curso
- **Trabajo realizado:**
  - ✅ Gastos compartidos: fix $0, fix settle para dirección "te debe X", hero en tiempo real
  - ✅ Chips adaptivos en shared-balance (1→full, 2→50/50, 3→33%, 4+→scroll horizontal)
  - ✅ Test data: "Viaje Bariloche 2026" con 6 miembros + 10 gastos compartidos
  - ✅ Deploy v2.0.2 a producción (fix Vercel + Neon advisory lock)
  - ✅ **Modo oscuro — Ronda 1 y 2 (en progreso):**
    - Layout: bottom-nav, simple-header — dark variants completos
    - globals.css — hero gradient utility classes (`.hero-gradient`, `.hero-gradient-green/pink/neutral`) con `.dark` variants
    - Reemplazados todos los inline `style={{ background: "linear-gradient(#D8E2DC...)" }}` con clases CSS en: `home-dashboard.tsx`, `bills-view.tsx`, `tarjetas-wallet-view.tsx`, `shared-balance-view.tsx`, `cuotas-view.tsx`, `ai-insight-widget.tsx`
    - Hero text colors dark: `text-[#6B5159]→dark:text-[#d4b8c0]`, `text-[#9D8189]→dark:text-[#c4a8b0]`, `text-[#4A3540]→dark:text-[#f0e0e8]` en todos los hero cards
    - shared-balance: `useTheme()` + `tc` helper para colores dinámicos del hero
- **Pendiente (modo oscuro):**
  - `ai-insight-widget.tsx` — text colors dentro del widget
  - `cuotas-view.tsx` — content area (cuota cards)
  - Ronda 3: tarjetas content, settings, secondary views
  - pwa-install-sheet, onboarding-slides, tour-invite-card (low priority)
  - quick-bill-form billing feedback badges

### Sesión: 17 Mayo 2025
- **Duración:** ~1 día completo
- **Trabajo realizado:**
  - ✅ Fix build errors Vercel (InsightData type, thisMonthTotal)
  - ✅ Fix chatbot follow-ups (system prompt — siempre usar tools)
  - ✅ Fix categorías vacías en /tarjetas/new
  - ✅ /tarjetas: mes default inteligente (currentDueDate), badges de categoría, secciones colapsables
  - ✅ Haptics restaurados en toda la app (nav, forms, dashboard, AI, bills, tarjetas)
  - ✅ **Ítem 10: Notificaciones Push FCM** — infraestructura completa (firebase-admin/client, SW, hook, API, cron, settings toggle)
  - ✅ Bandeja de notificaciones (bell header + dropdown tray, DB persistence, 7-day cleanup)
  - ✅ Notif: gasto compartido (toggle en form), resumen mensual (cron 1ro de mes), cierres de TC (3/1/0 días)
  - ✅ **Ítem 4: Gastos Recurrentes** — cron → push en vez de auto-crear, toggle en form, pantalla confirmación
  - ✅ **Ítem 5: AI con contexto** — tool get_spending_trend, system prompt proactivo, personalidad
  - ✅ PWA install prompt (iOS slides ilustrados + Android nativo, banner dashboard + settings)
  - ✅ Loading skeletons en dashboard, bills, tarjetas, settings
- **Próxima sesión:** Media prioridad — Presupuestos por categoría o Quick-Add desde dashboard

### Sesión: 16 Mayo 2025 (parte 2)
- **Duración:** ~1.5 horas
- **Trabajo realizado:**
  - ✅ Widget de tarjetas en dashboard (stack Apple Wallet, top 3 por monto)
  - Colores pastelizados (45% blend con blanco) en dashboard y /tarjetas
  - Dashboard widget visualmente idéntico a las cards de /tarjetas
  - Logos de banco y red consistentes en ambas vistas
  - Iteración de diseño: chips horizontales → stack Apple Wallet limitado a 3
- **Pendiente:** hacer push a prod cuando esté conforme

### Sesión: 16 Mayo 2025 (parte 1)
- **Duración:** ~2 horas
- **Trabajo realizado:**
  - ✅ Implementado **3. Vista Wallet de Tarjetas** (`/tarjetas`)
  - Rediseño completo de /cuotas → /tarjetas estilo Apple Wallet
  - Logos de bancos y redes reales (PNG/SVG) — 15 bancos, 4 redes
  - Campo `bank` en schema Prisma para identificar banco de cada tarjeta
  - Badges de red con imágenes reales (amex, cabal) en lista de tarjetas
  - Ajustes estéticos: tamaño uniforme de logos, alineación vertical de nombres
  - Deploy a producción
- **Próxima sesión:** widget dashboard + ajustes post-deploy

### Sesión: 15 Mayo 2025 (parte 3)
- **Duración:** ~1 hora
- **Trabajo realizado:**
  - ✅ Implementado **2. Filtros en /bills** con ActionBar
  - ActionBar con gradiente del hero (Buscar | Filtros)
  - Búsqueda se expande inline con updates en tiempo real
  - FilterSheet con multi-select agrupado por espacio
  - Discusión sobre secciones colapsables → decisión: NO (evaluar después de uso)
- **Archivos modificados:** `app/(dashboard)/bills/page.tsx`, `components/bills/bills-view.tsx`
- **Próxima sesión:** **3. Resumen de Cuotas en Dashboard** o ajustes según feedback

### Sesión: 15 Mayo 2025 (parte 2)
- **Duración:** ~30 minutos
- **Trabajo realizado:**
  - ✅ Implementado **1.1 Búsqueda Global** en /bills
  - Creado componente reutilizable `SearchInput` con debounce
  - Empty state contextual (sin resultados vs sin gastos)
- **Archivos creados:** `components/ui/search-input.tsx`
- **Archivos modificados:** `app/(dashboard)/bills/page.tsx`, `components/bills/bills-view.tsx`
- **Próxima sesión:** **1.2 Filtros en /bills**

### Sesión: 15 Mayo 2025 (parte 1)
- **Duración:** ~2 horas
- **Trabajo realizado:**
  - Análisis completo de producto (UX, UI, mercado, estrategia)
  - Generado PDF con análisis (`analisis-producto-tortuguita.pdf`)
  - Creado este archivo de roadmap
- **Próxima tarea:** Búsqueda Global

---

## Notas Técnicas

### Convenciones de código
- Un archivo por commit cuando sea posible
- Nunca `git add .`, siempre archivos específicos
- UI text en español
- Montos con `Intl.NumberFormat("es-AR")`
- Fechas con `date-fns` locale español

### Archivos clave
- `CLAUDE.md` — referencia rápida del proyecto
- `ROADMAP.md` — este archivo
- `components/dashboard/home-dashboard.tsx` — diseño aprobado, no modificar sin permiso

### APIs externas
- **Anthropic:** Claude 3.5 Sonnet para AI
- **Resend:** Emails transaccionales
- **Vercel:** Hosting + Cron Jobs

---

## Decisiones Pendientes

1. ~~**Modelo de recurrencias:** ¿Campo en Bill o modelo separado?~~ → Modelo separado `RecurringBill`, implementado
2. ~~**Búsqueda:** ¿Solo en /bills o global con Cmd+K?~~ → Implementado en /bills, Cmd+K queda para futuro
3. **Monetización:** ¿Stripe o MercadoPago primero?
4. **App nativa:** Capacitor al final, cuando esté todo completo y haya validación de usuarios

---

*Actualizar este archivo al final de cada sesión de trabajo.*

---

## Banco de Ideas

> Features descartados por ahora pero que podrían tener sentido en el futuro con más contexto o usuarios.

### Presupuestos por Categoría
- **Por qué se descartó:** En contexto de inflación argentina, los límites mensuales se desactualizan rápido. Requiere configuración activa que la mayoría no hace. La AI con `get_spending_trend` cubre el caso de uso principal (comparar vs mes anterior) sin fricción.
- **Cuándo rescatar:** Si hay demanda explícita de usuarios, o si se implementa ajuste automático por inflación.
