import { Button } from "@/components/ui/button";
import { signOut } from "@/app/(auth)/actions";

export default function CheckinPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Check-in</h1>
        <p className="text-muted-foreground mt-2">
          Festas de hoje e de amanhã — em construção (M4).
        </p>
      </div>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Sair
        </Button>
      </form>
    </main>
  );
}
