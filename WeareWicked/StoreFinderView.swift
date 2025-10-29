import SwiftUI
import CoreLocation
import MapKit

struct StoreFinderView: View {
    @EnvironmentObject private var appState: AppState
    @State private var selectedStore: Store?
    @State private var showingMap = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(spacing: 8) {
                        WickedLogoView(size: 80)
                    .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                
                Text("Find Wicked Donuts")
                    .font(.title2.bold())
                    .foregroundColor(.brandText)
                
                Text("Las Vegas Location")
                    .font(.subheadline)
                    .foregroundColor(.brandTextSecondary)
            }
            .padding()
            .background(Color.brandSurface)
            
            if appState.nearbyStores.isEmpty {
                ContentUnavailableView("No Stores Found", systemImage: "location.slash")
            } else {
                // Store List
                List(appState.nearbyStores) { store in
                    StoreRowView(store: store, isSelected: selectedStore?.id == store.id)
                        .onTapGesture {
                            selectedStore = store
                        }
                        .listRowBackground(Color.brandSurface)
                }
                .listStyle(.plain)
                
                // Action Buttons
                if let store = selectedStore {
                    VStack(spacing: 12) {
                        Button {
                            showingMap = true
                        } label: {
                            HStack {
                                Image(systemName: "map.fill")
                                    .font(.title3)
                                Text("View on Map")
                                    .font(.headline.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(Color.brandGradient1)
                            )
                            .foregroundColor(.brandWhite)
                        }
                        
                        Button {
                            appState.pickupLocation = store.address
                        } label: {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.title3)
                                Text("Select This Store for Pickup")
                                    .font(.headline.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 14)
                                    .stroke(Color.brandPrimary, lineWidth: 2)
                            )
                            .foregroundColor(.brandPrimary)
                        }
                    }
                    .padding()
                    .background(Color.brandSurface)
                }
            }
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Find Stores")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            // Auto-select the only store
            if let firstStore = appState.nearbyStores.first {
                selectedStore = firstStore
            }
        }
        .sheet(isPresented: $showingMap) {
            if let store = selectedStore {
                StoreMapView(store: store)
            }
        }
    }
}

struct StoreRowView: View {
    let store: Store
    let isSelected: Bool
    
    var body: some View {
        HStack(spacing: 16) {
            // Store Icon
            VStack {
                Image(systemName: "mappin.circle.fill")
                    .font(.title2)
                    .foregroundColor(.brandPrimary)
            }
            .frame(width: 40)
            
            // Store Info
            VStack(alignment: .leading, spacing: 4) {
                Text(store.name)
                    .font(.headline)
                    .foregroundColor(.brandText)
                
                Text(store.address.formatted)
                    .font(.subheadline)
                    .foregroundColor(.brandTextSecondary)
                
                HStack {
                    Image(systemName: "clock.fill")
                        .font(.caption)
                        .foregroundColor(.brandPrimary)
                    Text("Open Daily 6:00 AM - 10:00 PM")
                        .font(.caption)
                        .foregroundColor(.brandTextSecondary)
                }
            }
            
            Spacer()
            
            // Selection Indicator
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.brandPrimary)
            }
        }
        .padding()
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(isSelected ? Color.brandPrimary.opacity(0.1) : Color.brandSurface)
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(isSelected ? Color.brandPrimary : Color.clear, lineWidth: 2)
                )
        )
    }
}

struct StoreMapView: View {
    let store: Store
    @Environment(\.dismiss) private var dismiss
    @State private var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 36.1979, longitude: -115.2990), // Wicked Donuts Las Vegas coordinates
        span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
    )
    @State private var showingDirections = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Map View
                Map(coordinateRegion: $region, annotationItems: [store]) { store in
                    MapAnnotation(coordinate: CLLocationCoordinate2D(latitude: 36.1979, longitude: -115.2990)) {
                        VStack(spacing: 4) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.title)
                                .foregroundColor(.brandPrimary)
                                .shadow(radius: 4)
                            
                            Text("Wicked Donuts")
                                .font(.caption.weight(.bold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    RoundedRectangle(cornerRadius: 8)
                                        .fill(Color.brandSurface)
                                        .shadow(radius: 2)
                                )
                                .foregroundColor(.brandText)
                        }
                    }
                }
                .frame(height: 400)
                .ignoresSafeArea(edges: .top)
                
                // Store Info Card
                VStack(spacing: 16) {
                    VStack(spacing: 8) {
                        Text(store.name)
                            .font(.title2.bold())
                            .foregroundColor(.brandText)
                        
                        Text(store.address.formatted)
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                            .multilineTextAlignment(.center)
                        
                        HStack {
                            Image(systemName: "clock.fill")
                                .foregroundColor(.brandPrimary)
                            Text("Open Daily 6:00 AM - 10:00 PM")
                                .font(.caption)
                                .foregroundColor(.brandTextSecondary)
                        }
                    }
                    
                    // Action Buttons
                    VStack(spacing: 12) {
                        Button {
                            openInAppleMaps()
                        } label: {
                            HStack {
                                Image(systemName: "map.fill")
                                    .font(.title3)
                                Text("Get Directions")
                                    .font(.headline.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .fill(Color.brandGradient1)
                            )
                            .foregroundColor(.brandWhite)
                        }
                        
                        Button {
                            callStore()
                        } label: {
                            HStack {
                                Image(systemName: "phone.fill")
                                    .font(.title3)
                                Text("Call Store")
                                    .font(.headline.weight(.semibold))
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.brandPrimary, lineWidth: 2)
                            )
                            .foregroundColor(.brandPrimary)
                        }
                    }
                }
                .padding()
                .background(Color.brandSurface)
            }
            .navigationTitle("Store Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.brandPrimary)
                }
            }
        }
        .onAppear {
            // Center map on Wicked Donuts Las Vegas
            region = MKCoordinateRegion(
                center: CLLocationCoordinate2D(latitude: 36.1979, longitude: -115.2990),
                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
            )
        }
    }
    
    private func openInAppleMaps() {
        let coordinate = CLLocationCoordinate2D(latitude: 36.1979, longitude: -115.2990)
        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = "Wicked Donuts Las Vegas"
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving
        ])
    }
    
    private func callStore() {
        if let url = URL(string: "tel:+17025551234") { // Placeholder phone number
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    NavigationStack { StoreFinderView().environmentObject(AppState()) }
}
