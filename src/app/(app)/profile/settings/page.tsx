'use client';

import { useDoc } from '@/firebase';
import { useMemo, useState, useEffect, useRef } from 'react';
import { doc, collection, setDoc } from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytesResumable,
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
import { User as UserIcon, UploadCloud, File as FileIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

function ProfileSkeleton() {
  return (
    <div className="space-y-6">
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
      <div className="flex items-center gap-4 pt-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
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

  const {
    data: userProfile,
    isLoading: isProfileLoading,
    error,
  } = useDoc(userDocRef);

  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNameDirty, setIsNameDirty] = useState(false);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.name || '');
      setPhotoPreview(userProfile.photoURL || null);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      setIsNameDirty(name !== userProfile.name);
    }
  }, [name, userProfile]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload an image file (PNG, JPG, etc.).',
        });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File Too Large',
          description: 'Please upload an image smaller than 5MB.',
        });
        return;
      }

      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !storage || !user || !userDocRef) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Upload prerequisites not met. Please try again.',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const photoPath = `profile-photos/${user.uid}/${photoFile.name}`;
    const photoStorageRef = storageRef(storage, photoPath);

    const uploadTask = uploadBytesResumable(photoStorageRef, photoFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description:
            'Could not upload your photo. Please check permissions and try again.',
        });
        setIsUploading(false);
        setUploadProgress(0);
      },
      async () => {
        try {
          const photoURL = await getDownloadURL(uploadTask.snapshot.ref);
          await setDoc(userDocRef, { photoURL: photoURL }, { merge: true });

          toast({
            title: 'Success',
            description: 'Profile photo updated successfully!',
          });

          setPhotoFile(null); // Clear the file selection
        } catch (saveError) {
          console.error('Error saving photo URL:', saveError);
          toast({
            variant: 'destructive',
            title: 'Save Failed',
            description: 'Could not save your new photo. Please try again.',
          });
        } finally {
          setIsUploading(false);
          // Keep progress at 100 for a moment for user feedback
          setTimeout(() => setUploadProgress(0), 2000);
        }
      }
    );
  };

  const handleSaveName = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!userDocRef || !isNameDirty) return;

    setIsSaving(true);
    try {
      await setDoc(userDocRef, { name }, { merge: true });
      toast({
        title: 'Success',
        description: content.successMessage,
      });
      setIsNameDirty(false);
    } catch (error) {
      console.error('Error saving name:', error);
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
            <div className="space-y-8">
              <form onSubmit={handleSaveName} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{content.nameLabel}</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={handleNameChange}
                    className="text-base"
                    aria-describedby="name-description"
                  />
                  <p
                    id="name-description"
                    className="text-sm text-muted-foreground"
                  >
                    Your name as it should appear on official travel documents.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{content.emailLabel}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userProfile.email}
                    readOnly
                    className="text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{content.roleLabel}</Label>
                  <Input
                    id="role"
                    value={userProfile.role}
                    readOnly
                    className="text-base"
                  />
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={!isNameDirty || isSaving}>
                    {isSaving
                      ? content.saveButtonSubmitting
                      : content.saveButton}
                  </Button>
                </div>
              </form>

              <fieldset className="space-y-6 pt-6 border-t">
                <legend className="text-lg font-medium">Profile Photo</legend>
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24 border">
                    <AvatarImage
                      src={photoPreview || ''}
                      alt="Profile photo preview"
                    />
                    <AvatarFallback className="text-3xl">
                      {initials || <UserIcon />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid gap-2 flex-1">
                    <Label htmlFor="photo-upload">Update your photo</Label>
                    <p className="text-sm text-muted-foreground">
                      Used for identification during travel. (Max 5MB)
                    </p>
                    <Input
                      id="photo-upload"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg"
                      className="hidden"
                    />
                    <div className="flex gap-2 items-center flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                      >
                        Choose File
                      </Button>
                      {photoFile && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            <FileIcon className="h-4 w-4" />
                            <span className="truncate max-w-xs">
                              {photoFile.name}
                            </span>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={handlePhotoUpload}
                            disabled={isUploading}
                          >
                            <UploadCloud className="mr-2 h-4 w-4" />
                            {isUploading ? 'Uploading...' : 'Upload & Save'}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={uploadProgress} className="w-full" />
                    <p
                      className="text-sm text-muted-foreground text-center"
                      aria-live="polite"
                    >
                      Uploading: {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
              </fieldset>
            </div>
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
