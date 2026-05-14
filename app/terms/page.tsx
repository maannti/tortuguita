import Link from "next/link"

export const metadata = {
  title: "Términos de Uso — Tortuguita",
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(345,18%,12%)] via-[hsl(343,16%,20%)] to-[hsl(351,22%,28%)]">
      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="text-[#F4ACB7] text-sm hover:underline">← Volver</Link>
          <h1
            className="text-3xl font-medium text-white mt-6 mb-2"
            style={{ fontFamily: "var(--font-fraunces, serif)" }}
          >
            Términos de Uso
          </h1>
          <p className="text-white/40 text-sm">Última actualización: mayo 2025</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              1. Aceptación de los términos
            </h2>
            <p>
              Al crear una cuenta y usar Tortuguita, aceptás estos términos de uso. Si no estás
              de acuerdo, no uses el servicio.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              2. Descripción del servicio
            </h2>
            <p>
              Tortuguita es una herramienta de registro y seguimiento de finanzas personales y del hogar.
              Permite cargar gastos, ingresos y compartir esa información con personas de confianza
              dentro de un espacio colaborativo.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              3. Uso aceptable
            </h2>
            <p>Aceptás usar Tortuguita únicamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Registro personal o familiar de finanzas.</li>
              <li>Compartir información financiera con personas que vos invitás explícitamente.</li>
            </ul>
            <p className="mt-3">No está permitido usar la app para actividades ilegales, fraudulentas o que violen derechos de terceros.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              4. Tu cuenta
            </h2>
            <p>
              Sos responsable de mantener la confidencialidad de tu contraseña y de todas las
              actividades que ocurran bajo tu cuenta. Avisanos inmediatamente ante cualquier uso
              no autorizado.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              5. Propiedad de los datos
            </h2>
            <p>
              Todos los datos financieros que cargás son tuyos. Tortuguita no reclama propiedad
              sobre tu información y no la usa con fines distintos a los descritos en la{" "}
              <Link href="/privacy" className="text-[#F4ACB7] hover:underline">Política de Privacidad</Link>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              6. Disponibilidad del servicio
            </h2>
            <p>
              Tortuguita se ofrece "tal como está". Hacemos nuestro mejor esfuerzo para mantener
              el servicio disponible y seguro, pero no garantizamos disponibilidad ininterrumpida.
              No somos responsables por pérdidas derivadas de interrupciones del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              7. Cancelación
            </h2>
            <p>
              Podés eliminar tu cuenta en cualquier momento desde la configuración de la app.
              Nos reservamos el derecho de suspender cuentas que violen estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              8. Contacto
            </h2>
            <p>
              Para consultas sobre estos términos, escribinos a{" "}
              <a href="mailto:noreply@info.tortuguita.ar" className="text-[#F4ACB7] hover:underline">
                noreply@info.tortuguita.ar
              </a>.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/30">
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Política de Privacidad</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Volver a Tortuguita</Link>
        </div>
      </div>
    </div>
  )
}
