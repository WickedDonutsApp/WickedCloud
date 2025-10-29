import SwiftUI

struct OrderHistoryView: View {
    @EnvironmentObject private var appState: AppState
    
    var body: some View {
        List {
            if appState.orderHistory.isEmpty {
                ContentUnavailableView("No Orders Yet", systemImage: "bag")
            } else {
                ForEach(appState.orderHistory.sorted(by: { $0.orderDate > $1.orderDate })) { order in
                    OrderRowView(order: order)
                }
            }
        }
        .background(Color.brandBackground)
        .navigationTitle("Order History")
    }
}

struct OrderRowView: View {
    let order: Order
    @State private var showDetails = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Order #\(order.shortId)")
                        .font(.headline)
                        .foregroundColor(.brandText)
                    Text(order.formattedDate)
                        .font(.caption)
                        .foregroundColor(.brandTextSecondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("$\(String(format: "%.2f", order.total))")
                        .font(.headline)
                        .foregroundColor(.brandPrimary)
                    StatusBadge(status: order.status)
                }
            }
            
            Text("\(order.items.count) item\(order.items.count == 1 ? "" : "s")")
                .font(.caption)
                .foregroundColor(.brandTextSecondary)
            
            if showDetails {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(order.items) { item in
                        HStack {
                            Text("\(item.quantity)x \(item.product.name)")
                                .font(.caption)
                            Spacer()
                            Text("$\(String(format: "%.2f", item.product.price * Double(item.quantity)))")
                                .font(.caption)
                        }
                        .foregroundColor(.brandTextSecondary)
                    }
                }
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
        .onTapGesture {
            withAnimation(.brandSpring) {
                showDetails.toggle()
            }
        }
    }
}

struct StatusBadge: View {
    let status: OrderStatus
    
    var body: some View {
        Text(status.rawValue)
            .font(.caption.weight(.medium))
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: 8)
                    .fill(statusColor)
            )
            .foregroundColor(.white)
    }
    
    private var statusColor: Color {
        switch status {
        case .placed: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .completed: return .brandPrimary
        case .cancelled: return .red
        }
    }
}

#Preview {
    NavigationStack { OrderHistoryView().environmentObject(AppState()) }
}
