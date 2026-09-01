export function toBucket(awsBucket) {
  return {
    name: awsBucket.Name,
    createdAt: awsBucket.CreationDate ?? null,
  }
}
