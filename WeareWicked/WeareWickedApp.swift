//
//  WeareWickedApp.swift
//  WeareWicked
//
//  Created by Peter Hesz on 10/28/25.
//

import SwiftUI

@main
struct WeareWickedApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                if appState.isAuthenticated {
                    MainMenuView()
                } else {
                    OpeningView()
                }
            }
            .environmentObject(appState)
        }
    }
}
