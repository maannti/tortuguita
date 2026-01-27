import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Default bill categories
  const defaultBillCategories = [
    { name: 'Groceries', description: 'Food and household items', color: '#10b981', icon: '🛒' },
    { name: 'Utilities', description: 'Electric, water, gas, internet', color: '#3b82f6', icon: '💡' },
    { name: 'Rent', description: 'Monthly rent or mortgage', color: '#ef4444', icon: '🏠' },
    { name: 'Transportation', description: 'Gas, public transit, car maintenance', color: '#f59e0b', icon: '🚗' },
    { name: 'Entertainment', description: 'Movies, games, streaming services', color: '#ec4899', icon: '🎬' },
    { name: 'Dining Out', description: 'Restaurants and takeout', color: '#8b5cf6', icon: '🍽️' },
    { name: 'Healthcare', description: 'Medical expenses and pharmacy', color: '#06b6d4', icon: '⚕️' },
    { name: 'Shopping', description: 'Clothing and personal items', color: '#f97316', icon: '🛍️' },
  ]

  // Default income categories
  const defaultIncomeCategories = [
    { name: 'Salario', description: 'Salario mensual o nómina', color: '#10b981', icon: '💰', isRecurring: true },
    { name: 'Freelance', description: 'Trabajo independiente o proyectos', color: '#3b82f6', icon: '💼', isRecurring: false },
    { name: 'Inversiones', description: 'Dividendos, intereses, ganancias', color: '#8b5cf6', icon: '📈', isRecurring: false },
    { name: 'Alquiler', description: 'Ingresos por alquiler de propiedades', color: '#f59e0b', icon: '🏠', isRecurring: true },
    { name: 'Otros', description: 'Otros ingresos', color: '#6b7280', icon: '💵', isRecurring: false },
  ]

  console.log('Seed completed successfully!')
  console.log('\nNote: Categories will be created when users sign up.')
  console.log('Default bill categories available:', defaultBillCategories.map(c => c.name).join(', '))
  console.log('Default income categories available:', defaultIncomeCategories.map(c => c.name).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
