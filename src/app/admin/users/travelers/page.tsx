import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function ManageTravelersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Manage Travelers</CardTitle>
        <CardDescription>
          View and manage all traveler accounts. This section is under construction.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          [Traveler management features will be available here soon.]
        </p>
      </CardContent>
    </Card>
  );
}