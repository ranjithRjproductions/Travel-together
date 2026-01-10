
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
import { logoutAction } from '@/lib/actions';
import { User, LogOut, BookMarked, Shield, FileText } from 'lucide-react';
import type { User as UserType } from '@/lib/definitions';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';

export function UserNav({ user }: { user?: UserType | null }) {
  if (!user) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  };

  const initials = getInitials(user.name, user.email);
  const photoAltText = user.photoAlt || `Profile photo of ${user.name}`;
  const profileUrl = user.role === 'Guide' ? '/guide/profile/settings' : '/traveler/profile/settings';

  return (
    <DropdownMenu>
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
              <span>Profile Settings</span>
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
        <form action={logoutAction}>
            <button type="submit" className="w-full">
                <DropdownMenuItem className="cursor-pointer">
                    <LogOut aria-hidden="true" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
