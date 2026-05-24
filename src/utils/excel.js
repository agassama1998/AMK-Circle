import * as XLSX from 'xlsx'

/**
 * Flatten a row object — converts nested objects/arrays to strings,
 * cleans up undefined/null to empty string, and applies title-case to keys.
 */
function flattenRow(row) {
  const out = {}
  for (const [key, val] of Object.entries(row)) {
    const header = key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase())
    if (val === null || val === undefined) {
      out[header] = ''
    } else if (typeof val === 'object') {
      out[header] = JSON.stringify(val)
    } else {
      out[header] = val
    }
  }
  return out
}

/**
 * Export an array of objects (or array of arrays) to an Excel (.xlsx) file.
 * In Electron the file is saved to the user's Downloads folder via dialog.
 * Falls back to browser download if no Electron API is available.
 *
 * @param {Array}  data       Array of row objects (or nested arrays for multi-sheet)
 * @param {string} filename   Base filename without extension
 * @param {Object} [options]
 * @param {string} [options.sheetName]  Sheet tab name (default: 'Sheet1')
 * @param {Array}  [options.sheets]     Multi-sheet: [{name, data}]
 */
export async function exportToExcel(data, filename = 'Export', options = {}) {
  try {
    const wb = XLSX.utils.book_new()

    if (options.sheets && Array.isArray(options.sheets)) {
      // Multi-sheet export
      for (const sheet of options.sheets) {
        const rows  = (sheet.data || []).map(flattenRow)
        const ws    = XLSX.utils.json_to_sheet(rows)
        applyColumnWidths(ws, rows)
        XLSX.utils.book_append_sheet(wb, ws, sheet.name || 'Sheet')
      }
    } else {
      // Single sheet export
      const rows  = (data || []).map(flattenRow)
      const ws    = XLSX.utils.json_to_sheet(rows)
      applyColumnWidths(ws, rows)
      XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Data')
    }

    // Write to buffer
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const blob  = new Blob([wbout], { type: 'application/octet-stream' })
    const safeFilename = `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`

    // Electron path — use dialog to let the user choose where to save
    if (window.api?.dialog?.showSave) {
      const filePath = await window.api.dialog.showSave({
        defaultPath: safeFilename,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }],
      })
      if (filePath) {
        // Convert blob → base64 and send to main process to write
        const reader = new FileReader()
        reader.readAsDataURL(blob)
        reader.onloadend = () => {
          const base64 = reader.result.split(',')[1]
          window.api.shell?.openPath?.(filePath) // preview after save (optional)
          // Write via Electron shell handler
          if (window.api.fs?.writeBase64) {
            window.api.fs.writeBase64({ path: filePath, data: base64 })
          } else {
            // Fallback: trigger browser download
            triggerDownload(blob, safeFilename)
          }
        }
      }
      return safeFilename
    }

    // Fallback browser download
    triggerDownload(blob, safeFilename)
    return safeFilename
  } catch (err) {
    console.error('exportToExcel error:', err)
    throw err
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}

/** Auto-size columns based on content width (max 60 chars) */
function applyColumnWidths(ws, rows) {
  if (!rows || rows.length === 0) return
  const headers = Object.keys(rows[0])
  const colWidths = headers.map(h => {
    const maxData = rows.reduce((max, row) => {
      const len = String(row[h] ?? '').length
      return len > max ? len : max
    }, h.length)
    return { wch: Math.min(maxData + 2, 60) }
  })
  ws['!cols'] = colWidths
}

/**
 * Export a financial report with two sheets: Summary + Payments
 */
export async function exportFinancialReport(payments, summary, filename = 'Financial_Report') {
  return exportToExcel(null, filename, {
    sheets: [
      {
        name: 'Summary',
        data: summary.map(s => ({
          payment_type: s.type,
          count:        s.count,
          total_usd:    Number(s.total || 0).toFixed(2),
        })),
      },
      {
        name: 'Payments',
        data: payments.map(p => ({
          receipt_number: p.receipt_number,
          date:           p.date,
          payer:          p.person_name,
          payment_type:   p.payment_type,
          method:         p.payment_method,
          amount_usd:     Number(p.amount || 0).toFixed(2),
          status:         p.status,
          description:    p.description || '',
        })),
      },
    ],
  })
}

/**
 * Export student report
 */
export async function exportStudentReport(students, filename = 'Students_Report') {
  return exportToExcel(
    students.map(s => ({
      student_id:    s.student_id,
      full_name:     s.full_name,
      arabic_name:   s.arabic_name || '',
      class:         s.class_name || '',
      gender:        s.gender,
      date_of_birth: s.date_of_birth || '',
      parent_name:   s.parent_name || '',
      parent_phone:  s.parent_phone || '',
      enrolled_date: s.enrolled_date || '',
      status:        s.status,
    })),
    filename,
  )
}

/**
 * Export attendance report
 */
export async function exportAttendanceReport(records, filename = 'Attendance_Report') {
  return exportToExcel(
    records.map(r => ({
      student:  r.student_name,
      class:    r.class_name || '',
      date:     r.date,
      status:   r.status,
      note:     r.note || '',
    })),
    filename,
  )
}

/**
 * Export Hifz / Quran progress report
 */
export async function exportHifzReport(records, filename = 'Hifz_Report') {
  return exportToExcel(
    records.map(r => ({
      student:           r.student_name,
      student_id:        r.student_id,
      pages_completed:   r.pages_completed || 0,
      percent_complete:  r.percent_complete ? `${Number(r.percent_complete).toFixed(1)}%` : '0%',
      last_surah:        r.last_surah || '',
      last_juz:          r.last_juz || '',
      teacher:           r.teacher_name || '',
    })),
    filename,
  )
}
