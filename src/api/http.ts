import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from '@/types/catia'

/** 业务成功状态码 */
const SUCCESS_CODE = 200

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT = 30_000

/**
 * axios 实例：统一基础地址、超时与拦截器。
 * 基础地址与 Mock 开关均来自环境变量，见 .env.development / .env.production。
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
})

// 请求拦截器：预留公共请求头（如登录态 Token）注入点
http.interceptors.request.use((config) => {
  // const token = getToken()
  // if (token) {
  //   config.headers.Authorization = `Bearer ${token}`
  // }
  return config
})

// 响应拦截器：统一解包业务状态码，非 200 时弹出错误提示并中断
http.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown>
    if (body && typeof body.code === 'number' && body.code !== SUCCESS_CODE) {
      ElMessage.error(body.message || '请求失败')
      return Promise.reject(new Error(body.message || '请求失败'))
    }
    return response
  },
  (error) => {
    const message = extractErrorMessage(error)
    ElMessage.error(message)
    return Promise.reject(error)
  },
)

/** 从 axios 异常中提取可读的错误信息 */
function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || '网络异常，请稍后重试'
  }
  return '网络异常，请稍后重试'
}

/**
 * 发起请求并解包统一响应体，返回业务数据。
 *
 * @param config axios 请求配置
 * @returns 业务数据（响应体中的 data 字段）
 */
export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config)
  return response.data.data
}

export default http