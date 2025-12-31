
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
import { type User } from '@/lib/definitions';
import { deleteTravelerAccount } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';

export function DeleteTravelerButton({ traveler }: { traveler: User & { id: string } }) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteTravelerAccount(traveler.id);
    if (result.success) {
      toast({
        title: 'Account Deleted',
        description: `The account for ${traveler.name} has been permanently deleted.`,
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
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the account for <span className="font-bold">{traveler.name}</span> and remove all associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Yes, delete account'}
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
