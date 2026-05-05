import { NextRequest, NextResponse } from "next/server"
import { auth, signOut } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hash, compare } from "bcryptjs"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).max(100),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6).optional(),
})

// PATCH /api/users/profile — update name and/or password
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { name, currentPassword, newPassword } = updateSchema.parse(body)

    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const updateData: { name: string; password?: string } = { name }

    if (newPassword) {
      if (!currentPassword) return NextResponse.json({ error: "Ingresá tu contraseña actual" }, { status: 400 })
      if (!user.password) return NextResponse.json({ error: "No tenés contraseña configurada" }, { status: 400 })
      const valid = await compare(currentPassword, user.password)
      if (!valid) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 })
      updateData.password = await hash(newPassword, 12)
    }

    await prisma.user.update({ where: { id: session.user.id }, data: updateData })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Translate common Zod validation errors to Spanish
      const msg = error.issues[0].message
      const translated = msg.includes("min") ? "La contraseña debe tener al menos 6 caracteres"
        : msg.includes("max") ? "El nombre es demasiado largo"
        : "Datos inválidos. Revisá los campos e intentá de nuevo."
      return NextResponse.json({ error: translated }, { status: 400 })
    }
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Error al guardar. Intentá de nuevo." }, { status: 500 })
  }
}

// DELETE /api/users/profile — delete own account
export async function DELETE() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const userId = session.user.id

    // Delete user — cascade via Prisma relations handles UserOrganization, BillAssignment, etc.
    // Organizations owned by this user are also deleted if they have no other members.
    await prisma.$transaction(async (tx) => {
      // For each org where user is owner, delete it if they're the last/only member
      const ownedOrgs = await tx.userOrganization.findMany({
        where: { userId, role: "owner" },
        select: { organizationId: true },
      })

      for (const { organizationId } of ownedOrgs) {
        const memberCount = await tx.userOrganization.count({ where: { organizationId } })
        if (memberCount === 1) {
          // Only them — delete the org and all its data
          await tx.billAssignment.deleteMany({ where: { bill: { organizationId } } })
          await tx.bill.deleteMany({ where: { organizationId } })
          await tx.billType.deleteMany({ where: { organizationId } })
          await tx.incomeAssignment.deleteMany({ where: { income: { organizationId } } })
          await tx.income.deleteMany({ where: { organizationId } })
          await tx.incomeType.deleteMany({ where: { organizationId } })
          await tx.userOrganization.deleteMany({ where: { organizationId } })
          await tx.organization.delete({ where: { id: organizationId } })
        }
        // If others remain, just remove the user from membership — other members keep their data
      }

      // Delete user's own memberships in shared orgs (where they're not owner or owner but others remain)
      await tx.userOrganization.deleteMany({ where: { userId } })

      // Delete user's own bills/incomes in shared orgs (authored by them)
      // Note: BillAssignment rows for this user will cascade if we delete the user
      await tx.billAssignment.deleteMany({ where: { userId } })
      await tx.incomeAssignment.deleteMany({ where: { userId } })

      // Delete sessions/accounts
      await tx.session.deleteMany({ where: { userId } })
      await tx.account.deleteMany({ where: { userId } })

      // Finally delete the user
      await tx.user.delete({ where: { id: userId } })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Error deleting account:", error)
    return NextResponse.json({ error: "Error al eliminar la cuenta" }, { status: 500 })
  }
}
