import React, { useState, useCallback } from 'react';
import { X, Upload, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CreativeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (url: string) => void;
  requiredDimensions?: { width: number; height: number };
}

export function CreativeUploadModal({ 
  isOpen, 
  onClose, 
  onUpload, 
  requiredDimensions 
}: CreativeUploadModalProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isValid, setIsValid] = useState(false);

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

  const handleUpload = () => {
    if (previewUrl && isValid) {
      // TODO: Replace with actual S3 upload
      // const formData = new FormData();
      // formData.append('file', file);
      // const response = await fetch('/api/upload/creative', {
      //   method: 'POST',
      //   body: formData
      // });
      // const { url } = await response.json();
      
      onUpload(previewUrl);
      resetModal();
    }
  };

  const resetModal = () => {
    setPreviewUrl('');
    setError('');
    setIsValid(false);
    setIsValidating(false);
    setDragActive(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-slate-900">Upload Creative</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {requiredDimensions && (
            <Alert className="border-purple-200 bg-purple-50">
              <AlertCircle className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-purple-800">
                Image must be exactly {requiredDimensions.width} x {requiredDimensions.height} pixels
              </AlertDescription>
            </Alert>
          )}

          {!previewUrl ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto w-12 h-12 text-slate-400 mb-4" />
              <p className="text-sm text-slate-600 mb-2">
                Drag and drop your image here, or click to browse
              </p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Browse Files
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full border border-slate-300 rounded"
                />
                {isValidating && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <div className="text-white">Validating...</div>
                  </div>
                )}
                {!isValidating && isValid && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </div>
              
              {error && (
                <Alert variant="destructive" className="border-red-200">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => setPreviewUrl('')}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Choose Different Image
                </Button>
                <Button 
                  onClick={handleUpload} 
                  disabled={!isValid || isValidating}
                  className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                >
                  Upload Creative
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}