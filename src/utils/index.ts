import { BoardPoint } from "../types";

const Acode = "A".charCodeAt(0);

const ax: string[] = [];

for (let i = 0; i < 20; i++) {
    const l = String.fromCharCode(Acode + i);
    if (l === "I") continue;
    ax.push(l);
}
// 棋盘坐标到二维坐标
export const mapStr2BoardPoint = (zb: string, size: number): BoardPoint => {
    if (zb === "" || zb.toLowerCase() === "pass") return { x: -1, y: -1 }; //停一手
    const x_ = zb.substr(0, 1).toUpperCase();
    const y_ = zb.substr(1);
    let y__ = Number.parseInt(y_) - 1;
    y__ = Math.abs(y__ - size + 1);
    const res: BoardPoint = { x: ax.indexOf(x_), y: y__ };

    return res;
};

//二维坐标到棋盘坐标
export const mapBoardPoint2Str = (
    point: BoardPoint,
    size: number = 19
): string => {
    if (point.x === -1 && point.y === -1) return "pass";
    const Q = ax[point.x];
    const S = (size - point.y).toString();

    return Q + S;
};

export * from "./dead-stones";
