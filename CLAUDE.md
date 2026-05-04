# tortuguita-v2 — Referencia rápida para Claude

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
    ├── cuotas/           # resumen de cuotas activas
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
│   └── bottom-nav.tsx        # nav inferior flotante (4 tabs: Inicio, Gastos, Cuotas, Perfil)
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
- **Paleta**: tones rosados/warm. Primary = tono rosado de la marca
- **Formatos**: montos en ARS con `Intl.NumberFormat("es-AR")`, fechas en español con `date-fns/locale/es`

## Reglas críticas

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

### Radix UI
- **No anidar** `<Dialog>` dentro de `<DropdownMenu>` — no funciona en Radix
- Patrón correcto: estado `useState<Item | null>` + `<Dialog>` fuera del `.map()`

## Flujo típico de edición de un gasto

1. `/bills` → tap en "⋮" → "Detalles" → `/bills/[id]`
2. `/bills/[id]` → "Editar gasto" → `/bills/[id]/edit` (BillForm mode="edit")
3. `/bills/[id]` → "Eliminar gasto" → Dialog confirmación → DELETE `/api/bills/[id]` → redirect `/bills`
4. Dashboard → tap en gasto de CC → `/bills/[id]`

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
