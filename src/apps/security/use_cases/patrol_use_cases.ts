import { Checkpoint, Incident } from "../domain/entities";

export class PatrolUseCases {
  static async verifyLocation(checkpoint: Checkpoint, currentLat: number, currentLon: number): Promise<boolean> {
    const R = 6371e3; // meters
    const φ1 = (checkpoint.latitude * Math.PI) / 180;
    const φ2 = (currentLat * Math.PI) / 180;
    const Δφ = ((currentLat - checkpoint.latitude) * Math.PI) / 180;
    const Δλ = ((currentLon - checkpoint.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // in meters
    return distance <= 50; // 50m tolerance
  }
}
