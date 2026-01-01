'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Check, X, Ban } from 'lucide-react';
import { type User } from '@/lib/definitions';
import { updateGuideStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

type ActionType = 'approve' | 'reject' | 'deactivate' | 'reactivate';

export function ManageGuideStatusButtons({ guide }: { guide: User & { uid: string, onboardingState?: string } }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const { toast } = useToast();

  const handleOpenDialog = (type: ActionType) => {
    setActionType(type);
    setIsAlertOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!actionType) return;

    setIsSubmitting(true);
    let newStatus: 'active' | 'rejected' = 'active'; // default
    if (actionType === 'approve' || actionType === 'reactivate') {
      newStatus = 'active';
    } else if (actionType === 'reject' || actionType === 'deactivate') {
      newStatus = 'rejected';
    }
    
    const result = await updateGuideStatus(guide.uid, newStatus);

    if (result.success) {
      toast({
        title: `Guide Status Updated`,
        description: `The status for ${guide.name} has been updated to ${newStatus}.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Action Failed',
        description: result.message,
      });
    }
    
    setIsSubmitting(false);
    setIsAlertOpen(false);
  };
  
  const getDialogContent = () => {
    switch (actionType) {
        case 'approve':
            return { title: 'Approve this guide?', description: `This will mark the guide "${guide.name}" as active and allow them to accept requests.` };
        case 'reject':
            return { title: 'Reject this guide?', description: `This will reject the guide "${guide.name}". They will be notified that their application was not successful.` };
        case 'deactivate':
            return { title: 'Deactivate this guide?', description: `This will deactivate the guide "${guide.name}" and prevent them from accepting new requests. They can be re-activated later.` };
        case 'reactivate':
            return { title: 'Re-activate this guide?', description: `This will mark the guide "${guide.name}" as active again, allowing them to accept requests.` };
        default:
            return { title: 'Confirm Action', description: 'Are you sure you want to proceed?' };
    }
  };
  
  const { title, description } = getDialogContent();
  const isDestructiveAction = actionType === 'reject' || actionType === 'deactivate';

  const renderButtons = () => {
    const status = guide.onboardingState;
    if (status === 'verification-pending') {
        return (
            <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => handleOpenDialog('approve')}>
                    <Check className="h-4 w-4" />
                    <span className="sr-only">Approve</span>
                </Button>
                <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleOpenDialog('reject')}>
                    <X className="h-4 w-4" />
                    <span className="sr-only">Reject</span>
                </Button>
            </div>
        );
    }
     if (status === 'active') {
        return (
             <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5 hover:text-destructive" onClick={() => handleOpenDialog('deactivate')}>
                <Ban className="mr-2 h-4 w-4" />
                Deactivate
            </Button>
        );
    }
     if (status === 'rejected') {
        return (
             <Button variant="outline" size="sm" className="text-green-600 hover:bg-green-50 hover:text-green-700" onClick={() => handleOpenDialog('reactivate')}>
                <Check className="mr-2 h-4 w-4" />
                Re-activate
            </Button>
        );
    }
    return null;
  }

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleConfirmAction} 
                disabled={isSubmitting}
                className={isDestructiveAction ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isSubmitting ? 'Submitting...' : 'Yes, confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {renderButtons()}
    </>
  );
}
