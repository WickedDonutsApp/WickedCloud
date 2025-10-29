import SwiftUI

struct WickedLogoView: View {
    let size: CGFloat
    let showCircularBorder: Bool
    
    init(size: CGFloat, showCircularBorder: Bool = false) {
        self.size = size
        self.showCircularBorder = showCircularBorder
    }
    
    var body: some View {
        Group {
            if let logoImage = UIImage(named: "WickedLogo") {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: size, height: size)
                    .clipShape(showCircularBorder ? AnyShape(Circle()) : AnyShape(RoundedRectangle(cornerRadius: size * 0.1)))
                    .overlay(
                        showCircularBorder ? 
                        Circle().stroke(Color.brandWhite, lineWidth: 3) : 
                        nil
                    )
                    .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
            } else {
                // Fallback placeholder with logo-inspired design
                ZStack {
                    if showCircularBorder {
                        Circle()
                            .fill(Color.brandGradient1)
                            .frame(width: size, height: size)
                            .overlay(
                                Circle()
                                    .stroke(Color.brandWhite, lineWidth: 3)
                            )
                    } else {
                        RoundedRectangle(cornerRadius: size * 0.1)
                            .fill(Color.brandGradient1)
                            .frame(width: size, height: size)
                    }
                    
                    VStack(spacing: 2) {
                        Text("WICKED")
                            .font(.system(size: size * 0.15, weight: .black, design: .rounded))
                            .foregroundColor(.brandWhite)
                        Text("DONUTS")
                            .font(.system(size: size * 0.15, weight: .black, design: .rounded))
                            .foregroundColor(.brandWhite)
                        Text("Las Vegas")
                            .font(.system(size: size * 0.08, weight: .medium, design: .rounded))
                            .foregroundColor(.brandWhite.opacity(0.9))
                    }
                }
                .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
            }
        }
    }
}

#Preview {
    VStack(spacing: 30) {
        // Logo without border
        WickedLogoView(size: 120)
        
        // Logo with circular border
        WickedLogoView(size: 120, showCircularBorder: true)
        
        // Small logo
        WickedLogoView(size: 60)
        
        // Large logo
        WickedLogoView(size: 200)
    }
    .padding()
    .background(Color.brandBackground)
}
