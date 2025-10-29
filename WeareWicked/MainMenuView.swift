import SwiftUI

struct MainMenuView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                header
                promotions
                primaryActions
            }
            .padding(20)
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Home")
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                NavigationLink(destination: CartView()) {
                    HStack(spacing: 6) {
                        CustomIcon("cart", size: 18, color: .brandPrimary)
                        if appState.cartItems.count > 0 {
                            Text("\(appState.cartItems.count)")
                                .font(.footnote).bold()
                                .foregroundColor(.brandPrimary)
                        }
                    }
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Logo and Welcome
            HStack(spacing: 16) {
                WickedLogoView(size: 60)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text("Welcome back, \(appState.user.name.split(separator: " ").first ?? "Friend")")
                        .font(.title2.bold())
                        .foregroundColor(.brandText)
                    
                    HStack {
                        CustomIcon("star", size: 16, color: .brandPrimary)
                        Text("\(appState.user.rewardsPoints) points • Wicked Rewards")
                            .font(.subheadline)
                            .foregroundColor(.brandTextSecondary)
                    }
                }
                
                Spacer()
            }
        }
    }

    private var promotions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Promotions")
                .font(.headline)
                .foregroundColor(.brandText)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 16) {
                    PromoCard(title: "Buy 6, Get 1 Free", gradient: Color.brandGradient1)
                    PromoCard(title: "Free Birthday Donut", gradient: Color.brandGradient2)
                    PromoCard(title: "$2 Coffee with Donut", gradient: Color.brandGradient3)
                }
                .padding(.vertical, 2)
            }
        }
    }

    private var primaryActions: some View {
        VStack(spacing: 16) {
            NavigationLink(destination: RewardsView()) {
                PrimaryButton(title: "Rewards", icon: "rewards", style: .secondary)
            }

            NavigationLink(destination: OrderStartView()) {
                PrimaryButton(title: "Order", icon: "order", style: .primary)
            }

            NavigationLink(destination: AccountView()) {
                PrimaryButton(title: "Account", icon: "account", style: .secondary)
            }
        }
        .padding(.top, 8)
    }
}

private struct PromoCard: View {
    let title: String
    let gradient: LinearGradient

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            gradient
            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
                .padding(16)
        }
        .frame(width: 260, height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: .black.opacity(0.15), radius: 10, x: 0, y: 8)
    }
}

private struct PrimaryButton: View {
    enum Style { case primary, secondary }
    let title: String
    let icon: String
    let style: Style

    var body: some View {
        HStack(spacing: 12) {
            CustomIcon(icon, size: 20, color: style == .primary ? .white : .brandPrimary)
            Text(title)
                .font(.title3.weight(.semibold))
        }
        .foregroundStyle(style == .primary ? .white : .brandText)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 18)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(style == .primary ? AnyShapeStyle(Color.brandGradient1) : AnyShapeStyle(Color.brandSurface))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(style == .primary ? Color.white.opacity(0.15) : Color.brandPrimary.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: .black.opacity(style == .primary ? 0.25 : 0.08), radius: style == .primary ? 16 : 8, x: 0, y: style == .primary ? 10 : 6)
    }
}

#Preview {
    NavigationStack { MainMenuView().environmentObject(AppState()) }
}


