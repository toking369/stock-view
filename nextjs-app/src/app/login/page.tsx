'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const toastTimeoutRef = useRef<NodeJS.Timeout>(undefined as unknown as NodeJS.Timeout)

  // Form state
  const [loginPhone, setLoginPhone] = useState('13800138000')
  const [loginPwd, setLoginPwd] = useState('123456')
  const [loginPhoneErr, setLoginPhoneErr] = useState('')
  const [loginPwdErr, setLoginPwdErr] = useState('')
  const [remember, setRemember] = useState(false)

  const [regPhone, setRegPhone] = useState('')
  const [regCaptcha, setRegCaptcha] = useState('')
  const [regPwd, setRegPwd] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regPhoneErr, setRegPhoneErr] = useState('')
  const [regCaptchaErr, setRegCaptchaErr] = useState('')
  const [regPwdErr, setRegPwdErr] = useState('')
  const [regConfirmErr, setRegConfirmErr] = useState('')
  const [captchaCountdown, setCaptchaCountdown] = useState(0)
  const [loginBtnText, setLoginBtnText] = useState('登 录')
  const [loginDisabled, setLoginDisabled] = useState(false)
  const captchaTimerRef = useRef<NodeJS.Timeout>(undefined as unknown as NodeJS.Timeout)

  const showToast = useCallback((msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000)
  }, [])

  const validatePhone = (v: string) => /^1[3-9]\d{9}$/.test(v)

  const switchTab = (tab: 'login' | 'register') => {
    setActiveTab(tab)
    setLoginPhoneErr(''); setLoginPwdErr('')
    setRegPhoneErr(''); setRegCaptchaErr(''); setRegPwdErr(''); setRegConfirmErr('')
  }

  const startCaptcha = () => {
    if (captchaCountdown > 0) return
    if (!validatePhone(regPhone)) { setRegPhoneErr('请先输入正确的手机号'); return }
    setCaptchaCountdown(60)
    showToast('验证码已发送（演示模式：8888）', 'success')
    captchaTimerRef.current = setInterval(() => {
      setCaptchaCountdown(prev => {
        if (prev <= 1) { clearInterval(captchaTimerRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginPhoneErr(''); setLoginPwdErr('')
    let valid = true
    if (!loginPhone) { setLoginPhoneErr('请输入手机号'); valid = false }
    else if (!validatePhone(loginPhone)) { setLoginPhoneErr('请输入正确的11位手机号'); valid = false }
    if (!loginPwd) { setLoginPwdErr('请输入密码'); valid = false }
    else if (loginPwd.length < 6) { setLoginPwdErr('密码至少6位'); valid = false }
    if (!valid) return

    const users = JSON.parse(localStorage.getItem('sv_users') || '[]')
    const user = users.find((u: any) => u.phone === loginPhone && u.password === loginPwd)
    if (!user) { setLoginPwdErr('账号或密码错误'); return }

    setLoginDisabled(true)
    setLoginBtnText('登录成功')
    localStorage.setItem('sv_logged_in', 'true')
    localStorage.setItem('sv_current_user', JSON.stringify({ phone: user.phone, nickname: user.nickname || user.phone }))
    if (remember) localStorage.setItem('sv_remember', 'true')
    setTimeout(() => router.push('/dashboard'), 300)
  }

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setRegPhoneErr(''); setRegCaptchaErr(''); setRegPwdErr(''); setRegConfirmErr('')
    let valid = true
    if (!regPhone) { setRegPhoneErr('请输入手机号'); valid = false }
    else if (!validatePhone(regPhone)) { setRegPhoneErr('请输入正确的11位手机号'); valid = false }
    if (!regCaptcha) { setRegCaptchaErr('请输入验证码'); valid = false }
    else if (regCaptcha !== '8888') { setRegCaptchaErr('验证码错误（演示模式：8888）'); valid = false }
    if (!regPwd) { setRegPwdErr('请输入密码'); valid = false }
    else if (regPwd.length < 6) { setRegPwdErr('密码至少6位'); valid = false }
    if (!regConfirm) { setRegConfirmErr('请确认密码'); valid = false }
    else if (regConfirm !== regPwd) { setRegConfirmErr('两次输入的密码不一致'); valid = false }
    if (!valid) return

    const users = JSON.parse(localStorage.getItem('sv_users') || '[]')
    if (users.find((u: any) => u.phone === regPhone)) { setRegPhoneErr('该手机号已注册'); return }

    const autoNickname = regPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    users.push({ phone: regPhone, nickname: autoNickname, password: regPwd, createdAt: Date.now() })
    localStorage.setItem('sv_users', JSON.stringify(users))
    setRegPhone(''); setRegCaptcha(''); setRegPwd(''); setRegConfirm('')
    showToast('注册成功，请登录', 'success')
    setTimeout(() => { switchTab('login'); setLoginPhone(regPhone) }, 500)
  }

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('sv_users') || '[]')
    if (!users.find((u: any) => u.phone === '13800138000')) {
      users.push({ phone: '13800138000', nickname: '138****8000', password: '123456', createdAt: Date.now() })
      localStorage.setItem('sv_users', JSON.stringify(users))
    }
    if (localStorage.getItem('sv_logged_in') === 'true') router.push('/dashboard')
    return () => { clearTimeout(toastTimeoutRef.current); clearInterval(captchaTimerRef.current) }
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
                    <label className="form-label">手机号</label>
                    <input className={`form-input${loginPhoneErr ? ' error' : ''}`} type="tel" placeholder="13800138000（演示账号）" autoComplete="username" maxLength={11}
                      value={loginPhone} onChange={e => { setLoginPhone(e.target.value); setLoginPhoneErr('') }}
                      onBlur={() => { if (loginPhone && !validatePhone(loginPhone)) setLoginPhoneErr('请输入正确的11位手机号') }} />
                    <div className="form-error">{loginPhoneErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${loginPwdErr ? ' error' : ''}`} placeholder="123456（演示密码）" autoComplete="current-password"
                        value={loginPwd} onChange={e => { setLoginPwd(e.target.value); setLoginPwdErr('') }}
                        onBlur={() => { if (loginPwd && loginPwd.length < 6) setLoginPwdErr('密码至少6位') }} />
                    </div>
                    <div className="form-error">{loginPwdErr}</div>
                  </div>
                  <div className="form-options">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> 记住我
                    </label>
                    <a className="forgot-link" href="#" onClick={e => { e.preventDefault(); showToast('密码重置功能开发中', 'error') }}>忘记密码？</a>
                  </div>
                  <button type="submit" className={`submit-btn${loginDisabled ? ' success' : ''}`} disabled={loginDisabled}>{loginBtnText}</button>
                </form>

                <div className="auth-divider">或使用以下方式登录</div>
                <div className="quick-login">
                  {[
                    { title: '微信', d: 'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z' },
                    { title: 'QQ', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-4 12s1.5 2 4 2 4-2 4-2m-7-3h.01M15 9h.01' },
                    { title: 'GitHub', d: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22' },
                  ].map((btn, i) => (
                    <button key={i} className="quick-btn" title={btn.title} onClick={() => showToast('第三方登录开发中', 'error')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                        <path d={btn.d} />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="switch-prompt">
                  还没有账号？ <a className="switch-link" onClick={() => switchTab('register')}>立即注册</a>
                </div>
              </div>

              {/* REGISTER */}
              <div className={`form-section${activeTab === 'register' ? ' active' : ''}`}>
                <form onSubmit={handleRegister} noValidate>
                  <div className="form-group">
                    <label className="form-label">手机号</label>
                    <input className={`form-input${regPhoneErr ? ' error' : ''}`} type="tel" placeholder="请输入11位手机号" maxLength={11} autoComplete="tel"
                      value={regPhone} onChange={e => { setRegPhone(e.target.value); setRegPhoneErr('') }}
                      onBlur={() => { if (regPhone && !validatePhone(regPhone)) setRegPhoneErr('请输入正确的11位手机号') }} />
                    <div className="form-error">{regPhoneErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">验证码</label>
                    <div className="captcha-row">
                      <input className={`form-input${regCaptchaErr ? ' error' : ''}`} type="text" placeholder="请输入验证码" maxLength={6}
                        value={regCaptcha} onChange={e => { setRegCaptcha(e.target.value); setRegCaptchaErr('') }} />
                      <button type="button" className="captcha-btn" disabled={captchaCountdown > 0} onClick={startCaptcha}>
                        {captchaCountdown > 0 ? `${captchaCountdown}s 后重试` : '获取验证码'}
                      </button>
                    </div>
                    <div className="form-error">{regCaptchaErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${regPwdErr ? ' error' : ''}`} placeholder="至少6位密码" autoComplete="new-password"
                        value={regPwd} onChange={e => { setRegPwd(e.target.value); setRegPwdErr('') }}
                        onBlur={() => { if (regPwd && regPwd.length < 6) setRegPwdErr('密码至少6位') }} />
                    </div>
                    <div className="form-error">{regPwdErr}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">确认密码</label>
                    <div className="password-wrap">
                      <PasswordInput className={`form-input${regConfirmErr ? ' error' : ''}`} placeholder="再次输入密码" autoComplete="new-password"
                        value={regConfirm} onChange={e => { setRegConfirm(e.target.value); setRegConfirmErr('') }}
                        onBlur={() => { if (regConfirm && regConfirm !== regPwd) setRegConfirmErr('两次输入的密码不一致') }} />
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
