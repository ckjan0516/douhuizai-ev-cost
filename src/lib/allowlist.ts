/** 允許使用豆灰仔的 Google 帳號。要新增時在這裡加，並同步改 firestore.rules。一律小寫。 */
export const ALLOWED_EMAILS: string[] = ['therealck50@gmail.com']

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ALLOWED_EMAILS.includes(email.trim().toLowerCase())
}
