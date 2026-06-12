import Link from "next/link";
import { CustomerForm } from "@/components/clientes/customer-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Clientes" };

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("customers")
    .select("id, name, phone, email")
    .order("name")
    .limit(50);
  if (q) {
    query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
  }
  const { data: customers } = await query;

  return (
    <main className="flex flex-col gap-6 p-6">
      <header>
        <Link href="/app" className="text-muted-foreground text-sm underline">
          ← Painel
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Clientes</h1>
      </header>

      <form action="/app/clientes" method="get" className="flex max-w-sm gap-2">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou telefone"
          aria-label="Buscar cliente"
        />
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>

      {(customers ?? []).length > 0 ? (
        <ul className="flex max-w-md flex-col gap-2">
          {customers!.map((customer) => (
            <li key={customer.id}>
              <Link
                href={`/app/clientes/${customer.id}`}
                className="flex flex-col rounded-md border p-3 hover:bg-accent"
              >
                <span className="font-medium">{customer.name}</span>
                <span className="text-muted-foreground text-sm">
                  {[customer.phone, customer.email].filter(Boolean).join(" · ") ||
                    "sem contato"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground">
          {q ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado ainda."}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Novo cliente</h2>
        <CustomerForm />
      </section>
    </main>
  );
}
