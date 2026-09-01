import { createContext, useContext, useState } from 'react'

const ActivityContext = createContext(null)

let nextId = 1

export function ActivityProvider({ children }) {
  const [events, setEvents] = useState([])

  function logActivity(action, detail, tone = 'positive') {
    setEvents((prev) => [{ id: nextId++, action, detail, tone, at: new Date() }, ...prev].slice(0, 20))
  }

  return <ActivityContext.Provider value={{ events, logActivity }}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity must be used within an ActivityProvider')
  return ctx
}
