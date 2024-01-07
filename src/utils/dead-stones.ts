import { map } from "@sabaki/influence";

// 形式判断核心逻辑

// class Rand {
//     private x: number;
//     private y: number;
//     private z: number;
//     private w: number;

//     constructor(seed: number) {
//         this.x = 123456789 ^ seed;
//         this.y = 362436069 ^ seed;
//         this.z = 521288629;
//         this.w = 88675123;
//     }

//     rand(): number {
//         const t: number = this.x ^ (this.x << 11);
//         this.x = this.y;
//         this.y = this.z;
//         this.z = this.w;
//         this.w ^= (this.w >>> 19) ^ t ^ (t >>> 8);
//         return this.w;
//     }

//     range(a: number, b: number): number {
//         const m: number = (b - a) >>> 0;
//         return a + (this.rand() % m);
//     }
// }

// 示例用法
// const rand = new Rand(42); // 使用种子值创建 Rand 实例
// const randomInt = rand.range(0, 100); // 生成 [0, 100) 范围内的随机整数
// console.log(randomInt);

class Rand {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    private randomInt(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    range(a: number, b: number): number {
        // 确保 a <= b
        if (a > b) {
            [a, b] = [b, a];
        }

        // 生成 [a, b) 范围内的随机整数
        return Math.floor(Math.random() * (b - a)) + a;
        // const min = Math.min(a, b);
        // const max = Math.max(a, b);
        // return Math.floor(this.randomInt() * (max - min) + min);
    }
}

// 示例用法
// const rand = new Rand(42); // 使用种子值创建 Rand 实例
// console.log(rand.range(0, 100)); // 生成 [0, 100) 范围内的随机整数

type Sign = number;
type Vertex = number;

class PseudoBoard {
    data: Sign[];
    width: number;

    constructor(data: Sign[], width: number) {
        this.data = data;
        this.width = width;
    }

    clone() {
        return new PseudoBoard([...this.data], this.width);
    }

    get(v: Vertex): Sign | undefined {
        return this.data[v];
    }

    set(v: Vertex, sign: Sign): void {
        if (this.data[v] !== undefined) {
            this.data[v] = sign;
        }
    }

    getNeighbors(v: Vertex): Vertex[] {
        const result: Vertex[] = [v - this.width, v + this.width];
        const x = v % this.width;

        if (x > 0) {
            result.push(v - 1);
        }

        if (x < this.width - 1) {
            result.push(v + 1);
        }

        return result;
    }

    getConnectedComponentInner(
        vertex: Vertex,
        signs: Sign[],
        result: Vertex[]
    ): void {
        result.push(vertex);

        for (const neighbor of this.getNeighbors(vertex)) {
            const s = this.get(neighbor);

            if (
                s !== undefined &&
                signs.includes(s) &&
                !result.includes(neighbor)
            ) {
                this.getConnectedComponentInner(neighbor, signs, result);
            }
        }
    }

    getConnectedComponent(vertex: Vertex, signs: Sign[]): Vertex[] {
        const result: Vertex[] = [];
        this.getConnectedComponentInner(vertex, signs, result);
        return result;
    }

    getRelatedChains(vertex: Vertex): Vertex[] {
        const sign = this.get(vertex);

        if (sign === undefined) {
            return [];
        }

        return this.getConnectedComponent(vertex, [sign, 0]).filter(
            (v) => this.get(v) === sign
        );
    }

    getChain(vertex: Vertex): Vertex[] {
        const sign = this.get(vertex);

        if (sign === undefined) {
            return [];
        }

        return this.getConnectedComponent(vertex, [sign]);
    }

    hasLibertiesInner(vertex: Vertex, visited: Vertex[], sign: Sign): boolean {
        visited.push(vertex);

        for (const neighbor of this.getNeighbors(vertex)) {
            const neighborSign = this.get(neighbor);

            if (neighborSign === 0) {
                return true;
            }

            if (neighborSign === sign && !visited.includes(neighbor)) {
                if (this.hasLibertiesInner(neighbor, visited, sign)) {
                    return true;
                }
            }
        }

        return false;
    }

    hasLiberties(vertex: Vertex): boolean {
        const sign = this.get(vertex);

        if (sign === undefined) {
            return false;
        }

        return this.hasLibertiesInner(vertex, [], sign);
    }

    makePseudoMove(sign: Sign, vertex: Vertex): Vertex[] | undefined {
        const neighbors = this.getNeighbors(vertex);
        let checkCapture = false;
        let checkMultiDeadChains = false;

        if (
            neighbors.every(
                (neighbor) =>
                    this.get(neighbor) === sign ||
                    this.get(neighbor) === undefined
            )
        ) {
            return undefined;
        }

        this.set(vertex, sign);

        if (!this.hasLiberties(vertex)) {
            const isPointChain = neighbors.every((n) => this.get(n) !== sign);

            if (isPointChain) {
                checkMultiDeadChains = true;
            } else {
                checkCapture = true;
            }
        }

        const dead: Vertex[] = [];
        let deadChains = 0;

        for (const neighbor of neighbors) {
            const neighborSign = this.get(neighbor);

            if (neighborSign !== -sign || this.hasLiberties(neighbor)) {
                continue;
            }

            const chain = this.getChain(neighbor);
            deadChains += 1;

            for (const c of chain) {
                this.set(c, 0);
                dead.push(c);
            }
        }

        if (
            (checkMultiDeadChains && deadChains <= 1) ||
            (checkCapture && dead.length === 0)
        ) {
            dead.forEach((d) => this.set(d, -sign));

            this.set(vertex, 0);
            return undefined;
        }

        return dead;
    }

    getFloatingStones(): Vertex[] {
        const done: Vertex[] = [];
        const result: Vertex[] = [];

        for (let vertex = 0; vertex < this.data.length; vertex++) {
            if (this.get(vertex) !== 0 || done.includes(vertex)) {
                continue;
            }

            const posArea = this.getConnectedComponent(vertex, [0, -1]);
            const negArea = this.getConnectedComponent(vertex, [0, 1]);
            const posDead = posArea.filter((v) => this.get(v) === -1);
            const negDead = negArea.filter((v) => this.get(v) === 1);
            const posDiff = posArea.filter(
                (v) => !posDead.includes(v) && !negArea.includes(v)
            ).length;
            const negDiff = negArea.filter(
                (v) => !negDead.includes(v) && !posArea.includes(v)
            ).length;

            const favorNeg = negDiff <= 1 && negDead.length <= posDead.length;
            const favorPos = posDiff <= 1 && posDead.length <= negDead.length;

            let actualArea: Vertex[] = [];
            let actualDead: Vertex[] = [];

            if (!favorNeg && favorPos) {
                actualArea = posArea;
                actualDead = posDead;
            } else if (favorNeg && !favorPos) {
                actualArea = negArea;
                actualDead = negDead;
            } else {
                actualArea = this.getChain(vertex);
            }

            done.push(...actualArea);
            result.push(...actualDead);
        }

        return result;
    }
}

// TODO: 还得再优化guess
function guess(
    board: PseudoBoard,
    finished: boolean,
    iterations: number,
    rand: Rand
): Vertex[] {
    let floating: Vertex[] = [];

    if (finished) {
        floating = board.getFloatingStones();

        for (const v of floating) {
            board.set(v, 0);
        }
    }

    const map: number[] = getProbabilityMap(board, iterations, rand);
    const result: Vertex[] = [];
    const done: Vertex[] = [];

    for (let vertex = 0; vertex < map.length; vertex++) {
        const sign = board.get(vertex);

        if (sign !== undefined && sign !== 0 && !done.includes(vertex)) {
            const chain = board.getChain(vertex);
            console.info("-------chain", chain);
            const probability =
                chain.reduce((sum, v) => sum + (map[v] || 0), 0) / chain.length;

            const dead = Math.sign(probability) === -sign;

            for (const c of chain) {
                if (dead) {
                    result.push(c);
                }

                done.push(c);
            }
        }
    }

    if (!finished) {
        return result;
    }

    // Preserve life & death status of related chains
    const updatedResult: Vertex[] = [...floating];
    const relatedDone: Vertex[] = [];

    // const relatedDone: Vertex[] = [...done, ...floating];

    for (const vertex of result) {
        if (relatedDone.includes(vertex)) {
            continue;
        }

        const related = board.getRelatedChains(vertex);
        const deadProbability =
            related.filter((v) => result.includes(v)).length / related.length;

        const dead = deadProbability > 0.5;

        for (const v of related) {
            if (dead) {
                updatedResult.push(v);
            }

            relatedDone.push(v);
        }
    }

    return updatedResult;
}

function getProbabilityMap(
    board: PseudoBoard,
    iterations: number,
    rand: Rand
): number[] {
    const result: [number, number][] = board.data.map(() => [0, 0]);

    for (let i = 0; i < iterations; i++) {
        const sign = i < iterations / 2 ? -1 : 1;
        const areaMap = playTillEnd(board.clone(), sign, rand);

        for (let v = 0; v < areaMap.data.length; v++) {
            const s = areaMap.get(v);

            if (s !== undefined) {
                const [negative, positive] = result[v];

                if (s === -1) {
                    result[v][0] = negative + 1;
                } else if (s === 1) {
                    result[v][1] = positive + 1;
                }
            }
        }
    }

    return result.map(([n, p]) => (p + n === 0 ? 0 : (p * 2) / (p + n) - 1));
}

function playTillEnd(board: PseudoBoard, sign: Sign, rand: Rand): PseudoBoard {
    const illegalVertices: Vertex[] = [];
    let finished = [false, false];
    let freeVertices = Array.from(
        { length: board.data.length },
        (_, index) => index
    ).filter((v) => board.get(v) === 0);

    // console.info("--------playTillEnd1", freeVertices);

    // return board;

    while (freeVertices.length > 0 && (!finished[0] || !finished[1])) {
        // console.info("----------playTillEnd", freeVertices, finished);

        let madeMove = false;

        while (freeVertices.length > 0) {
            const randomIndex = rand.range(0, freeVertices.length);

            const vertex = freeVertices.splice(randomIndex, 1)[0];

            const freedVertices = board.makePseudoMove(sign, vertex);

            if (freedVertices !== undefined) {
                freeVertices = freeVertices.concat(freedVertices);
                finished[sign > 0 ? 0 : 1] = false;
                madeMove = true;
                break;
            } else {
                illegalVertices.push(vertex);
            }
        }

        finished[sign > 0 ? 1 : 0] = !madeMove;
        // TODO: 这里没去重就concat，会导致程序陷入死循环
        // freeVertices = freeVertices.concat(illegalVertices);
        sign = -sign;
    }

    // Patch holes
    for (let vertex = 0; vertex < board.data.length; vertex++) {
        if (board.get(vertex) !== 0) {
            continue;
        }

        let sign = 0;

        for (const n of board.getNeighbors(vertex)) {
            const s = board.get(n);

            if (s === 1 || s === -1) {
                sign = s || 0;
                break;
            }
        }

        if (sign !== 0) {
            board.set(vertex, sign);
        }
    }

    return board;
}

const parseBoard = (data: number[][]) => ({
    newData: ([] as number[]).concat(...data),
    width: data.length > 0 ? data[0].length : 0,
});

const parseVertices = (indices: Vertex[], width: number) =>
    [...indices].map((i) => {
        let x = i % width;
        return [x, (i - x) / width];
    });

const parseGrid = (values: number[], width: number) => {
    return [...Array(values.length / width)].map((_, y) => {
        let start = y * width;
        return [...Array(width)].map((_, x) => values[start + x]);
    });
};

const guess_ = function (
    data: number[][],
    { finished = false, iterations = 100 } = {}
) {
    let { newData, width } = parseBoard(data);
    const board = new PseudoBoard(newData, width);
    const rand = new Rand(Date.now());
    let indices = guess(board, finished, iterations, rand);

    const boardRes = parseVertices(indices, width);

    return boardRes;
};

const playTillEnd_ = function (data: number[][], sign: number) {
    let { newData, width } = parseBoard(data);
    const board = new PseudoBoard(newData, width);
    const rand = new Rand(Date.now());

    let values = playTillEnd(board, sign, rand);

    return parseGrid(values.data, width);
};

const getProbabilityMap_ = function (data: number[][], iterations: number) {
    let { newData, width } = parseBoard(data);
    const board = new PseudoBoard(newData, width);
    const rand = new Rand(Date.now());

    let values = getProbabilityMap(board, iterations, rand);

    return parseGrid(values, width);
};

const getFloatingStones_ = function (data: number[][]) {
    let { newData, width } = parseBoard(data);
    const board = new PseudoBoard(newData, width);
    // let indices = getFloatingStones(newData, width);

    let indices = board.getFloatingStones();

    return parseVertices(indices, width);
};

const estimate = (board: number[][], finished: boolean) => {
    const deadStones = guess_(board, { finished, iterations: 100 });
    for (let v of deadStones) {
        board[v[1]][v[0]] = 0;
    }
    const res = map(board, { discrete: true });
    return res;
};

export const DeadStoneUtils = {
    guess: guess_,
    playTillEnd: playTillEnd_,
    getProbabilityMap: getProbabilityMap_,
    getFloatingStones: getFloatingStones_,
    estimate,
};
