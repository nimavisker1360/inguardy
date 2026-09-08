import { redirect } from "next/navigation";
import { PremiumPaymentForm } from "./premium-payment-form";
import { getSession } from "@/lib/server-auth";

export default async function PremiumPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login?redirect=/premium");
  }

  return <PremiumPaymentForm />;
}
