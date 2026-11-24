export type RABNoteRun = {
  text: string
  bold: boolean
  underline: boolean
  italic: boolean
}

export type RABNoteLine = {
  indent: number
  marker: string
  runs: RABNoteRun[]
}

type NoteMarks = Pick<RABNoteRun, "bold" | "underline" | "italic">

const EMPTY_MARKS: NoteMarks = {
  bold: false,
  underline: false,
  italic: false,
}

function findClosingMarker(value: string, marker: string, start: number) {
  for (let index = start; index <= value.length - marker.length; index += 1) {
    if (value[index] === "\\") {
      index += 1
      continue
    }
    if (!value.startsWith(marker, index)) continue
    if (marker === "*" && value[index + 1] === "*") {
      continue
    }
    if (marker === "**" && value[index + 2] === "*") {
      continue
    }
    return index
  }
  return -1
}

function appendRun(runs: RABNoteRun[], text: string, marks: NoteMarks) {
  if (!text) return
  const previous = runs.at(-1)
  if (
    previous &&
    previous.bold === marks.bold &&
    previous.underline === marks.underline &&
    previous.italic === marks.italic
  ) {
    previous.text += text
    return
  }
  runs.push({ text, ...marks })
}

function parseInline(value: string, marks: NoteMarks = EMPTY_MARKS) {
  const runs: RABNoteRun[] = []
  let text = ""
  let index = 0
  const markers = ["**", "++", "*"] as const

  while (index < value.length) {
    if (value[index] === "\\" && index + 1 < value.length) {
      text += value[index + 1]
      index += 2
      continue
    }

    const marker = markers.find((candidate) => value.startsWith(candidate, index))
    if (!marker) {
      text += value[index]
      index += 1
      continue
    }

    const closing = findClosingMarker(value, marker, index + marker.length)
    if (closing < 0 || closing === index + marker.length) {
      text += marker
      index += marker.length
      continue
    }

    appendRun(runs, text, marks)
    text = ""
    const innerMarks = {
      ...marks,
      ...(marker === "**" ? { bold: !marks.bold } : {}),
      ...(marker === "++" ? { underline: !marks.underline } : {}),
      ...(marker === "*" ? { italic: !marks.italic } : {}),
    }
    for (const run of parseInline(
      value.slice(index + marker.length, closing),
      innerMarks,
    )) {
      appendRun(runs, run.text, run)
    }
    index = closing + marker.length
  }

  appendRun(runs, text, marks)
  return runs
}

function parseListMarker(line: string) {
  const match = line.match(/^(\s*)(?:(\d+|[a-z]+)([.)])|([-•◦▪]))\s+/i)
  if (!match) return { indent: 0, marker: "", text: line }
  const orderedMarker = match[2] ? `${match[2]}${match[3]}` : ""
  return {
    indent: Math.floor(match[1].length / 2),
    marker: orderedMarker || match[4],
    text: line.slice(match[0].length),
  }
}

export function parseRABNotes(value: string): RABNoteLine[] {
  if (!value) return []
  return value.split(/\r?\n/).map((line) => {
    const { indent, marker, text } = parseListMarker(line)
    return { indent, marker, runs: parseInline(text) }
  })
}

export function rabNotesPlainText(value: string) {
  return parseRABNotes(value)
    .map(({ indent, marker, runs }) => {
      const prefix = marker ? `${"  ".repeat(indent)}${marker} ` : ""
      return `${prefix}${runs.map((run) => run.text).join("")}`
    })
    .join("\n")
}
