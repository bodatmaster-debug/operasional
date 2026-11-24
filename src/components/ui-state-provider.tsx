"use client"

import * as React from "react"
import {
  initialUiState,
  uiReducer,
  type UiAction,
  type UiState,
  type UiTheme,
} from "@/lib/ui-state"

const UiStateContext = React.createContext<UiState | undefined>(undefined)
const UiDispatchContext = React.createContext<
  React.Dispatch<UiAction> | undefined
>(undefined)
const UiThemeContext = React.createContext<UiTheme | undefined>(undefined)

export function UiStateProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [state, dispatch] = React.useReducer(uiReducer, initialUiState)

  return (
    <UiStateContext.Provider value={state}>
      <UiDispatchContext.Provider value={dispatch}>
        <UiThemeContext.Provider value={state.theme}>
          {children}
        </UiThemeContext.Provider>
      </UiDispatchContext.Provider>
    </UiStateContext.Provider>
  )
}

export function useUiState() {
  const state = React.useContext(UiStateContext)
  if (!state) throw new Error("useUiState must be used within UiStateProvider.")
  return state
}

export function useUiDispatch() {
  const dispatch = React.useContext(UiDispatchContext)
  if (!dispatch) {
    throw new Error("useUiDispatch must be used within UiStateProvider.")
  }
  return dispatch
}

export function useUiTheme() {
  const theme = React.useContext(UiThemeContext)
  if (!theme) throw new Error("useUiTheme must be used within UiStateProvider.")
  return theme
}
