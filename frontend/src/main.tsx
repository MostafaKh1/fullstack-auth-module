import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { App } from "./app/App";
import { createQueryClient } from "./app/query-client";
import { routes } from "./app/routes";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

createRoot(root).render(
  <StrictMode>
    <App router={createBrowserRouter(routes)} queryClient={createQueryClient()} />
  </StrictMode>,
);
