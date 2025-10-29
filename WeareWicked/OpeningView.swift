import SwiftUI

struct OpeningView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showContent = false
    @State private var showAuthForm = false
    @State private var isSignUp = false
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var errorMessage: String?
    @State private var isLoading = false
    
    var body: some View {
        ZStack {
            Color.brandGradientDevil
                .ignoresSafeArea()

            VStack(spacing: 24) {
                // Logo Section
                VStack(spacing: 16) {
                        // Main Logo - Using WickedLogoView
                        WickedLogoView(size: 200, showCircularBorder: false)
                        .opacity(showContent ? 1 : 0)
                        .scaleEffect(showContent ? 1 : 0.3)
                        .animation(.brandSpring.delay(0.3), value: showContent)
                    
                    // Tagline
                    VStack(spacing: 8) {
                        Text("Las Vegas")
                            .font(.title2.weight(.medium))
                            .foregroundColor(.brandWhite)
                            .opacity(showContent ? 1 : 0)
                            .offset(y: showContent ? 0 : 20)
                        
                        Text("Fresh. Fun. Absolutely wicked.")
                            .font(.title3)
                            .foregroundColor(.brandWhite.opacity(0.9))
                            .opacity(showContent ? 1 : 0)
                            .offset(y: showContent ? 0 : 20)
                    }
                }

                // Authentication Form (appears after button fade)
                if showAuthForm {
                    VStack(spacing: 16) {
                        // Auth Header
                        VStack(spacing: 8) {
                            Text(isSignUp ? "Create Your Account" : "Welcome Back")
                                .font(.title2.bold())
                                .foregroundColor(.brandWhite)
                            
                            Text("Sign in to start ordering")
                                .font(.subheadline)
                                .foregroundColor(.brandWhite.opacity(0.8))
                        }
                        .opacity(showAuthForm ? 1 : 0)
                        .offset(y: showAuthForm ? 0 : 20)
                        .animation(.brandSpring.delay(0.2), value: showAuthForm)
                        
                        // Form Fields
                        VStack(spacing: 12) {
                            if isSignUp {
                                TextField("Full Name", text: $name)
                                    .textFieldStyle(AuthTextFieldStyle())
                                    .autocapitalization(.words)
                            }

                            TextField("Email", text: $email)
                                .textFieldStyle(AuthTextFieldStyle())
                                .autocapitalization(.none)
                                .keyboardType(.emailAddress)

                            SecureField("Password", text: $password)
                                .textFieldStyle(AuthTextFieldStyle())

                            if isSignUp {
                                SecureField("Confirm Password", text: $confirmPassword)
                                    .textFieldStyle(AuthTextFieldStyle())
                            }

                            if let errorMessage = errorMessage {
                                Text(errorMessage)
                                    .foregroundColor(.red)
                                    .font(.caption)
                            }

                            Button(action: authenticate) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .brandWhite))
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Capsule().fill(Color.brandPrimary.opacity(0.7)))
                                } else {
                                    Text(isSignUp ? "Sign Up" : "Sign In")
                                        .font(.headline.weight(.semibold))
                                        .foregroundColor(.brandWhite)
                                        .frame(maxWidth: .infinity)
                                        .padding()
                                        .background(Capsule().fill(Color.brandPrimary))
                                        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                                }
                            }
                            .disabled(isLoading)
                        }
                        .opacity(showAuthForm ? 1 : 0)
                        .offset(y: showAuthForm ? 0 : 30)
                        .animation(.brandSpring.delay(0.4), value: showAuthForm)
                        
                        // Toggle Sign Up/Sign In
                        Button {
                            withAnimation(.easeInOut) {
                                isSignUp.toggle()
                                errorMessage = nil
                                clearFields()
                            }
                        } label: {
                            Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                                .font(.subheadline)
                                .foregroundColor(.brandWhite.opacity(0.8))
                        }
                        .opacity(showAuthForm ? 1 : 0)
                        .offset(y: showAuthForm ? 0 : 20)
                        .animation(.brandSpring.delay(0.6), value: showAuthForm)
                    }
                    .padding(.horizontal, 32)
                } else {
                    // Let's Start Button (fades away)
                    Button {
                        withAnimation(.easeInOut(duration: 0.8)) {
                            showAuthForm = true
                        }
                    } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "arrow.right.circle.fill")
                                .font(.title2)
                            Text("Let's Start")
                                .font(.title2.weight(.semibold))
                        }
                        .foregroundColor(.brandWhite)
                        .padding(.horizontal, 40)
                        .padding(.vertical, 18)
                        .background(
                            Capsule()
                                .fill(Color.brandPrimary.opacity(0.9))
                                .overlay(
                                    Capsule()
                                        .stroke(Color.brandWhite.opacity(0.3), lineWidth: 2)
                                )
                                .shadow(color: .black.opacity(0.4), radius: 15, x: 0, y: 8)
                        )
                    }
                    .padding(.top, 16)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 30)
                    .animation(.brandSpring.delay(0.6), value: showContent)
                }

                // Bottom text
                Text("Order now, earn rewards, stay wicked.")
                    .font(.footnote)
                    .foregroundColor(.brandWhite.opacity(0.8))
                    .padding(.top, 8)
                    .opacity(showContent ? 1 : 0)
                    .offset(y: showContent ? 0 : 20)
                    .animation(.brandSpring.delay(0.8), value: showContent)
            }
            .padding(32)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.8).delay(0.2)) {
                showContent = true
            }
        }
    }
    
    private func authenticate() {
        isLoading = true
        errorMessage = nil

        // Basic validation
        guard !email.isEmpty && !password.isEmpty else {
            errorMessage = "Email and password cannot be empty."
            isLoading = false
            return
        }

        guard isValidEmail(email) else {
            errorMessage = "Please enter a valid email address."
            isLoading = false
            return
        }

        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters long."
            isLoading = false
            return
        }

        if isSignUp {
            guard !name.isEmpty else {
                errorMessage = "Name cannot be empty."
                isLoading = false
                return
            }
            guard password == confirmPassword else {
                errorMessage = "Passwords do not match."
                isLoading = false
                return
            }
            if appState.userExists(email: email) {
                errorMessage = "An account with this email already exists."
                isLoading = false
                return
            }
            
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                let newUser = User(name: name, email: email, rewardsPoints: 0, birthdayOptIn: false, defaultAddress: nil)
                appState.signUp(user: newUser, password: password)
                isLoading = false
            }
        } else {
            // Simulate network delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                if appState.signIn(email: email, password: password) {
                    // Signed in successfully, AppState will update isAuthenticated
                } else {
                    errorMessage = "Invalid email or password."
                }
                isLoading = false
            }
        }
    }

    private func clearFields() {
        name = ""
        email = ""
        password = ""
        confirmPassword = ""
    }

    private func isValidEmail(_ email: String) -> Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
}

struct AuthTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.brandWhite.opacity(0.8))
                    .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
            )
            .foregroundColor(.brandText)
            .accentColor(.brandPrimary)
    }
}

#Preview {
    NavigationStack { OpeningView() }
}


