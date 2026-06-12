import { AuthForm } from "@/components/auth/auth-form";
import { signUp } from "../actions";

export const metadata = { title: "Criar conta" };

export default function CadastroPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <AuthForm mode="cadastro" action={signUp} />
    </main>
  );
}
