import { EatStones, Point, Position } from "./types";
import { mapStr2BoardPoint, DeadStoneUtils } from "./utils";

const mapper = new Map<number, "b" | "w">([
    [-1, "b"],
    [1, "w"],
]);

const strMapPlayer = {
    b: -1,
    w: 1,
};

const fourDire = [
    { x: 0, y: -1 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
];

//被统计过的棋块的气（标记）
const COUNTED_QI = 10;

export class WeiqiCore {
    private size: number;

    private board: number[][];
    private steps: Point[];
    private stepIndex: number;
    private eatStone: Map<number, EatStones>;
    private curPlayer: number;
    private render: null | ((board: number[][]) => void);
    private lastPoint: Point | null;
    private lastCanPlayPos: string;

    constructor(size: number = 19) {
        this.size = size;
        this.board = new Array(size);
        for (let i = 0; i < size; i++) {
            this.board[i] = new Array(size).fill(0);
        }
        this.steps = [];
        this.stepIndex = 0;
        this.eatStone = new Map<number, EatStones>();
        this.curPlayer = -1;
        this.lastPoint = null;
        this.lastCanPlayPos = "";

        this.render = null;
    }

    //更新board
    private renderBoard() {
        this.render && this.render([...this.board]);
    }

    private reversePlayer() {
        this.curPlayer = -this.curPlayer;
    }

    private isInBoard(pos: Position): boolean {
        return (
            pos.x > -1 && pos.x < this.size && pos.y > -1 && pos.y < this.size
        );
    }

    private setBoardPos(pos: Position, val: number) {
        if (pos.x < 0 || pos.y < 0) return;
        this.board[pos.y][pos.x] = val;
    }

    private getBoardPos(pos: Position) {
        if (pos.x < 0 || pos.y < 0) return 0;
        return this.board[pos.y][pos.x];
    }

    //找一块棋
    private findArea(
        pos: Position,
        color: number,
        searched?: Map<string, boolean>
    ): Position[] {
        let res: Position[] = [];
        let stack: Position[] = [];

        if (!searched) {
            searched = new Map<string, boolean>();
        }
        if (!this.isInBoard(pos) || this.getBoardPos(pos) !== color) return res;

        // res.push(pos);
        stack.push(pos);

        while (stack.length) {
            const pos_ = stack.pop();
            if (!pos_) return res;
            searched.set(`${pos_.x},${pos_.y}`, true);
            res.push(pos_);
            // 遍历四个方向
            for (let i = 0; i < fourDire.length; i++) {
                const pos__ = {
                    x: pos_.x + fourDire[i].x,
                    y: pos_.y + fourDire[i].y,
                };

                if (
                    this.isInBoard(pos__) &&
                    this.getBoardPos(pos__) === color &&
                    !searched.get(`${pos__.x},${pos__.y}`)
                ) {
                    stack.push(pos__);
                }
            }
        }

        return res;
    }

    //给一块棋数气
    private countLiberty(pos_: Position[]): Position[] {
        const res: Position[] = [];

        for (const pos of pos_) {
            for (let dire of fourDire) {
                let p = {
                    x: pos.x + dire.x,
                    y: pos.y + dire.y,
                };
                if (this.isInBoard(p) && this.getBoardPos(p) === 0) {
                    res.push(p);
                    this.setBoardPos(p, COUNTED_QI);
                }
            }
        }

        //清理标记
        for (const p of res) {
            this.setBoardPos(p, 0);
        }

        return res;
    }

    //更新棋盘，返回吃子列表
    private updateBoard(point: Point): Position[] {
        let eatstone: Position[] = [];
        const p = mapStr2BoardPoint(point.coordinate, this.size);
        if (p.x === -1 && p.y === -1) return eatstone; //停一手，不做后续处理
        const player = strMapPlayer[point.player];
        this.setBoardPos(p, player);

        //判断吃子
        for (let i = 0; i < fourDire.length; i++) {
            let pos = {
                x: p.x + fourDire[i].x,
                y: p.y + fourDire[i].y,
            };

            if (this.isInBoard(pos) && this.getBoardPos(pos) !== player) {
                //寻找对方棋块
                let stones = this.findArea(pos, -player);
                let liberties = this.countLiberty(stones);
                if (liberties.length === 0) {
                    eatstone.push(...stones);
                }
            }
        }

        //提子
        for (let stone of eatstone) {
            this.setBoardPos(stone, 0);
        }

        return eatstone;
    }

    //搜索离目标颜色棋子最近的距离
    // private nearestNeighbor(
    //     color: -1 | 1,
    //     pos: Position,
    //     data: number[][],
    //     searched: Map<string, boolean>
    // ) {
    //     searched.set(`${pos.x},${pos.y}`, true);

    //     for (let dire of fourDire) {
    //         const p1: Position = { x: pos.x + dire.x, y: pos.y + dire.y };
    //         if (!this.isInBoard(p1)) continue;
    //         if (!searched.get(`${p1.x},${p1.y}`)) {
    //             this.nearestNeighbor(color, p1, data, searched);
    //         }
    //         data[pos.x][pos.y] = Math.min(
    //             data[pos.x][pos.y],
    //             data[p1.x][p1.y] + 1
    //         );
    //     }

    //     searched.set(`${pos.x},${pos.y}`, false);

    //     return data;
    // }

    /**
     * 棋盘发生变化回调
     */
    public onBoardChange(render: (board: number[][]) => void) {
        this.render = render;
    }

    /**
     * @returns 1:白方  -1:黑方
     */
    public whoTurn() {
        return mapper.get(this.curPlayer) === "b" ? -1 : 1;
    }

    /**
     * 返回棋盘
     */
    public getBoard() {
        return this.board;
    }

    /**
     * @returns 返回棋盘上的所有落子顺序，方便回溯
     */
    public getSteps() {
        return this.steps;
    }

    /**
     * 加载棋局步数
     */
    public setSteps(steps: Point[]) {
        this.board = new Array(this.size);
        for (let i = 0; i < this.size; i++) {
            this.board[i] = new Array(this.size).fill(0);
        }
        this.steps = [];
        this.stepIndex = 0;
        this.eatStone = new Map<number, EatStones>();
        this.curPlayer = -1;
        for (let step of steps) {
            this.play(step.coordinate);
        }
    }

    /** 回到最后一步 */
    public jumpLast() {
        this.jump2Step(this.steps.length - 1);
    }

    /** 跳转到指定步数 */
    public jump2Step(index: number) {
        if (index > this.steps.length) return;
        this.stepIndex = index;
        this.renderBoard();
    }

    /** 跳转上一步 */
    public jumpPreStep() {
        this.jump2Step(this.stepIndex - 1);
    }

    /** 跳转到下一步 */
    public jumpNextStep() {
        this.jump2Step(this.stepIndex + 1);
    }

    /** 悔棋 */
    public undo() {
        let undoStep = this.steps.length - 1;
        let point = this.steps.pop(); //在棋盘上删除的子
        let eat = this.eatStone.get(undoStep); //撤销后在棋盘回填的子
        this.reversePlayer();
        this.stepIndex = this.steps.length;

        //更新棋盘，更新吃子
        if (point) {
            let p = mapStr2BoardPoint(point.coordinate, this.size);
            // this.board[p.x][p.y] = 0;
            this.setBoardPos(p, 0);
            if (eat) {
                let color = eat.color;
                for (let e of eat.stones) {
                    // this.board[e.x][e.y] = color;
                    this.setBoardPos(e, color);
                }
            }
        }

        this.eatStone.delete(undoStep);
    }

    /** 获取当前手数 */
    public getIndex() {
        return this.steps.length;
    }

    /** 判断所选坐标是否能下，不入气、劫争等 */
    public canPlay(coordinate: string): boolean {
        if (coordinate === "" || coordinate === "pass") {
            this.lastCanPlayPos = coordinate;
            return true;
        }
        const p = mapStr2BoardPoint(coordinate, this.size);
        // if(this.board[p.x][p.y]!==0) return false;
        if (this.getBoardPos(p) !== 0) {
            this.lastCanPlayPos = "";
            return false;
        }

        //判断打劫，不入气等
        //打劫判断：这次落子不能与上次一样，要考虑打二还一

        //判劫争
        const lastStepIndex = this.steps.length - 1;
        if (lastStepIndex > 0) {
            // const lastSameColorStep = this.steps[lastStepIndex-1];
            let lastStepEat = this.eatStone.get(lastStepIndex);
            //上次同色棋子落点和本次一样，且对方上次落子吃子正是本次落点，形成劫争
            //上述描述有问题(上次同色棋子落点和本次一样)，若延缓开劫等情形不适用
            if (
                lastStepEat &&
                lastStepEat.stones.length === 1 &&
                lastStepEat.stones[0].x === p.x &&
                lastStepEat.stones[0].y === p.y
            ) {
                // console.log('还不能提劫');
                this.lastCanPlayPos = "";
                return false;
            }
        }

        //判不入气,能吃掉对方的不是不入气
        this.setBoardPos(p, this.curPlayer); //假设下在这里，记得清理现场

        const area = this.findArea({ x: p.x, y: p.y }, this.curPlayer);
        const liberties = this.countLiberty(area);
        if (liberties.length === 0) {
            let flag = false;
            //下完能吃掉任意敌方棋子，则不是不入气
            for (let dire of fourDire) {
                let pos = {
                    x: p.x + dire.x,
                    y: p.y + dire.y,
                };
                if (!this.isInBoard(pos)) continue;
                //找到敌方棋块
                const area_ = this.findArea(pos, -this.curPlayer);
                //敌方棋块存在，则判断是否被杀死
                if (area_.length !== 0) {
                    const liberties_ = this.countLiberty(area_);
                    if (liberties_.length === 0) {
                        flag = true;
                        break;
                    }
                }
            }

            if (flag === false) {
                this.setBoardPos(p, 0);
                // console.log('不入气');
                this.lastCanPlayPos = "";
                return flag;
            }
        }
        this.setBoardPos(p, 0);

        this.lastCanPlayPos = coordinate;
        return true;
    }

    public getLastPoint() {
        return this.lastPoint;
    }

    /**
     * @param pos 落子坐标；如A1、B2等
     * @returns 返回吃掉对方棋子的列表
     */
    public play(pos: string): Position[] {
        if (this.stepIndex !== this.steps.length) return [];
        if (this.lastCanPlayPos !== pos && !this.canPlay(pos)) return [];
        let player = mapper.get(this.curPlayer);
        if (player !== undefined) {
            let point: Point = { player: player, coordinate: pos };
            //
            this.steps.push(point);

            //更新棋盘
            //更新吃子
            let eatstone =
                pos === "pass" || pos === "" ? [] : this.updateBoard(point);
            this.eatStone.set(this.stepIndex, {
                color: -player,
                stones: eatstone,
            });

            if (!(pos === "pass" || pos === "")) {
                //如果不是停一手，则记录
                this.lastPoint = { player: player, coordinate: pos };
            }

            //更新stepleIndex
            this.stepIndex = this.steps.length;
            this.reversePlayer();

            this.lastCanPlayPos = "";

            return eatstone;
        }

        this.lastCanPlayPos = "";

        this.renderBoard();
        return [];
    }

    /**
     * @param finished 棋局是否终止，终止则数棋，否则只是形式判断
     * @returns 返回黑白双方占据的交叉点
     */
    public estimate(finished: boolean) {
        return DeadStoneUtils.estimate(this.board, finished);
    }
}
