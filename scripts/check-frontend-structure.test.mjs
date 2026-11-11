import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "check-frontend-structure.mjs");
const sandboxes = [];

const stub = "export const a = 1;\n";

const conforming = {
  "main.tsx": 'import { App } from "@/app/App";\nimport "@/index.css";\n',
  "index.css": "body {}\n",
  "app/App.tsx":
    'import { SessionProvider } from "@/providers/SessionProvider";\nimport { routes } from "@/app/routes";\n',
  "app/routes.tsx":
    'import { SignInPage } from "@/pages/(auth)/sign-in/SignInPage";\nimport { NotFoundPage } from "@/pages/not-found/NotFoundPage";\nimport { RequireSession } from "@/components/layout/route-guards/RequireSession";\n',
  "providers/SessionProvider.tsx": 'import { SessionContext } from "@/providers/session-context";\n',
  "providers/session-context.ts": stub,
  "hooks/useSession.ts": stub,
  "utils/cn.ts": stub,
  "utils/error-copy.ts": stub,
  "utils/auth-url.ts": stub,
  "utils/api/api-client.ts": stub,
  "utils/api/api-error.ts": stub,
  "utils/api/api-types.generated.ts": stub,
  "tests/support/render-app.tsx": stub,
  "components/primitives/Slot.tsx": stub,
  "components/base/buttons/Button.tsx":
    'import { Slot } from "@/components/primitives/Slot";\nimport { cn } from "@/utils/cn";\n',
  "components/base/buttons/Button.test.tsx": 'import { Button } from "@/components/base/buttons/Button";\n',
  "components/composite/screens/AuthScreen/AuthScreen.tsx":
    'import { AuthScreenForm } from "./AuthScreenForm";\nimport { AuthScreenFieldRules } from "./AuthScreenFieldRules";\nimport { Button } from "@/components/base/buttons/Button";\n',
  "components/composite/screens/AuthScreen/AuthScreenForm.tsx":
    'import { AuthScreenFieldRules } from "./AuthScreenFieldRules";\n',
  "components/composite/screens/AuthScreen/AuthScreenFieldRules.ts": stub,
  "components/composite/screens/AuthScreen/AuthScreenFieldRules.examples.ts": stub,
  "components/composite/screens/AuthScreen/AuthScreenFieldRules.test.tsx":
    'import "./AuthScreenFieldRules.examples";\n',
  "components/layout/route-guards/RequireSession.tsx": 'import { useSession } from "@/hooks/useSession";\n',
  "components/utility/PageLoader.tsx": stub,
  "pages/(auth)/sign-in/SignInPage.tsx":
    'import { useSession } from "@/hooks/useSession";\nimport { AuthScreen } from "@/components/composite/screens/AuthScreen/AuthScreen";\n',
  "pages/(auth)/sign-in/SignInPage.test.tsx": 'import { renderApp } from "@/tests/support/render-app";\n',
  "pages/not-found/NotFoundPage.tsx": stub,
};

function check(overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), "structure-"));
  sandboxes.push(dir);
  const root = join(dir, "src");
  const tree = { ...conforming, ...overrides };
  for (const [path, content] of Object.entries(tree)) {
    if (content === null) continue;
    const file = join(root, path);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content);
  }
  const run = spawnSync(process.execPath, [script, "--root", root], { encoding: "utf8" });
  return { status: run.status, out: `${run.stdout}${run.stderr}` };
}

function fails(overrides, rule, path) {
  const { status, out } = check(overrides);
  assert.equal(status, 1, out);
  assert.match(out, new RegExp(`${rule} ${path.replace(/[()./]/g, "\\$&")}`), out);
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

describe("structure check", () => {
  it("passes a conforming tree", () => {
    const { status, out } = check();
    assert.equal(status, 0, out);
  });

  it("section-unknown: a folder or file in components that is not a section", () => {
    fails({ "components/widgets/Thing.tsx": stub }, "section-unknown", "components/widgets");
    fails({ "components/Loose.tsx": stub }, "section-unknown", "components/Loose.tsx");
  });

  it("primitives-flat: primitives hold no folders", () => {
    fails({ "components/primitives/menus/Menu.tsx": stub }, "primitives-flat", "components/primitives/menus");
  });

  it("kind-folder: base, composite and layout hold only plural kebab-case kind folders", () => {
    fails({ "components/base/Card.tsx": stub }, "kind-folder", "components/base/Card.tsx");
    fails({ "components/base/button/Foo.tsx": stub }, "kind-folder", "components/base/button");
    fails({ "components/composite/Other/Other.tsx": stub }, "kind-folder", "components/composite/Other");
  });

  it("folder-casing: a folder inside a kind folder is a PascalCase component folder", () => {
    fails(
      { "components/base/buttons/inner-dir/Inner.tsx": stub },
      "folder-casing",
      "components/base/buttons/inner-dir",
    );
  });

  it("screen-folder: a Screen component lives in composite/screens", () => {
    fails(
      { "components/composite/forms/LoginScreen.tsx": stub },
      "screen-folder",
      "components/composite/forms/LoginScreen.tsx",
    );
  });

  it("component-folder-entry: a component folder holds an entry file named after it", () => {
    fails(
      { "components/composite/screens/Panel/PanelBody.tsx": stub },
      "component-folder-entry",
      "components/composite/screens/Panel",
    );
  });

  it("folder-prefix: every child starts with its folder's name", () => {
    fails(
      { "components/composite/screens/AuthScreen/Helper.tsx": stub },
      "folder-prefix",
      "components/composite/screens/AuthScreen/Helper.tsx",
    );
    fails(
      { "components/composite/screens/AuthScreen/Authority.tsx": stub },
      "folder-prefix",
      "components/composite/screens/AuthScreen/Authority.tsx",
    );
  });

  it("single-use-child: a child used by one sibling moves inside it", () => {
    fails(
      {
        "components/composite/screens/AuthScreen/AuthScreenHint.tsx": stub,
        "components/composite/screens/AuthScreen/AuthScreenForm.tsx":
          'import { AuthScreenFieldRules } from "./AuthScreenFieldRules";\nimport { AuthScreenHint } from "./AuthScreenHint";\n',
      },
      "single-use-child",
      "components/composite/screens/AuthScreen/AuthScreenHint.tsx",
    );
  });

  it("accepts a child nested inside the only sibling that uses it", () => {
    const { status, out } = check({
      "components/composite/screens/AuthScreen/AuthScreenForm/AuthScreenForm.tsx":
        'import { AuthScreenFormHint } from "./AuthScreenFormHint";\nimport { AuthScreenFieldRules } from "@/components/composite/screens/AuthScreen/AuthScreenFieldRules";\n',
      "components/composite/screens/AuthScreen/AuthScreenForm/AuthScreenFormHint.tsx": stub,
      "components/composite/screens/AuthScreen/AuthScreen.tsx":
        'import { AuthScreenForm } from "./AuthScreenForm/AuthScreenForm";\nimport { AuthScreenFieldRules } from "./AuthScreenFieldRules";\n',
      "components/composite/screens/AuthScreen/AuthScreenForm.tsx": null,
    });
    assert.equal(status, 0, out);
  });

  it("file-casing: kebab-case outside component folders, PascalCase inside them", () => {
    fails({ "utils/Format.ts": stub }, "file-casing", "utils/Format.ts");
    fails({ "tests/support/renderThing.tsx": stub }, "file-casing", "tests/support/renderThing.tsx");
    fails(
      { "components/composite/screens/AuthScreen/auth-screen-api.ts": stub },
      "file-casing",
      "components/composite/screens/AuthScreen/auth-screen-api.ts",
    );
    fails(
      { "components/base/buttons/button-extra.tsx": stub },
      "file-casing",
      "components/base/buttons/button-extra.tsx",
    );
  });

  it("page-name: a page file is <Name>Page", () => {
    fails({ "pages/(auth)/sign-up/SignUp.tsx": stub }, "page-name", "pages/(auth)/sign-up/SignUp.tsx");
  });

  it("hook-name and hook-location: hooks are useX and live in hooks/", () => {
    fails({ "hooks/getThing.ts": stub }, "hook-name", "hooks/getThing.ts");
    fails({ "utils/useThing.ts": stub }, "hook-location", "utils/useThing.ts");
  });

  it("hook-single-use: a hook in hooks/ is used by two or more files", () => {
    fails(
      {
        "hooks/useOnce.ts": stub,
        "components/layout/route-guards/RequireSession.tsx":
          'import { useSession } from "@/hooks/useSession";\nimport { useOnce } from "@/hooks/useOnce";\n',
      },
      "hook-single-use",
      "hooks/useOnce.ts",
    );
  });

  it("helper-concern: three helpers sharing a concern get a folder", () => {
    fails(
      {
        "utils/api/api-client.ts": null,
        "utils/api/api-error.ts": null,
        "utils/api/api-types.generated.ts": null,
        "utils/api-client.ts": stub,
        "utils/api-error.ts": stub,
        "utils/api-types.generated.ts": stub,
      },
      "helper-concern",
      "utils/api-client.ts",
    );
  });

  it("no-barrel: no index files and no re-export-only files", () => {
    fails({ "components/base/buttons/index.ts": stub }, "no-barrel", "components/base/buttons/index.ts");
    fails(
      {
        "utils/exports.ts": 'export * from "@/utils/cn";\nexport { errorCopy } from "@/utils/error-copy";\n',
      },
      "no-barrel",
      "utils/exports.ts",
    );
  });

  it("section-imports: sections import only toward behaviour-only ones", () => {
    fails(
      { "components/primitives/Slot.tsx": 'import { Button } from "@/components/base/buttons/Button";\n' },
      "section-imports",
      "components/primitives/Slot.tsx",
    );
    fails(
      { "components/base/buttons/Button.tsx": 'import { useSession } from "@/hooks/useSession";\n' },
      "section-imports",
      "components/base/buttons/Button.tsx",
    );
    fails(
      {
        "components/base/buttons/Button.tsx":
          'import { AuthScreen } from "@/components/composite/screens/AuthScreen/AuthScreen";\n',
      },
      "section-imports",
      "components/base/buttons/Button.tsx",
    );
  });

  it("resolves the @/ alias to the source root", () => {
    fails(
      { "components/primitives/Slot.tsx": 'import { Button } from "@/components/base/buttons/Button";\n' },
      "section-imports",
      "components/primitives/Slot.tsx",
    );
  });

  it("palette-colour: components, pages and the app use theme tokens, never a Tailwind palette colour", () => {
    const withClass = (className) => `export const a = <p className="${className}" />;
`;
    for (const className of [
      "text-indigo-600",
      "hover:bg-slate-100",
      "dark:text-indigo-400",
      "bg-fuchsia-500/25",
      "focus-visible:outline-indigo-500",
      "from-rose-50",
    ]) {
      fails(
        { "components/composite/screens/AuthScreen/AuthScreen.tsx": withClass(className) },
        "palette-colour",
        "components/composite/screens/AuthScreen/AuthScreen.tsx",
      );
    }
    fails(
      { "pages/not-found/NotFoundPage.tsx": withClass("border-red-500") },
      "palette-colour",
      "pages/not-found/NotFoundPage.tsx",
    );
    fails({ "app/App.tsx": withClass("fill-blue-600") }, "palette-colour", "app/App.tsx");
  });

  it("accepts theme tokens, and palette-like words that are not classes", () => {
    const { status, out } = check({
      "components/composite/screens/AuthScreen/AuthScreen.tsx": `import { AuthScreenForm } from "./AuthScreenForm";
import { AuthScreenFieldRules } from "./AuthScreenFieldRules";
export const a = <p className="bg-primary text-muted-foreground border-input ring-ring/50 text-destructive" title="red-1 text-red" />;
`,
      "pages/not-found/NotFoundPage.tsx": `export const notRed = "agreen-5 bg-black text-white";
`,
    });
    assert.equal(status, 0, out);
  });

  it("relative-import: ./ only between children of a component folder, never ../", () => {
    fails(
      { "providers/SessionProvider.tsx": 'import { SessionContext } from "./session-context";\n' },
      "relative-import",
      "providers/SessionProvider.tsx",
    );
    fails(
      { "app/App.tsx": 'import { SessionProvider } from "../providers/SessionProvider";\n' },
      "relative-import",
      "app/App.tsx",
    );
    fails(
      {
        "components/composite/screens/AuthScreen/AuthScreenForm.tsx":
          'import { AuthScreenFieldRules } from "../AuthScreen/AuthScreenFieldRules";\n',
      },
      "relative-import",
      "components/composite/screens/AuthScreen/AuthScreenForm.tsx",
    );
  });
});
