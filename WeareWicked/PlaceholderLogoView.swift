import SwiftUI

struct PlaceholderLogoView: View {
    let size: CGFloat
    
    var body: some View {
        Group {
            if let logoImage = UIImage(named: "WickedLogo") {
                Image(uiImage: logoImage)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: size, height: size)
                    .clipShape(Circle())
            } else {
                // Fallback placeholder
                ZStack {
                    Circle()
                        .fill(Color.brandGradient1)
                        .frame(width: size, height: size)
                    
                    Text("WD")
                        .font(.system(size: size * 0.4, weight: .bold, design: .rounded))
                        .foregroundColor(.brandWhite)
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        PlaceholderLogoView(size: 60)
        PlaceholderLogoView(size: 120)
        PlaceholderLogoView(size: 200)
    }
    .padding()
}
