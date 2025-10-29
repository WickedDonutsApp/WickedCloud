import SwiftUI
import UIKit

struct SocialShareView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showShareSheet = false
    @State private var shareText = ""
    @State private var shareImage: UIImage?
    
    var body: some View {
        VStack(spacing: 24) {
            Text("Share Your Wicked Experience")
                .font(.title.bold())
                .foregroundColor(.brandText)
                .multilineTextAlignment(.center)
            
            Text("Let your friends know about the most delicious donuts in town!")
                .font(.subheadline)
                .foregroundColor(.brandTextSecondary)
                .multilineTextAlignment(.center)
            
            VStack(spacing: 16) {
                ShareButton(
                    title: "Share App",
                    icon: "square.and.arrow.up",
                    color: .brandPrimary
                ) {
                    shareApp()
                }
                
                ShareButton(
                    title: "Share Order",
                    icon: "bag.fill",
                    color: .brandSecondary
                ) {
                    shareOrder()
                }
                
                ShareButton(
                    title: "Share Rewards",
                    icon: "gift.fill",
                    color: .brandAccent
                ) {
                    shareRewards()
                }
            }
            
            Spacer()
        }
        .padding(20)
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Share")
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(activityItems: [shareText, shareImage].compactMap { $0 })
        }
    }
    
    private func shareApp() {
        shareText = "🍩 Check out Wicked Donuts! The most delicious donuts in town. Download the app and get your first order free! #WickedDonuts #DeliciousDonuts"
        shareImage = createAppShareImage()
        showShareSheet = true
    }
    
    private func shareOrder() {
        if !appState.cartItems.isEmpty {
            let itemsText = appState.cartItems.map { "\($0.quantity)x \($0.product.name)" }.joined(separator: ", ")
            shareText = "🍩 Just ordered from Wicked Donuts: \(itemsText). Total: $\(String(format: "%.2f", appState.cartTotal)). So delicious! #WickedDonuts"
        } else {
            shareText = "🍩 Love Wicked Donuts! The best donuts in town. #WickedDonuts #DeliciousDonuts"
        }
        shareImage = createOrderShareImage()
        showShareSheet = true
    }
    
    private func shareRewards() {
        shareText = "⭐ I've earned \(appState.user.rewardsPoints) points at Wicked Donuts! Join me and get free donuts on your birthday. Download the app! #WickedRewards #FreeDonuts"
        shareImage = createRewardsShareImage()
        showShareSheet = true
    }
    
    private func createAppShareImage() -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 300))
        return renderer.image { context in
            // Background gradient
            let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                    colors: [UIColor.systemPink.cgColor, UIColor.systemPurple.cgColor] as CFArray,
                                    locations: [0, 1])!
            context.cgContext.drawLinearGradient(gradient,
                                               start: CGPoint(x: 0, y: 0),
                                               end: CGPoint(x: 400, y: 300),
                                               options: [])
            
            // App logo/text
            let text = "Wicked Donuts"
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 32),
                .foregroundColor: UIColor.white
            ]
            let textSize = text.size(withAttributes: attributes)
            let textRect = CGRect(x: (400 - textSize.width) / 2, y: 120, width: textSize.width, height: textSize.height)
            text.draw(in: textRect, withAttributes: attributes)
            
            // Subtitle
            let subtitle = "Fresh. Fun. Absolutely wicked."
            let subtitleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 16),
                .foregroundColor: UIColor.white.withAlphaComponent(0.9)
            ]
            let subtitleSize = subtitle.size(withAttributes: subtitleAttributes)
            let subtitleRect = CGRect(x: (400 - subtitleSize.width) / 2, y: 160, width: subtitleSize.width, height: subtitleSize.height)
            subtitle.draw(in: subtitleRect, withAttributes: subtitleAttributes)
        }
    }
    
    private func createOrderShareImage() -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 300))
        return renderer.image { context in
            // Background
            UIColor(red: 0.98, green: 0.96, blue: 0.94, alpha: 1.0).setFill()
            context.fill(CGRect(x: 0, y: 0, width: 400, height: 300))
            
            // Title
            let title = "My Wicked Order"
            let titleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 24),
                .foregroundColor: UIColor(red: 0.15, green: 0.15, blue: 0.15, alpha: 1.0)
            ]
            let titleSize = title.size(withAttributes: titleAttributes)
            let titleRect = CGRect(x: (400 - titleSize.width) / 2, y: 50, width: titleSize.width, height: titleSize.height)
            title.draw(in: titleRect, withAttributes: titleAttributes)
            
            // Items
            var yOffset: CGFloat = 100
            for item in appState.cartItems {
                let itemText = "\(item.quantity)x \(item.product.name)"
                let itemAttributes: [NSAttributedString.Key: Any] = [
                    .font: UIFont.systemFont(ofSize: 16),
                    .foregroundColor: UIColor(red: 0.45, green: 0.45, blue: 0.45, alpha: 1.0)
                ]
                let itemSize = itemText.size(withAttributes: itemAttributes)
                let itemRect = CGRect(x: 50, y: yOffset, width: itemSize.width, height: itemSize.height)
                itemText.draw(in: itemRect, withAttributes: itemAttributes)
                yOffset += 30
            }
            
            // Total
            let totalText = "Total: $\(String(format: "%.2f", appState.cartTotal))"
            let totalAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 18),
                .foregroundColor: UIColor(red: 0.85, green: 0.35, blue: 0.45, alpha: 1.0)
            ]
            let totalSize = totalText.size(withAttributes: totalAttributes)
            let totalRect = CGRect(x: (400 - totalSize.width) / 2, y: yOffset + 20, width: totalSize.width, height: totalSize.height)
            totalText.draw(in: totalRect, withAttributes: totalAttributes)
        }
    }
    
    private func createRewardsShareImage() -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 300))
        return renderer.image { context in
            // Background gradient
            let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                    colors: [UIColor.systemOrange.cgColor, UIColor.systemRed.cgColor] as CFArray,
                                    locations: [0, 1])!
            context.cgContext.drawLinearGradient(gradient,
                                               start: CGPoint(x: 0, y: 0),
                                               end: CGPoint(x: 400, y: 300),
                                               options: [])
            
            // Points
            let pointsText = "\(appState.user.rewardsPoints) Points"
            let pointsAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.boldSystemFont(ofSize: 48),
                .foregroundColor: UIColor.white
            ]
            let pointsSize = pointsText.size(withAttributes: pointsAttributes)
            let pointsRect = CGRect(x: (400 - pointsSize.width) / 2, y: 100, width: pointsSize.width, height: pointsSize.height)
            pointsText.draw(in: pointsRect, withAttributes: pointsAttributes)
            
            // Subtitle
            let subtitle = "Wicked Rewards Member"
            let subtitleAttributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 18),
                .foregroundColor: UIColor.white.withAlphaComponent(0.9)
            ]
            let subtitleSize = subtitle.size(withAttributes: subtitleAttributes)
            let subtitleRect = CGRect(x: (400 - subtitleSize.width) / 2, y: 160, width: subtitleSize.width, height: subtitleSize.height)
            subtitle.draw(in: subtitleRect, withAttributes: subtitleAttributes)
        }
    }
}

struct ShareButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                CustomIcon(icon, size: 20, color: .white)
                Text(title)
                    .font(.headline.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(color)
            )
            .foregroundStyle(.white)
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    NavigationStack { SocialShareView().environmentObject(AppState()) }
}
