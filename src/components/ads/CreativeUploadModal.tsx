import React, { useState, useCallback } from 'react';
import { Upload, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setIsValidating(true);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setSelectedFile(file);

    const valid = await validateImage(file);
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
      
      const response = await fetch(`/api/uploadCreative?userId=1`, {
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
                Image must be exactly {requiredDimensions.width} x {requiredDimensions.height} pixels
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
                Drag and drop your image here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
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
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm"
                />
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
                  Choose Different Image
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