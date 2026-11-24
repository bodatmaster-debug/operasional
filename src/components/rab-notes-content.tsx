"use client"

import * as React from "react"
import { parseRABNotes } from "@/lib/rab-notes"

export function RABNotesContent({ value }: { value: string }) {
  const lines = parseRABNotes(value)
  return (
    <div style={{ display: "grid", gap: "2px", whiteSpace: "pre-wrap" }}>
      {lines.map((line, index) => (
        <div
          key={index}
          style={{
            display: "flex",
            minWidth: 0,
            marginLeft: `${line.indent * 16}px`,
          }}
        >
          {line.marker && (
            <span style={{ flex: "0 0 28px" }}>{line.marker}</span>
          )}
          <span>
            {line.runs.map((run, runIndex) => (
              <span
                key={runIndex}
                style={{
                  fontWeight: run.bold ? 600 : 400,
                  fontStyle: run.italic ? "italic" : "normal",
                  textDecoration: run.underline ? "underline" : "none",
                }}
              >
                {run.text}
              </span>
            ))}
          </span>
        </div>
      ))}
    </div>
  )
}
