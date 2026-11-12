import { createContext } from "react";

export const FormFieldContext = createContext<{ name: string } | undefined>(undefined);
