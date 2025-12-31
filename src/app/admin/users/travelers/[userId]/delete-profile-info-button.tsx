
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
import { type User } from '@/lib/definitions';
import { deleteTravelerProfileInfo } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

export function DeleteProfileInfoButton({ traveler }: { traveler: User & { uid: string } }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTravelerProfileInfo(traveler.uid);
    if (result.success) {
      toast({
        title: 'Profile Information Deleted',
        description: `The personal profile info for ${traveler.name} has been deleted.`,
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
              This will permanently delete the personal profile information (address, contact, disability disclosure) for <span className="font-bold">{traveler.name}</span>. Their account and travel history will remain. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Yes, delete profile info'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Button variant="destructive" size="sm" onClick={() => setIsAlertOpen(true)} disabled={isDeleting}>
        Delete Profile Info
      </Button>
    </>
  );
}
