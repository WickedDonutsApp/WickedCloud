import SwiftUI

struct OrderStartView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showingStorePicker = false

    private var canProceed: Bool {
        appState.pickupLocation != nil
    }

    var body: some View {
        VStack(spacing: 24) {
            // Header
            VStack(spacing: 16) {
                        WickedLogoView(size: 120)
                    .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                
                Text("Ready to Order?")
                    .font(.title.bold())
                    .foregroundColor(.brandText)
                
                Text("Your information is saved in your profile")
                    .font(.subheadline)
                    .foregroundColor(.brandTextSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top, 40)

            // Store Location Section
            VStack(spacing: 16) {
                Text("Pick-up Location")
                    .font(.headline)
                    .foregroundColor(.brandText)
                    .frame(maxWidth: .infinity, alignment: .leading)
                
                if let location = appState.pickupLocation {
                    HStack {
                        Image(systemName: "mappin.circle.fill")
                            .foregroundColor(.brandPrimary)
                            .font(.title2)
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Wicked Donuts Las Vegas")
                                .font(.headline)
                                .foregroundColor(.brandText)
                            Text(location.formatted)
                                .font(.subheadline)
                                .foregroundColor(.brandTextSecondary)
                        }
                        
                        Spacer()
                        
                        Button("Change") {
                            showingStorePicker = true
                        }
                        .font(.caption)
                        .foregroundColor(.brandPrimary)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.brandSurface)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.brandPrimary.opacity(0.3), lineWidth: 1)
                            )
                    )
                } else {
                    VStack(spacing: 12) {
                        HStack {
                            Image(systemName: "exclamationmark.circle.fill")
                                .foregroundColor(.orange)
                            Text("No store selected")
                                .foregroundColor(.brandText)
                            Spacer()
                        }
                        
                        Button("Select Store Location") {
                            showingStorePicker = true
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color.brandPrimary)
                        )
                        .foregroundColor(.brandWhite)
                    }
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.brandSurface)
                    )
                }
            }
            .padding(.horizontal, 24)

            Spacer()

            // Order Button
            if canProceed {
                NavigationLink(destination: CategoryListView()) {
                    HStack {
                        Image(systemName: "donut.fill")
                            .font(.title2)
                        Text("Let's get those donuts!")
                            .font(.headline.weight(.semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color.brandGradient1)
                    )
                    .foregroundColor(.brandWhite)
                    .shadow(color: .brandPrimary.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            } else {
                VStack(spacing: 8) {
                    Text("Select a store location to continue")
                        .foregroundColor(.brandTextSecondary)
                        .font(.subheadline)
                        .multilineTextAlignment(.center)
                    
                    NavigationLink("Complete Your Profile") {
                        ProfileEditView()
                    }
                    .font(.caption)
                    .foregroundColor(.brandPrimary)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
            }
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Start Your Order")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingStorePicker) {
            StoreFinderView()
        }
    }
}

struct CategoryListView: View {
    var body: some View {
        List {
            ForEach(Category.allCases) { category in
                NavigationLink(destination: destination(for: category)) {
                    Label(category.rawValue, systemImage: icon(for: category))
                }
            }
        }
        .navigationTitle("Categories")
    }

    private func destination(for category: Category) -> AnyView {
        switch category {
        case .donuts: return AnyView(DonutListView())
        default: return AnyView(ProductListPlaceholder(title: category.rawValue))
        }
    }

    private func icon(for category: Category) -> String {
        switch category {
        case .donuts: return "circle.grid.2x2.fill"
        case .coffee: return "cup.and.saucer.fill"
        case .coldDrinks: return "snowflake"
        case .hotDrinks: return "flame.fill"
        case .teas: return "leaf.fill"
        case .smoothies: return "drop.fill"
        case .sandwiches: return "fork.knife"
        }
    }
}

private struct ProductListPlaceholder: View {
    let title: String
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "shippingbox.fill").font(.largeTitle)
            Text("\(title) coming soon")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct DonutListView: View {
    @EnvironmentObject private var appState: AppState

    private var donuts: [Product] {
        appState.products.filter { $0.category == .donuts }
    }

    var body: some View {
        List(donuts) { product in
            NavigationLink(destination: DonutDetailView(product: product)) {
                HStack(spacing: 16) {
                    ProductImage(product: product, size: 48)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text(product.name).font(.headline)
                            .foregroundColor(.brandText)
                        Text("$\(String(format: "%.2f", product.price))")
                            .foregroundColor(.brandTextSecondary)
                            .font(.subheadline)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .background(Color.brandBackground)
        .navigationTitle("Donuts")
    }
}

struct DonutDetailView: View {
    @EnvironmentObject private var appState: AppState
    let product: Product
    @State private var quantity: Int = 1
    @State private var showAddedToCart = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            ProductImage(product: product, size: 220)
                .scaleEffect(showAddedToCart ? 1.1 : 1.0)
                .animation(.brandBounce, value: showAddedToCart)

            VStack(spacing: 8) {
                Text(product.name).font(.title.bold())
                    .foregroundColor(.brandText)
                Text(product.description)
                    .foregroundColor(.brandTextSecondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal)

            Stepper(value: $quantity, in: 1...24) {
                Text("Quantity: \(quantity)")
                    .foregroundColor(.brandText)
            }
            .padding(.horizontal)

            Text("$\(String(format: "%.2f", product.price * Double(quantity)))")
                .font(.title2.bold())
                .foregroundColor(.brandPrimary)

            Button {
                appState.addToCart(product: product, quantity: quantity)
                showAddedToCart = true
                
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
                    dismiss()
                }
            } label: {
                Text("Add to Cart")
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        RoundedRectangle(cornerRadius: 14)
                            .fill(Color.brandGradient1)
                    )
                    .foregroundStyle(.white)
                    .font(.headline.weight(.semibold))
            }
            .padding(.horizontal)
            .disabled(showAddedToCart)

            Spacer()
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct ProductImage: View {
    let product: Product
    let size: CGFloat
    @State private var isLoaded = false
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.brandPrimary.opacity(0.15))
                .frame(width: size, height: size)
            
            // Real product images with fallback to custom icons
            if let image = UIImage(named: product.imageName) {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: size * 0.8, height: size * 0.8)
                    .clipShape(Circle())
                    .opacity(isLoaded ? 1 : 0)
                    .scaleEffect(isLoaded ? 1 : 0.5)
                    .animation(.brandSpring.delay(0.1), value: isLoaded)
            } else {
                // Fallback to custom donut icons
                Image(systemName: donutIconName)
                    .font(.system(size: size * 0.6))
                    .foregroundColor(.brandPrimary)
                    .opacity(isLoaded ? 1 : 0)
                    .scaleEffect(isLoaded ? 1 : 0.5)
                    .animation(.brandSpring.delay(0.1), value: isLoaded)
            }
        }
        .onAppear {
            isLoaded = true
        }
    }
    
    private var donutIconName: String {
        switch product.name.lowercased() {
        case let name where name.contains("glazed"):
            return "circle.fill"
        case let name where name.contains("chocolate"):
            return "circle.grid.2x2.fill"
        case let name where name.contains("strawberry"):
            return "sparkles"
        case let name where name.contains("boston"):
            return "circle.dotted"
        default:
            return "circle.fill"
        }
    }
}

struct CartView: View {
    @EnvironmentObject private var appState: AppState
    @State private var showPaymentSheet = false

    var body: some View {
        VStack {
            if appState.cartItems.isEmpty {
                ContentUnavailableView("Your cart is empty", systemImage: "cart")
            } else {
                List {
                    ForEach(appState.cartItems) { item in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(item.product.name).font(.headline)
                                    .foregroundColor(.brandText)
                                Text("$\(String(format: "%.2f", item.product.price)) × \(item.quantity)")
                                    .foregroundColor(.brandTextSecondary)
                            }
                            Spacer()
                            Button(role: .destructive) {
                                withAnimation(.brandSpring) {
                                    appState.removeFromCart(productId: item.product.id)
                                }
                            } label: {
                                CustomIcon("trash", size: 16, color: .red)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                VStack(spacing: 12) {
                    HStack {
                        Text("Total").font(.headline)
                            .foregroundColor(.brandText)
                        Spacer()
                        Text("$\(String(format: "%.2f", appState.cartTotal))").font(.headline)
                            .foregroundColor(.brandPrimary)
                    }

                    Button {
                        showPaymentSheet = true
                    } label: {
                        HStack {
                            CustomIcon("apple_pay", size: 18, color: .white)
                            Text("Pay")
                                .font(.headline.weight(.semibold))
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(
                            RoundedRectangle(cornerRadius: 14)
                                .fill(Color.black)
                        )
                        .foregroundStyle(.white)
                    }
                }
                .padding()
                .background(Color.brandSurface)
            }
        }
        .background(Color.brandBackground.ignoresSafeArea())
        .navigationTitle("Cart")
        .sheet(isPresented: $showPaymentSheet) {
            PaymentSheet()
        }
    }
}


