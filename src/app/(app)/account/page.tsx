
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function AccountProfilePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your role-specific profile information can be managed from your main dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
         <p className="text-sm text-muted-foreground">
            This section is for general account settings. To edit your public traveler or guide profile, please visit your profile settings page.
        </p>
        <div className="flex gap-2">
            <Button asChild>
                <Link href="/traveler/profile/settings">Traveler Profile</Link>
            </Button>
            <Button asChild variant="secondary">
                <Link href="/guide/profile/settings">Guide Profile</Link>
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
