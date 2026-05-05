import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { billTypeSchema } from "@/lib/validations/bill-type"
import { getUserOrganizations } from "@/lib/organization-utils"
import { z } from "zod"

async function getOrgIds(userId: string) {
  return (await getUserOrganizations(userId)).map(o => o.id)
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const orgIds = await getOrgIds(session.user.id)

    const billTypes = await prisma.billType.findMany({
      where: { organizationId: { in: orgIds } },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(billTypes)
  } catch (error) {
    console.error("Error fetching bill types:", error)
    return NextResponse.json({ error: "Error al obtener las categorías" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const { organizationId: bodyOrgId, ...rest } = body
    const data = billTypeSchema.parse(rest)

    const userOrgs = await getUserOrganizations(session.user.id)
    const validOrg = bodyOrgId
      ? userOrgs.find(o => o.id === bodyOrgId)
      : userOrgs[0]

    if (!validOrg) return NextResponse.json({ error: "Invalid space" }, { status: 403 })

    const billType = await prisma.billType.create({
      data: { ...data, organizationId: validOrg.id },
    })

    return NextResponse.json(billType, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 })
    }
    console.error("Error creating bill type:", error)
    return NextResponse.json({ error: "Error al crear la categoría. Intentá de nuevo." }, { status: 500 })
  }
}
