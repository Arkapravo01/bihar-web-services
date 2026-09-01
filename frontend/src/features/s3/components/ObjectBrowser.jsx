import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs'
import { BucketToolbar } from './BucketToolbar'
import { ObjectTable } from './ObjectTable'
import { OverwriteConflictDialog, UploadDropzone, UploadTrigger, useUploadFlow } from './UploadDialog'
import { DeleteDialog } from './DeleteDialog'
import { useDeleteObject, useObjects, useUploadObject } from '../hooks/useObjects'
import { downloadUrl as buildDownloadUrl } from '../api/s3Api'
import { useActivity } from '@/app/providers/ActivityProvider'
import { Upload } from 'lucide-react'

export function ObjectBrowser({ bucketName, env }) {
  const { logActivity } = useActivity()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefix = searchParams.get('prefix') ?? ''

  const { data, isLoading } = useObjects(bucketName, prefix)
  const uploadMutation = useUploadObject(bucketName, prefix)
  const deleteMutation = useDeleteObject(bucketName, prefix)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    setSearch('')
  }, [prefix])

  const filteredFolders = useMemo(() => {
    const list = data?.folders ?? []
    if (!search) return list
    return list.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
  }, [data?.folders, search])

  const filteredFiles = useMemo(() => {
    const list = data?.files ?? []
    if (!search) return list
    return list.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
  }, [data?.files, search])

  const { upload, conflict, cancelConflict, resolveConflict } = useUploadFlow(uploadMutation, (result) =>
    logActivity('Uploaded', `${bucketName}/${result.key}`)
  )

  function setPrefix(newPrefix) {
    if (newPrefix) setSearchParams({ prefix: newPrefix })
    else setSearchParams({})
  }

  function handleUpload(file) {
    upload(file)
  }

  async function confirmDelete(target) {
    try {
      const result = await deleteMutation.mutateAsync(target.key)
      toast.success(`Deleted ${result.key}`, {
        description: result.verified ? undefined : 'Delete sent but not verified removed — check manually.',
      })
      logActivity('Deleted', `${bucketName}/${target.key}`, 'destructive')
      setDeleteTarget(null)
    } catch (e) {
      toast.error('Delete failed', { description: e.message })
    }
  }

  const crumbs = [
    { label: bucketName, onSelect: () => setPrefix('') },
    ...prefix
      .split('/')
      .filter(Boolean)
      .map((part, i, parts) => ({
        label: part,
        onSelect: () => setPrefix(parts.slice(0, i + 1).join('/') + '/'),
      })),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Breadcrumbs items={crumbs} />
        <UploadTrigger onUpload={handleUpload}>
          {(openPicker) => (
            <Button onClick={openPicker}>
              <Upload className="size-4" />
              Upload
            </Button>
          )}
        </UploadTrigger>
      </div>

      <BucketToolbar value={search} onChange={setSearch} placeholder="Search this folder…" />

      <UploadDropzone onUpload={handleUpload}>
        <ObjectTable
          folders={filteredFolders}
          files={filteredFiles}
          loading={isLoading}
          onOpenFolder={setPrefix}
          downloadUrl={(key) => buildDownloadUrl(bucketName, key)}
          onDeleteRequest={setDeleteTarget}
          emptyMessage={search ? `No files or folders match "${search}".` : undefined}
        />
      </UploadDropzone>

      <OverwriteConflictDialog
        conflict={conflict}
        uploading={uploadMutation.isPending}
        onCancel={cancelConflict}
        onReplace={resolveConflict}
      />

      <DeleteDialog
        target={deleteTarget}
        env={env}
        deleting={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  )
}
