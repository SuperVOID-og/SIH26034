import React, { useState } from 'react';
import { Loader2, Trash2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { api } from '../../lib/api';
import { useRouter } from 'next/navigation';
import { cn } from '../../lib/utils';

interface DeleteDraftDialogProps {
  inspectionId: number;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteDraftDialog({ inspectionId, isOpen, onClose, onDeleted }: DeleteDraftDialogProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await api.deleteInspection(inspectionId);
      if (onDeleted) {
        onDeleted();
      } else {
        router.push('/inspections');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete draft inspection.');
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-labelledby="delete-dialog-title"
        aria-modal="true"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 id="delete-dialog-title" className="text-xl font-semibold text-text-primary">
              Delete this draft inspection?
            </h2>
            <button 
              onClick={onClose} 
              disabled={isDeleting}
              className="text-text-secondary hover:text-text-primary disabled:opacity-50 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <p className="text-sm text-text-secondary mb-6">
            This unfinished inspection and its uploaded package images will be permanently removed.
          </p>

          {error && (
            <div className="mb-6 p-3 bg-failure/10 border border-failure/20 rounded-lg text-sm text-failure">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isDeleting}
              className="w-full sm:w-auto"
            >
              Continue inspection
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                "w-full sm:w-auto text-white",
                !isDeleting && "bg-failure hover:bg-failure/90 border-transparent shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              )}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete draft
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
