import { driver } from "driver.js"

const ALL_STEPS = [
  {
    element: "[data-tour='hero']",
    popover: {
      title: "Tu resumen mensual",
      description: "El total de gastos del período, con el desglose por miembro del hogar.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='month-nav']",
    popover: {
      title: "Navegación por meses",
      description: "Tocá las flechas o el mes para ver el historial completo.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='cc-groups']",
    popover: {
      title: "Tus tarjetas",
      description: "Las 3 tarjetas con más gasto este mes. Tocá para ir al detalle completo.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='ai-widget']",
    popover: {
      title: "tortuguita IA",
      description: "Tu asistente financiero. Te da insights del mes y podés hacerle preguntas sobre tus gastos.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='categories']",
    popover: {
      title: "Por categoría",
      description: "El desglose de gastos del mes por categoría, con el gasto más grande del período.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='fab']",
    popover: {
      title: "Nuevo gasto",
      description: "Cargá un gasto rápidamente desde acá, en cualquier pantalla.",
      side: "top" as const,
      align: "end" as const,
    },
  },
  {
    element: "[data-tour='nav-bills']",
    popover: {
      title: "Mis gastos",
      description: "La lista completa de gastos con filtros y búsqueda.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='action-bar']",
    popover: {
      title: "Buscá y filtrá",
      description: "Buscá por nombre o categoría, y filtrá por tarjeta o tipo de gasto. Los filtros se combinan.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='nav-tarjetas']",
    popover: {
      title: "Tarjetas",
      description: "Vista wallet de tus tarjetas: gastos del mes, cuotas activas con progreso y fechas de cierre.",
      side: "top" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='tarjetas-header']",
    popover: {
      title: "Navegá por mes",
      description: "Tocá el mes para saltar a cualquier período, o usá las flechas para avanzar y retroceder.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='space-selector']",
    popover: {
      title: "Selector de espacios",
      description: "Cambiá entre tus espacios: personal, hogar compartido, etc.",
      side: "bottom" as const,
      align: "end" as const,
    },
  },
  {
    element: "[data-tour='nav-settings']",
    popover: {
      title: "Configuración",
      description: "Espacios, categorías, tarjetas, perfil y más.",
      side: "top" as const,
      align: "center" as const,
    },
  },
]

export function startAppTour() {
  // Filter steps to only those whose element exists in the DOM
  const steps = ALL_STEPS.filter(step => !!document.querySelector(step.element))

  const driverObj = driver({
    showProgress: true,
    progressText: "{{current}} de {{total}}",
    nextBtnText: "Siguiente →",
    prevBtnText: "← Anterior",
    doneBtnText: "¡Listo!",
    steps,
    onPopoverRender: (popover) => {
      const el = popover.wrapper as HTMLElement
      requestAnimationFrame(() => {
        // 1. Center horizontally — driver.js positions based on the highlighted
        //    element which causes overflow/asymmetry on narrow viewports
        const parts = el.style.inset.split(' ')
        const bottom = parts[2] ?? 'auto'
        const vw = window.innerWidth
        const centeredLeft = Math.max(16, (vw - el.offsetWidth) / 2)
        el.style.inset = `auto auto ${bottom} ${centeredLeft}px`

        // 2. Force navBtns to fill the full content width — the grid/flex
        //    context doesn't stretch it automatically in all browsers
        const navBtns = el.querySelector('.driver-popover-navigation-btns') as HTMLElement
        if (navBtns) {
          const elStyle = window.getComputedStyle(el)
          const contentWidth = el.getBoundingClientRect().width
            - parseFloat(elStyle.paddingLeft)
            - parseFloat(elStyle.paddingRight)
          navBtns.style.width = contentWidth + 'px'
        }
      })
    },
  })

  driverObj.drive()
}
