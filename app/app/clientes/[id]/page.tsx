import Link from "next/link";
import { notFound } from "next/navigation";
import { ChildrenManager } from "@/components/clientes/children-manager";
import { CustomerForm } from "@/components/clientes/customer-form";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cliente" };

export default async function ClientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select(
      "id, name, phone, email, birthday_children (id, name, birth_month, birth_year)",
    )
    .eq("id", id)
    .single();

  if (!customer) notFound();

  return (
    <main className="flex flex-col gap-8 p-6">
      <header>
        <Link
          href="/app/clientes"
          className="text-muted-foreground text-sm underline"
        >
          ← Clientes
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{customer.name}</h1>
      </header>

      <CustomerForm customer={customer} />
      <ChildrenManager
        customerId={customer.id}
        childrenList={customer.birthday_children ?? []}
      />
    </main>
  );
}
