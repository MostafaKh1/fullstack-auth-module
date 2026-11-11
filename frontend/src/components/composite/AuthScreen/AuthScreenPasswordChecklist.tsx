import { useId } from "react";
import { cn } from "../../../utils/cn";
import { passwordRule } from "./AuthScreenFieldRules";

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

/** The Sign up password policy as a checklist that ticks off each rule as the typed password meets it. */
export function AuthScreenPasswordChecklist({ password, className }: Props) {
  const titleId = useId();
  return (
    <div className={cn("rounded-xl bg-slate-50 px-3.5 py-3 dark:bg-slate-800/50", className)}>
      <p id={titleId} className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
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
                met ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold transition",
                  met
                    ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950"
                    : "border border-slate-300 dark:border-slate-600",
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
