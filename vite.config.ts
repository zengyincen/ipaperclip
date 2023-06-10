import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { minify } from "html-minifier";

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  const needSSL: boolean = false;
  return {
    build: {
      outDir: "dist/web",
      sourcemap: "hidden",
      rollupOptions: {
        output: {
          entryFileNames: "assets/[hash].js",
          chunkFileNames: "assets/[hash].js",
          assetFileNames: "assets/[hash][extname]",
        },
      },
    },
    server: {
      host: "0.0.0.0",
      https: needSSL,
    },
    envPrefix: ["VITE_", "TencentCDN_"],
    plugins: [
      vue(),
      {
        ...basicSsl(),
        apply: needSSL ? "serve" : command === "serve" ? "build" : "serve",
      },
      {
        name: "html",
        apply: "build",
        transformIndexHtml(html) {
          return minify(
            html.replace(
              "<!-- CloudFlareWebAnalytics -->",
              `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "a9d6db727c5a4b3483f3bb80358921ed"}'></script>`
            ),
            {
              collapseWhitespace: true,
              removeComments: true,
              minifyJS: true,
              minifyCSS: true,
            }
          );
        },
      },
      {
        name: "move-sourcemap-plugin",
        apply: "build",
        closeBundle() {
          try {
            const assetsPath = path.resolve(__dirname, "dist/web/assets/");
            const mapPath = path.resolve(__dirname, "dist/map/");

            const files = fs.readdirSync(assetsPath);
            const mapFiles = files.filter((file) => file.endsWith(".js.map"));
            fs.mkdirSync(mapPath, { recursive: true });
            mapFiles.forEach((file) => {
              const sourcePath = path.join(assetsPath, file);
              const destinationPath = path.join(mapPath, file);

              fs.renameSync(sourcePath, destinationPath);
            });
            console.log("🎉 Sourcemap moved successfully!");
          } catch (err) {
            console.error("Error moving Sourcemap:", err);
          }
        },
      },
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
  };
});
