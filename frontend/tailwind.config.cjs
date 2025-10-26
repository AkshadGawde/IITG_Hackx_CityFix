/** Tailwind CSS config in CommonJS to avoid ESM scope issues */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.tsx",
    "./App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#1E40AF",
        "brand-lightblue": "#3B82F6",
        "brand-gray": "#F3F4F6",
        "brand-dark": "#1F2937",
      },
    },
  },
  plugins: [],
};
/** Tailwind config in CJS to avoid ESM scope issues */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./index.tsx",
    "./App.tsx",
  ],
  theme: {
    extend: {
      colors: {
        "brand-blue": "#1E40AF",
        "brand-lightblue": "#3B82F6",
        "brand-gray": "#F3F4F6",
        "brand-dark": "#1F2937",
      },
    },
  },
  plugins: [],
};
