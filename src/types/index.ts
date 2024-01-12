export interface Point {
    player: "w" | "b";
    coordinate: string;
}

export interface Position {
    x: number;
    y: number;
}

export interface BoardPoint {
    x: number;
    y: number;
}

export interface EatStones {
    color: number;
    stones: Position[];
}
