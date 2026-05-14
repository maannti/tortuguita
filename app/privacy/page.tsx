import Link from "next/link"

export const metadata = {
  title: "Política de Privacidad — Tortuguita",
}

export default function PrivacyPage() {
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
            Política de Privacidad
          </h1>
          <p className="text-white/40 text-sm">Última actualización: mayo 2025</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              1. Qué es Tortuguita
            </h2>
            <p>
              Tortuguita es una aplicación web de gestión de finanzas personales y del hogar.
              Permite registrar gastos, ingresos y compartir información financiera con personas
              de confianza (pareja, familia) dentro de un espacio compartido.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              2. Información que recopilamos
            </h2>
            <p>Recopilamos únicamente la información necesaria para brindar el servicio:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong className="text-white/90">Datos de cuenta:</strong> nombre, dirección de correo electrónico y contraseña (almacenada con hash seguro), o los datos provistos por Google si usás el login con Google.</li>
              <li><strong className="text-white/90">Datos financieros:</strong> gastos, ingresos, categorías y demás información que ingresás voluntariamente en la aplicación.</li>
              <li><strong className="text-white/90">Datos de uso:</strong> información básica sobre el uso de la app para mejorar el servicio (sin rastreo publicitario).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              3. Cómo usamos tu información
            </h2>
            <p>Usamos tu información exclusivamente para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Proveer y mantener el servicio de Tortuguita.</li>
              <li>Autenticar tu identidad y proteger tu cuenta.</li>
              <li>Enviar correos transaccionales (por ejemplo, recupero de contraseña).</li>
              <li>Permitirte compartir información financiera con las personas que vos invitás a tu espacio.</li>
            </ul>
            <p className="mt-3">
              No vendemos, alquilamos ni compartimos tu información personal con terceros con fines comerciales o publicitarios.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              4. Autenticación con Google
            </h2>
            <p>
              Si elegís iniciar sesión con Google, recibimos de Google tu nombre y dirección de correo
              electrónico. No accedemos a ningún otro dato de tu cuenta de Google (Gmail, Drive, contactos, etc.).
              Esta información se usa únicamente para crear y gestionar tu cuenta en Tortuguita.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              5. Almacenamiento y seguridad
            </h2>
            <p>
              Tus datos se almacenan en servidores seguros. Las contraseñas se guardan con
              hashing bcrypt y nunca en texto plano. Aplicamos medidas técnicas razonables para
              proteger tu información contra accesos no autorizados.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              6. Tus derechos
            </h2>
            <p>Podés en cualquier momento:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Acceder a los datos que tenemos sobre vos desde la aplicación.</li>
              <li>Solicitar la eliminación de tu cuenta y todos tus datos.</li>
              <li>Corregir información incorrecta desde la sección de perfil.</li>
            </ul>
            <p className="mt-3">
              Para ejercer estos derechos o ante cualquier consulta, escribinos a{" "}
              <a href="mailto:noreply@info.tortuguita.ar" className="text-[#F4ACB7] hover:underline">
                noreply@info.tortuguita.ar
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-medium mb-2" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              7. Cambios en esta política
            </h2>
            <p>
              Podemos actualizar esta política ocasionalmente. En caso de cambios significativos,
              te notificaremos por correo electrónico o mediante un aviso en la aplicación.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-6 text-sm text-white/30">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Términos de uso</Link>
          <Link href="/" className="hover:text-white/60 transition-colors">Volver a Tortuguita</Link>
        </div>
      </div>
    </div>
  )
}
