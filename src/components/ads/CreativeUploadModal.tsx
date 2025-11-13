import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, Check, Loader2, FileVideo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getApiBaseUrl } from '@/config/api';

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
      
      const response = await fetch(`${getApiBaseUrl()}/uploadCreative?userId=1`, {
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
      <DialogContent className="sm:max-w-md border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Upload Creative</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {requiredDimensions && (
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <AlertCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300">
                Media must be exactly {requiredDimensions.width} x {requiredDimensions.height} pixels
              </AlertDescription>
            </Alert>
          )}

          {!previewUrl ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                  : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Drag and drop your image or video here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                {fileType === 'image' ? (
                  <img 
                    src={previewUrl} 
                    alt="Preview" 
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
                  />
                ) : (
                  <video 
                    src={previewUrl} 
                    controls
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
                {isValidating && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                    <div className="text-white flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Validating...
                    </div>
                  </div>
                )}
                {!isValidating && isValid && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full shadow-lg">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive" className="border-red-200 dark:border-red-800">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewUrl('')}
                  className="border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  disabled={isUploading}
                >
                  Choose Different File
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!isValid || isValidating || isUploading}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 relative"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Uploading...
                    </>
                  ) : (
                    'Upload Creative'
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}