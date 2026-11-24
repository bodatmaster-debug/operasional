import assert from "node:assert/strict"
import test from "node:test"
import { initialUiState, uiReducer } from "./ui-state.ts"

test("asset navigation keeps selected section and tab synchronized", () => {
  const nonJuknisState = uiReducer(initialUiState, {
    type: "section/select",
    section: "asset-non-juknis",
  })

  assert.equal(nonJuknisState.activeSection, "asset-non-juknis")
  assert.equal(nonJuknisState.assetTab, "non-juknis")

  const suratEdaranState = uiReducer(nonJuknisState, {
    type: "asset-tab/select",
    tab: "Surat Edaran",
  })

  assert.equal(suratEdaranState.activeSection, "asset-surat-edaran")
  assert.equal(suratEdaranState.assetTab, "Surat Edaran")
})

test("admin account sections are independently selectable", () => {
  const applicationState = uiReducer(initialUiState, {
    type: "section/select",
    section: "accounts-application",
  })

  test("warehouse menu is an independently selectable operations section", () => {
    const state = uiReducer(initialUiState, {
      type: "section/select",
      section: "warehouse",
    })

    assert.equal(state.activeSection, "warehouse")
  })
  assert.equal(applicationState.activeSection, "accounts-application")

  const personalState = uiReducer(applicationState, {
    type: "section/select",
    section: "accounts-personal",
  })
  assert.equal(personalState.activeSection, "accounts-personal")
})

test("maintenance submenu selection keeps its section and active tab synchronized", () => {
  const historyState = uiReducer(initialUiState, {
    type: "maintenance-tab/select",
    tab: "history",
  })

  assert.equal(historyState.activeSection, "maintenance")
  assert.equal(historyState.maintenanceTab, "history")

  const rabState = uiReducer(historyState, {
    type: "maintenance-tab/select",
    tab: "rab",
  })

  assert.equal(rabState.activeSection, "maintenance")
  assert.equal(rabState.maintenanceTab, "rab")
})

test("leaving the directory closes its dialog and session reset clears UI filters", () => {
  const darkState = uiReducer(initialUiState, { type: "theme/toggle" })
  const directoryState = uiReducer(darkState, {
    type: "dialog/open",
    dialog: {
      type: "directory-form",
      directoryKind: "sppg",
      target: null,
    },
  })
  const stateWithFilter = uiReducer(directoryState, {
    type: "asset-search/set",
    value: "food tray",
  })

  const leavingDirectory = uiReducer(stateWithFilter, {
    type: "section/select",
    section: "overview",
  })
  assert.equal(leavingDirectory.dialog, null)

  const resetState = uiReducer(leavingDirectory, { type: "session/reset" })
  assert.equal(resetState.filters.assetSearch, "")
  assert.equal(resetState.activeSection, "overview")
  assert.equal(resetState.theme, "dark")
})
