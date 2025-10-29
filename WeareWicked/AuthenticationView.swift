import SwiftUI

struct AuthenticationView: View {
    @EnvironmentObject private var appState: AppState
    @State private var isSignUp = false
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var name = ""
    @State private var showAlert = false
    @State private var alertMessage = ""
    @State private var isLoading = false

    var body: some View {
        ZStack {
            Color.brandGradientDevil
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Header with Logo
                VStack(spacing: 16) {
                    // Logo
                    Image("WickedLogo")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 120, height: 120)
                        .shadow(color: .black.opacity(0.3), radius: 10, x: 0, y: 5)
                    
                    VStack(spacing: 8) {
                        Text("Wicked Donuts")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundColor(.brandWhite)
                            .shadow(radius: 8)
                        
                        Text("Las Vegas")
                            .font(.title3.weight(.medium))
                            .foregroundColor(.brandWhite.opacity(0.9))
                        
                        Text(isSignUp ? "Create Your Account" : "Welcome Back")
                            .font(.title2)
                            .foregroundColor(.brandWhite.opacity(0.8))
                    }
                }
                .padding(.top, 20)

                // Form
                VStack(spacing: 16) {
                    if isSignUp {
                        TextField("Full Name", text: $name)
                            .textFieldStyle(AuthenticationTextFieldStyle())
                    }
                    
                    TextField("Email", text: $email)
                        .textFieldStyle(AuthenticationTextFieldStyle())
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(AuthenticationTextFieldStyle())
                    
                    if isSignUp {
                        SecureField("Confirm Password", text: $confirmPassword)
                            .textFieldStyle(AuthenticationTextFieldStyle())
                    }
                }
                .padding(.horizontal, 32)

                // Action Button
                Button(action: handleAuthentication) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                        }
                        Text(isSignUp ? "Sign Up" : "Sign In")
                            .font(.headline)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        Capsule()
                            .fill(Color.brandSurface)
                            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                    )
                    .foregroundColor(.brandText)
                }
                .disabled(isLoading || !isFormValid)
                .opacity(isFormValid ? 1.0 : 0.6)
                .padding(.horizontal, 32)

                // Toggle Auth Mode
                Button(action: { 
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isSignUp.toggle()
                        clearForm()
                    }
                }) {
                    Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                        .underline()
                }
                .padding(.top, 8)

                Spacer()
            }
        }
        .alert("Authentication Error", isPresented: $showAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(alertMessage)
        }
    }

    private var isFormValid: Bool {
        if isSignUp {
            return !name.isEmpty && 
                   !email.isEmpty && 
                   !password.isEmpty && 
                   !confirmPassword.isEmpty && 
                   password == confirmPassword &&
                   password.count >= 6
        } else {
            return !email.isEmpty && !password.isEmpty
        }
    }

    private func clearForm() {
        email = ""
        password = ""
        confirmPassword = ""
        name = ""
    }

    private func handleAuthentication() {
        isLoading = true
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
            isLoading = false
            
            if isSignUp {
                handleSignUp()
            } else {
                handleSignIn()
            }
        }
    }

    private func handleSignUp() {
        // Validate email format
        guard email.contains("@") && email.contains(".") else {
            alertMessage = "Please enter a valid email address"
            showAlert = true
            return
        }

        // Check if user already exists
        if appState.userExists(email: email) {
            alertMessage = "An account with this email already exists"
            showAlert = true
            return
        }

        // Create new user
        let newUser = User(
            name: name,
            email: email,
            rewardsPoints: 0,
            birthdayOptIn: false,
            defaultAddress: nil
        )

        appState.signUp(user: newUser, password: password)
    }

    private func handleSignIn() {
        if appState.signIn(email: email, password: password) {
            // Success - user is now signed in
        } else {
            alertMessage = "Invalid email or password"
            showAlert = true
        }
    }
}

struct AuthenticationTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.white.opacity(0.9))
                    .shadow(color: .black.opacity(0.1), radius: 4, x: 0, y: 2)
            )
            .foregroundColor(.brandText)
    }
}

#Preview {
    AuthenticationView()
        .environmentObject(AppState())
}
