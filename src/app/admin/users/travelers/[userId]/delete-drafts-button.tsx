
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
import { useToast } from '@/hooks/use-toast';
import { deleteDraftRequestsForTraveler } from '@/lib/actions';

export function DeleteDraftsButton({ travelerId }: { travelerId: string }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteDraftRequestsForTraveler(travelerId);
    if (result.success) {
      toast({
        title: 'Drafts Deleted',
        description: 'All draft requests for this traveler have been deleted.',
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: result.message,
      });
    }
    setIsDeleting(false);
    setIsAlertOpen(false);
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all of this traveler's draft requests. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting Drafts...' : 'Yes, delete all drafts'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="destructive" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
        Delete All Drafts
      </Button>
    </>
  );
}
