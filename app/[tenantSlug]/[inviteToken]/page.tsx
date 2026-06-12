type ConvitePageProps = {
  params: Promise<{ tenantSlug: string; inviteToken: string }>;
};

export default async function ConvitePage({ params }: ConvitePageProps) {
  const { tenantSlug, inviteToken } = await params;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Você está convidado! 🎉</h1>
        <p className="text-muted-foreground mt-2">
          Convite público — em construção (M3-T3).
        </p>
        <p className="text-muted-foreground mt-1 text-sm">
          buffet: {tenantSlug} · festa: {inviteToken}
        </p>
      </div>
    </main>
  );
}
