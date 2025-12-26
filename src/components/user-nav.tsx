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
import { User, LogOut, Settings } from 'lucide-react';
import type { User as UserType } from '@/lib/definitions';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';

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
  if (!user) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={`https://avatar.vercel.sh/${user.email}.png`}
              alt={`Profile picture of ${user.name}`}
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
            <Link href="/profile/settings">
              <User aria-hidden="true" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <LogoutButton />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
