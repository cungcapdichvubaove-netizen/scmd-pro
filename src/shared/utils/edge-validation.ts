import { calculateDistance } from './geo.js';

export interface TrajectoryPoint {
  lat: number;
  lon: number;
  timestamp: string;
}

export interface EdgeValidationResult {
  isValid: boolean;
  score: number; // 0 to 1, higher is better
  anomalyType?: 'VELOCITY' | 'MOCK_GPS' | 'JUMP';
  reason?: string;
}

/**
 * Perform real-time edge validation on GPS trajectory to detect fraud
 * (Mock GPS, excessive speed, or unrealistic jumps)
 */
export const validateGPSTrajectory = (
  trajectory: TrajectoryPoint[],
  newPoint: TrajectoryPoint
): EdgeValidationResult => {
  if (trajectory.length === 0) return { isValid: true, score: 1 };

  const lastPoint = trajectory[trajectory.length - 1];
  if (!lastPoint) return { isValid: true, score: 1 };
  const distance = calculateDistance(lastPoint.lat, lastPoint.lon, newPoint.lat, newPoint.lon); // in meters
  
  const timeDiff = (new Date(newPoint.timestamp).getTime() - new Date(lastPoint.timestamp).getTime()) / 1000; // in seconds
  
  if (timeDiff <= 0) return { isValid: true, score: 1 };

  const velocity = (distance / timeDiff) * 3.6; // km/h

  // 1. Extreme Velocity Check (> 120 km/h is highly suspicious for a walking guard)
  if (velocity > 120) {
    return {
      isValid: false,
      score: 0.2,
      anomalyType: 'VELOCITY',
      reason: `Vận tốc bất thường: ${velocity.toFixed(1)} km/h`
    };
  }

  // 2. Teleportation Check (Distance > 500m in less than 5 seconds)
  if (distance > 500 && timeDiff < 5) {
    return {
      isValid: false,
      score: 0.1,
      anomalyType: 'JUMP',
      reason: 'Phát hiện tín hiệu nhảy vọt tọa độ (Jump suspicion)'
    };
  }

  // 3. Mock GPS Simulation Detection (Perfectly straight lines or zero jitter - future enhancement)
  // Currently we use basic threshold logic
  
  return {
    isValid: true,
    score: 1.0 - (velocity / 200), // Minor score reduction for high speed
  };
};

/**
 * Detects if the Geolocation API position was likely mocked 
 * (checking browser-level flags if available)
 */
export const isMockedPosition = (pos: GeolocationPosition): boolean => {
  const coords = pos.coords as any;
  // Some browsers support mocked flag or simulated speed
  if (coords.mocked === true) return true;
  if (coords.isMocked === true) return true;
  
  // Perfect 0 accuracy or 0 altitude in some environments can be suspicious 
  // but we prefer high-confidence flags or velocity checks above.
  return false;
};
