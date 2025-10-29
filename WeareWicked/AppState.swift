import SwiftUI
import Foundation
import Combine
import PassKit
import UserNotifications
import CoreLocation

final class AppState: ObservableObject {
    @Published var user: User = User.sample
    @Published var cartItems: [CartItem] = []
    @Published var products: [Product] = Product.sampleAll
    @Published var pickupLocation: Address? = nil
    @Published var orderHistory: [Order] = []
    @Published var nearbyStores: [Store] = []
    @Published var isAuthenticated = false
    @Published var currentUser: User? = nil
    
    private let userDefaults = UserDefaults.standard
    private let cartKey = "saved_cart"
    private let userKey = "saved_user"
    private let ordersKey = "saved_orders"
    private let usersKey = "saved_users"
    private let passwordsKey = "saved_passwords"
    private let currentUserKey = "current_user_email"
    private let pickupLocationKey = "saved_pickup_location"
    private let locationManager = CLLocationManager()
    
    // User database storage
    private var users: [String: User] = [:]
    private var passwords: [String: String] = [:]

    var cartTotal: Double {
        cartItems.reduce(0) { $0 + ($1.product.price * Double($1.quantity)) }
    }

    init() {
        loadUsers()
        loadPasswords()
        // Don't auto-load current user on app start - force opening page
        // loadCurrentUser()
        loadUser()
        loadCart()
        loadOrderHistory()
        loadPickupLocation()
        setupLocationManager()
        requestNotificationPermission()
    }

    func addToCart(product: Product, quantity: Int) {
        if let index = cartItems.firstIndex(where: { $0.product.id == product.id }) {
            cartItems[index].quantity += quantity
        } else {
            cartItems.append(CartItem(product: product, quantity: quantity))
        }
        saveCart()
    }

    func removeFromCart(productId: UUID) {
        cartItems.removeAll { $0.product.id == productId }
        saveCart()
    }

    func clearCart() {
        cartItems.removeAll()
        saveCart()
    }
    
    func updateUser(_ newUser: User) {
        if isAuthenticated {
            updateCurrentUser(newUser)
        } else {
            user = newUser
            saveUser()
        }
    }
    
    func setPickupLocation(_ location: Address) {
        pickupLocation = location
        savePickupLocation()
    }
    
    func placeOrder() -> Order {
        let order = Order(
            id: UUID(),
            items: cartItems,
            total: cartTotal,
            status: .placed,
            orderDate: Date(),
            pickupLocation: pickupLocation ?? Address.sample
        )
        orderHistory.append(order)
        saveOrderHistory()
        clearCart()
        scheduleOrderNotifications(for: order)
        return order
    }
    
    private func setupLocationManager() {
        // Simplified location setup without delegate for now
        locationManager.requestWhenInUseAuthorization()
        loadNearbyStores()
    }
    
    private func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                print("Notification permission granted")
            }
        }
    }
    
    private func scheduleOrderNotifications(for order: Order) {
        let content = UNMutableNotificationContent()
        content.title = "Order Confirmed!"
        content.body = "Your order #\(order.id.uuidString.prefix(8)) is being prepared."
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: order.id.uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request)
        
        // Schedule ready notification
        let readyContent = UNMutableNotificationContent()
        readyContent.title = "Order Ready!"
        readyContent.body = "Your delicious donuts are ready for pickup!"
        readyContent.sound = .default
        
        let readyTrigger = UNTimeIntervalNotificationTrigger(timeInterval: 300, repeats: false) // 5 minutes
        let readyRequest = UNNotificationRequest(identifier: "\(order.id.uuidString)-ready", content: readyContent, trigger: readyTrigger)
        
        UNUserNotificationCenter.current().add(readyRequest)
    }
    
    private func loadNearbyStores() {
        // Real Wicked Donuts Las Vegas location
        nearbyStores = [
            Store(
                name: "Wicked Donuts Las Vegas", 
                address: Address(
                    line1: "9490 W Lake Mead Blvd", 
                    city: "Las Vegas", 
                    state: "NV", 
                    postalCode: "89134"
                ), 
                distance: 0.0
            )
        ]
    }
    
    private func saveCart() {
        if let data = try? JSONEncoder().encode(cartItems) {
            userDefaults.set(data, forKey: cartKey)
        }
    }
    
    private func loadCart() {
        if let data = userDefaults.data(forKey: cartKey),
           let items = try? JSONDecoder().decode([CartItem].self, from: data) {
            cartItems = items
        }
    }
    
    private func saveUser() {
        if let data = try? JSONEncoder().encode(user) {
            userDefaults.set(data, forKey: userKey)
        }
    }
    
    private func loadUser() {
        if let data = userDefaults.data(forKey: userKey),
           let savedUser = try? JSONDecoder().decode(User.self, from: data) {
            user = savedUser
        }
    }
    
    private func saveOrderHistory() {
        if let data = try? JSONEncoder().encode(orderHistory) {
            userDefaults.set(data, forKey: ordersKey)
        }
    }
    
    private func loadOrderHistory() {
        if let data = userDefaults.data(forKey: ordersKey),
           let orders = try? JSONDecoder().decode([Order].self, from: data) {
            orderHistory = orders
        }
    }
    
    private func savePickupLocation() {
        if let data = try? JSONEncoder().encode(pickupLocation) {
            userDefaults.set(data, forKey: pickupLocationKey)
        }
    }
    
    private func loadPickupLocation() {
        if let data = userDefaults.data(forKey: pickupLocationKey),
           let location = try? JSONDecoder().decode(Address?.self, from: data) {
            pickupLocation = location
        }
    }
    
    // MARK: - Authentication Methods
    
    private func loadUsers() {
        if let data = userDefaults.data(forKey: usersKey),
           let loadedUsers = try? JSONDecoder().decode([String: User].self, from: data) {
            users = loadedUsers
        }
    }
    
    private func saveUsers() {
        if let data = try? JSONEncoder().encode(users) {
            userDefaults.set(data, forKey: usersKey)
        }
    }
    
    private func loadPasswords() {
        if let data = userDefaults.data(forKey: passwordsKey),
           let loadedPasswords = try? JSONDecoder().decode([String: String].self, from: data) {
            passwords = loadedPasswords
        }
    }
    
    private func savePasswords() {
        if let data = try? JSONEncoder().encode(passwords) {
            userDefaults.set(data, forKey: passwordsKey)
        }
    }
    
    private func loadCurrentUser() {
        if let currentUserEmail = userDefaults.string(forKey: currentUserKey),
           let user = users[currentUserEmail] {
            currentUser = user
            isAuthenticated = true
        }
    }
    
    func loadCurrentUserIfExists() {
        loadCurrentUser()
    }
    
    private func saveCurrentUser(email: String) {
        userDefaults.set(email, forKey: currentUserKey)
    }
    
    func signUp(user: User, password: String) {
        users[user.email] = user
        passwords[user.email] = password
        
        saveUsers()
        savePasswords()
        
        // Auto sign in after sign up
        signIn(email: user.email, password: password)
    }
    
    func signIn(email: String, password: String) -> Bool {
        guard let storedPassword = passwords[email],
              storedPassword == password,
              let user = users[email] else {
            return false
        }
        
        currentUser = user
        isAuthenticated = true
        saveCurrentUser(email: email)
        
        // Update the main user object for compatibility
        self.user = user
        
        // Load saved pickup location for this user
        loadPickupLocation()
        
        // Force UI update
        DispatchQueue.main.async {
            self.objectWillChange.send()
        }
        
        return true
    }
    
    func signOut() {
        print("Signing out user...")
        
        // Clear authentication state
        currentUser = nil
        isAuthenticated = false
        userDefaults.removeObject(forKey: currentUserKey)
        
        // Clear cart and reset to sample user
        cartItems = []
        user = User.sample
        
        // Force UI update
        DispatchQueue.main.async {
            self.objectWillChange.send()
        }
        
        print("Sign out complete. isAuthenticated: \(isAuthenticated)")
    }
    
    func userExists(email: String) -> Bool {
        return users[email] != nil
    }
    
    func updateCurrentUser(_ updatedUser: User) {
        guard let email = currentUser?.email else { return }
        
        users[email] = updatedUser
        currentUser = updatedUser
        user = updatedUser
        
        saveUsers()
    }
}

struct User: Codable {
    var name: String
    var email: String
    var rewardsPoints: Int
    var birthdayOptIn: Bool
    var defaultAddress: Address?

    static let sample = User(
        name: "Taylor Donut",
        email: "taylor@example.com",
        rewardsPoints: 120,
        birthdayOptIn: false,
        defaultAddress: Address.sample
    )
}

struct Address: Identifiable, Hashable, Codable {
    let id = UUID()
    var line1: String
    var city: String
    var state: String
    var postalCode: String

    var formatted: String { "\(line1), \(city), \(state) \(postalCode)" }

    static let sample = Address(line1: "123 Main St", city: "Springfield", state: "IL", postalCode: "62704")
}

enum Category: String, CaseIterable, Identifiable, Codable {
    case donuts = "Donuts"
    case coffee = "Coffee"
    case coldDrinks = "Cold Drinks"
    case hotDrinks = "Hot Drinks"
    case teas = "Teas"
    case smoothies = "Smoothies"
    case sandwiches = "Sandwiches"

    var id: String { rawValue }
}

struct Product: Identifiable, Hashable, Codable {
    let id = UUID()
    let name: String
    let description: String
    let price: Double
    let category: Category
    let imageName: String

    static let sampleAll: [Product] = [
        // Donuts
        Product(name: "Apple Crumble", description: "Fresh apple chunks with cinnamon crumble topping.", price: 3.49, category: .donuts, imageName: "apple-crumble"),
        Product(name: "Apple Fritter", description: "Classic apple fritter with chunks of apple and cinnamon.", price: 3.29, category: .donuts, imageName: "apple-fritter"),
        Product(name: "Bella Nutella", description: "Rich Nutella filling with hazelnut cream.", price: 3.99, category: .donuts, imageName: "bella-nutella"),
        Product(name: "Blue Suede Banana", description: "Elvis-inspired banana donut with blueberry glaze.", price: 3.79, category: .donuts, imageName: "blue-suede-banana"),
        Product(name: "Blueberry Bliss Cake", description: "Moist cake donut bursting with fresh blueberries.", price: 3.29, category: .donuts, imageName: "blueberry-bliss-cake"),
        Product(name: "Blueberry Fritter", description: "Traditional fritter loaded with juicy blueberries.", price: 3.49, category: .donuts, imageName: "blueberry-fritter"),
        Product(name: "Bugsy Bullseye", description: "Chocolate donut with caramel center and chocolate drizzle.", price: 3.79, category: .donuts, imageName: "bugsy-bullseye"),
        Product(name: "Buttermilk Cake", description: "Classic buttermilk cake donut, light and fluffy.", price: 2.99, category: .donuts, imageName: "buttermilk-cake"),
        Product(name: "Cannoli Puffernut", description: "Cannoli cream-filled puffernut with chocolate chips.", price: 4.29, category: .donuts, imageName: "cannoli-puffernut"),
        Product(name: "Caramel Sutra Puffernut", description: "Caramel-filled puffernut with chocolate glaze.", price: 4.49, category: .donuts, imageName: "caramel-sutra-puffernut"),
        Product(name: "Chocolate Iced", description: "Classic yeast donut with rich chocolate glaze.", price: 2.99, category: .donuts, imageName: "chocolate-iced"),
        Product(name: "Chocolate Minterventions", description: "Chocolate donut with mint frosting and chocolate chips.", price: 3.79, category: .donuts, imageName: "chocolate-minterventions"),
        Product(name: "Chocolate Rainbow", description: "Chocolate donut topped with rainbow sprinkles.", price: 3.29, category: .donuts, imageName: "chocolate-rainbow"),
        Product(name: "Churro Cronut", description: "Cronut with churro flavoring and cinnamon sugar.", price: 4.99, category: .donuts, imageName: "churro-cronut"),
        Product(name: "Cookies and Cream", description: "Chocolate donut with cookies and cream frosting.", price: 3.79, category: .donuts, imageName: "cookies-and-cream"),
        Product(name: "Cream Cheese Cinnamon Roll", description: "Soft cinnamon roll with cream cheese frosting.", price: 4.29, category: .donuts, imageName: "cream-cheese-cinnamon-roll"),
        Product(name: "Cream Cheese Puffernut", description: "Cream cheese-filled puffernut with vanilla glaze.", price: 4.49, category: .donuts, imageName: "cream-cheese-puffernut"),
        Product(name: "Creme Brulee", description: "Vanilla custard-filled donut with caramelized sugar.", price: 4.79, category: .donuts, imageName: "creme-brulee"),
        Product(name: "Deep Purple", description: "Purple glazed donut with grape flavor.", price: 3.49, category: .donuts, imageName: "deep-purple"),
        Product(name: "Dubai Donut", description: "Exotic donut with Middle Eastern spices and honey.", price: 4.99, category: .donuts, imageName: "dubai-donut"),
        Product(name: "French Cream Puffernut", description: "French vanilla cream-filled puffernut.", price: 4.29, category: .donuts, imageName: "french-cream-puffernut"),
        Product(name: "Guava Cheesecake", description: "Tropical guava cheesecake donut.", price: 4.49, category: .donuts, imageName: "guava-cheesecake"),
        Product(name: "Lemon Meringue Puffernut", description: "Lemon curd-filled puffernut with meringue topping.", price: 4.79, category: .donuts, imageName: "lemon-meringue-puffernut"),
        Product(name: "Lemon Poppy Cake", description: "Lemon cake donut with poppy seeds.", price: 3.29, category: .donuts, imageName: "lemon-poppy-cake"),
        Product(name: "Maple Bacon", description: "Maple-glazed donut topped with crispy bacon.", price: 4.29, category: .donuts, imageName: "maple-bacon"),
        Product(name: "Maple Iced", description: "Classic donut with sweet maple glaze.", price: 3.29, category: .donuts, imageName: "maple-iced"),
        Product(name: "My Favorite Martian", description: "Green alien-themed donut with cosmic sprinkles.", price: 3.79, category: .donuts, imageName: "my-favorite-martian"),
        Product(name: "Original Glazed", description: "Our signature light and airy glazed donut.", price: 2.49, category: .donuts, imageName: "original-glazed"),
        Product(name: "Passion Mango Tequila", description: "Tropical mango donut with a hint of tequila flavor.", price: 4.99, category: .donuts, imageName: "passion-mango-tequila"),
        Product(name: "Pink Lady Cronut", description: "Pink-glazed cronut with strawberry flavor.", price: 4.99, category: .donuts, imageName: "pink-lady-cronut"),
        Product(name: "Pink Rainbow", description: "Pink donut topped with rainbow sprinkles.", price: 3.29, category: .donuts, imageName: "pink-rainbow"),
        Product(name: "Pistachio Donut Cube", description: "Unique cube-shaped donut with pistachio flavor.", price: 4.29, category: .donuts, imageName: "pistachio-donut-cube"),
        Product(name: "Sticky Sin-a-Bun", description: "Cinnamon roll with sticky caramel glaze.", price: 4.49, category: .donuts, imageName: "sticky-sin-a-bun"),
        Product(name: "Strawberries and Cream", description: "Fresh strawberry donut with cream filling.", price: 3.79, category: .donuts, imageName: "strawberries-and-cream"),
        Product(name: "Sugar Rolled Cronut", description: "Cronut rolled in cinnamon sugar.", price: 4.99, category: .donuts, imageName: "sugar-rolled-cronut"),
        Product(name: "Tiramisu", description: "Coffee-flavored donut with mascarpone cream.", price: 4.79, category: .donuts, imageName: "tirmaisu"),
        Product(name: "Triple Chocolate", description: "Triple chocolate donut with chocolate chips.", price: 3.99, category: .donuts, imageName: "triple-chocolate"),
        Product(name: "Wicked Boston", description: "Our signature Boston cream donut.", price: 3.99, category: .donuts, imageName: "wicked-boston"),
        
        // Coffee
        Product(name: "Iced Latte", description: "Smooth espresso over ice with milk.", price: 4.49, category: .coffee, imageName: "coffee_latte"),
        Product(name: "Cappuccino", description: "Rich espresso with steamed milk foam.", price: 4.29, category: .coffee, imageName: "coffee_cappuccino"),
        
        // Sandwiches
        Product(name: "Turkey Sandwich", description: "Hearty artisan bread with turkey and greens.", price: 7.99, category: .sandwiches, imageName: "sandwich_turkey"),
        Product(name: "Ham & Cheese", description: "Classic ham and cheese on fresh bread.", price: 6.99, category: .sandwiches, imageName: "sandwich_ham"),
    ]
}

struct CartItem: Identifiable, Codable {
    let id = UUID()
    let product: Product
    var quantity: Int
}

enum OrderStatus: String, Codable, CaseIterable {
    case placed = "Placed"
    case preparing = "Preparing"
    case ready = "Ready"
    case completed = "Completed"
    case cancelled = "Cancelled"
}

struct Order: Identifiable, Codable {
    let id: UUID
    let items: [CartItem]
    let total: Double
    var status: OrderStatus
    let orderDate: Date
    let pickupLocation: Address
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: orderDate)
    }
    
    var shortId: String {
        String(id.uuidString.prefix(8))
    }
}

struct Store: Identifiable, Codable, Equatable {
    let id = UUID()
    let name: String
    let address: Address
    let distance: Double // in miles
    
    var formattedDistance: String {
        String(format: "%.1f mi", distance)
    }
}