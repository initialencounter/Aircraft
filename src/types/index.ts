type FileTileMap = FileTile[];


interface FileTile {
    name: string;
    lastModified: string;
    md5: string;
    path: string;
    color: string;
    focus: boolean;
}

interface Link {
    link: string;
}

interface DataModel {
    /**
     * 委托方中文名称
     */
    appraiserCName: string | null
    /**
     * 委托方英文名称
     */
    appraiserEName: string | null
    /**
     * 制造商或生产工厂中文名称
     */
    manufacturerCName: string | null
    /**
     * 制造商或生产工厂英文名称
     */
    manufacturerEName: string | null
    /**
     * 电池中文名称
     */
    itemCName: string | null
    /**
     * 电池英文名称
     */
    itemEName: string | null
    /**
     * 电池颜色
     */
    color: string | null
    /**
     * 电池形状
     */
    shape: string | null
    /**
     * 电池尺寸
     */
    size: string | null
    /**
     * 电池型号
     */
    model: string | null
    /**
     * 电池商标
     */
    brands: string | null
    /**
     * 电池数量
     */
    btyCount: string | null
    /**
     * 电池净重
     */
    netWeight: string | null
    /**
     * 电池电压
     */
    inspectionItem2Text1: string | null
    /**
     * 电池容量
     */
    inspectionItem2Text2: string | null
    /**
     * 电池瓦时
     */
    inspectionItem3Text1: string | null
    /**
     * UN38.3报告编号
     */
    market: string | null
}

export type {FileTileMap, FileTile, Link, DataModel}