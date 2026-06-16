import typescript from "@rollup/plugin-typescript";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import dts from "rollup-plugin-dts";

/** @type {import("rollup").RollupOptions[]} */
const external = ["lucide"];

export default [
  {
    input: "src/index.ts",
    output: {
      file: "dist/index.js",
      format: "esm",
    },
    plugins: [
      nodeResolve({
        extensions: [".js", ".ts"],
      }),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
    external,
  },
  {
    input: "dist/types/index.d.ts",
    output: {
      file: "dist/index.d.ts",
      format: "esm",
    },
    plugins: [dts()],
    external,
  },
];
