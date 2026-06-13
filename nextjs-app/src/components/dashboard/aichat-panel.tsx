'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { aiEngine } from '@/lib/ai-engine'
import { formatSessionTime } from '@/lib/utils'
import type { ChatSession, ChatMessage } from '@/types'

// ── Constants ────────────────────────────────────────

const STORAGE_KEY = 'sv_chat_sessions'
const TYPING_SPEED = 25
const TYPING_CHUNK = 3
const MAX_SESSION_TITLE_LENGTH = 24

const QUICK_PROMPTS = [
  '分析贵州茅台',
  '大盘行情',
  '板块资金流向',
  '龙虎榜分析',
]

// ── Helpers ──────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

function loadSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
    // storage full or unavailable
  }
}

function createWelcomeSession(): ChatSession {
  return {
    id: generateId(),
    title: '新对话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

/** Format AI text to HTML using original CSS classes */
function formatAiText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="fw-600">$1</strong>')
    .replace(/\n/g, '<br/>')
}

/** Format message timestamp */
function fmtMsgTime(ts: number): string {
  const now = Date.now()
  const diff = now - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

// ── Inline SVG Components ────────────────────────────

function PlusSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ImageSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="18" height="18">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function SendSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function BotSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M9 15c0 0 1 2 3 2s3-2 3-2" />
    </svg>
  )
}

function TrashSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
    </svg>
  )
}

function ChatSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}

function BotAvatarSvg() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="16" height="16">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <circle cx="15" cy="9" r="1.5" />
      <path d="M9 15c0 0 1 2 3 2s3-2 3-2" />
    </svg>
  )
}

// ── Main Component ───────────────────────────────────

export function AIChatPanel() {
  // ── State ────────────────────────────────────────
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [typingContent, setTypingContent] = useState('')
  const [typingMsgId, setTypingMsgId] = useState<string | null>(null)
  const [pendingImages, setPendingImages] = useState<string[]>([])

  const typingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // ── Derive active session ─────────────────────────
  const activeSession = chatSessions.find((s) => s.id === activeSessionId) ?? null
  const messages = activeSession?.messages ?? []

  // ── Load from localStorage on mount ───────────────
  useEffect(() => {
    const stored = loadSessions()
    if (stored.length > 0) {
      setChatSessions(stored)
      setActiveSessionId(stored[0].id)
    } else {
      const welcome = createWelcomeSession()
      setChatSessions([welcome])
      setActiveSessionId(welcome.id)
    }
  }, [])

  // ── Persist on changes ───────────────────────────
  useEffect(() => {
    if (chatSessions.length > 0) {
      saveSessions(chatSessions)
    }
  }, [chatSessions])

  // ── Auto-scroll to bottom ────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingContent, isTyping])

  // ── Cleanup typing timer on unmount ──────────────
  useEffect(() => {
    return () => {
      if (typingRef.current) clearInterval(typingRef.current)
    }
  }, [])

  // ── Auto-resize textarea ─────────────────────────
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  // ── Session Management ───────────────────────────
  const createNewSession = useCallback(() => {
    if (isTyping) return
    const session: ChatSession = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setChatSessions((prev) => [session, ...prev])
    setActiveSessionId(session.id)
    setInput('')
    setPendingImages([])
    setTypingContent('')
    setTypingMsgId(null)
  }, [isTyping])

  const deleteSession = useCallback(
    (id: string) => {
      if (isTyping) return
      setChatSessions((prev) => {
        const next = prev.filter((s) => s.id !== id)
        if (activeSessionId === id) {
          setActiveSessionId(next.length > 0 ? next[0].id : null)
        }
        return next
      })
    },
    [isTyping, activeSessionId],
  )

  const switchSession = useCallback(
    (id: string) => {
      if (isTyping) return
      setActiveSessionId(id)
      setInput('')
      setPendingImages([])
      setTypingContent('')
      setTypingMsgId(null)
    },
    [isTyping],
  )

  // ── Image handling ──────────────────────────────
  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      for (const file of files) {
        if (!file.type.startsWith('image/')) continue
        const reader = new FileReader()
        reader.onload = (ev) => {
          if (ev.target?.result && typeof ev.target.result === 'string') {
            setPendingImages((prev) => [...prev, ev.target!.result as string])
          }
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ''
    },
    [],
  )

  const removePendingImage = useCallback((idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  // ── Send Message ─────────────────────────────────
  const sendMessage = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? input).trim()
      if (!text && pendingImages.length === 0) return
      if (!activeSessionId || isTyping) return

      const sessionId = activeSessionId
      const userMsgId = generateId()
      const aiMsgId = generateId()
      const hasImages = pendingImages.length > 0

      // Build user message
      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: text,
        images: hasImages ? [...pendingImages] : undefined,
        timestamp: Date.now(),
      }

      // Determine session title
      const titlePreview =
        text.slice(0, MAX_SESSION_TITLE_LENGTH) +
        (text.length > MAX_SESSION_TITLE_LENGTH ? '...' : '')

      // Append user message
      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title:
                  s.messages.length === 0 && text
                    ? titlePreview
                    : s.title,
                messages: [...s.messages, userMsg],
                updatedAt: Date.now(),
              }
            : s,
        ),
      )

      setInput('')
      setPendingImages([])

      // Generate AI response
      const { content } = aiEngine.generate(text, hasImages, null)

      // Insert placeholder AI message
      setChatSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [
                  ...s.messages,
                  {
                    id: aiMsgId,
                    role: 'assistant',
                    content: '',
                    timestamp: Date.now(),
                  },
                ],
                updatedAt: Date.now(),
              }
            : s,
        ),
      )

      // Start character-by-character typing effect
      setIsTyping(true)
      setTypingMsgId(aiMsgId)
      setTypingContent('')

      let idx = 0
      typingRef.current = setInterval(() => {
        idx += TYPING_CHUNK
        if (idx >= content.length) {
          idx = content.length
          if (typingRef.current) clearInterval(typingRef.current)
          typingRef.current = null

          setChatSessions((prev) =>
            prev.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    messages: s.messages.map((m) =>
                      m.id === aiMsgId ? { ...m, content } : m,
                    ),
                  }
                : s,
            ),
          )

          setIsTyping(false)
          setTypingMsgId(null)
          setTypingContent('')
        }
        setTypingContent(content.slice(0, idx))
      }, TYPING_SPEED)
    },
    [input, pendingImages, activeSessionId, isTyping],
  )

  // ── Keyboard handler ─────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage()
      }
    },
    [sendMessage],
  )

  // ── Render ───────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ====== Panel Header ====== */}
      <div className="panel-header">
        <div>
          <div className="panel-title">AI 智能问答</div>
          <div className="panel-subtitle">支持截图提问，帮你分析行情、解读走势</div>
        </div>
      </div>

      <div className="ai-chat-layout">
        {/* ====== Session List ====== */}
        <div className="session-list">
          <div className="session-list-header">
            <button className="new-session-btn" onClick={createNewSession} disabled={isTyping}>
              <PlusSvg /> 新建会话
            </button>
          </div>
          <div className="session-items">
            {chatSessions.length === 0 && (
              <div style={{ padding: '16px 8px', textAlign: 'center', fontSize: 12, color: 'var(--fg-dim)' }}>
                暂无对话
              </div>
            )}
            {chatSessions.map((session) => {
              const isActive = session.id === activeSessionId
              return (
                <div
                  key={session.id}
                  className={'session-item' + (isActive ? ' active' : '')}
                  onClick={() => switchSession(session.id)}
                >
                  <span className="session-item-icon">
                    <ChatSvg />
                  </span>
                  <div className="session-item-info">
                    <div className="session-item-title">{session.title}</div>
                    <div className="session-item-meta">{formatSessionTime(session.updatedAt)}</div>
                  </div>
                  <button
                    className="session-item-delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    disabled={isTyping}
                    title="删除会话"
                  >
                    <TrashSvg />
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* ====== Chat Main Area ====== */}
        <div className="chat-main">
          {/* ── Messages ── */}
          <div className="chat-messages">
            {messages.length === 0 ? (
              /* Empty state */
              <div className="chat-empty">
                <div className="chat-empty-icon">
                  <BotSvg />
                </div>
                <div className="chat-empty-title">有什么可以帮助您的？</div>
                <div className="quick-prompts">
                  {QUICK_PROMPTS.map((prompt) => (
                    <div
                      key={prompt}
                      className="quick-prompt-card"
                      onClick={() => sendMessage(prompt)}
                    >
                      <div className="quick-prompt-text">{prompt}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Message bubbles */
              <>
                {messages.map((msg, _idx) => {
                  const isLastAssistant =
                    isTyping &&
                    msg.role === 'assistant' &&
                    msg.id === typingMsgId

                  const displayContent =
                    isLastAssistant && typingContent
                      ? typingContent
                      : msg.content

                  return (
                    <div
                      key={msg.id}
                      className={'msg-row ' + (msg.role === 'user' ? 'user' : 'ai')}
                    >
                      {/* Avatar */}
                      <div className="msg-avatar">
                        {msg.role === 'assistant' ? <BotAvatarSvg /> : 'U'}
                      </div>

                      {/* Bubble + Time */}
                      <div>
                        <div className="msg-bubble">
                          {/* Image attachments in user message */}
                          {msg.images && msg.images.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {msg.images.map((img, j) => (
                                <div key={j} className="msg-image">
                                  <img
                                    src={img}
                                    alt="附件图片"
                                    style={{ width: '100%', display: 'block' }}
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Content */}
                          {msg.role === 'assistant' ? (
                            <span
                              dangerouslySetInnerHTML={{
                                __html: formatAiText(displayContent || ' '),
                              }}
                            />
                          ) : (
                            <span style={{ whiteSpace: 'pre-wrap' }}>
                              {msg.content}
                            </span>
                          )}

                          {/* Typing indicator */}
                          {isLastAssistant && isTyping && (
                            <div className="typing-indicator" style={{ display: 'inline-flex', marginLeft: 4 }}>
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                              <span className="typing-dot"></span>
                            </div>
                          )}
                        </div>

                        <div className="msg-time">{fmtMsgTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  )
                })}

                {/* Scroll anchor */}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {/* ── Input Bar ── */}
          <div className="chat-input-bar">
            {/* Image previews */}
            {pendingImages.length > 0 && (
              <div className="chat-image-preview">
                {pendingImages.map((img, i) => (
                  <div key={i} className="preview-thumb">
                    <img src={img} alt="待上传" />
                    <button
                      className="preview-thumb-remove"
                      onClick={() => removePendingImage(i)}
                    >
                      x
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="chat-input-row">
              {/* Hidden file input */}
              <input
                ref={imageInputRef}
                type="file"
                className="chat-file-input"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
              />

              {/* Image attach button */}
              <button
                className="chat-action-btn"
                onClick={() => imageInputRef.current?.click()}
                disabled={isTyping}
                title="上传图片"
              >
                <ImageSvg />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                className="chat-textarea"
                placeholder="输入你的问题... (Enter 发送, Shift+Enter 换行)"
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isTyping}
              />

              {/* Send button */}
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={(!input.trim() && pendingImages.length === 0) || isTyping}
                title="发送"
              >
                <SendSvg />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
