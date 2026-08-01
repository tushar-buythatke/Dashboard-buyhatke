import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buildApiUrl } from '@/config/api';

interface CreativeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string) => void;
  adId?: number;
  requiredDimensions?: { width: number; height: number };
}

export default function CreativeUploadModal({
  isOpen,
  onClose,
  onUpload,
  adId,
  requiredDimensions
}: CreativeUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');

  const validateImage = (file: File) => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => {
        if (requiredDimensions) {
          const isValidSize = img.width === requiredDimensions.width &&
                            img.height === requiredDimensions.height;
          if (!isValidSize) {
            setError(
              `Image dimensions must be exactly ${requiredDimensions.width}x${requiredDimensions.height}px. ` +
              `Your image is ${img.width}x${img.height}px.`
            );
            resolve(false);
          } else {
            setError('');
            resolve(true);
          }
        } else {
          setError('');
          resolve(true);
        }
      };
      img.onerror = () => {
        setError('Invalid image file');
        resolve(false);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const validateVideo = (file: File) => {
    return new Promise<boolean>((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (requiredDimensions) {
          const isValidSize = videoWidth === requiredDimensions.width &&
                            videoHeight === requiredDimensions.height;
          if (!isValidSize) {
            setError(
              `Video dimensions must be exactly ${requiredDimensions.width}x${requiredDimensions.height}px. ` +
              `Your video is ${videoWidth}x${videoHeight}px.`
            );
            resolve(false);
          } else {
            setError('');
            resolve(true);
          }
        } else {
          setError('');
          resolve(true);
        }
      };

      video.onerror = () => {
        setError('Invalid video file');
        resolve(false);
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      setError('Please select an image or video file');
      return;
    }

    setIsValidating(true);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);
    setFileType(isImage ? 'image' : 'video');

    const valid = isImage ? await validateImage(file) : await validateVideo(file);
    setIsValid(valid);
    setIsValidating(false);
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !isValid) return;

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('image', selectedFile);

      // HALO: true upload-percentage progress needs an XHR/axios onUploadProgress
      // handler instead of fetch — left the request logic untouched, the bar
      // below is an indeterminate iris sweep while isUploading is true.
      const response = await fetch(`${buildApiUrl('/ads/uploadCreative')}?userId=1`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.status === 1 && data.data?.creativeUrl) {
        onUpload(data.data.creativeUrl);
        resetModal();
      } else {
        setError(data.message || 'Failed to upload creative');
      }
    } catch (err) {
      console.error('Error uploading creative:', err);
      setError('An unexpected error occurred during upload');
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setPreviewUrl('');
    setError('');
    setIsValid(false);
    setIsValidating(false);
    setDragActive(false);
    setSelectedFile(null);
    setIsUploading(false);
    setFileType('image');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md halo-card rounded-[var(--h-r-xl)] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="halo-heading text-base">Upload creative</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 pb-5">
          {requiredDimensions && (
            <Alert className="halo-inset border-0 bg-[var(--h-tint)]">
              <AlertCircle className="w-4 h-4 text-[var(--h-iris-600)]" strokeWidth={1.75} />
              <AlertDescription className="text-[var(--h-ink-2)] text-xs">
                Media must be exactly {requiredDimensions.width} x {requiredDimensions.height} pixels
              </AlertDescription>
            </Alert>
          )}

          {!previewUrl ? (
            <div
              className={`relative rounded-[var(--h-r)] p-8 text-center transition-colors border-2 border-dashed ${
                dragActive
                  ? 'border-[var(--h-iris-500)] bg-[var(--h-tint)]'
                  : 'border-[var(--h-line-2)] hover:border-[var(--h-line-accent)]'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <span className="halo-chip-lg mx-auto mb-4">
                <Upload size={22} strokeWidth={1.75} />
              </span>
              <p className="halo-subtitle mb-4">
                Drag and drop your image or video here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="btn-halo-outline pointer-events-none">
                Browse files
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="halo-inset relative p-3 flex items-center justify-center">
                {fileType === 'image' ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-w-full max-h-72 rounded-[var(--h-r-sm)]"
                  />
                ) : (
                  <video
                    src={previewUrl}
                    controls
                    className="max-w-full max-h-72 rounded-[var(--h-r-sm)]"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {!isValidating && (
                  <button
                    type="button"
                    onClick={() => setPreviewUrl('')}
                    disabled={isUploading}
                    className="btn-halo-ghost btn-halo-icon btn-halo-sm absolute top-2 left-2 bg-[var(--h-surface)] shadow-[var(--h-sh-2)]"
                    aria-label="Remove file"
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                )}
                {isValidating && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[var(--h-r-sm)]" style={{ background: 'color-mix(in srgb, var(--h-ink) 45%, transparent)' }}>
                    <div className="text-[var(--h-ink-inv)] flex items-center gap-2 text-sm">
                      <span className="halo-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.35)' }} />
                      Validating…
                    </div>
                  </div>
                )}
                {!isValidating && isValid && (
                  <div className="absolute top-2 right-2 p-1 rounded-full shadow-[var(--h-sh-2)]" style={{ background: 'var(--h-mint)', color: '#fff' }}>
                    <Check className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                )}
              </div>

              {isUploading && (
                <div className="h-1.5 rounded-[var(--h-r-pill)] overflow-hidden bg-[var(--h-surface-3)]">
                  <div
                    className="h-full rounded-[var(--h-r-pill)]"
                    style={{
                      width: '55%',
                      background: 'var(--h-g-iris)',
                      animation: 'halo-shimmer 1.1s ease-in-out infinite alternate',
                    }}
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive" className="border-0 bg-[var(--h-neg-soft)]">
                  <AlertCircle className="w-4 h-4 text-[var(--h-coral)]" strokeWidth={1.75} />
                  <AlertDescription className="text-[var(--h-coral)] text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewUrl('')}
                  disabled={isUploading}
                  className="btn-halo-outline flex-1"
                >
                  Choose different file
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={!isValid || isValidating || isUploading}
                  className="btn-halo flex-1"
                >
                  {isUploading ? (
                    <>
                      <span className="halo-spinner" style={{ borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.35)' }} />
                      Uploading…
                    </>
                  ) : (
                    'Upload creative'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
