import SwiftUI

extension Color {
    // Brand Colors - Based on Wicked Donuts Las Vegas Logo
    static let brandPrimary = Color(red: 0.88, green: 0.34, blue: 0.34) // Vibrant Red from devil girl (#E03C4B)
    static let brandSecondary = Color.black // Pure Black from logo outlines and frosting
    static let brandAccent = Color(red: 0.80, green: 0.80, blue: 0.80) // Light Grey from donut base
    static let brandBackground = Color.white // Pure White from logo border and text
    static let brandSurface = Color(red: 0.98, green: 0.98, blue: 0.98) // Off-white for surfaces
    static let brandText = Color.black // Black for primary text
    static let brandTextSecondary = Color(red: 0.45, green: 0.45, blue: 0.45) // Medium gray for secondary text
    static let brandWhite = Color.white // Pure white for highlights and accents
    
    // Logo-inspired gradients
    static let brandGradient1 = LinearGradient(
        colors: [brandPrimary, brandSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let brandGradient2 = LinearGradient(
        colors: [brandPrimary, Color.red.opacity(0.8)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    static let brandGradient3 = LinearGradient(
        colors: [brandSecondary, brandPrimary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    // Devil-inspired gradient for special effects
    static let brandGradientDevil = LinearGradient(
        colors: [brandPrimary, Color.red, brandSecondary],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
}

// Custom animations
extension Animation {
    static let brandSpring = Animation.spring(response: 0.6, dampingFraction: 0.8, blendDuration: 0.2)
    static let brandBounce = Animation.interpolatingSpring(stiffness: 300, damping: 20)
    static let brandSmooth = Animation.easeInOut(duration: 0.3)
}
