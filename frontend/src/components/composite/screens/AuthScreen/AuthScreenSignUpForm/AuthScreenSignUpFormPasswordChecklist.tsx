import { useId } from "react";
import { passwordRule } from "@/components/composite/screens/AuthScreen/AuthScreenFieldRules";
import { cn } from "@/utils/cn";

const rules = [
  {
    label: "8 to 128 characters",
    met: (v: string) => passwordRule.longEnough(v) && passwordRule.shortEnough(v),
  },
  { label: "A letter", met: passwordRule.hasLetter },
  { label: "A number", met: passwordRule.hasNumber },
  { label: "A special character", hint: "not a letter, number or space", met: passwordRule.hasSpecial },
];

type Props = {
  password: string;
  className?: string;
};

export function AuthScreenSignUpFormPasswordChecklist({ password, className }: Props) {
  const titleId = useId();
  return (
    <div className={cn("rounded-md bg-muted px-3.5 py-3", className)}>
      <p id={titleId} className="mb-2 text-xs font-medium text-muted-foreground">
        Your password needs
      </p>
      <ul aria-labelledby={titleId} className="grid gap-1.5 sm:grid-cols-2">
        {rules.map((rule) => {
          const met = rule.met(password);
          return (
            <li
              key={rule.label}
              className={cn(
                "flex items-center gap-2 text-sm transition-colors",
                met ? "text-foreground" : "text-muted-foreground",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold transition",
                  met ? "bg-primary text-primary-foreground" : "border border-input",
                )}
              >
                {met ? "✓" : ""}
              </span>
              <span>
                {rule.label}
                {rule.hint && <span className="sr-only"> ({rule.hint})</span>}
              </span>
              <span className="sr-only">{met ? ": Done" : ": Not yet"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
