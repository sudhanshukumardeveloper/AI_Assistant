import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        obsidian: "#0B0F17",
        slateglass: "#151D2A",
        indigo: "#6366F1",
        violet: "#8B5CF6",
        emerald: "#10B981",
        crimson: "#EF4444"
      }
    }
  },
  plugins: []
};

export default config;
