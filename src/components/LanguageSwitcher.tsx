import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";

const langs = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "mk", label: "Македонски", flag: "🇲🇰" },
  { code: "sq", label: "Shqip", flag: "🇦🇱" },
];

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const current = langs.find((l) => i18n.language?.startsWith(l.code)) ?? langs[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" aria-label="Change language">
          <Globe className="h-4 w-4 md:mr-2" />
          <span className="hidden md:inline text-xs uppercase tracking-wider">{current.code}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px]">
        {langs.map((l) => (
          <DropdownMenuItem key={l.code} onClick={() => i18n.changeLanguage(l.code)} className="gap-2">
            <span>{l.flag}</span>
            <span>{l.label}</span>
            {current.code === l.code && <span className="ml-auto text-primary">●</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};