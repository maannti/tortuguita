# tortuguita-v2 — Referencia rápida para Claude

## 🚀 Al iniciar cada sesión

**Leer primero:** `planning/ROADMAP.md` (local, gitignored — fuera del repo público) — contiene:
- Checklist de mejoras con estado actual
- Plan detallado de cada feature
- Log de sesiones anteriores
- Decisiones pendientes

---

## Stack

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 16 (App Router) | Framework principal |
| TypeScript | — | Tipado |
| Tailwind CSS | — | Estilos |
| Radix UI | — | Componentes base (Dialog, DropdownMenu, etc.) |
| Prisma | ^6 | ORM / base de datos |
| NextAuth v5 | beta | Autenticación |
| Anthropic SDK | ^0.71 | Chat IA |

## Estructura de rutas

```
app/
├── (auth)/               # login, signup, reset-password
└── (dashboard)/          # rutas protegidas con sesión
    ├── dashboard/        # pantalla principal (home)
    ├── bills/            # lista de gastos
    │   ├── [id]/         # detalle del gasto
    │   │   ├── page.tsx  # → /bills/[id]   (ver detalle)
    │   │   └── edit/     # → /bills/[id]/edit (formulario edición)
    │   └── new/          # → /bills/new (formulario creación)
    ├── tarjetas/         # vista de tarjetas estilo Apple Wallet
    ├── cards/            # administrar tarjetas/categorías CC
    ├── categories/       # tipos de gasto
    ├── incomes/          # ingresos
    ├── income-types/     # tipos de ingreso
    ├── ai/               # chat con IA
    └── settings/         # perfil y organización
```

## Modelos Prisma clave

- **Bill** — gasto individual. Campos importantes: `label`, `amount`, `paymentDate`, `budgetDate` (fecha de impacto presupuestario), `dueDate` (vencimiento CC), `totalInstallments`/`currentInstallment`/`installmentGroupId` (cuotas), `billTypeId`, `userId`, `organizationId`
- **BillType** — categoría/tarjeta. `isCreditCard: bool`, `currentClosingDate/dueDate`, `nextClosingDate/dueDate`
- **BillAssignment** — reparto de un gasto entre miembros (`userId`, `percentage`)
- **Organization** — grupo de usuarios (familia/pareja)
- **UserOrganization** — membresía (un usuario puede estar en varias orgs)
- **Income / IncomeAssignment / IncomeType** — ingresos, mismo patrón que bills

## API routes

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/bills` | listar / crear gasto |
| GET/PATCH/DELETE | `/api/bills/[id]` | detalle / editar / borrar |
| GET/POST | `/api/bill-types` | categorías |
| PATCH | `/api/bill-types/[id]/billing-period` | período de facturación |
| GET/POST | `/api/incomes` | ingresos |
| GET/PATCH/DELETE | `/api/incomes/[id]` | — |
| POST | `/api/ai/chat` | chat IA |

## Componentes clave

```
components/
├── bills/
│   ├── bill-form.tsx         # formulario crear/editar (modo "create"|"edit")
│   ├── bill-detail.tsx       # vista detalle con editar + borrar
│   ├── bills-content.tsx     # lista de gastos (pestaña /bills)
│   ├── bills-view.tsx        # wrapper de la vista /bills (con tabs CC/regular)
│   ├── delete-bill-button.tsx # botón borrar con confirmación (props: asMenuItem, fullWidth, redirectTo)
│   └── billing-period-dialog.tsx
├── dashboard/
│   └── home-dashboard.tsx    # ⚠️ DISEÑO APROBADO — no modificar sin instrucción explícita
├── layout/
│   └── bottom-nav.tsx        # nav inferior flotante (4 tabs: Inicio, Gastos, Tarjetas, Perfil)
├── ui/
│   ├── card-network.tsx      # CardIcon, NetworkId, BANKS (logos de tarjetas)
│   └── month-picker.tsx      # selector de mes
└── providers/
    └── language-provider.tsx # traducciones (hook useTranslations)
```

## Diseño visual

- **Fuente serif** para montos: `fontFamily: "var(--font-fraunces, serif)"`
- **Nav**: pill flotante glass morphism, 4 tabs. Íconos con `fill="none"` y `strokeWidth={active ? 2.2 : 1.8}`
- **Cards**: bordes redondeados (`rounded-2xl`/`rounded-3xl`), fondo pastel de color de categoría
- **Formatos**: montos en ARS con `Intl.NumberFormat("es-AR")`, fechas en español con `date-fns/locale/es`

### Paleta de colores oficial

| Nombre | Hex | Uso principal |
|---|---|---|
| Sage | `#D8E2DC` | Gradient hero — inicio |
| Peach | `#FFE5D9` | Gradient hero — medio |
| Pink | `#FFCAD4` | Gradient hero — fin |
| Dusty Rose | `#F4ACB7` | Orbs decorativos, acentos |
| Mauve | `#9D8189` | Textos secundarios, íconos, estados activos en toggles |

> Fuente: https://coolors.co/palette/d8e2dc-ffe5d9-ffcad4-f4acb7-9d8189
>
> Para textos sobre fondo claro usar `#4A3540` (mauve oscuro) y `#9D8189` para subtextos.
> El `primary` CSS var del tema mapea al tono rosado de la marca.

## Reglas críticas

### 🚫 Flujo de trabajo — LOCAL primero, prod solo cuando el usuario lo pide
**Nunca pushear a producción sin instrucción explícita.** Todo el trabajo va en local primero. Solo se hace `git push` cuando el usuario dice "pushea" o "mandá a prod". Si hay dudas, preguntar.

### ⚠️ home-dashboard.tsx — NO TOCAR sin instrucción explícita
El diseño del dashboard principal está aprobado. Antes de cualquier cambio:
```bash
git diff HEAD components/dashboard/home-dashboard.tsx
```
Si algo rompe el visual, el estado correcto usa: `CardIcon`/`MonthPicker`, tarjetas CC con bills expandidos directamente (no colapsables).

### Commits
- Un archivo por commit siempre que sea posible
- `git add [archivo específico]` — nunca `git add .`
- Push al final cuando hay varios commits relacionados

### Tour de la app (`components/onboarding/app-tour.ts`)
- **Por cada feature nueva, evaluar si merece un paso en el tour**
- Si la feature tiene una pantalla o elemento propio: agregar `data-tour="nombre"` al elemento y el paso correspondiente en `ALL_STEPS`
- El tour filtra automáticamente pasos cuyo elemento no existe en el DOM — no rompe si el usuario está en otra pantalla

### Radix UI
- **No anidar** `<Dialog>` dentro de `<DropdownMenu>` — no funciona en Radix
- Patrón correcto: estado `useState<Item | null>` + `<Dialog>` fuera del `.map()`

## Flujo típico de edición de un gasto

1. `/bills` → tap en "⋮" → "Detalles" → `/bills/[id]`
2. `/bills/[id]` → "Editar gasto" → `/bills/[id]/edit` (BillForm mode="edit")
3. `/bills/[id]` → "Eliminar gasto" → Dialog confirmación → DELETE `/api/bills/[id]` → redirect `/bills`
4. Dashboard → tap en gasto de CC → `/bills/[id]`

## Usuario de test

Las credenciales del usuario de test viven en `CLAUDE.local.md` (gitignored — este archivo es público porque el repo lo es).

## Comandos útiles

```bash
# Dev local
npm run dev

# Prisma
npx prisma studio
npx prisma db push
npx prisma generate

# Deploy: push a main → Vercel auto-deploy
```
