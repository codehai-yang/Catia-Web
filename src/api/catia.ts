import http, { request } from './http'
import * as mock from './mock'
import type {
  MoveParams,
  PartInfo,
  PartNode,
  RotateParams,
  ScaleParams,
  VisibilityParams,
} from '@/types/catia'

/** 接口服务命名空间：统一收敛所有 CATIA 相关请求 */
export const catiaApi = {
  /** 获取零件列表（树） */
  fetchPartList(): Promise<PartNode[]> {
    return mock.isMockEnabled
      ? mock.mockFetchPartList()
      : request<PartNode[]>({ url: '/v1/catia/listparts', method: 'POST' })
  },

  /** 获取零件属性详情（后端 selectpart 返回列表，取首个匹配结果） */
  fetchPartInfo(partName: string): Promise<PartInfo> {
    return mock.isMockEnabled
      ? mock.mockFetchPartInfo(partName)
      : request<PartInfo[]>({ url: '/v1/catia/selectpart', method: 'POST', data: partName }).then(
          (list) => list[0]!,
        )
  },

  /** 获取零件 GLB 数据（后端直接返回二进制，用 arraybuffer 接收），用于 3D 视口展示 */
  getPartGlb(fullName: string): Promise<ArrayBuffer> {
    return http
      .post<ArrayBuffer>('/v1/catia/getglb', fullName, { responseType: 'arraybuffer' })
      .then((res) => res.data)
  },

  /** 移动零件（相对位移） */
  movePart(id: string, params: MoveParams): Promise<null> {
    return mock.isMockEnabled
      ? mock.mockMovePart(id, params)
      : request<null>({ url: `/catia/parts/${id}/move`, method: 'POST', data: params })
  },

  /** 旋转零件 */
  rotatePart(id: string, params: RotateParams): Promise<null> {
    return mock.isMockEnabled
      ? mock.mockRotatePart(id, params)
      : request<null>({ url: `/catia/parts/${id}/rotate`, method: 'POST', data: params })
  },

  /** 缩放零件 */
  scalePart(id: string, params: ScaleParams): Promise<null> {
    return mock.isMockEnabled
      ? mock.mockScalePart(id, params)
      : request<null>({ url: `/catia/parts/${id}/scale`, method: 'POST', data: params })
  },

  /** 设置零件可见性（隐藏 / 显示） */
  setPartVisible(id: string, params: VisibilityParams): Promise<null> {
    return mock.isMockEnabled
      ? mock.mockSetPartVisible(id, params)
      : request<null>({ url: `/catia/parts/${id}/visibility`, method: 'PATCH', data: params })
  },

  /** 删除零件 */
  deletePart(id: string): Promise<null> {
    return mock.isMockEnabled
      ? mock.mockDeletePart(id)
      : request<null>({ url: `/catia/parts/${id}`, method: 'DELETE' })
  },
}