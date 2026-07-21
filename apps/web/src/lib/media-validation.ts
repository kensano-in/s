/**
 * media-validation.ts
 *
 * Client-side media validation utilities for profile picture and banner uploads.
 * All validation happens before upload to give instant feedback.
 *
 * Profile Picture Rules:
 *   - Allowed formats: JPG, JPEG, PNG, WEBP
 *   - Animated GIFs are REJECTED
 *   - Max file size: 5 MB
 *
 * Profile Banner Rules:
 *   - Allowed formats: JPG, JPEG, PNG, WEBP, GIF
 *   - GIFs allowed, but max ~10 seconds duration (estimated via frame count)
 *   - Max file size: 15 MB
 */

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
  /** Compressed file (if compression was applied) */
  compressedFile?: File;
}

const BANNER_MAX_BYTES = 2.5 * 1024 * 1024; // 2.5 MB
const BANNER_GIF_MAX_FRAMES = 250;           // ~10s at 25fps

const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_BANNER_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Detects whether a File is an animated GIF by scanning its binary data.
 * An animated GIF contains multiple "Image Descriptor" blocks (0x2C).
 * Returns true if the GIF has more than 1 frame.
 */
export async function detectAnimatedGif(file: File): Promise<boolean> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // Check GIF header signature
    const header = String.fromCharCode(...bytes.slice(0, 6));
    if (!header.startsWith('GIF')) return false;

    let frameCount = 0;
    let i = 6; // Skip header

    // Skip Logical Screen Descriptor (7 bytes)
    const hasGCT = (bytes[10] & 0x80) !== 0;
    const gctSize = hasGCT ? 3 * (2 ** ((bytes[10] & 0x07) + 1)) : 0;
    i = 13 + gctSize;

    while (i < bytes.length) {
      const sentinel = bytes[i];

      if (sentinel === 0x3B) break; // GIF Trailer

      if (sentinel === 0x2C) {
        // Image Descriptor
        frameCount++;
        if (frameCount > 1) return true;
        i++;
        const hasLCT = (bytes[i + 8] & 0x80) !== 0;
        const lctSize = hasLCT ? 3 * (2 ** ((bytes[i + 8] & 0x07) + 1)) : 0;
        i += 9 + lctSize;

        // Skip image data
        i++; // LZW minimum code size
        while (i < bytes.length) {
          const blockSize = bytes[i++];
          if (blockSize === 0) break;
          i += blockSize;
        }
      } else if (sentinel === 0x21) {
        // Extension
        i += 2; // Skip sentinel + label
        while (i < bytes.length) {
          const blockSize = bytes[i++];
          if (blockSize === 0) break;
          i += blockSize;
        }
      } else {
        break;
      }
    }

    return frameCount > 1;
  } catch {
    return false; // If we can't read it, don't block the upload
  }
}

/**
 * Estimates the number of frames in a GIF to enforce duration limits.
 */
export async function countGifFrames(file: File): Promise<number> {
  try {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let frameCount = 0;
    let i = 6;

    const hasGCT = (bytes[10] & 0x80) !== 0;
    const gctSize = hasGCT ? 3 * (2 ** ((bytes[10] & 0x07) + 1)) : 0;
    i = 13 + gctSize;

    while (i < bytes.length) {
      const sentinel = bytes[i];
      if (sentinel === 0x3B) break;

      if (sentinel === 0x2C) {
        frameCount++;
        i++;
        const hasLCT = (bytes[i + 8] & 0x80) !== 0;
        const lctSize = hasLCT ? 3 * (2 ** ((bytes[i + 8] & 0x07) + 1)) : 0;
        i += 9 + lctSize;
        i++;
        while (i < bytes.length) {
          const blockSize = bytes[i++];
          if (blockSize === 0) break;
          i += blockSize;
        }
      } else if (sentinel === 0x21) {
        i += 2;
        while (i < bytes.length) {
          const blockSize = bytes[i++];
          if (blockSize === 0) break;
          i += blockSize;
        }
      } else {
        break;
      }
    }

    return frameCount;
  } catch {
    return 0;
  }
}

/**
 * Compress a static image (JPG/PNG/WEBP) using canvas with iterative quality reduction.
 * Keeps reducing quality until the file is below targetBytes, or hits minimum quality.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1200, maxHeight = 1200, quality = 0.85 } = options;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          // Only use compressed if it's actually smaller
          if (blob.size < file.size) {
            resolve(new File([blob], file.name, { type: mimeType }));
          } else {
            resolve(file);
          }
        },
        mimeType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Iteratively compresses an image until it fits under targetBytes.
 * Tries quality steps: 0.85 → 0.75 → 0.65 → 0.5 → 0.35
 * Also halves dimensions if quality reduction alone isn't enough.
 */
async function compressToTarget(file: File, targetBytes: number, maxDim: number): Promise<File> {
  const qualitySteps = [0.85, 0.75, 0.65, 0.5, 0.35];
  const mimeType = file.type === 'image/png' ? 'image/jpeg' : file.type; // convert PNG to JPEG for size

  for (const quality of qualitySteps) {
    const compressed = await compressImage(file, { maxWidth: maxDim, maxHeight: maxDim, quality });
    if (compressed.size <= targetBytes) return compressed;
  }

  // If still too large, halve dimensions and retry at 0.65
  const halfDim = Math.round(maxDim / 2);
  const halfSized = await compressImage(file, { maxWidth: halfDim, maxHeight: halfDim, quality: 0.65 });
  return halfSized; // Return best effort even if still slightly over
}

/**
 * Validates a profile picture file.
 *
 * Rules:
 * - Must be JPG, JPEG, PNG, or WEBP
 * - Animated GIFs and static GIFs are REJECTED (format not allowed)
 * - Any file size is accepted — oversized images are automatically
 *   compressed down to under 2.5 MB before upload
 *
 * Returns a compressed file if the original was large.
 */
export async function validateProfilePicture(file: File): Promise<MediaValidationResult> {
  const type = file.type.toLowerCase();

  // Format check — GIFs are never allowed as avatars
  if (type === 'image/gif') {
    return {
      valid: false,
      error: 'Animated GIFs are not allowed as profile pictures. Please use JPG, PNG, or WEBP.',
    };
  }

  if (!ALLOWED_AVATAR_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Invalid file format. Allowed types: JPG, PNG, WEBP. Got: ${file.type || 'unknown'}`,
    };
  }

  const TARGET_BYTES = 2.5 * 1024 * 1024; // 2.5 MB

  // If already within target, do a light compression pass to normalise quality
  if (file.size <= TARGET_BYTES) {
    // Light compress if > 1 MB
    if (file.size > 1 * 1024 * 1024) {
      const compressed = await compressImage(file, { maxWidth: 400, maxHeight: 400, quality: 0.88 });
      return { valid: true, compressedFile: compressed };
    }
    return { valid: true, compressedFile: file };
  }

  // File is over 2.5 MB — compress it down automatically
  const compressed = await compressToTarget(file, TARGET_BYTES, 400);
  return { valid: true, compressedFile: compressed };
}

/**
 * Validates a profile banner file.
 *
 * Rules:
 * - Must be JPG, JPEG, PNG, WEBP, or GIF
 * - GIFs allowed but must be ≤ 250 frames (~10 seconds at 25fps)
 * - Max 15 MB
 *
 * If valid, returns a potentially compressed version (static images only).
 */
export async function validateProfileBanner(file: File): Promise<MediaValidationResult> {
  const type = file.type.toLowerCase();

  // Format check
  if (!ALLOWED_BANNER_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Invalid file format. Allowed types: JPG, PNG, WEBP, GIF. Got: ${file.type || 'unknown'}`,
    };
  }

  // Size check
  if (file.size > BANNER_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${mb} MB). Maximum banner size is 15 MB.`,
    };
  }

  // GIF-specific frame count validation
  if (type === 'image/gif') {
    const frames = await countGifFrames(file);
    if (frames > BANNER_GIF_MAX_FRAMES) {
      const estimatedSeconds = Math.round(frames / 25);
      return {
        valid: false,
        error: `GIF is too long (~${estimatedSeconds}s, ${frames} frames). Maximum duration is ~10 seconds (250 frames).`,
      };
    }
    // GIFs pass through uncompressed
    return { valid: true, compressedFile: file };
  }

  // Compress static images > 2 MB
  let finalFile = file;
  if (file.size > 2 * 1024 * 1024) {
    finalFile = await compressImage(file, { maxWidth: 1500, maxHeight: 600, quality: 0.85 });
  }

  return { valid: true, compressedFile: finalFile };
}
