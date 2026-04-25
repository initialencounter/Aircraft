export type Point = [number, number];

/**
 * 将 YOLO 输出的 xy 轮廓点（N×2）转为 4 个顶点的多边形。
 * 算法：预处理简化 → 凸包 → Douglas-Peucker 迭代，直到点数 <= 4。
 * 返回 [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]。
 */
export function maskXYTo4ptPolygon(mask_xy: Float32Array | number[][]): Point[] {
    // ---- 1. 统一转为 Point 数组 ----
    const pts = toPoints(mask_xy);
    if (pts.length < 3) {
        return minAreaRectToPoints(pts);
    }

    // ---- 2. 预处理：移除共线点，减少后续计算量 ----
    const simplified = simplifyContour(pts);

    // ---- 3. 求凸包 ----
    const hull = convexHull(simplified);

    if (hull.length <= 4) {
        return hull.length === 4 ? hull : minAreaRectToPoints(pts);
    }

    // ---- 4. 迭代 Douglas-Peucker，逐步增大 epsilon 直至点数 <= 4 ----
    const perimeter = polygonLength(hull);
    let epsilon = 0.01 * perimeter;

    let approx: Point[] = [];
    for (let i = 0; i < 200; i++) {
        approx = approxPolyDP(hull, epsilon, true);
        if (approx.length <= 4) break;
        epsilon *= 1.05;
    }

    if (approx.length === 4) {
        return approx;
    }

    // 点数不足 4，回退到最小外接矩形
    return minAreaRectToPoints(pts);
}

// =================== 工具函数 ===================

function toPoints(input: Float32Array | number[][]): Point[] {
    if (input instanceof Float32Array) {
        const pts: Point[] = [];
        for (let i = 0; i < input.length; i += 2) {
            pts.push([input[i], input[i + 1]]);
        }
        return pts;
    }
    return input as Point[];
}

/** 
 * 预处理：移除连续共线点，保留拐点
 * 参考你提供的 simplifyContour，加入容差避免浮点精度问题
 */
function simplifyContour(contour: Point[]): Point[] {
    if (contour.length < 3) return [...contour];

    const simplified: Point[] = [contour[0]];
    for (let i = 1; i < contour.length - 1; i++) {
        const prev = simplified[simplified.length - 1];
        const curr = contour[i];
        const next = contour[i + 1];

        // 叉积判断是否共线，容差 0.001
        const crossProduct = (curr[0] - prev[0]) * (next[1] - curr[1]) -
            (curr[1] - prev[1]) * (next[0] - curr[0]);
        if (Math.abs(crossProduct) > 0.001) {
            simplified.push(curr);
        }
    }
    simplified.push(contour[contour.length - 1]);
    return simplified;
}

function polygonLength(poly: Point[]): number {
    let len = 0;
    for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        const dx = poly[j][0] - poly[i][0];
        const dy = poly[j][1] - poly[i][1];
        len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
}

/* ---------- Andrew's monotone chain 凸包 ---------- */
function convexHull(points: Point[]): Point[] {
    const n = points.length;
    if (n <= 3) return points.slice();

    const sorted = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    const lower: Point[] = [];
    for (let i = 0; i < n; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], sorted[i]) <= 0) {
            lower.pop();
        }
        lower.push(sorted[i]);
    }

    const upper: Point[] = [];
    for (let i = n - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], sorted[i]) <= 0) {
            upper.pop();
        }
        upper.push(sorted[i]);
    }

    lower.pop();
    upper.pop();
    return lower.concat(upper);
}

function cross(o: Point, a: Point, b: Point): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/* ---------- Douglas-Peucker 多边形简化（栈迭代） ---------- */
function approxPolyDP(poly: Point[], epsilon: number, closed: boolean): Point[] {
    if (poly.length <= 3) return poly.slice();

    const pts = closed ? [...poly, poly[0]] : poly;
    const n = pts.length;
    const keep = new Array<boolean>(n).fill(false);
    keep[0] = true;
    keep[n - 1] = true;

    const epsilonSq = epsilon * epsilon;
    const stack: [number, number][] = [[0, n - 1]];

    while (stack.length) {
        const [start, end] = stack.pop()!;
        const a = pts[start];
        const b = pts[end];
        const abx = b[0] - a[0];
        const aby = b[1] - a[1];
        const abLenSq = abx * abx + aby * aby;

        let maxDistSq = 0;
        let maxIndex = -1;

        for (let i = start + 1; i < end; i++) {
            const distSq = abLenSq === 0
                ? (pts[i][0] - a[0]) ** 2 + (pts[i][1] - a[1]) ** 2
                : ((pts[i][0] - a[0]) * aby - (pts[i][1] - a[1]) * abx) ** 2 / abLenSq;

            if (distSq > maxDistSq) {
                maxDistSq = distSq;
                maxIndex = i;
            }
        }

        if (maxDistSq > epsilonSq) {
            keep[maxIndex] = true;
            stack.push([start, maxIndex], [maxIndex, end]);
        }
    }

    const result: Point[] = [];
    for (let i = 0; i < n; i++) {
        if (keep[i]) result.push(pts[i]);
    }
    if (closed && result.length > 1) {
        result.pop();
    }
    return result;
}

/* ---------- 最小外接矩形 ---------- */
function minAreaRectToPoints(points: Point[]): Point[] {
    const hull = convexHull(points.filter((_, i) =>
        i < 2 || Math.abs(cross(points[i - 2], points[i - 1], points[i])) > 0.001
    ));

    if (hull.length < 3) {
        return axisAlignedBBox(points);
    }

    let minArea = Infinity;
    let bestRect: Point[] = [];

    for (let i = 0; i < hull.length; i++) {
        const p0 = hull[i];
        const p1 = hull[(i + 1) % hull.length];
        const ex = p1[0] - p0[0];
        const ey = p1[1] - p0[1];
        const edgeLen = Math.sqrt(ex * ex + ey * ey);
        if (edgeLen === 0) continue;

        const ux = ex / edgeLen;
        const uy = ey / edgeLen;
        const vx = -uy;
        const vy = ux;

        let minU = Infinity, maxU = -Infinity;
        let minV = Infinity, maxV = -Infinity;

        for (const p of hull) {
            const dx = p[0] - p0[0];
            const dy = p[1] - p0[1];
            const projU = dx * ux + dy * uy;
            const projV = dx * vx + dy * vy;

            if (projU < minU) minU = projU;
            if (projU > maxU) maxU = projU;
            if (projV < minV) minV = projV;
            if (projV > maxV) maxV = projV;
        }

        const area = (maxU - minU) * (maxV - minV);
        if (area < minArea) {
            minArea = area;
            bestRect = [
                [p0[0] + minU * ux + minV * vx, p0[1] + minU * uy + minV * vy],
                [p0[0] + maxU * ux + minV * vx, p0[1] + maxU * uy + minV * vy],
                [p0[0] + maxU * ux + maxV * vx, p0[1] + maxU * uy + maxV * vy],
                [p0[0] + minU * ux + maxV * vx, p0[1] + minU * uy + maxV * vy],
            ];
        }
    }

    return bestRect;
}

function axisAlignedBBox(points: Point[]): Point[] {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const [x, y] of points) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    return [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
    ];
}