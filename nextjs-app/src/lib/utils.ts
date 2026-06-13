import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format numbers to 万/亿 display */
export function fmtNum(n: number): string {
  if (n === 0) return '0'
  const abs = Math.abs(n)
  let result: string
  if (abs >= 1e8) {
    result = `${(n / 1e8).toFixed(2)}亿`
  } else if (abs >= 1e4) {
    result = `${(n / 1e4).toFixed(2)}万`
  } else {
    result = n.toFixed(2)
  }
  return result
}

/** Seeded PRNG */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

let _seedVal = new Date().getDate()
const _rng = mulberry32(_seedVal)

export function seededRandom(): number {
  return _rng()
}

/** Hash string to number */
export function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return hash
}

/** Format session time */
export function formatSessionTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 259200000) return `${Math.floor(diff / 86400000)}天前`
  return new Date(ts).toLocaleDateString('zh-CN')
}

/** Format AI text to HTML */
export function formatAiText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground font-semibold">$1</strong>')
    .replace(/\n/g, '<br/>')
}

/** Escape HTML */
export function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}
