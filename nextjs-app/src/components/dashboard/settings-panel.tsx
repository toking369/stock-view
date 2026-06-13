'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { validatePassword, validatePasswordConfirm } from '@/lib/validators'

const AI_CONFIG_KEY = 'sv_ai_config'

interface AiConfig {
  baseUrl: string
  apiKey: string
}

function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (!raw) return { baseUrl: '', apiKey: '' }
    return JSON.parse(raw)
  } catch {
    return { baseUrl: '', apiKey: '' }
  }
}

function saveAiConfig(config: AiConfig) {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

export function SettingsPanel() {
  const [activeSection, setActiveSection] = useState<'password' | 'ai' | 'theme'>('password')

  // Password state
  const [curPwd, setCurPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [curPwdErr, setCurPwdErr] = useState('')
  const [newPwdErr, setNewPwdErr] = useState('')
  const [confirmPwdErr, setConfirmPwdErr] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMsg, setPwdMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // AI config state
  const [aiBaseUrl, setAiBaseUrl] = useState('')
  const [aiApiKey, setAiApiKey] = useState('')
  const [aiSaving, setAiSaving] = useState(false)
  const [aiMsg, setAiMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const pwdMsgTimer = useRef<NodeJS.Timeout>(undefined as unknown as NodeJS.Timeout)
  const aiMsgTimer = useRef<NodeJS.Timeout>(undefined as unknown as NodeJS.Timeout)

  useEffect(() => {
    const cfg = loadAiConfig()
    setAiBaseUrl(cfg.baseUrl)
    setAiApiKey(cfg.apiKey)
    // Load theme
    const saved = localStorage.getItem('sv_theme')
    if (saved === 'light' || saved === 'dark') setTheme(saved)
  }, [])

  const showPwdMsg = useCallback((text: string, type: 'success' | 'error') => {
    setPwdMsg({ text, type })
    if (pwdMsgTimer.current) clearTimeout(pwdMsgTimer.current)
    pwdMsgTimer.current = setTimeout(() => setPwdMsg(null), 3000)
  }, [])

  const showAiMsg = useCallback((text: string, type: 'success' | 'error') => {
    setAiMsg({ text, type })
    if (aiMsgTimer.current) clearTimeout(aiMsgTimer.current)
    aiMsgTimer.current = setTimeout(() => setAiMsg(null), 3000)
  }, [])

  // ── Change Password ──────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setCurPwdErr(''); setNewPwdErr(''); setConfirmPwdErr('')

    if (!curPwd) { setCurPwdErr('请输入当前密码'); return }

    const pwdErr = validatePassword(newPwd)
    if (pwdErr) { setNewPwdErr(pwdErr); return }

    const confirmErr = validatePasswordConfirm(newPwd, confirmPwd)
    if (confirmErr) { setConfirmPwdErr(confirmErr); return }

    setPwdSaving(true)
    try {
      const token = localStorage.getItem('stockview_token')
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: curPwd, newPassword: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '修改失败')
      showPwdMsg('密码修改成功', 'success')
      setCurPwd(''); setNewPwd(''); setConfirmPwd('')
    } catch (err: any) {
      showPwdMsg(err.message || '修改失败', 'error')
    } finally {
      setPwdSaving(false)
    }
  }

  // ── Theme Toggle ───────────────────────────────────
  const handleThemeChange = (t: 'dark' | 'light') => {
    setTheme(t)
    localStorage.setItem('sv_theme', t)
    document.documentElement.className = document.documentElement.className
      .replace(/\bdark\b|\blight\b/g, '')
      .trim() + ' ' + t
  }

  // ── Save AI Config ───────────────────────────────
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault()
    setAiSaving(true)
    try {
      saveAiConfig({ baseUrl: aiBaseUrl.trim(), apiKey: aiApiKey.trim() })
      showAiMsg('AI 配置已保存', 'success')
    } catch {
      showAiMsg('保存失败', 'error')
    } finally {
      setAiSaving(false)
    }
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <div className="panel-header">
        <div>
          <div className="panel-title">设置</div>
          <div className="panel-subtitle">账号安全 · AI 模型 · 主题切换</div>
        </div>
      </div>

      {/* Section Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        <button
          onClick={() => setActiveSection('password')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeSection === 'password' ? '2px solid var(--rise)' : '2px solid transparent',
            background: 'none',
            color: activeSection === 'password' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeSection === 'password' ? 600 : 400,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          修改密码
        </button>
        <button
          onClick={() => setActiveSection('ai')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeSection === 'ai' ? '2px solid var(--rise)' : '2px solid transparent',
            background: 'none',
            color: activeSection === 'ai' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeSection === 'ai' ? 600 : 400,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          AI 模型配置
        </button>
        <button
          onClick={() => setActiveSection('theme')}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderBottom: activeSection === 'theme' ? '2px solid var(--rise)' : '2px solid transparent',
            background: 'none',
            color: activeSection === 'theme' ? 'var(--fg)' : 'var(--fg-muted)',
            fontWeight: activeSection === 'theme' ? 600 : 400,
            fontSize: 14,
            cursor: 'pointer',
            transition: 'color 0.2s, border-color 0.2s',
          }}
        >
          主题设置
        </button>
      </div>

      {/* ── Password Section ── */}
      {activeSection === 'password' && (
        <form onSubmit={handleChangePassword} style={{ maxWidth: 420 }}>
          {/* Current password */}
          <div className="form-group">
            <label className="form-label">当前密码</label>
            <div className="password-wrap">
              <PasswordInput
                className={'form-input' + (curPwdErr ? ' error' : '')}
                placeholder="请输入当前密码"
                value={curPwd}
                onChange={e => { setCurPwd(e.target.value); setCurPwdErr('') }}
              />
            </div>
            <div className="form-error">{curPwdErr}</div>
          </div>

          {/* New password */}
          <div className="form-group">
            <label className="form-label">新密码</label>
            <div className="password-wrap">
              <PasswordInput
                className={'form-input' + (newPwdErr ? ' error' : '')}
                placeholder="6~12位，含字母+数字"
                value={newPwd}
                onChange={e => { setNewPwd(e.target.value); setNewPwdErr('') }}
                onBlur={() => { if (newPwd) setNewPwdErr(validatePassword(newPwd) || '') }}
              />
            </div>
            <div className="form-error">{newPwdErr}</div>
          </div>

          {/* Confirm password */}
          <div className="form-group">
            <label className="form-label">确认新密码</label>
            <div className="password-wrap">
              <PasswordInput
                className={'form-input' + (confirmPwdErr ? ' error' : '')}
                placeholder="再次输入新密码"
                value={confirmPwd}
                onChange={e => { setConfirmPwd(e.target.value); setConfirmPwdErr('') }}
                onBlur={() => { if (confirmPwd) setConfirmPwdErr(validatePasswordConfirm(newPwd, confirmPwd) || '') }}
              />
            </div>
            <div className="form-error">{confirmPwdErr}</div>
          </div>

          {/* Message */}
          {pwdMsg && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
              background: pwdMsg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: pwdMsg.type === 'success' ? '#22c55e' : '#ef4444',
            }}>
              {pwdMsg.text}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={pwdSaving} style={{ marginTop: 4 }}>
            {pwdSaving ? '保存中...' : '修改密码'}
          </button>
        </form>
      )}

      {/* ── AI Config Section ── */}
      {activeSection === 'ai' && (
        <form onSubmit={handleSaveAi} style={{ maxWidth: 560 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>API 地址</div>
            <input
              className="form-input"
              type="url"
              placeholder="https://api.openai.com/v1"
              value={aiBaseUrl}
              onChange={e => setAiBaseUrl(e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 4 }}>
              兼容 OpenAI 协议的大模型 API 地址，例如 https://api.openai.com/v1
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 8 }}>API Key</div>
            <input
              className="form-input"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxx"
              value={aiApiKey}
              onChange={e => setAiApiKey(e.target.value)}
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: 11, color: 'var(--fg-dim)', marginTop: 4 }}>
              API 密钥，将以 Bearer Token 形式传递
            </div>
          </div>

          {/* Message */}
          {aiMsg && (
            <div style={{
              padding: '8px 12px', borderRadius: 6, marginBottom: 12, fontSize: 13,
              background: aiMsg.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: aiMsg.type === 'success' ? '#22c55e' : '#ef4444',
            }}>
              {aiMsg.text}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={aiSaving}>
            {aiSaving ? '保存中...' : '保存配置'}
          </button>
        </form>
      )}

      {/* ── Theme Section ── */}
      {activeSection === 'theme' && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg)', marginBottom: 16 }}>界面主题</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => handleThemeChange('dark')}
              style={{
                flex: 1, padding: '20px 16px', borderRadius: 8, cursor: 'pointer',
                border: theme === 'dark' ? '2px solid var(--rise)' : '2px solid var(--border)',
                background: theme === 'dark' ? 'var(--bg-selected)' : 'var(--bg-panel)',
                textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>🌙</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>深色模式</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>护眼暗色主题，默认</div>
            </button>
            <button
              onClick={() => handleThemeChange('light')}
              style={{
                flex: 1, padding: '20px 16px', borderRadius: 8, cursor: 'pointer',
                border: theme === 'light' ? '2px solid var(--rise)' : '2px solid var(--border)',
                background: theme === 'light' ? 'var(--bg-selected)' : 'var(--bg-panel)',
                textAlign: 'center', transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8 }}>☀️</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>浅色模式</div>
              <div style={{ fontSize: 12, color: 'var(--fg-muted)', marginTop: 4 }}>明亮清晰，适合白天</div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Reusable Password Input ────────────────────
function PasswordInput({ className, placeholder, value, onChange, onBlur }: {
  className?: string; placeholder?: string
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <>
      <input className={className} type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete="new-password"
        value={value} onChange={onChange} onBlur={onBlur} />
      <button type="button" className="pw-toggle" onClick={() => setShow(!show)} title={show ? '隐藏密码' : '显示密码'}>
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </>
  )
}
