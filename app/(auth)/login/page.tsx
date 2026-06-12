import { AuthForm } from "@/components/auth/auth-form";
import { signIn } from "../actions";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AuthForm mode="login" action={signIn} />
    </main>
  );
}
