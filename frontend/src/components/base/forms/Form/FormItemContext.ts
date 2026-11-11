import { createContext } from "react";

export const FormItemContext = createContext<{ id: string } | undefined>(undefined);
