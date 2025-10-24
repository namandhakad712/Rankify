/**
 * Buffer Utilities
 * Helpers for safely handling ArrayBuffers and preventing detachment errors
 */

/**
 * Check if an ArrayBuffer is detached
 */
export function isBufferDetached(buffer: ArrayBuffer): boolean {
  return buffer.byteLength === 0
}

/**
 * Safely clone an ArrayBuffer
 * Use this before transferring to workers to avoid detachment
 */
export function cloneBuffer(buffer: ArrayBuffer): ArrayBuffer {
  if (isBufferDetached(buffer)) {
    throw new Error('Cannot clone a detached ArrayBuffer')
  }
  
  return buffer.slice(0)
}

/**
 * Safely clone a Uint8Array
 */
export function cloneUint8Array(array: Uint8Array): Uint8Array {
  if (isBufferDetached(array.buffer)) {
    throw new Error('Cannot clone from a detached ArrayBuffer')
  }
  
  return new Uint8Array(array)
}

/**
 * Safe wrapper for operations that might use detached buffers
 */
export async function withSafeBuffer<T>(
  buffer: ArrayBuffer,
  operation: (safeBuffer: ArrayBuffer) => Promise<T>
): Promise<T> {
  if (isBufferDetached(buffer)) {
    throw new Error('Cannot perform operation on detached ArrayBuffer')
  }
  
  // Clone the buffer to ensure it stays valid
  const safeBuffer = cloneBuffer(buffer)
  
  try {
    return await operation(safeBuffer)
  } catch (error) {
    if (error instanceof Error && error.message.includes('detached')) {
      throw new Error('ArrayBuffer was detached during operation. This usually happens when the buffer is transferred to a worker.')
    }
    throw error
  }
}

/**
 * Convert File to ArrayBuffer safely
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  try {
    const buffer = await file.arrayBuffer()
    
    if (isBufferDetached(buffer)) {
      throw new Error('File buffer is detached')
    }
    
    return buffer
  } catch (error) {
    throw new Error(`Failed to read file as ArrayBuffer: ${error}`)
  }
}
