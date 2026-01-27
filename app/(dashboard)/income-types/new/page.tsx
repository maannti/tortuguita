import { auth } from "@/lib/auth"
import { IncomeTypeForm } from "@/components/income-types/income-type-form"

export default async function NewIncomeTypePage() {
  const session = await auth()

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="max-w-2xl mx-auto">
      <IncomeTypeForm mode="create" />
    </div>
  )
}
