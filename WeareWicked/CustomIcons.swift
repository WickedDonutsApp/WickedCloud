import SwiftUI

struct CustomIcon: View {
    let name: String
    let size: CGFloat
    let color: Color
    
    init(_ name: String, size: CGFloat = 24, color: Color = .brandPrimary) {
        self.name = name
        self.size = size
        self.color = color
    }
    
    var body: some View {
        Image(systemName: iconName)
            .font(.system(size: size, weight: .medium))
            .foregroundColor(color)
    }
    
    private var iconName: String {
        switch name {
        case "donut": return "circle.fill"
        case "coffee": return "cup.and.saucer.fill"
        case "cold_drink": return "snowflake"
        case "hot_drink": return "flame.fill"
        case "tea": return "leaf.fill"
        case "smoothie": return "drop.fill"
        case "sandwich": return "fork.knife"
        case "cart": return "cart.fill"
        case "rewards": return "gift.fill"
        case "account": return "person.crop.circle.fill"
        case "order": return "bag.fill"
        case "star": return "star.fill"
        case "trash": return "trash"
        case "apple_pay": return "apple.logo"
        case "location": return "mappin.and.ellipse"
        case "birthday": return "birthday.cake.fill"
        case "sparkles": return "sparkles"
        case "bolt": return "bolt.fill"
        default: return "circle"
        }
    }
}

struct AnimatedIcon: View {
    let name: String
    let size: CGFloat
    let color: Color
    @State private var isAnimating = false
    
    init(_ name: String, size: CGFloat = 24, color: Color = .brandPrimary) {
        self.name = name
        self.size = size
        self.color = color
    }
    
    var body: some View {
        CustomIcon(name, size: size, color: color)
            .scaleEffect(isAnimating ? 1.1 : 1.0)
            .animation(.brandSpring.repeatForever(autoreverses: true), value: isAnimating)
            .onAppear {
                isAnimating = true
            }
    }
}

struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            CustomIcon(icon, size: 20, color: .white)
                .frame(width: 56, height: 56)
                .background(
                    Circle()
                        .fill(Color.brandGradient1)
                        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
                )
        }
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.brandBounce, value: isPressed)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}
