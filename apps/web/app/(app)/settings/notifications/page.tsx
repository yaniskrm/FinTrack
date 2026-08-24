import type { Metadata } from "next";
import { PushNotificationsCard } from "../../../../components/settings/push-notifications-card";

export const metadata: Metadata = {
  title: "Notifications — FinTrack",
};

export default function NotificationsSettingsPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Recevez une alerte avant chaque prélèvement récurrent.</p>
      </div>

      <PushNotificationsCard />
    </>
  );
}
