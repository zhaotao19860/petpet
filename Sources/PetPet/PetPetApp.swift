import SwiftUI

@main
struct PetPetApp: App {
    @StateObject private var store = PetStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

struct RootView: View {
    @EnvironmentObject var store: PetStore

    var body: some View {
        if store.pet == nil {
            PetSelectionView()
        } else {
            HomeView()
        }
    }
}
