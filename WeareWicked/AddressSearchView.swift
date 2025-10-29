import SwiftUI
import MapKit
import CoreLocation

struct AddressSearchView: View {
    @Binding var selectedAddress: Address?
    @Environment(\.dismiss) private var dismiss
    
    @State private var searchText = ""
    @State private var searchResults: [MKLocalSearchCompletion] = []
    @State private var searchCompleter = MKLocalSearchCompleter()
    @State private var searchDelegate: AddressSearchDelegate?
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Header
                VStack(spacing: 12) {
                    WickedLogoView(size: 60)
                        .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                    
                    Text("Find Your Address")
                        .font(.title2.bold())
                        .foregroundColor(.brandText)
                    
                    Text("Search for your delivery address")
                        .font(.subheadline)
                        .foregroundColor(.brandTextSecondary)
                        .multilineTextAlignment(.center)
                }
                .padding()
                .background(Color.brandSurface)
                
                // Search Bar
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.brandPrimary)
                        
                        TextField("Enter your address", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                            .onChange(of: searchText) { _, newValue in
                                if newValue.count > 2 {
                                    searchCompleter.queryFragment = newValue
                                    isLoading = true
                                } else {
                                    searchResults = []
                                    isLoading = false
                                }
                            }
                        
                        if !searchText.isEmpty {
                            Button("Clear") {
                                searchText = ""
                                searchResults = []
                            }
                            .font(.caption)
                            .foregroundColor(.brandPrimary)
                        }
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.brandBackground)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.brandPrimary.opacity(0.3), lineWidth: 1)
                            )
                    )
                    
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .padding(.horizontal)
                    }
                }
                .padding()
                .background(Color.brandSurface)
                
                // Search Results
                if searchResults.isEmpty && !searchText.isEmpty {
                    VStack(spacing: 16) {
                        if isLoading {
                            ProgressView("Searching...")
                                .progressViewStyle(CircularProgressViewStyle(tint: .brandPrimary))
                        } else {
                            VStack(spacing: 8) {
                                Image(systemName: "location.slash")
                                    .font(.largeTitle)
                                    .foregroundColor(.brandTextSecondary)
                                
                                Text("No addresses found")
                                    .font(.headline)
                                    .foregroundColor(.brandText)
                                
                                Text("Try a different search term")
                                    .font(.subheadline)
                                    .foregroundColor(.brandTextSecondary)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.brandBackground)
                } else if searchResults.isEmpty {
                    VStack(spacing: 16) {
                        Image(systemName: "location.magnifyingglass")
                            .font(.largeTitle)
                            .foregroundColor(.brandTextSecondary)
                        
                        Text("Start typing your address")
                            .font(.headline)
                            .foregroundColor(.brandText)
                        
                        Text("We'll show you matching addresses as you type")
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.brandBackground)
                } else {
                    List(searchResults, id: \.self) { result in
                        AddressSearchResultRow(
                            result: result,
                            onSelect: { completion in
                                selectAddress(from: completion)
                            }
                        )
                        .listRowBackground(Color.brandSurface)
                    }
                    .listStyle(.plain)
                    .background(Color.brandBackground)
                }
            }
            .background(Color.brandBackground.ignoresSafeArea())
            .navigationTitle("Address Search")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.brandPrimary)
                }
            }
        }
        .onAppear {
            setupSearchCompleter()
        }
    }
    
    private func setupSearchCompleter() {
        searchDelegate = AddressSearchDelegate { results in
            DispatchQueue.main.async {
                self.searchResults = results
                self.isLoading = false
            }
        }
        searchCompleter.delegate = searchDelegate
        
        // Configure search completer for addresses
        searchCompleter.resultTypes = [.address]
        searchCompleter.region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 36.1979, longitude: -115.2990), // Las Vegas
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
    }
    
    private func selectAddress(from completion: MKLocalSearchCompletion) {
        isLoading = true
        errorMessage = nil
        
        let searchRequest = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: searchRequest)
        
        search.start { response, error in
            DispatchQueue.main.async {
                isLoading = false
                
                if let error = error {
                    errorMessage = "Failed to get address details: \(error.localizedDescription)"
                    return
                }
                
                guard let response = response,
                      let mapItem = response.mapItems.first else {
                    errorMessage = "No address details found"
                    return
                }
                
                // Extract address components using modern MapKit APIs
                let placemark = mapItem.placemark
                let address = Address(
                    line1: [
                        placemark.subThoroughfare,
                        placemark.thoroughfare
                    ].compactMap { $0 }.joined(separator: " "),
                    city: placemark.locality ?? "",
                    state: placemark.administrativeArea ?? "",
                    postalCode: placemark.postalCode ?? ""
                )
                
                selectedAddress = address
                dismiss()
            }
        }
    }
}

struct AddressSearchResultRow: View {
    let result: MKLocalSearchCompletion
    let onSelect: (MKLocalSearchCompletion) -> Void
    
    var body: some View {
        Button(action: { onSelect(result) }) {
            HStack(spacing: 12) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundColor(.brandPrimary)
                    .font(.title2)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(result.title)
                        .font(.headline)
                        .foregroundColor(.brandText)
                        .multilineTextAlignment(.leading)
                    
                    if !result.subtitle.isEmpty {
                        Text(result.subtitle)
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                            .multilineTextAlignment(.leading)
                    }
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.brandTextSecondary)
                    .font(.caption)
            }
            .padding(.vertical, 8)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

class AddressSearchDelegate: NSObject, MKLocalSearchCompleterDelegate {
    private let onResultsUpdate: ([MKLocalSearchCompletion]) -> Void
    
    init(onResultsUpdate: @escaping ([MKLocalSearchCompletion]) -> Void) {
        self.onResultsUpdate = onResultsUpdate
    }
    
    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        onResultsUpdate(completer.results)
    }
    
    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        print("Address search error: \(error.localizedDescription)")
        onResultsUpdate([])
    }
}

#Preview {
    AddressSearchView(selectedAddress: .constant(nil))
}
