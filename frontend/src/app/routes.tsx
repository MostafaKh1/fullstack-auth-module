import type { RouteObject } from "react-router";
import { NotFoundPage } from "../pages/not-found-page";
import { PlaceholderPage } from "../pages/placeholder-page";

/** The one route table, shared by the browser router and the test harness. */
export const routes: RouteObject[] = [
  { path: "/", element: <PlaceholderPage /> },
  { path: "*", element: <NotFoundPage /> },
];
