
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
import { Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteTravelRequest } from '@/lib/actions';

export function DeleteRequestButton({ requestId }: { requestId: string }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTravelRequest(requestId);
    if (result.success) {
      toast({
        title: 'Request Deleted',
        description: 'The travel request has been permanently deleted.',
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
              This action cannot be undone. This will permanently delete this travel request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Yes, delete request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="destructive" size="sm" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
        <Trash2 className="mr-2 h-4 w-4" />
        Delete
      </Button>
    </>
  );
}
