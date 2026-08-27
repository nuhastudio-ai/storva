import path from 'node:path'

/**
 * Resolves a requested user path against the storage root.
 * Blocks path traversal, absolute paths, drive paths, and UNC-like input.
 */
export function resolveSafePath(storageRoot: string, userPath = ''): string {
  if (/^[a-zA-Z]:/.test(userPath) || userPath.startsWith('\\\\')) {
    throw new Error('Security Error: Absolute paths are not allowed')
  }

  const root = path.resolve(storageRoot)
  const resolved = path.resolve(root, userPath)
  const relative = path.relative(root, resolved)

  if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    return resolved
  }

  throw new Error('Security Error: Path traversal detected')
}
