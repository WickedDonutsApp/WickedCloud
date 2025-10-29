import SwiftUI
import PhotosUI

struct ProfileEditView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    
    @State private var name: String = ""
    @State private var email: String = ""
    @State private var addressLine1: String = ""
    @State private var city: String = ""
    @State private var state: String = ""
    @State private var zip: String = ""
    @State private var selectedStore: Store?
    @State private var showingStorePicker = false
    @State private var showingAddressSearch = false
    @State private var selectedAddress: Address?
    @State private var isComplete = false
    @State private var profileImage: UIImage?
    @State private var selectedPhoto: PhotosPickerItem?
    
    var body: some View {
        NavigationView {
            Form {
                personalInfoSection
                addressSection
                storeSection
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundColor(.brandTextSecondary)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveProfile()
                    }
                    .foregroundColor(.brandPrimary)
                    .disabled(!isComplete)
                }
            }
            .onAppear {
                loadCurrentProfile()
            }
            .onChange(of: name) { _ in updateCompletionStatus() }
            .onChange(of: email) { _ in updateCompletionStatus() }
            .onChange(of: addressLine1) { _ in updateCompletionStatus() }
            .onChange(of: city) { _ in updateCompletionStatus() }
            .onChange(of: state) { _ in updateCompletionStatus() }
            .onChange(of: zip) { _ in updateCompletionStatus() }
            .onChange(of: selectedStore) { _ in updateCompletionStatus() }
            .onChange(of: selectedPhoto) { _, newItem in
                Task {
                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                       let image = UIImage(data: data) {
                        await MainActor.run {
                            profileImage = image
                            saveProfileImage(image)
                        }
                    }
                }
            }
            .sheet(isPresented: $showingStorePicker) {
                StoreSelectionView(selectedStore: $selectedStore)
            }
            .sheet(isPresented: $showingAddressSearch) {
                AddressSearchView(selectedAddress: $selectedAddress)
                    .onDisappear {
                        if let address = selectedAddress {
                            addressLine1 = address.line1
                            city = address.city
                            state = address.state
                            zip = address.postalCode
                            updateCompletionStatus()
                        }
                    }
            }
        }
    }
    
    private var personalInfoSection: some View {
        Section("Personal Information") {
            // Profile Picture Upload Section
            VStack(spacing: 16) {
                HStack {
                    Spacer()
                    
                    // Profile Picture Display/Upload
                    PhotosPicker(selection: $selectedPhoto, matching: .images, photoLibrary: .shared()) {
                        ZStack {
                            if let profileImage = profileImage {
                                Image(uiImage: profileImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                                    .frame(width: 100, height: 100)
                                    .clipShape(Circle())
                                    .overlay(
                                        Circle()
                                            .stroke(Color.brandPrimary, lineWidth: 3)
                                    )
                            } else {
                                ZStack {
                                    Circle()
                                        .fill(Color.brandSurface)
                                        .frame(width: 100, height: 100)
                                    
                                    VStack(spacing: 6) {
                                        Image(systemName: "camera.fill")
                                            .font(.title2)
                                            .foregroundColor(.brandPrimary)
                                        Text("Tap to\nUpload")
                                            .font(.caption)
                                            .foregroundColor(.brandTextSecondary)
                                            .multilineTextAlignment(.center)
                                    }
                                }
                                .overlay(
                                    Circle()
                                        .stroke(Color.brandPrimary.opacity(0.3), style: StrokeStyle(lineWidth: 2, lineCap: .round, dash: [5, 5]))
                                )
                            }
                            
                            // Edit icon overlay
                            VStack {
                                Spacer()
                                HStack {
                                    Spacer()
                                    Image(systemName: "pencil.circle.fill")
                                        .font(.title3)
                                        .foregroundColor(.brandPrimary)
                                        .background(Circle().fill(Color.brandWhite))
                                        .offset(x: 5, y: 5)
                                }
                            }
                        }
                    }
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
                    
                    Spacer()
                }
                .padding(.vertical, 8)
            }
            
            TextField("Full Name", text: $name)
                .textFieldStyle(RoundedBorderTextFieldStyle())
            
            TextField("Email", text: $email)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
        }
    }
    
    private var addressSection: some View {
        Section("Delivery Address") {
            Button {
                showingAddressSearch = true
            } label: {
                HStack {
                    Image(systemName: "magnifyingglass.circle.fill")
                        .foregroundColor(.brandPrimary)
                        .font(.title2)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Search for Address")
                            .font(.headline)
                            .foregroundColor(.brandText)
                        
                        if addressLine1.isEmpty {
                            Text("Tap to find your address")
                                .font(.subheadline)
                                .foregroundColor(.brandTextSecondary)
                        } else {
                            Text("\(addressLine1), \(city), \(state) \(zip)")
                                .font(.subheadline)
                                .foregroundColor(.brandTextSecondary)
                                .lineLimit(2)
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
            
            VStack(spacing: 12) {
                HStack {
                    Text("Or enter manually:")
                        .font(.subheadline)
                        .foregroundColor(.brandTextSecondary)
                    Spacer()
                }
                
                TextField("Street Address", text: $addressLine1)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                
                HStack {
                    TextField("City", text: $city)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                    
                    TextField("State", text: $state)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .frame(width: 80)
                    
                    TextField("ZIP", text: $zip)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .frame(width: 100)
                        .keyboardType(.numberPad)
                }
            }
            .padding(.top, 8)
        }
    }
    
    private var storeSection: some View {
        Section("Preferred Store Location") {
            if let store = selectedStore {
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .foregroundColor(.brandPrimary)
                        .font(.title2)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(store.name)
                            .font(.headline)
                            .foregroundColor(.brandText)
                        Text(store.address.formatted)
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                    }
                    
                    Spacer()
                    
                    Button("Change") {
                        showingStorePicker = true
                    }
                    .foregroundColor(.brandPrimary)
                }
                .padding(.vertical, 4)
            } else {
                Button {
                    showingStorePicker = true
                } label: {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                            .foregroundColor(.brandPrimary)
                        Text("Select Your Preferred Store")
                            .foregroundColor(.brandText)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundColor(.brandTextSecondary)
                    }
                    .padding(.vertical, 8)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    private func loadCurrentProfile() {
        name = appState.user.name
        email = appState.user.email
        
        if let defaultAddress = appState.user.defaultAddress {
            addressLine1 = defaultAddress.line1
            city = defaultAddress.city
            state = defaultAddress.state
            zip = defaultAddress.postalCode
        }
        
        // Load current pickup location
        if let currentPickupLocation = appState.pickupLocation {
            selectedStore = appState.nearbyStores.first { store in
                store.address.line1 == currentPickupLocation.line1 &&
                store.address.city == currentPickupLocation.city &&
                store.address.state == currentPickupLocation.state &&
                store.address.postalCode == currentPickupLocation.postalCode
            }
        } else {
            selectedStore = appState.nearbyStores.first
        }
        
        // Load profile image
        loadProfileImage()
        
        updateCompletionStatus()
    }
    
    private func loadProfileImage() {
        let profileImageKey = "profile_image_\(appState.user.email)"
        if let data = UserDefaults.standard.data(forKey: profileImageKey),
           let image = UIImage(data: data) {
            profileImage = image
        }
    }
    
    private func saveProfileImage(_ image: UIImage) {
        let profileImageKey = "profile_image_\(appState.user.email)"
        if let data = image.jpegData(compressionQuality: 0.8) {
            UserDefaults.standard.set(data, forKey: profileImageKey)
        }
    }
    
    private func updateCompletionStatus() {
        isComplete = !name.isEmpty && !email.isEmpty
    }
    
    private func saveProfile() {
        let newAddress = Address(
            line1: addressLine1,
            city: city,
            state: state,
            postalCode: zip
        )
        
        // Migrate profile image if email changed
        let oldEmail = appState.user.email
        if oldEmail != email, let image = profileImage {
            // Save profile image with new email
            let newImageKey = "profile_image_\(email)"
            let oldImageKey = "profile_image_\(oldEmail)"
            if let data = image.jpegData(compressionQuality: 0.8) {
                UserDefaults.standard.set(data, forKey: newImageKey)
                // Optionally remove old image key
                UserDefaults.standard.removeObject(forKey: oldImageKey)
            }
        } else if let image = profileImage {
            // Save current profile image (email unchanged)
            saveProfileImage(image)
        }
        
        let updatedUser = User(
            name: name,
            email: email,
            rewardsPoints: appState.user.rewardsPoints,
            birthdayOptIn: appState.user.birthdayOptIn,
            defaultAddress: newAddress
        )
        
        appState.updateUser(updatedUser)
        
        if let store = selectedStore {
            appState.setPickupLocation(store.address)
        }
        
        dismiss()
    }
}

struct StoreSelectionView: View {
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedStore: Store?
    
    var body: some View {
        VStack(spacing: 0) {
            headerSection
            contentSection
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Select Store")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Cancel") {
                    dismiss()
                }
                .foregroundColor(.brandPrimary)
            }
        }
    }
    
    private var headerSection: some View {
        VStack(spacing: 12) {
            WickedLogoView(size: 80)
                .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
            
            Text("Select Your Preferred Store")
                .font(.title2.bold())
                .foregroundColor(.brandText)
            
            Text("This will be your default pickup location.")
                .font(.subheadline)
                .foregroundColor(.brandTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .background(Color.brandSurface)
    }
    
    private var contentSection: some View {
        Group {
            if appState.nearbyStores.isEmpty {
                ContentUnavailableView("No Stores Found", systemImage: "location.slash")
            } else {
                VStack(spacing: 0) {
                    List(appState.nearbyStores) { store in
                        StoreRowView(store: store, isSelected: selectedStore?.id == store.id)
                            .onTapGesture {
                                selectedStore = store
                            }
                            .listRowBackground(Color.brandSurface)
                    }
                    .listStyle(.plain)
                    
                    confirmButton
                }
            }
        }
    }
    
    private var confirmButton: some View {
        Button {
            dismiss()
        } label: {
            Text("Confirm Selection")
                .font(.headline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 14)
                        .fill(selectedStore != nil ? Color.brandPrimary : Color.gray)
                )
                .foregroundColor(.brandWhite)
        }
        .disabled(selectedStore == nil)
        .padding()
        .background(Color.brandSurface)
    }
}

#Preview {
    ProfileEditView()
        .environmentObject(AppState())
}