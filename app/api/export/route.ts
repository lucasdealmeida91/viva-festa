import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import { formatDateBR } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

/**
 * RN-11.4 — exportação CSV (portabilidade). RLS restringe ao tenant do
 * gestor logado; recepcionista/cliente não têm SELECT nestas tabelas.
 * GET /api/export?entity=clientes|festas|convidados|parcelas
 */
export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity") ?? "clientes";
  const supabase = await createClient();

  const filename = entity;
  let csv = "";

  if (entity === "clientes") {
    const { data } = await supabase
      .from("customers")
      .select("name, phone, email")
      .order("name");
    csv = toCsv(
      ["nome", "telefone", "email"],
      (data ?? []).map((c) => [c.name, c.phone, c.email]),
    );
  } else if (entity === "festas") {
    const { data } = await supabase
      .from("parties")
      .select("party_date, status, customers (name)")
      .order("party_date");
    csv = toCsv(
      ["data", "status", "cliente"],
      (data ?? []).map((p) => [
        formatDateBR(p.party_date),
        p.status,
        p.customers?.name ?? "",
      ]),
    );
  } else if (entity === "convidados") {
    const { data } = await supabase
      .from("guests")
      .select("name, age, rsvp_status, attendance, origin, parties (party_date)")
      .order("name");
    csv = toCsv(
      ["nome", "idade", "rsvp", "presenca", "origem", "festa"],
      (data ?? []).map((g) => [
        g.name,
        g.age,
        g.rsvp_status,
        g.attendance ?? "",
        g.origin,
        g.parties ? formatDateBR(g.parties.party_date) : "",
      ]),
    );
  } else if (entity === "parcelas") {
    const { data } = await supabase
      .from("installments")
      .select("kind, due_date, amount_cents, paid_at, payment_method")
      .order("due_date");
    csv = toCsv(
      ["tipo", "vencimento", "valor_reais", "pago_em", "forma"],
      (data ?? []).map((i) => [
        i.kind,
        formatDateBR(i.due_date),
        (i.amount_cents / 100).toFixed(2),
        i.paid_at ? formatDateBR(i.paid_at.slice(0, 10)) : "",
        i.payment_method ?? "",
      ]),
    );
  } else {
    return NextResponse.json({ error: "entidade inválida" }, { status: 400 });
  }

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vivafesta-${filename}.csv"`,
    },
  });
}
