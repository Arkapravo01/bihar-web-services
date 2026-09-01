import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useActivity } from '@/app/providers/ActivityProvider'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import { usePolicies } from '../hooks/usePolicies'
import { useAccessKeys } from '../hooks/useAccessKeys'
import { useEnv } from '../hooks/useEnv'
import { IAMAiQueryBar } from '../components/IAMAiQueryBar'
import { IAMTable } from '../components/IAMTable'
import { CreateUserDialog } from '../components/CreateUserDialog'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { ShieldAlert, Users, Lock, BookOpen, Key, CheckCircle2, ArrowRight, AlertCircle } from 'lucide-react'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

const quickActions = [
  { id: 'users', label: 'Users', icon: Users, color: 'from-violet-500/20 to-violet-600/10', iconColor: 'text-violet-600' },
  { id: 'roles', label: 'Roles', icon: Lock, color: 'from-cyan-500/20 to-cyan-600/10', iconColor: 'text-cyan-600' },
  { id: 'policies', label: 'Policies', icon: BookOpen, color: 'from-pink-500/20 to-pink-600/10', iconColor: 'text-pink-600' },
  { id: 'credentials', label: 'Access Keys', icon: Key, color: 'from-emerald-500/20 to-emerald-600/10', iconColor: 'text-emerald-600' },
]

export function IAMOverviewPage() {
  const navigate = useNavigate()
  const { activeEnvKey } = useActiveEnv()
  const { data: env } = useEnv()
  const { data: usersData = [], isLoading: usersLoading, error: usersError } = useUsers()
  const { data: rolesData = [], isLoading: rolesLoading } = useRoles()
  const { data: policiesData = [], isLoading: policiesLoading } = usePolicies()
  const { data: accessKeysData = [], isLoading: accessKeysLoading } = useAccessKeys()
  const { events: activity } = useActivity()

  const [userSearch, setUserSearch] = useState('')
  const [roleSearch, setRoleSearch] = useState('')
  const [activeSection, setActiveSection] = useState('users')
  const [createUserOpen, setCreateUserOpen] = useState(false)

  const users = useMemo(() => usersData.users ?? [], [usersData])
  const roles = useMemo(() => rolesData.roles ?? [], [rolesData])
  const policies = useMemo(() => policiesData.policies ?? [], [policiesData])
  const accessKeys = useMemo(() => accessKeysData.accessKeys ?? [], [accessKeysData])
  const activeKeys = useMemo(() => accessKeys.filter((k) => k.status === 'Active'), [accessKeys])

  const filteredUsers = users.filter((u) => u.name.toLowerCase().includes(userSearch.toLowerCase()))
  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()))

  if (usersError) {
    const isNetworkError = !usersError.status
    return (
      <PageContainer>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="size-5" /> IAM Access Control
          </h1>
          <p className="text-sm text-muted-foreground">Users, roles, policies</p>
        </div>
        <div className="rounded-xl border border-dashed border-destructive/30 bg-destructive/5 flex flex-col items-center justify-center gap-3 py-20 text-center">
          <AlertCircle className="size-8 text-destructive/60" />
          <p className="text-sm font-semibold text-destructive">
            {isNetworkError ? 'Backend not reachable' : `Not configured for ${activeEnvKey.toUpperCase()}`}
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            {isNetworkError
              ? 'The backend server is not running. Start it with npm run dev.'
              : <>The AWS profile{' '}<code className="font-mono bg-destructive/10 px-2 py-1 rounded">claude-iam-{activeEnvKey === 'prod' ? 'prd' : 'qa'}</code> is not set up or has no permissions.</>
            }
          </p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">IAM Access Control</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage users, roles, policies, and credentials</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={itemVariants}
          className="grid grid-cols-1 gap-3 sm:grid-cols-4"
        >
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <motion.button
                key={action.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveSection(action.id)}
                className={`group relative overflow-hidden rounded-lg border transition-all duration-300 p-4 text-left ${
                  activeSection === action.id
                    ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                    : 'bg-card/50 border-border/50 hover:bg-card/80 hover:border-primary/30'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`w-5 h-5 ${action.iconColor}`} />
                  </div>
                  {activeSection === action.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-semibold">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {action.id === 'users' ? `${users.length} accounts` :
                     action.id === 'roles' ? `${roles.length} roles` :
                     action.id === 'policies' ? `${policies.length} policies` :
                     `${activeKeys.length} active keys`}
                  </p>
                </div>
              </motion.button>
            )
          })}
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <IAMAiQueryBar />
        </motion.div>

        {/* Content Sections */}
        {activeSection === 'users' && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Users</h2>
                <p className="text-xs text-muted-foreground mt-1">{filteredUsers.length} of {users.length} users</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search users…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-64 rounded-lg border-border/50 bg-background/50"
                />
                <Button variant="secondary" size="sm" className="rounded-lg" onClick={() => setCreateUserOpen(true)}>Create User</Button>
              </div>
            </div>
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'name',
                    header: 'Name',
                    cell: (row) => (
                      <button
                        onClick={() => navigate(`/iam/users/${encodeURIComponent(row.name)}`)}
                        className="font-mono text-sm font-medium text-primary hover:underline underline-offset-2 transition-colors text-left cursor-pointer"
                      >
                        {row.name}
                      </button>
                    ),
                  },
                  {
                    id: 'arn',
                    header: 'ARN',
                    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.arn}</span>,
                  },
                  {
                    id: 'created',
                    header: 'Created',
                    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createDate).toLocaleDateString()}</span>,
                  },
                ]}
                rows={filteredUsers}
                rowKey={(u) => u.name}
                loading={usersLoading}
                emptyMessage="No users found"
              />
            </div>
          </motion.div>
        )}

        {activeSection === 'roles' && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Roles</h2>
                <p className="text-xs text-muted-foreground mt-1">{filteredRoles.length} of {roles.length} roles</p>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Search roles…"
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="w-64 rounded-lg border-border/50 bg-background/50"
                />
                <Button variant="secondary" size="sm" className="rounded-lg">Create Role</Button>
              </div>
            </div>
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'name',
                    header: 'Name',
                    cell: (row) => <span className="font-mono text-sm font-medium">{row.name}</span>,
                  },
                  {
                    id: 'arn',
                    header: 'ARN',
                    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.arn}</span>,
                  },
                  {
                    id: 'created',
                    header: 'Created',
                    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createDate).toLocaleDateString()}</span>,
                  },
                  {
                    id: 'actions',
                    header: '',
                    cell: () => <Button variant="ghost" size="sm" className="text-xs"><ArrowRight className="w-3 h-3" /></Button>,
                  },
                ]}
                rows={filteredRoles}
                rowKey={(r) => r.name}
                loading={rolesLoading}
                emptyMessage="No roles found"
              />
            </div>
          </motion.div>
        )}

        {activeSection === 'policies' && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Policies</h2>
                <p className="text-xs text-muted-foreground mt-1">{policies.length} customer managed policies</p>
              </div>
              <Button variant="secondary" size="sm" className="rounded-lg">Create Policy</Button>
            </div>
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'name',
                    header: 'Name',
                    cell: (row) => <span className="font-mono text-sm font-medium">{row.name}</span>,
                  },
                  {
                    id: 'arn',
                    header: 'ARN',
                    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.arn}</span>,
                  },
                  {
                    id: 'attached',
                    header: 'Attached',
                    cell: (row) => <span className="text-sm font-medium">{row.attachmentCount ?? 0}</span>,
                  },
                  {
                    id: 'actions',
                    header: '',
                    cell: () => <Button variant="ghost" size="sm" className="text-xs"><ArrowRight className="w-3 h-3" /></Button>,
                  },
                ]}
                rows={policies}
                rowKey={(p) => p.arn}
                loading={policiesLoading}
                emptyMessage="No customer managed policies found"
              />
            </div>
          </motion.div>
        )}

        {activeSection === 'credentials' && (
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Access Keys</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeKeys.length} active · {accessKeys.length - activeKeys.length} inactive
                </p>
              </div>
            </div>
            <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
              <IAMTable
                columns={[
                  {
                    id: 'user',
                    header: 'User',
                    cell: (row) => <span className="font-mono text-sm font-medium">{row.userName}</span>,
                  },
                  {
                    id: 'keyId',
                    header: 'Access Key ID',
                    cell: (row) => <span className="font-mono text-xs text-muted-foreground">{row.accessKeyId}</span>,
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (row) => (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        row.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {row.status}
                      </span>
                    ),
                  },
                  {
                    id: 'created',
                    header: 'Created',
                    cell: (row) => <span className="text-sm text-muted-foreground">{new Date(row.createDate).toLocaleDateString()}</span>,
                  },
                ]}
                rows={accessKeys}
                rowKey={(k) => k.accessKeyId}
                loading={accessKeysLoading}
                emptyMessage="No access keys found"
              />
            </div>
          </motion.div>
        )}

        {/* Activity Section */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl border bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityTimeline events={activity} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <CreateUserDialog open={createUserOpen} onOpenChange={setCreateUserOpen} />
    </PageContainer>
  )
}
