import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "At least 6 characters").max(100),
}).required();
const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(2, "Min 2 characters").max(60),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ email: "", password: "" });
  const [signUp, setSignUp] = useState({ email: "", password: "", displayName: "" });

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signInSchema.safeParse(signIn);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate("/");
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signUpSchema.safeParse(signUp);
    if (!parsed.success) {
      toast.error(parsed.error.errors[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { display_name: parsed.data.displayName },
      },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("auth.created"));
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-soft flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-gradient-hero items-center justify-center shadow-elevated mb-4">
            <Search className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">FoundIt</h1>
          <p className="text-muted-foreground mt-1">{t("auth.subtitle")}</p>
        </div>

        <Card className="p-6 shadow-elevated">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="signin">{t("auth.signIn")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.createAccount")}</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">{t("auth.email")}</Label>
                  <Input id="si-email" type="email" value={signIn.email}
                    onChange={(e) => setSignIn({ ...signIn, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pw">{t("auth.password")}</Label>
                  <Input id="si-pw" type="password" value={signIn.password}
                    onChange={(e) => setSignIn({ ...signIn, password: e.target.value })} />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="su-name">{t("auth.displayName")}</Label>
                  <Input id="su-name" value={signUp.displayName}
                    onChange={(e) => setSignUp({ ...signUp, displayName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">{t("auth.email")}</Label>
                  <Input id="su-email" type="email" value={signUp.email}
                    onChange={(e) => setSignUp({ ...signUp, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pw">{t("auth.password")}</Label>
                  <Input id="su-pw" type="password" value={signUp.password}
                    onChange={(e) => setSignUp({ ...signUp, password: e.target.value })} />
                </div>
                <Button className="w-full" type="submit" disabled={loading}>
                  {loading ? t("auth.creating") : t("auth.createAccount")}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}