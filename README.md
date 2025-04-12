# SvgFont to Image
if you generated a svgfont from .ttf or others file format, you mabe got a svg file likes this
``` xml
<?xml version="1.0" standalone="no"?>
<svg>
  <defs>
    <font id="xxx" horiz-adv-x="1000" vert-adv-y="1000" >
      <font-face />
      <glyph glyph-name="x" unicode="&#x78;" horiz-adv-x="100" d="M20 20 L50 20 L50 -20 Z" />
    </font>
  </defs>
</svg>
```
the library can convent the svgfont to svg image or svg base64

## Useage
``` shell
npm i @lycx/svgfont2image"
```
``` js
import { parseSvgFontText, createSvgImage } from '@lycx/svgfont2image'
const svg = parseSvgFontText(svgfile)
const svgImage = createSvgImage(glyph)
const svgText = svgImage.text // <svg> ... </svg>

// if you want to use the base64 format
import { svgImageTextToBase64 } from '@lycx/svgfont2image'
const svgBase64 = svgImageTextToBase64(svgImage.text)
```