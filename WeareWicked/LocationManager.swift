import Foundation
import CoreLocation

class LocationDelegate: NSObject, CLLocationManagerDelegate {
    let appState: AppState
    
    init(appState: AppState) {
        self.appState = appState
    }
    
    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        // Handle location updates if needed
    }
    
    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        print("Location error: \(error)")
    }
}
