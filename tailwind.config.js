/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx}", "./index.{js,jsx}", "./src/**/*.{js,jsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        jakarta: ["PlusJakartaSans_400Regular"],
        "jakarta-semi": ["PlusJakartaSans_600SemiBold"],
        "jakarta-bold": ["PlusJakartaSans_700Bold"],
        "jakarta-extra": ["PlusJakartaSans_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
