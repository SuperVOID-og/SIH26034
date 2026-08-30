import React, { useState } from 'react';
import { DeleteDraftDialog } from './DeleteDraftDialog';
import { isDeletableDraftStatus } from '../../lib/inspection-routing';
import { XCircle } from 'lucide-react';

interface CancelInspectionActionProps {
  inspectionId: number;
  status: string;
}

export function CancelInspectionAction({ inspectionId, status }: CancelInspectionActionProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Guard: Only render if it's a deletable draft
  if (!isDeletableDraftStatus(status)) {
    return null;
  }

  return (
    <>
      <button 
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-failure transition-colors px-3 py-1.5 rounded-md hover:bg-failure/5"
        aria-label="Cancel inspection"
      >
        <XCircle className="w-3.5 h-3.5" />
        Cancel inspection
      </button>

      <DeleteDraftDialog 
        inspectionId={inspectionId} 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </>
  );
}
