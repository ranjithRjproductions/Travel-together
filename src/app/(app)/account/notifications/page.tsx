
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { EnableNotificationsButton } from '@/components/EnableNotificationsButton';

export default function NotificationsPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Push Notifications</CardTitle>
        <CardDescription>
          Enable push notifications to receive real-time updates on your travel
          requests, guide confirmations, and other important alerts directly on
          your device.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border bg-background p-4 flex items-center justify-between">
            <div>
                <h3 className="font-medium">Enable Browser Notifications</h3>
                <p className="text-sm text-muted-foreground">Click the button to allow notifications in this browser.</p>
            </div>
            <EnableNotificationsButton />
        </div>
      </CardContent>
    </Card>
  );
}
