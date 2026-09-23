import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This config just says: "whenever the frontend asks for
// something starting with /products, forward it to the
// backend server running on port 5000."
export default defineConfig({
  plugins: [react()],
  // server: {
  //   port: 5173,
  //   proxy: {
  //     "/products": "http://localhost:5000"
  //   }
  // }
});
