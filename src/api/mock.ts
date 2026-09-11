import type {
  MoveParams,
  PartInfo,
  PartNode,
  RotateParams,
  ScaleParams,
  VisibilityParams,
} from '@/types/catia'

/**
 * Mock 层：后端接口未就绪时的前端联调替身。
 * 通过环境变量 VITE_USE_MOCK 控制是否启用（true 启用），见 .env.development。
 * 接口函数在 src/api/catia.ts 中根据开关决定走 Mock 还是真实请求。
 */

/** 是否启用 Mock */
export const isMockEnabled = import.meta.env.VITE_USE_MOCK === 'true'

/** Mock 零件列表（模拟后端扁平结构返回） */
const mockParts: PartNode[] = [
  {
    name: 'lingjian.CATPart',
    full_name: 'E:\\office\\catiaParts\\lingjian.CATPart',
    path: 'E:\\office\\catiaParts',
  },
  {
    name: 'bracket.CATPart',
    full_name: 'E:\\office\\catiaParts\\bracket.CATPart',
    path: 'E:\\office\\catiaParts',
  },
  {
    name: 'cover.CATPart',
    full_name: 'E:\\office\\catiaParts\\cover.CATPart',
    path: 'E:\\office\\catiaParts',
  },
]

/** Mock 零件详情（模拟后端详情返回） */
const mockPartDetails: PartInfo[] = mockParts.map((part, index) => ({
  ...part,
  part_number: `零件${index + 1}`,
  saved: false,
  read_only: false,
  density: 1000,
  volume: 0.00005 + index * 0.00001,
  mass: 0.05 + index * 0.01,
}))

/** 模拟延时，还原真实请求的等待感 */
function delay<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

/** Mock：获取零件列表 */
export function mockFetchPartList(): Promise<PartNode[]> {
  return delay(mockParts)
}

/** Mock：获取零件详情 */
export function mockFetchPartInfo(id: string): Promise<PartInfo> {
  const info = mockPartDetails.find((part) => part.name === id || part.full_name === id)
  if (!info) {
    return Promise.reject(new Error(`未找到零件：${id}`))
  }
  return delay(info)
}

// 以下变换类接口依赖后端尚未提供的字段（位置 / 姿态 / 缩放 / 可见性等），
// 暂以空实现占位，待后端补齐字段与接口契约后再接入真实逻辑。

/** Mock：移动零件 */
export function mockMovePart(_id: string, _params: MoveParams): Promise<null> {
  return delay(null)
}

/** Mock：旋转零件 */
export function mockRotatePart(_id: string, _params: RotateParams): Promise<null> {
  return delay(null)
}

/** Mock：缩放零件 */
export function mockScalePart(_id: string, _params: ScaleParams): Promise<null> {
  return delay(null)
}

/** Mock：设置零件可见性 */
export function mockSetPartVisible(_id: string, _params: VisibilityParams): Promise<null> {
  return delay(null)
}

/** Mock：删除零件 */
export function mockDeletePart(_id: string): Promise<null> {
  return delay(null)
}