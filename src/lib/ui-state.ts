import type { AssetCategory } from "./asset-categories.ts"
import type {
  DirectoryEditTarget,
  DirectoryKind,
} from "./directory-types.ts"

export type AppSection =
  | "overview"
  | "directory"
  | "asset-recording"
  | "asset-non-juknis"
  | "asset-surat-edaran"
  | "asset-completeness"
  | "asset-import"
  | "maintenance"
  | "warehouse"
  | "warehouse-spare-parts"
  | "warehouse-allocations"
  | "accounts-application"
  | "accounts-personal"

export type AssetTab =
  | "all"
  | "non-juknis"
  | "Surat Edaran"
  | AssetCategory
  | "Kendaraan"
  | "Instalasi listrik"

export type MaintenanceTab = "schedule" | "history" | "rab"

export type UiTheme = "light" | "dark"

export type UiDialog =
  | {
      type: "directory-form"
      directoryKind: DirectoryKind
      target: DirectoryEditTarget | null
    }
  | { type: "directory-detail"; target: DirectoryEditTarget }
  | { type: "directory-delete"; target: DirectoryEditTarget }

export type UiState = {
  activeSection: AppSection
  assetTab: AssetTab
  directoryKind: DirectoryKind
  maintenanceTab: MaintenanceTab
  navigationOpen: boolean
  theme: UiTheme
  filters: {
    assetSearch: string
  }
  dialog: UiDialog | null
}

export type UiAction =
  | { type: "section/select"; section: AppSection }
  | { type: "asset-tab/select"; tab: AssetTab }
  | { type: "directory-kind/select"; kind: DirectoryKind }
  | { type: "maintenance-tab/select"; tab: MaintenanceTab }
  | { type: "navigation/set-open"; open: boolean }
  | { type: "theme/toggle" }
  | { type: "asset-search/set"; value: string }
  | { type: "dialog/open"; dialog: UiDialog }
  | { type: "dialog/close" }
  | { type: "session/reset" }

export const initialUiState: UiState = {
  activeSection: "overview",
  assetTab: "all",
  directoryKind: "sppg",
  maintenanceTab: "schedule",
  navigationOpen: true,
  theme: "light",
  filters: {
    assetSearch: "",
  },
  dialog: null,
}

function assetTabForSection(section: AppSection): AssetTab | null {
  if (section === "asset-recording") return "all"
  if (section === "asset-non-juknis") return "non-juknis"
  if (section === "asset-surat-edaran") return "Surat Edaran"
  return null
}

function sectionForAssetTab(tab: AssetTab): AppSection {
  if (tab === "non-juknis") return "asset-non-juknis"
  if (tab === "Surat Edaran") return "asset-surat-edaran"
  return "asset-recording"
}

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case "section/select": {
      const selectedAssetTab = assetTabForSection(action.section)
      return {
        ...state,
        activeSection: action.section,
        assetTab: selectedAssetTab ?? state.assetTab,
        dialog: action.section === "directory" ? state.dialog : null,
      }
    }
    case "asset-tab/select":
      return {
        ...state,
        activeSection: sectionForAssetTab(action.tab),
        assetTab: action.tab,
      }
    case "directory-kind/select":
      return { ...state, directoryKind: action.kind }
    case "maintenance-tab/select":
      return {
        ...state,
        activeSection: "maintenance",
        maintenanceTab: action.tab,
      }
    case "navigation/set-open":
      return { ...state, navigationOpen: action.open }
    case "theme/toggle":
      return { ...state, theme: state.theme === "light" ? "dark" : "light" }
    case "asset-search/set":
      return {
        ...state,
        filters: { ...state.filters, assetSearch: action.value },
      }
    case "dialog/open":
      return { ...state, dialog: action.dialog }
    case "dialog/close":
      return { ...state, dialog: null }
    case "session/reset":
      return {
        ...initialUiState,
        theme: state.theme,
      }
  }
}
