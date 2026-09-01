import { useState } from 'react'
import { useCreateUser } from '../hooks/useCreateUser'

export function CreateUserForm({ onSuccess }) {
  const [userName, setUserName] = useState('')
  const { mutate, isPending, error } = useCreateUser()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!userName.trim()) return
    mutate(userName.trim(), {
      onSuccess: () => {
        setUserName('')
        onSuccess?.()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Enter username (3+ chars, alphanumeric, dots, dashes, underscores)"
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {error.message}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !userName.trim()}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isPending ? 'Creating...' : 'Create User'}
      </button>
    </form>
  )
}
