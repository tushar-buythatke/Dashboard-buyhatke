import { useCallback, useState } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onChange?: (files: File[]) => void;
  className?: string;
  accept?: DropzoneOptions['accept'];
  maxFiles?: number;
}

export function FileUpload({
  onChange,
  className,
  accept,
  maxFiles = 10,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      setFiles(accepted);
      onChange?.(accepted);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
  });

  const removeFile = (index: number) => {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onChange?.(next);
  };

  return (
    <div className={cn('flex w-full flex-col gap-4 p-6', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed',
          'border-neutral-300 bg-neutral-50 transition-colors dark:border-neutral-700 dark:bg-neutral-950',
          isDragActive && 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mb-2 h-8 w-8 text-neutral-400" />
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isDragActive ? 'Drop files here' : 'Drag & drop or click to upload'}
        </p>
      </div>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-800"
            >
              <span className="truncate text-neutral-700 dark:text-neutral-300">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="ml-2 rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
