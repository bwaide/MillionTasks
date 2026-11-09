/**
 * Telegram Magic Link Authentication
 * Handles Telegram-based authentication flow
 */

import { createAdminClient } from '../supabase/admin'
import type { User } from '../types/database'

export interface TelegramAuthParams {
  telegram_id: string
  telegram_username?: string
  first_name?: string
  last_name?: string
}

/**
 * Authenticate or create user from Telegram credentials
 */
export async function authenticateWithTelegram(
  params: TelegramAuthParams
): Promise<{ user: User | null; error: string | null }> {
  try {
    const supabase = createAdminClient()
    console.log("Looking up user with telegram_id:", params.telegram_id);

    // Find existing user by Telegram ID
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('telegram_id', params.telegram_id)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      // PGRST116 is "not found" - that's okay
      return { user: null, error: findError.message }
    }

    if (existingUser) {
      // Update last login time
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingUser.id)
        .select()
        .single()

      if (updateError) {
        return { user: null, error: updateError.message }
      }

      return { user: updatedUser, error: null }
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        telegram_id: params.telegram_id,
        telegram_username: params.telegram_username,
      })
      .select()
      .single()

    if (createError) {
      return { user: null, error: createError.message }
    }

    return { user: newUser, error: null }
  } catch (error) {
    console.error('Telegram auth error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

/**
 * Generate magic link token for Telegram user
 */
export async function generateMagicLink(telegramId: string): Promise<string> {
  // In MVP, use simple JWT or encrypted token
  // For production, use Supabase Auth with custom provider
  const token = Buffer.from(
    JSON.stringify({ telegram_id: telegramId, exp: Date.now() + 3600000 })
  ).toString('base64url')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/auth/telegram?token=${token}`
}

/**
 * Verify magic link token
 */
export async function verifyMagicLink(
  token: string
): Promise<{ telegram_id: string | null; error: string | null }> {
  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64url').toString())

    if (decoded.exp < Date.now()) {
      return { telegram_id: null, error: 'Token expired' }
    }

    return { telegram_id: decoded.telegram_id, error: null }
  } catch (error) {
    return { telegram_id: null, error: 'Invalid token' }
  }
}
