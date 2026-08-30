import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DeleteDraftDialog } from './DeleteDraftDialog';
import { Button } from '../ui/Button';
import { X, AlertTriangle } from 'lucide-react';
import { isDeletableDraftStatus } from '../../lib/inspection-routing';

interface LeaveGuardContextType {
  registerGuard: (inspectionId: number, status: string, isDirty: boolean) => void;
  unregisterGuard: () => void;
  requestNavigate: (href: string) => void;
}

const LeaveGuardContext = createContext<LeaveGuardContextType | null>(null);

export function useLeaveGuard() {
  const context = useContext(LeaveGuardContext);
  if (!context) {
    throw new Error('useLeaveGuard must be used within a LeaveGuardProvider');
  }
  return context;
}

export function GuardedLink({ href, children, className, onClick }: any) {
  const { requestNavigate } = useLeaveGuard();
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) onClick(e);
    requestNavigate(href);
  };
  
  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}

export function LeaveGuardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  
  const [guardState, setGuardState] = useState<{
    isActive: boolean;
    inspectionId: number;
    status: string;
    isDirty: boolean;
  } | null>(null);

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    pendingHref: string | null;
  }>({ isOpen: false, pendingHref: null });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const registerGuard = useCallback((inspectionId: number, status: string, isDirty: boolean) => {
    setGuardState({ isActive: true, inspectionId, status, isDirty });
  }, []);

  const unregisterGuard = useCallback(() => {
    setGuardState(null);
  }, []);

  const requestNavigate = useCallback((href: string) => {
    if (guardState?.isActive && isDeletableDraftStatus(guardState.status)) {
      setDialogState({ isOpen: true, pendingHref: href });
    } else {
      router.push(href);
    }
  }, [guardState, router]);

  const handleStay = () => {
    setDialogState({ isOpen: false, pendingHref: null });
  };

  const handleKeepAsDraft = () => {
    if (dialogState.pendingHref) {
      router.push(dialogState.pendingHref);
    }
    setDialogState({ isOpen: false, pendingHref: null });
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const onDeleted = () => {
    setDeleteDialogOpen(false);
    if (dialogState.pendingHref) {
      router.push(dialogState.pendingHref);
    }
    setDialogState({ isOpen: false, pendingHref: null });
  };

  return (
    <LeaveGuardContext.Provider value={{ registerGuard, unregisterGuard, requestNavigate }}>
      {children}
      
      {/* Leave Warning Dialog */}
      {dialogState.isOpen && guardState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-surface-elevated border border-border rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-text-primary">
                  Leave this inspection?
                </h2>
                <button 
                  onClick={handleStay} 
                  className="text-text-secondary hover:text-text-primary transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {guardState.isDirty ? (
                <div className="mb-6 p-4 bg-review/10 border border-review/20 rounded-lg text-sm text-review flex gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <p>You have unsaved verification changes. Keeping this inspection as a draft will preserve the last saved state, but these unsaved edits will be discarded.</p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary mb-6">
                  You have an unfinished inspection. You can keep it and continue later, or delete it.
                </p>
              )}

              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={handleStay} className="w-full">
                  Stay here
                </Button>
                <Button variant="outline" onClick={handleKeepAsDraft} className="w-full">
                  {guardState.isDirty ? "Discard edits & keep draft" : "Keep as draft"}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDeleteClick} 
                  className="w-full text-failure hover:text-failure hover:bg-failure/10 border-transparent hover:border-failure/20"
                >
                  Delete draft
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft Modal triggered from the Leave Warning Dialog */}
      {guardState && (
        <DeleteDraftDialog
          inspectionId={guardState.inspectionId}
          isOpen={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
          onDeleted={onDeleted}
        />
      )}
    </LeaveGuardContext.Provider>
  );
}
