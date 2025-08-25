export class AngleCalculator {
  static calculateAngle(p1: any, p2: any, p3: any): number {
    const angle = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
    return Math.abs(angle * 180 / Math.PI);
  }
  
  static calculateDistance(p1: any, p2: any): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }
  
  static avg(...values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
  
  static calculateVerticalDistance(p1: any, p2: any): number {
    return Math.abs(p1.y - p2.y);
  }
  
  static calculateHorizontalDistance(p1: any, p2: any): number {
    return Math.abs(p1.x - p2.x);
  }
} 