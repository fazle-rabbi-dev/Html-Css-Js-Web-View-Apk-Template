import type { ReactNode } from 'react'
import { Ssgoi, type SsgoiConfig } from '@ssgoi/react'
import { drill } from '@ssgoi/react/view-transitions'

const config: SsgoiConfig = {
  transitions: [{ on: '/**', except: '/', transition: drill() }],
}

export function SsgoiProvider({ children }: { children: ReactNode }) {
  return <Ssgoi config={config}>{children}</Ssgoi>
}