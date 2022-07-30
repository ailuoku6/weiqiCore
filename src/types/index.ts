export interface Point {
  player: "w" | "b";
  zuobiao: string;
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
