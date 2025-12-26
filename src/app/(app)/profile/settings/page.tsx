'use client';

import { useDoc } from '@/firebase';
import { useMemo, useState, useEffect, useRef } from 'react';
import { doc, collection, setDoc } from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { useFirestore, useUser, useStorage } from '@/firebase/provider';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import content from '@/app/content/profile-settings.json';
import { User as UserIcon } from 'lucide-react';

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ProfileSettingsPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();

  const userDocRef = useMemo(() => {
    if (!user || !firestore) return null;
    return doc(collection(firestore, 'users'), user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading, error } =
    useDoc(userDocRef);

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhotoPreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      const isNameChanged = name !== userProfile.name;
      const isPhotoChanged = photoFile !== null;
      setIsDirty(isNameChanged || isPhotoChanged);
    }
  }, [name, photoFile, userProfile]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userDocRef || !firestore || !isDirty) return;

    setIsSaving(true);
    let photoURL = userProfile?.photoURL;

    try {
      // 1. Upload photo if it has changed
      if (photoFile && storage && user) {
        const photoStorageRef = storageRef(
          storage,
          `profile-photos/${user.uid}`
        );
        const uploadResult = await uploadBytes(photoStorageRef, photoFile);
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      // 2. Prepare data to save
      const dataToSave: { name: string; photoURL?: string } = {
        name,
      };
      if (photoURL) {
        dataToSave.photoURL = photoURL;
      }


      // 3. Save to Firestore
      await setDoc(userDocRef, dataToSave, { merge: true });

      toast({
        title: 'Success',
        description: content.successMessage,
      });

      // Reset dirty state
      setPhotoFile(null);
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: content.errorMessage,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isLoading = isUserLoading || isProfileLoading;
  const initials =
    userProfile?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase() || '';

  return (
    <div>
      <h1 className="font-headline text-3xl font-bold mb-8">
        {content.pageTitle}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{content.formTitle}</CardTitle>
          <CardDescription>{content.formDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading && <ProfileSkeleton />}
          {!isLoading && userProfile && (
            <form onSubmit={handleSave} className="space-y-8">
              <fieldset className="flex items-center gap-6">
                <legend className="sr-only">Profile Photo</legend>
                <Avatar className="h-20 w-20">
                  <AvatarImage src={photoPreview || ''} alt="Profile photo preview" />
                  <AvatarFallback className="text-3xl">
                    {initials || <UserIcon />}
                  </AvatarFallback>
                </Avatar>
                <div className="grid gap-2">
                  <Label htmlFor="photo-upload">Profile Photo</Label>
                  <p className="text-sm text-muted-foreground">
                    This will be displayed on your profile.
                  </p>
                  <Input
                    id="photo-upload"
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg"
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </Button>
                </div>
              </fieldset>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{content.nameLabel}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{content.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    disabled
                    className="disabled:opacity-100 disabled:cursor-not-allowed text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{content.roleLabel}</Label>
                  <Input
                    id="role"
                    value={userProfile.role}
                    disabled
                    className="disabled:opacity-100 disabled:cursor-not-allowed text-base"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={!isDirty || isSaving}>
                  {isSaving
                    ? content.saveButtonSubmitting
                    : content.saveButton}
                </Button>
              </div>
            </form>
          )}
          {error && (
            <p className="text-destructive-foreground">
              There was an error loading your profile.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
