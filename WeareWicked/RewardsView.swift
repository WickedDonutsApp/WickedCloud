import SwiftUI

struct RewardsView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showOptInConfirmation = false

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Wicked Rewards")
                .font(.largeTitle.bold())
                .foregroundColor(.brandText)
            Text("Earn points on every purchase. Unlock sweet perks.")
                .foregroundColor(.brandTextSecondary)

            VStack(alignment: .leading, spacing: 12) {
                Label("Free Birthday Donut", systemImage: "birthday.cake.fill")
                    .foregroundColor(.brandText)
                Label("Exclusive Promotions", systemImage: "sparkles")
                    .foregroundColor(.brandText)
                Label("Faster Checkout", systemImage: "bolt.fill")
                    .foregroundColor(.brandText)
            }
            .font(.headline)

            VStack(alignment: .leading, spacing: 12) {
                Text("Birthday Donut Journey")
                    .font(.headline)
                    .foregroundColor(.brandText)
                Text("Opt-in to get a free donut on your birthday.")
                    .foregroundColor(.brandTextSecondary)
                Toggle(isOn: Binding(
                    get: { appState.user.birthdayOptIn },
                    set: { newValue in
                        appState.user.birthdayOptIn = newValue
                        appState.updateUser(appState.user)
                        showOptInConfirmation = newValue
                    }
                )) {
                    Text(appState.user.birthdayOptIn ? "You're in!" : "Sign up for birthday treat")
                        .foregroundColor(.brandText)
                }
                .toggleStyle(SwitchToggleStyle(tint: .brandPrimary))
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.brandSurface)
                    .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
            )

            Spacer()

            NavigationLink("Back to Main Menu", destination: MainMenuView())
                .buttonStyle(.borderedProminent)
                .tint(.brandPrimary)
        }
        .padding(20)
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Rewards")
        .alert("You're in!", isPresented: $showOptInConfirmation) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("We can't wait to celebrate with you.")
        }
    }
}

#Preview {
    NavigationStack { RewardsView().environmentObject(AppState()) }
}


