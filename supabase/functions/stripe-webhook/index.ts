// Supabase Edge Function: Stripe webhook -> forward fulfilled orders to the supplier (Gelato).
// This code was previously misplaced in src/router.tsx (which broke the Vite build).
// It has been moved here where a Deno-based edge function belongs.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // 1. Get transaction details sent securely from Stripe
    const event = await req.json();

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { product_id, base_product_type, print_file_url } = session.metadata;
      const shipping = session.shipping_details;

      // 2. The Live Handshake: Send order details straight to the manufacturer's API (Gelato)
      const supplierResponse = await fetch("https://order.gelatoapis.com/v4/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SUPPLIER_API_KEY")}`,
        },
        body: JSON.stringify({
          shippingAddress: {
            firstName: shipping.name,
            lastName: "",
            addressLine1: shipping.address.line1,
            addressLine2: shipping.address.line2 || "",
            city: shipping.address.city,
            postCode: shipping.address.postal_code,
            country: shipping.address.country,
          },
          items: [
            {
              itemReferenceId: product_id,
              productUid:
                base_product_type === "Acrylic Standee"
                  ? "acrylic_standee_std_uid"
                  : "sticker_std_uid",
              quantity: 1,
              fileUrl: print_file_url,
            },
          ],
        }),
      });

      const supplierData = await supplierResponse.json();
      if (!supplierResponse.ok) throw new Error(`Supplier Error: ${supplierData.message}`);

      // 3. Update database status to 'sent_to_factory'
      await supabaseClient
        .from("orders")
        .update({ status: "sent_to_factory", supplier_order_id: supplierData.id })
        .eq("stripe_session_id", session.id);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
  }
});
