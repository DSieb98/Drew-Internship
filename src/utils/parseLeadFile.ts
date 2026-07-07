import * as XLSX from 'xlsx'

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
}

// Parses an XLSX, XLS, or CSV file entirely in the browser using SheetJS.
// No data is sent over the network at any point.
export function parseLeadFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (!data) {
          reject(new Error('Could not read the file. Please try again.'))
          return
        }

        const workbook = XLSX.read(data, { type: 'binary', raw: false })
        const sheetName = workbook.SheetNames[0]

        if (!sheetName) {
          reject(new Error('No worksheet found in this file.'))
          return
        }

        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          raw: false,
        })

        if (jsonData.length === 0) {
          reject(new Error(
            'The spreadsheet appears to be empty. Please check the file and try again.'
          ))
          return
        }

        const headers = Object.keys(jsonData[0])
        const rows: Record<string, string>[] = jsonData.map(row =>
          Object.fromEntries(
            Object.entries(row).map(([k, v]) => [k, String(v ?? '').trim()])
          )
        )

        resolve({ headers, rows })
      } catch {
        reject(new Error(
          'Could not read this file. Make sure it is a valid Excel (.xlsx, .xls) or CSV file.'
        ))
      }
    }

    reader.onerror = () => {
      reject(new Error('Could not open the file. Please try again.'))
    }

    reader.readAsBinaryString(file)
  })
}
