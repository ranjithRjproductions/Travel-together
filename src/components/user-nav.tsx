
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { logout } from '@/lib/actions';
import { User, LogOut, BookMarked, Shield, FileText } from 'lucide-react';
import type { User as UserType } from '@/lib/definitions';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useState } from 'react';
import { EnableNotificationsButton } from './EnableNotificationsButton';

function LogoutButton() {
  return (
    <form action={logout} className="w-full">
      <button type="submit" className="w-full text-left">
        <DropdownMenuItem className="cursor-pointer">
          <LogOut aria-hidden="true" />
          <span>Log out</span>
        </DropdownMenuItem>
      </button>
    </form>
  );
}

export function UserNav({ user }: { user?: UserType | null }) {
  const [open, setOpen] = useState(false);

  if (!user) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
    
  const photoAltText = user.photoAlt || `Profile picture of ${user.name}`;
  const profileUrl = user.role === 'Guide' ? '/guide/profile/settings' : '/traveler/profile/settings';
  
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-10 rounded-full"
        >
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={user.photoURL}
              alt={photoAltText}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={profileUrl}>
              <User aria-hidden="true" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
           {user.role === 'Traveler' && (
            <>
              <DropdownMenuItem asChild>
                <Link href="/traveler/my-bookings">
                  <BookMarked aria-hidden="true" />
                  <span>My Bookings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/traveler/my-requests">
                  <FileText aria-hidden="true" />
                  <span>My Requests</span>
                </Link>
              </DropdownMenuItem>
            </>
          )}
          {/* The a11y fix: This item will only be visible on mobile screens */}
          <div className="md:hidden">
             <DropdownMenuSeparator />
             <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="p-0">
                <EnableNotificationsButton />
             </DropdownMenuItem>
          </div>
        </DropdownMenuGroup>
        {user.isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="/admin">
                  <Shield aria-hidden="true" />
                  <span>Admin Panel</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
        <DropdownMenuSeparator />
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
