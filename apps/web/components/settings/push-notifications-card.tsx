"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { deleteSubscriptionAction, saveSubscriptionAction } from "../../lib/push/actions";
import { currentPushSubscription, pushSupported, subscribeToPush, unsubscribeFromPush } from "../../lib/push/subscribe";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";

// Literal form required — Next.js only inlines NEXT_PUBLIC_* as the exact
// `process.env.NEXT_PUBLIC_X` expression client-side (see lib/supabase/client.ts).
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type Status = "checking" | "unsupported" | "unconfigured" | "off" | "on";

export function PushNotificationsCard() {
  const [status, setStatus] = useState<Status>("checking");
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!pushSupported()) {
      setStatus("unsupported");
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setStatus("unconfigured");
      return;
    }
    currentPushSubscription()
      .then((sub) => {
        setStatus(sub ? "on" : "off");
      })
      .catch(() => {
        setStatus("off");
      });
  }, []);

  async function handleEnable() {
    if (!VAPID_PUBLIC_KEY) return;
    setIsPending(true);
    try {
      const subscription = await subscribeToPush(VAPID_PUBLIC_KEY);
      if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
        throw new Error("Abonnement incomplet.");
      }
      const result = await saveSubscriptionAction({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
      });
      if (!result.ok) throw new Error(result.error);
      setStatus("on");
      toast.success("Notifications activées.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'activation des notifications.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisable() {
    setIsPending(true);
    try {
      const subscription = await currentPushSubscription();
      await unsubscribeFromPush();
      if (subscription?.endpoint) {
        await deleteSubscriptionAction(subscription.endpoint);
      }
      setStatus("off");
      toast.success("Notifications désactivées.");
    } catch {
      toast.error("Échec de la désactivation des notifications.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications push</CardTitle>
        <CardDescription>
          Alerte 3 jours avant, 1 jour avant, et le jour même de chaque prélèvement récurrent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === "checking" && <p className="text-sm text-muted-foreground">Vérification…</p>}
        {status === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Votre navigateur ne prend pas en charge les notifications push.
          </p>
        )}
        {status === "unconfigured" && (
          <p className="text-sm text-muted-foreground">Notifications non configurées sur cet environnement.</p>
        )}
        {status === "off" && (
          <Button type="button" onClick={() => void handleEnable()} disabled={isPending}>
            {isPending ? "Activation…" : "Activer les notifications"}
          </Button>
        )}
        {status === "on" && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
              Activées
            </span>
            <Button type="button" variant="outline" onClick={() => void handleDisable()} disabled={isPending}>
              {isPending ? "Désactivation…" : "Désactiver"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
