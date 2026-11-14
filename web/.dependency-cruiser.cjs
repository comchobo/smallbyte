/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment:
        "This dependency is part of a circular relationship. Revise the design so modules keep a single responsibility and dependencies flow one way.",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment:
        "This module depends on a module that cannot be found. Add missing npm packages to package.json or fix the import path.",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "no-non-package-json",
      severity: "error",
      comment:
        "This module depends on an npm package that isn't declared in package.json's dependencies.",
      from: {},
      to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
    },
    {
      name: "not-to-dev-dep",
      severity: "error",
      comment:
        "Production code must not depend on a devDependency. Runtime packages belong in dependencies.",
      from: {
        path: "^(app|components|lib)/",
        pathNot: "[.](?:spec|test)[.](?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$",
      },
      to: {
        dependencyTypes: ["npm-dev"],
        dependencyTypesNot: ["type-only"],
        pathNot: ["node_modules/@types/"],
      },
    },
    {
      name: "lib-not-to-app-or-components",
      severity: "error",
      comment:
        "Shared code in lib/ must stay independent of app routes and UI components.",
      from: { path: "^lib/" },
      to: { path: "^(app|components)/" },
    },
    {
      name: "components-not-to-app",
      severity: "error",
      comment: "UI components must not depend on app/ routes.",
      from: { path: "^components/" },
      to: { path: "^app/" },
    },
  ],
  options: {
    doNotFollow: { path: ["node_modules"] },
    exclude: { path: ["^node_modules", "^\\.next", "^next-env\\.d\\.ts$"] },
    tsConfig: { fileName: "tsconfig.json" },
    tsPreCompilationDeps: true,
    moduleSystems: ["es6", "cjs"],
    skipAnalysisNotInRules: true,
    reporterOptions: {
      dot: {
        collapsePattern: "node_modules/(?:@[^/]+/[^/]+|[^/]+)",
      },
    },
  },
};
