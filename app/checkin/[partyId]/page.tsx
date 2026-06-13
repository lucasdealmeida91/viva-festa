import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckinBoard } from "@/components/checkin/checkin-board";
import { formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Check-in da festa" };

export default async function CheckinPartyPage({
  params,
}: {
  params: Promise<{ partyId: string }>;
}) {
  const { partyId } = await params;
  const supabase = await createClient();

  const { data: party } = await supabase
    .from("parties")
    .select(
      `id, party_date, status,
       rule_exempt_age, rule_adult_age, rule_adult_capacity, rule_child_capacity,
       packages (exempt_age, adult_age, adult_capacity, child_capacity)`,
    )
    .eq("id", partyId)
    .single();

  if (!party) notFound();

  const [{ data: guests }, { data: groups }] = await Promise.all([
    supabase
      .from("guests")
      .select("id, name, age, group_id, attendance")
      .eq("party_id", partyId)
      .order("name"),
    supabase
      .from("guest_groups")
      .select("id, name")
      .eq("party_id", partyId),
  ]);

  const rules = {
    exemptAge: party.rule_exempt_age ?? party.packages!.exempt_age,
    adultAge: party.rule_adult_age ?? party.packages!.adult_age,
  };
  const capacity = {
    adults: party.rule_adult_capacity ?? party.packages!.adult_capacity,
    children: party.rule_child_capacity ?? party.packages!.child_capacity,
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-3 p-4">
      <header>
        <Link href="/checkin" className="text-muted-foreground text-sm underline">
          ← Festas
        </Link>
        <h1 className="mt-1 text-xl font-semibold">
          Check-in · {formatDateBR(party.party_date)}
        </h1>
      </header>

      <CheckinBoard
        partyId={party.id}
        initialGuests={guests ?? []}
        groups={groups ?? []}
        rules={rules}
        capacity={capacity}
        closed={party.status === "completed"}
      />
    </main>
  );
}
