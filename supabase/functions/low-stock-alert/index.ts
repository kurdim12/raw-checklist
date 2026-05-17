// Supabase Edge Function — low-stock-alert
//
// Wire-up: in the Supabase dashboard create a Database Webhook on
// public.low_stock_alerts (INSERT) that calls this function. The
// function POSTs to WHATSAPP_WEBHOOK_URL with the item name and
// current quantity, then writes the response back into the row.
//
// Deploy:  supabase functions deploy low-stock-alert
// Test:    supabase functions invoke low-stock-alert --body '{"record":{"id":"..."}}'

import { createClient } from 'npm:@supabase/supabase-js@2';

type WebhookPayload = {
  type: 'INSERT';
  table: 'low_stock_alerts';
  record: {
    id: string;
    item_id: string;
    quantity_at_alert: number;
    min_level_at_alert: number;
    created_at: string;
  };
};

Deno.serve(async (req: Request) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const webhookUrl = Deno.env.get('WHATSAPP_WEBHOOK_URL');
    if (!supabaseUrl || !serviceKey) {
      return new Response('missing supabase env', { status: 500 });
    }

    const payload = (await req.json()) as WebhookPayload;
    const sb = createClient(supabaseUrl, serviceKey);

    const { data: item, error } = await sb
      .from('inventory_items')
      .select('name, name_ar, unit')
      .eq('id', payload.record.item_id)
      .single();
    if (error) throw error;

    const msg =
      `LOW STOCK | ${item.name} (${item.name_ar})\n` +
      `Now: ${payload.record.quantity_at_alert} ${item.unit}\n` +
      `Min: ${payload.record.min_level_at_alert} ${item.unit}`;

    let webhookResponse = 'no WHATSAPP_WEBHOOK_URL configured';
    let sentAt: string | null = null;

    if (webhookUrl) {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: msg, item: item.name, qty: payload.record.quantity_at_alert }),
      });
      webhookResponse = `${res.status} ${res.statusText}`;
      sentAt = new Date().toISOString();
    }

    await sb
      .from('low_stock_alerts')
      .update({ sent_at: sentAt, webhook_response: webhookResponse })
      .eq('id', payload.record.id);

    return new Response(JSON.stringify({ ok: true, webhookResponse }), {
      headers: { 'content-type': 'application/json' },
    });
  } catch (e) {
    return new Response(`error: ${(e as Error).message}`, { status: 500 });
  }
});
