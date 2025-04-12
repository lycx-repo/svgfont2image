import { Bbox } from "./modified/bbox.js"
import { parsePathData, parsePathDataStr } from "./modified/path-data.js"
import { XMLParser } from "fast-xml-parser";
import { getBase64 } from "./modified/svg64";
import { encode, decode } from "html-entities"

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '_' });

export function parseSvgFontText(svgStr: string) {
  const svgJson = parser.parse(svgStr)
  const font = svgJson.svg.defs.font
  return { 
    json: svgJson,
    getGlyph(unicode: string): SvgImageOptions {
      let m_unicode = unicode
      if (/^&/.test(m_unicode)) {
        m_unicode = decode(m_unicode)
      }
      if (!/^&/.test(m_unicode)) {
        m_unicode = encode(m_unicode, { mode: 'extensive' })
      }
      const glyph = font.glyph.find((v: any) => {
        let v_unicode = v._unicode
        if (!/^&/.test(v_unicode)) {
          v_unicode = encode(v_unicode, { mode: 'extensive' })
        }
        return v_unicode.toLowerCase() === m_unicode.toLowerCase()
      })
      if (!glyph) {
        throw new Error('can not found the unicode: ' + unicode + '/' + m_unicode  )
      }
      return { d: glyph._d }
    }
  }
}

type SvgImageOptions = { d: string }
export function createSvgImage(v: SvgImageOptions) {
    const pathData = parsePathData(v.d)
    const newPathData = scaleAndShiftPathData(pathData, 1, -1, 0, 0)
    const newPathStr = parsePathDataStr(newPathData)

    const bboxRes = Bbox.path(newPathStr) as any
    const newBbox = [bboxRes.x, bboxRes.y, bboxRes.w, bboxRes.h].join(' ')
    const data = `
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        xmlns:xlink="http://www.w3.org/1999/xlink" 
        version="1.1" 
        viewBox="${newBbox}"
        preserveAspectRatio="xMinYMin meet"
    >
        <path d="${newPathStr}" />
    </svg>`
    return { data, width: bboxRes.w, height: bboxRes.h }
}

export const svgImageTextToBase64 = getBase64

/**
 * scale pathData
 */
function scaleAndShiftPathData(pathData: any, scaleX=1, scaleY=1, shiftX=0, shiftY=0) {
    let pathDataScaled = [] as any[];
    pathData.forEach((com: any) => {
      let [type, values] = [com.type, com.values];
      let typeL = type.toLowerCase();
      let valuesL = values.length;
      let valsScaled = [];
  
      switch (typeL) {
        case "z":
          pathDataScaled.push(com);
          break;
  
        default:
          if (valuesL) {
            valsScaled = [];
            for (let i = 0; i < values.length; i += 2) {
              let x = values[i] * scaleX + shiftX;
              let y = values[i + 1] * scaleY + shiftY;
              valsScaled.push(x, y);
            }
            pathDataScaled.push({ type: type, values: valsScaled });
          }
      }
    });
    return pathDataScaled;
  }