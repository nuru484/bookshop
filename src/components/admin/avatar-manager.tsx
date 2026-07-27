// src/components/admin/avatar-manager.tsx
'use client';

import { useId, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { notify } from '@/lib/notify';
import { initials } from '@/lib/format';
import { cn } from '@/lib/utils';

const MAX_BYTES = 5 * 1024 * 1024;

const prettySize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

interface AvatarViewProps {
  src?: string | null;
  name: string;
  size?: number;
  className?: string;
}

/**
 * Profile picture (or initials) that opens a large preview when clicked -
 * a portrait is worth seeing at more than 64px.
 */
export function AvatarView({ src, name, size = 64, className }: AvatarViewProps) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const box = { width: size, height: size };

  if (!src) {
    return (
      <div
        className={cn(
          'flex shrink-0 items-center justify-center bg-pine font-bold text-cream-bright',
          className,
        )}
        style={{ ...box, fontSize: Math.round(size / 3) }}
        aria-hidden="true"
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`View ${name}'s profile picture`}
        className={cn('shrink-0 cursor-zoom-in border-none bg-transparent p-0', className)}
        style={box}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
        <img src={src} alt={name} className="h-full w-full object-cover" />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={titleId} className="sm:max-w-[480px]">
        <h2 id={titleId} className="mb-3 font-serif text-xl font-normal text-ink">
          {name}
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- Cloudinary URL */}
        <img
          src={src}
          alt={name}
          className="mx-auto block max-h-[420px] w-full max-w-[420px] object-contain"
        />
      </Modal>
    </>
  );
}

interface AvatarManagerProps {
  src?: string | null;
  name: string;
  uploading?: boolean;
  removing?: boolean;
  /** Receives the chosen image as a base64 data URL, once confirmed. */
  onUpload: (dataUrl: string) => Promise<void> | void;
  onRemove: () => void;
  size?: number;
}

/**
 * Avatar with a deliberate two-step upload: choosing a file opens a preview
 * so the picture is only sent once the user has actually looked at it.
 */
export function AvatarManager({
  src,
  name,
  uploading = false,
  removing = false,
  onUpload,
  onRemove,
  size = 64,
}: AvatarManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [preview, setPreview] = useState<{ dataUrl: string; name: string; size: number } | null>(null);

  const pick = () => inputRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      notify('Choose an image file (JPEG, PNG or WebP).');
      return;
    }
    if (file.size > MAX_BYTES) {
      notify('Image must be under 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setPreview({ dataUrl: String(reader.result), name: file.name, size: file.size });
    reader.onerror = () => notify("Couldn't read that file - try another image.");
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!preview) return;
    await onUpload(preview.dataUrl);
    setPreview(null);
  };

  return (
    <>
      <AvatarView src={src} name={name} size={size} />
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={pick} disabled={uploading} className="btn-quiet px-3.5 py-2 text-xs">
          {src ? 'Change photo' : 'Upload photo'}
        </button>
        {src && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className="cursor-pointer border-none bg-transparent p-1 text-xs font-bold text-rust hover:underline disabled:opacity-50"
          >
            {removing ? 'Removing…' : 'Remove'}
          </button>
        )}
      </div>

      <Modal
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        labelledBy={titleId}
        className="sm:max-w-[420px]"
      >
        <h2 id={titleId} className="mb-1 font-serif text-2xl font-normal text-ink">
          Use this photo?
        </h2>
        <p className="mb-4 text-[13px] text-sage">
          It will be cropped to a square and shown across the console.
        </p>
        {preview && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview data URL */}
            <img
              src={preview.dataUrl}
              alt="Selected profile picture"
              className="mx-auto mb-3 block h-[180px] w-[180px] object-cover"
            />
            <p className="mb-5 truncate text-center text-[12px] text-sage">
              {preview.name} · {prettySize(preview.size)}
            </p>
          </>
        )}
        <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button type="button" onClick={() => setPreview(null)} className="btn-quiet px-5 py-2.5 text-[13px]">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              pick();
            }}
            className="btn-outline-pine px-5 py-2.5 text-[13px]"
          >
            Choose another
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={uploading}
            className="btn-primary px-5 py-2.5 text-[13px] shadow-none"
          >
            {uploading ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </Modal>
    </>
  );
}
