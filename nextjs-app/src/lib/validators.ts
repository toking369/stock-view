/**
 * Account validation rules — shared between frontend and backend
 */

export const USERNAME_RULES = {
  minLen: 3,
  maxLen: 20,
  pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/,
  patternMsg: '只能包含字母、数字、下划线，且必须以字母开头',
}

export const PASSWORD_RULES = {
  minLen: 6,
  maxLen: 12,
  requireLetter: /[a-zA-Z]/,
  requireDigit: /\d/,
}

export function validateUsername(v: string): string | null {
  if (!v) return '请输入账号'
  if (v.length < USERNAME_RULES.minLen) return `账号至少${USERNAME_RULES.minLen}位`
  if (v.length > USERNAME_RULES.maxLen) return `账号不超过${USERNAME_RULES.maxLen}位`
  if (!USERNAME_RULES.pattern.test(v)) return USERNAME_RULES.patternMsg
  return null
}

export function validatePassword(v: string): string | null {
  if (!v) return '请输入密码'
  if (v.length < PASSWORD_RULES.minLen) return `密码至少${PASSWORD_RULES.minLen}位`
  if (v.length > PASSWORD_RULES.maxLen) return `密码不超过${PASSWORD_RULES.maxLen}位`
  if (!PASSWORD_RULES.requireLetter.test(v)) return '密码必须包含字母'
  if (!PASSWORD_RULES.requireDigit.test(v)) return '密码必须包含数字'
  return null
}

export function validatePasswordConfirm(pwd: string, confirm: string): string | null {
  if (!confirm) return '请确认密码'
  if (confirm !== pwd) return '两次输入的密码不一致'
  return null
}
