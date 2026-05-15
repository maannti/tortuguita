# Tortuguita v2 — Roadmap de Mejoras

> Última actualización: 15 Mayo 2025
> Este archivo sirve como planificación entre sesiones de desarrollo.

---

## Estado General

| Fase | Progreso | Próximo paso |
|------|----------|--------------|
| **Alta Prioridad** | 2/5 completados | Resumen de Cuotas |
| **Media Prioridad** | 0/7 completados | — |
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

### 3. Resumen de Cuotas en Dashboard
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Alta
- **Esfuerzo estimado:** 1-2 días
- **Impacto:** Visibilidad de deuda total de TC

#### Descripción
El usuario no ve claramente cuánto le queda por pagar de compras en cuotas. Agregar un resumen en el dashboard que muestre deuda total de cuotas activas.

#### Plan de implementación
1. [ ] Calcular total de cuotas pendientes por tarjeta
2. [ ] Mostrar widget en dashboard con deuda total
3. [ ] Desglose por tarjeta (cuántas cuotas, monto restante)
4. [ ] Link a /cuotas para ver detalle

#### Criterios de éxito
- Veo deuda total de cuotas en dashboard
- Sé cuántas cuotas me quedan por pagar
- Puedo ver el desglose por tarjeta

#### Ideas de diseño (15 Mayo 2025)
```
REDISEÑO COMPLETO DE /cards — ESTILO APPLE WALLET

Vista Stack (múltiples tarjetas):
- Tarjetas apiladas mostrando ~40-50px cada una
- Header visible: logo banco + nombre tarjeta
- Tap en tarjeta → expande

Vista Expandida (tarjeta seleccionada):
- Tarjeta visual completa:
  - Logo banco (PNG) esquina sup-izq
  - Logo red (Visa/MC) esquina inf-der
  - Gradiente con color del banco
- Stats debajo de la tarjeta:
  - Total del período (cierre a cierre)
  - Fecha de cierre / vencimiento
- Lista de gastos:
  - Gastos nuevos del período
  - Cuotas activas (con barras de progreso existentes)

Monto a mostrar:
- Total consumido en período actual (entre cierres)
- = gastos cargados + cuotas de compras anteriores

Assets necesarios:
- [ ] PNG logos bancos: ICBC, Santander, BBVA, Galicia, etc.
- [x] SVG logos redes: Visa, Mastercard (ya existen en card-network.tsx)

Referencias:
- Apple Wallet (tarjeta ICBC expandida)
- Apple Pay (Apple Card con stats + transactions)
- Monzo, Plum (cards fintech)
```

---

### 4. Gastos Recurrentes
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Alta
- **Esfuerzo estimado:** 3-4 días
- **Impacto:** Elimina data entry repetitivo

#### Descripción
Permitir marcar un gasto como recurrente (mensual, semanal, etc.) y que se cree automáticamente. Ejemplos: Netflix, gimnasio, alquiler.

#### Archivos a modificar/crear
- `prisma/schema.prisma` — nuevo modelo `RecurringBill` o campo en `Bill`
- `app/api/recurring-bills/route.ts` — (nuevo) CRUD de recurrencias
- `app/api/cron/create-recurring/route.ts` — (nuevo) cron job
- `components/bills/quick-bill-form.tsx` — toggle "repetir cada mes"
- `app/(dashboard)/bills/recurring/page.tsx` — (nuevo) lista de recurrencias

#### Plan de implementación
1. [ ] Decidir modelo de datos:
   - Opción A: Campo `isRecurring` + `recurringFrequency` en Bill
   - Opción B: Modelo separado `RecurringBill` que genera Bills
   - **Decisión:** (pendiente)
2. [ ] Crear schema Prisma y migrar
3. [ ] API para crear/editar/pausar recurrencias
4. [ ] UI en formulario de gasto: "Repetir" toggle
5. [ ] Cron job (Vercel Cron) que crea gastos al inicio del mes
6. [ ] Vista de recurrencias activas en /settings o /bills/recurring
7. [ ] Notificación cuando se crea un gasto recurrente

#### Criterios de éxito
- Puedo crear un gasto recurrente mensual
- El gasto se crea automáticamente el día configurado
- Puedo pausar/eliminar una recurrencia
- Puedo ver todas mis recurrencias activas

#### Notas de implementación
```
(agregar notas durante desarrollo)
```

---

### 5. AI con Contexto de Gastos
- **Estado:** `[ ]` Pendiente
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

## MEDIA PRIORIDAD — Features Nuevos

> Funcionalidades que agregan valor significativo pero requieren más esfuerzo.

### 6. Presupuestos por Categoría
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1 semana

#### Descripción
Permitir establecer un límite mensual por categoría. Mostrar progreso visual y alertar cuando se acerca al límite.

#### Archivos a modificar/crear
- `prisma/schema.prisma` — modelo `Budget` o campo en `BillType`
- `app/api/budgets/route.ts` — CRUD de presupuestos
- `components/dashboard/home-dashboard.tsx` — indicador de progreso
- `app/(dashboard)/budgets/page.tsx` — (nuevo) gestión de presupuestos
- `components/budgets/budget-progress.tsx` — (nuevo) barra de progreso

#### Plan de implementación
1. [ ] Modelo de datos: `Budget { categoryId, amount, month?, isActive }`
2. [ ] API CRUD para presupuestos
3. [ ] UI para configurar presupuesto por categoría
4. [ ] Widget de progreso en dashboard
5. [ ] Alerta visual cuando gasto > 80% del presupuesto
6. [ ] (Opcional) Notificación push cuando se excede

#### Criterios de éxito
- Puedo establecer presupuesto por categoría
- Veo progreso en dashboard
- Alerta visual al acercarme al límite

---

### 7. Quick-Add desde Dashboard
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 2 días
- **Impacto:** Reduce fricción para agregar gastos

#### Descripción
Agregar gasto sin salir del dashboard. Bottom sheet que se abre desde el FAB con formulario simplificado.

#### Plan de implementación
1. [ ] Crear bottom sheet con formulario mínimo (monto, descripción, categoría)
2. [ ] Abrir desde FAB en dashboard (en vez de navegar a /bills/new)
3. [ ] Opción "Más opciones" para ir al formulario completo
4. [ ] Animación suave de apertura/cierre

#### Criterios de éxito
- Puedo agregar un gasto en <5 segundos
- No pierdo el contexto del dashboard
- Puedo acceder al formulario completo si necesito

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

### 10. Notificaciones Push
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Media
- **Esfuerzo estimado:** 1 semana

#### Descripción
Notificar vencimientos de TC, recordatorios de gastos recurrentes, alertas de presupuesto.

#### Plan de implementación
1. [ ] Setup Firebase Cloud Messaging (FCM)
2. [ ] Implementar service worker para web push
3. [ ] Configurar Capacitor Push Notifications para nativo
4. [ ] Crear preferencias de notificación en settings
5. [ ] Cron job para enviar notificaciones de vencimiento TC
6. [ ] Notificaciones cuando se crea gasto recurrente

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

### 18. Modo Offline Mejorado
- **Estado:** `[ ]` Pendiente
- **Prioridad:** Baja
- **Esfuerzo estimado:** 1 semana
- **Impacto:** Uso sin conexión

#### Descripción
Permitir agregar gastos offline y sincronizar cuando vuelva la conexión.

---

## Backlog — Mejoras Menores

### UI/UX
- [ ] Agrupar gastos por día en /bills
- [ ] Skeleton screens consistentes
- [ ] Empty states personalizados por contexto
- [ ] Mejorar dark mode del hero gradient
- [ ] Command palette global (Cmd+K)

### Tech Debt
- [ ] Migrar forwardRef restantes (shadcn)
- [ ] Unificar loading states
- [ ] Tests E2E con Playwright
- [ ] Documentar API con OpenAPI/Swagger

---

## Log de Sesiones

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

1. **Modelo de recurrencias:** ¿Campo en Bill o modelo separado?
2. ~~**Búsqueda:** ¿Solo en /bills o global con Cmd+K?~~ → Implementado en /bills, Cmd+K queda para futuro
3. **Monetización:** ¿Stripe o MercadoPago primero?
4. **App nativa:** ¿Capacitor ahora o esperar validación?

---

*Actualizar este archivo al final de cada sesión de trabajo.*
