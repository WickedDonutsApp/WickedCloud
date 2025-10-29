import SwiftUI

struct AccountView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showingProfileEdit = false

    var body: some View {
        List {
            Section("Profile") {
                HStack {
                        // Profile Avatar
                        ProfileImageView(email: appState.user.email, size: 60)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(appState.user.name)
                            .font(.headline)
                            .foregroundColor(.brandText)
                        Text(appState.user.email)
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                        
                        HStack {
                            Image(systemName: "star.fill")
                                .foregroundColor(.brandPrimary)
                                .font(.caption)
                            Text("\(appState.user.rewardsPoints) points")
                                .font(.caption)
                                .foregroundColor(.brandTextSecondary)
                        }
                    }
                    
                    Spacer()
                    
                    Button {
                        showingProfileEdit = true
                    } label: {
                        Image(systemName: "pencil.circle.fill")
                            .font(.title2)
                            .foregroundColor(.brandPrimary)
                    }
                }
                .padding(.vertical, 4)
            }

            Section("Store Location") {
                if let pickupLocation = appState.pickupLocation {
                    HStack {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(.brandPrimary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Preferred Store")
                                .font(.headline)
                                .foregroundColor(.brandText)
                            Text(pickupLocation.formatted)
                                .font(.subheadline)
                                .foregroundColor(.brandTextSecondary)
                        }
                        Spacer()
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(.green)
                    }
                } else {
                    HStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.orange)
                        Text("No store selected")
                            .foregroundColor(.brandText)
                        Spacer()
                        Text("Required for ordering")
                            .font(.caption)
                            .foregroundColor(.brandTextSecondary)
                    }
                }
            }

            Section("Payment Methods") {
                Label("Apple Pay", systemImage: "apple.logo")
                    .foregroundColor(.brandText)
                Label("Add Card", systemImage: "creditcard")
                    .foregroundColor(.brandText)
            }

            Section("Delivery Address") {
                if let addr = appState.user.defaultAddress {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Image(systemName: "mappin.and.ellipse")
                                .foregroundColor(.brandPrimary)
                            Text("Saved Address")
                                .font(.headline)
                                .foregroundColor(.brandText)
                        }
                        Text(addr.formatted)
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                    }
                    .padding(.vertical, 4)
                } else {
                    HStack {
                        Image(systemName: "exclamationmark.circle.fill")
                            .foregroundColor(.orange)
                        Text("No address saved")
                            .foregroundColor(.brandText)
                        Spacer()
                        Text("Required for delivery")
                            .font(.caption)
                            .foregroundColor(.brandTextSecondary)
                    }
                }
            }

            Section("Orders") {
                NavigationLink("Past Orders") { 
                    OrderHistoryView()
                }
            }

            Section("Location") {
                NavigationLink("Find Stores") { 
                    StoreFinderView()
                }
            }

            Section("Share") {
                NavigationLink("Share App") { 
                    SocialShareView()
                }
            }

            Section("Help & Support") {
                NavigationLink("Help / FAQ") { 
                    Text("FAQ Coming Soon")
                        .foregroundColor(.brandTextSecondary)
                }
                NavigationLink("Contact Support") { 
                    Text("Email: support@wicked.example")
                        .foregroundColor(.brandTextSecondary)
                }
                NavigationLink("App Feedback") { 
                    Text("We love your feedback!")
                        .foregroundColor(.brandTextSecondary)
                }
            }

            Section {
                Button(role: .destructive) { 
                    withAnimation(.easeInOut(duration: 0.3)) {
                        appState.signOut()
                    }
                } label: {
                    HStack {
                        Image(systemName: "arrow.right.square")
                        Text("Log Out")
                    }
                    .foregroundColor(.red)
                }
            }
        }
        .background(Color.brandBackground)
        .navigationTitle("Account")
        .sheet(isPresented: $showingProfileEdit) {
            ProfileEditView()
        }
    }
}

struct ProfileImageView: View {
    let email: String
    let size: CGFloat
    @State private var profileImage: UIImage?
    
    var body: some View {
        Group {
            if let profileImage = profileImage {
                Image(uiImage: profileImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .stroke(Color.brandPrimary, lineWidth: 2)
                    )
            } else {
                ZStack {
                    Circle()
                        .fill(Color.brandSurface)
                        .frame(width: size, height: size)
                    
                    Image(systemName: "person.circle.fill")
                        .font(.system(size: size * 0.8))
                        .foregroundColor(.brandTextSecondary)
                }
                .overlay(
                    Circle()
                        .stroke(Color.brandPrimary.opacity(0.3), lineWidth: 2)
                )
            }
        }
        .onAppear {
            loadProfileImage()
        }
    }
    
    private func loadProfileImage() {
        let profileImageKey = "profile_image_\(email)"
        if let data = UserDefaults.standard.data(forKey: profileImageKey),
           let image = UIImage(data: data) {
            profileImage = image
        }
    }
}

#Preview {
    NavigationStack { AccountView().environmentObject(AppState()) }
}


