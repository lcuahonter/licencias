/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // Aquí puedes agregar más variables si las necesitas
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}