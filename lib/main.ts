import { Bbox } from "./modified/bbox";
import { parsePathData, parsePathDataStr } from "./modified/path-data";
export * from './utils'

export const pathDataToPathText = parsePathDataStr
export const pathTextToPathData = parsePathData
export const getPathBbox = Bbox.path

