import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'StockView — A股中短线看盘工作台',
  description: 'A股中短线看盘工作台，实时行情、K线分析、板块热力图、资金流向、龙虎榜、选股器、AI问答',
}

export const viewport = 'width=device-width, initial-scale=1'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${jetbrainsMono.variable} dark h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('sv_theme');if(t==='light')document.documentElement.className=document.documentElement.className.replace('dark','light');}catch(e){}})()`
        }} />
      </head>
      <body className="h-full antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
