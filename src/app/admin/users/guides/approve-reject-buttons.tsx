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
import { Check, X } from 'lucide-react';
import { type User } from '@/lib/definitions';
import { updateGuideStatus } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

type ActionType = 'approve' | 'reject';

export function ApproveRejectButtons({ guide }: { guide: User & { uid: string } }) {
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
    const newStatus = actionType === 'approve' ? 'active' : 'rejected';
    
    const result = await updateGuideStatus(guide.uid, newStatus);

    if (result.success) {
      toast({
        title: `Guide ${actionType === 'approve' ? 'Approved' : 'Rejected'}`,
        description: `The status for ${guide.name} has been updated.`,
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
  
  const title = `Are you sure you want to ${actionType}?`;
  const description = actionType === 'approve' 
    ? `This will mark the guide "${guide.name}" as active and allow them to accept requests. This action can be reversed later if needed.`
    : `This will reject the guide "${guide.name}". They will be notified that their application was not successful. This action is final.`;

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
                className={actionType === 'reject' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isSubmitting ? 'Submitting...' : `Yes, ${actionType}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
    </>
  );
}
