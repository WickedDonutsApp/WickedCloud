import SwiftUI
import PassKit

struct ApplePayButton: View {
    let action: () -> Void
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            HStack {
                CustomIcon("apple_pay", size: 18, color: .white)
                Text("Pay")
                    .font(.headline.weight(.semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(Color.black)
            )
            .foregroundStyle(.white)
        }
        .scaleEffect(isPressed ? 0.98 : 1.0)
        .animation(.brandBounce, value: isPressed)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

struct PaymentSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @State private var isProcessing = false
    @State private var showSuccess = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 24) {
                VStack(spacing: 12) {
                    Text("Order Summary")
                        .font(.title2.bold())
                        .foregroundColor(.brandText)
                    
                    ForEach(appState.cartItems) { item in
                        HStack {
                            Text(item.product.name)
                            Spacer()
                            Text("$\(String(format: "%.2f", item.product.price * Double(item.quantity)))")
                                .fontWeight(.medium)
                        }
                        .foregroundColor(.brandTextSecondary)
                    }
                    
                    Divider()
                    
                    HStack {
                        Text("Total")
                            .font(.title3.bold())
                        Spacer()
                        Text("$\(String(format: "%.2f", appState.cartTotal))")
                            .font(.title3.bold())
                            .foregroundColor(.brandPrimary)
                    }
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color.brandSurface)
                        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
                )
                
                if PKPaymentAuthorizationViewController.canMakePayments() {
                    ApplePayButton {
                        processPayment()
                    }
                } else {
                    Button("Payment Not Available") {
                        // Handle non-Apple Pay devices
                    }
                    .disabled(true)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.gray.opacity(0.3))
                    .foregroundColor(.gray)
                    .cornerRadius(14)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle("Payment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .alert("Payment Successful!", isPresented: $showSuccess) {
            Button("OK") {
                appState.clearCart()
                dismiss()
            }
        } message: {
            Text("Your order has been placed successfully!")
        }
    }
    
    private func processPayment() {
        isProcessing = true
        
        // Simulate payment processing
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isProcessing = false
            let order = appState.placeOrder()
            showSuccess = true
        }
    }
}

#Preview {
    PaymentSheet()
        .environmentObject(AppState())
}
