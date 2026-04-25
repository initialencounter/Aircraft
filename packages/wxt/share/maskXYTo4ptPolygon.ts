export type Point = [number, number];

/**
 * 将 YOLO 输出的 xy 轮廓点（N×2）转为 4 个顶点的多边形。
 * 算法：凸包 → Douglas-Peucker 迭代，直到点数 <= 4。
 * 这样能贴合实际目标轮廓，去除多余突出边角。
 * 返回 [[x1,y1],[x2,y2],[x3,y3],[x4,y4]]。
 * @param mask_xy 轮廓点数组，格式为 [[x, y], ...] 或 Float32Array(N*2)
 * @returns 四个顶点的多边形
 */
export function maskXYTo4ptPolygon(mask_xy: Float32Array | number[][]): Point[] {
    // ---- 1. 统一转为 Point 数组 ----
    const pts = toPoints(mask_xy);
    if (pts.length < 3) {
        // 点数太少，无法构成多边形，直接返回最小包围矩形（退化处理）
        return minAreaRect(pts);
    }

    // ---- 2. 求凸包，去除内凹噪点 ----
    const hull = convexHull(pts);

    // ---- 3. 迭代 Douglas-Peucker，逐步增大 epsilon 直至点数 <= 4 ----
    const perimeter = polygonLength(hull);
    let epsilon = 0.01 * perimeter;

    let approx: Point[] = [];
    for (let i = 0; i < 200; i++) {
        approx = approxPolyDP(hull, epsilon, true);
        if (approx.length <= 4) break;
        epsilon *= 1.05;
    }

    // 恰好 4 个点，直接返回
    if (approx.length === 4) {
        return approx;
    }

    // 点数不足 4（极少数退化情况），回退到最小外接矩形
    // 使用原始轮廓点以保证贴合
    return minAreaRect(pts);
}

// =================== 几何工具函数 ===================

/** 将 Float32Array 或二维数组转换为 Point[] */
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

/** 多边形周长（闭合） */
function polygonLength(poly: Point[]): number {
    let len = 0;
    for (let i = 0; i < poly.length; i++) {
        const j = (i + 1) % poly.length;
        len += Math.hypot(poly[i][0] - poly[j][0], poly[i][1] - poly[j][1]);
    }
    return len;
}

/* ---------- Andrew's monotone chain 凸包 ---------- */
function convexHull(points: Point[]): Point[] {
    const n = points.length;
    if (n <= 3) return points.slice();

    // 先排序
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

    // 去掉重复的首尾点
    lower.pop();
    upper.pop();
    return lower.concat(upper); // 逆时针顺序，不含重复终点
}

/** 叉积 (O->A) x (O->B) */
function cross(o: Point, a: Point, b: Point): number {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/* ---------- Douglas-Peucker 多边形简化 ---------- */
/**
 * 简化多边形
 * @param poly  顶点序列（不含重复终点）
 * @param epsilon 允许的最大点到边的距离
 * @param closed 是否闭合多边形
 * @returns 简化后的顶点数组（与输入格式一致）
 */
function approxPolyDP(poly: Point[], epsilon: number, closed: boolean): Point[] {
    if (poly.length <= 3) return poly.slice();

    // 闭合时尾部追加首点，形成一个开放折线（首尾相同）
    const pts = closed ? [...poly, poly[0]] : poly;
    const n = pts.length;
    const keep = new Array<boolean>(n).fill(false);
    keep[0] = true;
    keep[n - 1] = true;

    const epsilonSq = epsilon * epsilon;
    // 使用显式栈避免递归
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
            let distSq: number;
            if (abLenSq === 0) {
                // 极少数退化情况：线段长度为 0
                const dx = pts[i][0] - a[0];
                const dy = pts[i][1] - a[1];
                distSq = dx * dx + dy * dy;
            } else {
                // 点到线段的垂直距离平方 = |cross|^2 / |ab|^2
                const acx = pts[i][0] - a[0];
                const acy = pts[i][1] - a[1];
                const crossVal = acx * aby - acy * abx;
                distSq = (crossVal * crossVal) / abLenSq;
            }
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
    // 闭合时移除尾部重复点
    if (closed && result.length > 1) {
        result.pop();
    }
    return result;
}

/* ---------- 最小外接矩形（旋转卡壳） ---------- */
/**
 * 计算点集的最小外接矩形，返回四个角点（逆时针或顺时针）
 */
function minAreaRect(points: Point[]): Point[] {
    const hull = convexHull(points);
    const n = hull.length;

    // 退化处理：点数少于 3，直接用轴对齐包围盒
    if (n < 3) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p[0] < minX) minX = p[0];
            if (p[0] > maxX) maxX = p[0];
            if (p[1] < minY) minY = p[1];
            if (p[1] > maxY) maxY = p[1];
        }
        return [
            [minX, minY],
            [maxX, minY],
            [maxX, maxY],
            [minX, maxY]
        ];
    }

    // 去除凸包上的共线中间点（保证严格凸）
    const strictHull = removeCollinear(hull);
    const m = strictHull.length;
    if (m < 3) {
        // 再次退化为轴对齐
        return axisAlignedBBox(points);
    }

    let minArea = Infinity;
    let bestRect: Point[] = [];

    // 遍历每条边作为矩形的一条边
    for (let i = 0; i < m; i++) {
        const iNext = (i + 1) % m;
        const p0 = strictHull[i];
        const p1 = strictHull[iNext];
        const ex = p1[0] - p0[0];
        const ey = p1[1] - p0[1];
        const edgeLen = Math.hypot(ex, ey);
        if (edgeLen === 0) continue;
        const ux = ex / edgeLen;
        const uy = ey / edgeLen;
        const vx = -uy;
        const vy = ux; // 法向量

        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;

        // 计算所有凸包点在当前 uv 坐标系下的投影范围
        for (let j = 0; j < m; j++) {
            const dx = strictHull[j][0] - p0[0];
            const dy = strictHull[j][1] - p0[1];
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
            // 构造矩形四个角点
            const c1x = p0[0] + minU * ux + minV * vx;
            const c1y = p0[1] + minU * uy + minV * vy;
            const c2x = p0[0] + maxU * ux + minV * vx;
            const c2y = p0[1] + maxU * uy + minV * vy;
            const c3x = p0[0] + maxU * ux + maxV * vx;
            const c3y = p0[1] + maxU * uy + maxV * vy;
            const c4x = p0[0] + minU * ux + maxV * vx;
            const c4y = p0[1] + minU * uy + maxV * vy;
            bestRect = [
                [c1x, c1y],
                [c2x, c2y],
                [c3x, c3y],
                [c4x, c4y]
            ];
        }
    }

    return bestRect;
}

/** 移除凸包中共线的中间点，返回严格凸的顶点序列 */
function removeCollinear(hull: Point[]): Point[] {
    const n = hull.length;
    if (n < 3) return hull.slice();
    const result: Point[] = [];
    for (let i = 0; i < n; i++) {
        const prev = hull[(i - 1 + n) % n];
        const curr = hull[i];
        const next = hull[(i + 1) % n];
        if (cross(prev, curr, next) !== 0) {
            result.push(curr);
        }
    }
    if (result.length < 3) {
        // 所有点共线，保留两端点
        return [hull[0], hull[n - 1]];
    }
    return result;
}

/** 轴对齐包围盒（用于终极退化） */
function axisAlignedBBox(points: Point[]): Point[] {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) {
        if (p[0] < minX) minX = p[0];
        if (p[0] > maxX) maxX = p[0];
        if (p[1] < minY) minY = p[1];
        if (p[1] > maxY) maxY = p[1];
    }
    return [
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY]
    ];
}