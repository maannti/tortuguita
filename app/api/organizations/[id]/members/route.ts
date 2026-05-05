import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { verifyOrganizationMembership, isOrganizationOwner } from "@/lib/organization-utils"

// GET /api/organizations/[id]/members — list members (owner only)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params

    const isOwner = await isOrganizationOwner(session.user.id, id)
    if (!isOwner) return NextResponse.json({ error: "No tenés permisos para ver los miembros" }, { status: 403 })

    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    })

    return NextResponse.json(
      memberships.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      }))
    )
  } catch (error) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: "Error al obtener los miembros" }, { status: 500 })
  }
}

// DELETE /api/organizations/[id]/members?userId=xxx — remove a member (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { id } = await params
    const targetUserId = request.nextUrl.searchParams.get("userId")
    if (!targetUserId) return NextResponse.json({ error: "Falta el ID del miembro a remover" }, { status: 400 })

    const isOwner = await isOrganizationOwner(session.user.id, id)
    if (!isOwner) return NextResponse.json({ error: "No tenés permisos para remover miembros" }, { status: 403 })

    // Cannot remove yourself (owner)
    if (targetUserId === session.user.id)
      return NextResponse.json({ error: "No podés removerte a vos mismo. Eliminá el espacio." }, { status: 400 })

    // Verify target is actually a member
    const membership = await verifyOrganizationMembership(targetUserId, id)
    if (!membership) return NextResponse.json({ error: "El miembro no pertenece a este espacio" }, { status: 404 })

    await prisma.userOrganization.delete({
      where: { userId_organizationId: { userId: targetUserId, organizationId: id } },
    })

    return NextResponse.json({ message: "Member removed" })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Error al remover el miembro. Intentá de nuevo." }, { status: 500 })
  }
}
