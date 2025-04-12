// copy and modify form: https://github.com/herrstrietzel/getPathData2

export function parsePathData(d) {
    let pathData = parseDotPathData(d)
    // normalize options
    const options = {
        toAbsolute: true,
        arcToCubic: true,
        arcAccuracy: 1,
        quadraticToCubic: true,
        toLonghands: true,
    }
    pathData = convertPathData(pathData, options)
    return pathData
}

export function parseDotPathData(d) {
    let dClean = d
        // remove new lines and tabs
        .replace(/[\n\r\t]/g, "")
        // replace comma with space
        .replace(/,/g, " ")
        // add space before minus sign
        .replace(/(\d+)(\-)/g, "$1 $2")
        // decompose multiple adjacent decimal delimiters like 0.5.5.5 => 0.5 0.5 0.5
        .replace(/(\.)(?=(\d+\.\d+)+)(\d+)/g, "$1$3 ")
        // add new lines before valid command letters
        .replace(/([mlcsqtahvz])/gi, "\n$1 ")
        // remove duplicate whitespace
        .replace(/\ {2,}/g, " ")
        // remove whitespace from right and left
        .trim();

    // split commands
    let commands = dClean.split("\n").map((val) => {
        return val.trim();
    });

    // compile pathData
    let pathData = [];
    let comLengths = { m: 2, a: 7, c: 6, h: 1, l: 2, q: 4, s: 4, t: 2, v: 1, z: 0 };
    let errors = [];

    // normalize convatenated larceArc and sweep flags
    const unravelArcValues = (values)=>{
        let chunksize=7, n=0, arcComs=[]
        for (let i = 0; i < values.length; i++) {
            let com = values[i]
        
            // reset counter
            if (n >= chunksize) {
                n = 0
            }
            // if 3. or 4. parameter longer than 1
            if ((n === 3 || n === 4) && com.length > 1) {
        
                let largeArc = n === 3 ? com.substring(0, 1) : ''
                let sweep = n === 3 ? com.substring(1, 2) : com.substring(0, 1)
                let finalX = n === 3 ? com.substring(2) : com.substring(1)
                let comN = [largeArc, sweep, finalX].filter(Boolean)
                arcComs.push(comN)
                n+=comN.length
        
            } else {
                // regular
                arcComs.push(com)
                n++
            }
        }
        return arcComs.flat().filter(Boolean);
    }

    for (let i = 0; i < commands.length; i++) {
        let com = commands[i].split(" ");
        let type = com.shift();
        let typeRel = type.toLowerCase();
        let isRel = type === typeRel;

        /**
         * large arc and sweep flags
         * are boolean and can be concatenated like
         * 11 or 01
         * or be concatenated with the final on path points like
         * 1110 10 => 1 1 10 10
         */
        if (typeRel === "a") {
            com = unravelArcValues(com)
        }

        // convert to numbers
        let values = com.map((val) => {
            return parseFloat(val);
        });

        // if string contains repeated shorthand commands - split them
        let chunkSize = comLengths[typeRel];
        let chunk = values.slice(0, chunkSize);
        pathData.push({ type: type, values: chunk });

        // too few values
        if (chunk.length < chunkSize) {
            errors.push(
                `${i}. command (${type}) has ${chunk.length}/${chunkSize} values - ${chunkSize - chunk.length} too few`
            );
        }

        // has implicit commands
        if (values.length > chunkSize) {
            let typeImplicit = typeRel === "m" ? (isRel ? "l" : "L") : type;
            for (let i = chunkSize; i < values.length; i += chunkSize) {
                let chunk = values.slice(i, i + chunkSize);
                pathData.push({ type: typeImplicit, values: chunk });
                if (chunk.length !== chunkSize) {
                    errors.push(
                        `${i}. command (${type}) has ${chunk.length + chunkSize}/${chunkSize} - ${chunk.length} values too many `
                    );
                }
            }
        }
    }
    if (errors.length) {
        console.log(errors);
    }

    /**
     * first M is always absolute/uppercase -
     * unless it adds relative linetos
     * (facilitates d concatenating)
     */
    pathData[0].type = 'M'
    return pathData;
}


function convertPathData(pathData, options) {

    // analyze pathdata
    let commandTokens = pathData.map(com => { return com.type }).join('')
    let hasRel = /[astvqmhlc]/g.test(commandTokens);
    let hasShorthands = /[hstv]/gi.test(commandTokens);
    let hasQuadratics = /[qt]/gi.test(commandTokens);
    let hasArcs = /[a]/gi.test(commandTokens);

    // merge default options
    let defaults = {
        toAbsolute: true,
        toRelative: false,
        quadraticToCubic: false,
        toLonghands: true,
        toShorthands: false,
        arcToCubic: false,
        arcAccuracy: 1,
        decimals: -1,
    }

    options = {
        ...defaults,
        ...options
    }

    let { toAbsolute, toRelative, quadraticToCubic, toLonghands, toShorthands, arcToCubic, arcAccuracy, decimals } = options;

    // nothing to convert – passthrough
    if (!hasRel && !hasShorthands && !hasQuadratics && !hasArcs && !toRelative && !toShorthands) {
        return pathData
    }

    /**
     * convert to absolute
     */

    // add M
    let pathDataAbs = [pathData[0]];
    let lastX = pathData[0].values[0];
    let lastY = pathData[0].values[1];
    let offX = lastX;
    let offY = lastY;


    /**
     * arcToCubic, quadraticToCubic, toLonghands  
     * will force toAbsolute conversion
     */

    if (arcToCubic || toLonghands || quadraticToCubic) {
        toAbsolute = true
    }

    for (let i = 1; i < pathData.length; i++) {
        let com = pathData[i];
        let { type, values } = com;
        let typeRel = type.toLowerCase();
        let typeAbs = type.toUpperCase();
        let valuesL = values.length;
        let isRelative = type === typeRel;
        let comPrev = pathData[i - 1];
        let valuesPrev = comPrev.values;
        let valuesPrevL = valuesPrev.length;
        let p0 = { x: valuesPrev[valuesPrevL - 2], y: valuesPrev[valuesPrevL - 1] };

        if (isRelative && toAbsolute) {
            com.type = typeAbs;
            switch (typeRel) {
                case "a":
                    com.values = [
                        values[0],
                        values[1],
                        values[2],
                        values[3],
                        values[4],
                        values[5] + offX,
                        values[6] + offY
                    ];
                    break;


                case "h":
                case "v":
                    com.values = type === 'h' ? [values[0] + offX] : [values[0] + offY];
                    break;

                case 'm':
                case 'l':
                case 't':
                    com.values = [values[0] + offX, values[1] + offY]
                    break;

                case "c":
                    com.values = [
                        values[0] + offX,
                        values[1] + offY,
                        values[2] + offX,
                        values[3] + offY,
                        values[4] + offX,
                        values[5] + offY
                    ];
                    break;

                case "q":
                case "s":
                    com.values = [
                        values[0] + offX,
                        values[1] + offY,
                        values[2] + offX,
                        values[3] + offY,
                    ];
                    break;
            }
        }
        // is absolute
        else {
            offX = 0;
            offY = 0;
        }

        /**
         * convert shorthands
         */
        if (toLonghands && hasShorthands || (com.type === 'T' && quadraticToCubic)) {
            let cp1X, cp1Y, cpN1X, cpN1Y, cp2X, cp2Y;
            if (com.type === 'H' || com.type === 'V') {
                com.values = com.type === 'H' ? [com.values[0], lastY] : [lastX, com.values[0]];
                com.type = 'L';
            }
            else if (com.type === 'T' || com.type === 'S') {

                [cp1X, cp1Y] = [valuesPrev[0], valuesPrev[1]];
                [cp2X, cp2Y] = valuesPrevL > 2 ? [valuesPrev[2], valuesPrev[3]] : [valuesPrev[0], valuesPrev[1]];

                // new control point
                cpN1X = com.type === 'T' ? lastX + (lastX - cp1X) : 2 * lastX - cp2X;
                cpN1Y = com.type === 'T' ? lastY + (lastY - cp1Y) : 2 * lastY - cp2Y;

                com.values = [cpN1X, cpN1Y, com.values].flat();
                com.type = com.type === 'T' ? 'Q' : 'C';
            }
        }

        // convert quadratic to cubic
        if (quadraticToCubic && hasQuadratics && com.type === 'Q') {
            com = quadratic2Cubic(p0, com.values)
        }

        //convert arcs to cubics
        if (arcToCubic && hasArcs && com.type === 'A') {
            // add all C commands instead of Arc
            let cubicArcs = arcToBezier({ x: lastX, y: lastY }, com.values, arcAccuracy);
            cubicArcs.forEach((cubicArc) => {
                pathDataAbs.push(cubicArc);
            });

        } else {
            // add command
            pathDataAbs.push(com)
        }

        // update offsets
        lastX = valuesL > 1 ? values[valuesL - 2] + offX : (typeRel === 'h' ? values[0] + offX : lastX);
        lastY = valuesL > 1 ? values[valuesL - 1] + offY : (typeRel === 'v' ? values[0] + offY : lastY);
        offX = lastX;
        offY = lastY;
    };

    return pathDataAbs;
}
export function parsePathDataStr(pathData, options = {}) {

    let defaults = {
        // shorthand for toRelative, toShorthandshands
        optimize: false,
        toAbsolute: false,
        toRelative: false,
        quadraticToCubic: false,
        toLonghands: false,
        cleanClosePath: false,

        // arcs to cubic bezier
        arcToCubic: false,
        arcAccuracy: 1,

        //only for set pathdata
        minify: false,
        decimals: -1, //rounding
        toShorthands: false, //apply shorthands
    }

    // merge defaults
    options = {
        ...defaults,
        ...options
    }

    let { optimize, decimals, minify, toRelative, toAbsolute, quadraticToCubic, arcToCubic, arcAccuracy, toLonghands, toShorthands, cleanClosePath } = options

    if (optimize) {
        toShorthands = true
        toRelative = true
        decimals = 3,
            cleanClosePath = true
    }

    if (cleanClosePath && lastCom.type.toLowerCase() === 'z') {

        let secondLast = pathData[pathData.length - 2];
        let secondLastValues = secondLast.values

        //let lastCurve
        if (secondLast.type === 'L' && secondLast.values.join(',') === pathData[0].values.join(',')) {
            //remove last lineto
            pathData.splice(pathData.length - 2, 1)
        }

        if (secondLast.type !== 'L' && [secondLastValues[secondLastValues.length - 2], secondLastValues[secondLastValues.length - 1]].join(',') === pathData[0].values.join(',')) {
            // remove last command
            pathData.pop()
        }
    }

    if (quadraticToCubic || arcToCubic) {
        pathData = convertPathData(pathData, options)
    }

    let d = pathDataToD(pathData, decimals, minify);
    return d
}
/**
* serialize pathData array to 
* d attribute string 
*/
function pathDataToD(pathData, decimals = -1, minify = false) {
    // implicit l command
    if (pathData[1].type === "l" && minify) {
        pathData[0].type = "m";
    }
    let d = `${pathData[0].type}${pathData[0].values.join(" ")}`;
    for (let i = 1; i < pathData.length; i++) {
        let com0 = pathData[i - 1];
        let com = pathData[i];

        let type = (com0.type === com.type && minify) ?
            " " : (
                (com0.type === "m" && com.type === "l") ||
                (com0.type === "M" && com.type === "l") ||
                (com0.type === "M" && com.type === "L")
            ) && minify ?
                " " : com.type;

        // round
        if (com.values.length && decimals >= 0) {
            com.values = com.values.map(val => { return +val.toFixed(decimals) })
        }
        d += `${type}${com.values.join(" ")}`;
    }


    if (minify) {
        d = d
            .replaceAll(" 0.", " .")
            .replaceAll(" -", "-")
            .replaceAll("-0.", "-.")
            .replace(/\s+([mlcsqtahvz])/gi, "$1")
            .replaceAll("Z", "z");
    }

    return d;
}
/**
 * convert quadratic commands to cubic
 */
function quadratic2Cubic(p0, com) {
    if (Array.isArray(p0)) {
        p0 = {
            x: p0[0],
            y: p0[1]
        }
    }
    let cp1 = {
        x: p0.x + 2 / 3 * (com[0] - p0.x),
        y: p0.y + 2 / 3 * (com[1] - p0.y)
    }
    let cp2 = {
        x: com[2] + 2 / 3 * (com[0] - com[2]),
        y: com[3] + 2 / 3 * (com[1] - com[3])
    }
    return ({ type: "C", values: [cp1.x, cp1.y, cp2.x, cp2.y, com[2], com[3]] });
}