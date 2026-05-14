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
      title: "Tus tarjetas de crédito",
      description: "Resumen del total de cada tarjeta, desglosado por persona.",
      side: "bottom" as const,
      align: "center" as const,
    },
  },
  {
    element: "[data-tour='recent-expenses']",
    popover: {
      title: "Gastos recientes",
      description: "Todos los gastos del mes. Tocá uno para ver el detalle o editarlo.",
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
    element: "[data-tour='nav-cuotas']",
    popover: {
      title: "Tarjetas",
      description: "El seguimiento de tus tarjetas y cuotas activas mes a mes.",
      side: "top" as const,
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
  })

  driverObj.drive()
}
