import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTelegram } from '@hooks/useTelegram'
import { ExpenseForm } from '@components/ExpenseForm'
import { addExpense } from '@api/supabase'
import type { Expense, ExpenseCategory } from '@types'

export const CreateExpense: React.FC = () => {
  const { id: objectId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { haptic } = useTelegram()

  if (!objectId) return null

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl-mobile font-bold text-gray-900 mb-6">Новый расход</h1>
      <ExpenseForm
        objectId={objectId}
        onCancel={() => navigate(-1)}
        onSubmit={async (data) => {
          try {
            haptic('success')
            await addExpense({
              object_id: objectId,
              amount: data.amount,
              category: data.category as ExpenseCategory,
              description: data.description,
              receipt_url: data.receipt ? URL.createObjectURL(data.receipt) : undefined,
              receipt_data: data.receiptData as Expense['receipt_data'],
              date: new Date().toISOString().slice(0, 10),
            })
            navigate(`/object/${objectId}`)
          } catch (error) {
            haptic('error')
            console.error(error)
          }
        }}
      />
    </div>
  )
}
