'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { login, register } from '@/lib/api'
import { validateUsername, validatePassword, validatePasswordConfirm } from '@/lib/validators'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout>(undefined as unknown as NodeJS.Timeout)

  // Login form state
  const [loginUser, setLoginUser] = useState('demo')
  const [loginPwd, setLoginPwd] = useState('Demo@123456')
  const [loginUserErr, setLoginUserErr] = useState('')
  const [loginPwdErr, setLoginPwdErr] = useState('')
  const [remember, setRemember] = useState(false)

  // Register form state
  const [regUser, setRegUser] = useState('')
  const [regPwd, setRegPwd] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regUserErr, setRegUserErr] = useState('')
  const [regPwdErr, setRegPwdErr] = useState('')
  const [regConfirmErr, setRegConfirmErr] = useState('')

  const [loginBtnText, setLoginBtnText] = useState('登 录')
  const [loginDisabled, setLoginDisabled] = useState(false)

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setLoginUserErr(''); setLoginPwdErr('')
    setRegUserErr(''); setRegPwdErr(''); setRegConfirmErr('')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginUserErr(''); setLoginPwdErr('')
    const userErr = validateUsername(loginUser)
    if (userErr) { setLoginUserErr(userErr) }
    const pwdErr = validatePassword(loginPwd)
    if (pwdErr) { setLoginPwdErr(pwdErr) }
    if (userErr || pwdErr) return

    setLoginDisabled(true)
    setLoginBtnText('登录中...')

    try {
      const res = await login(loginUser, loginPwd)
      localStorage.setItem('stockview_token', res.token)
      localStorage.setItem('stockview_user', JSON.stringify(res.user))
      setLoginBtnText('登录成功')
      if (remember) localStorage.setItem('stockview_remember', 'true')
      setTimeout(() => window.location.href = '/dashboard', 300)
    } catch (err: any) {
      setLoginPwdErr(err.message || '登录失败')
      setLoginDisabled(false)
      setLoginBtnText('登 录')
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setRegUserErr(''); setRegPwdErr(''); setRegConfirmErr('')
    const userErr = validateUsername(regUser)
    if (userErr) { setRegUserErr(userErr) }
    const pwdErr = validatePassword(regPwd)
    if (pwdErr) { setRegPwdErr(pwdErr) }
    const confirmErr = validatePasswordConfirm(regPwd, regConfirm)
    if (confirmErr) { setRegConfirmErr(confirmErr) }
    if (userErr || pwdErr || confirmErr) return

    try {
      const res = await register(regUser, regPwd, regUser)
      localStorage.setItem('stockview_token', res.token)
      localStorage.setItem('stockview_user', JSON.stringify(res.user))
      setRegUser(''); setRegPwd(''); setRegConfirm('')
      showToast('注册成功', 'success')
      setTimeout(() => window.location.href = '/dashboard', 500)
    } catch (err: any) {
      if (err.message.includes('已注册')) setRegUserErr(err.message)
      else setRegPwdErr(err.message || '注册失败')
    }
  }

  useEffect(() => {
    if (localStorage.getItem('stockview_token')) {
      router.push('/dashboard')
    }
    return () => { clearTimeout(toastTimeoutRef.current) }
  }, [router])

  return (
    <>
      <div className={`toast ${toast ? 'show' : ''} ${toast?.type === 'success' ? 'toast-success' : 'toast-error'}`}>
        {toast?.msg || ''}
      </div>

      <div className="auth-page">
        {/* LEFT: BRAND PANEL */}
        <div className="brand-panel">
          <div className="glow-dot glow-dot-1"></div>
          <div className="glow-dot glow-dot-2"></div>
          <div className="glow-dot glow-dot-3"></div>
          <div className="brand-header">
            <div className="brand-logo">
              <svg viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="32" height="32" rx="4" strokeWidth="1.5"/>
                <polyline points="8 24 14 16 20 20 28 10" strokeWidth="2"/>
                <circle cx="14" cy="16" r="2" strokeWidth="1.5"/>
                <circle cx="28" cy="10" r="2" strokeWidth="1.5"/>
              </svg>
              <span className="brand-name">Stock<em>View</em></span>
            </div>
            <p className="brand-tagline">A股中短线看盘工作台 — 实时行情、技术分析、智能选股，一站式交易决策工具</p>
          </div>

          <div className="feature-grid">
            {[
              { icon: 'star', title: '自选股看板', desc: '实时行情追踪，多维度排序，快速定位目标个股' },
              { icon: 'chart', title: 'K线技术分析', desc: 'MACD、KDJ、RSI、BOLL 四大指标，辅助买卖决策' },
              { icon: 'grid', title: '板块热力图', desc: '行业板块涨跌一目了然，把握板块轮动节奏' },
              { icon: 'money', title: '资金流向', desc: '主力资金动向监控，洞察机构资金布局' },
              { icon: 'doc', title: '龙虎榜分析', desc: '涨停复盘、游资席位追踪，捕捉短线交易机会' },
              { icon: 'search', title: '智能选股器', desc: '预设策略一键筛选，自定义技术面+基本面过滤' },
            ].map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">
                  {f.icon === 'star' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                  {f.icon === 'chart' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  {f.icon === 'grid' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>}
                  {f.icon === 'money' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                  {f.icon === 'doc' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
                  {f.icon === 'search' && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/><line x1="11" y1="8" x2="11" y2="14"/></svg>}
                </div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="brand-footer">
            &copy; 2026 StockView &middot; 仅供学习交流，不构成投资建议<br />
            数据来源：东方财富公开接口 &middot; 所有数据仅供参考
          </div>
        </div>

        {/* RIGHT: FORM PANEL */}
        <div className="form-panel">
          <div className="form-container">
            <div className="auth-tabs">
              <button className={`auth-tab${activeTab === 'login' ? ' active' : ''}`} onClick={() => switchTab('login')}>登录</button>
              <button className={`auth-tab${activeTab === 'register' ? ' active' : ''}`} onClick={() => switchTab('register')}>注册</button>
            </div>

            <div className="form-sections-wrap">
              {/* LOGIN */}
              <div className={`form-section${activeTab === 'login' ? ' active' : ''}`}>
                <form onSubmit={handleLogin} noValidate>
                  <div className="form-group">
                    <label className="form-label">账号</label>
                    <input className={`form-input${loginUserErr ? ' error' : ''}`} type="text" placeholder="demo（演示账号）" autoComplete="username"
                      value={loginUser} onChange={e => { setLoginUser(e.target.value); setLoginUserErr('') }}
                      onBlur={() => { if (loginUser) setLoginUserErr(validateUsername(loginUser) || '') }} />
                    <div className="form-error">{loginUserErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${loginPwdErr ? ' error' : ''}`} placeholder="Demo@123456（演示密码）" autoComplete="current-password"
                        value={loginPwd} onChange={e => { setLoginPwd(e.target.value); setLoginPwdErr('') }}
                        onBlur={() => { if (loginPwd) setLoginPwdErr(validatePassword(loginPwd) || '') }} />
                    </div>
                    <div className="form-error">{loginPwdErr}</div>
                    <a className="forgot-link" href="#" onClick={e => { e.preventDefault(); showToast('密码重置功能开发中', 'error') }}>忘记密码？</a>
                  </div>
                  <div className="form-options">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> 记住我
                    </label>
                    <a className="switch-link" onClick={() => switchTab('register')}>立即注册</a>
                  </div>
                  <button type="submit" className={`submit-btn${loginDisabled ? ' success' : ''}`} disabled={loginDisabled}>{loginBtnText}</button>
                </form>
              </div>

              {/* REGISTER */}
              <div className={`form-section${activeTab === 'register' ? ' active' : ''}`}>
                <form onSubmit={handleRegister} noValidate>
                  <div className="form-group">
                    <label className="form-label">账号</label>
                    <input className={`form-input${regUserErr ? ' error' : ''}`} type="text" placeholder="请设置登录账号" autoComplete="username"
                      value={regUser} onChange={e => { setRegUser(e.target.value); setRegUserErr('') }}
                      onBlur={() => { if (regUser) setRegUserErr(validateUsername(regUser) || '') }} />
                    <div className="form-error">{regUserErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${regPwdErr ? ' error' : ''}`} placeholder="6~12位，含字母+数字" autoComplete="new-password"
                        value={regPwd} onChange={e => { setRegPwd(e.target.value); setRegPwdErr('') }}
                        onBlur={() => { if (regPwd) setRegPwdErr(validatePassword(regPwd) || '') }} />
                    </div>
                    <div className="form-error">{regPwdErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">确认密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${regConfirmErr ? ' error' : ''}`} placeholder="再次输入密码" autoComplete="new-password"
                        value={regConfirm} onChange={e => { setRegConfirm(e.target.value); setRegConfirmErr('') }}
                        onBlur={() => { if (regConfirm) setRegConfirmErr(validatePasswordConfirm(regPwd, regConfirm) || '') }} />
                    </div>
                    <div className="form-error">{regConfirmErr}</div>
                  </div>
                  <button type="submit" className="submit-btn" style={{ marginTop: 8 }}>注 册</button>
                </form>
                <div className="switch-prompt" style={{ marginTop: 24 }}>
                  已有账号？ <a className="switch-link" onClick={() => switchTab('login')}>去登录</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PasswordInput({ className, placeholder, autoComplete, value, onChange, onBlur }: {
  className?: string; placeholder?: string; autoComplete?: string
  value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <>
      <input className={className} type={show ? 'text' : 'password'} placeholder={placeholder} autoComplete={autoComplete}
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
