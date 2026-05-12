import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "admin@foundit.app";
  const password = "Admin#FoundIt2026!";

  // Check if user already exists
  const { data: existing } = await admin.auth.admin.listUsers();
  let user = existing.users.find((u) => u.email === email);

  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: "Admin" },
    });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    user = data.user!;
  } else {
    await admin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  // Ensure admin role
  const { data: roles } = await admin.from("user_roles").select("id").eq("user_id", user.id).eq("role", "admin");
  if (!roles || roles.length === 0) {
    await admin.from("user_roles").insert({ user_id: user.id, role: "admin" });
  }

  return new Response(
    JSON.stringify({ ok: true, email, password, user_id: user.id }),
    { headers: { ...cors, "Content-Type": "application/json" } }
  );
});