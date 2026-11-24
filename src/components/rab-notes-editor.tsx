"use client"

import * as React from "react"
import {
  Menu,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  SplitButton,
  ToggleButton,
  Tooltip,
  makeStyles,
  tokens,
} from "@fluentui/react-components"
import type { MenuButtonProps } from "@fluentui/react-components"
import { parseRABNotes } from "@/lib/rab-notes"
import {
  TextBoldRegular,
  TextBulletListLtrRegular,
  TextItalicRegular,
  TextNumberListLtrRegular,
  TextUnderlineRegular,
} from "@fluentui/react-icons"

type ListStyle = "decimal" | "lower-alpha" | "lower-roman"
type BulletStyle = "disc" | "circle" | "square"
type EditorCommand = "bold" | "underline" | "italic"
type ActiveFormats = Record<EditorCommand, boolean>

const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  underline: false,
  italic: false,
}

const useStyles = makeStyles({
  shell: {
    overflow: "hidden",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    minHeight: "40px",
    padding: "4px 8px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  formatTools: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
  },
  listTools: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginLeft: "auto",
  },
  splitButton: {
    minWidth: "64px",
    width: "64px",
    flexShrink: 0,
    paddingInline: 0,
    "& .fui-SplitButton__menuButton .fui-MenuButton__menuIcon": {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
    },
    "& .fui-SplitButton__menuButton .fui-MenuButton__menuIcon > svg": {
      display: "block",
    },
  },
  editor: {
    minHeight: "88px",
    maxHeight: "240px",
    overflowY: "auto",
    padding: "9px 10px",
    outline: "none",
    color: tokens.colorNeutralForeground1,
    fontFamily: tokens.fontFamilyBase,
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    "&:empty::before": {
      content: "attr(data-placeholder)",
      color: tokens.colorNeutralForeground3,
      pointerEvents: "none",
    },
    "&:focus-visible": {
      boxShadow: `inset 0 0 0 2px ${tokens.colorBrandStroke1}`,
    },
    "& ol, & ul": {
      marginBlock: "4px",
      paddingInlineStart: "24px",
    },
  },
})

function isWithinEditor(editor: HTMLElement, node: Node | null) {
  return Boolean(node && (node === editor || editor.contains(node)))
}

function escapeMarkdownText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/([*+])/g, "\\$1")
}

function serializeInline(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdownText(node.textContent ?? "")
  }
  if (!(node instanceof HTMLElement)) return ""
  if (node.tagName === "BR") return "\n"

  let content = [...node.childNodes]
    .map(serializeInline)
    .join("")
  if (node.tagName === "B" || node.tagName === "STRONG") {
    return `**${content}**`
  }
  if (node.tagName === "U") return `++${content}++`
  if (node.tagName === "I" || node.tagName === "EM") {
    return `*${content}*`
  }
  if (node.tagName === "SPAN") {
    if (node.style.fontStyle === "italic") content = `*${content}*`
    if (node.style.textDecorationLine.includes("underline")) {
      content = `++${content}++`
    }
    if (
      node.style.fontWeight === "bold" ||
      Number(node.style.fontWeight) >= 600
    ) {
      content = `**${content}**`
    }
  }
  return content
}

function orderedMarker(style: string, index: number) {
  if (style === "lower-alpha" || style === "upper-alpha") {
    const letter = String.fromCharCode(97 + (index % 26))
    return style === "upper-alpha" ? `${letter.toUpperCase()}.` : `${letter}.`
  }
  if (style === "lower-roman" || style === "upper-roman") {
    const romanValues: Array<[number, string]> = [
      [10, "x"],
      [9, "ix"],
      [5, "v"],
      [4, "iv"],
      [1, "i"],
    ]
    let number = index + 1
    let marker = ""
    for (const [value, symbol] of romanValues) {
      while (number >= value) {
        marker += symbol
        number -= value
      }
    }
    return style === "upper-roman" ? `${marker.toUpperCase()}.` : `${marker}.`
  }
  return `${index + 1}.`
}

function serializeList(list: HTMLElement, depth: number): string {
  const isOrdered = list.tagName === "OL"
  const listStyle =
    list.style.listStyleType ||
    (isOrdered ? list.getAttribute("type") : "") ||
    (isOrdered ? "decimal" : "disc")
  const items = [...list.children].filter(
    (child): child is HTMLElement => child.tagName === "LI",
  )

  return items
    .map((item, index) => {
      const marker = isOrdered
        ? orderedMarker(listStyle, index)
        : listStyle === "circle"
          ? "◦"
          : listStyle === "square"
            ? "▪"
            : "•"
      const inlineContent = [...item.childNodes]
        .filter(
          (child) =>
            !(child instanceof HTMLElement) ||
            (child.tagName !== "UL" && child.tagName !== "OL"),
        )
        .map(serializeInline)
        .join("")
      const nestedLists = [...item.children]
        .filter(
          (child): child is HTMLElement =>
            child.tagName === "UL" || child.tagName === "OL",
        )
        .map((child) => serializeList(child, depth + 1))
      if (!inlineContent.trim() && nestedLists.length === 0) return ""
      return [
        `${"  ".repeat(depth)}${marker} ${inlineContent.trim()}`,
        ...nestedLists,
      ].join("\n")
    })
    .filter(Boolean)
    .join("\n")
}

function serializeEditor(editor: HTMLElement) {
  const parts: string[] = []
  for (const node of editor.childNodes) {
    if (
      node instanceof HTMLElement &&
      (node.tagName === "UL" || node.tagName === "OL")
    ) {
      parts.push(serializeList(node, 0))
    } else if (
      node instanceof HTMLElement &&
      (node.tagName === "DIV" || node.tagName === "P")
    ) {
      parts.push(
        [...node.childNodes]
          .map((child) =>
            child instanceof HTMLElement &&
            (child.tagName === "UL" || child.tagName === "OL")
              ? serializeList(child, 0)
              : serializeInline(child),
          )
          .join("")
          .replace(/\n+$/g, ""),
      )
    } else {
      parts.push(serializeInline(node))
    }
  }
  return parts.join("\n").replace(/\n{3,}/g, "\n\n")
}

export function RABNotesEditor({
  onChange,
  disabled,
  initialValue = "",
}: {
  onChange: (value: string) => void
  disabled?: boolean
  initialValue?: string
}) {
  const styles = useStyles()
  const editorRef = React.useRef<HTMLDivElement>(null)
  const savedRangeRef = React.useRef<Range | null>(null)
  const [activeFormats, setActiveFormats] =
    React.useState<ActiveFormats>(EMPTY_FORMATS)

  React.useEffect(() => {
    const editor = editorRef.current
    if (!editor || !initialValue) return

    for (const line of parseRABNotes(initialValue)) {
      const block = document.createElement("div")
      const prefix = `${"  ".repeat(line.indent)}${line.marker ? `${line.marker} ` : ""}`
      if (prefix) block.append(document.createTextNode(prefix))
      for (const run of line.runs) {
        const span = document.createElement("span")
        if (run.bold) span.style.fontWeight = "bold"
        if (run.italic) span.style.fontStyle = "italic"
        if (run.underline) span.style.textDecorationLine = "underline"
        span.textContent = run.text
        block.append(span)
      }
      editor.append(block)
    }
  }, [initialValue])

  const updateSelectionState = React.useCallback(() => {
    const editor = editorRef.current
    const selection = document.getSelection()
    if (!editor || !selection?.rangeCount) return
    const range = selection.getRangeAt(0)
    if (!isWithinEditor(editor, range.commonAncestorContainer)) return

    savedRangeRef.current = range.cloneRange()
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      underline: document.queryCommandState("underline"),
      italic: document.queryCommandState("italic"),
    })
  }, [])

  React.useEffect(() => {
    document.addEventListener("selectionchange", updateSelectionState)
    return () =>
      document.removeEventListener("selectionchange", updateSelectionState)
  }, [updateSelectionState])

  function restoreSelection(editor: HTMLElement) {
    const selection = document.getSelection()
    const range = savedRangeRef.current
    if (!selection || !range || !isWithinEditor(editor, range.commonAncestorContainer)) {
      editor.focus()
      return
    }
    selection.removeAllRanges()
    selection.addRange(range)
    editor.focus()
  }

  function applyFormat(command: EditorCommand) {
    const editor = editorRef.current
    if (!editor || disabled) return
    restoreSelection(editor)
    document.execCommand(command, false)
    updateSelectionState()
    editor.focus()
  }

  function applyList(kind: "ordered" | "unordered", style: ListStyle | BulletStyle) {
    const editor = editorRef.current
    if (!editor || disabled) return
    restoreSelection(editor)
    document.execCommand(
      kind === "ordered" ? "insertOrderedList" : "insertUnorderedList",
      false,
    )

    const selection = document.getSelection()
    let node = selection?.anchorNode ?? null
    while (node && node !== editor) {
      if (node instanceof HTMLElement && node.tagName === (kind === "ordered" ? "OL" : "UL")) {
        if (kind === "ordered") {
          node.setAttribute("type", style)
          node.style.listStyleType = style
        } else {
          node.style.listStyleType = style
        }
        break
      }
      node = node.parentNode
    }
    updateSelectionState()
    editor.focus()
    onChange(serializeEditor(editor))
  }

  function handleInput() {
    const editor = editorRef.current
    if (!editor) return
    onChange(serializeEditor(editor))
    updateSelectionState()
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault()
    if (disabled) return
    const text = event.clipboardData.getData("text/plain")
    document.execCommand("insertText", false, text)
    handleInput()
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (disabled) return
    const text = event.dataTransfer.getData("text/plain")
    document.execCommand("insertText", false, text)
    handleInput()
  }

  function formatButton(
    command: EditorCommand,
    label: string,
    icon: React.ReactElement,
  ) {
    return (
      <Tooltip content={label} relationship="label" key={command}>
        <ToggleButton
          size="small"
          appearance="subtle"
          checked={activeFormats[command]}
          aria-label={label}
          aria-pressed={activeFormats[command]}
          disabled={disabled}
          icon={icon}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => applyFormat(command)}
        />
      </Tooltip>
    )
  }

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar} role="toolbar" aria-label="Pemformatan catatan">
        <div className={styles.formatTools}>
          {formatButton("bold", "Tebal", <TextBoldRegular />)}
          {formatButton("underline", "Garis bawah", <TextUnderlineRegular />)}
          {formatButton("italic", "Miring", <TextItalicRegular />)}
        </div>
        <div className={styles.listTools}>
          <Menu positioning="below-end">
            <MenuTrigger disableButtonEnhancement>
              {(triggerProps: MenuButtonProps) => (
                <Tooltip content="Daftar bernomor" relationship="label">
                  <SplitButton
                    className={styles.splitButton}
                    size="small"
                    appearance="subtle"
                    icon={<TextNumberListLtrRegular />}
                    aria-label="Daftar bernomor"
                    menuButton={triggerProps}
                    primaryActionButton={{
                      "aria-label": "Terapkan daftar angka",
                      disabled,
                      onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) =>
                        event.preventDefault(),
                      onClick: () => applyList("ordered", "decimal"),
                    }}
                  />
                </Tooltip>
              )}
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem disabled={disabled} onClick={() => applyList("ordered", "decimal")}>
                  Angka: 1, 2, 3
                </MenuItem>
                <MenuItem disabled={disabled} onClick={() => applyList("ordered", "lower-alpha")}>
                  Huruf: a, b, c
                </MenuItem>
                <MenuItem disabled={disabled} onClick={() => applyList("ordered", "lower-roman")}>
                  Romawi: i, ii, iii
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
          <Menu positioning="below-end">
            <MenuTrigger disableButtonEnhancement>
              {(triggerProps: MenuButtonProps) => (
                <Tooltip content="Daftar simbol" relationship="label">
                  <SplitButton
                    className={styles.splitButton}
                    size="small"
                    appearance="subtle"
                    icon={<TextBulletListLtrRegular />}
                    aria-label="Daftar simbol"
                    menuButton={triggerProps}
                    primaryActionButton={{
                      "aria-label": "Terapkan daftar bullet",
                      disabled,
                      onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) =>
                        event.preventDefault(),
                      onClick: () => applyList("unordered", "disc"),
                    }}
                  />
                </Tooltip>
              )}
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem disabled={disabled} onClick={() => applyList("unordered", "disc")}>
                  Simbol bulat
                </MenuItem>
                <MenuItem disabled={disabled} onClick={() => applyList("unordered", "circle")}>
                  Simbol lingkaran
                </MenuItem>
                <MenuItem disabled={disabled} onClick={() => applyList("unordered", "square")}>
                  Simbol kotak
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        </div>
      </div>
      <div
        ref={editorRef}
        className={styles.editor}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label="Keterangan atau catatan RAB"
        aria-multiline="true"
        data-placeholder="Tambahkan keterangan untuk pengajuan (opsional)"
        onInput={handleInput}
        onFocus={updateSelectionState}
        onKeyUp={updateSelectionState}
        onMouseUp={updateSelectionState}
        onPaste={handlePaste}
        onDrop={handleDrop}
      />
    </div>
  )
}
