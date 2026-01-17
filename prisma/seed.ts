import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Default categories
  const defaultCategories = [
    { name: 'Groceries', description: 'Food and household items', color: '#10b981', icon: '🛒' },
    { name: 'Utilities', description: 'Electric, water, gas, internet', color: '#3b82f6', icon: '💡' },
    { name: 'Rent', description: 'Monthly rent or mortgage', color: '#ef4444', icon: '🏠' },
    { name: 'Transportation', description: 'Gas, public transit, car maintenance', color: '#f59e0b', icon: '🚗' },
    { name: 'Entertainment', description: 'Movies, games, streaming services', color: '#ec4899', icon: '🎬' },
    { name: 'Dining Out', description: 'Restaurants and takeout', color: '#8b5cf6', icon: '🍽️' },
    { name: 'Healthcare', description: 'Medical expenses and pharmacy', color: '#06b6d4', icon: '⚕️' },
    { name: 'Shopping', description: 'Clothing and personal items', color: '#f97316', icon: '🛍️' },
  ]

  console.log('Seed completed successfully!')
  console.log('\nNote: Categories will be created when users sign up.')
  console.log('Default categories available:', defaultCategories.map(c => c.name).join(', '))
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
