import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'

const SettingsContext = createContext(null)

const DEFAULTS = {
  currency: 'USD',
  currencySymbol: '$',
  dateFormat: 'MM/DD/YYYY',
  receiptPrefix: 'RCP',
  language: 'en',
  autoReceipt: true,
}

export function SettingsProvider({ children }) {
  const { orgId } = useAuth()
  const [settings, setSettings] = useState(DEFAULTS)

  const reload = useCallback(async () => {
    if (!orgId || !window.api) return
    try {
      const r = await window.api.settings.getOrgSettings({ orgId })
      if (r.success && r.data && Object.keys(r.data).length > 0) {
        setSettings({
          currency:       r.data.currency        || DEFAULTS.currency,
          currencySymbol: r.data.currency_symbol || DEFAULTS.currencySymbol,
          dateFormat:     r.data.date_format     || DEFAULTS.dateFormat,
          receiptPrefix:  r.data.receipt_prefix  || DEFAULTS.receiptPrefix,
          language:       r.data.language        || DEFAULTS.language,
          autoReceipt:    r.data.auto_receipt !== 0,
        })
      }
    } catch { /* silently use defaults */ }
  }, [orgId])

  useEffect(() => { reload() }, [reload])

  const fmtCurrency = (amount) => {
    const n = Number(amount) || 0
    return `${settings.currencySymbol}${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const fmtCurrencyInt = (amount) => {
    const n = Number(amount) || 0
    return `${settings.currencySymbol}${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
  }

  const fmtCurrencyCompact = (amount) => {
    const n = Number(amount) || 0
    const s = settings.currencySymbol
    if (n >= 1_000_000) return `${s}${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000)     return `${s}${(n / 1_000).toFixed(1)}k`
    return `${s}${n.toFixed(2)}`
  }

  return (
    <SettingsContext.Provider value={{
      ...settings,
      fmtCurrency,
      fmtCurrencyInt,
      fmtCurrencyCompact,
      reload,
    }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
