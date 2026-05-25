/**
 * Notifications for shared bill events (create / update / delete).
 * Called fire-and-forget from API routes — never throws to the caller.
 */
import { prisma } from "@/lib/prisma"
import { sendPushNotification } from "@/lib/notifications"

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

type BillAction = "created" | "updated" | "deleted"

interface NotifyParams {
  billId: string
  billLabel: string
  billAmount: number           // total bill amount (not per-cuota)
  actorId: string              // user who triggered the action
  actorName: string
  action: BillAction
  assignments: Array<{ userId: string; percentage: number }>
  // For installments
  totalInstallments?: number
}

export async function notifySharedBillMembers({
  billId,
  billLabel,
  billAmount,
  actorId,
  actorName,
  action,
  assignments,
  totalInstallments,
}: NotifyParams): Promise<void> {
  // Only notify users who are assigned AND are not the actor
  const otherAssignees = assignments.filter(a => a.userId !== actorId)
  if (otherAssignees.length === 0) return

  const recipientIds = otherAssignees.map(a => a.userId)
  const recipients = await prisma.user.findMany({
    where: {
      id: { in: recipientIds },
      notificationsEnabled: true,
      fcmToken: { not: null },
    },
    select: { id: true, fcmToken: true },
  })
  if (recipients.length === 0) return

  const firstName = actorName.split(" ")[0]
  const isInstallment = totalInstallments && totalInstallments > 1

  await Promise.all(
    recipients.map(async (recipient) => {
      if (!recipient.fcmToken) return

      const assignee = otherAssignees.find(a => a.userId === recipient.id)!
      const share = Math.round(billAmount * (assignee.percentage / 100))
      const shareStr = arsFormatter.format(share)

      let title: string
      let body: string

      if (action === "created") {
        title = `${firstName} agregó un gasto compartido`
        body = isInstallment
          ? `${billLabel} en ${totalInstallments} cuotas · Te corresponde ${shareStr}/cuota`
          : `${billLabel} · Te corresponde ${shareStr}`
      } else if (action === "updated") {
        title = `${firstName} editó un gasto compartido`
        body = `${billLabel} fue actualizado · Tu parte es ${shareStr}`
      } else {
        title = `${firstName} eliminó un gasto compartido`
        body = `"${billLabel}" que tenías asignado fue eliminado`
      }

      const url = action === "deleted" ? "/bills" : `/bills/${billId}`

      const ok = await sendPushNotification(
        recipient.fcmToken,
        { title, body, type: "shared_expense", url },
        recipient.id
      )

      // Token invalid → clean up
      if (!ok) {
        await prisma.user.update({
          where: { id: recipient.id },
          data: { fcmToken: null, notificationsEnabled: false },
        })
      }
    })
  )
}
