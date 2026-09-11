/**
 * CATIA 领域模型与接口契约类型定义。
 *
 * 后端基于 FastAPI 实现，路由前缀约定为 `/api/catia`，
 * 统一响应体为 {@link ApiResponse}（code 为 200 表示成功）。
 */

/** 三维坐标 / 向量 */
export interface Vector3 {
  /** X 轴分量（单位：mm） */
  x: number
  /** Y 轴分量（单位：mm） */
  y: number
  /** Z 轴分量（单位：mm） */
  z: number
}

/** 旋转轴 */
export type RotateAxis = 'x' | 'y' | 'z'

/** 零件节点类型 */
export type PartNodeType = 'product' | 'part' | 'geometrical-set'

/** 零件树节点（用于左侧零件列表） */
export interface PartNode {
  /** 零件名称 */
  name: string
  full_name: string
  path: string
}

/** 零件属性详情 */
export interface PartInfo {
  /** 零件名称 */
  name: string
  /** 完整名称 */
  full_name: string
  /** 路径 */
  path: string
  /** 零件号 */
  part_number: string
  saved: boolean
  read_only: boolean
  density: number
  volume: number
  mass: number
}

/** 移动零件请求参数（相对位移） */
export interface MoveParams {
  /** X 轴位移（mm） */
  dx: number
  /** Y 轴位移（mm） */
  dy: number
  /** Z 轴位移（mm） */
  dz: number
}

/** 旋转零件请求参数 */
export interface RotateParams {
  /** 旋转轴 */
  axis: RotateAxis
  /** 旋转角度（度，正值逆时针） */
  angle: number
}

/** 缩放零件请求参数 */
export interface ScaleParams {
  /** 缩放比例（大于 0，1 表示不变） */
  factor: number
}

/** 可见性请求参数 */
export interface VisibilityParams {
  /** true：显示，false：隐藏 */
  visible: boolean
}

/** 后端统一响应体 */
export interface ApiResponse<T> {
  /** 业务状态码，200 表示成功 */
  code: number
  /** 提示信息 */
  message: string
  /** 业务数据 */
  data: T
}