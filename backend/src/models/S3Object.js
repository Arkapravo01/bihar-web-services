export function toFolder(commonPrefix, prefix) {
  return {
    prefix: commonPrefix.Prefix,
    name: commonPrefix.Prefix.slice(prefix.length).replace(/\/$/, ''),
  }
}

export function toFile(content, prefix) {
  return {
    key: content.Key,
    name: content.Key.slice(prefix.length),
    size: content.Size,
    modified: content.LastModified,
  }
}
