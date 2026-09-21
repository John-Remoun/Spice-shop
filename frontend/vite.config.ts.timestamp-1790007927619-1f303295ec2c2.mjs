// vite.config.ts
import { defineConfig } from "file:///D:/Projects/Spice%20shop/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Projects/Spice%20shop/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///D:/Projects/Spice%20shop/frontend/node_modules/vite-plugin-pwa/dist/index.js";
import { fileURLToPath, URL } from "node:url";
var __vite_injected_original_import_meta_url = "file:///D:/Projects/Spice%20shop/frontend/vite.config.ts";
var vite_config_default = defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Spice shop",
        short_name: "Spice shop",
        description: "Herbal, Spice & Natural Cosmetics Micro-ERP",
        theme_color: "#4B5A3E",
        // forest green — kept in sync with tailwind.config.ts `brand.forest`
        background_color: "#F5F0E6",
        // warm sand
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/favicon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "/favicon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico}"]
      }
    })
  ],
  server: { port: 5173 }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxQcm9qZWN0c1xcXFxTcGljZSBzaG9wXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJEOlxcXFxQcm9qZWN0c1xcXFxTcGljZSBzaG9wXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9EOi9Qcm9qZWN0cy9TcGljZSUyMHNob3AvZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBWaXRlUFdBIH0gZnJvbSAndml0ZS1wbHVnaW4tcHdhJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGgsIFVSTCB9IGZyb20gJ25vZGU6dXJsJztcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICB9LFxuICB9LFxuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICBWaXRlUFdBKHtcbiAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgaW5jbHVkZUFzc2V0czogWydmYXZpY29uLnN2ZyddLFxuICAgICAgbWFuaWZlc3Q6IHtcbiAgICAgICAgbmFtZTogJ1NwaWNlIHNob3AnLFxuICAgICAgICBzaG9ydF9uYW1lOiAnU3BpY2Ugc2hvcCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnSGVyYmFsLCBTcGljZSAmIE5hdHVyYWwgQ29zbWV0aWNzIE1pY3JvLUVSUCcsXG4gICAgICAgIHRoZW1lX2NvbG9yOiAnIzRCNUEzRScsIC8vIGZvcmVzdCBncmVlbiBcdTIwMTQga2VwdCBpbiBzeW5jIHdpdGggdGFpbHdpbmQuY29uZmlnLnRzIGBicmFuZC5mb3Jlc3RgXG4gICAgICAgIGJhY2tncm91bmRfY29sb3I6ICcjRjVGMEU2JywgLy8gd2FybSBzYW5kXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgc3RhcnRfdXJsOiAnLycsXG4gICAgICAgIGljb25zOiBbXG4gICAgICAgICAgeyBzcmM6ICcvZmF2aWNvbi5zdmcnLCBzaXplczogJzE5MngxOTInLCB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsIHB1cnBvc2U6ICdhbnknIH0sXG4gICAgICAgICAgeyBzcmM6ICcvZmF2aWNvbi5zdmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCcsIHB1cnBvc2U6ICdtYXNrYWJsZScgfSxcbiAgICAgICAgXSxcbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7XG4gICAgICAgIGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxzdmcscG5nLGljb30nXSxcbiAgICAgIH0sXG4gICAgfSksXG4gIF0sXG4gIHNlcnZlcjogeyBwb3J0OiA1MTczIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVIsU0FBUyxvQkFBb0I7QUFDdFQsT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUN4QixTQUFTLGVBQWUsV0FBVztBQUgwSSxJQUFNLDJDQUEyQztBQUs5TixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLGNBQWMsSUFBSSxJQUFJLFNBQVMsd0NBQWUsQ0FBQztBQUFBLElBQ3REO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sUUFBUTtBQUFBLE1BQ04sY0FBYztBQUFBLE1BQ2QsZUFBZSxDQUFDLGFBQWE7QUFBQSxNQUM3QixVQUFVO0FBQUEsUUFDUixNQUFNO0FBQUEsUUFDTixZQUFZO0FBQUEsUUFDWixhQUFhO0FBQUEsUUFDYixhQUFhO0FBQUE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBO0FBQUEsUUFDbEIsU0FBUztBQUFBLFFBQ1QsV0FBVztBQUFBLFFBQ1gsT0FBTztBQUFBLFVBQ0wsRUFBRSxLQUFLLGdCQUFnQixPQUFPLFdBQVcsTUFBTSxpQkFBaUIsU0FBUyxNQUFNO0FBQUEsVUFDL0UsRUFBRSxLQUFLLGdCQUFnQixPQUFPLFdBQVcsTUFBTSxpQkFBaUIsU0FBUyxXQUFXO0FBQUEsUUFDdEY7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUCxjQUFjLENBQUMsZ0NBQWdDO0FBQUEsTUFDakQ7QUFBQSxJQUNGLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxRQUFRLEVBQUUsTUFBTSxLQUFLO0FBQ3ZCLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
