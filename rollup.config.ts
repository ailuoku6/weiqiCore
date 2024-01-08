import typescript from "rollup-plugin-typescript2";

export default {
    input: "src/index.ts",
    output: {
        file: "dist/index.js",
        format: "umd",
        name: "weiqi-core",
    },
    plugins: [
        typescript({
            tsconfig: "tsconfig.json",
        }),
    ],
};
