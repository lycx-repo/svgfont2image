import { expect, test } from 'vitest'
import { getPathBbox } from '../lib/main'
test('bbox', () => {
    const d1 = 'M-2 -113L25 -145L165 -27L305 -144L332 -112L198 0L332 112L304 145L165 28L26 145L-2 112L132 0L-2 -113Z'
    // console.log(getPathBbox(d1))
    expect(getPathBbox(d1)).toEqual({x: -2, y: -145, w: 334, h: 290})
})