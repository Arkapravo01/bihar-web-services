import * as s3Service from '../../services/s3.service.js'

export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'list_buckets',
      description: 'List all S3 buckets in the current environment. Always call this first when the user mentions a bucket by name — use the returned names to fuzzy-match what the user probably meant.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bucket_metrics',
      description: 'Get metrics for a specific S3 bucket (object count, total size, largest object, most recent)',
      parameters: {
        type: 'object',
        properties: { bucket: { type: 'string', description: 'Exact bucket name from list_buckets' } },
        required: ['bucket'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_bucket_objects',
      description: 'Browse the top-level contents (folders and files) of a bucket or a known folder path. NOT for searching — use search_objects_in_bucket or search_objects_across_buckets instead when looking for a file by name.',
      parameters: {
        type: 'object',
        properties: {
          bucket: { type: 'string', description: 'Exact bucket name from list_buckets' },
          prefix: { type: 'string', description: 'Exact folder path to browse (optional). Must end with / for a folder.' },
          limit: { type: 'number', description: 'Max results to return (default: 50)' },
        },
        required: ['bucket'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_objects_in_bucket',
      description: 'Deep keyword search within a single known bucket — scans ALL object keys at every folder depth. Use this when the user knows (or has narrowed down) which bucket to look in but wants to find a file by name/keyword.',
      parameters: {
        type: 'object',
        properties: {
          bucket:  { type: 'string', description: 'Exact bucket name from list_buckets.' },
          keyword: { type: 'string', description: 'Keyword to search for in object keys/filenames (case-insensitive substring match).' },
        },
        required: ['bucket', 'keyword'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bucket_permissions',
      description: 'Get ACL, bucket policy, and public access settings for a bucket',
      parameters: {
        type: 'object',
        properties: { bucket: { type: 'string', description: 'Exact bucket name from list_buckets' } },
        required: ['bucket'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_objects_across_buckets',
      description: 'Search for files/objects matching a keyword across all buckets (or a subset). Use when the user wants to find a file but does not know which bucket it is in.',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Keyword to search for in object keys/filenames (case-insensitive substring match).',
          },
          buckets: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional list of bucket names to restrict the search. Omit to search all buckets.',
          },
        },
        required: ['keyword'],
      },
    },
  },
]

export async function executeTool(name, args) {
  switch (name) {
    case 'list_buckets': {
      const buckets = await s3Service.listBuckets()
      // Return full names so the agent can fuzzy-match against what the user said
      return { buckets: buckets.map(b => b.name) }
    }
    case 'get_bucket_metrics': {
      if (!args.bucket) throw new Error('bucket is required')
      const metrics = await s3Service.getBucketMetrics(args.bucket)
      return metrics
    }
    case 'list_bucket_objects': {
      if (!args.bucket) throw new Error('bucket is required')
      const prefix = args.prefix || ''
      const limit = args.limit || 50
      const result = await s3Service.listObjects(args.bucket, prefix)
      const allItems = [...result.folders.slice(0, limit), ...result.files.slice(0, limit)]
      return { items: allItems.slice(0, limit), total: result.folders.length + result.files.length }
    }
    case 'get_bucket_permissions': {
      if (!args.bucket) throw new Error('bucket is required')
      const perms = await s3Service.getBucketPermissions(args.bucket)
      return perms
    }
    case 'search_objects_in_bucket': {
      if (!args.bucket)  throw new Error('bucket is required')
      if (!args.keyword) throw new Error('keyword is required')
      const result = await s3Service.searchObjectsInBucket({
        bucket:  args.bucket,
        keyword: args.keyword,
      })
      result.hits = result.hits.slice(0, 50)
      return result
    }
    case 'search_objects_across_buckets': {
      if (!args.keyword) throw new Error('keyword is required')
      const result = await s3Service.searchObjectsAcrossBuckets({
        keyword: args.keyword,
        buckets: args.buckets ?? null,
      })
      // Cap hits to 30 so we don't flood the model context
      result.hits = result.hits.slice(0, 30)
      return result
    }
    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}
