import { notFound } from "next/navigation";
import { formatDateBR, formatTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Convite" };

type ConvitePageProps = {
  params: Promise<{ tenantSlug: string; inviteToken: string }>;
};

export default async function ConvitePage({ params }: ConvitePageProps) {
  const { tenantSlug, inviteToken } = await params;
  const supabase = await createClient();

  // RPC security definer (AD-5): o anon não lê tabela alguma diretamente.
  const { data } = await supabase
    .rpc("get_invite", { p_slug: tenantSlug, p_token: inviteToken })
    .maybeSingle();

  if (!data) notFound();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <div>
        <p className="text-muted-foreground">Você está convidado para a festa de</p>
        <h1 className="mt-1 text-3xl font-semibold">
          {data.birthday_child_name ?? "nosso aniversariante"}
          {data.turning_age != null && ` — ${data.turning_age} anos`}
        </h1>
      </div>

      <dl className="flex flex-col gap-1">
        <dd className="text-lg">{formatDateBR(data.party_date)}</dd>
        <dd className="text-muted-foreground">
          {data.shift_label} · {formatTime(data.shift_starts_at)}–
          {formatTime(data.shift_ends_at)}
        </dd>
        {data.buffet_address && (
          <dd className="text-muted-foreground">{data.buffet_address}</dd>
        )}
        <dd className="text-muted-foreground text-sm">{data.buffet_name}</dd>
      </dl>

      {data.host_message && (
        <p className="max-w-md italic">“{data.host_message}”</p>
      )}

      {data.rsvp_open ? (
        <p className="text-muted-foreground text-sm">
          Confirmação de presença — em breve (M3-T4).
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          O prazo de confirmação encerrou.
        </p>
      )}
    </main>
  );
}
