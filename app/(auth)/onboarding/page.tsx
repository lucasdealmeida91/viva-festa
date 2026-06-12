import { Button } from "@/components/ui/button";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { signOut } from "../actions";

export const metadata = { title: "Bem-vindo" };

export default function OnboardingPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6">
      <OnboardingForm />
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sair
        </Button>
      </form>
    </main>
  );
}
