"use client"

import * as React from "react"
import {
  createDOMRenderer,
  FluentProvider,
  renderToStyleElements,
  RendererProvider,
  SSRProvider,
  webDarkTheme,
  webLightTheme,
} from "@fluentui/react-components"
import { useServerInsertedHTML } from "next/navigation"
import { useUiTheme } from "@/components/ui-state-provider"

export function FluentUiProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = useUiTheme()
  const [renderer] = React.useState(() => createDOMRenderer())
  const didRenderRef = React.useRef(false)

  useServerInsertedHTML(() => {
    if (didRenderRef.current) return null
    didRenderRef.current = true
    return <>{renderToStyleElements(renderer)}</>
  })

  return (
    <RendererProvider renderer={renderer}>
      <SSRProvider>
        <FluentProvider
          theme={theme === "dark" ? webDarkTheme : webLightTheme}
        >
          {children}
        </FluentProvider>
      </SSRProvider>
    </RendererProvider>
  )
}
