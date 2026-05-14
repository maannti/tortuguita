import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const TEST_EMAILS = ["santimarcos8@gmail.com"]

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // For test users: don't persist — onboarding will show again on next load
  if (session.user.email && TEST_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ ok: true, test: true })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingSeenAt: new Date() },
  })

  return NextResponse.json({ ok: true })
}
