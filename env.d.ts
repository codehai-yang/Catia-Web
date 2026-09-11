/// <reference types="vite/client" />

/** 环境变量类型声明，见 .env.development / .env.production */
interface ImportMetaEnv {
  /** 后端接口基础地址 */
  readonly VITE_API_BASE_URL: string
  /** 是否启用 Mock（与后端并行开发阶段置 true） */
  readonly VITE_USE_MOCK: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
