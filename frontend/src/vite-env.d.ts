/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_DEFAULT_MAP_LAT?: string;
  readonly VITE_DEFAULT_MAP_LNG?: string;
  readonly VITE_DEFAULT_MAP_ZOOM?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
