import { auth } from "@/lib/auth"
import { IncomeTypeForm } from "@/components/income-types/income-type-form"

export default async function NewIncomeTypePage() {
  const session = await auth()

  if (!session?.user?.currentOrganizationId) {
    return <div>Unauthorized</div>
  }

  return (
    <div className="-mx-4 md:mx-0 md:max-w-3xl lg:mx-auto">
      <IncomeTypeForm mode="create" />
    </div>
  )
}
