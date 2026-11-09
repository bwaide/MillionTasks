/**
 * Dashboard Page
 * Main view for tasks with real-time updates
 */

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  // Get user from cookie
  const cookieStore = await cookies()
  const userId = cookieStore.get('mt_user_id')?.value

  if (!userId) {
    redirect('/')
  }

  // Fetch initial data
  const supabase = await createClient()

  const [userResult, tasksResult] = await Promise.all([
    supabase.from('users').select('*').eq('id', userId).single(),
    supabase
      .from('tasks')
      .select('*')
      .or(`created_by.eq.${userId},assigned_to.eq.${userId}`)
      .order('created_at', { ascending: false }),
  ])

  if (userResult.error || !userResult.data) {
    redirect('/auth/error?message=User not found')
  }

  const tasks = tasksResult.data || []

  return (
    <DashboardClient
      initialTasks={tasks}
      user={userResult.data}
      userId={userId}
    />
  )
}
